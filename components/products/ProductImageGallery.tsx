"use client";

import { useState, useMemo } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import Image from "next/image";
import styles from "@/styles/components/_productImageGallery.module.scss";

interface ProductImageGalleryProps {
    image?: string | null;
    images?: string[] | null;
    altText?: string;
    imageFit?: "cover" | "contain";
    showThumbnails?: boolean;
}

export default function ProductImageGallery({
    image,
    images,
    altText = "Product image",
    imageFit = "cover",
    showThumbnails = false,
}: ProductImageGalleryProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const mergedImages = useMemo(() => {
        const all = [];
        if (image) all.push(image);
        if (images && Array.isArray(images)) {
            all.push(...images.filter((img) => img && img !== image));
        }
        return all.filter(Boolean);
    }, [image, images]);

    const displayImages = mergedImages.length > 0
        ? mergedImages
        : ["/placeholder-product.svg"];

    const currentImage = displayImages[currentIndex] || "/placeholder-product.svg";
    const hasMultiple = displayImages.length > 1;

    const handlePrevious = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentIndex((prev) =>
            prev === 0 ? displayImages.length - 1 : prev - 1
        );
    };

    const handleNext = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentIndex((prev) =>
            prev === displayImages.length - 1 ? 0 : prev + 1
        );
    };

    return (
        <div className={styles.gallery}>
            <div className={styles.imageContainer}>
                <Image
                    src={currentImage}
                    alt={altText}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    unoptimized
                    className={`${styles.image} ${imageFit === "contain" ? styles.imageContain : ""}`}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        (e.currentTarget as HTMLImageElement).src = "/placeholder-product.svg";
                    }}
                />

                {hasMultiple && (
                    <>
                        <button
                            className={`${styles.navButton} ${styles.prevButton}`}
                            onClick={handlePrevious}
                            aria-label="Previous image"
                            type="button"
                        >
                            <FiChevronLeft size={20} />
                        </button>
                        <button
                            className={`${styles.navButton} ${styles.nextButton}`}
                            onClick={handleNext}
                            aria-label="Next image"
                            type="button"
                        >
                            <FiChevronRight size={20} />
                        </button>

                        {!showThumbnails && (
                        <div className={styles.dotsContainer}>
                            {displayImages.map((_, index) => (
                                <button
                                    key={index}
                                    className={`${styles.dot} ${index === currentIndex ? styles.active : ""}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setCurrentIndex(index);
                                    }}
                                    aria-label={`Go to image ${index + 1}`}
                                    type="button"
                                />
                            ))}
                        </div>
                        )}
                    </>
                )}
            </div>

            {showThumbnails && hasMultiple && (
                <div className={styles.thumbnails}>
                    {displayImages.map((src, index) => (
                        <button
                            key={`${src}-${index}`}
                            type="button"
                            className={`${styles.thumbnail} ${index === currentIndex ? styles.thumbnailActive : ""}`}
                            onClick={() => setCurrentIndex(index)}
                            aria-label={`Show image ${index + 1}`}
                            aria-current={index === currentIndex}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="" loading="lazy" decoding="async" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
