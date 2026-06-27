import re

with open('client/src/pages/briefing.tsx', 'r') as f:
    content = f.read()

# Replace parseDescription
old_parse = """function parseDescription(descText: string): ParsedDescription {
  const result: ParsedDescription = { intro: "", sessions: [] };
  if (!descText) return result;

  let introPart = "";
  let sessionParts: string[] = [];

  // Support ▣, ■, or [세션]
  const sessionRegex = /(?:▣|■|(?=\\[세션(?:\\s*\\d+)?\\]))/;
  const splitByBox = descText.split(sessionRegex).filter(s => s.trim() !== "");

  if (splitByBox.length > 0 && !/^\\s*(?:▣|■|\\[세션)/.test(descText)) {
    introPart = splitByBox[0].trim();
    sessionParts = splitByBox.slice(1);
  } else {
    sessionParts = splitByBox;
  }

  // If no sessions found but we see ▶ or [일시], it might be just one session without a title
  if (sessionParts.length === 0 && descText.match(/(?:▶|\\[(?:일시|장소|대상|연사|내용)\\])/)) {
    sessionParts = [descText];
    introPart = "";
  } else if (sessionParts.length === 0) {
    introPart = descText.trim();
  }

  result.intro = introPart;

  for (const sessionRaw of sessionParts) {
    let title = "";
    let content = sessionRaw;

    // Remove [세션 x] from title if it exists at the very beginning
    const sessionMatch = content.match(/^(\\[세션(?:\\s*\\d+)?\\])/);
    if (sessionMatch) {
      title = sessionMatch[1];
      content = content.substring(sessionMatch[1].length).trim();
    }

    // find first ▶ or [
    const arrowMatch = content.match(/(?:▶|\\[(?:일시|장소|대상|연사|내용)\\])/);
    if (arrowMatch) {
      const arrowIdx = arrowMatch.index;
      if (!title) {
        title = content.substring(0, arrowIdx).trim();
        // Remove leading ■ or ▣
        title = title.replace(/^[▣■]\\s*/, "");
      }
      content = content.substring(arrowIdx);
    } else {
      if (!title) {
        title = content.trim();
        title = title.replace(/^[▣■]\\s*/, "");
      }
      content = "";
    }

    const fields: ParsedField[] = [];
    // split by ▶ or [
    const rawFields = content.split(/(?:▶|(?=\\[(?:일시|장소|대상|연사|내용)\\]))/).map(f => f.trim()).filter(Boolean);

    for (const rawField of rawFields) {
      let key = "";
      let val = "";
      let cleanField = rawField;
      
      const bracketMatch = cleanField.match(/^\\[(.*?)\\]/);
      if (bracketMatch) {
        key = bracketMatch[1].trim();
        cleanField = cleanField.substring(bracketMatch[0].length).trim();
        val = cleanField.replace(/^:/, '').trim();
      } else {
        const colonIdx = cleanField.indexOf(":");
        const spaceIdx = cleanField.search(/\\s/);
        const circleIdx = cleanField.indexOf("○");
        const dashIdx = cleanField.indexOf("-");

        let splitIdx = -1;
        if (colonIdx !== -1) {
          splitIdx = colonIdx;
        } else {
          const indices = [spaceIdx, circleIdx, dashIdx].filter(idx => idx !== -1);
          if (indices.length > 0) {
            splitIdx = Math.min(...indices);
          }
        }

        if (splitIdx !== -1) {
          key = cleanField.substring(0, splitIdx).trim();
          val = cleanField.substring(splitIdx + 1).trim();
          if (cleanField[splitIdx] === "○" || cleanField[splitIdx] === "-") {
            val = cleanField[splitIdx] + " " + val;
          }
        } else {
          key = "내용";
          val = cleanField;
        }
      }

      if (key.includes("연사")) {
        const speakerList: ParsedSpeaker[] = [];
        const lines = val.split('\\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          let sName = line.trim();
          let sSubject = "";
          let sDesc = "";

          const sDashIdx = sName.indexOf("-");
          if (sDashIdx !== -1) {
            sDesc = sName.substring(sDashIdx + 1).trim();
            sName = sName.substring(0, sDashIdx).trim();
          }

          const parenMatch = sName.match(/\\((.*?)\\)/);
          if (parenMatch) {
            sSubject = parenMatch[1].trim();
            sName = sName.replace(parenMatch[0], "").trim();
          }
          speakerList.push({ name: sName, subject: sSubject, desc: sDesc });
        }
        fields.push({ key, value: val, speakers: speakerList });
      } else if (key.includes("내용")) {
        const bulletLines = val.split('\\n')
          .map(l => l.trim())
          .filter(l => l)
          .map(l => l.replace(/^[○\\-\\•\\*\\d\\.]+\\s*/, ''));
        fields.push({ key, value: val, bullets: bulletLines });
      } else {
        fields.push({ key, value: val });
      }
    }

    result.sessions.push({ title, fields });
  }

  return result;
}"""

