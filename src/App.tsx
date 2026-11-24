import { useEffect, lazy, Suspense } from 'react';
import { useAppData } from './hooks/useAppData';
import { SECTION_LABELS } from './utils/limsHelpers';

const ClientiSection = lazy(() => import('./components/ClientiSection').then(m => ({ default: m.ClientiSection })));
const ProveSection = lazy(() => import('./components/ProveSection').then(m => ({ default: m.ProveSection })));
const PreventiviSection = lazy(() => import('./components/PreventiviSection').then(m => ({ default: m.PreventiviSection })));
const ReagentarioSection = lazy(() => import('./components/ReagentarioSection').then(m => ({ default: m.ReagentarioSection })));
const AccettazioneSection = lazy(() => import('./components/AccettazioneSection').then(m => ({ default: m.AccettazioneSection })));
const FatturazioneSection = lazy(() => import('./components/FatturazioneSection').then(m => ({ default: m.FatturazioneSection })));
const StatisticheSection = lazy(() => import('./components/StatisticheSection').then(m => ({ default: m.StatisticheSection })));
const OperatoriSection = lazy(() => import('./components/OperatoriSection').then(m => ({ default: m.OperatoriSection })));
const AuditLogSection = lazy(() => import('./components/AuditLogSection').then(m => ({ default: m.AuditLogSection })));
const LoginModal = lazy(() => import('./components/LoginModal').then(m => ({ default: m.LoginModal })));
const DatabaseErrorModal = lazy(() => import('./components/DatabaseErrorModal').then(m => ({ default: m.DatabaseErrorModal })));
const AreeSpecialisticheSection = lazy(() => import('./components/AreeSpecialisticheSection').then(m => ({ default: m.AreeSpecialisticheSection })));
const RevisioniRdpSection = lazy(() => import('./components/RevisioniRdpSection').then(m => ({ default: m.RevisioniRdpSection })));
const StrumentazioneSection = lazy(() => import('./components/StrumentazioneSection').then(m => ({ default: m.StrumentazioneSection })));
const RdpDiffModal = lazy(() => import('./components/RdpDiffModal').then(m => ({ default: m.RdpDiffModal })));
import { TipologiaRevisione } from './types';

import { 
  Users, 
  FlaskConical, 
  FileSpreadsheet, 
  Archive, 
  LayoutDashboard, 
  Database,
  ArrowRight,
  ArrowLeft,
  Home,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingUp,
  FolderDot,
  FileText,
  BarChart3,
  KeyRound,
  Receipt,
  History,
  FolderSync,
  ShieldAlert,
  CheckCircle,
  LogIn,
  LogOut,
  Scale,
  GitCompare,
  Lock,
  Unlock,
  ShieldCheck,
  Wrench,
  Microscope,
  TestTubeDiagonal,
  Beaker,
  Gauge,
  UserCheck,
  BadgeEuro,
  RotateCcw,
  Menu,
  X
} from 'lucide-react';

