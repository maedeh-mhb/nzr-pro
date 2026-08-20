"use client";

import { useState, useEffect, useMemo, useRef , useCallback} from "react";
import { useLanguage } from "@/lib/utils/language";
import { sortProductsByPosition } from "@/lib/utils/productOrdering";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { FiShoppingBag, FiTag, FiPlus, FiChevronDown, FiChevronUp, FiEdit2, FiTrash2, FiX } from "react-icons/fi";
import AdminCard from "../AdminCard";
import SearchBar from "../SearchBar";
import DataTable from "../DataTable";
import Button from "@/components/ui/Button";
import Modal from "../Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select, { SelectOption } from "@/components/ui/Select";
import MultiSelectDropdown from "@/components/ui/MultiSelectDropdown";
import IconPicker from "../IconPicker";
import { renderIcon } from "@/lib/utils/iconRenderer";
import { formatPrice } from "@/lib/utils/formatPrice";
import toast from "react-hot-toast";
import TableSkeleton from "@/components/ui/TableSkeleton";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import { FiShoppingBag as EmptyIcon } from "react-icons/fi";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import tableStyles from "@/styles/components/_adminTable.module.scss";
import formStyles from "@/styles/components/_adminForm.module.scss";
import styles from "@/styles/components/_adminSettings.module.scss";

interface Product {
  id: string;
  name: string;
  nameFa: string | null;
  description: string | null;
  descriptionFa: string | null;
  price: string;
  category: string;
  categoryId?: string | null;
  categoryIds?: string | null;
  position?: number | null;
  image: string | null;
  badge: string | null;
  weight?: string | null;
  volume?: string | null;
  rewardPoints?: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface Seller {
  id: string;
  nameEn: string;
  nameFa: string;
  email: string | null;
  phone: string | null;
  status: string;
}

interface Category {
  id: string;
  name: string;
  nameFa: string | null;
  description: string | null;
  descriptionFa: string | null;
  icon: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface Badge {
  id: string;
  name: string;
  nameFa: string | null;
  color: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export default function ProductsSection() {
  const { t, language, currency } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const PRODUCTS_LIMIT = 20;

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [productsPage, setProductsPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [isLoadingMoreProducts, setIsLoadingMoreProducts] = useState(false);

  const productsSentinelRef = useRef<HTMLDivElement | null>(null);
  const isFetchingProductsRef = useRef(false);

  // Categories state
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [isAddProductExpanded, setIsAddProductExpanded] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryNameFa, setNewCategoryNameFa] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("");
  
  // Sellers state
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoadingSellers, setIsLoadingSellers] = useState(true);

  // Badges state
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoadingBadges, setIsLoadingBadges] = useState(true);
  const [isBadgesExpanded, setIsBadgesExpanded] = useState(false);
  const [newBadgeName, setNewBadgeName] = useState("");
  const [newBadgeNameFa, setNewBadgeNameFa] = useState("");
  const [newBadgeColor, setNewBadgeColor] = useState("#FF5733");
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [isCreatingBadge, setIsCreatingBadge] = useState(false);
  const [isDeleteBadgeLoading, setIsDeleteBadgeLoading] = useState<string | null>(null);

  // Product form state
  const [productImagePreview, setProductImagePreview] = useState<string>("");
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const productFileInputRef = useRef<HTMLInputElement>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [hasReward, setHasReward] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderList, setReorderList] = useState<string[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Multiple images state
  const [hasMultipleImages, setHasMultipleImages] = useState(false);
  const [extraImagePreviews, setExtraImagePreviews] = useState<[string, string]>(["", ""]);
  const [isUploadingExtraImage, setIsUploadingExtraImage] = useState<[boolean, boolean]>([false, false]);
  const extraFileInputRef0 = useRef<HTMLInputElement>(null);
  const extraFileInputRef1 = useRef<HTMLInputElement>(null);
  const extraFileInputRefs = [extraFileInputRef0, extraFileInputRef1];

  // Multiple categories state
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categoryError, setCategoryError] = useState<string>("");

  // Weight / Volume unit toggle
  const [unit, setUnit] = useState<"weight" | "volume">("weight");

  // Product form schema
  const productSchema = yup.object({
    name: yup.string().required(t("Product name is required", "نام محصول الزامی است")),
    nameFa: yup.string(),
    shortDescription: yup.string(),
    shortDescriptionFa: yup.string(),
    longDescription: yup.string(),
    longDescriptionFa: yup.string(),
    ingredients: yup.string(),
    ingredientsFa: yup.string(),
    tags: yup.string(),
    price: yup.number().required(t("Price is required", "قیمت الزامی است")).min(0, t("Price must be positive", "قیمت باید عددی مثبت باشد")),
    quantity: yup.number().min(0, t("Quantity must be positive", "مقدار باید عددی مثبت باشد")),
    slug: yup.string(),
    image: yup.string(),
    ogImage: yup.string(),
    sellerId: yup.string().required(t("Seller is required", "انتخاب فروشنده الزامی است")),
    badge: yup.string(),
    productType: yup.string().oneOf(["economic", "featured"]).required(t("Product type is required", "نوع محصول الزامی است")),
    minOrderQuantity: yup.number().min(1, t("Minimum order quantity must be at least 1", "کمترین مقدار سفارش نمی تواند از یک کمتر باشد")),
    maxOrderQuantity: yup.number().test("max-greater-than-min", t("Maximum must be greater than minimum", "حداکثر مقدار سفارش نمی تواند از حداقل مقدار سفارش کمتر باشد"), function (value) {
      const min = this.parent.minOrderQuantity;
      if (!value || !min) return true;
      return value >= min;
    }),
    weight: yup.number().min(0, t("Weight must be positive", "وزن باید عددی مثبت باشد")),
    volume: yup.number().transform((v, o) => (o === "" || o === null || o === undefined ? undefined : v)).min(0, t("Volume must be positive", "حجم باید عددی مثبت باشد")).optional(),
    rewardPoints: yup.number().nullable().min(0, t("Reward points must be positive", "عدد جایزه باید عددی مثبت باشد")),
    seoTitle: yup.string(),
    seoDescription: yup.string(),
    seoKeywords: yup.string(),
  });

  type ProductFormData = yup.InferType<typeof productSchema>;

  const {
    register: registerProduct,
    handleSubmit: handleSubmitProduct,
    formState: { errors: productErrors },
    reset: resetProduct,
    watch: watchProduct,
    setValue: setValueProduct,
  } = useForm<ProductFormData>({
    resolver: yupResolver(productSchema),
    defaultValues: {
      badge: "None",
      productType: "economic",
      minOrderQuantity: 1,
      quantity: 0,
      rewardPoints: null,
      sellerId: "",
      ogImage: "",
    },
  });

