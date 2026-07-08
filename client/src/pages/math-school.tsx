import { PageLayout } from "@/components/layout";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Trophy, Target, BookOpen, Clock, Users, GraduationCap, Phone, MessageSquare, Star, TrendingUp, ShieldCheck, ArrowRight } from "lucide-react";
import { MathLevelTestModal } from "@/components/math-level-test-modal";

const HIGHLIGHTS = [
  {
    icon: Trophy,
    title: "개원 2년의 압도적 성과",
    desc: "개원 2년 만에 이룬 성과는 우연이 아닌, 검증된 수업 구조와 관리 시스템의 결과입니다.",
  },
  {
    icon: Users,
    title: "강력한 강사진",
    desc: "대치·시대인재 등 검증된 실력파 강사진의 압도적인 강의력이 성적을 만듭니다.",
  },
  {
    icon: Target,
    title: "치밀한 관리 시스템",
    desc: "학생마다 다른 문제를 다른 방식으로 해결하는 맞춤 지도, 그것이 성적 상승의 핵심입니다.",
  },
];

const CLASS_INFO = [
  {
    grade: "고1",
    classes: [
      { name: "의치서 M반", teacher: "최주용T", image: "/images/teachers/choi-juyong.png", description: "1등급 중에서도 내신 1.0 최상위권만 모이는 의치서 M반!", highlight: true },
      { name: "S반", teacher: "최주용T", image: "/images/teachers/choi-juyong.png", description: "최상위권을 확실하게 만드는 최상위권 전문반", highlight: true },
      { name: "A반", teacher: "강헌T", image: "/images/teachers/kang-heon.jpeg", description: "수학의 핵심 원리 파악과 완벽한 내신 대비", highlight: false },
      { name: "A1반", teacher: "권소영T", image: "/images/teachers/kwon-soyoung.png", description: "출제 유형 분석과 반복 훈련을 통한 성적 상승", highlight: false },
    ]
  },
  {
    grade: "고2",
    classes: [
      { name: "S반", teacher: "최주용T", image: "/images/teachers/choi-juyong.png", description: "최상위권을 확실하게 만드는 최상위권 전문반", highlight: true },
      { name: "A1반", teacher: "황해룡T", image: "/images/teachers/hwang-haeryong.png", description: "성적 상승을 이끌어내는 실전 응용 및 오답 관리", highlight: false },
      { name: "A1반", teacher: "권소영T", image: "/images/teachers/kwon-soyoung.png", description: "출제 유형 분석과 반복 훈련을 통한 성적 상승", highlight: false },
      { name: "A2반", teacher: "임서원T", image: "/images/teachers/lim-seowon.png", description: "기초부터 확실히 잡는 개념 및 성적 상승 기반 구축", highlight: false },
    ]
  }
];

const SYSTEM_STEPS = [
  { step: "01", title: "이해", desc: "개념의 완벽한 이해" },
  { step: "02", title: "적용", desc: "유형별 문제 적용 훈련" },
  { step: "03", title: "반복", desc: "취약 단원 무한 반복" },
  { step: "04", title: "점검", desc: "테스트를 통한 실전 점검" },
];

