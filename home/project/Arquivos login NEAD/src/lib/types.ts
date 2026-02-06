
export type Polo = 'Conchas' | 'Laranjal Paulista' | 'Bofete' | 'Botucatu' | 'Pereiras' | 'Anhembi' | string;
export type Categoria = 'Receita Graduação' | 'Receita Pós-Graduação' | 'Receita Profissionalizantes' | 'Outras Receitas' | 'Receita Técnico' | string;
export type Tipo = 'Mensalidade' | 'Acordo' | 'Serviço' | 'Descontos';

export type FinancialRecord = {
  id: string;
  polo: Polo;
  categoria: Categoria;
  tipo: Tipo;
  parcela: number;
  valor_pago: number;
  valor_repasse: number;
  referencia_mes: number;
  referencia_ano: number;
  data_importacao: string; // ISO string
  import_id: string;
  nome_arquivo: string;
  tipo_importacao: 'NEAD' | 'Arquivo';
  sigla_curso?: string;
};

export type SummaryData = {
  totalRecords: number;
  totalReceita: number;
  totalRepasse: number;
  tipoCounts: Record<Tipo, number>;
  monthlyGrowth?: number;
};

export type Filters = {
  polo?: string | string[];
  categoria?: string;
  mes?: number;
  ano?: number;
};

export type ImportInfo = {
  id: string; // The unique ID of the log entry itself
  import_id: string; // The ID shared by all records in this batch or the unique ID for the course import
  nome_arquivo?: string;
  data_importacao: string; // ISO string
  total_registros: number;
  referencia_mes?: number;
  referencia_ano?: number;
  tipo_importacao: 'NEAD' | 'Arquivo' | 'Cursos';
};

export type Despesa = {
  id: string;
  polo: Polo;
  ano: number;
  mes: number;
  tipo_despesa: 'GERAL' | 'EAD' | 'HIBRIDO';
  sigla_curso?: string;
  descricao: string;
  valor: number;
};

export type LucratividadeData = {
  polo: string;
  receita: number;
  repasse: number;
  despesa: number;
  lucro: number;
};

export type LucratividadePorMetodologiaData = {
  polo: string;
  metodologia: 'EAD' | 'HIBRIDO' | 'Outros';
  receita: number;
  repasse: number;
  despesa: number; // prorated
  lucro: number;
};

export type Curso = {
  sigla: string;
  nome: string;
  metodologia: 'EAD' | 'HIBRIDO' | string;
};
