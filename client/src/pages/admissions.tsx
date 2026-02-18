import { SectionPage } from "@/components/layout";
import { Trophy, Star, TrendingUp } from "lucide-react";

export function Admissions() {
  return (
    <SectionPage title="입시" subtitle="영통이강학원 입시 실적 및 합격 후기">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: "의약학 계열", count: "23명", year: "2025학년도" },
          { label: "SKY 합격", count: "47명", year: "2025학년도" },
          { label: "주요 대학 합격", count: "156명", year: "2025학년도" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 p-6 text-center" data-testid={`card-stat-${stat.label}`}>
            <TrendingUp className="w-8 h-8 text-orange-500 mx-auto mb-3" />
            <p className="text-3xl font-extrabold text-gray-900">{stat.count}</p>
            <p className="text-sm font-bold text-orange-500 mt-1">{stat.label}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.year}</p>
          </div>
        ))}
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">주요 합격 실적</h2>
      <div className="space-y-3">
        {[
          { univ: "서울대학교", dept: "수학과", year: "2025" },
          { univ: "연세대학교", dept: "의예과", year: "2025" },
          { univ: "고려대학교", dept: "경영학과", year: "2025" },
          { univ: "서울대학교", dept: "전기공학부", year: "2025" },
          { univ: "성균관대학교", dept: "의예과", year: "2025" },
          { univ: "한양대학교", dept: "수학교육과", year: "2025" },
          { univ: "중앙대학교", dept: "약학과", year: "2024" },
          { univ: "경희대학교", dept: "한의예과", year: "2024" },
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-4 bg-white border border-gray-200 p-4" data-testid={`card-result-${i}`}>
            <Trophy className="w-5 h-5 text-orange-500 flex-shrink-0" />
            <span className="font-bold text-gray-900 min-w-[130px]">{r.univ}</span>
            <span className="text-gray-600 flex-1">{r.dept}</span>
            <span className="text-xs text-gray-400">{r.year}학년도</span>
          </div>
        ))}
      </div>
    </SectionPage>
  );
}

export function AdmissionsResults() {
  return <Admissions />;
}

export function AdmissionsReviews() {
  return (
    <SectionPage title="합격 후기" subtitle="영통이강학원 졸업생들의 생생한 후기">
      <div className="space-y-6">
        {[
          { name: "김O준", univ: "서울대학교 수학과", review: "고2부터 이강학원에서 수학을 배웠습니다. 체계적인 커리큘럼과 선생님들의 열정 덕분에 수능에서 좋은 결과를 얻을 수 있었습니다. 특히 모의고사 분석 수업이 큰 도움이 되었습니다." },
          { name: "이O현", univ: "연세대학교 의예과", review: "중등관부터 고등관까지 쭉 다녔습니다. 선생님들이 학생 한 명 한 명을 세심하게 관리해주셔서 수학이 가장 자신있는 과목이 되었습니다. 감사합니다!" },
          { name: "박O서", univ: "고려대학교 경영학과", review: "올빼미 독학관을 정말 많이 이용했습니다. 집중할 수 있는 환경이 공부에 큰 도움이 되었고, 수학 성적이 4등급에서 1등급까지 올랐습니다." },
        ].map((r, i) => (
          <div key={i} className="bg-white border border-gray-200 p-6" data-testid={`card-review-${i}`}>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-orange-500" />
              <span className="font-bold text-gray-900">{r.name}</span>
              <span className="text-sm text-orange-500 font-medium">| {r.univ}</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{r.review}</p>
          </div>
        ))}
      </div>
    </SectionPage>
  );
}
