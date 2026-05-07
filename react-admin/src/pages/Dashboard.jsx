import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../api/axiosClient";

/* ── helpers ─────────────────────────────────────────── */
const fmt = (n) => Number(n || 0).toLocaleString("vi-VN", { style: "currency", currency: "VND" });
const fmtShort = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + "B";
  if (v >= 1_000_000)     return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000)         return (v / 1_000).toFixed(1) + "K";
  return v.toLocaleString("vi-VN");
};

/* ── Export CSV helper ───────────────────────────────── */
function exportCSV(rows, filename) {
  const header = Object.keys(rows[0] || {}).join(",");
  const body   = rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob   = new Blob(["\uFEFF" + header + "\n" + body], { type: "text/csv;charset=utf-8;" });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function normalizeOrder(row) {
  return {
    id: String(row?.id ?? ""),
    customerName: row?.customer_name || "Khách lẻ",
    date: row?.invoice_date || row?.date || row?.created_at || "",
    total: Number(row?.grand_total ?? row?.total_amount ?? row?.total ?? 0),
    paid: Number(row?.paid_amount ?? row?.paid ?? 0),
    status: row?.payment_status || row?.status || "unpaid",
    paymentMethod: row?.payment_method || "cash",
    items: Array.isArray(row?.items) ? row.items : [],
  };
}

/* ── Area Chart ──────────────────────────────────────── */
function AreaChart({ data, labels, color = "#007aff", height = 180 }) {
  if (!data || data.length < 2) return <div className="db-empty-chart">Chưa có dữ liệu</div>;
  const W = 600; const H = height;
  const pad = { t: 16, r: 8, b: 28, l: 48 };
  const iW = W - pad.l - pad.r;
  const iH = H - pad.t - pad.b;
  const max = Math.max(...data, 1);
  const step = iW / (data.length - 1);

  const pts = data.map((v, i) => ({
    x: pad.l + i * step,
    y: pad.t + iH - (v / max) * iH,
  }));

  // smooth bezier
  const pathD = pts.reduce((acc, p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = pts[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
  }, "");

  const areaD = `${pathD} L${pts[pts.length-1].x},${pad.t+iH} L${pts[0].x},${pad.t+iH} Z`;

  // y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: pad.t + iH - f * iH,
    label: fmtShort(max * f),
  }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.20" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {/* grid lines */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} y1={t.y} x2={W - pad.r} y2={t.y} stroke="var(--divider,rgba(0,0,0,0.06))" strokeWidth="1" />
          <text x={pad.l - 6} y={t.y + 4} textAnchor="end" fontSize="9" fill="var(--text-4,#aeaeb2)">{t.label}</text>
        </g>
      ))}
      {/* area fill */}
      <path d={areaD} fill="url(#areaGrad)" />
      {/* line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#fff" stroke={color} strokeWidth="2" />
      ))}
      {/* x labels */}
      {labels && labels.map((l, i) => l ? (
        <text key={i} x={pts[i]?.x} y={H - 4} textAnchor="middle" fontSize="9" fill="var(--text-4,#aeaeb2)">{l}</text>
      ) : null)}
    </svg>
  );
}

