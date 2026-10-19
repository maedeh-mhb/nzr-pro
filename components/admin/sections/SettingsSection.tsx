"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useLanguage } from "@/lib/utils/language";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { FiSettings, FiLock, FiTruck, FiChevronDown, FiChevronUp, FiImage, FiLink, FiPlus, FiX, FiCreditCard, FiUsers, FiShield, FiSearch, FiGift } from "react-icons/fi";
import AdminCard from "../AdminCard";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Select, { SelectOption } from "@/components/ui/Select";
import { renderIcon } from "@/lib/utils/iconRenderer";
import toast from "react-hot-toast";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import formStyles from "@/styles/components/_adminForm.module.scss";
import styles from "@/styles/components/_adminSettings.module.scss";
import DiscountCodesSection from "./DiscountCodesSection";
import InstructionsPageSection from "./InstructionsPageSection";
import { DEFAULT_SHIPPING_WEIGHT_RATES, SHIPPING_WEIGHT_TIERS } from "@/lib/shipping/weightRates";

interface Province {
  id: number;
  name: string;
  slug: string;
  tel_prefix: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

interface RewardGrantUser {
  id: string;
  name: string;
  surname: string | null;
  email: string | null;
  phone: string | null;
  totalPoints: number;
}

const shippingSchema = yup.object({
  adminProvince: yup.string().required("Province is required"),
  adminCity: yup.number().nullable(),
  weightRates: yup.array().of(
    yup.number().required("Price is required").min(0, "Price must be positive")
  ).length(SHIPPING_WEIGHT_TIERS.length).required(),
});

type ShippingFormData = yup.InferType<typeof shippingSchema>;

const heroSchema = yup.object({
  titleEn: yup.string().required("Title (English) is required"),
  titleFa: yup.string().required("Title (Farsi) is required"),
  descriptionEn: yup.string().required("Description (English) is required"),
  descriptionFa: yup.string().required("Description (Farsi) is required"),
  buttonTextEn: yup.string().required("Button text (English) is required"),
  buttonTextFa: yup.string().required("Button text (Farsi) is required"),
  buttonLink: yup.string().required("Button link is required").test("is-valid-path", "Must be a valid path (e.g., /products)", function (value) {
    if (!value) return false;
    // Allow both absolute URLs and relative paths
    return value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://");
  }),
  backgroundImageUrl: yup.string().test("is-valid-url", "Must be a valid URL", function (value) {
    if (!value) return true; // Optional field
    // Accept absolute URLs, relative paths, or data URLs (for preview)
    return (
      value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("/") ||
      value.startsWith("data:image/") ||
      value.startsWith("blob:")
    );
  }),
  isEnabled: yup.boolean(),
});

type HeroFormData = yup.InferType<typeof heroSchema>;

const siteSettingsSchema = yup.object({
  siteName: yup.string(),
  defaultLanguage: yup.string().required("Language is required"),
  currency: yup.string().required("Currency is required"),
  timezone: yup.string().required("Timezone is required"),
  siteDescription: yup.string(),
  checkoutNoticeEn: yup.string(),
  checkoutNoticeFa: yup.string(),
  checkoutTermsAudioUrl: yup.string().test(
    "external-audio-url",
    "Enter a valid external audio URL",
    (value) => {
      if (!value?.trim()) return true;
      try {
        const url = new URL(value.trim());
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }
  ),
  shippingCostNoticeEn: yup.string(),
  shippingCostNoticeFa: yup.string(),
  maintenanceMode: yup.string().required("Maintenance mode is required"),
});

type SiteSettingsFormData = yup.InferType<typeof siteSettingsSchema>;

export default function SettingsSection() {
  const { t, language, refreshCurrency } = useLanguage();
  const [isSiteSettingsExpanded, setIsSiteSettingsExpanded] = useState(false);
  const [isLoadingSiteSettings, setIsLoadingSiteSettings] = useState(false);
  const [isSecurityExpanded, setIsSecurityExpanded] = useState(false);
  const [isShippingExpanded, setIsShippingExpanded] = useState(false);
  const [isHeroExpanded, setIsHeroExpanded] = useState(false);
  const [isSocialLinksExpanded, setIsSocialLinksExpanded] = useState(false);
  const [isPaymentSettingsExpanded, setIsPaymentSettingsExpanded] = useState(false);
  const [isCardToCardExpanded, setIsCardToCardExpanded] = useState(false);
  const [isPaypalExpanded, setIsPaypalExpanded] = useState(false);
  const [isUserSpecificPaymentExpanded, setIsUserSpecificPaymentExpanded] = useState(false);
  const [isAdminManagementExpanded, setIsAdminManagementExpanded] = useState(false);
  const [isDiscountCodesExpanded, setIsDiscountCodesExpanded] = useState(false);
  const [isRewardManagementExpanded, setIsRewardManagementExpanded] = useState(false);
  const [isLoadingRewardSettings, setIsLoadingRewardSettings] = useState(false);
  const [isAboutUsExpanded, setIsAboutUsExpanded] = useState(false);
  const [isLoadingAboutUs, setIsLoadingAboutUs] = useState(false);
  const [aboutUsContent, setAboutUsContent] = useState({
    contentEn: "",
    contentFa: "",
    metaTitleEn: "",
    metaTitleFa: "",
    metaDescriptionEn: "",
    metaDescriptionFa: "",
    metaImageUrl: "",
  });
  const [faqEnabled, setFaqEnabled] = useState(false);
  const [faqItems, setFaqItems] = useState<Array<{
    questionEn: string;
    questionFa: string;
    answerEn: string;
    answerFa: string;
  }>>([]);
  const [rewardThresholds, setRewardThresholds] = useState<Array<{ value: string; discount: string }>>([
    { value: "", discount: "" },
    { value: "", discount: "" },
    { value: "", discount: "" },
  ]);
  const [rewardUserSearch, setRewardUserSearch] = useState("");
  const [rewardUsers, setRewardUsers] = useState<RewardGrantUser[]>([]);
  const [selectedRewardUser, setSelectedRewardUser] = useState<RewardGrantUser | null>(null);
  const [manualRewardPoints, setManualRewardPoints] = useState("");
  const [manualRewardReason, setManualRewardReason] = useState("");
  const [isSearchingRewardUsers, setIsSearchingRewardUsers] = useState(false);
  const [isGrantingReward, setIsGrantingReward] = useState(false);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [isLoadingHero, setIsLoadingHero] = useState(false);
  const [isLoadingSocialLinks, setIsLoadingSocialLinks] = useState(false);
  const [isLoadingPaymentSettings, setIsLoadingPaymentSettings] = useState(false);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [adminCityId, setAdminCityId] = useState<number | null>(null);
  const [selectedAdminProvince, setSelectedAdminProvince] = useState<string>("");
  const [heroImagePreview, setHeroImagePreview] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [socialLinks, setSocialLinks] = useState<Array<{ id?: string; nameEn: string; nameFa: string; url: string; icon?: string }>>([]);
  const [categoryLinks, setCategoryLinks] = useState<Array<{ id?: string; categoryId?: string; nameEn: string; nameFa: string; url: string; icon?: string }>>([]);
  const [isSavingCategoryLinks, setIsSavingCategoryLinks] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState({
    cardToCardEnabled: false,
    onlinePaymentEnabled: false,
    onlinePaymentProvider: "",
    onlinePaymentApiKey: "",
    onlinePaymentSecretKey: "",
    onlinePaymentMerchantId: "",
    payAfterDeliveryEnabled: false,
    payAfterDeliveryMaxAmount: "",
    payAfterDeliveryRequireVerification: false,
    paypalEnabled: false,
    paypalClientId: "",
    paypalSecretKey: "",
    paypalMode: "sandbox",
  });
  const [bankSettings, setBankSettings] = useState<Array<{
    id?: string;
    bankName: string;
    cardNumber: string;
    cardHolder: string;
    iban: string;
  }>>([]);
  const [permissions, setPermissions] = useState<Array<{
    id: string;
    name: string;
    descriptionEn: string;
    descriptionFa: string;
    category: string;
  }>>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [newAdminData, setNewAdminData] = useState({
    name: "",
    surname: "",
    email: "",
    phone: "",
    password: "",
  });
  const [superAdminPassword, setSuperAdminPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [banksData, setBanksData] = useState<Record<string, string>>({});
  // User-specific payment methods state
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; surname: string | null; email: string }>>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; surname: string | null; email: string } | null>(null);
  const [userPaymentMethods, setUserPaymentMethods] = useState<{
    cardToCardEnabled: boolean | null;
    onlinePaymentEnabled: boolean | null;
    payAfterDeliveryEnabled: boolean | null;
    paypalEnabled: boolean | null;
  }>({
    cardToCardEnabled: null,
    onlinePaymentEnabled: null,
    payAfterDeliveryEnabled: null,
    paypalEnabled: null,
  });
  const [isLoadingUserPaymentMethods, setIsLoadingUserPaymentMethods] = useState(false);
  const [isSavingUserPaymentMethods, setIsSavingUserPaymentMethods] = useState(false);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ShippingFormData>({
    resolver: yupResolver(shippingSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      adminProvince: "",
      adminCity: null,
      weightRates: DEFAULT_SHIPPING_WEIGHT_RATES,
    },
  });

  const {
    register: registerHero,
    handleSubmit: handleSubmitHero,
    formState: { errors: heroErrors },
    reset: resetHero,
    watch: watchHero,
    setValue: setValueHero,
  } = useForm<HeroFormData>({
    resolver: yupResolver(heroSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    defaultValues: {
      titleEn: "",
      titleFa: "",
      descriptionEn: "",
      descriptionFa: "",
      buttonTextEn: "",
      buttonTextFa: "",
      buttonLink: "",
      backgroundImageUrl: "",
      isEnabled: true,
    },
  });

  // Site Settings Form
  const {
    register: registerSiteSettings,
    handleSubmit: handleSubmitSiteSettings,
    reset: resetSiteSettings,
    formState: { errors: siteSettingsErrors },
    watch: watchSiteSettings,
    setValue: setSiteSettingsValue,
  } = useForm<SiteSettingsFormData>({
    resolver: yupResolver(siteSettingsSchema),
    defaultValues: {
      siteName: "",
      defaultLanguage: "en",
      currency: "toman",
      timezone: "utc",
      siteDescription: "",
      checkoutNoticeEn: "",
      checkoutNoticeFa: "",
      checkoutTermsAudioUrl: "",
      shippingCostNoticeEn: "",
      shippingCostNoticeFa: "",
      maintenanceMode: "off",
    },
  });

  // Load provinces based on current language
  useEffect(() => {
    const loadProvinces = async () => {
      try {
        const fileName = language === "fa" ? "provinces-fa.json" : "provinces-en.json";
        const response = await fetch(`/data/${fileName}`);
        if (response.ok) {
          const data = await response.json();
          setProvinces(data);
        }
      } catch (error) {
        console.error("Error loading provinces:", error);
      }
    };

    loadProvinces();
  }, [language]);

  // Convert provinces to SelectOption format
  const provinceOptions: SelectOption[] = useMemo(() => {
    return provinces.map((province) => ({
      value: province.slug,
      label: province.name,
    }));
  }, [provinces]);

  // Load cities when admin province changes
  useEffect(() => {
    const loadCities = async () => {
      if (!selectedAdminProvince) {
        setCities([]);
        setAdminCityId(null);
        return;
      }

      try {
        const fileName = language === "fa" ? "cities-fa.json" : "cities-en.json";
        const response = await fetch(`/data/${fileName}`);
        if (response.ok) {
          const data = await response.json();
          // Filter cities by selected province
          const province = provinces.find((p) => p.slug === selectedAdminProvince);
          if (province) {
            const filteredCities = data.filter((city: any) => city.province_id === province.id);
            setCities(filteredCities);
          }
        }
      } catch (error) {
        console.error("Error loading cities:", error);
        setCities([]);
      }
    };

    loadCities();
  }, [selectedAdminProvince, provinces, language]);

  // Convert cities to SelectOption format
  const cityOptions: SelectOption[] = useMemo(() => {
    return cities.map((city) => ({
      value: city.id.toString(),
      label: city.name,
    }));
  }, [cities]);

  const languageOptions: SelectOption[] = [
    { value: "en", label: "English" },
    { value: "fa", label: "فارسی" },
  ];

  const currencyOptions: SelectOption[] = [
    { value: "usd", label: "USD ($)" },
    { value: "eur", label: "EUR (€)" },
    { value: "gbp", label: "GBP (£)" },
    { value: "toman", label: "تومان" },
  ];

  const timezoneOptions: SelectOption[] = [
    { value: "utc", label: "UTC" },
    { value: "est", label: "EST" },
    { value: "pst", label: "PST" },
    { value: "asia/tehran", label: "Tehran (+3:30)" },
  ];

  const maintenanceOptions: SelectOption[] = [
    { value: "off", label: t("Off", "خاموش") },
    { value: "on", label: t("On", "روشن") },
  ];

  const twoFactorOptions: SelectOption[] = [
    { value: "enabled", label: t("Enabled", "فعال") },
    { value: "disabled", label: t("Disabled", "غیرفعال") },
  ];

  const passwordPolicyOptions: SelectOption[] = [
    { value: "strong", label: t("Strong (Min 12 chars, numbers, symbols)", "قوی (حداقل ۱۲ کاراکتر، اعداد، نمادها)") },
    { value: "medium", label: t("Medium (Min 8 chars, numbers)", "متوسط (حداقل ۸ کاراکتر، اعداد)") },
    { value: "weak", label: t("Weak (Min 6 chars)", "ضعیف (حداقل ۶ کاراکتر)") },
  ];

  const socialLinkIconOptions: SelectOption[] = [
    { value: "FaLink", label: "Link" },
    { value: "FaShareAlt", label: "Share" },
    { value: "FaExternalLinkAlt", label: "External Link" },
    { value: "FaLinkedin", label: "LinkedIn" },
    { value: "FaXTwitter", label: "Twitter/X" },
    { value: "FaInstagram", label: "Instagram" },
    { value: "FaTelegram", label: "Telegram" },
    { value: "MdConnectWithoutContact", label: "Connect" },
    { value: "TbLink", label: "Link" },
    { value: "IoShareSocial", label: "Share Social" },
  ];

  useEffect(() => {
    // Load shipping settings when component mounts or shipping section is expanded
    if (isShippingExpanded) {
      loadShippingSettings();
    }
  }, [isShippingExpanded]);

  useEffect(() => {
    // Load hero settings when component mounts or hero section is expanded
    if (isHeroExpanded) {
      loadHeroSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHeroExpanded]);

  useEffect(() => {
    // Load social links when component mounts or social links section is expanded
    if (isSocialLinksExpanded) {
      loadSocialLinks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSocialLinksExpanded]);

  useEffect(() => {
    // Load reward settings when reward management section is expanded
    if (isRewardManagementExpanded) {
      loadRewardSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRewardManagementExpanded]);

  useEffect(() => {
    const search = rewardUserSearch.trim();
    if (!isRewardManagementExpanded || search.length < 2 || selectedRewardUser) {
      setRewardUsers([]);
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsSearchingRewardUsers(true);
      try {
        const response = await fetch(
          `/api/admin/rewards/grant?search=${encodeURIComponent(search)}`
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to search users");
        }
        if (!cancelled) setRewardUsers(data.users || []);
      } catch (error) {
        if (!cancelled) {
          console.error("Error searching users for reward grant:", error);
          toast.error(t("Failed to search users", "جستجوی کاربران ناموفق بود"));
        }
      } finally {
        if (!cancelled) setIsSearchingRewardUsers(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [rewardUserSearch, isRewardManagementExpanded, selectedRewardUser, t]);

  useEffect(() => {
    // Load About Us content when section is expanded
    if (isAboutUsExpanded) {
      loadAboutUsContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAboutUsExpanded]);

  useEffect(() => {
    // Load payment settings when component mounts or payment settings section is expanded
    if (isPaymentSettingsExpanded) {
      loadPaymentSettings();
      loadBankSettings();
      loadBanksData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaymentSettingsExpanded]);

  useEffect(() => {
    // Load permissions when admin management section is expanded
    if (isAdminManagementExpanded) {
      loadPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminManagementExpanded]);

  useEffect(() => {
    // Load site settings when section is expanded
    if (isSiteSettingsExpanded) {
      loadSiteSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSiteSettingsExpanded]);

  const loadSiteSettings = async () => {
    setIsLoadingSiteSettings(true);
    try {
      const response = await fetch("/api/admin/site-settings");
      if (response.ok) {
        const data = await response.json();
        const settingsData = data.settings || {};
        resetSiteSettings({
          siteName: settingsData.siteName || "",
          defaultLanguage: settingsData.defaultLanguage || "en",
          currency: settingsData.currency || "toman",
          timezone: settingsData.timezone || "utc",
          siteDescription: settingsData.siteDescription || "",
          checkoutNoticeEn: settingsData.checkoutNoticeEn || "",
          checkoutNoticeFa: settingsData.checkoutNoticeFa || "",
          checkoutTermsAudioUrl: settingsData.checkoutTermsAudioUrl || "",
          shippingCostNoticeEn: settingsData.shippingCostNoticeEn || "",
          shippingCostNoticeFa: settingsData.shippingCostNoticeFa || "",
          maintenanceMode: settingsData.maintenanceMode || "off",
        });
      }
    } catch (err) {
      console.error("Error loading site settings:", err);
    } finally {
      setIsLoadingSiteSettings(false);
    }
  };

  const onSiteSettingsSubmit = async (data: SiteSettingsFormData) => {
    try {
      const response = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update site settings");
      }

      // Refresh currency in language context so all components update
      if (refreshCurrency) {
        await refreshCurrency();
      }

      toast.success(t("Site settings updated successfully", "تنظیمات سایت با موفقیت به‌روزرسانی شد"));
    } catch (err: any) {
      console.error("Error updating site settings:", err);
      toast.error(t("Failed to update site settings", "خطا در به‌روزرسانی تنظیمات سایت"));
    }
  };

  const loadBanksData = async () => {
    try {
      const response = await fetch("/data/banks.json");
      if (response.ok) {
        const data = await response.json();
        setBanksData(data);
      }
    } catch (error) {
      console.error("Error loading banks data:", error);
    }
  };

  const loadShippingSettings = async () => {
    try {
      setIsLoadingShipping(true);
      const response = await fetch("/api/admin/shipping-settings");
      if (response.ok) {
        const data = await response.json();
        if (data) {
          reset({
            adminProvince: data.adminProvince || "",
            adminCity: data.adminCity || null,
            weightRates: data.weightRates || DEFAULT_SHIPPING_WEIGHT_RATES,
          });
          setSelectedAdminProvince(data.adminProvince || "");
          setAdminCityId(data.adminCity || null);
        }
      }
    } catch (error) {
      console.error("Error loading shipping settings:", error);
    } finally {
      setIsLoadingShipping(false);
    }
  };

  const loadRewardSettings = async () => {
    setIsLoadingRewardSettings(true);
    try {
      const response = await fetch("/api/admin/reward-thresholds");
      if (response.ok) {
        const data = await response.json();
        if (data.thresholds && Array.isArray(data.thresholds) && data.thresholds.length > 0) {
          // Load existing thresholds, pad with empty ones if less than 3
          const loaded = data.thresholds.map((t: any) => ({
            value: String(t.value || ""),
            discount: String(t.discount || ""),
          }));
          while (loaded.length < 3) {
            loaded.push({ value: "", discount: "" });
          }
          setRewardThresholds(loaded.slice(0, 3));
        } else {
          // Default: empty thresholds
          setRewardThresholds([
            { value: "", discount: "" },
            { value: "", discount: "" },
            { value: "", discount: "" },
          ]);
        }
      }
    } catch (error) {
      console.error("Error loading reward settings:", error);
    } finally {
      setIsLoadingRewardSettings(false);
    }
  };

  const loadAboutUsContent = async () => {
    setIsLoadingAboutUs(true);
    try {
      const response = await fetch("/api/admin/about-us");
      if (response.ok) {
        const data = await response.json();
        setAboutUsContent({
          contentEn: data.contentEn || "",
          contentFa: data.contentFa || "",
          metaTitleEn: data.metaTitleEn || "",
          metaTitleFa: data.metaTitleFa || "",
          metaDescriptionEn: data.metaDescriptionEn || "",
          metaDescriptionFa: data.metaDescriptionFa || "",
          metaImageUrl: data.metaImageUrl || "",
        });
        const enabled = data.faqEnabled || false;
        setFaqEnabled(enabled);
        if (data.faqItems && Array.isArray(data.faqItems) && data.faqItems.length > 0) {
          setFaqItems(data.faqItems);
        } else {
          setFaqItems([]);
        }
      }
    } catch (error) {
      console.error("Error loading About Us content:", error);
    } finally {
      setIsLoadingAboutUs(false);
    }
  };

  const onAboutUsSubmit = async () => {
    try {
      setIsLoadingAboutUs(true);
      const response = await fetch("/api/admin/about-us", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...aboutUsContent,
          faqEnabled,
          faqItems,
        }),
      });

      if (response.ok) {
        toast.success(t("About Us content updated successfully", "محتوای بخش درباره ما با موفقیت به‌روزرسانی شد"));
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("Failed to update About Us content", "خطا در به‌روزرسانی محتوای بخش درباره ما"));
      }
    } catch (error) {
      console.error("Error updating About Us content:", error);
      toast.error(t("Failed to update About Us content", "خطا در به‌روزرسانی محتوای بخش درباره ما"));
    } finally {
      setIsLoadingAboutUs(false);
    }
  };

  // Initialize FAQ with 5 default items when enabled for the first time
  useEffect(() => {
    if (faqEnabled && faqItems.length === 0) {
      setFaqItems([
        { questionEn: "", questionFa: "", answerEn: "", answerFa: "" },
        { questionEn: "", questionFa: "", answerEn: "", answerFa: "" },
        { questionEn: "", questionFa: "", answerEn: "", answerFa: "" },
        { questionEn: "", questionFa: "", answerEn: "", answerFa: "" },
        { questionEn: "", questionFa: "", answerEn: "", answerFa: "" },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faqEnabled]);

  const addFaqItem = () => {
    setFaqItems([...faqItems, { questionEn: "", questionFa: "", answerEn: "", answerFa: "" }]);
  };

  const removeFaqItem = (index: number) => {
    const newItems = faqItems.filter((_, i) => i !== index);
    setFaqItems(newItems);
  };

  const updateFaqItem = (index: number, field: "questionEn" | "questionFa" | "answerEn" | "answerFa", value: string) => {
    const newItems = [...faqItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setFaqItems(newItems);
  };

  const onRewardSettingsSubmit = async () => {
    try {
      // Filter out empty thresholds and validate
      const validThresholds = rewardThresholds
        .map((t, index) => ({
          value: parseInt(t.value, 10),
          discount: parseInt(t.discount, 10),
          index: index + 1,
        }))
        .filter((t) => !isNaN(t.value) && t.value > 0 && !isNaN(t.discount) && t.discount > 0 && t.discount <= 100);

      if (validThresholds.length === 0) {
        toast.error(t("At least one threshold must be configured", "حداقل یک آستانه باید تنظیم شود"));
        return;
      }

      // Validate all thresholds
      for (const threshold of validThresholds) {
        if (threshold.value <= 0) {
          toast.error(t(`Threshold ${threshold.index}: Value must be positive`, `آستانه ${threshold.index}: مقدار باید مثبت باشد`));
          return;
        }
        if (threshold.discount <= 0 || threshold.discount > 100) {
          toast.error(t(`Threshold ${threshold.index}: Discount must be between 1 and 100`, `آستانه ${threshold.index}: تخفیف باید بین 1 تا 100 باشد`));
          return;
        }
      }

      const response = await fetch("/api/admin/reward-thresholds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          thresholds: validThresholds.map((t) => ({
            value: t.value,
            discount: t.discount,
          })),
        }),
      });

      if (response.ok) {
        toast.success(t("Reward settings updated successfully", "تنظیمات پاداش با موفقیت به‌روزرسانی شد"));
        await loadRewardSettings(); // Reload to show saved values
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("Failed to update reward settings", "خطا در به‌روزرسانی تنظیمات پاداش"));
      }
    } catch (error) {
      console.error("Error updating reward settings:", error);
      toast.error(t("Failed to update reward settings", "خطا در به‌روزرسانی تنظیمات پاداش"));
    }
  };

  const onManualRewardGrant = async () => {
    const points = Number(manualRewardPoints);
    if (!selectedRewardUser) {
      toast.error(t("Select a user", "یک کاربر انتخاب کنید"));
      return;
    }
    if (!Number.isSafeInteger(points) || points < 1 || points > 1000000) {
      toast.error(t("Enter points between 1 and 1,000,000", "تعداد امتیاز باید بین ۱ تا ۱٬۰۰۰٬۰۰۰ باشد"));
      return;
    }

    setIsGrantingReward(true);
    try {
      const response = await fetch("/api/admin/rewards/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedRewardUser.id,
          points,
          reason: manualRewardReason,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to grant reward points");
      }

      const updatedUser = { ...selectedRewardUser, totalPoints: data.totalPoints };
      setSelectedRewardUser(updatedUser);
      setRewardUsers((current) =>
        current.map((user) => user.id === updatedUser.id ? updatedUser : user)
      );
      setManualRewardPoints("");
      setManualRewardReason("");
      toast.success(t("Reward points added successfully", "امتیاز پاداش با موفقیت اضافه شد"));
    } catch (error) {
      console.error("Error granting reward points:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : t("Failed to grant reward points", "افزودن امتیاز پاداش ناموفق بود")
      );
    } finally {
      setIsGrantingReward(false);
    }
  };

  const onShippingSubmit = async (data: ShippingFormData) => {
    try {
      const response = await fetch("/api/admin/shipping-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(t("Shipping settings updated successfully", "تنظیمات ارسال با موفقیت به‌روزرسانی شد"));
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("Failed to update shipping settings", "خطا در به‌روزرسانی تنظیمات ارسال"));
      }
    } catch (error) {
      console.error("Error saving shipping settings:", error);
      toast.error(t("Failed to update shipping settings", "خطا در به‌روزرسانی تنظیمات ارسال"));
    }
  };

  const loadHeroSettings = async () => {
    try {
      setIsLoadingHero(true);
      const response = await fetch("/api/admin/hero-settings");
      if (response.ok) {
        const data = await response.json();

        // Check if data exists and has an id (meaning settings were found)
        if (data && data.id) {
          const formData = {
            titleEn: data.titleEn || "",
            titleFa: data.titleFa || "",
            descriptionEn: data.descriptionEn || "",
            descriptionFa: data.descriptionFa || "",
            buttonTextEn: data.buttonTextEn || "",
            buttonTextFa: data.buttonTextFa || "",
            buttonLink: data.buttonLink || "",
            backgroundImageUrl: data.backgroundImageUrl || "",
            isEnabled: data.isEnabled !== undefined ? data.isEnabled : true,
          };

          // Reset form with loaded data - use reset with shouldValidate: false to avoid validation errors on load
          resetHero(formData, {
            keepDefaultValues: false,
            keepValues: false
          });

          // Set preview if image URL exists
          if (data.backgroundImageUrl) {
            setHeroImagePreview(data.backgroundImageUrl);
          } else {
            setHeroImagePreview("");
          }
        } else {
          // No settings exist, reset to empty/default values
          const defaultData = {
            titleEn: "",
            titleFa: "",
            descriptionEn: "",
            descriptionFa: "",
            buttonTextEn: "",
            buttonTextFa: "",
            buttonLink: "",
            backgroundImageUrl: "",
            isEnabled: true,
          };
          resetHero(defaultData);
          setHeroImagePreview("");
        }
      } else {
        console.error("Failed to fetch hero settings, status:", response.status);
      }
    } catch (error) {
      console.error("Error loading hero settings:", error);
      toast.error(t("Failed to load hero settings", "خطا در بارگذاری تنظیمات بخش اصلی"));
    } finally {
      setIsLoadingHero(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.", "نوع فایل نامعتبر است. فقط JPEG، PNG، WebP و GIF مجاز هستند."));
      // Reset input
      event.target.value = "";
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("File size exceeds 5MB limit.", "حجم فایل از حد مجاز 5 مگابایت بیشتر است."));
      // Reset input
      event.target.value = "";
      return;
    }

    try {
      setIsUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary
      });

      if (response.ok) {
        const data = await response.json();
        setValueHero("backgroundImageUrl", data.url);
        setHeroImagePreview(data.url);
        toast.success(t("Image uploaded successfully", "تصویر با موفقیت آپلود شد"));
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("Upload error:", errorData);
        toast.error(errorData.error || t("Failed to upload image", "خطا در آپلود تصویر"));
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(t("Failed to upload image", "خطا در آپلود تصویر"));
    } finally {
      setIsUploadingImage(false);
      // Reset input to allow re-uploading the same file
      event.target.value = "";
    }
  };

  const handleImageUrlChange = (url: string) => {
    setValueHero("backgroundImageUrl", url);
    // Validate and set preview for external URLs or relative paths
    if (url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/"))) {
      setHeroImagePreview(url);
    } else if (!url) {
      setHeroImagePreview("");
    } else {
      // Invalid URL format, clear preview
      setHeroImagePreview("");
    }
  };

  // Sync image preview with form value when it changes
  useEffect(() => {
    const currentImageUrl = watchHero("backgroundImageUrl");
    if (currentImageUrl && currentImageUrl !== heroImagePreview) {
      // Only update if it's a valid URL format
      if (currentImageUrl.startsWith("http://") || currentImageUrl.startsWith("https://") || currentImageUrl.startsWith("/")) {
        setHeroImagePreview(currentImageUrl);
      }
    } else if (!currentImageUrl && heroImagePreview) {
      setHeroImagePreview("");
    }
  }, [watchHero("backgroundImageUrl"), heroImagePreview]);

  const onHeroSubmit = async (data: HeroFormData) => {
    try {
      const response = await fetch("/api/admin/hero-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.success(t("Hero settings updated successfully", "تنظیمات بخش اصلی با موفقیت به‌روزرسانی شد"));
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("Failed to update hero settings", "خطا در به‌روزرسانی تنظیمات بخش اصلی"));
      }
    } catch (error) {
      console.error("Error saving hero settings:", error);
      toast.error(t("Failed to update hero settings", "خطا در به‌روزرسانی تنظیمات بخش اصلی"));
    }
  };

  const loadSocialLinks = async () => {
    try {
      setIsLoadingSocialLinks(true);
      const response = await fetch("/api/admin/social-links");
      if (response.ok) {
        const data = await response.json();
        if (data && data.userLinks && Array.isArray(data.userLinks)) {
          setSocialLinks(data.userLinks);
        } else {
          setSocialLinks([]);
        }
        if (data && data.categoryLinks && Array.isArray(data.categoryLinks)) {
          setCategoryLinks(data.categoryLinks);
        } else {
          setCategoryLinks([]);
        }
      }
    } catch (error) {
      console.error("Error loading social links:", error);
      toast.error(t("Failed to load social links", "خطا در بارگذاری لینک‌های اجتماعی"));
    } finally {
      setIsLoadingSocialLinks(false);
    }
  };

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { nameEn: "", nameFa: "", url: "", icon: "" }]);
  };

  const removeSocialLink = (index: number) => {
    const newLinks = socialLinks.filter((_, i) => i !== index);
    setSocialLinks(newLinks);
  };

  const updateSocialLink = (index: number, field: "nameEn" | "nameFa" | "url" | "icon", value: string) => {
    const newLinks = [...socialLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setSocialLinks(newLinks);
  };

  const onSocialLinksSubmit = async () => {
    try {
      // Validate all links have nameEn, nameFa and url
      const invalidLinks = socialLinks.filter(link => !link.nameEn.trim() || !link.nameFa.trim() || !link.url.trim());
      if (invalidLinks.length > 0) {
        toast.error(t("Please fill in all link names and URLs", "لطفاً نام و آدرس تمام لینک‌ها را پر کنید"));
        return;
      }

      const response = await fetch("/api/admin/social-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ links: socialLinks }),
      });

      if (response.ok) {
        toast.success(t("User exclusive links saved successfully", "لینک‌های انحصاری کاربر با موفقیت ذخیره شدند"));
        // Reload to get updated IDs
        loadSocialLinks();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("Failed to save social links", "خطا در ذخیره لینک‌های اجتماعی"));
      }
    } catch (error) {
      console.error("Error saving social links:", error);
      toast.error(t("Failed to save social links", "خطا در ذخیره لینک‌های اجتماعی"));
    }
  };

  const updateCategoryLink = (index: number, field: "url" | "icon", value: string) => {
    const newLinks = [...categoryLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setCategoryLinks(newLinks);
  };

  const onCategoryLinksSubmit = async () => {
    try {
      setIsSavingCategoryLinks(true);
      // URL validation is optional - allow empty URLs (they'll be saved as placeholder)

      const response = await fetch("/api/admin/social-links", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ links: categoryLinks }),
      });

      if (response.ok) {
        toast.success(t("Category exclusive links saved successfully", "لینک‌های انحصاری دسته‌بندی با موفقیت ذخیره شدند"));
        // Reload to get updated data
        loadSocialLinks();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("Failed to save category links", "خطا در ذخیره لینک‌های دسته‌بندی"));
      }
    } catch (error) {
      console.error("Error saving category links:", error);
      toast.error(t("Failed to save category links", "خطا در ذخیره لینک‌های دسته‌بندی"));
    } finally {
      setIsSavingCategoryLinks(false);
    }
  };

  const loadPaymentSettings = async () => {
    try {
      setIsLoadingPaymentSettings(true);
      const response = await fetch("/api/admin/payment-settings");
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setPaymentSettings({
            cardToCardEnabled: data.cardToCardEnabled ?? false,
            onlinePaymentEnabled: data.onlinePaymentEnabled ?? false,
            onlinePaymentProvider: data.onlinePaymentProvider ?? "",
            onlinePaymentApiKey: data.onlinePaymentApiKey ?? "",
            onlinePaymentSecretKey: data.onlinePaymentSecretKey ?? "",
            onlinePaymentMerchantId: data.onlinePaymentMerchantId ?? "",
            payAfterDeliveryEnabled: data.payAfterDeliveryEnabled ?? false,
            payAfterDeliveryMaxAmount: data.payAfterDeliveryMaxAmount ?? "",
            payAfterDeliveryRequireVerification: data.payAfterDeliveryRequireVerification ?? false,
            paypalEnabled: data.paypalEnabled ?? false,
            paypalClientId: data.paypalClientId ?? "",
            paypalSecretKey: data.paypalSecretKey ?? "",
            paypalMode: data.paypalMode ?? "sandbox",
          });
        }
      }
    } catch (error) {
      console.error("Error loading payment settings:", error);
      toast.error(t("Failed to load payment settings", "خطا در بارگذاری تنظیمات پرداخت"));
    } finally {
      setIsLoadingPaymentSettings(false);
    }
  };

  const loadBankSettings = async () => {
    try {
      const response = await fetch("/api/admin/bank-settings");
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data)) {
          // Format card numbers with spaces
          const formattedData = data.map((bank: any) => ({
            ...bank,
            cardNumber: bank.cardNumber ? bank.cardNumber.match(/.{1,4}/g)?.join(" ") || bank.cardNumber : "",
          }));
          setBankSettings(formattedData);
        } else {
          setBankSettings([]);
        }
      }
    } catch (error) {
      console.error("Error loading bank settings:", error);
      toast.error(t("Failed to load bank settings", "خطا در بارگذاری تنظیمات بانکی"));
    }
  };

  const updatePaymentSetting = (field: string, value: any) => {
    setPaymentSettings(prev => ({ ...prev, [field]: value }));
  };

  const onPaymentSettingsSubmit = async () => {
    try {
      const response = await fetch("/api/admin/payment-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentSettings),
      });

      if (response.ok) {
        toast.success(t("Payment settings saved successfully", "تنظیمات پرداخت با موفقیت ذخیره شدند"));
        loadPaymentSettings();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("Failed to save payment settings", "خطا در ذخیره تنظیمات پرداخت"));
      }
    } catch (error) {
      console.error("Error saving payment settings:", error);
      toast.error(t("Failed to save payment settings", "خطا در ذخیره تنظیمات پرداخت"));
    }
  };

  // User-specific payment methods functions
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearchingUsers(true);
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        // Handle paginated response format: { success: true, data: [...] }
        setSearchResults(data.data || data.users || []);
      } else {
        toast.error(t("Failed to search users", "خطا در جستجوی کاربران"));
      }
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error(t("Failed to search users", "خطا در جستجوی کاربران"));
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleUserSelect = async (user: { id: string; name: string; surname: string | null; email: string }) => {
    setSelectedUser(user);
    setUserSearchQuery(`${user.name} ${user.surname || ""} (${user.email})`.trim());
    setSearchResults([]);
    await loadUserPaymentMethods(user.id);
  };

  const loadUserPaymentMethods = async (userId: string) => {
    try {
      setIsLoadingUserPaymentMethods(true);
      const response = await fetch(`/api/admin/users/${userId}/payment-methods`);
      if (response.ok) {
        const data = await response.json();
        setUserPaymentMethods(data.user.paymentMethods || {
          cardToCardEnabled: null,
          onlinePaymentEnabled: null,
          payAfterDeliveryEnabled: null,
          paypalEnabled: null,
        });
      } else {
        toast.error(t("Failed to load user payment methods", "خطا در بارگذاری روش‌های پرداخت کاربر"));
      }
    } catch (error) {
      console.error("Error loading user payment methods:", error);
      toast.error(t("Failed to load user payment methods", "خطا در بارگذاری روش‌های پرداخت کاربر"));
    } finally {
      setIsLoadingUserPaymentMethods(false);
    }
  };

  const handleSaveUserPaymentMethods = async () => {
    if (!selectedUser) {
      toast.error(t("Please select a user first", "لطفاً ابتدا یک کاربر انتخاب کنید"));
      return;
    }

    try {
      setIsSavingUserPaymentMethods(true);
      const response = await fetch(`/api/admin/users/${selectedUser.id}/payment-methods`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userPaymentMethods),
      });

      if (response.ok) {
        toast.success(t("User payment methods saved successfully", "روش‌های پرداخت کاربر با موفقیت ذخیره شدند"));
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("Failed to save user payment methods", "خطا در ذخیره روش‌های پرداخت کاربر"));
      }
    } catch (error) {
      console.error("Error saving user payment methods:", error);
      toast.error(t("Failed to save user payment methods", "خطا در ذخیره روش‌های پرداخت کاربر"));
    } finally {
      setIsSavingUserPaymentMethods(false);
    }
  };

  const handleResetUserSelection = () => {
    setSelectedUser(null);
    setUserSearchQuery("");
    setSearchResults([]);
    setUserPaymentMethods({
      cardToCardEnabled: null,
      onlinePaymentEnabled: null,
      payAfterDeliveryEnabled: null,
      paypalEnabled: null,
    });
  };

  const addBankSetting = () => {
    setBankSettings([...bankSettings, {
      bankName: "",
      cardNumber: "",
      cardHolder: "",
      iban: "",
    }]);
  };

  const removeBankSetting = (index: number) => {
    const newBanks = bankSettings.filter((_, i) => i !== index);
    setBankSettings(newBanks);
  };

  const updateBankSetting = (index: number, field: string, value: string) => {
    const newBanks = [...bankSettings];
    newBanks[index] = { ...newBanks[index], [field]: value };

    // If card number is being updated, auto-fill bank name from first 6 digits
    if (field === "cardNumber") {
      const cardNumber = value.replace(/\s/g, ""); // Remove spaces
      if (cardNumber.length >= 6) {
        const bin = cardNumber.substring(0, 6);
        const bankName = banksData[bin] || "";
        if (bankName) {
          newBanks[index].bankName = bankName;
        }
      }
    }

    setBankSettings(newBanks);
  };

  const onBankSettingsSubmit = async () => {
    try {
      // Validate all banks have required fields
      const invalidBanks = bankSettings.filter(bank => {
        const cardNumber = bank.cardNumber.replace(/\s/g, "");
        return !bank.bankName.trim() || !bank.cardNumber.trim() || cardNumber.length !== 16 || !bank.cardHolder.trim();
      });

      if (invalidBanks.length > 0) {
        toast.error(t("Please fill in all required fields. Card number must be 16 digits.", "لطفاً تمام فیلدهای الزامی را پر کنید. شماره کارت باید ۱۶ رقم باشد."));
        return;
      }

      const response = await fetch("/api/admin/bank-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ banks: bankSettings }),
      });

      if (response.ok) {
        toast.success(t("Bank settings saved successfully", "تنظیمات بانکی با موفقیت ذخیره شدند"));
        loadBankSettings();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("Failed to save bank settings", "خطا در ذخیره تنظیمات بانکی"));
      }
    } catch (error) {
      console.error("Error saving bank settings:", error);
      toast.error(t("Failed to save bank settings", "خطا در ذخیره تنظیمات بانکی"));
    }
  };

  const loadPermissions = async () => {
    try {
      setIsLoadingPermissions(true);
      const response = await fetch("/api/admin/permissions");
      if (response.ok) {
        const data = await response.json();
        setPermissions(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to load permissions:", response.status, errorData);
        toast.error(errorData.error || t("Failed to load permissions", "خطا در بارگذاری مجوزها"));
      }
    } catch (error) {
      console.error("Error loading permissions:", error);
      toast.error(t("Failed to load permissions", "خطا در بارگذاری مجوزها"));
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId);
      } else {
        newSet.add(permissionId);
      }
      return newSet;
    });
  };

  const toggleCategoryPermissions = (category: string) => {
    const categoryPermissions = permissions.filter(p => p.category === category);
    const allSelected = categoryPermissions.every(p => selectedPermissions.has(p.id));

    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      categoryPermissions.forEach(p => {
        if (allSelected) {
          newSet.delete(p.id);
        } else {
          newSet.add(p.id);
        }
      });
      return newSet;
    });
  };

  const onCreateAdmin = async () => {
    try {
      if (!newAdminData.name.trim() || !newAdminData.email.trim() || !newAdminData.password.trim()) {
        toast.error(t("Please fill in all required fields", "لطفاً تمام فیلدهای الزامی را پر کنید"));
        return;
      }

      if (newAdminData.password.length < 6) {
        toast.error(t("Password must be at least 6 characters", "رمز عبور باید حداقل ۶ کاراکتر باشد"));
        return;
      }

      if (selectedPermissions.size === 0) {
        toast.error(t("Please select at least one permission", "لطفاً حداقل یک مجوز انتخاب کنید"));
        return;
      }

      setIsCreatingAdmin(true);
      const response = await fetch("/api/admin/create-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newAdminData,
          permissions: Array.from(selectedPermissions),
        }),
      });

      if (response.ok) {
        toast.success(t("Admin created successfully", "مدیر با موفقیت ایجاد شد"));
        setNewAdminData({ name: "", surname: "", email: "", phone: "", password: "" });
        setSelectedPermissions(new Set());
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("Failed to create admin", "خطا در ایجاد مدیر"));
      }
    } catch (error) {
      console.error("Error creating admin:", error);
      toast.error(t("Failed to create admin", "خطا در ایجاد مدیر"));
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const onChangeSuperAdminPassword = async () => {
    try {
      if (!superAdminPassword.currentPassword || !superAdminPassword.newPassword || !superAdminPassword.confirmPassword) {
        toast.error(t("Please fill in all fields", "لطفاً تمام فیلدها را پر کنید"));
        return;
      }

      if (superAdminPassword.newPassword.length < 6) {
        toast.error(t("New password must be at least 6 characters", "رمز عبور جدید باید حداقل ۶ کاراکتر باشد"));
        return;
      }

      if (superAdminPassword.newPassword !== superAdminPassword.confirmPassword) {
        toast.error(t("Passwords do not match", "رمزهای عبور مطابقت ندارند"));
        return;
      }

      setIsChangingPassword(true);
      const response = await fetch("/api/admin/change-superadmin-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: superAdminPassword.currentPassword,
          newPassword: superAdminPassword.newPassword,
        }),
      });

      if (response.ok) {
        toast.success(t("Password changed successfully", "رمز عبور با موفقیت تغییر کرد"));
        setSuperAdminPassword({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("Failed to change password", "خطا در تغییر رمز عبور"));
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error(t("Failed to change password", "خطا در تغییر رمز عبور"));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, { en: string; fa: string }> = {
      users: { en: "Users Management", fa: "مدیریت کاربران" },
      products: { en: "Products Management", fa: "مدیریت محصولات" },
      orders: { en: "Orders Management", fa: "مدیریت سفارشات" },
      settings: { en: "Settings Management", fa: "مدیریت تنظیمات" },
    };
    return labels[category] || { en: category, fa: category };
  };

  return (
    <>
      <AdminCard className={isSiteSettingsExpanded ? cardStyles.expanded : ""}>
        <div
          className={`${cardStyles.cardHeader} ${styles.expandableHeader}`}
          onClick={() => setIsSiteSettingsExpanded(!isSiteSettingsExpanded)}
        >
          <h3 className={cardStyles.cardTitle}>
            <FiSettings />
            <span>{t("Site Settings", "تنظیمات سایت")}</span>
          </h3>
          <div className={styles.expandIcon}>
            {isSiteSettingsExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
        {isSiteSettingsExpanded && (
          <form onSubmit={handleSubmitSiteSettings(onSiteSettingsSubmit)} className={`${styles.expandableContent} ${styles.siteSettingsForm}`}>
            <div className={styles.siteSettingsFirstRow}>
              <Input
                label={t("Site Name", "نام سایت")}
                {...registerSiteSettings("siteName")}
                error={siteSettingsErrors.siteName?.message}
              />
              <Select
                label={t("Default Language", "زبان پیش‌فرض")}
                options={languageOptions}
                value={watchSiteSettings("defaultLanguage") || "en"}
                onChange={(value) => setSiteSettingsValue("defaultLanguage", value)}
                placeholder={t("Select language", "زبان را انتخاب کنید")}
                error={siteSettingsErrors.defaultLanguage?.message}
              />
              <Select
                label={t("Currency", "واحد پول")}
                options={currencyOptions}
                value={watchSiteSettings("currency") || "usd"}
                onChange={(value) => setSiteSettingsValue("currency", value)}
                placeholder={t("Select currency", "واحد پول را انتخاب کنید")}
                error={siteSettingsErrors.currency?.message}
              />
              <Select
                label={t("Timezone", "منطقه زمانی")}
                options={timezoneOptions}
                value={watchSiteSettings("timezone") || "utc"}
                onChange={(value) => setSiteSettingsValue("timezone", value)}
                placeholder={t("Select timezone", "منطقه زمانی را انتخاب کنید")}
                error={siteSettingsErrors.timezone?.message}
              />
            </div>
            <div className={styles.siteSettingsSecondRow}>
              <div className={formStyles.formGroup}>
                <label className={formStyles.formLabel}>{t("Site Description", "توضیحات سایت")}</label>
                <textarea
                  rows={2}
                  className={`${formStyles.formTextarea} ${styles.siteDescriptionTextarea}`}
                  placeholder={t("Enter site description", "توضیحات سایت را وارد کنید")}
                  {...registerSiteSettings("siteDescription")}
                />
                {siteSettingsErrors.siteDescription && (
                  <span className={formStyles.formError}>{siteSettingsErrors.siteDescription.message}</span>
                )}
              </div>
              <div className={styles.siteSettingsMaintenanceMode}>
                <Select
                  label={t("Maintenance Mode", "حالت تعمیر و نگهداری")}
                  options={maintenanceOptions}
                  value={watchSiteSettings("maintenanceMode") || "off"}
                  onChange={(value) => setSiteSettingsValue("maintenanceMode", value)}
                  placeholder={t("Select mode", "حالت را انتخاب کنید")}
                  error={siteSettingsErrors.maintenanceMode?.message}
                />
              </div>
            </div>
            <div className={formStyles.formGrid}>
              <Textarea
                label={t("Checkout Notice (English)", "متن راهنمای پرداخت (انگلیسی)")}
                rows={4}
                placeholder={t("Text shown below shipping methods", "متنی که زیر روش‌های ارسال نمایش داده می‌شود")}
                {...registerSiteSettings("checkoutNoticeEn")}
                error={siteSettingsErrors.checkoutNoticeEn?.message}
              />
              <Textarea
                label={t("Checkout Notice (Farsi)", "متن راهنمای پرداخت (فارسی)")}
                rows={4}
                placeholder={t("Text shown below shipping methods", "متنی که زیر روش‌های ارسال نمایش داده می‌شود")}
                {...registerSiteSettings("checkoutNoticeFa")}
                error={siteSettingsErrors.checkoutNoticeFa?.message}
              />
            </div>
            <Input
              type="url"
              label={t("Checkout Terms Audio URL", "لینک فایل صوتی شرایط خرید")}
              placeholder={t("Enter an external audio URL (https://...)", "لینک خارجی فایل صوتی را وارد کنید (https://...)")}
              {...registerSiteSettings("checkoutTermsAudioUrl")}
              error={siteSettingsErrors.checkoutTermsAudioUrl?.message}
            />
            <div className={formStyles.formGrid}>
              <Textarea
                label={t("Shipping Cost Notice (English)", "متن هزینه ارسال (انگلیسی)")}
                rows={4}
                placeholder={t("Text shown below the shipping cost", "متنی که زیر هزینه ارسال نمایش داده می‌شود")}
                {...registerSiteSettings("shippingCostNoticeEn")}
                error={siteSettingsErrors.shippingCostNoticeEn?.message}
              />
              <Textarea
                label={t("Shipping Cost Notice (Farsi)", "متن هزینه ارسال (فارسی)")}
                rows={4}
                placeholder={t("Text shown below the shipping cost", "متنی که زیر هزینه ارسال نمایش داده می‌شود")}
                {...registerSiteSettings("shippingCostNoticeFa")}
                error={siteSettingsErrors.shippingCostNoticeFa?.message}
              />
            </div>
            <div className={formStyles.formActions}>
              <Button variant="primary" type="submit" disabled={isLoadingSiteSettings}>
                {isLoadingSiteSettings
                  ? t("Loading...", "در حال بارگذاری...")
                  : t("Update Settings", "به‌روزرسانی تنظیمات")}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  resetSiteSettings();
                  loadSiteSettings();
                }}
              >
                {t("Reset", "بازنشانی")}
              </Button>
            </div>
          </form>
        )}
      </AdminCard>

      <AdminCard className={isSecurityExpanded ? cardStyles.expanded : ""}>
        <div
          className={`${cardStyles.cardHeader} ${styles.expandableHeader}`}
          onClick={() => setIsSecurityExpanded(!isSecurityExpanded)}
        >
          <h3 className={cardStyles.cardTitle}>
            <FiLock />
            <span>{t("Security Settings", "تنظیمات امنیتی")}</span>
          </h3>
          <div className={styles.expandIcon}>
            {isSecurityExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
        {isSecurityExpanded && (
          <div className={styles.expandableContent}>
            <Select
              label={t("Two-Factor Authentication", "احراز هویت دو مرحله‌ای")}
              options={twoFactorOptions}
              value="disabled"
              placeholder={t("Select option", "گزینه را انتخاب کنید")}
            />
            <Input
              label={t("Session Timeout (minutes)", "زمان انقضای نشست (دقیقه)")}
              type="number"
              defaultValue="30"
            />
            <Select
              label={t("Password Policy", "سیاست رمز عبور")}
              options={passwordPolicyOptions}
              value="medium"
              placeholder={t("Select policy", "سیاست را انتخاب کنید")}
            />
            <div className={formStyles.formActions}>
              <Button variant="primary">{t("Update Security", "به‌روزرسانی امنیت")}</Button>
            </div>
          </div>
        )}
      </AdminCard>

      <AdminCard className={isShippingExpanded ? cardStyles.expanded : ""}>
        <div
          className={`${cardStyles.cardHeader} ${styles.expandableHeader}`}
          onClick={() => setIsShippingExpanded(!isShippingExpanded)}
        >
          <h3 className={cardStyles.cardTitle}>
            <FiTruck />
            <span>{t("Shipping Settings", "تنظیمات ارسال")}</span>
          </h3>
          <div className={styles.expandIcon}>
            {isShippingExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
        {isShippingExpanded && (
          <div className={styles.expandableContent}>
            {isLoadingShipping ? (
              <div style={{ padding: "1rem", textAlign: "center" }}>
                {t("Loading...", "در حال بارگذاری...")}
              </div>
            ) : (
              <form onSubmit={handleSubmit(onShippingSubmit)}>
                <div className={styles.shippingSection}>
                  <h4 className={styles.sectionTitle}>{t("Shipping Origin", "مبدأ ارسال")}</h4>
                  <Select
                    label={t("Admin's Province", "استان ادمین")}
                    options={provinceOptions}
                    value={watch("adminProvince")}
                    onChange={(value) => {
                      setValue("adminProvince", value);
                      setSelectedAdminProvince(value);
                      setAdminCityId(null);
                      setValue("adminCity", null);
                    }}
                    error={errors.adminProvince?.message}
                    placeholder={t("Select province", "استان را انتخاب کنید")}
                  />
                  <Select
                    label={t("Admin's City", "شهر ادمین")}
                    options={cityOptions}
                    value={adminCityId ? adminCityId.toString() : ""}
                    onChange={(value) => {
                      const cityId = value ? parseInt(value) : null;
                      setAdminCityId(cityId);
                      setValue("adminCity", cityId);
                    }}
                    error={errors.adminCity?.message}
                    placeholder={t("Select city", "شهر را انتخاب کنید")}
                    disabled={!selectedAdminProvince || cities.length === 0}
                  />
                </div>

                <div className={styles.shippingSection}>
                  <h4 className={styles.sectionTitle}>{t("Weight-Based Shipping Rates (Toman)", "هزینه ارسال بر اساس وزن (تومان)")}</h4>
                  <div className={formStyles.formGrid}>
                    {SHIPPING_WEIGHT_TIERS.map((tier, index) => (
                      <Input
                        key={tier.maxWeightKg}
                        label={t(tier.labelEn, tier.labelFa)}
                        type="number"
                        min="0"
                        step="1"
                        {...register(`weightRates.${index}` as const, { valueAsNumber: true })}
                        error={errors.weightRates?.[index]?.message}
                      />
                    ))}
                  </div>
                  <p>{t("Orders over 9 kg use the 8–9 kg rate.", "برای سفارش‌های بیش از ۹ کیلوگرم، هزینه بازه ۸ تا ۹ کیلوگرم اعمال می‌شود.")}</p>
                </div>

                <div className={formStyles.formActions}>
                  <Button variant="save" type="submit">
                    {t("Save Shipping Settings", "ذخیره تنظیمات ارسال")}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </AdminCard>

      <AdminCard className={isHeroExpanded ? cardStyles.expanded : ""}>
        <div
          className={`${cardStyles.cardHeader} ${styles.expandableHeader}`}
          onClick={() => setIsHeroExpanded(!isHeroExpanded)}
        >
          <h3 className={cardStyles.cardTitle}>
            <FiImage />
            <span>{t("Hero Section Settings", "تنظیمات بخش اصلی")}</span>
          </h3>
          <div className={styles.expandIcon}>
            {isHeroExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
        {isHeroExpanded && (
          <div className={styles.expandableContent}>
            {isLoadingHero ? (
              <div style={{ padding: "1rem", textAlign: "center" }}>
                {t("Loading...", "در حال بارگذاری...")}
              </div>
            ) : (
              <form onSubmit={handleSubmitHero(onHeroSubmit)}>
                <div className={formStyles.formGrid}>
                  <Input
                    label={t("Title (English)", "عنوان (انگلیسی)")}
                    {...registerHero("titleEn")}
                    error={heroErrors.titleEn?.message}
                  />
                  <Input
                    label={t("Title (Farsi)", "عنوان (فارسی)")}
                    {...registerHero("titleFa")}
                    error={heroErrors.titleFa?.message}
                  />
                </div>
                <div className={formStyles.formGroup}>
                  <label className={formStyles.formLabel}>
                    {t("Description (English)", "توضیحات (انگلیسی)")}
                  </label>
                  <textarea
                    rows={3}
                    className={formStyles.formTextarea}
                    {...registerHero("descriptionEn")}
                  />
                  {heroErrors.descriptionEn && (
                    <span className={formStyles.formError}>{heroErrors.descriptionEn.message}</span>
                  )}
                </div>
                <div className={formStyles.formGroup}>
                  <label className={formStyles.formLabel}>
                    {t("Description (Farsi)", "توضیحات (فارسی)")}
                  </label>
                  <textarea
                    rows={3}
                    className={formStyles.formTextarea}
                    {...registerHero("descriptionFa")}
                  />
                  {heroErrors.descriptionFa && (
                    <span className={formStyles.formError}>{heroErrors.descriptionFa.message}</span>
                  )}
                </div>
                <div className={formStyles.formGrid}>
                  <Input
                    label={t("Button Text (English)", "متن دکمه (انگلیسی)")}
                    {...registerHero("buttonTextEn")}
                    error={heroErrors.buttonTextEn?.message}
                  />
                  <Input
                    label={t("Button Text (Farsi)", "متن دکمه (فارسی)")}
                    {...registerHero("buttonTextFa")}
                    error={heroErrors.buttonTextFa?.message}
                  />
                </div>
                <Input
                  label={t("Button Link", "لینک دکمه")}
                  type="text"
                  {...registerHero("buttonLink")}
                  error={heroErrors.buttonLink?.message}
                  placeholder="/products"
                />
                <div className={formStyles.formGroup}>
                  <label className={formStyles.formLabel}>
                    {t("Background Image", "تصویر پس‌زمینه")}
                  </label>
                  <div className={styles.imageUploadSection}>
                    <div className={styles.uploadOptions}>
                      <div className={styles.uploadOption}>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                          onChange={handleImageUpload}
                          disabled={isUploadingImage}
                          style={{ display: "none" }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isUploadingImage}
                          onClick={() => fileInputRef.current?.click()}
                          style={{ width: "100%" }}
                        >
                          {isUploadingImage
                            ? t("Uploading...", "در حال آپلود...")
                            : t("Upload from Local Drive", "آپلود از درایو محلی")}
                        </Button>
                      </div>
                      <div className={styles.uploadOption}>
                        <Input
                          type="text"
                          placeholder={t("Or enter image URL", "یا آدرس تصویر را وارد کنید")}
                          value={watchHero("backgroundImageUrl") || ""}
                          onChange={(e) => handleImageUrlChange(e.target.value)}
                          error={heroErrors.backgroundImageUrl?.message}
                        />
                      </div>
                    </div>
                    {heroImagePreview && (
                      <div className={styles.imagePreview}>
                        <img
                          src={heroImagePreview}
                          alt={t("Hero background preview", "پیش‌نمایش پس‌زمینه قهرمان")}
                          onError={() => {
                            setHeroImagePreview("");
                            toast.error(t("Failed to load image", "خطا در بارگذاری تصویر"));
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setHeroImagePreview("");
                            setValueHero("backgroundImageUrl", "");
                          }}
                          className={styles.removeImageBtn}
                          title={t("Remove image", "حذف تصویر")}
                        >
                          ×
                        </button>
                      </div>
                    )}
                    <div className={styles.imageNote}>
                      <p>
                        <strong>{t("Recommended Image Specifications:", "مشخصات پیشنهادی تصویر:")}</strong>
                      </p>
                      <ul>
                        <li>{t("Size: 1920x1080 pixels (Full HD)", "اندازه: 1920x1080 پیکسل (فول اچ‌دی)")}</li>
                        <li>{t("Aspect Ratio: 16:9", "نسبت تصویر: 16:9")}</li>
                        <li>{t("Format: JPEG, PNG, WebP, or GIF", "فرمت: JPEG، PNG، WebP یا GIF")}</li>
                        <li>{t("File Size: Maximum 5MB", "حجم فایل: حداکثر 5 مگابایت")}</li>
                        <li>{t("Resolution: 72-150 DPI (web optimized)", "وضوح: 72-150 DPI (بهینه برای وب)")}</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className={formStyles.formGroup}>
                  <label className={formStyles.formLabel} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="checkbox"
                      {...registerHero("isEnabled")}
                      checked={watchHero("isEnabled") || false}
                      style={{ width: "auto" }}
                    />
                    <span>{t("Enable Hero Section", "فعال‌سازی بخش قهرمان")}</span>
                  </label>
                </div>
                <div className={formStyles.formActions}>
                  <Button variant="save" type="submit">
                    {t("Save Hero Settings", "ذخیره تنظیمات بخش اصلی")}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </AdminCard>

      <AdminCard className={isSocialLinksExpanded ? cardStyles.expanded : ""}>
        <div
          className={`${cardStyles.cardHeader} ${styles.expandableHeader}`}
          onClick={() => setIsSocialLinksExpanded(!isSocialLinksExpanded)}
        >
          <h3 className={cardStyles.cardTitle}>
            <FiLink />
            <span>{t("Exclusive Social Links", "لینک‌های اجتماعی انحصاری")}</span>
          </h3>
          <div className={styles.expandIcon}>
            {isSocialLinksExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
        {isSocialLinksExpanded && (
          <div className={styles.expandableContent}>
            {isLoadingSocialLinks ? (
              <div style={{ padding: "1rem", textAlign: "center" }}>
                {t("Loading...", "در حال بارگذاری...")}
              </div>
            ) : (
              <>
                {socialLinks.length === 0 ? (
                  <div style={{ padding: "1rem", textAlign: "center", color: "#666" }}>
                    {t("No Exclusive Link Added!", "هیچ لینک انحصاری اضافه نشده است!")}
                  </div>
                ) : (
                  <div className={styles.socialLinksList}>
                    {socialLinks.map((link, index) => (
                      <div key={index} className={styles.socialLinkItem}>
                        <div className={formStyles.formGrid}>
                          <Input
                            label={t("Link Name (English)", "نام لینک (انگلیسی)")}
                            placeholder={t("e.g., Facebook", "مثال: Facebook")}
                            value={link.nameEn || ""}
                            onChange={(e) => updateSocialLink(index, "nameEn", e.target.value)}
                          />
                          <Input
                            label={t("Link Name (Farsi)", "نام لینک (فارسی)")}
                            placeholder={t("e.g., فیسبوک", "مثال: فیسبوک")}
                            value={link.nameFa || ""}
                            onChange={(e) => updateSocialLink(index, "nameFa", e.target.value)}
                            className="farsi"
                          />
                        </div>
                        <div className={formStyles.formGrid}>
                          <Input
                            label={t("URL", "آدرس")}
                            type="url"
                            placeholder={t("https://example.com", "https://example.com")}
                            value={link.url}
                            onChange={(e) => updateSocialLink(index, "url", e.target.value)}
                          />
                          <Select
                            label={t("Icon (Optional)", "آیکون (اختیاری)")}
                            options={socialLinkIconOptions}
                            value={link.icon || ""}
                            onChange={(value) => updateSocialLink(index, "icon", value)}
                            placeholder={t("Select an icon", "یک آیکون انتخاب کنید")}
                            renderOption={(option) => (
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {renderIcon(option.value, undefined, { fontSize: "1.25rem", color: "#333" })}
                                <span>{option.label}</span>
                              </div>
                            )}
                            renderSelectedOption={(option) => (
                              option ? (
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                  {renderIcon(option.value, undefined, { fontSize: "1rem", color: "#333" })}
                                  <span>{option.label}</span>
                                </div>
                              ) : (
                                <span>{t("Select an icon", "یک آیکون انتخاب کنید")}</span>
                              )
                            )}
                          />
                        </div>
                        {link.icon && (
                          <div className={styles.iconPreview}>
                            <span>{t("Icon Preview:", "پیش‌نمایش آیکون:")}</span>
                            {renderIcon(link.icon, undefined, { fontSize: "1.5rem", color: "#333" })}
                            <span>({link.icon})</span>
                          </div>
                        )}
                        <Button
                          type="button"
                          variant="danger"
                          size="small"
                          onClick={() => removeSocialLink(index)}
                          style={{ marginTop: "0.5rem" }}
                        >
                          <FiX />
                          <span>{t("Remove", "حذف")}</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className={styles.socialLinksActions}>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSocialLink}
                    style={{ width: "100%" }}
                  >
                    <FiPlus />
                    <span>{t("Add Link", "افزودن لینک")}</span>
                  </Button>
                  {socialLinks.length > 0 && (
                    <Button
                      type="button"
                      variant="save"
                      onClick={onSocialLinksSubmit}
                      style={{ width: "100%", marginTop: "0.5rem" }}
                    >
                      {t("Save Links", "ذخیره لینک‌ها")}
                    </Button>
                  )}
                </div>

                {/* Category Exclusive Links Section */}
                <div style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "2px solid #e8e9ea" }}>
                  <h4 className={styles.sectionTitle} style={{ marginBottom: "1rem" }}>
                    {t("Category Exclusive Links", "لینک‌های انحصاری دسته‌بندی")}
                  </h4>
                  <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1rem" }}>
                    {t("These links are automatically created based on your product categories. You can only edit the URL and icon.", "این لینک‌ها به طور خودکار بر اساس دسته‌بندی‌های محصولات شما ایجاد می‌شوند. شما می‌توانید فقط آدرس و آیکون را ویرایش کنید.")}
                  </p>
                  {categoryLinks.length === 0 ? (
                    <div style={{ padding: "1rem", textAlign: "center", color: "#666" }}>
                      {t("No categories found. Add categories in Products Management to generate category links.", "هیچ دسته‌بندی یافت نشد. برای ایجاد لینک‌های دسته‌بندی، دسته‌بندی‌ها را در بخش مدیریت محصولات اضافه کنید.")}
                    </div>
                  ) : (
                    <>
                      <div className={styles.socialLinksList}>
                        {categoryLinks.map((link, index) => (
                          <div key={link.id || index} className={styles.socialLinkItem}>
                            <div className={formStyles.formGrid}>
                              <Input
                                label={t("Link Name (English)", "نام لینک (انگلیسی)")}
                                value={link.nameEn || ""}
                                readOnly
                                style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
                              />
                              <Input
                                label={t("Link Name (Farsi)", "نام لینک (فارسی)")}
                                value={link.nameFa || ""}
                                readOnly
                                style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
                                className="farsi"
                              />
                            </div>
                            <div className={formStyles.formGrid}>
                              <Input
                                label={t("URL", "آدرس")}
                                type="url"
                                placeholder={t("https://example.com", "https://example.com")}
                                value={link.url || ""}
                                onChange={(e) => updateCategoryLink(index, "url", e.target.value)}
                              />
                              <Select
                                label={t("Icon (Optional)", "آیکون (اختیاری)")}
                                options={socialLinkIconOptions}
                                value={link.icon || ""}
                                onChange={(value) => updateCategoryLink(index, "icon", value)}
                                placeholder={t("Select an icon", "یک آیکون انتخاب کنید")}
                                renderOption={(option) => (
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    {renderIcon(option.value, undefined, { fontSize: "1.25rem", color: "#333" })}
                                    <span>{option.label}</span>
                                  </div>
                                )}
                                renderSelectedOption={(option) => (
                                  option ? (
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                      {renderIcon(option.value, undefined, { fontSize: "1rem", color: "#333" })}
                                      <span>{option.label}</span>
                                    </div>
                                  ) : (
                                    <span>{t("Select an icon", "یک آیکون انتخاب کنید")}</span>
                                  )
                                )}
                              />
                            </div>
                            {link.icon && (
                              <div className={styles.iconPreview}>
                                <span>{t("Icon Preview:", "پیش‌نمایش آیکون:")}</span>
                                {renderIcon(link.icon, undefined, { fontSize: "1.5rem", color: "#333" })}
                                <span>({link.icon})</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className={styles.socialLinksActions} style={{ marginTop: "1rem" }}>
                        <Button
                          type="button"
                          variant="save"
                          onClick={onCategoryLinksSubmit}
                          disabled={isSavingCategoryLinks}
                          style={{ width: "100%" }}
                        >
                          {isSavingCategoryLinks ? t("Saving...", "در حال ذخیره...") : t("Save Category Links", "ذخیره لینک‌های دسته‌بندی")}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </AdminCard>

      <AdminCard className={isPaymentSettingsExpanded ? cardStyles.expanded : ""}>
        <div
          className={`${cardStyles.cardHeader} ${styles.expandableHeader}`}
          onClick={() => setIsPaymentSettingsExpanded(!isPaymentSettingsExpanded)}
        >
          <h3 className={cardStyles.cardTitle}>
            <FiCreditCard />
            <span>{t("Payments Settings", "تنظیمات پرداخت")}</span>
          </h3>
          <div className={styles.expandIcon}>
            {isPaymentSettingsExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
        {isPaymentSettingsExpanded && (
          <div className={styles.expandableContent}>
            {isLoadingPaymentSettings ? (
              <div style={{ padding: "1rem", textAlign: "center" }}>
                {t("Loading...", "در حال بارگذاری...")}
              </div>
            ) : (
              <>
                {/* Card to Card Transfer */}
                <AdminCard className={isCardToCardExpanded ? cardStyles.expanded : ""}>
                  <div
                    className={`${cardStyles.cardHeader} ${styles.expandableHeader}`}
                    onClick={() => setIsCardToCardExpanded(!isCardToCardExpanded)}
                  >
                    <h3 className={cardStyles.cardTitle}>
                      <FiCreditCard />
                      <span>{t("Card to Card Transfer", "انتقال کارت به کارت")}</span>
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <label className={styles.enableToggle} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={paymentSettings.cardToCardEnabled}
                          onChange={(e) => updatePaymentSetting("cardToCardEnabled", e.target.checked)}
                        />
                        <span className={styles.toggleSlider}></span>
                        <span className={styles.toggleLabel}>
                          {paymentSettings.cardToCardEnabled ? t("Enabled", "فعال") : t("Disabled", "غیرفعال")}
                        </span>
                      </label>
                      <div className={styles.expandIcon}>
                        {isCardToCardExpanded ? <FiChevronUp /> : <FiChevronDown />}
                      </div>
                    </div>
                  </div>
                  {isCardToCardExpanded && paymentSettings.cardToCardEnabled && (
                    <div className={styles.expandableContent}>
                      {bankSettings.length === 0 ? (
                        <div style={{ padding: "1rem", textAlign: "center", color: "#666" }}>
                          {t("No Bank Added!", "هیچ بانکی اضافه نشده است!")}
                        </div>
                      ) : (
                        <div className={styles.socialLinksList}>
                          {bankSettings.map((bank, index) => (
                            <div key={index} className={styles.socialLinkItem}>
                              <div className={formStyles.formGrid}>
                                <Input
                                  label={t("Card Number", "شماره کارت")}
                                  type="text"
                                  maxLength={19}
                                  placeholder={t("1234 5678 9012 3456", "1234 5678 9012 3456")}
                                  value={bank.cardNumber || ""}
                                  onChange={(e) => {
                                    // Format card number with spaces every 4 digits
                                    let value = e.target.value.replace(/\s/g, "");
                                    // Only allow digits
                                    value = value.replace(/\D/g, "");
                                    // Limit to 16 digits
                                    if (value.length > 16) value = value.substring(0, 16);
                                    // Add spaces every 4 digits
                                    const formatted = value.match(/.{1,4}/g)?.join(" ") || value;
                                    updateBankSetting(index, "cardNumber", formatted);
                                  }}
                                />
                                <Input
                                  label={t("Bank Name", "نام بانک")}
                                  value={bank.bankName || ""}
                                  onChange={(e) => updateBankSetting(index, "bankName", e.target.value)}
                                  readOnly
                                  style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
                                />
                              </div>
                              <div className={formStyles.formGrid}>
                                <Input
                                  label={t("Card Holder Name", "نام صاحب کارت")}
                                  value={bank.cardHolder || ""}
                                  onChange={(e) => updateBankSetting(index, "cardHolder", e.target.value)}
                                />
                                <Input
                                  label={t("IBAN (Optional)", "شماره شبا (اختیاری)")}
                                  value={bank.iban || ""}
                                  onChange={(e) => updateBankSetting(index, "iban", e.target.value)}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="danger"
                                size="small"
                                onClick={() => removeBankSetting(index)}
                                style={{ marginTop: "0.5rem" }}
                              >
                                <FiX />
                                <span>{t("Remove", "حذف")}</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className={styles.socialLinksActions}>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addBankSetting}
                          style={{ width: "100%" }}
                        >
                          <FiPlus />
                          <span>{t("Add Bank", "افزودن بانک")}</span>
                        </Button>
                        {bankSettings.length > 0 && (
                          <Button
                            type="button"
                            variant="save"
                            onClick={onBankSettingsSubmit}
                            style={{ width: "100%", marginTop: "0.5rem" }}
                          >
                            {t("Save Bank Settings", "ذخیره تنظیمات بانکی")}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </AdminCard>

                {/* Online Payment */}
                <AdminCard>
                  <div className={cardStyles.cardHeader}>
                    <h3 className={cardStyles.cardTitle}>
                      <FiCreditCard />
                      <span>{t("Online Payment", "پرداخت آنلاین")}</span>
                    </h3>
                    <label className={styles.enableToggle}>
                      <input
                        type="checkbox"
                        checked={paymentSettings.onlinePaymentEnabled}
                        onChange={(e) => updatePaymentSetting("onlinePaymentEnabled", e.target.checked)}
                      />
                      <span className={styles.toggleSlider}></span>
                      <span className={styles.toggleLabel}>
                        {paymentSettings.onlinePaymentEnabled ? t("Enabled", "فعال") : t("Disabled", "غیرفعال")}
                      </span>
                    </label>
                  </div>
                  {paymentSettings.onlinePaymentEnabled && (
                    <div className={styles.expandableContent}>
                      <div className={formStyles.formGroup}>
                        <Input
                          label={t("Zibal Merchant ID", "شناسه پذیرنده زیبال")}
                          value={paymentSettings.onlinePaymentMerchantId || ""}
                          onChange={(e) => updatePaymentSetting("onlinePaymentMerchantId", e.target.value)}
                          placeholder="e.g., 3823008327"
                        />
                      </div>
                      <p style={{ fontSize: "0.8rem", color: "#666", marginTop: "0.5rem" }}>
                        {t(
                          "Get your Merchant ID from Zibal dashboard (panel.zibal.ir). Use 'zibal' for sandbox testing.",
                          "شناسه پذیرنده را از پنل زیبال (panel.zibal.ir) دریافت کنید. برای تست از 'zibal' استفاده کنید."
                        )}
                      </p>
                    </div>
                  )}
                </AdminCard>

                {/* Pay After Delivery */}
                <AdminCard>
                  <div className={cardStyles.cardHeader}>
                    <h3 className={cardStyles.cardTitle}>
                      <FiCreditCard />
                      <span>{t("Pay After Delivery", "پرداخت در محل")}</span>
                    </h3>
                    <label className={styles.enableToggle}>
                      <input
                        type="checkbox"
                        checked={paymentSettings.payAfterDeliveryEnabled}
                        onChange={(e) => updatePaymentSetting("payAfterDeliveryEnabled", e.target.checked)}
                      />
                      <span className={styles.toggleSlider}></span>
                      <span className={styles.toggleLabel}>
                        {paymentSettings.payAfterDeliveryEnabled ? t("Enabled", "فعال") : t("Disabled", "غیرفعال")}
                      </span>
                    </label>
                  </div>
                  {paymentSettings.payAfterDeliveryEnabled && (
                    <div className={styles.expandableContent}>
                      {/* Settings removed - only enable/disable functionality */}
                    </div>
                  )}
                </AdminCard>

                {/* PayPal */}
                <AdminCard>
                  <div
                    className={`${cardStyles.cardHeader} ${styles.expandableHeader}`}
                    onClick={() => setIsPaypalExpanded(!isPaypalExpanded)}
                  >
                    <h3 className={cardStyles.cardTitle}>
                      <FiCreditCard />
                      <span>{t("PayPal", "پی‌پال")}</span>
                    </h3>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <label className={styles.enableToggle} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={paymentSettings.paypalEnabled}
                          onChange={(e) => updatePaymentSetting("paypalEnabled", e.target.checked)}
                        />
                        <span className={styles.toggleSlider}></span>
                        <span className={styles.toggleLabel}>
                          {paymentSettings.paypalEnabled ? t("Enabled", "فعال") : t("Disabled", "غیرفعال")}
                        </span>
                      </label>
                      <div className={styles.expandIcon}>
                        {isPaypalExpanded ? <FiChevronUp /> : <FiChevronDown />}
                      </div>
                    </div>
                  </div>
                  {isPaypalExpanded && paymentSettings.paypalEnabled && (
                    <div className={styles.expandableContent}>
                      <div className={formStyles.formGrid}>
                        <Input
                          label={t("Client ID", "شناسه کلاینت")}
                          value={paymentSettings.paypalClientId || ""}
                          onChange={(e) => updatePaymentSetting("paypalClientId", e.target.value)}
                        />
                        <Input
                          label={t("Secret Key", "کلید مخفی")}
                          type="password"
                          value={paymentSettings.paypalSecretKey || ""}
                          onChange={(e) => updatePaymentSetting("paypalSecretKey", e.target.value)}
                        />
                      </div>
                      <div className={formStyles.formGroup}>
                        <Select
                          label={t("Mode", "حالت")}
                          options={[
                            { value: "sandbox", label: t("Sandbox", "تست") },
                            { value: "live", label: t("Live", "عملیاتی") },
                          ]}
                          value={paymentSettings.paypalMode || "sandbox"}
                          onChange={(value) => updatePaymentSetting("paypalMode", value)}
                          placeholder={t("Select mode", "حالت را انتخاب کنید")}
                        />
                      </div>
                    </div>
                  )}
                </AdminCard>

                <div className={formStyles.formActions} style={{ marginTop: "1rem" }}>
                  <Button variant="save" type="button" onClick={onPaymentSettingsSubmit}>
                    {t("Save Payment Settings", "ذخیره تنظیمات پرداخت")}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </AdminCard>

      {/* User Specific Payment Methods */}
      <AdminCard>
        <div
          className={`${cardStyles.cardHeader} ${styles.expandableHeader}`}
          onClick={() => setIsUserSpecificPaymentExpanded(!isUserSpecificPaymentExpanded)}
        >
          <h3 className={cardStyles.cardTitle}>
            <FiUsers />
            <span>{t("User Specific Payment", "پرداخت اختصاصی کاربر")}</span>
          </h3>
          <div className={styles.expandIcon}>
            {isUserSpecificPaymentExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
        {isUserSpecificPaymentExpanded && (
          <div className={styles.expandableContent}>
            {/* User Search */}
            <div className={formStyles.formGroup}>
              <label className={formStyles.formLabel}>
                {t("Search User", "جستجوی کاربر")}
              </label>
              <div style={{ position: "relative" }}>
                <Input
                  type="text"
                  placeholder={t("Search by name, email, or phone...", "جستجو بر اساس نام، ایمیل یا تلفن...")}
                  value={userSearchQuery}
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  icon={<FiSearch />}
                />
                {searchResults.length > 0 && (
                  <div style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "#fff",
                    border: "1px solid #e8e9ea",
                    borderRadius: "8px",
                    marginTop: "4px",
                    maxHeight: "200px",
                    overflowY: "auto",
                    zIndex: 1000,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}>
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        style={{
                          padding: "12px 16px",
                          cursor: "pointer",
                          borderBottom: "1px solid #e8e9ea",
                          transition: "background-color 0.2s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8f9fa"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                          {user.name} {user.surname || ""}
                        </div>
                        <div style={{ fontSize: "0.875rem", color: "#666" }}>
                          {user.email}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {selectedUser && (
              <>
                <div style={{
                  padding: "1rem",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "8px",
                  marginBottom: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                      {selectedUser.name} {selectedUser.surname || ""}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#666" }}>
                      {selectedUser.email}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={handleResetUserSelection}
                    style={{ minWidth: "auto" }}
                  >
                    {t("Change User", "تغییر کاربر")}
                  </Button>
                </div>

                {isLoadingUserPaymentMethods ? (
                  <div style={{ padding: "1rem", textAlign: "center" }}>
                    {t("Loading...", "در حال بارگذاری...")}
                  </div>
                ) : (
                  <>
                    <div className={formStyles.formGroup}>
                      <h4 style={{ marginBottom: "1rem", fontSize: "1rem", fontWeight: 600 }}>
                        {t("Payment Methods", "روش‌های پرداخت")}
                      </h4>

                      {/* Card to Card */}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.75rem",
                        border: "1px solid #e8e9ea",
                        borderRadius: "8px",
                        marginBottom: "0.75rem"
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                            {t("Card to Card Transfer", "کارت به کارت")}
                          </div>
                          <div style={{ fontSize: "0.875rem", color: "#666" }}>
                            {userPaymentMethods.cardToCardEnabled === null
                              ? t("Using global settings", "استفاده از تنظیمات عمومی")
                              : userPaymentMethods.cardToCardEnabled
                                ? t("Enabled", "فعال")
                                : t("Disabled", "غیرفعال")}
                          </div>
                        </div>
                        <Select
                          options={[
                            { value: "null", label: t("Use Global", "استفاده از عمومی") },
                            { value: "true", label: t("Enabled", "فعال") },
                            { value: "false", label: t("Disabled", "غیرفعال") },
                          ]}
                          value={userPaymentMethods.cardToCardEnabled === null
                            ? "null"
                            : userPaymentMethods.cardToCardEnabled
                              ? "true"
                              : "false"}
                          onChange={(value) => setUserPaymentMethods(prev => ({
                            ...prev,
                            cardToCardEnabled: value === "null" ? null : value === "true"
                          }))}
                          style={{ minWidth: "150px" }}
                        />
                      </div>

                      {/* Online Payment */}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.75rem",
                        border: "1px solid #e8e9ea",
                        borderRadius: "8px",
                        marginBottom: "0.75rem"
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                            {t("Online Payment", "پرداخت آنلاین")}
                          </div>
                          <div style={{ fontSize: "0.875rem", color: "#666" }}>
                            {userPaymentMethods.onlinePaymentEnabled === null
                              ? t("Using global settings", "استفاده از تنظیمات عمومی")
                              : userPaymentMethods.onlinePaymentEnabled
                                ? t("Enabled", "فعال")
                                : t("Disabled", "غیرفعال")}
                          </div>
                        </div>
                        <Select
                          options={[
                            { value: "null", label: t("Use Global", "استفاده از عمومی") },
                            { value: "true", label: t("Enabled", "فعال") },
                            { value: "false", label: t("Disabled", "غیرفعال") },
                          ]}
                          value={userPaymentMethods.onlinePaymentEnabled === null
                            ? "null"
                            : userPaymentMethods.onlinePaymentEnabled
                              ? "true"
                              : "false"}
                          onChange={(value) => setUserPaymentMethods(prev => ({
                            ...prev,
                            onlinePaymentEnabled: value === "null" ? null : value === "true"
                          }))}
                          style={{ minWidth: "150px" }}
                        />
                      </div>

                      {/* Pay After Delivery */}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.75rem",
                        border: "1px solid #e8e9ea",
                        borderRadius: "8px",
                        marginBottom: "0.75rem"
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                            {t("Pay After Delivery", "پرداخت در محل")}
                          </div>
                          <div style={{ fontSize: "0.875rem", color: "#666" }}>
                            {userPaymentMethods.payAfterDeliveryEnabled === null
                              ? t("Using global settings", "استفاده از تنظیمات عمومی")
                              : userPaymentMethods.payAfterDeliveryEnabled
                                ? t("Enabled", "فعال")
                                : t("Disabled", "غیرفعال")}
                          </div>
                        </div>
                        <Select
                          options={[
                            { value: "null", label: t("Use Global", "استفاده از عمومی") },
                            { value: "true", label: t("Enabled", "فعال") },
                            { value: "false", label: t("Disabled", "غیرفعال") },
                          ]}
                          value={userPaymentMethods.payAfterDeliveryEnabled === null
                            ? "null"
                            : userPaymentMethods.payAfterDeliveryEnabled
                              ? "true"
                              : "false"}
                          onChange={(value) => setUserPaymentMethods(prev => ({
                            ...prev,
                            payAfterDeliveryEnabled: value === "null" ? null : value === "true"
                          }))}
                          style={{ minWidth: "150px" }}
                        />
                      </div>

                      {/* PayPal */}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.75rem",
                        border: "1px solid #e8e9ea",
                        borderRadius: "8px",
                        marginBottom: "0.75rem"
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                            {t("PayPal", "پی‌پال")}
                          </div>
                          <div style={{ fontSize: "0.875rem", color: "#666" }}>
                            {userPaymentMethods.paypalEnabled === null
                              ? t("Using global settings", "استفاده از تنظیمات عمومی")
                              : userPaymentMethods.paypalEnabled
                                ? t("Enabled", "فعال")
                                : t("Disabled", "غیرفعال")}
                          </div>
                        </div>
                        <Select
                          options={[
                            { value: "null", label: t("Use Global", "استفاده از عمومی") },
                            { value: "true", label: t("Enabled", "فعال") },
                            { value: "false", label: t("Disabled", "غیرفعال") },
                          ]}
                          value={userPaymentMethods.paypalEnabled === null
                            ? "null"
                            : userPaymentMethods.paypalEnabled
                              ? "true"
                              : "false"}
                          onChange={(value) => setUserPaymentMethods(prev => ({
                            ...prev,
                            paypalEnabled: value === "null" ? null : value === "true"
                          }))}
                          style={{ minWidth: "150px" }}
                        />
                      </div>
                    </div>

                    <div className={formStyles.formActions}>
                      <Button
                        variant="save"
                        type="button"
                        onClick={handleSaveUserPaymentMethods}
                        disabled={isSavingUserPaymentMethods}
                      >
                        {isSavingUserPaymentMethods
                          ? t("Saving...", "در حال ذخیره...")
                          : t("Save Changes", "ذخیره تغییرات")}
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </AdminCard>

      <AdminCard className={isAdminManagementExpanded ? cardStyles.expanded : ""}>
        <div
          className={`${cardStyles.cardHeader} ${styles.expandableHeader}`}
          onClick={() => setIsAdminManagementExpanded(!isAdminManagementExpanded)}
        >
          <h3 className={cardStyles.cardTitle}>
            <FiShield />
            <span>{t("Admin Management", "مدیریت مدیران")}</span>
          </h3>
          <div className={styles.expandIcon}>
            {isAdminManagementExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
        {isAdminManagementExpanded && (
          <div className={styles.expandableContent}>
            {/* Change Super Admin Password */}
            <div className={styles.adminSection}>
              <h4 className={styles.sectionTitle}>
                <FiLock />
                <span>{t("Change Super Admin Password", "تغییر رمز عبور سوپر ادمین")}</span>
              </h4>
              <div className={formStyles.formGrid}>
                <Input
                  label={t("Current Password", "رمز عبور فعلی")}
                  type="password"
                  value={superAdminPassword.currentPassword}
                  onChange={(e) => setSuperAdminPassword(prev => ({ ...prev, currentPassword: e.target.value }))}
                />
                <Input
                  label={t("New Password", "رمز عبور جدید")}
                  type="password"
                  value={superAdminPassword.newPassword}
                  onChange={(e) => setSuperAdminPassword(prev => ({ ...prev, newPassword: e.target.value }))}
                />
                <Input
                  label={t("Confirm New Password", "تایید رمز عبور جدید")}
                  type="password"
                  value={superAdminPassword.confirmPassword}
                  onChange={(e) => setSuperAdminPassword(prev => ({ ...prev, confirmPassword: e.target.value }))}
                />
              </div>
              <div className={formStyles.formActions}>
                <Button
                  variant="save"
                  type="button"
                  onClick={onChangeSuperAdminPassword}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? t("Changing...", "در حال تغییر...") : t("Change Password", "تغییر رمز عبور")}
                </Button>
              </div>
            </div>

            {/* Create New Admin */}
            <div className={styles.adminSection}>
              <h4 className={styles.sectionTitle}>
                <FiUsers />
                <span>{t("Create New Admin", "ایجاد مدیر جدید")}</span>
              </h4>
              <div className={formStyles.formGrid}>
                <Input
                  label={t("Name", "نام")}
                  value={newAdminData.name}
                  onChange={(e) => setNewAdminData(prev => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  label={t("Surname", "نام خانوادگی")}
                  value={newAdminData.surname}
                  onChange={(e) => setNewAdminData(prev => ({ ...prev, surname: e.target.value }))}
                />
                <Input
                  label={t("Email", "ایمیل")}
                  type="email"
                  value={newAdminData.email}
                  onChange={(e) => setNewAdminData(prev => ({ ...prev, email: e.target.value }))}
                />
                <Input
                  label={t("Phone (Optional)", "تلفن (اختیاری)")}
                  type="tel"
                  value={newAdminData.phone}
                  onChange={(e) => setNewAdminData(prev => ({ ...prev, phone: e.target.value }))}
                />
                <Input
                  label={t("Password", "رمز عبور")}
                  type="password"
                  value={newAdminData.password}
                  onChange={(e) => setNewAdminData(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>

              {/* Permissions Checklist */}
              <div className={styles.permissionsSection}>
                <h5 className={styles.permissionsTitle}>
                  {t("Admin Permissions", "مجوزهای مدیر")}
                </h5>
                {isLoadingPermissions ? (
                  <div style={{ padding: "1rem", textAlign: "center" }}>
                    {t("Loading permissions...", "در حال بارگذاری مجوزها...")}
                  </div>
                ) : (
                  <div className={styles.permissionsList}>
                    {Object.entries(groupedPermissions).map(([category, categoryPerms]) => {
                      const categoryLabel = getCategoryLabel(category);
                      const allSelected = categoryPerms.every(p => selectedPermissions.has(p.id));
                      const someSelected = categoryPerms.some(p => selectedPermissions.has(p.id));

                      const handleToggleCategory = () => {
                        toggleCategoryPermissions(category);
                      };

                      return (
                        <div key={category} className={styles.permissionCategory}>
                          <div className={styles.categoryHeader}>
                            <span className={styles.categoryName}>
                              {t(categoryLabel.en, categoryLabel.fa)}
                            </span>
                            <button
                              type="button"
                              className={styles.categoryToggle}
                              onClick={handleToggleCategory}
                            >
                              {allSelected
                                ? t("None", "هیچ‌کدام")
                                : t("All", "همه")}
                            </button>
                          </div>
                          <div className={styles.permissionItems}>
                            {categoryPerms.map(permission => (
                              <label key={permission.id} className={styles.permissionItem}>
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.has(permission.id)}
                                  onChange={() => togglePermission(permission.id)}
                                />
                                <span>{t(permission.descriptionEn, permission.descriptionFa)}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={formStyles.formActions}>
                <Button
                  variant="save"
                  type="button"
                  onClick={onCreateAdmin}
                  disabled={isCreatingAdmin}
                >
                  {isCreatingAdmin ? t("Creating...", "در حال ایجاد...") : t("Create Admin", "ایجاد مدیر")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </AdminCard>

      {/* Reward Management Section */}
      <AdminCard className={isRewardManagementExpanded ? cardStyles.expanded : ""}>
        <div
          className={`${cardStyles.cardHeader} ${styles.expandableHeader}`}
          onClick={() => setIsRewardManagementExpanded(!isRewardManagementExpanded)}
        >
          <h3 className={cardStyles.cardTitle}>
            <FiGift />
            <span>{t("Reward Management", "مدیریت پاداش")}</span>
          </h3>
          <div className={styles.expandIcon}>
            {isRewardManagementExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
        {isRewardManagementExpanded && (
          <div className={styles.expandableContent}>
            {isLoadingRewardSettings ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                {t("Loading reward settings...", "در حال بارگذاری تنظیمات پاداش...")}
              </div>
            ) : (
              <div className={formStyles.formContainer}>
                <div className={formStyles.formFields}>
                <div style={{ marginBottom: "2rem", padding: "1rem", border: "1px solid #e0e0e0", borderRadius: "8px" }}>
                  <h4 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem", color: "#333" }}>
                    {t("Manually Add Reward Points", "افزودن دستی امتیاز پاداش")}
                  </h4>
                  <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1rem" }}>
                    {t("Search for a user, choose an amount of points, and optionally add a reason.", "کاربر را جستجو کنید، تعداد امتیاز را وارد کنید و در صورت تمایل دلیل را بنویسید.")}
                  </p>
                  <Input
                    label={t("Search user by name, email, or phone", "جستجوی کاربر با نام، ایمیل یا شماره تلفن")}
                    value={selectedRewardUser
                      ? `${selectedRewardUser.name} ${selectedRewardUser.surname || ""} — ${selectedRewardUser.email || selectedRewardUser.phone || selectedRewardUser.id}`
                      : rewardUserSearch}
                    onChange={(event) => {
                      setSelectedRewardUser(null);
                      setRewardUserSearch(event.target.value);
                    }}
                    placeholder={t("Enter at least 2 characters", "حداقل ۲ حرف وارد کنید")}
                  />
                  {isSearchingRewardUsers && (
                    <p style={{ color: "#666", fontSize: "0.875rem" }}>
                      {t("Searching users...", "در حال جستجوی کاربران...")}
                    </p>
                  )}
                  {!selectedRewardUser && rewardUsers.length > 0 && (
                    <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1rem" }}>
                      {rewardUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedRewardUser(user);
                            setRewardUserSearch("");
                            setRewardUsers([]);
                          }}
                          style={{
                            padding: "0.75rem",
                            border: "1px solid #ddd",
                            borderRadius: "6px",
                            background: "#fff",
                            textAlign: "start",
                            cursor: "pointer",
                          }}
                        >
                          <strong>{user.name} {user.surname || ""}</strong>
                          <span style={{ display: "block", color: "#666", fontSize: "0.875rem" }}>
                            {[user.email, user.phone].filter(Boolean).join(" · ")}
                            {" — "}
                            {t("Current points", "امتیاز فعلی")}: {user.totalPoints}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!selectedRewardUser && rewardUserSearch.trim().length >= 2 && !isSearchingRewardUsers && rewardUsers.length === 0 && (
                    <p style={{ color: "#666", fontSize: "0.875rem" }}>
                      {t("No users found", "کاربری پیدا نشد")}
                    </p>
                  )}
                  {selectedRewardUser && (
                    <>
                      <p style={{ margin: "0 0 1rem", color: "#333" }}>
                        {t("Current points", "امتیاز فعلی")}: <strong>{selectedRewardUser.totalPoints}</strong>
                      </p>
                      <Input
                        label={t("Points to add", "امتیاز برای افزودن")}
                        type="number"
                        min="1"
                        max="1000000"
                        step="1"
                        value={manualRewardPoints}
                        onChange={(event) => setManualRewardPoints(event.target.value)}
                        placeholder={t("Enter points", "تعداد امتیاز را وارد کنید")}
                      />
                      <Input
                        label={t("Reason (optional)", "دلیل (اختیاری)")}
                        value={manualRewardReason}
                        onChange={(event) => setManualRewardReason(event.target.value)}
                        placeholder={t("Reason for this reward", "دلیل این پاداش")}
                        maxLength={300}
                      />
                      <div className={formStyles.formActions}>
                        <Button
                          variant="save"
                          type="button"
                          onClick={onManualRewardGrant}
                          disabled={isGrantingReward}
                        >
                          {isGrantingReward
                            ? t("Adding...", "در حال افزودن...")
                            : t("Add Reward Points", "افزودن امتیاز پاداش")}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
                <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1rem" }}>
                  {t("Configure up to 3 reward thresholds. Users can convert points to discount codes when they reach each threshold.", "حداکثر 3 آستانه پاداش را تنظیم کنید. کاربران می‌توانند امتیازهای خود را به کدهای تخفیف تبدیل کنند وقتی به هر آستانه برسند.")}
                </p>

                  {[0, 1, 2].map((index) => (
                    <div key={index} style={{ marginBottom: "1.5rem", padding: "1rem", border: "1px solid #e0e0e0", borderRadius: "8px" }}>
                      <h4 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1rem", color: "#333" }}>
                        {t(`Threshold ${index + 1}`, `آستانه ${index + 1}`)}
                      </h4>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <Input
                          label={t("Points Required", "امتیاز مورد نیاز")}
                          type="number"
                          min="1"
                          placeholder={language === "fa" ? "مثال: 100" : "e.g., 100"}
                          value={rewardThresholds[index].value}
                          onChange={(e) => {
                            const newThresholds = [...rewardThresholds];
                            newThresholds[index].value = e.target.value;
                            setRewardThresholds(newThresholds);
                          }}
                          error={
                            rewardThresholds[index].value &&
                              (isNaN(parseInt(rewardThresholds[index].value, 10)) || parseInt(rewardThresholds[index].value, 10) <= 0)
                              ? t("Must be a positive number", "باید یک عدد مثبت باشد")
                              : undefined
                          }
                        />
                        <Input
                          label={t("Discount (%)", "تخفیف (%)")}
                          type="number"
                          min="1"
                          max="100"
                          placeholder={language === "fa" ? "مثال: 10" : "e.g., 10"}
                          value={rewardThresholds[index].discount}
                          onChange={(e) => {
                            const newThresholds = [...rewardThresholds];
                            newThresholds[index].discount = e.target.value;
                            setRewardThresholds(newThresholds);
                          }}
                          error={
                            rewardThresholds[index].discount &&
                              (isNaN(parseInt(rewardThresholds[index].discount, 10)) ||
                                parseInt(rewardThresholds[index].discount, 10) <= 0 ||
                                parseInt(rewardThresholds[index].discount, 10) > 100)
                              ? t("Must be between 1 and 100", "باید بین 1 تا 100 باشد")
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className={formStyles.formActions}>
                  <Button
                    variant="save"
                    type="button"
                    onClick={onRewardSettingsSubmit}
                    disabled={isLoadingRewardSettings}
                  >
                    {t("Save Reward Settings", "ذخیره تنظیمات پاداش")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </AdminCard>

      {/* About Us Management Section */}
      <AdminCard className={isAboutUsExpanded ? cardStyles.expanded : ""}>
        <div
          className={`${cardStyles.cardHeader} ${styles.expandableHeader}`}
          onClick={() => setIsAboutUsExpanded(!isAboutUsExpanded)}
        >
          <h3 className={cardStyles.cardTitle}>
            <FiSettings />
            <span>{t("About Us Management", "مدیریت بخش درباره ما")}</span>
          </h3>
          <div className={styles.expandIcon}>
            {isAboutUsExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
        {isAboutUsExpanded && (
          <div className={styles.expandableContent}>
            {isLoadingAboutUs ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                {t("Loading About Us content...", "در حال بارگذاری محتوای بخش درباره ما...")}
              </div>
            ) : (
              <div>
                <h4 className={styles.sectionTitle}>{t("Content", "محتوا")}</h4>
                <div className={formStyles.formGrid}>
                  <Textarea
                    label={t("About Us Content (English)", "محتوای درباره ما (انگلیسی)")}
                    value={aboutUsContent.contentEn}
                    onChange={(e) => setAboutUsContent(prev => ({ ...prev, contentEn: e.target.value }))}
                    rows={10}
                    className={language === "fa" ? "" : ""}
                  />
                  <Textarea
                    label={t("About Us Content (Farsi)", "محتوای درباره ما (فارسی)")}
                    value={aboutUsContent.contentFa}
                    onChange={(e) => setAboutUsContent(prev => ({ ...prev, contentFa: e.target.value }))}
                    rows={10}
                    className="farsi"
                  />
                </div>

                <h4 className={styles.sectionTitle} style={{ marginTop: "2rem" }}>{t("SEO Meta Tags", "تگ‌های متا SEO")}</h4>
                <div className={formStyles.formGrid}>
                  <Input
                    label={t("Meta Title (English)", "عنوان متا (انگلیسی)")}
                    value={aboutUsContent.metaTitleEn}
                    onChange={(e) => setAboutUsContent(prev => ({ ...prev, metaTitleEn: e.target.value }))}
                    placeholder={t("About Us - Nazira", "About Us - Nazira")}
                  />
                  <Input
                    label={t("Meta Title (Farsi)", "عنوان متا (فارسی)")}
                    value={aboutUsContent.metaTitleFa}
                    onChange={(e) => setAboutUsContent(prev => ({ ...prev, metaTitleFa: e.target.value }))}
                    placeholder={t("درباره ما - Nazira", "درباره ما - Nazira")}
                    className="farsi"
                  />
                  <Textarea
                    label={t("Meta Description (English)", "توضیحات متا (انگلیسی)")}
                    value={aboutUsContent.metaDescriptionEn}
                    onChange={(e) => setAboutUsContent(prev => ({ ...prev, metaDescriptionEn: e.target.value }))}
                    rows={3}
                    placeholder={t("Learn more about Nazira, our mission, values, and team.", "Learn more about Nazira, our mission, values, and team.")}
                  />
                  <Textarea
                    label={t("Meta Description (Farsi)", "توضیحات متا (فارسی)")}
                    value={aboutUsContent.metaDescriptionFa}
                    onChange={(e) => setAboutUsContent(prev => ({ ...prev, metaDescriptionFa: e.target.value }))}
                    rows={3}
                    placeholder={t("درباره Nazira، ماموریت، ارزش‌ها و تیم ما بیشتر بدانید.", "درباره Nazira، ماموریت، ارزش‌ها و تیم ما بیشتر بدانید.")}
                    className="farsi"
                  />
                  <Input
                    label={t("Meta Image URL (Open Graph & Twitter Card)", "آدرس تصویر متا (Open Graph و Twitter Card)")}
                    value={aboutUsContent.metaImageUrl}
                    onChange={(e) => setAboutUsContent(prev => ({ ...prev, metaImageUrl: e.target.value }))}
                    placeholder={t("https://example.com/image.jpg or /images/about-us.jpg", "https://example.com/image.jpg یا /images/about-us.jpg")}
                  />
                </div>

                <div className={styles.faqSection}>
                  <h4 className={styles.sectionTitle}>
                    {t("FAQ Section", "بخش سوالات متداول")}
                  </h4>
                  <div className={styles.faqToggle}>
                    <label className={styles.enableToggle}>
                      <input
                        type="checkbox"
                        checked={faqEnabled}
                        onChange={(e) => setFaqEnabled(e.target.checked)}
                      />
                      <span className={styles.toggleSlider}></span>
                      <span className={styles.toggleLabel}>
                        {faqEnabled ? t("FAQ Enabled", "سوالات متداول فعال") : t("FAQ Disabled", "سوالات متداول غیرفعال")}
                      </span>
                    </label>
                  </div>

                  {faqEnabled && (
                    <div>
                      {faqItems.length === 0 ? (
                        <div className={styles.faqEmptyState}>
                          {t("No FAQ items added yet. Click 'Add FAQ Pair' to start.", "هنوز موردی اضافه نشده است. برای شروع روی 'افزودن سوال و جواب' کلیک کنید.")}
                        </div>
                      ) : (
                        <div className={styles.faqItemsContainer}>
                          {faqItems.map((item, index) => (
                            <div key={index} className={styles.faqItem}>
                              <div className={styles.faqItemHeader}>
                                <h5 className={styles.faqItemTitle}>
                                  {t(`FAQ Item ${index + 1}`, `سوال ${index + 1}`)}
                                </h5>
                                {faqItems.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="danger"
                                    size="small"
                                    onClick={() => removeFaqItem(index)}
                                  >
                                    <FiX />
                                    <span>{t("Remove", "حذف")}</span>
                                  </Button>
                                )}
                              </div>
                              <div className={`${formStyles.formGrid} ${styles.faqItemFields}`}>
                                <Input
                                  label={t("Question (English)", "سوال (انگلیسی)")}
                                  placeholder={t("Enter question in English", "سوال را به انگلیسی وارد کنید")}
                                  value={item.questionEn}
                                  onChange={(e) => updateFaqItem(index, "questionEn", e.target.value)}
                                />
                                <Input
                                  label={t("Question (Farsi)", "سوال (فارسی)")}
                                  placeholder={t("Enter question in Farsi", "سوال را به فارسی وارد کنید")}
                                  value={item.questionFa}
                                  onChange={(e) => updateFaqItem(index, "questionFa", e.target.value)}
                                  className="farsi"
                                />
                              </div>
                              <div className={formStyles.formGrid}>
                                <Textarea
                                  label={t("Answer (English)", "جواب (انگلیسی)")}
                                  placeholder={t("Enter answer in English", "جواب را به انگلیسی وارد کنید")}
                                  rows={4}
                                  value={item.answerEn}
                                  onChange={(e) => updateFaqItem(index, "answerEn", e.target.value)}
                                />
                                <Textarea
                                  label={t("Answer (Farsi)", "جواب (فارسی)")}
                                  placeholder={t("Enter answer in Farsi", "جواب را به فارسی وارد کنید")}
                                  rows={4}
                                  value={item.answerFa}
                                  onChange={(e) => updateFaqItem(index, "answerFa", e.target.value)}
                                  className="farsi"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className={styles.faqAddButton}>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addFaqItem}
                          style={{ width: "100%" }}
                        >
                          <FiPlus />
                          <span>{t("Add FAQ Pair", "افزودن سوال و جواب")}</span>
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className={formStyles.formActions}>
                  <Button
                    variant="save"
                    type="button"
                    onClick={onAboutUsSubmit}
                    disabled={isLoadingAboutUs}
                  >
                    {isLoadingAboutUs ? t("Saving...", "در حال ذخیره...") : t("Save About Us Content", "ذخیره محتوای درباره ما")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </AdminCard>

      <InstructionsPageSection />

      <DiscountCodesSection />
    </>
  );
}