export default function MathSchool() {
  const [showLevelTestModal, setShowLevelTestModal] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState("고1");

  const { data: teachers } = useQuery<any[]>({
    queryKey: ["/api/teachers"],
    queryFn: async () => {
      const res = await fetch("/api/teachers");
      if (!res.ok) throw new Error("Failed to fetch teachers");
      return res.json();
    }
  });

  const filteredClassInfo = teachers
    ? CLASS_INFO.map(gradeInfo => {
        const filteredClasses = gradeInfo.classes.filter(cls => {
          const baseName = cls.teacher.replace(/T$/, "").trim();
          return teachers.some((t: any) => t.name.trim() === baseName);
        });
        return {
          ...gradeInfo,
          classes: filteredClasses
        };
      })
    : CLASS_INFO;
  return (
    <PageLayout>
      <div className="bg-[#7B2332] text-white overflow-hidden relative">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-96 h-96 rounded-full bg-yellow-500 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 rounded-full bg-red-400 blur-[120px]"></div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-20 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-yellow-400 text-xs font-bold rounded-full mb-4">
              <Trophy className="w-3.5 h-3.5" />
              PREMIUM MATH ACADEMY
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
              성적을 만드는 <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-500 to-yellow-200">수학스쿨</span>
            </h1>
            <p className="text-xl md:text-2xl font-medium text-white/80 max-w-3xl mx-auto leading-relaxed">
              개원 2년 만에 증명한 결과,<br />
              강력한 강사진, 압도적인 강의력, 치밀한 시스템이 성적을 만듭니다.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-24 space-y-32">
        {/* Why Math School Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {HIGHLIGHTS.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 space-y-6"
            >
              <div className="w-14 h-14 bg-[#7B2332]/5 rounded-2xl flex items-center justify-center">
                <item.icon className="w-7 h-7 text-[#7B2332]" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed text-sm">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </section>

        {/* Level Based Class Section */}
        <section className="space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">수준별 완전 분리 수업</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">같은 교재, 같은 수업이 아닌 학생 수준에 맞춘 맞춤형 커리큘럼으로<br />불필요한 낭비 없이 효율적인 학습을 진행합니다.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* S-Class */}
            <motion.div 
              whileHover={{ y: -10 }}
              className="p-10 rounded-[2.5rem] bg-white border border-gray-200 shadow-xl space-y-6 overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Star className="w-20 h-20 text-yellow-500" />
              </div>
              <div className="relative z-10 space-y-6">
                <div className="inline-block px-3 py-1 bg-yellow-50 text-yellow-600 text-[10px] font-black rounded-full uppercase tracking-widest">Elite Only</div>
                <h3 className="text-3xl font-black tracking-tight text-gray-900">S반 <span className="text-yellow-600 text-lg block mt-1">TOP-TIER CERTAINTY</span></h3>
                <p className="text-gray-600 text-sm leading-relaxed font-medium">최상위권을 확실하게 만듭니다. 최상위들만 모여 경쟁하며 압도적인 실력을 완성합니다.</p>
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-yellow-600" />
                    내신 1등급 필승 전략
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-yellow-600" />
                    킬러 문항 정복 훈련
                  </div>
                </div>
              </div>
            </motion.div>

            {/* A1-Class */}
            <motion.div 
              whileHover={{ y: -10 }}
              className="p-10 rounded-[2.5rem] bg-white border border-gray-200 shadow-xl space-y-6"
            >
              <div className="space-y-6">
                <div className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest">Jump Up</div>
                <h3 className="text-3xl font-black tracking-tight text-gray-900">A1반 <span className="text-blue-600 text-lg block mt-1">SCORE BOOSTING</span></h3>
                <p className="text-gray-600 text-sm leading-relaxed">최상위권으로의 도약을 위해 출제 유형 분석과 반복 훈련을 통해 실수를 줄이고 점수를 완성합니다.</p>
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                    출제 유형 정밀 분석
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                    실수 제로화 무한 반복
                  </div>
                </div>
              </div>
            </motion.div>

            {/* A2-Class */}
            <motion.div 
              whileHover={{ y: -10 }}
              className="p-10 rounded-[2.5rem] bg-white border border-gray-200 shadow-xl space-y-6"
            >
              <div className="space-y-6">
                <div className="inline-block px-3 py-1 bg-red-50 text-[#7B2332] text-[10px] font-black rounded-full uppercase tracking-widest">Solid Base</div>
                <h3 className="text-3xl font-black tracking-tight text-gray-900">A2반 <span className="text-[#7B2332] text-lg block mt-1">FOUNDATION FIRST</span></h3>
                <p className="text-gray-600 text-sm leading-relaxed">개념부터 다시 잡아주며, 막혀 있던 수학 흐름을 풀어 성적 상승의 기반을 만드는 완벽한 기초 강화반입니다.</p>
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#7B2332]" />
                    개념 정립 및 흐름 파악
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#7B2332]" />
                    성적 상승 기초 탄탄
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 4 Step System */}
        <section className="bg-gray-50 rounded-[3rem] p-12 md:p-20 overflow-hidden relative space-y-16">
          {/* Background Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-96 h-96 rounded-full bg-red-600 blur-[150px]"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-96 h-96 rounded-full bg-blue-600 blur-[150px]"></div>
          </div>

          {/* Part 1: 4단계 학습 구조 */}
          <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center lg:items-start">
            <div className="w-full lg:w-1/3 space-y-4 text-center lg:text-left">
              <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight">단순 진도가 아닌<br /><span className="text-[#7B2332]">4단계 학습 구조</span></h2>
              <p className="text-gray-600 text-base leading-relaxed">
                이해부터 점검까지, 영통이강학원만의 독보적인 4단계 관리 시스템으로 학생별 취약 단원을 완벽하게 보완합니다.
              </p>
            </div>
            <div className="w-full lg:w-2/3 grid grid-cols-2 md:grid-cols-4 gap-4">
              {SYSTEM_STEPS.map((s) => (
                <div key={s.step} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-2 text-center lg:text-left">
                  <span className="text-[#7B2332] font-black text-lg">{s.step}</span>
                  <h4 className="font-bold text-gray-900">{s.title}</h4>
                  <p className="text-xs text-gray-500">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-200/80 relative z-10" />

          {/* Part 2: 독보적인 내신 대비 콘텐츠 */}
          <div className="relative z-10 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-center lg:justify-start">
              <div className="w-12 h-12 bg-[#7B2332] rounded-xl flex items-center justify-center text-white mx-auto sm:mx-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-2xl md:text-3xl font-black text-gray-900 text-center sm:text-left">독보적인 내신 대비 콘텐츠</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="group p-6 md:p-8 bg-white rounded-[2rem] border border-gray-150 shadow-lg hover:border-[#7B2332]/20 hover:shadow-xl transition-all duration-350 flex flex-col sm:flex-row gap-6 items-center">
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <h4 className="font-black text-[#7B2332] uppercase tracking-wider text-xs">Secret File</h4>
                  <p className="text-gray-900 font-extrabold text-lg">학교별 내신분석자료</p>
                  <p className="text-xs text-gray-500 leading-relaxed">각 학교별 출제 경향을 깊고 날카롭게 분석하여 완벽한 대비를 돕는 시크릿 파일 제공</p>
                </div>
                <div className="w-full sm:w-40 rounded-xl overflow-hidden border border-gray-200/60 shadow-sm flex-shrink-0 bg-white">
                  <img src="/images/secret-file-covers.png" alt="Secret File Covers" className="w-full h-auto block" />
                </div>
              </div>
              <div className="group p-6 md:p-8 bg-white rounded-[2rem] border border-gray-150 shadow-lg hover:border-[#7B2332]/20 hover:shadow-xl transition-all duration-350 flex flex-col sm:flex-row gap-6 items-center">
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <h4 className="font-black text-[#7B2332] uppercase tracking-wider text-xs">Su-Mock Exam</h4>
                  <p className="text-gray-900 font-extrabold text-lg">매주 응시하는 수모의고사</p>
                  <p className="text-xs text-gray-500 leading-relaxed">실전과 동일한 환경에서의 매주 테스트를 통해 실전 감각을 극대화하고 약점 분석</p>
                </div>
                <div className="w-full sm:w-40 rounded-xl overflow-hidden border border-gray-200/60 shadow-sm flex-shrink-0 bg-white">
                  <img src="/images/mock-exam-covers.png" alt="Su-Mock Exam Covers" className="w-full h-auto block" />
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Teacher / Class List Section */}
        <section className="space-y-16 max-w-[1200px] mx-auto pt-10">
          <div className="text-center space-y-6">
            <h2 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight">강의 안내</h2>
            <p className="text-gray-500 text-lg md:text-xl font-medium">영통이강 수학스쿨만의 학년별 수준 맞춤 커리큘럼</p>
          </div>

          <div className="flex flex-col items-center gap-12">
            {/* Premium Tab Switcher */}
            <div className="inline-flex p-2 bg-gray-100/80 backdrop-blur-sm rounded-[2.5rem] border border-gray-200/50 shadow-inner">
              {filteredClassInfo.map((gradeInfo) => (
                <button
                  key={gradeInfo.grade}
                  onClick={() => setSelectedGrade(gradeInfo.grade)}
                  className={`relative px-12 md:px-20 py-5 rounded-[2rem] text-xl md:text-2xl font-black transition-all duration-500 ${
                    selectedGrade === gradeInfo.grade
                      ? "bg-white text-[#7B2332] shadow-2xl shadow-red-900/10 scale-105 z-10"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {gradeInfo.grade}
                  {selectedGrade === gradeInfo.grade && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white rounded-[2rem] -z-10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Class Cards List */}
            <div className="w-full space-y-10">
              {filteredClassInfo.find(g => g.grade === selectedGrade)?.classes.map((cls, idx) => (
                <motion.div
                  key={`${selectedGrade}-${idx}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className={`group p-8 md:p-10 rounded-[3rem] border transition-all duration-500 flex flex-col md:flex-row items-center gap-12 ${
                    cls.highlight 
                      ? "bg-gradient-to-br from-white to-red-50/30 border-red-100 shadow-2xl shadow-red-900/5 hover:translate-y-[-5px]" 
                      : "bg-white border-gray-100 shadow-xl hover:border-[#7B2332]/20 hover:translate-y-[-5px]"
                  }`}
                >
                  {/* Teacher Photo(s) */}
                  <div className="flex -space-x-8 md:-space-x-12 group-hover:-space-x-6 md:group-hover:-space-x-8 transition-all duration-500">
                    {(cls as any).images ? (cls as any).images.map((img: string, i: number) => (
                      <div key={i} className="w-36 h-36 md:w-56 md:h-56 rounded-[2.5rem] overflow-hidden flex-shrink-0 border-8 border-white bg-gray-50 shadow-2xl transition-transform duration-500 group-hover:scale-105 relative z-[10-i]">
                        <img src={img} alt={(cls as any).teachers ? (cls as any).teachers[i] : (cls as any).teacher} className="w-full h-full object-cover" />
                      </div>
                    )) : (cls as any).image && (
                      <div className="w-36 h-36 md:w-56 md:h-56 rounded-[2.5rem] overflow-hidden flex-shrink-0 border-8 border-gray-50/50 bg-gray-50 shadow-2xl transition-transform duration-500 group-hover:scale-105">
                        <img src={(cls as any).image} alt={(cls as any).teacher} className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 w-full space-y-8">
                    <div className="flex flex-col lg:flex-row justify-between items-center lg:items-start gap-10">
                      <div className="space-y-4 text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-4 flex-wrap">
                          <h4 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">{cls.name}</h4>
                          {cls.highlight && (
                            <div className="flex items-center gap-1 px-4 py-1.5 bg-[#7B2332] text-white text-[11px] font-black rounded-full uppercase tracking-wider shadow-lg shadow-red-900/20">
                              <Star className="w-3 h-3 fill-current" />
                              Premium
                            </div>
                          )}
                        </div>
                        <p className="text-gray-500 text-lg md:text-xl font-medium leading-relaxed max-w-2xl">{cls.description}</p>
                        
                        <div className="flex flex-wrap justify-center lg:justify-start gap-3 pt-2">
                          <span className="px-4 py-2 bg-gray-50 text-gray-400 text-xs font-bold rounded-xl border border-gray-100">내신 완벽 대비</span>
                          <span className="px-4 py-2 bg-gray-50 text-gray-400 text-xs font-bold rounded-xl border border-gray-100">수준별 맞춤 교재</span>
                          <span className="px-4 py-2 bg-gray-50 text-gray-400 text-xs font-bold rounded-xl border border-gray-100">밀착 관리 시스템</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-center lg:items-end flex-shrink-0 bg-gray-50/50 p-8 rounded-[2.5rem] w-full lg:w-auto border border-gray-100 shadow-inner">
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Main Instructor</p>
                        <p className="text-3xl md:text-4xl font-black text-[#7B2332] whitespace-nowrap">
                          {(cls as any).teachers ? (cls as any).teachers.join(" & ") : (cls as any).teacher}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-[#7B2332]/60 text-xs font-bold bg-white px-3 py-1 rounded-full border border-red-50/50 shadow-sm">
                          <Users className="w-3.5 h-3.5" />
                          마감 임박
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA Section */}
        <section className="bg-gray-900 rounded-[3rem] p-12 md:p-20 text-center space-y-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-20%] right-[-10%] w-96 h-96 rounded-full bg-red-600 blur-[150px]"></div>
            <div className="absolute bottom-[-20%] left-[-10%] w-96 h-96 rounded-full bg-blue-600 blur-[150px]"></div>
          </div>
          
          <div className="relative space-y-6">
            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
              지금 성적이 아니라,<br />
              <span className="text-yellow-400">앞으로의 성적을 바꾸는</span> 수업을 합니다.
            </h2>
            <p className="text-gray-400 text-lg md:text-xl font-medium max-w-2xl mx-auto">
              수학은 제대로 된 훈련이 결과를 만듭니다.<br />
              2년의 결과가 증명합니다. 이제는 당신의 차례입니다.
            </p>
            <div className="pt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowLevelTestModal(true)}
                className="px-8 py-4 bg-yellow-400 text-gray-900 text-lg font-black rounded-full shadow-xl shadow-yellow-400/20 flex items-center gap-2 mx-auto hover:bg-yellow-300 transition-colors"
              >
                수학 레벨테스트 신청하기
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
          
          <div className="relative flex flex-col sm:flex-row justify-center items-center gap-12 pt-8" id="sms-apply">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-white mx-auto group-hover:bg-white/10 transition-colors">
                <Phone className="w-8 h-8 text-yellow-400" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Enrollment Inquiry</p>
                <a href="tel:0312041353" className="text-3xl font-black text-white hover:text-yellow-400 transition-colors">031-204-1353</a>
              </div>
            </div>
            <div className="hidden sm:block w-px h-24 bg-white/10"></div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-white mx-auto">
                <MessageSquare className="w-8 h-8 text-yellow-400" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Text Message Only</p>
                <a href="tel:01077372843" className="text-3xl font-black text-white hover:text-yellow-400 transition-colors">010-7737-2843</a>
              </div>
            </div>
          </div>
        </section>

        {/* Posters / Banners Section */}
        <section className="space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900">영통이강 수학스쿨 소식</h2>
            <p className="text-gray-500 font-medium">최신 교육 정보와 특별 프로그램 안내입니다.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((num) => (
              <motion.div
                key={num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: num * 0.1 }}
                whileHover={{ y: -10 }}
                className="rounded-[2.5rem] overflow-hidden shadow-2xl border border-gray-100 bg-white"
              >
                <img 
                  src={`/images/posters/poster-${num}.jpg`} 
                  alt={`수학스쿨 포스터 ${num}`} 
                  className="w-full h-auto block"
                />
              </motion.div>
            ))}
          </div>
        </section>
      </div>
      
      <MathLevelTestModal 
        open={showLevelTestModal} 
        onClose={() => setShowLevelTestModal(false)}
      />
    </PageLayout>
  );
}
