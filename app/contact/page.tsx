"use client";


import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomBar from "@/components/BottomBar";
import { useLanguage } from "@/lib/utils/language";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { FiRefreshCw, FiPhone, FiMail, FiMapPin, FiRotateCw , FiMessageCircle } from "react-icons/fi";
import { FaTelegram, FaWhatsapp } from "react-icons/fa";
import styles from "@/styles/pages/_contact.module.scss";

interface ContactSettings {
  telegram: string | null;
  whatsapp: string | null;
  rubika: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  addressFa: string | null;
}

// Create schema factory function for bilingual support
const createContactSchema = (t: (en: string, fa: string) => string) => yup.object({
  name: yup.string().required(t("Name is required", "نام الزامی است")),
  phone: yup
    .string()
    .required(t("Phone is required", "شماره تلفن الزامی است"))
    .test("phone-format", t("Phone must be 11 digits starting with 09", "شماره تلفن باید 11 رقم و با 09 شروع شود"), (value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length === 11 && digits.startsWith("09");
    }),
  message: yup.string().required(t("Message is required", "پیام الزامی است")),
  captcha: yup.string().required(t("CAPTCHA is required", "کد امنیتی الزامی است")),
});

type ContactFormData = yup.InferType<ReturnType<typeof createContactSchema>>;

