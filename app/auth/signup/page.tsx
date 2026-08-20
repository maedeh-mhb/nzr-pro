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
  name: yup.string().min(2, "Name must be at least 2 characters").required("Name is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
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
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: yupResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
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
              label={t("Name", "نام")}
              {...register("name")}
              error={errors.name?.message}
              autoComplete="name"
            />

            <Input
              type="email"
              label={t("Email", "ایمیل")}
              {...register("email")}
              error={errors.email?.message}
              autoComplete="email"
            />

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

            <Button type="submit" disabled={isLoading} className={styles.submitButton}>
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
