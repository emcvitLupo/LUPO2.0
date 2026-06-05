import React, { useState, useMemo } from 'react';
import { PraticaFatturazione, AuditLog, Operator } from '../types';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  FileSpreadsheet, 
  FileDown, 
  CheckCircle, 
  Clock, 
  Check, 
  AlertTriangle,
  Lock,
  Calendar,
  X,
  History,
  FileText,
  BadgeEuro,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FatturazioneSectionProps {
  pratiche: PraticaFatturazione[];
  onUpdatePratiche: (updated: PraticaFatturazione[]) => void;
  auditLogs: AuditLog[];
  operators: Operator[];
  addAuditLogEntry: (utente: string, sezione: string, campo: string, vOld: string, vNew: string) => void;
}

export function FatturazioneSection({
  pratiche,
  onUpdatePratiche,
  auditLogs,
  operators,
  addAuditLogEntry
}: FatturazioneSectionProps) {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Tutti' | 'Da fatturare' | 'Fatturato'>('Tutti');
  const [amountFilter, setAmountFilter] = useState<'Tutti' | 'Zero' | 'Validi'>('Tutti');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<keyof PraticaFatturazione>('dataAccettazione');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Change status Modal state
  const [editingPraticaId, setEditingPraticaId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'Da fatturare' | 'Fatturato'>('Da fatturare');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [operatorPIN, setOperatorPIN] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // Sorting Handler
  const handleSort = (field: keyof PraticaFatturazione) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Set initial operator
  React.useEffect(() => {
    if (operators && operators.length > 0) {
      setSelectedOperator(operators[0].nome);
    } else {
      setSelectedOperator('Dott. Chim. F. Lupo');
    }
  }, [operators]);

  // Filter & Search Logic
  const filteredPratiche = useMemo(() => {
    return pratiche.filter(p => {
      // 1. Search filter
      const matchesSearch = 
        p.numeroCampione.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.partitaIva.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numeroPreventivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numeroFattura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Status filter
      const matchesStatus = statusFilter === 'Tutti' || p.statoFatturazione === statusFilter;

      // 3. Amount filter
      const matchesAmount = 
        amountFilter === 'Tutti' ||
        (amountFilter === 'Zero' && p.importo === 0) ||
        (amountFilter === 'Validi' && p.importo > 0);

      // 4. Date range filter
      let matchesDates = true;
      if (dateStart) {
        matchesDates = matchesDates && p.dataAccettazione >= dateStart;
      }
      if (dateEnd) {
        matchesDates = matchesDates && p.dataAccettazione <= dateEnd;
      }

      return matchesSearch && matchesStatus && matchesAmount && matchesDates;
    });
  }, [pratiche, searchTerm, statusFilter, amountFilter, dateStart, dateEnd]);

  // Sorted Pratiche
  const sortedPratiche = useMemo(() => {
    const sorted = [...filteredPratiche];
    sorted.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
    return sorted;
  }, [filteredPratiche, sortField, sortDirection]);

  // Open Edit Modal
  const openEditModal = (pratica: PraticaFatturazione) => {
    setEditingPraticaId(pratica.id);
    setSelectedStatus(pratica.statoFatturazione);
    setInvoiceNumber(pratica.numeroFattura || '');
    // Default invoice date to today if empty
    setInvoiceDate(pratica.dataFattura || new Date().toISOString().split('T')[0]);
    setCustomNote(pratica.note || '');
    setOperatorPIN('');
    setModalError(null);
  };

  // Confirm Status Change
  const confirmStatusChange = () => {
    if (!editingPraticaId) return;
    const targetPratica = pratiche.find(p => p.id === editingPraticaId);
    if (!targetPratica) return;

    // Consistency Checks
    if (selectedStatus === 'Fatturato' && !invoiceNumber.trim()) {
      setModalError("Errore di coerenza: Non è consentito impostare lo stato 'Fatturato' senza specificare un numero di fattura valido.");
      return;
    }

    if (selectedStatus === 'Fatturato' && !invoiceDate) {
      setModalError("Errore di coerenza: Non è consentito impostare lo stato 'Fatturato' senza una data di fattura valida.");
      return;
    }



    // Perform Update
    const updatedPratiche = pratiche.map(p => {
      if (p.id === editingPraticaId) {
        return {
          ...p,
          statoFatturazione: selectedStatus,
          numeroFattura: selectedStatus === 'Fatturato' ? invoiceNumber.trim() : '',
          dataFattura: selectedStatus === 'Fatturato' ? invoiceDate : '',
          note: customNote.trim()
        };
      }
      return p;
    });

    onUpdatePratiche(updatedPratiche);

    // Track modification in Audit Log!
    const userString = `${selectedOperator}`;
    const prevVal = `${targetPratica.statoFatturazione}${targetPratica.numeroFattura ? ' (' + targetPratica.numeroFattura + ')' : ''}`;
    const newVal = `${selectedStatus}${selectedStatus === 'Fatturato' ? ' (' + invoiceNumber.trim() + ')' : ''}`;
    
    addAuditLogEntry(
      userString,
      'Fatturazione',
      'Stato fatturazione',
      prevVal,
      newVal
    );

    // Reset and close modal
    setEditingPraticaId(null);
    setOperatorPIN('');
    setModalError(null);
  };

  // Export CSV (Excel)
  const handleExportCSV = () => {
    const headers = [
      'ID Pratica',
      'Numero Campione',
      'Cliente / Ragione Sociale',
      'Partita IVA',
      'Numero Preventivo',
      'Data Accettazione',
      'Importo (€)',
      'Stato Fatturazione',
      'Numero Fattura',
      'Data Fattura',
      'Note'
    ];

    const rows = filteredPratiche.map(p => [
      p.id,
      p.numeroCampione,
      p.nomeCliente.replace(/"/g, '""'),
      p.partitaIva,
      p.numeroPreventivo,
      p.dataAccettazione,
      p.importo.toString(),
      p.statoFatturazione,
      p.numeroFattura || '',
      p.dataFattura || '',
      (p.note || '').replace(/"/g, '""')
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Lupo_Report_Fatturazione_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick print handler that triggers styled browser print view for accurate PDF generation
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Header and export buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-600 font-bold block">
            Laboratorio LabMerceologico LUPO 2.0
          </span>
          <h2 className="text-xl font-bold font-sans text-slate-900 tracking-tight mt-1">
            Area Amministrazione & Fatturazione
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Gestisci ed esporta l&apos;elenco delle pratiche da fatturare collegate all&apos;accettazione campioni e preventivi approvati.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm shadow-emerald-600/10 border-0"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Esporta Excel (.CSV)
          </button>
          
          <button
            onClick={handlePrintPDF}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm border-0"
          >
            <Printer className="h-4 w-4" />
            Esporta / Stampa PDF
          </button>
        </div>
      </div>

      {/* Main Grid: Search and Advanced Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-4">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest block border-b border-slate-100 pb-2.5">
          🔍 Strumenti di Ricerca ed Excel-filters avanzati
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Search bar */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca campione, cliente, fattura, preventivo..."
              className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-350 focus:border-slate-950 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 focus:outline-none focus:ring-0 transition"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-350 focus:border-slate-950 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-slate-800 focus:outline-none transition"
            >
              <option value="Tutti">📁 Stato: Tutti</option>
              <option value="Da fatturare">⏳ Da fatturare</option>
              <option value="Fatturato">✅ Fatturato</option>
            </select>
          </div>

          {/* Amount filter */}
          <div>
            <select
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value as any)}
              className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-350 focus:border-slate-950 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-slate-800 focus:outline-none transition"
            >
              <option value="Tutti">🪙 Importo: Tutti</option>
              <option value="Zero">⚠️ Solo a zero/mancanti</option>
              <option value="Validi">💶 Solo importi valorizzati</option>
            </select>
          </div>

          {/* Quick Clear filters */}
          <div className="flex gap-1.5 matches-area">
            <div className="flex-1">
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                title="Data inizio accettazione"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-2.5 text-[10px] font-bold text-slate-700"
              />
            </div>
            <div className="flex-1">
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                title="Data fine accettazione"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-2.5 text-[10px] font-bold text-slate-700"
              />
            </div>
            {(searchTerm || statusFilter !== 'Tutti' || amountFilter !== 'Tutti' || dateStart || dateEnd) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('Tutti');
                  setAmountFilter('Tutti');
                  setDateStart('');
                  setDateEnd('');
                }}
                className="p-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl transition shrink-0"
                title="Svuota tutti i filtri"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Excel-styled interactive Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-205 shadow-md overflow-hidden">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left border-collapse table-excel">
            <thead>
              <tr className="bg-slate-900 text-white text-[10.5px] uppercase tracking-wider font-bold">
                <th className="py-3 px-3 border-r border-slate-700 font-mono text-center">ID Pratica</th>
                <th className="py-3 px-3 border-r border-slate-700 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('numeroCampione')}>
                  <div className="flex items-center gap-1.5">
                    Numero Campione
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 border-r border-slate-700 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('nomeCliente')}>
                  <div className="flex items-center gap-1.5">
                    Cliente / Ragione Sociale
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-slate-700">P. IVA</th>
                <th className="py-3 px-3 border-r border-slate-700 font-mono">N. Offerta</th>
                <th className="py-3 px-3 border-r border-slate-700 cursor-pointer hover:bg-slate-800" onClick={() => handleSort('dataAccettazione')}>
                  <div className="flex items-center gap-1.5">
                    Data Accettazione
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-slate-700 text-right cursor-pointer hover:bg-slate-800" onClick={() => handleSort('importo')}>
                  <div className="flex items-center justify-end gap-1.5">
                    Importo
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-slate-700 text-center cursor-pointer hover:bg-slate-800" onClick={() => handleSort('statoFatturazione')}>
                  <div className="flex items-center justify-center gap-1.5">
                    Stato
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-slate-700 font-mono text-center">Fattura N.</th>
                <th className="py-3 px-3 border-r border-slate-700 text-center font-mono">Data Fatt.</th>
                <th className="py-3 px-6 text-center select-none print:hidden">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs">
              {sortedPratiche.map((p, idx) => {
                const isZero = p.importo === 0;
                return (
                  <tr 
                    key={p.id} 
                    className={`hover:bg-slate-50/50 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/20' : 'bg-white'} ${isZero ? 'bg-amber-50/20' : ''}`}
                  >
                    {/* ID Pratica */}
                    <td className="py-3.5 px-3 border-r border-slate-155 font-mono text-[10px] text-slate-500 font-bold text-center">
                      {p.id.replace('prat_', 'PR-')}
                    </td>
                    
                    {/* Numero Campione */}
                    <td className="py-3.5 px-3 border-r border-slate-155 font-mono font-bold text-slate-800">
                      {p.numeroCampione}
                    </td>

                    {/* Cliente / Ragione Sociale */}
                    <td className="py-3.5 px-4 border-r border-slate-155 font-bold text-slate-900 leading-tight">
                      {p.nomeCliente}
                    </td>

                    {/* Partita IVA */}
                    <td className="py-3.5 px-3 border-r border-slate-155 font-mono text-slate-600">
                      {p.partitaIva || (
                        <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded">Mancante</span>
                      )}
                    </td>

                    {/* Numero Offerta */}
                    <td className="py-3.5 px-3 border-r border-slate-155 font-mono text-slate-500">
                      {p.numeroPreventivo}
                    </td>

                    {/* Data Accettazione */}
                    <td className="py-3.5 px-3 border-r border-slate-155 text-slate-600 font-bold">
                      {p.dataAccettazione}
                    </td>

                    {/* Importo */}
                    <td className={`py-3.5 px-3 border-r border-slate-155 text-right font-bold text-slate-800 font-mono ${isZero ? 'text-rose-600 bg-red-50/30' : ''}`}>
                      {isZero ? (
                        <div className="inline-flex items-center gap-1 text-[10px] bg-amber-50 border border-amber-200 text-amber-800 px-1.5 py-0.5 rounded animate-pulse">
                          <AlertTriangle className="h-3 w-3 text-amber-600 block" />
                          € 0,00!
                        </div>
                      ) : (
                        <span>€ {p.importo.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      )}
                    </td>

                    {/* Stato Fatturazione */}
                    <td className="py-3.5 px-3 border-r border-slate-155 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border tracking-wide shadow-3xs ${
                        p.statoFatturazione === 'Fatturato'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-150'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-150'
                      }`}>
                        {p.statoFatturazione === 'Fatturato' ? (
                          <CheckCircle className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Clock className="h-3 w-3 text-indigo-500/85" />
                        )}
                        {p.statoFatturazione}
                      </span>
                    </td>

                    {/* Numero Fattura */}
                    <td className="py-3.5 px-3 border-r border-slate-155 font-mono text-[11px] text-center font-bold text-slate-800">
                      {p.numeroFattura ? (
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono font-bold text-[10.5px]">🧾 {p.numeroFattura}</span>
                      ) : (
                        <span className="text-slate-400 italic font-normal text-[10.5px]">-</span>
                      )}
                    </td>

                    {/* Data Fattura */}
                    <td className="py-3.5 px-3 border-r border-slate-155 text-center text-slate-500 font-mono text-[10.5px]">
                      {p.dataFattura || '-'}
                    </td>

                    {/* Azioni Modifica */}
                    <td className="py-3 px-6 text-center select-none print:hidden">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1 px-2 py-1 bg-slate-900 border-0 hover:bg-slate-800 text-white rounded-lg text-2xs font-extrabold shadow-3xs transition flex items-center justify-center gap-1 cursor-pointer mx-auto"
                      >
                        <Lock className="h-2.5 w-2.5" />
                        Firma & Gestisci
                      </button>
                    </td>
                  </tr>
                );
              })}

              {sortedPratiche.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 font-semibold italic text-xs">
                    Nessuna pratica contabile corrisponde ai filtri di ricerca selezionati.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Change Status Modal & Validation PIN */}
      <AnimatePresence>
        {editingPraticaId && (() => {
          const matchingPratica = pratiche.find(p => p.id === editingPraticaId);
          if (!matchingPratica) return null;

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 text-slate-700"
              >
                {/* Modal Header */}
                <div className="p-4 bg-slate-950 text-white flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-2">
                    <BadgeEuro className="h-5 w-5 text-indigo-400 block shrink-0" />
                    <div>
                      <h3 className="font-extrabold text-sm uppercase tracking-wider">Gestione Stato Pratica</h3>
                      <p className="text-[10px] text-slate-400 font-mono">Campione: {matchingPratica.numeroCampione}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setEditingPraticaId(null)}
                    className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer border-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4 text-xs text-left">
                  {/* Current info */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] leading-relaxed">
                    <p className="font-medium text-slate-600">Cliente pagatore: <strong className="text-slate-900 font-extrabold">{matchingPratica.nomeCliente}</strong></p>
                    <p className="font-mono text-slate-500 mt-0.5">Cod. Preventivo: {matchingPratica.numeroPreventivo} &bull; Importo: <strong className="text-slate-800">€ {matchingPratica.importo.toFixed(2)}</strong></p>
                  </div>

                  {/* Select status input */}
                  <div className="space-y-1.5">
                    <label className="block font-black text-slate-500 uppercase text-[9px] tracking-widest">
                      Seleziona Nuovo Stato di Fatturazione:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { val: 'Da fatturare', label: '⏳ Da fatturare' },
                        { val: 'Fatturato', label: '✅ Fatturato' }
                      ].map(st => (
                        <button
                          key={st.val}
                          type="button"
                          onClick={() => {
                            setSelectedStatus(st.val as any);
                            setModalError(null);
                          }}
                          className={`p-2.5 rounded-xl border text-center font-bold tracking-wide text-xs transition cursor-pointer ${
                            selectedStatus === st.val
                              ? 'bg-slate-950 text-white border-slate-950 shadow-md'
                              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-150'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Absolute conditional inputs for Invoice number and invoice date */}
                  <AnimatePresence>
                    {selectedStatus === 'Fatturato' && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-3 pt-1 border-t border-slate-100 mt-2"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="block font-black text-slate-500 uppercase text-[8.5px] tracking-wider">
                              Numero Fattura (*):
                            </label>
                            <input
                              type="text"
                              value={invoiceNumber}
                              onChange={(e) => setInvoiceNumber(e.target.value)}
                              placeholder="Es: FT-2026-0099"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-950 text-slate-800"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block font-black text-slate-500 uppercase text-[8.5px] tracking-wider">
                              Data Fattura (*):
                            </label>
                            <input
                              type="date"
                              value={invoiceDate}
                              onChange={(e) => setInvoiceDate(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-slate-950 text-slate-800"
                              required
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Note */}
                  <div className="space-y-1">
                    <label className="block font-black text-slate-500 uppercase text-[9px] tracking-widest">
                      Note Addizionali:
                    </label>
                    <textarea
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      placeholder="Commenti, estremi bollo, sconti ecc..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-950 text-slate-800 h-14 resize-none"
                    />
                  </div>

                  {/* Selected Operator (signature annotation) */}
                  <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="block font-black text-slate-600 uppercase text-[8.5px] tracking-widest flex items-center gap-1">
                      Operatore Firmatario
                    </span>
                    <select
                      value={selectedOperator}
                      onChange={(e) => setSelectedOperator(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[10.5px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950"
                    >
                      {operators.map(op => (
                        <option key={op.nome} value={op.nome}>{op.nome}</option>
                      ))}
                    </select>
                  </div>

                  {modalError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[10.5px] font-semibold text-rose-700 animate-fadeIn leading-relaxed">
                      ⚠️ {modalError}
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPraticaId(null)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-100 transition cursor-pointer text-center"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={confirmStatusChange}
                    className="flex-1 py-2 rounded-xl bg-slate-950 text-white font-bold hover:bg-slate-900 transition shadow-md cursor-pointer text-center"
                  >
                    Registra e Firma
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
