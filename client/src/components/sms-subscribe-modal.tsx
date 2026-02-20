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
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/sms-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
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
    if (!phone.trim()) return;
    mutation.mutate();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="modal-sms-subscribe"
    >
      <div
        className="bg-white w-full max-w-sm relative"
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
              className="mt-6 bg-[#7B2332] text-white px-6 py-2.5 text-sm font-semibold hover:bg-[#8B3040] transition-colors"
              data-testid="button-sms-done"
            >
              확인
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-red-600"
                placeholder="이름을 입력하세요"
                data-testid="input-sms-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                휴대폰 번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-red-600"
                placeholder="010-0000-0000"
                required
                data-testid="input-sms-phone"
              />
            </div>
            {mutation.isError && (
              <p className="text-xs text-red-500" data-testid="text-sms-error">
                {(mutation.error as Error).message}
              </p>
            )}
            <button
              type="submit"
              disabled={mutation.isPending || !phone.trim()}
              className="w-full bg-red-600 text-white py-2.5 text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
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
            <p className="text-xs text-gray-400 text-center">
              입력하신 정보는 학원 소식 전달 목적으로만 사용됩니다.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
