type ProductWithPosition = {
  id: string;
  position?: number | null;
  createdAt?: string | Date | null;
};
export function sortProductsByPosition<T extends ProductWithPosition>(products: T[]) {
  return [...products].sort((a, b) => {
    const aPos = typeof a.position === "number" ? a.position : Number.POSITIVE_INFINITY;
    const bPos = typeof b.position === "number" ? b.position : Number.POSITIVE_INFINITY;

    if (aPos !== bPos) {
      return aPos - bPos;
    }

    const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bCreated - aCreated;
  });
}
