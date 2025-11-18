// Custom hooks for managing survey campaigns
import { useState, useEffect, useCallback } from 'react';
import { 
  api, 
  type CreateCampaignRequest,
  type DataState,
  createInitialState,
  setLoading,
  setData,
  setError
} from '../utils/api';
import type { SurveyCampaign, ExtendedSurveyCampaign } from '../types/survey';

// Hook for fetching all campaigns
export function useCampaigns() {
  const [state, setState] = useState<DataState<ExtendedSurveyCampaign[]>>(createInitialState());

  const fetchData = useCallback(async () => {
    setState(prev => setLoading(prev));
    try {
      const data = await api.campaigns.getAll();
      setState(prev => setData(prev, data));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch campaigns';
      setState(prev => setError(prev, message));
      console.error('Error fetching campaigns:', error);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

// Hook for fetching a single campaign
export function useCampaign(campaignId: string | null) {
  const [state, setState] = useState<DataState<ExtendedSurveyCampaign>>(createInitialState());

  const fetchData = useCallback(async () => {
    if (!campaignId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState(prev => setLoading(prev));
    try {
      const data = await api.campaigns.getById(campaignId);
      setState(prev => setData(prev, data));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch campaign';
      setState(prev => setError(prev, message));
      console.error('Error fetching campaign:', error);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}

// Hook for campaign mutations (create, update, delete)
export function useCampaignMutations() {
  const [loading, setLoadingState] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);

  const createCampaign = useCallback(async (data: CreateCampaignRequest) => {
    setLoadingState(true);
    setErrorState(null);
    try {
      const campaign = await api.campaigns.create(data);
      setLoadingState(false);
      return campaign;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create campaign';
      setErrorState(message);
      setLoadingState(false);
      throw error;
    }
  }, []);

  const updateCampaign = useCallback(async (id: string, data: Partial<SurveyCampaign>) => {
    setLoadingState(true);
    setErrorState(null);
    try {
      const campaign = await api.campaigns.update(id, data);
      setLoadingState(false);
      return campaign;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update campaign';
      setErrorState(message);
      setLoadingState(false);
      throw error;
    }
  }, []);

  const deleteCampaign = useCallback(async (id: string) => {
    setLoadingState(true);
    setErrorState(null);
    try {
      await api.campaigns.delete(id);
      setLoadingState(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete campaign';
      setErrorState(message);
      setLoadingState(false);
      throw error;
    }
  }, []);

  return {
    createCampaign,
    updateCampaign,
    deleteCampaign,
    loading,
    error,
  };
}
