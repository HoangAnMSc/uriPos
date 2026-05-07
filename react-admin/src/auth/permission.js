import { getPermissions } from "./storage";

export const can = (permissionName) => {
  const permissions = getPermissions();
  return permissions.includes(permissionName);
};
