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

export interface DtoAccountGainResponse {
  account?: string;
  networthTimeline?: DtoNetworthTimelineItemResponse[];
  portfolioGroups?: any;
  postings?: DtoPostingResponse[];
  xirr?: number;
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

export interface DtoAutoCompleteResponse {
  value?: string[];
}

export interface DtoBalancedPostingResponse {
  from?: DtoPostingResponse;
  to?: DtoPostingResponse;
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
  budget?: DtoBudgetResponse;
  cashFlows?: DtoCashFlowResponse;
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
  message?: string;
  saved?: boolean;
}

export interface DtoEditorValidateResponse {
  errors?: DtoLedgerErrorResponse[];
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
  message?: string;
}

export interface DtoLedgerFileRequest {
  content?: string;
  name?: string;
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

export interface ServerSyncRequest {
  journal?: boolean;
  portfolios?: boolean;
  prices?: boolean;
}

import type {
  AxiosInstance,
  AxiosRequestConfig,
  HeadersDefaults,
  ResponseType,
} from "axios";
import axios from "axios";

export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams
  extends Omit<AxiosRequestConfig, "data" | "params" | "url" | "responseType"> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseType;
  /** request body */
  body?: unknown;
}

export type RequestParams = Omit<
  FullRequestParams,
  "body" | "method" | "query" | "path"
>;

export interface ApiConfig<SecurityDataType = unknown>
  extends Omit<AxiosRequestConfig, "data" | "cancelToken"> {
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
  secure?: boolean;
  format?: ResponseType;
}

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private secure?: boolean;
  private format?: ResponseType;

  constructor({
    securityWorker,
    secure,
    format,
    ...axiosConfig
  }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({
      ...axiosConfig,
      baseURL: axiosConfig.baseURL || "/api",
    });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected mergeRequestParams(
    params1: AxiosRequestConfig,
    params2?: AxiosRequestConfig,
  ): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method &&
          this.instance.defaults.headers[
            method.toLowerCase() as keyof HeadersDefaults
          ]) ||
          {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === "object" && formItem !== null) {
      return JSON.stringify(formItem);
    } else {
      return `${formItem}`;
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    if (input instanceof FormData) {
      return input;
    }
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      const propertyContent: any[] =
        property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(
          key,
          isFileType ? formItem : this.stringifyFormItem(formItem),
        );
      }

