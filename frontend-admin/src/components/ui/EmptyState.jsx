function EmptyState({ title, description, action }) {
  return (
    <div className="glass-muted flex min-h-[220px] flex-col items-center justify-center rounded-[28px] border border-dashed px-6 py-10 text-center">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export default EmptyState;
