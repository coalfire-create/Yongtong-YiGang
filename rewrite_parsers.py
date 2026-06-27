import re

# ================================
# 1. Update briefing.tsx parser
# ================================
with open('client/src/pages/briefing.tsx', 'r') as f:
    b_content = f.read()

b_start_marker = "function parseDescription(descText: string): ParsedDescription {"
b_end_marker = "function FormattedDescription("

start_idx = b_content.find(b_start_marker)
end_idx = b_content.find(b_end_marker)

if start_idx != -1 and end_idx != -1:
    new_parser = """function parseDescription(descText: string): ParsedDescription {
  const result: ParsedDescription = { intro: "", sessions: [] };
  if (!descText) return result;

  let introPart = "";
  let sessionParts: string[] = [];

  // Support ▣, ■, or [세션]
  const sessionRegex = /(?:▣|■|(?=\\[세션(?:\s*\\d+)?\\]))/;
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
}

"""
    new_b_content = b_content[:start_idx] + new_parser + b_content[end_idx:]
    with open('client/src/pages/briefing.tsx', 'w') as f:
        f.write(new_b_content)
    print("briefing.tsx parser updated")
else:
    print("Could not find briefing parser")

