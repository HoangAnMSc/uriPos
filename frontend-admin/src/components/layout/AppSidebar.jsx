import { LogOut, Sparkles } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { navigationItems } from '../../config/navigation';
import { roleLabels } from '../../config/permissions';
import useAuth from '../../hooks/useAuth';
import usePermissions from '../../hooks/usePermissions';
import { cn, getInitials } from '../../lib/utils';

function SidebarLink({ item, onClick }) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-4 rounded-[24px] px-4 py-3 transition duration-200',
          isActive
            ? 'bg-slate-950 text-white shadow-soft'
            : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
        )
      }
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-current transition group-hover:bg-white">
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{item.label}</p>
        <p className="truncate text-xs opacity-75">{item.description}</p>
      </div>
    </NavLink>
  );
}

function AppSidebar({ open, onClose }) {
  const { profile, signOut } = useAuth();
  const { visibleNavigation } = usePermissions();

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-slate-950/20 backdrop-blur-sm transition md:hidden',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed left-3 top-3 z-40 flex h-[calc(100vh-1.5rem)] w-[84vw] max-w-[320px] flex-col rounded-[36px] border border-white/60 bg-white/70 p-4 shadow-glass backdrop-blur-2xl transition duration-300 md:sticky md:left-0 md:top-4 md:h-[calc(100vh-2rem)] md:w-full md:max-w-none',
          open ? 'translate-x-0' : '-translate-x-[110%] md:translate-x-0'
        )}
      >
        <div className="glass-muted rounded-[30px] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-slate-950 text-white">
              <Sparkles size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                Liquid Commerce
              </p>
              <h1 className="mt-1 text-lg font-extrabold tracking-tight text-slate-950">
                Admin Suite
              </h1>
            </div>
          </div>
        </div>

        <div className="mt-5 flex-1 space-y-2 overflow-y-auto pr-1">
          {navigationItems
            .filter((item) =>
              visibleNavigation.some((navItem) => navItem.moduleKey === item.moduleKey)
            )
            .map((item) => (
              <SidebarLink key={item.moduleKey} item={item} onClick={onClose} />
            ))}
        </div>

        <div className="glass-muted mt-5 rounded-[30px] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white">
              {getInitials(profile?.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {profile?.full_name}
              </p>
              <p className="truncate text-xs text-slate-500">
                {roleLabels[profile?.role] ?? 'Nhan vien'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="button-secondary mt-4 w-full justify-center gap-2"
          >
            <LogOut size={16} />
            Dang xuat
          </button>
        </div>
      </aside>
    </>
  );
}

export default AppSidebar;
