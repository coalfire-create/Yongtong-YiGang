import { SectionPage } from "@/components/layout";
import { BookOpen, Target, Users, Trophy, GraduationCap, Lightbulb } from "lucide-react";
const principalImg = "/principal.png";

const FEATURES = [
  {
    icon: Target,
    title: "학교별 맞춤 내신 전략",
    desc: "영통·망포·태장·매탄 등 수원 지역 주요 학교의 출제 경향을 분석하여, 학교별 맞춤형 내신 대비 수업을 운영합니다.",
  },
  {
    icon: GraduationCap,
    title: "검증된 입시 실적",
    desc: "매년 SKY·의치한약수·최상위권 대학 합격생을 배출하며, 지역 최고 수준의 입시 실적을 이어가고 있습니다.",
  },
  {
    icon: Users,
    title: "고등관 · 초/중등관 전문 분리 운영",
    desc: "고등관과 초/중등관을 별도로 운영하여 학생 연령과 수준에 최적화된 교육 환경을 제공합니다.",
  },
  {
    icon: BookOpen,
    title: "수학·국어·영어·탐구 전 과목 완성",
    desc: "핵심 4개 과목을 한 학원에서 완성할 수 있도록, 과목별 전문 강사진이 체계적인 커리큘럼을 운영합니다.",
  },
  {
    icon: Lightbulb,
    title: "올빼미 관리형 스파르타 독학관",
    desc: "자기주도 학습 능력을 기르는 올빼미 스파르타 독학관을 운영하며, 늦은 시간까지 체계적인 관리를 지원합니다.",
  },
  {
    icon: Trophy,
    title: "투명한 결과 공개",
    desc: "입시 결과와 합격 후기를 투명하게 공개하여, 학부모와 학생이 신뢰를 갖고 선택할 수 있도록 합니다.",
  },
];

const PHILOSOPHY = [
  {
    num: "01",
    title: "실력으로 말한다",
    desc: "화려한 광고보다 검증된 실적으로 신뢰를 쌓습니다. 매년 공개하는 입시 결과가 이강학원의 실력입니다.",
  },
  {
    num: "02",
    title: "학생 한 명 한 명이 우선",
    desc: "평균이 아닌 개인을 봅니다. 학생의 현재 수준과 목표에 맞는 맞춤형 지도로 최적의 결과를 만들어냅니다.",
  },
  {
    num: "03",
    title: "내신과 수능을 동시에",
    desc: "내신 성적과 수능 실력이 함께 성장하도록 균형 잡힌 커리큘럼을 설계합니다. 둘 중 하나를 포기하지 않습니다.",
  },
];

const DIVISIONS = [
  { name: "고등관", path: "/high-school", desc: "고1~고3 내신 및 수능 대비. 학교별 전략 수업과 체계적인 시간표 운영.", color: "bg-[#7B2332]" },
  { name: "초/중등관", path: "/junior-school", desc: "초등~중등 수학·국어·영어 기초 완성. 선행 학습과 내신 동시 관리.", color: "bg-stone-600" },
  { name: "올빼미 스파르타", path: "/owl", desc: "관리형 독학관. 자기주도 학습 + 강사 관리로 집중력과 공부 습관 완성.", color: "bg-gray-700" },
];

export function About() {
  return (
    <SectionPage title="학원소개">
      <div className="space-y-16">

        <section data-testid="section-about-intro">
          <div className="bg-[#7B2332] text-white p-8 sm:p-12 text-center">
            <p className="text-sm font-semibold tracking-widest mb-4 opacity-80">YEONGTONG IGANG ACADEMY</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-5 leading-snug">
              영통에서 가장 많은<br />입시 합격생을 배출한 학원
            </h2>
            <p className="text-sm sm:text-base opacity-90 max-w-xl mx-auto leading-relaxed">
              영통이강학원은 2024년 개원 이후 수원 영통 지역 최고의 입시 성과를 기록하며,
              수학·국어·영어·탐구 전 과목 전문 강사진이 고등관·초중등관·올빼미 스파르타를 운영하고 있습니다.
            </p>
          </div>
        </section>

        <section data-testid="section-about-greeting">
          <h2 className="text-xl font-extrabold text-gray-900 mb-6 pb-3 border-b-2 border-[#7B2332]">원장님 인사말</h2>
          <div className="bg-white border border-gray-200 overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="flex-1 p-8 sm:p-10 flex flex-col justify-center">
                <p className="text-xs font-bold tracking-widest text-[#7B2332] uppercase mb-4">Director's Greeting</p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 mb-6 leading-snug">
                  안녕하세요,<br />영통이강학원 원장 정승준입니다.
                </h3>
                <div className="space-y-4 text-sm sm:text-base text-gray-600 leading-relaxed">
                  <p>
                    저는 학생 한 명 한 명의 가능성을 믿습니다. 어떤 출발점에서 시작하더라도, 올바른 방향과 꾸준한 노력이 더해지면 반드시 원하는 결과에 닿을 수 있습니다.
                  </p>
                  <p>
                    영통이강학원은 단순히 점수를 올리는 곳이 아닙니다. 학생 스스로 공부하는 힘을 기르고, 자신의 목표를 향해 나아갈 수 있도록 옆에서 함께하는 학원입니다.
                  </p>
                  <p>
                    학부모님과 학생 여러분의 소중한 선택에 항상 최선으로 보답하겠습니다.
                  </p>
                </div>
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <p className="text-base font-bold text-gray-900">영통이강학원 원장</p>
                  <p className="text-2xl font-black text-[#7B2332] mt-1">정승준</p>
                </div>
              </div>

              <div className="md:w-[340px] lg:w-[400px] flex-shrink-0 bg-gray-50 flex items-end justify-center overflow-hidden" style={{ minHeight: "420px" }}>
                <img
                  src={principalImg}
                  alt="원장 정승준"
                  className="w-full h-full object-cover object-top"
                  style={{ maxHeight: "520px" }}
                  data-testid="img-principal"
                />
              </div>
            </div>
          </div>
        </section>

        <section data-testid="section-about-philosophy">
          <h2 className="text-xl font-extrabold text-gray-900 mb-6 pb-3 border-b-2 border-[#7B2332]">교육 철학</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PHILOSOPHY.map((p) => (
              <div key={p.num} className="bg-white border border-gray-200 p-6">
                <span className="text-3xl font-black text-[#7B2332] opacity-20 block mb-2">{p.num}</span>
                <h3 className="text-base font-bold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section data-testid="section-about-divisions">
          <h2 className="text-xl font-extrabold text-gray-900 mb-6 pb-3 border-b-2 border-[#7B2332]">운영 부문</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {DIVISIONS.map((d) => (
              <a key={d.name} href={d.path} className="group block bg-white border border-gray-200 hover:border-[#7B2332] transition-colors p-6" data-testid={`card-division-${d.name}`}>
                <div className={`inline-block px-3 py-1 text-xs font-bold text-white rounded-full mb-3 ${d.color}`}>{d.name}</div>
                <p className="text-sm text-gray-600 leading-relaxed group-hover:text-gray-800 transition-colors">{d.desc}</p>
              </a>
            ))}
          </div>
        </section>

        <section data-testid="section-about-features">
          <h2 className="text-xl font-extrabold text-gray-900 mb-6 pb-3 border-b-2 border-[#7B2332]">이강학원 특장점</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex items-start gap-4 bg-white border border-gray-200 p-6" data-testid={`card-feature-${f.title}`}>
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-red-50 rounded-full">
                    <Icon className="w-5 h-5 text-[#7B2332]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </SectionPage>
  );
}
