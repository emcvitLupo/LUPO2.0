export interface Client {
  id: string;
  denominazione: string;
  nome?: string;
  cognome?: string;
  partitaIva: string;
  email: string;
  telefono: string;
  indirizzo: string;
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
  limiteQuantificazione?: string;
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
  stato: 'In Approvazione' | 'Approvato' | 'Rifiutato';
  proveSelezionate: Array<{
    provaId: string;
    quantita: number;
    prezzoApplicato: number;
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
}

export interface RisultatoProva {
  provaId: string;
  valoreRilevato?: string; // es: "0.03", "Assente", "125"
  incertezza?: string; // es: "± 0.01", "N/D" (Richiesta Utente)
  ripetibilita?: string; // es: "± 0.005", "N/D"
  unitaMisura?: string; // es: "g/100g", "mg/L", "UFC/g"
  conforme?: 'Conforme' | 'Non Conforme' | 'Senza Limiti';
  operatore?: string;
  dataAnalisi?: string;
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
  statoHistory?: Array<{
    campoModificato: 'analisiStato' | 'statoInArrivo';
    statoPrecedente?: string;
    statoNuovo: string;
    dataOra: string;
    operatore: string;
  }>;
}

export interface Operator {
  nome: string;
  ruolo: string;
  password: string;
}

