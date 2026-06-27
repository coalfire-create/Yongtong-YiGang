import re

with open('client/src/pages/admin.tsx', 'r') as f:
    content = f.read()

# Replace parseDescription
old_parse = """  const parseDescription = (desc: string) => {
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

new_parse = """  const parseDescription = (desc: string) => {
    const res = { intro: "", schedule: "", target: "", speaker: "", content: "", benefit: "", location: "" };
    if (!desc) return res;

    let currentCategory = "intro";
    let lines = desc.split('\\n');
    for (const line of lines) {
      const match = line.match(/^\\[(.*?)\\](.*)$/);
      if (match) {
        const cat = match[1].trim();
        const inlineVal = match[2].trim();
        if (cat.includes("도입부")) currentCategory = "intro";
        else if (cat.includes("일시")) currentCategory = "schedule";
        else if (cat.includes("대상")) currentCategory = "target";
        else if (cat.includes("연사")) currentCategory = "speaker";
        else if (cat.includes("주제") || cat.includes("내용")) currentCategory = "content";
        else if (cat.includes("혜택")) currentCategory = "benefit";
        else if (cat.includes("장소")) currentCategory = "location";
        else currentCategory = "intro";
        
        if (inlineVal) {
          (res as any)[currentCategory] += inlineVal;
        }
      } else if (currentCategory && currentCategory in res) {
        (res as any)[currentCategory] += (res as any)[currentCategory] ? "\\n" + line : line;
      }
    }
    return res;
  };"""

content = content.replace(old_parse, new_parse)

old_stringify = """  const stringifyDescription = (intro: string, sessions: any[]) => {
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

new_stringify = """  const stringifyDescription = (data: any) => {
    let res = "";
    if (data.intro?.trim()) res += `[도입부]\\n${data.intro.trim()}\\n\\n`;
    if (data.schedule?.trim()) res += `[일시]\\n${data.schedule.trim()}\\n\\n`;
    if (data.target?.trim()) res += `[대상]\\n${data.target.trim()}\\n\\n`;
    if (data.speaker?.trim()) res += `[연사]\\n${data.speaker.trim()}\\n\\n`;
    if (data.content?.trim()) res += `[주제]\\n${data.content.trim()}\\n\\n`;
    if (data.benefit?.trim()) res += `[혜택]\\n${data.benefit.trim()}\\n\\n`;
    if (data.location?.trim()) res += `[장소]\\n${data.location.trim()}\\n`;
    return res.trim();
  };"""

content = content.replace(old_stringify, new_stringify)

old_form_def = """  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      title: "",
      date: "",
      time: "",
      form_url: "",
      intro: "",
      sessions: [{ title: "", date: "", target: "", location: "", speaker: "", content: "" }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "sessions"
  });"""

new_form_def = """  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      title: "",
      date: "",
      time: "",
      form_url: "",
      intro: "",
      schedule: "",
      target: "",
      speaker: "",
      content: "",
      benefit: "",
      location: ""
    }
  });"""

content = content.replace(old_form_def, new_form_def)

# Replace onSubmit to remove 'sessions' argument from stringifyDescription
content = content.replace("const content = stringifyDescription(data.intro, data.sessions);", "const content = stringifyDescription(data);")
content = content.replace("const content = stringifyDescription(editForm.intro, editForm.sessions);", "const content = stringifyDescription(editForm);")

old_start_edit = """  const startEdit = (b: BriefingItem) => {
    setEditingId(b.id);
    const parsed = parseDescription(b.description || "");
    setEditForm({ ...b, intro: parsed.intro, sessions: parsed.sessions });
  };"""

new_start_edit = """  const startEdit = (b: BriefingItem) => {
    setEditingId(b.id);
    const parsed = parseDescription(b.description || "");
    setEditForm({ ...b, ...parsed });
  };"""

content = content.replace(old_start_edit, new_start_edit)


# Update Add Form UI
old_add_ui = """          <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg space-y-4">
            <h5 className="font-bold text-sm text-gray-800 border-b pb-2">설명회 상세 내용</h5>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">설명회 도입부 (선택)</label>
              <textarea {...register("intro")} rows={3} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="도입부 내용을 입력하세요." />
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="bg-white p-4 border border-gray-200 rounded-lg relative space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h6 className="font-bold text-xs text-gray-800">세션 {index + 1}</h6>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="text-red-600 text-xs font-bold hover:underline">삭제</button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">세션 제목</label>
                    <input {...register(`sessions.${index}.title`)} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="예: 1부" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">일시</label>
                    <input {...register(`sessions.${index}.date`)} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="예: 2월 28일 (목) 19:30" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">대상</label>
                    <input {...register(`sessions.${index}.target`)} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="예: 영통고 1학년" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">장소</label>
                    <input {...register(`sessions.${index}.location`)} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="예: 영통이강학원" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">연사</label>
                    <input {...register(`sessions.${index}.speaker`)} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="예: 수학 정승준 ○ 국어 홍길동" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">상세 내용 (줄바꿈 가능)</label>
                    <textarea {...register(`sessions.${index}.content`)} rows={4} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="세션 세부 내용을 작성해주세요." />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => append({ title: "", date: "", target: "", location: "", speaker: "", content: "" })} className="w-full py-2 border border-dashed border-gray-400 text-gray-600 text-sm font-bold rounded hover:bg-gray-100 transition-colors">
              + 세션 추가
            </button>
          </div>"""

new_add_ui = """          <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 border-b pb-2 mb-2">
              <h5 className="font-bold text-sm text-gray-800">설명회 상세 내용 (입력한 항목만 표시됩니다)</h5>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">도입부 (인사말 등)</label>
              <textarea {...register("intro")} rows={4} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="인사말 및 설명회 취지 등을 입력하세요." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">설명회 일시</label>
              <input {...register("schedule")} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="예: 7/2(목) 오후 7시" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">대상</label>
              <input {...register("target")} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="예: 초등 4학년 ~ 중학교 2학년" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">연사 소개 (줄바꿈 가능)</label>
              <textarea {...register("speaker")} rows={3} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="김학수 소장님\\n- 입시연구소 길 대표..." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">주제 및 주요 내용</label>
              <textarea {...register("content")} rows={4} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="주제 및 안내 내용을 자유롭게 작성해주세요." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">참석자 혜택</label>
              <input {...register("benefit")} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="예: 모티브과정 1개월 30% 할인" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">설명회 장소 (주차 정보 등)</label>
              <textarea {...register("location")} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="예: 영통이강학원 1층 고등관 (90분 무료주차 지원)" />
            </div>
          </div>"""

content = content.replace(old_add_ui, new_add_ui)

# Update Edit Form UI
old_edit_ui = """                <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">도입부</label>
                    <textarea value={editForm.intro || ""} onChange={e => setEditForm({...editForm, intro: e.target.value})} rows={3} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  {editForm.sessions?.map((session: any, index: number) => (
                    <div key={index} className="bg-white p-4 border border-gray-200 rounded-lg relative space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <h6 className="font-bold text-xs text-gray-800">세션 {index + 1}</h6>
                        {editForm.sessions.length > 1 && (
                          <button type="button" onClick={() => {
                            const newSessions = [...editForm.sessions];
                            newSessions.splice(index, 1);
                            setEditForm({...editForm, sessions: newSessions});
                          }} className="text-red-600 text-xs font-bold hover:underline">삭제</button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">제목</label>
                          <input value={session.title} onChange={e => {
                            const newSessions = [...editForm.sessions];
                            newSessions[index].title = e.target.value;
                            setEditForm({...editForm, sessions: newSessions});
                          }} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">일시</label>
                          <input value={session.date} onChange={e => {
                            const newSessions = [...editForm.sessions];
                            newSessions[index].date = e.target.value;
                            setEditForm({...editForm, sessions: newSessions});
                          }} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">대상</label>
                          <input value={session.target} onChange={e => {
                            const newSessions = [...editForm.sessions];
                            newSessions[index].target = e.target.value;
                            setEditForm({...editForm, sessions: newSessions});
                          }} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">장소</label>
                          <input value={session.location} onChange={e => {
                            const newSessions = [...editForm.sessions];
                            newSessions[index].location = e.target.value;
                            setEditForm({...editForm, sessions: newSessions});
                          }} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">연사</label>
                          <input value={session.speaker} onChange={e => {
                            const newSessions = [...editForm.sessions];
                            newSessions[index].speaker = e.target.value;
                            setEditForm({...editForm, sessions: newSessions});
                          }} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">내용</label>
                          <textarea value={session.content} onChange={e => {
                            const newSessions = [...editForm.sessions];
                            newSessions[index].content = e.target.value;
                            setEditForm({...editForm, sessions: newSessions});
                          }} rows={3} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => {
                    setEditForm({...editForm, sessions: [...editForm.sessions, { title: "", date: "", target: "", location: "", speaker: "", content: "" }]});
                  }} className="w-full py-2 border border-dashed border-gray-400 text-gray-600 text-sm font-bold rounded hover:bg-gray-100 transition-colors">
                    + 세션 추가
                  </button>
                </div>"""

new_edit_ui = """                <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">도입부</label>
                    <textarea value={editForm.intro || ""} onChange={e => setEditForm({...editForm, intro: e.target.value})} rows={4} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">설명회 일시</label>
                    <input value={editForm.schedule || ""} onChange={e => setEditForm({...editForm, schedule: e.target.value})} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">대상</label>
                    <input value={editForm.target || ""} onChange={e => setEditForm({...editForm, target: e.target.value})} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">연사 소개</label>
                    <textarea value={editForm.speaker || ""} onChange={e => setEditForm({...editForm, speaker: e.target.value})} rows={3} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">주제 및 주요 내용</label>
                    <textarea value={editForm.content || ""} onChange={e => setEditForm({...editForm, content: e.target.value})} rows={4} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">참석자 혜택</label>
                    <input value={editForm.benefit || ""} onChange={e => setEditForm({...editForm, benefit: e.target.value})} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">설명회 장소</label>
                    <textarea value={editForm.location || ""} onChange={e => setEditForm({...editForm, location: e.target.value})} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                </div>"""

content = content.replace(old_edit_ui, new_edit_ui)

with open('client/src/pages/admin.tsx', 'w') as f:
    f.write(content)
print("Updated admin.tsx to remove dynamic sessions.")

