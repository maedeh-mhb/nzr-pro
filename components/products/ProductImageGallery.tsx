"use client";

import { useState, useMemo } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import styles from "@/styles/components/_productImageGallery.module.scss";

interface ProductImageGalleryProps {
    image?: string | null;
    images?: string[] | null;
    altText?: string;
}

export default function ProductImageGallery({
    image,
    images,
    altText = "Product image",
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
        : ["/placeholder-product.jpg"];

    const currentImage = displayImages[currentIndex] || "/placeholder-product.jpg";
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
                <img
                    src={currentImage}
                    alt={altText}
                    className={styles.image}
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder-product.jpg";
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
                    </>
                )}
            </div>
        </div>
    );
}
