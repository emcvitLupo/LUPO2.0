import React, { useState } from 'react';
import { AccettazioneCampione, Client, Preventivo, Prova, Pacchetto, RisultatoProva, Operator } from '../types';
import { 
  Building, 
  CreditCard, 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Trash2, 
  Pencil, 
  Calendar, 
  Thermometer, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Tag, 
  Info,
  X,
  FileText,
  Printer,
  Edit3,
  Save,
  Check,
  Award,
  AlertCircle,
  Calculator,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Helper per l'interpolazione lineare dell'incertezza sulla base di punti di taratura (Richiesta Utente)
export function calculateInterpolatedUncertainty(valoreStr: string, punti: Array<{ concentrazione: number; incertezza: number }> | undefined): string | null {
  if (!punti || punti.length === 0 || !valoreStr) return null;
  
  const cleaned = valoreStr.replace(',', '.');
  const numericMatch = cleaned.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (!numericMatch) return null;
  
  const value = parseFloat(numericMatch[0]);
  if (isNaN(value)) return null;

  if (punti.length === 1) {
    return `± ${punti[0].incertezza}`;
  }

  // Ordina i punti per concentrazione
  const sortedPunti = [...punti].sort((a, b) => a.concentrazione - b.concentrazione);

  // Se inferiore o uguale alla concentrazione minima
  if (value <= sortedPunti[0].concentrazione) {
    return `± ${sortedPunti[0].incertezza}`;
  }

  // Se superiore o uguale alla concentrazione massima
  if (value >= sortedPunti[sortedPunti.length - 1].concentrazione) {
    return `± ${sortedPunti[sortedPunti.length - 1].incertezza}`;
  }

  // Interpolazione lineare
  for (let i = 0; i < sortedPunti.length - 1; i++) {
    const p1 = sortedPunti[i];
    const p2 = sortedPunti[i + 1];
    if (value >= p1.concentrazione && value <= p2.concentrazione) {
      if (p2.concentrazione === p1.concentrazione) {
        return `± ${p1.incertezza}`;
      }
      const t = (value - p1.concentrazione) / (p2.concentrazione - p1.concentrazione);
      const incertezzaInterp = p1.incertezza + t * (p2.incertezza - p1.incertezza);
      
      const fraction = numericMatch[0].split('.')[1] || '';
      const decimals = Math.max(fraction.length, 2);
      return `± ${incertezzaInterp.toFixed(decimals)}`;
    }
  }

  return `± ${sortedPunti[0].incertezza}`;
}

// Helper per l'interpolazione lineare della ripetibilità sulla base di punti di taratura (Richiesta Utente)
export function calculateInterpolatedRepeatability(valoreStr: string, punti: Array<{ concentrazione: number; ripetibilita: number }> | undefined): string | null {
  if (!punti || punti.length === 0 || !valoreStr) return null;
  
  const cleaned = valoreStr.replace(',', '.');
  const numericMatch = cleaned.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (!numericMatch) return null;
  
  const value = parseFloat(numericMatch[0]);
  if (isNaN(value)) return null;

  if (punti.length === 1) {
    return `± ${punti[0].ripetibilita}`;
  }

  // Ordina i punti per concentrazione
  const sortedPunti = [...punti].sort((a, b) => a.concentrazione - b.concentrazione);

  // Se inferiore o uguale alla concentrazione minima
  if (value <= sortedPunti[0].concentrazione) {
    return `± ${sortedPunti[0].ripetibilita}`;
  }

  // Se superiore o uguale alla concentrazione massima
  if (value >= sortedPunti[sortedPunti.length - 1].concentrazione) {
    return `± ${sortedPunti[sortedPunti.length - 1].ripetibilita}`;
  }

  // Interpolazione lineare
  for (let i = 0; i < sortedPunti.length - 1; i++) {
    const p1 = sortedPunti[i];
    const p2 = sortedPunti[i + 1];
    if (value >= p1.concentrazione && value <= p2.concentrazione) {
      if (p2.concentrazione === p1.concentrazione) {
        return `± ${p1.ripetibilita}`;
      }
      const t = (value - p1.concentrazione) / (p2.concentrazione - p1.concentrazione);
      const ripetibilitaInterp = p1.ripetibilita + t * (p2.ripetibilita - p1.ripetibilita);
      
      const fraction = numericMatch[0].split('.')[1] || '';
      const decimals = Math.max(fraction.length, 2);
      return `± ${ripetibilitaInterp.toFixed(decimals)}`;
    }
  }

  return `± ${sortedPunti[0].ripetibilita}`;
}

// Helper to automatically convert/format a value lower than the LOQ to "< [LOQ_VAL]"
export function checkIfValueBelowLOQ(valStr: string, loqStr?: string): string {
  if (!valStr || !loqStr) return valStr;

  const valClean = valStr.trim().replace(',', '.');
  const loqClean = loqStr.trim().replace(',', '.');

  // Extract first floating-point or integer number from both
  const valMatch = valClean.match(/[-+]?[0-9]*\.?[0-9]+/);
  const loqMatch = loqClean.match(/[-+]?[0-9]*\.?[0-9]+/);

  if (valMatch && loqMatch) {
    const valNum = parseFloat(valMatch[0]);
    const loqNum = parseFloat(loqMatch[0]);

    if (!isNaN(valNum) && !isNaN(loqNum)) {
      if (valNum < loqNum) {
        return `< ${loqStr.trim()}`;
      }
    }
  }
  return valStr;
}

interface AccettazioneSectionProps {
  accettazioni: AccettazioneCampione[];
  clients: Client[];
  preventivi: Preventivo[];
  prove: Prova[];
  pacchetti: Pacchetto[];
  onAddAccettazione: (newAcc: AccettazioneCampione) => void;
  onDeleteAccettazione: (id: string) => void;
  onUpdateAccettazione: (updatedAcc: AccettazioneCampione) => void;
  operators?: Operator[];
}

export function AccettazioneSection({
  accettazioni,
  clients,
  preventivi,
  prove,
  pacchetti,
  onAddAccettazione,
  onDeleteAccettazione,
  onUpdateAccettazione,
  operators
 }: AccettazioneSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMatrice, setSelectedMatrice] = useState<string>('Tutte');
  const [showForm, setShowForm] = useState(false);
  const [editingAcc, setEditingAcc] = useState<AccettazioneCampione | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Stati per la gestione risultati e certificati (Richiesta Utente)
  const [editingResultsAccId, setEditingResultsAccId] = useState<string | null>(null);
  const [tempRisultati, setTempRisultati] = useState<Record<string, Partial<RisultatoProva>>>({});
  const [previewReportAcc, setPreviewReportAcc] = useState<AccettazioneCampione | null>(null);
  const [activeCalcRowId, setActiveCalcRowId] = useState<string | null>(null);
  const [coverageFactor, setCoverageFactor] = useState<number>(2);

  // Form Field States
  const [descrizione, setDescrizione] = useState('');
  const [matrice, setMatrice] = useState('Oli e Grassi');
  const [customMatrice, setCustomMatrice] = useState('');
  const [quantita, setQuantita] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [statoInArrivo, setStatoInArrivo] = useState<'Idoneo' | 'Non Idoneo' | 'Accettato con Riserva'>('Idoneo');
  const [intestatarioId, setIntestatarioId] = useState('');
  const [destinatarioFatturaId, setDestinatarioFatturaId] = useState('');
  const [copiaFattura, setCopiaFattura] = useState(true);
  const [preventivoId, setPreventivoId] = useState('');
  const [consegna, setConsegna] = useState('');
  const [note, setNote] = useState('');
  const [statoAnalisi, setStatoAnalisi] = useState<'In Attesa' | 'In Corso' | 'Completato' | 'Annullato'>('In Attesa');
  const [operator, setOperator] = useState<string>(() => {
    return operators && operators.length > 0 ? operators[0].nome : 'Dott. Chim. F. Lupo';
  });
  const [formOperatorPassword, setFormOperatorPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // States per Tracciabilità Cambio Stato Rapid Campione
  const [tracingAccId, setTracingAccId] = useState<string | null>(null);
  const [tracingAccField, setTracingAccField] = useState<'analisiStato' | 'statoInArrivo' | null>(null);
  const [tracingSelectedAccStatus, setTracingSelectedAccStatus] = useState<string>('');
  const [tracingAccOperator, setTracingAccOperator] = useState<string>(() => {
    return operators && operators.length > 0 ? operators[0].nome : 'Dott. Chim. F. Lupo';
  });
  const [tracingAccCustomOperator, setTracingAccCustomOperator] = useState<string>('');
  const [tracingAccPassword, setTracingAccPassword] = useState<string>('');
  const [tracingAccError, setTracingAccError] = useState<string | null>(null);

  // Mappa delle password degli operatori del laboratorio (dinamica o fallback)
  const OPERATOR_PASSWORDS: Record<string, string> = {};
  if (operators && operators.length > 0) {
    operators.forEach(op => {
      OPERATOR_PASSWORDS[op.nome] = op.password;
    });
  } else {
    OPERATOR_PASSWORDS['Dott. Chim. F. Lupo'] = 'lupo123';
    OPERATOR_PASSWORDS['Dott.ssa S. Bianchi'] = 'bianchi123';
    OPERATOR_PASSWORDS['Dott. R. Vitale'] = 'vitale123';
  }
  OPERATOR_PASSWORDS['Altro'] = 'lims123';

  // Nuovi stati richiesti per il Rapporto di Prova LIMS
  const [categoriaMerceologica, setCategoriaMerceologica] = useState('');
  const [informazioniCliente, setInformazioniCliente] = useState('');
  const [destinatarioFinale, setDestinatarioFinale] = useState('');
  const [etichettaCampione, setEtichettaCampione] = useState('');
  const [imballaggio, setImballaggio] = useState('');
  const [campionatoDa, setCampionatoDa] = useState('');
  const [proceduraCampionamento, setProceduraCampionamento] = useState('');
  const [oraRicevimento, setOraRicevimento] = useState('');
  const [dataInizioProva, setDataInizioProva] = useState('');
  const [dataTermineProva, setDataTermineProva] = useState('');

  // Calcola il prossimo codice accettazione suggerito
  const generateSuggestedCode = () => {
    const currentYear = new Date().getFullYear();
    const prefix = `ACC-${currentYear}-`;
    const siblingCodes = accettazioni
      .filter(a => a.codiceAccettazione.startsWith(prefix))
      .map(a => {
        const parts = a.codiceAccettazione.split('-');
        return parseInt(parts[parts.length - 1]) || 0;
      });
    const maxNum = siblingCodes.length > 0 ? Math.max(...siblingCodes) : 0;
    const nextNum = maxNum + 1;
    return `${prefix}${nextNum.toString().padStart(4, '0')}`;
  };

  // Tutte le categorie merceologiche estratte dalle prove
  const categorieMerceologicheDisponibili = Array.from(
    new Set(prove.map(p => p.categoriaMerceologica).filter(Boolean))
  );

  const handleOpenAdd = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split('T')[0];

    setEditingAcc(null);
    setDescrizione('');
    const defaultCat = categorieMerceologicheDisponibili[0] || 'Oli e Grassi';
    setMatrice(defaultCat);
    setCustomMatrice('');
    setQuantita('1 flacone da 500ml');
    setTemperatura('+18.0 °C');
    setStatoInArrivo('Idoneo');
    
    // Default to the first client if available
    const firstClient = clients[0]?.id || '';
    setIntestatarioId(firstClient);
    setDestinatarioFatturaId(firstClient);
    setPreventivoId('');
    setCopiaFattura(true);
    setConsegna(in7DaysStr);
    setNote('');
    setStatoAnalisi('In Attesa');
    const defaultOperator = operators && operators.length > 0 ? operators[0].nome : 'Dott. Chim. F. Lupo';
    setOperator(defaultOperator);
    setFormOperatorPassword('');
    setFormError(null);

    // Nuovi campi LIMS (Accettazione)
    setCategoriaMerceologica('Analisi Agroalimentari / Oli di pressione');
    setInformazioniCliente('Campione fornito integro e idoneo per le determinazioni richieste.');
    setDestinatarioFinale('Stesso Committente');
    setEtichettaCampione('Etichetta originale del produttore');
    setImballaggio('Bottiglia in vetro scuro');
    setCampionatoDa('A cura del Cliente');
    setProceduraCampionamento('Regolamento CEE n. 2568/91 e s.m.i.');
    setOraRicevimento('10:30');
    setDataInizioProva(todayStr);
    setDataTermineProva(in7DaysStr);

    setShowForm(true);
  };

  const handleOpenEdit = (acc: AccettazioneCampione) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split('T')[0];

    setEditingAcc(acc);
    setDescrizione(acc.descrizioneCampione);
    setQuantita(acc.quantitaCampione);
    setTemperatura(acc.temperaturaArrivo || '');
    setStatoInArrivo(acc.statoInArrivo);
    setIntestatarioId(acc.intestatarioRapportoClienteId);
    setDestinatarioFatturaId(acc.destinatarioFatturaClienteId);
    setCopiaFattura(acc.intestatarioRapportoClienteId === acc.destinatarioFatturaClienteId);
    setPreventivoId(acc.preventivoAssociatoId || '');
    setConsegna(acc.consegnaPrevista || '');
    setNote(acc.noteLab || '');
    setStatoAnalisi(acc.analisiStato);
    const defaultOperator = operators && operators.length > 0 ? operators[0].nome : 'Dott. Chim. F. Lupo';
    setOperator(acc.operatorRegistrazione || defaultOperator);
    setFormOperatorPassword('');
    setFormError(null);

    // Nuovi campi LIMS (Accettazione)
    setCategoriaMerceologica(acc.categoriaMerceologica || 'Analisi Agroalimentari / Oli di pressione');
    setInformazioniCliente(acc.informazioniCliente || 'Campione fornito integro e idoneo per le determinazioni richieste.');
    setDestinatarioFinale(acc.destinatarioFinale || 'Stesso Committente');
    setEtichettaCampione(acc.etichettaCampione || 'Etichetta originale del produttore');
    setImballaggio(acc.imballaggio || 'Bottiglia in vetro scuro');
    setCampionatoDa(acc.campionatoDa || 'A cura del Cliente');
    setProceduraCampionamento(acc.proceduraCampionamento || 'Regolamento CEE n. 2568/91 e s.m.i.');
    setOraRicevimento(acc.oraRicevimento || '10:30');
    setDataInizioProva(acc.dataInizioProva || acc.dataAccettazione || todayStr);
    setDataTermineProva(acc.dataTermineProva || acc.consegnaPrevista || in7DaysStr);

    if (categorieMerceologicheDisponibili.includes(acc.matrice)) {
      setMatrice(acc.matrice);
      setCustomMatrice('');
    } else {
      setMatrice(acc.matrice || categorieMerceologicheDisponibili[0] || 'Oli e Grassi');
      setCustomMatrice(acc.matrice || '');
    }

    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAcc(null);
    setFormOperatorPassword('');
    setFormError(null);
  };

  const handleIntestatarioChange = (id: string) => {
    setIntestatarioId(id);
    if (id !== destinatarioFatturaId) {
      setCopiaFattura(false);
    }
  };

  const handleClientePagatoreChange = (id: string) => {
    setDestinatarioFatturaId(id);
    if (copiaFattura) {
      setIntestatarioId(id);
    }
    // Auto-seleziona l'ultimo preventivo registrato per quel cliente pagatore se esiste
    const clientPrev = preventivi.filter(p => p.clienteId === id && p.stato === 'Approvato');
    if (clientPrev.length > 0) {
      setPreventivoId(clientPrev[clientPrev.length - 1].id);
    } else {
      setPreventivoId('');
    }
  };

  const handleCopiaFatturaChange = (checked: boolean) => {
    setCopiaFattura(checked);
    if (checked) {
      setIntestatarioId(destinatarioFatturaId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalBillId = destinatarioFatturaId;
    const finalIntestatarioId = copiaFattura ? destinatarioFatturaId : intestatarioId;

    if (!descrizione.trim() || !finalIntestatarioId || !finalBillId) {
      alert("Compila tutti i campi obbligatori della scheda d'accettazione.");
      return;
    }

    // Verifica Password Operatore
    const requiredPass = OPERATOR_PASSWORDS[operator] || 'lims123';
    if (formOperatorPassword !== requiredPass) {
      setFormError("La password ordinaria o PIN inserito non è valido per l'operatore firmatario selezionato.");
      return;
    }

    const finalMatrice = matrice === 'Altro...' ? customMatrice.trim() : matrice;

    if (editingAcc) {
      const history = editingAcc.statoHistory ? [...editingAcc.statoHistory] : [];
      const op = operator.trim() || 'Operatore Generico';
      const nowFormatted = new Date().toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      if (editingAcc.analisiStato !== statoAnalisi) {
        history.push({
          campoModificato: 'analisiStato',
          statoPrecedente: editingAcc.analisiStato,
          statoNuovo: statoAnalisi,
          dataOra: nowFormatted,
          operatore: op
        });
      }

      if (editingAcc.statoInArrivo !== statoInArrivo) {
        history.push({
          campoModificato: 'statoInArrivo',
          statoPrecedente: editingAcc.statoInArrivo,
          statoNuovo: statoInArrivo,
          dataOra: nowFormatted,
          operatore: op
        });
      }

      const updated: AccettazioneCampione = {
        ...editingAcc,
        descrizioneCampione: descrizione.trim(),
        matrice: finalMatrice || 'Generale',
        quantitaCampione: quantita.trim() || 'N.D.',
        temperaturaArrivo: temperatura.trim() || undefined,
        statoInArrivo: statoInArrivo,
        intestatarioRapportoClienteId: finalIntestatarioId,
        destinatarioFatturaClienteId: finalBillId,
        preventivoAssociatoId: preventivoId || undefined,
        consegnaPrevista: consegna || undefined,
        noteLab: note.trim() || undefined,
        analisiStato: statoAnalisi,
        operatorRegistrazione: operator.trim(),
        statoHistory: history,
        
        // Nuovi campi LIMS (Accettazione)
        categoriaMerceologica: categoriaMerceologica.trim(),
        informazioniCliente: informazioniCliente.trim(),
        destinatarioFinale: destinatarioFinale.trim(),
        etichettaCampione: etichettaCampione.trim(),
        imballaggio: imballaggio.trim(),
        campionatoDa: campionatoDa.trim(),
        proceduraCampionamento: proceduraCampionamento.trim(),
        oraRicevimento: oraRicevimento.trim(),
        dataInizioProva: dataInizioProva,
        dataTermineProva: dataTermineProva
      };
      onUpdateAccettazione(updated);
    } else {
      const initialLog = {
        campoModificato: 'analisiStato' as const,
        statoPrecedente: undefined,
        statoNuovo: 'In Attesa' as const,
        dataOra: new Date().toLocaleString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        operatore: operator.trim() || 'Operatore Generico'
      };

      const newAcc: AccettazioneCampione = {
        id: 'acc_' + Date.now(),
        codiceAccettazione: generateSuggestedCode(),
        dataAccettazione: new Date().toISOString().split('T')[0],
        descrizioneCampione: descrizione.trim(),
        matrice: finalMatrice || 'Generale',
        quantitaCampione: quantita.trim() || 'N.D.',
        temperaturaArrivo: temperatura.trim() || undefined,
        statoInArrivo: statoInArrivo,
        intestatarioRapportoClienteId: finalIntestatarioId,
        destinatarioFatturaClienteId: finalBillId,
        preventivoAssociatoId: preventivoId || undefined,
        consegnaPrevista: consegna || undefined,
        noteLab: note.trim() || undefined,
        analisiStato: 'In Attesa',
        operatorRegistrazione: operator.trim(),
        statoHistory: [initialLog],

        // Nuovi campi LIMS (Accettazione)
        categoriaMerceologica: categoriaMerceologica.trim(),
        informazioniCliente: informazioniCliente.trim(),
        destinatarioFinale: destinatarioFinale.trim(),
        etichettaCampione: etichettaCampione.trim(),
        imballaggio: imballaggio.trim(),
        campionatoDa: campionatoDa.trim(),
        proceduraCampionamento: proceduraCampionamento.trim(),
        oraRicevimento: oraRicevimento.trim(),
        dataInizioProva: dataInizioProva,
        dataTermineProva: dataTermineProva
      };
      onAddAccettazione(newAcc);
    }

    setShowForm(false);
    setEditingAcc(null);
  };

  // Cambio di stato con auditing e controllo password per i campioni LIMS
  const handleToggleAccStatus = (accId: string, field: 'analisiStato' | 'statoInArrivo', currentStatus: string) => {
    setTracingAccId(accId);
    setTracingAccField(field);
    setTracingSelectedAccStatus(currentStatus);
    setTracingAccPassword('');
    setTracingAccError(null);
    const foundAcc = accettazioni.find(a => a.id === accId);
    
    const knownOperators = operators && operators.length > 0 
      ? operators.map(op => op.nome) 
      : ['Dott. Chim. F. Lupo', 'Dott.ssa S. Bianchi', 'Dott. R. Vitale'];
    const defaultOperator = operators && operators.length > 0
      ? operators[0].nome
      : 'Dott. Chim. F. Lupo';

    if (foundAcc && foundAcc.statoHistory && foundAcc.statoHistory.length > 0) {
      const lastOp = foundAcc.statoHistory[foundAcc.statoHistory.length - 1].operatore;
      if (knownOperators.includes(lastOp)) {
        setTracingAccOperator(lastOp);
        setTracingAccCustomOperator('');
      } else {
        setTracingAccOperator('Altro');
        setTracingAccCustomOperator(lastOp);
      }
    } else {
      setTracingAccOperator(defaultOperator);
      setTracingAccCustomOperator('');
    }
  };

  const handleConfirmAccStatusChange = () => {
    if (!tracingAccId || !tracingAccField) return;
    const foundAcc = accettazioni.find(a => a.id === tracingAccId);
    if (!foundAcc) return;

    // Controllo Password dell'analista/operatore
    const reqPass = OPERATOR_PASSWORDS[tracingAccOperator] || 'lims123';
    if (tracingAccPassword !== reqPass) {
      setTracingAccError(`PIN/Password non valida per l'operatore firmatario.`);
      return;
    }

    const op = tracingAccOperator === 'Altro' ? (tracingAccCustomOperator.trim() || 'Operatore Generico') : tracingAccOperator;
    const formattedDate = new Date().toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const previousValue = tracingAccField === 'analisiStato' ? foundAcc.analisiStato : foundAcc.statoInArrivo;

    const newLog = {
      campoModificato: tracingAccField,
      statoPrecedente: previousValue,
      statoNuovo: tracingSelectedAccStatus as any,
      dataOra: formattedDate,
      operatore: op
    };

    const history = foundAcc.statoHistory ? [...foundAcc.statoHistory, newLog] : [newLog];

    const updatedAcc = {
      ...foundAcc,
      [tracingAccField]: tracingSelectedAccStatus as any,
      statoHistory: history
    };

    onUpdateAccettazione(updatedAcc);
    setTracingAccId(null);
    setTracingAccField(null);
    setTracingAccPassword('');
    setTracingAccError(null);
  };

  // Filtra i campioni inseriti
  const filteredAccettazioni = accettazioni.filter(acc => {
    // 1) Cerca per codice accettazione, descrizione campione o note
    const query = searchTerm.toLowerCase();
    const matchSearch = 
      acc.codiceAccettazione.toLowerCase().includes(query) ||
      acc.descrizioneCampione.toLowerCase().includes(query) ||
      (acc.noteLab && acc.noteLab.toLowerCase().includes(query));

    // 2) Filtra per Matrice
    const matchMatrice = selectedMatrice === 'Tutte' || acc.matrice === selectedMatrice;

    return matchSearch && matchMatrice;
  });

  const getClientDenominazione = (id: string) => {
    const c = clients.find(cl => cl.id === id);
    return c ? c.denominazione : 'Cliente Sconosciuto';
  };

  const getClientEmail = (id: string) => {
    const c = clients.find(cl => cl.id === id);
    return c ? c.email : '';
  };

  // Metodi di supporto per Risultati Prove (Emissione Rapporto Prova)
  const getResolvedProveForAccettazione = (acc: AccettazioneCampione) => {
    if (!acc.preventivoAssociatoId) return [];
    const assocPrev = preventivi.find(p => p.id === acc.preventivoAssociatoId);
    if (!assocPrev) return [];
    
    const resolved: Prova[] = [];
    const addedIds = new Set<string>();

    // 1) Prove individuali
    assocPrev.proveSelezionate?.forEach(item => {
      if (!addedIds.has(item.provaId)) {
        const p = prove.find(x => x.id === item.provaId);
        if (p) {
          resolved.push(p);
          addedIds.add(p.id);
        }
      }
    });

    // 2) Prove incluse nei pacchetti
    assocPrev.pacchettiSelezionati?.forEach(item => {
      const pack = pacchetti.find(x => x.id === item.pacchettoId);
      if (pack) {
        pack.proveIds?.forEach(pid => {
          if (!addedIds.has(pid)) {
            const p = prove.find(x => x.id === pid);
            if (p) {
              resolved.push(p);
              addedIds.add(pid);
            }
          }
        });
      }
    });

    return resolved;
  };

  const handleStartEditResults = (acc: AccettazioneCampione) => {
    const resolved = getResolvedProveForAccettazione(acc);
    const initialTemp: Record<string, Partial<RisultatoProva>> = {};
    
    resolved.forEach(p => {
      const existing = acc.risultatiAnalisi?.find(r => r.provaId === p.id);
      
      // Auto-predisposizione dell'unità di misura in base al tipo di prova per comodità dell'analista
      let defaultUm = 'g/100g';
      if (p.nome.toLowerCase().includes('perossid')) defaultUm = 'meq O2/kg';
      else if (p.nome.toLowerCase().includes('acidit')) defaultUm = '% acic. oleico';
      else if (p.nome.toLowerCase().includes('ph')) defaultUm = 'u pH';
      else if (p.nome.toLowerCase().includes('densit')) defaultUm = 'g/cm³';
      else if (p.nome.toLowerCase().includes('escherichia') || p.nome.toLowerCase().includes('carica b')) defaultUm = 'UFC/g';
      else if (p.nome.toLowerCase().includes('metalli') || p.nome.toLowerCase().includes('piombo') || p.nome.toLowerCase().includes('rame')) defaultUm = 'mg/kg';
      else if (p.nome.toLowerCase().includes('umidit')) defaultUm = '%';

      initialTemp[p.id] = {
        provaId: p.id,
        valoreRilevato: existing?.valoreRilevato || '',
        incertezza: existing?.incertezza || '± 0.01',
        ripetibilita: existing?.ripetibilita || '',
        unitaMisura: existing?.unitaMisura || defaultUm,
        conforme: existing?.conforme || 'Conforme',
        operatore: existing?.operatore || acc.operatorRegistrazione || 'Dott. Chim. F. Lupo',
        dataAnalisi: existing?.dataAnalisi || new Date().toISOString().split('T')[0]
      };
    });
    
    setTempRisultati(initialTemp);
    setEditingResultsAccId(acc.id);
  };

  const handleFillSampleValues = (acc: AccettazioneCampione) => {
    const resolved = getResolvedProveForAccettazione(acc);
    const sampleValues: Record<string, Partial<RisultatoProva>> = {};
    
    resolved.forEach(p => {
      let mockVal = 'Assente';
      let mockUm = 'mg/kg';
      let mockInc = '± 0.01';
      let mockRip = '± 0.005';

      if (p.nome.toLowerCase().includes('acidit')) {
        mockVal = '0.22';
        mockUm = '% acid. oleico';
        mockInc = '± 0.02';
        mockRip = '± 0.01';
      } else if (p.nome.toLowerCase().includes('perossid')) {
        mockVal = '7.5';
        mockUm = 'meq O2/kg';
        mockInc = '± 0.4';
        mockRip = '± 0.2';
      } else if (p.nome.toLowerCase().includes('metalli') || p.nome.toLowerCase().includes('ferro') || p.nome.toLowerCase().includes('rame')) {
        mockVal = '0.04';
        mockUm = 'mg/kg';
        mockInc = '± 0.005';
        mockRip = '± 0.002';
      } else if (p.nome.toLowerCase().includes('pesticid') || p.nome.toLowerCase().includes('fitofarmac')) {
        mockVal = '< L.O.D. (<0.01)';
        mockUm = 'mg/kg';
        mockInc = 'N/D';
        mockRip = 'N/D';
      } else if (p.nome.toLowerCase().includes('ph')) {
        mockVal = '6.7';
        mockUm = 'u pH';
        mockInc = '± 0.1';
        mockRip = '± 0.05';
      } else if (p.nome.toLowerCase().includes('escherichia') || p.nome.toLowerCase().includes('bacill')) {
        mockVal = 'Assente / 25g';
        mockUm = 'UFC/g';
        mockInc = 'N/D';
        mockRip = 'N/D';
      } else if (p.nome.toLowerCase().includes('umidit')) {
        mockVal = '10.5';
        mockUm = '%';
        mockInc = '± 0.2';
        mockRip = '± 0.1';
      } else {
        mockVal = '85.4';
        mockUm = 'mg/L';
        mockInc = '± 1.2';
        mockRip = '± 0.6';
      }
      
      sampleValues[p.id] = {
        provaId: p.id,
        valoreRilevato: mockVal,
        incertezza: mockInc,
        ripetibilita: mockRip,
        unitaMisura: mockUm,
        conforme: 'Conforme',
        operatore: acc.operatorRegistrazione || 'Dott. Chim. F. Lupo',
        dataAnalisi: new Date().toISOString().split('T')[0]
      };
    });
    
    setTempRisultati(sampleValues);
  };

  const handleSaveResults = (acc: AccettazioneCampione) => {
    const resultsArray: RisultatoProva[] = (Object.values(tempRisultati) as Partial<RisultatoProva>[]).map(r => {
      const p = prove.find(x => x.id === r.provaId);
      const originalVal = r.valoreRilevato || 'N/D';
      const formattedVal = p ? checkIfValueBelowLOQ(originalVal, p.limiteQuantificazione) : originalVal;

      return {
        provaId: r.provaId!,
        valoreRilevato: formattedVal,
        incertezza: r.incertezza || 'N/D',
        ripetibilita: r.ripetibilita || 'N/D',
        unitaMisura: r.unitaMisura || 'mg/kg',
        conforme: r.conforme || 'Conforme',
        operatore: r.operatore || 'Dott. Chim. F. Lupo',
        dataAnalisi: r.dataAnalisi || new Date().toISOString().split('T')[0]
      };
    });

    const prevStatus = acc.analisiStato;
    const history = acc.statoHistory ? [...acc.statoHistory] : [];
    
    if (prevStatus !== 'Completato') {
      const formattedDate = new Date().toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const firstOperatorName = resultsArray[0]?.operatore || 'Dott. Chim. F. Lupo';
      
      history.push({
        campoModificato: 'analisiStato',
        statoPrecedente: prevStatus,
        statoNuovo: 'Completato',
        dataOra: formattedDate,
        operatore: firstOperatorName
      });
    }

    const updatedAcc: AccettazioneCampione = {
      ...acc,
      risultatiAnalisi: resultsArray,
      analisiStato: 'Completato', // Salvare i risultati imposta automaticamente lo stato a completato
      statoHistory: history
    };

    onUpdateAccettazione(updatedAcc);
    setEditingResultsAccId(null);
    setTempRisultati({});
  };

  const handleCalculateUncertainty = (rowId: string, valueStr: string, rsdPercent: number, k: number) => {
    if (!valueStr) return;
    const cleaned = valueStr.replace(',', '.');
    // Extract first number (integer or float) from the string
    const numericMatch = cleaned.match(/[-+]?[0-9]*\.?[0-9]+/);
    
    if (!numericMatch) {
      setTempRisultati(prev => ({
        ...prev,
        [rowId]: {
          ...prev[rowId],
          incertezza: 'N/D'
        }
      }));
      return;
    }

    const value = parseFloat(numericMatch[0]);
    if (isNaN(value)) {
      setTempRisultati(prev => ({
        ...prev,
        [rowId]: {
          ...prev[rowId],
          incertezza: 'N/D'
        }
      }));
      return;
    }

    // Expanded uncertainty = k * (rsdPercent / 100) * value
    const expandedUncertainty = k * (rsdPercent / 100) * value;
    
    // Format based on the decimal precision of the value for scientific consistency
    const fraction = numericMatch[0].split('.')[1] || '';
    const valueDecimals = fraction.length;
    
    // Ensure we have at least 2 decimals, or match the input precision
    const precision = Math.max(valueDecimals, 2);
    const formattedUncertainty = expandedUncertainty.toFixed(precision);

    setTempRisultati(prev => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        incertezza: `± ${formattedUncertainty}`
      }
    }));
  };

  // Statistiche accettazione
  const statTotale = accettazioni.length;
  const statIdoneo = accettazioni.filter(a => a.statoInArrivo === 'Idoneo').length;
  const statNonIdoneo = accettazioni.filter(a => a.statoInArrivo === 'Non Idoneo').length;
  const statRiserva = accettazioni.filter(a => a.statoInArrivo === 'Accettato con Riserva').length;

  // Tutte le categorie merceologiche estratte dalle prove e dalle accettazioni esistenti
  const matriciDisponibili = Array.from(new Set([
    ...prove.map(p => p.categoriaMerceologica).filter(Boolean),
    ...accettazioni.map(a => a.matrice).filter(Boolean)
  ]));

  return (
    <div className="space-y-6">
      
      {/* Intestazione Sezione */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-850">
              Registro Accettazione Campioni
            </h3>
            <p className="text-xs text-slate-400">Archivio chimico-merceologico dei campioni in arrivo, reportistica e flussi amministrativi</p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-wide flex items-center justify-center gap-1.5 transition shadow-2xs hover:shadow-xs"
          id="btn-registra-accettazione"
        >
          <Plus className="h-4 w-4" /> Accetta Nuovo Campione
        </button>
      </div>

      {/* Riquadri Statistiche Rapide */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-2xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registrati</span>
            <span className="text-xl font-extrabold text-slate-850 block mt-1">{statTotale} Campioni</span>
          </div>
          <div className="p-2 bg-slate-50 text-slate-500 rounded-lg border border-slate-100">
            <Tag className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-2xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Idonei</span>
            <span className="text-xl font-extrabold text-emerald-600 block mt-1">{statIdoneo} Campioni</span>
          </div>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100/50">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-2xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Non Idonei</span>
            <span className="text-xl font-extrabold text-rose-600 block mt-1">{statNonIdoneo} Campioni</span>
          </div>
          <div className="p-2 bg-red-50 text-red-650 rounded-lg border border-red-100/50">
            <X className="h-4 w-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-2xs flex justify-between items-center">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Con Riserva</span>
            <span className="text-xl font-extrabold text-amber-650 block mt-1">{statRiserva} Campioni</span>
          </div>
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-100/50">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Sezione Filtri e Ricerca */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs flex flex-col md:flex-row gap-4">
        {/* Ricerca per Testo */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per codice accettazione, categoria, descrizione campione..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-semibold"
          />
        </div>

        {/* Filtro per Matrice */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase shrink-0">Categoria:</span>
          <select
            value={selectedMatrice}
            onChange={(e) => setSelectedMatrice(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
          >
            <option value="Tutte">Tutte le Categorie</option>
            {matriciDisponibili.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Contenuto Principale: Form di Registrazione / Registro Accettazioni */}
      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-md space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-base text-slate-800 flex items-center gap-1.5">
                {editingAcc ? `Modifica Scheda Campione: ${editingAcc.codiceAccettazione}` : 'Registrazione di un Nuovo Campione / Accettazione'}
              </h4>
              <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-slate-700">
              {/* Riga 1: Descrizione e Matrice */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Descrizione del Campione *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Esempio: Olio Extravergine di Oliva d'inizio campagna"
                    value={descrizione}
                    onChange={(e) => setDescrizione(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Categoria Merceologica *
                  </label>
                  <select
                    value={matrice}
                    onChange={(e) => setMatrice(e.target.value)}
                    className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white focus:outline-none"
                  >
                    {categorieMerceologicheDisponibili.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Riga 2: Quantità, Temperatura Arrivo e Stato campione */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Quantità Campione Consegnata *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Esempio: 2 bottiglie da 750ml, 500g in vaschetta"
                    value={quantita}
                    onChange={(e) => setQuantita(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Temperatura d&apos;Arrivo del Campione
                  </label>
                  <input
                    type="text"
                    placeholder="Esempio: +4.2 °C, Ambiente, +18.0 °C"
                    value={temperatura}
                    onChange={(e) => setTemperatura(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Valutazione Idoneità all&apos;accettazione *
                  </label>
                  <select
                    value={statoInArrivo}
                    onChange={(e) => setStatoInArrivo(e.target.value as any)}
                    className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white focus:outline-none"
                  >
                    <option value="Idoneo" className="text-emerald-700">🟩 Idoneo (Conforme per l&apos;analisi)</option>
                    <option value="Non Idoneo" className="text-rose-700">🟥 Non Idoneo (Rifiutato / Scartato)</option>
                    <option value="Accettato con Riserva" className="text-amber-700">🟨 Accettato con Riserva (Nota tecnica)</option>
                  </select>
                </div>
              </div>

              {/* Sezione Associazioni Anagrafiche ed Economiche */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
                <span className="text-[11px] font-black text-slate-400 tracking-wider uppercase block">Associazione Anagrafica e Amministrativa</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cliente pagatore */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 flex items-center gap-1 mb-1">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                      Il Cliente (Colui che paga e a cui è fatturato) *
                    </label>
                    <span className="text-[10px] text-slate-400 block mb-1">Il committente a cui viene intestata la fattura del rapporto</span>
                    <select
                      value={destinatarioFatturaId}
                      onChange={(e) => handleClientePagatoreChange(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-semibold focus:outline-none"
                    >
                      <option value="">Seleziona il cliente pagatore...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.denominazione} (P.Iva: {c.partitaIva})</option>
                      ))}
                    </select>
                  </div>

                  {/* Destinatario finale del rapporto */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-extrabold text-slate-700 flex items-center gap-1">
                        <Building className="h-3.5 w-3.5 text-blue-500" /> 
                        Destinatario finale del Rapporto di Prova *
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-500">
                        <input
                          type="checkbox"
                          checked={copiaFattura}
                          onChange={(e) => handleCopiaFatturaChange(e.target.checked)}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        Coincide con il Cliente pagatore
                      </label>
                    </div>
                    <span className="text-[10px] text-slate-400 block mb-1">Ente a cui è intestata la conformità nel certificato</span>
                    <select
                      value={copiaFattura ? destinatarioFatturaId : intestatarioId}
                      onChange={(e) => handleIntestatarioChange(e.target.value)}
                      disabled={copiaFattura}
                      className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-semibold focus:outline-none ${copiaFattura ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
                    >
                      <option value="">Seleziona destinatario rapporto...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.denominazione} (P.Iva: {c.partitaIva})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Preventivo / Quotazione Associato */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 flex items-center gap-1 mb-1">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-amber-500" />
                    Preventivo o Offerta Associata al Campione
                  </label>
                  <span className="text-[10px] text-slate-400 block mb-1">Collega un preventivo approvato per tracciare le analisi e i relativi prezzi applicati</span>
                  <select
                    value={preventivoId}
                    onChange={(e) => setPreventivoId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-semibold focus:outline-none"
                  >
                    <option value="">Nessun preventivo collegato (Tariffa manuale o listino standard)</option>
                    {preventivi
                      .filter(p => !destinatarioFatturaId || p.clienteId === destinatarioFatturaId || p.clienteId === intestatarioId)
                      .map(p => {
                        const clientName = clients.find(cl => cl.id === p.clienteId)?.denominazione || 'Sconosciuto';
                        return (
                          <option key={p.id} value={p.id}>
                            {p.codice} • Totale: €{p.totale} • Stato: {p.stato} ({clientName})
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>

              {/* Dettagli Avanzati per il Rapporto di Prova (Richiesta Utente) */}
              <div className="bg-indigo-50/40 p-5 rounded-xl border border-indigo-100 space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-indigo-100">
                  <div className="p-1 bg-indigo-100 text-indigo-700 rounded-lg">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-indigo-900 tracking-wider uppercase block">Dettagli Avanzati per il Rapporto di Prova</span>
                    <p className="text-[10px] text-indigo-600">Configurazione della tracciabilità e delle informazioni speciali stampate nel certificato ufficiale</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Categoria Merceologica */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Categoria Merceologica (Rapporto)
                    </label>
                    <input
                      type="text"
                      placeholder="es: Analisi Agroalimentari / Oli di pressione"
                      value={categoriaMerceologica}
                      onChange={(e) => setCategoriaMerceologica(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  {/* Etichetta Campione */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Etichetta Campione
                    </label>
                    <input
                      type="text"
                      placeholder="es: Etichetta originale del produttore"
                      value={etichettaCampione}
                      onChange={(e) => setEtichettaCampione(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  {/* Imballaggio */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Imballaggio / Confezionamento
                    </label>
                    <input
                      type="text"
                      placeholder="es: Bottiglia in vetro scuro"
                      value={imballaggio}
                      onChange={(e) => setImballaggio(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Campionamento a cura di */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Campionamento a cura di
                    </label>
                    <input
                      type="text"
                      placeholder="es: A cura del Cliente / Tecnico Lab"
                      value={campionatoDa}
                      onChange={(e) => setCampionatoDa(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  {/* Procedura di Campionamento */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Procedura di Campionamento
                    </label>
                    <input
                      type="text"
                      placeholder="es: Regolamento CEE n. 2568/91"
                      value={proceduraCampionamento}
                      onChange={(e) => setProceduraCampionamento(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  {/* Destinatario Finale */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Destinatario Finale Rapporto
                    </label>
                    <input
                      type="text"
                      placeholder="es: Stesso Committente / Ente Terzo"
                      value={destinatarioFinale}
                      onChange={(e) => setDestinatarioFinale(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Ora Ricevimento */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Ora Ricevimento
                    </label>
                    <input
                      type="text"
                      placeholder="es: 10:30"
                      value={oraRicevimento}
                      onChange={(e) => setOraRicevimento(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>

                  {/* Data inizio prova */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Data Inizio Prova
                    </label>
                    <input
                      type="date"
                      value={dataInizioProva}
                      onChange={(e) => setDataInizioProva(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-600"
                    />
                  </div>

                  {/* Data termine prova */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Data Termine Prova
                    </label>
                    <input
                      type="date"
                      value={dataTermineProva}
                      onChange={(e) => setDataTermineProva(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-600"
                    />
                  </div>

                  {/* Informazioni da Cliente */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Informazioni dal Cliente
                    </label>
                    <input
                      type="text"
                      placeholder="Note o dettagli tecnici forniti"
                      value={informazioniCliente}
                      onChange={(e) => setInformazioniCliente(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Fila Termini e Note */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Data Consegna Risultati Prevista
                  </label>
                  <input
                    type="date"
                    value={consegna}
                    onChange={(e) => setConsegna(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Note d&apos;Accettazione / Prescrizioni Tecniche del Laboratorio
                </label>
                <textarea
                  rows={2}
                  placeholder="Annotazioni sullo stato della confezione, anomalie, sigilli, accordi speciali, priorità chimico-analitica..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-none"
                ></textarea>
              </div>

              {/* Firma Operatore per l'Audit Trail di Accettazione */}
              <div className="bg-slate-950 text-white p-4 rounded-xl border border-slate-800 space-y-3 shadow-md">
                <span className="text-[11px] font-black text-amber-400 tracking-wider uppercase block">
                  🔐 Firma con Validazione ed Audit Trail
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Selezione Operatore */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Operatore Firmatario (*)
                    </label>
                    <select
                      value={operator}
                      onChange={(e) => {
                        setOperator(e.target.value);
                        setFormOperatorPassword('');
                        setFormError(null);
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 hover:border-slate-650 text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      {operators && operators.length > 0 ? (
                        operators.map(op => (
                          <option key={op.nome} value={op.nome}>{op.nome} ({op.ruolo})</option>
                        ))
                      ) : (
                        <>
                          <option value="Dott. Chim. F. Lupo">Dott. Chim. F. Lupo (Biochem)</option>
                          <option value="Dott.ssa S. Bianchi">Dott.ssa S. Bianchi (Lab Tech)</option>
                          <option value="Dott. R. Vitale">Dott. R. Vitale (emcvit@gmail.com)</option>
                        </>
                      )}
                      <option value="Altro">Altro (Inserimento e tracciamento temporaneo)</option>
                    </select>
                  </div>

                  {/* Password di Sicurezza */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex justify-between">
                      <span>Password Sicurezza (*)</span>
                      <span className="text-[9px] text-slate-500 normal-case font-normal font-mono">es. lupo123, bianchi123, vitale123, lims123</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Immetti password per validare..."
                      value={formOperatorPassword}
                      onChange={(e) => {
                        setFormOperatorPassword(e.target.value);
                        if (formError) setFormError(null);
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 hover:border-slate-650 text-white font-mono rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
                      required
                    />
                  </div>
                </div>

                {formError && (
                  <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-lg text-[11px] font-semibold text-rose-300 animate-fadeIn text-left">
                    ⚠️ {formError}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Indietro
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow cursor-pointer"
                >
                  {editingAcc ? 'Salva Modifiche Accettazione' : 'Conferma ed Accetta Campione'}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* Registro Accettazioni */
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {filteredAccettazioni.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-200 rounded-xl max-w-full">
                <AlertTriangle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">Nessun campione di accettazione registrato con questi criteri di ricerca.</p>
                <button 
                  onClick={handleOpenAdd}
                  className="text-xs text-blue-600 font-bold hover:underline mt-2 cursor-pointer"
                >
                  Registra un nuovo campione adesso
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredAccettazioni.map(acc => {
                  const isExpanded = expandedId === acc.id;
                  const assocPrev = preventivi.find(p => p.id === acc.preventivoAssociatoId);

                  // Calcolo classe di stile per stato idoneità
                  let idoneitaBadge = '';
                  if (acc.statoInArrivo === 'Idoneo') {
                    idoneitaBadge = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                  } else if (acc.statoInArrivo === 'Non Idoneo') {
                    idoneitaBadge = 'bg-red-50 text-red-800 border-red-100';
                  } else {
                    idoneitaBadge = 'bg-amber-50 text-amber-800 border-amber-100';
                  }

                  // Calcolo classe di stile per stato analisi
                  let analisiBadge = '';
                  if (acc.analisiStato === 'In Attesa') {
                    analisiBadge = 'bg-slate-100 text-slate-600';
                  } else if (acc.analisiStato === 'In Corso') {
                    analisiBadge = 'bg-blue-50 text-blue-800 border-blue-200/50';
                  } else if (acc.analisiStato === 'Completato') {
                    analisiBadge = 'bg-emerald-500 text-white';
                  } else {
                    analisiBadge = 'bg-red-500 text-white';
                  }

                  return (
                    <div 
                      key={acc.id} 
                      className={`bg-white border rounded-xl shadow-xs transition-all duration-300 ${
                        isExpanded ? 'border-slate-300 ring-1 ring-slate-100 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* BARRA SUPERIORE COMPRESSA */}
                      <div className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        
                        {/* Codice, Titolo, Data, Matrice */}
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-1 bg-slate-900 text-white font-mono text-[10px] font-black rounded-lg uppercase tracking-wider">
                              {acc.codiceAccettazione}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-md text-[10px] font-extrabold uppercase">
                              🏷️ {acc.matrice}
                            </span>
                            
                            {/* Stato Idoneità Arrivo - Clickable per modifica rapida con password */}
                            <button
                              onClick={() => handleToggleAccStatus(acc.id, 'statoInArrivo', acc.statoInArrivo)}
                              className={`px-2.5 py-0.5 border rounded-md text-[10px] font-extrabold transition hover:opacity-80 active:scale-95 cursor-pointer flex items-center gap-1.5 ${idoneitaBadge}`}
                              title="Clicca per modificare lo stato in arrivo"
                            >
                              📦 Arrivo: {acc.statoInArrivo} ⚙️
                            </button>

                            {/* Stato Analisi - Clickable per cambia rapido con password */}
                            <button
                              onClick={() => handleToggleAccStatus(acc.id, 'analisiStato', acc.analisiStato)}
                              className={`px-2.5 py-0.5 border rounded-md text-[10px] font-extrabold transition hover:bg-slate-900 hover:text-white active:scale-95 cursor-pointer flex items-center gap-1.5 ${analisiBadge}`}
                              title="Clicca per modificare lo stato dell'analisi"
                            >
                              🧪 Stato: {acc.analisiStato} ⚙️
                            </button>
                          </div>

                          <div>
                            <h4 className="font-extrabold text-slate-850 text-sm md:text-base leading-snug">
                              {acc.descrizioneCampione}
                            </h4>
                            {/* Visualizzazione degli attori anagrafici */}
                            <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 block text-xs">
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <Building className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                <span className="font-medium">Intestatario Rapporto:</span>
                                <span className="font-bold text-slate-800 truncate" title={getClientDenominazione(acc.intestatarioRapportoClienteId)}>
                                  {getClientDenominazione(acc.intestatarioRapportoClienteId)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-600">
                                <CreditCard className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                <span className="font-medium">Fatturazione a:</span>
                                <span className="font-bold text-slate-800 truncate" title={getClientDenominazione(acc.destinatarioFatturaClienteId)}>
                                  {getClientDenominazione(acc.destinatarioFatturaClienteId)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Informazioni Crono e Pulsantiera destra */}
                        <div className="flex flex-row lg:flex-col lg:items-end justify-between w-full lg:w-auto border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 shrink-0 gap-3">
                          <div className="text-left lg:text-right font-mono text-[10px] text-slate-400 space-y-0.5">
                            <div className="flex lg:justify-end items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Arrivo: {acc.dataAccettazione}</span>
                            </div>
                            {acc.consegnaPrevista && (
                              <div className="flex lg:justify-end items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span className="text-slate-500 font-bold">Resoconto: {acc.consegnaPrevista}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 self-end">
                            {/* Tasto Modifica */}
                            <button
                              onClick={() => handleOpenEdit(acc)}
                              className="p-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-lg transition-colors cursor-pointer"
                              title="Modifica scheda accettazione"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            {/* Tasto Cancella con Flow */}
                            {deletingId === acc.id ? (
                              <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-100 animate-fadeIn text-[10px] font-bold">
                                <span className="text-red-700 px-1">Eliminare?</span>
                                <button
                                  onClick={() => {
                                    onDeleteAccettazione(acc.id);
                                    setDeletingId(null);
                                  }}
                                  className="bg-red-600 text-white rounded px-2 py-0.5 cursor-pointer hover:bg-red-700"
                                >
                                  Sì
                                </button>
                                <button
                                  onClick={() => setDeletingId(null)}
                                  className="bg-white border text-slate-500 rounded px-2 py-0.5 cursor-pointer hover:bg-slate-50"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingId(acc.id)}
                                className="p-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-red-650 hover:bg-red-50 hover:border-red-100 rounded-lg transition-colors cursor-pointer"
                                title="Cancella accettazione"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Espansione Dettagli */}
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : acc.id)}
                              className="p-1.5 px-2 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-[10px] font-bold cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              Redigi Rapporto & Dettagli
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* BLOCCO DETTAGLI ESPANSO */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/50 animate-fadeIn space-y-4">
                          
                          {/* Righe Informative Tecniche */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-3">
                            <div className="bg-white p-3 rounded-lg border border-slate-150 shadow-3xs space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Identificativi ed Accettazione</span>
                              <div className="font-mono text-slate-600 space-y-0.5">
                                <p>Qtà: <strong className="text-slate-800">{acc.quantitaCampione}</strong></p>
                                <p>Temp in arrivo: <strong className="text-slate-800">{acc.temperaturaArrivo || 'Ambiente / Non rilevata'}</strong></p>
                              </div>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-slate-150 shadow-3xs space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Flussi Amministrativi</span>
                              <div className="space-y-1 text-slate-650">
                                <p className="flex items-center gap-1">
                                  <Building className="h-3 w-3 text-blue-500 shrink-0" />
                                  <span>Rapporto: {getClientEmail(acc.intestatarioRapportoClienteId)}</span>
                                </p>
                                <p className="flex items-center gap-1">
                                  <CreditCard className="h-3 w-3 text-emerald-500 shrink-0" />
                                  <span>Fattura a: <strong>{getClientDenominazione(acc.destinatarioFatturaClienteId)}</strong></span>
                                </p>
                              </div>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-slate-150 shadow-3xs space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Riferimento Preventivo</span>
                              {assocPrev ? (
                                <div className="text-slate-600 font-mono space-y-0.5">
                                  <p>Codice: <strong className="text-blue-750 font-bold">{assocPrev.codice}</strong></p>
                                  <p>Data: {assocPrev.dataCreazione}</p>
                                  <p>Totale: <strong className="text-slate-800">€{assocPrev.totale.toFixed(2)}</strong></p>
                                </div>
                              ) : (
                                <p className="text-slate-400 italic leading-snug">Nessun preventivo formalmente associato inserito nel record di accettazione.</p>
                              )}
                            </div>
                          </div>

                          {/* Sezione dettagliata del Preventivo Collegato se esiste */}
                          {assocPrev && (
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-3xs space-y-2">
                              <h5 className="text-[10px] font-semibold text-slate-450 tracking-wider uppercase flex items-center gap-1.5">
                                <FileSpreadsheet className="h-3.5 w-3.5 text-amber-500" />
                                Dettaglio Offerta Economica collegata ({assocPrev.codice})
                              </h5>
                              <div className="text-xs space-y-2">
                                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center">
                                  <div>
                                    <span className="text-slate-500 font-medium">Stato contrattuale preventivo:</span>
                                    <span className={`ml-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                                      assocPrev.stato === 'Approvato' 
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {assocPrev.stato}
                                    </span>
                                  </div>
                                  <span className="text-sm font-extrabold text-indigo-700">Valore: €{assocPrev.totale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                                </div>
                                
                                {assocPrev.note && (
                                  <p className="text-slate-400 text-[11px] leading-relaxed italic block border-l-2 border-l-amber-400 pl-2">
                                    &quot;{assocPrev.note}&quot;
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Note di laboratorio */}
                          {acc.noteLab && (
                            <div className="bg-slate-100/60 p-3 rounded-lg border border-slate-200 text-xs">
                              <span className="text-[10px] font-bold text-slate-450 block uppercase tracking-wider mb-1">Prescrizioni e Segnalazioni tecniche</span>
                              <p className="text-slate-600 leading-relaxed italic font-medium">
                                &quot;{acc.noteLab}&quot;
                              </p>
                            </div>
                          )}

                          {/* Registro Audit e Tracciabilità Stati Accettazione (Richiesta Utente) */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 mt-4 space-y-3 text-left">
                            <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                              <span className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                📊 Tracciabilità e Storico Stati Campione
                              </span>
                              <span className="text-[9px] bg-slate-200/60 text-slate-705 px-2.5 py-0.5 rounded-full font-bold">
                                {acc.statoHistory?.length || 0} Eventi registrati
                              </span>
                            </div>
                            {acc.statoHistory && acc.statoHistory.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                {acc.statoHistory.map((h, hIdx) => (
                                  <div key={hIdx} className="text-[11px] flex flex-col justify-between p-3 bg-white border border-slate-150 rounded-lg shadow-3xs space-y-1.5">
                                    <div className="flex justify-between items-start gap-1">
                                      <span className="text-slate-450 font-mono text-[9px] font-bold shrink-0">{h.dataOra}</span>
                                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-black tracking-tighter uppercase shrink-0 ${
                                        h.campoModificato === 'analisiStato' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                      }`}>
                                        {h.campoModificato === 'analisiStato' ? 'Stato Analisi' : 'Stato In Arrivo'}
                                      </span>
                                    </div>
                                    <div className="text-[11px] flex flex-wrap items-center gap-x-1 font-medium text-slate-650">
                                      <span className="text-slate-440 font-extrabold text-[10px] line-through">{h.statoPrecedente || 'Iniziale'}</span>
                                      <span className="text-slate-400 font-bold">&rarr;</span>
                                      <span className={`px-1.5 rounded text-[10px] font-bold ${
                                        h.statoNuovo === 'Completato' ? 'bg-emerald-50 text-emerald-700' :
                                        h.statoNuovo === 'In Corso' ? 'bg-blue-50 text-blue-700' :
                                        'bg-slate-100 text-slate-700'
                                      }`}>{h.statoNuovo}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-1">
                                      Eseguito da: <strong className="text-slate-750 font-bold">{h.operatore}</strong>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-400 text-[10.5px] italic leading-normal m-0 p-1">
                                Nessun cambio di stato registrato. Eventuali modifiche allo stato in arrivo o allo stato analisi nel modulo di modifica saranno tracciate temporalmente con firma operatore in questo registro d'audit integrato.
                              </p>
                            )}
                          </div>

                          {/* SEZIONE GESTIONE RISULTATI & CERTIFICATORE (Richiesta Utente) */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 mt-4 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-200">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-100 text-indigo-800 rounded-lg">
                                  <Award className="h-4 w-4" />
                                </div>
                                <div>
                                  <h6 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
                                    Rapporto di Prova
                                  </h6>
                                  <p className="text-[10px] text-slate-400">Inserimento risultati di laboratorio e stampa rapporto di prova ufficiale</p>
                                </div>
                              </div>
                              
                              <div className="text-[10px] font-bold text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-md">
                                Protocollo LIMS: <span className="font-mono text-slate-800 font-black">{acc.codiceAccettazione}</span>
                              </div>
                            </div>

                            {(() => {
                              const resolvedProve = getResolvedProveForAccettazione(acc);
                              
                              if (resolvedProve.length === 0) {
                                return (
                                  <div className="bg-amber-50/50 border border-amber-150 rounded-lg p-3 flex gap-2 text-xs text-amber-800">
                                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                                    <div className="space-y-1">
                                      <p className="font-bold">Nessuna prova associata</p>
                                      <p className="text-[11px] text-amber-700/90 leading-normal">
                                        Per compilare il Rapporto di Prova, associa questa accettazione a un preventivo attivo che contiene delle analisi o pacchetti di determinazioni.
                                      </p>
                                    </div>
                                  </div>
                                );
                              }

                              const isEditing = editingResultsAccId === acc.id;

                              return (
                                <div className="space-y-4">
                                  {/* TABELLA O COMPILATORE INLINE */}
                                  <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-3xs">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50 text-slate-450 uppercase text-[9px] font-black tracking-wider border-b border-slate-200">
                                          <th className="p-3">Analisi / Metodo</th>
                                          <th className="p-3 w-32">Risultato</th>
                                          <th className="p-3 w-32">Incertezza</th>
                                          <th className="p-3 w-32">Ripetibilità</th>
                                          <th className="p-3 w-36">Unità di misura</th>
                                          <th className="p-3 w-28">Data</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {resolvedProve.map(p => {
                                          const rData = acc.risultatiAnalisi?.find(r => r.provaId === p.id);
                                          
                                          if (isEditing) {
                                            const currentVal = tempRisultati[p.id] || {};
                                            return (
                                              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                                                <td className="p-3">
                                                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                                                    {p.nome}
                                                    {p.accreditataAccredia && (
                                                      <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-1 py-0.2 rounded font-bold uppercase tracking-tighter" title="Accreditata ACCREDIA">
                                                        🛡️ ACCR
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="text-[10px] text-slate-450 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                                                    <span>{p.metodoAnalitico || 'Metodo Interno'}</span>
                                                    {p.limiteQuantificazione && (
                                                      <span className="text-[9px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.2 font-sans font-bold" title="Limite di Quantificazione">
                                                        LOQ: {p.limiteQuantificazione}
                                                      </span>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="p-2">
                                                  <input 
                                                    type="text"
                                                    value={currentVal.valoreRilevato || ''}
                                                    onChange={(e) => {
                                                      const val = e.target.value;
                                                      setTempRisultati(prev => {
                                                        const updatedRow = { ...prev[p.id], valoreRilevato: val };
                                                        
                                                        // Calcolo automatico dell'incertezza se la prova ha punti d'incertezza salvati (Richiesta Utente)
                                                        if (p.puntiIncertezza && p.puntiIncertezza.length > 0) {
                                                          const inferredInc = calculateInterpolatedUncertainty(val, p.puntiIncertezza);
                                                          if (inferredInc) {
                                                            updatedRow.incertezza = inferredInc;
                                                          }
                                                        }

                                                        // Calcolo automatico della ripetibilità se la prova ha punti di ripetibilità salvati (Richiesta Utente)
                                                        if (p.puntiRipetibilita && p.puntiRipetibilita.length > 0) {
                                                          const inferredRip = calculateInterpolatedRepeatability(val, p.puntiRipetibilita);
                                                          if (inferredRip) {
                                                            updatedRow.ripetibilita = inferredRip;
                                                          }
                                                        }
                                                        
                                                        return {
                                                          ...prev,
                                                          [p.id]: updatedRow
                                                        };
                                                      });
                                                    }}
                                                    placeholder="es: 0.18, Assente"
                                                    onBlur={(e) => {
                                                      const finalVal = checkIfValueBelowLOQ(e.target.value, p.limiteQuantificazione);
                                                      if (finalVal !== e.target.value) {
                                                        setTempRisultati(prev => {
                                                          const updatedRow = { ...prev[p.id], valoreRilevato: finalVal };
                                                          return {
                                                            ...prev,
                                                            [p.id]: updatedRow
                                                          };
                                                        });
                                                      }
                                                    }}
                                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-850"
                                                  />
                                                </td>
                                                <td className="p-2 relative">
                                                  <div className="flex gap-1 items-center">
                                                    <input 
                                                      type="text"
                                                      value={currentVal.incertezza || ''}
                                                      onChange={(e) => setTempRisultati(prev => ({
                                                        ...prev,
                                                        [p.id]: { ...prev[p.id], incertezza: e.target.value }
                                                      }))}
                                                      placeholder="es: ± 0.02, N/D"
                                                      className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-0"
                                                    />
                                                    
                                                    <button
                                                      type="button"
                                                      onClick={() => setActiveCalcRowId(activeCalcRowId === p.id ? null : p.id)}
                                                      className={`px-1.5 py-1 rounded border flex items-center justify-center transition cursor-pointer shrink-0 ${
                                                        activeCalcRowId === p.id 
                                                          ? 'bg-indigo-600 border-indigo-600 text-white' 
                                                          : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                                                      }`}
                                                      title="Calcolatore automatico incertezza estesa"
                                                    >
                                                      <Calculator className="h-3.5 w-3.5" />
                                                    </button>
                                                  </div>
                                                  {p.puntiIncertezza && p.puntiIncertezza.length > 0 && (
                                                    <div className="text-[9px] font-bold text-teal-600 mt-0.5 flex items-center gap-0.5" title="Stima automatica interpolata attiva per questa prova">
                                                      <Sparkles className="h-2.5 w-2.5 text-teal-500 animate-spin" />
                                                      <span>Stima automatica attiva</span>
                                                    </div>
                                                  )}

                                                  {activeCalcRowId === p.id && (
                                                    <div className="absolute z-30 mt-1.5 right-2 bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-slate-700 w-64 space-y-2 text-[11px]">
                                                      <div className="flex justify-between items-center pb-1 border-b border-slate-100">
                                                        <span className="font-extrabold text-indigo-900 uppercase text-[9px] tracking-wide flex items-center gap-1">
                                                          <Calculator className="h-3 w-3" /> Incertezza Estesa (U)
                                                        </span>
                                                        <button 
                                                          type="button"
                                                          onClick={() => setActiveCalcRowId(null)}
                                                          className="text-slate-400 hover:text-slate-600"
                                                        >
                                                          <X className="h-3 w-3" />
                                                        </button>
                                                      </div>

                                                      <div className="space-y-2">
                                                        <div>
                                                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                                            Ripetibilità del Metodo (%)
                                                          </label>
                                                          <div className="flex flex-wrap gap-1">
                                                            {[1, 2, 5, 10, 15].map(pct => (
                                                              <button
                                                                type="button"
                                                                key={pct}
                                                                onClick={() => handleCalculateUncertainty(p.id, currentVal.valoreRilevato || '', pct, coverageFactor)}
                                                                className="bg-slate-100 hover:bg-indigo-100 hover:text-indigo-800 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer"
                                                              >
                                                                {pct}%
                                                              </button>
                                                            ))}
                                                          </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                          <div>
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                                                              Fattore k
                                                              <span className="font-normal lowercase text-[8px] text-slate-400 block">livello conf.</span>
                                                            </label>
                                                            <select
                                                              value={coverageFactor}
                                                              onChange={(e) => {
                                                                const k = parseFloat(e.target.value);
                                                                setCoverageFactor(k);
                                                                // Recalculate with default RSD (e.g. 5%) if value is present
                                                                handleCalculateUncertainty(p.id, currentVal.valoreRilevato || '', 5, k);
                                                              }}
                                                              className="w-full bg-white border border-slate-200 rounded p-1 text-[10px] focus:outline-none"
                                                            >
                                                              <option value="2">k=2 (95%)</option>
                                                              <option value="2.58">k=2.58 (99%)</option>
                                                              <option value="1">k=1 (68%)</option>
                                                            </select>
                                                          </div>
                                                          <div className="flex flex-col justify-end">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                                              Custom RSD%
                                                            </label>
                                                            <input 
                                                              type="number"
                                                              placeholder="es: 3.5"
                                                              className="w-full bg-white border border-slate-200 rounded p-1 text-[10px] font-semibold text-center focus:outline-none"
                                                              onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                if (!isNaN(val)) {
                                                                  handleCalculateUncertainty(p.id, currentVal.valoreRilevato || '', val, coverageFactor);
                                                                }
                                                              }}
                                                            />
                                                          </div>
                                                        </div>

                                                        <div className="bg-slate-50 border border-slate-150 p-2 rounded-lg text-[10px] text-slate-500 leading-normal">
                                                          <span className="font-bold text-slate-600 block">Calcolo UNI EN ISO 17025:</span>
                                                          <code className="font-mono text-indigo-700 font-bold block mt-0.5">U = k × RSD% × Risultato</code>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )}
                                                </td>
                                                <td className="p-2 relative">
                                                  <input 
                                                    type="text"
                                                    value={currentVal.ripetibilita || ''}
                                                    onChange={(e) => setTempRisultati(prev => ({
                                                      ...prev,
                                                      [p.id]: { ...prev[p.id], ripetibilita: e.target.value }
                                                    }))}
                                                    placeholder="es: ± 0.005, N/D"
                                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                                  />
                                                  {p.puntiRipetibilita && p.puntiRipetibilita.length > 0 && (
                                                    <div className="text-[9px] font-bold text-violet-650 mt-0.5 flex items-center gap-0.5" title="Stima automatica interpolata attiva per questa prova">
                                                      <Sparkles className="h-2.5 w-2.5 text-violet-500 animate-spin" />
                                                      <span>Stima rip. attiva</span>
                                                    </div>
                                                  )}
                                                </td>
                                                <td className="p-2">
                                                  <input 
                                                    type="text"
                                                    value={currentVal.unitaMisura || ''}
                                                    onChange={(e) => setTempRisultati(prev => ({
                                                      ...prev,
                                                      [p.id]: { ...prev[p.id], unitaMisura: e.target.value }
                                                    }))}
                                                    placeholder="es: %, mg/kg"
                                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-855"
                                                  />
                                                </td>
                                                <td className="p-2">
                                                  <input 
                                                    type="date"
                                                    value={currentVal.dataAnalisi || ''}
                                                    onChange={(e) => setTempRisultati(prev => ({
                                                      ...prev,
                                                      [p.id]: { ...prev[p.id], dataAnalisi: e.target.value }
                                                    }))}
                                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-650 focus:outline-none focus:ring-1 focus:ring-slate-850"
                                                  />
                                                </td>
                                              </tr>
                                            );
                                          } else {
                                            return (
                                              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/20">
                                                <td className="p-3">
                                                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                                                    {p.nome}
                                                    {p.accreditataAccredia && (
                                                      <span className="text-[9px] text-emerald-800 bg-emerald-50 border border-emerald-100 px-1 py-0.2 rounded font-bold uppercase tracking-tighter" title="Accreditata ACCREDIA">
                                                        🛡️ ACCR
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                                                    <span>{p.metodoAnalitico || 'Metodo Interno'}</span>
                                                    {p.limiteQuantificazione && (
                                                      <span className="text-[9px] text-amber-800 bg-amber-50 border border-amber-250 rounded px-1.5 py-0.2 font-sans font-bold" title="Limite di Quantificazione">
                                                        LOQ: {p.limiteQuantificazione}
                                                      </span>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="p-3 font-bold text-slate-850">
                                                  {rData ? (
                                                    <span className="text-emerald-700 font-extrabold">{rData.valoreRilevato}</span>
                                                  ) : (
                                                    <span className="text-slate-400 italic font-medium flex items-center gap-1">
                                                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping shrink-0"></span>
                                                      In attesa analitica
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="p-3 font-mono text-slate-700">
                                                  {rData ? (rData.incertezza || 'N/D') : '-'}
                                                </td>
                                                <td className="p-3 font-mono text-slate-700">
                                                  {rData ? (rData.ripetibilita || 'N/D') : '-'}
                                                </td>
                                                <td className="p-3 text-slate-500 font-mono">
                                                  {rData ? rData.unitaMisura : '-'}
                                                </td>
                                                <td className="p-3 text-slate-500 font-mono text-[11px] leading-relaxed">
                                                  {rData ? rData.dataAnalisi : '-'}
                                                </td>
                                              </tr>
                                            );
                                          }
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* AZIONI DI GESTIONE */}
                                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                    <div className="flex items-center gap-2">
                                      {isEditing ? (
                                        <>
                                          <button
                                            onClick={() => handleSaveResults(acc)}
                                            className="bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition shadow"
                                          >
                                            <Save className="h-3.5 w-3.5" /> Salva e Completa Analisi
                                          </button>
                                          
                                          <button
                                            onClick={() => handleFillSampleValues(acc)}
                                            className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-2.5 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition shadow"
                                            title="Simula e pre-compila determinazioni analitiche con valori realistici"
                                          >
                                            ⚡ Compila Esempio
                                          </button>

                                          <button
                                            onClick={() => {
                                              setEditingResultsAccId(null);
                                              setTempRisultati({});
                                            }}
                                            className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg px-3 py-2.5 text-xs font-bold transition"
                                          >
                                            Annulla
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          onClick={() => handleStartEditResults(acc)}
                                          className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition shadow"
                                        >
                                          <Pencil className="h-3.5 w-3.5" /> 
                                          {acc.risultatiAnalisi && acc.risultatiAnalisi.length > 0 
                                            ? 'Modifica Risultati' 
                                            : 'Rileva Risultati di Laboratorio'}
                                        </button>
                                      )}
                                    </div>

                                    {/* GENERAZIONE RAPPORTO DI PROVA UFFICIALE */}
                                    {!isEditing && acc.risultatiAnalisi && acc.risultatiAnalisi.length > 0 && (
                                      <button
                                        onClick={() => setPreviewReportAcc(acc)}
                                        className="bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition shadow-sm hover:shadow-md"
                                      >
                                        <Printer className="h-3.5 w-3.5" /> Emetti Rapporto {acc.codiceAccettazione}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE DI ANTEPRIMA DEL RAPPORTO DI PROVA UFFICIALE (RICHIESTA UTENTE) */}
      <AnimatePresence>
        {previewReportAcc && (() => {
          const client = clients.find(c => c.id === previewReportAcc.intestatarioRapportoClienteId);
          const payingClient = clients.find(c => c.id === previewReportAcc.destinatarioFatturaClienteId) || client;
          const resolvedProve = getResolvedProveForAccettazione(previewReportAcc);
          const todayStr = new Date().toLocaleDateString('it-IT');

          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden my-8 flex flex-col max-h-[90vh] border border-slate-200"
              >
                {/* BARRA SUPERIORE STRUMENTI DISPOSITIVO */}
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-500 rounded-lg text-white">
                      <Award className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-350">Preview Rapporto di Prova Ufficiale</h4>
                      <h3 className="font-black text-sm text-white">Certificato N. {previewReportAcc.codiceAccettazione}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const printContent = document.getElementById('lims-printable-area')?.innerHTML;
                        const originalContent = document.body.innerHTML;
                        if (printContent) {
                          // Clean printing approach
                          const win = window.open('', '_blank');
                          if (win) {
                            win.document.write(`
                              <html>
                                <head>
                                  <title>Rapporto di Prova ${previewReportAcc.codiceAccettazione}</title>
                                  <script src="https://cdn.tailwindcss.com"></script>
                                  <style>
                                    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 20px; color: #1e293b; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                    .header-title { font-size: 20px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; letter-spacing: -0.5px; }
                                    .header-sub { font-size: 9px; color: #64748b; text-transform: uppercase; margin-bottom: 20px; }
                                    .grid-info { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 11px; }
                                    .box-info { border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; }
                                    .title-box { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #475569; margin-bottom: 6px; }
                                    .font-bold { font-weight: 700; }
                                    .font-mono { font-family: monospace; }
                                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
                                    th { background-color: #f8fafc; font-weight: 800; border-bottom: 2px solid #94a3b8; text-transform: uppercase; font-size: 9px; padding: 10px; color: #475569; }
                                    td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
                                    .badge { display: inline-block; font-size: 8px; font-weight: bold; border: 1px solid #22c55e; padding: 2px 6px; border-radius: 4px; color: #15803d; text-transform: uppercase; }
                                    .footer-disclaimer { margin-top: 40px; font-size: 9px; color: #64748b; line-height: 1.4; border-top: 1px solid #e2e8f0; padding-top: 15px; }
                                    .signatures { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-top: 50px; font-size: 11px; text-align: center; }
                                    .signature-line { border-top: 1px dashed #94a3b8; margin-top: 50px; padding-top: 6px; color: #475569; }
                                    .accredia-badge { font-weight: 900; color: #1e3a8a; }
                                  </style>
                                </head>
                                <body>
                                  ${printContent}
                                  <script>
                                    window.onload = function() { 
                                      setTimeout(function() {
                                        window.print(); 
                                        window.close(); 
                                      }, 500);
                                    }
                                  </script>
                                </body>
                              </html>
                            `);
                            win.document.close();
                          }
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3.5 py-2 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" /> Stampa Certificato
                    </button>
                    
                    <button
                      onClick={() => setPreviewReportAcc(null)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* AREA DEL CERTIFICATO (Stile Foglio Carta A4) */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-100 flex justify-center">
                  <div 
                    id="lims-printable-area"
                    className="w-full max-w-[210mm] bg-white p-8 md:p-12 border border-slate-300 shadow-lg rounded-sm text-slate-800 text-xs flex flex-col justify-between"
                    style={{ minHeight: '297mm' }}
                  >
                    <div>
                      {/* HEADER PRINCIPALE DEL LABORATORIO */}
                      <div className="border-b-4 border-slate-900 pb-5 mb-6 flex justify-between items-start">
                        <div>
                          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">
                            🔬 ISTITUTO CHIMICO MERCEOLOGICO APULIA
                          </h1>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                            ANALISI AGROALIMENTARI, AMBIENTALI E INDUSTRIALI S.R.L.
                          </p>
                          <p className="text-[9px] text-slate-400 mt-1">
                            Via delle Murge 148, Bari (BA) - Tel. +39 080 549321 | P.IVA: 07412930221 | www.apulianalisi.it
                          </p>
                        </div>
                        
                        {/* Marchio Accredia Autonomo */}
                        <div className="text-right border-l-2 border-slate-200 pl-4">
                          <div className="text-[13px] font-black text-indigo-900 tracking-widest font-mono">
                            LAB N° 0451L
                          </div>
                          <div className="text-[8px] uppercase text-slate-400 font-extrabold tracking-tighter mt-0.5 leading-none">
                            Membro degli Accordi<br />di Mutuo Riconoscimento<br />
                            <span className="text-indigo-800 text-[9px] font-black">EA, IAF e ILAC</span>
                          </div>
                        </div>
                      </div>

                      {/* TITOLO CERTIFICATO */}
                      <div className="text-center bg-slate-950 text-white rounded-lg p-3 mb-6">
                        <h2 className="text-sm font-black uppercase tracking-widest leading-none">
                          Rapporto di Prova Ufficiale
                        </h2>
                        <p className="text-[10px] font-bold text-indigo-300 font-mono mt-1">
                          Certificato di Analisi Chimico-Fisica e Microbiologica con valore legale: {previewReportAcc.codiceAccettazione}
                        </p>
                      </div>

                      {/* ANAGRAFICA E REGISTRO DATI (Richiesta Utente - layout a 3 blocchi per i 14 parametri richiesti) */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-[11px] leading-relaxed">
                        
                        {/* 1) DESTINATARIO FINALE & CLIENTE */}
                        <div className="border border-slate-200 p-4 rounded-xl bg-slate-50/50 space-y-3">
                          <div>
                            <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block mb-1">
                              Destinatario finale
                            </span>
                            {client ? (
                              <div className="space-y-0.5 text-slate-850">
                                <h5 className="font-extrabold text-xs text-indigo-950 tracking-tight">
                                  {previewReportAcc.destinatarioFinale && previewReportAcc.destinatarioFinale !== 'Stesso Committente' 
                                    ? previewReportAcc.destinatarioFinale 
                                    : client.denominazione}
                                </h5>
                                <p className="font-medium text-slate-700">{client.indirizzo}</p>
                                <p className="font-mono text-[9px] text-slate-500">P.IVA: <strong className="text-slate-700">{client.partitaIva}</strong></p>
                                <p className="text-slate-500 text-[10px]">Email: <span className="font-semibold">{client.email}</span></p>
                              </div>
                            ) : (
                              <div className="space-y-0.5 text-slate-850">
                                <h5 className="font-extrabold text-xs text-indigo-955 tracking-tight">
                                  {previewReportAcc.destinatarioFinale || 'N/D'}
                                </h5>
                              </div>
                            )}
                          </div>
                          
                          <div className="border-t border-slate-200/60 pt-2 text-[10px]">
                            <span className="text-slate-450 font-black block text-[8px] uppercase tracking-wider mb-1">
                              Cliente
                            </span>
                            {payingClient ? (
                              <div className="space-y-0.5 text-slate-850">
                                <h5 className="font-extrabold text-xs text-indigo-900 tracking-tight">{payingClient.denominazione}</h5>
                                <p className="font-medium text-slate-700">{payingClient.indirizzo}</p>
                                <p className="font-mono text-[9px] text-slate-500">P.IVA: <strong className="text-slate-700">{payingClient.partitaIva}</strong></p>
                                <p className="text-slate-500 text-[10px]">Email: <span className="font-semibold">{payingClient.email}</span></p>
                              </div>
                            ) : (
                              <p className="text-slate-400 italic">Anagrafica cliente n.d.</p>
                            )}
                          </div>
                        </div>

                        {/* 2) DETTAGLI RICEVIMENTO & CAMPIONAMENTO (LOGISTICA) */}
                        <div className="border border-slate-200 p-4 rounded-xl bg-slate-50/50 space-y-2 flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                              Accettazione LIMS & Logistica
                            </span>
                            <table className="w-full text-left text-[10px] space-y-1">
                              <tbody>
                                <tr>
                                  <td className="p-0 py-0.5 font-bold text-slate-400 w-28 uppercase text-[8px]">Codice Accettazione:</td>
                                  <td className="p-0 py-0.5 font-mono font-black text-indigo-950">{previewReportAcc.codiceAccettazione}</td>
                                </tr>
                                <tr>
                                  <td className="p-0 py-0.5 font-bold text-slate-400 uppercase text-[8px]">Data/Ora Ricevimento:</td>
                                  <td className="p-0 py-0.5 text-slate-800 font-extrabold">{previewReportAcc.dataAccettazione} alle ore {previewReportAcc.oraRicevimento || '10:30'}</td>
                                </tr>
                                <tr>
                                  <td className="p-0 py-0.5 font-bold text-slate-400 uppercase text-[8px]">Campionamento a cura di:</td>
                                  <td className="p-0 py-0.5 text-slate-800 font-extrabold">{previewReportAcc.campionatoDa || 'A cura del Cliente'}</td>
                                </tr>
                                <tr>
                                  <td className="p-0 py-0.5 font-bold text-slate-400 uppercase text-[8px]">Procedura di Campionamento:</td>
                                  <td className="p-0 py-0.5 text-slate-600 italic text-[9px] leading-tight font-medium" title={previewReportAcc.proceduraCampionamento}>
                                    {previewReportAcc.proceduraCampionamento || 'Non dichiarata'}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div className="border-t border-slate-200/60 pt-2 grid grid-cols-2 gap-2 text-[10px]">
                            <div>
                              <span className="text-slate-400 font-bold block text-[8px] uppercase tracking-wider">Data Inizio Prova:</span>
                              <strong className="text-slate-700 block font-mono font-bold">{previewReportAcc.dataInizioProva || previewReportAcc.dataAccettazione}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 font-bold block text-[8px] uppercase tracking-wider">Data Termine Prova:</span>
                              <strong className="text-slate-700 block font-mono font-bold">{previewReportAcc.dataTermineProva || previewReportAcc.consegnaPrevista || '-'}</strong>
                            </div>
                          </div>
                        </div>

                        {/* 3) CARATTERISTICHE TECNICHE E DESCRIZIONE CAMPIONE (LARGHEZZA INTERA) */}
                        <div className="md:col-span-2 border border-slate-200 p-4 rounded-xl bg-slate-50/50 space-y-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                            Caratteristiche Chimico-Fisiche e Identificazione Campione
                          </span>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-700">
                            <div className="md:col-span-2">
                              <span className="text-slate-400 text-[9px] block font-bold uppercase tracking-wider">Descrizione Campione:</span>
                              <strong className="text-indigo-950 font-extrabold text-xs block leading-tight">{previewReportAcc.descrizioneCampione}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[9px] block font-bold uppercase tracking-wider">Categoria Merceologica:</span>
                              <strong className="text-slate-800 font-bold block">{previewReportAcc.categoriaMerceologica || previewReportAcc.matrice}</strong>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[9px] block font-bold uppercase tracking-wider">Quantità Campione:</span>
                              <strong className="text-slate-800 font-bold block text-xs">{previewReportAcc.quantitaCampione}</strong>
                            </div>
                          </div>

                          <div className="border-t border-slate-200/60 pt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-700 text-[10px]">
                            <div>
                              <span className="text-slate-400 text-[9px] block font-bold uppercase tracking-wider">Etichetta Campione:</span>
                              <span className="text-slate-800 font-semibold block text-xs truncate" title={previewReportAcc.etichettaCampione}>
                                {previewReportAcc.etichettaCampione || 'Nessuna etichetta fornita'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[9px] block font-bold uppercase tracking-wider">Imballaggio:</span>
                              <span className="text-slate-800 font-semibold block">{previewReportAcc.imballaggio || 'Bottiglia in vetro scuro'}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[9px] block font-bold uppercase tracking-wider">Valutazione all&apos;accettazione (Stato):</span>
                              <span className={`font-black block uppercase text-[10px] ${previewReportAcc.statoInArrivo === 'Idoneo' ? 'text-emerald-700' : 'text-amber-700'}`}>{previewReportAcc.statoInArrivo}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[9px] block font-bold uppercase tracking-wider">Informazioni dal Cliente:</span>
                              <span className="text-slate-600 block italic truncate font-semibold" title={previewReportAcc.informazioniCliente}>
                                {previewReportAcc.informazioniCliente || 'Non indicate'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* TABELLA DEI RISULTATI ANALITICI REALI */}
                      <div className="mt-4 mb-8">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white font-mono uppercase text-[9px] font-black tracking-wider border-b-2 border-slate-950">
                              <th className="p-3 text-white">Determinazione analitica</th>
                              <th className="p-3 text-white">Metodo di Prova</th>
                              <th className="p-3 text-white text-right">Risultato</th>
                              <th className="p-3 text-white">Incertezza</th>
                              <th className="p-3 text-white">Ripetibilità</th>
                              <th className="p-3 text-white">Unità di misura</th>
                              <th className="p-3 text-white">Data</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resolvedProve.map(p => {
                              const rData = previewReportAcc.risultatiAnalisi?.find(r => r.provaId === p.id);
                              
                              return (
                                <tr key={p.id} className="border-b border-slate-200 font-medium hover:bg-slate-50/50">
                                  <td className="p-3">
                                    <div className="font-extrabold text-slate-900 flex items-center gap-1">
                                      {p.nome}
                                      {p.accreditataAccredia && <span className="text-[10px]" title="Attività accreditata da ACCREDIA">🛡️</span>}
                                    </div>
                                  </td>
                                  <td className="p-3 text-slate-500 font-mono text-[10px]">
                                    <div>{p.metodoAnalitico || 'Metodo Interno'}</div>
                                    {p.limiteQuantificazione && (
                                      <div className="text-[9px] text-amber-800 font-bold bg-amber-50/70 border border-amber-100 rounded px-1.5 py-0.2 mt-1 inline-block font-sans">
                                        LOQ: {p.limiteQuantificazione}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3 text-right font-black text-slate-950 text-xs font-mono">
                                    {rData ? (
                                      <span className="text-slate-950">{rData.valoreRilevato}</span>
                                    ) : (
                                      <span className="text-slate-400 italic font-medium">Non determinata</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-slate-700 font-semibold font-mono">
                                    {rData ? (rData.incertezza || 'N/D') : '-'}
                                  </td>
                                  <td className="p-3 text-slate-700 font-semibold font-mono">
                                    {rData ? (rData.ripetibilita || 'N/D') : '-'}
                                  </td>
                                  <td className="p-3 text-slate-600 font-mono text-[10px]">
                                    {rData ? rData.unitaMisura : '-'}
                                  </td>
                                  <td className="p-3 text-slate-450 font-mono text-[10px]">
                                    {rData ? rData.dataAnalisi : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* DICHIARAZIONI DI LEGGE E NOTE UNI EN ISO/IEC 17025 */}
                      <div className="border border-slate-200 bg-slate-50 text-[9.5px] p-4 rounded-xl leading-relaxed text-slate-500 space-y-1.5">
                        <p className="font-extrabold text-slate-700 flex items-center gap-1 uppercase tracking-wider text-[8px]">
                          <Info className="h-3 w-3 text-indigo-600shrink-0" />
                          Prescrizioni Generali e Clausole di Salvaguardia
                        </p>
                        <p>
                          1. I risultati contenuti nel presente Rapporto di Prova si riferiscono esclusivamente al campione sottoposto a prova così come ricevuto dal laboratorio, contrassegnato con protocollo univoco <strong>{previewReportAcc.codiceAccettazione}</strong>.
                        </p>
                        <p>
                          2. Il presente rapporto non può essere riprodotto parzialmente, salvo approvazione scritta del Laboratorio Certificatore. I campioni privi di riserva vengono conservati nei locali di custodia per un periodo di 15 giorni lavorativi dalla data di firma del presente documento.
                        </p>
                        <p>
                          3. Le determinazioni contrassegnate con il bollino di qualità (<span className="accredia-badge">🛡️ ACCREDIA</span>) sono coperte da accreditamento ai sensi della norma internazionale <strong>UNI EN ISO/IEC 17025</strong>, che ne garantisce l&apos;idoneità tecnica e l&apos;indipendenza giuridico-morale.
                        </p>
                      </div>
                    </div>

                    {/* FIRME AUTOGRAFE PROFESSIONALI */}
                    <div className="grid grid-cols-2 gap-12 mt-12 pt-6 border-t border-slate-200 text-center font-bold text-xs uppercase tracking-wide">
                      <div className="space-y-1 flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 block lowercase tracking-wider mb-2 font-normal">Chimico Analista Responsabile delle Prove</span>
                        {/* Cursive style placeholder signature */}
                        <div className="h-8 flex items-center justify-center font-serif text-indigo-600/80 italic text-lg select-none font-bold pr-4">
                          Dott. Chim. Lupo Francesco
                        </div>
                        <div className="w-48 border-t border-slate-300 mt-2 pt-1 text-[10px] text-slate-600">
                          Iscr. Albo Prof. n° 1482/A
                        </div>
                      </div>

                      <div className="space-y-1 flex flex-col items-center">
                        <span className="text-[10px] text-slate-400 block lowercase tracking-wider mb-2 font-normal">Il Direttore Tecnico del Laboratorio</span>
                        {/* Cursive style placeholder signature */}
                        <div className="h-8 flex items-center justify-center font-serif text-slate-750 italic text-lg select-none font-bold pl-4">
                          Dott.ssa G. Caracciolo
                        </div>
                        <div className="w-48 border-t border-slate-300 mt-2 pt-1 text-[10px] text-slate-600">
                          Direzione Generale L.I.M.S.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* FOOTER DEL MODAL */}
                <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 shrink-0 border-t border-slate-150">
                  <button
                    onClick={() => setPreviewReportAcc(null)}
                    className="bg-slate-250 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 text-xs rounded-xl cursor-pointer transition"
                  >
                    Chiudi Anteprima
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* MODALE DI CAMBIO STATO RAPIDO TRACCIABILE CON PASSWORD */}
      <AnimatePresence>
        {tracingAccId && tracingAccField && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col alert-dialog text-left"
            >
              {/* Header */}
              <div className="bg-slate-950 p-5 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                    🔐 Cambio Stato Tracciabile
                  </h3>
                  <p className="text-[10px] text-slate-300 font-medium">LIMS Security & Integrity Audit Trail</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTracingAccId(null);
                    setTracingAccField(null);
                  }}
                  className="p-1 px-2.5 rounded-lg bg-slate-800 text-slate-350 hover:bg-slate-700 text-xs font-bold font-mono transition cursor-pointer"
                >
                  ESC
                </button>
              </div>

              {/* Form Content */}
              <div className="p-5 space-y-4 text-xs">
                {/* Specifiche del Campione */}
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                  <span className="font-bold text-slate-500">Campione:</span>
                  <span className="font-extrabold text-slate-900">
                    {accettazioni.find(a => a.id === tracingAccId)?.codiceAccettazione}
                  </span>
                </div>

                {/* Seleziona Nuovo Stato */}
                <div className="space-y-1.5">
                  <label className="block font-black text-slate-500 uppercase text-[9px] tracking-widest">
                    Seleziona Nuovo Stato (*):
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {tracingAccField === 'analisiStato' ? (
                      [
                        { val: 'In Attesa', label: '⏳ In Attesa' },
                        { val: 'In Corso', label: '🧪 In Corso' },
                        { val: 'Completato', label: '✅ Completato' },
                        { val: 'Annullato', label: '❌ Annullato' }
                      ].map(st => (
                        <button
                          key={st.val}
                          type="button"
                          onClick={() => setTracingSelectedAccStatus(st.val as any)}
                          className={`p-2.5 rounded-xl border text-center font-bold tracking-wide text-[11px] transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            tracingSelectedAccStatus === st.val
                              ? 'bg-slate-950 text-white border-slate-950 shadow-md'
                              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))
                    ) : (
                      [
                        { val: 'Idoneo', label: '✅ Idoneo' },
                        { val: 'Non Idoneo', label: '❌ Non Idoneo' },
                        { val: 'Accettato con Riserva', label: '⚠️ Con Riserva' }
                      ].map(st => (
                        <button
                          key={st.val}
                          type="button"
                          onClick={() => setTracingSelectedAccStatus(st.val as any)}
                          className={`p-2.5 rounded-xl border text-center font-bold tracking-wide text-[11px] transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            tracingSelectedAccStatus === st.val
                              ? 'bg-slate-950 text-white border-slate-950 shadow-md'
                              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Selezione Operatore */}
                <div className="space-y-2">
                  <label className="block font-black text-slate-500 uppercase text-[9px] tracking-widest">
                    Operatore Modificatore (*):
                  </label>
                  <select
                    value={tracingAccOperator}
                    onChange={(e) => {
                      setTracingAccOperator(e.target.value);
                      setTracingAccPassword('');
                      setTracingAccError(null);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    {operators && operators.length > 0 ? (
                      operators.map(op => (
                        <option key={op.nome} value={op.nome}>{op.nome} ({op.ruolo})</option>
                      ))
                    ) : (
                      <>
                        <option value="Dott. Chim. F. Lupo">Dott. Chim. F. Lupo (Biochem)</option>
                        <option value="Dott.ssa S. Bianchi">Dott.ssa S. Bianchi (Lab Tech)</option>
                        <option value="Dott. R. Vitale">Dott. R. Vitale (emcvit@gmail.com)</option>
                      </>
                    )}
                    <option value="Altro">Altro operatore (manuale)</option>
                  </select>

                  {tracingAccOperator === 'Altro' && (
                    <input
                      type="text"
                      value={tracingAccCustomOperator}
                      onChange={(e) => setTracingAccCustomOperator(e.target.value)}
                      placeholder="Nome e Cognome operatore..."
                      className="w-full bg-white border border-slate-250 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 mt-1.5 animate-fadeIn"
                      required
                    />
                  )}

                  {/* Password di Sicurezza */}
                  <div className="space-y-1.5 mt-2">
                    <label className="block font-black text-slate-500 uppercase text-[9px] tracking-widest flex justify-between">
                      <span>Password Sicurezza (*):</span>
                      <span className="text-[8.5px] text-slate-400 normal-case font-normal">Es: lupo123, bianchi123, vitale123, lims123</span>
                    </label>
                    <input
                      type="password"
                      value={tracingAccPassword}
                      onChange={(e) => {
                        setTracingAccPassword(e.target.value);
                        if (tracingAccError) setTracingAccError(null);
                      }}
                      placeholder="Inserisci la tua password..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950"
                      required
                    />
                  </div>

                  {tracingAccError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-semibold text-rose-700 animate-fadeIn text-left">
                      ⚠️ {tracingAccError}
                    </div>
                  )}
                </div>

                {/* TIMESTAMP AUTOMATICO */}
                <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl text-[10.5px] leading-normal text-indigo-950 flex items-start gap-2">
                  <Clock className="h-4 w-4 text-indigo-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Marcatura Temporale Audit LIMS:</strong>
                    <p className="text-slate-500 font-mono font-semibold mt-0.5">{new Date().toLocaleString('it-IT')}</p>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTracingAccId(null);
                    setTracingAccField(null);
                  }}
                  className="flex-1 p-2.5 rounded-xl border border-slate-200 text-slate-650 font-bold hover:bg-slate-100 transition text-xs cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAccStatusChange}
                  className="flex-1 p-2.5 rounded-xl bg-slate-950 text-white font-bold hover:bg-slate-900 transition shadow-md text-xs cursor-pointer"
                >
                  Firma e Conferma
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
