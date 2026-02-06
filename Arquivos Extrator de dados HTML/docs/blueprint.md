# **App Name**: HTML Data Extractor

## Core Features:

- Metadata Extraction: Extract report metadata (Unidade, Mês/Referência, Período) from the header table.
- Polo Structure Identification: Identify and extract Polo information (Razão Social, Nome do Polo/Cidade, Dados Bancários) based on the background color of table rows.
- Transaction Parsing: Parse transaction data (Alunos/Descontos) from nested tables within each Polo, based on category headers.
- Data Mapping and Extraction: Extract relevant columns (RA/Código, Nome do Aluno, Curso, Data Ingresso, Tipo Lançamento, Parcela, Vencimento, Pagamento, Valor Bruto, Valor Líquido) from transaction rows.
- Financial Totals Aggregation: Aggregate financial totals (Total Bruto, Total Descontos, Total Líquido) for each Polo from the footer tables.
- Data Cleaning and Transformation: Clean and transform extracted data, including removing currency symbols and converting comma-separated numbers.
- Data validation and automatic bug fixing: Uses an LLM to validate data extraction and attempt to fix identified discrepancies

## Style Guidelines:

- Primary color: Light purple (#A099FF) to symbolize organization, data integrity and precision.
- Background color: Very light gray (#F0F0F5) to provide a clean and neutral backdrop.
- Accent color: Darker purple (#7A70CC) to highlight key information and interactive elements.
- Body and headline font: 'Inter', a grotesque-style sans-serif for a modern, machined, objective look; suitable for both headlines and body text.
- Simple, geometric icons for data categories and actions.
- Clear and structured layout to present extracted data in an easily digestible format.
- Subtle transitions and loading animations to enhance user experience.