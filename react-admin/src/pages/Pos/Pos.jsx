import React, { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { useMsg } from "../../components/MsgContext/MsgContext";
import {
  normalizeCustomerRankRules,
  resolveCustomerRankName,
  sanitizeRankPoints,
} from "../../utils/customerRanks";

const FILE_BASE = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api/v1", "")
  : "http://127.0.0.1:8000";

const money = (v) =>
  Number(v || 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
  });

const toAbsoluteImageUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();

  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) return `${FILE_BASE}${trimmed}`;
  return `${FILE_BASE}/${trimmed}`;
};

const customerEmptyForm = {
  name: "",
  phone: "",
  address: "",
  loyalty_points: "0",
};

const POS_TABS_KEY = "pos_tabs_v2";
const POS_TABID_KEY = "pos_tabid_v2";

function loadTabsFromStorage(meId = "") {
  try {
    const raw = localStorage.getItem(POS_TABS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure staffId is always a string
        return parsed.map((t) => ({
          ...t,
          staffId: String(t.staffId || meId || ""),
        }));
      }
    }
  } catch {
    localStorage.removeItem(POS_TABS_KEY);
  }
  return [makeOrder(1, meId), makeOrder(2, meId)];
}

function loadTabIdFromStorage(tabs) {
  try {
    const id = localStorage.getItem(POS_TABID_KEY);
    if (id && tabs.find((t) => t.id === id)) return id;
  } catch {}
  return tabs[0]?.id || "";
}

