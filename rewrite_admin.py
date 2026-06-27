import re

with open('client/src/pages/admin.tsx', 'r') as f:
    content = f.read()

# ================================
# Update BriefingsTab stringifier
# ================================
b_str_old = """  const stringifyDescription = (intro: string, sessions: any[]) => {
    const hasValidSession = sessions.some(s => s.title?.trim() || s.date?.trim() || s.target?.trim() || s.location?.trim() || s.speaker?.trim() || s.content?.trim());
    if (!hasValidSession) return intro.trim();

    let res = "";
    if (intro?.trim()) res += `▣ ${intro.trim()}\\n`;
    sessions.forEach(s => {
      if (s.title?.trim() || s.date?.trim() || s.target?.trim() || s.location?.trim() || s.speaker?.trim() || s.content?.trim()) {
        res += `▣ ${s.title?.trim() || "세션"}\\n`;
        if (s.date?.trim()) res += `▶일시 : ${s.date.trim()}\\n`;
        if (s.target?.trim()) res += `▶대상 : ${s.target.trim()}\\n`;
        if (s.location?.trim()) res += `▶장소 : ${s.location.trim()}\\n`;
        if (s.speaker?.trim()) res += `▶연사 : ${s.speaker.trim()}\\n`;
        if (s.content?.trim()) {
          res += `▶내용 :\\n`;
          s.content.split('\\n').forEach((line: string) => {
            if (line.trim()) res += `- ${line.trim().replace(/^-/, '').trim()}\\n`;
          });
        }
      }
    });
    return res.trim();
  };"""

b_str_new = """  const stringifyDescription = (intro: string, sessions: any[]) => {
    const hasValidSession = sessions.some(s => s.title?.trim() || s.date?.trim() || s.target?.trim() || s.location?.trim() || s.speaker?.trim() || s.content?.trim());
    if (!hasValidSession) return intro.trim();

    let res = "";
    if (intro?.trim()) res += `[도입부]\\n${intro.trim()}\\n\\n`;
    sessions.forEach((s, idx) => {
      if (s.title?.trim() || s.date?.trim() || s.target?.trim() || s.location?.trim() || s.speaker?.trim() || s.content?.trim()) {
        res += `[세션]\\n${s.title?.trim() || "세션 " + (idx + 1)}\\n`;
        if (s.date?.trim()) res += `[일시]\\n${s.date.trim()}\\n`;
        if (s.target?.trim()) res += `[대상]\\n${s.target.trim()}\\n`;
        if (s.location?.trim()) res += `[장소]\\n${s.location.trim()}\\n`;
        if (s.speaker?.trim()) res += `[연사]\\n${s.speaker.trim()}\\n`;
        if (s.content?.trim()) {
          res += `[내용]\\n`;
          s.content.split('\\n').forEach((line: string) => {
            if (line.trim()) res += `${line.trim()}\\n`;
          });
        }
        res += "\\n";
      }
    });
    return res.trim();
  };"""

content = content.replace(b_str_old, b_str_new)

b_parse_old = """  const parseDescription = (desc: string) => {
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
      let title = "";
      let sContent = sections[i];

      const arrowIdx = sections[i].indexOf('▶');
      if (arrowIdx !== -1) {
        title = sections[i].substring(0, arrowIdx).trim();
        sContent = sections[i].substring(arrowIdx);
      } else {
        title = sections[i].trim();
        sContent = "";
      }

      const sessionObj = { title, date: "", target: "", location: "", speaker: "", content: "" };
      const rawFields = sContent.split('▶').map(f => f.trim()).filter(Boolean);

      for (const field of rawFields) {
        const colonIdx = field.indexOf(':');
        if (colonIdx !== -1) {
          const key = field.substring(0, colonIdx).trim();
          const val = field.substring(colonIdx + 1).trim();
          if (key.includes("일시")) sessionObj.date = val;
          else if (key.includes("대상")) sessionObj.target = val;
          else if (key.includes("장소")) sessionObj.location = val;
          else if (key.includes("연사")) sessionObj.speaker = val;
          else if (key.includes("내용")) sessionObj.content = val;
        } else {
          sessionObj.content += (sessionObj.content ? '\\n' : '') + field;
        }
      }
      sessions.push(sessionObj);
    }

    if (sessions.length === 0) {
      sessions.push({ title: "", date: "", target: "", location: "", speaker: "", content: "" });
    }
    return { intro, sessions };
  };"""

