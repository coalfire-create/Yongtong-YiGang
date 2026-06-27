const fs = require('fs');
let content = fs.readFileSync('client/src/pages/admin.tsx', 'utf-8');

const oldStringify = `  const stringifyDescription = (intro: string, sessions: any[]) => {
    let res = "";
    if (intro?.trim()) res += \`▣ \${intro.trim()}\\n\`;
    sessions.forEach(s => {
      if (s.title?.trim() || s.date?.trim() || s.content?.trim()) {
        res += \`▣ \${s.title?.trim() || "세션"}\\n\`;
        if (s.date?.trim()) res += \`▶일시 : \${s.date.trim()}\\n\`;
        if (s.target?.trim()) res += \`▶대상 : \${s.target.trim()}\\n\`;
        if (s.location?.trim()) res += \`▶장소 : \${s.location.trim()}\\n\`;
        if (s.speaker?.trim()) res += \`▶연사 : \${s.speaker.trim()}\\n\`;
        if (s.content?.trim()) {
          res += \`▶내용 :\\n\`;
          s.content.split('\\n').forEach((line: string) => {
            if (line.trim()) res += \`- \${line.trim().replace(/^-/, '').trim()}\\n\`;
          });
        }
      }
    });
    return res.trim();
  };`;

const newStringify = `  const stringifyDescription = (intro: string, sessions: any[]) => {
    const hasValidSession = sessions.some(s => s.title?.trim() || s.date?.trim() || s.target?.trim() || s.location?.trim() || s.speaker?.trim() || s.content?.trim());
    if (!hasValidSession) return intro.trim();

    let res = "";
    if (intro?.trim()) res += \`▣ \${intro.trim()}\\n\`;
    sessions.forEach(s => {
      if (s.title?.trim() || s.date?.trim() || s.target?.trim() || s.location?.trim() || s.speaker?.trim() || s.content?.trim()) {
        res += \`▣ \${s.title?.trim() || "세션"}\\n\`;
        if (s.date?.trim()) res += \`▶일시 : \${s.date.trim()}\\n\`;
        if (s.target?.trim()) res += \`▶대상 : \${s.target.trim()}\\n\`;
        if (s.location?.trim()) res += \`▶장소 : \${s.location.trim()}\\n\`;
        if (s.speaker?.trim()) res += \`▶연사 : \${s.speaker.trim()}\\n\`;
        if (s.content?.trim()) {
          res += \`▶내용 :\\n\`;
          s.content.split('\\n').forEach((line: string) => {
            if (line.trim()) res += \`- \${line.trim().replace(/^-/, '').trim()}\\n\`;
          });
        }
      }
    });
    return res.trim();
  };`;

const oldParse = `  const parseDescription = (desc: string) => {
    let intro = "";
    let sessions: any[] = [];
    if (!desc) return { intro, sessions: [{ title: "", date: "", target: "", location: "", speaker: "", content: "" }] };

    const sections = desc.split('▣').map(s => s.trim()).filter(Boolean);
    let startIndex = 0;
    if (sections.length > 0 && !sections[0].includes('▶')) {
      intro = sections[0];
      startIndex = 1;
    }`;

const newParse = `  const parseDescription = (desc: string) => {
    let intro = "";
    let sessions: any[] = [];
    if (!desc) return { intro, sessions: [{ title: "", date: "", target: "", location: "", speaker: "", content: "" }] };

    if (!desc.includes('▣') && !desc.includes('▶')) {
      return { intro: desc, sessions: [{ title: "", date: "", target: "", location: "", speaker: "", content: "" }] };
    }

    const sections = desc.split('▣').map(s => s.trim()).filter(Boolean);
    let startIndex = 0;
    if (sections.length > 0 && !sections[0].includes('▶')) {
      intro = sections[0];
      startIndex = 1;
    }`;

if (content.includes(oldStringify)) {
  content = content.replace(oldStringify, newStringify);
} else {
  console.log("oldStringify not found");
}

if (content.includes(oldParse)) {
  content = content.replace(oldParse, newParse);
} else {
  console.log("oldParse not found");
}

fs.writeFileSync('client/src/pages/admin.tsx', content);
