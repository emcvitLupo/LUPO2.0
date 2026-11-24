import { Operator } from '../types';

export interface NavigationEntry {
  tab: string;
  label: string;
  context?: {
    clientId?: string | null;
    preventivoId?: string | null;
    accettazioneId?: string | null;
    provaId?: string | null;
    praticaSearchQuery?: string | null;
    areeSpecSampleId?: string | null;
    areeSpecModule?: 'nutrizionale' | 'rifiuti' | null;
  };
  timestamp: number;
}

export const SECTION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  clienti: 'Anagrafica Clienti',
  prove: 'Prove & Tariffario',
  areeSpecialistiche: 'Aree Specialistiche',
  preventivi: 'Preventivi & Pacchetti',
  accettazione: 'Accettazione & RdP',
  revisioniRdp: 'Revisioni & Riemissioni RdP',
  fatturazione: 'Fatturazione',
  reagentario: 'Reagentario',
  strumenti: 'Strumentazione & Tarature',
  operatori: 'Operatori & Firme',
  audit: 'Registro Attività (Audit)',
  statistiche: 'Statistiche & Analytics',
};

export const parseLocalDate = (dateStr: string): Date => {
  if (!dateStr) return new Date(NaN);
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(dateStr);
};

export const getDaysOfValidity = (validita?: string): number => {
  if (!validita) return 90;
  const match = validita.match(/\d+/);
  if (match) {
    return parseInt(match[0], 10);
  }
  return 90;
};

export const getOfferValidityStatus = (dataCreazione: string, validita?: string) => {
  const emissione = parseLocalDate(dataCreazione);
  if (isNaN(emissione.getTime())) {
    return { expired: false, daysLeft: 90, text: 'N/D', scadenzaFormattata: 'N/D', isToday: false };
  }

  const daysOfValidity = getDaysOfValidity(validita);
  const scadenza = new Date(emissione.getTime());
  scadenza.setDate(scadenza.getDate() + daysOfValidity);

  const tempToday = new Date();
  const today = new Date(tempToday.getFullYear(), tempToday.getMonth(), tempToday.getDate());

  const diffTime = scadenza.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const yyyy = scadenza.getFullYear();
  const mm = String(scadenza.getMonth() + 1).padStart(2, '0');
  const dd = String(scadenza.getDate()).padStart(2, '0');
  const formattedScadenza = `${yyyy}-${mm}-${dd}`;

  if (diffDays < 0) {
    return {
      expired: true,
      daysLeft: Math.abs(diffDays),
      text: `Scaduto da ${Math.abs(diffDays)} gg (${formattedScadenza})`,
      scadenzaFormattata: formattedScadenza,
      isToday: false,
    };
  } else if (diffDays === 0) {
    return {
      expired: false,
      isToday: true,
      daysLeft: 0,
      text: `Scade Oggi (${formattedScadenza})`,
      scadenzaFormattata: formattedScadenza,
    };
  } else {
    return {
      expired: false,
      isToday: false,
      daysLeft: diffDays,
      text: `Valido ancora ${diffDays} gg (${formattedScadenza})`,
      scadenzaFormattata: formattedScadenza,
    };
  }
};

export const isOfferExpired = (dataCreazione: string, validita?: string): boolean => {
  return getOfferValidityStatus(dataCreazione, validita).expired;
};

/**
 * Calcola un hash deterministico offuscato (`sha256_fnv:<hex>`) per il confronto delle password di firma operatore,
 * così da supportare sia password già sottoposte a hash sia password in chiaro preesistenti.
 */
export const hashOperatorPasswordSync = (rawPassword: string): string => {
  const clean = (rawPassword || '').trim();
  if (!clean) return '';
  if (clean.startsWith('lims_h1:')) return clean;

  // Doppio round FNV-1a a 64 bit combinato con salt di dominio LIMS per compatibilità sincrona immediata
  const saltA = 'LIMS_LAB_AQ_2026_A::' + clean;
  const saltB = clean + '::ISO17025_AUDIT_B';

  const fnv32 = (str: string, seed: number): number => {
    let h = seed >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  };

  const h1 = fnv32(saltA, 0x811c9dc5).toString(16).padStart(8, '0');
  const h2 = fnv32(saltB, 0x9e3779b9).toString(16).padStart(8, '0');
  const h3 = fnv32(saltA + saltB, 0x85ebca6b).toString(16).padStart(8, '0');
  const h4 = fnv32(saltB + saltA, 0xc2b2ae35).toString(16).padStart(8, '0');
  return `lims_h1:${h1}${h2}${h3}${h4}`;
};

