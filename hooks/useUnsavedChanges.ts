import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/utils/language";

interface UseUnsavedChangesOptions {
  hasUnsavedChanges: boolean;
  message?: string;
  messageFa?: string;
}

export function useUnsavedChanges({
  hasUnsavedChanges,
  message = "You have unsaved changes. Are you sure you want to leave?",
  messageFa = "شما تغییرات ذخیره نشده‌ای دارید. آیا مطمئن هستید که می‌خواهید خارج شوید؟",
}: UseUnsavedChangesOptions) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const isNavigatingRef = useRef(false);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = language === "fa" ? messageFa : message;
      return e.returnValue;
    };

    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges && !isNavigatingRef.current) {
        const confirmMessage = language === "fa" ? messageFa : message;
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
          window.history.pushState(null, "", window.location.href);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [hasUnsavedChanges, message, messageFa, language]);

  const navigateWithConfirmation = (path: string) => {
    if (hasUnsavedChanges) {
      const confirmMessage =
        language === "fa"
          ? messageFa
          : message;
      if (window.confirm(confirmMessage)) {
        isNavigatingRef.current = true;
        router.push(path);
      }
    } else {
      router.push(path);
    }
  };

  return { navigateWithConfirmation };
}