  // Fetch products from API
  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Fetch products from API
  const fetchProducts = useCallback(
    async (pageNumber: number, replace = false) => {
      if (isFetchingProductsRef.current) return;

      isFetchingProductsRef.current = true;

      if (pageNumber === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMoreProducts(true);
      }

      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(pageNumber));
        params.set("limit", String(PRODUCTS_LIMIT));

        if (debouncedSearchQuery) {
          params.set("search", debouncedSearchQuery);
        }

        const response = await fetch(`/api/admin/products?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const fetchedProducts = data.data || data.products || [];
        const nextHasMore =
          typeof data.pagination?.hasNext === "boolean"
            ? data.pagination.hasNext
            : fetchedProducts.length >= PRODUCTS_LIMIT;

        setProducts((prev) => (replace ? fetchedProducts : [...prev, ...fetchedProducts]));
        setHasMoreProducts(nextHasMore);
      } catch (err: any) {
        const errorMessage =
          err?.message || t("Failed to load products", "بارگزاری محصولات ناموفق بود");
        setError(errorMessage);

        if (pageNumber === 1) {
          toast.error(errorMessage);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMoreProducts(false);
        isFetchingProductsRef.current = false;
      }
    },
    [debouncedSearchQuery, t]
  );

  // Reset list when search changes
  useEffect(() => {
    setProducts([]);
    setProductsPage(1);
    setHasMoreProducts(true);
    setExpandedProductId(null);
  }, [debouncedSearchQuery]);

  // Load products when page changes
  useEffect(() => {
    fetchProducts(productsPage, productsPage === 1);
  }, [productsPage, fetchProducts]);

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = productsSentinelRef.current;
    if (!sentinel || !hasMoreProducts || isLoading || isLoadingMoreProducts) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];

        if (
          first.isIntersecting &&
          hasMoreProducts &&
          !isLoading &&
          !isLoadingMoreProducts &&
          !isFetchingProductsRef.current
        ) {
          setProductsPage((prev) => prev + 1);
        }
      },
      { rootMargin: "250px" }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMoreProducts, isLoading, isLoadingMoreProducts]);

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const response = await fetch("/api/admin/categories");

        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        // Handle successResponse format: { success: true, data: { categories: [...] } }
        setCategories(data.data?.categories || data.categories || []);
      } catch (err: any) {
        toast.error(t("Failed to load categories", "بارگزاری دسته بندی ها ناموفق بود"));
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, [t]);

  // Fetch sellers from API
  useEffect(() => {
    const fetchSellers = async () => {
      try {
        const response = await fetch("/api/admin/sellers");
        if (response.ok) {
          const data = await response.json();
          // FIX: Handle both response formats
          const sellersList = data.data?.sellers || data.sellers || [];
          setSellers(sellersList);
        }
      } catch (error) {
        console.error("Error fetching sellers:", error);
        toast.error(t("Failed to load sellers", "خطا در بارگذاری فروشندگان"));
      }
    };

    fetchSellers();
  }, [t]);
  // Fetch badges from API
  useEffect(() => {
    const fetchBadges = async () => {
      setIsLoadingBadges(true);
      try {
        const response = await fetch("/api/admin/badges");

        if (!response.ok) {
          throw new Error("Failed to fetch badges");
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setBadges(data.badges || []);
      } catch (err: any) {
        toast.error(t("Failed to load badges", "بارگزاری برچسب ها ناموفق بود"));
      } finally {
        setIsLoadingBadges(false);
      }
    };

    fetchBadges();
  }, [t]);

  // Handle card expansion - only one can be open at a time
  const handleCategoriesToggle = () => {
    if (isAddProductExpanded) {
      setIsAddProductExpanded(false);
    }
    if (isBadgesExpanded) {
      setIsBadgesExpanded(false);
    }
    setIsCategoriesExpanded(!isCategoriesExpanded);
  };

  const handleAddProductToggle = () => {
    if (isCategoriesExpanded) {
      setIsCategoriesExpanded(false);
    }
    if (isBadgesExpanded) {
      setIsBadgesExpanded(false);
    }
    setIsAddProductExpanded(!isAddProductExpanded);
  };

  const handleBadgesToggle = () => {
    if (isCategoriesExpanded) {
      setIsCategoriesExpanded(false);
    }
    if (isAddProductExpanded) {
      setIsAddProductExpanded(false);
    }
    setIsBadgesExpanded(!isBadgesExpanded);
  };

  // Category management functions
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error(t("Category name is required", "نام دسته بندی الزامی است"));
      return;
    }

    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCategoryName.trim(),
          nameFa: newCategoryNameFa.trim() || null,
          icon: newCategoryIcon.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create category");
      }

      toast.success(t("Category added successfully", "دسته بندی با موفقیت اضافه شد"));
      setIsAddCategoryModalOpen(false);
      setNewCategoryName("");
      setNewCategoryNameFa("");
      setNewCategoryIcon("");

      // Refresh categories
      const refreshResponse = await fetch("/api/admin/categories");
      const refreshData = await refreshResponse.json();
      // Handle successResponse format: { success: true, data: { categories: [...] } }
      setCategories(refreshData.data?.categories || refreshData.categories || []);
    } catch (err: any) {
      toast.error(t("Failed to add category", "افزودن دسته بندی ناموفق بود"));
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm(t("Are you sure you want to delete this category?", "آیا از حذف این دسته بندی مطمئن هستید؟"))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to delete category");
      }

      if (
        (data.productPrimaryCleanupCount ?? 0) > 0 ||
        (data.productCategoryIdsCleanupCount ?? 0) > 0
      ) {
        toast.success(
          t(
            "Category deleted and related product references were cleaned successfully.",
            "دسته بندی حذف شد و ارجاع‌های مرتبط در محصولات پاک شدند."
          )
        );
      } else {
        toast.success(t("Category deleted successfully", "دسته بندی با موفقیت حذف شد"));
      }

      // Refresh categories
      const refreshResponse = await fetch("/api/admin/categories");
      const refreshData = await refreshResponse.json();
      // Handle successResponse format: { success: true, data: { categories: [...] } }
      setCategories(refreshData.data?.categories || refreshData.categories || []);
    } catch (err: any) {
      toast.error(t("Failed to delete category", "خذف دسته بندی ناموفق بود"));
    }
  };

  // Badge management functions
  const handleAddBadge = async () => {
    if (!newBadgeName.trim()) {
      toast.error(t("Badge name is required", "نام برچسب الزامی است"));
      return;
    }

    if (!newBadgeColor.trim()) {
      toast.error(t("Badge color is required", "رنگ برچسب الزامی است"));
      return;
    }

    setIsCreatingBadge(true);
    try {
      const response = await fetch("/api/admin/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newBadgeName.trim(),
          nameFa: newBadgeNameFa.trim() || null,
          color: newBadgeColor.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create badge");
      }

      toast.success(t("Badge created successfully", "برچسب با موفقیت ساخته شد"));
      setNewBadgeName("");
      setNewBadgeNameFa("");
      setNewBadgeColor("#FF5733");

      // Refresh badges
      const refreshResponse = await fetch("/api/admin/badges");
      const refreshData = await refreshResponse.json();
      setBadges(refreshData.badges || []);
    } catch (err: any) {
      toast.error(err?.message || t("Failed to create badge", "ساخت برچسب ناموفق بود"));
    } finally {
      setIsCreatingBadge(false);
    }
  };

  const handleUpdateBadge = async (badgeId: string, nameFa: string, color: string) => {
    try {
      const response = await fetch(`/api/admin/badges/${badgeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameFa: nameFa.trim() || null,
          color: color.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update badge");
      }

      toast.success(t("Badge updated successfully", "برچسب با موفقیت آپدیت شد"));

      // Refresh badges
      const refreshResponse = await fetch("/api/admin/badges");
      const refreshData = await refreshResponse.json();
      setBadges(refreshData.badges || []);
      setEditingBadge(null);
    } catch (err: any) {
      toast.error(t("Failed to update badge", "آپدیت برچسب ناموفق بود"));
    }
  };

