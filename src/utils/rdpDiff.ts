import { AccettazioneCampione, RevisioneRDP, RisultatoProva } from '../types';

export interface RdpDiffItem {
  campo: string;
  sezione: 'Dati Campione' | 'Parametri Analitici' | 'Note e Conformità' | 'Firmatari e Date';
  vecchioValore: string;
  nuovoValore: string;
  tipoModifica: 'modificato' | 'aggiunto' | 'rimosso';
}

export interface RdpDiffResult {
  hasChanges: boolean;
  totalChanges: number;
  items: RdpDiffItem[];
  riepilogoTestuale: string;
}

export function computeRdpDiff(
  oldData: Partial<AccettazioneCampione> | RevisioneRDP,
  newData: Partial<AccettazioneCampione>
): RdpDiffResult {
  const items: RdpDiffItem[] = [];

  const safeStr = (v: any) => (v === undefined || v === null ? '' : String(v).trim());

  // 1. Dati Campione
  const campiCampione: Array<{ key: keyof AccettazioneCampione; label: string }> = [
    { key: 'descrizioneCampione', label: 'Descrizione Campione' },
    { key: 'matrice', label: 'Matrice' },
    { key: 'quantitaCampione', label: 'Quantità Campione' },
    { key: 'puntoPrelievo', label: 'Punto di Prelievo' },
    { key: 'comunePrelievo', label: 'Comune di Prelievo' },
    { key: 'dataPrelievo', label: 'Data Prelievo' },
    { key: 'oraPrelievo', label: 'Ora Prelievo' },
    { key: 'campionatoDa', label: 'Campionato Da' },
    { key: 'proceduraCampionamento', label: 'Procedura Campionamento' },
  ];

  campiCampione.forEach(({ key, label }) => {
    const oldVal = safeStr((oldData as any)[key]);
    const newVal = safeStr((newData as any)[key]);
    if (oldVal !== newVal) {
      items.push({
        campo: label,
        sezione: 'Dati Campione',
        vecchioValore: oldVal || '(vuoto)',
        nuovoValore: newVal || '(vuoto)',
        tipoModifica: !oldVal ? 'aggiunto' : !newVal ? 'rimosso' : 'modificato',
      });
    }
  });

  // 2. Firmatari e Date
  const campiDate: Array<{ key: keyof AccettazioneCampione; label: string }> = [
    { key: 'dataInizioProva', label: 'Data Inizio Prova' },
    { key: 'dataTermineProva', label: 'Data Termine Prova' },
    { key: 'firmatarioTecnico', label: 'Firmatario Tecnico' },
    { key: 'ruoloFirmatarioTecnico', label: 'Ruolo Firmatario Tecnico' },
    { key: 'firmatarioReparto1', label: 'Firmatario Reparto 1' },
    { key: 'firmatarioReparto2', label: 'Firmatario Reparto 2' },
  ];

  campiDate.forEach(({ key, label }) => {
    const oldVal = safeStr((oldData as any)[key]);
    const newVal = safeStr((newData as any)[key]);
    if (oldVal !== newVal) {
      items.push({
        campo: label,
        sezione: 'Firmatari e Date',
        vecchioValore: oldVal || '(vuoto)',
        nuovoValore: newVal || '(vuoto)',
        tipoModifica: !oldVal ? 'aggiunto' : !newVal ? 'rimosso' : 'modificato',
      });
    }
  });

  // 3. Parametri Analitici
  const oldResults: RisultatoProva[] = (oldData as any).risultatiAnalisi || [];
  const newResults: RisultatoProva[] = newData.risultatiAnalisi || [];

  const getResultKey = (r: RisultatoProva) => (r as any).nomeProva || r.provaId;
  const getResultName = (r: RisultatoProva) => (r as any).nomeProva || `Prova ${r.provaId}`;

  const oldMap = new Map<string, RisultatoProva>();
  oldResults.forEach(r => oldMap.set(getResultKey(r), r));

  const newMap = new Map<string, RisultatoProva>();
  newResults.forEach(r => newMap.set(getResultKey(r), r));

  // Check new & modified
  newResults.forEach(newR => {
    const key = getResultKey(newR);
    const name = getResultName(newR);
    const oldR = oldMap.get(key);

    const oldVal = safeStr((oldR as any)?.valoreRilevato ?? (oldR as any)?.valore);
    const newVal = safeStr((newR as any)?.valoreRilevato ?? (newR as any)?.valore);

    if (!oldR) {
      items.push({
        campo: `Prova: ${name}`,
        sezione: 'Parametri Analitici',
        vecchioValore: '(non presente)',
        nuovoValore: `${newVal} ${safeStr(newR.unitaMisura)}`,
        tipoModifica: 'aggiunto',
      });
    } else {
      // Check difference in valore
      if (oldVal !== newVal) {
        items.push({
          campo: `${name} - Valore Risultato`,
          sezione: 'Parametri Analitici',
          vecchioValore: oldVal || '(vuoto)',
          nuovoValore: newVal || '(vuoto)',
          tipoModifica: 'modificato',
        });
      }
      // Check difference in incertezza
      if (safeStr(oldR.incertezza) !== safeStr(newR.incertezza)) {
        items.push({
          campo: `${name} - Incertezza (U)`,
          sezione: 'Parametri Analitici',
          vecchioValore: safeStr(oldR.incertezza) || '(nessuna)',
          nuovoValore: safeStr(newR.incertezza) || '(nessuna)',
          tipoModifica: 'modificato',
        });
      }
      // Check difference in limite / conformità
      if (safeStr(oldR.conforme) !== safeStr(newR.conforme)) {
        items.push({
          campo: `${name} - Giudizio Conformità`,
          sezione: 'Parametri Analitici',
          vecchioValore: safeStr(oldR.conforme) || '(non espresso)',
          nuovoValore: safeStr(newR.conforme) || '(non espresso)',
          tipoModifica: 'modificato',
        });
      }
    }
  });

  // Check removed
  oldResults.forEach(oldR => {
    const key = getResultKey(oldR);
    const name = getResultName(oldR);
    const oldVal = safeStr((oldR as any)?.valoreRilevato ?? (oldR as any)?.valore);
    if (!newMap.has(key)) {
      items.push({
        campo: `Prova: ${name}`,
        sezione: 'Parametri Analitici',
        vecchioValore: `${oldVal} ${safeStr(oldR.unitaMisura)}`,
        nuovoValore: '(rimossa)',
        tipoModifica: 'rimosso',
      });
    }
  });

  // 4. Note e Conformità
  const campiNote: Array<{ key: keyof AccettazioneCampione; label: string }> = [
    { key: 'dichiarazioneConformita', label: 'Dichiarazione di Conformità' },
    { key: 'opinioniInterpretazioni', label: 'Opinioni e Interpretazioni' },
    { key: 'nota1', label: 'Note in Calce (Nota 1)' },
    { key: 'nota2', label: 'Note Addizionali (Nota 2)' },
  ];

  campiNote.forEach(({ key, label }) => {
    const oldVal = safeStr((oldData as any)[key]);
    const newVal = safeStr((newData as any)[key]);
    if (oldVal !== newVal) {
      items.push({
        campo: label,
        sezione: 'Note e Conformità',
        vecchioValore: oldVal || '(vuoto)',
        nuovoValore: newVal || '(vuoto)',
        tipoModifica: !oldVal ? 'aggiunto' : !newVal ? 'rimosso' : 'modificato',
      });
    }
  });

  const totalChanges = items.length;
  let riepilogoTestuale = '';
  if (totalChanges === 0) {
    riepilogoTestuale = 'Nessuna variazione rilevata rispetto alla versione precedente.';
  } else {
    const paramModificati = items.filter(i => i.sezione === 'Parametri Analitici').length;
    const datiModificati = items.filter(i => i.sezione === 'Dati Campione' || i.sezione === 'Firmatari e Date').length;
    const noteModificate = items.filter(i => i.sezione === 'Note e Conformità').length;
    const parts: string[] = [];
    if (paramModificati > 0) parts.push(`${paramModificati} parametro/i analitico/i`);
    if (datiModificati > 0) parts.push(`${datiModificati} dato/i anagrafico/i`);
    if (noteModificate > 0) parts.push(`${noteModificate} nota/giudizio`);
    riepilogoTestuale = `Rilevate ${totalChanges} modifiche: ${parts.join(', ')}.`;
  }

  return {
    hasChanges: totalChanges > 0,
    totalChanges,
    items,
    riepilogoTestuale,
  };
}
