import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import jpeg from "jpeg-js";
import { Platform } from "react-native";
import UPNG from "upng-js";

export type LogoImageInput = {
  uri?: string | null;
  base64?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  file?: File | null;
  fileSize?: number | null;
};

export type ProcessedLogoImage = {
  uri: string;
  base64: string;
  mimeType: "image/png";
  fileName: string;
  file?: File | null;
  fileSize: number;
  backgroundRemoved: boolean;
};

export type RemoveLogoBackgroundOptions = {
  /** Color distance from sampled background (0-255 scale). */
  tolerance?: number;
  /** Pixels with R,G,B all above this value are treated as background. */
  whiteThreshold?: number;
};

const DEFAULT_OPTIONS: Required<RemoveLogoBackgroundOptions> = {
  tolerance: 38,
  whiteThreshold: 244,
};

function base64ToUint8Array(base64: string) {
  const normalized = base64.replace(/\s/g, "");
  const binary = globalThis.atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return globalThis.btoa(binary);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function sampleBackgroundColor(data: Uint8ClampedArray, width: number, height: number) {
  const samples: Array<[number, number, number]> = [];
  const sampleRadius = Math.min(6, Math.floor(Math.min(width, height) / 8) || 1);
  const corners = [
    [0, 0],
    [Math.max(0, width - sampleRadius), 0],
    [0, Math.max(0, height - sampleRadius)],
    [Math.max(0, width - sampleRadius), Math.max(0, height - sampleRadius)],
  ];

  for (const [startX, startY] of corners) {
    for (let dy = 0; dy < sampleRadius; dy += 1) {
      for (let dx = 0; dx < sampleRadius; dx += 1) {
        const x = Math.min(width - 1, startX + dx);
        const y = Math.min(height - 1, startY + dy);
        const index = (y * width + x) * 4;
        samples.push([data[index], data[index + 1], data[index + 2]]);
      }
    }
  }

  return {
    r: average(samples.map(([r]) => r)),
    g: average(samples.map(([, g]) => g)),
    b: average(samples.map(([, , b]) => b)),
  };
}

function removeBackgroundFromPixels(data: Uint8ClampedArray, width: number, height: number, options: Required<RemoveLogoBackgroundOptions>) {
  const background = sampleBackgroundColor(data, width, height);
  const visited = new Uint8Array(width * height);
  const isBackground = new Uint8Array(width * height);
  const queue: Array<[number, number]> = [];

  function matchesBackground(pixelIndex: number) {
    const r = data[pixelIndex];
    const g = data[pixelIndex + 1];
    const b = data[pixelIndex + 2];
    const isWhite = r >= options.whiteThreshold && g >= options.whiteThreshold && b >= options.whiteThreshold;
    const isNearBackground = colorDistance(r, g, b, background.r, background.g, background.b) <= options.tolerance;
    return isWhite || isNearBackground;
  }

  function enqueue(x: number, y: number) {
    const pixel = y * width + x;
    if (visited[pixel]) return;
    const index = pixel * 4;
    if (!matchesBackground(index)) return;
    visited[pixel] = 1;
    isBackground[pixel] = 1;
    queue.push([x, y]);
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (queue.length) {
    const [x, y] = queue.pop()!;
    if (x > 0) enqueue(x - 1, y);
    if (x < width - 1) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y < height - 1) enqueue(x, y + 1);
  }

  let removedPixels = 0;
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    if (!isBackground[pixel]) continue;
    const index = pixel * 4;
    data[index + 3] = 0;
    removedPixels += 1;
  }

  return removedPixels > 0;
}

function encodePngBase64(data: Uint8ClampedArray, width: number, height: number) {
  const rgbaBuffer = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  const pngBuffer = UPNG.encode([toArrayBuffer(rgbaBuffer)], width, height, 0) as ArrayBuffer;
  return uint8ArrayToBase64(new Uint8Array(pngBuffer));
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function decodeImageToRgba(input: LogoImageInput & { uri: string }): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  let mimeType = input.mimeType?.toLowerCase() || "image/png";
  let bytes: Uint8Array;

  if (Platform.OS === "web" && input.file) {
    bytes = new Uint8Array(await input.file.arrayBuffer());
    mimeType = input.file.type || mimeType;
  } else if (input.base64) {
    bytes = base64ToUint8Array(input.base64);
  } else {
    const response = await fetch(input.uri);
    if (!response.ok) {
      throw new Error("Could not read the selected logo image.");
    }
    bytes = new Uint8Array(await response.arrayBuffer());
    mimeType = response.headers.get("content-type")?.split(";")[0]?.trim()?.toLowerCase() || mimeType;
  }

  if (mimeType.includes("png") || input.fileName?.toLowerCase().endsWith(".png") || input.uri.toLowerCase().includes(".png")) {
    const decoded = UPNG.decode(toArrayBuffer(bytes));
    const rgba = UPNG.toRGBA8(decoded)[0] as Uint8Array;
    return {
      data: new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength),
      width: decoded.width,
      height: decoded.height,
    };
  }

  if (
    mimeType.includes("jpeg") ||
    mimeType.includes("jpg") ||
    input.fileName?.toLowerCase().match(/\.jpe?g$/) ||
    input.uri.toLowerCase().match(/\.jpe?g/)
  ) {
    const decoded = jpeg.decode(bytes, { useTArray: true });
    return {
      data: new Uint8ClampedArray(decoded.data),
      width: decoded.width,
      height: decoded.height,
    };
  }

  const converted = await manipulateAsync(input.uri, [], { format: SaveFormat.PNG, base64: true, compress: 1 });
  if (!converted.base64) {
    throw new Error("Could not convert the selected logo to PNG.");
  }
  const pngBytes = base64ToUint8Array(converted.base64);
  const decoded = UPNG.decode(toArrayBuffer(pngBytes));
  const rgba = UPNG.toRGBA8(decoded)[0] as Uint8Array;
  return {
    data: new Uint8ClampedArray(rgba.buffer, rgba.byteOffset, rgba.byteLength),
    width: decoded.width,
    height: decoded.height,
  };
}

