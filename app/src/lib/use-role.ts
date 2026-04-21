// Hook that returns whether the current user has a given role.
// Roles are sourced from public.user_roles via RLS-safe direct read of the
// caller's own rows ("Users view their own roles" policy).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export type AppRole = "admin" | "moderator" | "user";

export function useHasRole(role: AppRole): {
  hasRole: boolean;
  isLoading: boolean;
} {
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user) return [] as AppRole[];
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return ((data ?? []) as { role: AppRole }[]).map((r) => r.role);
    },
    enabled: !!user,
    staleTime: 60_000,
  });
  return {
    hasRole: !!q.data?.includes(role),
    isLoading: q.isLoading,
  };
}
