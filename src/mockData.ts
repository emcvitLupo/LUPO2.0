import { Client, Prova, Pacchetto, Preventivo, Reagente, AccettazioneCampione, Operator, PraticaFatturazione, AuditLog } from './types';

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'c1',
    denominazione: 'Fratelli Rossi S.p.A.',
    nome: 'Mario',
    cognome: 'Rossi',
    partitaIva: '01234567890',
    email: 'qualita@fratellirossi.it',
    telefono: '051-998877',
    indirizzo: 'Via dell\'Industria 12, Bologna',
    note: 'Cliente storico, richiede rapporti di prova bilingue.',
    fatturatoAnnuo: {
      '2024': 12500,
      '2025': 15800,
      '2026': 6200
    },
    categorieFatturato: {
      'Oli e Grassi': {
        '2024': 7500,
        '2025': 9800,
        '2026': 4200
      },
      'Prodotti Da Forno': {
        '2024': 5000,
        '2025': 6000,
        '2026': 2000
      }
    }
  },
  {
    id: 'c2',
    denominazione: 'Cantine del Sole Società Agricola',
    nome: 'Silvia',
    cognome: 'Sole',
    partitaIva: '09876543210',
    email: 'lab@cantinedelsole.it',
    telefono: '080-112233',
    indirizzo: 'Contrada Rondinella 4, Barletta',
    note: 'Fornisce campioni stagionalmente (Settembre - Novembre).',
    fatturatoAnnuo: {
      '2024': 8400,
      '2025': 11200,
      '2026': 3100
    },
    categorieFatturato: {
      'Vini ed Aceti': {
        '2024': 8400,
        '2025': 11200,
        '2026': 3100
      }
    }
  },
  {
    id: 'c3',
    denominazione: 'BioAlimenta Alimentare S.r.l.',
    nome: 'Luca',
    cognome: 'Verdi',
    partitaIva: '05556667778',
    email: 'controllo@bioalimenta.com',
    telefono: '02-887766',
    indirizzo: 'Viale dei Pioppi 54, Milano',
    note: 'Certificazioni Biologiche importanti. Richiede determinazione allergeni.',
    fatturatoAnnuo: {
      '2024': 19000,
      '2025': 24500,
      '2026': 12000
    },
    categorieFatturato: {
      'Cereali e Farine': {
        '2024': 11000,
        '2025': 14500,
        '2026': 7000
      },
      'Allergeni e Traces': {
        '2024': 8000,
        '2025': 10000,
        '2026': 5000
      }
    }
  }
];

