-- =========================================================================
-- SCHEMA GENERALE IDEMPOTENTE DEL DATABASE PER LUPO 2.0 (MODULO SUPABASE CLOUD)
-- =========================================================================
-- Istruzioni per l'uso:
-- 1. Accedi alla console del tuo progetto Supabase (https://supabase.com).
-- 2. Seleziona la voce "SQL Editor" dal menu laterale sinistro.
-- 3. Clicca su "New query" per creare una nuova scheda vuota.
-- 4. Copia tutto questo codice e incollalo all'interno dell'editor SQL.
-- 5. Clicca sul pulsante "Run" in basso a destra per eseguire le query di creazione/aggiornamento.
-- =========================================================================

-- 1. TABELLA: clienti
CREATE TABLE IF NOT EXISTS clienti (
    id TEXT PRIMARY KEY,
    denominazione TEXT NOT NULL,
    nome TEXT,
    cognome TEXT,
    partita_iva TEXT,
    codice_fiscale TEXT,
    email TEXT,
    pec TEXT,
    codice_destinatario TEXT,
    telefono TEXT,
    indirizzo TEXT,
    comune TEXT,
    note TEXT,
    fatturato_annuo JSONB DEFAULT '{}'::jsonb,
    categorie_fatturato JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELLA: prove
CREATE TABLE IF NOT EXISTS prove (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    categoria_merceologica TEXT NOT NULL,
    metodo_analitico TEXT NOT NULL,
    prezzo_listino NUMERIC NOT NULL DEFAULT 0,
    tempo_esecuzione_giorni INTEGER NOT NULL DEFAULT 0,
    descrizione TEXT,
    accreditata_accredia BOOLEAN DEFAULT false NOT NULL,
    punti_incertezza JSONB DEFAULT '[]'::jsonb,
    punti_ripetibilita JSONB DEFAULT '[]'::jsonb,
    limite_quantificazione TEXT,
    unita_misura TEXT,
    limiti_riferimento JSONB DEFAULT '[]'::jsonb,
    formula_calcolo TEXT,
    variabili_calcolo JSONB DEFAULT '[]'::jsonb,
    tecnico_esecutore TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE prove ADD COLUMN IF NOT EXISTS limite_quantificazione TEXT;
ALTER TABLE prove ADD COLUMN IF NOT EXISTS unita_misura TEXT;
ALTER TABLE prove ADD COLUMN IF NOT EXISTS limiti_riferimento JSONB DEFAULT '[]'::jsonb;
ALTER TABLE prove ADD COLUMN IF NOT EXISTS formula_calcolo TEXT;
ALTER TABLE prove ADD COLUMN IF NOT EXISTS variabili_calcolo JSONB DEFAULT '[]'::jsonb;
ALTER TABLE prove ADD COLUMN IF NOT EXISTS tecnico_esecutore TEXT;

-- 3. TABELLA: pacchetti
CREATE TABLE IF NOT EXISTS pacchetti (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    descrizione TEXT,
    categoria_merceologica TEXT NOT NULL,
    prove_ids JSONB DEFAULT '[]'::jsonb,
    prezzo_scontato NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELLA: preventivi
CREATE TABLE IF NOT EXISTS preventivi (
    id TEXT PRIMARY KEY,
    codice TEXT NOT NULL UNIQUE,
    cliente_id TEXT,
    data_creazione TEXT NOT NULL,
    stato TEXT DEFAULT 'In Approvazione' NOT NULL,
    prove_selezionate JSONB DEFAULT '[]'::jsonb,
    pacchetti_selezionati JSONB DEFAULT '[]'::jsonb,
    totale NUMERIC NOT NULL DEFAULT 0,
    sconto_percentuale NUMERIC,
    nascondi_prezzi_singoli BOOLEAN DEFAULT false NOT NULL,
    is_totale_manuale_forfait BOOLEAN DEFAULT false,
    totale_manuale_forfait NUMERIC,
    note TEXT,
    nota_qualita_personalizzata TEXT,
    stato_history JSONB DEFAULT '[]'::jsonb,
    validita_offerta TEXT,
    oggetto_offerta TEXT,
    premessa_offerta TEXT,
    modalita_condizioni TEXT,
    metodo_campionamento TEXT,
    quantita_campione TEXT,
    tempo_consegna TEXT,
    modalita_invio_rapporto TEXT,
    prova_subappaltata TEXT,
    titolo_modulo TEXT,
    include_privacy BOOLEAN DEFAULT false NOT NULL,
    privacy_text TEXT,
    professionista_id TEXT,
    nome_professionista TEXT,
    cliente_finale_id TEXT,
    nome_cliente_finale TEXT,
    include_contract BOOLEAN DEFAULT false NOT NULL,
    contract_text TEXT,
    contract_model_name TEXT,
    contract_model_code TEXT,
    nome_modulo TEXT,
    note_qualita_accredia TEXT,
    materiali_campionamento TEXT,
    note_accettazione TEXT,
    altro_condizioni TEXT,
    destinatario_finale TEXT,
    numero_protocollo TEXT,
    data_protocollo TEXT,
    revisione INTEGER DEFAULT 0,
    is_revisione BOOLEAN DEFAULT false,
    codice_origine TEXT,
    preventivo_origine_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS is_totale_manuale_forfait BOOLEAN DEFAULT false;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS totale_manuale_forfait NUMERIC;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS validita_offerta TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS oggetto_offerta TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS premessa_offerta TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS modalita_condizioni TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS metodo_campionamento TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS quantita_campione TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS tempo_consegna TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS modalita_invio_rapporto TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS prova_subappaltata TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS titolo_modulo TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS include_privacy BOOLEAN DEFAULT false;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS privacy_text TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS professionista_id TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS nome_professionista TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS cliente_finale_id TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS nome_cliente_finale TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS include_contract BOOLEAN DEFAULT false;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS contract_text TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS contract_model_name TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS contract_model_code TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS nome_modulo TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS numero_protocollo TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS data_protocollo TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS revisione INTEGER DEFAULT 0;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS is_revisione BOOLEAN DEFAULT false;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS codice_origine TEXT;
ALTER TABLE preventivi ADD COLUMN IF NOT EXISTS preventivo_origine_id TEXT;

-- 5. TABELLA: reagenti
CREATE TABLE IF NOT EXISTS reagenti (
    id TEXT PRIMARY KEY,
    numero_progressivo INTEGER,
    nome TEXT NOT NULL,
    formula_chimica TEXT,
    marca_produttore TEXT,
    fornitore TEXT,
    codice_prodotto TEXT,
    tipologia TEXT,
    lotto TEXT,
    data_scadenza TEXT,
    data_scadenza_chiusa TEXT,
    data_scadenza_aperta TEXT,
    data_apertura TEXT,
    data_ultima_rivalidazione TEXT,
    data_nuova_scadenza TEXT,
    condizioni_conservazione TEXT,
    applicazione TEXT,
    certificato TEXT,
    codice_mr TEXT,
    quantita_disponibile NUMERIC DEFAULT 0,
    unita_misura TEXT,
    collocazione TEXT,
    livello_sotto_scorta NUMERIC DEFAULT 0,
    costo NUMERIC,
    anno_acquisto INTEGER,
    data_acquisto TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- 6. TABELLA: reagenti_ritirati
CREATE TABLE IF NOT EXISTS reagenti_ritirati (
    id TEXT PRIMARY KEY,
    reagente_id TEXT,
    nome TEXT NOT NULL,
    formula_chimica TEXT,
    marca_produttore TEXT,
    fornitore TEXT,
    lotto TEXT,
    tipologia TEXT,
    quantita_ritirata NUMERIC NOT NULL,
    unita_misura TEXT NOT NULL,
    costo_ritirato NUMERIC NOT NULL DEFAULT 0,
    anno_ritiro INTEGER DEFAULT 2026 NOT NULL,
    data_ritiro TEXT NOT NULL,
    motivo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE reagenti_ritirati ADD COLUMN IF NOT EXISTS fornitore TEXT;

-- 7. TABELLA: accettazioni (Rapporti Di Prova / Campioni)
CREATE TABLE IF NOT EXISTS accettazioni (
    id TEXT PRIMARY KEY,
    codice_accettazione TEXT NOT NULL UNIQUE,
    data_accettazione TEXT NOT NULL,
    descrizione_campione TEXT NOT NULL,
    matrice TEXT NOT NULL,
    quantita_campione TEXT NOT NULL,
    temperatura_arrivo TEXT,
    stato_in_arrivo TEXT DEFAULT 'Idoneo' NOT NULL,
    intestatario_rapporto_cliente_id TEXT,
    destinatario_fattura_cliente_id TEXT,
    preventivo_associato_id TEXT,
    prove_selezionate_da_preventivo JSONB DEFAULT '[]'::jsonb,
    consegna_prevista TEXT,
    note_lab TEXT,
    analisi_stato TEXT DEFAULT 'In Attesa' NOT NULL,
    operator_registrazione TEXT,
    operator_registrazione_ruolo TEXT,
    risultati_analisi JSONB DEFAULT '[]'::jsonb,
    categoria_merceologica TEXT,
    informazioni_cliente TEXT,
    destinatario_finale TEXT,
    etichetta_campione TEXT,
    imballaggio TEXT,
    campionato_da TEXT,
    procedura_campionamento TEXT,
    ora_ricevimento TEXT,
    data_inizio_prova TEXT,
    data_termine_prova TEXT,
    nota1 TEXT,
    nota2 TEXT,
    dichiarazione_conformita TEXT,
    opinioni_interpretazioni TEXT,
    stato_history JSONB DEFAULT '[]'::jsonb,
    firmatario_reparto1 TEXT,
    firmatario_reparto2 TEXT,
    firmatario_tecnico TEXT,
    ruolo_firmatario_tecnico TEXT,
    giustificazione_non_idoneita TEXT,
    data_prelievo TEXT,
    ora_prelievo TEXT,
    consegnante_relazione TEXT,
    punto_prelievo TEXT,
    temperatura_trasporto TEXT,
    temperatura_conservazione_lab TEXT,
    comune_prelievo TEXT,
    qualita_consegnante TEXT,
    autorizzazione_cliente TEXT,
    riferimento_autorizzazione_email TEXT,
    temp_accettazione_conforme TEXT,
    temp_trasporto_conforme TEXT,
    temp_conservazione_conforme TEXT,
    ricezione_condizioni_mpg069 TEXT,
    revisione_corrente INTEGER DEFAULT 0 NOT NULL,
    revisione_motivo TEXT,
    tipologia_revisione TEXT,
    stato_revisione TEXT DEFAULT 'Vigente',
    is_locked BOOLEAN DEFAULT false,
    data_revisione TEXT,
    storico_revisioni JSONB DEFAULT '[]'::jsonb,
    dati_etichetta_nutrizionale JSONB,
    dati_classificazione_rifiuto JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE accettazioni ADD COLUMN IF NOT EXISTS prove_selezionate_da_preventivo JSONB DEFAULT '[]'::jsonb;
ALTER TABLE accettazioni ADD COLUMN IF NOT EXISTS tipologia_revisione TEXT;
ALTER TABLE accettazioni ADD COLUMN IF NOT EXISTS stato_revisione TEXT DEFAULT 'Vigente';
ALTER TABLE accettazioni ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE accettazioni ADD COLUMN IF NOT EXISTS dati_etichetta_nutrizionale JSONB;
ALTER TABLE accettazioni ADD COLUMN IF NOT EXISTS dati_classificazione_rifiuto JSONB;

-- 8. TABELLA: operatori
CREATE TABLE IF NOT EXISTS operatori (
    nome TEXT PRIMARY KEY,
    ruolo TEXT NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    attivo BOOLEAN DEFAULT true NOT NULL,
    autorizzato_firma BOOLEAN DEFAULT false NOT NULL,
    ruolo_firma TEXT,
    is_responsabile_reparto BOOLEAN DEFAULT false NOT NULL,
    is_responsabile_tecnico BOOLEAN DEFAULT false NOT NULL,
    aree_competenza JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE operatori ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE operatori ADD COLUMN IF NOT EXISTS aree_competenza JSONB DEFAULT '[]'::jsonb;

-- 9. TABELLA: pratiche_fatturazione
CREATE TABLE IF NOT EXISTS pratiche_fatturazione (
    id TEXT PRIMARY KEY,
    numero_campione TEXT NOT NULL,
    cliente_id TEXT,
    nome_cliente TEXT,
    partita_iva TEXT,
    codice_fiscale TEXT,
    numero_preventivo TEXT,
    data_accettazione TEXT NOT NULL,
    importo NUMERIC NOT NULL DEFAULT 0,
    stato_fatturazione TEXT DEFAULT 'Da fatturare' NOT NULL,
    numero_fattura TEXT,
    data_fattura TEXT,
    note TEXT,
    pagato BOOLEAN DEFAULT false NOT NULL,
    data_pagamento TEXT,
    numero_protocollo_rdp TEXT,
    data_invio_rdp TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE pratiche_fatturazione ADD COLUMN IF NOT EXISTS codice_fiscale TEXT;
ALTER TABLE pratiche_fatturazione ADD COLUMN IF NOT EXISTS numero_protocollo_rdp TEXT;
ALTER TABLE pratiche_fatturazione ADD COLUMN IF NOT EXISTS data_invio_rdp TEXT;

-- 10. TABELLA: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    data_ora TEXT NOT NULL,
    utente TEXT NOT NULL,
    sezione TEXT NOT NULL,
    campo TEXT NOT NULL,
    valore_precedente TEXT,
    valore_nuovo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. TABELLA: strumenti (Strumentazione & Tarature ISO 17025)
CREATE TABLE IF NOT EXISTS strumenti (
    id TEXT PRIMARY KEY,
    codice TEXT NOT NULL,
    nome TEXT NOT NULL,
    marca TEXT,
    modello TEXT,
    matricola TEXT,
    collocazione TEXT,
    ultima_taratura TEXT,
    prossima_taratura TEXT,
    periodicita_taratura_mesi INTEGER DEFAULT 12,
    certificato_taratura TEXT,
    ente_taratore TEXT,
    storico_tarature JSONB DEFAULT '[]'::jsonb,
    note TEXT,
    attivo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. TABELLA: impostazioni_lims (Sincronizzazione Cloud multi-PC di dizionari, modelli e configurazioni)
CREATE TABLE IF NOT EXISTS impostazioni_lims (
    chiave TEXT PRIMARY KEY,
    valore JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. TABELLA: profili (Collegata a Supabase Auth)
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

-- =========================================================================
-- CONFIGURAZIONE ROW LEVEL SECURITY (RLS) E POLICY DI SICUREZZA
-- =========================================================================
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
ALTER TABLE strumenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE impostazioni_lims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profili: tutto per autenticati" ON profili;
CREATE POLICY "Profili: tutto per autenticati" ON profili
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Clienti: tutto per autenticati" ON clienti;
CREATE POLICY "Clienti: tutto per autenticati" ON clienti
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Prove: tutto per autenticati" ON prove;
CREATE POLICY "Prove: tutto per autenticati" ON prove
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Pacchetti: tutto per autenticati" ON pacchetti;
CREATE POLICY "Pacchetti: tutto per autenticati" ON pacchetti
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Preventivi: tutto per autenticati" ON preventivi;
CREATE POLICY "Preventivi: tutto per autenticati" ON preventivi
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Reagenti: tutto per autenticati" ON reagenti;
CREATE POLICY "Reagenti: tutto per autenticati" ON reagenti
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Reagenti ritirati: tutto per autenticati" ON reagenti_ritirati;
CREATE POLICY "Reagenti ritirati: tutto per autenticati" ON reagenti_ritirati
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Accettazioni: tutto per autenticati" ON accettazioni;
CREATE POLICY "Accettazioni: tutto per autenticati" ON accettazioni
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Operatori: tutto per autenticati" ON operatori;
CREATE POLICY "Operatori: tutto per autenticati" ON operatori
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Fatturazione: tutto per autenticati" ON pratiche_fatturazione;
CREATE POLICY "Fatturazione: tutto per autenticati" ON pratiche_fatturazione
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Audit Logs: tutto per autenticati" ON audit_logs;
CREATE POLICY "Audit Logs: tutto per autenticati" ON audit_logs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Strumenti: tutto per autenticati" ON strumenti;
CREATE POLICY "Strumenti: tutto per autenticati" ON strumenti
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Impostazioni LIMS: tutto per autenticati" ON impostazioni_lims;
CREATE POLICY "Impostazioni LIMS: tutto per autenticati" ON impostazioni_lims
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
