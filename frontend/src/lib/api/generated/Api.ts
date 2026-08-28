/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export interface DtoAccountBudgetResponse {
  account?: string;
  actual?: number;
  available?: number;
  date?: string;
  expenses?: DtoPostingResponse[];
  forecast?: number;
  rollover?: number;
}

export interface DtoAccountGainDetailResponse {
  account?: string;
  networthTimeline?: DtoNetworthTimelineItemResponse[];
  postings?: DtoPostingResponse[];
  xirr?: number;
}

export interface DtoAccountGainResponse {
  asset_breakdown?: DtoAssetBreakdownResponse;
  gain_timeline_breakdown?: DtoAccountGainDetailResponse;
  portfolio_allocation?: DtoPortfolioAllocationGroupsResponse;
}

export interface DtoAggregateResponse {
  account?: string;
  date?: string;
  market_amount?: number;
}

export interface DtoAllocationResponse {
  aggregates?: Record<string, DtoAggregateResponse>;
  aggregates_timeline?: Record<string, DtoAggregateResponse>[];
  allocation_targets?: DtoAllocationTargetResponse[];
}

export interface DtoAllocationTargetResponse {
  aggregates?: Record<string, DtoAggregateResponse>;
  current?: number;
  name?: string;
  target?: number;
}

export interface DtoAssetBreakdownResponse {
  absoluteReturn?: number;
  balanceUnits?: number;
  gainAmount?: number;
  group?: string;
  investmentAmount?: number;
  latestPrice?: number;
  marketAmount?: number;
  withdrawalAmount?: number;
  xirr?: number;
}

export interface DtoAssetsBalanceResponse {
  asset_breakdowns?: Record<string, DtoAssetBreakdownResponse>;
}

export interface DtoAutoCompleteItemResponse {
  id?: string;
  label?: string;
}

export interface DtoAutoCompleteResponse {
  completions?: DtoAutoCompleteItemResponse[];
}

export interface DtoBalancedPostingResponse {
  from?: DtoPostingResponse;
  to?: DtoPostingResponse;
}

export interface DtoBalancedPostingsResponse {
  balancedPostings?: DtoBalancedPostingResponse[];
}

export interface DtoBudgetResponse {
  accounts?: DtoAccountBudgetResponse[];
  availableThisMonth?: number;
  date?: string;
  endOfMonthBalance?: number;
  forecast?: number;
}

export interface DtoBudgetsSummaryResponse {
  availableForBudgeting?: number;
  budgetsByMonth?: Record<string, DtoBudgetResponse>;
  checkingBalance?: number;
}

export interface DtoCapitalGainResponse {
  account?: string;
  fy?: Record<string, DtoFYCapitalGainResponse>;
  tax_category?: string;
}

export interface DtoCapitalGainsResponse {
  capital_gains?: Record<string, DtoCapitalGainResponse>;
}

export interface DtoCashFlowResponse {
  balance?: number;
  checking?: number;
  date?: string;
  expenses?: number;
  income?: number;
  investment?: number;
  liabilities?: number;
  tax?: number;
}

export interface DtoCashFlowsResponse {
  cash_flows?: DtoCashFlowResponse[];
}

export interface DtoCommodityBreakdownResponse {
  amount?: number;
  commodity_name?: string;
  parent_commodity_id?: string;
  percentage?: number;
  security_id?: string;
  security_industry?: string;
  security_name?: string;
  security_rating?: string;
  security_type?: string;
}

export interface DtoCreditCardBillResponse {
  closingBalance?: number;
  credits?: number;
  debits?: number;
  dueDate?: string;
  openingBalance?: number;
  paidDate?: string;
  postings?: DtoPostingResponse[];
  statementEndDate?: string;
  statementStartDate?: string;
  transactions?: DtoTransactionResponse[];
}

export interface DtoCreditCardSummaryResponse {
  account?: string;
  balance?: number;
  bills?: DtoCreditCardBillResponse[];
  creditLimit?: number;
  expirationDate?: string;
  network?: string;
  number?: string;
  yearlySpends?: Record<string, Record<string, number>>;
}

export interface DtoCreditCardsResponse {
  creditCards?: DtoCreditCardSummaryResponse[];
}

export interface DtoCurrentNetworthResponse {
  networth?: DtoNetworthTimelineItemResponse;
  xirr?: number;
}

export interface DtoDashboardResponse {
  budget?: DtoBudgetsSummaryResponse;
  cashFlows?: DtoCashFlowResponse[];
  checkingBalances?: any;
  expenses?: DtoPeriodicPostingsSummaryResponse;
  goalSummaries?: DtoGoalSummaryResponse[];
  networth?: DtoCurrentNetworthResponse;
  transactionSequences?: DtoTransactionSequenceResponse[];
  transactions?: DtoTransactionResponse[];
}

export interface DtoDiagnosisResponse {
  issues?: DtoIssueResponse[];
}

export interface DtoEditorFilesResponse {
  accounts?: string[];
  commodities?: string[];
  files?: DtoLedgerFileResponse[];
  payees?: string[];
}

export interface DtoEditorSaveResponse {
  errors?: DtoLedgerErrorResponse[];
  file?: DtoLedgerFileResponse;
  message?: string;
  saved?: boolean;
  synced?: boolean;
}

export interface DtoEditorValidateResponse {
  errors?: DtoLedgerErrorResponse[];
  output?: string;
}

export interface DtoErrorResponse {
  error?: string;
  message?: string;
}

export interface DtoExpenseResponse {
  expenses?: DtoPostingResponse[];
  graph?: Record<string, DtoGraphResponse>;
  month_wise?: DtoPeriodicPostingsSummaryResponse;
  year_wise?: DtoPeriodicPostingsSummaryResponse;
}

