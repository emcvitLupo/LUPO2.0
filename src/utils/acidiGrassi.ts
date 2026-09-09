/**
 * Utility per il calcolo del profilo degli Acidi Grassi (FAME 37)
 * e ripartizione in Saturi, Monoinsaturi e Polinsaturi per l'Etichetta Nutrizionale.
 * 
 * Basato sul metodo analitico gascromatografico:
 * Standard FAME 37 (srd.xls) con correzione rispetto al Palmitico C16:0
 * Campione (CAMP.xls) con calcolo delle aree corrette e % in peso.
 */

export type ClasseAcidoGrasso = 'saturo' | 'monoinsaturo' | 'polinsaturo';

export interface FAME37Definition {
  numero: number;
  nome: string;
  sigla: string;
  classe: ClasseAcidoGrasso;
  miDefault: number; // Concentrazione nota nello standard (µg/mL)
  areaStdDefault: number; // Area cromatografica nello standard
  fPrimeDefault: number; // F'i rispetto a C16:0
  areaCampioneDefault?: number; // Esempio da CAMP.xls
}

export interface FAMEItemState {
  numero: number;
  nome: string;
  sigla: string;
  classe: ClasseAcidoGrasso;
  // Standard
  mi: number; // µg/mL
  pesoPercentualeStd: number; // % in peso calcolata
  areaStd: number;
  wiStd: number; // % area dal cromatogramma
  fi: number; // Fattore assoluto
  fPrime: number; // F'i rispetto a C16:0
  // Campione
  areaCampione: number;
  areaCorretta: number; // F'i * Ai
  valorePercentuale: number; // % del componente nel campione
}

export interface ProfiloAcidiGrassiResult {
  totaleMiStd: number;
  totaleAreaStd: number;
  fPalmitico: number;
  totaleAreaCampione: number;
  totaleAreaCorretta: number;
  // Totali nutrizionali
  percentualeSaturi: number;
  percentualeMonoinsaturi: number;
  percentualePolinsaturi: number;
  sommaPercentuali: number;
  // Conversione su alimento tal quale (se specificato grasso totale g/100g)
  grassoTotaleG100g?: number;
  gSaturi100g?: number;
  gMonoinsaturi100g?: number;
  gPolinsaturi100g?: number;
  items: FAMEItemState[];
}

