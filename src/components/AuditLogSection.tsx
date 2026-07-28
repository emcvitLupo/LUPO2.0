import React, { useState, useMemo } from 'react';
import { AuditLog, Operator } from '../types';
import {
  History,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Trash2,
  RefreshCw,
  Tag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Info,
  Clock
} from 'lucide-react';

interface AuditLogSectionProps {
  auditLogs: AuditLog[];
  operators: Operator[];
  currentUser?: string | null;
  onClearLogs?: () => void;
}

export function AuditLogSection({
  auditLogs,
  operators,
  currentUser,
  onClearLogs
}: AuditLogSectionProps) {
  // Local filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string>('Tutti');
  const [operatorFilter, setOperatorFilter] = useState<string>('Tutti');
  const [dateFilter, setDateFilter] = useState<'tutti' | 'oggi' | '7giorni' | '30giorni'>('tutti');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Available unique sections from logs
  const availableSections = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach(log => {
      if (log.sezione) set.add(log.sezione);
    });
    return Array.from(set).sort();
  }, [auditLogs]);

  // Available operators from logs
  const availableLogUsers = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach(log => {
      if (log.utente) set.add(log.utente);
    });
    return Array.from(set).sort();
  }, [auditLogs]);

  // Filter logs logic
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          (log.utente || '').toLowerCase().includes(term) ||
          (log.sezione || '').toLowerCase().includes(term) ||
          (log.campo || '').toLowerCase().includes(term) ||
          (log.valorePrecedente || '').toLowerCase().includes(term) ||
          (log.valoreNuovo || '').toLowerCase().includes(term) ||
          (log.dataOra || '').toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      // Section
      if (sectionFilter !== 'Tutti' && log.sezione !== sectionFilter) {
        return false;
      }

      // Operator
      if (operatorFilter !== 'Tutti' && log.utente !== operatorFilter) {
        return false;
      }

      // Date preset
      if (dateFilter !== 'tutti' && log.dataOra) {
        // Log dataOra format: "DD/MM/YYYY, HH:MM:SS" or "YYYY-MM-DD"
        const parts = log.dataOra.split(',')[0].trim().split('/');
        if (parts.length === 3) {
          const logDate = new Date(
            parseInt(parts[2], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[0], 10)
          );
          const now = new Date();
          const diffDays = (now.getTime() - logDate.getTime()) / (1000 * 3600 * 24);

          if (dateFilter === 'oggi' && diffDays > 1.2) return false;
          if (dateFilter === '7giorni' && diffDays > 7.5) return false;
          if (dateFilter === '30giorni' && diffDays > 30.5) return false;
        }
      }

      return true;
    });
  }, [auditLogs, searchTerm, sectionFilter, operatorFilter, dateFilter]);

  // Reset page on filter change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sectionFilter, operatorFilter, dateFilter, pageSize]);

  // Paginated subset
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Quick stats
  const stats = useMemo(() => {
    const total = auditLogs.length;
    const now = new Date();
    const todayStr = now.toLocaleDateString('it-IT');
    const todayCount = auditLogs.filter(l => l.dataOra && l.dataOra.includes(todayStr)).length;
    const uniqueUsers = new Set(auditLogs.map(l => l.utente)).size;
    const lastLog = auditLogs[0];

    return { total, todayCount, uniqueUsers, lastLog };
  }, [auditLogs]);

  // Section Badge Style Helper
  const getSectionBadgeStyle = (sezione: string) => {
    const s = (sezione || '').toLowerCase();
    if (s.includes('accettazione') || s.includes('campione')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (s.includes('preventiv')) {
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    }
    if (s.includes('fattur') || s.includes('amm')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    if (s.includes('client')) {
      return 'bg-sky-50 text-sky-800 border-sky-200';
    }
    if (s.includes('reagent')) {
      return 'bg-rose-50 text-rose-800 border-rose-200';
    }
    if (s.includes('operator') || s.includes('ruol')) {
      return 'bg-purple-50 text-purple-800 border-purple-200';
    }
    return 'bg-slate-100 text-slate-800 border-slate-200';
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('Nessun dato da esportare per i filtri selezionati.');
      return;
    }

    const headers = ['Data e Ora', 'Utente / Operatore', 'Sezione', 'Operazione / Campo', 'Valore Precedente', 'Nuovo Valore'];
    const rows = filteredLogs.map(log => [
      `"${(log.dataOra || '').replace(/"/g, '""')}"`,
      `"${(log.utente || '').replace(/"/g, '""')}"`,
      `"${(log.sezione || '').replace(/"/g, '""')}"`,
      `"${(log.campo || '').replace(/"/g, '""')}"`,
      `"${(log.valorePrecedente || '').replace(/"/g, '""')}"`,
      `"${(log.valoreNuovo || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Registro_Attivita_AuditLog_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12 text-left">
      {/* HEADER PRINCIPALE */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl shrink-0">
            <History className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-850 tracking-tight">
                Registro Attività & Audit Log
              </h1>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-850 text-[10px] font-black uppercase tracking-widest rounded-md border border-emerald-200/60 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-emerald-600" /> ISO/IEC 17025
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed font-medium">
              Tracciamento cronologico e immutabile di tutte le operazioni di inserimento, modifica, eliminazione e avanzamento di stato effettuate nel software.
            </p>
          </div>
        </div>

        {/* AZIONI TESTATA */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          <button
            onClick={handleExportCSV}
            className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition shadow-3xs cursor-pointer"
            title="Esporta il registro in formato CSV per audit o archiviazione"
          >
            <Download className="h-4 w-4" /> Esporta CSV
          </button>

          {onClearLogs && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="bg-slate-100 hover:bg-rose-50 text-slate-650 hover:text-rose-700 border border-slate-200 hover:border-rose-200 rounded-xl px-3 py-2.5 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Azzera lo storico dei log salvati localmente"
            >
              <Trash2 className="h-4 w-4" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* KPI STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Totale Eventi */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
              Totale Operazioni
            </span>
            <span className="text-2xl font-black text-slate-850 tracking-tight">
              {stats.total.toLocaleString('it-IT')}
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <History className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 2: Attività Oggi */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
              Operazioni Oggi
            </span>
            <span className="text-2xl font-black text-emerald-700 tracking-tight">
              {stats.todayCount}
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 3: Operatori Coinvolti */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-3xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
              Operatori Unici
            </span>
            <span className="text-2xl font-black text-slate-850 tracking-tight">
              {stats.uniqueUsers}
            </span>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <User className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 4: Ultima Attività */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-3xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
              Ultima Operazione
            </span>
            <span className="text-xs font-extrabold text-slate-800 block truncate">
              {stats.lastLog ? stats.lastLog.campo : 'Nessuna'}
            </span>
            <span className="text-[10px] text-slate-400 block truncate font-mono">
              {stats.lastLog ? stats.lastLog.dataOra : '-'}
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* BARRA FILTRI & RICERCA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Cerca Testo libero */}
          <div className="lg:col-span-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca per operatore, campo, codice o valore..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 border border-slate-200 bg-slate-50/50 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
          </div>

          {/* Filtro Sezione */}
          <div className="lg:col-span-3">
            <select
              value={sectionFilter}
              onChange={e => setSectionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Tutti">Tutte le Sezioni ({availableSections.length})</option>
              {availableSections.map(s => (
                <option key={s} value={s}>
                  Sezione: {s}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Operatore */}
          <div className="lg:col-span-3">
            <select
              value={operatorFilter}
              onChange={e => setOperatorFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="Tutti">Tutti gli Operatori</option>
              {availableLogUsers.map(u => (
                <option key={u} value={u}>
                  Utente: {u}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Data */}
          <div className="lg:col-span-2">
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="tutti">Tutte le Date</option>
              <option value="oggi">Solo Oggi</option>
              <option value="7giorni">Ultimi 7 Giorni</option>
              <option value="30giorni">Ultimo Mese</option>
            </select>
          </div>
        </div>

        {/* Status filtrati e Reset rapido */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Mostrati <strong>{filteredLogs.length}</strong> risultati su <strong>{auditLogs.length}</strong> totali
          </span>

          {(searchTerm || sectionFilter !== 'Tutti' || operatorFilter !== 'Tutti' || dateFilter !== 'tutti') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSectionFilter('Tutti');
                setOperatorFilter('Tutti');
                setDateFilter('tutti');
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
            >
              Azzera Filtri
            </button>
          )}
        </div>
      </div>

      {/* TABELLA REGISTRO LOG */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10.5px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4 w-44">Data e Ora</th>
                <th className="py-3.5 px-3 w-36">Sezione</th>
                <th className="py-3.5 px-3 w-36">Operatore</th>
                <th className="py-3.5 px-4">Operazione / Modifica</th>
                <th className="py-3.5 px-4">Valore Precedente</th>
                <th className="py-3.5 px-4">Nuovo Valore</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedLogs.map((log, idx) => (
                <tr key={log.id || idx} className="hover:bg-slate-50/70 transition-colors">
                  {/* Data e Ora */}
                  <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{log.dataOra}</span>
                    </div>
                  </td>

                  {/* Sezione */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className={`inline-block px-2.5 py-1 rounded-md border text-[9.5px] font-black uppercase tracking-wider ${getSectionBadgeStyle(log.sezione)}`}>
                      {log.sezione || 'Generale'}
                    </span>
                  </td>

                  {/* Operatore */}
                  <td className="py-3 px-3 whitespace-nowrap font-bold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{log.utente || 'Sistema'}</span>
                    </div>
                  </td>

                  {/* Campo / Operazione */}
                  <td className="py-3 px-4 font-extrabold text-slate-900">
                    {log.campo}
                  </td>

                  {/* Valore Precedente */}
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px] max-w-xs truncate">
                    {log.valorePrecedente && log.valorePrecedente !== '-' ? (
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200/60 block truncate" title={log.valorePrecedente}>
                        {log.valorePrecedente}
                      </span>
                    ) : (
                      <span className="text-slate-300 italic">-</span>
                    )}
                  </td>

                  {/* Nuovo Valore */}
                  <td className="py-3 px-4 font-mono text-[11px] max-w-xs truncate">
                    {log.valoreNuovo && log.valoreNuovo !== '-' ? (
                      <span className="bg-emerald-50 text-emerald-900 font-medium px-2 py-0.5 rounded border border-emerald-200/60 block truncate" title={log.valoreNuovo}>
                        {log.valoreNuovo}
                      </span>
                    ) : (
                      <span className="text-slate-300 italic">-</span>
                    )}
                  </td>
                </tr>
              ))}

              {paginatedLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Info className="h-8 w-8 text-slate-300" />
                      <p className="font-bold text-slate-600">Nessuna registrazione trovata nel log.</p>
                      <p className="text-[11px] text-slate-400">Prova a modificare i filtri o la ricerca.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINAZIONE */}
        {filteredLogs.length > 0 && (
          <div className="bg-slate-50/80 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span>Righe per pagina:</span>
              <select
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span>
                Pagina <strong>{currentPage}</strong> di <strong>{totalPages}</strong>
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                >
                  &laquo; Prec
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                >
                  Succ &raquo;
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALE CONFERMA RESET LOG */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 text-left">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-xl">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-black text-slate-900">Azzera Registro Log Local</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Sei sicuro di voler azzerare lo storico locale delle attività? Questa operazione svuoterà la lista visualizzata.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  if (onClearLogs) onClearLogs();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 bg-rose-600 text-white font-extrabold rounded-xl text-xs hover:bg-rose-700 transition cursor-pointer shadow-3xs"
              >
                Sì, Azzera Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
