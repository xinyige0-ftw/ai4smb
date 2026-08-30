"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import SignInModal from "./SignInModal";

export default function DashboardSignInPrompt() {
  const t = useTranslations("dashboard");
  const [show, setShow] = useState(false);

  return (
    <div className="rounded-2xl border-2 border-zinc-200 bg-white p-5 text-center sm:p-7 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-3 text-4xl">📊</div>
      <p className="mb-1 font-medium text-zinc-700 dark:text-zinc-300">{t("emptyGuestTitle")}</p>
      <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-zinc-400 dark:text-zinc-500">
        {t("emptyGuestDesc")}
      </p>
      <button
        onClick={() => setShow(true)}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        {t("signInCta")}
      </button>
      {show && <SignInModal onClose={() => setShow(false)} />}
    </div>
  );
}
