import { useState, useEffect, createContext, useContext } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { X, Loader2, User, LogOut, CheckCircle2, AlertCircle } from "lucide-react";

interface AuthMember {
  id: number;
  name: string;
  username: string;
  memberType?: string;
}

interface AuthContextType {
  member: AuthMember | null;
  isLoading: boolean;
  openLoginModal: () => void;
  openRegisterModal: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  member: null,
  isLoading: true,
  openLoginModal: () => {},
  openRegisterModal: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<"login" | "register" | null>(null);

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
        openLoginModal: () => setModal("login"),
        openRegisterModal: () => setModal("register"),
        logout: () => logoutMutation.mutate(),
      }}
    >
      {children}
      {modal === "login" && (
        <LoginModal onClose={() => setModal(null)} onSwitchToRegister={() => setModal("register")} />
      )}
      {modal === "register" && (
        <RegisterModal onClose={() => setModal(null)} onSwitchToLogin={() => setModal("login")} />
      )}
    </AuthContext.Provider>
  );
}

export function AuthHeaderButton() {
  const { member, isLoading, openLoginModal, openRegisterModal, logout } = useAuth();

  if (isLoading) return null;

  if (member) {
    return (
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-700" data-testid="text-auth-user">
          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="font-medium max-w-[60px] sm:max-w-[80px] truncate">{member.name || "회원"}</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors px-1.5 sm:px-2 py-1 whitespace-nowrap"
          data-testid="button-logout"
        >
          <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
      <button
        onClick={openLoginModal}
        className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap"
        data-testid="button-login-open"
      >
        로그인
      </button>
      <button
        onClick={openRegisterModal}
        className="px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors whitespace-nowrap"
        style={{ borderRadius: "4px" }}
        data-testid="button-register-open"
      >
        회원가입
      </button>
    </div>
  );
}

function LoginModal({ onClose, onSwitchToRegister }: { onClose: () => void; onSwitchToRegister: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/login", { username, password });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      onClose();
    },
    onError: (err: Error) => {
      try {
        const parsed = JSON.parse(err.message.split(": ").slice(1).join(": "));
        setError(parsed.error || "로그인에 실패했습니다.");
      } catch {
        setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      }
    },
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" data-testid="modal-login">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-[400px] mx-4 shadow-xl" style={{ borderRadius: "8px" }}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900" data-testid="text-login-title">로그인</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" data-testid="button-login-close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력해 주세요"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 focus:border-red-500 focus:outline-none transition-colors"
              style={{ borderRadius: "6px" }}
              data-testid="input-login-username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력해 주세요"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 focus:border-red-500 focus:outline-none transition-colors"
              style={{ borderRadius: "6px" }}
              onKeyDown={(e) => { if (e.key === "Enter") loginMutation.mutate(); }}
              data-testid="input-login-password"
            />
          </div>
          {error && <p className="text-sm text-red-500" data-testid="text-login-error">{error}</p>}
          <button
            onClick={() => loginMutation.mutate()}
            disabled={loginMutation.isPending || !username || !password}
            className="w-full py-2.5 text-sm font-semibold text-white bg-[#7B2332] hover:bg-[#8B3040] disabled:bg-gray-300 transition-colors"
            style={{ borderRadius: "6px" }}
            data-testid="button-login-submit"
          >
            {loginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "로그인"}
          </button>
          <div className="text-center">
            <button
              onClick={onSwitchToRegister}
              className="text-sm text-gray-400 hover:text-red-600 transition-colors"
              data-testid="button-switch-to-register"
            >
              아직 회원이 아니신가요? <span className="font-semibold text-red-600">회원가입</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const GENDER_OPTIONS = ["남", "여"];
const TRACK_OPTIONS = ["문과", "이과", "예체능"];
const GRADE_OPTIONS = ["초1", "초2", "초3", "초4", "초5", "초6", "중1", "중2", "중3", "고1", "고2", "고3", "N수"];
const SUBJECT_OPTIONS = ["수학", "영어", "국어", "과학", "사회", "기타"];
const ACADEMY_STATUS_OPTIONS = [
  { value: "none", label: "없음" },
  { value: "former", label: "재원 했었음" },
  { value: "current", label: "재원 중" },
];

function RegisterModal({ onClose, onSwitchToLogin }: { onClose: () => void; onSwitchToLogin: () => void }) {
  const [memberType, setMemberType] = useState<"student" | "parent">("student");
  const [username, setUsername] = useState("");
  const [usernameChecked, setUsernameChecked] = useState<boolean | null>(null);
  const [usernameMsg, setUsernameMsg] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [studentName, setStudentName] = useState("");
  const [gender, setGender] = useState("");
  const [track, setTrack] = useState("");
  const [grade, setGrade] = useState("");
  const [school, setSchool] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneCountdown, setPhoneCountdown] = useState(0);
  const [parentPhone, setParentPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [subject, setSubject] = useState("");
  const [email, setEmail] = useState("");
  const [academyStatus, setAcademyStatus] = useState("none");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (phoneCountdown > 0) {
      const timer = setTimeout(() => setPhoneCountdown(phoneCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [phoneCountdown]);

  const checkUsernameMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/auth/check-username?username=${username}`, { credentials: "include" });
      return res.json();
    },
    onSuccess: (data: any) => {
      setUsernameChecked(data.available);
      setUsernameMsg(data.message || (data.available ? "사용 가능한 아이디입니다." : "이미 사용 중인 아이디입니다."));
    },
    onError: () => {
      setUsernameChecked(false);
      setUsernameMsg("아이디 형식을 확인해 주세요.");
    },
  });

  const sendCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/phone/send", { phone: studentPhone });
      return res.json();
    },
    onSuccess: () => {
      setPhoneCountdown(180);
      setError("");
    },
    onError: () => {
      setError("인증번호 발송에 실패했습니다.");
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/phone/verify", { phone: studentPhone, code: phoneCode });
      return res.json();
    },
    onSuccess: () => {
      setPhoneVerified(true);
      setError("");
    },
    onError: () => {
      setError("인증번호가 올바르지 않거나 만료되었습니다.");
    },
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/register", {
        username, password, memberType, studentName, gender, track, grade,
        school, studentPhone, parentPhone, birthday, subject, email, academyStatus,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setSuccess(true);
    },
    onError: (err: Error) => {
      try {
        const parsed = JSON.parse(err.message.split(": ").slice(1).join(": "));
        setError(parsed.error || "회원가입에 실패했습니다.");
      } catch {
        setError("회원가입에 실패했습니다.");
      }
    },
  });

  const handleSubmit = () => {
    setError("");
    if (!usernameChecked) { setError("아이디 중복체크를 해주세요."); return; }
    if (password.length < 6) { setError("비밀번호는 6자 이상이어야 합니다."); return; }
    if (password !== passwordConfirm) { setError("비밀번호가 일치하지 않습니다."); return; }
    if (!studentName.trim()) { setError("학생이름을 입력해 주세요."); return; }
    if (!gender) { setError("성별을 선택해 주세요."); return; }
    if (!track) { setError("계열을 선택해 주세요."); return; }
    if (!grade) { setError("학년을 선택해 주세요."); return; }
    if (!school.trim()) { setError("학교를 입력해 주세요."); return; }
    if (!parentPhone || parentPhone.replace(/\D/g, "").length < 10) { setError("학부모 휴대폰 번호를 입력해 주세요."); return; }
    if (!agreeTerms || !agreePrivacy) { setError("필수 약관에 동의해 주세요."); return; }
    registerMutation.mutate();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (success) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" data-testid="modal-register-success">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white w-full max-w-[400px] mx-4 shadow-xl p-8 text-center" style={{ borderRadius: "8px" }}>
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">회원가입이 완료되었습니다!</h3>
          <p className="text-sm text-gray-500 mb-6">환영합니다, {studentName}님!</p>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
            style={{ borderRadius: "6px" }}
            data-testid="button-register-close"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" data-testid="modal-register">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full max-w-[520px] mx-4 shadow-xl max-h-[90vh] flex flex-col" style={{ borderRadius: "8px" }}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900" data-testid="text-register-title">회원가입</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" data-testid="button-register-close-x">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          <div className="flex border border-gray-200 overflow-hidden" style={{ borderRadius: "6px" }}>
            <button
              onClick={() => setMemberType("student")}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                memberType === "student" ? "bg-[#7B2332] text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
              data-testid="button-type-student"
            >
              학생
            </button>
            <button
              onClick={() => setMemberType("parent")}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                memberType === "parent" ? "bg-[#7B2332] text-white" : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
              data-testid="button-type-parent"
            >
              학부모
            </button>
          </div>

          <FormField label="아이디" required>
            <div className="flex gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "")); setUsernameChecked(null); setUsernameMsg(""); }}
                placeholder="6~15자의 영문 소문자, 숫자만 가능"
                maxLength={15}
                className="flex-1 px-3 py-2.5 text-sm border border-gray-200 focus:border-red-500 focus:outline-none transition-colors"
                style={{ borderRadius: "6px" }}
                data-testid="input-reg-username"
              />
              <button
                onClick={() => checkUsernameMutation.mutate()}
                disabled={!username || username.length < 6 || checkUsernameMutation.isPending}
                className="px-4 py-2.5 text-sm font-semibold text-white bg-[#7B2332] hover:bg-[#8B3040] disabled:bg-gray-300 transition-colors flex-shrink-0"
                style={{ borderRadius: "6px" }}
                data-testid="button-check-username"
              >
                중복체크
              </button>
            </div>
            {usernameMsg && (
              <p className={`text-xs mt-1 ${usernameChecked ? "text-green-500" : "text-red-500"}`} data-testid="text-username-msg">
                {usernameMsg}
              </p>
            )}
          </FormField>

          <FormField label="비밀번호" required>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 focus:border-red-500 focus:outline-none transition-colors"
              style={{ borderRadius: "6px" }}
              data-testid="input-reg-password"
            />
          </FormField>

          <FormField label="비밀번호 확인" required>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호를 다시 한번 입력해 주세요."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 focus:border-red-500 focus:outline-none transition-colors"
              style={{ borderRadius: "6px" }}
              data-testid="input-reg-password-confirm"
            />
            {passwordConfirm && password !== passwordConfirm && (
              <p className="text-xs mt-1 text-red-500">비밀번호가 일치하지 않습니다.</p>
            )}
          </FormField>

          <FormField label="학생이름" required>
            <input
              type="text"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="이름을 입력해주세요."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 focus:border-red-500 focus:outline-none transition-colors"
              style={{ borderRadius: "6px" }}
              data-testid="input-reg-name"
            />
          </FormField>

          <FormField label="성별" required>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 focus:border-red-500 focus:outline-none transition-colors bg-white"
              style={{ borderRadius: "6px" }}
              data-testid="select-reg-gender"
            >
              <option value="">선택</option>
              {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </FormField>

          <FormField label="계열" required>
            <select
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 focus:border-red-500 focus:outline-none transition-colors bg-white"
              style={{ borderRadius: "6px" }}
              data-testid="select-reg-track"
            >
              <option value="">선택</option>
              {TRACK_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormField>

          <FormField label="학년" required>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 focus:border-red-500 focus:outline-none transition-colors bg-white"
              style={{ borderRadius: "6px" }}
              data-testid="select-reg-grade"
            >
              <option value="">선택</option>
              {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </FormField>

          <FormField label="학교 (또는 출신고)" required>
            <input
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              placeholder="학교명을 입력해주세요."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 focus:border-red-500 focus:outline-none transition-colors"
              style={{ borderRadius: "6px" }}
              data-testid="input-reg-school"
            />
          </FormField>

          <FormField label="학생 휴대폰 번호" required>
            <input
              type="tel"
              value={studentPhone}
              onChange={(e) => setStudentPhone(e.target.value)}
              placeholder="휴대폰번호(-없이 입력)"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 focus:border-red-500 focus:outline-none transition-colors"
              style={{ borderRadius: "6px" }}
              data-testid="input-reg-student-phone"
            />
          </FormField>

          <FormField label="학부모 휴대폰 번호" required>
            <input
              type="tel"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="(-)없이 숫자만 입력"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 focus:border-red-500 focus:outline-none transition-colors"
              style={{ borderRadius: "6px" }}
              data-testid="input-reg-parent-phone"
            />
          </FormField>

          <FormField label="생년월일">
            <input
              type="text"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="생년월일 8자리 (예시: 20001231)"
              maxLength={8}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 focus:border-red-500 focus:outline-none transition-colors"
              style={{ borderRadius: "6px" }}
              data-testid="input-reg-birthday"
            />
          </FormField>

          <FormField label="선택과목">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 focus:border-red-500 focus:outline-none transition-colors bg-white"
              style={{ borderRadius: "6px" }}
              data-testid="select-reg-subject"
            >
              <option value="">선택</option>
              {SUBJECT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>

          <FormField label="메일주소">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="메일주소 입력"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 focus:border-red-500 focus:outline-none transition-colors"
              style={{ borderRadius: "6px" }}
              data-testid="input-reg-email"
            />
          </FormField>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">영통이강학원 재원 여부</label>
            <div className="flex border border-gray-200 overflow-hidden" style={{ borderRadius: "6px" }}>
              {ACADEMY_STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAcademyStatus(opt.value)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                    academyStatus === opt.value
                      ? "bg-[#7B2332] text-white"
                      : "bg-white text-gray-500 hover:bg-gray-50"
                  }`}
                  data-testid={`button-academy-${opt.value}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">서비스 이용을 위한 약관동의</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer" data-testid="label-agree-all">
                <input
                  type="checkbox"
                  checked={agreeTerms && agreePrivacy}
                  onChange={(e) => { setAgreeTerms(e.target.checked); setAgreePrivacy(e.target.checked); }}
                  className="w-4 h-4 accent-red-600"
                  data-testid="checkbox-agree-all"
                />
                <span className="text-sm text-gray-700 font-medium">모두 동의합니다.</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer pl-2" data-testid="label-agree-terms">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 accent-red-600"
                  data-testid="checkbox-agree-terms"
                />
                <span className="text-sm text-gray-600">
                  이용약관 <span className="text-red-600">(필수)</span>
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer pl-2" data-testid="label-agree-privacy">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => setAgreePrivacy(e.target.checked)}
                  className="w-4 h-4 accent-red-600"
                  data-testid="checkbox-agree-privacy"
                />
                <span className="text-sm text-gray-600">
                  개인정보 수집 및 이용 동의 <span className="text-red-600">(필수)</span>
                </span>
              </label>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 px-3 py-2" style={{ borderRadius: "6px" }} data-testid="text-register-error">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={registerMutation.isPending}
            className="w-full py-3 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-300 transition-colors"
            style={{ borderRadius: "6px" }}
            data-testid="button-register-submit"
          >
            {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "회원가입"}
          </button>

          <div className="text-center pb-2">
            <button
              onClick={onSwitchToLogin}
              className="text-sm text-gray-400 hover:text-red-600 transition-colors"
              data-testid="button-switch-to-login"
            >
              이미 회원이신가요? <span className="font-semibold text-red-600">로그인</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
