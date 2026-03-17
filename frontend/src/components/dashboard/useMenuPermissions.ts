import { useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { staticMenuGroups } from "./menuConfig";

export function useMenuPermissions() {
  const { user } = useAuth();
  const permQuery = trpc.feishu.myPermissions.useQuery(undefined, {
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: false,
  });

  const allowedMenuCodes = useMemo(() => {
    // If no permissions data yet or error, show all menus (graceful fallback for admin/owner)
    if (!permQuery.data || permQuery.isError) {
      // For admin or owner, show everything
      if (user?.role === "admin") return null; // null = show all
      return null; // Fallback: show all until permissions load
    }
    const perms = permQuery.data.permissions;
    if (!perms || perms.length === 0) {
      // No permissions assigned - if admin show all, otherwise show dashboard only
      if (user?.role === "admin") return null;
      return new Set(["dashboard", "daily_report"]);
    }
    return new Set(perms.map((p: any) => p.menuCode));
  }, [permQuery.data, permQuery.isError, user?.role]);

  const filteredMenuGroups = useMemo(() => {
    if (allowedMenuCodes === null) return staticMenuGroups; // Show all
    return staticMenuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => allowedMenuCodes.has(item.menuCode)),
      }))
      .filter((group) => group.items.length > 0);
  }, [allowedMenuCodes]);

  return { filteredMenuGroups, isLoading: permQuery.isLoading };
}
