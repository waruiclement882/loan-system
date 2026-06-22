const fs = require('fs');

const file = 'loan-frontend/app/par/page.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Find and fix the broken lines
const newLines = [];
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  
  // Detect the broken pattern: onClick={() => { <button ...
  if (line.includes('onClick={() => { <button') && line.includes('router.push("/par")')) {
    // Replace entire broken block with clean buttons
    const indent = '          ';
    newLines.push(`${indent}<button onClick={() => router.push("/par")} className="text-gray-600 hover:text-blue-600">PAR</button>`);
    // Skip next line (statement button is duplicated after)
    i++;
    // Add the statement line as-is
    if (i < lines.length && lines[i].includes('router.push("/statement")')) {
      newLines.push(lines[i]);
      i++;
    }
    // Skip the broken logout line
    if (i < lines.length && lines[i].includes('localStorage.clear()') && !lines[i].includes('<button')) {
      newLines.push(`${indent}<button onClick={() => { localStorage.clear(); router.push("/login"); }} className="text-red-400 hover:text-red-600">Logout</button>`);
      i++;
    }
    continue;
  }
  
  newLines.push(line);
  i++;
}

fs.writeFileSync(file, newLines.join('\n'));
console.log('Done! Lines around fix:');
newLines.slice(111, 120).forEach((l, idx) => console.log(112 + idx, l));
