import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { X, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MathLevelTestModalProps {
  open: boolean;
  onClose: () => void;
}

export function MathLevelTestModal({ open, onClose }: MathLevelTestModalProps) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [school, setSchool] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const mutation = useMutation({
    mutationFn: async (data: { name: string; grade: string; school: string; phone: string }) => {
      const res = await apiRequest("POST", "/api/level-test-registrations", data);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "신청 실패");
      }
      return res.json();
    },
    onSuccess: () => {
      alert("레벨테스트 신청이 완료되었습니다.");
      setName("");
      setGrade("");
      setSchool("");
      setPhone("");
      setAgreed(false);
      setErrors({});
      onClose();
    },
    onError: (err: Error) => {
      alert(err.message);
    },
  });

  const formatPhone = (value: string) => {
    const nums = value.replace(/[^0-9]/g, "").slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "이름을 입력해 주세요.";
    if (!grade) newErrors.grade = "학년을 선택해 주세요.";
    if (!school.trim()) newErrors.school = "학교명을 입력해 주세요.";
    if (!phone.trim()) {
      newErrors.phone = "전화번호를 입력해 주세요.";
    } else if (!/^01[0-9]-?\d{3,4}-?\d{4}$/.test(phone.replace(/\s/g, ""))) {
      newErrors.phone = "올바른 전화번호 형식으로 입력해 주세요.";
    }
    if (!agreed) newErrors.agreed = "개인정보 수집에 동의해 주세요.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    mutation.mutate({
      name: name.trim(),
      grade,
      school: school.trim(),
      phone: phone.trim(),
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[440px] bg-white rounded-[2rem] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="bg-[#7B2332] p-8 text-center relative">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-1 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <h2 className="text-2xl font-black text-white mb-1">수학 레벨테스트 신청</h2>
              <p className="text-white/70 text-sm font-medium">학생에게 맞는 수준을 진단합니다</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-900 flex items-center gap-1">
                  학생 이름 <span className="text-[#7B2332]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름을 입력해 주세요."
                  className={`w-full px-4 py-3.5 bg-gray-50 border rounded-xl text-sm transition-all outline-none ${
                    errors.name ? "border-red-400 ring-4 ring-red-400/10" : "border-gray-200 focus:border-[#7B2332] focus:ring-4 focus:ring-[#7B2332]/10"
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-900 flex items-center gap-1">
                  학년 <span className="text-[#7B2332]">*</span>
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className={`w-full px-4 py-3.5 bg-gray-50 border rounded-xl text-sm transition-all outline-none appearance-none ${
                    errors.grade ? "border-red-400 ring-4 ring-red-400/10" : "border-gray-200 focus:border-[#7B2332] focus:ring-4 focus:ring-[#7B2332]/10"
                  }`}
                >
                  <option value="">선택</option>
                  <option value="초등">초등</option>
                  <option value="중1">중1</option>
                  <option value="중2">중2</option>
                  <option value="중3">중3</option>
                  <option value="고1">고1</option>
                  <option value="고2">고2</option>
                  <option value="고3">고3</option>
                  <option value="N수">N수</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-900 flex items-center gap-1">
                  학교 <span className="text-[#7B2332]">*</span>
                </label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="학교명을 입력해 주세요."
                  className={`w-full px-4 py-3.5 bg-gray-50 border rounded-xl text-sm transition-all outline-none ${
                    errors.school ? "border-red-400 ring-4 ring-red-400/10" : "border-gray-200 focus:border-[#7B2332] focus:ring-4 focus:ring-[#7B2332]/10"
                  }`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-900 flex items-center gap-1">
                  부모님 휴대폰 번호 <span className="text-[#7B2332]">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(-) 없이 숫자만 입력"
                  className={`w-full px-4 py-3.5 bg-gray-50 border rounded-xl text-sm transition-all outline-none ${
                    errors.phone ? "border-red-400 ring-4 ring-red-400/10" : "border-gray-200 focus:border-[#7B2332] focus:ring-4 focus:ring-[#7B2332]/10"
                  }`}
                />
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border transition-all ${
                      agreed ? "bg-[#7B2332] border-[#7B2332]" : "bg-white border-gray-300 group-hover:border-gray-400"
                    }`}>
                      {agreed && <Check className="w-3.5 h-3.5 text-white stroke-[4]" />}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 leading-relaxed">
                    <span className="font-bold text-[#7B2332]">개인정보 수집 및 이용동의 (필수)</span>
                    <br />
                    [수집 목적] 수학 레벨테스트 일정 안내 및 결과 상담 연락
                    <br />
                    [수집 항목] 이름, 학교, 학년, 학부모 휴대폰 번호
                    <br />
                    [수집 기한] 3년
                  </div>
                </label>
                {errors.agreed && <p className="text-xs text-red-500 mt-2">{errors.agreed}</p>}
              </div>

              <button
                type="submit"
                disabled={mutation.isPending}
                className="w-full py-4 bg-[#7B2332]/30 text-[#7B2332] hover:bg-[#7B2332] hover:text-white disabled:opacity-50 transition-all font-black rounded-2xl flex items-center justify-center gap-2"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    신청 중...
                  </>
                ) : (
                  "신청하기"
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
