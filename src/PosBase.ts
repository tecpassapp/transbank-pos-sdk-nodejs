import { EventEmitter } from 'events';
import { SerialPort } from 'serialport';
import { InterByteTimeoutParser } from '@serialport/parser-inter-byte-timeout';
import * as LRC from 'lrc-calculator';
import { responseCodes, type ResponseCode } from './responseCodes.js';
import type {
  LoadKeysResponse,
  IntermediateResponse,
  IntermediateCallback,
} from './types/index.js';

/**
 * Serial port information returned by SerialPort.list()
 */
export interface PortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  locationId?: string;
  productId?: string;
  vendorId?: string;
}

const ACK = 0x06;

type ResponseCallback = (data: Buffer) => void;
type AckCallback = (data: Buffer) => void;

export interface POSEvents {
  port_opened: (port: string) => void;
  port_closed: () => void;
}

export declare interface POSBase {
  on<K extends keyof POSEvents>(event: K, listener: POSEvents[K]): this;
  emit<K extends keyof POSEvents>(
    event: K,
    ...args: Parameters<POSEvents[K]>
  ): boolean;
}

export class POSBase extends EventEmitter {
  protected currentPort: string | null = null;
  protected connected: boolean = false;
  protected defaultBaudRate: number;
  protected ackTimeout: number = 2000;
  protected posTimeout: number = 150000;
  protected debugEnabled: boolean = false;
  protected port: SerialPort | null = null;
  protected parser: InterByteTimeoutParser | null = null;
  protected responseAsString: boolean = true;
  protected waiting: boolean = false;
  protected connecting: boolean = false;

  private responseCallback: ResponseCallback = () => {};
  private ackCallback: AckCallback = () => {};

  constructor() {
    super();
    this.defaultBaudRate =
      this.constructor.name === 'POSAutoservicio' ? 19200 : 115200;
  }

  /*
   |--------------------------------------------------------------------------
   | Getters and Setters
   |--------------------------------------------------------------------------
   */

  protected debug(...args: unknown[]): void {
    if (this.debugEnabled) {
      console.log(...args);
    }
  }

  setDebug(debug: boolean = true): void {
    this.debugEnabled = debug;
  }

  setAckTimeout(timeout: number): void {
    this.ackTimeout = timeout;
  }

  setPosTimeout(timeout: number): void {
    this.posTimeout = timeout;
  }

  getResponsesAsString(): void {
    this.responseAsString = true;
  }

  getResponsesAsHexArray(): void {
    this.responseAsString = false;
  }

  getConnectedPort(): string | null {
    return this.currentPort;
  }

  isConnected(): boolean {
    return this.connected;
  }

  raw_serial_port(): SerialPort | null {
    return this.port;
  }

  raw_parser(): InterByteTimeoutParser | null {
    return this.parser;
  }

  listPorts(): Promise<PortInfo[]> {
    return SerialPort.list();
  }

  bufferToPrintableString(buffer: Buffer | number[]): string {
    let printableString = '';
    const lrcIndex = buffer.length - 1;

    const bufferArray = Buffer.isBuffer(buffer) ? [...buffer] : buffer;
    bufferArray.forEach((char, index) => {
      if (index === lrcIndex) {
        printableString += `{0x${char.toString(16).padStart(2, '0')}}`;
      } else {
        printableString +=
          32 <= char && char < 126
            ? String.fromCharCode(char)
            : `{0x${char.toString(16).padStart(2, '0')}}`;
      }
    });
    return printableString;
  }

  /*
   |--------------------------------------------------------------------------
   | Serial Port Handling
   |--------------------------------------------------------------------------
   */

  connect(
    portName: string | null = null,
    baudRate: number = this.defaultBaudRate
  ): Promise<boolean> {
    this.debug('Connecting to ' + portName + ' @' + baudRate);

    return new Promise((resolve, reject) => {
      // Block so just one connect command can be sent at a time
      if (this.connecting === true) {
        return reject(
          new Error(
            'Another connect command was already sent and it is still waiting'
          )
        );
      }

      if (this.connected) {
        this.debug(
          'Trying to connect to a port while its already connected. Disconnecting... '
        );
        this.disconnect()
          .then(() => {
            resolve(this.connect(portName, baudRate));
          })
          .catch(() => {
            resolve(this.connect(portName, baudRate));
          });
        this.connecting = false;
        return;
      }

      this.connecting = true;

      if (!portName) {
        this.connecting = false;
        return reject(new Error('Port name is required'));
      }

      this.port = new SerialPort({
        path: portName,
        baudRate: baudRate,
        autoOpen: false,
      });

      this.port.open((err) => {
        if (err) {
          this.debug('Error opening port', err);
          return reject(new Error('Could not open serial connection...'));
        }
      });

      this.parser = this.port.pipe(
        new InterByteTimeoutParser({ interval: 100 })
      );

      this.parser.on('data', (data: Buffer) => {
        this.debug(`IN <-- ${this.bufferToPrintableString(data)}`);

        // Primero, se recibe un ACK
        if (this.itsAnACK(data)) {
          if (typeof this.ackCallback === 'function') {
            this.ackCallback(data);
          }
          return;
        }

        // Si se recibió una respuesta (diferente a un ACK) entonces responder con un ACK y mandar el mensaje por callback
        this.port?.write(Buffer.from([ACK]));
        this.debug(`OUT --> ${this.bufferToPrintableString([ACK])}`);
        if (typeof this.responseCallback === 'function') {
          this.responseCallback(data);
        }
      }); // will emit data if there is a pause between packets of at least 30ms

      this.port.on('open', () => {
        this.debug('Port opened');
        this.connected = true;
        this.poll()
          .then(() => {
            this.currentPort = portName;
            this.emit('port_opened', this.currentPort);
            resolve(true);
          })
          .catch(async (e: Error) => {
            this.connected = false;
            this.waiting = false;
            this.currentPort = null;
            if (this.port?.isOpen) {
              await this.disconnect();
            }
            reject(e);
          });
      });

      this.port.on('close', () => {
        this.debug('Port closed');
        this.currentPort = null;
        this.waiting = false;
        this.connected = false;
        this.emit('port_closed');
      });

      this.connecting = false;
    });
  }

