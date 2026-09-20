const fs = require('fs');
const filePath = 'loan-frontend/app/components/VoiceCommand.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Check if file ends properly
console.log('Last 100 chars:', JSON.stringify(content.slice(-100)));

// Add missing closing brace if needed
if (!content.trimEnd().endsWith('}')) {
  content = content.trimEnd() + '\n}\n';
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Added missing closing brace!');
} else {
  console.log('File ends correctly');
}