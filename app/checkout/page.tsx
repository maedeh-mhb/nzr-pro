"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Script from "next/script";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/utils/language";
import { useCart } from "@/lib/contexts/CartContext";
import { formatPrice } from "@/lib/utils/formatPrice";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomBar from "@/components/BottomBar";
import BackButton from "@/components/ui/BackButton";
import Input from "@/components/ui/Input";
import Select, { SelectOption } from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import ProvinceCitySelector from "@/components/checkout/ProvinceCitySelector";
import PhoneVerification from "@/components/phone/PhoneVerification";
import CheckoutProgressBar, { CheckoutStep } from "@/components/checkout/CheckoutProgressBar";
import OrderSummary from "@/components/checkout/OrderSummary";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import Link from "next/link";
import { FiPackage, FiTruck } from "react-icons/fi";
import styles from "@/styles/pages/_checkout.module.scss";

// Create schema factory function for bilingual support
const createGuestCheckoutSchema = (t: (en: string, fa: string) => string) => yup.object({
  guestName: yup.string().when("$isGuest", {
    is: true,
    then: (schema) => schema.required(t("Name is required", "نام الزامی است")),
    otherwise: (schema) => schema.notRequired(),
  }),
  guestEmail: yup.string().when("$isGuest", {
    is: true,
    then: (schema) => schema.email(t("Invalid email", "ایمیل نامعتبر است")).notRequired(),
    otherwise: (schema) => schema.notRequired(),
  }),
  guestPhone: yup.string().when("$isGuest", {
    is: true,
    then: (schema) =>
      schema
        .required(t("Phone is required", "شماره تلفن الزامی است"))
        .matches(/^09\d{9}$/, t("Phone must be 11 digits starting with 09", "شماره تلفن باید 11 رقم و با 09 شروع شود"))
        .matches(/^\d+$/, t("Phone must contain only digits", "شماره تلفن باید فقط شامل ارقام باشد"))
        .test(
          "len",
          t("Phone must be exactly 11 digits", "شماره تلفن باید دقیقا 11 رقم باشد"),
          (val) => val !== undefined && val.length === 11
        ),
    otherwise: (schema) => schema.notRequired(),
  }),
  provinceId: yup.number().required(t("Province is required", "استان الزامی است")),
  cityId: yup.number().required(t("City is required", "شهر الزامی است")),
  address: yup.string().required(t("Address is required", "آدرس الزامی است")),
  postalCode: yup.string().when("$isGuest", {
    is: true,
    then: (schema) => schema
      .required(t("Postal code is required", "کد پستی الزامی است"))
      .matches(/^\d{10}$/, t("Postal code must be 10 digits", "کد پستی باید 10 رقم باشد")),
    otherwise: (schema) => schema.notRequired(),
  }),
  paymentMethod: yup.string().required(t("Payment method is required", "روش پرداخت الزامی است")),
});

type GuestCheckoutFormData = yup.InferType<ReturnType<typeof createGuestCheckoutSchema>>;

interface PaymentMethod {
  value: string;
  label: string;
  labelFa: string;
}

