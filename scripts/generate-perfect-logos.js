const fs = require('fs');
const path = require('path');
const UPNG = require('upng-js');
const jpeg = require('jpeg-js');

// 1. Process Dark Logo
const darkBuf = fs.readFileSync(path.resolve(__dirname, '../assets/images/branddocs-logo-dark.jpg'));
const darkDecoded = UPNG.decode(darkBuf);
const darkData = new Uint8Array(UPNG.toRGBA8(darkDecoded)[0]);
const dW = darkDecoded.width, dH = darkDecoded.height;

const dCropX = 155;
const dCropY = 27;
const dCropW = 412;
const dCropH = 258;

const darkOut = new Uint8Array(dCropW * dCropH * 4);
for (let y = 0; y < dCropH; y++) {
  for (let x = 0; x < dCropW; x++) {
    const srcIdx = ((dCropY + y) * dW + (dCropX + x)) * 4;
    const dstIdx = (y * dCropW + x) * 4;
    const r = darkData[srcIdx], g = darkData[srcIdx+1], b = darkData[srcIdx+2];
    
    // Background removal for dark background
    const dist = Math.sqrt((r - 20)**2 + (g - 22)**2 + (b - 25)**2);
    if (dist < 18) {
      darkOut[dstIdx] = 0;
      darkOut[dstIdx+1] = 0;
      darkOut[dstIdx+2] = 0;
      darkOut[dstIdx+3] = 0;
    } else if (dist < 38) {
      const alpha = Math.round(((dist - 18) / 20) * 255);
      darkOut[dstIdx] = r;
      darkOut[dstIdx+1] = g;
      darkOut[dstIdx+2] = b;
      darkOut[dstIdx+3] = alpha;
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
  Buffer.from(UPNG.encode([darkOut.buffer], dCropW, dCropH, 0))
);
console.log('Successfully generated branddocs-logo-dark-trans.png (' + dCropW + 'x' + dCropH + ')');

// 2. Process Light Logo
const lightBuf = fs.readFileSync(path.resolve(__dirname, '../assets/images/branddocs-logo-light.jpg'));
const lightDecoded = jpeg.decode(lightBuf, { useTArray: true });
const lightData = lightDecoded.data;
const lW = lightDecoded.width, lH = lightDecoded.height;

const lCropX = 230;
const lCropY = 90;
const lCropW = 572;
const lCropH = 354;

const lightOut = new Uint8Array(lCropW * lCropH * 4);
for (let y = 0; y < lCropH; y++) {
  for (let x = 0; x < lCropW; x++) {
    const srcIdx = ((lCropY + y) * lW + (lCropX + x)) * 4;
    const dstIdx = (y * lCropW + x) * 4;
    const r = lightData[srcIdx], g = lightData[srcIdx+1], b = lightData[srcIdx+2];
    const brightness = (r + g + b) / 3;
    
    if (brightness > 225) {
      lightOut[dstIdx] = 255;
      lightOut[dstIdx+1] = 255;
      lightOut[dstIdx+2] = 255;
      lightOut[dstIdx+3] = 0;
    } else if (brightness > 190) {
      const alpha = Math.round(((225 - brightness) / 35) * 255);
      lightOut[dstIdx] = r;
      lightOut[dstIdx+1] = g;
      lightOut[dstIdx+2] = b;
      lightOut[dstIdx+3] = alpha;
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
  Buffer.from(UPNG.encode([lightOut.buffer], lCropW, lCropH, 0))
);
console.log('Successfully generated branddocs-logo-light-trans.png (' + lCropW + 'x' + lCropH + ')');
