"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/utils/language";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import styles from "@/styles/components/_phoneVerification.module.scss";

interface EmailVerificationProps {
  email: string | null;
  onVerified?: () => void;
  compact?: boolean;
}

export default function EmailVerification({
  email,
  onVerified,
  compact = false,
}: EmailVerificationProps) {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Fetch CSRF token on component mount
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await fetch("/api/csrf-token");
        if (response.ok) {
          const data = await response.json();
          setCsrfToken(data.csrfToken);
        }
      } catch (error) {
        console.error("Error fetching CSRF token:", error);
      }
    };

    fetchCsrfToken();
  }, []);

  const handleSendCode = async () => {
    if (!email) {
      toast.error(t("Email address is required", "آدرس ایمیل الزامی است"));
      return;
    }

    if (!csrfToken) {
      toast.error(t("Security check failed. Please refresh and try again.", "بررسی امنیتی ناموفق. لطفا صفحه را مجددا بارگذاری کنید."));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/email/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ csrfToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || t("Failed to send code", "خطا در ارسال کد"));
        return;
      }

      toast.success(
        t("Verification code sent to your email", "کد تأیید به ایمیل شما ارسال شد")
      );
      setCodeSent(true);
      setCountdown(60); // 60 seconds countdown

      // Start countdown
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error sending code:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error(t("Please enter a 6-digit code", "لطفاً کد 6 رقمی را وارد کنید"));
      return;
    }

    if (!csrfToken) {
      toast.error(t("Security check failed. Please refresh and try again.", "بررسی امنیتی ناموفق. لطفا صفحه را مجددا بارگذاری کنید."));
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/user/email/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ code: verificationCode, csrfToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || t("Invalid verification code", "کد تأیید نامعتبر است"));
        return;
      }

      toast.success(
        t("Email address verified successfully!", "آدرس ایمیل با موفقیت تأیید شد!")
      );
      setCodeSent(false);
      setVerificationCode("");
      if (onVerified) {
        onVerified();
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsVerifying(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!email) {
    return (
      <div className={styles.phoneVerification}>
        <p className={styles.noPhone}>
          {t("Please add an email address to your profile first", "لطفاً ابتدا آدرس ایمیل را به پروفایل خود اضافه کنید")}
        </p>
      </div>
    );
  }

  return (
    <div className={`${styles.phoneVerification} ${compact ? styles.compact : ""}`}>
      {!codeSent ? (
        <div className={styles.sendCodeSection}>
          <p className={styles.instruction}>
            {t(
              "Click the button below to receive a verification code via email",
              "برای دریافت کد تأیید از طریق ایمیل، روی دکمه زیر کلیک کنید"
            )}
          </p>
          <Button
            onClick={handleSendCode}
            disabled={isLoading}
            variant="primary"
            size="medium"
          >
            {isLoading
              ? t("Sending...", "در حال ارسال...")
              : t("Send Verification Code", "ارسال کد تأیید")}
          </Button>
        </div>
      ) : (
        <div className={styles.verifyCodeSection}>
          <p className={styles.instruction}>
            {t(
              "Enter the 6-digit code sent to your email",
              "کد 6 رقمی ارسال شده به ایمیل خود را وارد کنید"
            )}
          </p>
          <div className={styles.codeInputWrapper}>
            <Input
              type="text"
              placeholder={t("000000", "000000")}
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                setVerificationCode(value);
              }}
              maxLength={6}
              className={styles.codeInput}
            />
          </div>
          <div className={styles.actions}>
            <Button
              onClick={handleVerifyCode}
              disabled={isVerifying || verificationCode.length !== 6}
              variant="primary"
              size="medium"
            >
              {isVerifying
                ? t("Verifying...", "در حال تأیید...")
                : t("Verify Code", "تأیید کد")}
            </Button>
            {countdown > 0 ? (
              <p className={styles.countdown}>
                {t("Resend code in", "ارسال مجدد کد در")} {formatCountdown(countdown)}
              </p>
            ) : (
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isLoading}
                className={styles.resendButton}
              >
                {t("Resend Code", "ارسال مجدد کد")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