new_parse = """function parseDescription(descText: string): ParsedDescription {
  const result: ParsedDescription = { intro: "", sessions: [] };
  if (!descText) return result;

  // New parser logic that handles [도입부], [일시], [대상], [연사], [주제], [혜택], [장소]
  // And still falls back gracefully for old format (▣ / ▶)
  
  if (!descText.includes('[') && !descText.includes('▣') && !descText.includes('▶')) {
    result.intro = descText;
    return result;
  }

  let currentCategory = "intro";
  let parsedFields: Record<string, string> = { intro: "", schedule: "", target: "", speaker: "", content: "", benefit: "", location: "" };
  let lines = descText.split('\\n');
  
  // If it uses the new bracket format
  if (descText.includes('[도입부]') || descText.includes('[일시]')) {
    for (const line of lines) {
      const match = line.match(/^\\[(.*?)\\](.*)$/);
      if (match) {
        const cat = match[1].trim();
        const inlineVal = match[2].trim();
        if (cat.includes("도입부")) currentCategory = "intro";
        else if (cat.includes("일시") || cat.includes("일정")) currentCategory = "schedule";
        else if (cat.includes("대상")) currentCategory = "target";
        else if (cat.includes("연사")) currentCategory = "speaker";
        else if (cat.includes("주제") || cat.includes("내용")) currentCategory = "content";
        else if (cat.includes("혜택")) currentCategory = "benefit";
        else if (cat.includes("장소") || cat.includes("위치")) currentCategory = "location";
        else currentCategory = "intro";
        
        if (inlineVal) {
          parsedFields[currentCategory] += (parsedFields[currentCategory] ? "\\n" : "") + inlineVal;
        }
      } else if (currentCategory && currentCategory in parsedFields) {
        parsedFields[currentCategory] += (parsedFields[currentCategory] ? "\\n" : "") + line;
      }
    }

    result.intro = parsedFields.intro.trim();
    const sessionFields: ParsedField[] = [];
    
    if (parsedFields.schedule) sessionFields.push({ key: "일시", value: parsedFields.schedule.trim() });
    if (parsedFields.target) sessionFields.push({ key: "대상", value: parsedFields.target.trim() });
    if (parsedFields.location) sessionFields.push({ key: "장소", value: parsedFields.location.trim() });
    
    if (parsedFields.speaker) {
      const speakerList: ParsedSpeaker[] = [];
      const sLines = parsedFields.speaker.trim().split('\\n');
      let currentSpeaker: ParsedSpeaker | null = null;
      for (const line of sLines) {
        if (!line.trim()) continue;
        if (!line.trim().startsWith('-') && !line.trim().startsWith('•') && !line.trim().startsWith('○')) {
          if (currentSpeaker) speakerList.push(currentSpeaker);
          let sName = line.replace(/^[\\_\\♧\\♣\\■\\▣\\▶\\s]+/, '').trim();
          let sSubject = "";
          const parenMatch = sName.match(/\\((.*?)\\)/);
          if (parenMatch) {
            sSubject = parenMatch[1].trim();
            sName = sName.replace(parenMatch[0], "").trim();
          }
          currentSpeaker = { name: sName, subject: sSubject, desc: "" };
        } else if (currentSpeaker) {
          currentSpeaker.desc += (currentSpeaker.desc ? "\\n" : "") + line.trim();
        }
      }
      if (currentSpeaker) speakerList.push(currentSpeaker);
      sessionFields.push({ key: "연사", value: parsedFields.speaker.trim(), speakers: speakerList });
    }

    if (parsedFields.content) {
      const bulletLines = parsedFields.content.trim().split('\\n')
        .map(l => l.trim())
        .filter(Boolean);
      sessionFields.push({ key: "주제 및 내용", value: parsedFields.content.trim(), bullets: bulletLines });
    }

    if (parsedFields.benefit) sessionFields.push({ key: "참석자 혜택", value: parsedFields.benefit.trim() });

    if (sessionFields.length > 0) {
      result.sessions.push({ title: "", fields: sessionFields });
    }
    return result;
  }

  // Fallback for old format (▣ / ▶)
  let introPart = "";
  let sessionParts = descText.split(/▣|■/).filter(s => s.trim() !== "");
  if (sessionParts.length > 0 && !/^\\s*(?:▣|■)/.test(descText) && !descText.startsWith('▶')) {
    introPart = sessionParts[0].trim();
    sessionParts = sessionParts.slice(1);
  }
  if (sessionParts.length === 0 && descText.includes('▶')) {
    sessionParts = [descText];
    introPart = "";
  }
  result.intro = introPart;

  for (const sessionRaw of sessionParts) {
    let title = "";
    let content = sessionRaw;
    const arrowIdx = content.indexOf("▶");
    if (arrowIdx !== -1) {
      title = content.substring(0, arrowIdx).trim();
      content = content.substring(arrowIdx);
    } else {
      title = content.trim();
      content = "";
    }

    const fields: ParsedField[] = [];
    const rawFields = content.split("▶").map(f => f.trim()).filter(Boolean);
    for (const rawField of rawFields) {
      const colonIdx = rawField.indexOf(":");
      let key = "내용";
      let val = rawField;
      if (colonIdx !== -1 && colonIdx < 20) {
        key = rawField.substring(0, colonIdx).trim();
        val = rawField.substring(colonIdx + 1).trim();
      }
      if (key.includes("연사")) {
        const speakerList: ParsedSpeaker[] = [];
        const lines = val.split('\\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          let sName = line.trim();
          let sSubject = "";
          let sDesc = "";
          const sDashIdx = sName.indexOf("-");
          if (sDashIdx !== -1) {
            sDesc = sName.substring(sDashIdx + 1).trim();
            sName = sName.substring(0, sDashIdx).trim();
          }
          const parenMatch = sName.match(/\\((.*?)\\)/);
          if (parenMatch) {
            sSubject = parenMatch[1].trim();
            sName = sName.replace(parenMatch[0], "").trim();
          }
          speakerList.push({ name: sName, subject: sSubject, desc: sDesc });
        }
        fields.push({ key, value: val, speakers: speakerList });
      } else if (key.includes("내용")) {
        const bulletLines = val.split('\\n').map(l => l.trim()).filter(Boolean).map(l => l.replace(/^[○\\-\\•\\*\\d\\.]+\\s*/, ''));
        fields.push({ key, value: val, bullets: bulletLines });
      } else {
        fields.push({ key, value: val });
      }
    }
    result.sessions.push({ title, fields });
  }

  return result;
}"""

