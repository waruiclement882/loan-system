const fs = require('fs');

const file = 'src/controllers/suspenseController.js';
let content = fs.readFileSync(file, 'utf8');

// Remove the duplicate - keep only one applySuspense call
const duplicate = `      const result = await suspenseService.applySuspense({
        customer_id, amount, use_case, loan_id, recorded_by, notes
      });
      
     const result = await suspenseService.applySuspense({
        customer_id, amount, use_case, loan_id, recorded_by, notes
      });`;

const single = `      const result = await suspenseService.applySuspense({
        customer_id, amount, use_case, loan_id, recorded_by, notes
      });`;

if (content.includes(duplicate)) {
  content = content.replace(duplicate, single);
  fs.writeFileSync(file, content, 'utf8');
  console.log('✅ Removed duplicate applySuspense call');
} else {
  // Try another approach - find all occurrences
  const occurrences = (content.match(/applySuspense/g) || []).length;
  console.log(`Found ${occurrences} occurrences of applySuspense`);
  
  if (occurrences === 2) {
    // Remove the second occurrence block
    const firstIndex = content.indexOf('const result = await suspenseService.applySuspense');
    const secondIndex = content.indexOf('const result = await suspenseService.applySuspense', firstIndex + 1);
    
    if (secondIndex !== -1) {
      const endIndex = content.indexOf('});', secondIndex) + 3;
      content = content.slice(0, secondIndex) + content.slice(endIndex);
      fs.writeFileSync(file, content, 'utf8');
      console.log('✅ Removed second duplicate block');
    }
  }
}

// Verify
console.log('\n=== APPLY METHOD AFTER FIX ===');
const lines = content.split('\n');
const start = lines.findIndex(l => l.includes('async apply'));
console.log(lines.slice(start, start + 20).join('\n'));
