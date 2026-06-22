const fs = require('fs');

const pages = [
  'loan-frontend/app/settings/page.tsx',
  'loan-frontend/app/users/page.tsx',
  'loan-frontend/app/reports/page.tsx',
  'loan-frontend/app/audit/page.tsx',
  'loan-frontend/app/customers/page.tsx',
  'loan-frontend/app/loans/page.tsx',
  'loan-frontend/app/par/page.tsx',
  'loan-frontend/app/schedule/page.tsx',
  'loan-frontend/app/payments/page.tsx',
  'loan-frontend/app/approvals/page.tsx',
  'loan-frontend/app/statement/page.tsx',
  'loan-frontend/app/export/page.tsx',
  'loan-frontend/app/matching/page.tsx',
  'loan-frontend/app/collection/page.tsx',
];

let fixed = 0;

pages.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Fix pattern: button onClick inserted INSIDE another button's onClick
  // Pattern: { <button onClick=... /> <button onClick=... /> localStorage...
  const badPattern1 = /\{ <button onClick=\(\) => router\.push\("\/par"\)[^}]+<\/button>\n\s+<button onClick=\(\) => router\.push\("\/statement"\)[^}]+<\/button>\n\s+localStorage/g;
  if (badPattern1.test(content)) {
    content = content.replace(
      /(\{ )<button onClick=\(\) => router\.push\("\/par"\)[^}]+<\/button>\n\s+<button onClick=\(\) => router\.push\("\/statement"\)[^}]+<\/button>\n(\s+)(localStorage)/g,
      '$1$3'
    );
    changed = true;
  }

  // Fix pattern: <button <button ...  (button inside button opening tag)
  const badPattern2 = /<button (<button onClick=\(\) => router\.push\("\/par"\)[^/]+\/>?\s*<button[^>]+>[^<]*<\/button>\s*)\s*onClick=/g;
  if (badPattern2.test(content)) {
    content = content.replace(badPattern2, '<button onClick=');
    changed = true;
  }

  // Remove all malformed PAR/Statement insertions first
  // Then we'll re-add them correctly
  content = content
    // Remove broken: { <button ...par... <button ...statement... localStorage
    .replace(/\{ <button onClick=\(\) => router\.push\("\/par"\) className="[^"]+">📅 PAR<\/button>\n\s*<button onClick=\(\) => router\.push\("\/statement"\) className="[^"]+">Statement<\/button>\n\s*/g, '{ ')
    // Remove broken: <button <button ...par...
    .replace(/<button (<button onClick=\(\) => router\.push\("\/par"\)[^\n]+\n[^\n]+\n\s*)/g, '<button ')
    // Remove any stray PAR/Statement buttons that are malformed
    .replace(/<button onClick=\(\) => router\.push\("\/par"\) className="[^"]+">📅 PAR<\/button>\n\s*<button onClick=\(\) => router\.push\("\/statement"\) className="[^"]+">Statement<\/button>\n\s*/g, '');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`🧹 Cleaned: ${filePath}`);
  fixed++;
});

console.log(`\n✅ Cleaned ${fixed} files`);
console.log('\nNow verify by checking one file:');
const sample = fs.readFileSync('loan-frontend/app/loans/page.tsx', 'utf8');
const haspar = sample.includes('router.push("/par")');
console.log(`loans/page.tsx has PAR: ${haspar}`);
