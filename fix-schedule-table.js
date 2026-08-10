const fs = require('fs');
let content = fs.readFileSync('src/services/scheduleService.js', 'utf8');

// Fix table name from repayment_schedules to repayment_schedule
content = content.split('repayment_schedules').join('repayment_schedule');

fs.writeFileSync('src/services/scheduleService.js', content, 'utf8');
console.log('✅ Fixed table name!');
console.log('Still has old name:', content.includes('repayment_schedules'));