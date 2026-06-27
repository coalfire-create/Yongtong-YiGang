import re

with open('client/src/pages/summer.tsx', 'r') as f:
    content = f.read()

# 1. Add state
s_state = '  const [curriculumSubjectFilter, setCurriculumSubjectFilter] = useState<string>("전체");'
n_state = '  const [curriculumSubjectFilter, setCurriculumSubjectFilter] = useState<string>("전체");\n  const [curriculumSearchTerm, setCurriculumSearchTerm] = useState("");'
content = content.replace(s_state, n_state)

# 2. Add Search UI right next to the Tabs
s_ui = """              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-gray-900 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-[#7B2332]" />
                  <h2 className="text-2xl font-black text-gray-900">강사별 커리큘럼</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {["전체", "수학", "특강/올데이", "국어", "영어", "탐구"].map(subj => (
                    <button"""

n_ui = """              <div className="flex flex-col sm:flex-row justify-between gap-4 border-b-2 border-gray-900 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-[#7B2332]" />
                  <h2 className="text-2xl font-black text-gray-900">강사별 커리큘럼</h2>
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="강사명, 과목, 강좌명 검색"
                      value={curriculumSearchTerm}
                      onChange={(e) => setCurriculumSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2332]/20 focus:border-[#7B2332] transition-all"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {["전체", "수학", "특강/올데이", "국어", "영어", "탐구"].map(subj => (
                      <button"""
content = content.replace(s_ui, n_ui)

# 3. Add filtering logic to renderCurriculumGuidelines
s_render_start = """  const renderCurriculumGuidelines = (guidelines: typeof summerGuidelines) => {
    // 1. 과목 필터 적용
    const filtered = guidelines.filter(g => {
      if (curriculumSubjectFilter === "전체") return true;
      if (curriculumSubjectFilter === "특강/올데이") {
        return g.title.includes("특강") || g.title.includes("올데이") || g.title.includes("ALL-DAY");
      }
      
      const title = g.title.replace(/\\s+/g, '');
      const subj = getSubject(title);
      return subj === curriculumSubjectFilter;
    });"""

n_render_start = """  const renderCurriculumGuidelines = (guidelines: typeof summerGuidelines) => {
    // 1. 과목 필터 및 검색어 적용
    const filtered = guidelines.filter(g => {
      let subjectMatch = true;
      if (curriculumSubjectFilter !== "전체") {
        if (curriculumSubjectFilter === "특강/올데이") {
          subjectMatch = g.title.includes("특강") || g.title.includes("올데이") || g.title.includes("ALL-DAY");
        } else {
          const title = g.title.replace(/\\s+/g, '');
          const subj = getSubject(title);
          subjectMatch = subj === curriculumSubjectFilter;
        }
      }
      
      if (!subjectMatch) return false;
      
      if (curriculumSearchTerm) {
        const searchTarget = `${g.title} ${g.teacher || ""} ${g.subject || ""} ${g.content || ""}`.toLowerCase();
        if (!searchTarget.includes(curriculumSearchTerm.toLowerCase())) {
          return false;
        }
      }
      
      return true;
    });"""

content = content.replace(s_render_start, n_render_start)

with open('client/src/pages/summer.tsx', 'w') as f:
    f.write(content)

print("Added search to summer.tsx")

