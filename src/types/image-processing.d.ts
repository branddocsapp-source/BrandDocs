declare module "upng-js" {
  const UPNG: {
    decode(buffer: ArrayBuffer): { width: number; height: number };
    toRGBA8(decoded: { width: number; height: number }): Uint8Array[];
    encode(buffers: ArrayBuffer[], width: number, height: number, cnum: number): ArrayBuffer;
  };

  export default UPNG;
}

declare module "jpeg-js" {
  export function decode(
    buffer: Uint8Array,
    options?: { useTArray?: boolean }
  ): { width: number; height: number; data: Uint8Array };
}
