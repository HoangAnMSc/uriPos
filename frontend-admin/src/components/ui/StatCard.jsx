import { ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/utils';

function StatCard({ title, value, note, icon: Icon, className }) {
  return (
    <div className={cn('glass-panel rounded-[28px] p-5', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
            {value}
          </h3>
        </div>
        {Icon ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-slate-800">
            <Icon size={22} />
          </div>
        ) : null}
      </div>

      {note ? (
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1.5 text-xs font-semibold text-slate-600">
          <ArrowUpRight size={14} />
          {note}
        </div>
      ) : null}
    </div>
  );
}

export default StatCard;