export interface DtoFYCapitalGainResponse {
  posting_pairs?: DtoTaxPostingPairResponse[];
  purchase_price?: number;
  sell_price?: number;
  tax?: DtoTaxResponse;
  units?: number;
}

export interface DtoGainResponse {
  account?: string;
  networth?: DtoNetworthTimelineItemResponse;
  postings?: DtoPostingResponse[];
  xirr?: number;
}

export interface DtoGainsResponse {
  gain_breakdown?: DtoGainResponse[];
}

export interface DtoGoalDetailResponse {
  summary?: DtoGoalSummaryResponse;
  timeline?: Record<string, any>;
}

export interface DtoGoalSummariesResponse {
  goals?: DtoGoalSummaryResponse[];
}

export interface DtoGoalSummaryResponse {
  current?: number;
  icon?: string;
  id?: string;
  name?: string;
  priority?: number;
  target?: number;
  targetDate?: string;
  type?: string;
}

export interface DtoGraphResponse {
  links?: DtoLinkResponse[];
  nodes?: DtoNodeResponse[];
}

export interface DtoHarvestBreakdownResponse {
  current_price?: number;
  purchase_date?: string;
  purchase_price?: number;
  purchase_unit_price?: number;
  tax?: DtoTaxResponse;
  units?: number;
}

export interface DtoHarvestResponse {
  harvestables?: Record<string, DtoHarvestableResponse>;
}

export interface DtoHarvestableResponse {
  account?: string;
  current_unit_date?: string;
  current_unit_price?: number;
  harvest_breakdown?: DtoHarvestBreakdownResponse[];
  harvestable_units?: number;
  tax_category?: string;
  taxable_unrealized_gain?: number;
  total_units?: number;
  unrealized_gain?: number;
}

export interface DtoIncomeResponse {
  income_timeline?: DtoIncomeTimelineItemResponse[];
  tax_timeline?: DtoTaxTimelineItemResponse[];
  yearly_cards?: DtoIncomeYearlyCardResponse[];
}

export interface DtoIncomeStatementItemResponse {
  date?: string;
  endingBalance?: number;
  equity?: Record<string, number>;
  expenses?: Record<string, number>;
  income?: Record<string, number>;
  interest?: Record<string, number>;
  liabilities?: Record<string, number>;
  pnl?: Record<string, number>;
  startingBalance?: number;
  tax?: Record<string, number>;
}

export interface DtoIncomeStatementResponse {
  yearly?: Record<string, DtoIncomeStatementItemResponse>;
}

export interface DtoIncomeTimelineItemResponse {
  date?: string;
  postings?: DtoPostingResponse[];
}

export interface DtoIncomeYearlyCardResponse {
  end_date?: string;
  gross_income?: number;
  net_income?: number;
  net_tax?: number;
  postings?: DtoPostingResponse[];
  start_date?: string;
}

export interface DtoIndexResponse {
  docs?: Record<string, Record<string, number>>;
  tokens?: Record<string, Record<string, number>>;
}

export interface DtoInsightResponse {
  account?: string;
  baselineMethod?: string;
  baselineQuality?: string;
  baselineSampleCount?: number;
  baselineValue?: number;
  category?: string;
  change?: number;
  changePercent?: number;
  comparisonPeriod?: string;
  gainContribution?: number;
  href?: string;
  id?: string;
  investmentContribution?: number;
  period?: string;
  previousValue?: number;
  relatedAccounts?: string[];
  score?: number;
  severity?: string;
  type?: string;
  value?: number;
}

export interface DtoInsightsResponse {
  asOf?: string;
  comparisonPeriod?: string;
  insights?: DtoInsightResponse[];
  isPartial?: boolean;
  period?: string;
}

export interface DtoInvestmentResponse {
  assets?: DtoPostingResponse[];
  yearly_cards?: DtoInvestmentYearlyCardResponse[];
}

export interface DtoInvestmentYearlyCardResponse {
  end_date?: string;
  gross_other_income?: number;
  gross_salary_income?: number;
  net_expense?: number;
  net_income?: number;
  net_investment?: number;
  net_tax?: number;
  postings?: DtoPostingResponse[];
  savings_rate?: number;
  start_date?: string;
}

export interface DtoIssueResponse {
  description?: string;
  details?: string;
  level?: string;
  summary?: string;
}

export interface DtoLedgerErrorResponse {
  file?: string;
  line?: number;
  line_from?: number;
  line_to?: number;
  message?: string;
}

export interface DtoLedgerFileRequest {
  content?: string;
  name?: string;
  operation?: string;
  version?: string;
}

export interface DtoLedgerFileResponse {
  content?: string;
  name?: string;
  operation?: string;
  versions?: string[];
}

export interface DtoLiabilitiesBalanceResponse {
  liability_breakdowns?: Record<string, DtoLiabilityBreakdownResponse>;
}

export interface DtoLiabilitiesInterestResponse {
  interest_timeline_breakdown?: DtoLiabilityInterestResponse[];
}

export interface DtoLiabilitiesRepaymentResponse {
  repayments?: DtoPostingResponse[];
}

export interface DtoLiabilityBreakdownResponse {
  apr?: number;
  balance_amount?: number;
  drawn_amount?: number;
  group?: string;
  interest_amount?: number;
  repaid_amount?: number;
}

export interface DtoLiabilityInterestResponse {
  account?: string;
  apr?: number;
  overview_timeline?: DtoLiabilityOverviewResponse[];
}

export interface DtoLiabilityOverviewResponse {
  date?: string;
  drawn_amount?: number;
  interest_amount?: number;
  repaid_amount?: number;
}

export interface DtoLinkResponse {
  source?: number;
  target?: number;
  value?: number;
}

export interface DtoNetworthResponse {
  networthTimeline?: DtoNetworthTimelineItemResponse[];
  xirr?: number;
}

