import { useState, useEffect, createContext, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { X, Phone, Loader2, User, LogOut } from "lucide-react";

interface AuthMember {
  id: number;
  name: string;
  provider: string;
}

interface AuthContextType {
  member: AuthMember | null;
  isLoading: boolean;
  openLoginModal: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  member: null,
  isLoading: true,
  openLoginModal: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useQuery<{ loggedIn: boolean; member?: AuthMember }>({
    queryKey: ["/api/auth/me"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const member = data?.loggedIn ? data.member || null : null;

  return (
    <AuthContext.Provider
      value={{
        member,
        isLoading,
        openLoginModal: () => setModalOpen(true),
        logout: () => logoutMutation.mutate(),
      }}
    >
      {children}
      {modalOpen && <LoginModal onClose={() => setModalOpen(false)} />}
    </AuthContext.Provider>
  );
}

export function AuthHeaderButton() {
  const { member, isLoading, openLoginModal, logout } = useAuth();

  if (isLoading) return null;

  if (member) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-sm text-gray-700" data-testid="text-auth-user">
          <User className="w-4 h-4" />
          <span className="font-medium max-w-[80px] truncate">{member.name || "회원"}</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1"
          data-testid="button-logout"
        >
          <LogOut className="w-3.5 h-3.5" />
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={openLoginModal}
      className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors"
      style={{ borderRadius: "4px" }}
      data-testid="button-login-open"
    >
      <User className="w-4 h-4" />
      로그인
    </button>
  );
}

type LoginStep = "choose" | "phone-input" | "phone-verify";

function LoginModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<LoginStep>("choose");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/phone/send", { phone });
      return res.json();
    },
    onSuccess: () => {
      setStep("phone-verify");
      setCountdown(180);
      setError("");
    },
    onError: (err: Error) => {
      setError(err.message || "인증번호 발송에 실패했습니다.");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/phone/verify", { phone, code, name });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      onClose();
    },
    onError: (err: Error) => {
      setError(err.message || "인증에 실패했습니다.");
    },
  });

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" data-testid="modal-login">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-[400px] mx-4 shadow-xl" style={{ borderRadius: "8px" }}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900" data-testid="text-login-title">
            {step === "choose" ? "로그인 / 회원가입" : step === "phone-input" ? "전화번호 로그인" : "인증번호 입력"}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" data-testid="button-login-close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {step === "choose" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                간편하게 로그인하고 학원 소식을 받아보세요.
              </p>

              <a
                href="/api/auth/kakao"
                className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: "#FEE500",
                  color: "#191919",
                  borderRadius: "6px",
                }}
                data-testid="button-login-kakao"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3C5.58 3 2 5.79 2 9.2c0 2.16 1.42 4.06 3.56 5.16l-.91 3.36c-.08.29.25.52.5.35l3.92-2.6c.3.03.62.05.93.05 4.42 0 8-2.79 8-6.22S14.42 3 10 3z" fill="#191919"/>
                </svg>
                카카오로 시작하기
              </a>

              <a
                href="/api/auth/naver"
                className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-white transition-colors"
                style={{
                  backgroundColor: "#03C75A",
                  borderRadius: "6px",
                }}
                data-testid="button-login-naver"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M13.36 10.53L6.4 3H3v14h3.64V9.47L13.6 17H17V3h-3.64v7.53z" fill="white"/>
                </svg>
                네이버로 시작하기
              </a>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400">또는</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <button
                onClick={() => { setStep("phone-input"); setError(""); }}
                className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                style={{ borderRadius: "6px" }}
                data-testid="button-login-phone"
              >
                <Phone className="w-4 h-4" />
                전화번호로 로그인
              </button>
            </div>
          )}

          {step === "phone-input" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이름 (선택)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름을 입력해 주세요"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 focus:border-orange-400 focus:outline-none transition-colors"
                  style={{ borderRadius: "6px" }}
                  data-testid="input-auth-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">휴대전화 번호</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-1234-5678"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 focus:border-orange-400 focus:outline-none transition-colors"
                  style={{ borderRadius: "6px" }}
                  data-testid="input-auth-phone"
                />
              </div>
              {error && <p className="text-sm text-red-500" data-testid="text-auth-error">{error}</p>}
              <button
                onClick={() => sendCodeMutation.mutate()}
                disabled={sendCodeMutation.isPending || !phone.replace(/\D/g, "")}
                className="w-full py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 transition-colors"
                style={{ borderRadius: "6px" }}
                data-testid="button-send-code"
              >
                {sendCodeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  "인증번호 발송"
                )}
              </button>
              <button
                onClick={() => { setStep("choose"); setError(""); }}
                className="w-full text-sm text-gray-400 hover:text-gray-600 py-1"
                data-testid="button-back-to-choose"
              >
                다른 방법으로 로그인
              </button>
            </div>
          )}

          {step === "phone-verify" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">{phone}</span>으로 인증번호가 발송되었습니다.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  인증번호 {countdown > 0 && <span className="text-orange-500 font-normal">({formatTime(countdown)})</span>}
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6자리 숫자 입력"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 focus:border-orange-400 focus:outline-none transition-colors text-center tracking-[0.3em] font-mono text-lg"
                  style={{ borderRadius: "6px" }}
                  maxLength={6}
                  data-testid="input-auth-code"
                />
              </div>
              {error && <p className="text-sm text-red-500" data-testid="text-auth-error">{error}</p>}
              <button
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending || code.length < 6}
                className="w-full py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 transition-colors"
                style={{ borderRadius: "6px" }}
                data-testid="button-verify-code"
              >
                {verifyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  "확인"
                )}
              </button>
              <button
                onClick={() => {
                  setCode("");
                  setError("");
                  sendCodeMutation.mutate();
                }}
                disabled={sendCodeMutation.isPending}
                className="w-full text-sm text-gray-400 hover:text-gray-600 py-1"
                data-testid="button-resend-code"
              >
                인증번호 재발송
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
