"use client";


import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import toast from "react-hot-toast";
import Link from "next/link";
import { useLanguage } from "@/lib/utils/language";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import styles from "@/styles/components/_auth.module.scss";

const signInSchema = yup.object({
  email: yup.string().email("Invalid email").required("Email is required"),
  password: yup.string().min(6, "Password must be at least 6 characters").required("Password is required"),
});

type SignInFormData = yup.InferType<typeof signInSchema>;

export default function SignInPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: yupResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(t("Invalid credentials", "شما کاربر سایت نیستید،،ثبت نام کنید"));
      } else {
        toast.success(t("Signed in successfully!", "با موفقیت وارد شدید!"));
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <h1 className={styles.title}>{t("Sign In", "ورود")}</h1>
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          <Input
            type="email"
            label={t("Email", "ایمیل")}
            {...register("email")}
            error={errors.email?.message}
          />

          <Input
            type="password"
            label={t("Password", "رمز عبور")}
            {...register("password")}
            error={errors.password?.message}
          />

          <Button type="submit" disabled={isLoading} className={styles.submitButton}>
            {isLoading ? t("Loading...", "در حال بارگذاری...") : t("Sign In", "ورود")}
          </Button>
        </form>

        <div className={styles.divider}>
          <p className={styles.dividerText}>{t("Or sign in with", "یا با استفاده از")}</p>
          <div className={styles.oauthButtons}>
            <button
              type="button"
              onClick={() => signIn("google")}
              className={styles.oauthButton}
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => signIn("github")}
              className={styles.oauthButton}
            >
              GitHub
            </button>
          </div>
        </div>

        <p className={styles.link}>
          {t("Don't have an account?", "حساب کاربری ندارید؟")}{" "}
          <Link href="/auth/signup" className={styles.linkText}>
            {t("Sign Up", "ثبت نام")}
          </Link>
        </p>
      </div>
    </div>
  );
}