export default function ContactPage() {
  const { t, language } = useLanguage();
  const { data: session } = useSession();
  const [contactSettings, setContactSettings] = useState<ContactSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [captcha, setCaptcha] = useState<string>("");
  const [isLoadingCaptcha, setIsLoadingCaptcha] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; surname: string | null } | null>(null);

  // Create schema with current language
  const contactSchema = useMemo(() => createContactSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ContactFormData>({
    resolver: yupResolver(contactSchema),
  });

  // Load contact settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/contact-settings");
        if (response.ok) {
          const data = await response.json();
          setContactSettings(data);
        }
      } catch (error) {
        console.error("Error loading contact settings:", error);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  // Fetch user profile if logged in
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user?.id) {
        setUserProfile(null);
        return;
      }

      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          setUserProfile({
            name: data.name,
            surname: data.surname,
          });
        } else {
          // Fallback to session data if profile fetch fails
          setUserProfile({
            name: session.user.name || "",
            surname: null,
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        // Fallback to session data on error
        setUserProfile({
          name: session.user.name || "",
          surname: null,
        });
      }
    };

    fetchUserProfile();
  }, [session]);

  // Prefill form if user is logged in
  useEffect(() => {
    if (userProfile) {
      // Combine name and surname if both exist
      const fullName = userProfile.surname
        ? `${userProfile.name} ${userProfile.surname}`.trim()
        : userProfile.name;

      setValue("name", fullName || "");
    }
  }, [userProfile, setValue]);

  // Load CAPTCHA on mount
  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = async () => {
    setIsLoadingCaptcha(true);
    try {
      const response = await fetch("/api/captcha");
      if (response.ok) {
        const data = await response.json();
        setCaptcha(data.captcha);
        setValue("captcha", "");
      } else {
        const error = await response.json();
        const errorMessage = error.error || t("Failed to generate CAPTCHA", "خطا در تولید کد تأیید");
        toast.error(errorMessage);
        // If rate limited, disable refresh button temporarily
        if (response.status === 429) {
          setTimeout(() => {
            setIsLoadingCaptcha(false);
          }, 60000); // Wait 1 minute
          return;
        }
      }
    } catch (error) {
      console.error("Error generating CAPTCHA:", error);
      toast.error(t("Failed to generate CAPTCHA", "خطا در تولید کد تأیید"));
    } finally {
      setIsLoadingCaptcha(false);
    }
  };

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
            phone: data.phone,
          message: data.message,
          captcha: data.captcha,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(
          t("Your message has been sent successfully!", "پیام شما با موفقیت ارسال شد!")
        );
        // Wait 1 second, then reset form and refresh CAPTCHA
        setTimeout(() => {
          reset();
          generateCaptcha();
        }, 1000);
      } else {
        toast.error(result.error || t("Failed to send message", "خطا در ارسال پیام"));
        // Refresh CAPTCHA on error
        generateCaptcha();
      }
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
      generateCaptcha();
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayAddress = () => {
    if (!contactSettings) return null;
    const address = language === "fa" && contactSettings.addressFa
      ? contactSettings.addressFa
      : contactSettings.address || contactSettings.addressFa;
    return address;
  };

  return (
    <>
      <Navbar />
      <div className={styles.pageHeader}>
        <h1>{t("Contact Us", "ارتباط با نازیرا")}</h1>
        {/* <p>
          {t(
            "We'd love to hear from you. Get in touch with us!",
            "خوشحال می‌شویم از شما بشنویم. با ما در تماس باشید!"
          )}
        </p> */}
      </div>

      <div className={styles.contactContainer}>
        <div className={styles.contactLayout}>
          {/* Contact Form */}
          <div className={styles.contactFormCard}>
            <h2>
              <span>✉️</span>
              <span>{t("Send us a Message", "پیام خود را ارسال کنید")}</span>
            </h2>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className={styles.formGroup}>
                <Input
                  label={t("Full Name", "نام و نام خانوادگی ")}
                  {...register("name")}
                  error={errors.name?.message}
                  placeholder={t("Enter your full name", " ")}
                  disabled={isSubmitting}
                />
              </div>

              {/* <div className={styles.formGroup}>
                <Input
                  label={t("Email Address", "آدرس ایمیل")}
                  type="email"
                  {...register("email")}
                  error={errors.email?.message}
                  placeholder={t("Enter your email", "ایمیل خود را وارد کنید")}
                  disabled={isSubmitting}
                />
              </div> */}

               <div className={styles.formGroup}>
                <label className={styles.label}>
                  <span>{t("Phone Number", "شماره تلفن")}</span>
                  {/* <span className={styles.optional}>({t("Optional", "اختیاری")})</span> */}
                </label>
                <Input
                  type="tel"
                  {...register("phone")}
                  error={errors.phone?.message}
                  placeholder={t("Enter your phone number", " ")}
                  disabled={isSubmitting}
                  style={language === "fa" ? { direction: "rtl", textAlign: "right" } : {}}
                  onChange={(e) => {
                    // Only allow digits
                    const value = e.target.value.replace(/\D/g, "");
                    setValue("phone", value);
                  }}
                />
              </div>

              {/* <div className={styles.formGroup}>
                <Input
                  label={t("Subject", "موضوع")}
                  {...register("subject")}
                  error={errors.subject?.message}
                  placeholder={t("What is this about?", "عنوان پیام خود را بنویسید")}
                  disabled={isSubmitting}
                />
              </div> */}

              <div className={styles.formGroup}>
                <Textarea
                  label={t("Message", "پیام")}
                  {...register("message")}
                  error={errors.message?.message}
                  placeholder={t("Write your message here...", "پیام خود را اینجا بنویسید...")}
                  disabled={isSubmitting}
                  className={styles.textarea}
                  style={{ resize: "none" }}
                  lang={language === "fa" ? "fa" : undefined}
                />
              </div>

              <div className={styles.captchaSection}>
                <label className={styles.captchaLabel}>
                  {t("Verification Code", "کد تأیید")}
                </label>
                <div className={styles.captchaActionsWrapper}>
                  <div className={styles.captchaCodeInputRow}>
                    <div className={styles.captchaDisplay}>
                      <button
                        type="button"
                        className={styles.captchaRefresh}
                        onClick={generateCaptcha}
                        disabled={isLoadingCaptcha || isSubmitting}
                        aria-label={t("Refresh", "تازه‌سازی")}
                      >
                        <FiRotateCw />
                      </button>
                      <div className={styles.captchaCode}>{captcha}</div>
                    </div>
                    <Input
                      className={styles.captchaInput}
                      {...register("captcha")}
                      error={errors.captcha?.message}
                      placeholder={t("Enter code", "کد را وارد کنید")}
                      maxLength={4}
                      disabled={isSubmitting}
                      onChange={(e) => {
                        // Only allow digits
                        const value = e.target.value.replace(/\D/g, "");
                        setValue("captcha", value);
                      }}
                    />
                  </div>
                  <div className={styles.formActions}>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={isSubmitting || isLoadingCaptcha}
                    >
                      {isSubmitting
                        ? t("Sending...", "در حال ارسال...")
                        : t("Send", "ارسال")}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        reset();
                        generateCaptcha();
                      }}
                      disabled={isSubmitting}
                    >
                      {t("Cancel", "لغو")}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Contact Info */}
          <div className={styles.contactInfo}>
            {/* <h2>
              {/* <span>📞</span> */}
              <span>{t("Get in Touch", "در تماس باشید")}</span>
            </h2> */}

            {contactSettings?.telegram && (
              <a
                href={`https://t.me/${contactSettings.telegram.replace("@", "")}`}
                className={styles.contactItem}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className={styles.contactIcon}>
                  <FaTelegram />
                </div>
                <div className={styles.contactDetails}>
                  <div className={styles.contactLabel}>Telegram</div>
                  <div className={styles.contactValue}>
                    {contactSettings.telegram.startsWith("@")
                      ? contactSettings.telegram
                      : `@${contactSettings.telegram}`}
                  </div>
                </div>
              </a>
            )}

            {contactSettings?.whatsapp && (
              <a
                href={`https://wa.me/${contactSettings.whatsapp.replace(/\D/g, "")}`}
                className={styles.contactItem}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className={styles.contactIcon}>
                  <FaWhatsapp />
                </div>
                <div className={styles.contactDetails}>
                  <div className={styles.contactLabel}>WhatsApp</div>
                  <div className={styles.contactValue}>{contactSettings.whatsapp}</div>
                </div>
              </a>
            )}
            {contactSettings?.rubika && (
              <a
                href={`https://rubika.ir/${contactSettings.rubika.replace("@", "")}`}
                className={styles.contactItem}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className={styles.contactIcon}>
                  <img 
                    src="/images/rubika.png" 
                    alt={language === "fa" ? "روبیکا" : "Rubika"} 
                    style={{ width: '30px', height: '30px' }}
                  />
                </div>
                <div className={styles.contactDetails}>
                  <div className={styles.contactLabel}>
                    {language === "fa" ? "روبیکا" : "Rubika"}
                  </div>
                  <div className={styles.contactValue}>
                    {contactSettings.rubika.startsWith("@")
                      ? contactSettings.rubika
                      : `@${contactSettings.rubika}`}
                  </div>
                </div>
              </a>
            )}



            {contactSettings?.phone && (
              <a href={`tel:${contactSettings.phone}`} className={styles.contactItem}>
                <div className={styles.contactIcon}>
                  <FiPhone />
                </div>
                <div className={styles.contactDetails}>
                  <div className={styles.contactLabel}>{t("Phone", "تلفن")}</div>
                  <div className={styles.contactValue}>{contactSettings.phone}</div>
                </div>
              </a>
            )}

            {contactSettings?.email && (
              <a href={`mailto:${contactSettings.email}`} className={styles.contactItem}>
                <div className={styles.contactIcon}>
                  <FiMail />
                </div>
                <div className={styles.contactDetails}>
                  <div className={styles.contactLabel}>{t("Email", "ایمیل")}</div>
                  <div className={styles.contactValue}>{contactSettings.email}</div>
                </div>
              </a>
            )}
{/*
            <div className={styles.contactItem} style={{ cursor: "default" }}>
              <div className={styles.contactIcon}>
                <FiMapPin />
              </div>
              <div className={styles.contactDetails}>
                <div className={styles.contactLabel}>{t("Address", "آدرس")}</div>
                <div className={styles.contactValue}>
                  {displayAddress() || t("Not available", "در دسترس نیست")}
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
      <Footer />
      <BottomBar />
    </>
  );
}
