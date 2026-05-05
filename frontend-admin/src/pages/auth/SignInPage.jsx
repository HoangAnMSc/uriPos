import { ArrowRight, LockKeyhole, Mail, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getFirstAllowedPath } from '../../config/permissions';
import useAuth from '../../hooks/useAuth';

const demoCredentials = {
  email: 'admin@liquidcommerce.vn',
  password: '123456'
};

function SignInPage() {
  const { user, profile, signIn, demoMode, backendIssue } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({
    email: '',
    password: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (demoMode) {
      setForm(demoCredentials);
    }
  }, [demoMode]);

  useEffect(() => {
    if (user) {
      const nextPath =
        location.state?.from?.pathname ?? getFirstAllowedPath(profile?.role ?? 'admin');
      navigate(nextPath, { replace: true });
    }
  }, [user, profile, location.state, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const result = await signIn(form);

    if (!result.success) {
      setError(result.message ?? 'Dang nhap that bai');
    }

    setSubmitting(false);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="absolute inset-0">
        <div className="absolute left-[5%] top-[8%] h-56 w-56 rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute bottom-[10%] right-[8%] h-72 w-72 rounded-full bg-amber-100/50 blur-3xl" />
      </div>

      <div className="relative grid w-full max-w-6xl gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-panel hidden rounded-[40px] p-8 lg:block">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-sky-700">
              <Sparkles size={16} />
              Apple-inspired liquid admin
            </div>
            <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-slate-950">
              Quan ly ban hang mem, nhanh, va ro quyen truy cap.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Dashboard, POS, thong ke, san pham, khach hang va voucher duoc gom vao
              mot giao dien glassmorphism de dung tren ca desktop va mobile.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                'Sidebar tu dong an hien theo role',
                'Supabase Auth + RLS san sang',
                'POS de ban hang tai quay',
                'Chart doanh thu, ton kho, khach hang'
              ].map((item) => (
                <div key={item} className="glass-muted rounded-[28px] p-4 text-sm font-medium text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-[40px] p-6 md:p-8">
          <div className="mx-auto max-w-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-950 text-white">
              <Sparkles size={28} />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-950">
              Dang nhap admin
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Su dung tai khoan Supabase de truy cap he thong. Neu chua cau hinh env,
              app se chay o demo mode de test giao dien.
            </p>

            {demoMode ? (
              <div className="mt-6 rounded-[24px] bg-sky-500/10 p-4 text-sm leading-6 text-sky-800">
                Demo mode dang bat. Ban co the dang nhap bang gia tri mac dinh trong form
                de xem day du giao dien va phan quyen.
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] bg-white/60 p-4 text-sm leading-6 text-slate-600">
                Project dang dung Supabase that. Hay dang nhap bang email va mat khau da tao
                trong Authentication / Users.
              </div>
            )}

            {backendIssue ? (
              <div className="mt-6 rounded-[24px] bg-amber-500/10 p-4 text-sm leading-6 text-amber-900">
                <p className="font-semibold">{backendIssue.title}</p>
                <p className="mt-2">{backendIssue.message}</p>
              </div>
            ) : null}

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    className="input-shell pl-11"
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="admin@liquidcommerce.vn"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Mat khau</span>
                <div className="relative">
                  <LockKeyhole
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    className="input-shell pl-11"
                    type="password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="Nhap mat khau"
                  />
                </div>
              </label>

              {error ? (
                <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="button-primary w-full justify-center gap-2"
              >
                {submitting ? 'Dang vao he thong...' : 'Dang nhap'}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SignInPage;