      return formData;
    }, new FormData());
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    ...params
  }: FullRequestParams): Promise<T> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const responseFormat = format || this.format || undefined;

    if (
      type === ContentType.FormData &&
      body &&
      body !== null &&
      typeof body === "object"
    ) {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (
      type === ContentType.Text &&
      body &&
      body !== null &&
      typeof body !== "string"
    ) {
      body = JSON.stringify(body);
    }

    return this.instance
      .request({
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type ? { "Content-Type": type } : {}),
        },
        params: query,
        responseType: responseFormat,
        data: body,
        url: path,
      })
      .then((response) => response.data);
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
     * @name TfIdfList
     * @summary Get TF-IDF machine learning model for payee-account prediction
     * @request GET:/account/tf_idf
     * @secure
     */
    tfIdfList: (params: RequestParams = {}) =>
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
     * @name AllocationList
     * @summary Get asset class allocations
     * @request GET:/allocation
     * @secure
     */
    allocationList: (params: RequestParams = {}) =>
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
     * @name BalanceList
     * @summary Get current asset balances and breakdowns
     * @request GET:/assets/balance
     * @secure
     */
    balanceList: (params: RequestParams = {}) =>
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
     * @name BudgetList
     * @summary Get budget forecasts and actuals
     * @request GET:/budget
     * @secure
     */
    budgetList: (params: RequestParams = {}) =>
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
     * @name CapitalGainsList
     * @summary Get FIFO realized capital gains
     * @request GET:/capital_gains
     * @secure
     */
    capitalGainsList: (params: RequestParams = {}) =>
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
     * @name CashFlowList
     * @summary Get monthly cash flow statement
     * @request GET:/cash_flow
     * @secure
     */
    cashFlowList: (params: RequestParams = {}) =>
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
     * @name ConfigList
     * @summary Get application configuration and metadata
     * @request GET:/config
     * @secure
     */
    configList: (params: RequestParams = {}) =>
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
     * @name ConfigCreate
     * @summary Save configuration YAML
     * @request POST:/config
     * @secure
     */
    configCreate: (config: string, params: RequestParams = {}) =>
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
     * @name CreditCardsList
     * @summary Get all credit cards summaries and billing cycles
     * @request GET:/credit_cards
     * @secure
     */
    creditCardsList: (params: RequestParams = {}) =>
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
     * @name CreditCardsDetail
     * @summary Get credit card summary for a specific account
     * @request GET:/credit_cards/{account}
     * @secure
     */
    creditCardsDetail: (account: string, params: RequestParams = {}) =>
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
     * @name DashboardList
     * @summary Get dashboard financial summary
     * @request GET:/dashboard
     * @secure
     */
    dashboardList: (params: RequestParams = {}) =>
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
     * @name DiagnosisList
     * @summary Run system diagnostic health checks
     * @request GET:/diagnosis
     * @secure
     */
    diagnosisList: (params: RequestParams = {}) =>
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
     * @name FileCreate
     * @summary Read a specific ledger file and its backup versions
     * @request POST:/editor/file
     * @secure
     */
    fileCreate: (file: DtoLedgerFileRequest, params: RequestParams = {}) =>
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
     * @name FileDeleteBackupsCreate
     * @summary Delete backup versions for a ledger file
     * @request POST:/editor/file/delete_backups
     * @secure
     */
    fileDeleteBackupsCreate: (
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
     * @name FilesList
     * @summary List all ledger files in journal directory
     * @request GET:/editor/files
     * @secure
     */
    filesList: (params: RequestParams = {}) =>
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
     * @name SaveCreate
     * @summary Save ledger file and trigger database synchronization
     * @request POST:/editor/save
     * @secure
     */
    saveCreate: (file: DtoLedgerFileRequest, params: RequestParams = {}) =>
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
     * @name ValidateCreate
     * @summary Validate ledger file syntax
     * @request POST:/editor/validate
     * @secure
     */
    validateCreate: (file: DtoLedgerFileRequest, params: RequestParams = {}) =>
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
     * @name ExpenseList
     * @summary Get expense hierarchy graph and breakdown
     * @request GET:/expense
     * @secure
     */
    expenseList: (params: RequestParams = {}) =>
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
     * @name GainList
     * @summary Get investment gains and XIRR performance
     * @request GET:/gain
     * @secure
     */
    gainList: (params: RequestParams = {}) =>
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
     * @name GainDetail
     * @summary Get investment gain for a specific account
     * @request GET:/gain/{account}
     * @secure
     */
    gainDetail: (account: string, params: RequestParams = {}) =>
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
     * @name GoalsList
     * @summary List savings and retirement goals summaries
     * @request GET:/goals
     * @secure
     */
    goalsList: (params: RequestParams = {}) =>
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
     * @name GoalsDetail
     * @summary Get details for a specific goal
     * @request GET:/goals/{type}/{name}
     * @secure
     */
    goalsDetail: (type: string, name: string, params: RequestParams = {}) =>
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
     * @name HarvestList
     * @summary Get tax harvesting opportunities
     * @request GET:/harvest
     * @secure
     */
    harvestList: (params: RequestParams = {}) =>
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
     * @name IncomeList
     * @summary Get income timeline and yearly summary
     * @request GET:/income
     * @secure
     */
    incomeList: (params: RequestParams = {}) =>
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
     * @name IncomeStatementList
     * @summary Get financial-year income statements
     * @request GET:/income_statement
     * @secure
     */
    incomeStatementList: (params: RequestParams = {}) =>
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
     * @name InitCreate
     * @summary Initialize demo data
     * @request POST:/init
     * @secure
     */
    initCreate: (params: RequestParams = {}) =>
      this.http.request<DtoSuccessResponse, DtoErrorResponse>({
        path: `/init`,
        method: "POST",
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
     * @name InvestmentList
     * @summary Get investment summary and savings rate
     * @request GET:/investment
     * @secure
     */
    investmentList: (params: RequestParams = {}) =>
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
     * @name LedgerList
     * @summary Get all ledger postings with market valuation
     * @request GET:/ledger
     * @secure
     */
    ledgerList: (params: RequestParams = {}) =>
      this.http.request<DtoPostingResponse[], any>({
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
     * @name BalanceList
     * @summary Get loan balances and breakdowns
     * @request GET:/liabilities/balance
     * @secure
     */
    balanceList: (params: RequestParams = {}) =>
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
     * @name InterestList
     * @summary Get loan interest and APR calculations
     * @request GET:/liabilities/interest
     * @secure
     */
    interestList: (params: RequestParams = {}) =>
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
     * @name RepaymentList
     * @summary Get loan repayment history
     * @request GET:/liabilities/repayment
     * @secure
     */
    repaymentList: (params: RequestParams = {}) =>
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
     * @name LogsList
     * @summary Get application log entries
     * @request GET:/logs
     * @secure
     */
    logsList: (params: RequestParams = {}) =>
      this.http.request<string[], any>({
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
     * @name NetworthList
     * @summary Get net worth
     * @request GET:/networth
     * @secure
     */
    networthList: (params: RequestParams = {}) =>
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
     * @name PingList
     * @summary Health check / ping
     * @request GET:/ping
     */
    pingList: (params: RequestParams = {}) =>
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
     * @name PortfolioAllocationList
     * @summary Get portfolio-grouped allocations
     * @request GET:/portfolio_allocation
     * @secure
     */
    portfolioAllocationList: (params: RequestParams = {}) =>
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
     * @name HistoryList
     * @summary Get prediction history
     * @request GET:/prediction/history
     * @secure
     */
    historyList: (params: RequestParams = {}) =>
      this.http.request<DtoPredictionHistoryEntryResponse[], any>({
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
     * @name PriceList
     * @summary Get all cached commodity prices
     * @request GET:/price
     * @secure
     */
    priceList: (params: RequestParams = {}) =>
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
     * @name AutocompleteCreate
     * @summary Autocomplete commodity or ticker symbols
     * @request POST:/price/autocomplete
     * @secure
     */
    autocompleteCreate: (
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
     * @name DeleteCreate
     * @summary Clear cached market prices
     * @request POST:/price/delete
     * @secure
     */
    deleteCreate: (params: RequestParams = {}) =>
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
     * @name ProvidersList
     * @summary Get configured price providers
     * @request GET:/price/providers
     * @secure
     */
    providersList: (params: RequestParams = {}) =>
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
     * @name ProvidersDeleteCreate
     * @summary Clear price cache for a specific provider
     * @request POST:/price/providers/delete/{provider}
     * @secure
     */
    providersDeleteCreate: (provider: string, params: RequestParams = {}) =>
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
     * @name RecurringList
     * @summary Get recurring transaction sequences
     * @request GET:/recurring
     * @secure
     */
    recurringList: (params: RequestParams = {}) =>
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
     * @name ScheduleAlList
     * @summary Get Schedule AL assets and liabilities report
     * @request GET:/schedule_al
     * @secure
     */
    scheduleAlList: (params: RequestParams = {}) =>
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
     * @name FileCreate
     * @summary Read a specific .paisa sheet file
     * @request POST:/sheets/file
     * @secure
     */
    fileCreate: (file: DtoSheetFileRequest, params: RequestParams = {}) =>
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
     * @name FileDeleteBackupsCreate
     * @summary Delete backup versions for a sheet file
     * @request POST:/sheets/file/delete_backups
     * @secure
     */
    fileDeleteBackupsCreate: (
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
     * @name FilesList
     * @summary List all .paisa sheet query files
     * @request GET:/sheets/files
     * @secure
     */
    filesList: (params: RequestParams = {}) =>
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
     * @name SaveCreate
     * @summary Save a .paisa sheet file
     * @request POST:/sheets/save
     * @secure
     */
    saveCreate: (file: DtoSheetFileRequest, params: RequestParams = {}) =>
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
     * @name SyncCreate
     * @summary Synchronize journal, prices, and portfolios into SQLite
     * @request POST:/sync
     * @secure
     */
    syncCreate: (request: ServerSyncRequest, params: RequestParams = {}) =>
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
     * @name TemplatesList
     * @summary List all transaction templates
     * @request GET:/templates
     * @secure
     */
    templatesList: (params: RequestParams = {}) =>
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
     * @name DeleteCreate
     * @summary Delete a transaction template
     * @request POST:/templates/delete
     * @secure
     */
    deleteCreate: (
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
     * @name UpsertCreate
     * @summary Create or update a transaction template
     * @request POST:/templates/upsert
     * @secure
     */
    upsertCreate: (
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
     * @name TransactionList
     * @summary Get all journal transactions
     * @request GET:/transaction
     * @secure
     */
    transactionList: (params: RequestParams = {}) =>
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
     * @name BalancedList
     * @summary Get balanced posting pairs
     * @request GET:/transaction/balanced
     * @secure
     */
    balancedList: (params: RequestParams = {}) =>
      this.http.request<DtoBalancedPostingResponse[], any>({
        path: `/transaction/balanced`,
        method: "GET",
        secure: true,
        format: "json",
        ...params,
      }),
  };
}
