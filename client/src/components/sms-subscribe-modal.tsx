import { useState } from "react";
import { X, MessageSquare, Loader2, Check } from "lucide-react";
import { useMutation } from "@tanstack/react-query";

export function SmsSubscribeButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-20 z-40 w-14 h-14 bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-red-700 transition-colors"
        data-testid="button-sms-subscribe-open"
        aria-label="문자 수신 신청"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
      {open && <SmsSubscribeModal onClose={() => setOpen(false)} />}
    </>
  );
}

function SmsSubscribeModal({ onClose }: { onClose: () => void }) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !grade || !school.trim() || !agreed) return;
    mutation.mutate();
  };

  const inputCls = "w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-red-600 bg-gray-50 focus:bg-white transition-colors";
  const labelCls = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="modal-sms-subscribe"
    >
      <div
        className="bg-white w-full max-w-sm relative shadow-2xl rounded-lg overflow-hidden"
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
          <p className="text-sm text-white/60 mt-1">학원 소식을 문자로 받아보세요</p>
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
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
            <div>
              <label className={labelCls}>이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="이름을 입력하세요"
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
                className={inputCls}
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
                placeholder="학교명을 입력하세요"
                data-testid="input-sms-school"
              />
            </div>
            <div>
              <label className={labelCls}>
                휴대폰 번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                className={inputCls}
                placeholder="(-) 없이 숫자만 입력"
                required
                maxLength={11}
                data-testid="input-sms-phone"
              />
            </div>

            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-[#7B2332]"
                />
                <span className="text-xs font-semibold text-gray-800">
                  개인정보 수집 및 이용동의 (필수)
                </span>
              </label>
              <div className="text-[10px] text-gray-500 pl-6 leading-tight">
                <p>수집 목적: 학원 소식 발송 | 수집 항목: 이름, 학교, 학년, 휴대폰 번호 | 보유 기간: 3년</p>
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
              className="w-full bg-[#7B2332] text-white py-3 text-sm font-bold hover:bg-[#8B3040] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 rounded-md"
              data-testid="button-sms-submit"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  신청 중...
                </>
              ) : (
                "문자 수신 신청"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
