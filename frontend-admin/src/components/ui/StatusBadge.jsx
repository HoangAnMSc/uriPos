import { cn } from '../../lib/utils';

const toneClasses = {
  neutral: 'bg-slate-900/5 text-slate-600',
  success: 'bg-emerald-500/12 text-emerald-700',
  warning: 'bg-amber-500/12 text-amber-700',
  danger: 'bg-rose-500/12 text-rose-700',
  info: 'bg-sky-500/12 text-sky-700'
};

function StatusBadge({ children, tone = 'neutral' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        toneClasses[tone]
      )}
    >
      {children}
    </span>
  );
}

export default StatusBadge;
