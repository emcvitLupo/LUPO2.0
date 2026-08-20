# Regole e Convenzioni di Progetto per l'Intestazione Documentale (RdP e Preventivi)

## 1. Intestazione Istituzionale e Loghi Ufficiali
- **Logo Agenzia per lo Sviluppo**:
  - Il file del logo è consolidato in `src/assets/images/logos.ts` (esportato come `logoAgenzia`) e memorizzato anche in `public/logo_agenzia.png`.
  - Non sostituire, cancellare o alterare questo logo a meno di esplicita richiesta dell'utente.
  - Mantenere l'allineamento a sinistra (`object-left`) allineato con le coordinate dell'indirizzo sottostante.

- **Blocco Indirizzo e Recapiti**:
  - Mantenere sempre le tre righe ufficiali senza duplicazioni:
    1. Sede legale ed amministrativa: Corso Vittorio Emanuele n°86 - 67100 L'Aquila
    2. Laboratorio: Via degli Opifici n°1 - Z.I. di Bazzano - 67100 L'Aquila
    3. P.iva 01751450667

- **Logo ACCREDIA & Modello Documentale**:
  - Sulla parte destra dell'intestazione nei Rapporti di Prova (RdP) deve essere posizionato il marchio ufficiale ACCREDIA TESTING 00438 e il codice modello RdP.
  - Il marchio ACCREDIA viene mostrato **esclusivamente nei Rapporti di Prova che contengono almeno una prova accreditata** (`hasAccreditedTests === true`), conformemente alle prescrizioni dell'ente di accreditamento. Se non vi sono prove accreditate nel rapporto, il logo ACCREDIA viene omesso.

## 2. Applicazione Trasversale
- Questa formattazione deve rimanere identica e sincronizzata in:
  - `src/components/AccettazioneSection.tsx` (Modulo stampa e anteprima Rapporto di Prova / RdP)
  - `src/components/PreventiviSection.tsx` (Modulo stampa e anteprima Preventivo / Proposta Commerciale)
