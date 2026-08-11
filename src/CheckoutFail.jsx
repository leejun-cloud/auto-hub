import React from "react";
import { Link, useSearchParams } from "react-router-dom";

export default function CheckoutFail() {
  const [searchParams] = useSearchParams();
  const message = searchParams.get("message") || "결제가 취소되었거나 실패했습니다.";

  return (
    <main className="mt-28 px-6 py-20 max-w-[560px] mx-auto min-h-screen text-center">
      <div className="bg-white border border-outline-variant/40 rounded-[18px] p-8 shadow-sm">
        <span className="material-symbols-outlined text-[64px] text-red-500 mb-4">error</span>
        <h1 className="text-[26px] font-extrabold mb-3">결제를 완료하지 못했습니다</h1>
        <p className="text-on-surface-variant mb-6">{message}</p>
        <Link to="/checkout" className="inline-flex items-center justify-center rounded-xl bg-primary text-on-primary px-6 py-3 font-bold">
          다시 시도하기
        </Link>
      </div>
    </main>
  );
}
