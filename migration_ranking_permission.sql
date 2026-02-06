ALTER TABLE funcoes ADD COLUMN "verRanking" BOOLEAN DEFAULT FALSE;
UPDATE funcoes SET "verRanking" = TRUE WHERE nome = 'Administrador' OR nome = 'Superadmin';
