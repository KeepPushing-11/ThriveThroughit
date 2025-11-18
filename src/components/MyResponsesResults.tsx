import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { CheckCircle2, Circle } from "lucide-react";
import { aiReadinessQuestions, leadershipQuestions, employeeExperienceQuestions } from "../utils/surveyData";

interface MyResponsesResultsProps {
  surveyResponses: Record<string, string>;
  module: string; // module id or 'all' to show all modules
}

export function MyResponsesResults({ surveyResponses, module }: MyResponsesResultsProps) {
  // Helper to pick questions for a single module id
  const questionsForModule = (m: string) => {
    if (m === 'ai-readiness') return aiReadinessQuestions;
    if (m === 'leadership') return leadershipQuestions;
    return employeeExperienceQuestions;
  };

  // Get scale labels based on question scale
  const getScaleLabel = (scale: string, value: string): string => {
    const numValue = parseInt(value);
    
    if (scale === '1-5') {
      const labels = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
      return labels[numValue - 1] || value;
  } else if (scale === '0-10') {
      if (numValue <= 3) return `${value} - Low`;
      if (numValue <= 6) return `${value} - Medium`;
      return `${value} - High`;
    }
    return value;
  };

  // Check if response is positive
  const isPositiveResponse = (scale: string, value: string): boolean => {
    const numValue = parseInt(value);
    
    if (scale === '1-5') {
      return numValue >= 4; // 4 or 5 is positive
  } else if (scale === '0-10') {
      return numValue >= 7; // 7-10 is positive
    }
    return false;
  };

  // Render results for a single module
  const renderModuleResults = (m: string) => {
    const questions = questionsForModule(m);

    // Group questions by section
    const groupedQuestions: Record<string, typeof questions> = {};
    questions.forEach(question => {
      if (!groupedQuestions[question.section]) groupedQuestions[question.section] = [];
      groupedQuestions[question.section].push(question);
    });

    // Filter to only show questions that have responses for this module
    const answeredSections: Record<string, typeof questions> = {};
    Object.entries(groupedQuestions).forEach(([sectionName, sectionQuestions]) => {
      const answeredInSection = sectionQuestions.filter(q => surveyResponses[q.id]);
      if (answeredInSection.length > 0) {
        answeredSections[sectionName] = answeredInSection;
      }
    });

    const totalResponses = Object.keys(surveyResponses).filter(k => questions.some(q => q.id === k)).length;
    const positiveResponses = Object.entries(surveyResponses).filter(([key, value]) => {
      const question = questions.find(q => q.id === key);
      if (!question) return false;
      return isPositiveResponse(question.scale, value);
    }).length;

    const positivePercentage = totalResponses > 0 ? Math.round((positiveResponses / totalResponses) * 100) : 0;

    return {
      answeredSections,
      totalResponses,
      positiveResponses,
      positivePercentage,
      questions
    };
  };

  // If module === 'all', render for all three modules
  if (module === 'all') {
    const modules = ['ai-readiness', 'leadership', 'employee-experience'];

    // Determine if any responses at all exist across modules
    const anyResponses = modules.some(m => {
      const questions = questionsForModule(m);
      return questions.some(q => !!surveyResponses[q.id]);
    });

    if (!anyResponses) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-600">No responses recorded yet.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {modules.map((m) => {
          const { answeredSections, totalResponses, positiveResponses, positivePercentage, questions } = renderModuleResults(m);

          if (totalResponses === 0) return null;

          return (
            <div key={m} className="space-y-4">
              <h3 className="text-lg font-semibold capitalize">{m.replace('-', ' ')}</h3>

              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-900">
                    <CheckCircle2 className="h-6 w-6" />
                    Your Response Summary
                  </CardTitle>
                  <CardDescription className="text-green-700">
                    Review your submitted responses for this module
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="text-sm text-gray-600 mb-1">Total Responses</div>
                      <div className="text-2xl font-bold text-gray-900">{totalResponses}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="text-sm text-gray-600 mb-1">Positive Responses</div>
                      <div className="text-2xl font-bold text-green-600">{positiveResponses}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <div className="text-sm text-gray-600 mb-1">Positive Rate</div>
                      <div className="text-2xl font-bold text-green-600">{positivePercentage}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {Object.entries(answeredSections).map(([sectionName, sectionQuestions], sectionIndex) => (
                  <Card key={sectionIndex}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{sectionName}</CardTitle>
                          <CardDescription>
                            {sectionQuestions.length} question{sectionQuestions.length > 1 ? 's' : ''} answered
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Section {sectionIndex + 1}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {sectionQuestions.map((question, qIndex) => {
                          const response = surveyResponses[question.id];
                          if (!response) return null;

                          const isPositive = isPositiveResponse(question.scale, response);
                          const scaleLabel = getScaleLabel(question.scale, response);

                          return (
                            <div key={question.id} className="space-y-3">
                              {qIndex > 0 && <Separator />}

                              <div className="space-y-2">
                                {/* Question */}
                                <div className="flex items-start gap-3">
                                  <div className={`mt-1 p-1 rounded-full ${isPositive ? 'bg-green-100' : 'bg-gray-100'}`}>
                                    {isPositive ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-gray-400" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900">{question.question}</p>
                                  </div>
                                </div>

                                {/* Response */}
                                <div className="ml-10 flex items-center gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-600">Your response:</span>
                                      <Badge 
                                        variant="outline" 
                                        className={`$ {
                                          isPositive 
                                            ? 'bg-green-50 text-green-700 border-green-200' 
                                            : 'bg-gray-50 text-gray-700 border-gray-200'
                                        }`}
                                      >
                                        {scaleLabel}
                                      </Badge>
                                    </div>

                                    {/* Visual scale indicator */}
                                    <div className="mt-2 flex items-center gap-1">
                                      {question.scale === '1-5' && (
                                        <>
                                          {[1, 2, 3, 4, 5].map((num) => (
                                            <div
                                              key={num}
                                              className={`h-2 flex-1 rounded ${
                                                num === parseInt(response)
                                                  ? isPositive
                                                    ? 'bg-green-500'
                                                    : 'bg-gray-500'
                                                  : 'bg-gray-200'
                                              }`}
                                            />
                                          ))}
                                        </>
                                      )}
                                      {question.scale === '0-10' && (
                                        <>
                                          {[1,2,3,4,5,6,7,8,9,10].map((num) => (
                                            <div
                                              key={num}
                                              className={`h-2 flex-1 rounded ${
                                                num === parseInt(response)
                                                  ? isPositive
                                                    ? 'bg-green-500'
                                                    : 'bg-gray-500'
                                                  : 'bg-gray-200'
                                              }`}
                                            />
                                          ))}
                                        </>
                                      )}
                                    </div>

                                    {/* Scale labels */}
                                    <div className="mt-1 flex justify-between text-xs text-gray-500">
                                      <span>{question.scale === '1-5' ? '1 - Strongly Disagree' : '1 - Low'}</span>
                                      <span>{question.scale === '1-5' ? '5 - Strongly Agree' : '10 - High'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Default: single module (existing behavior)
  const { answeredSections, totalResponses, positiveResponses, positivePercentage, questions } = renderModuleResults(module);

  if (totalResponses === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-gray-600">No responses recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <CheckCircle2 className="h-6 w-6" />
            Your Response Summary
          </CardTitle>
          <CardDescription className="text-green-700">
            Review all your submitted responses for this module
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="text-sm text-gray-600 mb-1">Total Responses</div>
              <div className="text-2xl font-bold text-gray-900">{totalResponses}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="text-sm text-gray-600 mb-1">Positive Responses</div>
              <div className="text-2xl font-bold text-green-600">{positiveResponses}</div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <div className="text-sm text-gray-600 mb-1">Positive Rate</div>
              <div className="text-2xl font-bold text-green-600">{positivePercentage}%</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responses by Section */}
      <div className="space-y-6">
        {Object.entries(answeredSections).map(([sectionName, sectionQuestions], sectionIndex) => (
          <Card key={sectionIndex}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{sectionName}</CardTitle>
                  <CardDescription>
                    {sectionQuestions.length} question{sectionQuestions.length > 1 ? 's' : ''} answered
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Section {sectionIndex + 1}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sectionQuestions.map((question, qIndex) => {
                  const response = surveyResponses[question.id];
                  if (!response) return null;

                  const isPositive = isPositiveResponse(question.scale, response);
                  const scaleLabel = getScaleLabel(question.scale, response);

                  return (
                    <div key={question.id} className="space-y-3">
                      {qIndex > 0 && <Separator />}

                      <div className="space-y-2">
                        {/* Question */}
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 p-1 rounded-full ${isPositive ? 'bg-green-100' : 'bg-gray-100'}`}>
                            {isPositive ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{question.question}</p>
                          </div>
                        </div>

                        {/* Response */}
                        <div className="ml-10 flex items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">Your response:</span>
                              <Badge 
                                variant="outline" 
                                className={`$ {
                                  isPositive 
                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                    : 'bg-gray-50 text-gray-700 border-gray-200'
                                }`}
                              >
                                {scaleLabel}
                              </Badge>
                            </div>

                            {/* Visual scale indicator */}
                            <div className="mt-2 flex items-center gap-1">
                              {question.scale === '1-5' && (
                                <>
                                  {[1, 2, 3, 4, 5].map((num) => (
                                    <div
                                      key={num}
                                      className={`h-2 flex-1 rounded ${
                                        num === parseInt(response)
                                          ? isPositive
                                            ? 'bg-green-500'
                                            : 'bg-gray-500'
                                          : 'bg-gray-200'
                                      }`}
                                    />
                                  ))}
                                </>
                              )}
                              {question.scale === '0-10' && (
                                <>
                                  {[1,2,3,4,5,6,7,8,9,10].map((num) => (
                                    <div
                                      key={num}
                                      className={`h-2 flex-1 rounded ${
                                        num === parseInt(response)
                                          ? isPositive
                                            ? 'bg-green-500'
                                            : 'bg-gray-500'
                                          : 'bg-gray-200'
                                      }`}
                                    />
                                  ))}
                                </>
                              )}
                            </div>

                            {/* Scale labels */}
                            <div className="mt-1 flex justify-between text-xs text-gray-500">
                              <span>{question.scale === '1-5' ? '1 - Strongly Disagree' : '1 - Low'}</span>
                              <span>{question.scale === '1-5' ? '5 - Strongly Agree' : '10 - High'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
