import { PageLayout } from "@/components/layout";
import { Link } from "wouter";
import { BookOpen, Trophy, CheckCircle2, ArrowLeft, Phone } from "lucide-react";

export function JuniorPremiumSystem() {
  return (
    <PageLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        {/* 뒤로가기 */}
        <Link href="/junior-school" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#7B2332] transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          초/중등관으로 돌아가기
        </Link>

        {/* 헤더 */}
        <div className="mb-12">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#7B2332] mb-3">영통이강 초/중등관</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 leading-tight mb-4">
            성적이 오르지 않는 공부는<br className="hidden sm:block" /> 이제 그만!
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed">
            영통 이강 초중등관의 <span className="text-gray-800 font-semibold">'독보적'</span> 시스템
          </p>
        </div>

        {/* 도입부 인용 */}
        <div className="bg-gray-50 border-l-4 border-[#7B2332] px-6 py-5 mb-14 rounded-r-sm">
          <p className="text-base sm:text-lg text-gray-700 font-medium leading-relaxed">
            "학원은 열심히 다니는데 왜 성적은 제자리일까요?"
          </p>
          <p className="text-sm text-gray-500 mt-2">
            문제는 <strong className="text-gray-700">'학습량'</strong>이 아니라 <strong className="text-gray-700">'학습의 빈틈'</strong>입니다.<br />
            빈틈을 완벽하게 메우는 영통 이강만의 2가지 핵심 전략을 공개합니다.
          </p>
        </div>

        {/* 시스템 01 */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#7B2332] flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-[#7B2332] uppercase">System 01</p>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">구멍 난 독을 막는 힘, 누적 오답 테스트</h2>
            </div>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            공부한 내용을 잊어버리는 것은 자연스러운 일입니다. 하지만 그 망각을 방치하는 것은 실력 향상의 가장 큰 적입니다.
            영통 이강은 학생들이 <strong className="text-gray-700">'아는 척'</strong>하고 넘어가는 것을 절대 허용하지 않습니다.
          </p>

          <div className="space-y-5">
            {/* 챌린지데이 */}
            <div className="border border-gray-200 rounded-sm p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">📍</span>
                <div>
                  <h3 className="font-extrabold text-gray-900 mb-1">매주 금요 챌린지데이 (Challenge Day)</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    단순한 주간 테스트가 아닙니다. 한 주 동안 배운 모든 내용을 총점검하는 시간입니다.
                    자신의 약점이 어디인지 적나라하게 파악하는 시간, 이것이 실력 상승의 시작점입니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 오답률 0% */}
            <div className="border border-gray-200 rounded-sm p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">🚪</span>
                <div>
                  <h3 className="font-extrabold text-gray-900 mb-1">오답률 0%가 되기 전엔 귀가는 없다</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    타협은 없습니다. 틀린 문제를 완벽하게 이해하고 스스로 설명할 수 있을 때까지,
                    오답률이 0%가 되는 순간까지 학습은 계속됩니다.
                    조금 늦더라도, 확실하게 알고 집에 가는 것이 학생을 위한 길이라 믿습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* WAG BOOK */}
            <div className="border-2 border-[#7B2332] rounded-sm p-5 sm:p-6 bg-[#7B2332]/[0.03]">
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">📘</span>
                <div>
                  <h3 className="font-extrabold text-gray-900 mb-0.5">왁북 (W.A.G BOOK)</h3>
                  <p className="text-xs font-bold text-[#7B2332] tracking-widest mb-2">Weakness Attack Guide</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    세상에 단 하나뿐인 <strong>개인별 누적 오답 북</strong>입니다. 내가 틀린 문제, 내가 헷갈렸던 문제만을 모아 만든 이 책은
                    시험 직전 가장 강력한 무기가 됩니다. 자신의 약점을 집요하게 공격(Attack)하고 보완하여,
                    결국엔 강점으로 만들어냅니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 구분선 */}
        <hr className="border-gray-200 mb-14" />

        {/* 시스템 02 */}
        <section className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#7B2332] flex items-center justify-center flex-shrink-0">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest text-[#7B2332] uppercase">System 02</p>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">타협 없는 완전 학습,<br className="sm:hidden" /> Mastery Learning System</h2>
            </div>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            진도만 나가는 선행 학습은 모래 위에 성을 쌓는 것과 같습니다.
            영통 이강은 <strong className="text-gray-700">'마스터리 러닝 승급제'</strong>를 도입하여 진짜 실력을 검증합니다.
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 sm:p-5 border border-gray-200 rounded-sm">
              <CheckCircle2 className="w-5 h-5 text-[#7B2332] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-extrabold text-gray-900 mb-1">완전히 이해하고 마스터했을 때 완성되는 승급</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  단순히 기간이 지났다고 해서 다음 단계로 넘어가지 않습니다.
                  해당 단원을 완벽히 소화했는지를 철저히 검증받아야만 상위 과정으로 승급할 수 있습니다.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 sm:p-5 border border-gray-200 rounded-sm">
              <CheckCircle2 className="w-5 h-5 text-[#7B2332] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-extrabold text-gray-900 mb-1">틀린 문제가 0%가 될 때까지</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  대충 알고 넘어가면 반드시 다음 단계에서 무너집니다.
                  확실히 오를 때까지 반복하고, 교정하고, 확인합니다.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 bg-gray-900 text-white rounded-sm px-6 py-5">
            <p className="text-sm leading-relaxed text-gray-300">
              이 과정을 견뎌낸 학생들은 단순히 진도만 나간 학생들과는 차원이 다른
              <strong className="text-white"> '단단한 실력'</strong>을 갖게 됩니다. 🚀
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="border border-[#7B2332] rounded-sm px-6 py-8 text-center">
          <p className="text-xs font-bold tracking-widest text-[#7B2332] uppercase mb-2">Consultation</p>
          <h3 className="text-xl font-extrabold text-gray-900 mb-1">확실함이 아니면 시작하지 않습니다.</h3>
          <p className="text-sm text-gray-500 mb-6">
            공부하는 척이 아닌, 진짜 공부를 시키고 싶으시다면<br />
            지금 영통 이강 초중등관과 상담하세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a
              href="tel:031-548-0985"
              className="inline-flex items-center gap-2 bg-[#7B2332] text-white font-bold px-6 py-3 rounded-sm hover:bg-[#6B1D2A] transition-colors text-sm"
              data-testid="link-premium-phone"
            >
              <Phone className="w-4 h-4" />
              031-548-0985
            </a>
            <a
              href="sms:010-7737-2843"
              className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 font-bold px-6 py-3 rounded-sm hover:border-[#7B2332] hover:text-[#7B2332] transition-colors text-sm"
              data-testid="link-premium-sms"
            >
              📱 010-7737-2843 (문자전용)
            </a>
          </div>
        </div>

      </div>
    </PageLayout>
  );
}
