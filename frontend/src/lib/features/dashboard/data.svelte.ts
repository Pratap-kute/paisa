import { api, createAsyncState, type DtoDashboardResponse } from "$lib/api";

export function createDashboardState() {
  return createAsyncState<void, DtoDashboardResponse | null>(
    async (_args, signal) => {
      const response = await api.dashboard.getDashboard({ signal });
      return response;
    },
    null,
  );
}
