import re

with open('client/src/pages/admin.tsx', 'r') as f:
    content = f.read()

# 1. Fix queryClient in SummerGuidelinesManager
if 'const queryClient = useQueryClient();' not in content.split('function SummerGuidelinesManager')[1][:200]:
    content = content.replace(
        'function SummerGuidelinesManager({ activeTab }: { activeTab: "중등" | "고1" | "고2" }) {\n',
        'function SummerGuidelinesManager({ activeTab }: { activeTab: "중등" | "고1" | "고2" }) {\n  const queryClient = useQueryClient();\n'
    )

# 2. Fix BriefingsTab UI (remove fields.map and remove(index))
# Actually, the quickest way to fix BriefingsTab and BriefingEventsTab without messing up the whole layout 
# is to find the whole `fields.map` block and replace it with just the static fields for session 1.
# Or since the new schema is intro, schedule, target, speaker, content, benefit, location
# I should just remove the `fields.map` loop and render the 7 fields directly!

# Let's completely replace the BriefingsTab UI part where it renders the form!
def fix_tab_form(tab_name):
    global content
    
    # We look for the <form onSubmit={handleSubmit(onSubmit)} className="space-y-6"> inside the tab
    start_str = f"function {tab_name}() {{"
    start_idx = content.find(start_str)
    if start_idx == -1: return
    
    # We find the render block
    render_start = content.find("<form onSubmit={handleSubmit(onSubmit)}", start_idx)
    render_end = content.find("</form>", render_start) + 7
    
    old_form = content[render_start:render_end]
    
    new_form = """<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-gray-50 p-4 border border-gray-200 rounded-lg space-y-4">
            <h4 className="font-semibold text-gray-800">기본 정보</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
              <input
                {...register("title", { required: "제목을 입력하세요" })}
                className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                placeholder="예: 2026학년도 고등부 신입생 설명회"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">날짜 *</label>
                <input
                  {...register("date", { required: "날짜를 입력하세요" })}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 rounded-md"
                  placeholder="예: 2026년 3월 8일 (토)"
                />
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
              />
            </div>
          </div>

          <div className="bg-white p-4 border border-gray-200 rounded-lg space-y-4 shadow-sm">
            <h4 className="font-semibold text-gray-800">설명회 상세 내용</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">도입부</label>
                <textarea
                  {...register("intro")}
                  rows={3}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-red-600 resize-none rounded-md"
                  placeholder="예: 많은 관심과 성원에 힘입어 2차 설명회를 진행합니다."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">일시</label>
                <input {...register("schedule")} className="w-full border border-gray-300 px-3 py-2 text-sm rounded-md" placeholder="예: 7/2(목) 오후 7시" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">대상</label>
                <input {...register("target")} className="w-full border border-gray-300 px-3 py-2 text-sm rounded-md" placeholder="예: 초등 4학년 ~ 중학교 2학년" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연사</label>
                <input {...register("speaker")} className="w-full border border-gray-300 px-3 py-2 text-sm rounded-md" placeholder="예: 김학수 소장님" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">장소</label>
                <input {...register("location")} className="w-full border border-gray-300 px-3 py-2 text-sm rounded-md" placeholder="예: 모티브아카데미" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">주제 / 내용 (줄바꿈 시 글머리기호 자동추가)</label>
                <textarea {...register("content")} rows={4} className="w-full border border-gray-300 px-3 py-2 text-sm rounded-md" placeholder="설명회 내용을 입력하세요" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">혜택 (선택)</label>
                <textarea {...register("benefit")} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm rounded-md" />
              </div>
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
        </form>"""
        
    content = content[:render_start] + new_form + content[render_end:]

# Apply the form fix to BriefingsTab and BriefingEventsTab
fix_tab_form("BriefingsTab")
fix_tab_form("BriefingEventsTab")

# 3. We also need to fix the EDIT form in both tabs (it currently maps over `editSessions` which I might have left in)
def fix_edit_form(tab_name):
    global content
    
    start_str = f"function {tab_name}() {{"
    start_idx = content.find(start_str)
    if start_idx == -1: return
    
    # Replace the edit block
    edit_start = content.find("<div className=\"bg-white p-4 border border-gray-200 rounded-lg space-y-4 shadow-sm\">", start_idx)
    # The block we want to replace continues until the "수정 취소" and "저장" buttons
    edit_end = content.find("<div className=\"flex justify-end gap-2 pt-2\">", edit_start)
    
    if edit_start == -1 or edit_end == -1: return
    
    new_edit = """<div className="bg-white p-4 border border-gray-200 rounded-lg space-y-4 shadow-sm">
                    <h4 className="font-semibold text-gray-800">설명회 상세 내용 수정</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">도입부</label>
                        <textarea value={editForm.intro || ""} onChange={e => setEditForm({...editForm, intro: e.target.value})} rows={3} className="w-full border border-gray-300 px-3 py-2 text-sm rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">일시</label>
                        <input value={editForm.schedule || ""} onChange={e => setEditForm({...editForm, schedule: e.target.value})} className="w-full border border-gray-300 px-3 py-2 text-sm rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">대상</label>
                        <input value={editForm.target || ""} onChange={e => setEditForm({...editForm, target: e.target.value})} className="w-full border border-gray-300 px-3 py-2 text-sm rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">연사</label>
                        <input value={editForm.speaker || ""} onChange={e => setEditForm({...editForm, speaker: e.target.value})} className="w-full border border-gray-300 px-3 py-2 text-sm rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">장소</label>
                        <input value={editForm.location || ""} onChange={e => setEditForm({...editForm, location: e.target.value})} className="w-full border border-gray-300 px-3 py-2 text-sm rounded-md" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">주제 / 내용</label>
                        <textarea value={editForm.content || ""} onChange={e => setEditForm({...editForm, content: e.target.value})} rows={4} className="w-full border border-gray-300 px-3 py-2 text-sm rounded-md" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">혜택</label>
                        <textarea value={editForm.benefit || ""} onChange={e => setEditForm({...editForm, benefit: e.target.value})} rows={2} className="w-full border border-gray-300 px-3 py-2 text-sm rounded-md" />
                      </div>
                    </div>
                  </div>
                  """
                  
    content = content[:edit_start] + new_edit + content[edit_end:]

fix_edit_form("BriefingsTab")
fix_edit_form("BriefingEventsTab")

with open('client/src/pages/admin.tsx', 'w') as f:
    f.write(content)

print("Errors fixed!")
