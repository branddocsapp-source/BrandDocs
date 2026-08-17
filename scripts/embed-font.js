const fs = require('fs');
const path = require('path');

const fontPath = path.resolve(__dirname, '../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf');
const fontBuf = fs.readFileSync(fontPath);
const base64 = fontBuf.toString('base64');
console.log('Ionicons font loaded. Base64 length:', base64.length);

const fontFaceCss = `@font-face {
  font-family: 'Ionicons';
  src: url('data:font/truetype;charset=utf-8;base64,${base64}') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: block;
}

@font-face {
  font-family: 'ionicons';
  src: url('data:font/truetype;charset=utf-8;base64,${base64}') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: block;
}
`;

const globalCssPath = path.resolve(__dirname, '../src/global.css');
let globalCss = fs.readFileSync(globalCssPath, 'utf8');

// Strip out any previous CDN @font-face for Ionicons
const lines = globalCss.split('\n');
const cleanLines = [];
let skipping = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('@font-face') && lines.slice(i, i + 8).some(l => l.includes('Ionicons') || l.includes('ionicons'))) {
    skipping = true;
  }
  if (!skipping) {
    cleanLines.push(line);
  }
  if (skipping && line.includes('}')) {
    skipping = false;
  }
}

const finalCss = cleanLines.join('\n').trim() + '\n\n' + fontFaceCss;
fs.writeFileSync(globalCssPath, finalCss);
console.log('Successfully written embedded base64 Ionicons font into src/global.css');
