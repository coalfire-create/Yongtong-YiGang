const fs = require('fs');
const content = `function BriefingsTab() {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<BriefingItem>>({});
  
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
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
  });

  const [editIntro, setEditIntro] = useState("");
  const [editSessions, setEditSessions] = useState([{ title: "", date: "", target: "", location: "", speaker: "", content: "" }]);

  const { data: briefings = [], isLoading } = useQuery<BriefingItem[]>({
    queryKey: ["/api/briefings"],
  });

  const stringifyDescription = (intro: string, sessions: any[]) => {
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
  };

  const parseDescription = (desc: string) => {
    let intro = "";
    let sessions: any[] = [];
    if (!desc) return { intro, sessions: [{ title: "", date: "", target: "", location: "", speaker: "", content: "" }] };

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
  };

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const description = stringifyDescription(data.intro, data.sessions);
      await apiRequest("POST", "/api/briefings", {
        title: data.title,
        date: data.date,
        time: data.time,
        description,
        form_url: data.form_url || null,
        is_active: true,
        display_order: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/briefings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/briefings/active"] });
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<BriefingItem> }) => {
      await apiRequest("PUT", \`/api/briefings/\${id}\`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/briefings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/briefings/active"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", \`/api/briefings/\${id}\`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/briefings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/briefings/active"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const b = briefings.find((x) => x.id === id);
      if (!b) return;
      await apiRequest("PUT", \`/api/briefings/\${id}\`, { ...b, is_active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/briefings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/briefings/active"] });
    },
  });

  const onSubmit = (data: any) => {
    addMutation.mutate(data);
  };

  const startEdit = (b: BriefingItem) => {
    setEditingId(b.id);
    const parsed = parseDescription(b.description || "");
    setEditIntro(parsed.intro);
    setEditSessions(parsed.sessions);
    setEditForm({ title: b.title, date: b.date, time: b.time, form_url: b.form_url || "", display_order: b.display_order });
  };

  const saveEdit = () => {
    if (editingId === null) return;
    const original = briefings.find((b) => b.id === editingId);
    if (!original) return;
    const description = stringifyDescription(editIntro, editSessions);
    updateMutation.mutate({ id: editingId, data: { ...original, ...editForm, description } });
  };

  return (
    <div>
      <div className="bg-white border border-gray-200 p-6 mb-8" data-testid="form-add-briefing">
        <h3 className="text-lg font-bold text-gray-900 mb-4">설명회 일정 추가</h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg space-y-4">
            <h4 className="font-semibold text-gray-800">기본 정보</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
              <input
                {...register("title", { required: "제목을 입력하세요" })}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                placeholder="예: 2026학년도 고등부 신입생 설명회"
              />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message as string}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">날짜 *</label>
                <input
                  {...register("date", { required: "날짜를 입력하세요" })}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                  placeholder="예: 2026년 3월 8일 (토)"
                />
                {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message as string}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시간</label>
                <input
                  {...register("time")}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                  placeholder="예: 14:00~16:00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">구글폼 링크</label>
              <input
                {...register("form_url")}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                placeholder="https://forms.gle/..."
              />
            </div>
          </div>

          <div className="bg-white p-4 border border-gray-200 rounded-lg space-y-4">
            <h4 className="font-semibold text-gray-800">설명회 내용 (도입부 및 세션)</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">설명회 도입부 (생략 가능)</label>
              <textarea
                {...register("intro")}
                rows={3}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 resize-none rounded-md"
                placeholder="설명회 도입부 내용을 입력하세요."
              />
            </div>
            
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="relative bg-gray-50 p-4 border border-gray-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-gray-800 text-sm">세션 {index + 1}</h5>
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 text-xs font-semibold">
                        삭제
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">세션 제목</label>
                      <input
                        {...register(\`sessions.\${index}.title\`)}
                        className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600 rounded"
                        placeholder="예: 1부"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">일시</label>
                      <input
                        {...register(\`sessions.\${index}.date\`)}
                        className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600 rounded"
                        placeholder="예: 2월 28일 (목) 19:30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">대상</label>
                      <input
                        {...register(\`sessions.\${index}.target\`)}
                        className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600 rounded"
                        placeholder="예: 영통고 1학년"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">장소</label>
                      <input
                        {...register(\`sessions.\${index}.location\`)}
                        className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600 rounded"
                        placeholder="예: 영통이강학원"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">연사</label>
                      <input
                        {...register(\`sessions.\${index}.speaker\`)}
                        className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600 rounded"
                        placeholder="예: 수학 정승준 ○ 국어 홍길동"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">상세 내용 (각 줄은 리스트로 자동 변환됩니다)</label>
                      <textarea
                        {...register(\`sessions.\${index}.content\`)}
                        rows={4}
                        className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600 resize-none rounded"
                        placeholder="내용 1&#13;&#10;내용 2"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => append({ title: "", date: "", target: "", location: "", speaker: "", content: "" })}
                className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-600 font-semibold text-sm rounded-lg hover:border-gray-400 hover:text-gray-800 transition-colors"
              >
                + 세션 추가
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={addMutation.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 rounded-md"
          >
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            추가
          </button>
        </form>
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-4">등록된 설명회 ({briefings.length}개)</h3>
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : briefings.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">등록된 설명회가 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {briefings.map((b) => (
            <div key={b.id} className="bg-white border border-gray-200 p-5 rounded-lg shadow-sm">
              {editingId === b.id ? (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg space-y-4">
                    <h4 className="font-semibold text-gray-800">기본 정보 수정</h4>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">제목</label>
                      <input
                        value={editForm.title || ""}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                        placeholder="제목"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">날짜</label>
                        <input
                          value={editForm.date || ""}
                          onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                          className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                          placeholder="날짜"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">시간</label>
                        <input
                          value={editForm.time || ""}
                          onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                          className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                          placeholder="시간"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">구글폼 링크</label>
                      <input
                        value={editForm.form_url || ""}
                        onChange={(e) => setEditForm({ ...editForm, form_url: e.target.value })}
                        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                        placeholder="구글폼 링크"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-4 border border-gray-200 rounded-lg space-y-4">
                    <h4 className="font-semibold text-gray-800">설명회 내용 수정</h4>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">도입부</label>
                      <textarea
                        value={editIntro}
                        onChange={(e) => setEditIntro(e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 resize-none rounded-md"
                        placeholder="설명회 도입부 내용을 입력하세요."
                      />
                    </div>

                    <div className="space-y-4">
                      {editSessions.map((session, index) => (
                        <div key={index} className="relative bg-gray-50 p-4 border border-gray-200 rounded-lg space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-gray-800 text-sm">세션 {index + 1}</h5>
                            {editSessions.length > 1 && (
                              <button type="button" onClick={() => setEditSessions(editSessions.filter((_, i) => i !== index))} className="text-red-500 hover:text-red-700 text-xs font-semibold">
                                삭제
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">세션 제목</label>
                              <input
                                value={session.title}
                                onChange={(e) => {
                                  const newSessions = [...editSessions];
                                  newSessions[index].title = e.target.value;
                                  setEditSessions(newSessions);
                                }}
                                className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600 rounded"
                                placeholder="예: 1부"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">일시</label>
                              <input
                                value={session.date}
                                onChange={(e) => {
                                  const newSessions = [...editSessions];
                                  newSessions[index].date = e.target.value;
                                  setEditSessions(newSessions);
                                }}
                                className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600 rounded"
                                placeholder="예: 2월 28일 (목) 19:30"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">대상</label>
                              <input
                                value={session.target}
                                onChange={(e) => {
                                  const newSessions = [...editSessions];
                                  newSessions[index].target = e.target.value;
                                  setEditSessions(newSessions);
                                }}
                                className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600 rounded"
                                placeholder="예: 영통고 1학년"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">장소</label>
                              <input
                                value={session.location}
                                onChange={(e) => {
                                  const newSessions = [...editSessions];
                                  newSessions[index].location = e.target.value;
                                  setEditSessions(newSessions);
                                }}
                                className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600 rounded"
                                placeholder="예: 영통이강학원"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">연사</label>
                              <input
                                value={session.speaker}
                                onChange={(e) => {
                                  const newSessions = [...editSessions];
                                  newSessions[index].speaker = e.target.value;
                                  setEditSessions(newSessions);
                                }}
                                className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600 rounded"
                                placeholder="예: 수학 정승준 ○ 국어 홍길동"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium text-gray-600 mb-1">상세 내용 (각 줄은 리스트로 자동 변환됩니다)</label>
                              <textarea
                                value={session.content}
                                onChange={(e) => {
                                  const newSessions = [...editSessions];
                                  newSessions[index].content = e.target.value;
                                  setEditSessions(newSessions);
                                }}
                                rows={4}
                                className="w-full border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:border-red-600 resize-none rounded"
                                placeholder="내용 1&#13;&#10;내용 2"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setEditSessions([...editSessions, { title: "", date: "", target: "", location: "", speaker: "", content: "" }])}
                        className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-600 font-semibold text-sm rounded-lg hover:border-gray-400 hover:text-gray-800 transition-colors"
                      >
                        + 세션 추가
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={saveEdit}
                      disabled={updateMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 rounded-md"
                    >
                      <Check className="w-4 h-4" />
                      저장
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors rounded-md"
                    >
                      <X className="w-4 h-4" />
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-gray-900 text-lg">{b.title}</h4>
                      {!b.is_active && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded">비활성</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-red-600 mt-1">{b.date} {b.time}</p>
                    {b.description && (
                      <div className="mt-4 text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded border border-gray-100 font-mono leading-relaxed">
                        {b.description}
                      </div>
                    )}
                    {b.form_url && (
                      <a href={b.form_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-700 mt-3 inline-block break-all underline">
                        {b.form_url}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleMutation.mutate({ id: b.id, is_active: !b.is_active })}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors rounded"
                      title={b.is_active ? "비활성화" : "활성화"}
                    >
                      {b.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => startEdit(b)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("이 설명회를 삭제하시겠습니까?")) {
                          deleteMutation.mutate(b.id);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
`

const file = fs.readFileSync('client/src/pages/admin.tsx', 'utf-8');
const lines = file.split('\n');
const startIdx = lines.findIndex(l => l.startsWith('function BriefingsTab() {'));
const endIdx = lines.findIndex((l, idx) => idx > startIdx && l.startsWith('function BriefingEventsTab() {'));

if (startIdx !== -1 && endIdx !== -1) {
  const newLines = [
    ...lines.slice(0, startIdx),
    content,
    ...lines.slice(endIdx)
  ];
  fs.writeFileSync('client/src/pages/admin.tsx', newLines.join('\n'));
  console.log("BriefingsTab replaced successfully.");
} else {
  console.log("Could not find bounds.");
}
