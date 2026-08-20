"use client";

import { signIn } from "next-auth/react";
import { useLanguage } from "@/lib/utils/language";
import { FcGoogle } from "react-icons/fc";
import styles from "@/styles/components/_googleSignInButton.module.scss";

interface GoogleSignInButtonProps {
    redirectUrl?: string;
    className?: string;
    size?: "small" | "medium" | "large";
}

export default function GoogleSignInButton({
    redirectUrl = "/dashboard",
    className = "",
    size = "medium"
}: GoogleSignInButtonProps) {
    const { t } = useLanguage();

    const handleGoogleSignIn = () => {
        signIn("google", { callbackUrl: redirectUrl });
    };

    return (
        <button
            type="button"
            onClick={handleGoogleSignIn}
            className={`${styles.googleButton} ${styles[size]} ${className}`}
            aria-label={t("Sign in with Google", "ورود با گوگل")}
        >
            <FcGoogle className={styles.googleIcon} />
            <span className={styles.googleText}>
                {t("Continue with Google", "ادامه با گوگل")}
            </span>
        </button>
    );
}
