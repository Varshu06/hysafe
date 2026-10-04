import React, { useState } from 'react';
import { Sidebar, Navbar } from '@components/Layout';

interface LayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(2,132,199,0.1),_transparent_28%),linear-gradient(180deg,_#F0F9FF_0%,_#E0F2FE_100%)]">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex flex-1 flex-col md:pl-72">
        <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 px-4 py-6 lg:px-10 xl:px-12">
          <div className="w-full space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
