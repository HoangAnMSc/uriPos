import { navigationItems } from '../config/navigation';
import { canAccess, getFirstAllowedPath } from '../config/permissions';
import useAuth from './useAuth';

export default function usePermissions() {
  const { profile } = useAuth();
  const role = profile?.role ?? 'staff';

  return {
    role,
    can: (moduleKey, action = 'view') => canAccess(role, moduleKey, action),
    firstAllowedPath: getFirstAllowedPath(role),
    visibleNavigation: navigationItems.filter((item) => canAccess(role, item.moduleKey))
  };
}