/* ── Bar Chart (days of week) ────────────────────────── */
function WeekBarChart({ data, labels, activeIdx, color = "#007aff", height = 120 }) {
  if (!data || data.length === 0) return <div className="db-empty-chart">Chưa có dữ liệu</div>;
  const W = 280; const H = height;
  const max = Math.max(...data, 1);
  const barW = 24; const gap = (W - data.length * barW) / (data.length + 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height }}>
      {data.map((v, i) => {
        const bh = Math.max((v / max) * (H - 32), 4);
        const x = gap + i * (barW + gap);
        const y = H - 20 - bh;
        const isActive = i === activeIdx;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} rx="6"
              fill={isActive ? color : "var(--surface-2,#f0f0f5)"} />
            {isActive && (
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>
                {fmtShort(v)}
              </text>
            )}
            <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize="9"
              fill={isActive ? color : "var(--text-4,#aeaeb2)"} fontWeight={isActive ? "700" : "400"}>
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Gauge Chart ─────────────────────────────────────── */
function GaugeChart({ pct = 68, color = "#16a34a", size = 160 }) {
  const cx = size / 2; const cy = size / 2 + 10;
  const r = size * 0.38;
  const startAngle = -210; const endAngle = 30;
  const totalAngle = endAngle - startAngle;
  const toRad = (deg) => (deg * Math.PI) / 180;

  const arcPath = (from, to, radius) => {
    const s = { x: cx + radius * Math.cos(toRad(from)), y: cy + radius * Math.sin(toRad(from)) };
    const e = { x: cx + radius * Math.cos(toRad(to)),   y: cy + radius * Math.sin(toRad(to)) };
    const large = to - from > 180 ? 1 : 0;
    return `M${s.x},${s.y} A${radius},${radius} 0 ${large} 1 ${e.x},${e.y}`;
  };

  const fillAngle = startAngle + (pct / 100) * totalAngle;
  const strokeW = 12;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* track */}
      <path d={arcPath(startAngle, endAngle, r)} fill="none"
        stroke="var(--surface-2,#f0f0f5)" strokeWidth={strokeW} strokeLinecap="round" />
      {/* fill — segmented look */}
      {Array.from({ length: 30 }).map((_, i) => {
        const segStart = startAngle + (i / 30) * totalAngle;
        const segEnd   = startAngle + ((i + 0.7) / 30) * totalAngle;
        const active   = (i / 30) * 100 <= pct;
        return (
          <path key={i} d={arcPath(segStart, segEnd, r)} fill="none"
            stroke={active ? color : "transparent"} strokeWidth={strokeW} strokeLinecap="round" />
        );
      })}
      {/* center text */}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="28" fontWeight="800" fill="var(--text-1,#1d1d1f)">{pct}%</text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="10" fill="var(--text-3,#6e6e73)">Tỷ lệ hoàn thành</text>
    </svg>
  );
}

