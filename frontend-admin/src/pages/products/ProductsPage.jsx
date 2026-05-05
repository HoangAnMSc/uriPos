import { useEffect, useMemo, useState } from 'react';
import GlassCard from '../../components/ui/GlassCard';
import LoadingScreen from '../../components/ui/LoadingScreen';
import StatusBadge from '../../components/ui/StatusBadge';
import usePermissions from '../../hooks/usePermissions';
import { formatCurrency } from '../../lib/utils';
import { getProducts, saveProduct } from '../../services/productsService';

const emptyProductForm = {
  id: '',
  sku: '',
  name: '',
  category: '',
  price: '',
  stock_quantity: '',
  is_active: true
};

function ProductsPage() {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyProductForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      const data = await getProducts();
      if (mounted) {
        setProducts(data);
        setLoading(false);
      }
    }

    loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const keyword = query.toLowerCase();
    return products.filter((product) =>
      [product.name, product.sku, product.category].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(keyword)
      )
    );
  }, [products, query]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    const savedProduct = await saveProduct(form);
    setProducts((current) => {
      const exists = current.some((product) => product.id === savedProduct.id);
      if (exists) {
        return current.map((product) =>
          product.id === savedProduct.id ? savedProduct : product
        );
      }

      return [savedProduct, ...current];
    });
    setForm(emptyProductForm);
    setSaving(false);
  }

  if (loading) {
    return <LoadingScreen label="Dang tai san pham..." />;
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard
          title={form.id ? 'Cap nhat san pham' : 'Them san pham'}
          subtitle="Quan ly SKU, gia, ton kho va kich hoat ban nhanh."
        >
          {can('products', form.id ? 'update' : 'create') ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="input-shell"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Ten san pham"
                />
                <input
                  className="input-shell"
                  value={form.sku}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sku: event.target.value }))
                  }
                  placeholder="SKU"
                />
                <input
                  className="input-shell"
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value }))
                  }
                  placeholder="Danh muc"
                />
                <input
                  className="input-shell"
                  type="number"
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, price: event.target.value }))
                  }
                  placeholder="Gia ban"
                />
                <input
                  className="input-shell"
                  type="number"
                  value={form.stock_quantity}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      stock_quantity: event.target.value
                    }))
                  }
                  placeholder="Ton kho"
                />
                <label className="glass-muted flex items-center gap-3 rounded-[24px] px-4 py-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        is_active: event.target.checked
                      }))
                    }
                  />
                  San pham dang ban
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button type="submit" className="button-primary" disabled={saving}>
                  {saving ? 'Dang luu...' : form.id ? 'Cap nhat' : 'Them san pham'}
                </button>
                {form.id ? (
                  <button
                    type="button"
                    onClick={() => setForm(emptyProductForm)}
                    className="button-secondary"
                  >
                    Huy chinh sua
                  </button>
                ) : null}
              </div>
            </form>
          ) : (
            <p className="text-sm leading-6 text-slate-500">
              Vai tro hien tai chi duoc xem danh sach san pham.
            </p>
          )}
        </GlassCard>

        <GlassCard title="Tong quan ton kho" subtitle="Tap trung vao san pham sap can xu ly.">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="glass-muted rounded-[24px] p-4">
              <p className="text-sm text-slate-500">Dang ban</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {products.filter((product) => product.is_active).length}
              </p>
            </div>
            <div className="glass-muted rounded-[24px] p-4">
              <p className="text-sm text-slate-500">Ton thap</p>
              <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {products.filter((product) => Number(product.stock_quantity) <= 15).length}
              </p>
            </div>
            <div className="glass-muted rounded-[24px] p-4">
              <p className="text-sm text-slate-500">Gia tri ton</p>
              <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
                {formatCurrency(
                  products.reduce(
                    (sum, product) =>
                      sum + Number(product.price || 0) * Number(product.stock_quantity || 0),
                    0
                  )
                )}
              </p>
            </div>
          </div>
        </GlassCard>
      </section>

      <GlassCard
        title="Danh sach san pham"
        subtitle="Danh sach toi uu cho POS va quan ly ton kho."
        actions={
          <input
            className="input-shell min-w-[240px]"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tim san pham"
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-4 pr-4 font-medium">San pham</th>
                <th className="pb-4 pr-4 font-medium">Gia</th>
                <th className="pb-4 pr-4 font-medium">Ton kho</th>
                <th className="pb-4 pr-4 font-medium">Trang thai</th>
                <th className="pb-4 font-medium">Thao tac</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-t border-slate-200/60">
                  <td className="py-4 pr-4">
                    <p className="font-semibold text-slate-900">{product.name}</p>
                    <p className="mt-1 text-slate-500">
                      {product.category} / {product.sku}
                    </p>
                  </td>
                  <td className="py-4 pr-4 font-semibold text-slate-900">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="py-4 pr-4">
                    <StatusBadge
                      tone={Number(product.stock_quantity) <= 10 ? 'danger' : 'neutral'}
                    >
                      {product.stock_quantity} sp
                    </StatusBadge>
                  </td>
                  <td className="py-4 pr-4">
                    <StatusBadge tone={product.is_active ? 'success' : 'warning'}>
                      {product.is_active ? 'Dang ban' : 'Tam an'}
                    </StatusBadge>
                  </td>
                  <td className="py-4">
                    {can('products', 'update') ? (
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            id: product.id,
                            sku: product.sku,
                            name: product.name,
                            category: product.category,
                            price: product.price,
                            stock_quantity: product.stock_quantity,
                            is_active: product.is_active
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

export default ProductsPage;
