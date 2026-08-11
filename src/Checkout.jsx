import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { auth } from "./firebase";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { SOURCE_SUBSCRIPTION, formatWon } from "./paymentConfig";

const tossClientKey =
  import.meta.env.VITE_TOSS_CLIENT_KEY ||
  import.meta.env.VITE_TOSS_WIDGET_ID ||
  "";

function loadTossScript() {
  if (window.TossPayments) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v2/standard";
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function Checkout() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [payment, setPayment] = useState(null);
  const [order, setOrder] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponMessage, setCouponMessage] = useState("");

  const productId = searchParams.get("productId") || SOURCE_SUBSCRIPTION.productId;
  const product = SOURCE_SUBSCRIPTION;

  const amountLabel = useMemo(() => formatWon(order?.amount || product.amount), [order?.amount, product.amount]);
  const originalAmountLabel = useMemo(() => formatWon(order?.originalAmount || product.amount), [order?.originalAmount, product.amount]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const init = async () => {
      try {
        if (!tossClientKey) {
          throw new Error("VITE_TOSS_CLIENT_KEY 또는 VITE_TOSS_WIDGET_ID가 설정되지 않았습니다.");
        }
        await loadTossScript();
        if (cancelled) return;
        const tossPayments = window.TossPayments(tossClientKey);
        setPayment(tossPayments.payment({ customerKey: user.uid }));
      } catch (err) {
        console.error(err);
        showToast(err.message || "결제 SDK 초기화에 실패했습니다.", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [user, showToast]);

  const createOrder = async () => {
    if (!auth.currentUser || !user) throw new Error("로그인이 필요합니다.");
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch("/api/payment/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idToken,
        productId,
        userEmail: user.email,
        userName: user.displayName,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "주문 생성에 실패했습니다.");
    setOrder(data);
    return data;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!auth.currentUser || !user) {
      showToast("쿠폰 적용은 로그인 후 가능합니다.", "error");
      return;
    }

    setProcessing(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/coupon/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          code: couponCode,
          userEmail: user.email,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "쿠폰 적용에 실패했습니다.");
      setCouponMessage(data.message);
      setOrder(null);
      showToast(data.message, "success");
    } catch (err) {
      setCouponMessage(err.message);
      showToast(err.message, "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleSubscribe = async () => {
    if (!payment) return;
    if (!user) {
      showToast("구독을 시작하려면 로그인이 필요합니다.", "error");
      return;
    }

    setProcessing(true);
    try {
      const nextOrder = order || await createOrder();
      const successUrl = new URL(`${window.location.origin}/checkout/billing-success`);
      successUrl.searchParams.set("orderId", nextOrder.orderId);
      successUrl.searchParams.set("productId", productId);

      await payment.requestBillingAuth({
        method: "CARD",
        successUrl: successUrl.toString(),
        failUrl: `${window.location.origin}/checkout/fail`,
        customerEmail: user.email || undefined,
        customerName: user.displayName || user.email || "AutoHub User",
      });
    } catch (err) {
      if (err?.code === "USER_CANCEL") {
        showToast("결제가 취소되었습니다.", "info");
      } else {
        console.error(err);
        showToast(err.message || "구독 시작 중 오류가 발생했습니다.", "error");
      }
      setProcessing(false);
    }
  };

  if (!user) {
    return (
      <main className="mt-28 px-6 py-20 max-w-[720px] mx-auto text-center">
        <h1 className="text-[28px] font-extrabold mb-3">로그인이 필요합니다</h1>
        <p className="text-on-surface-variant mb-6">상단 로그인 또는 Google 버튼으로 로그인한 뒤 구독을 시작해주세요.</p>
        <Link to="/catalog" className="inline-flex items-center justify-center rounded-xl bg-primary text-on-primary px-6 py-3 font-bold">
          라이브러리로 돌아가기
        </Link>
      </main>
    );
  }

  return (
    <main className="mt-28 px-6 py-10 max-w-[760px] mx-auto min-h-screen">
      <Link to="/catalog" className="text-sm text-primary font-bold inline-flex items-center gap-1 mb-6">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        라이브러리로 돌아가기
      </Link>

      <section className="bg-white border border-outline-variant/40 rounded-[18px] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-outline-variant/30">
          <p className="text-xs font-bold tracking-[0.2em] text-primary uppercase mb-2">SOURCE CODE SUBSCRIPTION</p>
          <h1 className="text-[30px] font-extrabold text-on-surface mb-2">AutoHub 소스코드 월간 구독</h1>
          <p className="text-on-surface-variant leading-relaxed">
            구독 기간 동안 AutoHub 소스코드 라이브러리의 업데이트 버전을 다운로드할 수 있습니다.
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div className="rounded-xl bg-surface-container-low p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-on-surface">월 구독료</span>
              <span className="text-[28px] font-extrabold text-primary">{amountLabel}<span className="text-sm text-on-surface-variant ml-1">/월</span></span>
            </div>
            {order?.discountApplied && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">정가</span>
                <span className="line-through text-on-surface-variant">{originalAmountLabel}</span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-outline-variant/40 p-5">
            <label className="block text-sm font-bold mb-2">할인 쿠폰</label>
            <div className="flex gap-3">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="예: FIRST50"
                className="flex-1 bg-surface-container-low rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={processing || !couponCode.trim()}
                className="rounded-xl bg-surface-container-high px-5 py-3 font-bold text-sm disabled:opacity-50"
              >
                적용
              </button>
            </div>
            {couponMessage && <p className="text-sm text-primary mt-2">{couponMessage}</p>}
          </div>

          <button
            type="button"
            onClick={handleSubscribe}
            disabled={loading || processing || !payment}
            className="w-full rounded-xl bg-primary text-on-primary py-4 font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">{processing ? "sync" : "credit_card"}</span>
            {processing ? "처리 중..." : `${amountLabel}/월 정기구독 시작`}
          </button>

          <p className="text-xs text-on-surface-variant leading-relaxed">
            카드 등록 후 첫 결제가 승인되며, 다음 결제일부터 자동 갱신됩니다. 구독 정보와 결제 이력은 Firebase에 저장됩니다.
          </p>
        </div>
      </section>
    </main>
  );
}
