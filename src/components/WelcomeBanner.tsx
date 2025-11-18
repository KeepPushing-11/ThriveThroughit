import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ExternalLink, Eye, Users, BarChart3 } from "lucide-react";

interface WelcomeBannerProps {
  currentSurvey?: {
    companyName: string;
    surveyType: string;
    responseCount: number;
    status: string;
    modules: string[];
    primaryModule: string;
  };
  isAdmin: boolean;
  availableModules?: string[];
}

export function WelcomeBanner({ currentSurvey, isAdmin, availableModules = [] }: WelcomeBannerProps) {
  const getModuleName = (module: string) => {
    switch (module) {
      case 'ai-readiness': return 'AI Readiness';
      case 'leadership': return 'Leadership';
      case 'employee-experience': return 'Employee Experience';
      default: return module;
    }
  };

  const getPrimaryModuleName = (primaryModule: string) => {
    return getModuleName(primaryModule);
  };

  if (currentSurvey) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-blue-900">
                Welcome to {currentSurvey.companyName}'s {getPrimaryModuleName(currentSurvey.primaryModule)} Dashboard
              </CardTitle>
              <CardDescription className="text-blue-700 mt-1">
                This dashboard shows results for your {currentSurvey.surveyType} survey
                {currentSurvey.modules.length > 1 && (
                  <span> covering {currentSurvey.modules.map(getModuleName).join(', ')}</span>
                )}
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
              {currentSurvey.responseCount} responses
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-900">View Results</p>
                <p className="text-sm text-blue-600">Explore detailed analytics and insights</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-blue-900">Survey Status</p>
                <p className="text-sm text-blue-600">
                  {currentSurvey.status === 'live' ? 'Currently collecting responses' : 'Survey completed'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-blue-900">{getPrimaryModuleName(currentSurvey.primaryModule)} Score</p>
                <p className="text-sm text-blue-600">Real-time calculation of positive responses</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isAdmin) {
    return (
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 mb-6">
        <CardHeader>
          <CardTitle className="text-xl text-purple-900">
            Survey Management Dashboard
          </CardTitle>
          <CardDescription className="text-purple-700">
            Create and manage AI readiness surveys for your clients. Currently viewing aggregated data from all surveys.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => window.location.hash = '#survey-management'}>
              <Users className="h-4 w-4 mr-2" />
              Manage Surveys
            </Button>
            <div className="text-sm text-purple-600">
              • Create custom surveys for companies • Generate unique survey and dashboard links • Track response rates across all clients
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200 mb-6">
      <CardHeader>
        <CardTitle className="text-xl text-gray-900">
          LEAP Survey Dashboard
        </CardTitle>
        <CardDescription className="text-gray-700">
          Comprehensive insights into AI readiness, leadership effectiveness, and employee experience
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Button variant="outline">
            <ExternalLink className="h-4 w-4 mr-2" />
            Take Survey
          </Button>
          <div className="text-sm text-gray-600">
            • Complete assessment modules • View real-time results • Track progress over time
          </div>
        </div>
      </CardContent>
    </Card>
  );
}