import { toast } from "react-hot-toast";
import type { ReactNode, CSSProperties } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastOptions {
  duration?: number;
  position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const defaultDurations = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
};

const getStyle = (type: ToastType) => {
  const baseStyle = {
    borderRadius: "8px",
    padding: "12px 16px",
    fontSize: "14px",
    fontWeight: 500,
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  };

  switch (type) {
    case "success":
      return {
        ...baseStyle,
        background: "#10b981",
        color: "#ffffff",
      };
    case "error":
      return {
        ...baseStyle,
        background: "#ef4444",
        color: "#ffffff",
      };
    case "warning":
      return {
        ...baseStyle,
        background: "#f59e0b",
        color: "#ffffff",
      };
    case "info":
      return {
        ...baseStyle,
        background: "#3b82f6",
        color: "#ffffff",
      };
  }
};

export const showToast = (
  message: string,
  type: ToastType = "info",
  options: ToastOptions = {}
) => {
  const {
    duration = defaultDurations[type],
    position = "top-center",
    icon,
    action,
  } = options;

  const toastOptions: any = {
    duration,
    position,
    style: getStyle(type),
    icon: icon,
  };

  if (action) {
    toastOptions.action = {
      label: action.label,
      onClick: action.onClick,
    };
  }

  const toastFn: any = (toast as any)[type] ?? toast;
  return toastFn(message, toastOptions);
};

// Convenience functions
export const showSuccess = (message: string, options?: ToastOptions) => {
  return showToast(message, "success", options);
};

export const showError = (message: string, options?: ToastOptions) => {
  return showToast(message, "error", options);
};

export const showWarning = (message: string, options?: ToastOptions) => {
  return showToast(message, "warning", options);
};

export const showInfo = (message: string, options?: ToastOptions) => {
  return showToast(message, "info", options);
};

// Bilingual toast helper
export const showToastBilingual = (
  messageEn: string,
  messageFa: string,
  type: ToastType = "info",
  options: ToastOptions = {}
) => {
  // Get language from document or default to English
  const isRTL = document.documentElement.dir === "rtl" || document.documentElement.lang === "fa";
  const message = isRTL ? messageFa : messageEn;
  return showToast(message, type, options);
};

interface ConfirmationOptions {
  duration?: number;
  position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
  render?: (toastId: string) => ReactNode;
}

export const showConfirmationToast = (
  message: string,
  confirmLabel: string,
  cancelLabel: string,
  onConfirm: () => void,
  options: ConfirmationOptions = {}
) => {
  const { duration = Infinity, position = "top-center", render } = options;

  const toastId = toast.custom(
    (toastInstance) => {
      const baseStyle: CSSProperties = {
        background: "#ffffff",
        color: "#111111",
        padding: "1rem",
        borderRadius: "0.75rem",
        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        maxWidth: "320px",
        width: "100%",
      };

      const buttonStyle: CSSProperties = {
        border: "1px solid #d1d5db",
        borderRadius: "0.5rem",
        padding: "0.55rem 0.95rem",
        fontSize: "0.875rem",
        cursor: "pointer",
      };

      return render ? (
        <>{render(toastInstance.id)}</>
      ) : (
        <div style={baseStyle}>
          <div style={{ marginBottom: "0.75rem", fontWeight: 700, lineHeight: 1.4 }}>
            {message}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button
              type="button"
              style={{ ...buttonStyle, background: "#f3f4f6", color: "#111" }}
              onClick={() => toast.dismiss(toastInstance.id)}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              style={{ ...buttonStyle, background: "#ef4444", color: "#fff", borderColor: "#ef4444" }}
              onClick={() => {
                toast.dismiss(toastInstance.id);
                onConfirm();
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      );
    },
    { duration, position }
  );

  return toastId;
};

