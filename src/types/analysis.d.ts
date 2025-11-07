/* Shared analysis update type */
export interface AnalysisUpdate {
  id: string;
  stage: string;
  progress: number;
  payload?: any;
  error?: string;
}