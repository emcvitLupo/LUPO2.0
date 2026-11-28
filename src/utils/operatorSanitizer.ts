import { Operator } from '../types';

const CANONICAL_QUALIFICATIONS: Record<string, string> = {
  'responsabile tecnico': 'Responsabile Tecnico',
  'resp. tecnico': 'Responsabile Tecnico',
  'resp tecnico': 'Responsabile Tecnico',
  'rt': 'Responsabile Tecnico',
  'vice responsabile tecnico': 'Vice Responsabile Tecnico',
  'v.ce responsabile tecnico': 'Vice Responsabile Tecnico',
  'vce responsabile tecnico': 'Vice Responsabile Tecnico',
  'vrt': 'Vice Responsabile Tecnico',
  'responsabile di reparto': 'Responsabile di Reparto',
  'resp. di reparto': 'Responsabile di Reparto',
  'resp di reparto': 'Responsabile di Reparto',
  'responsabile reparto': 'Responsabile di Reparto',
  'responsabile amministrativo': 'Responsabile Amministrativo',
  'resp. amministrativo': 'Responsabile Amministrativo',
  'resp amministrativo': 'Responsabile Amministrativo',
  'amministrazione': 'Responsabile Amministrativo',
  'am': 'Responsabile Amministrativo',
  'chimico senior': 'Chimico Senior',
  'tecnico chimico': 'Tecnico Chimico',
  'tecnico microbiologo': 'Tecnico Microbiologo',
  'operatore tecnico': 'Operatore Tecnico',
  'addetto accettazione': 'Addetto Accettazione'
};

export function normalizeQualificationLabel(label: string): string {
  const trimmed = (label || '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  if (/^v\.?ce\s+responsabile\s+tecnico$/i.test(trimmed)) {
    return 'Vice Responsabile Tecnico';
  }
  const lower = trimmed.toLowerCase();
  if (CANONICAL_QUALIFICATIONS[lower]) {
    return CANONICAL_QUALIFICATIONS[lower];
  }
  return trimmed;
}

/**
 * Scompone eventuali stringhe composte (separate da &, +, / o virgola),
 * normalizza ogni qualifica e rimuove tutti i duplicati (case-insensitive).
 */
export function deduplicateRoleLabels(labels: string[]): string[] {
  if (!Array.isArray(labels)) return [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of labels) {
    if (!raw || typeof raw !== 'string') continue;
    const parts = raw.split(/&|\+|\//);
    for (const part of parts) {
      const norm = normalizeQualificationLabel(part);
      if (!norm) continue;
      const key = norm.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(norm);
      }
    }
  }
  return result;
}

export function sanitizeOperator(op: Operator): Operator {
  const cleanNome = (op.nome || '').replace(/\s+/g, ' ').trim();
  const nomeLower = cleanNome.toLowerCase();
  const isCarmine = nomeLower.includes('carmine') && (nomeLower.includes('marroccella') || nomeLower.includes('esposito'));

  // Se il ruolo principale contiene più ruoli concatenati (es. "Responsabile Tecnico & Responsabile di Reparto"),
  // estraiamo i singoli ruoli deduplicati: il primo resta come ruolo principale, gli eventuali altri confluiscono in ruoloFirma.
  const roleParts = deduplicateRoleLabels([op.ruolo || '']);
  let cleanRuolo = roleParts[0] || '';
  const extraSignatoryFromRole = roleParts.slice(1).filter(r =>
    r.toLowerCase().includes('tecnico') ||
    r.toLowerCase().includes('reparto') ||
    r.toLowerCase().includes('amministrativ')
  );

  let cleanRuoloFirma = (op.ruoloFirma || '').trim();
  let isTec = op.isResponsabileTecnico || false;
  let isRep = op.isResponsabileReparto || false;
  let autorizzatoFirma = op.autorizzatoFirma !== false;

  // Correzione legacy solo se Carmine aveva il codice grezzo 'AM' non intenzionale
  if (isCarmine && (!op.ruolo || op.ruolo.trim().toUpperCase() === 'AM')) {
    cleanRuolo = 'Responsabile Tecnico';
  }

  // Deduplicazione e normalizzazione universale per ruoloFirma (case-insensitive)
  if (cleanRuoloFirma || extraSignatoryFromRole.length > 0) {
    const uniqueTokens = deduplicateRoleLabels([
      ...(cleanRuoloFirma ? [cleanRuoloFirma] : []),
      ...extraSignatoryFromRole
    ]);
    cleanRuoloFirma = uniqueTokens.join(' & ');

    // Sincronizza i flag booleani dalle qualifiche effettive
    isTec = uniqueTokens.some(t => t.toLowerCase().includes('tecnico'));
    isRep = uniqueTokens.some(t => t.toLowerCase().includes('reparto'));
  } else if (autorizzatoFirma) {
    // Se autorizzato alla firma ma ruoloFirma è vuoto, allinea automaticamente dal ruolo principale
    if (
      cleanRuolo &&
      (cleanRuolo.toLowerCase().includes('tecnico') ||
        cleanRuolo.toLowerCase().includes('reparto') ||
        cleanRuolo.toLowerCase().includes('amministrativ'))
    ) {
      cleanRuoloFirma = cleanRuolo;
      isTec = cleanRuolo.toLowerCase().includes('tecnico');
      isRep = cleanRuolo.toLowerCase().includes('reparto');
    } else {
      cleanRuoloFirma = 'Responsabile di Reparto';
      isRep = true;
    }
  }

  const cleanAree = Array.isArray(op.areeCompetenza)
    ? Array.from(new Set(op.areeCompetenza.filter(Boolean)))
    : undefined;

  return {
    ...op,
    nome: cleanNome || op.nome,
    attivo: op.attivo !== false,
    ruolo: cleanRuolo || 'Operatore Tecnico',
    ruoloFirma: autorizzatoFirma ? cleanRuoloFirma : undefined,
    isResponsabileTecnico: autorizzatoFirma ? isTec : false,
    isResponsabileReparto: autorizzatoFirma ? isRep : false,
    autorizzatoFirma,
    ...(cleanAree ? { areeCompetenza: cleanAree } : {})
  };
}

