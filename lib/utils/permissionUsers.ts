export function filterManagedUsers<T extends { role?: string }>(users: T[]): T[] {
  return users.filter((user) => user.role === "admin" || user.role === "superadmin");
}
