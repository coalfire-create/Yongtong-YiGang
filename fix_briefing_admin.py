import re

with open('client/src/pages/admin.tsx', 'r') as f:
    content = f.read()

# 1. Fix parseDescription
s_parse = """  const parseDescription = (desc: string) => {
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
    }

    for (let i = startIndex; i < sections.length; i++) {
      const section = sections[i];
      const lines = section.split('\\n').map(l => l.trim()).filter(Boolean);
      const title = lines[0] || "";
      
      let date = "", target = "", location = "", speaker = "", contentLines: string[] = [];
      let inContent = false;

      for (let j = 1; j < lines.length; j++) {
        const line = lines[j];
        if (line.startsWith('▶')) {
          inContent = false;
          if (line.includes('일시')) date = line.split(':')[1]?.trim() || "";
          else if (line.includes('대상')) target = line.split(':')[1]?.trim() || "";
          else if (line.includes('장소')) location = line.split(':')[1]?.trim() || "";
          else if (line.includes('연사')) speaker = line.split(':')[1]?.trim() || "";
          else if (line.includes('내용')) inContent = true;
        } else if (inContent || line.startsWith('-')) {
          inContent = true;
          contentLines.push(line.replace(/^-/, '').trim());
        }
      }
      sessions.push({ title, date, target, location, speaker, content: contentLines.join('\\n') });
    }

    if (sessions.length === 0) {
      sessions.push({ title: "", date: "", target: "", location: "", speaker: "", content: desc });
    }

    return { intro, sessions };
  };"""

n_parse = """  const parseDescription = (desc: string) => {
    if (!desc) return { intro: "", schedule: "", target: "", speaker: "", content: "", benefit: "", location: "" };

    const getSection = (marker: string, nextMarkers: string[]) => {
      if (!desc.includes(marker)) return "";
      let startIdx = desc.indexOf(marker) + marker.length;
      let endIdx = desc.length;
      for (const next of nextMarkers) {
        const idx = desc.indexOf(next, startIdx);
        if (idx !== -1 && idx < endIdx) endIdx = idx;
      }
      return desc.substring(startIdx, endIdx).trim();
    };

    const markers = ['[도입부]', '[일시]', '[대상]', '[연사]', '[주제]', '[혜택]', '[장소]'];

    return {
      intro: getSection('[도입부]', markers),
      schedule: getSection('[일시]', markers),
      target: getSection('[대상]', markers),
      speaker: getSection('[연사]', markers),
      content: getSection('[주제]', markers),
      benefit: getSection('[혜택]', markers),
      location: getSection('[장소]', markers)
    };
  };"""

content = content.replace(s_parse, n_parse)

# 2. Fix addMutation passing wrong arguments
s_add = """  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const description = stringifyDescription(data.intro, data.sessions);"""

n_add = """  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const description = stringifyDescription(data);"""

content = content.replace(s_add, n_add)

# 3. Fix saveEdit (which might also have wrong stringify)
s_update = """  const saveEdit = () => {
    if (editingId === null) return;
    const description = stringifyDescription(editIntro, editSessions);"""

n_update = """  const saveEdit = () => {
    if (editingId === null) return;
    const description = stringifyDescription(editForm);"""

content = content.replace(s_update, n_update)

# 4. Same issue in BriefingEventsTab
s_evt_parse = """  const parseDescription = (desc: string) => {
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
    }

    for (let i = startIndex; i < sections.length; i++) {
      const section = sections[i];
      const lines = section.split('\\n').map(l => l.trim()).filter(Boolean);
      const title = lines[0] || "";
      
      let date = "", target = "", location = "", speaker = "", contentLines: string[] = [];
      let inContent = false;

      for (let j = 1; j < lines.length; j++) {
        const line = lines[j];
        if (line.startsWith('▶')) {
          inContent = false;
          if (line.includes('일시')) date = line.split(':')[1]?.trim() || "";
          else if (line.includes('대상')) target = line.split(':')[1]?.trim() || "";
          else if (line.includes('장소')) location = line.split(':')[1]?.trim() || "";
          else if (line.includes('연사')) speaker = line.split(':')[1]?.trim() || "";
          else if (line.includes('내용')) inContent = true;
        } else if (inContent || line.startsWith('-')) {
          inContent = true;
          contentLines.push(line.replace(/^-/, '').trim());
        }
      }
      sessions.push({ title, date, target, location, speaker, content: contentLines.join('\\n') });
    }

    if (sessions.length === 0) {
      sessions.push({ title: "", date: "", target: "", location: "", speaker: "", content: desc });
    }

    return { intro, sessions };
  };"""

content = content.replace(s_evt_parse, n_parse) # Same logic since both tables share format now

# 5. Fix BriefingEventsTab addMutation and saveEdit
s_evt_add = """  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const description = stringifyDescription(data.intro, data.sessions);"""

content = content.replace(s_evt_add, n_add)

content = content.replace("const description = stringifyDescription(editIntro, editSessions);", "const description = stringifyDescription(editForm);")

with open('client/src/pages/admin.tsx', 'w') as f:
    f.write(content)

print("Fixed Briefing Admin bugs")
