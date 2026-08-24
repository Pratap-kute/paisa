import {
  api,
  createAsyncState,
  type DtoAccountGainResponse,
  type DtoAssetsBalanceResponse,
  type DtoGainsResponse,
  type DtoInvestmentResponse,
  type DtoNetworthResponse,
} from "$lib/api";

export function createNetworthState() {
  return createAsyncState<void, DtoNetworthResponse | null>(
    async (_args, signal) => {
      const response = await api.networth.getNetworth({ signal });
      return response;
    },
    null,
  );
}

export function createInvestmentState() {
  return createAsyncState<void, DtoInvestmentResponse | null>(
    async (_args, signal) => {
      const response = await api.investment.getInvestment({ signal });
      return response;
    },
    null,
  );
}

export function createGainState() {
  return createAsyncState<void, DtoGainsResponse | null>(
    async (_args, signal) => {
      const response = await api.gain.getGain({ signal });
      return response;
    },
    null,
  );
}

export function createAccountGainState() {
  return createAsyncState<string, DtoAccountGainResponse | null>(
    async (account, signal) => {
      const response = await api.gain.getAccountGain(account, { signal });
      return response;
    },
    null,
  );
}

export function createAssetsBalanceState() {
  return createAsyncState<void, DtoAssetsBalanceResponse | null>(
    async (_args, signal) => {
      const response = await api.assets.getAssetsBalance({ signal });
      return response;
    },
    null,
  );
}
