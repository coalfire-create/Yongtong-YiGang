const fs = require('fs');
const content = fs.readFileSync('client/src/pages/summer.tsx', 'utf-8');

const match = content.match(/const getSubject = \(title: string\) => \{[^}]+\};/);
if (match) {
  console.log(match[0]);
} else {
  // Let's just grep for it
  console.log("Not found by regex");
}
