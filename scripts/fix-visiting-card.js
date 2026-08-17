const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/app/visiting-card.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace('profile: BusinessProfile;', 'profile: BusinessProfile | null;');
content = content.replace('onSaveDraft={() => saveDraft("draft")}', 'onSave={() => saveDraft("draft")}');
content = content.replaceAll('theme.success || "#24A148"', 'BrandColors.success');
content = content.replaceAll('theme.success', 'BrandColors.success');
content = content.replaceAll('theme.error', 'BrandColors.error');

fs.writeFileSync(filePath, content);
console.log('Fixed visiting-card.tsx successfully!');
