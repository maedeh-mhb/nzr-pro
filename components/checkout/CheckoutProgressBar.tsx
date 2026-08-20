"use client";

import { useLanguage } from "@/lib/utils/language";
import { FiCheck, FiShoppingCart, FiTruck, FiCreditCard, FiCheckCircle, FiUser } from "react-icons/fi";
import styles from "@/styles/components/_checkoutProgressBar.module.scss";

export type CheckoutStep = "cart" | "account" | "shipping" | "payment" | "complete";

interface CheckoutProgressBarProps {
    currentStep: CheckoutStep;
    onStepClick?: (step: CheckoutStep) => void;
    includeAccountStep?: boolean;
}

const allSteps: Array<{
    key: CheckoutStep;
    labelEn: string;
    labelFa: string;
    icon: React.ReactNode;
}> = [
        {
            key: "cart",
            labelEn: "Cart",
            labelFa: "سبد خرید",
            icon: <FiShoppingCart />,
        },
        {
            key: "account",
            labelEn: "Account",
            labelFa: "حساب کاربری",
            icon: <FiUser />,
        },
        {
            key: "shipping",
            labelEn: "Shipping",
            labelFa: "ارسال",
            icon: <FiTruck />,
        },
        {
            key: "payment",
            labelEn: "Payment",
            labelFa: "پرداخت",
            icon: <FiCreditCard />,
        },
        {
            key: "complete",
            labelEn: "Complete",
            labelFa: "تکمیل",
            icon: <FiCheckCircle />,
        },
    ];

export default function CheckoutProgressBar({ currentStep, onStepClick, includeAccountStep = false }: CheckoutProgressBarProps) {
    const { t, language } = useLanguage();

    const steps = includeAccountStep ? allSteps : allSteps.filter((step) => step.key !== "account");

    const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

    const getStepStatus = (stepIndex: number): "completed" | "current" | "upcoming" => {
        if (stepIndex < currentStepIndex) return "completed";
        if (stepIndex === currentStepIndex) return "current";
        return "upcoming";
    };

    const handleStepClick = (step: CheckoutStep, stepIndex: number) => {
        // Only allow clicking on completed steps
        if (stepIndex < currentStepIndex && onStepClick) {
            onStepClick(step);
        }
    };

    return (
        <div className={styles.progressBarContainer}>
            <div className={styles.progressBar}>
                {steps.map((step, index) => {
                    const status = getStepStatus(index);
                    const isClickable = index < currentStepIndex;

                    return (
                        <div key={step.key} className={styles.stepWrapper}>
                            {/* Connecting Line */}
                            {index > 0 && (
                                <div
                                    className={`${styles.stepLine} ${status === "completed"
                                        ? styles.stepLineActive
                                        : ""
                                        }`}
                                />
                            )}

                            {/* Step Item */}
                            <div
                                className={`${styles.stepItem} ${styles[status]} ${isClickable ? styles.clickable : ""
                                    }`}
                                onClick={() => handleStepClick(step.key, index)}
                                role={isClickable ? "button" : undefined}
                                tabIndex={isClickable ? 0 : undefined}
                                onKeyDown={(e) => {
                                    if (isClickable && (e.key === "Enter" || e.key === " ")) {
                                        e.preventDefault();
                                        handleStepClick(step.key, index);
                                    }
                                }}
                            >
                                {/* Step Icon/Number */}
                                <div className={styles.stepIcon}>
                                    {status === "completed" ? (
                                        <FiCheck className={styles.checkIcon} />
                                    ) : (
                                        <span className={styles.iconWrapper}>{step.icon}</span>
                                    )}
                                </div>

                                {/* Step Label */}
                                <div className={styles.stepLabel}>
                                    {language === "fa" ? step.labelFa : step.labelEn}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