export const INITIAL_PROVE: Prova[] = [
  // Categoria Oli e Grassi
  {
    id: 'p1',
    nome: 'Acidità Libera (espressa in acido oleico)',
    categoriaMerceologica: 'Oli e Grassi',
    metodoAnalitico: 'Reg CEE 2568/91 All II',
    prezzoListino: 25.0,
    tempoEsecuzioneGiorni: 2,
    descrizione: 'Determinazione volumetrica dell\'acidità libera su oli di oliva ed altri grassi vegetali.',
    accreditataAccredia: true,
    puntiIncertezza: [
      { concentrazione: 0.1, incertezza: 0.01 },
      { concentrazione: 0.5, incertezza: 0.03 },
      { concentrazione: 1.5, incertezza: 0.09 },
      { concentrazione: 5.0, incertezza: 0.30 }
    ]
  },
  {
    id: 'p2',
    nome: 'Numero di Perossidi',
    categoriaMerceologica: 'Oli e Grassi',
    metodoAnalitico: 'Reg CEE 2568/91 All III',
    prezzoListino: 30.0,
    tempoEsecuzioneGiorni: 2,
    descrizione: 'Determinazione dei perossidi mediante titolazione iodometrica.',
    accreditataAccredia: true,
    puntiIncertezza: [
      { concentrazione: 2.0, incertezza: 0.15 },
      { concentrazione: 10.0, incertezza: 0.60 },
      { concentrazione: 20.0, incertezza: 1.40 }
    ]
  },
  {
    id: 'p3',
    nome: 'Spettrofotometria UV (K232, K270, Delta K)',
    categoriaMerceologica: 'Oli e Grassi',
    metodoAnalitico: 'Reg CEE 2568/91 All IX',
    prezzoListino: 45.0,
    tempoEsecuzioneGiorni: 3,
    descrizione: 'Esame spettrofotometrico nell\'ultravioletto per valutare lo stato di ossidazione e raffinazione.'
  },
  // Categoria Vini ed Aceti
  {
    id: 'p4',
    nome: 'Titolo Alcolometrico Volumico (TAV)',
    categoriaMerceologica: 'Vini ed Aceti',
    metodoAnalitico: 'OIV-MA-AS312-01A Distillazione',
    prezzoListino: 35.0,
    tempoEsecuzioneGiorni: 3,
    descrizione: 'Misura della percentuale in volume di etanolo mediante distillazione e picnometria/idrometricia.',
    accreditataAccredia: true,
    puntiIncertezza: [
      { concentrazione: 5.0, incertezza: 0.05 },
      { concentrazione: 12.0, incertezza: 0.10 },
      { concentrazione: 18.0, incertezza: 0.15 }
    ]
  },
  {
    id: 'p5',
    nome: 'Acidità Totale',
    categoriaMerceologica: 'Vini ed Aceti',
    metodoAnalitico: 'OIV-MA-AS313-01T Titolazione',
    prezzoListino: 20.0,
    tempoEsecuzioneGiorni: 1,
    descrizione: 'Determinazione degli acidi titolabili espressi in acido tartarico.'
  },
  {
    id: 'p6',
    nome: 'Anidride Solforosa Libera e Totale',
    categoriaMerceologica: 'Vini ed Aceti',
    metodoAnalitico: 'OIV-MA-AS323-04C Ripper',
    prezzoListino: 28.0,
    tempoEsecuzioneGiorni: 1,
    descrizione: 'Determinazione del biossido di zolfo mediante metodo Ripper rapido.'
  },
  // Categoria Cereali e Farine
  {
    id: 'p7',
    nome: 'Umidità su cereali e derivati',
    categoriaMerceologica: 'Cereali e Farine',
    metodoAnalitico: 'UNI EN ISO 712',
    prezzoListino: 18.0,
    tempoEsecuzioneGiorni: 2,
    descrizione: 'Determinazione della perdita di peso all\'essiccamento in stufa termostatata.',
    accreditataAccredia: true
  },
  {
    id: 'p8',
    nome: 'Ceneri Totali',
    categoriaMerceologica: 'Cereali e Farine',
    metodoAnalitico: 'UNI 21008',
    prezzoListino: 25.0,
    tempoEsecuzioneGiorni: 2,
    descrizione: 'Determinazione del residuo mediante incenerimento in muffola a 550°C o 900°C.'
  },
  {
    id: 'p9',
    nome: 'Determinatore di Glutine (Gluten Index)',
    categoriaMerceologica: 'Cereali e Farine',
    metodoAnalitico: 'UNI EN ISO 21415',
    prezzoListino: 65.0,
    tempoEsecuzioneGiorni: 3,
    descrizione: 'Determinazione quantitativa del glutine umido e indice di glutine mediante sistema Glutomatic.'
  },
  // Categoria Allergeni e Tracce
  {
    id: 'p10',
    nome: 'Ricerca Glutine mediante ELISA',
    categoriaMerceologica: 'Allergeni e Tracce',
    metodoAnalitico: 'Kit ELISA R-Biopharm',
    prezzoListino: 95.0,
    tempoEsecuzioneGiorni: 4,
    descrizione: 'Metodica immunoenzimatica per la quantificazione di tracce di glutine.',
    accreditataAccredia: true
  },
  {
    id: 'p11',
    nome: 'Ricerca Allergeni Frutta a guscio',
    categoriaMerceologica: 'Allergeni e Tracce',
    metodoAnalitico: 'Multiplex PCR qualitativa',
    prezzoListino: 120.0,
    tempoEsecuzioneGiorni: 5,
    descrizione: 'Ricerca molecolare qualitativa per mandorle, nocciole, noci.'
  }
];

export const INITIAL_PACCHETTI: Pacchetto[] = [
  {
    id: 'pa1',
    nome: 'Pacchetto Base Qualità Olio d\'Oliva',
    descrizione: 'Include i parametri fondamentali previsti dalla normativa per la classificazione merceologica delle classi di olio d\'oliva extravergine o vergine.',
    categoriaMerceologica: 'Oli e Grassi',
    proveIds: ['p1', 'p2', 'p3'],
    prezzoScontato: 85.0 // Somma listino = 25 + 30 + 45 = 100
  },
  {
    id: 'pa2',
    nome: 'Trittico Analisi Chimica Vino d\'Annata',
    descrizione: 'I tre parametri immancabili all\'imbottigliamento per verificare stabilità e alcolicità.',
    categoriaMerceologica: 'Vini ed Aceti',
    proveIds: ['p4', 'p5', 'p6'],
    prezzoScontato: 70.0 // Somma listino = 35 + 20 + 28 = 83
  },
  {
    id: 'pa3',
    nome: 'Controllo Base Panificazione e Sfarinati',
    descrizione: 'Verifica dell\'umidità commerciale, del contenuto di ceneri per legge e della forza del glutine.',
    categoriaMerceologica: 'Cereali e Farine',
    proveIds: ['p7', 'p8', 'p9'],
    prezzoScontato: 90.0 // Somma listino = 18 + 25 + 65 = 108
  }
];

