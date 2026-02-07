import AppSidebar from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";
import { getAuthenticatedUser, getAuthenticatedUserPermissions } from "@/lib/api";
import { getSystemConfig, getRedeById } from "@/lib/db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthenticatedUser();
  const permissions = await getAuthenticatedUserPermissions();
  const config = await getSystemConfig();

  // Override logo if network has one
  let logoVerticalUrl = config.appFavicon; // Fallback to favicon for vertical logo
  if (user?.redeId) {
    const rede = await getRedeById(user.redeId);
    if (rede?.logoUrl) {
      config.appLogo = rede.logoUrl;
    }
    if (rede?.logoVerticalUrl) {
      logoVerticalUrl = rede.logoVerticalUrl;
    } else if (rede?.faviconUrl) {
      logoVerticalUrl = rede.faviconUrl;
    }
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar side="left" collapsible="icon" variant="floating">
        <AppSidebar
          permissions={permissions}
          appName={config.appName}
          appLogo={config.appLogo}
          appLogoHeight={config.appLogoHeight}
          logoVerticalUrl={logoVerticalUrl}
        />
      </Sidebar>
      <SidebarInset>
        <AppHeader user={user} appName={config.appName} />
        <main className="flex-1 p-4 lg:p-6 bg-transparent">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
