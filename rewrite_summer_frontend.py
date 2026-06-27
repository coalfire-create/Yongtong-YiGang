import re

with open('client/src/pages/summer.tsx', 'r') as f:
    content = f.read()

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

s_render_old = """                  {/* 관리 시스템 */}
                  {parsed.management && (
                    <div className="bg-red-50/50 p-4 sm:p-5 rounded-2xl border border-red-100 mt-4 sm:mt-6">
                      <h4 className="text-sm font-black text-[#7B2332] mb-3 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4" /> 관리 SYSTEM 및 CLINIC
                      </h4>
                      <ul className="space-y-2.5">
                        {parsed.management.split('\\n').map((line, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700 font-semibold leading-relaxed">
                            <span className="text-[#7B2332] font-black mt-0.5">•</span>
                            {line.replace(/^\\s*[•\\-\\d\\.]\\s*/, '')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>"""

s_render_new = """                  {/* 관리 시스템 */}
                  {parsed.management && (
                    <div className="bg-red-50/50 p-4 sm:p-5 rounded-2xl border border-red-100 mt-4 sm:mt-6">
                      <h4 className="text-sm font-black text-[#7B2332] mb-3 flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4" /> 관리 SYSTEM 및 CLINIC
                      </h4>
                      <ul className="space-y-2.5">
                        {parsed.management.split('\\n').map((line, idx) => (
                          <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700 font-semibold leading-relaxed">
                            <span className="text-[#7B2332] font-black mt-0.5">•</span>
                            {line.replace(/^\\s*[•\\-\\d\\.]\\s*/, '')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 연계 강좌 */}
                  {parsed.linked && (
                    <div className="bg-blue-50/50 p-4 sm:p-5 rounded-2xl border border-blue-100 mt-4 sm:mt-6">
                      <h4 className="text-sm font-black text-blue-800 mb-3 flex items-center gap-1.5">
                        <Link className="w-4 h-4" /> 연계 강좌
                      </h4>
                      <div className="text-xs sm:text-sm text-gray-700 font-semibold leading-relaxed whitespace-pre-line">
                        {parsed.linked}
                      </div>
                    </div>
                  )}
                </div>"""

content = content.replace(s_render_old, s_render_new)

# Add Link import if missing
if 'import { Link' not in content and 'Link,' not in content:
    content = content.replace('CalendarDays, Clock, MapPin, ChevronDown, CheckCircle2, UserCheck, Search, BookOpen, AlertCircle', 'CalendarDays, Clock, MapPin, ChevronDown, CheckCircle2, UserCheck, Search, BookOpen, AlertCircle, Link')

with open('client/src/pages/summer.tsx', 'w') as f:
    f.write(content)
print("Updated summer.tsx successfully.")
