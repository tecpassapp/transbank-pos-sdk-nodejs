import { POSBase } from './PosBase.js';
import type {
  CloseDayResponse,
  GetTotalsResponse,
  RefundResponse,
  SaleResponse,
  SaleDetailResponse,
  IntermediateCallback,
} from './types/index.js';

const FUNCTION_CODE_MULTICODE_SALE = '0271';

export class POSIntegrado extends POSBase {
  /*
   |--------------------------------------------------------------------------
   | POS Methods
   |--------------------------------------------------------------------------
   */

  closeDay(): Promise<CloseDayResponse> {
    return this.send('0500||').then((data) => {
      const chunks = (data as string).split('|');
      return {
        functionCode: parseInt(chunks[0] ?? '0'),
        responseCode: parseInt(chunks[1] ?? '0'),
        commerceCode: parseInt(chunks[2] ?? '0'),
        terminalId: chunks[3] ?? '',
        responseMessage: this.getResponseMessage(parseInt(chunks[1] ?? '0')),
        successful: parseInt(chunks[1] ?? '0') === 0,
      };
    });
  }

  getLastSale(): Promise<SaleResponse> {
    return this.send('0250|').then((data) => {
      try {
        return this.saleResponse(data as string);
      } catch (e) {
        throw new Error((e as Error).message);
      }
    });
  }

  getTotals(): Promise<GetTotalsResponse> {
    return this.send('0700||').then((data) => {
      const chunks = (data as string).split('|');
      return {
        functionCode: parseInt(chunks[0] ?? '0'),
        responseCode: parseInt(chunks[1] ?? '0'),
        txCount: parseInt(chunks[2] ?? '0'),
        txTotal: parseInt(chunks[3] ?? '0'),
        responseMessage: this.getResponseMessage(parseInt(chunks[1] ?? '0')),
        successful: parseInt(chunks[1] ?? '0') === 0,
      };
    });
  }

  salesDetail(
    printOnPos: boolean | string = false
  ): Promise<SaleDetailResponse[]> {
    return new Promise((resolve, reject) => {
      if (typeof printOnPos !== 'boolean' && typeof printOnPos !== 'string') {
        return reject(new Error('printOnPos must be of type boolean.'));
      }

      let shouldPrint: boolean;
      if (typeof printOnPos === 'string') {
        shouldPrint = printOnPos === 'true' || printOnPos === '1';
      } else {
        shouldPrint = printOnPos;
      }

      const print = shouldPrint ? '0' : '1';
      const sales: SaleDetailResponse[] = [];

      const onEverySale = (sale: string): void => {
        const detail = this.saleDetailResponse(sale.toString().slice(1, -2));
        if (detail.authorizationCode === '' || detail.authorizationCode === null) {
          resolve(sales);
          return;
        }
        sales.push(detail);
      };

      const promise = this.send(
        `0260|${print}|`,
        !shouldPrint,
        onEverySale as unknown as IntermediateCallback
      );
      if (shouldPrint) {
        resolve(promise as unknown as SaleDetailResponse[]);
      }
    });
  }

  refund(operationId: string | number): Promise<RefundResponse> {
    if (typeof operationId === 'undefined') {
      throw new Error('Operation ID not provided when calling refund method.');
    }

    const opId = operationId.toString().slice(0, 6);
    return this.send(`1200|${opId}|`).then((data) => {
      const chunks = (data as string).split('|');
      return {
        functionCode: parseInt(chunks[0] ?? '0'),
        responseCode: parseInt(chunks[1] ?? '0'),
        commerceCode: parseInt(chunks[2] ?? '0'),
        terminalId: chunks[3] ?? '',
        authorizationCode: (chunks[4] ?? '').trim(),
        operationId: chunks[5] ?? '',
        responseMessage: this.getResponseMessage(parseInt(chunks[1] ?? '0')),
        successful: parseInt(chunks[1] ?? '0') === 0,
      };
    });
  }

  changeToNormalMode(): Promise<string | Buffer> {
    return this.send('0300', false);
  }