export interface DtoNetworthTimelineItemResponse {
  balanceAmount?: number;
  balanceUnits?: number;
  date?: string;
  gainAmount?: number;
  investmentAmount?: number;
  netInvestmentAmount?: number;
  withdrawalAmount?: number;
}

export interface DtoNodeResponse {
  id?: number;
  name?: string;
}

export interface DtoPeriodicPostingsSummaryResponse {
  expenses?: Record<string, DtoPostingResponse[]>;
  incomes?: Record<string, DtoPostingResponse[]>;
  investments?: Record<string, DtoPostingResponse[]>;
  taxes?: Record<string, DtoPostingResponse[]>;
}

export interface DtoPortfolioAggregateResponse {
  amount?: number;
  breakdowns?: DtoCommodityBreakdownResponse[];
  group?: string;
  id?: string;
  percentage?: number;
  sub_group?: string;
}

export interface DtoPortfolioAllocationGroupsResponse {
  commodities?: string[];
  industry?: DtoPortfolioAggregateResponse[];
  name_and_security_type?: DtoPortfolioAggregateResponse[];
  rating?: DtoPortfolioAggregateResponse[];
  security_type?: DtoPortfolioAggregateResponse[];
}

export interface DtoPortfolioAllocationResponse {
  portfolio_allocation?: DtoPortfolioAllocationGroupsResponse;
}

export interface DtoPostingResponse {
  account?: string;
  amount?: number;
  balance?: number;
  commodity?: string;
  date?: string;
  file_name?: string;
  forecast?: boolean;
  id?: number;
  market_amount?: number;
  note?: string;
  payee?: string;
  quantity?: number;
  status?: string;
  tag_period?: string;
  tag_recurring?: string;
  transaction_begin_line?: number;
  transaction_end_line?: number;
  transaction_id?: string;
  transaction_note?: string;
}

export interface DtoPostingsResponse {
  postings?: DtoPostingResponse[];
}

export interface DtoPredictionHistoryEntryResponse {
  absoluteAmount?: number;
  amount?: number;
  categoryAccount?: string;
  commodity?: string;
  date?: string;
  direction?: string;
  payee?: string;
  sourceAccount?: string;
  transactionId?: string;
}

export interface DtoPredictionHistoryResponse {
  history?: DtoPredictionHistoryEntryResponse[];
}

export interface DtoPriceItemResponse {
  commodity_id?: string;
  commodity_name?: string;
  commodity_type?: string;
  date?: string;
  id?: number;
  value?: number;
}

export interface DtoPriceProviderResponse {
  code?: string;
  description?: string;
  fields?: string[];
  label?: string;
}

export interface DtoPriceProvidersResponse {
  providers?: DtoPriceProviderResponse[];
}

export interface DtoPricesResponse {
  prices?: Record<string, DtoPriceItemResponse[]>;
}

export interface DtoPublicConfigResponse {
  accounts?: string[];
  config?: any;
  now?: string;
  schema?: Record<string, any>;
}

export interface DtoRecurringTransactionsResponse {
  transaction_sequences?: DtoTransactionSequenceResponse[];
}

export interface DtoScheduleALEntryResponse {
  amount?: number;
  section?: DtoScheduleALSectionResponse;
}

export interface DtoScheduleALMapResponse {
  schedule_als?: Record<string, DtoScheduleALResponse>;
}

export interface DtoScheduleALResponse {
  date?: string;
  entries?: DtoScheduleALEntryResponse[];
}

export interface DtoScheduleALSectionResponse {
  code?: string;
  details?: string;
  section?: string;
}

export interface DtoSheetFileRequest {
  content?: string;
  name?: string;
  version?: string;
}

export interface DtoSheetFileResponse {
  content?: string;
  name?: string;
  operation?: string;
  versions?: string[];
}

export interface DtoSheetSaveResponse {
  message?: string;
  saved?: boolean;
}

export interface DtoSheetsResponse {
  files?: DtoSheetFileResponse[];
  postings?: DtoPostingResponse[];
}

export interface DtoSuccessResponse {
  message?: string;
  success?: boolean;
}

export interface DtoTaxPostingPairResponse {
  purchase?: DtoPostingResponse;
  sell?: DtoPostingResponse;
  tax?: DtoTaxResponse;
}

export interface DtoTaxResponse {
  gain?: number;
  long_term?: number;
  short_term?: number;
  slab?: number;
  taxable?: number;
}

export interface DtoTaxTimelineItemResponse {
  end_date?: string;
  postings?: DtoPostingResponse[];
  start_date?: string;
}

export interface DtoTemplateDeleteRequest {
  name?: string;
}

export interface DtoTemplateResponse {
  content?: string;
  id?: string;
  name?: string;
  template_type?: string;
}

export interface DtoTemplateSaveResponse {
  message?: string;
  saved?: boolean;
  template?: DtoTemplateResponse;
}

export interface DtoTemplateUpsertRequest {
  content?: string;
  name?: string;
}

export interface DtoTemplatesResponse {
  templates?: DtoTemplateResponse[];
}

export interface DtoTfIdfResponse {
  index?: DtoIndexResponse;
  tf_idf?: Record<string, Record<string, number>>;
}

export interface DtoTransactionResponse {
  beginLine?: number;
  date?: string;
  endLine?: number;
  fileName?: string;
  id?: string;
  note?: string;
  payee?: string;
  postings?: DtoPostingResponse[];
  tag_period?: string;
  tag_recurring?: string;
}

export interface DtoTransactionSequenceResponse {
  interval?: number;
  key?: string;
  period?: string;
  transactions?: DtoTransactionResponse[];
}

export interface DtoTransactionsResponse {
  transactions?: DtoTransactionResponse[];
}

