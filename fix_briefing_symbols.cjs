const fs = require('fs');

// 1. Update briefing.tsx
let briefingContent = fs.readFileSync('client/src/pages/briefing.tsx', 'utf-8');
briefingContent = briefingContent.replace(
  `  if (descText.includes("▣")) {
    const splitByBox = descText.split("▣");`,
  `  if (descText.includes("▣") || descText.includes("■")) {
    // support both ▣ and ■
    const splitByBox = descText.split(/[▣■]/);`
);

briefingContent = briefingContent.replace(
  `  for (const sessionRaw of sessionParts) {
    let title = "";
    let content = sessionRaw;

    const arrowIdx = sessionRaw.indexOf("▶");
    if (arrowIdx !== -1) {
      title = sessionRaw.substring(0, arrowIdx).trim();
      content = sessionRaw.substring(arrowIdx);
    }

    const fields: ParsedField[] = [];
    const rawFields = content.split("▶").map(f => f.trim()).filter(Boolean);`,
  `  for (const sessionRaw of sessionParts) {
    let title = "";
    let content = sessionRaw;

    // find first ▶ or [
    const arrowMatch = sessionRaw.match(/[▶\\[]/);
    if (arrowMatch) {
      const arrowIdx = arrowMatch.index;
      title = sessionRaw.substring(0, arrowIdx).trim();
      content = sessionRaw.substring(arrowIdx);
    } else {
      title = sessionRaw.trim();
      content = "";
    }

    const fields: ParsedField[] = [];
    // split by ▶ or [
    const rawFields = content.split(/[▶\\[]/).map(f => f.trim()).filter(Boolean);`
);

// fix the "]" if they use "[일시]"
briefingContent = briefingContent.replace(
  `    for (const rawField of rawFields) {
      let key = "";
      let val = "";

      const colonIdx = rawField.indexOf(":");`,
  `    for (const rawField of rawFields) {
      let key = "";
      let val = "";
      let cleanField = rawField;
      if (cleanField.startsWith("]")) cleanField = cleanField.substring(1).trim();
      const firstClose = cleanField.indexOf("]");
      if (firstClose !== -1 && firstClose < 10) {
        // e.g. "일시] 2026년..."
        key = cleanField.substring(0, firstClose).trim();
        val = cleanField.substring(firstClose + 1).replace(/^:/, '').trim();
      } else {
        const colonIdx = cleanField.indexOf(":");`
);

// Fallback logic for parsing in briefing.tsx
briefingContent = briefingContent.replace(
  `      } else {
        const colonIdx = cleanField.indexOf(":");
        const spaceIdx = cleanField.search(/\\s/);
        const circleIdx = cleanField.indexOf("○");
        const dashIdx = cleanField.indexOf("-");`,
  `      }
      
      if (!key) {
        const colonIdx = cleanField.indexOf(":");
        const spaceIdx = cleanField.search(/\\s/);
        const circleIdx = cleanField.indexOf("○");
        const dashIdx = cleanField.indexOf("-");`
);

// fix missing brace from else
briefingContent = briefingContent.replace(
  `        if (indices.length > 0) {
          splitIdx = Math.min(...indices);
        }
      }`,
  `        if (indices.length > 0) {
          splitIdx = Math.min(...indices);
        }
      }`
); // wait, let's just rewrite parseDescription entirely to be safe.

fs.writeFileSync('client/src/pages/briefing.tsx.bak', briefingContent);
