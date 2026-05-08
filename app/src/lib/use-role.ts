// Hook that returns whether the current user has a given role.
// Roles are sourced from public.profiles via the auth context.
import { useAuth, type AppRole } from "@/lib/auth-context";

export function useHasRole(role: AppRole): {
  hasRole: boolean;
  isLoading: boolean;
} {
  const { loading, role: currentRole } = useAuth();
  return {
    hasRole: currentRole === role,
    isLoading: loading,
  };
}
