"use client";


import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import toast from "react-hot-toast";
import Link from "next/link";
import { useLanguage } from "@/lib/utils/language";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomBar from "@/components/BottomBar";
import BackButton from "@/components/ui/BackButton";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import styles from "@/styles/components/_auth.module.scss";
import { FiEye, FiEyeOff } from "react-icons/fi";

// Create schema factory function for bilingual support
const createResetPasswordSchema = (t: (en: string, fa: string) => string) => yup.object({
  password: yup.string().min(8, t("Password must be at least 8 characters", "رمز عبور باید حداقل 8 کاراکتر باشد")).required(t("Password is required", "رمز عبور الزامی است")),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], t("Passwords must match", "رمزهای عبور باید مطابقت داشته باشند"))
    .required(t("Please confirm your password", "لطفاً رمز عبور را تأیید کنید")),
});

export default function ResetPasswordPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);

  // Create schema with current language
  const resetPasswordSchema = useMemo(() => createResetPasswordSchema(t), [t]);
  type ResetPasswordFormData = yup.InferType<typeof resetPasswordSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: yupResolver(resetPasswordSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // Check if token or email exists for first-login temporary password flow
  useEffect(() => {
    if (!token && !email) {
      setIsTokenValid(false);
      toast.error(
        t("Invalid reset link. Please request a new password reset.", "لینک بازیابی نامعتبر است. لطفاً درخواست جدید ارسال کنید.")
      );
    } else {
      setIsTokenValid(true);
    }
  }, [token, email, t]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token && !email) {
      toast.error(t("Invalid reset link", "لینک بازیابی نامعتبر است"));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(t(result.error || "Failed to reset password", result.error || "بازیابی رمز عبور ناموفق بود"));
      } else {
        toast.success(t("Password reset successfully! Redirecting to login...", "رمز عبور با موفقیت تغییر یافت! در حال انتقال به صفحه ورود..."));
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isTokenValid === null) {
    return (
      <>
        <Navbar />
        <div className={styles.authContainer}>
          <div className={styles.authCard}>
            <div style={{ textAlign: "center", padding: "2rem" }}>
              {t("Loading...", "در حال بارگذاری...")}
            </div>
          </div>
        </div>
        <Footer />
        <BottomBar />
      </>
    );
  }

  if (isTokenValid === false) {
    return (
      <>
        <Navbar />
        <div className={styles.authContainer}>
          <div className={styles.authCard}>
            <h1 className={styles.title}>{t("Invalid Reset Link", "لینک بازیابی نامعتبر")}</h1>
            <p style={{ textAlign: "center", marginBottom: "1.5rem", color: "#666" }}>
              {t(
                "The reset link is invalid or has expired. Please request a new password reset.",
                "لینک بازیابی نامعتبر است یا منقضی شده است. لطفاً درخواست جدید ارسال کنید."
              )}
            </p>
            <BackButton
              href="/login"
              label={t("Back to Login", "بازگشت به صفحه ورود")}
              variant="outlined"
            />
          </div>
        </div>
        <Footer />
        <BottomBar />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <h1 className={styles.title}>{t("Reset Password", "بازیابی رمز عبور")}</h1>
          <p style={{ textAlign: "center", marginBottom: "1.5rem", color: "#666", fontSize: "0.9rem" }}>
            {t("Enter your new password below", "رمز عبور جدید خود را وارد کنید")}
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <div style={{ position: "relative", marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#2c3e50" }}>
                {t("New Password", "رمز عبور جدید")}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  autoComplete="new-password"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    paddingRight: language === "fa" ? "2.5rem" : "2.5rem",
                    paddingLeft: language === "fa" ? "0.75rem" : "0.75rem",
                    border: errors.password ? "1px solid #e74c3c" : "1px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontFamily: language === "fa" ? "Rubik, sans-serif" : "inherit",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    [language === "fa" ? "left" : "right"]: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#666",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p style={{ color: "#e74c3c", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            <div style={{ position: "relative", marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#2c3e50" }}>
                {t("Confirm Password", "تأیید رمز عبور")}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirmPassword")}
                  autoComplete="new-password"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    paddingRight: language === "fa" ? "2.5rem" : "2.5rem",
                    paddingLeft: language === "fa" ? "0.75rem" : "0.75rem",
                    border: errors.confirmPassword ? "1px solid #e74c3c" : "1px solid #e0e0e0",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontFamily: language === "fa" ? "Rubik, sans-serif" : "inherit",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: "absolute",
                    [language === "fa" ? "left" : "right"]: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#666",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {showConfirmPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p style={{ color: "#e74c3c", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={isLoading} className={styles.submitButton}>
              {isLoading ? t("Resetting...", "در حال تغییر...") : t("Reset Password", "تغییر رمز عبور")}
            </Button>
          </form>

          <p className={styles.link}>
            {t("Remember your password?", "رمز عبور خود را به خاطر دارید؟")}{" "}
            <Link href="/login" className={styles.linkText}>
              {t("Sign In", "ورود")}
            </Link>
          </p>
        </div>
      </div>
      <Footer />
      <BottomBar />
    </>
  );
}
