"use client";

import React from "react";
import {
    Sidebar,
    SidebarContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarHeader,
    SidebarFooter,
    SidebarProvider,
    useSidebar,
    SidebarRail,
    SidebarInset
} from "@/components/ui/sidebar";
import { ChevronsLeft, ChevronsRight, LayoutDashboard, Users, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Same interface as page.tsx
interface SystemConfig {
    appName: string;
    appLogo: string;
    appFavicon?: string;
    appLogoHeight?: string;
    appLogoSidebarWidth?: string;
    appLogoSidebarScale?: string;
    appLogoIconHeight?: string;
    appLogoLoginScale?: string;
    appLogoLoginPosition?: 'center' | 'left' | 'right';
    appLogoLoginOffsetX?: number;
    appLogoLoginOffsetY?: number;
    appLogoSidebarPosition?: 'left' | 'center' | 'right';
    appLogoSidebarOffsetX?: number;
    appLogoSidebarOffsetY?: number;
    appLogoDark?: string; // New
    appFaviconDark?: string; // New
}

export function SidebarPreviewWrapper({ config }: { config: SystemConfig }) {
    return (
        <div
            className="w-full h-[500px] border rounded-md overflow-hidden bg-slate-50 relative isolate"
            style={{
                // CRITICAL: This forces 'fixed' children (like the Sidebar) 
                // to be positioned relative to THIS container, not the viewport.
                transform: 'translateZ(0)'
            }}
        >
            <SidebarProvider
                defaultOpen={true}
                className="
                    h-full min-h-0 w-full relative
                    /* Override Sidebar Wrapper Height */
                    [&>div[data-state]]:!h-full
                    /* Override Spacer and Content Height */
                    [&>div[data-state]>div]:!h-full
                    /* Force Content to be Absolute */
                    [&_[data-sidebar=sidebar]]:!absolute
                    [&_[data-sidebar=sidebar]]:!inset-0
                    [&_[data-sidebar=sidebar]]:!w-full
                "
                style={{
                    // Force the sidebar width variables to match the collapsed/expanded state locally if needed
                    // But SidebarProvider handles this via Context.
                }}
            >
                <PreviewSidebarContent config={config} />
                <SidebarInset className="min-h-0 h-full overflow-hidden bg-transparent">
                    <main className="flex-1 p-6 h-full overflow-auto">
                        <div className="h-8 w-48 bg-slate-200 rounded mb-6"></div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="h-32 bg-white rounded-xl border shadow-sm"></div>
                            <div className="h-32 bg-white rounded-xl border shadow-sm"></div>
                        </div>
                    </main>
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}

function PreviewSidebarContent({ config }: { config: SystemConfig }) {
    const { state, toggleSidebar } = useSidebar();

    // Mock permissions/state for preview
    const appName = config.appName || "App Name";
    const appLogo = config.appLogo;

    return (
        <Sidebar
            collapsible="icon"
            className="!absolute !h-full border-r-0 z-10"
        >
            <SidebarHeader>
                <div className="flex h-12 items-center justify-start gap-2 overflow-hidden px-2 w-full transition-all duration-300">
                    {/* Horizontal Logo (Visible when Expanded) */}
                    <div className={cn(
                        "group-data-[state=collapsed]:hidden flex items-center flex-1 min-w-0 transition-all duration-300",
                        config.appLogoSidebarPosition === 'center' ? 'justify-center' :
                            config.appLogoSidebarPosition === 'right' ? 'justify-end' : 'justify-start'
                    )}>
                        {appLogo ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={appLogo}
                                    alt="Logo"
                                    style={{
                                        height: `${config.appLogoHeight || '32'}px`,
                                        transform: `scale(${config.appLogoSidebarScale || '1'}) translate(${config.appLogoSidebarOffsetX || 0}px, ${config.appLogoSidebarOffsetY || 0}px)`
                                    }}
                                    className={cn(
                                        "w-auto object-contain shrink-0 transition-all duration-300",
                                        config.appLogoDark ? "dark:hidden" : ""
                                    )}
                                />
                                {config.appLogoDark && (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={config.appLogoDark}
                                        alt="Logo Dark"
                                        style={{
                                            height: `${config.appLogoHeight || '32'}px`,
                                            transform: `scale(${config.appLogoSidebarScale || '1'}) translate(${config.appLogoSidebarOffsetX || 0}px, ${config.appLogoSidebarOffsetY || 0}px)`
                                        }}
                                        className={cn(
                                            "w-auto object-contain shrink-0 transition-all duration-300 hidden dark:block"
                                        )}
                                    />
                                )}
                            </>
                        ) : (
                            // Fallback Mock (Icon Only)
                            <div className="flex items-center justify-center">
                                <div className="h-8 w-8 bg-primary/20 rounded shrink-0 flex items-center justify-center">
                                    <span className="text-xs font-bold text-primary">A</span>
                                </div>
                            </div>
                        )}
                        <h2 className={cn(
                            "text-lg font-semibold text-sidebar-foreground whitespace-nowrap ml-2 transition-all duration-300",
                            appLogo ? "hidden" : "opacity-100"
                        )}>
                            {/* Only render text if no logo, but we handle visibility via class for transition if we wanted, 
                                but user reports issues, so let's be strict. */}
                            {!appLogo && appName}
                        </h2>
                    </div>

                    {/* Vertical Logo (Visible when Collapsed) */}
                    <div className="hidden group-data-[state=collapsed]:flex items-center justify-center w-full">
                        {(config.appFavicon || appLogo) ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={config.appFavicon || appLogo}
                                    alt="Icon"
                                    style={{ height: `${config.appLogoIconHeight || '32'}px` }}
                                    className={cn(
                                        "w-auto object-contain shrink-0 mx-auto transition-all duration-300",
                                        (config.appFaviconDark || config.appLogoDark) ? "dark:hidden" : ""
                                    )}
                                />
                                {(config.appFaviconDark || config.appLogoDark) && (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={config.appFaviconDark || config.appLogoDark}
                                        alt="Icon Dark"
                                        style={{ height: `${config.appLogoIconHeight || '32'}px` }}
                                        className="w-auto object-contain shrink-0 mx-auto transition-all duration-300 hidden dark:block"
                                    />
                                )}
                            </>
                        ) : (
                            <div className="h-6 w-6 bg-primary/20 rounded mx-auto" />
                        )}
                    </div>

                    {/* Hidden Text Logic from AppSidebar - Redundant if Logo Exists */}
                    {!appLogo && (
                        <h2 className={cn(
                            "text-lg font-semibold text-sidebar-foreground whitespace-nowrap transition-all duration-300 ease-in-out",
                            "group-data-[state=collapsed]:group-data-[collapsible=icon]:hidden"
                        )}>
                            {appName}
                        </h2>
                    )}
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarMenu>
                    {/* Mock Menu Items based on AppSidebar logic */}
                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Dashboard">
                            <LayoutDashboard />
                            <span>Dashboard</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Matrículas" isActive={true}>
                            <Users />
                            <span>Matrículas</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton tooltip="Ranking">
                            <Trophy />
                            <span>Ranking</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter>
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-10 w-10">
                    {state === 'expanded' ? <ChevronsLeft /> : <ChevronsRight />}
                    <span className="sr-only">Recolher sidebar</span>
                </Button>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
