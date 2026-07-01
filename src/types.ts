export interface Client {
  id: string;
  denominazione: string;
  nome?: string;
  cognome?: string;
  partitaIva: string;
  codiceFiscale?: string;
  email: string;
  pec?: string;
  codiceDestinatario?: string;
  telefono: string;
  indirizzo: string;
  comune?: string;
  note?: string;
  // Fatturato annuo complessivo (es. { "2024": 15200, "2025": 18400 })
  fatturatoAnnuo: Record<string, number>;
  // Fatturato suddiviso per categoria merceologica e anno (es. { "Oli": { "2024": 5000, "2025": 6000 } })
  categorieFatturato: Record<string, Record<string, number>>;
}

export interface PuntoIncertezza {
  concentrazione: number;
  incertezza: number;
}

export interface PuntoRipetibilita {
  concentrazione: number;
  ripetibilita: number;
}

export interface LimiteRiferimento {
  id: string;
  valore: string;
  unitaMisura: string;
  norma: string;
  note?: string;
}

export interface Prova {
  id: string;
  nome: string;
  categoriaMerceologica: string;
  metodoAnalitico: string;
  prezzoListino: number;
  tempoEsecuzioneGiorni: number;
  descrizione?: string;
  accreditataAccredia?: boolean;
  puntiIncertezza?: PuntoIncertezza[];
  puntiRipetibilita?: PuntoRipetibilita[];
  limite_quantificazione?: string; // mapping compat
  limiteQuantificazione?: string;
  limitiRiferimento?: LimiteRiferimento[];
  unitaMisura?: string;
}

export interface Pacchetto {
  id: string;
  nome: string;
  descrizione: string;
  categoriaMerceologica: string;
  proveIds: string[];
  prezzoScontato: number;
}

export interface Preventivo {
  id: string;
  codice: string;
  clienteId: string;
  dataCreazione: string;
  stato: 'In Approvazione' | 'Approvato' | 'Rifiutato' | 'Scaduto';
  proveSelezionate: Array<{
    provaId: string;
    quantita: number;
    prezzoApplicato: number;
    limitiSelezionati?: LimiteRiferimento[];
  }>;
  pacchettiSelezionati: Array<{
    pacchettoId: string;
    quantita: number;
    prezzoApplicato: number;
  }>;
  totale: number;
  scontoPercentuale?: number;
  nascondiPrezziSingoli?: boolean;
  note?: string;
  notaQualitaPersonalizzata?: string;
  statoHistory?: Array<{
    statoPrecedente?: string;
    statoNuovo: string;
    dataOra: string;
    operatore: string;
  }>;
  validitaOfferta?: string;
  oggettoOfferta?: string;
  modalitaCondizioni?: string;
  metodoCampionamento?: string;
  quantitaCampione?: string;
  tempoConsegna?: string;
  modalitaInvioRapporto?: string;
  provaSubappaltata?: string;
  titoloModulo?: string;
  includePrivacy?: boolean;
  privacyText?: string;
  includeContract?: boolean;
  contractText?: string;
  contractModelName?: string;
  contractModelCode?: string;
  nomeModulo?: string;
  noteQualitaAccredia?: string;
  materialiCampionamento?: string;
  noteAccettazione?: string;
  altroCondizioni?: string;
  destinatarioFinale?: string;
}

export interface PraticaFatturazione {
  id: string;
  numeroCampione: string;
  clienteId: string;
  nomeCliente: string;
  partitaIva: string;
  numeroPreventivo: string;
  dataAccettazione: string;
  importo: number;
  statoFatturazione: 'Da fatturare' | 'Fatturato';
  numeroFattura: string;
  dataFattura: string;
  note: string;
  pagato?: boolean;
  dataPagamento?: string;
}

export interface AuditLog {
  id: string;
  dataOra: string;
  utente: string;
  sezione: string;
  campo: string;
  valorePrecedente: string;
  valoreNuovo: string;
}

