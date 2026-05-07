import React from "react";
import { Navigate } from "react-router-dom";
import { can } from "../auth/permission";

export default function PermissionRoute({ permission, permissions, children }) {
  // Nếu có permissions array, check xem có ít nhất 1 permission
  if (permissions && Array.isArray(permissions)) {
    const hasPermission = permissions.some(p => can(p));
    if (!hasPermission) return <Navigate to="/forbidden" replace />;
    return children;
  }

  // Nếu có permission single
  if (permission) {
    if (!can(permission)) return <Navigate to="/forbidden" replace />;
    return children;
  }

  // Không có permission nào thì cho phép
  return children;
}
