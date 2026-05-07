const AUTH_TOKEN_EVENT = "auth-token-changed";

const emitTokenChange = () => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(AUTH_TOKEN_EVENT, {
      detail: { token: localStorage.getItem("token") || "" },
    }),
  );
};

export const setToken = (token) => {
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
  }

  emitTokenChange();
};
export const getToken = () => localStorage.getItem("token") || "";
export const clearToken = () => {
  localStorage.removeItem("token");
  emitTokenChange();
};

export const setPermissions = (permissions) =>
  localStorage.setItem("permissions", JSON.stringify(permissions || []));

export const getPermissions = () => {
  try {
    return JSON.parse(localStorage.getItem("permissions") || "[]");
  } catch {
    return [];
  }
};

export const clearPermissions = () => localStorage.removeItem("permissions");

export const setRoles = (roles) =>
  localStorage.setItem("roles", JSON.stringify(roles || []));

export const getRoles = () => {
  try {
    return JSON.parse(localStorage.getItem("roles") || "[]");
  } catch {
    return [];
  }
};

export const clearRoles = () => localStorage.removeItem("roles");

export const clearAuth = () => {
  clearToken();
  clearPermissions();
  clearRoles();
};

// Refresh permissions from server
export const refreshPermissions = async (axiosClient) => {
  try {
    const res = await axiosClient.get("/me");
    if (res.data.permissions) {
      setPermissions(res.data.permissions);
    }
    if (res.data.roles) {
      setRoles(res.data.roles);
    }
    return true;
  } catch {
    return false;
  }
};
