
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

import { UltimoRepasseChart } from "./ultimo-repasse-chart";
import { ComposicaoRepasseChart } from "./composicao-repasse-chart";
import { MensalidadesChart } from "./mensalidades-chart";
import { DescontosChart } from "./descontos-chart";
import { FaturamentoEvolucaoChart } from "./faturamento-evolucao-chart";
import { ReceitaPorPoloTable } from "./receita-por-polo-table";
import { TicketMedioTable } from "./ticket-medio-table";
import { AcordosChart } from "./acordos-chart";
import { SummaryStats } from "./summary-stats";
import { ReceitaCategoriaChart } from "./receita-categoria-chart";
import { TopPolosChart } from "./top-polos-chart";
import { LucroLiquidoTable } from "./lucro-liquido-table";
import { LucroLiquidoChart } from "./lucro-liquido-chart";
import { TopCursosChart } from "./top-cursos-chart";
import { TopCursosPorPoloTable } from "./top-cursos-por-polo-table";
import { SpacepointAttainmentWidget } from "./spacepoint-attainment-widget";
import { Button } from "@/components/ui/button";
import type { Filters } from "@/lib/types";
import { ColorPaletteSwitcher } from "./color-palette-switcher";

const ResponsiveGridLayout = WidthProvider(Responsive);

