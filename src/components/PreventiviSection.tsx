import React, { useState } from 'react';
import { Preventivo, Pacchetto, Client, Prova, Operator } from '../types';
import { Plus, Search, FileText, CheckCircle2, XCircle, Clock, ShoppingBag, Trash2, Tag, Calendar, ChevronRight, Calculator, Download, Pencil, Eye, EyeOff, ChevronUp, ChevronDown, Printer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PreventiviSectionProps {
  preventivi: Preventivo[];
  pacchetti: Pacchetto[];
  clients: Client[];
  prove: Prova[];
  onAddPreventivo: (newPrev: Preventivo) => void;
  onAddPacchetto: (newPack: Pacchetto) => void;
  onUpdatePacchetto: (updatedPack: Pacchetto) => void;
  onDeletePreventivo: (id: string) => void;
  onDeletePacchetto: (id: string) => void;
  onGoToProva?: (id: string) => void;
  operators?: Operator[];
}

export function PreventiviSection({
  preventivi,
  pacchetti,
  clients,
  prove,
  onAddPreventivo,
  onAddPacchetto,
  onUpdatePacchetto,
  onDeletePreventivo,
  onDeletePacchetto,
  onGoToProva,
  operators
}: PreventiviSectionProps) {
  const [activeTab, setActiveTab] = useState<'preventivi' | 'pacchetti'>('preventivi');
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [showAddPackage, setShowAddPackage] = useState(false);

  // States per Tracciabilità Cambio Stato Preventivo
  const [tracingQuoteStatusId, setTracingQuoteStatusId] = useState<string | null>(null);
  const [tracingSelectedStatus, setTracingSelectedStatus] = useState<'In Approvazione' | 'Approvato' | 'Fatturato' | 'Rifiutato'>('In Approvazione');
  const [tracingOperator, setTracingOperator] = useState<string>(() => {
    return operators && operators.length > 0 ? operators[0].nome : 'Dott. Chim. F. Lupo';
  });
  const [tracingCustomOperator, setTracingCustomOperator] = useState<string>('');
  const [tracingPassword, setTracingPassword] = useState<string>('');
  const [tracingError, setTracingError] = useState<string | null>(null);

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

  // States per NUOVO PACCHETTO
  const [packageName, setPackageName] = useState('');
  const [packageDesc, setPackageDesc] = useState('');
  const [packageCategory, setPackageCategory] = useState('Oli e Grassi');
  const [selectedPackProve, setSelectedPackProve] = useState<string[]>([]);
  const [packagePrice, setPackagePrice] = useState('');
  const [editingPacchetto, setEditingPacchetto] = useState<Pacchetto | null>(null);

  // States per NUOVO/MODIFICATO PREVENTIVO
  const [editingPreventivo, setEditingPreventivo] = useState<Preventivo | null>(null);
  const [nascondiPrezziSingoli, setNascondiPrezziSingoli] = useState<boolean>(false);
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [printPreviewQuote, setPrintPreviewQuote] = useState<Preventivo | null>(null);

  const [quoteClienteId, setQuoteClienteId] = useState(clients[0]?.id || '');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteQualityNote, setQuoteQualityNote] = useState('');
  const [quoteDiscount, setQuoteDiscount] = useState<number>(0);
  const [quoteCategoryFilter, setQuoteCategoryFilter] = useState<string>('Tutte');
  // Righe aggiunte individualmente nel preventivo
  const [selectedQuoteProve, setSelectedQuoteProve] = useState<Array<{ provaId: string; quantita: number; prezzoApplicato: number }>>([]);
  const [selectedQuotePacchetti, setSelectedQuotePacchetti] = useState<Array<{ pacchettoId: string; quantita: number; prezzoApplicato: number }>>([]);

  const handleOpenEditPreventivo = (prev: Preventivo) => {
    setEditingPreventivo(prev);
    setQuoteClienteId(prev.clienteId);
    setQuoteNotes(prev.note || '');
    setQuoteQualityNote(prev.notaQualitaPersonalizzata || '');
    setQuoteDiscount(prev.scontoPercentuale || 0);
    setSelectedQuoteProve(prev.proveSelezionate || []);
    setSelectedQuotePacchetti(prev.pacchettiSelezionati || []);
    setNascondiPrezziSingoli(prev.nascondiPrezziSingoli || false);
    setQuoteCategoryFilter('Tutte');
    setShowAddPackage(false);
    setShowAddQuote(true);
  };

  const handleOpenEditPacchetto = (pack: Pacchetto) => {
    setEditingPacchetto(pack);
    setPackageName(pack.nome);
    setPackageDesc(pack.descrizione || '');
    setPackageCategory(pack.categoriaMerceologica || 'Oli e Grassi');
    setSelectedPackProve(pack.proveIds);
    setPackagePrice(pack.prezzoScontato.toString());
    setShowAddQuote(false);
    setShowAddPackage(true);
    // scorriamo l'utente in cima alla pagina per vedere il form chiaramente
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calcolo totale dinamico per Nuovo Preventivo
  const calcolaImponibileQuote = () => {
    const totProve = selectedQuoteProve.reduce((sum, item) => sum + (item.quantita * item.prezzoApplicato), 0);
    const totPacks = selectedQuotePacchetti.reduce((sum, item) => sum + (item.quantita * item.prezzoApplicato), 0);
    return totProve + totPacks;
  };

  const calcolaTotalePreventivo = () => {
    const imp = calcolaImponibileQuote();
    const sc = (imp * (quoteDiscount || 0)) / 100;
    return Math.max(0, imp - sc);
  };

  // Helper per ottenere informazioni collegate
  const getClienteName = (id: string) => {
    return clients.find(c => c.id === id)?.denominazione || 'Cliente sconosciuto';
  };

  const getProvaInfo = (id: string) => {
    return prove.find(p => p.id === id);
  };

  const getPacchettoInfo = (id: string) => {
    return pacchetti.find(p => p.id === id);
  };

  // Inserimento o modifica del pacchetto nel sistema
  const handleSubmitPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageName.trim() || selectedPackProve.length === 0 || !packagePrice) return;

    if (editingPacchetto) {
      const updatedPack: Pacchetto = {
        ...editingPacchetto,
        nome: packageName.trim(),
        descrizione: packageDesc.trim(),
        categoriaMerceologica: packageCategory,
        proveIds: selectedPackProve,
        prezzoScontato: parseFloat(packagePrice) || 0
      };
      onUpdatePacchetto(updatedPack);
    } else {
      const newPack: Pacchetto = {
        id: 'pa_' + Date.now(),
        nome: packageName.trim(),
        descrizione: packageDesc.trim(),
        categoriaMerceologica: packageCategory,
        proveIds: selectedPackProve,
        prezzoScontato: parseFloat(packagePrice) || 0
      };
      onAddPacchetto(newPack);
    }

    // Reset Form Pacchetto
    setPackageName('');
    setPackageDesc('');
    setSelectedPackProve([]);
    setPackagePrice('');
    setEditingPacchetto(null);
    setShowAddPackage(false);
  };

  // Inserimento nuovo preventivo nel sistema
  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteClienteId) return;
    if (selectedQuoteProve.length === 0 && selectedQuotePacchetti.length === 0) {
      alert("Seleziona almeno una prova o un pacchetto per compilare il preventivo!");
      return;
    }

    const totalCalculated = calcolaTotalePreventivo();

    let finalPrev: Preventivo;
    if (editingPreventivo) {
      finalPrev = {
        ...editingPreventivo,
        clienteId: quoteClienteId,
        proveSelezionate: selectedQuoteProve,
        pacchettiSelezionati: selectedQuotePacchetti,
        totale: totalCalculated,
        scontoPercentuale: quoteDiscount || 0,
        nascondiPrezziSingoli: nascondiPrezziSingoli,
        note: quoteNotes.trim() || undefined,
        notaQualitaPersonalizzata: quoteQualityNote.trim() || undefined
      };
    } else {
      const codiceAnno = new Date().getFullYear();
      const numeroProgressivo = preventivi.length + 1;
      const formattedCodice = `PREV-${codiceAnno}-${String(numeroProgressivo).padStart(3, '0')}`;

      finalPrev = {
        id: 'pr_' + Date.now(),
        codice: formattedCodice,
        clienteId: quoteClienteId,
        dataCreazione: new Date().toISOString().split('T')[0],
        stato: 'In Approvazione',
        proveSelezionate: selectedQuoteProve,
        pacchettiSelezionati: selectedQuotePacchetti,
        totale: totalCalculated,
        scontoPercentuale: quoteDiscount || 0,
        nascondiPrezziSingoli: nascondiPrezziSingoli,
        note: quoteNotes.trim() || undefined,
        notaQualitaPersonalizzata: quoteQualityNote.trim() || undefined
      };
    }

    onAddPreventivo(finalPrev);

    // Reset Form Preventivo
    setQuoteClienteId(clients[0]?.id || '');
    setQuoteNotes('');
    setQuoteQualityNote('');
    setQuoteDiscount(0);
    setNascondiPrezziSingoli(false);
    setQuoteCategoryFilter('Tutte');
    setSelectedQuoteProve([]);
    setSelectedQuotePacchetti([]);
    setEditingPreventivo(null);
    setShowAddQuote(false);
  };

  // Gestione prove selezionate nel Costruttore di Preventivi
  const handleAddProvaToQuote = (provaId: string) => {
    const giaIncluso = selectedQuoteProve.find(p => p.provaId === provaId);
    if (giaIncluso) {
      // Incrementa quantità
      setSelectedQuoteProve(selectedQuoteProve.map(p =>
        p.provaId === provaId ? { ...p, quantita: p.quantita + 1 } : p
      ));
    } else {
      const defaultPrice = getProvaInfo(provaId)?.prezzoListino || 0;
      setSelectedQuoteProve([...selectedQuoteProve, { provaId, quantita: 1, prezzoApplicato: defaultPrice }]);
    }
  };

  const handleRemoveProvaFromQuote = (provaId: string) => {
    setSelectedQuoteProve(selectedQuoteProve.filter(p => p.provaId !== provaId));
  };

  const handleUpdateProvaQty = (provaId: string, qty: number) => {
    if (qty < 1) return;
    setSelectedQuoteProve(selectedQuoteProve.map(p =>
      p.provaId === provaId ? { ...p, quantita: qty } : p
    ));
  };

  const handleUpdateProvaPrice = (provaId: string, prezzo: number) => {
    setSelectedQuoteProve(selectedQuoteProve.map(p =>
      p.provaId === provaId ? { ...p, prezzoApplicato: prezzo } : p
    ));
  };

  // Gestione pacchetti selezionati nel Costruttore di Preventivi
  const handleAddPacchettoToQuote = (pacchettoId: string) => {
    const giaIncluso = selectedQuotePacchetti.find(p => p.pacchettoId === pacchettoId);
    if (giaIncluso) {
      setSelectedQuotePacchetti(selectedQuotePacchetti.map(p =>
        p.pacchettoId === pacchettoId ? { ...p, quantita: p.quantita + 1 } : p
      ));
    } else {
      const defaultPrice = getPacchettoInfo(pacchettoId)?.prezzoScontato || 0;
      setSelectedQuotePacchetti([...selectedQuotePacchetti, { pacchettoId, quantita: 1, prezzoApplicato: defaultPrice }]);
    }
  };

  const handleRemovePacchettoFromQuote = (pacchettoId: string) => {
    setSelectedQuotePacchetti(selectedQuotePacchetti.filter(p => p.pacchettoId !== pacchettoId));
  };

  const handleUpdatePacchettoQty = (pacchettoId: string, qty: number) => {
    if (qty < 1) return;
    setSelectedQuotePacchetti(selectedQuotePacchetti.map(p =>
      p.pacchettoId === pacchettoId ? { ...p, quantita: qty } : p
    ));
  };

  // Modifica di stato per i preventivi con Tracciabilità Auditing
  const handleToggleState = (quoteId: string, currentStatus: string) => {
    setTracingQuoteStatusId(quoteId);
    setTracingSelectedStatus(currentStatus as any);
    setTracingPassword('');
    setTracingError(null);
    const foundQuote = preventivi.find(q => q.id === quoteId);
    
    const knownOperators = operators && operators.length > 0 
      ? operators.map(op => op.nome) 
      : ['Dott. Chim. F. Lupo', 'Dott.ssa S. Bianchi', 'Dott. R. Vitale'];
    const defaultOperator = operators && operators.length > 0
      ? operators[0].nome
      : 'Dott. Chim. F. Lupo';

    if (foundQuote && foundQuote.statoHistory && foundQuote.statoHistory.length > 0) {
      // Proponi l'ultimo operatore usato o quello di default
      const lastOp = foundQuote.statoHistory[foundQuote.statoHistory.length - 1].operatore;
      if (knownOperators.includes(lastOp)) {
        setTracingOperator(lastOp);
        setTracingCustomOperator('');
      } else {
        setTracingOperator('Altro');
        setTracingCustomOperator(lastOp);
      }
    } else {
      setTracingOperator(defaultOperator);
      setTracingCustomOperator('');
    }
  };

  const handleConfirmStatusChange = () => {
    if (!tracingQuoteStatusId) return;
    const foundQuote = preventivi.find(q => q.id === tracingQuoteStatusId);
    if (!foundQuote) return;

    // Verifica Password dell'operatore
    const reqPass = OPERATOR_PASSWORDS[tracingOperator] || 'lims123';
    if (tracingPassword !== reqPass) {
      setTracingError(`PIN/Password non valida per l'operatore selezionato.`);
      return;
    }

    const op = tracingOperator === 'Altro' ? (tracingCustomOperator.trim() || 'Operatore Generico') : tracingOperator;
    const now = new Date();
    const formattedDate = now.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const newLog = {
      statoPrecedente: foundQuote.stato,
      statoNuovo: tracingSelectedStatus,
      dataOra: formattedDate,
      operatore: op
    };

    const history = foundQuote.statoHistory ? [...foundQuote.statoHistory, newLog] : [newLog];

    const updated: Preventivo = {
      ...foundQuote,
      stato: tracingSelectedStatus,
      statoHistory: history
    };

    onAddPreventivo(updated);
    setTracingQuoteStatusId(null);
    setTracingCustomOperator('');
    setTracingPassword('');
    setTracingError(null);
  };

  // Esportazione dei dati della prova in formato testuale CSV
  const handleExportCSV = (prev: Preventivo) => {
    const cliente = getClienteName(prev.clienteId);
    
    // Colonne intestazione
    const headers = [
      'Codice Preventivo',
      'Cliente',
      'Data Emissione',
      'Tipologia',
      'Nome della Prova / Pacchetto',
      'Metodo / Dettagli',
      'Tempo Esecuzione (Giorni)',
      'Quantita',
      'Prezzo Unitario (€)',
      'Prezzo Totale (€)'
    ];

    const rows: string[][] = [];

    const isPriceHidden = prev.nascondiPrezziSingoli && (prev.proveSelezionate.length + prev.pacchettiSelezionati.length) > 1;

    // 1. Processa le singole prove selezionate
    prev.proveSelezionate.forEach(item => {
      const pInfo = getProvaInfo(item.provaId);
      rows.push([
        prev.codice,
        cliente,
        prev.dataCreazione,
        'Prova Singola',
        pInfo?.nome ? (pInfo.accreditataAccredia ? `${pInfo.nome} (Accreditata ACCREDIA)` : pInfo.nome) : 'n/d',
        pInfo?.metodoAnalitico || 'n/d',
        pInfo?.tempoEsecuzioneGiorni?.toString() || 'n/d',
        item.quantita.toString(),
        isPriceHidden ? 'Incluso nel totale' : item.prezzoApplicato.toFixed(2),
        isPriceHidden ? 'Incluso nel totale' : (item.quantita * item.prezzoApplicato).toFixed(2)
      ]);
    });

    // 2. Processa i pacchetti aggiunti
    prev.pacchettiSelezionati.forEach(item => {
      const packInfo = getPacchettoInfo(item.pacchettoId);
      rows.push([
        prev.codice,
        cliente,
        prev.dataCreazione,
        'Pacchetto',
        packInfo?.nome || 'n/d',
        packInfo?.descrizione || 'n/d',
        'Varia',
        item.quantita.toString(),
        isPriceHidden ? 'Incluso nel totale' : item.prezzoApplicato.toFixed(2),
        isPriceHidden ? 'Incluso nel totale' : (item.quantita * item.prezzoApplicato).toFixed(2)
      ]);
      
      // Sotto-voci: elenca anche le singole prove del pacchetto per trasparenza
      packInfo?.proveIds.forEach(pId => {
        const pInfo = getProvaInfo(pId);
        rows.push([
          prev.codice,
          cliente,
          prev.dataCreazione,
          `  └─ Prova inclusa in ${packInfo.nome}`,
          pInfo?.nome ? (pInfo.accreditataAccredia ? `${pInfo.nome} (Accreditata ACCREDIA)` : pInfo.nome) : 'n/d',
          pInfo?.metodoAnalitico || 'n/d',
          pInfo?.tempoEsecuzioneGiorni?.toString() || 'n/d',
          item.quantita.toString(),
          '0.00',
          '0.00'
        ]);
      });
    });

    // Riga per il totale
    rows.push([]);
    if (prev.scontoPercentuale && prev.scontoPercentuale > 0) {
      const imponibile = prev.totale / (1 - prev.scontoPercentuale / 100);
      rows.push([
        'IMPONIBILE LORDO',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        imponibile.toFixed(2)
      ]);
      rows.push([
        `SCONTO APPLICATO (${prev.scontoPercentuale}%)`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        `-${(imponibile - prev.totale).toFixed(2)}`
      ]);
    }
    rows.push([
      'TOTALE NETTO PREVENTIVATO',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      prev.totale.toFixed(2)
    ]);

    if (prev.note) {
      rows.push([]);
      rows.push(['Note del Preventivo:', prev.note]);
    }

    // Costruzione CSV con codifica UTF-8 BOM per visualizzazione corretta in MS Excel
    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(';'),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';'))
    ].join('\r\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${prev.codice}_esportazione.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Selettore Tab Superiore */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex gap-1 bg-slate-100 p-1.5 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => { setActiveTab('preventivi'); setShowAddQuote(false); setShowAddPackage(false); }}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'preventivi'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="h-4 w-4 text-blue-500" />
            Preventivi Emessi
          </button>
          <button
            onClick={() => { setActiveTab('pacchetti'); setShowAddQuote(false); setShowAddPackage(false); }}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'pacchetti'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="h-4 w-4 text-purple-500" />
            Pacchetti Analisi
          </button>
        </div>

        {activeTab === 'preventivi' ? (
          <button
            onClick={() => setShowAddQuote(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg px-4 py-2 flex items-center justify-center gap-1.5 transition shadow"
            id="btn-new-preventivo"
          >
            <Plus className="h-4 w-4" /> Componi Preventivo
          </button>
        ) : (
          <button
            onClick={() => setShowAddPackage(true)}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg px-4 py-2 flex items-center justify-center gap-1.5 transition shadow"
            id="btn-new-pacchetto"
          >
            <Plus className="h-4 w-4" /> Crea Pacchetto Standard
          </button>
        )}
      </div>

      {/* Sezione Contenuto */}
      <AnimatePresence mode="wait">
        
        {/* FORM REGISTRAZIONE / COMPILAZIONE PREVENTIVO */}
        {showAddQuote && activeTab === 'preventivi' ? (
          <motion.div
            key="add-quote"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-md grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Colonna Sinistra del Form: Scelta Cliente e Prodotti */}
            <div className="lg:col-span-7 space-y-4">
              <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
                <h4 className="font-extrabold text-slate-800">
                  {editingPreventivo ? `Modifica Preventivo: ${editingPreventivo.codice}` : 'Composizione Guidata Preventivo Analitico'}
                </h4>
                <button
                  onClick={() => {
                    setShowAddQuote(false);
                    setEditingPreventivo(null);
                    setQuoteClienteId(clients[0]?.id || '');
                    setQuoteNotes('');
                    setQuoteQualityNote('');
                    setQuoteDiscount(0);
                    setNascondiPrezziSingoli(false);
                    setSelectedQuoteProve([]);
                    setSelectedQuotePacchetti([]);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  Indietro alla lista
                </button>
              </div>

              {/* Box Cliente */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Cliente Committente
                </label>
                <select
                  value={quoteClienteId}
                  onChange={(e) => setQuoteClienteId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">-- Seleziona un cliente dall'anagrafica --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.denominazione}</option>
                  ))}
                </select>
              </div>

              {/* Selettori rapidi prove con scelta categoria preventiva */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 p-2.5 bg-slate-50 border border-slate-150 rounded-lg">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">
                      Filtra per Area/Categoria:
                    </label>
                    <p className="text-[10px] text-slate-400">Scegli la categoria prima di selezionare le prove</p>
                  </div>
                  <select
                    value={quoteCategoryFilter}
                    onChange={(e) => setQuoteCategoryFilter(e.target.value)}
                    className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-705 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer min-w-[200px]"
                  >
                    <option value="Tutte">📂 Tutte le Categorie ({prove.length})</option>
                    {Array.from(new Set(prove.map(p => p.categoriaMerceologica))).map(cat => (
                      <option key={cat} value={cat}>🔬 {cat}</option>
                    ))}
                  </select>
                </div>

                <span className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Aggiungi Prove Analitiche Individuali
                </span>
                <div className="max-h-48 overflow-y-auto border border-slate-150 rounded-lg p-2 bg-slate-50/50 space-y-1">
                  {prove
                    .filter(pr => quoteCategoryFilter === 'Tutte' || pr.categoriaMerceologica === quoteCategoryFilter)
                    .map(pr => (
                      <div
                        key={pr.id}
                        onClick={() => handleAddProvaToQuote(pr.id)}
                        className={`flex justify-between items-center p-2 rounded hover:bg-white border cursor-pointer transition text-xs ${
                          pr.accreditataAccredia 
                            ? 'border-emerald-100/50 hover:border-emerald-250 bg-emerald-50/15' 
                            : 'border-transparent hover:border-slate-100'
                        }`}
                      >
                        <div className="font-semibold text-slate-705 flex items-center gap-1.5">
                          {pr.nome}
                          {pr.accreditataAccredia && (
                            <span className="px-1.5 py-0.2 bg-emerald-100/70 border border-emerald-300 text-emerald-800 rounded font-black text-[8px] uppercase tracking-wider" title="Metodo Accreditato ACCREDIA">
                              🛡️ Accredia
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono text-[10px]">({pr.categoriaMerceologica})</span>
                          <span className="text-emerald-700 font-bold">€{pr.prezzoListino.toFixed(2)}</span>
                          <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[9px] font-bold">+ Aggiungi</span>
                        </div>
                      </div>
                    ))}
                  {prove.filter(pr => quoteCategoryFilter === 'Tutte' || pr.categoriaMerceologica === quoteCategoryFilter).length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      Nessuna prova in questa categoria.
                    </div>
                  )}
                </div>
              </div>

              {/* Selettori rapidi pacchetti */}
              {pacchetti.length > 0 && (
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    Oppure Seleziona un Pacchetto Preformato (Scontato)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {pacchetti.map(pa => (
                      <div
                        key={pa.id}
                        onClick={() => handleAddPacchettoToQuote(pa.id)}
                        className="bg-purple-50/40 hover:bg-purple-50/90 border border-purple-100 rounded-lg p-3 cursor-pointer transition text-xs flex justify-between items-center"
                      >
                        <div>
                          <div className="font-bold text-purple-950">{pa.nome}</div>
                          <div className="text-[10px] text-purple-600 mt-1">{pa.proveIds.length} prove incluse</div>
                        </div>
                        <div className="text-right">
                          <div className="font-extrabold text-purple-800">€{pa.prezzoScontato.toFixed(2)}</div>
                          <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded font-bold">Aggiungi</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Note specifiche per il preventivo (es. sconti extra, tempistiche di consegna campioni)
                </label>
                <textarea
                  rows={2}
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder="Scrivi qui eventuali condizioni speciali concordate..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Dichiarazione / Nota di Qualità ACCREDIA Personalizzata
                </label>
                <p className="text-[10px] text-slate-400 mb-1 leading-relaxed">
                  Trascrivi una dicitura personalizzata per attestare la qualità. Se omessa, il preventivo riporterà in automatico la dicitura standard di conformità UNI EN ISO/IEC 17025.
                </p>
                <textarea
                  rows={2}
                  value={quoteQualityNote}
                  onChange={(e) => setQuoteQualityNote(e.target.value)}
                  placeholder="Se vuoto, mostra: Le analisi contrassegnate con il marchio ACCREDIA sono coperte da accreditamento..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none bg-emerald-50/10 focus:border-emerald-350"
                ></textarea>
              </div>

            </div>

            {/* Colonna Destra del Form: Carrello dinamico / Calcolo totale */}
            <div className="lg:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col justify-between">
              <div>
                <h5 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Calculator className="h-4 w-4 text-blue-500" />
                  Riepilogo Costi Calcolati
                </h5>

                {/* Lista carrello prove */}
                {selectedQuoteProve.length === 0 && selectedQuotePacchetti.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs">
                    Nessun servizio selezionato. Fai click sulle prove o sui pacchetti a sinistra per popolare il preventivo.
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                    {/* Prove nel carrello */}
                    {selectedQuoteProve.map(item => {
                      const info = getProvaInfo(item.provaId);
                      return (
                        <div key={item.provaId} className={`p-2.5 rounded-lg border shadow-sm text-xs space-y-2 ${
                          info?.accreditataAccredia 
                            ? 'bg-emerald-50/15 border-emerald-150 shadow-emerald-50/10' 
                            : 'bg-white border-slate-150'
                        }`}>
                          <div className="flex justify-between font-bold text-slate-700">
                            <span className="truncate max-w-[200px] flex items-center gap-1.5">
                              {info?.nome || 'Prova'}
                              {info?.accreditataAccredia && (
                                <span className="px-1.5 py-0.2 bg-emerald-100/70 text-emerald-800 text-[8px] rounded font-black tracking-wider uppercase border border-emerald-250">
                                  🛡️ Accredia
                                </span>
                              )}
                            </span>
                            <button
                              onClick={() => handleRemoveProvaFromQuote(item.provaId)}
                              className="text-red-500 hover:text-red-700 font-bold"
                            >
                              ×
                            </button>
                          </div>
                          <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400">Q.ta campioni:</span>
                              <input
                                type="number"
                                min="1"
                                value={item.quantita}
                                onChange={(e) => handleUpdateProvaQty(item.provaId, parseInt(e.target.value) || 1)}
                                className="w-10 text-center border rounded bg-slate-50 text-xs font-bold leading-tight"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400">Prezzo cad:</span>
                              <input
                                type="number"
                                step="0.5"
                                value={item.prezzoApplicato}
                                onChange={(e) => handleUpdateProvaPrice(item.provaId, parseFloat(e.target.value) || 0)}
                                className="w-16 text-center border rounded bg-slate-50 text-xs font-bold leading-tight"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Pacchetti nel carrello */}
                    {selectedQuotePacchetti.map(item => {
                      const info = getPacchettoInfo(item.pacchettoId);
                      return (
                        <div key={item.pacchettoId} className="bg-purple-50/50 p-2.5 rounded-lg border border-purple-150 text-xs space-y-2">
                          <div className="flex justify-between font-bold text-purple-950">
                            <span className="truncate max-w-[200px]">{info?.nome || 'Pacchetto'}</span>
                            <button
                              onClick={() => handleRemovePacchettoFromQuote(item.pacchettoId)}
                              className="text-purple-600 hover:text-purple-900 font-bold"
                            >
                              ×
                            </button>
                          </div>
                          <div className="flex justify-between items-center pt-1.5 border-t border-purple-100 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-purple-700">Q.ta:</span>
                              <input
                                type="number"
                                min="1"
                                value={item.quantita}
                                onChange={(e) => handleUpdatePacchettoQty(item.pacchettoId, parseInt(e.target.value) || 1)}
                                className="w-10 text-center border rounded bg-white text-xs font-bold leading-tight"
                              />
                            </div>
                            <div className="text-right">
                              <span className="text-slate-400 mr-2">Totale pacchetto:</span>
                              <span className="font-extrabold text-purple-900">€{(item.quantita * item.prezzoApplicato).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Box Calcolatore Finale delle tasse ed invio */}
              <div className="mt-4 pt-3 border-t border-slate-200 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase">Totale Imponibile:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    €{calcolaImponibileQuote().toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Sconto Input */}
                <div className="flex items-center justify-between gap-4 bg-slate-100/60 p-2.5 rounded-lg border border-slate-150 text-xs">
                  <span className="font-bold text-slate-600 flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5 text-blue-500" /> Sconto Cliente (%):
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={quoteDiscount || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setQuoteDiscount(isNaN(val) ? 0 : Math.max(0, Math.min(100, val)));
                      }}
                      className="w-14 px-1.5 py-1 text-center bg-white border border-slate-250 rounded font-bold text-slate-700 font-sans text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="font-bold text-slate-500">%</span>
                  </div>
                </div>

                {/* Opzione nascondi prezzi singole prove (se prove > 1) */}
                {selectedQuoteProve.length > 1 && (
                  <div className="flex items-center justify-between gap-4 bg-slate-105 p-2.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
                    <span className="font-bold text-slate-600 flex items-center gap-1.5">
                      <EyeOff className="h-3.5 w-3.5 text-indigo-505" /> Nascondi costi singoli prove:
                    </span>
                    <input
                      type="checkbox"
                      checked={nascondiPrezziSingoli}
                      onChange={(e) => setNascondiPrezziSingoli(e.target.checked)}
                      className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                    />
                  </div>
                )}

                {quoteDiscount > 0 && (
                  <div className="flex justify-between items-center text-xs text-rose-600 font-bold px-1">
                    <span>Valore Sconto ({quoteDiscount}%):</span>
                    <span>
                      -€{((calcolaImponibileQuote() * quoteDiscount) / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="font-extrabold text-slate-700 text-xs uppercase">Importo Netto Finale:</span>
                  <span className="font-black text-lg text-slate-900 font-mono">
                    €{calcolaTotalePreventivo().toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddQuote(false);
                      setEditingPreventivo(null);
                      setQuoteClienteId(clients[0]?.id || '');
                      setQuoteNotes('');
                      setQuoteDiscount(0);
                      setNascondiPrezziSingoli(false);
                      setSelectedQuoteProve([]);
                      setSelectedQuotePacchetti([]);
                    }}
                    className="py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-bold transition hover:bg-white cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitQuote}
                    className="py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow cursor-pointer"
                    id="btn-registra-preventivo"
                  >
                    {editingPreventivo ? 'Salva Modifiche' : 'Emetti ed Invia'}
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        ) : showAddPackage && activeTab === 'pacchetti' ? (
          /* FORM CREAZIONE NUOVO PACCHETTO STANDARD */
          <motion.div
            key="add-package"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-md max-w-2xl mx-auto"
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-800">
                {editingPacchetto ? `Modifica Pacchetto Standard: ${editingPacchetto.nome}` : 'Crea un Nuovo Pacchetto Analitico Standard'}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowAddPackage(false);
                  setEditingPacchetto(null);
                  setPackageName('');
                  setPackageDesc('');
                  setSelectedPackProve([]);
                  setPackagePrice('');
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Annulla
              </button>
            </div>

            <form onSubmit={handleSubmitPackage} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold uppercase mb-1">Nome Pacchetto Commerciale *</label>
                <input
                  type="text"
                  required
                  placeholder="es. Analisi Completa Terreni Agrari"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase mb-1">Descrizione Pacchetto</label>
                <textarea
                  rows={2}
                  placeholder="Seleziona questo pacchetto per determinare i nutrienti principali dei terreni dei coltivatori..."
                  value={packageDesc}
                  onChange={(e) => setPackageDesc(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Categoria Merceologica Correlata</label>
                  <select
                    value={packageCategory}
                    onChange={(e) => setPackageCategory(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    {(() => {
                      const categoriesFromProve = Array.from(new Set(prove.map(p => p.categoriaMerceologica).filter(Boolean)));
                      const finalCategories = categoriesFromProve.length > 0 
                        ? categoriesFromProve 
                        : ["Oli e Grassi", "Vini ed Aceti", "Cereali e Farine", "Allergeni e Tracce", "Terreni e Acque rurale"];
                      return finalCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ));
                    })()}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Prezzo Forfettario Scontato (€) *</label>
                  <input
                    type="number"
                    required
                    placeholder="Valore complessivo scontato"
                    value={packagePrice}
                    onChange={(e) => setPackagePrice(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Lista di prove registrate per la spunta multi-selettore */}
              <div>
                <label className="block text-slate-600 font-bold uppercase mb-2">Seleziona quali prove fanno parte del pacchetto *</label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50 space-y-1.5">
                  {prove.map(p => {
                    const selected = selectedPackProve.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-white px-2 rounded">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            if (selected) {
                              setSelectedPackProve(selectedPackProve.filter(id => id !== p.id));
                            } else {
                              setSelectedPackProve([...selectedPackProve, p.id]);
                            }
                          }}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="text-xs">
                          <span className="font-semibold text-slate-700">{p.nome}</span>
                          <span className="text-[10px] text-slate-400 ml-1">({p.metodoAnalitico}) - €{p.prezzoListino}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPackage(false);
                    setEditingPacchetto(null);
                    setPackageName('');
                    setPackageDesc('');
                    setSelectedPackProve([]);
                    setPackagePrice('');
                  }}
                  className="px-4 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition"
                  id="submit-new-package"
                >
                  {editingPacchetto ? 'Salva Modifiche Pacchetto' : 'Registra Pacchetto Commerciale'}
                </button>
              </div>

            </form>
          </motion.div>
        ) : (
          /* VISUALIZZAZIONE TABELLE standard */
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {activeTab === 'preventivi' ? (
              /* TABELLA PREVENTIVI */
              <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden p-5">
                <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex justify-between items-center">
                  <span>Archivio Storico Preventivi Elaborati</span>
                  <span className="text-xs font-mono lowercase text-slate-400">fai clic sullo stato per modificarlo rapidamente</span>
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/55 text-[10px]">
                        <th className="py-2.5 px-3">Codice</th>
                        <th className="py-2.5 px-3">Cliente</th>
                        <th className="py-2.5 px-3">Data Emissione</th>
                        <th className="py-2.5 px-3">Elementi Inclusi</th>
                        <th className="py-2.5 px-3 text-right">Totale Preventivato</th>
                        <th className="py-2.5 px-3 text-center">Stato</th>
                        <th className="py-2.5 px-3 text-center">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {preventivi.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-slate-400">
                            Nessun preventivo elaborato in archivio. Clicca su "Componi Preventivo" in alto.
                          </td>
                        </tr>
                      ) : (
                        preventivi.map(prev => {
                          const totVoci = prev.proveSelezionate.length + prev.pacchettiSelezionati.length;
                          const isExpanded = expandedQuoteId === prev.id;
                          return (
                            <React.Fragment key={prev.id}>
                              <tr className="hover:bg-slate-50/50 transition duration-150 border-b border-slate-100">
                                <td className="py-3 px-3">
                                  <button
                                    onClick={() => setExpandedQuoteId(isExpanded ? null : prev.id)}
                                    className="font-mono font-bold text-slate-800 hover:text-blue-600 transition cursor-pointer text-left flex items-center gap-1.5 focus:outline-none"
                                    title="Clicca per mostrare/nascondere i dettagli"
                                  >
                                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                                    {prev.codice}
                                  </button>
                                </td>
                                <td className="py-3 px-3 font-semibold">{getClienteName(prev.clienteId)}</td>
                                <td className="py-3 px-3 text-slate-500 font-mono">{prev.dataCreazione}</td>
                                <td className="py-3 px-3">
                                  <span className="text-slate-500">
                                    {totVoci} {totVoci === 1 ? 'prova del tariffario' : 'prove del tariffario'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right font-mono">
                                  <span className="font-extrabold text-slate-800 block">
                                    €{prev.totale.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  {prev.scontoPercentuale && prev.scontoPercentuale > 0 ? (
                                    <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 inline-block mt-0.5">
                                      Sconto {prev.scontoPercentuale}%
                                    </span>
                                  ) : null}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <button
                                    onClick={() => handleToggleState(prev.id, prev.stato)}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase transition cursor-pointer select-none inline-flex items-center gap-1 ${
                                      prev.stato === 'Approvato'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                        : prev.stato === 'Fatturato'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                        : prev.stato === 'In Approvazione'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                                    }`}
                                    title="Clicca per cambiare rapidamente lo stato contabile"
                                  >
                                    {prev.stato === 'Approvato' && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                                    {prev.stato === 'Fatturato' && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                                    {prev.stato === 'In Approvazione' && <Clock className="h-3 w-3 shrink-0" />}
                                    {prev.stato === 'Rifiutato' && <XCircle className="h-3 w-3 shrink-0" />}
                                    {prev.stato}
                                  </button>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {/* Pulsante Dettagli */}
                                    <button
                                      onClick={() => setExpandedQuoteId(isExpanded ? null : prev.id)}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-lg border border-slate-200 transition text-[10px] font-bold cursor-pointer h-[24px]"
                                      title="Mostra gli elementi inclusi nel preventivo"
                                    >
                                      {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                      {isExpanded ? 'Chiudi' : 'Voci'}
                                    </button>

                                    {/* Pulsante Modifica (Consenti sempre o evidenzia se approvato) */}
                                    <button
                                      onClick={() => handleOpenEditPreventivo(prev)}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-100 transition text-[10px] font-bold cursor-pointer h-[24px]"
                                      title="Modifica questo preventivo"
                                    >
                                      <Pencil className="h-3 w-3" />
                                      Modifica
                                    </button>

                                    {false && (
                                      <button
                                        onClick={() => handleExportCSV(prev)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-100 transition-all duration-200 text-[10px] font-bold cursor-pointer h-[24px]"
                                        title="Esporta i dettagli delle prove in CSV"
                                      >
                                        <Download className="h-3 w-3" />
                                        CSV
                                      </button>
                                    )}

                                    <button
                                      onClick={() => setPrintPreviewQuote(prev)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-605 text-purple-700 hover:text-white rounded-lg border border-purple-200 transition-all duration-200 text-[10px] font-bold cursor-pointer h-[24px]"
                                      title="Vedi anteprima di stampa ufficiale"
                                      id={`btn-stampa-${prev.id}`}
                                    >
                                      <Printer className="h-3 w-3" />
                                      Stampa
                                    </button>

                                    <button
                                      onClick={() => onDeletePreventivo(prev.id)}
                                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 transition rounded-lg"
                                      title="Cancella preventivo"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Box Dettaglio Espanso */}
                              {isExpanded && (() => {
                                const isPriceHidden = prev.nascondiPrezziSingoli && (prev.proveSelezionate.length + prev.pacchettiSelezionati.length) > 1;
                                return (
                                  <tr className="bg-slate-50/40">
                                    <td colSpan={7} className="p-4 border-b border-slate-100">
                                      <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4 animate-fadeIn text-xs">
                                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                          <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                                            <FileText className="h-4 w-4 text-slate-500" /> Articoli inclusi nel preventivo {prev.codice}
                                          </span>
                                          {isPriceHidden && (
                                            <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-150 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-3xs">
                                              <EyeOff className="h-3 w-3" /> Prezzi delle singole voci nascosti
                                            </span>
                                          )}
                                        </div>

                                        <div className="space-y-4">
                                          {/* Singole Prove */}
                                          {prev.proveSelezionate && prev.proveSelezionate.length > 0 && (
                                            <div>
                                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                <span>🔬 Prove Analitiche Selezionate</span>
                                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-bold font-mono">({prev.proveSelezionate.length})</span>
                                              </div>
                                              <div className="border border-slate-150/80 rounded-lg overflow-hidden bg-slate-50/15">
                                                <table className="w-full text-left border-collapse text-[11px]">
                                                  <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-150/70 font-bold text-slate-500">
                                                      <th className="py-2 px-3">Prova / Parametro</th>
                                                      <th className="py-2 px-3">Metodo</th>
                                                      <th className="py-2 px-3 text-center">Quantità Campioni</th>
                                                      {!isPriceHidden && (
                                                        <>
                                                          <th className="py-2 px-3 text-right">Prezzo Unitario</th>
                                                          <th className="py-2 px-3 text-right">Importo Lordo</th>
                                                        </>
                                                      )}
                                                    </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-slate-100">
                                                    {prev.proveSelezionate.map(item => {
                                                      const info = getProvaInfo(item.provaId);
                                                      return (
                                                        <tr key={item.provaId} className={`text-slate-650 hover:bg-slate-50/20 ${info?.accreditataAccredia ? 'bg-emerald-50/10' : ''}`}>
                                                          <td className="py-1.5 px-3 font-semibold text-slate-850">
                                                            <div className="flex items-center gap-1.5">
                                                              <button
                                                                type="button"
                                                                onClick={() => onGoToProva?.(item.provaId)}
                                                                className="hover:text-amber-700 hover:underline inline-flex items-center gap-1 text-left cursor-pointer font-semibold"
                                                                title="Vedi dettagli nel Catalogo Prove"
                                                              >
                                                                {info?.nome || 'Parametro Chimico'}
                                                                <span className="text-[9px] text-slate-400 font-normal shrink-0">(vedi 🔍)</span>
                                                              </button>
                                                              {info?.accreditataAccredia && ' *'}
                                                              {info?.accreditataAccredia && (
                                                                <span className="px-1.5 py-0.2 bg-emerald-50 border border-emerald-150 text-emerald-800 text-[8px] rounded font-black uppercase tracking-wider">
                                                                  🛡️ Accredia
                                                                </span>
                                                              )}
                                                            </div>
                                                          </td>
                                                          <td className="py-1.5 px-3 text-slate-400 font-mono text-[9px] font-semibold">{info?.metodoAnalitico || 'Generale'}</td>
                                                          <td className="py-1.5 px-3 text-center font-bold text-slate-705">{item.quantita}</td>
                                                          {!isPriceHidden && (
                                                            <>
                                                              <td className="py-1.5 px-3 text-right font-mono text-slate-500">€{item.prezzoApplicato.toFixed(2)}</td>
                                                              <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-800">€{(item.quantita * item.prezzoApplicato).toFixed(2)}</td>
                                                            </>
                                                          )}
                                                        </tr>
                                                      );
                                                    })}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          )}

                                          {/* Pacchetti Selezionati */}
                                          {prev.pacchettiSelezionati && prev.pacchettiSelezionati.length > 0 && (
                                            <div>
                                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                <span>📦 Pacchetti Bundle Commerciali</span>
                                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-bold font-mono">({prev.pacchettiSelezionati.length})</span>
                                              </div>
                                              <div className="border border-slate-150/80 rounded-lg overflow-hidden bg-slate-50/15">
                                                <table className="w-full text-left border-collapse text-[11px]">
                                                  <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-150/70 font-bold text-purple-700">
                                                      <th className="py-2 px-3">Pacchetto Commerciale</th>
                                                      <th className="py-2 px-3 text-center">Quantità ordinata</th>
                                                      {!isPriceHidden && (
                                                        <>
                                                          <th className="py-2 px-3 text-right">Tariffa Standard</th>
                                                          <th className="py-2 px-3 text-right">Prezzo Netto</th>
                                                        </>
                                                      )}
                                                    </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-slate-100">
                                                    {prev.pacchettiSelezionati.map(item => {
                                                      const info = getPacchettoInfo(item.pacchettoId);
                                                      return (
                                                        <tr key={item.pacchettoId} className="text-slate-650 hover:bg-slate-50/20">
                                                          <td className="py-1.5 px-3">
                                                            <div className="font-semibold text-slate-850">{info?.nome || 'Pacchetto Speciale'}</div>
                                                            {info?.proveIds && info.proveIds.length > 0 && (
                                                              <div className="text-[9px] text-slate-400 mt-1 pl-1 border-l border-slate-205 flex flex-wrap gap-x-1.5 items-center">
                                                                Include: {info.proveIds.map((pId, idx) => {
                                                                  const pInfo = getProvaInfo(pId);
                                                                  return (
                                                                    <button
                                                                      type="button"
                                                                      key={pId}
                                                                      onClick={() => onGoToProva?.(pId)}
                                                                      className="hover:text-emerald-700 hover:underline cursor-pointer inline-flex items-center gap-0.5 text-left text-xs text-slate-500 font-medium"
                                                                      title="Vedi nel Catalogo Prove  (collegamento)"
                                                                    >
                                                                      {pInfo?.nome}
                                                                      {pInfo?.accreditataAccredia && ' *'}
                                                                      {pInfo?.accreditataAccredia && <strong className="text-emerald-700 ml-0.5"> (🛡️ Accredia)</strong>}
                                                                      {idx < info.proveIds.length - 1 ? ',' : ''}
                                                                    </button>
                                                                  );
                                                                })}
                                                              </div>
                                                            )}
                                                          </td>
                                                          <td className="py-1.5 px-3 text-center font-bold text-slate-705">{item.quantita}</td>
                                                          {!isPriceHidden && (
                                                            <>
                                                              <td className="py-1.5 px-3 text-right font-mono text-slate-500">€{item.prezzoApplicato.toFixed(2)}</td>
                                                              <td className="py-1.5 px-3 text-right font-mono font-bold text-purple-700">€{(item.quantita * item.prezzoApplicato).toFixed(2)}</td>
                                                            </>
                                                          )}
                                                        </tr>
                                                      );
                                                    })}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {(() => {
                                          const hasAccreditati = prev.proveSelezionate.some(item => getProvaInfo(item.provaId)?.accreditataAccredia) ||
                                            prev.pacchettiSelezionati.some(item => getPacchettoInfo(item.pacchettoId)?.proveIds.some(pid => getProvaInfo(pid)?.accreditataAccredia));
                                          
                                          return hasAccreditati ? (
                                            <div className="mt-3 bg-emerald-50/30 border border-emerald-150/80 rounded-lg p-2.5 flex items-start gap-2 text-[10px] text-emerald-800 leading-relaxed shadow-3xs">
                                              <span className="text-xs shrink-0 select-none">*</span>
                                              <div>
                                                <strong className="font-bold text-[10px] uppercase tracking-wide block mb-0.5">Note:</strong>
                                                {prev.notaQualitaPersonalizzata ? (
                                                  <span>{prev.notaQualitaPersonalizzata}</span>
                                                ) : (
                                                  <span>
                                                    <strong>* Prova accreditata da ACCREDIA</strong>. Le analisi contrassegnate con l'asterisco (*) sono coperte da accreditamento nazionale di qualità ai sensi della norma internazionale <strong>UNI EN ISO/IEC 17025</strong>. L&apos;accreditamento attesta l&apos;idoneità tecnica del laboratorio e garantisce l&apos;imparzialità e l&apos;accuratezza legale del rapporto di prova emesso.
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          ) : null;
                                        })()}

                                      {/* Note di preventivo */}
                                      {prev.note && (
                                        <div className="py-2.5 px-3 bg-slate-50 border border-slate-150 rounded-lg text-slate-500 font-medium text-[11px] leading-relaxed">
                                          <span className="font-bold text-slate-600 block uppercase text-[9px] tracking-wider mb-0.5">Note commerciali preventivatore:</span>
                                          <p className="italic">"{prev.note}"</p>
                                        </div>
                                      )}

                                      {/* Registro Audit e Tracciabilità Stati (Richiesta Utente) */}
                                      <div className="py-3 px-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 mt-2">
                                        <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                                          <span className="font-black text-slate-500 uppercase text-[9px] tracking-widest flex items-center gap-1.5">
                                            📊 Registro Audit e Tracciabilità Stati
                                          </span>
                                          <span className="text-[9px] bg-slate-200/60 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
                                            {prev.statoHistory?.length || 0} Eventi registrati
                                          </span>
                                        </div>
                                        {prev.statoHistory && prev.statoHistory.length > 0 ? (
                                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                            {prev.statoHistory.map((h, hIdx) => (
                                              <div key={hIdx} className="text-[11px] flex justify-between items-start p-1.5 bg-white border border-slate-150/50 rounded-md shadow-3xs">
                                                <div className="space-y-0.5">
                                                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                                    <span className="font-bold text-slate-500 text-[9px] uppercase">Cambio Stato:</span>
                                                    <span className="text-slate-400 font-extrabold font-mono text-[9px] uppercase line-through">{h.statoPrecedente || 'Iniziale'}</span>
                                                    <span className="text-slate-450 font-bold">&rarr;</span>
                                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-black tracking-wider uppercase ${
                                                      h.statoNuovo === 'Approvato' ? 'bg-emerald-50 text-emerald-700 font-black border border-emerald-200' :
                                                      h.statoNuovo === 'Fatturato' ? 'bg-blue-50 text-blue-700 font-black border border-blue-200' :
                                                      h.statoNuovo === 'In Approvazione' ? 'bg-amber-50 text-amber-700 font-bold border border-amber-200' :
                                                      'bg-rose-50 text-rose-700 font-bold border border-rose-200'
                                                    }`}>{h.statoNuovo}</span>
                                                  </div>
                                                  <div className="text-[10px] text-slate-500">
                                                    Modificato da: <strong className="text-slate-800 font-bold">{h.operatore}</strong>
                                                  </div>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-mono font-bold shrink-0">{h.dataOra}</span>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-slate-400 text-[10px] italic leading-relaxed">
                                            Nessuna modifica di stato registrata. Clicca sul badge dello stato contabile per registrare un cambio stato tracciabile e firmato.
                                          </p>
                                        )}
                                      </div>

                                      {/* Totali Riassunti */}
                                      <div className="pt-3 border-t border-slate-150 flex flex-col items-end space-y-1.5">
                                        {prev.scontoPercentuale && prev.scontoPercentuale > 0 ? (
                                          <>
                                            <div className="text-slate-500 font-medium text-[11px]">
                                              Imponibile Lordo: <span className="font-mono font-bold text-slate-700 ml-1">€{(prev.totale / (1 - prev.scontoPercentuale / 100)).toFixed(2)}</span>
                                            </div>
                                            <div className="text-rose-600 font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                              Sconto Applicato ({prev.scontoPercentuale}%): <span className="font-mono ml-1">-€{((prev.totale / (1 - prev.scontoPercentuale / 100)) - prev.totale).toFixed(2)}</span>
                                            </div>
                                          </>
                                        ) : null}
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-baseline gap-2.5 shadow-2xs mt-1.5">
                                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Totale Netto Preventivato:</span>
                                          <span className="text-base font-black text-slate-900 font-mono">€{prev.totale.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })()}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* VISUALIZZAZIONE PACCHETTI STANDARD */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pacchetti.length === 0 ? (
                  <div className="col-span-3 text-center py-20 bg-white border border-slate-150 rounded-xl text-slate-400 py-10">
                    Nessun pacchetto standard definito nel listino commerciale del laboratorio.
                  </div>
                ) : (
                  pacchetti.map(pack => {
                    const totalSinglePrices = pack.proveIds.reduce((sum, pid) => sum + (getProvaInfo(pid)?.prezzoListino || 0), 0);
                    const discountAmount = totalSinglePrices - pack.prezzoScontato;
                    const discountPct = totalSinglePrices > 0 ? Math.round((discountAmount / totalSinglePrices) * 100) : 0;

                    return (
                      <div key={pack.id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {pack.categoriaMerceologica}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenEditPacchetto(pack)}
                                className="text-slate-400 hover:text-blue-600 transition p-1"
                                title="Modifica pacchetto"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => onDeletePacchetto(pack.id)}
                                className="text-slate-300 hover:text-red-500 transition p-1"
                                title="Elimina pacchetto"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <h5 className="font-extrabold text-sm text-slate-800 mt-2.5 leading-snug">
                            {pack.nome}
                          </h5>

                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            {pack.descrizione || 'Nessuna descrizione commerciale inserita.'}
                          </p>

                          {/* Prove incluse */}
                          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                              Costituzione del Pacchetto:
                            </span>
                            <ul className="space-y-1.5">
                              {pack.proveIds.map(pid => {
                                const info = getProvaInfo(pid);
                                return (
                                  <li key={pid} className="text-xs text-slate-600 flex justify-between items-start gap-1 p-1 hover:bg-slate-50/50 rounded">
                                    <div className="flex items-start gap-1">
                                      <ChevronRight className="h-3 w-3 text-purple-400 mt-0.5" />
                                      <div className="leading-tight">
                                        <button
                                          type="button"
                                          onClick={() => onGoToProva?.(pid)}
                                          className="font-semibold text-left text-slate-755 hover:text-purple-750 hover:underline cursor-pointer"
                                          title="Clicca per collegarti a questa prova nell'area PROVE"
                                        >
                                          <span>{info?.nome || 'Parametro Chimico'}</span>
                                          <span className="text-[9px] text-slate-400 font-normal ml-1 shrink-0 bg-slate-100 px-1 py-0.2 rounded">(collega 🔗)</span>
                                          {info && (
                                            <span className="text-[9px] text-slate-400 block font-mono">
                                              {info.metodoAnalitico} {info.accreditataAccredia && '• Accredia 🛡️'}
                                            </span>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                    <div className="text-right whitespace-nowrap ml-2">
                                      <span className="font-mono text-slate-500 text-[10px]">€{info?.prezzoListino.toFixed(2)}</span>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>

                            {totalSinglePrices > 0 && (
                              <div className="bg-purple-50/30 rounded-lg p-2.5 mt-2.5 border border-purple-100/50 text-[10px] space-y-0.5">
                                <div className="flex justify-between font-bold text-purple-950">
                                  <span>Valore di listino cumulat.:</span>
                                  <span className="font-mono">€{totalSinglePrices.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-purple-700 font-semibold text-[9.5px]">
                                  <span>Sconto incorporato:</span>
                                  <span>-{discountPct}% (-€{discountAmount.toFixed(2)})</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between items-center bg-slate-50 -mx-5 -mb-5 px-5 py-3 rounded-b-xl">
                          <span className="text-xs font-bold text-slate-500 uppercase">Tariffa Forfettaria Pacchetto:</span>
                          <span className="text-base font-extrabold text-purple-700">
                            €{pack.prezzoScontato.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {/* MODALE DI ANTEPRIMA DI STAMPA UFFICIALE */}
      <AnimatePresence>
        {printPreviewQuote && (() => {
          const prev = printPreviewQuote;
          const client = clients.find(c => c.id === prev.clienteId);
          
          // Calcola subtotale e importi
          const subtotal = prev.proveSelezionate.reduce((sum, item) => sum + (item.quantita * item.prezzoApplicato), 0) +
            prev.pacchettiSelezionati.reduce((sum, item) => sum + (item.quantita * item.prezzoApplicato), 0);
          
          const discountAmount = prev.scontoPercentuale ? (subtotal * prev.scontoPercentuale) / 100 : 0;
          const taxableAmount = prev.totale;
          const vatAmount = taxableAmount * 0.22;
          const totalWithVat = taxableAmount + vatAmount;

          const hasAccredia = prev.proveSelezionate.some(item => getProvaInfo(item.provaId)?.accreditataAccredia) ||
            prev.pacchettiSelezionati.some(item => getPacchettoInfo(item.pacchettoId)?.proveIds.some(pid => getProvaInfo(pid)?.accreditataAccredia));

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 md:p-10 print:fixed print:inset-0 print:z-[9999] print:bg-white print:p-0 print:block overflow-y-auto"
            >
              <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden print:max-h-none print:shadow-none print:rounded-none border border-slate-100 print:border-none">
                
                {/* INTESTAZIONE MODALE (NASCOSTA NELLA STAMPA REALE) */}
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0 print:hidden">
                  <div className="flex items-center gap-2">
                    <Printer className="h-5 w-5 text-purple-400 font-bold" />
                    <div>
                      <h3 className="font-extrabold text-sm tracking-wide">ANTEPRIMA DI STAMPA UFFICIALE</h3>
                      <p className="text-[10px] text-slate-400 font-mono">Documento commerciale {prev.codice}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md border border-emerald-550 flex items-center gap-2 transition cursor-pointer"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Lancia Stampa / PDF
                    </button>
                    <button
                      onClick={() => setPrintPreviewQuote(null)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 hover:border-slate-600 transition cursor-pointer"
                      title="Chiudi anteprima"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* AREA DI STAMPA EFFETTIVA (STILE A4 FISICO CON MARGINI MA RESPONSIVE) */}
                <div 
                  id="print-area-container"
                  className="overflow-y-auto p-8 md:p-12 bg-white flex-1 font-sans text-slate-800 print:p-0 print:overflow-visible"
                >
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      body {
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                      }
                      main, nav, aside, header, footer, button, .print\\:hidden, #sidebar-accettazione, #card-dash-accettazione {
                        display: none !important;
                        height: 0 !important;
                        overflow: hidden !important;
                      }
                      #print-area-container {
                        display: block !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        color: black !important;
                      }
                    }
                  `}} />
                  
                  {/* FOGLIO A4 - CONTENITORE PRINCIPALE */}
                  <div className="max-w-[720px] mx-auto space-y-8 print:max-w-full print:w-full print:mx-0">
                    
                    {/* INTESTAZIONE DOCUMENTALE */}
                    <div className="flex justify-between items-start gap-6 border-b-2 border-slate-900 pb-5">
                      <div>
                        {/* Marchio Lab */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-lg tracking-wider">
                            BC
                          </div>
                          <div>
                            <h1 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tight m-0">BIOCHEM ANALYTICAL</h1>
                            <p className="text-[9px] font-bold text-slate-500 tracking-widest uppercase mb-0">Laboratorio di Analisi e Controllo Qualità</p>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-3 font-mono leading-relaxed">
                          Sede Legale: Via delle Scienze n. 42, 00100 Roma (RM)<br />
                          P.IVA / C.F. 01234567890 | Cap. Soc. 150.000 € i.v.<br />
                          Tel: 06 555 1234 | E-mail: preventivi@biochem-analytical.it
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        {/* Certificazione Accredia se presente */}
                        {hasAccredia && (
                          <div className="mb-3 border border-emerald-300 bg-emerald-50/50 p-1.5 rounded flex items-center gap-1.5 max-w-[190px] text-left">
                            <span className="text-base select-none">🛡️</span>
                            <div className="text-[8px] font-medium text-emerald-950 font-sans leading-snug">
                              <strong>LAB N° 9999 L</strong><br />
                              Membro degli Accordi di Mutuo Riconoscimento EA, IAF e ILAC
                            </div>
                          </div>
                        )}
                        <span className="bg-slate-100 border border-slate-200 text-slate-800 font-black text-[10px] tracking-widest px-3 py-1 rounded-md uppercase font-mono block">
                          Preventivo d&apos;Offerta
                        </span>
                      </div>
                    </div>

                    {/* BLOCCO METADATI PREVENTIVO + INFORMAZIONI CLIENTE */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {/* Dati Documento */}
                      <div className="bg-slate-50/75 border border-slate-150 p-4 rounded-2xl space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-0.5">Dati Preventivo</span>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Codice Documento:</span>
                          <span className="font-mono font-bold text-slate-900">{prev.codice}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Data Emissione:</span>
                          <span className="font-mono text-slate-700 font-medium">{prev.dataCreazione}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Validità Offerta:</span>
                          <span className="text-slate-700 font-bold">90 Giorni</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Stato Approvazione:</span>
                          <span className={`font-semibold ${prev.stato === 'Approvato' || prev.stato === 'Fatturato' ? 'text-emerald-700' : 'text-amber-750'}`}>{prev.stato}</span>
                        </div>
                      </div>

                      {/* Intestatario / Cliente */}
                      <div className="border border-slate-200 p-4 rounded-2xl space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-450 tracking-widest block mb-1">Destinatario / Cliente Spett.le</span>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight mb-0">{client?.denominazione || 'Cliente non specificato'}</h4>
                        <p className="text-xs text-slate-500 leading-snug pt-1">
                          {client?.indirizzo && <span>📍 {client.indirizzo}<br /></span>}
                          {client?.partitaIva && <span>P.IVA: <strong className="font-mono">{client.partitaIva}</strong><br /></span>}
                          {client?.email && <span>✉️ {client.email} | 📞 {client.telefono}</span>}
                        </p>
                      </div>
                    </div>

                    {/* INTRODUZIONE */}
                    <div className="text-xs text-slate-600 leading-relaxed font-semibold">
                      In risposta alla Vs. cortese richiesta, provvediamo a trasmettere la nostra migliore proposta commerciale relativa all&apos;esecuzione delle prove analitiche, merceologiche o pacchetti forfettari qui specificati:
                    </div>

                    {/* TABELLA DETTAGLIATA ARTICOLI INCLUSI */}
                    {(() => {
                      const isPriceHidden = prev.nascondiPrezziSingoli && (prev.proveSelezionate.length + prev.pacchettiSelezionati.length) > 1;
                      return (
                        <>
                          <div className="border border-slate-300 rounded-xl overflow-hidden bg-white/50">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                                  <th className="py-2.5 px-3">Descrizione Prova / Parametro Analitico</th>
                                  <th className="py-2.5 px-3">Metodo</th>
                                  <th className="py-2.5 px-3 text-center">Qtà</th>
                                  {!isPriceHidden ? (
                                    <>
                                      <th className="py-2.5 px-3 text-right">Unitario</th>
                                      <th className="py-2.5 px-3 text-right">Totale Netto</th>
                                    </>
                                  ) : (
                                    <th className="py-2.5 px-3 text-center">Note Prezzo</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 text-slate-700">
                                {/* Singole Prove */}
                                {prev.proveSelezionate.map(item => {
                                  const info = getProvaInfo(item.provaId);
                                  return (
                                    <tr key={item.provaId} className={`hover:bg-slate-50/55 ${info?.accreditataAccredia ? 'bg-emerald-50/15' : ''}`}>
                                      <td className="py-2.5 px-3 font-semibold text-slate-850">
                                        <div className="flex items-start gap-1">
                                          <span>{info?.nome || 'Parametro Chimico'}{info?.accreditataAccredia && ' *'}</span>
                                          {info?.accreditataAccredia && (
                                            <span className="px-1 py-0.2 bg-emerald-100 border border-emerald-300 text-emerald-800 text-[8px] rounded font-black tracking-wider uppercase inline-block shrink-0 leading-none">
                                              🛡️ Accredia
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[9px] font-semibold">{info?.metodoAnalitico || 'Generale'}</td>
                                      <td className="py-2.5 px-3 text-center font-bold text-slate-705">{item.quantita}</td>
                                      {!isPriceHidden ? (
                                        <>
                                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">€{item.prezzoApplicato.toFixed(2)}</td>
                                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">€{(item.quantita * item.prezzoApplicato).toFixed(2)}</td>
                                        </>
                                      ) : (
                                        <td className="py-2.5 px-3 text-center text-slate-450 italic text-[10px]">Incluso nel preventivo</td>
                                      )}
                                    </tr>
                                  );
                                })}

                                {/* Pacchetti */}
                                {prev.pacchettiSelezionati.map(item => {
                                  const info = getPacchettoInfo(item.pacchettoId);
                                  return (
                                    <tr key={item.pacchettoId} className="hover:bg-slate-50/55">
                                      <td className="py-2.5 px-3 font-semibold text-slate-850">
                                        <div className="font-bold text-purple-900">{info?.nome || 'Pacchetto Speciale'}</div>
                                        {info?.proveIds && info.proveIds.length > 0 && (
                                          <div className="text-[9px] text-slate-400 mt-1 pl-1 border-l border-slate-205 leading-relaxed font-normal">
                                            Include: {info.proveIds.map((pId, idx) => {
                                              const pInfo = getProvaInfo(pId);
                                              return (
                                                <span key={pId} className="inline-flex items-center gap-0.5">
                                                  {pInfo?.nome}
                                                  {pInfo?.accreditataAccredia && ' *'}
                                                  {pInfo?.accreditataAccredia && <strong className="text-emerald-700 ml-0.5"> (🛡️ Accredia)</strong>}
                                                  {idx < info.proveIds.length - 1 ? ', ' : ''}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-400 italic font-medium text-[10px]">Pacchetto Multi-Analitico</td>
                                      <td className="py-2.5 px-3 text-center font-bold text-slate-705">{item.quantita}</td>
                                      {!isPriceHidden ? (
                                        <>
                                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">€{item.prezzoApplicato.toFixed(2)}</td>
                                          <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700">€{(item.quantita * item.prezzoApplicato).toFixed(2)}</td>
                                        </>
                                      ) : (
                                        <td className="py-2.5 px-3 text-center text-slate-450 italic text-[10px]">Incluso nel preventivo</td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* NOTE ACCREDIA */}
                          {hasAccredia && (
                            <div className="bg-emerald-50/30 border border-emerald-150/80 rounded-lg p-3 text-[10px] text-emerald-800 leading-relaxed shadow-3xs">
                              <strong className="font-bold uppercase tracking-wide block mb-0.5">Note:</strong>
                              {prev.notaQualitaPersonalizzata ? (
                                <span>{prev.notaQualitaPersonalizzata}</span>
                              ) : (
                                <span>
                                  * Prova accreditata da ACCREDIA. Le analisi contrassegnate sopra con l'asterisco (*) sono coperte da accreditamento nazionale ai sensi della norma internazionale <strong>UNI EN ISO/IEC 17025</strong>. L&apos;accreditamento attesta l&apos;idoneità tecnica del laboratorio e garantisce l&apos;imparzialità, l&apos;indipendenza e l&apos;accuratezza legale del rapporto di prova emesso ad ogni effetto di legge.
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* NOTE DI PREVENTIVO */}
                    {prev.note && (
                      <div className="py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="font-bold text-slate-650 block uppercase text-[9px] tracking-wider mb-1">Note commerciali Integrative:</span>
                        <p className="leading-relaxed text-xs text-slate-650 italic m-0">"{prev.note}"</p>
                      </div>
                    )}

                    {/* SEZIONE TOTALI PREVENTIVATI */}
                    <div className="flex justify-end pt-3">
                      <div className="w-full sm:w-72 bg-slate-50/60 border border-slate-200 p-4 rounded-2xl space-y-2">
                        {prev.scontoPercentuale ? (
                          <>
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>Imponibile Lordo:</span>
                              <span className="font-mono">€{(prev.totale / (1 - prev.scontoPercentuale / 100)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-rose-600 font-semibold bg-rose-50/80 px-1.5 py-0.5 rounded border border-rose-100">
                              <span>Sconto ({prev.scontoPercentuale}%):</span>
                              <span className="font-mono">-€{((prev.totale / (1 - prev.scontoPercentuale / 100)) - prev.totale).toFixed(2)}</span>
                            </div>
                          </>
                        ) : null}
                        <div className="flex justify-between text-xs text-slate-705 font-bold">
                          <span>Imponibile Netto:</span>
                          <span className="font-mono">€{taxableAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>I.V.A. (22%):</span>
                          <span className="font-mono">€{vatAmount.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-slate-250 pt-2 flex justify-between text-sm font-black text-slate-900 bg-slate-100/60 -mx-4 -mb-4 p-4 rounded-b-2xl">
                          <span>TOTALI CON IVA DET:</span>
                          <span className="font-mono text-base">€{totalWithVat.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    {/* TERMINI ED AREA FIRME */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-xs">
                      {/* Note legali / pagamenti */}
                      <div className="text-[10px] text-slate-450 leading-relaxed font-semibold space-y-1">
                        <strong className="font-bold text-slate-600 block uppercase tracking-wide">Modalità e condizioni:</strong>
                        <p className="m-0">• Pagamento: Rimessa diretta a 30 giorni data fattura fine mese.</p>
                        <p className="m-0">• I prezzi indicati sono al netto di Iva (22% di legge).</p>
                        <p className="m-0">• Per accettazione si prega di restituire copia timbrata e firmata della presente.</p>
                      </div>

                      {/* Firme per accettazione */}
                      <div className="flex justify-between items-baseline gap-4 text-center">
                        <div className="flex-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-450 block mb-12">Per Accettazione (Il Cliente)</span>
                          <div className="border-b border-dashed border-slate-300 w-full inline-block"></div>
                          <span className="text-[9px] text-slate-400 mt-1 block font-medium">Timbro e Firma Legale</span>
                        </div>
                        <div className="flex-1">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-450 block mb-12">Biochem Analytical S.r.l.</span>
                          <div className="border-b border-dashed border-slate-300 w-full inline-block"></div>
                          <span className="text-[9px] text-emerald-800 font-bold mt-1 block font-semibold">Direzione di Laboratorio</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* MODAL TRACCIABILITA CAMBIO STATO (Richiesta Utente) */}
      <AnimatePresence>
        {tracingQuoteStatusId && (() => {
          const matchingQuote = preventivi.find(q => q.id === tracingQuoteStatusId);
          if (!matchingQuote) return null;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
              >
                {/* Header */}
                <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-amber-400" />
                    <div>
                      <h3 className="font-extrabold text-sm uppercase tracking-wider">Cambio Stato Tracciabile</h3>
                      <p className="text-[10px] text-slate-400 font-mono">Preventivo: {matchingQuote.codice}</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setTracingQuoteStatusId(null)}
                    className="p-1 hover:bg-white/10 rounded-lg text-slate-350 hover:text-white transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4 text-xs">
                  {/* Stato Attuale */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                    <span className="font-bold text-slate-500">Stato Attuale:</span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      matchingQuote.stato === 'Approvato' ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' :
                      matchingQuote.stato === 'Fatturato' ? 'bg-blue-50 text-blue-700 border border-blue-250' :
                      matchingQuote.stato === 'In Approvazione' ? 'bg-amber-50 text-amber-700 border border-amber-250' :
                      'bg-rose-50 text-rose-700 border border-rose-250'
                    }`}>{matchingQuote.stato}</span>
                  </div>

                  {/* Storico Approvazioni (Audit Trail) */}
                  <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-100/80 rounded-xl text-left">
                    <span className="font-black text-slate-500 uppercase text-[9px] tracking-widest block mb-1">
                      🕒 Storico delle Approvazioni (Audit Trail)
                    </span>
                    {matchingQuote.statoHistory && matchingQuote.statoHistory.length > 0 ? (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {matchingQuote.statoHistory.map((h, hIdx) => (
                          <div key={hIdx} className="text-[10px] flex justify-between items-start p-2 bg-white border border-slate-150 rounded-lg shadow-3xs">
                            <div className="space-y-0.5">
                              <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                                <span className="text-slate-400 font-extrabold font-mono text-[8.5px] uppercase line-through">{h.statoPrecedente || 'Iniziale'}</span>
                                <span className="text-slate-450 font-bold">&rarr;</span>
                                <span className={`px-1 py-0.2 rounded text-[8.5px] font-black tracking-wider uppercase ${
                                  h.statoNuovo === 'Approvato' ? 'bg-emerald-50 text-emerald-700 font-black border border-emerald-150' :
                                  h.statoNuovo === 'Fatturato' ? 'bg-blue-50 text-blue-700 font-black border border-blue-150' :
                                  h.statoNuovo === 'In Approvazione' ? 'bg-amber-50 text-amber-700 font-bold border border-amber-150' :
                                  'bg-rose-50 text-rose-700 border border-rose-150'
                                }`}>{h.statoNuovo}</span>
                              </div>
                              <div className="text-[9.5px] text-slate-500">
                                Gestito da: <strong className="text-slate-800 font-bold">{h.operatore}</strong>
                              </div>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono font-bold shrink-0">{h.dataOra}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-[10px] italic leading-relaxed px-1">
                        Nessun passaggio di stato registrato in precedenza (questo è lo stato iniziale).
                      </p>
                    )}
                  </div>

                  {/* Seleziona Nuovo Stato */}
                  <div className="space-y-1.5">
                    <label className="block font-black text-slate-500 uppercase text-[9px] tracking-widest">
                      Seleziona Nuovo Stato Contabile (*):
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { val: 'In Approvazione', label: '⏳ In Approvazione', color: 'hover:border-amber-400 checked:bg-amber-500' },
                        { val: 'Approvato', label: '✅ Approvato', color: 'hover:border-emerald-400 checked:bg-emerald-500' },
                        { val: 'Fatturato', label: '💼 Fatturato', color: 'hover:border-blue-400 checked:bg-blue-500' },
                        { val: 'Rifiutato', label: '❌ Rifiutato', color: 'hover:border-rose-400 checked:bg-rose-500' }
                      ].map(st => (
                        <button
                          key={st.val}
                          type="button"
                          onClick={() => setTracingSelectedStatus(st.val as any)}
                          className={`p-2.5 rounded-xl border text-center font-bold tracking-wide text-[11px] transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            tracingSelectedStatus === st.val
                              ? 'bg-slate-950 text-white border-slate-950 shadow-md'
                              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Operatore Firma */}
                  <div className="space-y-2">
                    <label className="block font-black text-slate-500 uppercase text-[9px] tracking-widest">
                      Operatore che effettua la modifica (*):
                    </label>
                    <select
                      value={tracingOperator}
                      onChange={(e) => {
                        setTracingOperator(e.target.value);
                        setTracingPassword('');
                        setTracingError(null);
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
                      <option value="Altro">Altro operatore (inserimento manuale)</option>
                    </select>

                    {tracingOperator === 'Altro' && (
                      <input
                        type="text"
                        value={tracingCustomOperator}
                        onChange={(e) => setTracingCustomOperator(e.target.value)}
                        placeholder="Nome e Cognome operatore..."
                        className="w-full bg-white border border-slate-250 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 mt-1.5 animate-fadeIn"
                        required
                      />
                    )}

                    {/* Password per la Firma */}
                    <div className="space-y-1.5 mt-2">
                      <label className="block font-black text-slate-500 uppercase text-[9px] tracking-widest flex justify-between">
                        <span>Firma con Password di Sicurezza (*):</span>
                        <span className="text-[8.5px] text-slate-400 normal-case font-normal">Es: lupo123, bianchi123, vitale123, lims123</span>
                      </label>
                      <input
                        type="password"
                        value={tracingPassword}
                        onChange={(e) => {
                          setTracingPassword(e.target.value);
                          if (tracingError) setTracingError(null);
                        }}
                        placeholder="Inserisci la tua password operatore..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950"
                        required
                      />
                    </div>

                    {tracingError && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-semibold text-rose-700 animate-fadeIn text-left">
                        ⚠️ {tracingError}
                      </div>
                    )}
                  </div>

                  {/* Informazioni d'ora e data */}
                  <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl text-[10.5px] leading-normal text-indigo-950 flex items-start gap-2">
                    <Clock className="h-4 w-4 text-indigo-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>Marcatura Temporale Automatica:</strong>
                      <p className="text-slate-500 font-mono font-semibold mt-0.5">{new Date().toLocaleString('it-IT')}</p>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTracingQuoteStatusId(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-100 transition cursor-pointer text-center"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmStatusChange}
                    className="flex-1 py-2.5 rounded-xl bg-slate-950 text-white font-bold hover:bg-slate-900 transition shadow-md cursor-pointer text-center"
                  >
                    Registra e Salva
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
