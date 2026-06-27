const fs = require('fs');
const content = fs.readFileSync('client/src/pages/summer.tsx', 'utf-8');

const lines = content.split('\n');
const renderLines = lines.filter(l => l.includes('curriculumGuidelines') || l.includes('renderCurriculumGuidelines'));
console.log(renderLines.join('\n'));
