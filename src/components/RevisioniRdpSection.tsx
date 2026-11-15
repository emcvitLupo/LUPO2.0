import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  ArrowLeft,
  CheckCircle2,
  FilePlus,
  History,
  FileText,
  Lock,
  Unlock,
  Search,
  ExternalLink,
  AlertTriangle,
  Building2,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { AccettazioneCampione, Client, Operator, RevisioneRDP } from '../types';

interface RevisioniRdpSectionProps {
  accettazioni: AccettazioneCampione[];
  clients: Client[];
  operators: Operator[];
  userProfileName?: string | null;
  revisioneSelectedAccId: string;
  setRevisioneSelectedAccId: (val: string) => void;
  revisioneTipologiaInput: string;
  setRevisioneTipologiaInput: (val: string) => void;
  revisioneMotivoInput: string;
  setRevisioneMotivoInput: (val: string) => void;
  revisioneOperatore: string;
  setRevisioneOperatore: (val: string) => void;
  revisioneSuccessMessage: string | null;
  setRevisioneSuccessMessage: (val: string | null) => void;
  handleStartRevisionBozza: (accId: string, motivo: string, tipologia: string, operatore: string) => void;
  handleCancelRevisionBozza: (accId: string, operatore?: string) => void;
  setDiffAccId: (val: string | null) => void;
  setDiffSnapshot: (val: RevisioneRDP | null) => void;
  setDiffModalOpen: (val: boolean) => void;
  onGoToAccettazione: (accId: string, fromContextLabel?: string) => void;
  onGoToClient?: (clientId: string, fromContextLabel?: string) => void;
  onBackToDashboard: () => void;
}