async function removeLogoBackgroundWithCanvas(input: LogoImageInput & { uri: string }, options: Required<RemoveLogoBackgroundOptions>): Promise<ProcessedLogoImage> {
  if (typeof document === "undefined") {
    throw new Error("Canvas is not available on this platform.");
  }

  const blob = input.file
    ? input.file
    : await fetch(input.uri).then(async (response) => {
        if (!response.ok) throw new Error("Could not read the selected logo image.");
        return response.blob();
      });

  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Could not decode the selected logo image."));
      element.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Could not prepare the logo canvas.");
    }

    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const backgroundRemoved = removeBackgroundFromPixels(imageData.data, canvas.width, canvas.height, options);
    context.putImageData(imageData, 0, 0);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (!result) {
          reject(new Error("Could not export the processed logo."));
          return;
        }
        resolve(result);
      }, "image/png");
    });

    const base64 = uint8ArrayToBase64(new Uint8Array(await pngBlob.arrayBuffer()));
    const file = new File([pngBlob], "logo.png", { type: "image/png" });
    return {
      uri: URL.createObjectURL(pngBlob),
      base64,
      mimeType: "image/png",
      fileName: "logo.png",
      file,
      fileSize: pngBlob.size,
      backgroundRemoved,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function removeLogoBackgroundWithPixels(input: LogoImageInput & { uri: string }, options: Required<RemoveLogoBackgroundOptions>): Promise<ProcessedLogoImage> {
  let workingInput = input;

  if (!input.base64 && !input.file) {
    const converted = await manipulateAsync(input.uri, [], { format: SaveFormat.PNG, base64: true, compress: 1 });
    workingInput = {
      ...input,
      uri: converted.uri,
      base64: converted.base64 ?? null,
      mimeType: "image/png",
      fileName: input.fileName?.replace(/\.\w+$/, ".png") || "logo.png",
    };
  }

  const { data, width, height } = await decodeImageToRgba(workingInput);
  const backgroundRemoved = removeBackgroundFromPixels(data, width, height, options);
  const base64 = encodePngBase64(data, width, height);
  const uri = `data:image/png;base64,${base64}`;

  return {
    uri,
    base64,
    mimeType: "image/png",
    fileName: workingInput.fileName?.replace(/\.\w+$/, ".png") || "logo.png",
    fileSize: Math.ceil((base64.length * 3) / 4),
    backgroundRemoved,
  };
}

export async function removeLogoBackground(
  input: LogoImageInput,
  options: RemoveLogoBackgroundOptions = {}
): Promise<ProcessedLogoImage> {
  if (!input.uri) {
    throw new Error("A logo image URI is required.");
  }

  const resolvedOptions = { ...DEFAULT_OPTIONS, ...options };
  const normalizedInput = { ...input, uri: input.uri };

  try {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      return await removeLogoBackgroundWithCanvas(normalizedInput, resolvedOptions);
    }
    return await removeLogoBackgroundWithPixels(normalizedInput, resolvedOptions);
  } catch (error) {
    console.warn("[BrandDocs] Logo background removal failed; using original image.", error);
    const fallbackBase64 = input.base64 || getDataUriBase64(input.uri);
    return {
      uri: input.uri,
      base64: fallbackBase64 || "",
      mimeType: "image/png",
      fileName: input.fileName || "logo.png",
      file: input.file,
      fileSize: input.fileSize || (fallbackBase64 ? Math.ceil((fallbackBase64.length * 3) / 4) : 0),
      backgroundRemoved: false,
    };
  }
}

function getDataUriBase64(uri: string) {
  const match = uri.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  return match?.[1] || null;
}

/** Normalizes any picked/uploaded logo asset before storage. */
export async function processLogoAssetForUpload<T extends LogoImageInput | null | undefined>(asset: T): Promise<T> {
  if (!asset?.uri) return asset;

  const processed = await removeLogoBackground(asset);
  return {
    ...asset,
    uri: processed.uri,
    base64: processed.base64 || asset.base64 || null,
    mimeType: processed.mimeType,
    fileName: processed.fileName,
    file: processed.file ?? asset.file ?? null,
    fileSize: processed.fileSize || asset.fileSize || null,
  } as T;
}
