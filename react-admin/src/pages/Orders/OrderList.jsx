import React, { useEffect, useMemo, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { SkeletonTableRows } from "../../components/Loading/Loading";

/* ── helpers ─────────────────────────────────────────── */
function getApiMessage(e, fb = "Lỗi") { return e?.response?.data?.message || e?.message || fb; }
const money = (n) => Number(n || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });
const fmtDate = (v) => { if (!v) return "—"; const d = new Date(v); return isNaN(d) ? v : d.toLocaleDateString("vi-VN"); };

const STATUS_LABEL = { paid: "Đã thanh toán", partial: "Một phần", unpaid: "Chưa thanh toán" };
const STATUS_CLS   = { paid: "ol-badge--paid", partial: "ol-badge--partial", unpaid: "ol-badge--unpaid" };
const PAY_LABEL    = { cash: "Tiền mặt", bank_transfer: "Chuyển khoản", card: "Thẻ" };

/* ── Export CSV ──────────────────────────────────────── */
function exportCSV(rows, filename) {
  if (!rows.length) return;
  const header = Object.keys(rows[0]).join(",");
  const body   = rows.map(r => Object.values(r).map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob   = new Blob(["\uFEFF" + header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ── Normalize ───────────────────────────────────────── */
function normalizeOrder(row) {
  return {
    id: String(row?.id ?? ""),
    code: row?.code || row?.invoice_code || `#${row?.id ?? ""}`,
    customerName: row?.customer_name || "Khách lẻ",
    date: row?.invoice_date || row?.date || row?.created_at || "",
    total: Number(row?.grand_total ?? row?.total_amount ?? row?.total ?? 0),
    paid: Number(row?.paid_amount ?? row?.paid ?? 0),
    due: Number(row?.due_amount ?? Math.max(Number(row?.grand_total ?? row?.total ?? 0) - Number(row?.paid_amount ?? row?.paid ?? 0), 0)),
    paymentMethod: row?.payment_method || row?.payment_type || "cash",
    status: row?.payment_status || row?.status || "unpaid",
  };
}

function normalizeDetail(row) {
  return {
    id: String(row?.id ?? ""),
    code: row?.code || row?.invoice_code || `#${row?.id ?? ""}`,
    customerName: row?.customer_name || "Khách lẻ",
    date: row?.invoice_date || row?.date || row?.created_at || "",
    subtotal: Number(row?.subtotal ?? 0),
    discount: Number(row?.discount ?? 0),
    total: Number(row?.grand_total ?? row?.total_amount ?? row?.total ?? 0),
    paid: Number(row?.paid_amount ?? row?.paid ?? 0),
    due: Number(row?.due_amount ?? 0),
    paymentMethod: row?.payment_method || row?.payment_type || "cash",
    status: row?.payment_status || row?.status || "unpaid",
    cashReceived: Number(row?.cash_received ?? 0),
    changeAmount: Number(row?.change_amount ?? 0),
    items: Array.isArray(row?.items) ? row.items.map(item => ({
      id: String(item?.id ?? ""),
      productName: item?.product_name || "N/A",
      sku: item?.sku || "—",
      qty: Number(item?.qty ?? 0),
      price: Number(item?.price ?? 0),
      lineTotal: Number(item?.line_total ?? 0),
      note: item?.note || "",
    })) : [],
  };
}

/* ── Stat card ───────────────────────────────────────── */
function StatCard({ label, value, icon, color }) {
  return (
    <div className="ol-stat">
      <div className="ol-stat-icon" style={{ background: `${color}18`, color }}>{icon}</div>
      <div className="ol-stat-body">
        <span className="ol-stat-label">{label}</span>
        <strong className="ol-stat-val">{value}</strong>
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────── */
export default function OrderList() {
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [pageError, setPageError]   = useState("");
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDL]      = useState(false);
  const [detailError, setDE]        = useState("");
  const [selected, setSelected]     = useState(null);

  useEffect(() => {
    let ignore = false;
    setLoading(true); setPageError("");
    axiosClient.get("/orders")
      .then(res => {
        if (ignore) return;
        const raw = Array.isArray(res?.data) ? res.data
          : Array.isArray(res?.data?.data) ? res.data.data
          : Array.isArray(res?.data?.orders) ? res.data.orders : [];
        setOrders(raw.map(normalizeOrder));
      })
      .catch(err => { if (!ignore) { setOrders([]); setPageError(getApiMessage(err)); } })
      .finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [refreshKey]);

  async function openDetail(id) {
    setDetailOpen(true); setDL(true); setDE(""); setSelected(null);
    try {
      const res = await axiosClient.get(`/orders/${id}`);
      setSelected(normalizeDetail(res?.data?.data || res?.data));
    } catch (e) { setDE(getApiMessage(e)); }
    finally { setDL(false); }
  }
  function closeDetail() { setDetailOpen(false); setSelected(null); setDE(""); }

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return orders.filter(o => {
      const ms = !kw || o.code.toLowerCase().includes(kw) || o.customerName.toLowerCase().includes(kw);
      const mf = statusFilter === "all" || o.status === statusFilter;
      return ms && mf;
    });
  }, [orders, search, statusFilter]);

  const stats = useMemo(() => filtered.reduce(
    (a, o) => ({ count: a.count+1, total: a.total+o.total, paid: a.paid+o.paid, due: a.due+o.due }),
    { count:0, total:0, paid:0, due:0 }
  ), [filtered]);

  function handleExport() {
    exportCSV(filtered.map(o => ({
      "Mã đơn": o.code,
      "Khách hàng": o.customerName,
      "Ngày": fmtDate(o.date),
      "Tổng tiền": o.total,
      "Đã thu": o.paid,
      "Còn nợ": o.due,
      "Thanh toán": PAY_LABEL[o.paymentMethod] || o.paymentMethod,
      "Trạng thái": STATUS_LABEL[o.status] || o.status,
    })), `don-hang-${new Date().toISOString().slice(0,10)}.csv`);
  }

  const IconMoney = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
  const IconBox   = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
  const IconCheck = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9.5h18M7 14.5h3"/></svg>;
  const IconWarn  = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

  return (
    <div className="ol-page">

      {/* ── Header ── */}
      <div className="ol-header">
        <div>
          <h1 className="ol-title">Đơn hàng</h1>
          <p className="ol-sub">{stats.count} đơn hàng</p>
        </div>
        <div className="ol-header-actions">
          <button type="button" className="ol-btn ol-btn--ghost" onClick={() => setRefreshKey(v => v+1)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Làm mới
          </button>
          <button type="button" className="ol-btn ol-btn--primary" onClick={handleExport} disabled={filtered.length === 0}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Xuất CSV
          </button>
        </div>
      </div>

      {pageError && <div className="ol-error">{pageError}</div>}

      {/* ── Stats ── */}
      <div className="ol-stats">
        <StatCard label="Doanh thu" value={money(stats.total)} icon={IconMoney} color="#007aff" />
        <StatCard label="Tổng đơn"  value={stats.count}        icon={IconBox}   color="#16a34a" />
        <StatCard label="Đã thu"    value={money(stats.paid)}  icon={IconCheck} color="#34c759" />
        <StatCard label="Còn nợ"    value={money(stats.due)}   icon={IconWarn}  color="#ff9f0a" />
      </div>

      {/* ── Toolbar ── */}
      <div className="ol-toolbar">
        <div className="ol-search-wrap">
          <svg className="ol-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="ol-search"
            type="text"
            placeholder="Tìm mã đơn, khách hàng..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="ol-search-clear" onClick={() => setSearch("")} type="button">×</button>
          )}
        </div>
        <div className="ol-status-tabs">
          {[["all","Tất cả"],["paid","Đã TT"],["partial","Một phần"],["unpaid","Chưa TT"]].map(([v,l]) => (
            <button key={v} type="button"
              className={`ol-status-tab${statusFilter===v?" is-active":""}`}
              onClick={() => setStatus(v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="ol-table-wrap card-table">
        <table>
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th className="pc">Khách hàng</th>
              <th>Ngày</th>
              <th className="pc" style={{textAlign:"right"}}>Tổng tiền</th>
              <th className="pc" style={{textAlign:"right"}}>Đã thu</th>
              <th className="pc" style={{textAlign:"right"}}>Còn nợ</th>
              <th className="pc">Thanh toán</th>
              <th>Trạng thái</th>
              <th style={{width:60}}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonTableRows rows={7} cols={9} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="9">
                  <div className="ol-empty">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 2v20l3-2 2 2 3-2 3 2 2-2 3 2V2l-3 2-2-2-3 2-3-2-2 2-3-2z"/>
                      <line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="13" y2="13"/>
                    </svg>
                    <p>Không có đơn hàng nào</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map(o => (
              <tr key={o.id} className="ol-row" onClick={() => openDetail(o.id)}>
                <td><span className="ol-code">{o.code}</span></td>
                <td className="pc">
                  <div className="ol-customer">
                    <span className="ol-avatar">{(o.customerName||"K").charAt(0).toUpperCase()}</span>
                    <span>{o.customerName}</span>
                  </div>
                </td>
                <td className="ol-date">{fmtDate(o.date)}</td>
                <td className="pc ol-num">{money(o.total)}</td>
                <td className="pc ol-num ol-num--green">{money(o.paid)}</td>
                <td className="pc ol-num ol-num--red">{o.due > 0 ? money(o.due) : "—"}</td>
                <td className="pc">
                  <span className="ol-pay-chip">{PAY_LABEL[o.paymentMethod] || o.paymentMethod}</span>
                </td>
                <td>
                  <span className={`ol-badge ${STATUS_CLS[o.status]||""}`}>
                    {STATUS_LABEL[o.status] || o.status}
                  </span>
                </td>
                <td onClick={e => e.stopPropagation()}>
                  <button type="button" className="ol-view-btn" onClick={() => openDetail(o.id)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Detail modal ── */}
      {detailOpen && (
        <div className="card-popup" onClick={closeDetail}>
          <div className="popup-lg" onClick={e => e.stopPropagation()}>
            <div className="popup-header">
              <h3 className="popup-title">
                {selected ? `Chi tiết đơn ${selected.code}` : "Chi tiết đơn hàng"}
              </h3>
              <button className="popup-close" onClick={closeDetail}>✕</button>
            </div>

            <div className="popup-body">
              {detailLoading ? (
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"24px 0",color:"var(--text-3)"}}>
                  <svg className="ld-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                  Đang tải...
                </div>
              ) : detailError ? (
                <div className="ol-error">{detailError}</div>
              ) : selected ? (
                <>
                  {/* Info grid */}
                  <div className="ol-detail-grid">
                    {[
                      ["Mã đơn",       selected.code],
                      ["Khách hàng",   selected.customerName],
                      ["Ngày",         fmtDate(selected.date)],
                      ["Thanh toán",   PAY_LABEL[selected.paymentMethod] || selected.paymentMethod],
                      ["Trạng thái",   STATUS_LABEL[selected.status] || selected.status],
                      ["Tiền khách đưa", money(selected.cashReceived)],
                    ].map(([l,v]) => (
                      <div key={l} className="ol-detail-cell">
                        <span className="ol-detail-label">{l}</span>
                        <strong className="ol-detail-val">{v}</strong>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="ol-summary">
                    {[
                      ["Tạm tính",     money(selected.subtotal),     false],
                      ["Giảm giá",     `- ${money(selected.discount)}`, false],
                      ["Tổng cộng",    money(selected.total),         true],
                      ["Đã thanh toán",money(selected.paid),          false],
                      ["Tiền thối",    money(selected.changeAmount),  false],
                    ].map(([l,v,bold]) => (
                      <div key={l} className={`ol-sum-row${bold?" ol-sum-row--total":""}`}>
                        <span>{l}</span>
                        <strong>{v}</strong>
                      </div>
                    ))}
                  </div>

                  {/* Items */}
                  <div className="ol-items-head">Sản phẩm trong đơn</div>
                  <div className="card-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Sản phẩm</th>
                          <th>SKU</th>
                          <th style={{textAlign:"center"}}>SL</th>
                          <th style={{textAlign:"right"}}>Đơn giá</th>
                          <th style={{textAlign:"right"}}>Thành tiền</th>
                          <th>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected.items.length === 0 ? (
                          <tr><td colSpan="6" style={{textAlign:"center",padding:"20px",color:"var(--text-4)"}}>Không có sản phẩm</td></tr>
                        ) : selected.items.map(item => (
                          <tr key={item.id}>
                            <td style={{fontWeight:600}}>{item.productName}</td>
                            <td style={{color:"var(--text-3)",fontSize:13}}>{item.sku}</td>
                            <td style={{textAlign:"center"}}>{item.qty}</td>
                            <td style={{textAlign:"right"}}>{money(item.price)}</td>
                            <td style={{textAlign:"right",fontWeight:700,color:"var(--info)"}}>{money(item.lineTotal)}</td>
                            <td style={{color:"var(--text-3)",fontSize:13}}>{item.note||"—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>

            {selected && (
              <div className="popup-footer">
                <button type="button" className="btn-secondary" onClick={closeDetail}>Đóng</button>
                <button type="button" className="btn-primary" onClick={() => {
                  exportCSV(selected.items.map(i => ({
                    "Sản phẩm": i.productName, "SKU": i.sku,
                    "SL": i.qty, "Đơn giá": i.price, "Thành tiền": i.lineTotal,
                  })), `don-${selected.code}.csv`);
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Xuất CSV
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
