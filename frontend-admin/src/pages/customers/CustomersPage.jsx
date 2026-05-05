import { useEffect, useMemo, useState } from 'react';
import GlassCard from '../../components/ui/GlassCard';
import LoadingScreen from '../../components/ui/LoadingScreen';
import StatusBadge from '../../components/ui/StatusBadge';
import usePermissions from '../../hooks/usePermissions';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { getCustomers, saveCustomer } from '../../services/customersService';

const emptyCustomerForm = {
  id: '',
  full_name: '',
  email: '',
  phone: ''
};

function CustomersPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyCustomerForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadCustomers() {
      const data = await getCustomers();
      if (mounted) {
        setCustomers(data);
        setLoading(false);
      }
    }

    loadCustomers();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    const keyword = query.toLowerCase();
    return customers.filter((customer) =>
      [customer.full_name, customer.email, customer.phone].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(keyword)
      )
    );
  }, [customers, query]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    const savedCustomer = await saveCustomer(form);
    setCustomers((current) => {
      const exists = current.some((customer) => customer.id === savedCustomer.id);
      if (exists) {
        return current.map((customer) =>
          customer.id === savedCustomer.id ? savedCustomer : customer
        );
      }

      return [savedCustomer, ...current];
    });
    setForm(emptyCustomerForm);
    setSaving(false);
  }

  if (loading) {
    return <LoadingScreen label="Dang tai khach hang..." />;
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard
          title={form.id ? 'Cap nhat khach hang' : 'Them khach hang'}
          subtitle="Luu thong tin lien he de ho tro cham soc va lien ket lich su mua hang."
        >
          {can('customers', form.id ? 'update' : 'create') ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <input
                className="input-shell"
                value={form.full_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, full_name: event.target.value }))
                }
                placeholder="Ho ten"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="input-shell"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="Email"
                />
                <input
                  className="input-shell"
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  placeholder="So dien thoai"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="submit" className="button-primary" disabled={saving}>
                  {saving ? 'Dang luu...' : form.id ? 'Cap nhat' : 'Tao moi'}
                </button>
                {form.id ? (
                  <button
                    type="button"
                    onClick={() => setForm(emptyCustomerForm)}
                    className="button-secondary"
                  >
                    Huy chinh sua
                  </button>
                ) : null}
              </div>
            </form>
          ) : (
            <p className="text-sm leading-6 text-slate-500">
              Vai tro hien tai chi duoc xem danh sach khach hang.
            </p>
          )}
        </GlassCard>

        <GlassCard title="Tong quan khach hang" subtitle="Nhom VIP va muc chi tieu hien tai.">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="glass-muted rounded-[24px] p-4">
              <p className="text-sm text-slate-500">Tong khach</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {customers.length}
              </p>
            </div>
            <div className="glass-muted rounded-[24px] p-4">
              <p className="text-sm text-slate-500">Khach VIP</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {customers.filter((customer) => customer.loyalty_points >= 100).length}
              </p>
            </div>
            <div className="glass-muted rounded-[24px] p-4">
              <p className="text-sm text-slate-500">Tong chi tieu</p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
                {formatCurrency(
                  customers.reduce((sum, customer) => sum + Number(customer.total_spent || 0), 0)
                )}
              </p>
            </div>
          </div>
        </GlassCard>
      </section>

      <GlassCard
        title="Danh sach khach hang"
        subtitle="Tap trung vao khach quay lai nhieu lan va gia tri mua cao."
        actions={
          <input
            className="input-shell min-w-[240px]"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tim khach hang"
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-4 pr-4 font-medium">Khach hang</th>
                <th className="pb-4 pr-4 font-medium">Diem tich luy</th>
                <th className="pb-4 pr-4 font-medium">Tong chi tieu</th>
                <th className="pb-4 pr-4 font-medium">Lan gan nhat</th>
                <th className="pb-4 font-medium">Thao tac</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="border-t border-slate-200/60">
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-slate-900">{customer.full_name}</p>
                    <p className="mt-1 text-slate-500">
                      {customer.email || '--'} / {customer.phone || '--'}
                    </p>
                  </td>
                  <td className="py-4 pr-4">
                    <StatusBadge tone={customer.loyalty_points >= 100 ? 'success' : 'neutral'}>
                      {customer.loyalty_points ?? 0} diem
                    </StatusBadge>
                  </td>
                  <td className="py-4 pr-4 font-semibold text-slate-900">
                    {formatCurrency(customer.total_spent)}
                  </td>
                  <td className="py-4 pr-4 text-slate-500">
                    {formatDateTime(customer.last_visit_at)}
                  </td>
                  <td className="py-4">
                    {can('customers', 'update') ? (
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            id: customer.id,
                            full_name: customer.full_name,
                            email: customer.email ?? '',
                            phone: customer.phone ?? ''
                          })
                        }
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

export default CustomersPage;
