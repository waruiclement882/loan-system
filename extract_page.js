const fs = require("fs");
const target = "C:/Users/HP/OneDrive/Desktop/loan- system/loan-frontend/app/financial-statements/page.tsx";
const src = fs.readFileSync("C:/Users/HP/OneDrive/Desktop/loan- system/write_fin_page.js", "utf8");
const match = src.indexOf('const content = `');
const start = match + 17;
const end = src.lastIndexOf('`;');
const content = src.substring(start, end);
fs.writeFileSync(target, content, "utf8");
console.log("Written, length:", content.length);
