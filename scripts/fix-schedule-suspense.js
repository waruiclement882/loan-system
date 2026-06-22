const fs = require('fs');

let content = fs.readFileSync('loan-frontend/app/schedule/page.tsx', 'utf8');

// Wrap the component with Suspense
content = content.replace(
  '"use client";\nimport { useEffect, useState } from "react";\nimport { useRouter, useSearchParams } from "next/navigation";',
  '"use client";\nimport { useEffect, useState, Suspense } from "react";\nimport { useRouter, useSearchParams } from "next/navigation";'
);

content = content.replace(
  'export default function SchedulePage()',
  'function ScheduleContent()'
);

// Add the wrapper at the end
content = content.replace(
  /^(.*)}(\s*)$/s,
  (match) => {
    // Find the last closing brace and add wrapper
    const lastBrace = match.lastIndexOf('}');
    return match.substring(0, lastBrace) + '}\n\nexport default function SchedulePage() {\n  return (\n    <Suspense fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center"><p className="text-gray-400">Loading...</p></div>}>\n      <ScheduleContent />\n    </Suspense>\n  );\n}\n';
  }
);

fs.writeFileSync('loan-frontend/app/schedule/page.tsx', content, 'utf8');
console.log('Schedule page fixed!');
