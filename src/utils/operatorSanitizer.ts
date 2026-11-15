import { Operator } from '../types';

export function normalizeQualificationLabel(label: string): string {
  const trimmed = (label || '').trim();
  if (!trimmed) return '';
  if (/^v\.?ce\s+responsabile\s+tecnico$/i.test(trimmed)) {
    return 'Vice Responsabile Tecnico';
  }
  if (trimmed.toUpperCase() === 'AM') {
    return 'Responsabile Amministrativo';
  }
  return trimmed;
}

export function sanitizeOperator(op: Operator): Operator {
  const nomeLower = (op.nome || '').toLowerCase();
  const isCarmine = nomeLower.includes('carmine') && (nomeLower.includes('marroccella') || nomeLower.includes('esposito'));

  let cleanRuolo = normalizeQualificationLabel(op.ruolo || '');
  let cleanRuoloFirma = (op.ruoloFirma || '').trim();
  let isTec = op.isResponsabileTecnico || false;
  let isRep = op.isResponsabileReparto || false;
  let autorizzatoFirma = op.autorizzatoFirma !== false;

  // Correzione legacy solo se Carmine aveva il codice grezzo 'AM' non intenzionale
  if (isCarmine && (!op.ruolo || op.ruolo.trim().toUpperCase() === 'AM')) {
    cleanRuolo = 'Responsabile Tecnico';
  }

  // Deduplicazione e normalizzazione universale per ruoloFirma (case-insensitive)
  if (cleanRuoloFirma) {
    const rawTokens = cleanRuoloFirma
      .split(/&|\+/)
      .map(t => normalizeQualificationLabel(t))
      .filter(Boolean);

    const seen = new Set<string>();
    const uniqueTokens: string[] = [];
    for (const token of rawTokens) {
      const key = token.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueTokens.push(token);
      }
    }
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

  return {
    ...op,
    attivo: op.attivo !== false,
    ruolo: cleanRuolo || 'Operatore Tecnico',
    ruoloFirma: autorizzatoFirma ? cleanRuoloFirma : undefined,
    isResponsabileTecnico: autorizzatoFirma ? isTec : false,
    isResponsabileReparto: autorizzatoFirma ? isRep : false,
    autorizzatoFirma
  };
}

export function sanitizeOperatorsList(operators: Operator[]): Operator[] {
  if (!Array.isArray(operators)) return [];
  return operators.map(sanitizeOperator);
}
