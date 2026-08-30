import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function OpenModelBadge() {
  const t = await getTranslations("common");

  return (
    <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
      {t("poweredByPrefix")}{" "}
      <Link
        href="/model-card"
        className="underline decoration-dotted underline-offset-2 hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        {t("poweredByModel")}
      </Link>{" "}
      {t("poweredBySuffix")}
    </p>
  );
}
