"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/utils/language";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import styles from "@/styles/components/_phoneVerification.module.scss";

interface PhoneVerificationProps {
  phone: string | null;
  onVerified?: () => void;
  compact?: boolean;
}

export default function PhoneVerification({
  phone,
  onVerified,
  compact = false,
}: PhoneVerificationProps) {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [csrfToken, setCsrfToken] = useState<string>("");

  // Fetch CSRF token on mount
  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await fetch("/api/csrf-token");
        const data = await response.json();
        setCsrfToken(data.csrfToken);
      } catch (error) {
        console.error("Error fetching CSRF token:", error);
      }
    };

    fetchCsrfToken();
  }, []);

  const handleSendCode = async () => {
    if (!phone) {
      toast.error(t("Phone number is required", "شماره تلفن الزامی است"));
      return;
    }

    if (!csrfToken) {
      toast.error(t("Security error. Please refresh the page.", "خطای امنیتی. لطفاً صفحه را تازه کنید."));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/phone/send-code", {
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
        t("Verification code sent to your phone", "کد تأیید به تلفن شما ارسال شد")
      );
      setCodeSent(true);
      setCountdown(120); // 2 minutes in seconds (matches OTP expiry)

      // Start countdown timer
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Error sending verification code:", error);
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
      toast.error(t("Security error. Please refresh the page.", "خطای امنیتی. لطفاً صفحه را تازه کنید."));
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/user/phone/verify", {
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
        t("Phone number verified successfully!", "شماره تلفن با موفقیت تأیید شد!")
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

  if (!phone) {
    return (
      <div className={styles.phoneVerification}>
        <p className={styles.noPhone}>
          {t("Please add a phone number to your profile first", "لطفاً ابتدا شماره تلفن را به پروفایل خود اضافه کنید")}
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
              "Click the button below to receive a verification code via SMS",
              "برای دریافت کد تأیید از طریق پیامک، دکمه زیر را کلیک کنید"
            )}
          </p>
          <Button
            onClick={handleSendCode}
            disabled={isLoading}
            variant="primary"
            className={styles.sendButton}
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
              "Enter the 6-digit code sent to",
              "کد 6 رقمی ارسال شده به"
            )}{" "}
            <strong>{phone}</strong>
          </p>
          {countdown > 0 && (
            <p className={styles.countdown}>
              {t("Code expires in", "کد تا")} {formatCountdown(countdown)}
            </p>
          )}
          <div className={styles.codeInputWrapper}>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setVerificationCode(value);
              }}
              placeholder={t("Enter 6-digit code", "کد 6 رقمی را وارد کنید")}
            />
          </div>
          <div className={styles.actions}>
            <Button
              onClick={handleVerifyCode}
              disabled={isVerifying || verificationCode.length !== 6}
              variant="primary"
              className={styles.verifyButton}
            >
              {isVerifying
                ? t("Verifying...", "در حال تأیید...")
                : t("Verify Code", "تأیید کد")}
            </Button>
            <Button
              onClick={() => {
                setCodeSent(false);
                setVerificationCode("");
                setCountdown(0);
              }}
              variant="outline"
              className={styles.cancelButton}
            >
              {t("Cancel", "لغو")}
            </Button>
          </div>
          {countdown === 0 && (
            <button
              onClick={handleSendCode}
              disabled={isLoading}
              className={styles.resendLink}
            >
              {t("Resend code", "ارسال مجدد کد")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

