import GlassCard from './GlassCard';

function BackendSetupNotice({ title, message, details }) {
  return (
    <div className="p-4 md:p-8">
      <GlassCard
        title={title ?? 'Supabase da ket noi, nhung backend chua san sang'}
        subtitle="Frontend dang goi du lieu that tu Supabase, vi vay backend can co du bang va function ma project yeu cau."
      >
        <div className="space-y-4 text-sm leading-7 text-slate-600">
          <p>{message}</p>
          {details ? (
            <div className="rounded-[24px] bg-amber-500/10 px-4 py-4 text-amber-900">
              {details}
            </div>
          ) : null}
          <div className="rounded-[24px] bg-slate-950 px-4 py-4 text-white">
            <p className="font-semibold">Can lam ngay trong Supabase SQL Editor:</p>
            <p className="mt-2">
              Chay toan bo file <code>backend/supabase/schema.sql</code>, sau do tao hoac
              cap nhat user admin trong <code>Authentication / Users</code>.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

export default BackendSetupNotice;
