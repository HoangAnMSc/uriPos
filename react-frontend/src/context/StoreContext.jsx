import { createContext, useEffect, useState, useCallback } from "react";
import api from "../api/axios";
import { API_ORIGIN } from "../config/api";

export const StoreContext = createContext(null);

function toAbsoluteImageUrl(value) {
  if (!value || typeof value !== "string") return "";
  const v = value.trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  if (v.startsWith("/")) return `${API_ORIGIN}${v}`;
  return `${API_ORIGIN}/${v}`;
}

const StoreContextProvider = (props) => {
  const [cartItems, setCartItems] = useState({});
  const [productList, setProductList] = useState([]);
  const [contentStructures, setContentStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("customerToken") || "");

  // ── Fetch products ──
  useEffect(() => {
    fetchContentStructures();
    fetchProducts();
  }, []);

  // ── Sync token ──
  useEffect(() => {
    if (token) {
      localStorage.setItem("customerToken", token);
    } else {
      localStorage.removeItem("customerToken");
    }
  }, [token]);

  // ── Load cart khi đăng nhập / đăng xuất ──
  useEffect(() => {
    if (token) {
      loadCartFromServer();
    } else {
      // Không đăng nhập: dùng localStorage
      try {
        const saved = localStorage.getItem("cartItems_guest");
        setCartItems(saved ? JSON.parse(saved) : {});
      } catch {
        setCartItems({});
      }
    }
  }, [token]);

  // ── Lưu cart guest vào localStorage ──
  useEffect(() => {
    if (!token) {
      localStorage.setItem("cartItems_guest", JSON.stringify(cartItems));
    }
  }, [cartItems, token]);

  async function fetchContentStructures() {
    try {
      const res = await api.get("/public/content-structures");
      setContentStructures(res.data.data || []);
    } catch {
      setContentStructures([]);
    }
  }

  async function fetchProducts() {
    try {
      setLoading(true);
      const res = await api.get("/public/products");
      const products = Array.isArray(res.data) ? res.data : [];
      setProductList(
        products
          .filter((p) => p.isPublish && p.quantity > 0)
          .map((p) => ({
            _id: p.id,
            name: p.name,
            image: toAbsoluteImageUrl(p.thumbnail),
            price: p.price,
            description: p.shortDesc || "",
            category: p.contentStructureId || "All",
          }))
      );
    } catch {
      setProductList([]);
    } finally {
      setLoading(false);
    }
  }

  // ── Load cart từ server ──
  const loadCartFromServer = useCallback(async () => {
    try {
      const res = await api.get("/customer/cart");
      const items = res.data.data || [];
      const map = {};
      items.forEach(({ productId, quantity }) => {
        if (quantity > 0) map[productId] = quantity;
      });
      setCartItems(map);
    } catch {
      setCartItems({});
    }
  }, []);

  // ── Sync 1 item lên server ──
  const syncItemToServer = useCallback(async (productId, quantity) => {
    if (!token) return;
    try {
      await api.post("/customer/cart", { product_id: productId, quantity });
    } catch (e) {
      console.error("Cart sync failed", e);
    }
  }, [token]);

  // ── Add to cart ──
  const addToCart = (itemId) => {
    setCartItems((prev) => {
      const newQty = (prev[itemId] || 0) + 1;
      syncItemToServer(itemId, newQty);
      return { ...prev, [itemId]: newQty };
    });
  };

  // ── Remove from cart ──
  const removeFromCart = (itemId) => {
    setCartItems((prev) => {
      const newQty = (prev[itemId] || 1) - 1;
      if (newQty <= 0) {
        syncItemToServer(itemId, 0);
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      }
      syncItemToServer(itemId, newQty);
      return { ...prev, [itemId]: newQty };
    });
  };

  // ── Xóa hẳn 1 item khỏi cart ──
  const clearItemFromCart = (itemId) => {
    syncItemToServer(itemId, 0);
    setCartItems((prev) => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  // ── Cart total ──
  const getTotalCartAmount = () => {
    let total = 0;
    for (const id in cartItems) {
      const qty = cartItems[id];
      if (qty > 0) {
        const item = productList.find((p) => p._id === id);
        if (item) total += qty * item.price;
      }
    }
    return total;
  };

  const contextValue = {
    food_list: productList,   // giữ food_list để không break Cart.jsx cũ
    product_list: productList,
    content_structures: contentStructures,
    cartItems,
    setCartItems,
    addToCart,
    removeFromCart,
    clearItemFromCart,
    getTotalCartAmount,
    loading,
    token,
    setToken,
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  );
};

export default StoreContextProvider;
