function LoadingScreen({ label = 'Dang tai du lieu...' }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="glass-panel flex items-center gap-4 rounded-[28px] px-6 py-5">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-200 border-t-slate-900" />
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="text-sm text-slate-500">He thong dang dong bo quyen va du lieu.</p>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
