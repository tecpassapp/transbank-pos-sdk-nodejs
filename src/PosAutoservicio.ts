import { POSBase } from './PosBase.js';
import type {
	CloseDayWithVoucherResponse,
	RefundAutoservicioResponse,
	SaleAutoservicioResponse,
	InitializationResponse,
	IntermediateCallback,
} from './types/index.js';

export class POSAutoservicio extends POSBase {
	sale(
		amount: string | number,
		ticket: string | number,
		sendStatus: boolean = false,
		sendVoucher: boolean = false,
		callback: IntermediateCallback | null = null
	): Promise<SaleAutoservicioResponse> {
		const amountStr = amount.toString().padStart(9, '0').slice(0, 9);
		const ticketStr = ticket.toString().padStart(6, '0').slice(0, 6);
		const status = sendStatus ? '1' : '0';
		const voucher = sendVoucher ? '1' : '0';

		return this.send(
			`0200|${amountStr}|${ticketStr}|${voucher}|${status}`,
			true,
			callback
		).then((data) => {
			return this.saleResponse(data as string);
		});
	}

	private saleResponse(payload: string): SaleAutoservicioResponse {
		const chunks = payload.split('|');
		const authorizationCode =
			typeof chunks[5] !== 'undefined' ? chunks[5].trim() : null;

		const response: SaleAutoservicioResponse = {
			functionCode: parseInt(chunks[0] ?? '0'),
			responseCode: parseInt(chunks[1] ?? '0'),
			responseMessage: this.getResponseMessage(parseInt(chunks[1] ?? '0')),
			commerceCode: parseInt(chunks[2] ?? '0'),
			terminalId: chunks[3] ?? '',
			successful: parseInt(chunks[1] ?? '0') === 0,
			ticket: chunks[4] ?? '',
			authorizationCode: authorizationCode,
			amount: parseInt(chunks[6] ?? '0'),
			last4Digits: chunks[7] !== '' ? parseInt(chunks[7] ?? '0') : null,
			operationNumber: chunks[8] ?? '',
			cardType: chunks[9] ?? '',
			accountingDate: chunks[10] ?? '',
			accountNumber: chunks[11] ?? '',
			cardBrand: chunks[12] ?? '',
			realDate: chunks[13] ?? '',
			realTime: chunks[14] ?? '',
			voucher: chunks[15]?.match(/.{1,40}/g) ?? undefined,
			shareType: chunks[16] ?? '',
			sharesNumber: chunks[17] ?? '',
			sharesAmount: chunks[18] ?? '',
			sharesTypeComment: chunks[19] ?? '',
		};
		return response;
	}

	getLastSale(sendVoucher: boolean = false): Promise<SaleAutoservicioResponse> {
		const voucher = sendVoucher ? '1' : '0';
		return this.send(`0250|${voucher}`).then((data) => {
			try {
				return this.saleResponse(data as string);
			} catch (e) {
				throw new Error((e as Error).message);
			}
		});
	}

	refund(): Promise<RefundAutoservicioResponse> {
		return this.send(`1200`).then((data) => {
			const chunks = (data as string).split('|');
			return {
				functionCode: parseInt((chunks[0] ?? '0').replace(/\D+/g, '')),
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

	closeDay(sendVoucher: boolean = false): Promise<CloseDayWithVoucherResponse> {
		const voucher = sendVoucher ? '1' : '0';
		return this.send(`0500|${voucher}`).then((data) => {
			const chunks = (data as string).split('|');
			return {
				functionCode: parseInt(chunks[0] ?? '0'),
				responseCode: parseInt(chunks[1] ?? '0'),
				commerceCode: parseInt(chunks[2] ?? '0'),
				terminalId: chunks[3] ?? '',
				voucher: chunks[4]?.match(/.{1,40}/g) ?? undefined,
				responseMessage: this.getResponseMessage(parseInt(chunks[1] ?? '0')),
				successful: parseInt(chunks[1] ?? '0') === 0,
			};
		});
	}

	initialization(): Promise<string | Buffer> {
		return this.send('0070', false);
	}

	initializationResponse(): Promise<InitializationResponse> {
		return this.send('0080').then((data) => {
			const chunks = (data as string).split('|');
			return {
				functionCode: parseInt(chunks[0] ?? '0'),
				responseCode: parseInt(chunks[1] ?? '0'),
				transactionDate: parseInt(chunks[2] ?? '0'),
				transactionTime: chunks[3] ?? '',
				responseMessage: this.getResponseMessage(parseInt(chunks[1] ?? '0')),
				successful: parseInt(chunks[1] ?? '0') === 0,
			};
		});
	}
}
