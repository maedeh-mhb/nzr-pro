"use client";

import { useState, useEffect, useRef, ImgHTMLAttributes } from "react";
import styles from "@/styles/components/_lazyImage.module.scss";

interface LazyImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  threshold?: number;
  rootMargin?: string;
}

export default function LazyImage({
  src,
  alt,
  placeholder,
  threshold = 0.1,
  rootMargin = "50px",
  className = "",
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setError(true);
    setIsLoaded(false);
  };

  return (
    <div ref={imgRef} className={`${styles.lazyImageContainer} ${className}`}>
      {!isInView && placeholder && (
        <img
          src={placeholder}
          alt=""
          className={styles.placeholder}
          aria-hidden="true"
        />
      )}
      {isInView && (
        <>
          {!isLoaded && placeholder && (
            <img
              src={placeholder}
              alt=""
              className={styles.placeholder}
              aria-hidden="true"
            />
          )}
          <img
            src={src}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            className={`${styles.image} ${isLoaded ? styles.loaded : ""} ${error ? styles.error : ""}`}
            loading="lazy"
            {...props}
          />
        </>
      )}
    </div>
  );
}