export default function App() {
  const {
    clients,
    prove,
    pacchetti,
    preventivi,
    reagenti,
    reagentiRitirati,
    setReagentiRitirati,
    accettazioni,
    operators,
    praticheFatturazione,
    auditLogs,
    setAuditLogs,
    supabaseStatus,
    supabaseErrorMsg,
    userRole,
    actualRole,
    currentUser,
    userProfileName,
    showLoginModal,
    setShowLoginModal,
    showErrorModal,
    setShowErrorModal,
    initialPrintQuoteId,
    activeTab,
    setActiveTab,
    navigationHistory,
    handleNavigateBack,
    handleJumpToHistoryIndex,
    handleClearNavigationHistory,
    selectedClientId,
    setSelectedClientId,
    pendingQuoteClientId,
    setPendingQuoteClientId,
    preventiviInitialSubTab,
    setPreventiviInitialSubTab,
    selectedAccettazioneId,
    setSelectedAccettazioneId,
    pendingAccettazioneClientId,
    setPendingAccettazioneClientId,
    pendingAreeSpecTarget,
    setPendingAreeSpecTarget,
    pendingFatturazioneQuery,
    setPendingFatturazioneQuery,
    selectedProvaId,
    setSelectedProvaId,
    selectedPreventivoId,
    setSelectedPreventivoId,
    pendingAccettazionePreventivoId,
    setPendingAccettazionePreventivoId,
    mobileMenuOpen,
    setMobileMenuOpen,
    showRestoreModal,
    setShowRestoreModal,
    revisioneSelectedAccId,
    setRevisioneSelectedAccId,
    revisioneMotivoInput,
    setRevisioneMotivoInput,
    revisioneTipologiaInput,
    setRevisioneTipologiaInput,
    revisioneOperatore,
    setRevisioneOperatore,
    revisioneSuccessMessage,
    setRevisioneSuccessMessage,
    diffModalOpen,
    setDiffModalOpen,
    diffAccId,
    setDiffAccId,
    diffSnapshot,
    setDiffSnapshot,

    fetchUserRole,
    applyLocalAuthenticatedSession,
    handleLogout,
    handleAddAuditLogEntry,
    handleGoToClient,
    handleGoToProva,
    handleGoToPreventivo,
    handleGoToPacchetti,
    handleCreatePreventivoForClient,
    handleGoToAccettazione,
    handleCreateAccettazioneFromPreventivo,
    handleCreateAccettazioneForClient,
    handleGoToAreeSpecialistiche,
    handleGoToFatturazione,
    handleAddClient,
    handleDeleteClient,
    handleUpdateClient,
    handleAddProva,
    handleDeleteProva,
    handleUpdateProva,
    handleAddPreventivo,
    handleAddPacchetto,
    handleUpdatePacchetto,
    handleDeletePreventivo,
    handleDeletePacchetto,
    handleAddReagente,
    handleDeleteReagente,
    handleUpdateReagente,
    handleAddAccettazione,
    handleDeleteAccettazione,
    handleUpdateAccettazione,
    handleStartRevisionBozza,
    handleApproveAndEmitRevision,
    handleCancelRevisionBozza,
    handleEmitNewRevision,
    handleUpdateOperators,
    handleUpdateReagentiRitirati,
    handleSyncLocalData,
    handleUpdatePratiche,
    handleRestoreDefaults,
    handleAddStrumento,
    handleUpdateStrumento,
    handleDeleteStrumento,

    totaleClienti,
    fatturatoTotale,
    fatturatoMedio,
    campioniInLavorazioneCount,
    preventiviInAttesaCount,
    praticheDaFatturareCount,
    praticheDaIncassareCount,
    revisioniInBozzaCount,
    revisioniTotaliCount,
    topCategories,
    latestClients,
    reagentsNearExpiry,
    hasAccessTo,
    strumenti
  } = useAppData();

  // Scorciatoia da tastiera Alt + Freccia Sinistra per tornare alla schermata precedente
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowLeft' && navigationHistory.length > 0) {
        e.preventDefault();
        handleNavigateBack();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigationHistory.length, handleNavigateBack]);

  // Solo gli operatori con Stato: Attivo possono firmare o essere selezionati nei moduli operativi
  const activeOperators = operators.filter(op => op.attivo !== false);
  const lastHistoryEntry = navigationHistory.length > 0 ? navigationHistory[navigationHistory.length - 1] : null;

  if (initialPrintQuoteId) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-800 antialiased">
        <Suspense fallback={<div className="p-8 text-center text-white text-xs">Caricamento modulo preventivo...</div>}>
          <PreventiviSection
            preventivi={preventivi}
            pacchetti={pacchetti}
            clients={clients}
            prove={prove}
            onAddPreventivo={handleAddPreventivo}
            onAddPacchetto={handleAddPacchetto}
            onUpdatePacchetto={handleUpdatePacchetto}
            onDeletePreventivo={handleDeletePreventivo}
            onDeletePacchetto={handleDeletePacchetto}
            onGoToProva={handleGoToProva}
            operators={activeOperators}
            selectedPreventivoId={null}
            onClearSelectedPreventivo={() => {}}
            printOnlyId={initialPrintQuoteId}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/40 text-slate-700 font-sans flex flex-col lg:flex-row antialiased print:bg-white print:block">
      
      {/* SIDEBAR NAVIGATION (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 sticky top-0 h-screen shrink-0 justify-between overflow-y-auto pb-6 print:hidden">
        <div className="flex flex-col p-6 space-y-8">
          
          {/* Brand/Logo Layout */}
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                <Microscope className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xl font-serif italic font-extrabold tracking-tight text-slate-900">LUPO 2.0</span>
                <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-600 block leading-none mt-0.5">LabMerceologico</span>
              </div>
            </div>
            <div className="pl-1 pt-1">
              <span className="text-[11px] font-extrabold text-slate-800 block leading-tight tracking-tight">Agenzia per lo Sviluppo</span>
              <span className="text-[8.5px] uppercase font-semibold text-slate-400 block leading-tight mt-0.5">CCIAA Gran Sasso d'Italia</span>
            </div>
          </div>

          {/* Sidebar Tabs */}
          <nav className="space-y-1.5" id="sidebar-links">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className={`h-4 w-4 shrink-0 ${activeTab === 'dashboard' ? 'text-white' : 'text-indigo-500'}`} />
              <span>Dashboard</span>
            </button>

            {hasAccessTo('clienti') && (
              <button
                onClick={() => setActiveTab('clienti')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 cursor-pointer ${
                  activeTab === 'clienti'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="sidebar-clienti"
              >
                <div className="flex items-center gap-3">
                  <Users className={`h-4 w-4 shrink-0 ${activeTab === 'clienti' ? 'text-white' : 'text-blue-500'}`} />
                  <span>Clienti</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                  activeTab === 'clienti' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                }`}>
                  {totaleClienti}
                </span>
              </button>
            )}

            {hasAccessTo('prove') && (
              <button
                onClick={() => setActiveTab('prove')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                  activeTab === 'prove'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="sidebar-prove"
              >
                <FlaskConical className={`h-4 w-4 shrink-0 ${activeTab === 'prove' ? 'text-white' : 'text-amber-500'}`} />
                <span>Prove</span>
              </button>
            )}

            {hasAccessTo('areeSpecialistiche') && (
              <button
                onClick={() => setActiveTab('areeSpecialistiche')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                  activeTab === 'areeSpecialistiche'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="sidebar-aree-specialistiche"
              >
                <Scale className={`h-4 w-4 shrink-0 ${activeTab === 'areeSpecialistiche' ? 'text-white' : 'text-emerald-600'}`} />
                <span>Aree Specialistiche</span>
              </button>
            )}

            {hasAccessTo('preventivi') && (
              <button
                onClick={() => setActiveTab('preventivi')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 cursor-pointer ${
                  activeTab === 'preventivi'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="sidebar-preventivi"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className={`h-4 w-4 shrink-0 ${activeTab === 'preventivi' ? 'text-white' : 'text-emerald-500'}`} />
                  <span>Preventivi</span>
                </div>
                {preventiviInAttesaCount > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    activeTab === 'preventivi' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                  }`} title="Preventivi in attesa di approvazione">
                    {preventiviInAttesaCount}
                  </span>
                )}
              </button>
            )}

            {hasAccessTo('accettazione') && (
              <button
                onClick={() => setActiveTab('accettazione')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 cursor-pointer ${
                  activeTab === 'accettazione'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="sidebar-accettazione"
              >
                <div className="flex items-center gap-3">
                  <TestTubeDiagonal className={`h-4 w-4 shrink-0 ${activeTab === 'accettazione' ? 'text-white' : 'text-indigo-500'}`} />
                  <span>Accettazione Campioni</span>
                </div>
                {campioniInLavorazioneCount > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    activeTab === 'accettazione' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'
                  }`} title="Campioni in lavorazione">
                    {campioniInLavorazioneCount}
                  </span>
                )}
              </button>
            )}

            {hasAccessTo('revisioniRdp') && (
              <button
                onClick={() => setActiveTab('revisioniRdp')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 cursor-pointer ${
                  activeTab === 'revisioniRdp'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="sidebar-revisioni-rdp"
              >
                <div className="flex items-center gap-3">
                  <GitCompare className={`h-4 w-4 shrink-0 ${activeTab === 'revisioniRdp' ? 'text-white' : 'text-rose-600'}`} />
                  <span>Revisioni &amp; Riemissioni RdP</span>
                </div>
                {(revisioniInBozzaCount > 0 || revisioniTotaliCount > 0) && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    activeTab === 'revisioniRdp'
                      ? 'bg-white/20 text-white'
                      : revisioniInBozzaCount > 0
                        ? 'bg-amber-100 text-amber-800 font-bold'
                        : 'bg-rose-50 text-rose-700'
                  }`} title={revisioniInBozzaCount > 0 ? `${revisioniInBozzaCount} bozze di revisione aperte` : `${revisioniTotaliCount} RdP revisionati`}>
                    {revisioniInBozzaCount > 0 ? `!${revisioniInBozzaCount}` : revisioniTotaliCount}
                  </span>
                )}
              </button>
            )}

            {hasAccessTo('fatturazione') && (
              <button
                onClick={() => setActiveTab('fatturazione')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 cursor-pointer ${
                  activeTab === 'fatturazione'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="sidebar-fatturazione"
              >
                <div className="flex items-center gap-3">
                  <Receipt className={`h-4 w-4 shrink-0 ${activeTab === 'fatturazione' ? 'text-white' : 'text-amber-600'}`} />
                  <span>Fatturazione</span>
                </div>
                {praticheDaFatturareCount > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    activeTab === 'fatturazione' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'
                  }`} title="Pratiche da fatturare">
                    {praticheDaFatturareCount}
                  </span>
                )}
              </button>
            )}

            {hasAccessTo('reagentario') && (
              <button
                onClick={() => setActiveTab('reagentario')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center justify-between gap-3 cursor-pointer ${
                  activeTab === 'reagentario'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="sidebar-reagentario"
              >
                <div className="flex items-center gap-3">
                  <Beaker className={`h-4 w-4 shrink-0 ${activeTab === 'reagentario' ? 'text-white' : 'text-purple-500'}`} />
                  <span>Reagentario</span>
                </div>
                {reagentsNearExpiry.length > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    activeTab === 'reagentario' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600'
                  }`} title="Reagenti in scadenza o scaduti">
                    !{reagentsNearExpiry.length}
                  </span>
                )}
              </button>
            )}

            {hasAccessTo('strumenti') && (
              <button
                onClick={() => setActiveTab('strumenti')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                  activeTab === 'strumenti'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="sidebar-strumenti"
              >
                <Gauge className={`h-4 w-4 shrink-0 ${activeTab === 'strumenti' ? 'text-white' : 'text-cyan-600'}`} />
                <span>Strumentazione & Tarature</span>
              </button>
            )}

            {hasAccessTo('operatori') && (
              <button
                onClick={() => setActiveTab('operatori')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                  activeTab === 'operatori'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="sidebar-operatori"
              >
                <UserCheck className={`h-4 w-4 shrink-0 ${activeTab === 'operatori' ? 'text-white' : 'text-slate-700'}`} />
                <span>Gestione Operatori & Firme</span>
              </button>
            )}

            {hasAccessTo('audit') && (
              <button
                onClick={() => setActiveTab('audit')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                  activeTab === 'audit'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="sidebar-audit"
              >
                <History className={`h-4 w-4 shrink-0 ${activeTab === 'audit' ? 'text-white' : 'text-indigo-500'}`} />
                <span>Registro Attività / Log</span>
              </button>
            )}

            {hasAccessTo('statistiche') && (
              <button
                onClick={() => setActiveTab('statistiche')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                  activeTab === 'statistiche'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="sidebar-statistiche"
              >
                <BarChart3 className={`h-4 w-4 shrink-0 ${activeTab === 'statistiche' ? 'text-white' : 'text-emerald-600'}`} />
                <span>Statistiche & Report</span>
              </button>
            )}

          </nav>
        </div>

        {/* Unified Status & Auth Control Center */}
        <div className="mx-6 bg-slate-50 border border-slate-205 rounded-2xl divide-y divide-slate-150 overflow-hidden shadow-2xs">
          {/* Section A: Database Supabase */}
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-450 flex items-center gap-1.5">
                <Database className="h-3 w-3 text-emerald-600" /> Database Supabase
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${
                  supabaseStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                  supabaseStatus === 'loading' ? 'bg-amber-500 animate-pulse' :
                  supabaseStatus === 'error' ? 'bg-rose-500' :
                  'bg-slate-300'
                }`} />
                <span className="text-[9.5px] font-black uppercase text-slate-800">
                  {supabaseStatus === 'connected' ? 'Attivo' :
                   supabaseStatus === 'loading' ? 'Connessione...' :
                   supabaseStatus === 'error' ? 'Errore' :
                   'Non Attivo'}
                </span>
              </div>
            </div>

            {supabaseStatus === 'connected' ? (
              <div className="space-y-2">
                <p className="text-[9px] text-slate-500 leading-normal font-medium">
                  I tuoi dati sono sincronizzati in tempo reale con Supabase.
                </p>
                <button
                  onClick={handleSyncLocalData}
                  className="w-full text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <FolderSync className="h-3 w-3" /> Sincronizza Cloud
                </button>
              </div>
            ) : supabaseStatus === 'error' ? (
              <div className="space-y-1.5">
                <p className="text-[9px] text-rose-600 leading-normal font-semibold">
                  Errore di connessione. Tabelle o colonne mancanti.
                </p>
                <button
                  onClick={() => setShowErrorModal(true)}
                  className="w-full text-[9px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-1.5 px-2.5 rounded-lg border border-rose-200 uppercase tracking-wider transition cursor-pointer text-center"
                >
                  Dettaglio Errore
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[9px] text-slate-500 leading-normal">
                  Configura VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nel file .env.
                </p>
              </div>

                )}
          </div>

          {/* Section B: User Session */}
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-450 flex items-center gap-1.5">
                <KeyRound className="h-3 w-3 text-indigo-600" /> Sessione Utente
              </span>
              {currentUser ? (
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                  actualRole === 'AM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  userRole === 'admin' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 
                  'bg-blue-50 text-blue-850 border-blue-200'
                }`}>
                  {actualRole === 'AM' ? 'Amministrativo' :
                   userRole === 'admin' ? 'Amministratore' : 'Utente'}
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-slate-250">
                  Ospite
                </span>

                )}
            </div>

            {currentUser ? (
              <div className="space-y-2">
                <div className="text-[10px] text-slate-700 font-semibold truncate bg-slate-100/60 p-1.5 rounded-lg border border-slate-200/50 flex items-center gap-1.5" title={currentUser.email}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 animate-ping" />
                  <span className="truncate">{currentUser.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-[9px] bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 border border-slate-300/40"
                >
                  Disconnetti
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[9px] text-slate-500 leading-normal font-medium">
                  Effettua l'accesso per abilitare le operazioni di scrittura.
                </p>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="w-full text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <KeyRound className="h-3 w-3" /> Accedi
                </button>
              </div>
                )}
          </div>

        </div>

        {/* Restore Defaults button and footer */}
        <div className="p-6 border-t border-slate-100 space-y-4">
          <button
            onClick={() => setShowRestoreModal(true)}
            className="w-full text-[10px] bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2.5 rounded-xl border border-red-100 transition font-extrabold uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer"
            title="Ripristina dati di default"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Ripristina Demo
          </button>
          <div className="text-[10px] text-slate-400 text-center font-mono leading-none">
            LUPO v2.0 • 2026
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER & NAVIGATION */}
      <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-50 print:hidden">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-600 text-white rounded-lg">
            <Microscope className="h-4 w-4" />
          </div>
          <span className="text-lg font-serif italic font-extrabold tracking-tight text-slate-900">LUPO 2.0</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            <span>{mobileMenuOpen ? 'Chiudi' : 'Menu'}</span>
          </button>
        </div>
      </header>

      {/* MOBILE COMPANION DRAWER MENU */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-150 p-4 space-y-2 flex flex-col">
          <button
            onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
            className={`px-4 py-2.5 text-xs font-bold rounded-lg text-left flex items-center gap-3 ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-500' : 'text-slate-650'}`}
          >
            <LayoutDashboard className="h-4 w-4 text-indigo-500" />
            <span>Dashboard</span>
          </button>
          
          {hasAccessTo('clienti') && (
            <button
              onClick={() => { setActiveTab('clienti'); setMobileMenuOpen(false); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg text-left flex items-center gap-3 ${activeTab === 'clienti' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-500' : 'text-slate-650'}`}
            >
              <Users className="h-4 w-4 text-blue-500" />
              <span>Clienti</span>
            </button>
          )}

          {hasAccessTo('prove') && (
            <button
              onClick={() => { setActiveTab('prove'); setMobileMenuOpen(false); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg text-left flex items-center gap-3 ${activeTab === 'prove' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-500' : 'text-slate-650'}`}
            >
              <FlaskConical className="h-4 w-4 text-amber-500" />
              <span>Prove</span>
            </button>
          )}

          {hasAccessTo('areeSpecialistiche') && (
            <button
              onClick={() => { setActiveTab('areeSpecialistiche'); setMobileMenuOpen(false); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg text-left flex items-center gap-3 ${activeTab === 'areeSpecialistiche' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-500' : 'text-slate-650'}`}
            >
              <Scale className="h-4 w-4 text-emerald-600" />
              <span>Aree Specialistiche (Nutrizione & Rifiuti)</span>
            </button>
          )}

          {hasAccessTo('preventivi') && (
            <button
              onClick={() => { setActiveTab('preventivi'); setMobileMenuOpen(false); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg text-left flex items-center gap-3 ${activeTab === 'preventivi' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-500' : 'text-slate-650'}`}
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              <span>Preventivi</span>
            </button>
          )}

          {hasAccessTo('accettazione') && (
            <button
              onClick={() => { setActiveTab('accettazione'); setMobileMenuOpen(false); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg text-left flex items-center gap-3 ${activeTab === 'accettazione' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-500' : 'text-slate-650'}`}
            >
              <TestTubeDiagonal className="h-4 w-4 text-indigo-500" />
              <span>Accettazione Campioni</span>
            </button>
          )}

          {hasAccessTo('revisioniRdp') && (
            <button
              onClick={() => { setActiveTab('revisioniRdp'); setMobileMenuOpen(false); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg text-left flex items-center gap-3 ${activeTab === 'revisioniRdp' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-500' : 'text-slate-650'}`}
            >
              <GitCompare className="h-4 w-4 text-rose-600" />
              <span>Revisioni &amp; Riemissioni RdP</span>
            </button>
          )}

          {hasAccessTo('fatturazione') && (
            <button
              onClick={() => { setActiveTab('fatturazione'); setMobileMenuOpen(false); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg text-left flex items-center gap-3 ${activeTab === 'fatturazione' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-500' : 'text-slate-650'}`}
            >
              <Receipt className="h-4 w-4 text-amber-600" />
              <span>Fatturazione</span>
            </button>
          )}

          {hasAccessTo('reagentario') && (
            <button
              onClick={() => { setActiveTab('reagentario'); setMobileMenuOpen(false); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg text-left flex items-center gap-3 ${activeTab === 'reagentario' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-500' : 'text-slate-650'}`}
            >
              <Beaker className="h-4 w-4 text-purple-500" />
              <span>Reagentario</span>
            </button>
          )}

          {hasAccessTo('strumenti') && (
            <button
              onClick={() => { setActiveTab('strumenti'); setMobileMenuOpen(false); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg text-left flex items-center gap-3 ${activeTab === 'strumenti' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-500' : 'text-slate-650'}`}
            >
              <Gauge className="h-4 w-4 text-cyan-600" />
              <span>Strumentazione & Tarature</span>
            </button>
          )}

          {hasAccessTo('operatori') && (
            <button
              onClick={() => { setActiveTab('operatori'); setMobileMenuOpen(false); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg text-left flex items-center gap-3 ${activeTab === 'operatori' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-500' : 'text-slate-650'}`}
            >
              <UserCheck className="h-4 w-4 text-slate-700" />
              <span>Gestione Operatori & Firme</span>
            </button>
          )}

          {hasAccessTo('audit') && (
            <button
              onClick={() => { setActiveTab('audit'); setMobileMenuOpen(false); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg text-left flex items-center gap-3 ${activeTab === 'audit' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-500' : 'text-slate-650'}`}
            >
              <History className="h-4 w-4 text-indigo-500" />
              <span>Registro Attività / Log</span>
            </button>
          )}

          {hasAccessTo('statistiche') && (
            <button
              onClick={() => { setActiveTab('statistiche'); setMobileMenuOpen(false); }}
              className={`px-4 py-2.5 text-xs font-bold rounded-lg text-left flex items-center gap-3 ${activeTab === 'statistiche' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-500' : 'text-slate-650'}`}
            >
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              <span>Statistiche & Analisi</span>
            </button>
          )}

          {/* Mobile Supabase Status and Auth Widget */}

          <div className="border-t border-slate-150 pt-4 mt-2">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl divide-y divide-slate-150 overflow-hidden shadow-2xs">
              {/* Database Status */}
              <div className="p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] uppercase font-black tracking-wider text-slate-450 flex items-center gap-1">
                    <Database className="h-3 w-3 text-emerald-600" /> Database Supabase
                  </span>
                  <div className="flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      supabaseStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                      supabaseStatus === 'loading' ? 'bg-amber-500 animate-pulse' :
                      supabaseStatus === 'error' ? 'bg-rose-500' :
                      'bg-slate-300'
                    }`} />
                    <span className="text-[9.5px] font-black uppercase text-slate-800">
                      {supabaseStatus === 'connected' ? 'Attivo' : 'Non Attivo'}
                    </span>
                  </div>
                </div>
                {supabaseStatus === 'connected' && (
                  <button
                    onClick={() => { handleSyncLocalData(); setMobileMenuOpen(false); }}
                    className="w-full text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase py-1.5 px-2.5 rounded-lg transition-all"
                  >
                    Sincronizza Cloud
                  </button>

                )}
              </div>

              {/* User Session */}
              <div className="p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] uppercase font-black tracking-wider text-slate-450 flex items-center gap-1">
                    <KeyRound className="h-3 w-3 text-indigo-600" /> Sessione
                  </span>
                  {currentUser ? (
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                      actualRole === 'AM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      userRole === 'admin' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 
                      'bg-blue-50 text-blue-850 border-blue-200'
                    }`}>
                      {actualRole === 'AM' ? 'Amministrativo' :
                       userRole === 'admin' ? 'Amministratore' : 'Utente'}
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-slate-200">
                      Ospite
                    </span>

                )}
                </div>
                {currentUser ? (
                  <div className="space-y-2">
                    <div className="text-[9px] text-slate-750 font-semibold truncate bg-slate-100/60 p-1 rounded border border-slate-200/50 flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate">{currentUser.email}</span>
                    </div>
                    <button
                      onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                      className="w-full text-[9px] bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold uppercase py-1.5 px-2.5 rounded-lg transition"
                    >
                      Disconnetti
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShowLoginModal(true); setMobileMenuOpen(false); }}
                    className="w-full text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase py-1.5 px-2.5 rounded-lg transition"
                  >
                    Accedi
                  </button>

                )}
              </div>
            </div>

          </div>

          <button
            onClick={() => { setShowRestoreModal(true); setMobileMenuOpen(false); }}
            className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 rounded-lg text-left text-center mt-3 cursor-pointer hover:bg-red-100/50 transition "
          >
            Ripristina Demo
          </button>

        </div>
      )}

      {/* MAIN VIEWPORT PORT */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 overflow-y-auto print:p-0 print:overflow-visible print:max-w-none">
        
        {/* BARRA DI NAVIGAZIONE CONTESTUALE & TORNA ALLA SCHERMATA PRECEDENTE */}
        {(navigationHistory.length > 0 || activeTab !== 'dashboard') && (
          <div className="mb-5 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              {lastHistoryEntry && (
                <button
                  onClick={handleNavigateBack}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer"
                  title="Scorciatoia rapida: Alt + Freccia Sinistra"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Torna a: {lastHistoryEntry.label}</span>
                </button>
              )}

              {activeTab !== 'dashboard' && (
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <Home className="h-3.5 w-3.5 text-slate-500" />
                  <span>Dashboard</span>
                </button>
              )}

              {/* Breadcrumb delle schermate recenti */}
              {navigationHistory.length > 0 && (
                <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-500 ml-1 pl-2 border-l border-slate-200">
                  <Clock className="h-3 w-3 text-slate-400 mr-1 shrink-0" />
                  {navigationHistory.slice(-3).map((entry, idx) => {
                    const actualIdx = navigationHistory.length - Math.min(3, navigationHistory.length) + idx;
                    return (
                      <div key={`${entry.tab}-${entry.timestamp}-${actualIdx}`} className="flex items-center gap-1">
                        <button
                          onClick={() => handleJumpToHistoryIndex(actualIdx)}
                          className="hover:text-indigo-600 hover:underline font-semibold truncate max-w-[160px] cursor-pointer"
                          title={`Torna a ${entry.label}`}
                        >
                          {entry.label}
                        </button>
                        <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
                      </div>
                    );
                  })}
                  <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    {SECTION_LABELS[activeTab] || activeTab}
                  </span>
                </div>
              )}
            </div>

            {/* Azioni rapide trasversali nella barra superiore */}
            <div className="flex items-center gap-1.5">
              {activeTab !== 'clienti' && hasAccessTo('clienti') && (
                <button
                  onClick={() => setActiveTab('clienti')}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Users className="h-3.5 w-3.5 text-blue-500" />
                  <span>Clienti</span>
                </button>
              )}
              {activeTab !== 'preventivi' && hasAccessTo('preventivi') && (
                <button
                  onClick={() => setActiveTab('preventivi')}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Preventivi</span>
                </button>
              )}
              {activeTab !== 'accettazione' && hasAccessTo('accettazione') && (
                <button
                  onClick={() => setActiveTab('accettazione')}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <TestTubeDiagonal className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Campioni</span>
                </button>
              )}
              {activeTab !== 'fatturazione' && hasAccessTo('fatturazione') && (
                <button
                  onClick={() => setActiveTab('fatturazione')}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <BadgeEuro className="h-3.5 w-3.5 text-amber-600" />
                  <span>Fatture</span>
                </button>
              )}
              {navigationHistory.length > 1 && (
                <button
                  onClick={handleClearNavigationHistory}
                  className="text-[10px] text-slate-400 hover:text-slate-600 px-1.5 py-1 cursor-pointer"
                  title="Pulisci cronologia di navigazione"
                >
                  &times;
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB ACTIVE SELECT */}
        <div className="transition mt-2 lg:mt-0">
          
          {/* A) CHOSEN TAB: DASHBOARD */}
          {activeTab === 'dashboard' && hasAccessTo('dashboard') && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Titolo Tab + Stato Cloud & Utente Compatto */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight" id="dashboard-main-title">
                    Dashboard
                  </h1>
                  <p className="text-slate-500 mt-1 text-sm sm:text-base">
                    Benvenuto in LUPO 2.0 — monitora le attività operative in tempo reale o accedi ai moduli del laboratorio.
                  </p>
                </div>

                {/* Pillola compatta Stato Cloud & Sessione */}
                <div className="flex flex-wrap items-center gap-2.5 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-2xs">
                  <div className="flex items-center gap-2 pr-2.5 border-r border-slate-150">
                    <span className={`h-2 w-2 rounded-full ${
                      supabaseStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                      supabaseStatus === 'loading' ? 'bg-amber-500 animate-pulse' :
                      supabaseStatus === 'error' ? 'bg-rose-500' : 'bg-slate-300'
                    }`} />
                    <span className="text-[11px] font-bold text-slate-700">
                      Cloud: {supabaseStatus === 'connected' ? 'Sincronizzato' : supabaseStatus === 'error' ? 'Errore Schema' : 'Locale'}
                    </span>
                    {supabaseStatus === 'connected' && (
                      <button
                        onClick={handleSyncLocalData}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                        title="Sincronizza ora con Supabase"
                      >
                        <FolderSync className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {supabaseStatus === 'error' && (
                      <button
                        onClick={() => setShowErrorModal(true)}
                        className="text-[10px] text-rose-600 underline font-bold cursor-pointer"
                      >
                        Dettagli
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-600 truncate max-w-[180px]">
                      {currentUser ? currentUser.email : 'Modalità Ospite'}
                    </span>
                    {currentUser ? (
                      <button
                        onClick={handleLogout}
                        className="text-[10px] font-bold text-slate-500 hover:text-slate-800 bg-slate-100 px-2 py-1 rounded-lg transition cursor-pointer"
                      >
                        Esci
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowLoginModal(true)}
                        className="text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-2.5 py-1 rounded-lg transition cursor-pointer"
                      >
                        Accedi
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* BARRA OPERATIVA IN TEMPO REALE (4 KPI Cliccabili) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {hasAccessTo('accettazione') && (
                  <div
                    onClick={() => setActiveTab('accettazione')}
                    className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-4 shadow-2xs flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">In Laboratorio</span>
                      <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{campioniInLavorazioneCount}</span>
                      <span className="text-[11px] text-slate-500 font-medium">Campioni in lavorazione / bozza</span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <TestTubeDiagonal className="h-5 w-5" />
                    </div>
                  </div>
                )}

                {hasAccessTo('preventivi') && (
                  <div
                    onClick={() => setActiveTab('preventivi')}
                    className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 shadow-2xs flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">Offerte Attive</span>
                      <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{preventiviInAttesaCount}</span>
                      <span className="text-[11px] text-slate-500 font-medium">Preventivi in attesa di esito</span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                  </div>
                )}

                {hasAccessTo('fatturazione') && (
                  <div
                    onClick={() => setActiveTab('fatturazione')}
                    className="bg-white border border-slate-200 hover:border-amber-300 rounded-2xl p-4 shadow-2xs flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">Contabilità</span>
                      <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{praticheDaFatturareCount}</span>
                      <span className="text-[11px] text-slate-500 font-medium">Pratiche pronte da fatturare</span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Receipt className="h-5 w-5" />
                    </div>
                  </div>
                )}

                {hasAccessTo('fatturazione') && (
                  <div
                    onClick={() => setActiveTab('fatturazione')}
                    className="bg-white border border-slate-200 hover:border-rose-300 rounded-2xl p-4 shadow-2xs flex items-center justify-between cursor-pointer group transition-all"
                  >
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block">Crediti Aperti</span>
                      <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{praticheDaIncassareCount}</span>
                      <span className="text-[11px] text-slate-500 font-medium">Fatture emesse da incassare</span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                  </div>
                )}
              </div>

              {/* GRIGLIA FUNZIONALE: CARD CON ICONE GRANDI E COLORI TENUI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="dashboard-grid-cards">
                
                
{hasAccessTo('clienti') && (
<div
                  onClick={() => setActiveTab('clienti')}
                  className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-blue-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  id="card-dash-clienti"
                >
                  <div className="w-20 h-20 rounded-full bg-blue-50/80 border border-blue-100/50 flex items-center justify-center mx-auto mb-6 text-blue-500/90 group-hover:scale-105 transition-transform duration-300">
                    <Users className="h-9 w-9" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-blue-600 transition-colors">
                    Clienti
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Anagrafica e archivio storico dei clienti del laboratorio
                  </p>

                </div>
)}

                {/* 2) Tariffario Prove */}
{hasAccessTo('prove') && (
<div
                  onClick={() => setActiveTab('prove')}
                  className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-amber-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  id="card-dash-prove"
                >
                  <div className="w-20 h-20 rounded-full bg-amber-50/80 border border-amber-100/50 flex items-center justify-center mx-auto mb-6 text-amber-500/90 group-hover:scale-105 transition-transform duration-300">
                    <FlaskConical className="h-9 w-9" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-amber-600 transition-colors">
                    Prove
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Tariffario analitico delle prove e dei pacchetti chimici
                  </p>

                </div>
)}


                {/* 3) Aree Specialistiche (Etichetta Nutrizionale & Rifiuti) */}
                {hasAccessTo('areeSpecialistiche') && (
                  <div
                    onClick={() => setActiveTab('areeSpecialistiche')}
                    className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-emerald-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                    id="card-dash-aree-specialistiche"
                  >
                    <div className="w-20 h-20 rounded-full bg-emerald-50/80 border border-emerald-100/50 flex items-center justify-center mx-auto mb-6 text-emerald-600 group-hover:scale-105 transition-transform duration-300">
                      <Scale className="h-9 w-9" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-emerald-700 transition-colors">
                      Aree Specialistiche
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                      Stesura etichetta nutrizionale (Reg. UE 1169) e classificazione rifiuto
                    </p>
                  </div>
                )}

                {/* 4) Preventivi */}
{hasAccessTo('preventivi') && (
<div
                  onClick={() => setActiveTab('preventivi')}
                  className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-emerald-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  id="card-dash-preventivi"
                >
                  <div className="w-20 h-20 rounded-full bg-emerald-50/80 border border-emerald-100/50 flex items-center justify-center mx-auto mb-6 text-emerald-500/90 group-hover:scale-105 transition-transform duration-300">
                    <FileSpreadsheet className="h-9 w-9" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-emerald-600 transition-colors">
                    Preventivi
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Creazione, stampa e consultazione dei preventivi emessi
                  </p>

                </div>
)}

                
{hasAccessTo('accettazione') && (
<div
                  onClick={() => setActiveTab('accettazione')}
                  className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-indigo-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  id="card-dash-accettazione"
                >
                  <div className="w-20 h-20 rounded-full bg-indigo-50/80 border border-indigo-100/50 flex items-center justify-center mx-auto mb-6 text-indigo-500/95 group-hover:scale-105 transition-transform duration-300">
                    <TestTubeDiagonal className="h-9 w-9" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-indigo-600 transition-colors">
                    Accettazione Campioni
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Registro accettazione campioni in arrivo
                  </p>

                </div>
)}

                {/* 5b) Revisioni & Riemissioni RdP */}
                {hasAccessTo('revisioniRdp') && (
                  <div
                    onClick={() => setActiveTab('revisioniRdp')}
                    className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-rose-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer relative"
                    id="card-dash-revisioni-rdp"
                  >
                    {revisioniInBozzaCount > 0 && (
                      <span className="absolute top-4 right-4 px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[10px] font-extrabold animate-pulse">
                        {revisioniInBozzaCount} in bozza
                      </span>
                    )}
                    <div className="w-20 h-20 rounded-full bg-rose-50/80 border border-rose-100/50 flex items-center justify-center mx-auto mb-6 text-rose-600 group-hover:scale-105 transition-transform duration-300">
                      <GitCompare className="h-9 w-9" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-rose-600 transition-colors">
                      Revisioni &amp; Riemissioni RdP
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                      Gestione controllata delle revisioni dei Rapporti di Prova, confronto Diff e storico (ISO/IEC 17025 §7.8.8)
                    </p>
                  </div>
                )}


                {/* 6) Fatturazione */}
{hasAccessTo('fatturazione') && (
<div
                  onClick={() => setActiveTab('fatturazione')}
                  className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-indigo-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  id="card-dash-fatturazione"
                >
                  <div className="w-20 h-20 rounded-full bg-indigo-50/80 border border-indigo-100/50 flex items-center justify-center mx-auto mb-6 text-indigo-600/95 group-hover:scale-105 transition-transform duration-300">
                    <Receipt className="h-9 w-9" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-indigo-600 transition-colors">
                    Fatturazione
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Gestione delle pratiche contabili, delle offerte approvate e delle fatture emesse
                  </p>

                </div>
)}

                {/* 7) Reagentario */}
{hasAccessTo('reagentario') && (
<div
                  onClick={() => setActiveTab('reagentario')}
                  className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-purple-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  id="card-dash-reagentario"
                >
                  <div className="w-20 h-20 rounded-full bg-purple-50/80 border border-purple-100/50 flex items-center justify-center mx-auto mb-6 text-purple-500/95 group-hover:scale-105 transition-transform duration-300">
                    <Beaker className="h-9 w-9" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-purple-600 transition-colors">
                    Reagentario
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Tracciamento scorte reagenti chimici, scadenze e lotti di laboratorio
                  </p>

                </div>
)}

                {/* 8) Strumentazione & Tarature */}
                {hasAccessTo('strumenti') && (
                  <div
                    onClick={() => setActiveTab('strumenti')}
                    className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-cyan-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                    id="card-dash-strumenti"
                  >
                    <div className="w-20 h-20 rounded-full bg-cyan-50/80 border border-cyan-100/50 flex items-center justify-center mx-auto mb-6 text-cyan-600 group-hover:scale-105 transition-transform duration-300">
                      <Gauge className="h-9 w-9" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-cyan-600 transition-colors">
                      Strumenti & Tarature
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                      Registro della strumentazione di laboratorio, verifica tarature e manutenzioni
                    </p>
                  </div>
                )}

                {/* 9) Gestione Operatori & Password */}
                {hasAccessTo('operatori') && (
                  <div
                    onClick={() => setActiveTab('operatori')}
                    className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-slate-800 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                    id="card-dash-operatori"
                  >
                    <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-250 flex items-center justify-center mx-auto mb-6 text-slate-800 group-hover:scale-105 transition-transform duration-300">
                      <UserCheck className="h-9 w-9" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-slate-950 transition-colors">
                      Gestione Operatori & Password
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                      Aggiungi, modifica e rimuovi operatori accreditati, le loro qualifiche o le password della firma
                    </p>
                  </div>
                )}

                {/* 10) Registro Attività / Log */}
                {hasAccessTo('audit') && (
                  <div
                    onClick={() => setActiveTab('audit')}
                    className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-indigo-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                    id="card-dash-audit"
                  >
                    <div className="w-20 h-20 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-6 text-indigo-600 group-hover:scale-105 transition-transform duration-300">
                      <History className="h-9 w-9" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-indigo-600 transition-colors">
                      Registro Attività & Log
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                      Consultazione e ricerca storica di tutte le operazioni e modifiche effettuate a norma ISO 17025
                    </p>
                  </div>
                )}

                {/* 11) Statistiche & Report */}
                {hasAccessTo('statistiche') && (
                  <div
                    onClick={() => setActiveTab('statistiche')}
                    className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-emerald-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                    id="card-dash-statistiche"
                  >
                  <div className="w-20 h-20 rounded-full bg-emerald-50/80 border border-emerald-100/50 flex items-center justify-center mx-auto mb-6 text-emerald-600/95 group-hover:scale-105 transition-transform duration-300">
                    <BarChart3 className="h-9 w-9" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-emerald-600 transition-colors">
                    Statistiche & Analytics
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Visualizzazione fatturati, reportistiche e monitoraggio dei tempi d&apos;analisi
                  </p>

                </div>
                )}
              </div>

              {/* STATS SUMMARY CON ICONE TENUI E DESIGN MINIMALE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Stat 1: Totale Clienti */}
                <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-2xs flex justify-between items-center">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block tracking-wider uppercase">Totale Clienti</span>
                    <span className="text-3xl font-extrabold text-slate-850 block mt-1.5 leading-none">
                      {totaleClienti}
                    </span>
                  </div>
                  <div className="w-11 h-11 bg-blue-50 text-blue-550 rounded-xl flex items-center justify-center border border-blue-100/50">
                    <Users className="h-5 w-5" />
                  </div>
                </div>

                {/* Stat 2: Fatturazione Totale */}
                <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-2xs flex justify-between items-center">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block tracking-wider uppercase">Fatturazione Totale</span>
                    <span className="text-2xl font-extrabold text-slate-850 block mt-1.5 leading-none">
                      € {fatturatoTotale.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="w-11 h-11 bg-amber-50 text-amber-550 rounded-xl flex items-center justify-center border border-amber-100/50">
                    <BadgeEuro className="h-5 w-5" />
                  </div>
                </div>

                {/* Stat 3: Fatturazione Media */}
                <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-2xs flex justify-between items-center">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block tracking-wider uppercase">Fatturazione Media</span>
                    <span className="text-2xl font-extrabold text-slate-850 block mt-1.5 leading-none">
                      € {fatturatoMedio.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="w-11 h-11 bg-emerald-50 text-emerald-550 rounded-xl flex items-center justify-center border border-emerald-100/50">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>

              </div>

              {/* SEZIONI IN GRID: TOP CATEGORIE, ULTIMI CLIENTI & ALLERTA SCADENZE REAGENTI */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Box Left: Top Categorie */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <FolderDot className="h-5 w-5 text-slate-400" />
                      <h3 className="font-extrabold text-base text-slate-850 tracking-tight">Top Categorie Prove</h3>
                    </div>
                    {hasAccessTo('prove') && (
                      <button
                        onClick={() => setActiveTab('prove')}
                        className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-0.5 cursor-pointer"
                      >
                        Tariffario <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100">
                    {topCategories.map(([category, count]) => (
                      <div
                        key={category}
                        onClick={() => hasAccessTo('prove') && setActiveTab('prove')}
                        className="py-3 flex justify-between items-center text-sm hover:bg-slate-50 px-2 -mx-2 rounded-lg transition cursor-pointer"
                      >
                        <span className="text-slate-800 font-bold">{category}</span>
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-mono font-bold text-xs">{count} prove</span>
                      </div>
                    ))}
                    {topCategories.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400">Nessuna categoria censita.</div>
                    )}
                  </div>

                </div>

                {/* Box Center: Ultimi Clienti */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-slate-400" />
                        <h3 className="font-extrabold text-base text-slate-850 tracking-tight">Ultimi Clienti</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('clienti')}
                        className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-0.5 cursor-pointer"
                      >
                        Vedi tutti <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {latestClients.map((client) => (
                        <div
                          key={client.id}
                          onClick={() => handleGoToClient(client.id, 'Dashboard')}
                          className="py-3 flex justify-between items-center text-sm hover:bg-blue-50/50 px-2 -mx-2 rounded-lg transition cursor-pointer group"
                          title="Clicca per aprire la scheda cliente"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="text-slate-800 font-bold block truncate group-hover:text-blue-700">{client.denominazione}</span>
                            <span className="text-[11px] text-slate-400 block mt-0.5 truncate">
                              {client.comune ? `${client.comune}${client.provincia ? ` (${client.provincia})` : ''}` : (client.indirizzo || client.email || 'Anagrafica attiva')}
                            </span>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <span className="px-2 py-0.5 bg-slate-100 font-mono text-[10px] text-slate-600 rounded font-bold">
                              {client.partitaIva ? `P.IVA ${client.partitaIva}` : (client.tipologiaCliente || 'Cliente')}
                            </span>
                          </div>
                        </div>
                      ))}
                      {latestClients.length === 0 && (
                        <div className="text-center py-6 text-xs text-slate-400">Nessun cliente inserito.</div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Box Right: Scadenze Reagenti (Near Expiry) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-rose-500" />
                        <h3 className="font-extrabold text-base text-slate-850 tracking-tight">Scadenze Reagenti</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('reagentario')}
                        className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-0.5 cursor-pointer"
                      >
                        Gestisci <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {reagentsNearExpiry.map((reag) => (
                        <div key={reag.id} className="py-3 flex justify-between items-center text-sm">
                          <div className="min-w-0 pr-2">
                            <span className="text-slate-800 font-bold block truncate">{reag.nome}</span>
                            <span className="text-[11px] font-mono text-slate-400 block mt-0.5 truncate">
                              {reag.formulaChimica ? `[${reag.formulaChimica}] · ` : ''}{reag.quantitaDisponibile} {reag.unitaMisura}
                            </span>
                          </div>
                          
                          <div className="text-right shrink-0">
                            {reag.scaduto ? (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-[10px] font-extrabold rounded uppercase tracking-wider animate-pulse">
                                SCADUTO
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded">
                                -{reag.daysToExpiry} gg
                              </span>
                )}
                          </div>


                        </div>
                      ))}
                      {reagentsNearExpiry.length === 0 && (
                        <div className="text-center py-6 text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                          <CheckCircle className="h-7 w-7 text-emerald-500/80 mb-1" />
                          <p className="font-bold text-slate-650">Scorte in validità</p>
                          <p className="text-[10px] text-slate-450 px-2 line-clamp-2">Nessun reagente scaduto o in scadenza nei prossimi 30 giorni.</p>
                        </div>
                )}
                    </div>

                  </div>

                </div>

              </div>

            </div>

                )}
          <Suspense fallback={
            <div className="p-12 text-center text-slate-500 text-xs font-semibold animate-pulse">
              Caricamento sezione in corso...
            </div>
          }>
          {/* A2) CHOSEN TAB: REVISIONI & RIEMISSIONI RDP */}
          {activeTab === 'revisioniRdp' && hasAccessTo('revisioniRdp') && (
            <RevisioniRdpSection
              accettazioni={accettazioni}
              clients={clients}
              operators={activeOperators}
              userProfileName={userProfileName}
              revisioneSelectedAccId={revisioneSelectedAccId}
              setRevisioneSelectedAccId={setRevisioneSelectedAccId}
              revisioneTipologiaInput={revisioneTipologiaInput}
              setRevisioneTipologiaInput={setRevisioneTipologiaInput}
              revisioneMotivoInput={revisioneMotivoInput}
              setRevisioneMotivoInput={setRevisioneMotivoInput}
              revisioneOperatore={revisioneOperatore}
              setRevisioneOperatore={setRevisioneOperatore}
              revisioneSuccessMessage={revisioneSuccessMessage}
              setRevisioneSuccessMessage={setRevisioneSuccessMessage}
              handleStartRevisionBozza={handleStartRevisionBozza}
              handleCancelRevisionBozza={handleCancelRevisionBozza}
              setDiffAccId={setDiffAccId}
              setDiffSnapshot={setDiffSnapshot}
              setDiffModalOpen={setDiffModalOpen}
              onGoToAccettazione={handleGoToAccettazione}
              onGoToClient={handleGoToClient}
              onBackToDashboard={() => setActiveTab('dashboard')}
            />
          )}
          {/* B) CHOSEN TAB: CLIENTI */}
          
          {activeTab === 'clienti' && hasAccessTo('clienti') && (
            <ClientiSection
              clients={clients}
              onAddClient={handleAddClient}
              onDeleteClient={handleDeleteClient}
              onUpdateClient={handleUpdateClient}
              preventivi={preventivi}
              prove={prove}
              pacchetti={pacchetti}
              accettazioni={accettazioni}
              userRole={userRole}
              currentUser={currentUser}
              actualRole={actualRole}
              onOpenLogin={() => setShowLoginModal(true)}
              initialSelectedClientId={selectedClientId}
              onClearSelectedClientId={() => setSelectedClientId(null)}
              onGoToPreventivo={handleGoToPreventivo}
              onCreatePreventivoForClient={handleCreatePreventivoForClient}
              onGoToAccettazione={handleGoToAccettazione}
              onCreateAccettazioneForClient={handleCreateAccettazioneForClient}
              onGoToFatturazione={handleGoToFatturazione}
            />

                )}
          {/* C) CHOSEN TAB: PROVE */}
          
          {activeTab === 'prove' && hasAccessTo('prove') && (
            <ProveSection
              operators={activeOperators}
              prove={prove}
              onAddProva={handleAddProva}
              onDeleteProva={handleDeleteProva}
              onUpdateProva={handleUpdateProva}
              selectedProvaId={selectedProvaId}
              onClearSelectedProvaId={() => setSelectedProvaId(null)}
              currentUser={currentUser}
              userRole={userRole}
              onGoToPacchetti={handleGoToPacchetti}
            />
          )}

          {/* D) CHOSEN TAB: PREVENTIVI */}
          {activeTab === 'preventivi' && hasAccessTo('preventivi') && (
            <PreventiviSection
              preventivi={preventivi}
              pacchetti={pacchetti}
              clients={clients}
              prove={prove}
              accettazioni={accettazioni}
              onAddPreventivo={handleAddPreventivo}
              onAddPacchetto={handleAddPacchetto}
              onUpdatePacchetto={handleUpdatePacchetto}
              onDeletePreventivo={handleDeletePreventivo}
              onDeletePacchetto={handleDeletePacchetto}
              onGoToProva={handleGoToProva}
              operators={activeOperators}
              selectedPreventivoId={selectedPreventivoId}
              onClearSelectedPreventivo={() => setSelectedPreventivoId(null)}
              onCreateAccettazioneFromPreventivo={handleCreateAccettazioneFromPreventivo}
              initialSubTab={preventiviInitialSubTab}
              onClearInitialSubTab={() => setPreventiviInitialSubTab(null)}
              pendingClientIdForNewQuote={pendingQuoteClientId}
              onClearPendingClientIdForNewQuote={() => setPendingQuoteClientId(null)}
              onGoToClient={handleGoToClient}
              onGoToAccettazione={handleGoToAccettazione}
              onGoToFatturazione={handleGoToFatturazione}
            />
          )}

          {/* E) CHOSEN TAB: REAGENTARIO */}
          {activeTab === 'reagentario' && hasAccessTo('reagentario') && (
            <ReagentarioSection
              reagenti={reagenti}
              onAddReagente={handleAddReagente}
              onDeleteReagente={handleDeleteReagente}
              onUpdateReagente={handleUpdateReagente}
              reagentiRitirati={reagentiRitirati}
              setReagentiRitirati={handleUpdateReagentiRitirati}
            />
          )}

          {/* E2) CHOSEN TAB: STRUMENTAZIONE */}
          {activeTab === 'strumenti' && hasAccessTo('strumenti') && (
            <StrumentazioneSection
              strumenti={strumenti}
              onAddStrumento={handleAddStrumento}
              onUpdateStrumento={handleUpdateStrumento}
              onDeleteStrumento={handleDeleteStrumento}
            />
          )}

          {/* F) CHOSEN TAB: ACCETTAZIONE CAMPIONI */}
          
          {activeTab === 'accettazione' && hasAccessTo('accettazione') && (
            <AccettazioneSection
              accettazioni={accettazioni}
              clients={clients}
              preventivi={preventivi}
              prove={prove}
              pacchetti={pacchetti}
              onAddAccettazione={handleAddAccettazione}
              onDeleteAccettazione={handleDeleteAccettazione}
              onUpdateAccettazione={handleUpdateAccettazione}
              operators={activeOperators}
              onViewPreventivo={handleGoToPreventivo}
              strumenti={strumenti}
              reagenti={reagenti}
              pendingPreventivoId={pendingAccettazionePreventivoId}
              onClearPendingPreventivo={() => setPendingAccettazionePreventivoId(null)}
              selectedAccettazioneId={selectedAccettazioneId}
              onClearSelectedAccettazioneId={() => setSelectedAccettazioneId(null)}
              pendingClientId={pendingAccettazioneClientId}
              onClearPendingClientId={() => setPendingAccettazioneClientId(null)}
              onGoToClient={handleGoToClient}
              onGoToProva={handleGoToProva}
              onGoToAreeSpecialistiche={handleGoToAreeSpecialistiche}
              onGoToFatturazione={handleGoToFatturazione}
              onStartRevisionBozza={handleStartRevisionBozza}
              onOpenDiffModal={(accId) => {
                setDiffAccId(accId);
                setDiffSnapshot(null);
                setDiffModalOpen(true);
              }}
            />

                )}

          {/* F1) CHOSEN TAB: AREE SPECIALISTICHE */}
          {activeTab === 'areeSpecialistiche' && hasAccessTo('areeSpecialistiche') && (
            <AreeSpecialisticheSection
              accettazioni={accettazioni}
              clients={clients}
              prove={prove}
              operators={activeOperators}
              onUpdateAccettazione={handleUpdateAccettazione}
              onGoToDashboard={() => setActiveTab('dashboard')}
              pendingTarget={pendingAreeSpecTarget}
              onClearPendingTarget={() => setPendingAreeSpecTarget(null)}
              onGoToAccettazione={handleGoToAccettazione}
            />
          )}
          {/* F2) CHOSEN TAB: FATTURAZIONE */}
          
          {activeTab === 'fatturazione' && hasAccessTo('fatturazione') && (
            <FatturazioneSection
              pratiche={praticheFatturazione}
              onUpdatePratiche={handleUpdatePratiche}
              auditLogs={auditLogs}
              operators={activeOperators}
              addAuditLogEntry={handleAddAuditLogEntry}
              clients={clients}
              preventivi={preventivi}
              onViewPreventivo={handleGoToPreventivo}
              initialSearchQuery={pendingFatturazioneQuery}
              onClearInitialSearchQuery={() => setPendingFatturazioneQuery(null)}
              onGoToClient={handleGoToClient}
              onGoToAccettazione={handleGoToAccettazione}
            />
          )}
          {/* H) CHOSEN TAB: GESTIONE OPERATORI */}
          
          {activeTab === 'operatori' && hasAccessTo('operatori') && (
            actualRole === 'AM' ? (
              <div className="bg-white rounded-3xl border border-slate-150 p-12 text-center max-w-md mx-auto mt-12 shadow-sm">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
                  <KeyRound className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Accesso Negato</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  Il profilo Amministrativo (AM) non è autorizzato ad accedere o ad operare nell'area di gestione degli operatori e delle credenziali di firma.
                </p>
              </div>
            ) : (
              <OperatoriSection
                operators={operators}
                onUpdateOperators={handleUpdateOperators}
              />
            )
                )}

          {/* G) CHOSEN TAB: STATISTICHE E BUSINESS INTELLIGENCE */}
          
          {activeTab === 'statistiche' && hasAccessTo('statistiche') && (
            <StatisticheSection
              preventivi={preventivi}
              clients={clients}
              prove={prove}
              pacchetti={pacchetti}
              accettazioni={accettazioni}
              reagenti={reagenti}
              praticheFatturazione={praticheFatturazione}
            />
          )}

          {/* I) CHOSEN TAB: REGISTRO ATTIVITA & AUDIT LOG */}
          
          {activeTab === 'audit' && hasAccessTo('audit') && (
            <AuditLogSection
              auditLogs={auditLogs}
              operators={operators}
              currentUser={userProfileName}
              onClearLogs={() => {
                setAuditLogs([]);
                localStorage.removeItem('lab_audit_logs');
              }}
            />
          )}
          </Suspense>
        </div>
      </main>

      {showRestoreModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-150 animate-scaleIn">
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Ripristino Dati Dimostrativi
            </h3>
            <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
              Attenzione: questa operazione caricherà i dati dimostrativi iniziali ed eliminerà tutte le modifiche correnti (clienti, preventivi, tariffario e reagentario salvati). Vuoi procedere?
            </p>
            <div className="flex justify-end gap-2.5 mt-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={handleRestoreDefaults}
                className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Sì, Ripristina
              </button>
            </div>
          </div>

        </div>

                )}
      <Suspense fallback={null}>
        {showLoginModal && (
          <LoginModal
            onClose={() => setShowLoginModal(false)}
            operators={operators}
            onSuccess={(localAuthEmail, localAuthName) => {
              setShowLoginModal(false);
              if (localAuthEmail) {
                applyLocalAuthenticatedSession(localAuthEmail, localAuthName);
              } else {
                fetchUserRole();
              }
            }}
          />
        )}
        {showErrorModal && (
          <DatabaseErrorModal
            onClose={() => setShowErrorModal(false)}
            errorMsg={supabaseErrorMsg}
          />
        )}
        {diffModalOpen && diffAccId && (
          <RdpDiffModal
            isOpen={diffModalOpen}
            onClose={() => {
              setDiffModalOpen(false);
              setDiffAccId(null);
              setDiffSnapshot(null);
            }}
            accettazione={accettazioni.find(a => a.id === diffAccId) || null}
            snapshotConfronto={diffSnapshot}
            operators={activeOperators}
            currentUser={userProfileName}
            prove={prove}
            onApproveRevision={handleApproveAndEmitRevision}
            onCancelRevisionBozza={handleCancelRevisionBozza}
          />
        )}
      </Suspense>
    </div>
  );
}
