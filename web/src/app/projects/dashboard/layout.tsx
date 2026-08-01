import { AppSidebar } from "./components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardTopbar } from "./components/dashboard-topbar";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <SidebarProvider>
      <AppSidebar slug={slug} />
      <SidebarInset>
        <DashboardTopbar slug={slug} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