  const handleDeleteBadge = async (badgeId: string) => {
    if (!confirm(t("Are you sure you want to delete this badge?", "آیا از حذف برچسب مطمئن هستید؟"))) {
      return;
    }

    setIsDeleteBadgeLoading(badgeId);
    try {
      const response = await fetch(`/api/admin/badges/${badgeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete badge");
      }

      toast.success(t("Badge deleted successfully", "یرچسب با موفقیت حذف شد"));

      // Refresh badges
      const refreshResponse = await fetch("/api/admin/badges");
      const refreshData = await refreshResponse.json();
      setBadges(refreshData.badges || []);
    } catch (err: any) {
      toast.error(t("Failed to delete badge", "حذف برچسب ناموفق بود"));
    } finally {
      setIsDeleteBadgeLoading(null);
    }
  };

  // Product image upload handler
  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProductImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/upload-product-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      setValueProduct("image", data.url);
      setProductImagePreview(data.url);
      toast.success(t("Image uploaded successfully", "تصویر با موفقیت آپلود شد"));
    } catch (err: any) {
      toast.error(t("Failed to upload image", "آپلود تصویر ناموفق بود"));
    } finally {
      setIsUploadingProductImage(false);
    }
  };

  const handleProductImageUrlChange = (url: string) => {
    setValueProduct("image", url);
    setProductImagePreview(url);
  };

  // Extra image upload handler
  const handleExtraImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: 0 | 1) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingExtraImage((prev) => {
      const next: [boolean, boolean] = [...prev] as [boolean, boolean];
      next[index] = true;
      return next;
    });
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/upload-product-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload image");

      const data = await response.json();
      setExtraImagePreviews((prev) => {
        const next: [string, string] = [...prev] as [string, string];
        next[index] = data.url;
        return next;
      });
      toast.success(t("Image uploaded successfully", "تصویر با موفقیت آپلود شد"));
    } catch {
      toast.error(t("Failed to upload image", "آپلود تصویر ناموفق بود"));
    } finally {
      setIsUploadingExtraImage((prev) => {
        const next: [boolean, boolean] = [...prev] as [boolean, boolean];
        next[index] = false;
        return next;
      });
    }
  };

  const handleExtraImageUrlChange = (url: string, index: 0 | 1) => {
    setExtraImagePreviews((prev) => {
      const next: [string, string] = [...prev] as [string, string];
      next[index] = url;
      return next;
    });
  };

  // Handle edit button click
// Handle edit button click
// Handle edit button click
const handleEditProduct = useCallback(async (productId: string) => {
  try {
    // Find the product in the list
    const product = products.find((p) => p.id === productId);
    if (!product) {
      toast.error(t("Product not found", "محصول یافت نشد"));
      return;
    }

    // Fetch full product details including all fields
    const response = await fetch(`/api/admin/products/${productId}`);
    if (!response.ok) {
      throw new Error("Failed to fetch product details");
    }

    const data = await response.json();
    const fullProduct = data.product;

    // ========== NEW: Parse categoryIds for multi-category pre-fill ==========
    let parsedCategoryIds: string[] = [];
    
    // Try to parse categoryIds from JSON string
    if (fullProduct.categoryIds) {
      try {
        const parsed = JSON.parse(fullProduct.categoryIds);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedCategoryIds = parsed;
        }
      } catch (e) {
        console.error("Failed to parse categoryIds:", e);
      }
    }

    // Filter out deleted/invalid categories from the loaded product
    const validCategoryIds = parsedCategoryIds.filter((id) =>
      categories.some((cat) => cat.id === id)
    );

    if (validCategoryIds.length !== parsedCategoryIds.length) {
      toast.error(
        t(
          "Some deleted categories were removed from this product. Please select from available categories.",
          "برخی دسته‌بندی‌های حذف شده از این محصول حذف شدند. لطفاً از دسته‌بندی‌های موجود انتخاب کنید."
        )
      );
    }

    // Fallback: if no valid categoryIds remain but categoryId exists, use it if it's still valid
    if (validCategoryIds.length === 0 && fullProduct.categoryId && categories.some((cat) => cat.id === fullProduct.categoryId)) {
      setSelectedCategoryIds([fullProduct.categoryId]);
    } else {
      setSelectedCategoryIds(validCategoryIds);
    }
    // ========== END NEW ==========

    // Set editing product
    setEditingProduct(fullProduct);

    // Populate form with product data
    resetProduct({
      name: fullProduct.name || "",
      nameFa: fullProduct.nameFa || "",
      shortDescription: fullProduct.shortDescription || "",
      shortDescriptionFa: fullProduct.shortDescriptionFa || "",
      longDescription: fullProduct.longDescription || "",
      longDescriptionFa: fullProduct.longDescriptionFa || "",
      ingredients: fullProduct.ingredients || "",
      ingredientsFa: fullProduct.ingredientsFa || "",
      tags: fullProduct.tags || "",
      price: parseFloat(fullProduct.price || "0"),
      quantity: fullProduct.quantity || 0,
      slug: fullProduct.slug || "",
      image: fullProduct.image || "",
      ogImage: fullProduct.ogImage || "",
      badge: fullProduct.badge || "None",
      sellerId: fullProduct.sellerId || "",
      productType: fullProduct.productType || "economic",
      minOrderQuantity: fullProduct.minOrderQuantity || 1,
      maxOrderQuantity: fullProduct.maxOrderQuantity || undefined,
      weight: fullProduct.weight ? parseFloat(fullProduct.weight) : undefined,
      volume: fullProduct.volume ? parseFloat(fullProduct.volume) : undefined,
      rewardPoints: fullProduct.rewardPoints || undefined,
      seoTitle: fullProduct.seoTitle || "",
      seoDescription: fullProduct.seoDescription || "",
      seoKeywords: fullProduct.seoKeywords || "",
    });

    // Set reward toggle
    setHasReward(!!fullProduct.rewardPoints && fullProduct.rewardPoints > 0);

    // Set multiple images
    if (fullProduct.images) {
      try {
        const parsed: string[] = JSON.parse(fullProduct.images);
        const extra: [string, string] = [parsed[0] || "", parsed[1] || ""];
        setExtraImagePreviews(extra);
        setHasMultipleImages(extra.some((url) => url !== ""));
      } catch {
        setExtraImagePreviews(["", ""]);
        setHasMultipleImages(false);
      }
    } else {
      setExtraImagePreviews(["", ""]);
      setHasMultipleImages(false);
    }

    // Set unit (weight vs volume) as currently configured
    if (fullProduct.unit) {
      setUnit(fullProduct.unit as "weight" | "volume");
    }

    // Set image preview
    if (fullProduct.image) {
      setProductImagePreview(fullProduct.image);
    }

    // Open modal
    setIsAddProductModalOpen(true);
  } catch (err: any) {
    toast.error(err?.message || t("Failed to load product", "بارگزاری محصول ناموفق بود"));
  }
}, [products, resetProduct, t]);

  // Product form submission
  const refreshProductsFromStart = useCallback(async () => {
    setProducts([]);
    setProductsPage(1);
    setHasMoreProducts(true);
    setExpandedProductId(null);
    await fetchProducts(1, true);
  }, [fetchProducts]);
// Product form submission
const onProductSubmit = async (formData: ProductFormData) => {
  if (!hasCategories) {
    toast.error(t("Please add at least one category first", "لطفا ابتدا حداقل یک دسته بندی اضافه کنید"));
    return;
  }

  const validSelectedCategoryIds = selectedCategoryIds.filter((id) =>
    categories.some((cat) => cat.id === id)
  );

  if (validSelectedCategoryIds.length === 0) {
    setCategoryError(t("Please select at least one category", "لطفا ابتدا حداقل یک دسته بندی انتخاب کنید"));
    return;
  }
  setCategoryError("");

  setIsCreatingProduct(true);
  try {
    // Find the first selected category for backward compatibility
    const firstSelectedCategory = categories.find((cat) => cat.id === validSelectedCategoryIds[0]);
    if (!firstSelectedCategory) {
      throw new Error("Selected category not found");
    }

    const isEditing = !!editingProduct;
    const url = isEditing
      ? `/api/admin/products/${editingProduct.id}`
      : "/api/admin/products";
    const method = isEditing ? "PUT" : "POST";

    // Prepare the request body
    const requestBody: any = {
      ...formData,
      // Backward compatibility fields (first selected category)
      category: firstSelectedCategory.name,
      categoryId: firstSelectedCategory.id,
      // NEW: Store all selected categories as JSON string
      categoryIds: JSON.stringify(validSelectedCategoryIds),
      sellerId: formData.sellerId,
      unit,
      volume: formData.volume,
      images: hasMultipleImages
        ? JSON.stringify(extraImagePreviews.filter((url) => url !== ""))
        : null,
      ogImage: formData.ogImage || null,
    };

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to ${isEditing ? "update" : "create"} product`);
    }

    toast.success(
      isEditing
        ? t("Product updated successfully", "محصول با موفقیت آپدیت شد")
        : t("Product created successfully", "محصول با موفقیت ایجاد شد")
    );
    setIsAddProductModalOpen(false);
    resetProduct();
    setProductImagePreview("");
    setHasReward(false);
    setHasMultipleImages(false);
    setExtraImagePreviews(["", ""]);
    setEditingProduct(null);
    setSelectedCategoryIds([]);
    setCategoryError("");

    // Refresh products list
    // const refreshResponse = await fetch("/api/admin/products");
    // const refreshData = await refreshResponse.json();
    // setProducts(refreshData.data || refreshData.products || []);
    await refreshProductsFromStart();
  } catch (err: any) {
    toast.error(err?.message || t(`Failed to ${editingProduct ? "update" : "create"} product`, `خطا در ${editingProduct ? "ایجاد" : "به روزرسانی"} محصول`));
  } finally {
    setIsCreatingProduct(false);
  }
};

  // Handle delete product
  // Handle delete product