/* ── KPI Delta badge ─────────────────────────────────── */
function Delta({ value }) {
  const up = value >= 0;
  return (
    <span className={`db-delta ${up ? "db-delta--up" : "db-delta--down"}`}>
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

/* ── Main ────────────────────────────────────────────── */
export default function Dashboard() {
  const [orders, setOrders]   = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState("30");

  useEffect(() => {
    let ignore = false;
    Promise.all([
      axiosClient.get("/orders").catch(() => ({ data: [] })),
      axiosClient.get("/products").catch(() => ({ data: [] })),
    ]).then(([oR, pR]) => {
      if (ignore) return;
      const rawO = Array.isArray(oR?.data) ? oR.data
        : Array.isArray(oR?.data?.data) ? oR.data.data
        : Array.isArray(oR?.data?.orders) ? oR.data.orders : [];
      setOrders(rawO.map(normalizeOrder));

      const rawP = Array.isArray(pR?.data) ? pR.data
        : Array.isArray(pR?.data?.data) ? pR.data.data
        : pR?.data?.data?.products || [];
      setProducts(rawP);
      setLoading(false);
    });
    return () => { ignore = true; };
  }, []);

  const days = Number(period);

  const stats = useMemo(() => {
    const now = new Date();
    const cut  = new Date(now); cut.setDate(cut.getDate() - days);
    const cut2 = new Date(now); cut2.setDate(cut2.getDate() - days * 2);

    const cur  = orders.filter(o => o.date && new Date(o.date) >= cut);
    const prev = orders.filter(o => o.date && new Date(o.date) >= cut2 && new Date(o.date) < cut);

    const revenue     = cur.reduce((s, o) => s + o.total, 0);
    const prevRevenue = prev.reduce((s, o) => s + o.total, 0);
    const paid        = cur.reduce((s, o) => s + o.paid, 0);
    const totalOrders = cur.length;
    const prevOrders  = prev.length;
    const avgOrder    = totalOrders > 0 ? revenue / totalOrders : 0;

    // Revenue by day
    const dayMap = {}; const dayLabels = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dayMap[key] = 0;
      const step = Math.ceil(days / 8);
      dayLabels.push(i % step === 0 || i === 0 ? `${d.getDate()}/${d.getMonth()+1}` : "");
    }
    cur.forEach(o => {
      const k = o.date ? new Date(o.date).toISOString().slice(0, 10) : null;
      if (k && k in dayMap) dayMap[k] += o.total;
    });
    const revenueByDay = Object.values(dayMap);
    const revenueLabels = dayLabels;

    // Revenue by day of week (Sun=0..Sat=6)
    const DOW_LABELS = ["CN","T2","T3","T4","T5","T6","T7"];
    const dowMap = [0,0,0,0,0,0,0];
    cur.forEach(o => { if (o.date) dowMap[new Date(o.date).getDay()] += o.total; });
    const todayDow = now.getDay();

    // Top products
    const prodMap = {};
    cur.forEach(o => o.items.forEach(item => {
      const name = item?.product_name || item?.name || "N/A";
      const rev  = Number(item?.line_total || 0);
      const qty  = Number(item?.qty || 0);
      if (!prodMap[name]) prodMap[name] = { name, qty: 0, revenue: 0 };
      prodMap[name].qty += qty;
      prodMap[name].revenue += rev;
    }));
    const topProducts = Object.values(prodMap).sort((a,b) => b.revenue - a.revenue).slice(0, 5);

    // Status
    const paid_count    = cur.filter(o => o.status === "paid").length;
    const partial_count = cur.filter(o => o.status === "partial").length;
    const unpaid_count  = cur.filter(o => o.status === "unpaid").length;
    const paidRate = totalOrders > 0 ? Math.round((paid_count / totalOrders) * 100) : 0;

    // Recent
    const recentOrders = [...cur].sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0, 6);

    // Payment methods
    const payMap = {};
    cur.forEach(o => { const m = o.paymentMethod || "other"; payMap[m] = (payMap[m]||0)+1; });

    const revDelta   = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
    const orderDelta = prevOrders  > 0 ? ((totalOrders - prevOrders) / prevOrders) * 100 : 0;

    return {
      revenue, prevRevenue, paid, totalOrders, avgOrder,
      revDelta, orderDelta,
      revenueByDay, revenueLabels,
      dowMap, dowLabels: DOW_LABELS, todayDow,
      topProducts,
      paid_count, partial_count, unpaid_count, paidRate,
      recentOrders, payMap,
    };
  }, [orders, days]);

  if (loading) {
    return (
      <div className="db-page">
        <div className="db-skeleton-grid">
          {[...Array(4)].map((_,i) => <div key={i} className="ld-skeleton-line" style={{height:88,borderRadius:16}} />)}
        </div>
        <div className="db-skeleton-grid" style={{marginTop:14}}>
          {[...Array(2)].map((_,i) => <div key={i} className="ld-skeleton-line" style={{height:240,borderRadius:20}} />)}
        </div>
      </div>
    );
  }

  const PAY_LABEL = { cash:"Tiền mặt", bank_transfer:"Chuyển khoản", card:"Thẻ", other:"Khác" };
  const STATUS_LABEL = { paid:"Đã TT", partial:"Một phần", unpaid:"Chưa TT" };
  const STATUS_CLS   = { paid:"db-badge--paid", partial:"db-badge--partial", unpaid:"db-badge--unpaid" };

  return (
    <div className="db-page">

      {/* ── Header ── */}
      <div className="db-header">
        <div>
          <h1 className="db-title">Dashboard</h1>
          <p className="db-sub">Thống kê hoạt động kinh doanh</p>
        </div>
        <div className="db-header-right">
          <div className="db-period-group">
            {[["7","7 ngày"],["30","30 ngày"],["90","90 ngày"]].map(([v,l]) => (
              <button key={v} type="button"
                className={`db-period-btn${period===v?" is-active":""}`}
                onClick={() => setPeriod(v)}>{l}</button>
            ))}
          </div>
          <button
            type="button"
            className="db-export-btn"
            onClick={() => {
              const rows = stats.revenueByDay.map((v, i) => ({
                "Ngày": stats.revenueLabels[i] || `Ngày ${i+1}`,
                "Doanh thu (VND)": v,
              }));
              exportCSV(rows, `thong-ke-doanh-thu-${period}ngay.csv`);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Xuất CSV
          </button>
          <Link to="/orders" className="db-orders-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 2v20l3-2 2 2 3-2 3 2 2-2 3 2V2l-3 2-2-2-3 2-3-2-2 2-3-2z"/>
            </svg>
            Đơn hàng
          </Link>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="db-kpi-row">
        {[
          { label:"Doanh thu", val: fmtShort(stats.revenue), delta: stats.revDelta,
            sub: `vs ${fmtShort(stats.prevRevenue)} kỳ trước`,
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
            color:"#007aff" },
          { label:"Tổng đơn hàng", val: stats.totalOrders, delta: stats.orderDelta,
            sub: `vs ${stats.totalOrders} kỳ trước`,
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
            color:"#34c759" },
          { label:"Đã thu", val: fmtShort(stats.paid), delta: 0,
            sub: `${stats.paid_count} đơn đã thanh toán`,
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9.5h18M7 14.5h3"/></svg>,
            color:"#16a34a" },
          { label:"Trung bình / đơn", val: fmtShort(stats.avgOrder), delta: 0,
            sub: `${stats.totalOrders} đơn hàng`,
            icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
            color:"#ff9f0a" },
        ].map((k,i) => (
          <div key={i} className="db-kpi-card">
            <div className="db-kpi-top">
              <span className="db-kpi-label">{k.label}</span>
              <span className="db-kpi-icon-wrap" style={{color:k.color, background:`${k.color}18`}}>{k.icon}</span>
            </div>
            <div className="db-kpi-val">{k.val}</div>
            <div className="db-kpi-foot">
              {k.delta !== 0 && <Delta value={k.delta} />}
              <span className="db-kpi-sub">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="db-main-grid">

        {/* LEFT col */}
        <div className="db-col-left">

          {/* Area chart — Total Profit */}
          <div className="db-card">
            <div className="db-card-head">
              <div>
                <div className="db-card-title">Tổng doanh thu</div>
                <div className="db-card-big">{fmt(stats.revenue)}</div>
                <div className="db-card-sub"><Delta value={stats.revDelta} /> so với kỳ trước</div>
              </div>
              <div className="db-period-group db-period-group--sm">
                {[["7","7N"],["30","30N"],["90","90N"]].map(([v,l]) => (
                  <button key={v} type="button"
                    className={`db-period-btn db-period-btn--sm${period===v?" is-active":""}`}
                    onClick={() => setPeriod(v)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="db-card-chart">
              <AreaChart data={stats.revenueByDay} labels={stats.revenueLabels} color="#007aff" height={180} />
            </div>
          </div>

          {/* Payment method segments */}
          <div className="db-card">
            <div className="db-card-head">
              <div className="db-card-title">Phương thức thanh toán</div>
            </div>
            <div className="db-segments">
              {Object.entries(stats.payMap).map(([k, v], i) => {
                const colors = ["#007aff","#34c759","#ff9f0a","#ff3b30"];
                const total  = Object.values(stats.payMap).reduce((s,x)=>s+x,0);
                const pct    = total > 0 ? Math.round((v/total)*100) : 0;
                return (
                  <div key={k} className="db-segment-item">
                    <div className="db-segment-top">
                      <span className="db-segment-dot" style={{background:colors[i%4]}} />
                      <span className="db-segment-label">{PAY_LABEL[k]||k}</span>
                      <span className="db-segment-val">{v} đơn</span>
                    </div>
                    <div className="db-segment-bar">
                      <div className="db-segment-fill" style={{width:`${pct}%`, background:colors[i%4]}} />
                    </div>
                  </div>
                );
              })}
              {Object.keys(stats.payMap).length === 0 && <div className="db-empty-chart">Chưa có dữ liệu</div>}
            </div>
          </div>

          {/* Best selling products */}
          <div className="db-card">
            <div className="db-card-head">
              <div className="db-card-title">Sản phẩm bán chạy</div>
              <Link to="/orders" className="db-link-sm">Xem tất cả →</Link>
            </div>
            <div className="db-prod-table">
              <div className="db-prod-thead">
                <span>Sản phẩm</span>
                <span>Đã bán</span>
                <span>Doanh thu</span>
              </div>
              {stats.topProducts.length === 0 ? (
                <div className="db-empty-chart">Chưa có dữ liệu</div>
              ) : stats.topProducts.map((p, i) => (
                <div key={i} className="db-prod-row">
                  <div className="db-prod-info">
                    <span className="db-prod-rank">#{i+1}</span>
                    <span className="db-prod-name">{p.name}</span>
                  </div>
                  <span className="db-prod-qty">{p.qty} sp</span>
                  <span className="db-prod-rev">{fmtShort(p.revenue)}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT col */}
        <div className="db-col-right">

          {/* Bar chart by day of week */}
          <div className="db-card">
            <div className="db-card-head">
              <div className="db-card-title">Doanh thu theo ngày</div>
            </div>
            <div style={{padding:"0 4px 8px"}}>
              <WeekBarChart
                data={stats.dowMap}
                labels={stats.dowLabels}
                activeIdx={stats.todayDow}
                color="#007aff"
                height={130}
              />
            </div>
          </div>

          {/* Gauge — paid rate */}
          <div className="db-card db-card--center">
            <div className="db-card-head">
              <div className="db-card-title">Tỷ lệ thanh toán</div>
            </div>
            <div className="db-gauge-wrap">
              <GaugeChart pct={stats.paidRate} color="#16a34a" size={160} />
            </div>
            <div className="db-gauge-legend">
              {[
                {label:"Đã TT",   val:stats.paid_count,    color:"#34c759"},
                {label:"Một phần",val:stats.partial_count, color:"#ff9f0a"},
                {label:"Chưa TT", val:stats.unpaid_count,  color:"#ff3b30"},
              ].map(s => (
                <div key={s.label} className="db-gauge-leg-row">
                  <span className="db-gauge-dot" style={{background:s.color}} />
                  <span className="db-gauge-leg-label">{s.label}</span>
                  <span className="db-gauge-leg-val">{s.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent orders */}
          <div className="db-card">
            <div className="db-card-head">
              <div className="db-card-title">Đơn hàng gần đây</div>
              <Link to="/orders" className="db-link-sm">Xem tất cả →</Link>
            </div>
            <div className="db-recent">
              {stats.recentOrders.length === 0 ? (
                <div className="db-empty-chart">Chưa có đơn hàng</div>
              ) : stats.recentOrders.map(o => (
                <div key={o.id} className="db-recent-row">
                  <div className="db-recent-avatar">
                    {(o.customerName||"K").charAt(0).toUpperCase()}
                  </div>
                  <div className="db-recent-info">
                    <span className="db-recent-name">{o.customerName}</span>
                    <span className="db-recent-date">{o.date ? new Date(o.date).toLocaleDateString("vi-VN") : ""}</span>
                  </div>
                  <span className={`db-badge ${STATUS_CLS[o.status]||""}`}>
                    {STATUS_LABEL[o.status]||o.status}
                  </span>
                  <span className="db-recent-amt">{fmtShort(o.total)}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
