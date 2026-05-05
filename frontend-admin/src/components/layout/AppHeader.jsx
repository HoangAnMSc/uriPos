import { Menu, Sparkle, UserCog } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { navigationItems } from '../../config/navigation';
import useAuth from '../../hooks/useAuth';

function AppHeader({ onOpenSidebar }) {
  const location = useLocation();
  const { profile, demoMode } = useAuth();

  const activeNav =
    navigationItems.find((item) => location.pathname.startsWith(item.path)) ?? navigationItems[0];

  return (
    <header className="glass-panel sticky top-3 z-20 rounded-[30px] px-4 py-4 md:px-6">
      <div className="flex items-start gap-3 md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/70 text-slate-700 md:hidden"
            aria-label="Mo menu"
          >
            <Menu size={20} />
          </button>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
              {activeNav.label}
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
              {activeNav.description}
            </h2>
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {demoMode ? (
            <div className="flex items-center gap-2 rounded-full bg-sky-500/12 px-4 py-2 text-sm font-semibold text-sky-700">
              <Sparkle size={16} />
              Demo mode
            </div>
          ) : null}

          <div className="glass-muted flex items-center gap-3 rounded-full px-4 py-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <UserCog size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{profile?.full_name}</p>
              <p className="text-xs text-slate-500">Quan tri van hanh</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