/**
 * Chiave canonica per identificare lo stesso operatore anche in presenza di variazioni di spaziatura,
 * maiuscole/minuscole o prefissi onorifici (es. "Dott. Mario Rossi" vs "dott mario rossi").
 */
export function getCanonicalOperatorKey(nome: string): string {
  return (nome || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeOperatorsList(operators: Operator[]): Operator[] {
  if (!Array.isArray(operators)) return [];
  const sanitizedAll = operators
    .filter(op => op && typeof op.nome === 'string' && op.nome.trim() !== '')
    .map(sanitizeOperator);

  const byKey = new Map<string, Operator>();

  for (const op of sanitizedAll) {
    const key = getCanonicalOperatorKey(op.nome);
    if (!key) continue;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, op);
    } else {
      // Unisce i due record duplicati preservando tutte le informazioni più complete
      const mergedSigTokens = deduplicateRoleLabels([
        existing.ruoloFirma || '',
        op.ruoloFirma || ''
      ]);
      const mergedAree = Array.from(
        new Set([...(existing.areeCompetenza || []), ...(op.areeCompetenza || [])].filter(Boolean))
      );
      const preferNewPassword =
        (op.password || '').startsWith('lims_h1:') ||
        !(existing.password || '').trim() ||
        ((op.password || '').trim() && !(existing.password || '').startsWith('lims_h1:'));

      const hasUpper = (s: string) => /[A-Z]/.test(s);
      const preferredNome =
        hasUpper(existing.nome) && !hasUpper(op.nome)
          ? existing.nome
          : op.nome || existing.nome;

      const merged: Operator = sanitizeOperator({
        ...existing,
        ...op,
        nome: preferredNome,
        ruolo: op.ruolo || existing.ruolo,
        password: preferNewPassword ? op.password : existing.password,
        email: op.email || existing.email,
        attivo: op.attivo !== false && existing.attivo !== false,
        autorizzatoFirma: op.autorizzatoFirma !== false || existing.autorizzatoFirma !== false,
        ruoloFirma: mergedSigTokens.join(' & ') || undefined,
        areeCompetenza: mergedAree.length > 0 ? mergedAree : undefined
      });
      byKey.set(key, merged);
    }
  }

  return Array.from(byKey.values());
}

/**
 * Restituisce l'elenco deduplicato e normalizzato di tutte le qualifiche/ruoli
 * associati all'operatore in "Gestione Operatori & Password" (Ruolo principale + Qualifiche di Firma).
 */
export function getOperatorQualificationsList(op?: Operator | null): string[] {
  if (!op) return ['Operatore Tecnico'];
  const rawList: string[] = [];
  if (op.ruolo) {
    op.ruolo.split(/&|\+/).forEach(part => {
      const norm = normalizeQualificationLabel(part);
      if (norm) rawList.push(norm);
    });
  }
  if (op.autorizzatoFirma !== false && op.ruoloFirma) {
    op.ruoloFirma.split(/&|\+/).forEach(part => {
      const norm = normalizeQualificationLabel(part);
      if (norm) rawList.push(norm);
    });
  }
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of rawList) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }
  return unique.length > 0 ? unique : ['Operatore Tecnico'];
}

/**
 * Restituisce l'etichetta omogenea "Qualifica / Ruolo" dell'operatore
 * allineata con "Gestione Operatori & Password".
 */
export function getOperatorQualificationLabel(op?: Operator | null): string {
  return getOperatorQualificationsList(op).join(' & ');
}