export const FAME_37_MASTER_LIST: FAME37Definition[] = [
  { numero: 1, nome: 'Butirrico (c4:0)', sigla: 'C4:0', classe: 'saturo', miDefault: 499.1, areaStdDefault: 446565, fPrimeDefault: 1.60, areaCampioneDefault: 197354 },
  { numero: 2, nome: 'Caproico (c6:0)', sigla: 'C6:0', classe: 'saturo', miDefault: 507.5, areaStdDefault: 562035, fPrimeDefault: 1.29, areaCampioneDefault: 0 },
  { numero: 3, nome: 'Caprilico (c8:0)', sigla: 'C8:0', classe: 'saturo', miDefault: 495.9, areaStdDefault: 571392, fPrimeDefault: 1.24, areaCampioneDefault: 0 },
  { numero: 4, nome: 'Caprico (c10:0)', sigla: 'C10:0', classe: 'saturo', miDefault: 499.5, areaStdDefault: 628205, fPrimeDefault: 1.14, areaCampioneDefault: 217467 },
  { numero: 5, nome: 'Undecilico (C11:0)', sigla: 'C11:0', classe: 'saturo', miDefault: 501.0, areaStdDefault: 634619, fPrimeDefault: 1.13, areaCampioneDefault: 0 },
  { numero: 6, nome: 'Laurico (C12:0)', sigla: 'C12:0', classe: 'saturo', miDefault: 499.5, areaStdDefault: 654980, fPrimeDefault: 1.09, areaCampioneDefault: 301848 },
  { numero: 7, nome: 'Tridecanoico (C13:0)', sigla: 'C13:0', classe: 'saturo', miDefault: 505.5, areaStdDefault: 681015, fPrimeDefault: 1.06, areaCampioneDefault: 0 },
  { numero: 8, nome: 'Miristico (c14:0)', sigla: 'C14:0', classe: 'saturo', miDefault: 504.5, areaStdDefault: 726243, fPrimeDefault: 0.99, areaCampioneDefault: 1204723 },
  { numero: 9, nome: 'Miristoleico (c14:1)', sigla: 'C14:1', classe: 'monoinsaturo', miDefault: 503.1, areaStdDefault: 705792, fPrimeDefault: 1.02, areaCampioneDefault: 135907 },
  { numero: 10, nome: 'Pentadecanoico (c15:0)', sigla: 'C15:0', classe: 'saturo', miDefault: 500.0, areaStdDefault: 707731, fPrimeDefault: 1.01, areaCampioneDefault: 123625 },
  { numero: 11, nome: 'Pentadecenoico (c15:1)', sigla: 'C15:1', classe: 'monoinsaturo', miDefault: 501.2, areaStdDefault: 679224, fPrimeDefault: 1.06, areaCampioneDefault: 0 },
  { numero: 12, nome: 'Palmitico (c16:0)', sigla: 'C16:0', classe: 'saturo', miDefault: 1000.6, areaStdDefault: 1430651, fPrimeDefault: 1.00, areaCampioneDefault: 32654890 },
  { numero: 13, nome: 'Palmitoleico (C16:1)', sigla: 'C16:1', classe: 'monoinsaturo', miDefault: 506.5, areaStdDefault: 663611, fPrimeDefault: 1.09, areaCampioneDefault: 1097143 },
  { numero: 14, nome: 'Eptadecanoica (C17:0)', sigla: 'C17:0', classe: 'saturo', miDefault: 511.5, areaStdDefault: 717530, fPrimeDefault: 1.02, areaCampioneDefault: 215492 },
  { numero: 15, nome: 'Eptadecenoico (C17:1)', sigla: 'C17:1', classe: 'monoinsaturo', miDefault: 499.1, areaStdDefault: 734422, fPrimeDefault: 0.97, areaCampioneDefault: 71167 },
  { numero: 16, nome: 'Stearico (c18:0)', sigla: 'C18:0', classe: 'saturo', miDefault: 1014.5, areaStdDefault: 1432967, fPrimeDefault: 1.01, areaCampioneDefault: 27547470 },
  { numero: 17, nome: 'Oleico (c18:1)trans', sigla: 'C18:1 trans', classe: 'monoinsaturo', miDefault: 508.0, areaStdDefault: 687238, fPrimeDefault: 1.06, areaCampioneDefault: 0 },
  { numero: 18, nome: 'Oleico (c18:1)cis', sigla: 'C18:1 cis', classe: 'monoinsaturo', miDefault: 999.4, areaStdDefault: 1427977, fPrimeDefault: 1.00, areaCampioneDefault: 50265110 },
  { numero: 19, nome: 'Linoleico (c18:2)trans', sigla: 'C18:2 trans', classe: 'polinsaturo', miDefault: 501.7, areaStdDefault: 661451, fPrimeDefault: 1.08, areaCampioneDefault: 0 },
  { numero: 20, nome: 'Linoleico (c18:2)cis', sigla: 'C18:2 cis', classe: 'polinsaturo', miDefault: 1004.2, areaStdDefault: 1168858, fPrimeDefault: 1.23, areaCampioneDefault: 54321430 },
  { numero: 21, nome: 'Linolenico (c18:3)cis alfa', sigla: 'C18:3 alfa', classe: 'polinsaturo', miDefault: 804.7, areaStdDefault: 1385478, fPrimeDefault: 0.83, areaCampioneDefault: 869731 },
  { numero: 22, nome: 'Linolenico (c18:3)cis gamma', sigla: 'C18:3 gamma', classe: 'polinsaturo', miDefault: 500.0, areaStdDefault: 954739, fPrimeDefault: 0.75, areaCampioneDefault: 531825 },
  { numero: 23, nome: 'Arachico (C20:0)', sigla: 'C20:0', classe: 'saturo', miDefault: 511.4, areaStdDefault: 665122, fPrimeDefault: 1.10, areaCampioneDefault: 234196 },
  { numero: 24, nome: '11-Eicosenoico(c20:1)cis', sigla: 'C20:1 cis', classe: 'monoinsaturo', miDefault: 500.5, areaStdDefault: 732477, fPrimeDefault: 0.98, areaCampioneDefault: 0 },
  { numero: 25, nome: '11,14 Eicosadienoico (c20:2)cis', sigla: 'C20:2 cis', classe: 'polinsaturo', miDefault: 500.8, areaStdDefault: 643401, fPrimeDefault: 1.11, areaCampioneDefault: 0 },
  { numero: 26, nome: 'Eneicosanoico (c21:0)', sigla: 'C21:0', classe: 'saturo', miDefault: 501.8, areaStdDefault: 716901, fPrimeDefault: 1.00, areaCampioneDefault: 746397 },
  { numero: 27, nome: 'Eicosatrienoico (c20:3)cis', sigla: 'C20:3 cis', classe: 'polinsaturo', miDefault: 501.9, areaStdDefault: 707948, fPrimeDefault: 1.01, areaCampioneDefault: 0 },
  { numero: 28, nome: 'Arachidonico (c20:4)cis', sigla: 'C20:4 cis', classe: 'polinsaturo', miDefault: 807.9, areaStdDefault: 647651, fPrimeDefault: 1.78, areaCampioneDefault: 0 },
  { numero: 29, nome: 'Eicosatrienoico (c20:3) cis n-6', sigla: 'C20:3 n-6', classe: 'polinsaturo', miDefault: 505.5, areaStdDefault: 513751, fPrimeDefault: 2.81, areaCampioneDefault: 251924 },
  { numero: 30, nome: 'Beenico(C22:0)', sigla: 'C22:0', classe: 'saturo', miDefault: 503.2, areaStdDefault: 513751, fPrimeDefault: 2.80, areaCampioneDefault: 0 },
  { numero: 31, nome: 'Erucico (c22:1)', sigla: 'C22:1', classe: 'monoinsaturo', miDefault: 504.3, areaStdDefault: 684970, fPrimeDefault: 1.05, areaCampioneDefault: 0 },
  { numero: 32, nome: 'Eicosapentaenoico (c20:5) cis', sigla: 'C20:5 EPA', classe: 'polinsaturo', miDefault: 810.2, areaStdDefault: 747681, fPrimeDefault: 1.55, areaCampioneDefault: 0 },
  { numero: 33, nome: 'Docosadienoico (c22:2)', sigla: 'C22:2', classe: 'polinsaturo', miDefault: 502.6, areaStdDefault: 663342, fPrimeDefault: 1.08, areaCampioneDefault: 0 },
  { numero: 34, nome: 'Tricosanoico (c23:0)', sigla: 'C23:0', classe: 'saturo', miDefault: 502.2, areaStdDefault: 771056, fPrimeDefault: 0.93, areaCampioneDefault: 0 },
  { numero: 35, nome: 'Lignocerico (c24:0)', sigla: 'C24:0', classe: 'saturo', miDefault: 504.8, areaStdDefault: 739147, fPrimeDefault: 0.98, areaCampioneDefault: 0 },
  { numero: 36, nome: 'Nervonico (c24:1) cis', sigla: 'C24:1 cis', classe: 'monoinsaturo', miDefault: 501.2, areaStdDefault: 572322, fPrimeDefault: 1.25, areaCampioneDefault: 0 },
  { numero: 37, nome: 'Docosaexaenoico (c22:6) cis n-3', sigla: 'C22:6 DHA', classe: 'polinsaturo', miDefault: 806.1, areaStdDefault: 832817, fPrimeDefault: 1.38, areaCampioneDefault: 0 }
];

