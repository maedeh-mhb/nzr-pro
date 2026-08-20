"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomBar from "@/components/BottomBar";
import { useLanguage } from "@/lib/utils/language";
import { FiShare2, FiX } from "react-icons/fi";
import styles from "@/styles/components/_instructions.module.scss";

interface InstructionCard {
  id: string;
  titleEn: string;
  titleFa: string;
  imageUrl: string;
  contentEn: string | null;
  contentFa: string | null;
  audioUrl: string | null;
  sortOrder: number;
}

interface PageSettings {
  titleEn: string | null;
  titleFa: string | null;
  isEnabled: boolean;
}

export default function InstructionsPage() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const cardId = searchParams.get("card");
  const [pageSettings, setPageSettings] = useState<PageSettings | null>(null);
  const [cards, setCards] = useState<InstructionCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState<InstructionCard | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [settingsRes, cardsRes] = await Promise.all([
          fetch(`/api/instructions-page?_=${Date.now()}`, {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          }),
          fetch(`/api/instruction-cards?_=${Date.now()}`, {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          }),
        ]);

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setPageSettings({
            titleEn: settingsData.titleEn,
            titleFa: settingsData.titleFa,
            isEnabled: settingsData.isEnabled,
          });
        }

        if (cardsRes.ok) {
          const cardsData = await cardsRes.json();
          const loadedCards = cardsData.cards || [];
          setCards(loadedCards);

          // Auto-expand card if URL has ?card=ID
          if (cardId) {
            const targetCard = loadedCards.find((c: InstructionCard) => c.id === cardId);
            if (targetCard) {
              setExpandedCard(targetCard);
            }
          }
        }
      } catch (error) {
        console.error("Error loading instructions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [cardId]);

  const handleShare = useCallback(async (card: InstructionCard) => {
    const title = language === "fa" ? card.titleFa : card.titleEn;
    const baseUrl = window.location.origin + window.location.pathname;
    const url = `${baseUrl}?card=${card.id}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      alert(t("Link copied!", "لینک کپی شد!"));
    }
  }, [language, t]);

  const closeExpanded = useCallback(() => {
    setExpandedCard(null);
  }, []);

  useEffect(() => {
    if (expandedCard) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [expandedCard]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className={styles.pageHeader}>
          <h1>{t("Instructions", "آموزش")}</h1>
        </div>
        <div className={styles.instructionsPage}>
          <div className={styles.container}>
            <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
              <div style={{
                width: "48px", height: "48px",
                border: "4px solid rgba(0,0,0,0.08)",
                borderTopColor: "#2d5016",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          </div>
        </div>
        <Footer />
        <BottomBar />
      </>
    );
  }

  if (!pageSettings?.isEnabled) {
    return (
      <>
        <Navbar />
        <div className={styles.pageHeader}>
          <h1>{t("Instructions", "آموزش")}</h1>
        </div>
        <div className={styles.instructionsPage}>
          <div className={styles.container}>
            <div className={styles.emptyState}>
              <p>{t("Instructions page is not available yet.", "صفحه آموزش در حال حاضر در دسترس نیست.")}</p>
            </div>
          </div>
        </div>
        <Footer />
        <BottomBar />
      </>
    );
  }

  const pageTitle = language === "fa" ? pageSettings.titleFa : pageSettings.titleEn;

  return (
    <>
      <Navbar />
      <div className={styles.pageHeader}>
        <h1>{pageTitle || t("Instructions", "آموزش")}</h1>
        <p>{t("Learn how to use our products and services", "نحوه استفاده از محصولات و خدمات ما را بیاموزید")}</p>
      </div>
      <div className={styles.instructionsPage}>
        <div className={styles.container}>
          {cards.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{t("No instructions available yet.", "آموزشی در دسترس نیست.")}</p>
            </div>
          ) : (
            <div className={styles.cardsGrid}>
              {cards.map((card) => (
                <div
                  key={card.id}
                  className={styles.card}
                  onClick={() => setExpandedCard(card)}
                >
                  <img
                    src={card.imageUrl}
                    alt={language === "fa" ? card.titleFa : card.titleEn}
                    className={styles.cardImage}
                  />
                  <div className={styles.cardTitleBar}>
                    <h3 className={styles.cardTitle}>
                      {language === "fa" ? card.titleFa : card.titleEn}
                    </h3>
                    <button
                      className={styles.shareButton}
                      onClick={(e) => { e.stopPropagation(); handleShare(card); }}
                      title={t("Share", "اشتراک‌گذاری")}
                    >
                      <FiShare2 />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {expandedCard && (
        <div className={styles.cardExpandedOverlay} onClick={closeExpanded}>
          <div className={styles.cardExpanded} onClick={(e) => e.stopPropagation()}>
            <div className={styles.cardExpandedHeader}>
              <h2 className={styles.cardExpandedTitle}>
                {language === "fa" ? expandedCard.titleFa : expandedCard.titleEn}
              </h2>
              <div className={styles.cardExpandedActions}>
                <button
                  className={styles.shareButton}
                  onClick={() => handleShare(expandedCard)}
                  title={t("Share", "اشتراک‌گذاری")}
                >
                  <FiShare2 />
                </button>
                <button
                  className={styles.closeButton}
                  onClick={closeExpanded}
                  title={t("Close", "بستن")}
                >
                  <FiX />
                </button>
              </div>
            </div>
            <div className={styles.cardExpandedContent}>
              <div
                className={styles.content}
                dangerouslySetInnerHTML={{
                  __html: language === "fa" ? expandedCard.contentFa || "" : expandedCard.contentEn || "",
                }}
              />
              {expandedCard.audioUrl && (
                <div style={{ marginTop: "1.5rem" }}>
                  <audio controls style={{ width: "100%", maxWidth: "400px" }}>
                    <source src={expandedCard.audioUrl} />
                  </audio>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
      <BottomBar />
    </>
  );
}
