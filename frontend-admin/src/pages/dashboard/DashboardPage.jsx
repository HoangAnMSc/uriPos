import {
  Activity,
  Boxes,
  DollarSign,
  ShoppingBag,
  Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import GlassCard from '../../components/ui/GlassCard';
import LoadingScreen from '../../components/ui/LoadingScreen';
import StatCard from '../../components/ui/StatCard';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { getDashboardData } from '../../services/dashboardService';

const metricIcons = [DollarSign, Users, Boxes, Activity];

function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      const data = await getDashboardData();
      if (mounted) {
        setDashboard(data);
        setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <LoadingScreen label="Dang tai dashboard..." />;
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.metrics.map((item, index) => {
          const Icon = metricIcons[index];

          return (
            <StatCard
              key={item.title}
              title={item.title}
              value={item.value}
              note={item.note}
              icon={Icon}
            />
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <GlassCard
          title="Doanh thu 7 ngay"
          subtitle="Nhip ban hang gan day de manager theo doi trong ngay."
        >
          <div className="grid gap-3 md:grid-cols-7">
            {dashboard.revenueSeries.map((entry) => (
              <div
                key={entry.label}
                className="glass-muted rounded-[24px] p-4 text-center"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {entry.label}
                </p>
                <p className="mt-3 text-lg font-extrabold tracking-tight text-slate-950">
                  {formatCurrency(entry.revenue)}
                </p>
                <p className="mt-2 text-xs text-slate-500">{entry.orders} don</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard
          title="Canh bao ton kho"
          subtitle="San pham sap can bo sung truoc gio cao diem."
        >
          <div className="space-y-3">
            {dashboard.lowStock.slice(0, 5).map((product) => (
              <div
                key={product.id}
                className="glass-muted flex items-center justify-between rounded-[24px] px-4 py-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">{product.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {product.category} / {product.sku}
                  </p>
                </div>
                <StatusBadge tone={Number(product.stock_quantity) <= 10 ? 'danger' : 'warning'}>
                  {product.stock_quantity} sp
                </StatusBadge>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <GlassCard
        title="Don hang moi nhat"
        subtitle="Theo doi giao dich gan day va phuong thuc thanh toan."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-4 pr-4 font-medium">Ma don</th>
                <th className="pb-4 pr-4 font-medium">Khach hang</th>
                <th className="pb-4 pr-4 font-medium">Thanh toan</th>
                <th className="pb-4 pr-4 font-medium">Tong tien</th>
                <th className="pb-4 pr-4 font-medium">Trang thai</th>
                <th className="pb-4 font-medium">Thoi gian</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentOrders.map((order) => (
                <tr key={order.id} className="border-t border-slate-200/60">
                  <td className="py-4 pr-4 font-semibold text-slate-900">{order.order_code}</td>
                  <td className="py-4 pr-4 text-slate-600">
                    {order.customer?.full_name ?? 'Khach le'}
                  </td>
                  <td className="py-4 pr-4 capitalize text-slate-600">
                    {order.payment_method}
                  </td>
                  <td className="py-4 pr-4 font-semibold text-slate-900">
                    {formatCurrency(order.grand_total)}
                  </td>
                  <td className="py-4 pr-4">
                    <StatusBadge tone={order.status === 'paid' ? 'success' : 'warning'}>
                      {order.status}
                    </StatusBadge>
                  </td>
                  <td className="py-4 text-slate-500">{formatDateTime(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

export default DashboardPage;
