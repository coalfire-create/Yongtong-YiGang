import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { SectionPage } from "@/components/layout";
import { Loader2, User, Target, BookOpen, Clock, Users, GraduationCap, Phone, MessageSquare, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SummerImage {
  id: number;
  image_url: string;
  teacher_id: number | null;
  teacher_name: string | null;
  division?: string;
}

const HIGHLIGHTS = [
  {
    num: "01",
    icon: Target,
    title: "1:1 개별 진단 & 학습 방향 설계",
    desc: "무분별한 선행보다 아이에게 맞는 공부 방향을 우선 분석합니다. 학생별 상담 후 취약점과 학습 이력을 바탕으로 개인별 진도 계획 및 관리 방향을 제시합니다.",
  },
  {
    num: "02",
    icon: BookOpen,
    title: "영통 이강학원만의 자체 제작 콘텐츠 제공",
    desc: "수(秀) 모의고사·시크릿파일 등 학교별 유형을 반영한 콘텐츠를 제작합니다. 고난도 유형 훈련 및 성취도 분석 피드백을 진행합니다.",
  },
  {
    num: "03",
    icon: CheckCircle2,
    title: "주요 영어·수학 필수 테스트 진행",
    desc: "고등 수능 영단어 매일 20분 간 테스트 진행 후 피드백을 제공하며, 총 3회에 걸친 수학 단원별 이해도 점검 및 취약 유형 오답 관리를 철저히 합니다.",
  },
  {
    num: "04",
    icon: Users,
    title: "실제 고등내신·수능 수업 담당 강사진 직접 투입",
    desc: "현 고등학생 취약 유형을 완벽히 파악한 영통이강 고등 수학 스쿨 강사진이 중3 썸머 수업을 직접 진행하고 핵심 유형을 집중 관리합니다.",
  },
  {
    num: "05",
    icon: GraduationCap,
    title: "9년 차 입학사정관 출신 입시 소장의 1:1 컨설팅",
    desc: "영통이강학원 상주 대학교 입학사정관 출신 한노아 소장이 1:1 맞춤 입시 전략을 직접 상담하고 관리합니다.",
  },
];

const SCHEDULE = [
  { time: "08:00 - 08:40", content: "등원 및 자습준비" },
  { time: "08:40 - 09:00", content: "영단어 테스트 (총 18회)", type: "blue", label: "MUST TEST" },
  { time: "09:00 - 12:30", content: "수학 공수1/공수2 (기본·심화), 통과/국어(정규)", type: "red" },
  { time: "12:30 - 13:30", content: "점심식사" },
  { time: "13:30 - 17:00", content: "영어, 국어(정규), 물리(정규), 수학클리닉", type: "red" },
  { time: "17:00 - 18:00", content: "저녁식사" },
  { time: "18:00 - 21:30", content: "자습 & 숙제 / 1:1 입시 컨설팅 / 수학 모의고사", type: "blue" },
  { time: "21:30 - 22:00", content: "자기점검 및 하원" },
];

interface SummerCurriculumSession {
  session: string;
  date: string;
  day: string;
  time: string;
  topic: string;
}

interface SummerCurriculumClass {
  title: string;
  subtitle: string;
  timeInfo: string;
  sessions: SummerCurriculumSession[];
  note?: string;
}

const HWANG_HR_CURRICULUM: Record<"고1" | "고2", SummerCurriculumClass[]> = {
  "고1": [
    {
      title: "화성고1 공동수학2 (10회) - 실력",
      subtitle: "화성고 내신 출제 경향 분석 및 수능 연계 개념 완성",
      timeInfo: "토/일 14:00 - 17:30",
      sessions: [
        { session: "1회", date: "7월 11일", day: "토", time: "14:00~17:30", topic: "평면좌표와 평면도형의 성질" },
        { session: "2회", date: "7월 12일", day: "일", time: "14:00~17:30", topic: "직선의 방정식" },
        { session: "3회", date: "7월 18일", day: "토", time: "14:00~17:30", topic: "원의 방정식" },
        { session: "4회", date: "7월 19일", day: "일", time: "14:00~17:30", topic: "도형의 이동" },
        { session: "5회", date: "7월 25일", day: "토", time: "14:00~17:30", topic: "집합" },
        { session: "6회", date: "7월 26일", day: "일", time: "14:00~17:30", topic: "명제" },
        { session: "7회", date: "8월 1일", day: "토", time: "14:00~17:30", topic: "함수" },
        { session: "8회", date: "8월 2일", day: "일", time: "14:00~17:30", topic: "합성함수와 역함수" },
        { session: "9회", date: "8월 8일", day: "토", time: "14:00~17:30", topic: "유리함수" },
        { session: "10회", date: "8월 9일", day: "일", time: "14:00~17:30", topic: "무리함수" }
      ]
    },
    {
      title: "고1 특강 대수 (9회) - 실력",
      subtitle: "대수 단원 핵심 개념 심화 학습 및 빈출 유형 완벽 정복",
      timeInfo: "수/금/월 09:00 - 12:30",
      sessions: [
        { session: "1회", date: "7월 22일", day: "수", time: "09:00~12:30", topic: "지수와 로그" },
        { session: "2회", date: "7월 24일", day: "금", time: "09:00~12:30", topic: "지수함수와 로그함수의 그래프" },
        { session: "3회", date: "7월 27일", day: "월", time: "09:00~12:30", topic: "지수함수와 로그함수 (역함수 관계, 교점, 방정식, 부등식, 활용)" },
        { session: "4회", date: "7월 29일", day: "수", time: "09:00~12:30", topic: "삼각함수의 정의와 그래프 기본" },
        { session: "5회", date: "7월 31일", day: "금", time: "09:00~12:30", topic: "삼각함수의 그래프" },
        { session: "6회", date: "8월 3일", day: "월", time: "09:00~12:30", topic: "삼각함수의 활용" },
        { session: "7회", date: "8월 5일", day: "수", time: "09:00~12:30", topic: "등차수열과 등비수열" },
        { session: "8회", date: "8월 7일", day: "금", time: "09:00~12:30", topic: "수열의 합" },
        { session: "9회", date: "8월 10일", day: "월", time: "09:00~12:30", topic: "수학적 귀납법" }
      ]
    },
    {
      title: "화성고1 All Day 대수 (6회) - 기본+실력",
      subtitle: "단기간 몰입 학습을 통해 대수 전 단원 고득점 발판 마련",
      timeInfo: "일 18:30 - 22:00, 월-금 14:00 - 17:30",
      note: "★ 영상 대체 단원: ① 지수함수와 로그함수의 방정식과 부등식 ② 삼각함수의 활용 ③ 수학적 귀납법",
      sessions: [
        { session: "1회", date: "8월 2일", day: "일", time: "18:30~22:00", topic: "지수와 로그" },
        { session: "2회", date: "8월 3일", day: "월", time: "14:00~17:30", topic: "지수함수와 로그함수" },
        { session: "3회", date: "8월 4일", day: "화", time: "14:00~17:30", topic: "삼각함수의 정의와 그래프" },
        { session: "4회", date: "8월 5일", day: "수", time: "14:00~17:30", topic: "삼각함수의 그래프" },
        { session: "5회", date: "8월 6일", day: "목", time: "14:00~17:30", topic: "등차수열과 등비수열" },
        { session: "6회", date: "8월 7일", day: "금", time: "14:00~17:30", topic: "수열의 합" }
      ]
    }
  ],
  "고2": [
    {
      title: "고2 A1 미적분1 (10회) - 실력",
      subtitle: "미적분 주요 단원의 고난도 실전 심화 및 고득점 완성",
      timeInfo: "수/월 18:00 - 22:00",
      sessions: [
        { session: "1회", date: "7월 8일", day: "수", time: "18:00~22:00", topic: "함수의 극한" },
        { session: "2회", date: "7월 13일", day: "월", time: "18:00~22:00", topic: "함수의 연속" },
        { session: "3회", date: "7월 15일", day: "수", time: "18:00~22:00", topic: "미분계수와 도함수" },
        { session: "4회", date: "7월 20일", day: "월", time: "18:00~22:00", topic: "접선의 방정식" },
        { session: "5회", date: "7월 22일", day: "수", time: "18:00~22:00", topic: "그래프 해석의 도구 (증가감소/극대극소)" },
        { session: "6회", date: "7월 27일", day: "월", time: "18:00~22:00", topic: "다항함수의 그래프" },
        { session: "7회", date: "7월 29일", day: "수", time: "18:00~22:00", topic: "방정식과 부등식" },
        { session: "8회", date: "8월 3일", day: "월", time: "18:00~22:00", topic: "부정적분과 정적분" },
        { session: "9회", date: "8월 5일", day: "수", time: "18:00~22:00", topic: "정적분으로 정의된 함수" },
        { session: "10회", date: "8월 10일", day: "월", time: "18:00~22:00", topic: "넓이와 직선운동" }
      ]
    },
    {
      title: "영덕고2 1 S 공동수학2 (10회) - 실력+심화",
      subtitle: "영덕고 출제 경향에 맞춤 설계된 고난도 내신 및 심화 완성",
      timeInfo: "목/화 18:00 - 22:00",
      sessions: [
        { session: "1회", date: "7월 9일", day: "목", time: "18:00~22:00", topic: "평면좌표와 평면도형의 성질" },
        { session: "2회", date: "7월 14일", day: "화", time: "18:00~22:00", topic: "직선의 방정식" },
        { session: "3회", date: "7월 16일", day: "목", time: "18:00~22:00", topic: "원의 방정식" },
        { session: "4회", date: "7월 21일", day: "화", time: "18:00~22:00", topic: "도형의 이동" },
        { session: "5회", date: "7월 23일", day: "목", time: "18:00~22:00", topic: "집합" },
        { session: "6회", date: "7월 28일", day: "화", time: "18:00~22:00", topic: "명제" },
        { session: "7회", date: "7월 30일", day: "목", time: "18:00~22:00", topic: "함수" },
        { session: "8회", date: "8월 4일", day: "화", time: "18:00~22:00", topic: "합성함수와 역함수" },
        { session: "9회", date: "8월 6일", day: "목", time: "18:00~22:00", topic: "유리함수" },
        { session: "10회", date: "8월 11일", day: "화", time: "18:00~22:00", topic: "무리함수" }
      ]
    },
    {
      title: "고2 특강 기하 (7회) - 기본",
      subtitle: "기하 단원의 기본 이론 확립 및 핵심 유형 마스터",
      timeInfo: "토 18:30 - 22:00 / 화 09:00 - 12:30",
      sessions: [
        { session: "1회", date: "7월 11일", day: "토", time: "18:30~22:00", topic: "이차곡선의 정의" },
        { session: "2회", date: "7월 18일", day: "토", time: "18:30~22:00", topic: "이차곡선의 접선" },
        { session: "3회", date: "7월 25일", day: "토", time: "18:30~22:00", topic: "공간도형" },
        { session: "4회", date: "7월 28일", day: "화", time: "09:00~12:30", topic: "공간좌표" },
        { session: "5회", date: "8월 1일", day: "토", time: "18:30~22:00", topic: "벡터의 연산" },
        { session: "6회", date: "8월 4일", day: "화", time: "09:00~12:30", topic: "벡터의 내적" },
        { session: "7회", date: "8월 8일", day: "토", time: "18:30~22:00", topic: "벡터의 방정식" }
      ]
    }
  ]
};

export default function Summer() {
  const [location] = useLocation();
  const [activeTab, setActiveTab] = useState<"중등" | "고1" | "고2" | "고3">(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "중등" || tab === "고1" || tab === "고2" || tab === "고3") {
        return tab;
      }
    }
    return "중등";
  });

  const [expandedCurriculum, setExpandedCurriculum] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "중등" || tab === "고1" || tab === "고2" || tab === "고3") {
        setActiveTab(tab);
      }
    }
  }, [location]);

  const { data: images = [], isLoading } = useQuery<SummerImage[]>({
    queryKey: ["/api/summer-images"],
  });

  const { data: guidelines = [] } = useQuery<any[]>({
    queryKey: ["/api/summer-guidelines"],
  });

  // Filter images and guidelines by the active tab
  const filteredImages = images.filter((img) => (img.division || "중등") === activeTab);
  const filteredGuidelines = guidelines.filter((g) => g.division === activeTab);

  const grouped = filteredImages.reduce((acc: Record<string, SummerImage[]>, img) => {
    const key = img.teacher_name || "공통";
    if (!acc[key]) acc[key] = [];
    acc[key].push(img);
    return acc;
  }, {});

  const teacherNames = Object.keys(grouped).sort((a, b) => {
    if (a === "공통") return -1;
    if (b === "공통") return 1;
    return 0;
  });

  return (
    <SectionPage title={activeTab === "중등" ? "중3 썸머스쿨" : `${activeTab} 썸머스쿨`}>
      <div className="max-w-5xl mx-auto space-y-20 pb-32">
        
        {/* Tab Switcher */}
        <div className="flex justify-center pt-6">
          <div className="inline-flex p-1.5 bg-gray-100/80 backdrop-blur-sm rounded-2xl border border-gray-200/50">
            {(["중등", "고1", "고2", "고3"] as const).map((tab) => {
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                    active ? "text-white" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="activeSummerTab"
                      className="absolute inset-0 bg-[#7B2332] rounded-xl shadow-lg shadow-red-900/10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{tab === "중등" ? "중등 썸머" : `${tab} 썸머`}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hero Section */}
        <AnimatePresence mode="wait">
          <motion.section 
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="relative text-center space-y-6 pt-4"
          >
            <div className="inline-block px-4 py-1.5 bg-[#7B2332] text-white text-xs font-bold rounded-full mb-2">
              PREMIUM SUMMER PROGRAM
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-gray-900 leading-tight tracking-tight">
              2026 <span className="text-[#7B2332]">{activeTab === "중등" ? "중3 썸머스쿨" : `${activeTab} 썸머스쿨`}</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 font-medium max-w-2xl mx-auto leading-relaxed">
              대치·시대인재 출신 강사진과 함께하는<br />
              {activeTab === "중등" ? (
                <span className="text-gray-900 font-bold">관리형 스파르타 9 to 10 프로그램</span>
              ) : (
                <span className="text-gray-900 font-bold">대입 성공을 위한 수능·내신 극대화 프로그램</span>
              )}
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <div className="px-6 py-3 bg-red-50 border border-red-100 rounded-2xl">
                <p className="text-xs text-[#7B2332] font-bold mb-1 uppercase tracking-wider">Capacity</p>
                <p className="text-lg font-black text-gray-900">
                  {activeTab === "중등" ? "단 20명 소수정예" : "선착순 모집 마감 임박"}
                </p>
              </div>
              <div className="px-6 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
                <p className="text-xs text-blue-600 font-bold mb-1 uppercase tracking-wider">Care</p>
                <p className="text-lg font-black text-gray-900">
                  {activeTab === "중등" ? "집중 밀착 케어" : "1:1 오답 관리 및 피드백"}
                </p>
              </div>
            </div>
          </motion.section>
        </AnimatePresence>

        {/* Highlights & Schedule (Only for 중등) */}
        {activeTab === "중등" && (
          <>
            {/* Highlights Section */}
            <motion.section 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="space-y-12"
            >
              <div className="text-center space-y-3">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">영통이강만의 압도적인 관리 시스템</h2>
                <div className="w-16 h-1 bg-[#7B2332] mx-auto"></div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {HIGHLIGHTS.map((h, idx) => {
                  const Icon = h.icon;
                  return (
                    <motion.div 
                      key={h.num}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-red-900/5 hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
                          <Icon className="w-6 h-6 text-[#7B2332]" />
                        </div>
                        <span className="text-2xl font-black text-gray-100">{h.num}</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3 leading-snug">{h.title}</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">{h.desc}</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>

            {/* Schedule Section */}
            <motion.section 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="space-y-10"
            >
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b-2 border-gray-900 pb-5">
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">스파르타 9 to 10 학습 시간표</h2>
                  <p className="text-sm text-gray-500 font-medium">철저한 시간 관리와 몰입 학습을 통해 성적 향상을 보장합니다.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold bg-gray-100 px-3 py-1.5 rounded-lg text-gray-600">
                  <Clock className="w-3.5 h-3.5" />
                  월 - 일 운영
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="grid grid-cols-1">
                  {SCHEDULE.map((s, idx) => (
                    <div 
                      key={idx} 
                      className={`flex flex-col sm:flex-row items-center p-6 gap-4 sm:gap-10 border-b border-gray-100 last:border-0 ${s.type === "red" ? "bg-red-50/50" : s.type === "blue" ? "bg-blue-50/50" : ""}`}
                    >
                      <div className="w-full sm:w-48 text-center sm:text-left">
                        <span className={`text-sm font-black tracking-wider ${s.type === "red" ? "text-[#7B2332]" : s.type === "blue" ? "text-blue-600" : "text-gray-400"}`}>
                          {s.time}
                        </span>
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <p className={`text-base font-bold ${s.type === "red" ? "text-[#7B2332]" : s.type === "blue" ? "text-blue-600" : "text-gray-900"}`}>
                          {s.content}
                        </p>
                      </div>
                      {s.label && (
                        <div className={`px-3 py-1 ${s.type === "red" ? "bg-[#7B2332]" : "bg-blue-600"} text-white text-[10px] font-bold rounded-full`}>
                          {s.label}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>
          </>
        )}

        {/* 모집 요강 (Guidelines) Section */}
        {filteredGuidelines.length > 0 && (
          <section className="space-y-6 pt-10 border-t border-gray-100">
            <div className="flex items-center justify-between border-b-2 border-gray-900 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-6 bg-[#7B2332]" />
                <h2 className="text-2xl font-black text-gray-900">모집 요강</h2>
              </div>
              <div className="text-xs sm:text-sm font-semibold text-gray-400">
                2026 {activeTab === "중등" ? "중3" : activeTab} Summer School &nbsp;|&nbsp; Tel. 031-204-1353
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 overflow-hidden shadow-sm rounded-[2rem]">
              {filteredGuidelines.map((g) => (
                <div key={g.id} className="flex flex-col md:flex-row border-b border-gray-100 last:border-b-0">
                  <div className="w-full md:w-56 bg-slate-50/50 p-6 flex items-center justify-start md:justify-center border-b md:border-b-0 md:border-r border-gray-100">
                    <span className="font-bold text-gray-800 text-sm tracking-tight text-left md:text-center">
                      {g.title}
                    </span>
                  </div>
                  <div className="flex-1 p-6 bg-white whitespace-pre-line text-sm text-gray-600 leading-relaxed font-medium">
                    {g.content}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Existing Image Gallery */}
        <section className="space-y-10 pt-10 border-t border-gray-100">
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-extrabold text-gray-900">프로그램 상세 안내 및 브로셔</h2>
            <p className="text-sm text-gray-500">
              {activeTab} 썸머스쿨의 상세 계획과 일정을 확인하실 수 있습니다.
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-[#7B2332]" />
            </div>
          ) : filteredImages.length === 0 ? (
            (activeTab === "고1" || activeTab === "고2") ? (
              <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-sm text-gray-400 font-medium">
                국어/영어/과학 등 다른 과목의 세부 시간표와 브로셔는 준비 중입니다.
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-24 bg-white border border-gray-100 rounded-[2rem] shadow-sm space-y-6 flex flex-col items-center justify-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-red-50/10 via-transparent to-blue-50/10 opacity-50 pointer-events-none" />
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 animate-bounce">
                    <Clock className="w-10 h-10 text-[#7B2332]" />
                  </div>
                </div>
                <h3 className="relative z-10 text-5xl sm:text-7xl font-black text-gray-200 tracking-wider uppercase select-none font-mono">
                  Coming Soon
                </h3>
                <p className="relative z-10 text-base sm:text-lg text-gray-500 font-semibold max-w-md mx-auto leading-relaxed">
                  {activeTab} 썸머스쿨 프로그램 안내 및 시간표가<br />
                  곧 공개될 예정입니다. 잠시만 기다려주세요!
                </p>
              </motion.div>
            )
          ) : (
            teacherNames.map((name) => (
              <div key={name} className="space-y-6">
                <div className="flex items-center gap-3 border-b-2 border-gray-100 pb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${name === "공통" ? "bg-gray-100" : "bg-[#7B2332]/10"}`}>
                    <User className={`w-4 h-4 ${name === "공통" ? "text-gray-400" : "text-[#7B2332]"}`} />
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">{name}</h2>
                </div>
                
                <div className="flex flex-col gap-10">
                  {grouped[name].map((img) => (
                    <motion.div 
                      key={img.id} 
                      whileHover={{ scale: 1.01 }}
                      className="overflow-hidden rounded-[2rem] shadow-2xl shadow-black/5 border border-gray-100 bg-white"
                    >
                      <img
                        src={img.image_url}
                        alt={`${name} ${activeTab} 썸머스쿨`}
                        className="w-full h-auto block"
                        loading="lazy"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

        {/* Hwang Hae-ryong Curriculum Section (Only for 고1 / 고2) */}
        {(activeTab === "고1" || activeTab === "고2") && (
          <section className="space-y-8 pt-10 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#7B2332] flex-shrink-0 bg-white flex items-center justify-center">
                  <img
                    src="/images/teachers/hwang-haeryong.png"
                    alt="황해룡 선생님"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const fallback = document.createElement('div');
                        fallback.className = 'w-full h-full flex items-center justify-center bg-red-50';
                        fallback.innerHTML = '<svg class="w-6 h-6 text-[#7B2332]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">황해룡 선생님 수학 시간표 & 커리큘럼</h2>
                  <p className="text-sm text-gray-500 font-medium">{activeTab} 썸머스쿨 수학 정규반 및 특강 상세 안내</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-[#7B2332] text-xs font-bold rounded-lg border border-red-100">
                수학 황해룡T
              </div>
            </div>

            <div className="space-y-6">
              {HWANG_HR_CURRICULUM[activeTab].map((course) => {
                const isExpanded = expandedCurriculum === course.title;
                return (
                  <div key={course.title} className="bg-white border border-gray-200 rounded-[2rem] overflow-hidden shadow-sm transition-all duration-300 hover:border-gray-300">
                    <button
                      onClick={() => setExpandedCurriculum(isExpanded ? null : course.title)}
                      className="w-full text-left p-6 sm:p-8 flex items-center justify-between gap-4 focus:outline-none"
                    >
                      <div className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 bg-[#7B2332] text-white text-[10px] font-bold rounded">
                          수학 특강/정규
                        </span>
                        <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 leading-snug">{course.title}</h3>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium">{course.subtitle} &nbsp;|&nbsp; <span className="text-[#7B2332] font-semibold">{course.timeInfo}</span></p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 border border-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        {isExpanded ? (
                          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7" /></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" /></svg>
                        )}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="border-t border-gray-100 overflow-hidden"
                        >
                          <div className="p-6 sm:p-8 pt-0 space-y-6">
                            {course.note && (
                              <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl text-xs sm:text-sm text-amber-800 leading-relaxed font-medium">
                                {course.note}
                              </div>
                            )}

                            <div className="overflow-x-auto rounded-2xl border border-gray-100">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-4 text-xs font-bold text-gray-500 w-16 text-center">회차</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 w-28">날짜</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 w-16 text-center">요일</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 w-36">시간</th>
                                    <th className="p-4 text-xs font-bold text-gray-500">단원 / 주제</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {course.sessions.map((session, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                      <td className="p-4 text-xs sm:text-sm font-black text-gray-400 text-center">{session.session}</td>
                                      <td className="p-4 text-xs sm:text-sm font-bold text-gray-900">{session.date}</td>
                                      <td className="p-4 text-center">
                                        <span className={`inline-block w-6 py-0.5 rounded text-[11px] font-black text-center ${session.day === "토" || session.day === "일" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-600"}`}>
                                          {session.day}
                                        </span>
                                      </td>
                                      <td className="p-4 text-xs sm:text-sm font-semibold text-[#7B2332]">{session.time}</td>
                                      <td className="p-4 text-xs sm:text-sm font-medium text-gray-700">{session.topic}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Contact CTA */}
        <section className="bg-gray-900 rounded-[2rem] p-10 sm:p-16 text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] right-[-5%] w-64 h-64 rounded-full bg-[#7B2332] blur-3xl"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 rounded-full bg-blue-600 blur-3xl"></div>
          </div>
          
          <div className="relative space-y-4">
            <h2 className="text-2xl sm:text-4xl font-black text-white">지금 바로 썸머스쿨을 예약하세요</h2>
            <p className="text-gray-400 font-medium">우리 아이의 성적이 비약적으로 향상되는 터닝포인트가 시작됩니다.</p>
          </div>
          
          <div className="relative flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 pt-4">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                <Phone className="w-6 h-6" />
              </div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-2">전화 문의</p>
              <a href="tel:0312041353" className="text-xl sm:text-2xl font-black text-white hover:text-[#7B2332] transition-colors">031-204-1353</a>
            </div>
            <div className="w-px h-16 bg-white/10 hidden sm:block"></div>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-2">문자 전용</p>
              <a href="tel:01097641353" className="text-xl sm:text-2xl font-black text-white hover:text-blue-400 transition-colors">010-9764-1353</a>
            </div>
          </div>
        </section>
      </div>
    </SectionPage>
  );
}
