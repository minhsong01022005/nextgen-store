import { createContext, useCallback, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api, errMsg } from "../api";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const KEY = "ngs_cart";

const readLocal = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch {
    return [];
  }
};

// Đã đăng nhập: giỏ nằm trên server. Chưa đăng nhập: giỏ nằm ở localStorage
// và được gộp vào giỏ tài khoản ngay khi đăng nhập.
export function CartProvider({ children }) {
  const { user } = useAuth();
  const userId = user && user.role !== "admin" ? user.id : undefined; // admin không có giỏ hàng
  const [cart, setCart] = useState(readLocal);
  const [unselected, setUnselected] = useState([]); // mặc định chọn hết, chỉ nhớ các món bị bỏ chọn

  const setGuest = (next) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    setCart(next);
  };

  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      setCart((await api.get("/me/cart")).data);
    } catch {
      /* giữ nguyên giỏ hiện tại */
    }
  }, [userId]);

  useEffect(() => {
    setUnselected([]);
    if (!userId) {
      setCart(readLocal());
      return;
    }
    const local = readLocal();
    const req = local.length
      ? api.post("/me/cart/merge", { items: local.map((i) => ({ product_id: i.id, quantity: i.quantity })) })
      : api.get("/me/cart");
    req
      .then((r) => {
        localStorage.removeItem(KEY);
        setCart(r.data);
      })
      .catch(() => {});
  }, [userId]);

  const remote = async (call, okMsg) => {
    try {
      setCart((await call()).data);
      if (okMsg) toast.success(okMsg);
    } catch (e) {
      toast.error(errMsg(e, "Không cập nhật được giỏ hàng!"));
    }
  };

  const add = (product, qty = 1) => {
    if (product.stock <= 0) return toast.error("Sản phẩm này đã hết hàng!");
    setUnselected((u) => u.filter((id) => id !== product.id));
    const msg = `Đã thêm "${product.name}" vào giỏ!`;
    if (userId) return remote(() => api.post("/me/cart", { product_id: product.id, quantity: qty }), msg);

    const existing = cart.find((i) => i.id === product.id);
    const next = (existing?.quantity || 0) + qty;
    if (next > product.stock) return toast.error(`Kho chỉ còn tối đa ${product.stock} sản phẩm!`);
    setGuest(
      existing
        ? cart.map((i) => (i.id === product.id ? { ...i, quantity: next, stock: product.stock } : i))
        : [...cart, { id: product.id, name: product.name, price: product.price, image_url: product.image_url, stock: product.stock, quantity: qty }]
    );
    toast.success(msg);
  };

  const setQty = (id, quantity) => {
    const item = cart.find((i) => i.id === id);
    if (!item) return;
    if (quantity > item.stock) return toast.error(`Chỉ còn ${item.stock} chiếc trong kho!`);
    if (userId) return remote(() => api.put(`/me/cart/${id}`, { quantity: Math.max(quantity, 0) }));
    setGuest(cart.map((i) => (i.id === id ? { ...i, quantity } : i)).filter((i) => i.quantity > 0));
  };

  const changeQty = (id, delta) => {
    const item = cart.find((i) => i.id === id);
    if (item) setQty(id, item.quantity + delta);
  };

  const remove = (id) => {
    if (userId) return remote(() => api.delete(`/me/cart/${id}`));
    setGuest(cart.filter((i) => i.id !== id));
  };

  const isSelected = (id) => !unselected.includes(id);
  const toggle = (id) => setUnselected((u) => (u.includes(id) ? u.filter((x) => x !== id) : [...u, id]));
  const toggleAll = (checked) => setUnselected(checked ? [] : cart.map((i) => i.id));

  const selectedItems = cart.filter((i) => isSelected(i.id));
  const count = cart.reduce((s, i) => s + i.quantity, 0);
  const subtotal = selectedItems.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cart, add, changeQty, setQty, remove, reload, count, isSelected, toggle, toggleAll, selectedItems, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
}
