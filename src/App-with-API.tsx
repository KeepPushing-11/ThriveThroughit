// LEAP Survey Dashboard - Real-time MongoDB Integration
// This version replaces mock data with actual API calls

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { Sidebar } from "./components/Sidebar";
import { OverviewDashboard } from "./components/OverviewDashboard";
import { ModuleSurveyTab } from "./components/ModuleSurveyTab";
import { ModuleAnalysisTab } from "./components/ModuleAnalysisTab";
import { ModularSurvey } from "./components/ModularSurvey";
import { PostSurveyDashboard } from "./components/PostSurveyDashboard";
import { SurveyManagement } from "./components/SurveyManagement";
import { WelcomeBanner } from "./components/WelcomeBanner";
import { parseUrlParams, getSurveyConfig } from "./utils/surveyManagement";
import { 
  calculateOverallAverages,
  calculateAIReadinessBySection,
  calculateLeadershipByLens,
  calculateLeadershipByConfiguration,
  calculateLeadershipByDriver,
  calculateEmployeeExperienceByCategory,
  calculateEmployeeExperienceByDriver,
  getEmployeeExperienceDistribution
} from "./utils/calculations";
import { useOverviewAnalytics, useAllModuleAnalytics } from "./hooks/useAnalytics";
import { useCampaign } from "./hooks/useCampaigns";
import { useRealtimeResponses } from './client/hooks/useRealtimeResponses';
import { api } from "./utils/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";

// Loading Component
function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