export interface Reagente {
  id: string;
  nome: string;
  formulaChimica: string;
  marcaProduttore: string;
  codiceProdotto: string;
  lotto: string;
  dataScadenza: string;
  quantitaDisponibile: number;
  unitaMisura: string; // ml, g, mg, flacone, etc.
  collocazione: string; // es. Armadio Acidi, Frigorifero Batteriologico
  livelloSottoScorta: number; // soglia per allerta quantita
  costo?: number;
  annoAcquisto?: number;
}

export interface ReagenteRitirato {
  id: string;
  reagenteId: string;
  nome: string;
  formulaChimica?: string;
  marcaProduttore?: string;
  lotto?: string;
  quantitaRitirata: number;
  unitaMisura: string;
  costoRitirato: number;
  annoRitiro: number;
  dataRitiro: string;
  motivo: string; // "Consumato", "Scaduto", "Dismesso", ecc.
}

export interface VariableCalcolo {
  id: string;
  simbolo: string; // es: "A", "B", "C"
  descrizione: string; // es: "Peso Capsula Vuota", "Peso Capsula + Residuo", "Peso Campione in grammi"
  valore: number | string; // es: 12.3456
}

export interface QuadernoCalcolo {
  variabili: VariableCalcolo[];
  formula: string; // es: "((B - A) / C) * 100" o "A * B * C"
  risultatoCalcolato?: number;
}

export interface RisultatoProva {
  provaId: string;
  valoreRilevato?: string; // es: "0.03", "Assente", "125"
  incertezza?: string; // es: "± 0.01", "N/D" (Richiesta Utente)
  ripetibilita?: string; // es: "± 0.005", "N/D"
  incertezzaPercentuale?: string; // es: "5%" o "10%" (percentuale dell'incertezza rispetto al risultato)
  escludiIncertezza?: boolean; // Opzione per non dichiarare l'incertezza (disattivata)
  unitaMisura?: string; // es: "g/100g", "mg/L", "UFC/g"
  conforme?: 'Conforme' | 'Non Conforme' | 'Senza Limiti';
  operatore?: string;
  dataAnalisi?: string;
  limitiSelezionati?: LimiteRiferimento[];
  quadernoCalcolo?: QuadernoCalcolo;
}

export interface RevisioneRDP {
  id: string; // id univoco della revisione
  numeroRevisione: number; // es: 1 per Rev. 01
  dataOraEmissione: string; // Data e ora di emissione della revisione
  operatoreEmissione: string; // Operatore che ha autorizzato/firmato la revisione
  motivoRevisione: string; // Motivo della revisione (es. "Correzione errore di battitura risultato")
  
  // Istantanea (snapshot) dei dati nel rapporto al momento della revisione precedente
  descrizioneCampione: string;
  matrice: string;
  quantitaCampione: string;
  temperaturaArrivo?: string;
  statoInArrivo: 'Idoneo' | 'Non Idoneo' | 'Accettato con Riserva';
  dataPrelievo?: string;
  oraPrelievo?: string;
  puntoPrelievo?: string;
  dataInizioProva?: string;
  dataTermineProva?: string;
  risultatiAnalisi: RisultatoProva[];
  dichiarazioneConformita?: string;
  opinioniInterpretazioni?: string;
  nota1?: string;
  nota2?: string;
  firmatarioTecnico?: string;
  ruoloFirmatarioTecnico?: string;
}

export interface AccettazioneCampione {
  id: string;
  codiceAccettazione: string; // es: ACC-2026-0001
  dataAccettazione: string;
  descrizioneCampione: string;
  matrice: string; // es: "Acqua potabile", "Olio EVO", "Sfarinato", "Vino Rosso"
  quantitaCampione: string; // es: "2x 500ml", "1 boccetta da 100g"
  temperaturaArrivo?: string; // es: "+4°C", "Temp. Ambiente"
  statoInArrivo: 'Idoneo' | 'Non Idoneo' | 'Accettato con Riserva';
  intestatarioRapportoClienteId: string; // ID del cliente intestatario del rapporto di prova
  destinatarioFatturaClienteId: string; // ID del cliente a cui fatturare
  preventivoAssociatoId?: string; // ID del preventivo collegato (opzionale)
  consegnaPrevista?: string; // Data di consegna prevista dei risultati
  noteLab?: string; // Note tecniche o commerciali
  analisiStato: 'In Attesa' | 'In Corso' | 'Completato' | 'Annullato';
  operatorRegistrazione?: string; // Persona o ruolo che ha fatto l'accettazione
  operatorRegistrazioneRuolo?: string; // Ruolo o qualifica di chi ha fatto l'accettazione
  risultatiAnalisi?: RisultatoProva[]; // Risultati analitici associati alle prove effettuate
  
