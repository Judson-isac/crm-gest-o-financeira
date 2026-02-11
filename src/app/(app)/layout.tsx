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

  const logoVerticalUrl = config.appFavicon; // Used for sidebar collapsed state

  return (
    <SidebarProvider defaultOpen={false}>
      <Sidebar side="left" collapsible="icon" variant="floating">
        <AppSidebar
          permissions={permissions}
          appName={config.appName}
          appLogo={config.appLogo}
          appLogoDark={config.appLogoDark}
          appLogoHeight={config.appLogoHeight}
          appLogoIconHeight={config.appLogoIconHeight}
          appLogoSidebarScale={config.appLogoSidebarScale}
          appLogoSidebarPosition={config.appLogoSidebarPosition}
          appLogoSidebarOffsetX={config.appLogoSidebarOffsetX}
          appLogoSidebarOffsetY={config.appLogoSidebarOffsetY}
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