export interface ServerAutoCompleteRequest {
  field?: string;
  filters?: Record<string, string>;
  provider?: string;
}

export interface ServerLogsResponse {
  logs?: any[];
}

export interface ServerSyncRequest {
  journal?: boolean;
  portfolios?: boolean;
  prices?: boolean;
}

export type QueryParamsType = Record<string | number, any>;
export type ResponseFormat = keyof Omit<Body, "body" | "bodyUsed">;

export interface FullRequestParams extends Omit<RequestInit, "body"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseFormat;
  /** request body */
  body?: unknown;
  /** base url */
  baseUrl?: string;
  /** request cancellation token */
  cancelToken?: CancelToken;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown> {
  baseUrl?: string;
  baseApiParams?: Omit<RequestParams, "baseUrl" | "cancelToken" | "signal">;
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<RequestParams | void> | RequestParams | void;
  customFetch?: typeof fetch;
}

export interface HttpResponse<D extends unknown, E extends unknown = unknown>
  extends Response {
  data: D;
  error: E;
}

type CancelToken = Symbol | string | number;

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public baseUrl: string = "/api";
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private abortControllers = new Map<CancelToken, AbortController>();
  private customFetch = (...fetchParams: Parameters<typeof fetch>) =>
    fetch(...fetchParams);

  private baseApiParams: RequestParams = {
    credentials: "same-origin",
    headers: {},
    redirect: "follow",
    referrerPolicy: "no-referrer",
  };

  constructor(apiConfig: ApiConfig<SecurityDataType> = {}) {
    Object.assign(this, apiConfig);
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected encodeQueryParam(key: string, value: any) {
    const encodedKey = encodeURIComponent(key);
    return `${encodedKey}=${
      encodeURIComponent(typeof value === "number" ? value : `${value}`)
    }`;
  }

  protected addQueryParam(query: QueryParamsType, key: string) {
    return this.encodeQueryParam(key, query[key]);
  }

  protected addArrayQueryParam(query: QueryParamsType, key: string) {
    const value = query[key];
    return value.map((v: any) => this.encodeQueryParam(key, v)).join("&");
  }

  protected toQueryString(rawQuery?: QueryParamsType): string {
    const query = rawQuery || {};
    const keys = Object.keys(query).filter(
      (key) => "undefined" !== typeof query[key],
    );
    return keys
      .map((key) =>
        Array.isArray(query[key])
          ? this.addArrayQueryParam(query, key)
          : this.addQueryParam(query, key)
      )
      .join("&");
  }

  protected addQueryParams(rawQuery?: QueryParamsType): string {
    const queryString = this.toQueryString(rawQuery);
    return queryString ? `?${queryString}` : "";
  }

  private contentFormatters: Record<ContentType, (input: any) => any> = {
    [ContentType.Json]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.JsonApi]: (input: any) =>
      input !== null && (typeof input === "object" || typeof input === "string")
        ? JSON.stringify(input)
        : input,
    [ContentType.Text]: (input: any) =>
      input !== null && typeof input !== "string"
        ? JSON.stringify(input)
        : input,
    [ContentType.FormData]: (input: any) => {
      if (input instanceof FormData) {
        return input;
      }

      return Object.keys(input || {}).reduce((formData, key) => {
        const property = input[key];
        formData.append(
          key,
          property instanceof Blob
            ? property
            : typeof property === "object" && property !== null
            ? JSON.stringify(property)
            : `${property}`,
        );
        return formData;
      }, new FormData());
    },
    [ContentType.UrlEncoded]: (input: any) => this.toQueryString(input),
  };

  protected mergeRequestParams(
    params1: RequestParams,
    params2?: RequestParams,
  ): RequestParams {
    return {
      ...this.baseApiParams,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...(this.baseApiParams.headers || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected createAbortSignal = (
    cancelToken: CancelToken,
  ): AbortSignal | undefined => {
    if (this.abortControllers.has(cancelToken)) {
      const abortController = this.abortControllers.get(cancelToken);
      if (abortController) {
        return abortController.signal;
      }
      return void 0;
    }

    const abortController = new AbortController();
    this.abortControllers.set(cancelToken, abortController);
    return abortController.signal;
  };

  public abortRequest = (cancelToken: CancelToken) => {
    const abortController = this.abortControllers.get(cancelToken);

    if (abortController) {
      abortController.abort();
      this.abortControllers.delete(cancelToken);
    }
  };

  public request = async <T = any, E = any>({
    body,
    secure,
    path,
    type,
    query,
    format,
    baseUrl,
    cancelToken,
    ...params
  }: FullRequestParams): Promise<T> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.baseApiParams.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const queryString = query && this.toQueryString(query);
    const payloadFormatter = this.contentFormatters[type || ContentType.Json];
    const responseFormat = format || requestParams.format;

    return this.customFetch(
      `${baseUrl || this.baseUrl || ""}${path}${
        queryString ? `?${queryString}` : ""
      }`,
      {
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type && type !== ContentType.FormData
            ? { "Content-Type": type }
            : {}),
        },
        signal:
          (cancelToken
            ? this.createAbortSignal(cancelToken)
            : requestParams.signal) || null,
        body: typeof body === "undefined" || body === null
          ? null
          : payloadFormatter(body),
      },
    ).then(async (response) => {
      const r = response as HttpResponse<T, E>;
      r.data = null as unknown as T;
      r.error = null as unknown as E;

      const responseToParse = responseFormat ? response.clone() : response;
      const data = !responseFormat ? r : await responseToParse[responseFormat]()
        .then((data) => {
          if (r.ok) {
            r.data = data;
          } else {
            r.error = data;
          }
          return r;
        })
        .catch((e) => {
          r.error = e;
          return r;
        });

      if (cancelToken) {
        this.abortControllers.delete(cancelToken);
      }

      if (!response.ok) throw data;
      return data.data;
    });
  };
}

