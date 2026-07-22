const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

const brainDir = 'C:/Users/ayush/.gemini/antigravity-ide/brain/2847a4f1-89b7-4db9-9031-2ea568ac1665';
const targetDir = path.join(__dirname, 'assets', 'images');

try {
  const darkSrc = path.join(brainDir, 'media__1784550586140.jpg');
  const lightSrc = path.join(brainDir, 'media__1784550586190.jpg');

  const darkDst = path.join(targetDir, 'branddocs-logo-dark.jpg');
  const lightDst = path.join(targetDir, 'branddocs-logo-light.jpg');

  if (fs.existsSync(darkSrc)) {
    fs.copyFileSync(darkSrc, darkDst);
    console.log('[Metro] Successfully copied dark logo to branddocs-logo-dark.jpg');
  }
  if (fs.existsSync(lightSrc)) {
    fs.copyFileSync(lightSrc, lightDst);
    console.log('[Metro] Successfully copied light logo to branddocs-logo-light.jpg');
  }
} catch (err) {
  console.error('[Metro] Logo copy error:', err.message);
}

const config = getDefaultConfig(__dirname);
module.exports = config;
