"use client";


import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import toast from "react-hot-toast";
import Link from "next/link";
import { useLanguage } from "@/lib/utils/language";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomBar from "@/components/BottomBar";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import styles from "@/styles/components/_auth.module.scss";

const signUpSchema = yup.object({
  name: yup.string().trim().required("Name is required"),
  surname: yup.string().trim().required("Family name is required"),
  email: yup
    .string()
    .transform((value) => (value === "" ? undefined : value))
    .email("Invalid email")
    .optional(),
  phone: yup
    .string()
    .matches(/^09\d{9}$/, "Phone must be 11 digits starting with 09")
    .required("Phone is required"),
  password: yup.string().min(8, "Password must be at least 8 characters").required("Password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords must match")
    .required("Please confirm your password"),
});

type SignUpFormData = yup.InferType<typeof signUpSchema>;

export default function SignUpPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [registrationToken, setRegistrationToken] = useState("");

  useEffect(() => {
    fetch("/api/csrf-token")
      .then((response) => response.json())
      .then((data) => setCsrfToken(data.csrfToken || ""))
      .catch((error) => {
        console.error("Error fetching CSRF token:", error);
        toast.error(t("Could not start secure registration. Refresh the page and try again.", "شروع ثبت‌نام امن ممکن نشد. صفحه را تازه کنید و دوباره تلاش کنید."));
      });
  }, [t]);

  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/dashboard");
      router.refresh();
    }
  }, [session, status, router]);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: yupResolver(signUpSchema),
  });
  const phoneRegistration = register("phone");

  const onSubmit = async (data: SignUpFormData) => {
    if (!phoneVerified || !registrationToken) {
      toast.error(t("Verify your phone number before creating your account.", "پیش از ایجاد حساب، شماره تلفن خود را تأیید کنید."));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({
          name: data.name,
          surname: data.surname,
          email: data.email || undefined,
          phone: data.phone,
          password: data.password,
          verificationToken: registrationToken,
          csrfToken,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(t("Account created successfully!", "حساب کاربری با موفقیت ایجاد شد!"));
        router.push("/login");
      } else {
        toast.error(result.error || t("An error occurred", "خطایی رخ داد"));
      }
    } catch (error) {
      console.error("Sign up error:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsLoading(false);
    }
  };

  const onSendCode = async () => {
    if (!(await trigger("phone"))) return;
    if (!csrfToken) {
      toast.error(t("Security token unavailable. Refresh the page and try again.", "توکن امنیتی در دسترس نیست. صفحه را تازه کنید و دوباره تلاش کنید."));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/phone/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({ registration: true, phone: watch("phone"), csrfToken }),
      });
      const result = await response.json();
      if (!response.ok) {
        const errorMessage = result.code === "PHONE_ALREADY_REGISTERED"
          ? t("This phone number is already registered.", "این شماره تلفن قبلاً ثبت شده است.")
          : result.error || t("Failed to send verification code.", "ارسال کد تأیید ناموفق بود.");
        toast.error(errorMessage);
        return;
      }
      setCodeSent(true);
      setVerificationCode("");
      toast.success(t("Verification code sent to your phone.", "کد تأیید به تلفن شما ارسال شد."));
    } catch (error) {
      console.error("Signup verification code error:", error);
      toast.error(t("An error occurred while sending the code.", "هنگام ارسال کد خطایی رخ داد."));
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyCode = async () => {
    if (!/^\d{6}$/.test(verificationCode)) {
      toast.error(t("Enter the 6-digit code sent to your phone.", "کد ۶ رقمی ارسال‌شده به تلفن خود را وارد کنید."));
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({
          registration: true,
          phone: watch("phone"),
          code: verificationCode,
          csrfToken,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || t("Invalid verification code.", "کد تأیید نامعتبر است."));
        return;
      }
      setRegistrationToken(result.verificationToken);
      setPhoneVerified(true);
      toast.success(t("Phone number verified. You can now create your account.", "شماره تلفن تأیید شد. اکنون می‌توانید حساب خود را ایجاد کنید."));
    } catch (error) {
      console.error("Signup phone verification error:", error);
      toast.error(t("An error occurred while verifying the code.", "هنگام تأیید کد خطایی رخ داد."));
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <>
        <Navbar />
        <div className={styles.authContainer}>
          <div className={styles.authCard}>
            <p>{t("Loading...", "در حال بارگذاری...")}</p>
          </div>
        </div>
        <Footer />
        <BottomBar />
      </>
    );
  }

  // Don't show form if already authenticated (will redirect)
  if (status === "authenticated") {
    return null;
  }

  return (
    <>
      <Navbar />
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <h1 className={styles.title}>{t("Sign Up", "ثبت نام")}</h1>
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <Input
              type="text"
              label={t("First Name", "نام")}
              {...register("name")}
              error={errors.name?.message}
              autoComplete="name"
            />

            <Input
              type="text"
              label={t("Family Name", "نام خانوادگی")}
              {...register("surname")}
              error={errors.surname?.message}
              autoComplete="family-name"
            />

            <Input
              type="email"
              label={t("Email (Optional)", "ایمیل (اختیاری)")}
              {...register("email")}
              error={errors.email?.message}
              autoComplete="email"
            />

            <Input
              type="tel"
              label={t("Phone Number", "شماره تلفن")}
              {...phoneRegistration}
              onChange={(event) => {
                phoneRegistration.onChange(event);
                setCodeSent(false);
                setVerificationCode("");
                setPhoneVerified(false);
                setRegistrationToken("");
              }}
              error={errors.phone?.message}
              autoComplete="tel"
            />

            {!phoneVerified && (
              <Button type="button" onClick={onSendCode} disabled={isLoading}>
                {isLoading
                  ? t("Sending...", "در حال ارسال...")
                  : codeSent
                    ? t("Resend Verification Code", "ارسال دوباره کد تأیید")
                    : t("Send Verification Code", "ارسال کد تأیید")}
              </Button>
            )}

            {codeSent && !phoneVerified && (
              <>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  label={t("Confirmation Code", "کد تأیید")}
                  value={verificationCode}
                  onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))}
                  maxLength={6}
                  placeholder={t("Enter the 6-digit code", "کد ۶ رقمی را وارد کنید")}
                />
                <Button type="button" onClick={onVerifyCode} disabled={isLoading || verificationCode.length !== 6}>
                  {isLoading ? t("Verifying...", "در حال تأیید...") : t("Verify Code", "تأیید کد")}
                </Button>
              </>
            )}

            {phoneVerified && <p>{t("Phone number verified", "شماره تلفن تأیید شده است")}</p>}

            <Input
              type="password"
              label={t("Password", "رمز عبور")}
              {...register("password")}
              error={errors.password?.message}
              autoComplete="new-password"
            />

            <Input
              type="password"
              label={t("Confirm Password", "تایید رمز عبور")}
              {...register("confirmPassword")}
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
            />

            <Button type="submit" disabled={isLoading || !phoneVerified} className={styles.submitButton}>
              {isLoading ? t("Loading...", "در حال بارگذاری...") : t("Sign Up", "ثبت نام")}
            </Button>
          </form>

          <p className={styles.link}>
            {t("Already have an account?", "قبلاً حساب کاربری دارید؟")}{" "}
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
