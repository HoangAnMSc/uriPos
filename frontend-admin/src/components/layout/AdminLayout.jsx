import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import MobileDock from './MobileDock';

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-10%] h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute bottom-10 right-[-10%] h-72 w-72 rounded-full bg-rose-100/30 blur-3xl" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1600px] gap-4 px-3 pb-24 pt-3 md:grid-cols-[320px_minmax(0,1fr)] md:px-4 md:pb-4">
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex min-w-0 flex-col gap-4">
          <AppHeader onOpenSidebar={() => setSidebarOpen(true)} />
          <div className="min-w-0">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileDock />
    </div>
  );
}

export default AdminLayout;