export const RevisioniRdpSection: React.FC<RevisioniRdpSectionProps> = ({
  accettazioni,
  clients,
  operators,
  userProfileName,
  revisioneSelectedAccId,
  setRevisioneSelectedAccId,
  revisioneTipologiaInput,
  setRevisioneTipologiaInput,
  revisioneMotivoInput,
  setRevisioneMotivoInput,
  revisioneOperatore,
  setRevisioneOperatore,
  revisioneSuccessMessage,
  setRevisioneSuccessMessage,
  handleStartRevisionBozza,
  handleCancelRevisionBozza,
  setDiffAccId,
  setDiffSnapshot,
  setDiffModalOpen,
  onGoToAccettazione,
  onGoToClient,
  onBackToDashboard,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'tutte' | 'bozza' | 'vigenti'>('tutte');
  const [sampleSelectorFilter, setSampleSelectorFilter] = useState('');

  const getClientName = (acc: AccettazioneCampione) => {
    const cl = clients.find(
      c => c.id === acc.intestatarioRapportoClienteId || c.id === acc.destinatarioFatturaClienteId
    );
    return cl?.denominazione || 'Cliente N/D';
  };

  // Campioni candidati per nuova revisione (con stato Completato o risultati inseriti o già emessi)
  const completedAccettazioni = useMemo(() => {
    return accettazioni.filter(a => {
      const hasResults = (a.risultatiAnalisi || []).some(r => r.valoreRilevato && r.valoreRilevato.trim() !== '');
      const isCompleted =
        a.analisiStato === 'Completato' ||
        hasResults ||
        (a.revisioneCorrente !== undefined && a.revisioneCorrente > 0);
      if (!isCompleted) return false;
      if (!sampleSelectorFilter.trim()) return true;
      const q = sampleSelectorFilter.toLowerCase();
      const clName = getClientName(a).toLowerCase();
      return (
        a.codiceAccettazione.toLowerCase().includes(q) ||
        (a.descrizioneCampione || '').toLowerCase().includes(q) ||
        (a.matrice || '').toLowerCase().includes(q) ||
        clName.includes(q)
      );
    });
  }, [accettazioni, clients, sampleSelectorFilter]);

  const selectedAcc = accettazioni.find(a => a.id === revisioneSelectedAccId);
  const currentRev = selectedAcc?.revisioneCorrente || 0;
  const nextRev = currentRev + 1;
  const isAlreadyInBozza = selectedAcc?.statoRevisione === 'In Bozza';

  // Tutti i campioni che hanno almeno una revisione o sono in bozza di revisione
  const revisedSamplesAll = useMemo(() => {
    return accettazioni.filter(
      a =>
        (a.revisioneCorrente !== undefined && a.revisioneCorrente > 0) ||
        (a.storicoRevisioni && a.storicoRevisioni.length > 0) ||
        a.statoRevisione === 'In Bozza'
    );
  }, [accettazioni]);

  const inBozzaCount = useMemo(
    () => revisedSamplesAll.filter(a => a.statoRevisione === 'In Bozza').length,
    [revisedSamplesAll]
  );
  const vigentiCount = useMemo(
    () => revisedSamplesAll.filter(a => a.statoRevisione !== 'In Bozza').length,
    [revisedSamplesAll]
  );

  const filteredRevisedSamples = useMemo(() => {
    return revisedSamplesAll.filter(acc => {
      if (statusFilter === 'bozza' && acc.statoRevisione !== 'In Bozza') return false;
      if (statusFilter === 'vigenti' && acc.statoRevisione === 'In Bozza') return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const clName = getClientName(acc).toLowerCase();
      const matchHistory = (acc.storicoRevisioni || []).some(
        r =>
          (r.motivoRevisione || '').toLowerCase().includes(q) ||
          (r.operatoreEmissione || '').toLowerCase().includes(q) ||
          (r.tipologiaRevisione || '').toLowerCase().includes(q)
      );
      return (
        acc.codiceAccettazione.toLowerCase().includes(q) ||
        (acc.descrizioneCampione || '').toLowerCase().includes(q) ||
        (acc.matrice || '').toLowerCase().includes(q) ||
        (acc.revisioneMotivo || '').toLowerCase().includes(q) ||
        clName.includes(q) ||
        matchHistory
      );
    });
  }, [revisedSamplesAll, statusFilter, searchTerm, clients]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Istituzionale */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <button
            onClick={onBackToDashboard}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0 cursor-pointer"
            title="Torna alla Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-md shadow-rose-200 shrink-0">
            <GitCompare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                Revisione &amp; Riemissione Rapporti di Prova (RdP)
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Conforme UNI CEI EN ISO/IEC 17025 §7.8.8 &amp; ACCREDIA
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Workflow controllato a 3 fasi: Avvio Bozza &rarr; Modifica / Confronto Diff &rarr; Approvazione e Firma Definitiva con congelamento storico della versione sostituita.
            </p>
          </div>
        </div>

        {/* KPI Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setStatusFilter('tutte')}
            className={`px-4 py-2.5 rounded-xl border flex items-center gap-3 transition cursor-pointer ${
              statusFilter === 'tutte' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
            }`}
          >
            <div className="text-right">
              <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'tutte' ? 'text-slate-300' : 'text-slate-400'}`}>
                Totale Revisionati
              </p>
              <p className="text-lg font-extrabold leading-none mt-0.5">{revisedSamplesAll.length}</p>
            </div>
          </button>

          <button
            onClick={() => setStatusFilter('bozza')}
            className={`px-4 py-2.5 rounded-xl border flex items-center gap-3 transition cursor-pointer ${
              statusFilter === 'bozza' ? 'bg-amber-500 text-white border-amber-600' : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <div className="text-right">
              <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'bozza' ? 'text-amber-100' : 'text-amber-700'}`}>
                In Bozza (Aperti)
              </p>
              <p className="text-lg font-extrabold leading-none mt-0.5">{inBozzaCount}</p>
            </div>
          </button>

          <button
            onClick={() => setStatusFilter('vigenti')}
            className={`px-4 py-2.5 rounded-xl border flex items-center gap-3 transition cursor-pointer ${
              statusFilter === 'vigenti' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <div className="text-right">
              <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'vigenti' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                Vigenti (Bloccati)
              </p>
              <p className="text-lg font-extrabold leading-none mt-0.5">{vigentiCount}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {revisioneSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-bold text-emerald-900">{revisioneSuccessMessage}</span>
          </div>
          <div className="flex items-center gap-2">
            {revisioneSelectedAccId && (
              <button
                onClick={() => onGoToAccettazione(revisioneSelectedAccId, 'Revisioni & Riemissioni RdP')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Vai al Campione in Accettazione
              </button>
            )}
            <button
              onClick={() => setRevisioneSuccessMessage(null)}
              className="text-emerald-600 hover:text-emerald-800 text-xs font-bold px-2 py-1 cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Colonna Sinistra (5 col): Avvio Nuova Revisione Controllata */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-rose-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FilePlus className="w-4 h-4 text-rose-600" />
                1. Avvio Nuova Revisione Controllata
              </h3>
              <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                Sblocco Modifiche RdP
              </span>
            </div>

            <div className="space-y-4">
              {/* Ricerca rapida nel selettore campioni */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Seleziona Rapporto di Prova (RdP) da Revisionare *
                </label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={sampleSelectorFilter}
                    onChange={e => setSampleSelectorFilter(e.target.value)}
                    placeholder="Filtra elenco campioni per codice, cliente o matrice..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <select
                  value={revisioneSelectedAccId}
                  onChange={e => {
                    setRevisioneSelectedAccId(e.target.value);
                    const found = accettazioni.find(a => a.id === e.target.value);
                    if (found && found.firmatarioTecnico) {
                      setRevisioneOperatore(found.firmatarioTecnico);
                    } else if (!revisioneOperatore) {
                      setRevisioneOperatore(operators[0]?.nome || '');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">-- Seleziona un Campione / RdP ({completedAccettazioni.length} disponibili) --</option>
                  {completedAccettazioni.map(acc => {
                    const clName = getClientName(acc);
                    return (
                      <option key={acc.id} value={acc.id}>
                        {acc.codiceAccettazione} — {acc.descrizioneCampione || acc.matrice} ({clName}) [Rev. {String(acc.revisioneCorrente || 0).padStart(2, '0')}
                        {acc.statoRevisione === 'In Bozza' ? ' - IN BOZZA' : ''}]
                      </option>
                    );
                  })}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Il rapporto originale verrà congelato nello storico come &ldquo;Annullato e Sostituito&rdquo;.
                </p>
              </div>

              {selectedAcc && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {selectedAcc.codiceAccettazione}
                      </span>
                      <span className="text-xs font-bold text-slate-700 truncate">
                        {selectedAcc.descrizioneCampione || selectedAcc.matrice}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-400" />
                      Committente: <strong className="text-slate-700">{getClientName(selectedAcc)}</strong>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onGoToAccettazione(selectedAcc.id, 'Revisioni & Riemissioni RdP')}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-indigo-50 text-indigo-600 border border-slate-200 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Apri RdP
                  </button>
                </div>
              )}

              {isAlreadyInBozza && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-medium flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Attenzione:</strong> Questo campione è già in stato <strong>&ldquo;In Bozza (Rev. {String(currentRev).padStart(2, '0')})&rdquo;</strong>.
                    Puoi modificarne i parametri nella sezione <em>Accettazione Campioni</em> e poi approvare o annullare la bozza dalla colonna di destra.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    2. Tipologia di Revisione (ISO 17025) *
                  </label>
                  <select
                    value={revisioneTipologiaInput}
                    onChange={e => setRevisioneTipologiaInput(e.target.value)}
                    disabled={isAlreadyInBozza}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
                  >
                    <option value="Errore materiale / battitura">Errore materiale / battitura (dati anagrafici, descrizione)</option>
                    <option value="Rettifica valore analitico / ricalcolo">Rettifica valore analitico / ricalcolo formula</option>
                    <option value="Aggiunta / integrazione prove analitiche">Aggiunta / integrazione prove analitiche</option>
                    <option value="Modifica conformità / pareri e interpretazioni">Modifica giudizio di conformità / pareri e interpretazioni</option>
                    <option value="Richiesta formale del committente">Richiesta formale del committente</option>
                    <option value="Altro">Altro (specificare nel motivo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    3. Operatore / Responsabile *
                  </label>
                  <select
                    value={revisioneOperatore}
                    onChange={e => setRevisioneOperatore(e.target.value)}
                    disabled={isAlreadyInBozza}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
                  >
                    <option value="">-- Seleziona Responsabile --</option>
                    {operators
                      .filter(o => o.attivo !== false && o.autorizzatoFirma !== false)
                      .map(op => (
                        <option key={op.nome} value={op.nome}>
                          {op.nome} ({op.ruoloFirma || op.ruolo})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  4. Motivazione Dettagliata della Rettifica (stampata sul nuovo RdP) *
                </label>
                <textarea
                  rows={3}
                  value={revisioneMotivoInput}
                  onChange={e => setRevisioneMotivoInput(e.target.value)}
                  disabled={isAlreadyInBozza}
                  placeholder="Fornisci una chiara spiegazione tecnica del motivo della revisione (es. 'Rettifica della formula di calcolo dell'acidità a seguito di ricalibrazione dello strumento')..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              {selectedAcc ? (
                <span>
                  Passaggio previsto:{' '}
                  <strong className="text-slate-700">Rev. {String(currentRev).padStart(2, '0')}</strong> &rarr;{' '}
                  <strong className="text-rose-600">Bozza Rev. {String(nextRev).padStart(2, '0')}</strong>
                </span>
              ) : (
                <span>Seleziona un campione per calcolare la revisione</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!revisioneSelectedAccId) {
                  alert('Seleziona prima un Campione / RdP da revisionare.');
                  return;
                }
                if (!revisioneMotivoInput.trim()) {
                  alert('Inserisci la motivazione obbligatoria della revisione/riemissione.');
                  return;
                }
                if (!revisioneOperatore) {
                  alert('Seleziona l\'operatore / responsabile che avvia la revisione.');
                  return;
                }
                const targetAcc = accettazioni.find(a => a.id === revisioneSelectedAccId);
                if (targetAcc) {
                  handleStartRevisionBozza(
                    revisioneSelectedAccId,
                    revisioneMotivoInput,
                    revisioneTipologiaInput,
                    revisioneOperatore
                  );
                  setRevisioneSuccessMessage(
                    `Bozza Rev. ${String((targetAcc.revisioneCorrente || 0) + 1).padStart(2, '0')} avviata per ${targetAcc.codiceAccettazione}. Il campione è ora sbloccato per le modifiche.`
                  );
                  setRevisioneMotivoInput('');
                }
              }}
              disabled={!revisioneSelectedAccId || !revisioneMotivoInput.trim() || !revisioneOperatore || isAlreadyInBozza}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              Avvia Bozza Rev. {selectedAcc ? String(nextRev).padStart(2, '0') : ''} (Sblocca RdP)
            </button>
          </div>
        </div>

        {/* Colonna Destra (7 col): Registro Storico & Gestione Revisioni */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-rose-600" />
                2. Registro Storico Revisioni &amp; Approvazione Bozze
              </h3>

              {/* Tabs filtro stato */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setStatusFilter('tutte')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'tutte'
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Tutte ({revisedSamplesAll.length})
                </button>
                <button
                  onClick={() => setStatusFilter('bozza')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'bozza'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  In Bozza ({inBozzaCount})
                </button>
                <button
                  onClick={() => setStatusFilter('vigenti')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'vigenti'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Vigenti ({vigentiCount})
                </button>
              </div>
            </div>

            {/* Barra di ricerca nel registro */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Cerca nel registro per codice campione, cliente, motivazione o operatore..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* Lista Campioni Revisionati */}
            {filteredRevisedSamples.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-600">
                  {revisedSamplesAll.length === 0
                    ? 'Nessun Rapporto di Prova risulta ancora sottoposto a revisione.'
                    : 'Nessun Rapporto di Prova corrisponde ai filtri selezionati.'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Usa il pannello a sinistra per avviare una revisione controllata su un RdP emesso.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {filteredRevisedSamples.map(acc => {
                  const lastRev =
                    acc.storicoRevisioni && acc.storicoRevisioni.length > 0
                      ? acc.storicoRevisioni[acc.storicoRevisioni.length - 1]
                      : null;
                  const isBozza = acc.statoRevisione === 'In Bozza';
                  const clientObj = clients.find(
                    c => c.id === acc.intestatarioRapportoClienteId || c.id === acc.destinatarioFatturaClienteId
                  );

                  return (
                    <div
                      key={acc.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                        isBozza
                          ? 'bg-amber-50/50 border-amber-300 shadow-xs'
                          : 'bg-slate-50/70 border-slate-200 hover:border-rose-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-slate-800 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                              {acc.codiceAccettazione}
                            </span>

                            {isBozza ? (
                              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[11px] font-extrabold animate-pulse">
                                IN BOZZA — Rev. {String(acc.revisioneCorrente || 0).padStart(2, '0')} (Sbloccato)
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-extrabold flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Rev. {String(acc.revisioneCorrente || 0).padStart(2, '0')} (Vigente)
                              </span>
                            )}

                            {(acc.tipologiaRevisione || lastRev?.tipologiaRevisione) && (
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-100 rounded text-[10px] font-bold">
                                {acc.tipologiaRevisione || lastRev?.tipologiaRevisione}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                            <p className="text-xs font-bold text-slate-700">
                              {acc.descrizioneCampione || acc.matrice}
                            </p>
                            {clientObj && (
                              <button
                                type="button"
                                onClick={() =>
                                  onGoToClient &&
                                  onGoToClient(clientObj.id, `Revisioni RdP (${acc.codiceAccettazione})`)
                                }
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                              >
                                <Building2 className="w-3 h-3" />
                                {clientObj.denominazione}
                              </button>
                            )}
                          </div>

                          {(acc.revisioneMotivo || lastRev) && (
                            <p className="text-[11px] text-slate-600 mt-1.5 bg-white/80 p-2 rounded-lg border border-slate-200/80">
                              <strong className="text-slate-700">Motivazione:</strong> &ldquo;
                              {acc.revisioneMotivo || lastRev?.motivoRevisione || 'N/A'}&rdquo;
                              {(acc.dataRevisione || lastRev?.dataOraEmissione) && (
                                <span className="text-slate-400 ml-1">
                                  — {acc.dataRevisione || lastRev?.dataOraEmissione} ({acc.firmatarioTecnico || lastRev?.operatoreEmissione})
                                </span>
                              )}
                            </p>
                          )}
                        </div>

                        {/* Azioni Rapide */}
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          <button
                            onClick={() => {
                              setDiffAccId(acc.id);
                              setDiffSnapshot(null);
                              setDiffModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                            title="Confronta le differenze analitiche e anagrafiche tra le versioni dell'RdP"
                          >
                            <GitCompare className="w-3.5 h-3.5" />
                            Diff
                          </button>

                          {isBozza && (
                            <>
                              <button
                                onClick={() =>
                                  onGoToAccettazione(
                                    acc.id,
                                    `Bozza Rev. ${String(acc.revisioneCorrente || 0).padStart(2, '0')} (${acc.codiceAccettazione})`
                                  )
                                }
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                title="Vai al campione per modificare i risultati analitici prima di approvare"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Modifica Dati
                              </button>
                              <button
                                onClick={() => {
                                  setDiffAccId(acc.id);
                                  setDiffSnapshot(null);
                                  setDiffModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                                title="Apri il confronto Diff e approva ufficialmente la Revisione"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" /> Approva
                              </button>
                              <button
                                onClick={() => {
                                  const prevRev = Math.max(0, (acc.revisioneCorrente || 1) - 1);
                                  if (
                                    window.confirm(
                                      `Annullare la bozza di revisione in corso per ${acc.codiceAccettazione} e ripristinare i dati congelati alla Rev. ${String(prevRev).padStart(2, '0')}?`
                                    )
                                  ) {
                                    handleCancelRevisionBozza(acc.id, userProfileName || undefined);
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                                title="Annulla la Bozza e ripristina i dati della versione precedente"
                              >
                                Annulla Bozza
                              </button>
                            </>
                          )}

                          {!isBozza && (
                            <button
                              onClick={() =>
                                onGoToAccettazione(
                                  acc.id,
                                  `Revisioni RdP (${acc.codiceAccettazione})`
                                )
                              }
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Apri RdP
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Visualizzati <strong>{filteredRevisedSamples.length}</strong> su <strong>{revisedSamplesAll.length}</strong> RdP revisionati
            </span>
            <span>
              💡 <strong>Norma ISO/IEC 17025 §7.8.8:</strong> Ogni revisione riemessa conserva lo snapshot integrale della versione sostituita.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
