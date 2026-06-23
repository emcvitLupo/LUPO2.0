-- =========================================================================
-- SCHEMA GENERALE DEL DATABASE PER LUPO 2.0 (MODULO SUPABASE CLOUD)
-- =========================================================================
-- Istruzioni per l'uso:
-- 1. Accedi alla console del tuo progetto Supabase (https://supabase.com).
-- 2. Seleziona la voce "SQL Editor" dal menu laterale sinistro.
-- 3. Clicca su "New query" per creare una nuova scheda vuota.
-- 4. Copia tutto questo codice e incollalo all'interno dell'editor SQL.
-- 5. Clicca sul pulsante "Run" in basso a destra per eseguire le query di creazione.
-- =========================================================================

-- PULIZIA TABELLE PRE-ESISTENTI (Opzionale: scommentare se si desidera ripartire da zero)
-- DROP TABLE IF EXISTS audit_logs CASCADE;
-- DROP TABLE IF EXISTS pratiche_fatturazione CASCADE;
-- DROP TABLE IF EXISTS accettazioni CASCADE;
-- DROP TABLE IF EXISTS reagenti_ritirati CASCADE;
-- DROP TABLE IF EXISTS reagenti CASCADE;
-- DROP TABLE IF EXISTS preventivi CASCADE;
-- DROP TABLE IF EXISTS pacchetti CASCADE;
-- DROP TABLE IF EXISTS prove CASCADE;
-- DROP TABLE IF EXISTS clienti CASCADE;
-- DROP TABLE IF EXISTS operatori CASCADE;

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
    limiti_riferimento JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
    note TEXT,
    nota_qualita_personalizzata TEXT,
    stato_history JSONB DEFAULT '[]'::jsonb,
    validita_offerta TEXT,
    oggetto_offerta TEXT,
    modalita_condizioni TEXT,
    metodo_campionamento TEXT,
    quantita_campione TEXT,
    tempo_consegna TEXT,
    modalita_invio_rapporto TEXT,
    prova_subappaltata TEXT,
    titolo_modulo TEXT,
    include_privacy BOOLEAN DEFAULT false NOT NULL,
    privacy_text TEXT,
    include_contract BOOLEAN DEFAULT false NOT NULL,
    contract_text TEXT,
    contract_model_name TEXT,
    nome_modulo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELLA: reagenti
CREATE TABLE IF NOT EXISTS reagenti (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    formula_chimica TEXT,
    marca_produttore TEXT,
    codice_prodotto TEXT,
    lotto TEXT,
    data_scadenza TEXT,
    quantita_disponibile NUMERIC DEFAULT 0,
    unita_misura TEXT,
    collocazione TEXT,
    livello_sotto_scorta NUMERIC DEFAULT 0,
    costo NUMERIC,
    anno_acquisto INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELLA: reagenti_ritirati
CREATE TABLE IF NOT EXISTS reagenti_ritirati (
    id TEXT PRIMARY KEY,
    reagente_id TEXT,
    nome TEXT NOT NULL,
    formula_chimica TEXT,
    marca_produttore TEXT,
    lotto TEXT,
    quantita_ritirata NUMERIC NOT NULL,
    unita_misura TEXT NOT NULL,
    costo_ritirato NUMERIC NOT NULL DEFAULT 0,
    anno_ritiro INTEGER DEFAULT 2026 NOT NULL,
    data_ritiro TEXT NOT NULL,
    motivo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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
    data_revisione TEXT,
    storico_revisioni JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. TABELLA: operatori
CREATE TABLE IF NOT EXISTS operatori (
    nome TEXT PRIMARY KEY,
    ruolo TEXT NOT NULL,
    password TEXT NOT NULL,
    attivo BOOLEAN DEFAULT true NOT NULL,
    autorizzato_firma BOOLEAN DEFAULT false NOT NULL,
    ruolo_firma TEXT,
    is_responsabile_reparto BOOLEAN DEFAULT false NOT NULL,
    is_responsabile_tecnico BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. TABELLA: pratiche_fatturazione
CREATE TABLE IF NOT EXISTS pratiche_fatturazione (
    id TEXT PRIMARY KEY,
    numero_campione TEXT NOT NULL,
    cliente_id TEXT,
    nome_cliente TEXT,
    partita_iva TEXT,
    numero_preventivo TEXT,
    data_accettazione TEXT NOT NULL,
    importo NUMERIC NOT NULL DEFAULT 0,
    stato_fatturazione TEXT DEFAULT 'Da fatturare' NOT NULL,
    numero_fattura TEXT,
    data_fattura TEXT,
    note TEXT,
    pagato BOOLEAN DEFAULT false NOT NULL,
    data_pagamento TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. TABELLA: audit_logs (Log delle attività di sicurezza/modifica)
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

-- =========================================================================
-- DISABILITAZIONE ROW LEVEL SECURITY (RLS) PERTINENTE (RICHIESTO DALL'UTENTE)
-- =========================================================================
ALTER TABLE clienti DISABLE ROW LEVEL SECURITY;
ALTER TABLE prove DISABLE ROW LEVEL SECURITY;
ALTER TABLE pacchetti DISABLE ROW LEVEL SECURITY;
ALTER TABLE preventivi DISABLE ROW LEVEL SECURITY;
ALTER TABLE reagenti DISABLE ROW LEVEL SECURITY;
ALTER TABLE reagenti_ritirati DISABLE ROW LEVEL SECURITY;
ALTER TABLE accettazioni DISABLE ROW LEVEL SECURITY;
ALTER TABLE operatori DISABLE ROW LEVEL SECURITY;
ALTER TABLE pratiche_fatturazione DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Nota: Disabilitare RLS rende le tabelle leggibili e modificabili liberamente tramite API anonima anon_key, 
-- ideale per lo sviluppo o l'invio diretto dal frontend.
