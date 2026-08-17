const fs = require('fs');
const path = require('path');

const fontPath = path.resolve(__dirname, '../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf');
const fontBuf = fs.readFileSync(fontPath);
const base64 = fontBuf.toString('base64');

const globalCssPath = path.resolve(__dirname, '../src/global.css');
let css = fs.readFileSync(globalCssPath, 'utf8');

// Strip all conflict markers and old font face blocks
css = css.split('\n').filter(line => {
  if (line.startsWith('<<<<<<<') || line.startsWith('=======') || line.startsWith('>>>>>>>')) return false;
  return true;
}).join('\n');

const fontFace = `
@font-face {
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

// Extract base css before font-faces
let baseCss = css.split('@font-face')[0].trim();
const finalCss = baseCss + '\n' + fontFace;
fs.writeFileSync(globalCssPath, finalCss);
console.log('Cleaned global.css completely!');
