import re

with open('client/src/pages/admin.tsx', 'r') as f:
    content = f.read()

start_marker = "function SummerGuidelinesManager({ activeTab }: { activeTab: \"중등\" | \"고1\" | \"고2\" }) {"
end_marker = "function SortableNoticeRow({"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    new_manager = """function SummerGuidelinesManager({ activeTab }: { activeTab: "중등" | "고1" | "고2" }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      title: "",
      division: activeTab,
      category: "curriculum",
      display_order: 0,
      schedule: "",
      features: "",
      materials: "",
      tasks: "",
      management: "",
      sessions: ""
    }
  });

  const { data: guidelines = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/summer-guidelines"],
  });

  useEffect(() => {
    reset({ ...control._defaultValues, division: activeTab });
  }, [activeTab, reset]);

  const parseContent = (contentStr: string) => {
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
  };

  const stringifyContent = (data: any) => {
    let res = "";
    if (data.schedule?.trim()) res += `[수업 일정]\\n${data.schedule.trim()}\\n\\n`;
    if (data.features?.trim()) res += `[강좌 특징]\\n${data.features.trim()}\\n\\n`;
    if (data.materials?.trim()) res += `[교재/제공자료]\\n${data.materials.trim()}\\n\\n`;
    if (data.tasks?.trim()) res += `[과제/TEST]\\n${data.tasks.trim()}\\n\\n`;
    if (data.management?.trim()) res += `[관리 SYSTEM 및 CLINIC]\\n${data.management.trim()}\\n\\n`;
    if (data.sessions?.trim()) res += `[회차별 내용]\\n${data.sessions.trim()}\\n`;
    return res.trim();
  };

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const content = stringifyContent(data);
      await apiRequest("POST", "/api/summer-guidelines", {
        title: data.title,
        division: activeTab,
        category: data.category,
        content,
        display_order: parseInt(data.display_order) || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-guidelines"] });
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest("PATCH", `/api/summer-guidelines/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-guidelines"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/summer-guidelines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/summer-guidelines"] });
    },
  });

  const onSubmit = (data: any) => {
    addMutation.mutate(data);
  };

  const startEdit = (g: any) => {
    setEditingId(g.id);
    const parsed = parseContent(g.content || "");
    setEditForm({ 
      title: g.title, 
      category: g.category || "curriculum", 
      display_order: g.display_order || 0,
      ...parsed
    });
  };

  const saveEdit = () => {
    if (editingId === null) return;
    const content = stringifyContent(editForm);
    updateMutation.mutate({ 
      id: editingId, 
      data: { 
        title: editForm.title,
        category: editForm.category,
        display_order: parseInt(editForm.display_order) || 0,
        content 
      } 
    });
  };

  const filtered = guidelines.filter(g => {
    const d = g.division === "중3" ? "중등" : g.division;
    return d === activeTab;
  }).sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h4 className="text-sm font-bold text-gray-900 mb-4">새 데이터 추가</h4>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">카테고리</label>
              <select {...register("category")} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded">
                <option value="curriculum">강사별 커리큘럼</option>
                <option value="guideline">썸머스쿨 가이드라인</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">제목 (또는 강좌명) *</label>
              <input {...register("title", { required: true })} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="예: [고1] 수학 연합반 - 강현T" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">표시 순서 (숫자 작을수록 위)</label>
              <input type="number" {...register("display_order")} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <h5 className="font-bold text-sm text-gray-800 mb-3 border-b pb-2">커리큘럼 상세 정보 (각 항목을 채우면 자동으로 양식에 맞게 표출됩니다)</h5>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">수업 일정</label>
              <textarea {...register("schedule")} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="화/목 18:00-22:00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">강좌 특징</label>
              <textarea {...register("features")} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="강좌에 대한 특징 설명" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">교재 / 제공자료</label>
              <textarea {...register("materials")} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="자체교재 및 모의고사" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">과제 / TEST</label>
              <textarea {...register("tasks")} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="매주 누적 모의고사" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">관리 SYSTEM 및 CLINIC (줄바꿈 시 자동으로 리스트 표출)</label>
              <textarea {...register("management")} rows={3} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="• 과제 체크 : 과제 입력... \n• 테스트 : ..." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">회차별 내용</label>
              <textarea {...register("sessions")} rows={5} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" placeholder="1회차 - 다항식연산\n2회차 - 항등식" />
            </div>
          </div>

          <button type="submit" disabled={addMutation.isPending} className="px-6 py-2 bg-red-600 text-white text-sm font-bold hover:bg-red-700 rounded transition-colors disabled:opacity-50">
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : "추가"}
          </button>
        </form>
      </div>

      <div className="space-y-3">
        {filtered.map(g => (
          <div key={g.id} className="bg-white p-4 border border-gray-200 rounded-lg">
            {editingId === g.id ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">카테고리</label>
                    <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded">
                      <option value="curriculum">강사별 커리큘럼</option>
                      <option value="guideline">썸머스쿨 가이드라인</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">제목</label>
                    <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">표시 순서</label>
                    <input type="number" value={editForm.display_order} onChange={e => setEditForm({...editForm, display_order: e.target.value})} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">수업 일정</label>
                    <textarea value={editForm.schedule} onChange={e => setEditForm({...editForm, schedule: e.target.value})} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">강좌 특징</label>
                    <textarea value={editForm.features} onChange={e => setEditForm({...editForm, features: e.target.value})} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">교재 / 제공자료</label>
                    <textarea value={editForm.materials} onChange={e => setEditForm({...editForm, materials: e.target.value})} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">과제 / TEST</label>
                    <textarea value={editForm.tasks} onChange={e => setEditForm({...editForm, tasks: e.target.value})} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">관리 SYSTEM 및 CLINIC</label>
                    <textarea value={editForm.management} onChange={e => setEditForm({...editForm, management: e.target.value})} rows={3} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">회차별 내용</label>
                    <textarea value={editForm.sessions} onChange={e => setEditForm({...editForm, sessions: e.target.value})} rows={5} className="w-full border border-gray-300 px-3 py-2 text-sm focus:border-red-600 rounded" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={updateMutation.isPending} className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded">저장</button>
                  <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-bold rounded">취소</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-gray-100 text-xs text-gray-600 rounded font-semibold">
                      {g.category === "curriculum" ? "커리큘럼" : "가이드라인"}
                    </span>
                    <span className="text-xs text-gray-400">순서: {g.display_order}</span>
                  </div>
                  <h5 className="font-bold text-gray-900">{g.title}</h5>
                  <div className="mt-3 space-y-2 text-sm">
                    {(() => {
                      const parsed = parseContent(g.content || "");
                      return (
                        <>
                          {parsed.schedule && <p className="text-gray-600"><span className="font-semibold text-gray-800">수업일정:</span> {parsed.schedule.replace(/\\n/g, ' ')}</p>}
                          {parsed.features && <p className="text-gray-600"><span className="font-semibold text-gray-800">특징:</span> {parsed.features.substring(0, 50)}...</p>}
                          {parsed.sessions && <p className="text-gray-600"><span className="font-semibold text-gray-800">회차:</span> 포함됨</p>}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(g)} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => { if(confirm("삭제하시겠습니까?")) deleteMutation.mutate(g.id); }} className="p-2 text-gray-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-8">등록된 데이터가 없습니다.</p>
        )}
      </div>
    </div>
  );
}
"""

    new_content = content[:start_idx] + new_manager + content[end_idx:]
    with open('client/src/pages/admin.tsx', 'w') as f:
        f.write(new_content)
    print("SummerGuidelinesManager replaced successfully.")
else:
    print("Failed to find bounds.")