// Error Component
function ErrorDisplay({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Data</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export default function App() {
  // Parse URL parameters
  const urlParams = useMemo(() => parseUrlParams(), []);
  
  // Fetch campaign data if surveyId is provided
  const { data: currentSurvey, loading: campaignLoading, error: campaignError, refetch: refetchCampaign } = useCampaign(urlParams.surveyId);
  
  // Determine available modules
  const availableModules = useMemo(() => {
    if (currentSurvey) {
      return currentSurvey.modules;
    }
    if (urlParams.modules.length > 0) {
      return urlParams.modules as ('ai-readiness' | 'leadership' | 'employee-experience')[];
    }
    return ['ai-readiness', 'leadership', 'employee-experience'] as const;
  }, [currentSurvey, urlParams.modules]);
  
  // Check if this is a direct survey link
  const isDirectSurveyLink = useMemo(() => {
    return availableModules.length === 1 && urlParams.mode === 'survey';
  }, [availableModules, urlParams.mode]);
  
  // Fetch analytics data
  const { data: overviewData, loading: overviewLoading, error: overviewError, refetch: refetchOverview } = useOverviewAnalytics(urlParams.surveyId);
  const moduleAnalytics = useAllModuleAnalytics(urlParams.surveyId);

  // Realtime responses subscription: join survey room and refresh analytics on new responses
  const realtime = useRealtimeResponses();
  useEffect(() => {
    realtime.connect();
    return () => { realtime.disconnect(); };
  }, [realtime]);

  useEffect(() => {
    if (!urlParams.surveyId) return;
    try { realtime.joinSurvey(urlParams.surveyId); } catch (e) { /* ignore */ }
    const off = realtime.onResponseCreated((payload) => {
      try {
        // If the incoming response belongs to the current survey, refresh analytics
        if (!payload || !payload.response) return;
        const respSurveyId = payload.response.surveyId || payload.response.survey || payload.response.survey_id;
        if (String(respSurveyId) === String(urlParams.surveyId)) {
          refetchOverview();
          moduleAnalytics.refetchAll();
          try { (toast as any)?.success?.('New response received — analytics refreshed'); } catch(e) { /* noop */ }
        }
      } catch (err) {
        console.error('Realtime handler error', err);
      }
    });

    return () => {
      try { off(); } catch (e) { /* noop */ }
      try { realtime.leaveSurvey(urlParams.surveyId); } catch (e) { /* noop */ }
    };
  }, [urlParams.surveyId, realtime, refetchOverview, moduleAnalytics]);
  
  // Local state
  const [activeModule, setActiveModule] = useState(urlParams.primaryModule || (availableModules.length === 1 ? availableModules[0] : 'overview'));
  const [activeSubTab, setActiveSubTab] = useState<'survey' | 'analysis'>('survey');
  const [mode, setMode] = useState<'dashboard' | 'survey' | 'post-survey'>(
    urlParams.mode === 'survey' || isDirectSurveyLink ? 'survey' : 'dashboard'
  );
  const [surveyResponses, setSurveyResponses] = useState<Record<string, string>>({});
  const [completedModule, setCompletedModule] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Survey status tracking
  const surveyStatus = useMemo(() => {
    const aiResponses = Object.keys(surveyResponses).filter(key => key.startsWith('ai-')).length;
    const leadershipResponses = Object.keys(surveyResponses).filter(key => key.startsWith('leadership-')).length;
    const eeResponses = Object.keys(surveyResponses).filter(key => key.startsWith('ee-')).length;
    
    return {
      aiReadiness: aiResponses > 0 ? (aiResponses >= 6 ? 'completed' : 'in-progress') : 'not-started',
      leadership: leadershipResponses > 0 ? (leadershipResponses >= 8 ? 'completed' : 'in-progress') : 'not-started',
      employeeExperience: eeResponses > 0 ? (eeResponses >= 16 ? 'completed' : 'in-progress') : 'not-started'
    } as const;
  }, [surveyResponses]);

  // Handle survey completion and submission to MongoDB
  const handleSurveyComplete = useCallback(async (responses: Record<string, string>) => {
    setSurveyResponses(responses);
    
    // Determine which module was completed
    const aiResponses = Object.keys(responses).filter(key => key.startsWith('ai-')).length;
    const leadershipResponses = Object.keys(responses).filter(key => key.startsWith('leadership-')).length;
    const eeResponses = Object.keys(responses).filter(key => key.startsWith('ee-')).length;
    
    let completed = '';
    let module: 'ai-readiness' | 'leadership' | 'employee-experience' | '' = '';
    
    if (aiResponses >= 6 && availableModules.includes('ai-readiness')) {
      completed = 'ai-readiness';
      module = 'ai-readiness';
    } else if (leadershipResponses >= 8 && availableModules.includes('leadership')) {
      completed = 'leadership';
      module = 'leadership';
    } else if (eeResponses >= 16 && availableModules.includes('employee-experience')) {
      completed = 'employee-experience';
      module = 'employee-experience';
    }
    
    // Submit to MongoDB
    if (completed && module) {
      setIsSubmitting(true);
      try {
        // Convert string responses to numbers
        const numericResponses: Record<string, number> = {};
        Object.entries(responses).forEach(([key, value]) => {
          numericResponses[key] = parseInt(value);
        });

        await api.responses.submit({
          surveyId: urlParams.surveyId || 'default',
          module,
          responses: numericResponses,
          metadata: {
            userId: `user-${Date.now()}`, // Generate or get from auth
            department: undefined,
            role: undefined,
          }
        });

        toast.success('Survey submitted successfully!');
        
        setCompletedModule(completed);
        setMode('post-survey');
        
        // Refresh analytics data
        refetchOverview();
        moduleAnalytics.refetchAll();
        if (currentSurvey) refetchCampaign();
        
      } catch (error) {
        console.error('Error submitting survey:', error);
        toast.error('Failed to submit survey. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setMode('dashboard');
      setActiveModule('overview');
    }
  }, [availableModules, urlParams.surveyId, currentSurvey, refetchOverview, moduleAnalytics, refetchCampaign]);

  const handleTakeSurvey = () => {
    setMode('survey');
  };

  const handleBackToDashboard = () => {
    setMode('dashboard');
    setActiveModule('overview');
  };

  const handleModuleChange = (module: string) => {
    setActiveModule(module);
    if (module !== 'overview') {
      setActiveSubTab('survey');
    }
  };

  // Module configurations
  const moduleConfigs = {
    'ai-readiness': {
      id: 'ai-readiness',
      title: 'AI Readiness Assessment',
      description: 'Evaluate your organization\'s readiness for AI adoption and implementation',
      timeToComplete: '3-5 minutes',
      totalQuestions: 6,
      sections: [
        { name: 'Strategy & Leadership', questions: 2, description: 'Strategic AI vision and leadership commitment' },
        { name: 'Infrastructure & Skills', questions: 2, description: 'Technology infrastructure and team capabilities' },
        { name: 'Data & Culture', questions: 2, description: 'Data governance and organizational culture' }
      ]
    },
    'leadership': {
      id: 'leadership',
      title: 'Leadership Effectiveness',
      description: 'Assess leadership capabilities across multiple dimensions and contexts',
      timeToComplete: '4-6 minutes',
      totalQuestions: 8,
      sections: [
        { name: 'Strategic Vision', questions: 2, description: 'Vision setting and strategic direction' },
        { name: 'Team Development', questions: 2, description: 'People management and growth' },
        { name: 'Communication Excellence', questions: 2, description: 'Communication and listening skills' },
        { name: 'Decision Making', questions: 2, description: 'Decision quality and accountability' }
      ]
    },
    'employee-experience': {
      id: 'employee-experience',
      title: 'Employee Experience',
      description: 'Measure workplace satisfaction and engagement across key experience drivers',
      timeToComplete: '8-10 minutes',
      totalQuestions: 16,
      sections: [
        { name: 'Work Environment', questions: 4, description: 'Physical and cultural workspace' },
        { name: 'Career Growth', questions: 4, description: 'Development and advancement' },
        { name: 'Recognition & Rewards', questions: 4, description: 'Compensation and acknowledgment' },
        { name: 'Work-Life Balance', questions: 4, description: 'Flexibility and wellbeing' }
      ]
    }
  };

  // Show loading state while fetching initial data
  if (campaignLoading || overviewLoading) {
    return <LoadingSpinner message="Loading survey data from MongoDB..." />;
  }

  // Show error state if data fetch fails
  if (campaignError) {
    return <ErrorDisplay error={campaignError} onRetry={refetchCampaign} />;
  }

  if (overviewError && !overviewData) {
    return <ErrorDisplay error={overviewError} onRetry={refetchOverview} />;
  }

  // Survey mode
  if (mode === 'survey') {
    return (
      <>
        {isSubmitting && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6">
              <LoadingSpinner message="Submitting to MongoDB..." />
            </div>
          </div>
        )}
        <ModularSurvey 
          onComplete={handleSurveyComplete} 
          specificModule={isDirectSurveyLink ? availableModules[0] : undefined}
        />
      </>
    );
  }

  // Post-survey results mode
  if (mode === 'post-survey') {
    return (
      <PostSurveyDashboard
        completedModule={completedModule}
        onBackToDashboard={handleBackToDashboard}
        surveyResponses={surveyResponses}
        mockData={{
          aiReadinessData: [],
          leadershipData: [],
          employeeExperienceData: []
        }}
        isStandalone={isDirectSurveyLink}
      />
    );
  }

  // Main dashboard
  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <Sidebar 
          activeModule={activeModule} 
          onModuleChange={handleModuleChange}
          surveyStatus={surveyStatus}
          isAdmin={urlParams.isAdmin}
          availableModules={availableModules as string[]}
        />
        
        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {activeModule === 'overview' ? 
                    (currentSurvey ? 
                      `${currentSurvey.companyName} - ${currentSurvey.primaryModule === 'ai-readiness' ? 'AI Readiness' : 
                                                       currentSurvey.primaryModule === 'leadership' ? 'Leadership' : 
                                                       'Employee Experience'} Overview` : 
                      'Overview') :
                   activeModule === 'ai-readiness' ? 'AI Readiness' :
                   activeModule === 'leadership' ? 'Leadership' :
                   activeModule === 'employee-experience' ? 'Employee Experience' :
                   activeModule === 'survey-management' ? 'Survey Management' :
                   activeModule.replace('-', ' ')}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {currentSurvey ? 
                    `${currentSurvey.targetAudience} • ${currentSurvey.responseCount} responses • ${currentSurvey.status}` :
                   activeModule === 'overview' ? 'Real-time dashboard summary from MongoDB' :
                   activeModule.replace('-', ' ')}
                </p>
              </div>
              
              {/* Status indicators */}
              <div className="flex items-center gap-4">
                {currentSurvey && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-blue-800">
                        Live Data: {currentSurvey.companyName}
                      </span>
                    </div>
                  </div>
                )}
                
                {overviewData && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-800">
                        {overviewData.totalResponses} Total Responses
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6 h-full overflow-auto">
            {activeModule === 'overview' && (
              <>
                <WelcomeBanner
                  currentSurvey={currentSurvey as any}
                  isAdmin={urlParams.isAdmin}
                  availableModules={availableModules as string[]}
                />
                
                {overviewData ? (
                  <OverviewDashboard 
                    overallAverages={{
                      aiReadiness: overviewData.aiReadiness,
                      leadership: overviewData.leadership,
                      employeeExperience: overviewData.employeeExperience
                    }}
                    surveyResponses={surveyResponses}
                    mockData={{
                      aiReadinessData: [],
                      leadershipData: [],
                      employeeExperienceData: []
                    }}
                    availableModules={availableModules as ('ai-readiness' | 'leadership' | 'employee-experience')[]}
                  />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-600">No data available yet. Submit some surveys to see analytics!</p>
                  </div>
                )}
              </>
            )}

            {activeModule === 'survey-management' && (
              <SurveyManagement />
            )}

            {/* Standalone survey links removed from UI */}

            

            {availableModules.includes(activeModule as any) && (
              <div className="space-y-6">
                <Tabs value={activeSubTab} onValueChange={(value) => setActiveSubTab(value as 'survey' | 'analysis')}>
                  <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="survey">Survey</TabsTrigger>
                    <TabsTrigger value="analysis">Analysis</TabsTrigger>
                  </TabsList>

                  <TabsContent value="survey" className="mt-6">
                    <ModuleSurveyTab
                      module={moduleConfigs[activeModule as keyof typeof moduleConfigs]}
                      status={
                        activeModule === 'ai-readiness' ? surveyStatus.aiReadiness :
                        activeModule === 'leadership' ? surveyStatus.leadership :
                        activeModule === 'employee-experience' ? surveyStatus.employeeExperience :
                        'not-started'
                      }
                      progress={
                        activeModule === 'ai-readiness' ? 
                          Math.round((Object.keys(surveyResponses).filter(k => k.startsWith('ai-')).length / 6) * 100) :
                        activeModule === 'leadership' ?
                          Math.round((Object.keys(surveyResponses).filter(k => k.startsWith('leadership-')).length / 8) * 100) :
                          Math.round((Object.keys(surveyResponses).filter(k => k.startsWith('ee-')).length / 16) * 100)
                      }
                      onStartSurvey={handleTakeSurvey}
                      onResumeSurvey={handleTakeSurvey}
                      onViewAnalysis={() => setActiveSubTab('analysis')}
                      lastUpdated={Object.keys(surveyResponses).length > 0 ? new Date().toLocaleDateString() : undefined}
                    />
                  </TabsContent>

                  <TabsContent value="analysis" className="mt-6">
                    {moduleAnalytics.loading ? (
                      <LoadingSpinner message="Loading module analytics..." />
                    ) : moduleAnalytics.error ? (
                      <ErrorDisplay error={moduleAnalytics.error} onRetry={moduleAnalytics.refetchAll} />
                    ) : (
                      <>
                        {activeModule === 'ai-readiness' && moduleAnalytics.aiReadiness.data && (
                          <div className="bg-white rounded-lg border p-6">
                            <h3 className="text-lg font-semibold mb-4">AI Readiness Analytics</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600">Positive Score</p>
                                <p className="text-3xl font-bold text-green-600">
                                  {moduleAnalytics.aiReadiness.data.positiveScore.toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Total Responses</p>
                                <p className="text-3xl font-bold text-blue-600">
                                  {moduleAnalytics.aiReadiness.data.totalResponses}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeModule === 'leadership' && moduleAnalytics.leadership.data && (
                          <div className="bg-white rounded-lg border p-6">
                            <h3 className="text-lg font-semibold mb-4">Leadership Analytics</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600">Positive Score</p>
                                <p className="text-3xl font-bold text-green-600">
                                  {moduleAnalytics.leadership.data.positiveScore.toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Total Responses</p>
                                <p className="text-3xl font-bold text-blue-600">
                                  {moduleAnalytics.leadership.data.totalResponses}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeModule === 'employee-experience' && moduleAnalytics.employeeExperience.data && (
                          <div className="bg-white rounded-lg border p-6">
                            <h3 className="text-lg font-semibold mb-4">Employee Experience Analytics</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-gray-600">Positive Score</p>
                                <p className="text-3xl font-bold text-green-600">
                                  {moduleAnalytics.employeeExperience.data.positiveScore.toFixed(1)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Total Responses</p>
                                <p className="text-3xl font-bold text-blue-600">
                                  {moduleAnalytics.employeeExperience.data.totalResponses}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
