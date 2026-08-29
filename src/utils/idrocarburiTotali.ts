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
  
  // Se inizia con '<' o include 'loq' o 'inferiore' o 'tracce' o 'n.d.' o 'nd'
  if (cleanVal.startsWith('<') || /<|loq|inferiore|tracce|n\.d\.|nd/i.test(cleanVal)) {
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
export const COMPOSTI_IDROCARBURI_TOTALI = [
  {
    key: 'bromoformio',
    nomi: ['bromoformio', 'tribromometano', 'chbr3'],
    nomeStandard: 'Bromoformio',
    defaultLoq: '0.01'
  },
  {
    key: 'cloroformio',
    nomi: ['cloroformio', 'triclorometano', 'chcl3'],
    nomeStandard: 'Cloroformio',
    defaultLoq: '0.01'
  },
  {
    key: 'bromodiclorometano',
    nomi: ['bromodiclorometano', 'diclorobromometano', 'bdcm', 'chbrcl2'],
    nomeStandard: 'Bromodiclorometano',
    defaultLoq: '0.01'
  },
  {
    key: 'dibromoclorometano',
    nomi: ['dibromoclorometano', 'clorodibromometano', 'dbcm', 'chbr2cl'],
    nomeStandard: 'Dibromoclorometano',
    defaultLoq: '0.01'
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

    if (!rawVal) {
      // Non inserito: consideriamo come < LOQ (LOQ / 2) di default
      valUsato = parsedLoq / 2;
      formattedVal = `< ${loqStr} (${(parsedLoq / 2).toFixed(precisionDecimals)})`;
      formattedInc = 'N/D';
      incUsata = 0;
      countBelow++;
    } else if (isBelow) {
      valUsato = parsedLoq / 2;
      formattedVal = rawVal.startsWith('<') ? rawVal : `< ${loqStr}`;
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
      return `${c.nome}: < LOQ (${c.loqStr}) → sommato come LOQ/2 = ${c.valoreUsatoPerSomma.toFixed(precisionDecimals)} | Incertezza: N/D (non riportata)`;
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

  if (
    clean.includes('idrocarburi totali') ||
    clean.includes('idrocarburi tot') ||
    clean.includes('somma trialometani') ||
    clean.includes('trialometani totali') ||
    clean.includes('somma thm') ||
    clean.includes('total trihalomethanes') ||
    clean === 'idrocarburi'
  ) {
    return 'somma_totale';
  }

  for (const c of COMPOSTI_IDROCARBURI_TOTALI) {
    for (const n of c.nomi) {
      if (clean.includes(n)) {
        return c.key as 'bromoformio' | 'cloroformio' | 'bromodiclorometano' | 'dibromoclorometano';
      }
    }
  }

  return null;
}
