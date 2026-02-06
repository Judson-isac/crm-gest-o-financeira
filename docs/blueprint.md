# **App Name**: VirtuaFinance CRM

## Core Features:

- Financial Record Import: Import financial records from .xlsx or .csv files, parse the data, and store it in the PostgreSQL database using Prisma.
- Data Normalization: Normalize the imported data to ensure consistency before saving it to the FinancialRecord table.
- Financial Record Listing: Display financial records in a paginated table with columns for Polo, Adicional, Categoria, Tipo, Valor Pago, Valor Repasse, Referência, and Import Date, with an option to delete each record.
- Data Filtering: Filter financial records based on Polo, Categoria, Mês, and Ano using dropdown filters and apply/clear buttons.
- Summary Cards: Display summary cards at the top of the Financial Record Listing page, showing Total Records, Total Receita Gerada, Total Repasse, and a breakdown by Tipo (Acordo, Descontos, Mensalidade, Serviço).
- Dashboard Data Aggregation: Aggregate data from the FinancialRecord table to calculate values for charts, including: Último Repasse Consolidado, Composição do Último Repasse, Mensalidades Recebidas, Cobranças na Rede, Ticket Médio, Descontos Rede, Faturamento Rede & Acordos Recebidos & Faturamento Sede and Receita por Polo.
- Real-Time Data Reflection: Ensures that dashboards update in real-time based on newly imported data or changes made to the records. This ensures that the graphics will always accurately reflect the data inside the database.

## Style Guidelines:

- Primary color: Royal Blue (#4169E1) for headers and main navigation, providing a sense of trust and stability.
- Background color: Light Gray (#F0F0F0) to provide a neutral and clean backdrop for the data-rich dashboards.
- Accent color: Emerald Green (#50C878) to highlight positive financial metrics and key performance indicators.
- Body font: 'PT Sans', a humanist sans-serif for a modern and readable user interface. Headline font: 'PT Sans', the same as body. No separate headline font is needed because this app has little body text and does not need a high level of visual styling.
- Use Lucide React icons to represent financial concepts, data types, and actions (e.g., import, export, delete, filter).
- Employ a consistent grid system with Tailwind CSS for aligning cards, tables, and charts; ensure sufficient spacing to avoid clutter.
- Implement subtle transitions and hover effects on buttons, cards, and chart elements to provide visual feedback without distracting from the data.