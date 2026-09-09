import { RisultatoProva, Prova } from '../types';

export interface CompostoIdrocarburiInput {
  nome: string; // 'Bromoformio' | 'Cloroformio' | 'Bromodiclorometano' | 'Dibromoclorometano' o id
  valoreRilevato: string;
  loq: string; // es. "0.01" o "0.01 µg/L" o "0.01 mg/kg"
  incertezza?: string; // es. "± 0.002" o "0.002"
  unitaMisura?: string;
}

export interface CompostoCalcolato {
  nome: string;
  valoreOriginale: string;
  loqValue: number;
  loqStr: string;
  isBelowLoq: boolean;
  valoreUsatoPerSomma: number;
  valoreFormatted: string;
  incertezzaOriginale: string;
  incertezzaUsataPerSomma: number; // 0 se sotto LOQ
  incertezzaFormatted: string; // 'N/D' se sotto LOQ o assente
}

export interface RisultatoSommaIdrocarburi {
  sommaConcentrazione: number;
  sommaConcentrazioneFormatted: string;
  sommaIncertezza: number;
  sommaIncertezzaFormatted: string; // es. "± 0.005" o "N/D" se tutti < LOQ
  composti: CompostoCalcolato[];
  quantiSottoLoq: number;
  quantiSopraLoq: number;
  tuttiSottoLoq: boolean;
  dettaglioCalcoloText: string;
}

