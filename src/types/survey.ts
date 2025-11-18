export interface ModuleConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

export interface SurveyCampaign {
  id: string;
  title: string;
  status: 'live' | 'closed' | 'draft';
  moduleId: string;
  startDate: string;
  endDate?: string;
  participantCount: number;
  completionRate: number;
  isActive: boolean;
}

// Extend SurveyCampaign with optional fields used in the app UI
export interface ExtendedSurveyCampaign extends SurveyCampaign {
  companyName?: string;
  surveyType?: string;
  targetAudience?: string;
  responseCount?: number;
  modules?: ('ai-readiness' | 'leadership' | 'employee-experience')[];
  primaryModule?: 'ai-readiness' | 'leadership' | 'employee-experience';
}