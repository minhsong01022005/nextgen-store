import { createContext, useCallback, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, getToken, LOGOUT_EVENT, setToken } from "../api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());
  const [favIds, setFavIds] = useState([]);

  const loadFavs = useCallback(async () => {
    try {
      setFavIds((await api.get("/me/favorites")).data);
    } catch {
      setFavIds([]);
    }
  }, []);

  useEffect(() => {
    if (!getToken()) return;
    api.get("/auth/me")
      .then((r) => {
        setUser(r.data);
        loadFavs();
      })
      .catch((e) => {
        if (e.response?.status === 401) setToken(null); // token hết hạn
      })
      .finally(() => setLoading(false));
  }, [loadFavs]);

  const authenticate = async (path, body) => {
    const { data } = await api.post(path, body);
    setToken(data.access_token);
    setUser(data.user);
    loadFavs();
    return data.user;
  };

  const login = (email, password) => authenticate("/auth/login", { email, password });
  const register = (full_name, email, password) => authenticate("/auth/register", { full_name, email, password });

  const logout = () => {
    setToken(null);
    setUser(null);
    setFavIds([]);
  };

  // api.js phát sự kiện này khi server trả 401 cho request có token (phiên hết hạn)
  useEffect(() => {
    const onExpired = () => {
      setUser((u) => {
        if (u) toast.error("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!", { id: "session-expired" });
        return null;
      });
      setFavIds([]);
    };
    window.addEventListener(LOGOUT_EVENT, onExpired);
    return () => window.removeEventListener(LOGOUT_EVENT, onExpired);
  }, []);

  const toggleFav = async (productId) => {
    if (favIds.includes(productId)) {
      await api.delete(`/favorites/${productId}`);
      setFavIds((f) => f.filter((id) => id !== productId));
    } else {
      await api.post(`/favorites/${productId}`);
      setFavIds((f) => [...f, productId]);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, favIds, toggleFav }}>
      {children}
    </AuthContext.Provider>
  );
}
