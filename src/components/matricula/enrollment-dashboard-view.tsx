
"use client";

import { useState, useEffect } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import type { Layouts } from "react-grid-layout";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Filters } from "@/lib/types";
import { ColorPaletteSwitcher } from "@/components/dashboard/color-palette-switcher";
import { SpacepointAttainmentWidget } from "@/components/dashboard/spacepoint-attainment-widget";
import { EnrollmentSummaryStats } from "./enrollment-summary-stats";
import type { EnrollmentSummaryData } from "@/lib/api";

const ResponsiveGridLayout = WidthProvider(Responsive);

// WIDGET CONFIGURATION
const WIDGET_CONFIG = {
    'spacepoint-attainment': {
        title: 'Atingimento de Spacepoints',
        component: SpacepointAttainmentWidget,
        defaultLayout: { i: "spacepoint-attainment", x: 0, y: 0, w: 12, h: 14, minW: 6, minH: 8 }
    },
    // Future widgets can be added here
    // 'enrollment-by-polo': { ... }
};

const defaultWidgetKeys = Object.keys(WIDGET_CONFIG);

const defaultLayouts: Layouts = {
    lg: defaultWidgetKeys.map(key => WIDGET_CONFIG[key as keyof typeof WIDGET_CONFIG].defaultLayout),
};

const getFromLS = (key: string) => {
    if (typeof window === "undefined") return null;
    try {
        const ls = localStorage.getItem(key);
        return ls ? JSON.parse(ls) : null;
    } catch (e) {
        console.error("Failed to parse LS data", e);
        return null;
    }
};

const saveToLS = (key: string, value: any) => {
    if (typeof window !== "undefined") {
        localStorage.setItem(key, JSON.stringify(value));
    }
};

type EnrollmentDashboardViewProps = {
    summary: EnrollmentSummaryData;
    filters: Filters;
}

export function EnrollmentDashboardView({ summary, filters }: EnrollmentDashboardViewProps) {
    const [layouts, setLayouts] = useState<Layouts | null>(null);
    const [visibleWidgets, setVisibleWidgets] = useState<string[]>([]);

    useEffect(() => {
        // Unique keys for enrollment dashboard persistence
        const savedLayouts = getFromLS("enrollment-dashboard-layouts");
        const savedVisibleWidgets = getFromLS("enrollment-visible-widgets");

        const validSavedWidgets = savedVisibleWidgets ? savedVisibleWidgets.filter((key: string) => WIDGET_CONFIG[key as keyof typeof WIDGET_CONFIG]) : null;

        setVisibleWidgets(validSavedWidgets || defaultWidgetKeys);
        setLayouts(savedLayouts || defaultLayouts);
    }, []);

    const onLayoutChange = (_: any, newLayouts: Layouts) => {
        saveToLS("enrollment-dashboard-layouts", newLayouts);
        setLayouts(newLayouts);
    };

    const handleRemoveWidget = (widgetKey: string) => {
        const newWidgets = visibleWidgets.filter(key => key !== widgetKey);
        setVisibleWidgets(newWidgets);
        saveToLS("enrollment-visible-widgets", newWidgets);
    };

    const handleAddWidget = (widgetKey: string) => {
        const newWidgets = [...visibleWidgets, widgetKey];
        setVisibleWidgets(newWidgets);
        saveToLS("enrollment-visible-widgets", newWidgets);

        const newLayouts = { ...layouts };
        const widgetDefaultLayout = WIDGET_CONFIG[widgetKey as keyof typeof WIDGET_CONFIG].defaultLayout;

        Object.keys(newLayouts).forEach(bp => {
            newLayouts[bp] = [...(newLayouts[bp] || []), { ...widgetDefaultLayout, y: Infinity }];
        });
        setLayouts(newLayouts);
        saveToLS("enrollment-dashboard-layouts", newLayouts);
    };

    const onResetLayout = () => {
        setLayouts(defaultLayouts);
        setVisibleWidgets(defaultWidgetKeys);
        saveToLS("enrollment-dashboard-layouts", defaultLayouts);
        saveToLS("enrollment-visible-widgets", defaultWidgetKeys);
    };

    // Data mapping for widgets (if they need specific props)
    const componentDataMapping: { [key: string]: any } = {
        'spacepoint-attainment': {
            processoFilter: filters.processo,
            poloFilter: Array.isArray(filters.polo) ? filters.polo.join(',') : filters.polo
        },
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards Section */}
            <EnrollmentSummaryStats summary={summary} isLoading={false} />

            {/* Controls Section */}
            <div className="flex justify-end gap-2">
                <ColorPaletteSwitcher />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Adicionar Widget</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {Object.keys(WIDGET_CONFIG)
                            .filter(key => !visibleWidgets.includes(key))
                            .map(key => (
                                <DropdownMenuItem key={key} onSelect={() => handleAddWidget(key)}>
                                    {WIDGET_CONFIG[key as keyof typeof WIDGET_CONFIG].title}
                                </DropdownMenuItem>
                            ))}
                        {Object.keys(WIDGET_CONFIG).filter(key => !visibleWidgets.includes(key)).length === 0 && (
                            <div className="p-2 text-xs text-muted-foreground">Todos os widgets adicionados</div>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" onClick={onResetLayout}>Redefinir Layout</Button>
            </div>

            {/* Grid Layout */}
            {layouts ? (
                <ResponsiveGridLayout
                    layouts={layouts}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                    rowHeight={30}
                    onLayoutChange={onLayoutChange}
                    draggableHandle=".drag-handle"
                    margin={[16, 16]}
                >
                    {visibleWidgets.map(key => {
                        const config = WIDGET_CONFIG[key as keyof typeof WIDGET_CONFIG];
                        if (!config) return null;

                        const WidgetComponent = config.component;
                        const props = componentDataMapping[key];

                        return (
                            <div key={key}>
                                {/* 
                    IMPORTANT: The widget component must accept 'onRemove' prop 
                    and usually renders a card with a drag-handle header.
                */}
                                <WidgetComponent {...props} onRemove={() => handleRemoveWidget(key)} />
                            </div>
                        );
                    })}
                </ResponsiveGridLayout>
            ) : (
                <div className="text-center p-8">Carregando layout...</div>
            )}
        </div>
    );
}