const WIDGET_CONFIG = {
  'lucro-liquido-tabela': { title: 'Tabela: Lucro Líquido (Geral)', component: LucroLiquidoTable, defaultLayout: { i: "lucro-liquido-tabela", x: 0, y: 0, w: 6, h: 9, minW: 4, minH: 8 } },
  'lucro-liquido-grafico': { title: 'Gráfico: Lucro Líquido (Geral)', component: LucroLiquidoChart, defaultLayout: { i: "lucro-liquido-grafico", x: 6, y: 0, w: 6, h: 9, minW: 4, minH: 8 } },
  'ticket-medio': { title: 'Ticket Médio', component: TicketMedioTable, defaultLayout: { i: "ticket-medio", x: 0, y: 9, w: 6, h: 9, minW: 4, minH: 8 } },
  'top-polos': { title: 'Top 5 Polos', component: TopPolosChart, defaultLayout: { i: "top-polos", x: 6, y: 9, w: 6, h: 9, minW: 4, minH: 8 } },
  'faturamento': { title: 'Faturamento Rede', component: FaturamentoEvolucaoChart, defaultLayout: { i: "faturamento", x: 0, y: 18, w: 8, h: 7, minW: 4, minH: 5 } },
  'receita-categoria': { title: 'Receita por Categoria', component: ReceitaCategoriaChart, defaultLayout: { i: "receita-categoria", x: 8, y: 18, w: 4, h: 7, minW: 3, minH: 5 } },
  'repasse-consolidado': { title: 'Repasse Consolidado', component: UltimoRepasseChart, defaultLayout: { i: "repasse-consolidado", x: 0, y: 25, w: 6, h: 9, minW: 4, minH: 8 } },
  'composicao-repasse': { title: 'Composição do Repasse', component: ComposicaoRepasseChart, defaultLayout: { i: "composicao-repasse", x: 6, y: 25, w: 6, h: 9, minW: 4, minH: 8 } },
  'mensalidades': { title: 'Mensalidades Recebidas', component: MensalidadesChart, defaultLayout: { i: "mensalidades", x: 0, y: 34, w: 4, h: 7, minW: 3, minH: 7 } },
  'acordos': { title: 'Acordos Recebidos', component: AcordosChart, defaultLayout: { i: "acordos", x: 4, y: 34, w: 4, h: 7, minW: 3, minH: 7 } },
  'descontos': { title: 'Descontos Rede', component: DescontosChart, defaultLayout: { i: "descontos", x: 8, y: 34, w: 4, h: 7, minW: 3, minH: 7 } },
  'receita-polo-tabela': { title: 'Receita por Polo', component: ReceitaPorPoloTable, defaultLayout: { i: "receita-polo-tabela", x: 0, y: 41, w: 12, h: 9, minW: 6, minH: 6 } },
  'top-5-cursos': { title: 'Top 5 Cursos (Geral)', component: TopCursosChart, defaultLayout: { i: "top-5-cursos", x: 0, y: 50, w: 6, h: 9, minW: 4, minH: 8 } },
  'top-5-cursos-polo': { title: 'Top 5 Cursos por Polo', component: TopCursosPorPoloTable, defaultLayout: { i: "top-5-cursos-polo", x: 6, y: 50, w: 6, h: 9, minW: 4, minH: 8 } },
  'spacepoints-attainment': { title: 'Atingimento Spacepoints', component: SpacepointAttainmentWidget, defaultLayout: { i: "spacepoints-attainment", x: 0, y: 59, w: 12, h: 8, minW: 6, minH: 6 } },
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

type DashboardViewProps = {
  data: any;
  distinctValues: { polos: string[]; anos: number[] };
  filters: Filters;
}

export function DashboardView({ data, distinctValues, filters }: DashboardViewProps) {
  const [layouts, setLayouts] = useState<Layouts | null>(null);
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>([]);

  useEffect(() => {
    const savedLayouts = getFromLS("dashboard-layouts");
    const savedVisibleWidgets = getFromLS("dashboard-visible-widgets");

    const validSavedWidgets = savedVisibleWidgets ? savedVisibleWidgets.filter((key: string) => WIDGET_CONFIG[key as keyof typeof WIDGET_CONFIG]) : null;

    setVisibleWidgets(validSavedWidgets || defaultWidgetKeys);
    setLayouts(savedLayouts || defaultLayouts);
  }, []);

  const onLayoutChange = (_: any, newLayouts: Layouts) => {
    saveToLS("dashboard-layouts", newLayouts);
    setLayouts(newLayouts);
  };

  const handleRemoveWidget = (widgetKey: string) => {
    const newWidgets = visibleWidgets.filter(key => key !== widgetKey);
    setVisibleWidgets(newWidgets);
    saveToLS("dashboard-visible-widgets", newWidgets);
  };

  const handleAddWidget = (widgetKey: string) => {
    const newWidgets = [...visibleWidgets, widgetKey];
    setVisibleWidgets(newWidgets);
    saveToLS("dashboard-visible-widgets", newWidgets);

    const newLayouts = { ...layouts };
    const widgetDefaultLayout = WIDGET_CONFIG[widgetKey as keyof typeof WIDGET_CONFIG].defaultLayout;

    Object.keys(newLayouts).forEach(bp => {
      newLayouts[bp] = [...(newLayouts[bp] || []), { ...widgetDefaultLayout, y: Infinity }];
    });
    setLayouts(newLayouts);
    saveToLS("dashboard-layouts", newLayouts);
  };

  const onResetLayout = () => {
    setLayouts(defaultLayouts);
    setVisibleWidgets(defaultWidgetKeys);
    saveToLS("dashboard-layouts", defaultLayouts);
    saveToLS("dashboard-visible-widgets", defaultWidgetKeys);
  };

  const componentDataMapping: { [key: string]: any } = {
    'lucro-liquido-tabela': { data: data.lucratividadeData },
    'lucro-liquido-grafico': { data: data.lucratividadeData },
    'ticket-medio': { data: data.ticketMedioData },
    'top-polos': { data: data.topPolos },
    'faturamento': { data: data.faturamentoEvolucao, distinctAnos: distinctValues.anos, globalFilters: filters },
    'receita-categoria': { data: data.receitaPorCategoria },
    'repasse-consolidado': { data: data.repassePorPolo },
    'composicao-repasse': { data: data.composicaoRepasse },
    'mensalidades': { data: data.mensalidadesEvolucao, distinctAnos: distinctValues.anos, globalFilters: filters },
    'acordos': { data: data.acordosEvolucao, distinctAnos: distinctValues.anos, globalFilters: filters },
    'descontos': { data: data.descontosEvolucao, distinctAnos: distinctValues.anos, globalFilters: filters },
    'receita-polo-tabela': { data: data.receitaPorPolo.data, footer: data.receitaPorPolo.footer, columns: data.receitaPorPolo.columns },
    'top-5-cursos': { data: data.topCursos },
    'top-5-cursos-polo': { data: data.topCursosPorPolo },
    'spacepoints-attainment': {},
  };

  return (
    <div className="space-y-6">
      <SummaryStats summary={data.summaryData} isLoading={false} />

      <div className="flex justify-end gap-2">
        <ColorPaletteSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Adicionar Widget</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {Object.keys(WIDGET_CONFIG)
              .filter(key => !visibleWidgets.includes(key))
              .map(key => (
                <DropdownMenuItem key={key} onSelect={() => handleAddWidget(key)}>
                  {WIDGET_CONFIG[key as keyof typeof WIDGET_CONFIG].title}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" onClick={onResetLayout}>Redefinir Layout</Button>
      </div>

      {layouts ? (
        <ResponsiveGridLayout
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={30}
          onLayoutChange={onLayoutChange}
          draggableHandle=".drag-handle"
        >
          {visibleWidgets.map(key => {
            const config = WIDGET_CONFIG[key as keyof typeof WIDGET_CONFIG];
            if (!config) return null;

            const WidgetComponent = config.component;
            const props = componentDataMapping[key];

            return (
              <div key={key}>
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
