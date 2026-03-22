import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Providers } from "@/app/providers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <div className="flex h-screen overflow-hidden bg-gray-50/50">
        <Sidebar />
        
        <div className="flex-1 flex flex-col md:ml-64 relative w-full h-full overflow-hidden">
          <TopBar />
          
          <main className="flex-1 overflow-y-auto w-full p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 relative">
            {children}
          </main>
        </div>

        <MobileNav />
      </div>
    </Providers>
  );
}