/**
 * Inizializza lo stato dei 37 acidi grassi con i valori di default dello standard.
 * Se withSampleDefault è true, carica anche le aree di prova dal file CAMP.xls.
 */
export function getInitialFAMEState(withSampleDefault: boolean = false): {
  items: { numero: number; mi: number; areaStd: number; areaCampione: number }[];
  grassoTotaleG100g?: number;
} {
  return {
    items: FAME_37_MASTER_LIST.map(def => ({
      numero: def.numero,
      mi: def.miDefault,
      areaStd: def.areaStdDefault,
      areaCampione: withSampleDefault ? (def.areaCampioneDefault || 0) : 0
    })),
    grassoTotaleG100g: undefined
  };
}

/**
 * Calcola l'intero profilo acidi grassi:
 * 1. Standard: % in peso, Wi, Fi, F'i (rispetto a Palmitico C16:0)
 * 2. Campione: Aree corrette (F'i * Ai), Valore %
 * 3. Somme nutrizionali: Saturi, Monoinsaturi, Polinsaturi
 */
export function calcolaProfiloAcidiGrassi(
  inputData: { numero: number; mi: number; areaStd: number; areaCampione: number }[],
  grassoTotaleG100g?: number
): ProfiloAcidiGrassiResult {
  const masterMap = new Map<number, FAME37Definition>(
    FAME_37_MASTER_LIST.map(d => [d.numero, d])
  );

  // 1. Somma concentrazioni standard (Sm)
  const totaleMiStd = inputData.reduce((acc, curr) => acc + (Number(curr.mi) || 0), 0);

  // 2. Somma aree standard (SA)
  const totaleAreaStd = inputData.reduce((acc, curr) => acc + (Number(curr.areaStd) || 0), 0);

  // 3. Calcolo % peso, Wi e Fi per ciascuno
  const tempItems = inputData.map(item => {
    const def = masterMap.get(item.numero) || FAME_37_MASTER_LIST[item.numero - 1];
    const miVal = Number(item.mi) || 0;
    const areaStdVal = Number(item.areaStd) || 0;

    const pesoPercentualeStd = totaleMiStd > 0 ? (miVal * 100) / totaleMiStd : 0;
    const wiStd = totaleAreaStd > 0 ? (areaStdVal * 100) / totaleAreaStd : 0;
    const fi = wiStd > 0 ? pesoPercentualeStd / wiStd : 1;

    return {
      numero: item.numero,
      nome: def.nome,
      sigla: def.sigla,
      classe: def.classe,
      mi: miVal,
      pesoPercentualeStd,
      areaStd: areaStdVal,
      wiStd,
      fi,
      areaCampione: Number(item.areaCampione) || 0
    };
  });

  // 4. Fattore Palmitico C16:0 (numero 12)
  const palmitico = tempItems.find(i => i.numero === 12);
  const fPalmitico = palmitico && palmitico.fi > 0 ? palmitico.fi : 1.0182;

  // 5. Calcolo F'i rispetto a Palmitico e Aree Corrette (F'i * Ai)
  let totaleAreaCampione = 0;
  let totaleAreaCorretta = 0;

  const itemsWithCorrection = tempItems.map(item => {
    const fPrime = fPalmitico > 0 ? item.fi / fPalmitico : 1;
    const areaCamp = item.areaCampione > 0 ? item.areaCampione : 0;
    const areaCorretta = areaCamp > 0 ? fPrime * areaCamp : 0;

    totaleAreaCampione += areaCamp;
    totaleAreaCorretta += areaCorretta;

    return {
      ...item,
      fPrime,
      areaCorretta
    };
  });

  // 6. Calcolo Valore % per ciascun acido grasso nel campione
  let percentualeSaturi = 0;
  let percentualeMonoinsaturi = 0;
  let percentualePolinsaturi = 0;

  const finalItems: FAMEItemState[] = itemsWithCorrection.map(item => {
    const valorePercentuale = totaleAreaCorretta > 0 ? (item.areaCorretta * 100) / totaleAreaCorretta : 0;

    if (item.classe === 'saturo') {
      percentualeSaturi += valorePercentuale;
    } else if (item.classe === 'monoinsaturo') {
      percentualeMonoinsaturi += valorePercentuale;
    } else if (item.classe === 'polinsaturo') {
      percentualePolinsaturi += valorePercentuale;
    }

    return {
      ...item,
      valorePercentuale
    };
  });

  const sommaPercentuali = percentualeSaturi + percentualeMonoinsaturi + percentualePolinsaturi;

  // Calcolo g / 100g su alimento tal quale se specificato il grasso totale
  const fatVal = typeof grassoTotaleG100g === 'number' && grassoTotaleG100g >= 0 ? grassoTotaleG100g : undefined;
  const gSaturi100g = fatVal !== undefined ? (percentualeSaturi * fatVal) / 100 : undefined;
  const gMonoinsaturi100g = fatVal !== undefined ? (percentualeMonoinsaturi * fatVal) / 100 : undefined;
  const gPolinsaturi100g = fatVal !== undefined ? (percentualePolinsaturi * fatVal) / 100 : undefined;

  return {
    totaleMiStd,
    totaleAreaStd,
    fPalmitico,
    totaleAreaCampione,
    totaleAreaCorretta,
    percentualeSaturi,
    percentualeMonoinsaturi,
    percentualePolinsaturi,
    sommaPercentuali,
    grassoTotaleG100g: fatVal,
    gSaturi100g,
    gMonoinsaturi100g,
    gPolinsaturi100g,
    items: finalItems
  };
}