content = content.replace(old_parse, new_parse)

old_render = """            {/* Render Contents (내용) */}
            {session.fields
              .filter(f => f.bullets)
              .map((field, fIdx) => (
                <div key={fIdx} className="space-y-3 bg-white border border-gray-150/70 rounded-2xl p-5 sm:p-6 shadow-sm">
                  <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    설명회 주요 핵심 내용
                  </h5>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pl-1 pt-1">
                    {field.bullets?.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-3 text-xs sm:text-sm text-gray-700 leading-relaxed font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7B2332] mt-2 flex-shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}"""

new_render = """            {/* Render Contents (주제 및 내용) */}
            {session.fields
              .filter(f => f.bullets)
              .map((field, fIdx) => (
                <div key={fIdx} className="space-y-3 bg-white border border-gray-150/70 rounded-2xl p-5 sm:p-6 shadow-sm">
                  <h5 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5 pl-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    설명회 주제 및 주요 내용
                  </h5>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 pl-1 pt-1">
                    {field.bullets?.map((bullet, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-3 text-xs sm:text-sm text-gray-700 leading-relaxed font-semibold whitespace-pre-line">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7B2332] mt-2 flex-shrink-0" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

            {/* Render Benefits (참석자 혜택) */}
            {session.fields
              .filter(f => f.key.includes("혜택"))
              .map((field, fIdx) => (
                <div key={`benefit-${fIdx}`} className="bg-red-50/50 border border-red-100 rounded-2xl p-5 sm:p-6 shadow-sm mt-4">
                  <h5 className="text-sm font-black text-[#7B2332] flex items-center gap-2 mb-2">
                    🎁 참석자 특별 혜택
                  </h5>
                  <p className="text-sm text-gray-800 font-extrabold">{field.value}</p>
                </div>
              ))}"""

content = content.replace(old_render, new_render)

# Make sure we don't duplicate render of "혜택" in the group metadata block
old_group = """            {/* Group metadata fields like "일정"/"일시", "대상", "장소" */}
            {session.fields.some(f => !f.speakers && !f.bullets) && (
              <div className="bg-white border border-gray-150/70 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
                {session.fields
                  .filter(f => !f.speakers && !f.bullets)
                  .map((field, fIdx) => {"""

new_group = """            {/* Group metadata fields like "일정"/"일시", "대상", "장소" */}
            {session.fields.some(f => !f.speakers && !f.bullets && !f.key.includes("혜택")) && (
              <div className="bg-white border border-gray-150/70 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
                {session.fields
                  .filter(f => !f.speakers && !f.bullets && !f.key.includes("혜택"))
                  .map((field, fIdx) => {"""

content = content.replace(old_group, new_group)

with open('client/src/pages/briefing.tsx', 'w') as f:
    f.write(content)
print("Updated briefing.tsx parser.")
