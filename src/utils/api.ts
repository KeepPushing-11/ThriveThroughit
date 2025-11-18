// API Service Layer for MongoDB Backend Communication
import { API_ENDPOINTS } from '../config/database';
import type { SurveyCampaign } from '../types/survey';
import type { 
  AIReadinessResponse, 
  LeadershipResponse, 
  EmployeeExperienceResponse 
} from './mockData';

// API Error Handler
class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

// Generic fetch wrapper with error handling
async function fetchAPI<T>(
  url: string, 
  options: RequestInit = {}
): Promise<T> {
  try {
    // Attach JSON content-type and Authorization if a token exists in localStorage
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    try {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (token && !headers['Authorization']) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }
    } catch (e) {
      // localStorage may not be available in some environments; ignore
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        response.status, 
        errorData.message || `HTTP Error ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    console.error('API Request failed:', error);
    throw new Error('Network error - please check your connection');
  }
}

// ============================================
// SURVEY CAMPAIGN APIs
// ============================================

export interface CreateCampaignRequest {
  companyName: string;
  targetAudience: string;
  modules: Array<'ai-readiness' | 'leadership' | 'employee-experience'>;
  primaryModule: 'ai-readiness' | 'leadership' | 'employee-experience';
  startDate: string;
  endDate: string;
}

export const campaignAPI = {
  // Get all campaigns
  async getAll(): Promise<SurveyCampaign[]> {
    return fetchAPI<SurveyCampaign[]>(API_ENDPOINTS.campaigns.list);
  },

  // Get campaign by ID
  async getById(id: string): Promise<SurveyCampaign> {
    return fetchAPI<SurveyCampaign>(API_ENDPOINTS.campaigns.getById(id));
  },

  // Create new campaign
  async create(data: CreateCampaignRequest): Promise<SurveyCampaign> {
    return fetchAPI<SurveyCampaign>(API_ENDPOINTS.campaigns.create, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Update campaign
  async update(id: string, data: Partial<SurveyCampaign>): Promise<SurveyCampaign> {
    return fetchAPI<SurveyCampaign>(API_ENDPOINTS.campaigns.update(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Delete campaign
  async delete(id: string): Promise<void> {
    return fetchAPI<void>(API_ENDPOINTS.campaigns.delete(id), {
      method: 'DELETE',
    });
  },
};

// ============================================
// SURVEY RESPONSE APIs
// ============================================

export interface SubmitSurveyRequest {
  surveyId: string;
  module: 'ai-readiness' | 'leadership' | 'employee-experience';
  responses: Record<string, number>;
  metadata?: {
    userId?: string;
    department?: string;
    role?: string;
    tenure?: string;
  };
}

export interface SurveyResponseData {
  aiReadiness: AIReadinessResponse[];
  leadership: LeadershipResponse[];
  employeeExperience: EmployeeExperienceResponse[];
}

export const responseAPI = {
  // Submit survey responses
  async submit(data: SubmitSurveyRequest): Promise<{ success: boolean; responseId: string }> {
    return fetchAPI(API_ENDPOINTS.responses.submit, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get all responses for a survey
  async getBySurvey(surveyId: string): Promise<SurveyResponseData> {
    return fetchAPI<SurveyResponseData>(
      API_ENDPOINTS.responses.getBySurvey(surveyId)
    );
  },

  // Get user's responses
  async getByUser(userId: string): Promise<SurveyResponseData> {
    return fetchAPI<SurveyResponseData>(
      API_ENDPOINTS.responses.getByUser(userId)
    );
  },
};

// ============================================
// ANALYTICS APIs
// ============================================

export interface OverviewAnalytics {
  aiReadiness: number;
  leadership: number;
  employeeExperience: number;
  totalResponses: number;
  lastUpdated: string;
}

export interface ModuleAnalytics {
  positiveScore: number;
  totalResponses: number;
  sectionBreakdown: Array<{
    section: string;
    positivePercentage: number;
    positiveCount: number;
    totalCount: number;
  }>;
  demographics: Array<{
    department: string;
    score: number;
    count: number;
  }>;
  trends: Array<{
    date: string;
    score: number;
  }>;
  questionScores: Array<{
    questionId: string;
    question: string;
    positivePercentage: number;
    responseDistribution: Record<number, number>;
  }>;
}

export const analyticsAPI = {
  // Get overview analytics
  async getOverview(surveyId?: string): Promise<OverviewAnalytics> {
    return fetchAPI<OverviewAnalytics>(
      API_ENDPOINTS.analytics.overview(surveyId)
    );
  },

  // Get AI Readiness analytics
  async getAIReadiness(surveyId?: string): Promise<ModuleAnalytics> {
    return fetchAPI<ModuleAnalytics>(
      API_ENDPOINTS.analytics.aiReadiness(surveyId)
    );
  },

  // Get Leadership analytics
  async getLeadership(surveyId?: string): Promise<ModuleAnalytics> {
    return fetchAPI<ModuleAnalytics>(
      API_ENDPOINTS.analytics.leadership(surveyId)
    );
  },

  // Get Employee Experience analytics
  async getEmployeeExperience(surveyId?: string): Promise<ModuleAnalytics> {
    return fetchAPI<ModuleAnalytics>(
      API_ENDPOINTS.analytics.employeeExperience(surveyId)
    );
  },
};

// ============================================
// REAL-TIME DATA APIs
// ============================================

export interface RealtimeStats {
  activeResponses: number;
  todayResponses: number;
  averageCompletionTime: number;
  completionRate: number;
}

export const realtimeAPI = {
  // Get real-time statistics
  async getStats(surveyId?: string): Promise<RealtimeStats> {
    const url = surveyId 
      ? `${API_ENDPOINTS.realtime.stats}?surveyId=${surveyId}`
      : API_ENDPOINTS.realtime.stats;
    return fetchAPI<RealtimeStats>(url);
  },

  // Get recent responses (for live feed)
  async getRecentResponses(limit: number = 10): Promise<any[]> {
    return fetchAPI(`${API_ENDPOINTS.realtime.responses}?limit=${limit}`);
  },
};

// ============================================
// DATA FETCHING HOOKS HELPERS
// ============================================

export interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function createInitialState<T>(): DataState<T> {
  return {
    data: null,
    loading: true,
    error: null,
  };
}

export function setLoading<T>(state: DataState<T>): DataState<T> {
  return { ...state, loading: true, error: null };
}

export function setData<T>(state: DataState<T>, data: T): DataState<T> {
  return { data, loading: false, error: null };
}

export function setError<T>(state: DataState<T>, error: string): DataState<T> {
  return { ...state, loading: false, error };
}

// ============================================
// EXPORT ALL APIs
// ============================================

export const api = {
  campaigns: campaignAPI,
  responses: responseAPI,
  analytics: analyticsAPI,
  realtime: realtimeAPI,
};

export default api;
