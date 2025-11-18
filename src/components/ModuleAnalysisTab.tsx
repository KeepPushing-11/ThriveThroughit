import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  AlertTriangle,
  BarChart3,
  Users,
  Filter,
  Eye
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { MyResponsesResults } from './MyResponsesResults';

interface ModuleAnalysisTabProps {
  moduleTitle: string;
  summaryMetrics: {
    positiveAverage: number;
    totalQuestions: number;
    responseCount: number;
    trend: number;
  };
  questionScores: Array<{
    question: string;
    score: number;
    section?: string;
  }>;
  demographicData?: Array<{
    department: string;
    score: number;
    responses: number;
  }>;
  sectionData?: Array<{
    section: string;
    score: number;
    questionCount: number;
  }>;
  // Optional: personal survey responses to show in the My Responses tab
  surveyResponses?: Record<string, string>;
  // Optional: module id for the responses (e.g., 'ai-readiness')
  moduleId?: string;
  // Optional: survey id (used to join realtime survey room)
  surveyId?: string;
  // Scale used by the module (affects percent calculations). '1-5' maps 1..5, '0-10' maps 0..10
  scale?: '1-5' | '0-10';
}

export function ModuleAnalysisTab({
  moduleTitle,
  summaryMetrics,
  questionScores,
  demographicData = [],
  sectionData = [],
  surveyResponses,
  moduleId
  , surveyId,
  scale = '1-5'
}: ModuleAnalysisTabProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'all' | 'high-impact' | 'needs-attention'>('all');
  // Local copy of summary metrics to allow incremental updates without forcing parent refetch
  const [localSummary, setLocalSummary] = useState(summaryMetrics);

  // keep localSummary in sync when parent props change
  useEffect(() => {
    setLocalSummary(summaryMetrics);
  }, [summaryMetrics]);

  // Realtime incremental updates (if socket available)
  useEffect(() => {
    let mounted = true;
    // lazy import to avoid adding top-level dependency if not used
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useRealtimeResponses } = require('../client/hooks/useRealtimeResponses');
      const realtime = useRealtimeResponses();
      realtime.connect();
      // join the survey-specific room when surveyId provided so we only receive relevant events
      if (surveyId) {
        try { realtime.joinSurvey(surveyId); } catch (e) { /* noop */ }
      }

      const off = realtime.onResponseCreated((payload: any) => {
        try {
          if (!mounted) return;
          const resp = payload?.response;
          if (!resp || !resp.answers) return;
          // determine prefix for this module
          const prefix = moduleId === 'ai-readiness' ? 'ai-' : moduleId === 'leadership' ? 'leadership-' : 'ee-';
          const keys = Object.keys(resp.answers || {});
          const moduleKeys = keys.filter(k => String(k).startsWith(prefix));
          if (moduleKeys.length === 0) return; // not relevant to this module

          // compute new response average using configured scale
          const values = moduleKeys.map(k => Number(resp.answers[k]) || 0);
          const maxPer = scale === '0-10' ? 10 : 5;
          const avg = values.reduce((s, v) => s + v, 0) / values.length;
          const percent = (avg / maxPer) * 100;

          setLocalSummary(prev => {
            const prevCount = prev.responseCount || 0;
            const prevAvg = prev.positiveAverage || 0;
            const newCount = prevCount + 1;
            const newAvg = (prevAvg * prevCount + percent) / newCount;
            return { ...prev, responseCount: newCount, positiveAverage: newAvg };
          });
        } catch (e) {
          console.error('ModuleAnalysisTab realtime update error', e);
        }
      });

      return () => {
        mounted = false;
        try { off(); } catch (e) { /* noop */ }
        try { if (surveyId) realtime.leaveSurvey(surveyId); } catch (e) { /* noop */ }
        try { realtime.disconnect(); } catch (e) { /* noop */ }
      };
    } catch (err) {
      // hook not available or require failed; skip realtime updates
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId]);

  // Filter questions based on view mode
  const filteredQuestions = questionScores.filter(q => {
    switch (viewMode) {
      case 'high-impact':
        return q.score >= 80;
      case 'needs-attention':
        return q.score < 60;
      default:
        return true;
    }
  }).sort((a, b) => b.score - a.score);

  // Mock trend data
  const trendData = [
    { period: 'Q1', score: localSummary.positiveAverage - 8 },
    { period: 'Q2', score: localSummary.positiveAverage - 4 },
    { period: 'Q3', score: localSummary.positiveAverage - 1 },
    { period: 'Q4', score: localSummary.positiveAverage }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-50 border-green-200';
    if (score >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-6">
      {/* Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Positive Response Average</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{localSummary.positiveAverage.toFixed(1)}%</div>
            <div className="flex items-center gap-1 mt-1">
              {localSummary.trend >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <p className={`text-xs ${localSummary.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {localSummary.trend >= 0 ? '+' : ''}{localSummary.trend.toFixed(1)}% vs last quarter
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Score Range</CardTitle>
            <Award className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.min(...questionScores.map(q => q.score)).toFixed(0)} - {Math.max(...questionScores.map(q => q.score)).toFixed(0)}%
            </div>
            <p className="text-xs text-gray-600 mt-1">Question score spread</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Responses</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{localSummary.responseCount}</div>
            <p className="text-xs text-gray-600 mt-1">Across {localSummary.totalQuestions} questions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">High Performers</CardTitle>
            <AlertTriangle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {questionScores.filter(q => q.score >= 80).length}
            </div>
            <p className="text-xs text-gray-600 mt-1">Questions scoring 80%+</p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Card */}
      <Card>
        <CardHeader>
          <CardTitle>Score Trend</CardTitle>
          <CardDescription>Quarterly performance progression</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip formatter={(value) => [`${value}%`, 'Score']} />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#3B82F6" 
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Analysis Tabs */}
      <Tabs defaultValue="questions" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="questions">Question Scores</TabsTrigger>
            {sectionData.length > 0 && (
              <TabsTrigger value="sections">Sections</TabsTrigger>
            )}
            {demographicData.length > 0 && (
              <TabsTrigger value="demographics">Demographics</TabsTrigger>
            )}
            {surveyResponses && moduleId && (
              <TabsTrigger value="my-responses">My Responses</TabsTrigger>
            )}
          </TabsList>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('all')}
            >
              <Eye className="h-4 w-4 mr-1" />
              All Questions
            </Button>
            <Button
              variant={viewMode === 'high-impact' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('high-impact')}
            >
              <Award className="h-4 w-4 mr-1" />
              High Impact
            </Button>
            <Button
              variant={viewMode === 'needs-attention' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('needs-attention')}
            >
              <AlertTriangle className="h-4 w-4 mr-1" />
              Needs Attention
            </Button>
          </div>
        </div>
        
        {/* My Responses trigger is rendered inside the main TabsList (below) */}

        <TabsContent value="questions" className="space-y-4">
          <div className="space-y-3">
            {filteredQuestions.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500">No questions match the current filter criteria.</p>
              </Card>
            ) : (
              filteredQuestions.map((question, index) => (
                <Card key={index} className={getScoreBgColor(question.score)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 pr-4">
                        <p className="font-medium text-gray-900">{question.question}</p>
                        {question.section && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {question.section}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${getScoreColor(question.score)}`}>
                          {question.score.toFixed(1)}%
                        </div>
                        <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full ${
                              question.score >= 80 ? 'bg-green-500' :
                              question.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${question.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {sectionData.length > 0 && (
          <TabsContent value="sections">
            <Card>
              <CardHeader>
                <CardTitle>Section Performance</CardTitle>
                <CardDescription>Average scores by section</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sectionData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="section" type="category" width={120} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Score']} />
                    <Bar dataKey="score" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {demographicData.length > 0 && (
          <TabsContent value="demographics">
            <Card>
              <CardHeader>
                <CardTitle>Demographic Performance</CardTitle>
                <CardDescription>Scores by department/group</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={demographicData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Score']} />
                    <Bar dataKey="score" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {surveyResponses && moduleId && (
          <TabsContent value="my-responses">
            <MyResponsesResults surveyResponses={surveyResponses} module={moduleId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}