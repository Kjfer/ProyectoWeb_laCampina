import { useAuth, UserRole } from './useAuth';

/**
 * Hook to check if the current user has a specific role
 * Supports multiple roles per user
 */
export function useHasRole(role: UserRole): boolean {
  const { profile } = useAuth();
  
  if (!profile) return false;
  
  // Check if user has the role in their roles array
  return profile.roles?.includes(role) || profile.role === role;
}

/**
 * Hook to check if the current user has any of the specified roles
 */
export function useHasAnyRole(roles: UserRole[]): boolean {
  const { profile } = useAuth();
  
  if (!profile) return false;
  
  // Check if user has any of the roles
  return roles.some(role => 
    profile.roles?.includes(role) || profile.role === role
  );
}
