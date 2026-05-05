import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import GlassCard from '../../components/ui/GlassCard';
import LoadingScreen from '../../components/ui/LoadingScreen';
import StatCard from '../../components/ui/StatCard';
import { formatCurrency, formatNumber } from '../../lib/utils';
import { getAnalyticsData } from '../../services/analyticsService';
import { BarChart3, PackageSearch, ShoppingBag, Wallet } from 'lucide-react';

const chartColors = ['#0f172a', '#3b82f6', '#38bdf8', '#f59e0b', '#34d399'];

function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadAnalytics() {
      const data = await getAnalyticsData();
      if (mounted) {
        setAnalytics(data);
        setLoading(false);
      }
    }

    loadAnalytics();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <LoadingScreen label="Dang tai thong ke..." />;
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Doanh thu"
          value={formatCurrency(analytics.summary.revenue)}
          note="7 ngay gan day"
          icon={Wallet}
        />
        <StatCard
          title="So don"
          value={formatNumber(analytics.summary.orderCount)}
          note="Tong giao dich"
          icon={ShoppingBag}
        />
        <StatCard
          title="Danh muc ban"
          value={formatNumber(analytics.summary.productCount)}
          note="San pham dang theo doi"
          icon={PackageSearch}
        />
        <StatCard
          title="Can canh bao"
          value={formatNumber(analytics.summary.lowStockCount)}
          note="Ton kho thap"
          icon={BarChart3}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <GlassCard
          title="Duong doanh thu"
          subtitle="So sanh doanh thu va so don theo tung ngay."
          className="min-h-[420px]"
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.dailyRevenue}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={formatNumber} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#0f172a"
                  strokeWidth={3}
                  fill="url(#salesGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard
          title="Ty trong thanh toan"
          subtitle="Nhom phuong thuc duoc su dung nhieu nhat."
          className="min-h-[420px]"
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.paymentMix}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={64}
                  outerRadius={96}
                  paddingAngle={3}
                >
                  {analytics.paymentMix.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </section>

      <GlassCard
        title="Gia tri theo danh muc"
        subtitle="Tong gia tri ton kho hien tai theo nhom san pham."
      >
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.categoryMix}>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={formatNumber} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#0f172a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
}

export default AnalyticsPage;
