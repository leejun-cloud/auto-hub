import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { auth } from "./firebase";

export default function BillingSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("구독을 활성화하는 중입니다.");

  useEffect(() => {
    const authKey = searchParams.get("authKey");
    const customerKey = searchParams.get("customerKey");
    const orderId = searchParams.get("orderId");

    if (!authKey || !customerKey || !orderId) {
      setStatus("error");
      setMessage("결제 승인 정보가 올바르지 않습니다.");
      return;
    }

    const processBilling = async () => {
      try {
        if (!auth.currentUser) throw new Error("로그인이 필요합니다.");
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch("/api/payments/billing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, authKey, customerKey, orderId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) throw new Error(data.message || data.error || "정기결제 처리에 실패했습니다.");
        setStatus("success");
        setMessage(data.message || "소스코드 월간 구독이 활성화되었습니다.");
      } catch (err) {
        console.error(err);
        setStatus("error");
        setMessage(err.message || "정기결제 처리 중 오류가 발생했습니다.");
      }
    };

    processBilling();
  }, [searchParams]);

  return (
    <main className="mt-28 px-6 py-20 max-w-[560px] mx-auto min-h-screen text-center">
      <div className="bg-white border border-outline-variant/40 rounded-[18px] p-8 shadow-sm">
        <span className={`material-symbols-outlined text-[64px] mb-4 ${status === "success" ? "text-primary" : status === "error" ? "text-red-500" : "text-on-surface-variant animate-spin"}`}>
          {status === "success" ? "check_circle" : status === "error" ? "error" : "sync"}
        </span>
        <h1 className="text-[26px] font-extrabold mb-3">
          {status === "success" ? "구독이 활성화되었습니다" : status === "error" ? "구독 처리 실패" : "결제 확인 중"}
        </h1>
        <p className="text-on-surface-variant mb-6">{message}</p>
        <Link
          to={status === "success" ? "/mypage" : "/checkout"}
          className="inline-flex items-center justify-center rounded-xl bg-primary text-on-primary px-6 py-3 font-bold"
        >
          {status === "success" ? "My Library로 이동" : "다시 시도하기"}
        </Link>
      </div>
    </main>
  );
}