// Estrae un valore numerico da una stringa gestendo virgole e notazioni scientifiche
export function parseNumericValue(valStr?: string | number | null): number | null {
  if (valStr === undefined || valStr === null) return null;
  if (typeof valStr === 'number') return isNaN(valStr) ? null : valStr;
  
  const clean = valStr.trim().replace(',', '.');
  const match = clean.match(/[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return isNaN(num) ? null : num;
}

// Estrae il valore numerico dell'incertezza (es. "± 0.004" -> 0.004)
export function parseIncertezzaValue(incStr?: string | null): number {
  if (!incStr) return 0;
  const clean = incStr.replace('±', '').replace('+', '').replace('-', '').trim();
  const num = parseNumericValue(clean);
  return num !== null && num > 0 ? num : 0;
}

// Determina se una stringa o valore è considerato inferiore al LOQ
export function isValueLowerThanLoq(valStr: string, loqStr?: string): boolean {
  if (!valStr) return false;
  const cleanVal = valStr.trim();
  
  // Se inizia con '<', '≤', '<=' o include 'loq' o 'inferiore' o 'tracce' o 'n.d.' o 'nd'
  if (cleanVal.startsWith('<') || cleanVal.startsWith('≤') || cleanVal.startsWith('<=') || /[<≤]|loq|inferiore|tracce|n\.d\.|nd/i.test(cleanVal)) {
    return true;
  }

  // Se c'è un LOQ numerico e il valore numerico inserito è strettamente minore
  if (loqStr) {
    const vNum = parseNumericValue(cleanVal);
    const loqNum = parseNumericValue(loqStr);
    if (vNum !== null && loqNum !== null && vNum < loqNum) {
      return true;
    }
  }

  return false;
}

// Lista standard dei 4 composti che compongono gli Idrocarburi Totali / Trialometani
export interface CompostoMetaConfig {
  key: string;
  nomi: string[];
  nomeStandard: string;
  formulaMolecolare: string;
  cas: string;
  defaultLoq: string;
  coloreTheme: {
    badge: string;
    border: string;
    bgLight: string;
    accent: string;
    text: string;
    dot: string;
    barColor: string;
  };
}

export const COMPOSTI_IDROCARBURI_TOTALI: CompostoMetaConfig[] = [
  {
    key: 'bromoformio',
    nomi: ['bromoformio', 'tribromometano', 'chbr3'],
    nomeStandard: 'Bromoformio',
    formulaMolecolare: 'CHBr₃',
    cas: '75-25-2',
    defaultLoq: '0.01',
    coloreTheme: {
      badge: 'bg-sky-100 text-sky-800 border-sky-300',
      border: 'border-sky-300',
      bgLight: 'bg-sky-50/40',
      accent: 'text-sky-700',
      text: 'text-sky-950',
      dot: 'bg-sky-500',
      barColor: 'bg-sky-500'
    }
  },
  {
    key: 'cloroformio',
    nomi: ['cloroformio', 'triclorometano', 'chcl3'],
    nomeStandard: 'Cloroformio',
    formulaMolecolare: 'CHCl₃',
    cas: '67-66-3',
    defaultLoq: '0.01',
    coloreTheme: {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      border: 'border-emerald-300',
      bgLight: 'bg-emerald-50/40',
      accent: 'text-emerald-700',
      text: 'text-emerald-950',
      dot: 'bg-emerald-500',
      barColor: 'bg-emerald-500'
    }
  },
  {
    key: 'bromodiclorometano',
    nomi: ['bromodiclorometano', 'diclorobromometano', 'bdcm', 'chbrcl2'],
    nomeStandard: 'Bromodiclorometano',
    formulaMolecolare: 'CHBrCl₂',
    cas: '75-27-4',
    defaultLoq: '0.01',
    coloreTheme: {
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      border: 'border-indigo-300',
      bgLight: 'bg-indigo-50/40',
      accent: 'text-indigo-700',
      text: 'text-indigo-950',
      dot: 'bg-indigo-500',
      barColor: 'bg-indigo-500'
    }
  },
  {
    key: 'dibromoclorometano',
    nomi: ['dibromoclorometano', 'clorodibromometano', 'dbcm', 'chbr2cl'],
    nomeStandard: 'Dibromoclorometano',
    formulaMolecolare: 'CHBr₂Cl',
    cas: '124-48-1',
    defaultLoq: '0.01',
    coloreTheme: {
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      border: 'border-amber-300',
      bgLight: 'bg-amber-50/40',
      accent: 'text-amber-700',
      text: 'text-amber-950',
      dot: 'bg-amber-500',
      barColor: 'bg-amber-500'
    }
  }
];

/**
 * Calcola la somma degli Idrocarburi Totali a partire dai 4 composti:
 * 1. Bromoformio
 * 2. Cloroformio
 * 3. Bromodiclorometano
 * 4. Dibromoclorometano
 * 
 * Regole applicate:
 * - Se un composto ha concentrazione < LOQ (o inserito con "<"), viene sommato come LOQ / 2.
 * - Se un composto ha concentrazione < LOQ, la sua incertezza NON viene riportata (incertezza = 0 per la somma).
 * - Per i composti quantificati (>= LOQ), la concentrazione è quella misurata e l'incertezza viene inclusa.
 * - L'incertezza finale degli Idrocarburi Totali è la somma algebrica delle incertezze dei soli composti quantificati.
 */
export function calcolaSommaIdrocarburiTotali(
  inputs: CompostoIdrocarburiInput[],
  precisionDecimals: number = 3
): RisultatoSommaIdrocarburi {
  const compostiCalcolati: CompostoCalcolato[] = [];
  let sommaConc = 0;
  let sommaInc = 0;
  let countBelow = 0;
  let countAbove = 0;

  for (const item of inputs) {
    const rawVal = (item.valoreRilevato || '').trim();
    const loqStr = (item.loq || '').trim() || '0.01';
    const parsedLoq = parseNumericValue(loqStr) || 0.01;
    const isBelow = isValueLowerThanLoq(rawVal, loqStr);

    let valUsato = 0;
    let formattedVal = '';
    let incUsata = 0;
    let formattedInc = 'N/D';

    const cleanLoq = loqStr.replace(/^[<≤=]+\s*/, '') || loqStr;

    if (!rawVal) {
      // Non inserito: consideriamo come < LOQ (LOQ / 2) di default
      valUsato = parsedLoq / 2;
      formattedVal = `≤ ${cleanLoq} (${(parsedLoq / 2).toFixed(precisionDecimals)})`;
      formattedInc = 'N/D';
      incUsata = 0;
      countBelow++;
    } else if (isBelow) {
      valUsato = parsedLoq / 2;
      formattedVal = /^[<≤=]+/.test(rawVal) ? `≤ ${rawVal.replace(/^[<≤=\s]+/, '') || cleanLoq}` : `≤ ${cleanLoq}`;
      // Incertezza NON riportata per composti < LOQ
      formattedInc = 'N/D';
      incUsata = 0;
      countBelow++;
    } else {
      const numVal = parseNumericValue(rawVal);
      valUsato = numVal !== null ? numVal : 0;
      formattedVal = rawVal;
      
      // Incertezza per composto quantificato
      const incVal = parseIncertezzaValue(item.incertezza);
      incUsata = incVal;
      if (incVal > 0) {
        formattedInc = `± ${incVal.toFixed(precisionDecimals)}`;
      } else {
        formattedInc = item.incertezza || 'N/D';
      }
      countAbove++;
    }

    sommaConc += valUsato;
    sommaInc += incUsata;

    compostiCalcolati.push({
      nome: item.nome,
      valoreOriginale: rawVal,
      loqValue: parsedLoq,
      loqStr: loqStr,
      isBelowLoq: isBelow || !rawVal,
      valoreUsatoPerSomma: valUsato,
      valoreFormatted: formattedVal,
      incertezzaOriginale: item.incertezza || '',
      incertezzaUsataPerSomma: incUsata,
      incertezzaFormatted: formattedInc
    });
  }

  const tuttiSotto = countAbove === 0;

  // Formattazione risultato
  const sommaConcFormatted = sommaConc.toFixed(precisionDecimals);
  const sommaIncFormatted = sommaInc > 0 
    ? `± ${sommaInc.toFixed(precisionDecimals)}`
    : (tuttiSotto ? 'N/D' : '-');

  // Testo esplicativo dettagliato
  const dettagliComposti = compostiCalcolati.map(c => {
    if (c.isBelowLoq) {
      const cleanLoq = c.loqStr.replace(/^[<≤=]+\s*/, '') || c.loqStr;
      return `${c.nome}: ≤ ${cleanLoq} (sotto LOQ) → sommato come LOQ/2 = ${c.valoreUsatoPerSomma.toFixed(precisionDecimals)} | Incertezza: N/D (non riportata)`;
    } else {
      return `${c.nome}: ${c.valoreUsatoPerSomma.toFixed(precisionDecimals)} | Incertezza: ${c.incertezzaFormatted}`;
    }
  }).join('\n');

  const dettaglioCalcoloText = 
`--- CALCOLO SOMMA IDROCARBURI TOTALI ---
Composti considerati:
${dettagliComposti}

Risultato Somma Concentrazione: ${sommaConcFormatted} (${countBelow} composti < LOQ sommati a LOQ/2, ${countAbove} composti quantificati)
Risultato Somma Incertezze: ${sommaIncFormatted} (somma delle sole incertezze dei composti >= LOQ)`;

  return {
    sommaConcentrazione: sommaConc,
    sommaConcentrazioneFormatted: sommaConcFormatted,
    sommaIncertezza: sommaInc,
    sommaIncertezzaFormatted: sommaIncFormatted,
    composti: compostiCalcolati,
    quantiSottoLoq: countBelow,
    quantiSopraLoq: countAbove,
    tuttiSottoLoq: tuttiSotto,
    dettaglioCalcoloText
  };
}

// Helper per identificare se un nome di prova corrisponde ad uno dei 4 composti o alla somma
export function identificaTipoCompostoIdrocarburi(nomeProva?: string): 'bromoformio' | 'cloroformio' | 'bromodiclorometano' | 'dibromoclorometano' | 'somma_totale' | null {
  if (!nomeProva) return null;
  const clean = nomeProva.toLowerCase().trim();

  // Se contiene esplicitamente totale, totali, somma, c10-c40, o idrocarburi, ha priorità come somma_totale
  if (
    clean.includes('totali') ||
    clean.includes('totale') ||
    clean.includes('somma') ||
    clean.includes('c10-c40') ||
    clean.includes('c10 - c40') ||
    clean.includes('total trihalomethanes') ||
    clean.includes('idrocarbur') ||
    clean.includes('trialometan') ||
    clean.includes('thm')
  ) {
    // Se è solo uno dei singoli composti (e non contiene 'totali', 'somma', 'c10-c40' o 'idrocarbur')
    const isSingle = COMPOSTI_IDROCARBURI_TOTALI.some(c => c.nomi.some(n => clean === n || clean.startsWith(n + ' ') || clean.endsWith(' ' + n)));
    if (isSingle && !clean.includes('totali') && !clean.includes('totale') && !clean.includes('somma') && !clean.includes('idrocarbur')) {
      for (const c of COMPOSTI_IDROCARBURI_TOTALI) {
        if (c.nomi.some(n => clean.includes(n))) {
          return c.key as 'bromoformio' | 'cloroformio' | 'bromodiclorometano' | 'dibromoclorometano';
        }
      }
    }
    return 'somma_totale';
  }

  // Altrimenti controlla se corrisponde ad uno dei 4 composti specifici
  for (const c of COMPOSTI_IDROCARBURI_TOTALI) {
    for (const n of c.nomi) {
      if (clean.includes(n)) {
        return c.key as 'bromoformio' | 'cloroformio' | 'bromodiclorometano' | 'dibromoclorometano';
      }
    }
  }

  return null;
}

/**
 * Verifica se la prova è uno dei 4 composti singoli (Bromoformio, Cloroformio, Bromodiclorometano, Dibromoclorometano)
 */
export function isIdrocarburiSingoloComposto(prova?: { nome?: string; tipoMetodoCalcolo?: string } | null): boolean {
  if (!prova || !prova.nome) return false;
  if (prova.tipoMetodoCalcolo === 'idrocarburi_totali') return false;
  const clean = prova.nome.toLowerCase().trim();
  if (clean.includes('totali') || clean.includes('totale') || clean.includes('somma') || clean.includes('c10-c40') || clean.includes('c10 - c40')) {
    return false;
  }
  for (const c of COMPOSTI_IDROCARBURI_TOTALI) {
    for (const n of c.nomi) {
      if (clean.includes(n)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Verifica se la prova è la prova di sintesi / somma degli idrocarburi totali
 */
export function isIdrocarburiSommaTotale(prova?: { nome?: string; tipoMetodoCalcolo?: string; formulaCalcolo?: string } | null): boolean {
  if (!prova) return false;
  if (isIdrocarburiSingoloComposto(prova)) return false;
  if (prova.tipoMetodoCalcolo === 'idrocarburi_totali') return true;
  if ((prova.formulaCalcolo || '').toLowerCase().includes('loq/2')) return true;
  if ((prova.formulaCalcolo || '').toLowerCase().includes('bf + cf')) return true;
  const compType = identificaTipoCompostoIdrocarburi(prova.nome);
  return compType === 'somma_totale';
}

/**
 * Sincronizza automaticamente il risultato e l'incertezza della prova "Idrocarburi Totali"
 * aggregando in tempo reale i valori e le incertezze dei 4 composti singoli presenti nel campione secondo le regole LOQ/2.
 */
export function syncIdrocarburiTotaliResults(
  currentResults: Record<string, Partial<RisultatoProva>>,
  resolvedProve: Prova[],
  activeEditingProvaId?: string
): Record<string, Partial<RisultatoProva>> {
  // Trova la prova degli Idrocarburi Totali (la somma)
  const sommaProva = resolvedProve.find(p => isIdrocarburiSommaTotale(p));
  if (!sommaProva) return currentResults;

  // Se l'operatore sta modificando direttamente la riga del totale idrocarburi,
  // rispetta l'input manuale e non sovrascriverlo durante la digitazione
  if (activeEditingProvaId && activeEditingProvaId === sommaProva.id) {
    return currentResults;
  }

  // Cerca le prove dei 4 composti singoli presenti nel campione
  const matchingItems = COMPOSTI_IDROCARBURI_TOTALI.map(c => {
    const matched = resolvedProve.find(p => {
      if (p.id === sommaProva.id) return false;
      const pNome = (p.nome || '').toLowerCase();
      return c.nomi.some(n => pNome.includes(n));
    });
    return { config: c, prova: matched };
  });

  const presentProve = matchingItems.filter(item => item.prova !== undefined);
  // Se nel campione non ci sono composti singoli, non eseguire l'auto-calcolo aggregato
  if (presentProve.length === 0) return currentResults;

  // Verifica se l'operatore ha inserito o precaricato almeno un valore tra i composti
  const hasAnyInput = presentProve.some(item => {
    const v = currentResults[item.prova!.id]?.valoreRilevato;
    return v !== undefined && v !== '';
  });

  // Se nessun valore è stato ancora inserito e la riga totale è vuota, non forzare
  if (!hasAnyInput && !currentResults[sommaProva.id]?.valoreRilevato) {
    return currentResults;
  }

  // Prepara l'input per il calcolo
  const inputs: CompostoIdrocarburiInput[] = matchingItems.map(({ config, prova }) => {
    if (!prova) {
      return {
        nome: config.nomeStandard,
        valoreRilevato: `≤ ${config.defaultLoq}`,
        loq: config.defaultLoq,
        incertezza: 'N/D'
      };
    }
    const res = currentResults[prova.id];
    const val = res?.valoreRilevato || '';
    const loq = prova.limiteQuantificazione || config.defaultLoq;
    const inc = res?.incertezza || '';
    return {
      nome: config.nomeStandard,
      valoreRilevato: val || `≤ ${loq}`,
      loq,
      incertezza: inc || 'N/D'
    };
  });

  const calc = calcolaSommaIdrocarburiTotali(inputs, 3);
  const existingSomma = currentResults[sommaProva.id] || {};

  // Costruisci le variabili del quaderno con simboli e valori reali per la formula
  const quadVariables = (sommaProva.variabiliCalcolo && sommaProva.variabiliCalcolo.length > 0)
    ? sommaProva.variabiliCalcolo.map((v, idx) => {
        const sym = (v.simbolo || '').toLowerCase();
        const desc = (v.descrizione || '').toLowerCase();
        let cIdx = idx;
        if (sym === 'bf' || desc.includes('bromoformio')) cIdx = 0;
        else if (sym === 'cf' || desc.includes('cloroformio')) cIdx = 1;
        else if (sym === 'bdcm' || desc.includes('bromodiclorometano')) cIdx = 2;
        else if (sym === 'dbcm' || desc.includes('dibromoclorometano')) cIdx = 3;

        const comp = calc.composti[cIdx] || calc.composti[idx] || calc.composti[0];
        return {
          id: (v as any).id || `v-${idx}-${v.simbolo}`,
          simbolo: v.simbolo,
          descrizione: v.descrizione,
          valore: comp ? comp.valoreUsatoPerSomma : 0.005
        };
      })
    : [
        {
          id: 'v_bf',
          simbolo: 'BF',
          descrizione: 'Bromoformio (µg/L)',
          valore: calc.composti[0]?.valoreUsatoPerSomma ?? 0.005
        },
        {
          id: 'v_cf',
          simbolo: 'CF',
          descrizione: 'Cloroformio (µg/L)',
          valore: calc.composti[1]?.valoreUsatoPerSomma ?? 0.005
        },
        {
          id: 'v_bdcm',
          simbolo: 'BDCM',
          descrizione: 'Bromodiclorometano (µg/L)',
          valore: calc.composti[2]?.valoreUsatoPerSomma ?? 0.005
        },
        {
          id: 'v_dbcm',
          simbolo: 'DBCM',
          descrizione: 'Dibromoclorometano (µg/L)',
          valore: calc.composti[3]?.valoreUsatoPerSomma ?? 0.005
        }
      ];

  return {
    ...currentResults,
    [sommaProva.id]: {
      ...existingSomma,
      provaId: sommaProva.id,
      valoreRilevato: calc.sommaConcentrazioneFormatted,
      incertezza: calc.sommaIncertezzaFormatted,
      incertezzaPercentuale: '',
      quadernoCalcolo: {
        formula: sommaProva.formulaCalcolo || 'BF + CF + BDCM + DBCM',
        tipoCalcolo: 'idrocarburi_totali',
        noteStrumento: calc.dettaglioCalcoloText,
        variabili: quadVariables
      }
    }
  };
}