  // Campi aggiuntivi per il Rapporto di Prova (Richiesta Utente)
  categoriaMerceologica?: string;
  informazioniCliente?: string;
  destinatarioFinale?: string;
  etichettaCampione?: string;
  imballaggio?: string;
  campionatoDa?: string;
  proceduraCampionamento?: string;
  oraRicevimento?: string;
  dataInizioProva?: string;
  dataTermineProva?: string;
  nota1?: string;
  nota2?: string;
  dichiarazioneConformita?: string;
  opinioniInterpretazioni?: string;
  statoHistory?: Array<{
    campoModificato: 'analisiStato' | 'statoInArrivo';
    statoPrecedente?: string;
    statoNuovo: string;
    dataOra: string;
    operatore: string;
  }>;
  // Firmatari selezionati per questo specifico Rapporto di Prova
  firmatarioReparto1?: string;
  firmatarioReparto2?: string;
  firmatarioTecnico?: string;
  ruoloFirmatarioTecnico?: 'Responsabile Tecnico' | 'Vice Responsabile Tecnico' | 'V.ce Responsabile Tecnico' | 'Responsabile di Reparto';
  giustificazioneNonIdoneita?: string; // Giustificazione in caso di Non Idoneo o Sospeso (Richiesta Utente)
  
  // Campi integrati per completa tracciabilità LIMS richiesti
  dataPrelievo?: string;                  // Data del prelievo
  oraPrelievo?: string;                   // Ora del prelievo
  consegnanteRelazione?: string;          // Nome di chi ha assistito al prelievo e/o di chi consegna il campione in qualità di
  puntoPrelievo?: string;                 // Punto di prelievo
  temperaturaTrasporto?: string;          // Temperatura durante il trasporto
  temperaturaConservazioneLab?: string;   // Temperatura di conservazione in laboratorio
  comunePrelievo?: string;                // Comune di prelievo del campione
  qualitaConsegnante?: 'titolare' | 'corriere' | 'altro';  // Qualità del consegnante
  autorizzazioneCliente?: 'si' | 'no';    // Autorizzazione esecuzione prova
  riferimentoAutorizzazioneEmail?: string;// Riferimento email autorizzazione
  tempAccettazioneConforme?: 'si' | 'no' | 'N/A'; // Verifica temperatura accettazione conforme (se deperibile 2-8, ecc)
  tempTrasportoConforme?: 'si' | 'no' | 'N/A';    // Verifica temperatura trasporto conforme
  tempConservazioneConforme?: 'si' | 'no' | 'N/A';// Verifica temperatura conservazione conforme
  ricezioneCondizioniMPG069?: 'A mano' | 'Via Email' | 'Nessuno'; // Ricezione condizioni MPG069
  
  // Campi tracciabilità della revisione corrente e dello storico della revisioni del Rapporto di Prova
  revisioneCorrente?: number;                     // es: 0 o non definito = Rev. 00, 1 = Rev. 01, ecc.
  revisioneMotivo?: string;                       // Spiegazione della revisione corrente
  dataRevisione?: string;                         // Data e ora dell'ultima revisione
  storicoRevisioni?: RevisioneRDP[];              // Storico delle revisioni passate archiviate
}

export interface Operator {
  nome: string;
  ruolo: string;
  password: string;
  attivo?: boolean; // Se attivo o disattivato
  autorizzatoFirma?: boolean; // Se abilitato alle firme ufficiali dei rapporti
  ruoloFirma?: string; // Ruolo firma (es. Responsabile di Reparto, Responsabile Tecnico, Vice Responsabile Tecnico)
  isResponsabileReparto?: boolean; // Se abilitato come Responsabile di Reparto
  isResponsabileTecnico?: boolean; // Se abilitato come Responsabile Tecnico
}

