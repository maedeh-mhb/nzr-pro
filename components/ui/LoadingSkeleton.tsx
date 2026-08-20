import React from 'react';
import styles from './LoadingSkeleton.module.scss';

interface ProductCardSkeletonProps {
    count?: number;
}

export const ProductCardSkeleton: React.FC<ProductCardSkeletonProps> = ({ count = 1 }) => {
    return (
        <>
            {Array.from({ length: count }).map((_, index) => (
                <div key={index} className={styles.productCard}>
                    <div className={styles.productImage} />
                    <div className={styles.productContent}>
                        <div className={styles.title} />
                        <div className={styles.description} />
                        <div className={styles.descriptionShort} />
                        <div className={styles.price} />
                        <div className={styles.button} />
                    </div>
                </div>
            ))}
        </>
    );
};

interface TextSkeletonProps {
    lines?: number;
    width?: 'short' | 'medium' | 'full';
}

export const TextSkeleton: React.FC<TextSkeletonProps> = ({
    lines = 1,
    width = 'full'
}) => {
    return (
        <>
            {Array.from({ length: lines }).map((_, index) => (
                <div
                    key={index}
                    className={`${styles.textLine} ${width !== 'full' ? styles[width] : ''}`}
                    style={{ marginBottom: index < lines - 1 ? '0.5rem' : '0' }}
                />
            ))}
        </>
    );
};

interface ButtonSkeletonProps {
    className?: string;
}

export const ButtonSkeleton: React.FC<ButtonSkeletonProps> = ({ className }) => {
    return <div className={`${styles.button} ${className || ''}`} />;
};

// Default export for convenience
export default ProductCardSkeleton;
