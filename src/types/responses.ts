/**
 * Base response fields shared by most POS responses
 */
export interface BaseResponse {
  functionCode: number;
  responseCode: number;
  responseMessage: string | null;
  successful: boolean;
}

/**
 * Response from loadKeys() command
 */
export interface LoadKeysResponse extends BaseResponse {
  commerceCode: number;
  terminalId: string;
}

/**
 * Response from closeDay() command - POSIntegrado
 */
export interface CloseDayResponse extends BaseResponse {
  commerceCode: number;
  terminalId: string;
}

/**
 * Response from closeDay() command - POSAutoservicio (includes voucher)
 */
export interface CloseDayWithVoucherResponse extends BaseResponse {
  commerceCode: number;
  terminalId: string;
  voucher: string[] | undefined;
}

/**
 * Response from getTotals() command
 */
export interface GetTotalsResponse extends BaseResponse {
  txCount: number;
  txTotal: number;
}

/**
 * Response from refund() command - POSIntegrado
 */
export interface RefundResponse extends BaseResponse {
  commerceCode: number;
  terminalId: string;
  authorizationCode: string;
  operationId: string;
}

/**
 * Response from refund() command - POSAutoservicio
 */
export interface RefundAutoservicioResponse extends BaseResponse {
  commerceCode: number;
  terminalId: string;
  authorizationCode: string;
  operationId: string;
}

/**
 * Response from sale() and getLastSale() - POSIntegrado
 */
export interface SaleResponse extends BaseResponse {
  commerceCode: number | string;
  terminalId: string;
  ticket: string;
  authorizationCode: string | null;
  amount: number;
  sharesNumber: string;
  sharesAmount: string;
  last4Digits: number | null;
  operationNumber: string;
  cardType: string;
  accountingDate: string;
  accountNumber: string;
  cardBrand: string;
  realDate: string;
  realTime: string;
  employeeId: string;
  tip: number | null;
  /** Only present in multicodeSale responses */
  change?: string;
}

/**
 * Response from sale() and getLastSale() - POSAutoservicio
 */
export interface SaleAutoservicioResponse extends BaseResponse {
  commerceCode: number;
  terminalId: string;
  ticket: string;
  authorizationCode: string | null;
  amount: number;
  last4Digits: number | null;
  operationNumber: string;
  cardType: string;
  accountingDate: string;
  accountNumber: string;
  cardBrand: string;
  realDate: string;
  realTime: string;
  voucher: string[] | undefined;
  shareType: string;
  sharesNumber: string;
  sharesAmount: string;
  sharesTypeComment: string;
}

/**
 * Response from salesDetail() - individual sale detail
 */
export interface SaleDetailResponse extends BaseResponse {
  commerceCode: number;
  terminalId: string;
  ticket: string;
  authorizationCode: string | null;
  amount: string;
  last4Digits: number;
  operationNumber: string;
  cardType: string;
  accountingDate: string;
  accountNumber: string;
  cardBrand: string;
  realDate: string;
  realTime: string;
  employeeId: string;
  tip: number;
  feeAmount: string;
  feeNumber: string;
}

/**
 * Intermediate response during sale operations (function code 0900)
 */
export interface IntermediateResponse {
  responseCode: number;
  responseMessage: string | null;
}

/**
 * Response from initializationResponse() - POSAutoservicio
 */
export interface InitializationResponse extends BaseResponse {
  transactionDate: number;
  transactionTime: string;
}

/**
 * Callback for intermediate responses during sale operations
 */
export type IntermediateCallback = (
  response: IntermediateResponse | string,
  raw?: Buffer
) => void;

/**
 * Callback for sale detail responses
 */
export type SaleDetailCallback = (
  response: string,
  raw?: Buffer
) => void;