const handleDeleteProduct = useCallback(async (productId: string) => {
  if (!confirm(t("Are you sure you want to delete this product?", "آیا از حذف این محصول مطمئن هستید؟"))) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/products/${productId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to delete product");
    }

    toast.success(t("Product deleted successfully", "محصول با موفقیت حذف شذ"));
    await refreshProductsFromStart();
  } catch (err: any) {
    toast.error(err?.message || t("Failed to delete product", "حذف محصول ناموفق بود"));
  }
}, [t, refreshProductsFromStart]);

const handleHideProduct = useCallback(async (productId: string) => {
  try {
    const response = await fetch(`/api/admin/products/${productId}/hide`, {
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to hide product");
    }

    toast.success(t("Product hidden successfully", "محصول با موفقیت مخفی شد"));
    await refreshProductsFromStart();
  } catch (err: any) {
    toast.error(err?.message || t("Failed to hide product", "مخفی سازی محصول ناموفق بود"));
  }
}, [t, refreshProductsFromStart]);

const handleShowProduct = useCallback(async (productId: string) => {
  try {
    const response = await fetch(`/api/admin/products/${productId}/show`, {
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to show product");
    }

    toast.success(t("Product is now visible", "محصول اکنون قابل مشاهده است"));
    await refreshProductsFromStart();
  } catch (err: any) {
    toast.error(err?.message || t("Failed to show product", "تغییر محصول به قابل مشاهده ناموفق بود"));
  }
}, [t, refreshProductsFromStart]);

  // Format products for table display
  const sortedProducts = useMemo(() => sortProductsByPosition(products), [products]);

  const formattedProducts = useMemo(() => {
    const productsToRender = reorderMode && reorderList.length > 0
      ? reorderList
          .map((id) => products.find((product) => product.id === id))
          .filter((product): product is Product => Boolean(product))
      : sortedProducts;

    return productsToRender.map((product, index) => {
      const displayName = language === "fa" && product.nameFa ? product.nameFa : product.name;
      const formattedPrice = formatPrice(product.price || "0", language, currency || "toman");

      return {
        index: index + 1,
        position: typeof product.position === "number" ? product.position : null,
        id: product.id,
        shortId: product.id.substring(0, 8),
        name: displayName,
        category: product.category,
        price: formattedPrice,
        actions: {
          id: product.id,
          isHidden: product.badge === "Not Available",
        }, // Keep full ID and hidden flag for actions
      };
    });
  }, [products, sortedProducts, reorderMode, reorderList, language, currency]);

  const columns = useMemo(
    () => [
      { key: "index", label: t("#", "#") },
      { key: "position", label: t("Position", "موقعیت"), render: (value: number | null) => (value !== null ? String(value) : "—") },
      { key: "name", label: t("Name", "?نام") },
      { key: "category", label: t("Category", "دسته بندی") },
      { key: "price", label: t("Price", "قیمت") },
      {
        key: "actions",
        label: t("Actions", "تنظیمات"),
        render: (value: { id: string; isHidden: boolean }) => (
          <div className={tableStyles.tableActions}>
            <Button
              variant="primary"
              size="small"
              onClick={() => handleEditProduct(value.id)}
              style={{
                backgroundColor: "#d4f0f9",
                color: "#0a7ba7",
                border: "1px solid #a8d8e8",
              }}
            >
              {t("Edit", "اصلاح")}
            </Button>
            {reorderMode ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => {
                    setReorderList((prev) => {
                      const idx = prev.indexOf(value.id);
                      if (idx <= 0) return prev;
                      const copy = [...prev];
                      [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
                      return copy;
                    });
                  }}
                >
                  ↑
                </Button>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => {
                    setReorderList((prev) => {
                      const idx = prev.indexOf(value.id);
                      if (idx === -1 || idx >= prev.length - 1) return prev;
                      const copy = [...prev];
                      [copy[idx + 1], copy[idx]] = [copy[idx], copy[idx + 1]];
                      return copy;
                    });
                  }}
                >
                  ↓
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="small"
                onClick={() => (value.isHidden ? handleShowProduct(value.id) : handleHideProduct(value.id))}
              >
                {value.isHidden
                  ? t("Show on Site", "نمایش در سایت")
                  : t("Hide from Site", "مخفی کردن از سایت")}
              </Button>
            )}
            <Button
              variant="danger"
              size="small"
              onClick={() => handleDeleteProduct(value.id)}
            >
              {t("Delete", "حذف")}
            </Button>
          </div>
        ),
      },
    ],
    [t, handleEditProduct, handleDeleteProduct, handleHideProduct, handleShowProduct, reorderMode]
  );

  const hasCategories = categories.length > 0;

  return (
    <>
      {/* Categories Card */}
      <AdminCard>
        <div
          className={`${cardStyles.cardHeader} ${styles.expandableHeader}`}
          onClick={handleCategoriesToggle}
        >
          <h3 className={cardStyles.cardTitle}>
            <FiTag />
            <span>{t("Categories", "دسته بندی ها")}</span>
          </h3>
          <div className={styles.expandIcon}>
            {isCategoriesExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
        {isCategoriesExpanded && (
          <div className={styles.expandableContent}>
            {isLoadingCategories ? (
              <div style={{ padding: "1rem", textAlign: "center" }}>
                {t("Loading...", "در حال بارگزاری")}
              </div>
            ) : categories.length > 0 ? (
              <>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
                  {categories.map((category) => {
                    const displayName = language === "fa" && category.nameFa ? category.nameFa : category.name;
                    return (
                      <div
                        key={category.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 1rem",
                          background: "var(--tertiary)",
                          borderRadius: "0.5rem",
                          fontSize: "0.9rem",
                          fontWeight: 500,
                          color: "var(--text-dark)",
                        }}
                      >
                        {renderIcon(category.icon, undefined, { width: "1.2rem", height: "1.2rem", color: "var(--primary)" })}
                        <span>{displayName}</span>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCategory(category);
                            setIsAddCategoryModalOpen(true);
                          }}
                        >
                          <FiEdit2 />
                        </Button>
                        <Button
                          variant="danger"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(category.id);
                          }}
                        >
                          <FiTrash2 />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <Button
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCategory(null);
                    setNewCategoryName("");
                    setNewCategoryNameFa("");
                    setNewCategoryIcon("");
                    setIsAddCategoryModalOpen(true);
                  }}
                >
                  <FiPlus style={{ marginRight: "0.5rem" }} />
                  {t("Add Category", "افزودن دسته بندی")}
                </Button>
              </>
            ) : (
              <div style={{ padding: "1rem 0" }}>
                <p style={{ color: "var(--text-dark)", opacity: 0.6, marginBottom: "1rem" }}>
                  {t("No categories found. Add a category first.", "دسته بندی یافت نشد. یک دسته بندی اضافه کنید.")}
                </p>
                <Button
                  variant="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCategory(null);
                    setNewCategoryName("");
                    setNewCategoryNameFa("");
                    setNewCategoryIcon("");
                    setIsAddCategoryModalOpen(true);
                  }}
                >
                  <FiPlus style={{ marginRight: "0.5rem" }} />
                  {t("Add Category", "افزودن دسته بندی")}
                </Button>
              </div>
            )}
          </div>
        )}
      </AdminCard>

      {/* Badges Card */}
      <AdminCard>
        <div
          className={`${cardStyles.cardHeader} ${styles.expandableHeader}`}
          onClick={handleBadgesToggle}
        >
          <h3 className={cardStyles.cardTitle}>
            <FiTag />
            <span>{t("Badge Management", "مدیریت برچسب ها")}</span>
          </h3>
          <div className={styles.expandIcon}>
            {isBadgesExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
        {isBadgesExpanded && (
          <div className={styles.expandableContent}>
            {isLoadingBadges ? (
              <div style={{ padding: "1rem", textAlign: "center" }}>
                {t("Loading...", "در حال بارگزاری")}
              </div>
            ) : (
              <>
                {/* Add New Badge Form */}
                <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: "0.5rem" }}>
                  <h4 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--primary)" }}>
                    {t("Add New Badge", "افزودن برچسب جدید")}
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.75rem", alignItems: "flex-end" }}>
                    <Input
                      label={t("Badge Name (English)", "نام برچسب (انگلیسی)")}
                      placeholder={t("e.g., Sale, New Arrival", "برای مثال، فروش ویژه، تازه، ...")}
                      value={newBadgeName}
                      onChange={(e) => setNewBadgeName(e.target.value)}
                      style={{ height: "2.5rem", lineHeight: "1.5" }}
                    />
                    <Input
                      label={t("Badge Name (Farsi)", "نام برچسب (فارسی)")}
                      placeholder={t("e.g., ", "")}
                      value={newBadgeNameFa}
                      onChange={(e) => setNewBadgeNameFa(e.target.value)}
                      className="farsi"
                      style={{ height: "2.5rem", lineHeight: "1.5" }}
                    />
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input
                        type="color"
                        value={newBadgeColor}
                        onChange={(e) => setNewBadgeColor(e.target.value)}
                        style={{
                          width: "3rem",
                          height: "2.5rem",
                          border: "1px solid var(--tertiary)",
                          borderRadius: "0.375rem",
                          cursor: "pointer",
                        }}
                      />
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{newBadgeColor}</span>
                    </div>
                  </div>
                  <div style={{ gridColumn: "1 / -1", marginTop: "0.75rem" }}>
                    <Button
                      variant="primary"
                      onClick={handleAddBadge}
                      disabled={isCreatingBadge || !newBadgeName.trim()}
                      style={{
                        width: "fit-content",
                        padding: "0.75rem 1.5rem",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        borderRadius: "0.5rem",
                        backgroundColor: "#1a5a3a",
                        color: "#ffffff",
                        border: "none",
                        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                        transition: "all 0.2s ease",
                        cursor: isCreatingBadge || !newBadgeName.trim() ? "not-allowed" : "pointer",
                        opacity: isCreatingBadge || !newBadgeName.trim() ? 0.6 : 1
                      }}
                    >
                      {isCreatingBadge ? t("Creating...", "در حال ساخت") : t("Add Badge", "افزودن برچسب")}
                    </Button>
                  </div>
                </div>

                {/* Display Existing Badges */}
                {badges.length > 0 ? (
                  <div>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--primary)" }}>
                      {t("Current Badges", "برچسب های حاضر")}
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {badges.filter((badge) => badge && badge.id).map((badge) => (
                        <div
                          key={badge.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "1rem",
                            padding: "1rem",
                            background: "var(--bg-secondary)",
                            borderRadius: "0.5rem",
                            border: "1px solid var(--tertiary)",
                          }}
                        >
                          {/* Badge Preview */}
                          <div
                            style={{
                              padding: "0.5rem 1rem",
                              backgroundColor: badge.color,
                              color: "white",
                              borderRadius: "0.375rem",
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              textShadow: "0 1px 2px rgba(0,0,0,0.2)",
                            }}
                          >
                            {badge.name}
                          </div>

                          {/* Farsi Name Input */}
                          <input
                            type="text"
                            value={editingBadge?.id === badge.id ? editingBadge.nameFa || "" : badge.nameFa || ""}
                            onChange={(e) => {
                              if (editingBadge?.id === badge.id) {
                                setEditingBadge({ ...editingBadge, nameFa: e.target.value });
                              }
                            }}
                            onFocus={() => {
                              if (editingBadge?.id !== badge.id) {
                                setEditingBadge(badge);
                              }
                            }}
                            placeholder={t("Farsi name", "نام فارسی")}
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              border: "1px solid var(--tertiary)",
                              borderRadius: "0.375rem",
                              fontSize: "0.85rem",
                              fontFamily: editingBadge?.id === badge.id ? "inherit" : "inherit",
                            }}
                            className="farsi"
                          />

                          {/* Color Picker */}
                          <input
                            type="color"
                            value={editingBadge?.id === badge.id ? editingBadge.color : badge.color}
                            onChange={(e) => {
                              if (editingBadge?.id === badge.id) {
                                setEditingBadge({ ...editingBadge, color: e.target.value });
                              }
                            }}
                            onFocus={() => {
                              if (editingBadge?.id !== badge.id) {
                                setEditingBadge(badge);
                              }
                            }}
                            style={{
                              width: "2.5rem",
                              height: "2.5rem",
                              border: "1px solid var(--tertiary)",
                              borderRadius: "0.375rem",
                              cursor: "pointer",
                            }}
                          />

                          {/* Save/Update Button */}
                          {editingBadge?.id === badge.id && (
                            <Button
                              variant="save"
                              size="small"
                              onClick={() => {
                                handleUpdateBadge(badge.id, editingBadge.nameFa || "", editingBadge.color);
                              }}
                            >
                              {t("Save", "ذخیره")}
                            </Button>
                          )}

                          {/* Delete Button */}
                          <Button
                            variant="danger"
                            size="small"
                            onClick={() => handleDeleteBadge(badge.id)}
                            disabled={isDeleteBadgeLoading === badge.id}
                          >
                            {isDeleteBadgeLoading === badge.id ? "..." : <FiTrash2 />}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-secondary)" }}>
                    {t("No badges yet. Create one above.", "در حال حضر برچسبی موجود نیست، یک برچسب اضافه کنید.")}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </AdminCard>

      {/* Add Product Card */}
      <AdminCard>
        <div
          className={`${cardStyles.cardHeader} ${styles.expandableHeader}`}
          onClick={handleAddProductToggle}
        >
          <h3 className={cardStyles.cardTitle}>
            <FiPlus />
            <span>{t("Add Product", "افزودن محصول")}</span>
          </h3>
          <div className={styles.expandIcon}>
            {isAddProductExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
        {isAddProductExpanded && (
          <div className={styles.expandableContent}>
            <Button
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddProductModalOpen(true);
              }}
              disabled={!hasCategories}
            >
              <FiPlus style={{ marginRight: "0.5rem" }} />
              {t("Add New Product", "افزودن محصول جدید")}
            </Button>
            {!hasCategories && (
              <p style={{ marginTop: "1rem", color: "var(--danger)", fontSize: "0.9rem" }}>
                {t("Please add at least one category first", "لطفا ابتدا یک دسته بندی اضافه کنید")}
              </p>
            )}
          </div>
        )}
      </AdminCard>

      {/* Products Table Card */}
      <AdminCard>
        <div className={cardStyles.cardHeader}>
          <h3 className={cardStyles.cardTitle}>
            <FiShoppingBag />
            <span>{t("Product Management", "مدیریت محصول")}</span>
          </h3>
          <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
            <Button
              variant={reorderMode ? "primary" : "outline"}
              size="small"
              onClick={() => {
                if (!reorderMode) {
                  // Enter reorder mode: build initial list from current products order
                  setReorderList(sortedProducts.map((p) => p.id));
                }
                setReorderMode(!reorderMode);
              }}
            >
              {reorderMode ? t("Exit Reorder", "خروج از ترتیب دهی") : t("Reorder", "مرتب سازی")}
            </Button>
            {reorderMode && (
              <>
                <Button
                  variant="outline"
                  size="small"
                  onClick={async () => {
                    try {
                      setIsSavingOrder(true);
                      const categories = new Set<string>();
                      products.forEach((product) => {
                        categories.add(product.categoryId ?? "null");
                      });

                      const loadingToast = toast.loading(
                        t("Reindexing positions...", "اعداد مجدد موقعیت‌ محصولات...")
                      );
                      for (const categoryId of categories) {
                        const catParam = categoryId === "null" ? "null" : categoryId;
                        const resRe = await fetch(
                          `/api/admin/products/reindex/${encodeURIComponent(catParam)}`,
                          { method: "POST" }
                        );
                        if (!resRe.ok) {
                          const err = await resRe.json().catch(() => ({}));
                          toast.dismiss(loadingToast);
                          throw new Error(err.error || "Failed to reindex");
                        }
                      }
                      toast.dismiss(loadingToast);
                      toast.success(t("Positions reindexed", "موقعیت‌ها با موفقیت بازنشانی شدند"));
                      await refreshProductsFromStart();
                    } catch (err: any) {
                      toast.error(err.message || t("Failed to reindex positions", "بازنشانی موقعیت‌ها ناموفق بود"));
                    } finally {
                      setIsSavingOrder(false);
                    }
                  }}
                  disabled={isSavingOrder}
                >
                  {t("Reindex", "بازنشانی")}
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  onClick={async () => {
                    // Save order (bulk) with auto-reindex when gaps are low or missing
                    try {
                      setIsSavingOrder(true);

                    // Determine categories present in current reorder list
                    const idToProduct = new Map(products.map((p) => [p.id, p]));
                    const categories = new Map<string, string[]>();
                    for (const id of reorderList) {
                      const p = idToProduct.get(id);
                      const cat = p ? (p.categoryId ?? null) : null;
                      const key = cat === null ? 'null' : String(cat);
                      if (!categories.has(key)) categories.set(key, []);
                      categories.get(key)!.push(id);
                    }

                    // Check per-category whether reindexing is needed
                    const categoriesToReindex: string[] = [];
                    for (const [key] of categories) {
                      const cat = key === 'null' ? null : key;
                      const catProducts = products.filter((p) => (p.categoryId ?? null) === (cat === null ? null : cat));
                      const positions = catProducts
                        .map((p) => Number(p.position))
                        .filter((v) => Number.isFinite(v))
                        .sort((a, b) => a - b);

                      // Need reindex if some products have no position or gaps are small
                      const hasMissing = catProducts.length !== positions.length;
                      let minGap = Infinity;
                      for (let i = 1; i < positions.length; i++) {
                        minGap = Math.min(minGap, positions[i] - positions[i - 1]);
                      }

                      if (hasMissing || positions.length === 0 || minGap < 10) {
                        categoriesToReindex.push(String(key));
                      }
                    }

                    // If any category needs reindex, call the reindex endpoint for each and refresh
                    if (categoriesToReindex.length > 0) {
                      const loadingToast = toast.loading(
                        t('Reindexing positions...', 'اعداد مجدد موقعیت‌ محصولات...')
                      );
                      for (const key of categoriesToReindex) {
                        const catParam = key === 'null' ? 'null' : key;
                        const resRe = await fetch(
                          `/api/admin/products/reindex/${encodeURIComponent(catParam)}`,
                          { method: 'POST' }
                        );
                        if (!resRe.ok) {
                          const err = await resRe.json().catch(() => ({}));
                          toast.dismiss(loadingToast);
                          throw new Error(err.error || 'Failed to reindex');
                        }
                      }
                      toast.dismiss(loadingToast);
                      await refreshProductsFromStart();
                    }

                    // Build payload and send
                    const payload = reorderList.map((id, idx) => ({ id, position: (idx + 1) * 100 }));
                    const res = await fetch('/api/admin/products/reorder', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload),
                    });
                    if (!res.ok) {
                      const err = await res.json();
                      throw new Error(err.error || 'Failed to save order');
                    }

                    toast.success(t('Order saved', 'ترتیب ذخیره شد'));
                    setReorderMode(false);
                    await refreshProductsFromStart();
                  } catch (err: any) {
                    toast.error(err.message || t('Failed to save order', 'ذخیره ترتیب ناموفق بود'));
                  } finally {
                    setIsSavingOrder(false);
                  }
                }}
                disabled={isSavingOrder}
              >
                {t('Save Order', 'ذخیره ترتیب')}
              </Button>
            </>
            )}
          </div>
        </div>
        <SearchBar
          placeholder={t("Search products...", "جست و جوی محصولات")}
          value={searchQuery}
          onChange={setSearchQuery}
        />
        {isLoading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => {
              setProducts([]);
              setProductsPage(1);
              setHasMoreProducts(true);
              fetchProducts(1, true);
            }}
          />
        ) : (
          <>
            {/* Mobile Card View */}
            <div className={styles.mobileProductsList}>
              {formattedProducts.map((product) => {
                const fullProduct = products.find((p) => p.id === product.actions.id);
                const isExpanded = expandedProductId === product.actions.id;
                const displayName = language === "fa" && fullProduct?.nameFa ? fullProduct.nameFa : product.name;
                const formattedPrice = formatPrice(fullProduct?.price || "0", language, currency || "toman");

                return (
                  <div key={product.actions.id} className={styles.mobileProductCard}>
                    <button
                      className={styles.mobileProductCardButton}
                      onClick={() => setExpandedProductId(isExpanded ? null : product.actions.id)}
                    >
                      <div className={styles.mobileProductCardHeader}>
                        <span className={styles.mobileProductCardName}>{displayName}</span>
                        <span className={styles.mobileProductCardCategory}>{product.category}</span>
                        <div className={styles.expandIcon}>
                          {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                        </div>
                      </div>
                    </button>
                    {isExpanded && fullProduct && (
                      <div className={styles.mobileProductExpanded}>
                        <div className={styles.mobileProductDetail}>
                          <span className={styles.mobileProductDetailLabel}>{t("Price", "قیمت")}:</span>
                          <span className={styles.mobileProductDetailValue}>{formattedPrice}</span>
                        </div>
                        <div className={styles.mobileProductActions}>
                          {reorderMode ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <Button
                                variant="outline"
                                size="small"
                                onClick={() => {
                                  setReorderList((prev) => {
                                    const idx = prev.indexOf(product.actions.id);
                                    if (idx <= 0) return prev;
                                    const copy = [...prev];
                                    [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
                                    return copy;
                                  });
                                }}
                              >
                                ↑
                              </Button>
                              <Button
                                variant="outline"
                                size="small"
                                onClick={() => {
                                  setReorderList((prev) => {
                                    const idx = prev.indexOf(product.actions.id);
                                    if (idx === -1 || idx >= prev.length - 1) return prev;
                                    const copy = [...prev];
                                    [copy[idx + 1], copy[idx]] = [copy[idx], copy[idx + 1]];
                                    return copy;
                                  });
                                }}
                              >
                                ↓
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Button
                                variant="primary"
                                size="small"
                                onClick={() => handleEditProduct(product.actions.id)}
                                style={{
                                  backgroundColor: "#d4f0f9",
                                  color: "#0a7ba7",
                                  border: "1px solid #a8d8e8",
                                }}
                              >
                                {t("Edit", "تغییر")}
                              </Button>
                              <Button
                                variant="danger"
                                size="small"
                                onClick={() => handleDeleteProduct(product.actions.id)}
                              >
                                {t("Delete", "خذف")}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop/Tablet Table View */}
            <div className={styles.desktopProductsTable}>
              <DataTable columns={columns} data={formattedProducts} />
            </div>

            {isLoadingMoreProducts && (
              <div style={{ textAlign: "center", padding: "1rem", color: "#666" }}>
                {t("Loading more products...", "در حال بارگذاری محصولات بیشتر...")}
              </div>
            )}

            <div ref={productsSentinelRef} style={{ height: 1 }} />

            {!hasMoreProducts && products.length > 0 && !isLoadingMoreProducts && (
              <div style={{ textAlign: "center", padding: "1rem", color: "#666" }}>
                {t("You have reached the end of products", "به انتهای لیست محصولات رسیدید")}
              </div>
            )}
          </>
        )}
      </AdminCard>

      {/* Add/Edit Category Modal */}
      <Modal
        isOpen={isAddCategoryModalOpen}
        onClose={() => {
          setIsAddCategoryModalOpen(false);
          setEditingCategory(null);
          setNewCategoryName("");
          setNewCategoryNameFa("");
          setNewCategoryIcon("");
        }}
        title={editingCategory ? t("Edit Category", "اصلاح دسته بندی") : t("Add Category", "افزودن دسته بندی")}
      >
        <Input
          label={t("Category Name (English)", "نام دسته بندی (انگلیسی)")}
          placeholder={t("Enter category name", "نام دسته بندی را وارد کنید")}
          value={editingCategory ? editingCategory.name : newCategoryName}
          onChange={(e) => {
            if (editingCategory) {
              setEditingCategory({ ...editingCategory, name: e.target.value });
            } else {
              setNewCategoryName(e.target.value);
            }
          }}
        />
        <Input
          label={t("Category Name (Farsi)", "نام دسته بندی (فارسی)")}
          placeholder={t("Enter category name in Farsi", "نام فارسی دسته بندی را وارد کنید")}
          value={editingCategory ? (editingCategory.nameFa || "") : newCategoryNameFa}
          onChange={(e) => {
            if (editingCategory) {
              setEditingCategory({ ...editingCategory, nameFa: e.target.value });
            } else {
              setNewCategoryNameFa(e.target.value);
            }
          }}
          className="farsi"
        />
        <IconPicker
          label={t("Icon (Optional)", "آیکون (غیر اجباری)")}
          value={editingCategory ? (editingCategory.icon || "") : newCategoryIcon}
          onChange={(iconName) => {
            if (editingCategory) {
              setEditingCategory({ ...editingCategory, icon: iconName });
            } else {
              setNewCategoryIcon(iconName);
            }
          }}
        />
        <div className={formStyles.formActions}>
          <Button
            variant="primary"
            onClick={async () => {
              if (editingCategory) {
                // Update category
                try {
                  const response = await fetch(`/api/admin/categories/${editingCategory.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      name: editingCategory.name,
                      nameFa: editingCategory.nameFa || null,
                      icon: editingCategory.icon || null,
                    }),
                  });

                  if (!response.ok) {
                    throw new Error("Failed to update category");
                  }

                  toast.success(t("Category updated successfully", "دسته بندی با موفقیت به روزرسانی شد"));
                  setIsAddCategoryModalOpen(false);
                  setEditingCategory(null);

                  // Refresh categories
                  const refreshResponse = await fetch("/api/admin/categories");
                  const refreshData = await refreshResponse.json();
                  // Handle successResponse format: { success: true, data: { categories: [...] } }
                  setCategories(refreshData.data?.categories || refreshData.categories || []);
                } catch (err: any) {
                  toast.error(t("Failed to update category", "به روزرسانی دسته بندی ناموفق بود"));
                }
              } else {
                await handleAddCategory();
              }
            }}
          >
            {editingCategory ? t("Update Category", "به روزرسانی دسته بندی") : t("Add Category", "افزودن دسته بندی")}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setIsAddCategoryModalOpen(false);
              setEditingCategory(null);
              setNewCategoryName("");
              setNewCategoryNameFa("");
              setNewCategoryIcon("");
            }}
          >
            {t("Cancel", "لغو")}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isAddProductModalOpen}
        onClose={() => {
          setIsAddProductModalOpen(false);
          resetProduct();
          setProductImagePreview("");
          setHasReward(false);
          setHasMultipleImages(false);
          setExtraImagePreviews(["", ""]);
          setEditingProduct(null);
          setSelectedCategoryIds([]);
          setCategoryError("");
        }}
        title={editingProduct ? t("Edit Product", "اصلاح محصول") : t("Add New Product", "افزودن محصول جدید")}
        size="large"
      >
        <form onSubmit={handleSubmitProduct(onProductSubmit)} className={formStyles.formContainer}>
          <div className={formStyles.formFields}>
            {/* Basic Information */}
            <Input
              label={t("Product Name", "نام محصول")}
              placeholder={t("Enter product name", "نام محصول را وارد کنید")}
              {...registerProduct("name")}
              error={productErrors.name?.message}
            />
            <Input
              label={t("Product Name (Farsi)", "نام محصول (فارسی)")}
              placeholder={t("Enter product name in Farsi", "نام فارسی محصول را وارد کنید")}
              {...registerProduct("nameFa")}
              error={productErrors.nameFa?.message}
              className="farsi"
            />

            <div className={formStyles.formGrid}>
              <MultiSelectDropdown
                label={t("Categories", "دسته بندی ها")}
                options={categories.map((cat) => ({
                  value: cat.id,
                  label: language === "fa" && cat.nameFa ? cat.nameFa : cat.name,
                }))}
                selectedValues={selectedCategoryIds}
                onChange={(values) => {
                  setSelectedCategoryIds(values);
                  setCategoryError(""); // Clear error when user selects
                }}
                error={categoryError}
                placeholder={t("Select categories", "دسته بندی را انتخاب کنید")}
              />

                <Select
                  label={t("Seller / Vendor", "فروشنده")}
                  options={sellers
                    .filter((seller) => seller.status === "active")
                    .map((seller) => ({
                      value: seller.id,
                      label: language === "fa" && seller.nameFa ? seller.nameFa : seller.nameEn,
                    }))}
                  value={watchProduct("sellerId") || ""}
                  onChange={(value) => setValueProduct("sellerId", value)}
                  error={productErrors.sellerId?.message}
                  placeholder={t("Select seller", "انتخاب فروشنده")}
                />

              <Select
                label={t("Product Badge", "برچسب محصول")}
                options={[
                  { value: "", label: t("None", "بدون برچسب") },
                  ...badges.map((badge) => ({
                    value: badge.name,
                    label: language === "fa" && badge.nameFa ? badge.nameFa : badge.name,
                  })),
                ]}
                value={watchProduct("badge") || ""}
                onChange={(value) => setValueProduct("badge", value)}
                error={productErrors.badge?.message}
              />
            </div>
            <Select
              label={t("Product Type", "نوع محصول")}
              options={[
                { value: "economic", label: t("Economic", "اقتصادی") },
                { value: "featured", label: t("Featured", "ویژه") },
              ]}
              value={watchProduct("productType") || ""}
              onChange={(value) => setValueProduct("productType", value as "economic" | "featured")}
              error={productErrors.productType?.message}
              placeholder={t("Select product type", "نوع محصول را انتخاب کنید")}
            />

            {/* Descriptions */}
            <Textarea
              label={t("Short Description (English)", "توضیح کوتاه محصول (انگلیسی) ")}
              placeholder={t("Enter short description", "توضیح کوتاه انگلیسی، حداکثر 20 کلمه")}
              rows={3}
              {...registerProduct("shortDescription")}
              error={productErrors.shortDescription?.message}
            />
            <Textarea
              label={t("Short Description (Farsi)", "توضیح کوتاه فارسی")}
              placeholder={t("Enter short description in Farsi", "توضیح کوتاه فارسی، حداکثر 20 کلمه")}
              rows={3}
              {...registerProduct("shortDescriptionFa")}
              error={productErrors.shortDescriptionFa?.message}
              className="farsi"
            />
            <Textarea
              label={t("Long Description (English)", "توضیحات کامل انگلیسی")}
              placeholder={t("Enter long description", "توضیحات کامل انگلیسی را وارد کنید")}
              rows={5}
              {...registerProduct("longDescription")}
              error={productErrors.longDescription?.message}
            />
            <Textarea
              label={t("Long Description (Farsi)", "توضیحات کامل فارسی")}
              placeholder={t("Enter long description in Farsi", "توضیحات کامل فارسی را وارد کنید")}
              rows={5}
              {...registerProduct("longDescriptionFa")}
              error={productErrors.longDescriptionFa?.message}
              className="farsi"
            />

            {/* Ingredients */}
            <Textarea
              label={t("Ingredients (English)", "ترکیبات (انگلیسی)")}
              placeholder={t("Enter ingredients", "وارد کردن ترکیبات انگلیسی")}
              rows={3}
              {...registerProduct("ingredients")}
              error={productErrors.ingredients?.message}
            />
            <Textarea
              label={t("Ingredients (Farsi)", "ترکیبات (فارسی)")}
              placeholder={t("Enter ingredients in Farsi", "وارد کردن ترکیبات فارسی")}
              rows={3}
              {...registerProduct("ingredientsFa")}
              error={productErrors.ingredientsFa?.message}
              className="farsi"
            />

            {/* Tags */}
            <Input
              label={t("Tags", "تگ ها")}
              placeholder={t("Comma-separated tags", "با ، از هم جدا شوند")}
              {...registerProduct("tags")}
              error={productErrors.tags?.message}
            />

            {/* Pricing & Inventory */}
            <div className={formStyles.formGrid}>
              <Input
                label={t("Price", "قیمت")}
                type="number"
                step="0.01"
                placeholder="0.00"
                {...registerProduct("price")}
                error={productErrors.price?.message}
              />
              <Input
                label={t("Quantity", "مقدار")}
                type="number"
                placeholder="0"
                {...registerProduct("quantity")}
                error={productErrors.quantity?.message}
              />
            </div>

            {/* Order Quantity */}
            <div className={formStyles.formGrid}>
              <Input
                label={t("Min Order Quantity", "حداقل تعداد سفارش")}
                type="number"
                placeholder="1"
                {...registerProduct("minOrderQuantity")}
                error={productErrors.minOrderQuantity?.message}
              />
              <Input
                label={t("Max Order Quantity", "حداکثر تعداد سفارش")}
                type="number"
                placeholder={t("Optional", "غیر اجباری")}
                {...registerProduct("maxOrderQuantity")}
                error={productErrors.maxOrderQuantity?.message}
              />
            </div>

            {/* Weight, Volume & Slug */}
            <div className={formStyles.formGrid}>
              <Input
                label={t("Weight (kg)", "وزن (کیلوگرم)")}
                type="number"
                step="0.01"
                placeholder="0.00"
                {...registerProduct("weight")}
                error={productErrors.weight?.message}
              />
              <Input
                label={t("Volume - L (optional)", "حجم (لیتر) (غیر اجباری)")}
                type="number"
                step="0.001"
                placeholder={t("Optional", "غیر اجباری")}
                {...registerProduct("volume")}
                error={productErrors.volume?.message}
              />
              <Input
                label={t("Product Slug", "صفحه اختصاصی محصول")}
                placeholder={t("Auto-generated if empty", "در صورت تعیین نکردن، خودکار تولید می شود")}
                {...registerProduct("slug")}
                error={productErrors.slug?.message}
              />
            </div>

            {/* Reward Points */}
            <div className={formStyles.formGroup}>
              <label className={formStyles.formLabel} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={hasReward}
                  onChange={(e) => {
                    setHasReward(e.target.checked);
                    if (!e.target.checked) {
                      setValueProduct("rewardPoints", null);
                    }
                  }}
                  style={{ width: "auto", margin: 0 }}
                />
                <span>{t("Enable Reward Points", "فعال سازی امتیاز خرید")}</span>
              </label>
              {hasReward && (
                <Input
                  label={t("Reward Points (per item)", "امتیاز خرید هر عدد از محصول")}
                  type="number"
                  placeholder="0"
                  min="0"
                  {...registerProduct("rewardPoints")}
                  error={productErrors.rewardPoints?.message}
                />
              )}
            </div>

            {/* Product Image */}
            <div className={formStyles.formGroup}>
              <label className={formStyles.formLabel}>
                {t("Product Image", "تصویر محصول")}
              </label>
              <div className={styles.imageUploadSection}>
                <div className={styles.uploadOptions}>
                  <div className={styles.uploadOption}>
                    <input
                      ref={productFileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                      onChange={handleProductImageUpload}
                      disabled={isUploadingProductImage}
                      style={{ display: "none" }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploadingProductImage}
                      onClick={() => productFileInputRef.current?.click()}
                      style={{ width: "100%" }}
                    >
                      {isUploadingProductImage
                        ? t("Uploading...", "در حال آپلود...")
                        : t("Upload from Local Drive", "آپلود از هارد")}
                    </Button>
                  </div>
                  <div className={styles.uploadOption}>
                    <Input
                      type="text"
                      placeholder={t("Or enter image URL", "آپلود از لینک")}
                      value={watchProduct("image") || ""}
                      onChange={(e) => handleProductImageUrlChange(e.target.value)}
                      error={productErrors.image?.message}
                    />
                  </div>
                </div>
                {productImagePreview && (
                  <div className={styles.imagePreview}>
                    <img
                      src={productImagePreview}
                      alt={t("Product image preview", "نمایش تصویر محصول")}
                      onError={() => {
                        setProductImagePreview("");
                        setValueProduct("image", "");
                        toast.error(t("Failed to load image", "خطا در بارگزاری تصویر محصول"));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setProductImagePreview("");
                        setValueProduct("image", "");
                      }}
                      className={styles.removeImageBtn}
                      title={t("Remove image", "حذف تصویر")}
                    >
                      <FiX />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className={formStyles.formGroup}>
              <Input
                label={t("OG Image URL", "آدرس تصویر OG")}
                placeholder={t("Enter Open Graph image URL", "آدرس تصویر Open Graph را وارد کنید")}
                {...registerProduct("ogImage")}
                error={productErrors.ogImage?.message}
              />
            </div>

            {/* Multiple Images Toggle */}
            <div className={formStyles.formGroup}>
              <label className={formStyles.formLabel} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={hasMultipleImages}
                  onChange={(e) => {
                    setHasMultipleImages(e.target.checked);
                    if (!e.target.checked) {
                      setExtraImagePreviews(["", ""]);
                    }
                  }}
                  style={{ width: "auto", margin: 0 }}
                />
                <span>{t("Enable Multiple Images (up to 3)", "فعال سازی چند تصویر (حداکثر 3 تصویر)")}</span>
              </label>

              {hasMultipleImages && ([0, 1] as const).map((index) => (
                <div key={index} style={{ marginTop: "1rem" }}>
                  <label className={formStyles.formLabel}>
                    {t(`Extra Image ${index + 2}`, `تصویر اضافه ${index + 2}`)}
                  </label>
                  <div className={styles.imageUploadSection}>
                    <div className={styles.uploadOptions}>
                      <div className={styles.uploadOption}>
                        <input
                          ref={extraFileInputRefs[index]}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                          onChange={(e) => handleExtraImageUpload(e, index)}
                          disabled={isUploadingExtraImage[index]}
                          style={{ display: "none" }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isUploadingExtraImage[index]}
                          onClick={() => extraFileInputRefs[index].current?.click()}
                          style={{ width: "100%" }}
                        >
                          {isUploadingExtraImage[index]
                            ? t("Uploading...", "در حال آپلود...")
                            : t("Upload from Local Drive", "آپلود از هارد")}
                        </Button>
                      </div>
                      <div className={styles.uploadOption}>
                        <Input
                          type="text"
                          placeholder={t("Or enter image URL", "یا افزودن از لینک")}
                          value={extraImagePreviews[index]}
                          onChange={(e) => handleExtraImageUrlChange(e.target.value, index)}
                        />
                      </div>
                    </div>
                    {extraImagePreviews[index] && (
                      <div className={styles.imagePreview}>
                        <img
                          src={extraImagePreviews[index]}
                          alt={t(`Extra image ${index + 2}`, `تصویر اضافه ${index + 2}`)}
                          onError={() => {
                            setExtraImagePreviews((prev) => {
                              const next: [string, string] = [...prev] as [string, string];
                              next[index] = "";
                              return next;
                            });
                            toast.error(t("Failed to load image", "خطا در بارگزاری محصول"));
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setExtraImagePreviews((prev) => {
                              const next: [string, string] = [...prev] as [string, string];
                              next[index] = "";
                              return next;
                            });
                          }}
                          className={styles.removeImageBtn}
                          title={t("Remove image", "حذف تصویر")}
                        >
                          <FiX />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* SEO Section */}
            <div className={formStyles.formGroup}>
              <h4 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--primary)" }}>
                {t("SEO Settings", "تنضیمات سئو")}
              </h4>
              <Input
                label={t("SEO Title", "عنوان سئو")}
                placeholder={t("Enter SEO title", "عنوان سئو را وارد کنید")}
                {...registerProduct("seoTitle")}
                error={productErrors.seoTitle?.message}
              />
              <Textarea
                label={t("SEO Description", "توضیحات سئو")}
                placeholder={t("Enter SEO description", "توضیحات سئو را وارد کنید")}
                rows={3}
                {...registerProduct("seoDescription")}
                error={productErrors.seoDescription?.message}
              />
              <Input
                label={t("SEO Keywords", "کلید واژه های سئو")}
                placeholder={t("Comma-separated keywords", "با ، جدا کنید")}
                {...registerProduct("seoKeywords")}
                error={productErrors.seoKeywords?.message}
              />
            </div>
          </div>

          <div className={formStyles.formActions}>
            <Button
              type="submit"
              variant="save"
              disabled={isCreatingProduct || !hasCategories}
            >
              {isCreatingProduct
                ? (editingProduct ? t("Updating...", "به روز رسانی...") : t("Creating...", "در حال ساخت..."))
                : (editingProduct ? t("Update Product", "به روزرسانی محصول") : t("Add Product", "افزودن محصول"))}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddProductModalOpen(false);
                resetProduct();
                setProductImagePreview("");
                setHasReward(false);
                setHasMultipleImages(false);
                setExtraImagePreviews(["", ""]);
                setEditingProduct(null);
                setSelectedCategoryIds([]);
                setCategoryError("");
              }}
            >
              {t("Cancel", "لغو")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