b_parse_new = """  const parseDescription = (desc: string) => {
    let intro = "";
    let sessions: any[] = [];
    if (!desc) return { intro, sessions: [{ title: "", date: "", target: "", location: "", speaker: "", content: "" }] };

    if (!desc.includes('▣') && !desc.includes('▶') && !desc.includes('[세션]')) {
      return { intro: desc, sessions: [{ title: "", date: "", target: "", location: "", speaker: "", content: "" }] };
    }

    // Support both old format (▣ / ▶) and new format ([세션] / [일시])
    const lines = desc.split('\\n');
    let currentBlock = "";
    let currentKey = "";
    let currentSession = null;
    let isIntro = true;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      if (line.startsWith('▣') && !line.includes('▶')) {
        // Old title
        if (currentSession) sessions.push(currentSession);
        currentSession = { title: line.replace('▣', '').trim(), date: "", target: "", location: "", speaker: "", content: "" };
        isIntro = false;
      } else if (line.startsWith('[도입부]')) {
        isIntro = true;
      } else if (line.startsWith('[세션]')) {
        if (currentSession) sessions.push(currentSession);
        currentSession = { title: "", date: "", target: "", location: "", speaker: "", content: "" };
        isIntro = false;
        currentKey = "title";
      } else if (line.startsWith('▶') || line.match(/^\\[(일시|장소|대상|연사|내용)\\]/)) {
        isIntro = false;
        if (!currentSession) currentSession = { title: "", date: "", target: "", location: "", speaker: "", content: "" };
        let key = "";
        let val = "";
        if (line.startsWith('▶')) {
          const colonIdx = line.indexOf(':');
          if (colonIdx !== -1) {
            key = line.substring(1, colonIdx).trim();
            val = line.substring(colonIdx + 1).trim();
          } else {
            key = "내용";
            val = line.substring(1).trim();
          }
        } else {
          const match = line.match(/^\\[(.*?)\\](.*)/);
          if (match) {
            key = match[1].trim();
            val = match[2].trim();
          }
        }
        
        if (key.includes('일시')) { currentKey = 'date'; currentSession.date = val; }
        else if (key.includes('대상')) { currentKey = 'target'; currentSession.target = val; }
        else if (key.includes('장소')) { currentKey = 'location'; currentSession.location = val; }
        else if (key.includes('연사')) { currentKey = 'speaker'; currentSession.speaker = val; }
        else if (key.includes('내용')) { currentKey = 'content'; currentSession.content = val; }
      } else {
        if (isIntro) {
          intro += (intro ? '\\n' : '') + line;
        } else if (currentSession) {
          if (currentKey) {
            currentSession[currentKey] += (currentSession[currentKey] ? '\\n' : '') + line;
          } else if (!currentSession.title) {
            currentSession.title = line;
          }
        }
      }
    }
    
    if (currentSession) sessions.push(currentSession);

    if (sessions.length === 0) {
      sessions.push({ title: "", date: "", target: "", location: "", speaker: "", content: "" });
    }
    return { intro, sessions };
  };"""

content = content.replace(b_parse_old, b_parse_new)

# ================================
# Update SummerGuidelinesManager parsing/stringifying for `linked` field
# ================================
s_parse_old = """  const parseContent = (contentStr: string) => {
    const res = { schedule: "", features: "", materials: "", tasks: "", management: "", sessions: "" };
    if (!contentStr) return res;
    
    let currentCategory = "";
    let lines = contentStr.split('\\n');
    for (const line of lines) {
      const match = line.match(/^\\[(.*?)\\]$/);
      if (match) {
        const cat = match[1].trim();
        if (cat.includes("수업")) currentCategory = "schedule";
        else if (cat.includes("특징")) currentCategory = "features";
        else if (cat.includes("교재")) currentCategory = "materials";
        else if (cat.includes("과제")) currentCategory = "tasks";
        else if (cat.includes("관리") || cat.includes("CLINIC")) currentCategory = "management";
        else if (cat.includes("회차")) currentCategory = "sessions";
        else currentCategory = "";
      } else if (currentCategory && currentCategory in res) {
        (res as any)[currentCategory] += (res as any)[currentCategory] ? "\\n" + line : line;
      }
    }
    return res;
  };"""

s_parse_new = """  const parseContent = (contentStr: string) => {
    const res = { schedule: "", features: "", materials: "", tasks: "", management: "", sessions: "", linked: "" };
    if (!contentStr) return res;
    
    let currentCategory = "";
    let lines = contentStr.split('\\n');
    for (const line of lines) {
      const match = line.match(/^\\[(.*?)\\]$/);
      if (match) {
        const cat = match[1].trim();
        if (cat.includes("수업")) currentCategory = "schedule";
        else if (cat.includes("특징")) currentCategory = "features";
        else if (cat.includes("교재")) currentCategory = "materials";
        else if (cat.includes("과제")) currentCategory = "tasks";
        else if (cat.includes("관리") || cat.includes("CLINIC")) currentCategory = "management";
        else if (cat.includes("회차")) currentCategory = "sessions";
        else if (cat.includes("연계")) currentCategory = "linked";
        else currentCategory = "";
      } else if (currentCategory && currentCategory in res) {
        (res as any)[currentCategory] += (res as any)[currentCategory] ? "\\n" + line : line;
      }
    }
    return res;
  };"""