  disconnect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.port?.isOpen) {
        resolve(true);
        return;
      }

      this.port.close((error) => {
        if (error) {
          this.debug('Error closing port', error);
          reject(error);
        } else {
          this.debug('Port closed successfully');
          resolve(true);
        }
      });
    });
  }

  async autoconnect(
    baudrate: number = this.defaultBaudRate
  ): Promise<PortInfo | false> {
    // Block so just one autoconnect command can be sent at a time
    if (this.connecting === true) {
      this.debug(
        'It is already trying to connect. Please wait for it to finish'
      );
      return false;
    }

    const ports = await this.listPorts();

    for (const port of ports) {
      this.debug('Trying to connect to ' + port.path);
      try {
        await this.connect(port.path, baudrate);
        this.connecting = false;
        return port;
      } catch (e) {
        this.debug('Error to connect ' + port.path);
        console.log(e);
      }
    }

    this.connecting = false;
    this.debug('Autoconnection failed');
    return false;
  }

  send(
    payload: string,
    waitResponse: boolean = true,
    callback: IntermediateCallback | null = null
  ): Promise<string | Buffer> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        return reject(
          new Error(
            'You have to connect to a POS to send this message: ' +
              payload.toString()
          )
        );
      }
      // Block so just one message can be sent at a time
      if (this.waiting === true) {
        return reject(
          new Error(
            'Another message was already sent and it is still waiting for a response from the POS'
          )
        );
      }
      this.waiting = true;

      // Assert the ack arrives before the given timeout.
      const timeout = setTimeout(() => {
        this.waiting = false;
        clearTimeout(responseTimeout);
        reject(
          new Error('ACK has not been received in ' + this.ackTimeout + ' ms.')
        );
      }, this.ackTimeout);

      // Defines what should happen when the ACK is received
      this.ackCallback = () => {
        clearTimeout(timeout);
        if (!waitResponse) {
          this.waiting = false;
          resolve(true as unknown as string);
        }
      };

      // Prepare the message
      const buffer = Buffer.from(LRC.asStxEtx(payload));

      this.debug(`OUT --> ${this.bufferToPrintableString(buffer)}`);

      //Send the message
      this.port?.write(buffer, (err) => {
        if (err) {
          this.debug('Error sending message', err);
          reject(new Error('Failed to send message to POS.'));
        }
      });

      const responseTimeout = setTimeout(() => {
        this.waiting = false;
        reject(
          new Error(
            `Response of POS has not been received in ${this.posTimeout / 1000} seconds`
          )
        );
      }, this.posTimeout);

      // Wait for the response and fullfill the Promise
      this.responseCallback = (data: Buffer) => {
        clearTimeout(responseTimeout);
        let response: string | Buffer = data;
        if (this.responseAsString) {
          response = data.toString().slice(1, -2);
        }
        const functionCode = data.toString().slice(1, 5);

        if (functionCode === '0900') {
          // Sale status messages
          if (typeof callback === 'function') {
            callback(this.intermediateResponse(response as string), data);
          }
          return;
        }
        if (functionCode === '0261') {
          if (typeof callback === 'function') {
            callback(response as string, data);
          }
          return;
        }

        this.waiting = false;

        resolve(response);
      };
    });
  }

  getResponseMessage(response: number): string | null {
    return response in responseCodes
      ? responseCodes[response as ResponseCode]
      : null;
  }

  itsAnACK(data: Buffer): boolean {
    return Buffer.compare(data, Buffer.from([ACK])) === 0;
  }

  /*
   |--------------------------------------------------------------------------
   | Shared Commands
   |--------------------------------------------------------------------------
   */

  poll(): Promise<string | Buffer> {
    return this.send('0100', false);
  }

  loadKeys(): Promise<LoadKeysResponse> {
    return this.send('0800').then((data) => {
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

  intermediateResponse(payload: string): IntermediateResponse {
    const chunks = payload.split('|');
    const response: IntermediateResponse = {
      responseCode: parseInt(chunks[1] ?? '0'),
      responseMessage: this.getResponseMessage(parseInt(chunks[1] ?? '0')),
    };

    return response;
  }
}
