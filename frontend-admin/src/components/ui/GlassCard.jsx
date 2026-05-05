import { cn } from '../../lib/utils';

function GlassCard({
  title,
  subtitle,
  actions,
  className,
  bodyClassName,
  children
}) {
  return (
    <section className={cn('glass-panel rounded-[28px] p-5 md:p-6', className)}>
      {(title || subtitle || actions) && (
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            {title && <h2 className="section-title">{title}</h2>}
            {subtitle && (
              <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
            )}
          </div>

          {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
        </div>
      )}

      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export default GlassCard;