export const INITIAL_PREVENTIVI: Preventivo[] = [
  {
    id: 'pr1',
    codice: 'PREV-2026-001',
    clienteId: 'c1',
    dataCreazione: '2026-04-12',
    stato: 'Approvato',
    proveSelezionate: [
      { provaId: 'p1', quantita: 5, prezzoApplicato: 25.0 },
      { provaId: 'p2', quantita: 5, prezzoApplicato: 30.0 }
    ],
    pacchettiSelezionati: [
      { pacchettoId: 'pa1', quantita: 2, prezzoApplicato: 85.0 }
    ],
    totale: 445.0, // (5*25 + 5*30) + 2*85 = 275 + 170 = 445
    note: 'Sconto applicato sul pacchetto base. Campioni in consegna lunedì mattina.'
  },
  {
    id: 'pr2',
    codice: 'PREV-2026-002',
    clienteId: 'c2',
    dataCreazione: '2026-05-18',
    stato: 'In Approvazione',
    proveSelezionate: [
      { provaId: 'p4', quantita: 10, prezzoApplicato: 35.0 },
      { provaId: 'p6', quantita: 10, prezzoApplicato: 25.0 } // Scontata da 28 a 25
    ],
    pacchettiSelezionati: [],
    totale: 600.0, // 10*35 + 10*25
    note: 'In attesa di conferma disponibilità flaconi sterili per campionamento.'
  }
];

export const INITIAL_REAGENTI: Reagente[] = [
  {
    id: 'r1',
    nome: 'Acido Solforico 96% RPE',
    formulaChimica: 'H2SO4',
    marcaProduttore: 'Carlo Erba Reagenti',
    codiceProdotto: '410301',
    lotto: 'L2410988',
    dataScadenza: '2028-11-30',
    quantitaDisponibile: 1500,
    unitaMisura: 'ml',
    collocazione: 'Armadio di Sicurezza Corrosivi - Sezione Acidi',
    livelloSottoScorta: 500
  },
  {
    id: 'r2',
    nome: 'Idrossido di Sodio in Gocce (Pellets) purissimo',
    formulaChimica: 'NaOH',
    marcaProduttore: 'Sigma-Aldrich',
    codiceProdotto: 'S8045-500G',
    lotto: 'SZBG0120V',
    dataScadenza: '2029-02-15',
    quantitaDisponibile: 850,
    unitaMisura: 'g',
    collocazione: 'Armadio Basi e Sali alcalini',
    livelloSottoScorta: 250
  },
  {
    id: 'r3',
    nome: 'Indicatore Blu di Bromotimolo soluzione idroalcolica',
    formulaChimica: 'C27H28Br2O5S',
    marcaProduttore: 'PanReac AppliChem',
    codiceProdotto: '161162.1608',
    lotto: '0001552093',
    dataScadenza: '2027-04-10',
    quantitaDisponibile: 100,
    unitaMisura: 'ml',
    collocazione: 'Scaffale Indicatori e Soluzioni Pronte',
    livelloSottoScorta: 150 // Sotto scorta! Alerta visiva
  },
  {
    id: 'r4',
    nome: 'Etanolo 96% denaturato speciale per analisi',
    formulaChimica: 'CH3CH2OH',
    marcaProduttore: 'Carlo Erba Reagenti',
    codiceProdotto: '414605',
    lotto: 'L2503211',
    dataScadenza: '2030-01-01',
    quantitaDisponibile: 5000,
    unitaMisura: 'ml',
    collocazione: 'Armadio di Sicurezza Solventi Infiammabili',
    livelloSottoScorta: 2000
  },
  {
    id: 'r5',
    nome: 'Nitrato d\'Argento soluzione titolata 0.1 N (0.1 M)',
    formulaChimica: 'AgNO3',
    marcaProduttore: 'Merck Millipore',
    codiceProdotto: '109081',
    lotto: 'HC4123010',
    dataScadenza: '2026-06-30', // Scade prossimamente!
    quantitaDisponibile: 250,
    unitaMisura: 'ml',
    collocazione: 'Armadio Reagenti Protetti dalla Luce',
    livelloSottoScorta: 250
  }
];

