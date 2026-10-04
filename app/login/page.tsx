"use client";


import { useState, useEffect } from "react";
import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/utils/language";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomBar from "@/components/BottomBar";
import BackButton from "@/components/ui/BackButton";
import styles from "@/styles/pages/_login.module.scss";
import { FiEye, FiEyeOff } from "react-icons/fi";

// Login Schema
const loginSchema = yup.object({
  emailOrPhone: yup
    .string()
    .required("Email or phone number is required")
    .test("is-email-or-phone", "Must be a valid email or phone number", (value) => {
      if (!value) return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[0-9]{10,15}$/;
      return emailRegex.test(value) || phoneRegex.test(value.replace(/[\s\-\(\)]/g, ""));
    }),
  password: yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
});

// Signup Schema
const signupSchema = yup.object({
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

// Forgot Password Schema
const forgotPasswordSchema = yup.object({
  email: yup.string().email("Invalid email").required("Email is required"),
});

type LoginFormData = yup.InferType<typeof loginSchema>;
type SignupFormData = yup.InferType<typeof signupSchema>;
type ForgotPasswordFormData = yup.InferType<typeof forgotPasswordSchema>;

type PasswordStrength = "weak" | "medium" | "strong" | null;

export default function LoginPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeForm, setActiveForm] = useState<"login" | "signup" | "forgot">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [signupCodeSent, setSignupCodeSent] = useState(false);
  const [signupCode, setSignupCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [registrationToken, setRegistrationToken] = useState("");

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (!error) return;

    const errorMessage = error === "AccessDenied"
      ? t("Google sign-in was cancelled or denied.", "ورود با گوگل لغو شد یا اجازه دسترسی داده نشد.")
      : error === "Configuration"
        ? t("Google sign-in is not configured correctly.", "ورود با گوگل به درستی پیکربندی نشده است.")
        : t("Google sign-in failed. Please try again.", "ورود با گوگل ناموفق بود. لطفاً دوباره تلاش کنید.");

    toast.error(errorMessage);
    window.history.replaceState({}, document.title, window.location.pathname);
  }, [t]);

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
      const userRole = (session.user as any)?.role;
      if (userRole === "admin" || userRole === "superadmin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    }
  }, [session, status, router]);

  // Login Form
  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: loginErrors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // Signup Form
  const {
    register: registerSignup,
    handleSubmit: handleSubmitSignup,
    watch: watchSignup,
    trigger: triggerSignup,
    formState: { errors: signupErrors },
  } = useForm<SignupFormData>({
    resolver: yupResolver(signupSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });
  const signupPhoneRegistration = registerSignup("phone");

  // Forgot Password Form
  const {
    register: registerForgot,
    handleSubmit: handleSubmitForgot,
    formState: { errors: forgotErrors },
  } = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(forgotPasswordSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // Watch password for strength indicator
  const signupPassword = watchSignup("password");
  const signupConfirmPassword = watchSignup("confirmPassword");
  const passwordsMatch = !!(signupPassword && signupConfirmPassword && signupPassword === signupConfirmPassword);

  useEffect(() => {
    if (signupPassword && activeForm === "signup") {
      checkPasswordStrength(signupPassword);
    } else {
      setPasswordStrength(null);
    }
  }, [signupPassword, activeForm]);

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
    if (password.match(/\d/)) strength++;
    if (password.match(/[^a-zA-Z\d]/)) strength++;

    if (strength <= 1) {
      setPasswordStrength("weak");
    } else if (strength <= 2) {
      setPasswordStrength("medium");
    } else {
      setPasswordStrength("strong");
    }
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const onLoginSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        emailOrPhone: data.emailOrPhone,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(t("Invalid credentials", "اعتبارنامه نامعتبر"));
      } else if (result?.ok) {
        const response = await fetch("/api/auth/user-role");
        const roleData = await response.json();

        if (roleData.role === "admin" || roleData.role === "superadmin") {
          toast.success(t("Signed in successfully!", "با موفقیت وارد شدید!"));
          setTimeout(() => {
            router.push("/admin");
            router.refresh();
          }, 100);
          return;
        }

        const userResponse = await fetch("/api/auth/me");
        const userData = await userResponse.json();
        const shouldChangePassword = Boolean(userData?.user?.mustChangePassword);

        if (shouldChangePassword) {
          toast.success(
            t(
              "You signed in with your temporary password. Please change it immediately.",
              "شما با رمز عبور موقت وارد شدید. لطفاً فوراً آن را تغییر دهید."
            )
          );
          setTimeout(() => {
            router.push(`/reset-password?email=${encodeURIComponent(data.emailOrPhone)}`);
            router.refresh();
          }, 100);
        } else {
          toast.success(t("Signed in successfully!", "با موفقیت وارد شدید!"));
          setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
          }, 100);
        }
      }
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsLoading(false);
    }
  };

  const onSignupSubmit = async (data: SignupFormData) => {
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
          password: data.password,
          phone: data.phone,
          verificationToken: registrationToken,
          csrfToken,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(t(result.error || "Signup failed", result.errorFa || "ثبت‌نام ناموفق بود"));
      } else {
        toast.success(t("Account created successfully!", "حساب با موفقیت ایجاد شد!"));
        // Auto login after signup
        const signInResult = await signIn("credentials", {
          emailOrPhone: data.email || data.phone,
          password: data.password,
          redirect: false,
        });

        if (signInResult?.ok) {
          setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
          }, 100);
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsLoading(false);
    }
  };

  const onSendSignupCode = async () => {
    if (!(await triggerSignup("phone"))) return;
    if (!csrfToken) {
      toast.error(t("Security token unavailable. Refresh the page and try again.", "توکن امنیتی در دسترس نیست. صفحه را تازه کنید و دوباره تلاش کنید."));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/phone/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({ registration: true, phone: watchSignup("phone"), csrfToken }),
      });
      const result = await response.json();
      if (!response.ok) {
        const errorMessage = result.code === "PHONE_ALREADY_REGISTERED"
          ? t("This phone number is already registered.", "این شماره تلفن قبلاً ثبت شده است.")
          : result.error || t("Failed to send verification code.", "ارسال کد تأیید ناموفق بود.");
        toast.error(errorMessage);
        return;
      }
      setSignupCodeSent(true);
      setSignupCode("");
      toast.success(t("Verification code sent to your phone.", "کد تأیید به تلفن شما ارسال شد."));
    } catch (error) {
      console.error("Signup verification code error:", error);
      toast.error(t("An error occurred while sending the code.", "هنگام ارسال کد خطایی رخ داد."));
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifySignupCode = async () => {
    if (!/^\d{6}$/.test(signupCode)) {
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
          phone: watchSignup("phone"),
          code: signupCode,
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

  const onForgotPasswordSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(t(result.error || "Failed to send reset email", result.error || "ارسال ایمیل بازنشانی ناموفق بود"));
      } else {
        toast.success(
          t(
            "If an account exists with this email, a password reset link has been sent.",
            "اگر حسابی با این ایمیل وجود داشته باشد، لینک بازنشانی رمز عبور ارسال شده است."
          )
        );
        setActiveForm("login");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signIn("google", { callbackUrl: "/dashboard" });
      if (result?.error) {
        toast.error(
          t("Google sign-in failed. Please try again.", "ورود با گوگل ناموفق بود. لطفاً دوباره تلاش کنید.")
        );
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error(
        t("An error occurred during Google sign-in.", "خطایی هنگام ورود با گوگل رخ داد.")
      );
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
          {/* Logo Section */}
          <div className={styles.authLogo}>
            <Image 
              src="/images/logo.png" 
              alt="Logo" 
              width={80}
              height={80}
              priority
            />
            <h1 className={styles.authTitle}>
              {activeForm === "login"
                ? t("Welcome Back", "خوش آمدید")
                : activeForm === "signup"
                  ? t("Create Account", "ایجاد حساب")
                  : t("Reset Password", "بازنشانی رمز عبور")}
            </h1>
            <p className={styles.authSubtitle}>
              {activeForm === "login"
                ? t("Sign in to continue", "برای ادامه وارد شوید")
                : activeForm === "signup"
                  ? t("", "")
                  : t("Enter your email to reset", "ایمیل خود را وارد کنید")}
            </p>
          </div>

          {/* Auth Content */}
          <div className={styles.authContent}>
            {/* Login Form */}
            <form
              className={`${styles.authForm} ${activeForm === "login" ? styles.active : ""}`}
              onSubmit={handleSubmitLogin(onLoginSubmit)}
            >
              <div className={styles.formGroup}>
                <label className={styles.label}>{t("Email or Phone", "ایمیل یا تلفن")}</label>
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    dir="ltr"
                    {...registerLogin("emailOrPhone")}
                    placeholder={t("", "")}
                    className={loginErrors.emailOrPhone ? styles.inputError : ""}
                  />
                  <span className={styles.inputIcon}>👤</span>
                </div>
                {loginErrors.emailOrPhone && (
                  <span className={styles.error}>{loginErrors.emailOrPhone.message}</span>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>{t("Password", "رمز عبور")}</label>
                <div className={styles.inputWrapper}>
                  <input
                    type={showPassword.loginPassword ? "text" : "password"}
                    {...registerLogin("password")}
                    placeholder={t("", "")}
                    className={loginErrors.password ? styles.inputError : ""}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => togglePasswordVisibility("loginPassword")}
                    aria-label={showPassword.loginPassword ? t("Hide password", "رمز عبور را پنهان کن") : t("Show password", "رمز عبور را نمایش بده")}
                  >
                    {showPassword.loginPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {loginErrors.password && <span className={styles.error}>{loginErrors.password.message}</span>}
              </div>

              <div className={styles.checkboxGroup}>
                <input type="checkbox" id="keepSignedIn" />
                <label htmlFor="keepSignedIn">{t("Keep me signed in", "من را به خاطر بسپار")}</label>
              </div>

              <div className={styles.forgotPassword}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveForm("forgot");
                  }}
                >
                  {t("Forgot Password?", "رمز عبور را فراموش کرده‌اید؟")}
                </a>
              </div>

              <button type="submit" className={styles.btnPrimary} disabled={isLoading}>
                {isLoading ? t("Loading...", "در حال بارگذاری...") : t("Sign In", "ورود")}
              </button>

              {/* <div className={styles.divider}>
                <span>{t("Or continue with", "یا ادامه دهید با")}</span>
              </div> */}

              {/* <button type="button" className={styles.btnGoogle} onClick={handleGoogleSignIn}>
                <svg className={styles.googleIcon} viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>{t("Sign in with Google", "ورود با گوگل")}</span>
              </button> */}

              <div className={styles.switchAuth}>
                <span>{t("Don't have an account?", "حساب کاربری ندارید؟")}</span>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveForm("signup");
                  }}
                >
                  {t("Sign Up", "ثبت‌نام")}
                </a>
              </div>

              <p className={styles.consentText}>
                {language === "en" ? (
                  <>
                    By creating an account or signing in, you agree to our{" "}
                    <a href="/terms">Terms of Service</a>{" "}and{" "}
                    <a href="/privacy">Privacy Policy</a>. We use your data only to provide and improve our services.
                  </>
                ) : (
                  <>
                    با ایجاد حساب یا ورود، <a href="/terms">شرایط استفاده</a> و <a href="/privacy">سیاست حریم خصوصی</a> ما را میپذیرید. اطلاعات شما تنها برای ارائه و بهبود خدمات استفاده میشود.
                  </>
                )}
              </p>

            </form>

            {/* Signup Form */}
            <form
              className={`${styles.authForm} ${activeForm === "signup" ? styles.active : ""}`}
              onSubmit={handleSubmitSignup(onSignupSubmit)}
            >
              <div className={styles.formGroup}>
                <label className={styles.label}>{t("First Name", "نام")}</label>
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    autoComplete="given-name"
                    {...registerSignup("name")}
                    placeholder={t("")}
                    className={signupErrors.name ? styles.inputError : ""}
                    required
                  />
                  <span className={styles.inputIcon}>👤</span>
                </div>
                {signupErrors.name && <span className={styles.error}>{signupErrors.name.message}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>{t("Family Name", "نام خانوادگی")}</label>
                <div className={styles.inputWrapper}>
                  <input
                    type="text"
                    autoComplete="family-name"
                    {...registerSignup("surname")}
                    placeholder={t("")}
                    className={signupErrors.surname ? styles.inputError : ""}
                    required
                  />
                  <span className={styles.inputIcon}>👤</span>
                </div>
                {signupErrors.surname && <span className={styles.error}>{signupErrors.surname.message}</span>}
              </div>

    
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <span>{t("Phone Number", "شماره تلفن")}</span>
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    type="tel"
                    {...signupPhoneRegistration}
                    onChange={(event) => {
                      signupPhoneRegistration.onChange(event);
                      setSignupCodeSent(false);
                      setSignupCode("");
                      setPhoneVerified(false);
                      setRegistrationToken("");
                    }}
                    placeholder={t("Enter phone number", "شماره تلفن را وارد کنید")}
                    required
                    className={signupErrors.phone ? styles.inputError : ""}
                  />
                  <span className={styles.inputIcon}>📱</span>
                </div>
                {signupErrors.phone && <span className={styles.error}>{signupErrors.phone.message}</span>}
                {!phoneVerified && (
                  <button type="button" className={styles.btnPrimary} onClick={onSendSignupCode} disabled={isLoading}>
                    {isLoading
                      ? t("Sending...", "در حال ارسال...")
                      : signupCodeSent
                        ? t("Resend Verification Code", "ارسال دوباره کد تأیید")
                        : t("Send Verification Code", "ارسال کد تأیید")}
                  </button>
                )}
                {signupCodeSent && !phoneVerified && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>{t("Confirmation Code", "کد تأیید")}</label>
                    <div className={styles.inputWrapper}>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={signupCode}
                        onChange={(event) => setSignupCode(event.target.value.replace(/\D/g, ""))}
                        placeholder={t("Enter the 6-digit code", "کد ۶ رقمی را وارد کنید")}
                      />
                    </div>
                    <button type="button" className={styles.btnPrimary} onClick={onVerifySignupCode} disabled={isLoading || signupCode.length !== 6}>
                      {isLoading ? t("Verifying...", "در حال تأیید...") : t("Verify Code", "تأیید کد")}
                    </button>
                  </div>
                )}
                {phoneVerified && (
                  <span className={styles.phoneVerified}>
                    {t("Phone number verified", "شماره تلفن تأیید شده است")}
                  </span>
                )}
              </div>
 <div className={styles.formGroup}>
                <label className={styles.label}>
                  <span>{t("Email Address", "آدرس ایمیل")}</span>
                  <span className={styles.optional}>{t("(Optional)", "(اختیاری)")}</span>
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    type="email"
                    {...registerSignup("email")}
                    placeholder={t("")}
                    className={signupErrors.email ? styles.inputError : ""}
                  />
                  {/* <span className={styles.inputIcon}>📧</span> */}
                </div>
                {signupErrors.email && <span className={styles.error}>{signupErrors.email.message}</span>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>{t("Password", "رمز عبور")}</label>
                <div className={styles.inputWrapper}>
                  <input
                    type={showPassword.signupPassword ? "text" : "password"}
                    {...registerSignup("password")}
                    placeholder={t("Create password", "رمز عبور ایجاد کنید")}
                    className={signupErrors.password ? styles.inputError : passwordsMatch ? styles.inputMatch : ""}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => togglePasswordVisibility("signupPassword")}
                    aria-label={showPassword.signupPassword ? t("Hide password", "رمز عبور را پنهان کن") : t("Show password", "رمز عبور را نمایش بده")}
                  >
                    {showPassword.signupPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {signupErrors.password && <span className={styles.error}>{signupErrors.password.message}</span>}
                {passwordStrength && (
                  <div className={styles.passwordStrength} data-strength={passwordStrength}>
                    <div className={styles.strengthBar}>
                      <div
                        className={`${styles.strengthFill} ${passwordStrength === "weak"
                          ? styles.strengthWeak
                          : passwordStrength === "medium"
                            ? styles.strengthMedium
                            : styles.strengthStrong
                          }`}
                      />
                    </div>
                    <small className={styles.strengthText}>
                      {passwordStrength === "weak"
                        ? t("Weak password", "رمز عبور ضعیف")
                        : passwordStrength === "medium"
                          ? t("Medium password", "رمز عبور متوسط")
                          : t("Strong password", "رمز عبور قوی")}
                    </small>
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>{t("Confirm Password", "تأیید رمز عبور")}</label>
                <div className={styles.inputWrapper}>
                  <input
                    type={showPassword.signupPasswordConfirm ? "text" : "password"}
                    {...registerSignup("confirmPassword")}
                    placeholder={t("Re-enter password", "رمز عبور را دوباره وارد کنید")}
                    className={signupErrors.confirmPassword ? styles.inputError : passwordsMatch ? styles.inputMatch : ""}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => togglePasswordVisibility("signupPasswordConfirm")}
                    aria-label={showPassword.signupPasswordConfirm ? t("Hide password", "رمز عبور را پنهان کن") : t("Show password", "رمز عبور را نمایش بده")}
                  >
                    {showPassword.signupPasswordConfirm ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {signupErrors.confirmPassword && (
                  <span className={styles.error}>{signupErrors.confirmPassword.message}</span>
                )}
              </div>

              <button type="submit" className={styles.btnPrimary} disabled={isLoading || !phoneVerified}>
                {isLoading ? t("Loading...", "در حال بارگذاری...") : t("Create Account", "ایجاد حساب")}
              </button>

              <div className={styles.divider}>
                <span>{t("Or sign up with", "یا ثبت‌نام با")}</span>
              </div>

              <button type="button" className={styles.btnGoogle} onClick={handleGoogleSignIn}>
                <svg className={styles.googleIcon} viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>{t("Sign up with Google", "ثبت‌نام با گوگل")}</span>
              </button>

              <div className={styles.switchAuth}>
                <span>{t("Already have an account?", "حساب کاربری دارید؟")}</span>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveForm("login");
                  }}
                >
                  {t("Sign In", "ورود")}
                </a>
              </div>
            </form>

            {/* Forgot Password Form */}
            <form
              className={`${styles.authForm} ${activeForm === "forgot" ? styles.active : ""}`}
              onSubmit={handleSubmitForgot(onForgotPasswordSubmit)}
            >
              <div className={styles.formGroup}>
                <label className={styles.label}>{t("Email Address", "آدرس ایمیل")}</label>
                <div className={styles.inputWrapper}>
                  <input
                    type="email"
                    {...registerForgot("email")}
                    placeholder={t("Enter your email", "ایمیل خود را وارد کنید")}
                    className={forgotErrors.email ? styles.inputError : ""}
                  />
                  <span className={styles.inputIcon}>📧</span>
                </div>
                {forgotErrors.email && <span className={styles.error}>{forgotErrors.email.message}</span>}
              </div>

              <button type="submit" className={styles.btnPrimary} disabled={isLoading}>
                {isLoading ? t("Loading...", "در حال بارگذاری...") : t("Reset Password", "بازنشانی رمز عبور")}
              </button>

              <div className={styles.switchAuth}>
                <BackButton
                  label={t("← Back to Sign In", "← بازگشت به ورود")}
                  variant="minimal"
                  className={styles.backLink}
                  onClick={() => setActiveForm("login")}
                />
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer />
      <BottomBar />
    </>
  );
}