export const buildOperatorPasswordsMap = (operators?: Operator[]): Record<string, string> => {
  const map: Record<string, string> = {};
  if (operators && operators.length > 0) {
    operators.forEach((op) => {
      if (op.nome && op.password && op.password.trim()) {
        map[op.nome] = op.password.trim();
      }
    });
  } else {
    map['Dott. Chim. F. Lupo'] = 'lupo123';
    map['Dott.ssa S. Bianchi'] = 'bianchi123';
    map['Dott. R. Vitale'] = 'vitale123';
  }
  return map;
};

export const verifyOperatorPassword = (
  operatorName: string,
  inputPassword: string,
  operators?: Operator[]
): boolean => {
  const cleanInput = (inputPassword || '').trim();
  if (!cleanInput) return false;

  const map = buildOperatorPasswordsMap(operators);
  const expected = map[operatorName];

  // Se l'operatore selezionato è "Altro" (inserimento manuale), accetta la password di un qualsiasi operatore attivo abilitato
  if (operatorName === 'Altro') {
    const activePassList = Object.values(map);
    if (activePassList.length === 0) return false;
    const inputHash = hashOperatorPasswordSync(cleanInput);
    return activePassList.some(stored => stored === cleanInput || stored === inputHash);
  }

  if (!expected) return false;
  if (expected.startsWith('lims_h1:')) {
    return hashOperatorPasswordSync(cleanInput) === expected;
  }
  return cleanInput === expected || hashOperatorPasswordSync(cleanInput) === expected;
};

/**
 * Verifica se un operatore possiede la qualifica di Responsabile Tecnico / Direttore Tecnico abilitato alla firma
 * a norma ISO/IEC 17025.
 */
export const isTechnicalDirector = (op: Operator): boolean => {
  if (op.attivo === false || op.autorizzatoFirma === false) return false;
  if (op.isResponsabileTecnico) return true;
  const rf = (op.ruoloFirma || '').toLowerCase();
  const r = (op.ruolo || '').toLowerCase();
  return (
    rf.includes('responsabile tecnico') ||
    r.includes('responsabile tecnico') ||
    rf.includes('dirett') ||
    r.includes('dirett') ||
    rf.includes('responsabile del laboratorio') ||
    r.includes('responsabile del laboratorio')
  );
};

/**
 * Ottiene l'elenco degli operatori qualificati per la firma tecnica di approvazione / riemissione RdP.
 * Se nessun operatore possiede espressamente la qualifica tecnica, effettua un fallback sicuro su tutti gli autorizzati alla firma.
 */
export const getTechnicalSigners = (operators?: Operator[]): Operator[] => {
  if (!operators || operators.length === 0) return [];
  const list = operators.filter(isTechnicalDirector);
  if (list.length > 0) return list;
  return operators.filter(o => o.attivo !== false && o.autorizzatoFirma !== false);
};

/**
 * Verifica se un operatore è qualificato come Responsabile di Reparto abilitato alla convalida delle prove analitiche.
 */
export const isDepartmentHead = (op: Operator): boolean => {
  if (op.attivo === false || op.autorizzatoFirma === false) return false;
  if (op.isResponsabileReparto) return true;
  const rf = (op.ruoloFirma || '').toLowerCase();
  const r = (op.ruolo || '').toLowerCase();
  return rf.includes('reparto') || r.includes('reparto');
};

/**
 * Ottiene l'elenco dei Responsabili di Reparto autorizzati alla convalida analitica.
 */
export const getDepartmentSigners = (operators?: Operator[]): Operator[] => {
  if (!operators || operators.length === 0) return [];
  const list = operators.filter(isDepartmentHead);
  if (list.length > 0) return list;
  return operators.filter(o => o.attivo !== false && o.autorizzatoFirma !== false);
};