/**
 * Parser per importare dati dallo standard (srd.xls / testo incollato) o dal campione (CAMP.xls / testo)
 */
export function parseFAMETextOrRows(text: string): { nomeOrSigla?: string; area?: number; mi?: number }[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const results: { nomeOrSigla?: string; area?: number; mi?: number }[] = [];

  for (const line of lines) {
    // Dividi per tab, punto e virgola o virgola (evitando virgole nei numeri decimali es: "499,1")
    const parts = line.split(/\t|;/).map(p => p.trim());
    if (parts.length < 2) continue;

    // Cerca numeri nella riga
    let foundArea: number | undefined;
    let foundMi: number | undefined;
    let label = parts[0];

    for (const p of parts) {
      const cleaned = p.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      if (!isNaN(num)) {
        if (num > 10000 && !foundArea) {
          foundArea = num;
        } else if (num > 0 && num < 5000 && !foundMi) {
          foundMi = num;
        }
      }
    }

    results.push({ nomeOrSigla: label, area: foundArea, mi: foundMi });
  }

  return results;
}

/**
 * Helper per riconoscere se una prova nel LIMS riguarda gli Acidi Grassi / FAME
 */
export function isAcidiGrassiProva(prova: { nome?: string; metodoAnalitico?: string; tipoMetodoCalcolo?: string }): boolean {
  if (!prova) return false;
  if (prova.tipoMetodoCalcolo === 'acidi_grassi') return true;
  const nome = (prova.nome || '').toLowerCase().trim();
  const metodo = (prova.metodoAnalitico || '').toLowerCase().trim();

  return (
    nome.includes('acidi grassi') ||
    nome.includes('acido grasso') ||
    nome.includes('composizione acidi') ||
    nome.includes('composizione acidica') ||
    nome.includes('profilo acidi') ||
    nome.includes('profilo acidico') ||
    nome.includes('fame 37') ||
    nome.includes('fame') ||
    nome.includes('esteri metilici') ||
    nome.includes('profilo lipidico') ||
    nome.includes('saturi') ||
    nome.includes('monoinsaturi') ||
    nome.includes('polinsaturi') ||
    (nome.includes('acidi') && nome.includes('grass')) ||
    metodo.includes('fame') ||
    metodo.includes('12966')
  );
}