export const INITIAL_ACCETTAZIONI: AccettazioneCampione[] = [
  {
    id: 'ac1',
    codiceAccettazione: 'ACC-2026-0001',
    dataAccettazione: '2026-05-20',
    descrizioneCampione: 'Olio Extravergine di Oliva d\'Inizio Campagna',
    matrice: 'Oli e Grassi',
    quantitaCampione: '2 Bottiglie da 750ml in vetro scuro',
    temperaturaArrivo: '+18.5 °C (Temp. Ambiente)',
    statoInArrivo: 'Idoneo',
    intestatarioRapportoClienteId: 'c1', // Fratelli Rossi S.p.A.
    destinatarioFatturaClienteId: 'c1', // Fratelli Rossi S.p.A.
    preventivoAssociatoId: 'pr1', // PREV-2026-001
    consegnaPrevista: '2026-05-24',
    noteLab: 'Campione perfettamente sigillato ed etichettato con codice lotto FR-2026-X1.',
    analisiStato: 'In Corso',
    operatorRegistrazione: 'Dott. Chim. F. Lupo'
  },
  {
    id: 'ac2',
    codiceAccettazione: 'ACC-2026-0002',
    dataAccettazione: '2026-05-28',
    descrizioneCampione: 'Vino Rosso Novello - Vasca 14',
    matrice: 'Vini ed Aceti',
    quantitaCampione: '3 Bottiglie PET da 1.0 Litro',
    temperaturaArrivo: '+16.2 °C',
    statoInArrivo: 'Accettato con Riserva',
    intestatarioRapportoClienteId: 'c2', // Cantine del Sole
    destinatarioFatturaClienteId: 'c1', // Fatturato a Fratelli Rossi S.p.A. (Contratto Partner)
    preventivoAssociatoId: 'pr2', // PREV-2026-002
    consegnaPrevista: '2026-06-02',
    noteLab: 'Campioni arrivati in contenitori PET non pre-sterilizzati, possibile leggera alterazione microbiologica, concordata riserva col cliente.',
    analisiStato: 'In Attesa',
    operatorRegistrazione: 'Dott.ssa S. Bianchi'
  }
];

export const INITIAL_OPERATORS: Operator[] = [
  { nome: 'Dott. Chim. F. Lupo', ruolo: 'Chimico Responsabile / Biochem', password: 'lupo123' },
  { nome: 'Dott.ssa S. Bianchi', ruolo: 'Tecnico di Laboratorio / Lab Tech', password: 'bianchi123' },
  { nome: 'Dott. R. Vitale', ruolo: 'Analista Qualità (emcvit@gmail.com)', password: 'vitale123' }
];

export const INITIAL_PRATICHE_FATTURAZIONE: PraticaFatturazione[] = [
  {
    id: 'prat_1',
    numeroCampione: 'ACC-2026-0001',
    clienteId: 'c1',
    nomeCliente: 'Fratelli Rossi S.p.A.',
    partitaIva: '01234567890',
    numeroPreventivo: 'PREV-2026-001',
    dataAccettazione: '2026-05-20',
    importo: 445.0,
    statoFatturazione: 'Da fatturare',
    numeroFattura: '',
    dataFattura: '',
    note: 'Campione perfettamente sigillato ed etichettato'
  },
  {
    id: 'prat_2',
    numeroCampione: 'ACC-2026-0002',
    clienteId: 'c1',
    nomeCliente: 'Fratelli Rossi S.p.A.',
    partitaIva: '01234567890',
    numeroPreventivo: 'PREV-2026-002',
    dataAccettazione: '2026-05-28',
    importo: 600.0,
    statoFatturazione: 'Fatturato',
    numeroFattura: 'FT-2026-0087',
    dataFattura: '2026-05-30',
    note: 'Contratto partner'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log_1',
    dataOra: '2026-05-20 10:30:15',
    utente: 'Dott. Chim. F. Lupo',
    sezione: 'Accettazione',
    campo: 'Creazione Campione',
    valorePrecedente: '-',
    valoreNuovo: 'Registrato campione ACC-2026-0001'
  },
  {
    id: 'log_2',
    dataOra: '2026-05-28 11:15:00',
    utente: 'Dott.ssa S. Bianchi',
    sezione: 'Accettazione',
    campo: 'Creazione Campione',
    valorePrecedente: '-',
    valoreNuovo: 'Registrato campione ACC-2026-0002'
  },
  {
    id: 'log_3',
    dataOra: '2026-05-30 15:20:44',
    utente: 'Dott. R. Vitale',
    sezione: 'Fatturazione',
    campo: 'Stato fatturazione',
    valorePrecedente: 'Da fatturare',
    valoreNuovo: 'Fatturato (Fattura nr. FT-2026-0087)'
  }
];

