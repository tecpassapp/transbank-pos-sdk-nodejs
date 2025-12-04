declare module 'lrc-calculator' {
  /**
   * Calculate LRC from an array of hex values
   */
  export function fromHexArray(hexArray: number[]): number;

  /**
   * Calculate LRC from a string
   */
  export function fromString(payload: string): number;

  /**
   * Wrap payload with STX/ETX framing and LRC checksum
   * @param hexArrayOrString - Either a hex array or string payload
   * @returns Array of bytes with STX prefix, payload, ETX suffix, and LRC
   */
  export function asStxEtx(hexArrayOrString: number[] | string): number[];
}
