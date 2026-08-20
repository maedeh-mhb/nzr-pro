import { filterManagedUsers } from "../permissionUsers";

describe("filterManagedUsers", () => {
  it("includes admins and superadmins while excluding regular users", () => {
    const users = [
      { id: "1", role: "user" },
      { id: "2", role: "admin" },
      { id: "3", role: "superadmin" },
    ] as Array<{ id: string; role: string }>;

    expect(filterManagedUsers(users)).toEqual([
      { id: "2", role: "admin" },
      { id: "3", role: "superadmin" },
    ]);
  });
});
