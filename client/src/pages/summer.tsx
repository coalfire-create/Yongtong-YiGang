import { useQuery } from "@tanstack/react-query";
import { SectionPage } from "@/components/layout";
import { Loader2, User, Target, BookOpen, Clock, Users, GraduationCap, Phone, MessageSquare, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

interface SummerImage {
  id: number;
  image_url: string;
  teacher_id: number | null;
  teacher_name: string | null;
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
    title: "매일 영어·매주 수학 필수 테스트 진행",
    desc: "고등 수능 영단어 매일 20분 간 테스트 진행 후 피드백을 제공하며, 수학 단원별 이해도 점검 및 취약 유형 오답 관리를 철저히 합니다.",
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
  { time: "08:00 - 08:40", content: "등원 및 자습준비", type: "blue" },
  { time: "08:40 - 09:00", content: "영단어 테스트 (총 18회)", type: "blue", label: "MUST TEST" },
  { time: "09:00 - 12:00", content: "수학 공수1/공수2 (기본·심화), 통과/국어(정규)", type: "red" },
  { time: "12:00 - 13:30", content: "점심식사" },
  { time: "13:30 - 17:00", content: "영어, 국어(정규), 물리(정규)", type: "red" },
  { time: "17:00 - 18:00", content: "저녁식사" },
  { time: "18:00 - 21:30", content: "자습 & 숙제 / 1:1 입시 컨설팅 / 수학 모의고사", type: "blue" },
  { time: "21:30 - 22:00", content: "점검 및 하원" },
];

export default function Summer() {
  const { data: images = [], isLoading } = useQuery<SummerImage[]>({
    queryKey: ["/api/summer-images"],
  });

  const grouped = images.reduce((acc: Record<string, SummerImage[]>, img) => {
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
    <SectionPage title="중3 썸머스쿨">
      <div className="max-w-5xl mx-auto space-y-24 pb-32">
        
        {/* Hero Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative text-center space-y-6 pt-10"
        >
          <div className="inline-block px-4 py-1.5 bg-[#7B2332] text-white text-xs font-bold rounded-full mb-4">
            PREMIUM SUMMER PROGRAM
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-gray-900 leading-tight tracking-tight">
            2026 <span className="text-[#7B2332]">중3 썸머스쿨</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 font-medium max-w-2xl mx-auto leading-relaxed">
            대치·시대인재 출신 강사진과 함께하는<br />
            <span className="text-gray-900 font-bold">관리형 스파르타 9 to 10 프로그램</span>
          </p>
          <div className="flex justify-center gap-3 pt-4">
            <div className="px-6 py-3 bg-red-50 border border-red-100 rounded-2xl">
              <p className="text-xs text-[#7B2332] font-bold mb-1 uppercase tracking-wider">Capacity</p>
              <p className="text-lg font-black text-gray-900">단 20명 소수정예</p>
            </div>
            <div className="px-6 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
              <p className="text-xs text-blue-600 font-bold mb-1 uppercase tracking-wider">Care</p>
              <p className="text-lg font-black text-gray-900">집중 밀착 케어</p>
            </div>
          </div>
        </motion.section>

        {/* Highlights Section */}
        <section className="space-y-12">
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
        </section>

        {/* Schedule Section */}
        <section className="space-y-10">
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
        </section>

        {/* Contact CTA */}
        <section className="bg-gray-900 rounded-[2rem] p-10 sm:p-16 text-center space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] right-[-5%] w-64 h-64 rounded-full bg-[#7B2332] blur-3xl"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 rounded-full bg-blue-600 blur-3xl"></div>
          </div>
          
          <div className="relative space-y-4">
            <h2 className="text-2xl sm:text-4xl font-black text-white">지금 바로 썸머스쿨을 예약하세요</h2>
            <p className="text-gray-400 font-medium">선착순 20명 마감 임박! 우리 아이의 대입 성공 전략이 시작됩니다.</p>
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

        {/* Existing Image Gallery */}
        <section className="space-y-10 pt-10 border-t border-gray-100">
          <div className="text-center space-y-3">
            <h2 className="text-2xl font-extrabold text-gray-900">프로그램 상세 안내 및 브로셔</h2>
            <p className="text-sm text-gray-500">각 선생님별 썸머스쿨 상세 계획을 확인하실 수 있습니다.</p>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-[#7B2332]" />
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-3xl">
              <p className="text-gray-400 font-medium">추가 등록된 브로셔가 없습니다.</p>
            </div>
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
                        alt={`${name} 썸머스쿨`}
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
      </div>
    </SectionPage>
  );
}
