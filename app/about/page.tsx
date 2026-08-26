"use client";


import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomBar from "@/components/BottomBar";
import { useLanguage } from "@/lib/utils/language";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import styles from "@/styles/components/_contentPage.module.scss";

interface FAQItem {
  questionEn: string;
  questionFa: string;
  answerEn: string;
  answerFa: string;
}

export default function AboutPage() {
  const { t, language } = useLanguage();
  const [content, setContent] = useState<string>("");
  const [faqEnabled, setFaqEnabled] = useState(false);
  const [faqItems, setFaqItems] = useState<FAQItem[]>([]);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/about-us");
        if (response.ok) {
          const data = await response.json();
          const displayContent = language === "fa" ? data.contentFa : data.contentEn;
          setContent(displayContent || "");
          setFaqEnabled(data.faqEnabled || false);
          setFaqItems(data.faqItems || []);

          // Update document title and meta tags dynamically based on language
          const currentTitle = language === "fa"
            ? (data.metaTitleFa || t("About Us", "درباره ما"))
            : (data.metaTitleEn || t("About Us", "About Us"));

          const currentDescription = language === "fa"
            ? (data.metaDescriptionFa || t("Learn more about Nazira, our mission, values, and team.", "درباره Nazira، ماموریت، ارزش‌ها و تیم ما بیشتر بدانید."))
            : (data.metaDescriptionEn || t("Learn more about Nazira, our mission, values, and team.", "Learn more about Nazira, our mission, values, and team."));

          // Update document title
          document.title = currentTitle;

          // Update meta description
          let metaDescription = document.querySelector('meta[name="description"]');
          if (!metaDescription) {
            metaDescription = document.createElement("meta");
            metaDescription.setAttribute("name", "description");
            document.head.appendChild(metaDescription);
          }
          metaDescription.setAttribute("content", currentDescription);
        }
      } catch (error) {
        console.error("Error fetching About Us content:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [language, t]);

  return (
    <>
      <Navbar />
      <div className={styles.pageHeader}>
        <h1>{t("About Us", "از نگاه نازیرا")}</h1>
        {/* <p>
          {t(
            "Learn more about our story, mission, and values",
            "درباره داستان، ماموریت و ارزش‌های ما بیشتر بدانید"
          )}
        </p> */}
      </div>
      <section className={styles.contentPage}>
        <div className={styles.card}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center" }}>
              <p>{t("Loading...", "در حال بارگذاری...")}</p>
            </div>
          ) : content ? (
            <div
              className={styles.text}
              dangerouslySetInnerHTML={{ __html: content }}
              style={{
                whiteSpace: "pre-wrap",
                fontFamily: language === "fa" ? "'Rubik', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" : "inherit"
              }}
            />
          ) : (
            <div>
              <h2 className={styles.subtitle}>{t("Our Story", "داستان ما")}</h2>
              <p className={styles.text}>
                {t(
                  "Founded with a vision to transform the way people interact with technology, we've grown from a small startup to a trusted name in the industry.",
                  "با چشم اندازی برای تحول در نحوه تعامل مردم با فناوری تاسیس شد، ما از یک استارتاپ کوچک به یک نام معتبر در صنعت رشد کرده ایم."
                )}
              </p>

              <h2 className={styles.subtitle}>{t("Our Mission", "ماموریت ما")}</h2>
              <p className={styles.text}>
                {t(
                  "To empower individuals and businesses with innovative solutions that simplify complex challenges and unlock new possibilities.",
                  "توانمندسازی افراد و مشاغل با راه حل های نوآورانه که چالش های پیچیده را ساده می کند و امکانات جدید را باز می کند."
                )}
              </p>

              <h2 className={styles.subtitle}>{t("Our Values", "ارزش های ما")}</h2>
              <p className={styles.text}>
                {t(
                  "Innovation, integrity, and customer-centricity are at the core of everything we do.",
                  "نوآوری، صداقت و مشتری محوری در هسته هر کاری که انجام می دهیم قرار دارد."
                )}
              </p>

              <h2 className={styles.subtitle}>{t("Our Team", "تیم ما")}</h2>
              <p className={styles.text}>
                {t(
                  "We're a diverse group of passionate professionals united by a common goal: to make a positive impact through technology.",
                  "ما گروهی متنوع از متخصصان پرشور هستیم که با یک هدف مشترک متحد شده ایم: ایجاد تاثیر مثبت از طریق فناوری."
                )}
              </p>
            </div>
          )}

          {/* FAQ Section */}
          {faqEnabled && faqItems.length > 0 && (
            <div className={styles.faqSection}>
              <h2 className={styles.faqTitle}>{t("Frequently Asked Questions", "سوالات متداول")}</h2>
              <div className={styles.faqList}>
                {faqItems.map((item, index) => {
                  const isExpanded = expandedFaqIndex === index;
                  const question = language === "fa" ? item.questionFa : item.questionEn;
                  const answer = language === "fa" ? item.answerFa : item.answerEn;

                  // Skip empty FAQ items
                  if (!question && !answer) return null;

                  return (
                    <div key={index} className={`${styles.faqItem} ${isExpanded ? styles.faqItemExpanded : ""}`}>
                      <button
                        className={styles.faqQuestion}
                        onClick={() => setExpandedFaqIndex(isExpanded ? null : index)}
                        aria-expanded={isExpanded}
                      >
                        <span className={styles.faqQuestionText}>{question || t("Question", "سوال")}</span>
                        <span className={styles.faqChevron}>
                          {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                        </span>
                      </button>
                      <div className={`${styles.faqAnswer} ${isExpanded ? styles.faqAnswerExpanded : ""}`}>
                        <div
                          className={styles.faqAnswerText}
                          dangerouslySetInnerHTML={{ __html: answer || "" }}
                          style={{
                            whiteSpace: "pre-wrap",
                            fontFamily: language === "fa" ? "'Rubik', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" : "inherit"
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
      <Footer />
      <BottomBar />
    </>
  );
}
