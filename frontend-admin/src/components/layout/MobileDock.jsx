import { NavLink } from 'react-router-dom';
import usePermissions from '../../hooks/usePermissions';
import { cn } from '../../lib/utils';

function MobileDock() {
  const { visibleNavigation } = usePermissions();
  const compactItems = visibleNavigation.slice(0, 4);

  return (
    <div className="fixed bottom-4 left-1/2 z-20 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 md:hidden">
      <div className="glass-panel grid grid-cols-4 rounded-[30px] p-2">
        {compactItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.moduleKey}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 rounded-[22px] px-2 py-3 text-center text-[11px] font-semibold transition',
                  isActive
                    ? 'bg-slate-950 text-white'
                    : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                )
              }
            >
              <Icon size={18} />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

export default MobileDock;
