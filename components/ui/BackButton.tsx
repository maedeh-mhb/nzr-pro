'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/utils/language';
import styles from './BackButton.module.scss';

interface BackButtonProps {
    href?: string;
    label?: string;
    variant?: 'default' | 'minimal' | 'outlined';
    className?: string;
    onClick?: () => void;
}

export default function BackButton({
    href,
    label,
    variant = 'default',
    className = '',
    onClick
}: BackButtonProps) {
    const router = useRouter();
    const { language, t } = useLanguage();

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else if (href) {
            router.push(href);
        } else {
            router.back();
        }
    };

    const displayLabel = label || t('backButton', language);

    return (
        <button
            type="button"
            onClick={handleClick}
            className={`${styles.backButton} ${styles[variant]} ${className}`}
            aria-label={displayLabel}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className={styles.icon}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={language === 'fa' ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'}
                />
            </svg>
            <span>{displayLabel}</span>
        </button>
    );
}