/**
 * @title Paisa API
 * @version 0.1.0
 * @baseUrl /api
 * @contact
 *
 * Paisa is a local-first personal finance application. This API powers the Paisa frontend and exposes financial analysis, journal editing, configuration, price data, goals, transactions, and related application operations.
 */
export class Api<SecurityDataType extends unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  account = {
    /**
     * @description Returns TF-IDF prediction model data
     *
     * @tags Predictions
     * @name GetTfIdf
     * @summary Get TF-IDF machine learning model for payee-account prediction
     * @request GET:/account/tf_idf
     * @secure
     */
    getTfIdf: (params: RequestParams = {}) =>
      this.http.request<DtoTfIdfResponse, any>({
        path: `/account/tf_idf`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  allocation = {
    /**
     * @description Returns asset allocation targets and current asset distribution
     *
     * @tags Allocation
     * @name GetAllocation
     * @summary Get asset class allocations
     * @request GET:/allocation
     * @secure
     */
    getAllocation: (params: RequestParams = {}) =>
      this.http.request<DtoAllocationResponse, any>({
        path: `/allocation`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  assets = {
    /**
     * @description Returns balance breakdown for asset accounts
     *
     * @tags Assets
     * @name GetAssetsBalance
     * @summary Get current asset balances and breakdowns
     * @request GET:/assets/balance
     * @secure
     */
    getAssetsBalance: (params: RequestParams = {}) =>
      this.http.request<DtoAssetsBalanceResponse, any>({
        path: `/assets/balance`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  budget = {
    /**
     * @description Returns monthly budget allocations, spending actuals, variances, and rollover balances
     *
     * @tags Budget
     * @name GetBudget
     * @summary Get budget forecasts and actuals
     * @request GET:/budget
     * @secure
     */
    getBudget: (params: RequestParams = {}) =>
      this.http.request<DtoBudgetsSummaryResponse, any>({
        path: `/budget`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  capitalGains = {
    /**
     * @description Computes FIFO realized capital gains grouped by financial year
     *
     * @tags Tax
     * @name GetCapitalGains
     * @summary Get FIFO realized capital gains
     * @request GET:/capital_gains
     * @secure
     */
    getCapitalGains: (params: RequestParams = {}) =>
      this.http.request<DtoCapitalGainsResponse, any>({
        path: `/capital_gains`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  cashFlow = {
    /**
     * @description Returns monthly cash flow breakdown including inflows, outflows, and net changes
     *
     * @tags Cash Flow
     * @name GetCashFlow
     * @summary Get monthly cash flow statement
     * @request GET:/cash_flow
     * @secure
     */
    getCashFlow: (params: RequestParams = {}) =>
      this.http.request<DtoCashFlowsResponse, any>({
        path: `/cash_flow`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  config = {
    /**
     * @description Returns public configuration, account list, current time override, and JSON validation schema
     *
     * @tags Configuration
     * @name GetConfig
     * @summary Get application configuration and metadata
     * @request GET:/config
     * @secure
     */
    getConfig: (params: RequestParams = {}) =>
      this.http.request<DtoPublicConfigResponse, any>({
        path: `/config`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Overwrites the paisa.yaml configuration file. No-op in readonly mode.
     *
     * @tags Configuration
     * @name SaveConfig
     * @summary Save configuration YAML
     * @request POST:/config
     * @secure
     */
    saveConfig: (config: string, params: RequestParams = {}) =>
      this.http.request<DtoSuccessResponse, DtoErrorResponse>({
        path: `/config`,
        method: "POST",
        body: config,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  creditCards = {
    /**
     * @description Returns credit card balances, due dates, and statements
     *
     * @tags Credit Cards
     * @name GetCreditCards
     * @summary Get all credit cards summaries and billing cycles
     * @request GET:/credit_cards
     * @secure
     */
    getCreditCards: (params: RequestParams = {}) =>
      this.http.request<DtoCreditCardsResponse, any>({
        path: `/credit_cards`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns credit card details for a single account
     *
     * @tags Credit Cards
     * @name GetCreditCard
     * @summary Get credit card summary for a specific account
     * @request GET:/credit_cards/{account}
     * @secure
     */
    getCreditCard: (account: string, params: RequestParams = {}) =>
      this.http.request<DtoCreditCardSummaryResponse, any>({
        path: `/credit_cards/${account}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  dashboard = {
    /**
     * @description Returns consolidated KPI summaries across net worth, expenses, budgets, and investments
     *
     * @tags Dashboard
     * @name GetDashboard
     * @summary Get dashboard financial summary
     * @request GET:/dashboard
     * @secure
     */
    getDashboard: (params: RequestParams = {}) =>
      this.http.request<DtoDashboardResponse, any>({
        path: `/dashboard`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  diagnosis = {
    /**
     * @description Runs system diagnostics and returns detected issues
     *
     * @tags Diagnosis
     * @name GetDiagnosis
     * @summary Run system diagnostic health checks
     * @request GET:/diagnosis
     * @secure
     */
    getDiagnosis: (params: RequestParams = {}) =>
      this.http.request<DtoDiagnosisResponse, any>({
        path: `/diagnosis`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  editor = {
    /**
     * @description Returns contents and version history of a ledger file
     *
     * @tags Editor
     * @name GetEditorFile
     * @summary Read a specific ledger file and its backup versions
     * @request POST:/editor/file
     * @secure
     */
    getEditorFile: (file: DtoLedgerFileRequest, params: RequestParams = {}) =>
      this.http.request<DtoLedgerFileResponse, DtoErrorResponse>({
        path: `/editor/file`,
        method: "POST",
        body: file,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Deletes all timestamped backup files for a ledger file
     *
     * @tags Editor
     * @name DeleteEditorBackups
     * @summary Delete backup versions for a ledger file
     * @request POST:/editor/file/delete_backups
     * @secure
     */
    deleteEditorBackups: (
      file: DtoLedgerFileRequest,
      params: RequestParams = {},
    ) =>
      this.http.request<DtoLedgerFileResponse, DtoErrorResponse>({
        path: `/editor/file/delete_backups`,
        method: "POST",
        body: file,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns all ledger files and their current postings
     *
     * @tags Editor
     * @name GetEditorFiles
     * @summary List all ledger files in journal directory
     * @request GET:/editor/files
     * @secure
     */
    getEditorFiles: (params: RequestParams = {}) =>
      this.http.request<DtoEditorFilesResponse, any>({
        path: `/editor/files`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Atomically writes ledger file with automatic timestamped backup. No-op in readonly mode.
     *
     * @tags Editor
     * @name SaveEditorFile
     * @summary Save ledger file and trigger database synchronization
     * @request POST:/editor/save
     * @secure
     */
    saveEditorFile: (file: DtoLedgerFileRequest, params: RequestParams = {}) =>
      this.http.request<DtoEditorSaveResponse, DtoErrorResponse>({
        path: `/editor/save`,
        method: "POST",
        body: file,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Parses and validates ledger file syntax without saving
     *
     * @tags Editor
     * @name ValidateEditorFile
     * @summary Validate ledger file syntax
     * @request POST:/editor/validate
     * @secure
     */
    validateEditorFile: (
      file: DtoLedgerFileRequest,
      params: RequestParams = {},
    ) =>
      this.http.request<DtoEditorValidateResponse, DtoErrorResponse>({
        path: `/editor/validate`,
        method: "POST",
        body: file,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  expense = {
    /**
     * @description Computes hierarchical flow graph and periodic expense summaries
     *
     * @tags Expenses
     * @name GetExpense
     * @summary Get expense hierarchy graph and breakdown
     * @request GET:/expense
     * @secure
     */
    getExpense: (params: RequestParams = {}) =>
      this.http.request<DtoExpenseResponse, any>({
        path: `/expense`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  gain = {
    /**
     * @description Computes realized, unrealized gains and annualized XIRR returns across accounts
     *
     * @tags Gains
     * @name GetGain
     * @summary Get investment gains and XIRR performance
     * @request GET:/gain
     * @secure
     */
    getGain: (params: RequestParams = {}) =>
      this.http.request<DtoGainsResponse, any>({
        path: `/gain`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Computes realized and unrealized gain for a single investment account
     *
     * @tags Gains
     * @name GetAccountGain
     * @summary Get investment gain for a specific account
     * @request GET:/gain/{account}
     * @secure
     */
    getAccountGain: (account: string, params: RequestParams = {}) =>
      this.http.request<DtoAccountGainResponse, any>({
        path: `/gain/${account}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  goals = {
    /**
     * @description Returns summary and progress percentage for all configured goals
     *
     * @tags Goals
     * @name GetGoals
     * @summary List savings and retirement goals summaries
     * @request GET:/goals
     * @secure
     */
    getGoals: (params: RequestParams = {}) =>
      this.http.request<DtoGoalSummariesResponse, any>({
        path: `/goals`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns progress, projections, and monthly timeline for a single goal
     *
     * @tags Goals
     * @name GetGoalDetails
     * @summary Get details for a specific goal
     * @request GET:/goals/{type}/{name}
     * @secure
     */
    getGoalDetails: (type: string, name: string, params: RequestParams = {}) =>
      this.http.request<DtoGoalDetailResponse, any>({
        path: `/goals/${type}/${name}`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  harvest = {
    /**
     * @description Returns tax harvesting opportunities and current gains
     *
     * @tags Tax
     * @name GetHarvest
     * @summary Get tax harvesting opportunities
     * @request GET:/harvest
     * @secure
     */
    getHarvest: (params: RequestParams = {}) =>
      this.http.request<DtoHarvestResponse, any>({
        path: `/harvest`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  income = {
    /**
     * @description Returns gross income, taxes, net income, and periodic income timelines
     *
     * @tags Income
     * @name GetIncome
     * @summary Get income timeline and yearly summary
     * @request GET:/income
     * @secure
     */
    getIncome: (params: RequestParams = {}) =>
      this.http.request<DtoIncomeResponse, any>({
        path: `/income`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  incomeStatement = {
    /**
     * @description Returns yearly income statements with income, expenses, interest, and taxes
     *
     * @tags Income Statement
     * @name GetIncomeStatement
     * @summary Get financial-year income statements
     * @request GET:/income_statement
     * @secure
     */
    getIncomeStatement: (params: RequestParams = {}) =>
      this.http.request<DtoIncomeStatementResponse, any>({
        path: `/income_statement`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  init = {
    /**
     * @description Generates demo ledger data and configuration. No-op in readonly mode.
     *
     * @tags Initialization
     * @name InitDemoData
     * @summary Initialize demo data
     * @request POST:/init
     * @secure
     */
    initDemoData: (params: RequestParams = {}) =>
      this.http.request<DtoSuccessResponse, DtoErrorResponse>({
        path: `/init`,
        method: "POST",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  insights = {
    /**
     * @description Returns deterministic financial observations and risks derived from ledger history
     *
     * @tags Insights
     * @name GetInsights
     * @summary Get deterministic financial health insights
     * @request GET:/insights
     * @secure
     */
    getInsights: (
      query?: {
        /** Month period in YYYY-MM format (defaults to current month) */
        period?: string;
      },
      params: RequestParams = {},
    ) =>
      this.http.request<DtoInsightsResponse, DtoErrorResponse>({
        path: `/insights`,
        method: "GET",
        query: query,
        secure: true,
        format: "json",
        ...params,
      }),
  };
  investment = {
    /**
     * @description Returns yearly investment cards and savings rate metrics
     *
     * @tags Investments
     * @name GetInvestment
     * @summary Get investment summary and savings rate
     * @request GET:/investment
     * @secure
     */
    getInvestment: (params: RequestParams = {}) =>
      this.http.request<DtoInvestmentResponse, any>({
        path: `/investment`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  ledger = {
    /**
     * @description Returns flat array of all journal postings with computed balances and market values
     *
     * @tags Ledger
     * @name GetLedger
     * @summary Get all ledger postings with market valuation
     * @request GET:/ledger
     * @secure
     */
    getLedger: (params: RequestParams = {}) =>
      this.http.request<DtoPostingsResponse, any>({
        path: `/ledger`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  liabilities = {
    /**
     * @description Computes outstanding loan balances
     *
     * @tags Liabilities
     * @name GetLiabilitiesBalance
     * @summary Get loan balances and breakdowns
     * @request GET:/liabilities/balance
     * @secure
     */
    getLiabilitiesBalance: (params: RequestParams = {}) =>
      this.http.request<DtoLiabilitiesBalanceResponse, any>({
        path: `/liabilities/balance`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Computes interest payments and effective APR across loans
     *
     * @tags Liabilities
     * @name GetLiabilitiesInterest
     * @summary Get loan interest and APR calculations
     * @request GET:/liabilities/interest
     * @secure
     */
    getLiabilitiesInterest: (params: RequestParams = {}) =>
      this.http.request<DtoLiabilitiesInterestResponse, any>({
        path: `/liabilities/interest`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns loan repayment postings
     *
     * @tags Liabilities
     * @name GetLiabilitiesRepayment
     * @summary Get loan repayment history
     * @request GET:/liabilities/repayment
     * @secure
     */
    getLiabilitiesRepayment: (params: RequestParams = {}) =>
      this.http.request<DtoLiabilitiesRepaymentResponse, any>({
        path: `/liabilities/repayment`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  logs = {
    /**
     * @description Returns recent application log lines
     *
     * @tags Logs
     * @name GetLogs
     * @summary Get application log entries
     * @request GET:/logs
     * @secure
     */
    getLogs: (params: RequestParams = {}) =>
      this.http.request<ServerLogsResponse, any>({
        path: `/logs`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  networth = {
    /**
     * @description Returns the current net-worth analysis and historical timeline
     *
     * @tags Net Worth
     * @name GetNetworth
     * @summary Get net worth
     * @request GET:/networth
     * @secure
     */
    getNetworth: (params: RequestParams = {}) =>
      this.http.request<DtoNetworthResponse, any>({
        path: `/networth`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  ping = {
    /**
     * @description Returns success indicator when service is healthy
     *
     * @tags System
     * @name GetPing
     * @summary Health check / ping
     * @request GET:/ping
     */
    getPing: (params: RequestParams = {}) =>
      this.http.request<DtoSuccessResponse, any>({
        path: `/ping`,
        method: "GET",
        format: "json",
        ...params,
      }),
  };
  portfolioAllocation = {
    /**
     * @description Returns asset allocations grouped by portfolio
     *
     * @tags Allocation
     * @name GetPortfolioAllocation
     * @summary Get portfolio-grouped allocations
     * @request GET:/portfolio_allocation
     * @secure
     */
    getPortfolioAllocation: (params: RequestParams = {}) =>
      this.http.request<DtoPortfolioAllocationResponse, any>({
        path: `/portfolio_allocation`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  prediction = {
    /**
     * @description Returns prediction history records
     *
     * @tags Predictions
     * @name GetPredictionHistory
     * @summary Get prediction history
     * @request GET:/prediction/history
     * @secure
     */
    getPredictionHistory: (params: RequestParams = {}) =>
      this.http.request<DtoPredictionHistoryResponse, any>({
        path: `/prediction/history`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  price = {
    /**
     * @description Returns price histories grouped by commodity
     *
     * @tags Prices
     * @name GetPrices
     * @summary Get all cached commodity prices
     * @request GET:/price
     * @secure
     */
    getPrices: (params: RequestParams = {}) =>
      this.http.request<DtoPricesResponse, any>({
        path: `/price`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Searches ticker symbols from configured scrapers
     *
     * @tags Prices
     * @name GetPriceAutoCompletions
     * @summary Autocomplete commodity or ticker symbols
     * @request POST:/price/autocomplete
     * @secure
     */
    getPriceAutoCompletions: (
      request: ServerAutoCompleteRequest,
      params: RequestParams = {},
    ) =>
      this.http.request<DtoAutoCompleteResponse, DtoErrorResponse>({
        path: `/price/autocomplete`,
        method: "POST",
        body: request,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Clears in-memory and database cached commodity prices. No-op in readonly mode.
     *
     * @tags Prices
     * @name ClearPriceCache
     * @summary Clear cached market prices
     * @request POST:/price/delete
     * @secure
     */
    clearPriceCache: (params: RequestParams = {}) =>
      this.http.request<DtoSuccessResponse, any>({
        path: `/price/delete`,
        method: "POST",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns registered price scraping providers and their sync status
     *
     * @tags Prices
     * @name GetPriceProviders
     * @summary Get configured price providers
     * @request GET:/price/providers
     * @secure
     */
    getPriceProviders: (params: RequestParams = {}) =>
      this.http.request<DtoPriceProvidersResponse, any>({
        path: `/price/providers`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Clears cached commodity prices for a specific provider. No-op in readonly mode.
     *
     * @tags Prices
     * @name ClearPriceProviderCache
     * @summary Clear price cache for a specific provider
     * @request POST:/price/providers/delete/{provider}
     * @secure
     */
    clearPriceProviderCache: (provider: string, params: RequestParams = {}) =>
      this.http.request<DtoSuccessResponse, any>({
        path: `/price/providers/delete/${provider}`,
        method: "POST",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  recurring = {
    /**
     * @description Returns recurring monthly or periodic transaction sequences
     *
     * @tags Recurring
     * @name GetRecurringTransactions
     * @summary Get recurring transaction sequences
     * @request GET:/recurring
     * @secure
     */
    getRecurringTransactions: (params: RequestParams = {}) =>
      this.http.request<DtoRecurringTransactionsResponse, any>({
        path: `/recurring`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  scheduleAl = {
    /**
     * @description Computes Schedule AL assets and liabilities report
     *
     * @tags Tax
     * @name GetScheduleAl
     * @summary Get Schedule AL assets and liabilities report
     * @request GET:/schedule_al
     * @secure
     */
    getScheduleAl: (params: RequestParams = {}) =>
      this.http.request<DtoScheduleALMapResponse, any>({
        path: `/schedule_al`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
  sheets = {
    /**
     * @description Returns contents and version history of a sheet file
     *
     * @tags Sheets
     * @name GetSheetFile
     * @summary Read a specific .paisa sheet file
     * @request POST:/sheets/file
     * @secure
     */
    getSheetFile: (file: DtoSheetFileRequest, params: RequestParams = {}) =>
      this.http.request<DtoSheetFileResponse, DtoErrorResponse>({
        path: `/sheets/file`,
        method: "POST",
        body: file,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Deletes all timestamped backup files for a sheet file
     *
     * @tags Sheets
     * @name DeleteSheetBackups
     * @summary Delete backup versions for a sheet file
     * @request POST:/sheets/file/delete_backups
     * @secure
     */
    deleteSheetBackups: (
      file: DtoSheetFileRequest,
      params: RequestParams = {},
    ) =>
      this.http.request<DtoSheetFileResponse, DtoErrorResponse>({
        path: `/sheets/file/delete_backups`,
        method: "POST",
        body: file,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns list of .paisa sheet files
     *
     * @tags Sheets
     * @name GetSheetFiles
     * @summary List all .paisa sheet query files
     * @request GET:/sheets/files
     * @secure
     */
    getSheetFiles: (params: RequestParams = {}) =>
      this.http.request<DtoSheetsResponse, any>({
        path: `/sheets/files`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Atomically writes .paisa sheet file with timestamped backup. No-op in readonly mode.
     *
     * @tags Sheets
     * @name SaveSheetFile
     * @summary Save a .paisa sheet file
     * @request POST:/sheets/save
     * @secure
     */
    saveSheetFile: (file: DtoSheetFileRequest, params: RequestParams = {}) =>
      this.http.request<DtoSheetSaveResponse, DtoErrorResponse>({
        path: `/sheets/save`,
        method: "POST",
        body: file,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  sync = {
    /**
     * @description Parses journal files, scrapes external commodity prices, and synchronizes portfolio data into SQLite
     *
     * @tags Sync
     * @name SyncData
     * @summary Synchronize journal, prices, and portfolios into SQLite
     * @request POST:/sync
     * @secure
     */
    syncData: (request: ServerSyncRequest, params: RequestParams = {}) =>
      this.http.request<DtoSuccessResponse, DtoErrorResponse>({
        path: `/sync`,
        method: "POST",
        body: request,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  templates = {
    /**
     * @description Returns builtin and custom transaction templates
     *
     * @tags Templates
     * @name GetTemplates
     * @summary List all transaction templates
     * @request GET:/templates
     * @secure
     */
    getTemplates: (params: RequestParams = {}) =>
      this.http.request<DtoTemplatesResponse, any>({
        path: `/templates`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Deletes a custom transaction template from paisa.yaml. No-op in readonly mode.
     *
     * @tags Templates
     * @name DeleteTemplate
     * @summary Delete a transaction template
     * @request POST:/templates/delete
     * @secure
     */
    deleteTemplate: (
      request: DtoTemplateDeleteRequest,
      params: RequestParams = {},
    ) =>
      this.http.request<
        DtoSuccessResponse,
        DtoErrorResponse | DtoSuccessResponse
      >({
        path: `/templates/delete`,
        method: "POST",
        body: request,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),

    /**
     * @description Saves a custom transaction template in paisa.yaml. No-op in readonly mode.
     *
     * @tags Templates
     * @name UpsertTemplate
     * @summary Create or update a transaction template
     * @request POST:/templates/upsert
     * @secure
     */
    upsertTemplate: (
      request: DtoTemplateUpsertRequest,
      params: RequestParams = {},
    ) =>
      this.http.request<
        DtoTemplateSaveResponse,
        DtoErrorResponse | DtoTemplateSaveResponse
      >({
        path: `/templates/upsert`,
        method: "POST",
        body: request,
        secure: true,
        type: ContentType.Json,
        format: "json",
        ...params,
      }),
  };
  transaction = {
    /**
     * @description Returns transactions with embedded postings
     *
     * @tags Transactions
     * @name GetTransactions
     * @summary Get all journal transactions
     * @request GET:/transaction
     * @secure
     */
    getTransactions: (params: RequestParams = {}) =>
      this.http.request<DtoTransactionsResponse, any>({
        path: `/transaction`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),

    /**
     * @description Returns balanced from/to posting pairs
     *
     * @tags Transactions
     * @name GetBalancedPostings
     * @summary Get balanced posting pairs
     * @request GET:/transaction/balanced
     * @secure
     */
    getBalancedPostings: (params: RequestParams = {}) =>
      this.http.request<DtoBalancedPostingsResponse, any>({
        path: `/transaction/balanced`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
}
