import { POSIntegrado } from './PosIntegrado.js';
import { POSAutoservicio } from './PosAutoservicio.js';

export { POSIntegrado } from './PosIntegrado.js';
export { POSAutoservicio } from './PosAutoservicio.js';
export { POSBase, type POSEvents, type PortInfo } from './PosBase.js';
export { responseCodes, type ResponseCode, type ResponseMessage } from './responseCodes.js';

// Re-export types for consumers
export type {
  BaseResponse,
  LoadKeysResponse,
  CloseDayResponse,
  CloseDayWithVoucherResponse,
  GetTotalsResponse,
  RefundResponse,
  RefundAutoservicioResponse,
  SaleResponse,
  SaleAutoservicioResponse,
  SaleDetailResponse,
  IntermediateResponse,
  InitializationResponse,
  IntermediateCallback,
  SaleDetailCallback,
} from './types/index.js';

// Default export for backward compatibility
export default {
  POSIntegrado,
  POSAutoservicio,
};