export default function CheckoutPage() {
  const { t, language, currency } = useLanguage();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const {
    items,
    getTotalPrice,
    clearCart,
    isLoading: cartLoading,
    getSelectedItems,
    selectedItems,
  } = useCart();

  // Get selected items for checkout - memoize to prevent infinite loops
  const selectedItemsList = useMemo(() => getSelectedItems(), [items, selectedItems]);
  const selectedItemIds = useMemo(() => Array.from(selectedItems), [selectedItems]);
  const [isGuestCheckout, setIsGuestCheckout] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(true);
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [originalShippingCost, setOriginalShippingCost] = useState<number | null>(null); // Store original cost for Iranian Post
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [shippingMethods, setShippingMethods] = useState<Array<{ value: string; label: string; labelFa: string; cost: number }>>([]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<string>("iranian_post");
  const [adminShippingSettings, setAdminShippingSettings] = useState<{ adminProvince: string | null; adminCity: number | null } | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [wasAuthenticated, setWasAuthenticated] = useState(false);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [newAddressName, setNewAddressName] = useState("");
  const [newAddressPostalCode, setNewAddressPostalCode] = useState("");
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    codeId: string;
    amount: number;
    type: string;
  } | null>(null);
  const [isValidatingDiscount, setIsValidatingDiscount] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [invoiceRequested, setInvoiceRequested] = useState(false);
  // Honeypot fields for bot detection
  const [honeypotWebsite, setHoneypotWebsite] = useState("");
  const [honeypotCompany, setHoneypotCompany] = useState("");
  // Checkout experience
  const [currentStep, setCurrentStep] = useState<CheckoutStep>("cart");
  const [createAccountAfterPurchase, setCreateAccountAfterPurchase] = useState(false);

  // Use ref to track if we're in the process of navigating after order success
  // This prevents the empty cart from triggering an unintended redirect
  const isNavigatingAfterOrderRef = useRef(false);

  // Redirect if cart is empty
  useEffect(() => {
    if (!cartLoading && items.length === 0 && !isNavigatingAfterOrderRef.current) {
      router.push("/products");
    }
  }, [items, cartLoading, router]);

  // Cleanup: if we set the navigation flag, ensure we don't redirect on unmount
  useEffect(() => {
    return () => {
      // This cleanup runs when component unmounts
      // Reset the ref only if we're NOT currently on the success page
      if (!window.location.pathname.includes('/checkout/success')) {
        isNavigatingAfterOrderRef.current = false;
      }
    };
  }, []);

  // Redirect if no items selected
  useEffect(() => {
    if (!cartLoading && items.length > 0 && selectedItemIds.length === 0) {
      // User has items but none selected - redirect to products or show message
      toast.error(t("Please select items to checkout", "لطفاً آیتم‌هایی را برای تسویه حساب انتخاب کنید"));
    }
  }, [items, selectedItemIds, cartLoading, router, t]);

  // Monitor session status for expiry during checkout
  useEffect(() => {
    if (sessionStatus === "loading") return;

    // Track if user was authenticated when they started checkout
    if (sessionStatus === "authenticated" && session) {
      setWasAuthenticated(true);
      setSessionExpired(false);
    }

    // Detect session expiry (was authenticated, now not)
    if (wasAuthenticated && (sessionStatus === "unauthenticated" || !session)) {
      setSessionExpired(true);
      toast.error(
        t(
          "Your session has expired. Please log in again to continue checkout.",
          "جلسه شما منقضی شده است. لطفاً دوباره وارد شوید تا ادامه دهید."
        ),
        { duration: 5000 }
      );
    }
  }, [sessionStatus, session, wasAuthenticated]);

  // Load CSRF token
  useEffect(() => {
    const loadCsrfToken = async () => {
      try {
        const response = await fetch("/api/csrf-token");
        if (response.ok) {
          const data = await response.json();
          setCsrfToken(data.csrfToken);
        }
      } catch (error) {
        console.error("Error loading CSRF token:", error);
      }
    };

    loadCsrfToken();
  }, []);

  // Load payment methods
  useEffect(() => {
    const loadPaymentMethods = async () => {
      setIsLoadingPaymentMethods(true);
      try {
        const response = await fetch("/api/payment-settings");
        if (response.ok) {
          const data = await response.json();
          const methods: PaymentMethod[] = [];

          if (data.cardToCardEnabled) {
            methods.push({
              value: "card_to_card",
              label: "Card to Card Transfer",
              labelFa: "کارت به کارت",
            });
          }
          if (data.onlinePaymentEnabled) {
            methods.push({
              value: "online_payment",
              label: "Online Payment",
              labelFa: "پرداخت آنلاین",
            });
          }
          if (data.payAfterDeliveryEnabled) {
            methods.push({
              value: "pay_after_delivery",
              label: "Pay After Delivery",
              labelFa: "پرداخت در محل",
            });
          }
          if (data.paypalEnabled) {
            methods.push({
              value: "paypal",
              label: "PayPal",
              labelFa: "پی‌پال",
            });
          }

          setPaymentMethods(methods);
        }
      } catch (error) {
        console.error("Error loading payment methods:", error);
      } finally {
        setIsLoadingPaymentMethods(false);
      }
    };

    loadPaymentMethods();
  }, []);

  // Determine if user is actually a guest (session loaded and no user)
  // Calculate this before form initialization so it can be used in context
  // Only consider user a guest if session has finished loading and there's no authenticated session
  const isGuest = sessionStatus !== "loading" && (sessionStatus === "unauthenticated" || !session);
  const isAuthenticated = sessionStatus === "authenticated" && !!session;

  // Create schema with current language
  const guestCheckoutSchema = useMemo(() => createGuestCheckoutSchema(t), [t]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GuestCheckoutFormData>({
    resolver: yupResolver(guestCheckoutSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    context: { isGuest },
  });

  // Load Zibal trust seal when online payment is selected
  const paymentMethodValue = watch("paymentMethod");
  useEffect(() => {
    if (paymentMethodValue !== "online_payment") return;

    const container = document.getElementById("zibal");
    if (!container) return;

    // Don't load if already loaded
    if (document.querySelector('script[src="https://zibal.ir/trust/scripts/zibal-trust-v4.js"]')) return;

    const script = document.createElement("script");
    script.src = "https://zibal.ir/trust/scripts/zibal-trust-v4.js";
    script.type = "text/javascript";
    container.appendChild(script);
  }, [paymentMethodValue]);

  // Load provinces and cities data for address display
  useEffect(() => {
    const loadLocationData = async () => {
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

    loadLocationData();
  }, [language]);

  useEffect(() => {
    if (provinces.length > 0 && savedAddresses.length > 0) {
      // Load all cities data
      const loadCities = async () => {
        try {
          const fileName = language === "fa" ? "cities-fa.json" : "cities-en.json";
          const response = await fetch(`/data/${fileName}`);
          if (response.ok) {
            const data = await response.json();
            setCities(data);
          }
        } catch (error) {
          console.error("Error loading cities:", error);
        }
      };

      loadCities();
    }
  }, [provinces, savedAddresses, language]);

  // Load saved addresses for authenticated users
  useEffect(() => {
    const loadAddresses = async () => {
      if (sessionStatus === "authenticated" && session) {
        setIsLoadingAddresses(true);
        try {
          const response = await fetch("/api/user/addresses");
          if (response.ok) {
            const data = await response.json();
            setSavedAddresses(data.addresses || []);

            // Prefill with default address if available
            const defaultAddress = data.addresses?.find((addr: any) => addr.isDefault);
            if (defaultAddress) {
              setProvinceId(defaultAddress.provinceId);
              setCityId(defaultAddress.cityId);
              setValue("address", defaultAddress.address);
              setValue("provinceId", defaultAddress.provinceId);
              setValue("cityId", defaultAddress.cityId);
              setSelectedAddressId(defaultAddress.id);
            }
          }
        } catch (error) {
          console.error("Error loading addresses:", error);
        } finally {
          setIsLoadingAddresses(false);
        }
      }
    };

    loadAddresses();
  }, [sessionStatus, session, setValue]);

  // Load user profile for authenticated users
  useEffect(() => {
    const loadUserProfile = async () => {
      if (sessionStatus === "authenticated" && session) {
        setIsLoadingProfile(true);
        try {
          const response = await fetch("/api/user/profile");
          if (response.ok) {
            const data = await response.json();
            setUserProfile(data);
          }
        } catch (error) {
          console.error("Error loading user profile:", error);
        } finally {
          setIsLoadingProfile(false);
        }
      }
    };

    loadUserProfile();
  }, [sessionStatus, session]);

  // Handle address selection
  useEffect(() => {
    if (selectedAddressId && savedAddresses.length > 0) {
      const selectedAddress = savedAddresses.find((addr) => addr.id === selectedAddressId);
      if (selectedAddress) {
        setProvinceId(selectedAddress.provinceId);
        setCityId(selectedAddress.cityId);
        setValue("address", selectedAddress.address);
        setValue("provinceId", selectedAddress.provinceId);
        setValue("cityId", selectedAddress.cityId);
        setShowNewAddressForm(false);
      }
    }
  }, [selectedAddressId, savedAddresses, setValue]);

  // Watch province and city for form validation
  useEffect(() => {
    if (provinceId) {
      setValue("provinceId", provinceId, { shouldValidate: true });
    }
  }, [provinceId, setValue]);

  useEffect(() => {
    if (cityId) {
      setValue("cityId", cityId, { shouldValidate: true });
    }
  }, [cityId, setValue]);

  // Create a stable key from selected items to use as dependency
  const selectedItemsKey = useMemo(() => {
    return selectedItemsList.map(item => `${item.productId}:${item.quantity}`).join(',');
  }, [selectedItemsList]);

  // Calculate shipping cost when province or city changes
  useEffect(() => {
    const calculateShipping = async () => {
      if (!provinceId || selectedItemsList.length === 0) {
        setShippingCost(null);
        setShippingMethods([]);
        return;
      }

      setIsLoadingShipping(true);
      try {
        const orderItems = selectedItemsList.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        }));

        const userId = session?.user?.id || null;

        const response = await fetch("/api/shipping/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provinceId,
            cityId: cityId || null,
            items: orderItems,
            userId,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const calculatedCost = parseFloat(data.shippingCost);
          setShippingCost(calculatedCost);
          setOriginalShippingCost(calculatedCost); // Store original cost for Iranian Post

          // Use available methods from API response
          if (data.availableMethods && Array.isArray(data.availableMethods)) {
            setShippingMethods(data.availableMethods);
            // Set default method if not already selected or if selected method is not available
            if (!selectedShippingMethod || !data.availableMethods.find((m: any) => m.value === selectedShippingMethod)) {
              setSelectedShippingMethod(data.defaultMethod || "iranian_post");
            }
          } else {
            setShippingMethods([]);
          }

          // Store admin settings for comparison
          if (data.adminProvince !== undefined && data.adminCity !== undefined) {
            setAdminShippingSettings({
              adminProvince: data.adminProvince,
              adminCity: data.adminCity,
            });
          }
        } else {
          setShippingCost(null);
          setOriginalShippingCost(null);
          setAdminShippingSettings(null);
          setShippingMethods([]);
        }
      } catch (error) {
        console.error("Error calculating shipping:", error);
        setShippingCost(null);
        setShippingMethods([]);
      } finally {
        setIsLoadingShipping(false);
      }
    };

    calculateShipping();
  }, [provinceId, cityId, selectedItemsKey, session?.user?.id]);

  // Update shipping cost when method changes
  useEffect(() => {
    if (selectedShippingMethod === "courier") {
      // Courier: shipping cost is 0 (customer pays courier directly)
      setShippingCost(0);
    } else if (selectedShippingMethod === "iranian_post" && originalShippingCost !== null) {
      // Iranian Post: restore original shipping cost
      setShippingCost(originalShippingCost);
    }
  }, [selectedShippingMethod, originalShippingCost]);

  // If user is logged in, redirect to registered checkout (or show registered form)
  // For now, we'll show guest checkout option for both
  const handleGuestCheckout = () => {
    setIsGuestCheckout(true);
    setCurrentStep("shipping");
  };

  // Calculate totals for selected items only
  const subtotalPrice = selectedItemsList.reduce((total, item) => {
    const price = parseFloat(item.price) || 0;
    return total + price * item.quantity;
  }, 0);
  const discountAmount = appliedDiscount?.amount || 0;
  const totalPrice = subtotalPrice + (shippingCost || 0) - discountAmount;
  const paymentMethodOptions: SelectOption[] = paymentMethods.map((method) => ({
    value: method.value,
    label: language === "fa" ? method.labelFa : method.label,
  }));

  // Check if user meets requirements for placing order
  const canPlaceOrder = () => {
    if (!isAuthenticated) return true; // Guest checkout doesn't have these requirements

    // Check full name
    const hasFullName = userProfile?.name && userProfile?.surname;

    // Check verified phone
    const hasVerifiedPhone = userProfile?.phoneVerified;

    // Check full address - either selected saved address or form filled
    const hasFullAddress =
      (selectedAddressId && savedAddresses.length > 0) ||
      (provinceId && cityId && watch("address"));

    return hasFullName && hasVerifiedPhone && hasFullAddress;
  };

  // Progress tracking: infer current step from form completion
  useEffect(() => {
    if (selectedItemsList.length === 0) {
      setCurrentStep("cart");
      return;
    }

    if (!isAuthenticated && !isGuestCheckout) {
      setCurrentStep("account");
      return;
    }

    if (!provinceId || !cityId || !watch("address")) {
      setCurrentStep("shipping");
      return;
    }

    if (!watch("paymentMethod")) {
      setCurrentStep("payment");
      return;
    }

    setCurrentStep("payment");
  }, [selectedItemsList.length, provinceId, cityId, watch, isAuthenticated, isGuestCheckout]);

  const handleStepClick = (step: CheckoutStep) => {
    const order: CheckoutStep[] = (!isAuthenticated ? ["cart", "account", "shipping", "payment", "complete"] : ["cart", "shipping", "payment", "complete"]);
    const currentIndex = order.indexOf(currentStep);
    const targetIndex = order.indexOf(step);

    if (targetIndex !== -1 && targetIndex <= currentIndex) {
      setCurrentStep(step);
    }
  };

  // Check if all mandatory form fields are filled
  const areAllMandatoryFieldsFilled = () => {
    const paymentMethodValue = watch("paymentMethod");

    if (!paymentMethodValue) {
      return false;
    }

    if (isAuthenticated) {
      // For authenticated users: check canPlaceOrder() (name, phone, basic address)
      if (!canPlaceOrder()) {
        return false;
      }

      // If using saved address, we're good (canPlaceOrder already validated it)
      if (selectedAddressId && savedAddresses.length > 0) {
        return true;
      }

      // If using new address form, also check postal code
      if (showNewAddressForm || savedAddresses.length === 0) {
        return !!(newAddressPostalCode && newAddressPostalCode.length === 10);
      }

      return false;
    } else {
      // For guest users: check all required fields
      const guestNameValue = watch("guestName");
      const guestPhoneValue = watch("guestPhone");
      const addressValue = watch("address");
      const postalCodeValue = watch("postalCode");

      return !!(
        guestNameValue &&
        guestPhoneValue &&
        provinceId &&
        cityId &&
        addressValue &&
        postalCodeValue &&
        postalCodeValue.length === 10
      );
    }
  };

  const orderRequirements = {
    hasFullName: userProfile?.name && userProfile?.surname,
    hasVerifiedPhone: userProfile?.phoneVerified,
    hasFullAddress: Boolean((selectedAddressId && savedAddresses.length > 0) || (provinceId && cityId && watch("address"))),
  };

  // Handle discount code application
  const handleApplyDiscountCode = async () => {
    if (!discountCode.trim()) {
      toast.error(t("Please enter a discount code", "لطفاً کد تخفیف را وارد کنید"));
      return;
    }

    if (!csrfToken) {
      toast.error(t("Security token not loaded. Please refresh the page.", "توکن امنیتی بارگذاری نشده است. لطفاً صفحه را رفرش کنید."));
      return;
    }

    setIsValidatingDiscount(true);
    try {
      const response = await fetch("/api/discount-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: discountCode.trim(),
          cartTotal: subtotalPrice,
          shippingCost: shippingCost || 0,
          csrfToken,
        }),
      });

      const result = await response.json();

      // If result is missing or malformed, show a toast and log error
      if (!result || typeof result !== 'object') {
        toast.error(t("Order API response was empty or malformed", "پاسخ سفارش نامعتبر بود"));
        setIsLoading(false);
        return;
      }

      if (!result.valid) {
        toast.error(t(result.message || "Invalid discount code", result.messageFa || "کد تخفیف نامعتبر است"));
        setAppliedDiscount(null);
        return;
      }

      setAppliedDiscount({
        code: discountCode.trim(),
        codeId: result.codeId,
        amount: result.discount_amount || 0,
        type: result.discount_type,
      });
      toast.success(t(result.message || "Discount code applied", result.message || "کد تخفیف اعمال شد"));
    } catch (error) {
      console.error("Error validating discount code:", error);
      toast.error(t("Failed to validate discount code", "خطا در اعتبارسنجی کد تخفیف"));
      setAppliedDiscount(null);
    } finally {
      setIsValidatingDiscount(false);
    }
  };

  // Handle discount code removal
  const handleRemoveDiscountCode = () => {
    setDiscountCode("");
    setAppliedDiscount(null);
    toast.success(t("Discount code removed", "کد تخفیف حذف شد"));
  };

  const missingRequirements = [];
  if (!orderRequirements.hasFullName) {
    missingRequirements.push(t("Full name (name and surname)", "نام کامل (نام و نام خانوادگی)"));
  }
  if (!orderRequirements.hasVerifiedPhone) {
    missingRequirements.push(t("Verified phone number", "شماره تلفن تایید شده"));
  }
  if (!orderRequirements.hasFullAddress) {
    missingRequirements.push(t("Complete shipping address", "آدرس کامل ارسال"));
  }

  // Get missing checkout requirements for the button warning (works for both guest and authenticated)
  const getMissingCheckoutRequirements = () => {
    const missing: string[] = [];

    // Check payment method
    if (!watch("paymentMethod")) {
      missing.push(t("Payment Method", "روش پرداخت"));
    }

    // Check shipping method
    if (!selectedShippingMethod) {
      missing.push(t("Shipping Method", "روش ارسال"));
    }

    // Check address (for both guest and authenticated)
    if (isAuthenticated) {
      if (!orderRequirements.hasFullAddress) {
        missing.push(t("Shipping Address", "آدرس ارسال"));
      }
    } else {
      // Guest users
      if (!provinceId || !cityId || !watch("address")) {
        missing.push(t("Shipping Address", "آدرس ارسال"));
      }
    }

    return missing;
  };

  const missingCheckoutRequirements = useMemo(() => getMissingCheckoutRequirements(), [
    watch("paymentMethod"),
    selectedShippingMethod,
    isAuthenticated,
    orderRequirements.hasFullAddress,
    provinceId,
    cityId,
    watch("address"),
  ]);

  const onSubmit = async (data: GuestCheckoutFormData) => {
    // Bot detection: Check honeypot fields
    if (honeypotWebsite !== "" || honeypotCompany !== "") {
      // Silent fail - don't reveal honeypot detection
      console.warn("Bot detected via honeypot fields");
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing
      setIsLoading(false);
      return;
    }

    if (selectedItemIds.length === 0) {
      toast.error(t("Please select items to checkout", "لطفاً آیتم‌هایی را برای تسویه حساب انتخاب کنید"));
      return;
    }

    if (!csrfToken) {
      toast.error(t("Security token not loaded. Please refresh the page.", "توکن امنیتی بارگذاری نشده است. لطفاً صفحه را رفرش کنید."));
      return;
    }

    // Validate session before order submission
    // If user was authenticated but session expired, prevent order creation
    if (wasAuthenticated && (sessionStatus === "unauthenticated" || !session)) {
      toast.error(
        t(
          "Your session has expired. Please log in again to complete your order.",
          "جلسه شما منقضی شده است. لطفاً دوباره وارد شوید تا سفارش خود را تکمیل کنید."
        ),
        { duration: 5000 }
      );
      setIsLoading(false);
      // Redirect to login with return URL
      router.push(`/login?callbackUrl=${encodeURIComponent("/checkout")}`);
      return;
    }

    setIsLoading(true);
    try {
      // First, validate selected items
      const validationBody: any = {
        cartItemIds: selectedItemIds,
        csrfToken,
      };

      // For guests, send full items for validation
      if (!isAuthenticated) {
        validationBody.guestItems = selectedItemsList;
      }

      // --- Guest session ID logic ---
      let sessionId = null;
      if (!isAuthenticated) {
        sessionId = typeof window !== 'undefined' && localStorage.getItem('guestSessionId');
        if (!sessionId && typeof window !== 'undefined') {
          sessionId = crypto.randomUUID();
          localStorage.setItem('guestSessionId', sessionId);
        }
      }
      const validationResponse = await fetch("/api/checkout/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionId ? { 'x-session-id': sessionId } : {}),
        },
        body: JSON.stringify(validationBody),
      });

      const validationResult = await validationResponse.json();

      if (!validationResponse.ok) {
        toast.error(t(validationResult.error || "Validation failed", validationResult.error || "خطا در اعتبارسنجی"));
        setIsLoading(false);
        return;
      }

      // If validation found changes, show them to user
      if (!validationResult.valid) {
        // TODO: Show modal/dialog with changes
        toast.error(
          t(
            "Some items have changed. Please review your cart.",
            "برخی از آیتم‌ها تغییر کرده‌اند. لطفاً سبد خرید خود را بررسی کنید."
          )
        );
        setIsLoading(false);
        // Reload cart to reflect changes
        // This would ideally show a modal with the changes
        return;
      }

      // Use validated items
      const validatedItems = validationResult.items;
      const orderItems = validatedItems.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      const requestBody: any = {
        items: orderItems,
        total: totalPrice.toString(),
        subtotal: subtotalPrice.toString(),
        shippingCost: shippingCost !== null ? shippingCost.toString() : "0",
        shippingMethod: selectedShippingMethod,
        paymentMethod: data.paymentMethod,
        invoiceRequested,
        csrfToken,
      };

      // Add discount code if applied
      if (appliedDiscount) {
        requestBody.discountCode = appliedDiscount.code;
        requestBody.discountCodeId = appliedDiscount.codeId;
        requestBody.discountAmount = appliedDiscount.amount.toString();
      }

      // Add guest info only if not logged in
      if (!isAuthenticated) {
        requestBody.guestName = data.guestName;
        requestBody.guestEmail = data.guestEmail;
        requestBody.guestPhone = data.guestPhone;
        requestBody.provinceId = data.provinceId;
        requestBody.cityId = data.cityId;
        requestBody.address = data.address;
        requestBody.postalCode = data.postalCode;

        if (createAccountAfterPurchase) {
          requestBody.createAccount = true;
        }
      } else {
        // For registered users, use selected address or form data
        if (selectedAddressId && savedAddresses.length > 0) {
          const selectedAddress = savedAddresses.find((addr) => addr.id === selectedAddressId);
          if (selectedAddress) {
            requestBody.provinceId = selectedAddress.provinceId;
            requestBody.cityId = selectedAddress.cityId;
            requestBody.address = selectedAddress.address;
          } else {
            // Fallback to form data
            requestBody.provinceId = data.provinceId;
            requestBody.cityId = data.cityId;
            requestBody.address = data.address;
          }
        } else {
          // Use form data
          requestBody.provinceId = data.provinceId;
          requestBody.cityId = data.cityId;
          requestBody.address = data.address;
        }
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.errorFa && language === "fa" ? result.errorFa : (result.error || t("Failed to create order", "خطا در ایجاد سفارش"));
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      // Set flag BEFORE clearing cart to prevent auto-redirect
      if (result.order && result.order.orderNumber) {
        isNavigatingAfterOrderRef.current = true;

        // For online payment, redirect to Zibal gateway
        if (data.paymentMethod === "online_payment") {
          try {
            const paymentResponse = await fetch("/api/payment/zibal/request", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: result.order.id }),
            });

            const paymentData = await paymentResponse.json();

            if (paymentResponse.ok && paymentData.paymentUrl) {
              toast.success(t("Order placed successfully! Redirecting to payment...", "سفارش ثبت شد! در حال انتقال به درگاه پرداخت..."));
              setTimeout(() => { clearCart(); }, 0);
              window.location.href = paymentData.paymentUrl;
              return;
            } else {
              toast.error(t("Payment gateway error. Please try again.", "خطا در درگاه پرداخت. لطفاً دوباره تلاش کنید."));
              setIsLoading(false);
              return;
            }
          } catch (paymentError) {
            console.error("Payment gateway error:", paymentError);
            toast.error(t("Payment gateway error. Please try again.", "خطا در درگاه پرداخت. لطفاً دوباره تلاش کنید."));
            setIsLoading(false);
            return;
          }
        }

        const successUrl = `/checkout/success?orderNumber=${result.order.orderNumber}`;

        // Navigate IMMEDIATELY without waiting for cart clear
        // This prevents any race conditions with the useEffect redirect
        router.push(successUrl);

        // Clear cart in background (non-blocking)
        setTimeout(() => {
          clearCart();
        }, 0);

        // Show success and redirect
      } else {
        toast.error(t("Order created but redirect failed", "سفارش ایجاد شد اما انتقال به صفحه موفقیت انجام نشد"));

        // Clear cart before fallback redirect
        await clearCart();
        router.push("/products");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while session or cart is loading
  if (cartLoading || sessionStatus === "loading") {
    return (
      <>
        <Navbar />
        <div className={styles.checkoutContainer}>
          <p>{t("Loading...", "در حال بارگذاری...")}</p>
        </div>
        <Footer />
        <BottomBar />
      </>
    );
  }

  if (items.length === 0) {
    return null; // Will redirect
  }

  return (
    <>
      <Navbar />
      <div className={styles.checkoutContainer}>
        <div className={styles.checkoutContent}>
          <h1 className={styles.title}>{t("Checkout", "تسویه حساب")}</h1>

          <CheckoutProgressBar currentStep={currentStep} onStepClick={handleStepClick} includeAccountStep={!isAuthenticated} />

          {/* Check authenticated users first */}
          {sessionStatus === "authenticated" && session ? (
            // Registered user checkout - for now, use same form as guest
            // TODO: Add saved addresses selection for registered users
            <>
              <div className={styles.checkoutForm}>
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className={styles.checkoutLayout}>
                    {/* Left Panel - Purchase Details */}
                    <div className={styles.leftPanel}>
                      {/* User Information Section for Registered Users */}
                      {isAuthenticated && (
                        <>
                          {/* Warning Banner if Requirements Not Met */}
                          {missingRequirements.length > 0 && (
                            <div className={styles.requirementsWarning}>
                              <h4 className={styles.warningTitle}>
                                {t("Please complete the following to place your order", "لطفاً موارد زیر را تکمیل کنید تا بتوانید سفارش خود را ثبت کنید")}:
                              </h4>
                              <ul className={styles.requirementsList}>
                                {missingRequirements.map((req, index) => (
                                  <li key={index}>{req}</li>
                                ))}
                              </ul>
                              <Link href="/dashboard?section=profile" className={styles.completeProfileButton}>
                                {t("Complete Profile", "تکمیل پروفایل")}
                              </Link>
                            </div>
                          )}

                          <div className={styles.userInfoSection}>
                            <h3 className={styles.userInfoTitle}>{t("Your Information", "اطلاعات شما")}</h3>
                            {isLoadingProfile ? (
                              <p>{t("Loading...", "در حال بارگذاری...")}</p>
                            ) : userProfile ? (
                              <div className={styles.userInfoGrid}>
                                <div className={styles.userInfoRow}>
                                  <span className={styles.userInfoLabel}>{t("Name", "نام")}:</span>
                                  <span className={styles.userInfoValue}>
                                    {userProfile.name} {userProfile.surname || ""}
                                    {!orderRequirements.hasFullName && (
                                      <span className={styles.missingIndicator}> *</span>
                                    )}
                                  </span>
                                </div>
                                <div className={styles.userInfoRow}>
                                  <span className={styles.userInfoLabel}>{t("Email", "ایمیل")}:</span>
                                  <span className={styles.userInfoValue}>{userProfile.email}</span>
                                </div>
                                <div className={styles.userInfoRow}>
                                  <span className={styles.userInfoLabel}>{t("Phone", "تلفن")}:</span>
                                  <span
                                    className={`${styles.userInfoValue} ${!userProfile.phoneVerified ? styles.unverifiedPhone : ""
                                      }`}
                                  >
                                    {userProfile.phone || t("Not provided", "ارائه نشده")}
                                    {!userProfile.phoneVerified && userProfile.phone && (
                                      <span className={styles.verificationBadge}>
                                        {" "}
                                        ({t("Not verified", "تایید نشده")})
                                      </span>
                                    )}
                                    {!orderRequirements.hasVerifiedPhone && (
                                      <span className={styles.missingIndicator}> *</span>
                                    )}
                                  </span>
                                  {!orderRequirements.hasVerifiedPhone && (
                                    <button
                                      onClick={() => setShowPhoneVerification(!showPhoneVerification)}
                                      className={styles.verifyPhoneButton}
                                    >
                                      {showPhoneVerification
                                        ? t("Hide Verification", "مخفی کردن تأیید")
                                        : t("Verify Phone Now", "تأیید تلفن")}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>

                          {/* Phone Verification Component */}
                          {showPhoneVerification && !orderRequirements.hasVerifiedPhone && userProfile && (
                            <div className={styles.phoneVerificationWrapper}>
                              <PhoneVerification
                                phone={userProfile.phone || null}
                                onVerified={async () => {
                                  // Refresh profile data
                                  try {
                                    const response = await fetch("/api/user/profile");
                                    if (response.ok) {
                                      const data = await response.json();
                                      setUserProfile(data);
                                      setShowPhoneVerification(false);
                                    }
                                  } catch (error) {
                                    console.error("Error refreshing profile:", error);
                                  }
                                }}
                                compact={true}
                              />
                            </div>
                          )}
                        </>
                      )}

                      {/* Shipping Address Section for Registered Users */}
                      <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>{t("Shipping Address", "آدرس ارسال")}</h2>

                        {isLoadingAddresses ? (
                          <p>{t("Loading addresses...", "در حال بارگذاری آدرس‌ها...")}</p>
                        ) : savedAddresses.length > 0 ? (
                          <>
                            <div className={styles.addressCards}>
                              {savedAddresses.map((addr) => {
                                const province = provinces.find((p) => p.id === addr.provinceId);
                                const city = cities.find((c) => c.id === addr.cityId);
                                const provinceName = province?.name || "";
                                const cityName = city?.name || "";
                                const isDefault = addr.isDefault;

                                const isSelected = selectedAddressId === addr.id;

                                return (
                                  <div
                                    key={addr.id}
                                    className={`${styles.addressCardWrapper} ${isSelected ? styles.addressCardWrapperSelected : ""
                                      }`}
                                  >
                                    <div
                                      className={`${styles.addressCard} ${isSelected ? styles.addressCardSelected : ""
                                        }`}
                                      onClick={() => {
                                        setSelectedAddressId(addr.id);
                                        setShowNewAddressForm(false);
                                      }}
                                    >
                                      <div className={styles.addressCardContent}>
                                        {provinceName && cityName ? (
                                          <p className={styles.addressText}>
                                            {provinceName} - {cityName} - {addr.address} - {addr.postalCode}
                                          </p>
                                        ) : (
                                          <p className={styles.addressText}>
                                            {addr.address} - {addr.postalCode}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <Link
                                      href="/dashboard?section=profile"
                                      className={styles.editAddressTab}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {t("Edit", "ویرایش")}
                                    </Link>
                                  </div>
                                );
                              })}
                            </div>

                            {!showNewAddressForm && (
                              <p className={styles.shipToAnotherText}>
                                {t("Do you want to ship to another address?", "آیا می‌خواهید به آدرس دیگری ارسال کنید؟")}
                                {" "}
                                <span
                                  className={styles.addNewAddressLink}
                                  onClick={() => {
                                    setShowNewAddressForm(true);
                                    setSelectedAddressId(null);
                                    setProvinceId(null);
                                    setCityId(null);
                                    setNewAddressName("");
                                    setNewAddressPostalCode("");
                                    setValue("address", "");
                                    setValue("postalCode", "");
                                  }}
                                >
                                  {t("Add New Address", "افزودن آدرس جدید")}
                                </span>
                              </p>
                            )}
                          </>
                        ) : null}

                        {(showNewAddressForm || savedAddresses.length === 0) && (
                          <div className={styles.newAddressForm}>
                            <h3 className={styles.newAddressTitle}>
                              {t("Add New Address", "افزودن آدرس جدید")}
                            </h3>

                            <Input
                              label={t("Address Name", "نام آدرس")}
                              value={newAddressName}
                              onChange={(e) => setNewAddressName(e.target.value)}
                              placeholder={t("e.g., Home, Office", "مثال: خانه، دفتر")}
                              error={!newAddressName && showNewAddressForm ? t("Address name is required", "نام آدرس الزامی است") : undefined}
                            />

                            <ProvinceCitySelector
                              provinceId={provinceId}
                              cityId={cityId}
                              onProvinceChange={setProvinceId}
                              onCityChange={setCityId}
                              error={errors.provinceId?.message || errors.cityId?.message}
                            />

                            <Input
                              label={t("Complete Address", "آدرس کامل")}
                              {...register("address")}
                              error={errors.address?.message}
                              placeholder={t("Enter your complete address", "آدرس کامل خود را وارد کنید")}
                            />

                            <Input
                              label={t("Postal Code", "کد پستی")}
                              type="text"
                              value={newAddressPostalCode}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                                setNewAddressPostalCode(value);
                                setValue("postalCode", value);
                              }}
                              placeholder={t("10-digit postal code", "کد پستی ۱۰ رقمی")}
                              error={
                                newAddressPostalCode && newAddressPostalCode.length !== 10
                                  ? t("Postal code must be 10 digits", "کد پستی باید ۱۰ رقمی باشد")
                                  : !newAddressPostalCode && showNewAddressForm
                                    ? t("Postal code is required", "کد پستی الزامی است")
                                    : undefined
                              }
                            />

                            <div className={styles.newAddressActions}>
                              <Button
                                type="button"
                                className={styles.saveAddressButton}
                                onClick={async () => {
                                  // Validate form
                                  if (!newAddressName.trim()) {
                                    toast.error(t("Address name is required", "نام آدرس الزامی است"));
                                    return;
                                  }
                                  if (!provinceId || !cityId) {
                                    toast.error(t("Province and city are required", "استان و شهر الزامی هستند"));
                                    return;
                                  }
                                  if (!watch("address")?.trim()) {
                                    toast.error(t("Address is required", "آدرس الزامی است"));
                                    return;
                                  }
                                  if (!newAddressPostalCode || newAddressPostalCode.length !== 10) {
                                    toast.error(t("Postal code must be 10 digits", "کد پستی باید ۱۰ رقمی باشد"));
                                    return;
                                  }

                                  setIsSavingAddress(true);
                                  try {
                                    const response = await fetch("/api/user/addresses", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        name: newAddressName.trim(),
                                        provinceId,
                                        cityId,
                                        address: watch("address").trim(),
                                        postalCode: newAddressPostalCode,
                                      }),
                                    });

                                    if (response.ok) {
                                      const data = await response.json();
                                      toast.success(t("Address added successfully", "آدرس با موفقیت اضافه شد"));

                                      // Reload addresses
                                      const addressesResponse = await fetch("/api/user/addresses");
                                      if (addressesResponse.ok) {
                                        const addressesData = await addressesResponse.json();
                                        setSavedAddresses(addressesData.addresses || []);

                                        // Auto-select the new address
                                        if (data.address) {
                                          setSelectedAddressId(data.address.id);
                                          setProvinceId(data.address.provinceId);
                                          setCityId(data.address.cityId);
                                          setValue("address", data.address.address);
                                          setValue("postalCode", data.address.postalCode);
                                          setValue("provinceId", data.address.provinceId);
                                          setValue("cityId", data.address.cityId);
                                        }
                                      }

                                      // Reset form
                                      setShowNewAddressForm(false);
                                      setNewAddressName("");
                                      setNewAddressPostalCode("");
                                    } else {
                                      const errorData = await response.json();
                                      toast.error(errorData.error || t("Failed to add address", "خطا در افزودن آدرس"));
                                    }
                                  } catch (error) {
                                    console.error("Error adding address:", error);
                                    toast.error(t("An error occurred", "خطایی رخ داد"));
                                  } finally {
                                    setIsSavingAddress(false);
                                  }
                                }}
                                disabled={isSavingAddress}
                                variant="primary"
                              >
                                {isSavingAddress ? t("Saving...", "در حال ذخیره...") : t("Save Address", "ذخیره آدرس")}
                              </Button>

                              {savedAddresses.length > 0 && (
                                <Button
                                  type="button"
                                  className={styles.cancelAddressButton}
                                  onClick={() => {
                                    setShowNewAddressForm(false);
                                    setNewAddressName("");
                                    setNewAddressPostalCode("");
                                    setProvinceId(null);
                                    setCityId(null);
                                    setValue("address", "");
                                    setValue("postalCode", "");
                                  }}
                                  variant="outline"
                                  disabled={isSavingAddress}
                                >
                                  {t("Cancel", "لغو")}
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Payment Method Section */}
                      <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>{t("Payment Method", "روش پرداخت")}</h2>
                        {isLoadingPaymentMethods ? (
                          <p>{t("Loading payment methods...", "در حال بارگذاری روش‌های پرداخت...")}</p>
                        ) : paymentMethods.length === 0 ? (
                          <p className={styles.error}>{t("No payment methods available", "روش پرداختی در دسترس نیست")}</p>
                        ) : (
                          <div className={styles.paymentMethodCards}>
                            {paymentMethods.map((method) => {
                              const displayLabel = language === "fa" ? method.labelFa : method.label;
                              const isSelected = watch("paymentMethod") === method.value;

                              return (
                                <div
                                  key={method.value}
                                  className={`${styles.paymentMethodCard} ${isSelected ? styles.paymentMethodCardSelected : ""
                                    }`}
                                  onClick={() => {
                                    setValue("paymentMethod", method.value, { shouldValidate: true });
                                  }}
                                >
                                  <div className={styles.paymentMethodCardContent}>
                                    <p className={styles.paymentMethodText}>{displayLabel}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {errors.paymentMethod && (
                          <p className={styles.error}>{errors.paymentMethod.message}</p>
                        )}
                        {watch("paymentMethod") === "online_payment" && (
                          <div style={{ marginTop: "1rem" }}>
                            <div id="zibal" />
                          </div>
                        )}
                      </div>

                      {/* Shipping Method Section */}
                      <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>{t("Shipping Method", "روش ارسال")}</h2>
                        {isLoadingShipping ? (
                          <p>{t("Calculating shipping...", "در حال محاسبه هزینه ارسال...")}</p>
                        ) : shippingCost === null ? (
                          <p className={styles.error}>{t("Please select address first", "لطفاً ابتدا آدرس را انتخاب کنید")}</p>
                        ) : (
                          <div className={styles.paymentMethodCards}>
                            {/* Iranian Post - Always available */}
                            <div
                              className={`${styles.paymentMethodCard} ${selectedShippingMethod === "iranian_post" ? styles.paymentMethodCardSelected : ""
                                }`}
                              onClick={() => {
                                setSelectedShippingMethod("iranian_post");
                              }}
                            >
                              <div className={styles.paymentMethodCardContent}>
                                <FiPackage
                                  style={{
                                    fontSize: "24px",
                                    color: "#367260",
                                    flexShrink: 0
                                  }}
                                />
                                <p className={styles.paymentMethodText}>
                                  {language === "fa" ? "پست ایران" : "Iranian Post"}
                                </p>
                              </div>
                            </div>

                            {/* Send by Courier - Conditionally enabled */}
                            {(() => {
                              // Check if courier is available in the shipping methods from API
                              const courierMethod = shippingMethods.find(m => m.value === "courier");
                              const isCourierEnabled = !!courierMethod;

                              return (
                                <div
                                  className={`${styles.paymentMethodCard} ${selectedShippingMethod === "courier" ? styles.paymentMethodCardSelected : ""
                                    } ${!isCourierEnabled ? styles.disabled : ""}`}
                                  onClick={() => {
                                    if (isCourierEnabled) {
                                      setSelectedShippingMethod("courier");
                                    }
                                  }}
                                  style={{
                                    opacity: isCourierEnabled ? 1 : 0.5,
                                    cursor: isCourierEnabled ? "pointer" : "not-allowed",
                                  }}
                                  title={!isCourierEnabled ? (language === "fa" ? "فقط برای شهر ادمین در دسترس است" : "Only available for admin's city") : ""}
                                >
                                  <div className={styles.paymentMethodCardContent}>
                                    <FiTruck
                                      style={{
                                        fontSize: "24px",
                                        color: "#367260",
                                        flexShrink: 0
                                      }}
                                    />
                                    <p className={styles.paymentMethodText}>
                                      {language === "fa"
                                        ? (
                                          <>
                                            ارسال با پیک{" "}
                                            <span style={{ fontSize: "0.85em", color: "#999", fontWeight: "normal" }}>
                                              (پرداخت هزینه ارسال با پیک بر عهده خریدار است)
                                            </span>
                                          </>
                                        )
                                        : (
                                          <>
                                            Send by Courier{" "}
                                            <span style={{ fontSize: "0.85em", color: "#999", fontWeight: "normal" }}>
                                              (Courier fees are payable by the customer)
                                            </span>
                                          </>
                                        )}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        <p className={styles.shippingMethodNote}>
                          {t(
                            "After placing your order, it takes up to 10 working days to prepare the items and hand them over to the shipping company.",
                            "پس از ثبت سفارش، تا ۱۰ روز کاری برای آماده‌سازی کالا و تحویل آن به شرکت حمل نیاز است."
                          )}
                        </p>
                      </div>

                    </div>

                    {/* Right Panel - Price Summary & Actions */}
                    <div className={styles.rightPanel}>
                      <OrderSummary
                        items={selectedItemsList.map((item) => ({
                          productId: item.productId,
                          name: item.name,
                          nameFa: item.nameFa,
                          quantity: item.quantity,
                          price: item.price,
                          image: item.image,
                        }))}
                        subtotal={subtotalPrice}
                        shippingCost={shippingCost}
                        discountAmount={discountAmount}
                        total={totalPrice}
                        isSticky={true}
                        isMobileCollapsible={true}
                        hasAddress={orderRequirements.hasFullAddress}
                      />

                      <div className={styles.discountCodeCard}>
                        <h3 className={styles.discountTitle}>
                          {t("Have a discount code?", "کد تخفیف دارید؟")}
                        </h3>
                        <div className={styles.discountInputGroup}>
                          <Input
                            placeholder={t("Enter discount code", "کد تخفیف را وارد کنید")}
                            value={discountCode}
                            onChange={(e) => setDiscountCode(e.target.value)}
                            disabled={!!appliedDiscount}
                          />
                          {appliedDiscount ? (
                            <Button type="button" variant="outline" onClick={handleRemoveDiscountCode}>
                              {t("Remove", "حذف")}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="primary"
                              onClick={handleApplyDiscountCode}
                              disabled={isValidatingDiscount || !discountCode.trim()}
                            >
                              {isValidatingDiscount
                                ? t("Validating...", "بررسی")
                                : t("Apply", "اعمال")}
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className={styles.invoiceSection}>
                        <label className={styles.checkboxLabel}>
                          <span className={styles.checkboxText}>{t("I Need Invoice for this Order", "من به فاکتور این سفارش نیاز دارم")}</span>
                          <input
                            type="checkbox"
                            className={styles.customCheckbox}
                            checked={invoiceRequested}
                            onChange={(e) => setInvoiceRequested(e.target.checked)}
                          />
                          <span className={styles.checkboxCustom}></span>
                        </label>
                      </div>

                      <div className={styles.checkoutActions}>
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={isLoading || paymentMethods.length === 0 || !areAllMandatoryFieldsFilled()}
                          className={styles.submitButton}
                        >
                          {isLoading
                            ? t("Processing...", "در حال پردازش...")
                            : t("Place Order", "ثبت سفارش")}
                        </Button>
                        <BackButton
                          href="/products"
                          label={t("Back to Shop", "بازگشت به فروشگاه")}
                          variant="outlined"
                        />
                        {/* Show missing requirements warning under button */}
                        {missingCheckoutRequirements.length > 0 && (
                          <div className={styles.missingRequirementsWarning}>
                            <span className={styles.missingRequirementsText}>
                              {t("You must select a ", "شما باید یک ")}
                              <strong>{missingCheckoutRequirements.join(t(" or ", " یا ") as string)}</strong>
                              {t(" to proceed", " برای ادامه انتخاب کنید")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </>
          ) : sessionStatus === "unauthenticated" && !isGuestCheckout ? (
            <>
              <div className={styles.checkoutOptions}>
                <div className={styles.optionRow}>
                  <div className={styles.optionCard}>
                    <h2>{t("Already have an account?", "حساب کاربری دارید؟")}</h2>
                    <p>{t("Sign in to your account for faster checkout and order tracking", "برای تسویه حساب سریع‌تر و ردیابی سفارش وارد حساب خود شوید")}</p>
                    <Link href="/login" className={styles.signInButton}>
                      {t("Sign In", "ورود")}
                    </Link>
                  </div>

                  <div className={styles.optionDivider}>
                    <span className={styles.dividerLineVertical} />
                  </div>

                  <div className={styles.optionCard}>
                    <h2>{t("Continue as Guest", "ادامه به عنوان مهمان")}</h2>
                    <p>{t("Checkout quickly without creating an account", "بدون ایجاد حساب کاربری خرید کنید")}</p>
                    <button onClick={handleGuestCheckout} className={styles.guestButton}>
                      {t("Continue as Guest", "ادامه به عنوان مهمان")}
                    </button>
                  </div>
                </div>

                <div className={styles.googleCta}>
                  <span className={styles.googleCtaLabel}>{t("You can also", "همچنین می‌توانید")}</span>
                  <div className={styles.googleSignInWrapper}>
                    <GoogleSignInButton redirectUrl="/checkout" size="large" />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.checkoutForm}>
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className={styles.checkoutLayout}>
                    {/* Left Panel - Purchase Details */}
                    <div className={styles.leftPanel}>
                      {/* Guest Information Section */}
                      {sessionStatus === "unauthenticated" && (
                        <div className={styles.section}>
                          <h2 className={styles.sectionTitle}>{t("Contact Information", "اطلاعات تماس")}</h2>
                          <Input
                            label={t("Full Name", "نام کامل")}
                            {...register("guestName")}
                            error={errors.guestName?.message}
                            placeholder={t("Enter your full name", "نام کامل خود را وارد کنید")}
                          />
                          <Input
                            type="email"
                            label={t("Email Address (Optional)", "آدرس ایمیل (اختیاری)")}
                            {...register("guestEmail")}
                            error={errors.guestEmail?.message}
                            placeholder={t("Optional", "اختیاری")}
                          />
                          <Input
                            type="tel"
                            label={t("Phone Number", "شماره تلفن")}
                            {...register("guestPhone")}
                            error={errors.guestPhone?.message}
                            placeholder={t("09XXXXXXXXX", "09XXXXXXXXX")}
                          />

                          <div className={styles.createAccountSection}>
                            <label className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                className={styles.customCheckbox}
                                checked={createAccountAfterPurchase}
                                onChange={(e) => setCreateAccountAfterPurchase(e.target.checked)}
                              />
                              <span className={styles.checkboxCustom}></span>
                              <span className={styles.checkboxText}>
                                {t(
                                  "Create an account with this information to track orders and earn rewards",
                                  "با این اطلاعات حساب کاربری ایجاد کنید تا سفارشات را ردیابی و امتیاز کسب کنید"
                                )}
                              </span>
                            </label>
                            {createAccountAfterPurchase && (
                              <p className={styles.createAccountNote}>
                                {t(
                                  "A password will be sent to your email after purchase.",
                                  "پس از خرید، رمز عبور به ایمیل شما ارسال خواهد شد."
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Shipping Address Section */}
                      {!isAuthenticated && (
                        <div className={styles.section}>
                          <h2 className={styles.sectionTitle}>{t("Shipping Address", "آدرس ارسال")}</h2>
                          <ProvinceCitySelector
                            provinceId={provinceId}
                            cityId={cityId}
                            onProvinceChange={setProvinceId}
                            onCityChange={setCityId}
                            error={errors.provinceId?.message || errors.cityId?.message}
                          />
                          <Input
                            label={t("Complete Address", "آدرس کامل")}
                            {...register("address")}
                            error={errors.address?.message}
                            placeholder={t("Enter your complete address", "آدرس کامل خود را وارد کنید")}
                          />
                          <Input
                            label={t("Postal Code", "کد پستی")}
                            type="text"
                            {...register("postalCode")}
                            error={errors.postalCode?.message}
                            placeholder={t("10-digit postal code", "کد پستی ۱۰ رقمی")}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                              setValue("postalCode", value);
                            }}
                          />
                        </div>
                      )}

                      {/* Payment Method Section */}
                      <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>{t("Payment Method", "روش پرداخت")}</h2>
                        {isLoadingPaymentMethods ? (
                          <p>{t("Loading payment methods...", "در حال بارگذاری روش‌های پرداخت...")}</p>
                        ) : paymentMethods.length === 0 ? (
                          <p className={styles.error}>{t("No payment methods available", "روش پرداختی در دسترس نیست")}</p>
                        ) : (
                          <div className={styles.paymentMethodCards}>
                            {paymentMethods.map((method) => {
                              const displayLabel = language === "fa" ? method.labelFa : method.label;
                              const isSelected = watch("paymentMethod") === method.value;

                              return (
                                <div
                                  key={method.value}
                                  className={`${styles.paymentMethodCard} ${isSelected ? styles.paymentMethodCardSelected : ""
                                    }`}
                                  onClick={() => {
                                    setValue("paymentMethod", method.value, { shouldValidate: true });
                                  }}
                                >
                                  <div className={styles.paymentMethodCardContent}>
                                    <p className={styles.paymentMethodText}>{displayLabel}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {errors.paymentMethod && (
                          <p className={styles.error}>{errors.paymentMethod.message}</p>
                        )}
                        {watch("paymentMethod") === "online_payment" && (
                          <div style={{ marginTop: "1rem" }}>
                            <div id="zibal" />
                          </div>
                        )}
                      </div>

                      {/* Shipping Method Section */}
                      <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>{t("Shipping Method", "روش ارسال")}</h2>
                        {isLoadingShipping ? (
                          <p>{t("Calculating shipping...", "در حال محاسبه هزینه ارسال...")}</p>
                        ) : shippingCost === null ? (
                          <p className={styles.error}>{t("Please select address first", "لطفاً ابتدا آدرس را انتخاب کنید")}</p>
                        ) : (
                          <div className={styles.paymentMethodCards}>
                            {/* Iranian Post - Always available */}
                            <div
                              className={`${styles.paymentMethodCard} ${selectedShippingMethod === "iranian_post" ? styles.paymentMethodCardSelected : ""
                                }`}
                              onClick={() => {
                                setSelectedShippingMethod("iranian_post");
                              }}
                            >
                              <div className={styles.paymentMethodCardContent}>
                                <FiPackage
                                  style={{
                                    fontSize: "24px",
                                    color: "#367260",
                                    flexShrink: 0
                                  }}
                                />
                                <p className={styles.paymentMethodText}>
                                  {language === "fa" ? "پست ایران" : "Iranian Post"}
                                </p>
                              </div>
                            </div>

                            {/* Send by Courier - Conditionally enabled */}
                            {(() => {
                              // Check if courier is available in the shipping methods from API
                              const courierMethod = shippingMethods.find(m => m.value === "courier");
                              const isCourierEnabled = !!courierMethod;

                              return (
                                <div
                                  className={`${styles.paymentMethodCard} ${selectedShippingMethod === "courier" ? styles.paymentMethodCardSelected : ""
                                    } ${!isCourierEnabled ? styles.disabled : ""}`}
                                  onClick={() => {
                                    if (isCourierEnabled) {
                                      setSelectedShippingMethod("courier");
                                    }
                                  }}
                                  style={{
                                    opacity: isCourierEnabled ? 1 : 0.5,
                                    cursor: isCourierEnabled ? "pointer" : "not-allowed",
                                  }}
                                  title={!isCourierEnabled ? (language === "fa" ? "فقط برای شهر ادمین در دسترس است" : "Only available for admin's city") : ""}
                                >
                                  <div className={styles.paymentMethodCardContent}>
                                    <FiTruck
                                      style={{
                                        fontSize: "24px",
                                        color: "#367260",
                                        flexShrink: 0
                                      }}
                                    />
                                    <p className={styles.paymentMethodText}>
                                      {language === "fa"
                                        ? (
                                          <>
                                            ارسال با پیک{" "}
                                            <span style={{ fontSize: "0.85em", color: "#999", fontWeight: "normal" }}>
                                              (پرداخت هزینه ارسال با پیک بر عهده خریدار است)
                                            </span>
                                          </>
                                        )
                                        : (
                                          <>
                                            Send by Courier{" "}
                                            <span style={{ fontSize: "0.85em", color: "#999", fontWeight: "normal" }}>
                                              (Courier fees are payable by the customer)
                                            </span>
                                          </>
                                        )}
                                    </p>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        <p className={styles.shippingMethodNote}>
                          {t(
                            "After placing your order, it takes up to 10 working days to prepare the items and hand them over to the shipping company.",
                            "پس از ثبت سفارش، تا ۱۰ روز کاری برای آماده‌سازی کالا و تحویل آن به شرکت حمل نیاز است."
                          )}
                        </p>
                      </div>

                    </div>

                    {/* Right Panel - Price Summary & Actions */}
                    <div className={styles.rightPanel}>
                      <OrderSummary
                        items={selectedItemsList.map((item) => ({
                          productId: item.productId,
                          name: item.name,
                          nameFa: item.nameFa,
                          quantity: item.quantity,
                          price: item.price,
                          image: item.image,
                        }))}
                        subtotal={subtotalPrice}
                        shippingCost={shippingCost}
                        discountAmount={discountAmount}
                        total={totalPrice}
                        isSticky={true}
                        isMobileCollapsible={true}
                        hasAddress={orderRequirements.hasFullAddress}
                      />

                      <div className={styles.discountCodeCard}>
                        <h3 className={styles.discountTitle}>
                          {t("Have a discount code?", "کد تخفیف دارید؟")}
                        </h3>
                        <div className={styles.discountInputGroup}>
                          <Input
                            placeholder={t("Enter discount code", "کد تخفیف را وارد کنید")}
                            value={discountCode}
                            onChange={(e) => setDiscountCode(e.target.value)}
                            disabled={!!appliedDiscount}
                          />
                          {appliedDiscount ? (
                            <Button type="button" variant="outline" onClick={handleRemoveDiscountCode}>
                              {t("Remove", "حذف")}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="primary"
                              onClick={handleApplyDiscountCode}
                              disabled={isValidatingDiscount || !discountCode.trim()}
                            >
                              {isValidatingDiscount
                                ? t("Validating...", "بررسی")
                                : t("Apply", "اعمال")}
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className={styles.invoiceSection}>
                        <label className={styles.checkboxLabel}>
                          <span className={styles.checkboxText}>{t("I Need Invoice for this Order", "من به فاکتور این سفارش نیاز دارم")}</span>
                          <input
                            type="checkbox"
                            className={styles.customCheckbox}
                            checked={invoiceRequested}
                            onChange={(e) => setInvoiceRequested(e.target.checked)}
                          />
                          <span className={styles.checkboxCustom}></span>
                        </label>
                      </div>

                      <div className={styles.checkoutActions}>
                        <Button
                          type="submit"
                          variant="primary"
                          disabled={isLoading || paymentMethods.length === 0 || !areAllMandatoryFieldsFilled()}
                          className={styles.submitButton}
                        >
                          {isLoading
                            ? t("Processing...", "در حال پردازش...")
                            : t("Place Order", "ثبت سفارش")}
                        </Button>
                        <BackButton
                          href="/products"
                          label={t("Back to Shop", "بازگشت به فروشگاه")}
                          variant="outlined"
                        />
                        {/* Show missing requirements warning under button */}
                        {missingCheckoutRequirements.length > 0 && (
                          <div className={styles.missingRequirementsWarning}>
                            <span className={styles.missingRequirementsText}>
                              {t("You must select a ", "شما باید یک ")}
                              <strong>{missingCheckoutRequirements.join(t(" or ", " یا ") as string)}</strong>
                              {t(" to proceed", " برای ادامه انتخاب کنید")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
      <BottomBar />
    </>
  );
}



