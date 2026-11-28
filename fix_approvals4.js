const fs = require("fs");
const path = "loan-frontend/app/approvals/page.tsx";
let c = fs.readFileSync(path, "utf8");
c = c.replace(
  "const handleDisburse = async (id) => {",
  "const handleDisburse = async (id: number) => {"
);
c = c.replace(
  "const handleDisburse = async (l) => {",
  "const handleDisburse = async (id: number) => {"
);
fs.writeFileSync(path, c, "utf8");
console.log("Fixed");
process.exit(0);
