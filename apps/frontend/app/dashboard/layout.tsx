import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { DashboardFilterProvider } from "@/components/dashboard/filters";
import { workspace } from "@/lib/mock/core";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <DashboardFilterProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar className="hidden md:flex" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar workspaceName={workspace.name} />
          <main className="scrollbar-thin flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-[1400px] flex-col gap-6 p-4 sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DashboardFilterProvider>
  );
}
