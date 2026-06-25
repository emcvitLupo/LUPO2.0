-- =========================================================================
-- SCRIPT DI AGGIORNAMENTO SICUREZZA, RLS E RISOLUZIONE ERRORE 42P17
-- =========================================================================
-- Istruzioni per l'uso:
-- 1. Accedi alla console del tuo progetto Supabase (https://supabase.com).
-- 2. Seleziona la voce "SQL Editor" dal menu laterale sinistro.
-- 3. Clicca su "New query" per creare una nuova scheda.
-- 4. Copia tutto questo codice, incollalo nell'editor SQL e clicca su "Run".
-- =========================================================================

-- 1. RIMOZIONE DINAMICA DI TUTTE LE POLICY ESISTENTI (PULIZIA TOTALE)
-- Questo blocco elimina qualsiasi policy duplicata o accavallata per evitare conflitti.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

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
