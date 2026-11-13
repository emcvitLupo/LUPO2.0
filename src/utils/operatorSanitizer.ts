import { Operator } from '../types';

export function sanitizeOperator(op: Operator): Operator {
  const nomeLower = (op.nome || '').toLowerCase();
  const isCarmine = nomeLower.includes('carmine') && (nomeLower.includes('marroccella') || nomeLower.includes('esposito'));
  const isAngela = nomeLower.includes('angela') && nomeLower.includes('simone');

  let cleanRuolo = (op.ruolo || '').trim();
  let cleanRuoloFirma = (op.ruoloFirma || '').trim();
  let isTec = op.isResponsabileTecnico || false;
  let isRep = op.isResponsabileReparto || false;
  let autorizzatoFirma = op.autorizzatoFirma !== false;

  // 1. Correzione Carmine: Deve essere Responsabile Tecnico (mai Responsabile Amministrativo)
  if (isCarmine) {
    if (!cleanRuolo || cleanRuolo.toLowerCase().includes('amministrativ') || cleanRuolo.toUpperCase() === 'AM') {
      cleanRuolo = 'Responsabile Tecnico';
    }
    if (!cleanRuoloFirma || cleanRuoloFirma.toLowerCase().includes('amministrativ')) {
      cleanRuoloFirma = 'Responsabile Tecnico';
    }
    isTec = true;
    isRep = false;
    autorizzatoFirma = true;
  }

  // 2. Correzione Angela De Simone: Ruolo e qualifica di firma Responsabile di Reparto
  if (isAngela) {
    if (!cleanRuolo || cleanRuolo.toLowerCase().includes('reparto') || cleanRuolo.toLowerCase().includes('tecnico')) {
      cleanRuolo = 'Responsabile di Reparto';
    }
    // Se aveva duplicati o era stato aggiunto erroneamente Responsabile Tecnico
    if (cleanRuoloFirma.toLowerCase().includes('tecnico')) {
      const tokens = cleanRuoloFirma.split(/&|\+/).map(t => t.trim()).filter(Boolean);
      const withoutTec = tokens.filter(t => !t.toLowerCase().includes('tecnico'));
      cleanRuoloFirma = withoutTec.length > 0 ? Array.from(new Set(withoutTec)).join(' & ') : 'Responsabile di Reparto';
      isTec = false;
      isRep = true;
    }
  }

  // 3. Deduplicazione e pulizia universale per ruoloFirma
  if (cleanRuoloFirma) {
    const rawTokens = cleanRuoloFirma
      .split(/&|\+/)
      .map(t => t.trim())
      .filter(Boolean);
    
    // Deduplica mantenendo l'ordine
    const uniqueTokens = Array.from(new Set(rawTokens));
    cleanRuoloFirma = uniqueTokens.join(' & ');

    // Sincronizza i flag booleani
    isTec = uniqueTokens.some(t => t.toLowerCase().includes('tecnico'));
    isRep = uniqueTokens.some(t => t.toLowerCase().includes('reparto'));
  } else if (autorizzatoFirma) {
    // Se autorizzato alla firma ma stringa vuota, ricava dal ruolo principale se applicabile
    if (cleanRuolo && (cleanRuolo.toLowerCase().includes('tecnico') || cleanRuolo.toLowerCase().includes('reparto'))) {
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
    ruolo: cleanRuolo || 'Operatore di Laboratorio',
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