  sale(
    amount: string | number,
    ticket: string | number,
    sendStatus: boolean = false,
    callback: IntermediateCallback | null = null
  ): Promise<SaleResponse> {
    const amountStr = amount.toString().padStart(9, '0').slice(0, 9);
    const ticketStr = ticket.toString().padStart(6, '0').slice(0, 6);
    const status = sendStatus ? '1' : '0';

    return this.send(
      `0200|${amountStr}|${ticketStr}|||${status}`,
      true,
      callback
    ).then((data) => {
      return this.saleResponse(data as string);
    });
  }

  multicodeSale(
    amount: string | number,
    ticket: string | number,
    commerceCode: string | number | null = null,
    sendStatus: boolean = false,
    callback: IntermediateCallback | null = null
  ): Promise<SaleResponse> {
    const amountStr = amount.toString().padStart(9, '0').slice(0, 9);
    const ticketStr = ticket.toString().padStart(6, '0').slice(0, 6);
    const commerce = commerceCode === null ? '0' : commerceCode;
    const status = sendStatus ? '1' : '0';

    return this.send(
      `0270|${amountStr}|${ticketStr}|||${status}|${commerce}`,
      true,
      callback
    ).then((data) => {
      return this.saleResponse(data as string);
    });
  }

  /*
   |--------------------------------------------------------------------------
   | Responses
   |--------------------------------------------------------------------------
   */

  private saleDetailResponse(payload: string): SaleDetailResponse {
    const chunks = payload.split('|');
    const authorizationCode =
      typeof chunks[5] !== 'undefined' ? chunks[5].trim() : null;
    return {
      functionCode: parseInt(chunks[0] ?? '0'),
      responseCode: parseInt(chunks[1] ?? '0'),
      commerceCode: parseInt(chunks[2] ?? '0'),
      terminalId: chunks[3] ?? '',
      responseMessage: this.getResponseMessage(parseInt(chunks[1] ?? '0')),
      successful: parseInt(chunks[1] ?? '0') === 0,
      ticket: chunks[4] ?? '',
      authorizationCode: authorizationCode,
      amount: chunks[6] ?? '',
      last4Digits: parseInt(chunks[7] ?? '0'),
      operationNumber: chunks[8] ?? '',
      cardType: chunks[9] ?? '',
      accountingDate: chunks[10] ?? '',
      accountNumber: chunks[11] ?? '',
      cardBrand: chunks[12] ?? '',
      realDate: chunks[13] ?? '',
      realTime: chunks[14] ?? '',
      employeeId: chunks[15] ?? '',
      tip: parseInt(chunks[16] ?? '0'),
      feeAmount: chunks[16] ?? '',
      feeNumber: chunks[17] ?? '',
    };
  }

  private saleResponse(payload: string): SaleResponse {
    const chunks = payload.split('|');
    const authorizationCode =
      typeof chunks[5] !== 'undefined' ? chunks[5].trim() : null;
    const response: SaleResponse = {
      functionCode: parseInt(chunks[0] ?? '0'),
      responseCode: parseInt(chunks[1] ?? '0'),
      commerceCode: parseInt(chunks[2] ?? '0'),
      terminalId: chunks[3] ?? '',
      responseMessage: this.getResponseMessage(parseInt(chunks[1] ?? '0')),
      successful: parseInt(chunks[1] ?? '0') === 0,
      ticket: chunks[4] ?? '',
      authorizationCode: authorizationCode,
      amount: parseInt(chunks[6] ?? '0'),
      sharesNumber: chunks[7] ?? '',
      sharesAmount: chunks[8] ?? '',
      last4Digits: chunks[9] !== '' ? parseInt(chunks[9] ?? '0') : null,
      operationNumber: chunks[10] ?? '',
      cardType: chunks[11] ?? '',
      accountingDate: chunks[12] ?? '',
      accountNumber: chunks[13] ?? '',
      cardBrand: chunks[14] ?? '',
      realDate: chunks[15] ?? '',
      realTime: chunks[16] ?? '',
      employeeId: chunks[17] ?? '',
      tip: chunks[18] !== '' ? parseInt(chunks[18] ?? '0') : null,
    };
    if (chunks[0] === FUNCTION_CODE_MULTICODE_SALE) {
      response.change = chunks[20] ?? '';
      response.commerceCode = chunks[21] ?? '';
    }
    return response;
  }
}
