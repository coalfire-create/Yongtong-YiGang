import { useState } from "react";
import { X, MessageSquare, ClipboardList, Loader2, Check } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

type ModalType = "sms" | "level" | null;

export function FloatingSidebar() {
  const [open, setOpen] = useState<ModalType>(null);

  return (
    <>
      <div
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col bg-white shadow-lg border border-gray-200 rounded-l-2xl overflow-hidden"
        data-testid="floating-sidebar"
      >
        <button
          onClick={() => setOpen("sms")}
          className="group flex flex-col items-center gap-1.5 px-3 py-4 w-[72px] hover:bg-gray-50 transition-colors border-b border-gray-100"
          data-testid="button-sidebar-sms"
          aria-label="문자 수신 신청"
        >
          <div className="w-10 h-10 rounded-full bg-[#7B2332]/10 flex items-center justify-center group-hover:bg-[#7B2332]/20 transition-colors">
            <MessageSquare className="w-5 h-5 text-[#7B2332]" />
          </div>
          <span className="text-[10px] font-semibold text-gray-600 leading-tight text-center whitespace-pre-line">
            {"문자수신\n신청"}
          </span>
        </button>

        <button
          onClick={() => setOpen("level")}
          className="group flex flex-col items-center gap-1.5 px-3 py-4 w-[72px] hover:bg-gray-50 transition-colors"
          data-testid="button-sidebar-level"
          aria-label="수학 레벨테스트 신청"
        >
          <div className="w-10 h-10 rounded-full bg-[#7B2332]/10 flex items-center justify-center group-hover:bg-[#7B2332]/20 transition-colors">
            <ClipboardList className="w-5 h-5 text-[#7B2332]" />
          </div>
          <span className="text-[10px] font-semibold text-gray-600 leading-tight text-center whitespace-pre-line">
            {"수학\n레벨테스트"}
          </span>
        </button>
      </div>

      {open === "sms" && <SmsModal onClose={() => setOpen(null)} />}
      {open === "level" && <LevelTestModal onClose={() => setOpen(null)} />}
    </>
  );
}

function SmsModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [school, setSchool] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/sms-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, school, grade }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "신청 실패");
      }
      return res.json();
    },
    onSuccess: () => setDone(true),
  });

  const inputCls = "w-full border border-gray-300 rounded-md px-4 py-3 text-sm bg-gray-50 focus:outline-none focus:border-[#7B2332] focus:bg-white transition-colors";
  const labelCls = "block text-sm font-semibold text-gray-800 mb-1.5";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="modal-sms-subscribe"
    >
      <div
        className="bg-white w-full max-w-sm rounded-xl shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#7B2332] text-white px-6 py-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            data-testid="button-sms-close"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold">문자 수신 신청</h2>
          <p className="text-sm text-white/70 mt-0.5">학원 소식을 문자로 받아보세요</p>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">신청이 완료되었습니다</p>
            <p className="text-sm text-gray-500 mt-2">학원 소식을 문자로 보내드리겠습니다.</p>
            <button
              onClick={onClose}
              className="mt-6 bg-[#7B2332] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#8B3040] transition-colors rounded-md"
              data-testid="button-sms-done"
            >
              확인
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
            className="px-6 py-5 space-y-4"
          >
            <div>
              <label className={labelCls}>이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="이름을 입력해 주세요."
                data-testid="input-sms-name"
              />
            </div>
            <div>
              <label className={labelCls}>
                학년 <span className="text-red-500">*</span>
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                required
                className={inputCls + " appearance-none cursor-pointer"}
                data-testid="select-sms-grade"
              >
                <option value="">선택</option>
                <option value="초4">초4</option>
                <option value="초5">초5</option>
                <option value="초6">초6</option>
                <option value="중1">중1</option>
                <option value="중2">중2</option>
                <option value="중3">중3</option>
                <option value="고1">고1</option>
                <option value="고2">고2</option>
                <option value="고3">고3</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>
                학교 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                required
                className={inputCls}
                placeholder="학교명을 입력해 주세요."
                data-testid="input-sms-school"
              />
            </div>
            <div>
              <label className={labelCls}>
                부모님 휴대폰 번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                required
                maxLength={11}
                className={inputCls}
                placeholder="(-) 없이 숫자만 입력"
                data-testid="input-sms-phone"
              />
            </div>

            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer" data-testid="label-sms-agree">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#7B2332] flex-shrink-0"
                  data-testid="checkbox-sms-agree"
                />
                <span className="text-sm font-semibold text-gray-800">
                  개인정보 수집 및 이용동의{" "}
                  <span className="text-red-500">(필수)</span>
                </span>
              </label>
              <div className="text-xs text-gray-500 space-y-1 pl-6 leading-relaxed">
                <p>[수집 목적] 학교/학년 및 계열에 따른 입시정보 및 설명회, 수업안내 SMS 발송</p>
                <p>[수집 항목] 이름, 계열, 학교, 학년, 학부모 휴대폰 번호</p>
                <p>[수집 기한] 3년</p>
                <p>신청자는 개인정보 수집에 동의하지 않을 수 있으나, 문자 수신 신청을 하실 수 없습니다.</p>
              </div>
            </div>

            {mutation.isError && (
              <p className="text-xs text-red-500" data-testid="text-sms-error">
                {(mutation.error as Error).message}
              </p>
            )}
            <button
              type="submit"
              disabled={mutation.isPending || !phone.trim() || !grade || !school.trim() || !agreed}
              className="w-full bg-[#7B2332] text-white py-3.5 text-sm font-bold hover:bg-[#8B3040] disabled:opacity-40 transition-colors flex items-center justify-center gap-2 rounded-md"
              data-testid="button-sms-submit"
            >
              {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />신청 중...</> : "신청하기"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function LevelTestModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");
  const [grade, setGrade] = useState("");
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/level-test-registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, school, grade }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "신청 실패");
      }
      return res.json();
    },
    onSuccess: () => setDone(true),
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="modal-level-test"
    >
      <div
        className="bg-white w-full max-w-sm relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#7B2332] text-white px-6 py-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            data-testid="button-level-close"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold">수학 레벨테스트 신청</h2>
          <p className="text-sm text-white/60 mt-1">학생에게 맞는 수준을 진단합니다</p>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">신청이 완료되었습니다</p>
            <p className="text-sm text-gray-500 mt-2">빠른 시간 내에 연락드리겠습니다.</p>
            <button
              onClick={onClose}
              className="mt-6 bg-[#7B2332] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#8B3040] transition-colors"
              data-testid="button-level-done"
            >
              확인
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
            className="px-6 py-6 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                학생 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#7B2332]"
                placeholder="이름을 입력하세요"
                required
                data-testid="input-level-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                연락처 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#7B2332]"
                placeholder="010-0000-0000"
                required
                data-testid="input-level-phone"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">학교</label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#7B2332]"
                  placeholder="학교명"
                  data-testid="input-level-school"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-[#7B2332] bg-white"
                  data-testid="select-level-grade"
                >
                  <option value="">선택</option>
                  <option value="초4">초4</option>
                  <option value="초5">초5</option>
                  <option value="초6">초6</option>
                  <option value="중1">중1</option>
                  <option value="중2">중2</option>
                  <option value="중3">중3</option>
                  <option value="고1">고1</option>
                  <option value="고2">고2</option>
                  <option value="고3">고3</option>
                </select>
              </div>
            </div>
            {mutation.isError && (
              <p className="text-xs text-red-500" data-testid="text-level-error">
                {(mutation.error as Error).message}
              </p>
            )}
            <button
              type="submit"
              disabled={mutation.isPending || !name.trim() || !phone.trim()}
              className="w-full bg-[#7B2332] text-white py-2.5 text-sm font-bold hover:bg-[#8B3040] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              data-testid="button-level-submit"
            >
              {mutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />신청 중...</> : "레벨테스트 신청"}
            </button>
            <p className="text-xs text-gray-400 text-center">
              입력하신 정보는 레벨테스트 안내 목적으로만 사용됩니다.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