const makeOrder = (n = 1, meId = "") => ({
  id: `tab_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  name: `Don ${n}`,
  items: [],
  customer: null,
  note: "",
  staffId: meId || "",
  autoPrintInvoice: true,
  discountType: "value",
  discountValue: 0,
});

const renameOrders = (list) =>
  list.map((x, i) => ({ ...x, name: `Don ${i + 1}` }));

const normProduct = (p) => ({
  id: String(p?.id ?? "").trim(),
  sku: p?.sku || "",
  name: p?.name || "",
  thumbnail: p?.thumbnail || "",
  contentStructureId: String(
    p?.contentStructureId ?? p?.content_structure_id ?? "",
  ),
  price: Number(p?.price || 0),
  quantity: Number(p?.quantity || 0),
  shortDesc: p?.shortDesc ?? p?.short_desc ?? "",
  isPublish: Boolean(p?.isPublish ?? p?.in_stock ?? false),
  fieldValues: p?.fieldValues || p?.field_values || {},
});

const normStructure = (x) => ({
  id: String(x?.id ?? ""),
  name: x?.name || "",
  slug: x?.slug || "",
  fields: Array.isArray(x?.fields) ? x.fields : [],
});

const readProducts = (data) => {
  const products = Array.isArray(data)
    ? data
    : data?.data?.products || data?.data || [];
  const staff = data?.data?.staff || data?.staff || [];

  return {
    products: products.map(normProduct),
    staff: Array.isArray(staff) ? staff : [],
  };
};

const readStructures = (data) => {
  const list = Array.isArray(data) ? data : data?.data || [];
  return list.map(normStructure);
};

const showVal = (v) => {
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (v == null || v === "") return "";
  return String(v);
};

const compactItems = (items = []) => items.filter(Boolean);

const getUsedQty = (items = [], productId) =>
  compactItems(items)
    .filter((x) => String(x.productId) === String(productId))
    .reduce((sum, x) => sum + Number(x.qty || 0), 0);

const getUsedQtyExceptIndex = (items = [], productId, idx) =>
  compactItems(items).reduce((sum, x, i) => {
    if (i === idx) return sum;
    if (String(x.productId) !== String(productId)) return sum;
    return sum + Number(x.qty || 0);
  }, 0);

export default function PosDesktop() {
  const { showSuccess, showDanger } = useMsg();
  const { setHeaderContent } = useOutletContext();
  const [showCreateCustomerPopup, setShowCreateCustomerPopup] = useState(false);
  const [customerForm, setCustomerForm] = useState(customerEmptyForm);
  const [customerErrors, setCustomerErrors] = useState({});
  const [customerSaving, setCustomerSaving] = useState(false);
  const [customerRankRules, setCustomerRankRules] = useState([]);

  const [loadingPage, setLoadingPage] = useState(true);

  const [products, setProducts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [structures, setStructures] = useState([]);
  const [me, setMe] = useState(null);

  const [key, setKey] = useState("");
  const [openDrop, setOpenDrop] = useState(false);
  const [splitLine, setSplitLine] = useState(true);

  const [tabs, setTabs] = useState(() => loadTabsFromStorage());
  const [tabId, setTabId] = useState(() => {
    const t = loadTabsFromStorage();
    return loadTabIdFromStorage(t);
  });

  const [cusKey, setCusKey] = useState("");
  const [cusList, setCusList] = useState([]);
  const [openCus, setOpenCus] = useState(false);

  const [payMethod, setPayMethod] = useState("cash");
  const [cashIn, setCashIn] = useState("");
  const [saving, setSaving] = useState(false);
  const [waitCloseId, setWaitCloseId] = useState("");
  const [lineNotes, setLineNotes] = useState({});

  const [showDiscountPopup, setShowDiscountPopup] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [discountTab, setDiscountTab] = useState("value");

  const searchRef = useRef(null);
  const searchWrapRef = useRef(null);
  const customerRef = useRef(null);
  const customerWrapRef = useRef(null);
  const submitBtnRef = useRef(null);
  const cashRef = useRef(null);

  const structureMap = useMemo(
    () => new Map(structures.map((x) => [String(x.id), x])),
    [structures],
  );

  const productMap = useMemo(
    () => new Map(products.map((x) => [String(x.id), x])),
    [products],
  );

  const order = tabs.find((x) => x.id === tabId) || tabs[0] || null;

  const lines = useMemo(() => {
    if (!order) return [];

    return compactItems(order.items)
      .map((item, index) => {
        const product = productMap.get(String(item.productId));
        if (!product) return null;

        return {
          ...item,
          idx: index,
          product,
          total: Number(product.price || 0) * Number(item.qty || 0),
        };
      })
      .filter(Boolean);
  }, [order, productMap]);

  const activeLines = lines;

  const sub = activeLines.reduce((s, x) => s + Number(x.total || 0), 0);
  const qty = activeLines.reduce((s, x) => s + Number(x.qty || 0), 0);

  const rawDiscountValue = Number(order?.discountValue || 0);
  const rawDiscountType = order?.discountType || "value";

  const discount =
    rawDiscountType === "percent"
      ? Math.min(sub, (sub * Math.max(0, rawDiscountValue)) / 100)
      : Math.min(sub, Math.max(0, rawDiscountValue));

  const total = Math.max(0, sub - discount);
  const paid = payMethod === "cash" ? Number(cashIn || 0) : total;
  const change = payMethod === "cash" ? Math.max(0, paid - total) : 0;
  const due = payMethod === "cash" ? Math.max(0, total - paid) : 0;

  const dropProducts = useMemo(() => {
    const q = key.trim().toLowerCase();

    const source = q ? products : products.slice(0, 12);

    return source.filter((p) => {
      if (!p.isPublish) return false;

      const st = structureMap.get(p.contentStructureId);
      const extra = Object.entries(p.fieldValues || {})
        .map(([k, v]) => {
          const label =
            st?.fields?.find((f) => String(f?.slug) === k)?.name || k;
          return `${label} ${showVal(v)}`;
        })
        .join(" ");

      const text = [p.name, p.sku, p.shortDesc, st?.name || "", extra]
        .join(" ")
        .toLowerCase();

      return !q || text.includes(q);
    });
  }, [key, products, structureMap]);

  function setOrder(fn) {
    setTabs((prev) => {
      const activeId = tabId || prev[0]?.id || "";
      return prev.map((x) => (x.id === activeId ? fn(x) : x));
    });
  }

  function fillData(productData, structureData) {
    const { products, staff } = readProducts(productData);
    setProducts(products);
    setStaff(staff);
    setStructures(readStructures(structureData));
  }

  async function loadAll(show = false) {
    try {
      if (show) setLoadingPage(true);

      const [meRes, productRes, structureRes, rankRes] = await Promise.all([
        axiosClient.get("/me"),
        axiosClient.get("/products"),
        axiosClient.get("/content-structures"),
        axiosClient.get("/customers/rank-settings").catch(() => null),
      ]);

      const meData = meRes.data?.data || meRes.data || null;
      setMe(meData);

      fillData(productRes.data, structureRes.data);
      setCustomerRankRules(
        normalizeCustomerRankRules(rankRes?.data?.data?.rules || []),
      );

      setTabs((prev) =>
        prev.map((x, i) => ({
          ...x,
          staffId: x.staffId || String(meData?.id || ""),
          name: `Don ${i + 1}`,
        })),
      );
    } catch (e) {
      showDanger(e?.response?.data?.message || e.message || "Load failed");
    } finally {
      if (show) setLoadingPage(false);
    }
  }

  function addTab() {
    const newTab = makeOrder(tabs.length + 1, String(me?.id || ""));
    setTabs((prev) => [...prev, newTab]);
    setTabId(newTab.id);
  }

  function closeTab(id) {
    setTabs((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx < 0) return prev;

      const isFirst = idx === 0 || prev[idx]?.name === "Don 1";

      if (isFirst) {
        const reset = makeOrder(1, String(me?.id || ""));
        const next = renameOrders(prev.map((x, i) => (i === 0 ? reset : x)));
        setTabId(reset.id);
        return next;
      }

      const next = renameOrders(prev.filter((x) => x.id !== id));
      if (id === tabId) {
        setTabId(next[0]?.id || "");
      }
      return next;
    });
  }

  function confirmCloseTab() {
    if (!waitCloseId) return;
    closeTab(waitCloseId);
    setWaitCloseId("");
  }

  function addProduct(product) {
    setOrder((o) => {
      const items = compactItems(o.items);
      const stock = Number(product.quantity || 0);
      const usedQty = getUsedQty(items, product.id);

      if (usedQty >= stock) {
        showDanger(`San pham nay chi con ${stock} trong kho`);
        return o;
      }

      const sameIdx = items.findIndex(
        (x) => x && String(x.productId) === String(product.id),
      );

      if (!splitLine && sameIdx >= 0) {
        const nextQty = Math.min(Number(items[sameIdx].qty || 0) + 1, stock);
        items[sameIdx] = {
          ...items[sameIdx],
          qty: nextQty,
        };
        return { ...o, items };
      }

      return {
        ...o,
        items: [...items, { productId: product.id, qty: 1, note: "" }],
      };
    });

    setKey("");
    setOpenDrop(false);

    requestAnimationFrame(() => {
      searchRef.current?.blur();
    });
  }

  function changeQty(idx, delta) {
    setOrder((o) => {
      const items = compactItems(o.items);
      const item = items[idx];
      if (!item) return o;

      const product = productMap.get(String(item.productId));
      const stock = Number(product?.quantity || 0);
      const usedOtherLines = getUsedQtyExceptIndex(items, item.productId, idx);
      const maxQtyForThisLine = Math.max(0, stock - usedOtherLines);

      const nextQty = Math.max(
        0,
        Math.min(Number(item.qty || 0) + delta, maxQtyForThisLine),
      );

      if (nextQty <= 0) {
        const nextItems = items.filter((_, i) => i !== idx);
        return { ...o, items: nextItems };
      }

      items[idx] = { ...item, qty: nextQty };
      return { ...o, items };
    });

    setLineNotes({});
  }

  function setNote(idx, value) {
    setOrder((o) => {
      const items = compactItems(o.items);
      if (!items[idx]) return o;
      items[idx] = { ...items[idx], note: value };
      return { ...o, items };
    });
  }

  function removeLine(idx) {
    setOrder((o) => ({
      ...o,
      items: compactItems(o.items).filter((_, i) => i !== idx),
    }));

    setLineNotes({});
  }

  function clearAll() {
    if (!activeLines.length) return;
    const ok = window.confirm(
      "Ban co chac muon xoa toan bo san pham trong don nay khong?",
    );
    if (!ok) return;

    setOrder((o) => ({ ...o, items: [] }));
    setLineNotes({});
    showSuccess("Da xoa tat ca san pham trong order");
  }

  function pickCustomer(customer) {
    setOrder((o) => ({ ...o, customer }));
    setCusKey(customer?.name || "");
    setOpenCus(false);
  }

  function clearCustomer() {
    setOrder((o) => ({ ...o, customer: null }));
    setCusKey("");
    setCusList([]);
    setOpenCus(false);
  }

  function setDiscount() {
    setDiscountTab(order?.discountType || "value");
    setDiscountInput(String(order?.discountValue || 0));
    setShowDiscountPopup(true);
  }

  function handleConfirmDiscount() {
    const n = Number(discountInput);

    setOrder((o) => ({
      ...o,
      discountType: discountTab,
      discountValue: Number.isFinite(n) ? Math.max(0, n) : 0,
    }));

    setShowDiscountPopup(false);
    setDiscountInput("");
  }

  function openCreateCustomerPopup() {
    setCustomerForm(customerEmptyForm);
    setCustomerErrors({});
    setShowCreateCustomerPopup(true);
  }

  function closeCreateCustomerPopup() {
    setShowCreateCustomerPopup(false);
    setCustomerForm(customerEmptyForm);
    setCustomerErrors({});
  }

  function handleCustomerBaseChange(e) {
    const { name, value } = e.target;

    setCustomerForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setCustomerErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  }

  async function handleCreateCustomerSubmit(e) {
    e.preventDefault();
    setCustomerSaving(true);
    setCustomerErrors({});
    try {
      const phone = String(customerForm.phone || "").replace(/[^0-9]/g, "");
      const payload = {
        name: String(customerForm.name || "").trim(),
        phone,
        address: String(customerForm.address || "").trim(),
        loyalty_points: sanitizeRankPoints(customerForm.loyalty_points),
      };
      if (!payload.name) {
        showDanger("Vui long nhap ten khach hang");
        setCustomerSaving(false);
        return;
      }
      if (!/^[0-9]{10}$/.test(phone)) {
        showDanger("So dien thoai phai gom dung 10 chu so");
        setCustomerSaving(false);
        return;
      }
      const checkRes = await axiosClient.get("/customers", {
        params: { q: phone },
      });
      const existingCustomers =
        checkRes.data?.data?.data || checkRes.data?.data || [];
      const isDuplicate = existingCustomers.some(
        (c) => String(c.phone || "").trim() === phone,
      );
      if (isDuplicate) {
        setCustomerErrors((prev) => ({
          ...prev,
          phone: ["So dien thoai da ton tai"],
        }));
        showDanger("So dien thoai da ton tai");
        setCustomerSaving(false);
        return;
      }
      const res = await axiosClient.post("/customers", payload);
      const newCustomer = res.data?.data || null;
      showSuccess("Them moi khach hang thanh cong");
      if (newCustomer) {
        setOrder((o) => ({
          ...o,
          customer: newCustomer,
        }));
        setCusKey(newCustomer.name || "");
      }
      closeCreateCustomerPopup();
    } catch (error) {
      if (error.response?.status === 422) {
        setCustomerErrors(error.response.data?.errors || {});
        showDanger(
          error.response.data?.errors?.phone?.[0] || "Du lieu chua hop le",
        );
      } else {
        showDanger("Co loi xay ra khi luu khach hang");
      }
    } finally {
      setCustomerSaving(false);
    }
  }

  async function saveOrder() {
    if (!order || activeLines.length === 0) {
      showDanger("Chua co san pham de tao don");
      return;
    }

    if (payMethod === "cash" && paid < total) {
      showDanger("Tien khach dua chua du");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        customerId: order?.customer?.id || null,
        staffId: order?.staffId
          ? String(order.staffId)
          : me?.id
            ? String(me.id)
            : null,
        note: String(order?.note || "").trim(),
        items: activeLines.map((x) => ({
          productId: x.product.id,
          qty: Number(x.qty || 0),
          price: Number(x.product.price || 0),
          note: String(x.note || "").trim(),
        })),
        discountCode: null,
        paymentMethod: payMethod,
        payment: {
          cashReceived: payMethod === "cash" ? Number(cashIn || 0) : null,
          changeAmount: payMethod === "cash" ? Number(change || 0) : 0,
        },
        totals: {
          subtotal: Number(sub || 0),
          discount: Number(discount || 0),
          total: Number(total || 0),
        },
      };

      const res = await axiosClient.post("/orders", payload);
      const orderNo = res.data?.data?.order_no || "";
      const earnedPoints = Number(res.data?.data?.earned_points || 0);
      const customerName = order?.customer?.name || "khach hang";

      showSuccess(`Tao don thanh cong. Ma don: ${orderNo}`);

      await loadAll();

      setOrder((o) => ({
        ...o,
        items: [],
        customer: null,
        note: "",
        staffId: String(me?.id || ""),
        discountType: "value",
        discountValue: 0,
      }));

      setCusKey("");
      setCashIn("");
      setOpenCus(false);
      setLineNotes({});
      setPayMethod("cash");
    } catch (e) {
      showDanger(e?.response?.data?.message || e.message || "Checkout failed");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    setTabId((prev) => prev || tabs[0]?.id || "");
  }, [tabs]);

  useEffect(() => {
    loadAll(true);
  }, []);

  // Auto-save tabs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(POS_TABS_KEY, JSON.stringify(tabs));
    } catch {}
  }, [tabs]);

  useEffect(() => {
    try {
      localStorage.setItem(POS_TABID_KEY, tabId);
    } catch {}
  }, [tabId]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const q = cusKey.trim();

      if (!q) {
        setCusList([]);
        return;
      }

      try {
        const res = await axiosClient.get("/customers", {
          params: { q },
        });
        setCusList(res.data?.data?.data || []);
      } catch {
        setCusList([]);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [cusKey]);
  const currentCustomerRankPreview = useMemo(
    () =>
      resolveCustomerRankName(customerForm.loyalty_points, customerRankRules),
    [customerForm.loyalty_points, customerRankRules],
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "F1") {
        e.preventDefault();
        submitBtnRef.current?.click();
        return;
      }

      if (e.key === "F2") {
        e.preventDefault();
        // customerRef.current?.focus();
        setOpenCus(true);
        return;
      }

      if (e.key === "F3") {
        e.preventDefault();
        // searchRef.current?.focus();
        setOpenDrop(true);
        return;
      }

      if (e.key === "F4") {
        e.preventDefault();
        cashRef.current?.focus();
        return;
      }

      if (e.key === "F6") {
        e.preventDefault();
        setShowDiscountPopup(true);
        return;
      }

      if (!waitCloseId) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setWaitCloseId("");
      }

      if (e.key === "F8") {
        e.preventDefault();
        confirmCloseTab();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [waitCloseId]);

  useEffect(() => {
    const onClick = (e) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setOpenDrop(false);
      }

      if (
        customerWrapRef.current &&
        !customerWrapRef.current.contains(e.target)
      ) {
        setOpenCus(false);
      }
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const headerNode = useMemo(
    () => (
      <div className="pos-top">
        <div className="pos-search" ref={searchWrapRef}>
          <div className="card-shortcut">
            <input
              ref={searchRef}
              type="text"
              className="pos-search-input"
              placeholder="Nhap ten san pham hoac ma SKU"
              value={key}
              onMouseDown={() => setOpenDrop(true)}
              // onFocus={() => setOpenDrop(true)}
              onKeyDown={(e) => {
                const ignore = [
                  "Shift",
                  "Control",
                  "Alt",
                  "Meta",
                  "CapsLock",
                  "Escape",
                ];
                if (!ignore.includes(e.key)) setOpenDrop(true);
              }}
              onChange={(e) => setKey(e.target.value)}
            />
            <span className="shortcut-label">F3</span>
          </div>

          {openDrop && (
            <div className="pos-drop">
              <div className="pos-drop-list">
                {dropProducts.length > 0 ? (
                  dropProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="pos-sug"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addProduct(p);
                      }}
                    >
                      <div className="pos-sug-thumb-wrap">
                        {p.thumbnail ? (
                          <img
                            className="pos-sug-thumb"
                            src={toAbsoluteImageUrl(p.thumbnail)}
                            alt={p.name}
                          />
                        ) : (
                          <div className="pos-sug-thumb pos-sug-thumb-empty">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="pos-sug-main">
                        <div className="pos-sug-row">
                          <span className="pos-sug-name">{p.name}</span>
                          <span className="pos-sug-price">
                            {money(p.price)}
                          </span>
                        </div>
                        <div className="pos-sug-meta">
                          <span className="pos-sug-sku">{p.sku}</span>
                          <span className="pos-sug-dot">-</span>
                          <span className="pos-sug-stock">
                            Ton: {p.quantity}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="pos-empty-search">
                    Khong tim thay san pham phu hop
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="pos-tabs">
          {tabs.map((x, i) => (
            <button
              key={x.id}
              type="button"
              className={`pos-tab ${tabId === x.id ? "active" : ""}`}
              onClick={() => setTabId(x.id)}
            >
              <span>{x.name || `Don ${i + 1}`}</span>
              <span
                className="pos-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  setWaitCloseId(x.id);
                }}
              >
                x
              </span>
            </button>
          ))}

          <button type="button" className="pos-tab-add" onClick={addTab}>
            +
          </button>
        </div>
      </div>
    ),
    [key, openDrop, dropProducts, tabs, tabId],
  );

  useEffect(() => {
    setHeaderContent(headerNode);
    return () => setHeaderContent(null);
  }, [headerNode, setHeaderContent]);

  if (loadingPage) {
    return <div className="pos-load">Dang tai du lieu...</div>;
  }

  return (
    <div className="pos-page">
      <div className="pos-wrap">
        <section className="pos-left">
          <div className="pos-box">
            <div className="pos-head">
              <div className="pos-title">
                San pham <strong>({activeLines.length})</strong>
              </div>

              <div className="pos-actions">
                <label className="pos-check">
                  <input
                    type="checkbox"
                    checked={splitLine}
                    onChange={(e) => setSplitLine(e.target.checked)}
                  />
                  <span>Tach dong san pham</span>
                </label>

                <button
                  type="button"
                  className="pos-clear"
                  onClick={clearAll}
                  disabled={activeLines.length === 0}
                >
                  Xoa tat ca
                </button>
              </div>
            </div>

            {activeLines.length === 0 ? (
              <div className="pos-pick">
                <div className="pos-empty pos-empty-sm">
                  <div className="pos-empty-icon">$</div>
                  <div className="pos-empty-text">
                    Ban chua them san pham nao
                  </div>
                  <div className="pos-empty-sub">
                    An F3 de tim kiem nhanh san pham
                  </div>
                </div>
              </div>
            ) : (
              <div className="cart-list">
                {lines.map((line) => {
                  const lk = `${line.product.id}-${line.idx}`;
                  const open = !!lineNotes[lk];
                  const thumbSrc = line.product.thumbnail
                    ? toAbsoluteImageUrl(line.product.thumbnail)
                    : "";

                  return (
                    <div
                      className={`cart-row ${open ? "is-open" : ""}`}
                      key={lk}
                    >
                      <div className="cart-main">
                        <div className="cart-top">
                          <div className="cart-thumb-wrap">
                            {thumbSrc ? (
                              <img
                                className="cart-thumb"
                                src={thumbSrc}
                                alt={line.product.name}
                              />
                            ) : (
                              <div className="cart-thumb cart-thumb-empty">
                                No image
                              </div>
                            )}
                          </div>

                          <div
                            className="cart-info"
                            onClick={() => addProduct(line.product)}
                          >
                            <h4 className="cart-name">{line.product.name}</h4>
                            <div className="cart-info-meta">
                              <span className="cart-sku">
                                {line.product.sku || "N/A"}
                              </span>
                              <span className="cart-sep">-</span>
                              <span className="cart-stock">
                                Ton: {line.product.quantity}
                              </span>
                              <span className="cart-sep">-</span>
                              <span className="cart-price">
                                {money(line.product.price)}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="cart-delete-btn btn_delete"
                            onClick={() => removeLine(line.idx)}
                          >
                            x
                          </button>
                        </div>

                        {/* Row 2: qty + total */}
                        <div className="cart-bottom">
                          <div className="cart-qty">
                            <button
                              type="button"
                              onClick={() => changeQty(line.idx, -1)}
                            >
                              -
                            </button>
                            <span>{line.qty}</span>
                            <button
                              type="button"
                              onClick={() => changeQty(line.idx, 1)}
                            >
                              +
                            </button>
                          </div>
                          <div className="cart-total">{money(line.total)}</div>
                        </div>

                        {!open ? (
                          <button
                            type="button"
                            className="cart-note-btn"
                            onClick={() =>
                              setLineNotes((prev) => ({ ...prev, [lk]: true }))
                            }
                          >
                            Ghi chu
                          </button>
                        ) : (
                          <div className="cart-note-wrap">
                            <textarea
                              className="cart-note"
                              placeholder="Nhap ghi chu cho san pham"
                              value={line.note || ""}
                              onChange={(e) =>
                                setNote(line.idx, e.target.value)
                              }
                              onBlur={() => {
                                if (!(line.note || "").trim()) {
                                  setLineNotes((prev) => ({
                                    ...prev,
                                    [lk]: false,
                                  }));
                                }
                              }}
                              autoFocus
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pos-grid">
            <div className="pos-card">
              Sapo Invoice
              <br />
              <span>Can thiet lap mau hoa don</span>
            </div>

            <div className="pos-card">
              Nhan vien xu ly
              <br />
              <span>
                {staff.find((x) => String(x.id) === String(order?.staffId))
                  ?.name ||
                  me?.name ||
                  "Chua chon"}
              </span>
            </div>
          </div>

          <div className="pos-form">
            <input
              className="pos-input"
              placeholder="Nhap ghi chu don hang"
              value={order?.note || ""}
              onChange={(e) =>
                setOrder((o) => ({
                  ...o,
                  note: e.target.value,
                }))
              }
            />
            <div className="pos-custom">
              <button type="button" className="pos-custom-btn">
                + San pham tuy chinh
              </button>
            </div>
          </div>
        </section>

        <aside className="pos-right">
          <div className="pos-box pos-sum">
            {!order?.customer ? (
              <div className="cus-search" ref={customerWrapRef}>
                <div className="card-shortcut">
                  <input
                    ref={customerRef}
                    className="cus-input"
                    placeholder="Tim kiem khach hang"
                    value={cusKey}
                    // onFocus={() => setOpenCus(true)}
                    onChange={(e) => {
                      setCusKey(e.target.value);
                      setOpenCus(true);
                    }}
                  />
                  <span className="shortcut-label">F2</span>
                </div>
                <button
                  type="button"
                  className="btn_success"
                  onClick={openCreateCustomerPopup}
                >
                  +
                </button>
                {openCus && (
                  <div className="cus-drop">
                    {cusList.length > 0 ? (
                      cusList.map((x) => (
                        <button
                          key={x.id}
                          type="button"
                          className="cus-item"
                          onClick={() => pickCustomer(x)}
                        >
                          <strong>{x.name}</strong>
                          <span>{x.phone || ""}</span>
                        </button>
                      ))
                    ) : (
                      <div className="cus-empty">
                        Khong co khach hang phu hop
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="cus-picked">
                <div>
                  <div className="cus-picked-name">{order.customer.name}</div>
                  <div className="cus-picked-phone">
                    SDT: {order.customer.phone || "Chua co"}
                  </div>
                </div>
                <div className="cus-change">
                  <button type="button" onClick={clearCustomer}>
                    Doi khach
                  </button>
                </div>
              </div>
            )}

            <div className="sum-body">
              <div className="sum-row">
                <span>Tam tinh ({qty} san pham)</span>
                <strong>{money(sub)}</strong>
              </div>

              <div className="sum-row">
                <div className="card-shortcut">
                  <button
                    type="button"
                    className="sum-discount"
                    onClick={setDiscount}
                  >
                    Giam gia:
                    {rawDiscountType === "percent"
                      ? `${rawDiscountValue}%`
                      : money(rawDiscountValue)}
                  </button>
                  <span className="shortcut-label-2">F6</span>
                </div>
                <strong>{money(discount)}</strong>
              </div>

              <div className="sum-row">
                <span>Thanh tien</span>
                <strong>{money(total)}</strong>
              </div>

              {payMethod === "cash" && (
                <>
                  <div className="sum-row">
                    <span>Khach dua</span>
                    <strong>{money(paid)}</strong>
                  </div>

                  <div className="sum-row">
                    <span>Tien thua</span>
                    <strong>{money(change)}</strong>
                  </div>
                </>
              )}

              <div className="sum-total">
                <span>
                  {payMethod === "cash" ? "Can thu" : "Da ghi nhan thanh toan"}
                </span>
                <strong>{money(total)}</strong>
              </div>
            </div>
          </div>

          <div className="pay-box">
            <label className="pos-check">
              <input
                type="checkbox"
                checked={!!order?.autoPrintInvoice}
                onChange={(e) =>
                  setOrder((o) => ({
                    ...o,
                    autoPrintInvoice: e.target.checked,
                  }))
                }
              />
              <span>In hoa don tu dong</span>
            </label>

            <div className="pay-row">
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
              >
                <option value="cash">Tien mat</option>
                <option value="bank_transfer">Chuyen khoan</option>
                <option value="card">The</option>
              </select>

              {payMethod === "cash" ? (
                <div className="card-shortcut">
                  <input
                    ref={cashRef}
                    type="number"
                    placeholder="Nhap so tien khach dua"
                    value={cashIn}
                    onChange={(e) => setCashIn(e.target.value)}
                  />
                  <span className="shortcut-label">F4</span>
                </div>
              ) : (
                <input
                  type="text"
                  value="Thanh toan du theo tong don"
                  readOnly
                />
              )}
            </div>

            {payMethod === "cash" && due > 0 ? (
              <div className="pay-note">Con thieu {money(due)}</div>
            ) : (
              <div className="pay-note ok">
                {payMethod === "cash"
                  ? "Da du dieu kien thanh toan"
                  : "Don se duoc luu voi trang thai da thanh toan"}
              </div>
            )}

            <div className="card-shortcut">
              <button
                ref={submitBtnRef}
                type="button"
                className="pay-btn"
                onClick={saveOrder}
                disabled={saving}
              >
                {saving ? "Dang xu ly..." : "Tao don"}
              </button>
              <span className="shortcut-label">F1</span>
            </div>
          </div>
        </aside>
      </div>

      {waitCloseId && (
        <div className="card-popup" onClick={() => setShowDiscountPopup(false)}>
          <div className="popup-md">
            <div className="popup-header">
              <div className="popup-title">
                {tabs.find((x) => x.id === waitCloseId)?.name ||
                  "Dong don hang"}
              </div>

              <button
                type="button"
                className="popup-close"
                onClick={() => setWaitCloseId("")}
              >
                x
              </button>
            </div>

            <p>He thong se khong luu lai thong tin cua don hang nay.</p>
            <p>Ban co chac chan xoa don hang nay khong?</p>

            <div className="popup-footer">
              <button
                type="button"
                className="btn_success"
                onClick={() => setWaitCloseId("")}
              >
                Tiep tuc giao dich (ESC)
              </button>

              <button
                type="button"
                className="btn_delete"
                onClick={confirmCloseTab}
              >
                Xac nhan (F8)
              </button>
            </div>
          </div>
        </div>
      )}

      {showDiscountPopup && (
        <div className="card-popup" onClick={() => setShowDiscountPopup(false)}>
          <form
            className="popup-sm"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              handleConfirmDiscount();
            }}
          >
            <div className="popup-header">
              <h3 className="popup-title">Nhap giam gia</h3>
              <button
                type="button"
                className="popup-close"
                onClick={() => setShowDiscountPopup(false)}
              >
                x
              </button>
            </div>

            <div className="popup-body">
              <div className="discount-tabs">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  className="popup-input"
                  placeholder={
                    discountTab === "percent" ? "Nhap %" : "Nhap so tien"
                  }
                />
                <button
                  type="button"
                  className={`discount-tab ${
                    discountTab === "percent" ? "active" : ""
                  }`}
                  onClick={() => setDiscountTab("percent")}
                >
                  %
                </button>

                <button
                  type="button"
                  className={`discount-tab ${
                    discountTab === "value" ? "active" : ""
                  }`}
                  onClick={() => setDiscountTab("value")}
                >
                  VND
                </button>
              </div>

              <div className="discount-hint">
                {discountTab === "percent"
                  ? "*Giam theo phan tram tren tong don"
                  : "*Giam theo so tien truc tiep"}
              </div>

              <div className="popup-footer">
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscountPopup(false);
                    setDiscountInput("");
                  }}
                >
                  Huy
                </button>

                <button type="submit" className="btn_success">
                  Xac nhan
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {showCreateCustomerPopup && (
        <div className="card-popup" onClick={closeCreateCustomerPopup}>
          <div className="popup-sm" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2>Tạo khách hàng mới</h2>
              <button type="button" onClick={closeCreateCustomerPopup}>
                Đóng
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="popup-body">
              <div className="popup-field">
                <label className="popup-label">Ten khach hang</label>
                <input
                  className="popup-input"
                  name="name"
                  value={customerForm.name}
                  onChange={handleCustomerBaseChange}
                  placeholder="Nhap ten khach hang"
                />
                {customerErrors.name?.[0] && (
                  <div className="popup-error">{customerErrors.name[0]}</div>
                )}
              </div>
              <div className="popup-field">
                <label className="popup-label">So dien thoai</label>
                <input
                  className="popup-input"
                  name="phone"
                  value={customerForm.phone}
                  onChange={(e) => {
                    let value = e.target.value.replace(/[^0-9]/g, "");
                    if (value.length <= 10) {
                      handleCustomerBaseChange({
                        target: { name: "phone", value },
                      });
                    }
                  }}
                  placeholder="Nhap so dien thoai"
                />
                {customerErrors.phone?.[0] && (
                  <div className="popup-error">{customerErrors.phone[0]}</div>
                )}
              </div>
              <div className="popup-field">
                <label className="popup-label">Dia chi</label>
                <textarea
                  className="popup-textarea"
                  name="address"
                  value={customerForm.address}
                  onChange={handleCustomerBaseChange}
                  placeholder="Nhap dia chi khach hang"
                />
                {customerErrors.address?.[0] && (
                  <div className="popup-error">{customerErrors.address[0]}</div>
                )}
              </div>
              <div className="popup-field">
                <label className="popup-label">Diem tich luy</label>
                <input
                  className="popup-input"
                  type="number"
                  min="0"
                  name="loyalty_points"
                  value={customerForm.loyalty_points}
                  onChange={(e) =>
                    handleCustomerBaseChange({
                      target: {
                        name: "loyalty_points",
                        value: e.target.value === "" ? "0" : e.target.value,
                      },
                    })
                  }
                  placeholder="Nhap diem tich luy"
                />
                {customerErrors.loyalty_points?.[0] && (
                  <div className="popup-error">
                    {customerErrors.loyalty_points[0]}
                  </div>
                )}
              </div>
              <div className="popup-field">
                <label className="popup-label">Hang hien tai</label>
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--r-md, 12px)",
                    background: "var(--bg-2, #f5f5f7)",
                    color: "var(--text-1, #1c1c1e)",
                    fontWeight: 600,
                  }}
                >
                  {currentCustomerRankPreview}
                </div>
              </div>

              <div className="popup-footer">
                <button
                  type="button"
                  onClick={closeCreateCustomerPopup}
                  disabled={customerSaving}
                >
                  Huy
                </button>
                <button
                  type="submit"
                  className="btn_success"
                  disabled={customerSaving}
                >
                  {customerSaving ? "Dang luu..." : "Tao khach hang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
