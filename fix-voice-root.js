const fs = require('fs');
const filePath = 'loan-frontend/app/components/VoiceCommand.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Make sure it has "use client" at top
if (!content.startsWith('"use client"')) {
  content = '"use client";\n' + content;
}

// Check ending
console.log('File length:', content.length);
console.log('Last 50 chars:', JSON.stringify(content.slice(-50)));

// Ensure proper ending
const trimmed = content.trimEnd();
const endings = ['}', '}\n'];
let hasProperEnd = endings.some(e => trimmed.endsWith(e));
console.log('Has proper ending:', hasProperEnd);

if (!hasProperEnd) {
  content = trimmed + '\n}\n';
  console.log('✅ Fixed ending!');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done! File length:', content.length);