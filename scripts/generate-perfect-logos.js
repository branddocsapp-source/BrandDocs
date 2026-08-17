const fs = require('fs');
const path = require('path');
const UPNG = require('upng-js');
const jpeg = require('jpeg-js');

// 1. Process Dark Logo
const darkBuf = fs.readFileSync(path.resolve(__dirname, '../assets/images/branddocs-logo-dark.jpg'));
let darkData, dW, dH;
try {
  const darkDecoded = UPNG.decode(darkBuf);
  darkData = new Uint8Array(UPNG.toRGBA8(darkDecoded)[0]);
  dW = darkDecoded.width;
  dH = darkDecoded.height;
} catch {
  const darkDecoded = jpeg.decode(darkBuf, { useTArray: true });
  darkData = darkDecoded.data;
  dW = darkDecoded.width;
  dH = darkDecoded.height;
}

const dCropX = 160;
const dCropY = 34;
const dCropW = 400;
const dCropH = 245;
const dPad = 10;
const dOutW = dCropW + dPad * 2;
const dOutH = dCropH + dPad * 2;

const darkOut = new Uint8Array(dOutW * dOutH * 4);
for (let y = 0; y < dCropH; y++) {
  for (let x = 0; x < dCropW; x++) {
    const srcX = dCropX + x;
    const srcY = dCropY + y;
    if (srcX < 0 || srcX >= dW || srcY < 0 || srcY >= dH) continue;
    const srcIdx = (srcY * dW + srcX) * 4;
    const dstIdx = ((y + dPad) * dOutW + (x + dPad)) * 4;
    const r = darkData[srcIdx], g = darkData[srcIdx+1], b = darkData[srcIdx+2];
    const maxVal = Math.max(r, g, b);

    if (maxVal < 12) {
      darkOut[dstIdx] = 0;
      darkOut[dstIdx+1] = 0;
      darkOut[dstIdx+2] = 0;
      darkOut[dstIdx+3] = 0;
    } else if (maxVal < 55) {
      const alphaFactor = (maxVal - 12) / 43;
      darkOut[dstIdx] = Math.min(255, Math.round(r / alphaFactor));
      darkOut[dstIdx+1] = Math.min(255, Math.round(g / alphaFactor));
      darkOut[dstIdx+2] = Math.min(255, Math.round(b / alphaFactor));
      darkOut[dstIdx+3] = Math.round(alphaFactor * 255);
    } else {
      darkOut[dstIdx] = r;
      darkOut[dstIdx+1] = g;
      darkOut[dstIdx+2] = b;
      darkOut[dstIdx+3] = 255;
    }
  }
}

fs.writeFileSync(
  path.resolve(__dirname, '../assets/images/branddocs-logo-dark-trans.png'),
  Buffer.from(UPNG.encode([darkOut.buffer], dOutW, dOutH, 0))
);
console.log('Successfully generated branddocs-logo-dark-trans.png (' + dOutW + 'x' + dOutH + ')');

// 2. Process Light Logo
const lightBuf = fs.readFileSync(path.resolve(__dirname, '../assets/images/branddocs-logo-light.jpg'));
const lightDecoded = jpeg.decode(lightBuf, { useTArray: true });
const lightData = lightDecoded.data;
const lW = lightDecoded.width, lH = lightDecoded.height;

const lCropX = 220;
const lCropY = 80;
const lCropW = 590;
const lCropH = 370;
const lPad = 10;
const lOutW = lCropW + lPad * 2;
const lOutH = lCropH + lPad * 2;

const lightOut = new Uint8Array(lOutW * lOutH * 4);
for (let y = 0; y < lCropH; y++) {
  for (let x = 0; x < lCropW; x++) {
    const srcX = lCropX + x;
    const srcY = lCropY + y;
    if (srcX < 0 || srcX >= lW || srcY < 0 || srcY >= lH) continue;
    const srcIdx = (srcY * lW + srcX) * 4;
    const dstIdx = ((y + lPad) * lOutW + (x + lPad)) * 4;
    const r = lightData[srcIdx], g = lightData[srcIdx+1], b = lightData[srcIdx+2];

    const dr = 255 - r, dg = 255 - g, db = 255 - b;
    const maxDiff = Math.max(dr, dg, db);

    if (maxDiff < 14) {
      lightOut[dstIdx] = 0;
      lightOut[dstIdx+1] = 0;
      lightOut[dstIdx+2] = 0;
      lightOut[dstIdx+3] = 0;
    } else if (maxDiff < 65) {
      const alphaFactor = (maxDiff - 14) / 51;
      lightOut[dstIdx] = Math.max(0, Math.min(255, Math.round(255 - (dr / alphaFactor))));
      lightOut[dstIdx+1] = Math.max(0, Math.min(255, Math.round(255 - (dg / alphaFactor))));
      lightOut[dstIdx+2] = Math.max(0, Math.min(255, Math.round(255 - (db / alphaFactor))));
      lightOut[dstIdx+3] = Math.round(alphaFactor * 255);
    } else {
      lightOut[dstIdx] = r;
      lightOut[dstIdx+1] = g;
      lightOut[dstIdx+2] = b;
      lightOut[dstIdx+3] = 255;
    }
  }
}

fs.writeFileSync(
  path.resolve(__dirname, '../assets/images/branddocs-logo-light-trans.png'),
  Buffer.from(UPNG.encode([lightOut.buffer], lOutW, lOutH, 0))
);
console.log('Successfully generated branddocs-logo-light-trans.png (' + lOutW + 'x' + lOutH + ')');
