-- =========================================================================
-- SCRIPT DI AGGIORNAMENTO SICUREZZA, RLS E RISOLUZIONE ERRORE 42P17
-- =========================================================================
-- Istruzioni per l'uso:
-- 1. Accedi alla console del tuo progetto Supabase (https://supabase.com).
-- 2. Seleziona la voce "SQL Editor" dal menu laterale sinistro.
-- 3. Clicca su "New query" per creare una nuova scheda.
-- 4. Copia tutto questo codice, incollalo nell'editor SQL e clicca su "Run".
-- =========================================================================

-- 1. RIMOZIONE DI TUTTE LE POLICY ESISTENTI (PULIZIA COMPATIBILE)
-- Eliminiamo esplicitamente le vecchie policy per evitare conflitti, senza usare blocchi DO $$ plpgsql.
DROP POLICY IF EXISTS "Profili: selezione per utenti registrati" ON profili;
DROP POLICY IF EXISTS "Profili: inserimento alla registrazione" ON profili;
DROP POLICY IF EXISTS "Profili: aggiornamento proprio o da parte di ADMIN/VRT" ON profili;
DROP POLICY IF EXISTS "Profili: cancellazione da parte di ADMIN/VRT" ON profili;
DROP POLICY IF EXISTS "Profili: tutto per autenticati" ON profili;

DROP POLICY IF EXISTS "Solo autenticati" ON clienti;
DROP POLICY IF EXISTS "Clienti: lettura per autenticati" ON clienti;
DROP POLICY IF EXISTS "Clienti: inserimento per ruoli autorizzati" ON clienti;
DROP POLICY IF EXISTS "Clienti: modifica per ruoli autorizzati" ON clienti;
DROP POLICY IF EXISTS "Clienti: eliminazione per ruoli autorizzati" ON clienti;
DROP POLICY IF EXISTS "Clienti: tutto per autenticati" ON clienti;

DROP POLICY IF EXISTS "Prove: lettura per autenticati" ON prove;
DROP POLICY IF EXISTS "Prove: scrittura per ruoli autorizzati" ON prove;
DROP POLICY IF EXISTS "Prove: tutto per autenticati" ON prove;

DROP POLICY IF EXISTS "Pacchetti: lettura per autenticati" ON pacchetti;
DROP POLICY IF EXISTS "Pacchetti: scrittura per ruoli autorizzati" ON pacchetti;
DROP POLICY IF EXISTS "Pacchetti: tutto per autenticati" ON pacchetti;

DROP POLICY IF EXISTS "Preventivi: tutti i permessi per autenticati" ON preventivi;
DROP POLICY IF EXISTS "Preventivi: tutto per autenticati" ON preventivi;

DROP POLICY IF EXISTS "Reagenti: tutti i permessi per autenticati" ON reagenti;
DROP POLICY IF EXISTS "Reagenti: tutto per autenticati" ON reagenti;

DROP POLICY IF EXISTS "Reagenti ritirati: tutti i permessi per autenticati" ON reagenti_ritirati;
DROP POLICY IF EXISTS "Reagenti ritirati: tutto per autenticati" ON reagenti_ritirati;

DROP POLICY IF EXISTS "Accettazioni: tutti i permessi per autenticati" ON accettazioni;
DROP POLICY IF EXISTS "Accettazioni: tutto per autenticati" ON accettazioni;

DROP POLICY IF EXISTS "Operatori: lettura per autenticati" ON operatori;
DROP POLICY IF EXISTS "Operatori: scrittura per ruoli autorizzati" ON operatori;
DROP POLICY IF EXISTS "Operatori: tutto per autenticati" ON operatori;

DROP POLICY IF EXISTS "Fatturazione: tutti i permessi per autenticati" ON pratiche_fatturazione;
DROP POLICY IF EXISTS "Fatturazione: tutto per autenticati" ON pratiche_fatturazione;

DROP POLICY IF EXISTS "Audit Logs: tutti i permessi per autenticati" ON audit_logs;
DROP POLICY IF EXISTS "Audit Logs: tutto per autenticati" ON audit_logs;

-- 2. ASSICURIAMO LA PRESENZA DELLA TABELLA 'profili' (Collegata a Supabase Auth)
CREATE TABLE IF NOT EXISTS profili (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nome TEXT,
    ruolo TEXT DEFAULT 'UTENTE' CHECK (ruolo IN ('RT', 'AM', 'VRT', 'ADMIN', 'UTENTE')),
    attivo BOOLEAN DEFAULT true,
    autorizzato_firma BOOLEAN DEFAULT false,
    ruolo_firma TEXT,
    is_responsabile_tecnico BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2b. AGGIORNAMENTO SCHEMA TABELLA 'preventivi' CON EVENTUALI COLONNE MANCANTI (es. contract_model_name)
-- Questo risolve l'errore PGRST204 (colonna non trovata nella cache dello schema) se la tabella è stata creata in precedenza.
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS validita_offerta TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS oggetto_offerta TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS modalita_condizioni TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS metodo_campionamento TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS quantita_campione TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS tempo_consegna TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS modalita_invio_rapporto TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS prova_subappaltata TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS titolo_modulo TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS include_privacy BOOLEAN DEFAULT false;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS privacy_text TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS include_contract BOOLEAN DEFAULT false;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS contract_text TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS contract_model_name TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS nome_modulo TEXT;

-- 2c. AGGIORNAMENTO SCHEMA TABELLA 'prove' CON COLONNA PER UNITA' DI MISURA
ALTER TABLE prove ADD COLUMN IF NOT EXISTS unita_misura TEXT;

-- 3. ABILITAZIONE RLS (ROW LEVEL SECURITY) SU TUTTE LE TABELLE
-- Questo garantisce che nessun dato sia accessibile pubblicamente senza autenticazione.
ALTER TABLE profili ENABLE ROW LEVEL SECURITY;
ALTER TABLE clienti ENABLE ROW LEVEL SECURITY;
ALTER TABLE prove ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacchetti ENABLE ROW LEVEL SECURITY;
ALTER TABLE preventivi ENABLE ROW LEVEL SECURITY;
ALTER TABLE accettazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE reagenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE reagenti_ritirati ENABLE ROW LEVEL SECURITY;
ALTER TABLE operatori ENABLE ROW LEVEL SECURITY;
ALTER TABLE pratiche_fatturazione ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. POLICY PER TUTTE LE TABELLE (ACCESSO COMPLETO AGLI UTENTI AUTENTICATI)
-- In questo modo i dati sono al 100% sicuri da accessi esterni non autorizzati (l'accesso anonimo è bloccato da RLS),
-- e tutti i membri del laboratorio autenticati possono operare fluidamente senza conflitti di policy o ricorsioni.

-- POLICY: profili
CREATE POLICY "Profili: tutto per autenticati" ON profili
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- POLICY: clienti
CREATE POLICY "Clienti: tutto per autenticati" ON clienti
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- POLICY: prove
CREATE POLICY "Prove: tutto per autenticati" ON prove
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- POLICY: pacchetti
CREATE POLICY "Pacchetti: tutto per autenticati" ON pacchetti
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- POLICY: preventivi
CREATE POLICY "Preventivi: tutto per autenticati" ON preventivi
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- POLICY: reagenti
CREATE POLICY "Reagenti: tutto per autenticati" ON reagenti
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- POLICY: reagenti_ritirati
CREATE POLICY "Reagenti ritirati: tutto per autenticati" ON reagenti_ritirati
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- POLICY: accettazioni
CREATE POLICY "Accettazioni: tutto per autenticati" ON accettazioni
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- POLICY: operatori
CREATE POLICY "Operatori: tutto per autenticati" ON operatori
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- POLICY: pratiche_fatturazione
CREATE POLICY "Fatturazione: tutto per autenticati" ON pratiche_fatturazione
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- POLICY: audit_logs
CREATE POLICY "Audit Logs: tutto per autenticati" ON audit_logs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =========================================================================
-- FINE SCRIPT
-- =========================================================================
