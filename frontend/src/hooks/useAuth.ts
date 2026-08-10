import { useAuthStore } from "../store/auth.store";

export const useAuth = () => {
  const { user, token, setAuth, logout } = useAuthStore();
  return {
    user,
    token,
    isAuthenticated: !!token,
    setAuth,
    logout,
  };
};
