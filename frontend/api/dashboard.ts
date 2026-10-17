import { apiFetch } from '@/lib/api/client';

export interface CatAnalysis {
  catId: string;
  catName: string;
  breed: string;
  averageWeight: string | null;
  averageTemperature: string | null;
  appetiteTrend: string | null;
  energyTrend: string | null;
  averagePooCount: string | null;
  averagePeeCount: string | null;
  averageFoodCount: string | null;
  averageWaterCount: string | null;
  /** Average in the unit of the most recent log, e.g. { amount: '136', unit: 'g' }. */
  averageFood: { amount: string; unit: string } | null;
  averageWater: { amount: string; unit: string } | null;
  healthIssues: string[];
  totalLogs: number;
}

export interface DashboardResponse {
  totalCats: number;
  analysis: CatAnalysis[];
}

export const dashboardApi = {
  getAnalytics: (): Promise<DashboardResponse> =>
    apiFetch<DashboardResponse>('/dashboard/analytics', {
      fallbackCode: 'DashboardError',
      fallbackMessage: 'Failed to load analytics',
    }),
};
