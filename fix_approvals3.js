const fs = require("fs");
const path = "loan-frontend/app/approvals/page.tsx";
let c = fs.readFileSync(path, "utf8");

// Find the broken section and replace it entirely
const broken = `const [res, res2] = await Promise.all([fetch(API + "/api/loans?status=pending", { headers: getHeaders() });
      const [data, data2] = await Promise.all([res.json(), res2.json()]);
      const pending = Array.isArray(data) ? data.map((l: any) => ({...l, _stage:"pending"})) : [];
      const approved = Array.isArray(data2) ? data2.map((l: any) => ({...l, _stage:"approved"})) : [];
      setLoans([...pending, ...approved]);`;

const fixed = `const [res, res2] = await Promise.all([
        fetch(API + "/api/loans?status=pending", { headers: getHeaders() }),
        fetch(API + "/api/loans?status=approved", { headers: getHeaders() }),
      ]);
      const [data, data2] = await Promise.all([res.json(), res2.json()]);
      const pending = Array.isArray(data) ? data.map((l: any) => ({...l, _stage:"pending"})) : [];
      const approved = Array.isArray(data2) ? data2.map((l: any) => ({...l, _stage:"approved"})) : [];
      setLoans([...pending, ...approved]);`;

if (c.includes(broken)) {
  c = c.replace(broken, fixed);
  console.log("Fixed successfully");
} else {
  console.log("Pattern not found - showing current loadLoans area:");
  const i = c.indexOf("loadLoans");
  console.log(c.substring(i, i+600));
}

fs.writeFileSync(path, c, "utf8");
process.exit(0);
