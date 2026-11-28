const fs = require("fs");
const path = "loan-frontend/app/approvals/page.tsx";
let c = fs.readFileSync(path, "utf8");

// Find and fix the broken fetch block
c = c.replace(
  `const [res, res2] = await Promise.all([
        fetch(API + "/api/loans?status=pending", { headers: getHeaders() });
        fetch(API + "/api/loans?status=approved", { headers: getHeaders() }),
      ]);`,
  `const [res, res2] = await Promise.all([
        fetch(API + "/api/loans?status=pending", { headers: getHeaders() }),
        fetch(API + "/api/loans?status=approved", { headers: getHeaders() }),
      ]);`
);

fs.writeFileSync(path, c, "utf8");
console.log("Fixed, length:", c.length);

// Verify no syntax issue
const check = fs.readFileSync(path, "utf8");
const idx = check.indexOf("Promise.all");
console.log("Context:", check.substring(idx, idx+300));
process.exit(0);
