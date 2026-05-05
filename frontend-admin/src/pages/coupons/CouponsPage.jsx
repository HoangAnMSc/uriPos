import { useEffect, useMemo, useState } from 'react';
import GlassCard from '../../components/ui/GlassCard';
import LoadingScreen from '../../components/ui/LoadingScreen';
import StatusBadge from '../../components/ui/StatusBadge';
import usePermissions from '../../hooks/usePermissions';
import { formatCurrency, formatDate } from '../../lib/utils';
import { getCoupons, saveCoupon } from '../../services/couponsService';

const emptyCouponForm = {
  id: '',
  code: '',
  discount_type: 'percent',
  discount_value: '',
  min_order_value: '',
  usage_limit: '',
  expires_at: '',
  is_active: true
};

function normalizeCouponForForm(coupon) {
  return {
    id: coupon.id,
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    min_order_value: coupon.min_order_value,
    usage_limit: coupon.usage_limit,
    expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : '',
    is_active: coupon.is_active
  };
}

function CouponsPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [coupons, setCoupons] = useState([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyCouponForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadCoupons() {
      const data = await getCoupons();
      if (mounted) {
        setCoupons(data);
        setLoading(false);
      }
    }

    loadCoupons();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredCoupons = useMemo(() => {
    const keyword = query.toLowerCase();
    return coupons.filter((coupon) =>
      [coupon.code, coupon.discount_type].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(keyword)
      )
    );
  }, [coupons, query]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    const savedCoupon = await saveCoupon(form);
    setCoupons((current) => {
      const exists = current.some((coupon) => coupon.id === savedCoupon.id);
      if (exists) {
        return current.map((coupon) => (coupon.id === savedCoupon.id ? savedCoupon : coupon));
      }

      return [savedCoupon, ...current];
    });
    setForm(emptyCouponForm);
    setSaving(false);
  }

  if (loading) {
    return <LoadingScreen label="Dang tai ma giam gia..." />;
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard
          title={form.id ? 'Cap nhat voucher' : 'Tao voucher moi'}
          subtitle="Phu hop cho khuyen mai nhanh tren POS va chuong trinh cham soc khach hang."
        >
          {can('coupons', form.id ? 'update' : 'create') ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="input-shell"
                  value={form.code}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))
                  }
                  placeholder="Ma giam gia"
                />
                <select
                  className="input-shell"
                  value={form.discount_type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      discount_type: event.target.value
                    }))
                  }
                >
                  <option value="percent">Phan tram</option>
                  <option value="fixed">Tien mat</option>
                </select>
                <input
                  className="input-shell"
                  type="number"
                  value={form.discount_value}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      discount_value: event.target.value
                    }))
                  }
                  placeholder="Gia tri giam"
                />
                <input
                  className="input-shell"
                  type="number"
                  value={form.min_order_value}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      min_order_value: event.target.value
                    }))
                  }
                  placeholder="Don toi thieu"
                />
                <input
                  className="input-shell"
                  type="number"
                  value={form.usage_limit}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      usage_limit: event.target.value
                    }))
                  }
                  placeholder="Gioi han su dung"
                />
                <input
                  className="input-shell"
                  type="date"
                  value={form.expires_at}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, expires_at: event.target.value }))
                  }
                />
              </div>

              <label className="glass-muted flex items-center gap-3 rounded-[24px] px-4 py-3 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, is_active: event.target.checked }))
                  }
                />
                Kich hoat voucher
              </label>

              <div className="flex flex-wrap gap-3">
                <button type="submit" className="button-primary" disabled={saving}>
                  {saving ? 'Dang luu...' : form.id ? 'Cap nhat' : 'Tao voucher'}
                </button>
                {form.id ? (
                  <button
                    type="button"
                    onClick={() => setForm(emptyCouponForm)}
                    className="button-secondary"
                  >
                    Huy chinh sua
                  </button>
                ) : null}
              </div>
            </form>
          ) : (
            <p className="text-sm leading-6 text-slate-500">
              Vai tro hien tai chi duoc xem ma giam gia da tao.
            </p>
          )}
        </GlassCard>

        <GlassCard title="Tong quan uu dai" subtitle="Can doi voucher theo ngay het han va dieu kien.">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="glass-muted rounded-[24px] p-4">
              <p className="text-sm text-slate-500">Dang hoat dong</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {coupons.filter((coupon) => coupon.is_active).length}
              </p>
            </div>
            <div className="glass-muted rounded-[24px] p-4">
              <p className="text-sm text-slate-500">Giam phan tram</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {coupons.filter((coupon) => coupon.discount_type === 'percent').length}
              </p>
            </div>
            <div className="glass-muted rounded-[24px] p-4">
              <p className="text-sm text-slate-500">Het han trong thang</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {
                  coupons.filter((coupon) => {
                    const expiresAt = new Date(coupon.expires_at);
                    const now = new Date();
                    return (
                      expiresAt.getMonth() === now.getMonth() &&
                      expiresAt.getFullYear() === now.getFullYear()
                    );
                  }).length
                }
              </p>
            </div>
          </div>
        </GlassCard>
      </section>

      <GlassCard
        title="Danh sach ma giam gia"
        subtitle="Hoi su dung nhanh ngay tai POS."
        actions={
          <input
            className="input-shell min-w-[240px]"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tim voucher"
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-4 pr-4 font-medium">Ma</th>
                <th className="pb-4 pr-4 font-medium">Gia tri</th>
                <th className="pb-4 pr-4 font-medium">Don toi thieu</th>
                <th className="pb-4 pr-4 font-medium">Het han</th>
                <th className="pb-4 pr-4 font-medium">Trang thai</th>
                <th className="pb-4 font-medium">Thao tac</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.map((coupon) => (
                <tr key={coupon.id} className="border-t border-slate-200/60">
                  <td className="py-4 pr-4 font-semibold text-slate-900">{coupon.code}</td>
                  <td className="py-4 pr-4 text-slate-700">
                    {coupon.discount_type === 'percent'
                      ? `${coupon.discount_value}%`
                      : formatCurrency(coupon.discount_value)}
                  </td>
                  <td className="py-4 pr-4 text-slate-700">
                    {formatCurrency(coupon.min_order_value)}
                  </td>
                  <td className="py-4 pr-4 text-slate-500">{formatDate(coupon.expires_at)}</td>
                  <td className="py-4 pr-4">
                    <StatusBadge tone={coupon.is_active ? 'success' : 'warning'}>
                      {coupon.is_active ? 'Dang hoat dong' : 'Tam khoa'}
                    </StatusBadge>
                  </td>
                  <td className="py-4">
                    {can('coupons', 'update') ? (
                      <button
                        type="button"
                        onClick={() => setForm(normalizeCouponForForm(coupon))}
                        className="button-secondary"
                      >
                        Chinh sua
                      </button>
                    ) : (
                      '--'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

export default CouponsPage;
