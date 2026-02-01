// Permissions Module Exports
// Centralizes all permission-related exports

export { Permission } from './Permission.enum';

export {
  ROLE_PERMISSIONS,
  roleHasPermission,
  getPermissionsForRole,
  roleHasAnyPermission,
  roleHasAllPermissions,
} from './rolePermissions';