export interface FrazioneAcidiGrassiDisplayItem {
  chiave: 'saturi' | 'monoinsaturi' | 'polinsaturi';
  nome: string;
  sigla: string;
  valoreSoloNumero: string;
  haValore: boolean;
  unitaMisura?: string;
}

/**
 * Estrae le frazioni di acidi grassi selezionate (Saturi, Monoinsaturi, Polinsaturi)
 * per visualizzarle con nome sotto l'area Prova e solo il valore numerico nell'area Risultato.
 */
export function getAcidiGrassiFrazioniDisplay(
  prova: {
    nome?: string;
    metodoAnalitico?: string;
    tipoMetodoCalcolo?: string;
    opzioniReportAcidiGrassi?: {
      reportSaturi?: boolean;
      reportMonoinsaturi?: boolean;
      reportPolinsaturi?: boolean;
    };
  },
  rData?: {
    valoreRilevato?: string;
    unitaMisura?: string;
    quadernoCalcolo?: {
      tipoCalcolo?: string;
      acidiGrassiDettaglio?: {
        percentualeSaturi?: number;
        percentualeMonoinsaturi?: number;
        percentualePolinsaturi?: number;
        gSaturi100g?: number;
        gMonoinsaturi100g?: number;
        gPolinsaturi100g?: number;
        grassoTotale?: number | null;
        reportSaturi?: boolean;
        reportMonoinsaturi?: boolean;
        reportPolinsaturi?: boolean;
        classiSelezionateRdP?: {
          saturi?: boolean;
          monoinsaturi?: boolean;
          polinsaturi?: boolean;
        };
      };
    };
  }
): FrazioneAcidiGrassiDisplayItem[] | null {
  if (!isAcidiGrassiProva(prova)) return null;

  const dett = rData?.quadernoCalcolo?.acidiGrassiDettaglio;
  const opz = prova.opzioniReportAcidiGrassi;

  // Determina abilitazione per ciascuna frazione
  let repSaturi = dett?.reportSaturi ?? dett?.classiSelezionateRdP?.saturi ?? opz?.reportSaturi ?? true;
  let repMono = dett?.reportMonoinsaturi ?? dett?.classiSelezionateRdP?.monoinsaturi ?? opz?.reportMonoinsaturi ?? true;
  let repPoli = dett?.reportPolinsaturi ?? dett?.classiSelezionateRdP?.polinsaturi ?? opz?.reportPolinsaturi ?? true;

  const valRaw = rData?.valoreRilevato || '';

  // Se i dettagli sono nel quaderno di calcolo
  let valSaturi = '';
  let valMono = '';
  let valPoli = '';
  const isGrasso = dett?.grassoTotale && dett.grassoTotale > 0;

  if (dett) {
    if (dett.percentualeSaturi !== undefined || dett.gSaturi100g !== undefined) {
      valSaturi = isGrasso && dett.gSaturi100g !== undefined 
        ? dett.gSaturi100g.toFixed(2) 
        : (dett.percentualeSaturi !== undefined ? dett.percentualeSaturi.toFixed(2) : '');
    }
    if (dett.percentualeMonoinsaturi !== undefined || dett.gMonoinsaturi100g !== undefined) {
      valMono = isGrasso && dett.gMonoinsaturi100g !== undefined 
        ? dett.gMonoinsaturi100g.toFixed(2) 
        : (dett.percentualeMonoinsaturi !== undefined ? dett.percentualeMonoinsaturi.toFixed(2) : '');
    }
    if (dett.percentualePolinsaturi !== undefined || dett.gPolinsaturi100g !== undefined) {
      valPoli = isGrasso && dett.gPolinsaturi100g !== undefined 
        ? dett.gPolinsaturi100g.toFixed(2) 
        : (dett.percentualePolinsaturi !== undefined ? dett.percentualePolinsaturi.toFixed(2) : '');
    }
  } else if (valRaw) {
    // Parsing da stringa generica (es: "Saturi: 17.58 % | Monoinsaturi: 73.12 % | Polinsaturi: 9.30 %" o "17.58 | 73.12 | 9.30")
    const matchSaturi = valRaw.match(/(?:saturi|sfa)[:\s]*([\d.,]+)/i);
    const matchMono = valRaw.match(/(?:monoinsaturi|mufa|mono)[:\s]*([\d.,]+)/i);
    const matchPoli = valRaw.match(/(?:polinsaturi|pufa|poli)[:\s]*([\d.,]+)/i);

    if (matchSaturi) valSaturi = matchSaturi[1].replace(',', '.');
    if (matchMono) valMono = matchMono[1].replace(',', '.');
    if (matchPoli) valPoli = matchPoli[1].replace(',', '.');

    if (!matchSaturi && !matchMono && !matchPoli) {
      if (valRaw.includes('|')) {
        const parts = valRaw.split('|').map(s => s.trim());
        if (parts[0]) valSaturi = parts[0].replace(/[^\d.,]/g, '').replace(',', '.');
        if (parts[1]) valMono = parts[1].replace(/[^\d.,]/g, '').replace(',', '.');
        if (parts[2]) valPoli = parts[2].replace(/[^\d.,]/g, '').replace(',', '.');
      } else {
        // Singolo valore inserito
        valSaturi = valRaw.replace(/[^\d.,]/g, '').replace(',', '.');
      }
    }
  }

  const items: FrazioneAcidiGrassiDisplayItem[] = [];

  if (repSaturi) {
    items.push({
      chiave: 'saturi',
      nome: 'Acidi grassi saturi',
      sigla: 'SFA',
      valoreSoloNumero: valSaturi ? valSaturi.replace('.', ',') : '',
      haValore: !!valSaturi,
      unitaMisura: isGrasso ? 'g/100g' : (rData?.unitaMisura || '%')
    });
  }

  if (repMono) {
    items.push({
      chiave: 'monoinsaturi',
      nome: 'Acidi grassi monoinsaturi',
      sigla: 'MUFA',
      valoreSoloNumero: valMono ? valMono.replace('.', ',') : '',
      haValore: !!valMono,
      unitaMisura: isGrasso ? 'g/100g' : (rData?.unitaMisura || '%')
    });
  }

  if (repPoli) {
    items.push({
      chiave: 'polinsaturi',
      nome: 'Acidi grassi polinsaturi',
      sigla: 'PUFA',
      valoreSoloNumero: valPoli ? valPoli.replace('.', ',') : '',
      haValore: !!valPoli,
      unitaMisura: isGrasso ? 'g/100g' : (rData?.unitaMisura || '%')
    });
  }

  return items.length > 0 ? items : null;
}
