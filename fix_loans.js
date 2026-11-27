const fs = require("fs");

const content = fs.readFileSync("loan-frontend/app/loans/page.tsx", "utf8");

// Fix broken emoji icons with SVG
const fixed = content
  .replace('icon:"??"', 'icon:\'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>\'')
  .replace('icon:"?"', 'icon:\'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E67E22" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>\'')
  .replace('icon:"?"', 'icon:\'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>\'')
  .replace('icon:"?"', 'icon:\'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>\'');

// Fix KPI icon rendering - change from text to dangerouslySetInnerHTML
const fixed2 = fixed
  .replace(/<span className="text-xl">\{k\.icon\}<\/span>/g, '<span dangerouslySetInnerHTML={{ __html: k.icon }} />')
  .replace('{k.icon}', '<span dangerouslySetInnerHTML={{ __html: k.icon }} />');

fs.writeFileSync("loan-frontend/app/loans/page.tsx", fixed2, "utf8");
console.log("Fixed, length:", fixed2.length);
process.exit(0);
