import { Minus, Plus, ScanLine, ShoppingCart, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import GlassCard from '../../components/ui/GlassCard';
import LoadingScreen from '../../components/ui/LoadingScreen';
import StatusBadge from '../../components/ui/StatusBadge';
import useAuth from '../../hooks/useAuth';
import { cn, formatCurrency } from '../../lib/utils';
import { checkoutPosOrder, getPosCatalog } from '../../services/posService';

function computeDiscount(subtotal, coupon) {
  if (!coupon || subtotal < Number(coupon.min_order_value || 0)) {
    return 0;
  }

  if (coupon.discount_type === 'percent') {
    return Math.round((subtotal * Number(coupon.discount_value || 0)) / 100);
  }

  return Number(coupon.discount_value || 0);
}

function PosPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState({
    products: [],
    customers: [],
    coupons: []
  });
  const [query, setQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCouponId, setSelectedCouponId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [cartItems, setCartItems] = useState([]);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadCatalog() {
      const data = await getPosCatalog();
      if (mounted) {
        setCatalog(data);
        setLoading(false);
      }
    }

    loadCatalog();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const keyword = query.toLowerCase();
    return catalog.products.filter((product) =>
      [product.name, product.sku, product.category].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(keyword)
      )
    );
  }, [catalog.products, query]);

  const selectedCoupon = catalog.coupons.find((coupon) => coupon.id === selectedCouponId);
  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );
  const discount = computeDiscount(subtotal, selectedCoupon);
  const grandTotal = Math.max(subtotal - discount, 0);

  function addToCart(product) {
    setCartItems((current) => {
      const foundItem = current.find((item) => item.id === product.id);
      if (foundItem) {
        return current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: Math.min(item.quantity + 1, Number(product.stock_quantity || 99))
              }
            : item
        );
      }

      return [...current, { ...product, quantity: 1 }];
    });
  }

  function updateQuantity(productId, nextQuantity) {
    setCartItems((current) =>
      current
        .map((item) =>
          item.id === productId ? { ...item, quantity: Math.max(nextQuantity, 0) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  async function handleCheckout() {
    if (!cartItems.length) {
      return;
    }

    setSubmitting(true);
    setCheckoutMessage('');

    try {
      const result = await checkoutPosOrder({
        customerId: selectedCustomerId || null,
        couponId: selectedCouponId || null,
        cashierId: profile?.id,
        paymentMethod,
        grandTotal,
        items: cartItems.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price
        }))
      });

      setCartItems([]);
      setSelectedCouponId('');
      setSelectedCustomerId('');
      setPaymentMethod('cash');
      setCheckoutMessage(`Thanh toan thanh cong: ${result.order_code}`);
    } catch (error) {
      setCheckoutMessage(error.message ?? 'Thanh toan that bai');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingScreen label="Dang tai POS..." />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <GlassCard
        title="Danh muc san pham"
        subtitle="Tap de them nhanh san pham vao gio hang."
        actions={
          <input
            className="input-shell min-w-[240px]"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tim san pham tai quay"
          />
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          {filteredProducts.map((product) => (
            <button
              type="button"
              key={product.id}
              onClick={() => addToCart(product)}
              className="glass-muted rounded-[28px] p-4 text-left transition hover:translate-y-[-1px] hover:bg-white/90"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{product.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {product.category} / {product.sku}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <ScanLine size={18} />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <p className="text-lg font-extrabold tracking-tight text-slate-950">
                  {formatCurrency(product.price)}
                </p>
                <StatusBadge tone={Number(product.stock_quantity) <= 10 ? 'warning' : 'info'}>
                  {product.stock_quantity} ton
                </StatusBadge>
              </div>
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard
        title="Hoa don hien tai"
        subtitle="Ap dung khach hang, voucher va thanh toan ngay."
        className="h-fit"
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="input-shell"
              value={selectedCustomerId}
              onChange={(event) => setSelectedCustomerId(event.target.value)}
            >
              <option value="">Khach le</option>
              {catalog.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name}
                </option>
              ))}
            </select>

            <select
              className="input-shell"
              value={selectedCouponId}
              onChange={(event) => setSelectedCouponId(event.target.value)}
            >
              <option value="">Khong dung voucher</option>
              {catalog.coupons.map((coupon) => (
                <option key={coupon.id} value={coupon.id}>
                  {coupon.code}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2 rounded-[28px] bg-slate-950 p-2 sm:grid-cols-3">
            {[
              { value: 'cash', label: 'Tien mat' },
              { value: 'card', label: 'The' },
              { value: 'banking', label: 'Chuyen khoan' }
            ].map((method) => (
              <button
                key={method.value}
                type="button"
                onClick={() => setPaymentMethod(method.value)}
                className={cn(
                  'rounded-[20px] px-3 py-3 text-sm font-semibold transition',
                  paymentMethod === method.value
                    ? 'bg-white text-slate-950'
                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                )}
              >
                {method.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {cartItems.length ? (
              cartItems.map((item) => (
                <div
                  key={item.id}
                  className="glass-muted rounded-[24px] px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, 0)}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/60 bg-white/70 text-slate-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="min-w-8 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <p className="font-semibold text-slate-900">
                      {formatCurrency(item.quantity * item.price)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-muted flex min-h-[220px] flex-col items-center justify-center rounded-[28px] px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-[24px] bg-white/80 text-slate-900">
                  <ShoppingCart size={24} />
                </div>
                <p className="mt-4 text-lg font-semibold text-slate-900">
                  Gio hang dang trong
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Them san pham o cot ben trai de tao hoa don moi.
                </p>
              </div>
            )}
          </div>

          <div className="glass-muted rounded-[28px] p-4">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Tam tinh</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
              <span>Giam gia</span>
              <span>- {formatCurrency(discount)}</span>
            </div>
            <div className="mt-4 flex items-center justify-between text-lg font-extrabold tracking-tight text-slate-950">
              <span>Tong thanh toan</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={!cartItems.length || submitting}
            className="button-primary w-full justify-center"
          >
            {submitting ? 'Dang xu ly thanh toan...' : 'Thanh toan hoa don'}
          </button>

          {checkoutMessage ? (
            <div className="rounded-2xl bg-sky-500/10 px-4 py-3 text-sm text-sky-700">
              {checkoutMessage}
            </div>
          ) : null}
        </div>
      </GlassCard>
    </div>
  );
}

export default PosPage;
