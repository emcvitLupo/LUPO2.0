-- ==============================================================================
-- AGGIORNAMENTO SCHEMA SUPABASE: REAGENTARIO (TABELLE reagenti E reagenti_ritirati)
-- ==============================================================================
-- Questo script aggiunge in sicurezza (IF NOT EXISTS) tutte le colonne del Reagentario
-- che potrebbero mancare nel database, compresa la nuova voce "fornitore" e i campi 
-- avanzati di tracciamento (scadenze chiusa/aperta, rivalidazione, CRM, certificati, ecc.)
-- ==============================================================================

-- 1. TABELLA: reagenti (Inventario Attivo Reagenti e Standard)
ALTER TABLE reagenti ADD COLUMN IF NOT EXISTS fornitore TEXT;
ALTER TABLE reagenti ADD COLUMN IF NOT EXISTS numero_progressivo INTEGER;
ALTER TABLE reagenti ADD COLUMN IF NOT EXISTS data_acquisto TEXT;
ALTER TABLE reagenti ADD COLUMN IF NOT EXISTS data_apertura TEXT;
ALTER TABLE reagenti ADD COLUMN IF NOT EXISTS data_scadenza_chiusa TEXT;
ALTER TABLE reagenti ADD COLUMN IF NOT EXISTS data_scadenza_aperta TEXT;
ALTER TABLE reagenti ADD COLUMN IF NOT EXISTS data_ultima_rivalidazione TEXT;
ALTER TABLE reagenti ADD COLUMN IF NOT EXISTS data_nuova_scadenza TEXT;
ALTER TABLE reagenti ADD COLUMN IF NOT EXISTS condizioni_conservazione TEXT;
ALTER TABLE reagenti ADD COLUMN IF NOT EXISTS applicazione TEXT;
ALTER TABLE reagenti ADD COLUMN IF NOT EXISTS certificato TEXT;
ALTER TABLE reagenti ADD COLUMN IF NOT EXISTS codice_mr TEXT;

-- 2. TABELLA: reagenti_ritirati (Storico Ritiro e Dismissione Reagenti)
ALTER TABLE reagenti_ritirati ADD COLUMN IF NOT EXISTS fornitore TEXT;

-- Notifica esito
COMMENT ON COLUMN reagenti.fornitore IS 'Nome o ragione sociale del fornitore commerciale';
COMMENT ON COLUMN reagenti_ritirati.fornitore IS 'Nome o ragione sociale del fornitore commerciale al momento del ritiro';