content = content.replace(s_parse_old, s_parse_new)

s_str_old = """  const stringifyContent = (data: any) => {
    let res = "";
    if (data.schedule?.trim()) res += `[수업 일정]\\n${data.schedule.trim()}\\n\\n`;
    if (data.features?.trim()) res += `[강좌 특징]\\n${data.features.trim()}\\n\\n`;
    if (data.materials?.trim()) res += `[교재/제공자료]\\n${data.materials.trim()}\\n\\n`;
    if (data.tasks?.trim()) res += `[과제/TEST]\\n${data.tasks.trim()}\\n\\n`;
    if (data.management?.trim()) res += `[관리 SYSTEM 및 CLINIC]\\n${data.management.trim()}\\n\\n`;
    if (data.sessions?.trim()) res += `[회차별 내용]\\n${data.sessions.trim()}\\n`;
    return res.trim();
  };"""

s_str_new = """  const stringifyContent = (data: any) => {
    let res = "";
    if (data.schedule?.trim()) res += `[수업 일정]\\n${data.schedule.trim()}\\n\\n`;
    if (data.features?.trim()) res += `[강좌 특징]\\n${data.features.trim()}\\n\\n`;
    if (data.materials?.trim()) res += `[교재/제공자료]\\n${data.materials.trim()}\\n\\n`;
    if (data.tasks?.trim()) res += `[과제/TEST]\\n${data.tasks.trim()}\\n\\n`;
    if (data.management?.trim()) res += `[관리 SYSTEM 및 CLINIC]\\n${data.management.trim()}\\n\\n`;
    if (data.sessions?.trim()) res += `[회차별 내용]\\n${data.sessions.trim()}\\n\\n`;
    if (data.linked?.trim()) res += `[연계 강좌]\\n${data.linked.trim()}\\n`;
    return res.trim();
  };"""

content = content.replace(s_str_old, s_str_new)

# Add `linked: ""` to defaultValues
content = content.replace("management: \"\",\n      sessions: \"\"\n    }", "management: \"\",\n      sessions: \"\",\n      linked: \"\"\n    }")

# Add linked UI to Add Form
s_add_ui_old = """            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">회차별 내용</label>
              <textarea {...register("sessions")} rows={5} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="1회차 - 다항식연산\\n2회차 - 항등식" />
            </div>"""

s_add_ui_new = """            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">회차별 내용</label>
              <textarea {...register("sessions")} rows={5} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="1회차 - 다항식연산\\n2회차 - 항등식" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">연계 강좌</label>
              <textarea {...register("linked")} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="연계되는 후속 강좌명" />
            </div>"""

content = content.replace(s_add_ui_old, s_add_ui_new)

# Add linked UI to Edit Form
s_edit_ui_old = """                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">회차별 내용</label>
                    <textarea value={editForm.sessions} onChange={e => setEditForm({...editForm, sessions: e.target.value})} rows={5} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>"""

s_edit_ui_new = """                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">회차별 내용</label>
                    <textarea value={editForm.sessions} onChange={e => setEditForm({...editForm, sessions: e.target.value})} rows={5} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">연계 강좌</label>
                    <textarea value={editForm.linked} onChange={e => setEditForm({...editForm, linked: e.target.value})} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>"""

content = content.replace(s_edit_ui_old, s_edit_ui_new)

# Add linked UI to preview
s_prev_old = """                          {parsed.features && <p className="text-gray-600"><span className="font-semibold text-gray-800">특징:</span> {parsed.features.substring(0, 50)}...</p>}
                          {parsed.sessions && <p className="text-gray-600"><span className="font-semibold text-gray-800">회차:</span> 포함됨</p>}"""

s_prev_new = """                          {parsed.features && <p className="text-gray-600"><span className="font-semibold text-gray-800">특징:</span> {parsed.features.substring(0, 50)}...</p>}
                          {parsed.sessions && <p className="text-gray-600"><span className="font-semibold text-gray-800">회차:</span> 포함됨</p>}
                          {parsed.linked && <p className="text-gray-600"><span className="font-semibold text-gray-800">연계:</span> {parsed.linked}</p>}"""

content = content.replace(s_prev_old, s_prev_new)

with open('client/src/pages/admin.tsx', 'w') as f:
    f.write(content)
print("Updated admin.tsx successfully.")

