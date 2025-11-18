import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Copy, Plus, ExternalLink, Eye, Settings, Users, BarChart3 } from "lucide-react";
import { 
  SurveyConfig, 
  createSurveyConfig, 
  generateSurveyUrls, 
  mockSurveyConfigs 
} from "../utils/surveyManagement";
import { toast } from "sonner";

export function SurveyManagement() {
  const [surveys, setSurveys] = useState<SurveyConfig[]>(mockSurveyConfigs);
  // Default to a neutral primary module (AI Readiness is not mandatory)
  const [newSurvey, setNewSurvey] = useState({
    companyName: '',
    surveyType: 'managers' as 'managers' | 'employees' | 'mixed',
    primaryModule: 'leadership' as 'ai-readiness' | 'leadership' | 'employee-experience',
    modules: ['leadership'] as ('ai-readiness' | 'leadership' | 'employee-experience')[]
  });

  const handleCreateSurvey = () => {
    if (!newSurvey.companyName.trim()) {
      toast.error("Please enter a company name");
      return;
    }

    const surveyConfig = createSurveyConfig(
      newSurvey.companyName,
      newSurvey.surveyType,
      newSurvey.modules,
      newSurvey.primaryModule
    );

    setSurveys([surveyConfig, ...surveys]);
    setNewSurvey({
      companyName: '',
      surveyType: 'managers',
      primaryModule: 'ai-readiness',
      modules: ['ai-readiness']
    });

    toast.success(`Survey created for ${newSurvey.companyName}!`);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'managers': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'employees': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'mixed': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Survey Management</h1>
          <p className="text-gray-600 mt-1">Create and manage AI readiness surveys for your clients</p>
        </div>
      </div>

      <Tabs defaultValue="surveys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="surveys">All Surveys</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Survey
              </CardTitle>
              <CardDescription>
                Generate a custom survey for a client company. Choose from AI Readiness (6 questions), Leadership Effectiveness (8 questions), or Employee Experience (16 questions) modules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    placeholder="e.g., TechCorp Inc"
                    value={newSurvey.companyName}
                    onChange={(e) => setNewSurvey({ ...newSurvey, companyName: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="survey-type">Survey Type</Label>
                  <Select
                    value={newSurvey.surveyType}
                    onValueChange={(value) => setNewSurvey({ ...newSurvey, surveyType: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="managers">Managers Only</SelectItem>
                      <SelectItem value="employees">Employees Only</SelectItem>
                      <SelectItem value="mixed">Mixed Audience</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-module">Primary Module</Label>
                  <Select
                    value={newSurvey.primaryModule}
                    onValueChange={(value) => {
                      const primaryModule = value as 'ai-readiness' | 'leadership' | 'employee-experience';
                      setNewSurvey({ 
                        ...newSurvey, 
                        primaryModule,
                        modules: [primaryModule] // Reset to just primary module
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ai-readiness">AI Readiness Assessment</SelectItem>
                      <SelectItem value="leadership">Leadership Effectiveness</SelectItem>
                      <SelectItem value="employee-experience">Employee Experience</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Selected Module</Label>
                  <p className="text-xs text-gray-500">Select a single primary module for the client — one module per company.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Selected Modules Summary</Label>
                <div className="flex flex-wrap gap-2">
                  {newSurvey.modules.map((module) => (
                    <Badge 
                      key={module}
                      variant="outline" 
                      className={`${
                        module === newSurvey.primaryModule 
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}
                    >
                      {module === 'ai-readiness' ? 'AI Readiness (6 questions)' :
                       module === 'leadership' ? 'Leadership (8 questions)' :
                       'Employee Experience (16 questions)'}
                      {module === newSurvey.primaryModule && ' - Primary'}
                    </Badge>
                  ))}
                </div>

                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-gray-900">Calculation Methods:</h4>
                  {newSurvey.modules.map((module) => (
                    <div key={module} className="text-sm">
                      <span className="font-medium text-gray-700">
                        {module === 'ai-readiness' ? '🤖 AI Readiness:' :
                         module === 'leadership' ? '👥 Leadership:' :
                         '❤️ Employee Experience:'}
                      </span>
                      <span className="text-gray-600 ml-2">
                        {module === 'ai-readiness' ? 'Average % of positive responses (options 4 or 5)' :
                         module === 'leadership' ? 'Average cumulative score across all questions' :
                         'Favorable ratings % (responses 7-10 on 10-point scale)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleCreateSurvey} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Survey
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="surveys" className="space-y-4">
          {surveys.map((survey) => {
            const urls = generateSurveyUrls(survey);
            
            return (
              <Card key={survey.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{survey.companyName}</CardTitle>
                      <CardDescription>
                        Created {new Date(survey.createdDate).toLocaleDateString()} • {survey.targetAudience}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(survey.status)}>
                        {survey.status.charAt(0).toUpperCase() + survey.status.slice(1)}
                      </Badge>
                      <Badge variant="outline" className={getTypeColor(survey.surveyType)}>
                        {survey.surveyType}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Survey ID:</span>
                      <p className="text-gray-600 font-mono text-xs mt-1">{survey.id}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Responses:</span>
                      <p className="text-gray-900 font-semibold">{survey.responseCount}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Primary Module:</span>
                      <p className="text-gray-900 font-semibold capitalize">
                        {survey.primaryModule.replace('-', ' ')}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">All Modules:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {survey.modules.map(module => (
                          <span 
                            key={module}
                            className={`px-2 py-1 text-xs rounded ${
                              module === survey.primaryModule 
                                ? 'bg-blue-100 text-blue-800 font-medium' 
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {module.replace('-', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Survey Link</p>
                        <p className="text-sm text-gray-600">Send this to participants</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(urls.surveyUrl, 'Survey link')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(urls.surveyUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">Dashboard Link</p>
                        <p className="text-sm text-gray-600">Send this to see results</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(urls.dashboardUrl, 'Dashboard link')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(urls.dashboardUrl, '_blank')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                    <Button variant="outline" size="sm">
                      <Users className="h-4 w-4 mr-2" />
                      Participants
                    </Button>
                    <Button variant="outline" size="sm">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Surveys</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">{surveys.length}</p>
                <p className="text-sm text-gray-600">Active campaigns</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total Responses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">
                  {surveys.reduce((sum, survey) => sum + survey.responseCount, 0)}
                </p>
                <p className="text-sm text-gray-600">Across all surveys</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Active Surveys</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-600">
                  {surveys.filter(s => s.status === 'active').length}
                </p>
                <p className="text-sm text-gray-600">Currently collecting data</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Survey Performance</CardTitle>
              <CardDescription>Response rates by company and survey type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {surveys.map((survey) => (
                  <div key={survey.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{survey.companyName}</p>
                      <p className="text-sm text-gray-600">{survey.surveyType} • {survey.targetAudience}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{survey.responseCount} responses</p>
                      <Badge variant="outline" className={getStatusColor(survey.status)}>
                        {survey.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}