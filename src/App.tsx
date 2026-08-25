import { useAppData } from './hooks/useAppData';

import { ClientiSection } from './components/ClientiSection';
import { ProveSection } from './components/ProveSection';
import { PreventiviSection } from './components/PreventiviSection';
import { ReagentarioSection } from './components/ReagentarioSection';
import { AccettazioneSection } from './components/AccettazioneSection';
import { FatturazioneSection } from './components/FatturazioneSection';
import { StatisticheSection } from './components/StatisticheSection';
import { OperatoriSection } from './components/OperatoriSection';
import { AuditLogSection } from './components/AuditLogSection';
import { LoginModal } from './components/LoginModal';
import { DatabaseErrorModal } from './components/DatabaseErrorModal';
import { AreeSpecialisticheSection } from './components/AreeSpecialisticheSection';

import { 
  Users, 
  FlaskConical, 
  FileSpreadsheet, 
  Archive, 
  LayoutDashboard, 
  Database,
  ArrowRight,
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
  Scale
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
    selectedProvaId,
    setSelectedProvaId,
    selectedPreventivoId,
    setSelectedPreventivoId,
    mobileMenuOpen,
    setMobileMenuOpen,
    showRestoreModal,
    setShowRestoreModal,
    revisioneSelectedAccId,
    setRevisioneSelectedAccId,
    revisioneMotivoInput,
    setRevisioneMotivoInput,
    revisioneOperatore,
    setRevisioneOperatore,
    revisioneSuccessMessage,
    setRevisioneSuccessMessage,

    fetchUserRole,
    handleLogout,
    handleAddAuditLogEntry,
    handleGoToProva,
    handleGoToPreventivo,
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
    handleEmitNewRevision,
    handleUpdateOperators,
    handleUpdateReagentiRitirati,
    handleSyncLocalData,
    handleUpdatePratiche,
    handleRestoreDefaults,

    totaleClienti,
    fatturatoTotale,
    fatturatoMedio,
    topCategories,
    latestClients,
    reagentsNearExpiry,
    hasAccessTo
  } = useAppData();

  if (initialPrintQuoteId) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-800 antialiased">
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
          operators={operators}
          selectedPreventivoId={null}
          onClearSelectedPreventivo={() => {}}
          printOnlyId={initialPrintQuoteId}
        />
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
                <Database className="h-5 w-5" />
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
                  ? 'bg-indigo-400 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>

            
            {hasAccessTo('clienti') && (
<button
              onClick={() => setActiveTab('clienti')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'clienti'
                  ? 'bg-indigo-400 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-clienti"
            >
              <Users className="h-4 w-4" />
              Clienti
            </button>
)}

            {hasAccessTo('prove') && (
              <button
                onClick={() => setActiveTab('prove')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                  activeTab === 'prove'
                    ? 'bg-indigo-400 text-white shadow-sm'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="sidebar-prove"
              >
                <FlaskConical className="h-4 w-4" />
                Prove
              </button>
            )}

            {hasAccessTo('prove') && (
              <button
                onClick={() => setActiveTab('areeSpecialistiche')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                  activeTab === 'areeSpecialistiche'
                    ? 'bg-indigo-400 text-white shadow-sm'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="sidebar-aree-specialistiche"
              >
                <Sparkles className="h-4 w-4 text-emerald-500" />
                Aree Specialistiche
              </button>
            )}

            {hasAccessTo('preventivi') && (
<button
              onClick={() => setActiveTab('preventivi')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'preventivi'
                  ? 'bg-indigo-400 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-preventivi"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Preventivi
            </button>
)}

            {hasAccessTo('accettazione') && (
<button
              onClick={() => setActiveTab('accettazione')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'accettazione'
                  ? 'bg-indigo-400 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-accettazione"
            >
              <FileText className="h-4 w-4" />
              Accettazione Campioni
            </button>
)}

            {hasAccessTo('fatturazione') && (
<button
              onClick={() => setActiveTab('fatturazione')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'fatturazione'
                  ? 'bg-indigo-400 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-fatturazione"
            >
              <Receipt className="h-4 w-4" />
              Fatturazione
            </button>
)}

            {hasAccessTo('reagentario') && (
<button
              onClick={() => setActiveTab('reagentario')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'reagentario'
                  ? 'bg-indigo-400 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-reagentario"
            >
              <Archive className="h-4 w-4" />
              Reagentario
            </button>
)}

            {hasAccessTo('operatori') && (
              <button
                onClick={() => setActiveTab('operatori')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                  activeTab === 'operatori'
                    ? 'bg-indigo-400 text-white shadow-sm'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="sidebar-operatori"
              >
                <KeyRound className="h-4 w-4" />
                Gestione Operatori / Ruoli
              </button>
            )}

            {hasAccessTo('audit') && (
              <button
                onClick={() => setActiveTab('audit')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                  activeTab === 'audit'
                    ? 'bg-indigo-400 text-white shadow-sm'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="sidebar-audit"
              >
                <History className="h-4 w-4" />
                Registro Attività / Log
              </button>
            )}

            {hasAccessTo('dashboard') && (
<button
              onClick={() => setActiveTab('statistiche')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'statistiche'
                  ? 'bg-indigo-400 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-statistiche"
            >
              <BarChart3 className="h-4 w-4" />
              Statistiche & Report
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
            <Database className="h-3.5 w-3.5" /> Ripristina Demo
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
            <Database className="h-4 w-4" />
          </div>
          <span className="text-lg font-serif italic font-extrabold tracking-tight text-slate-900">LUPO 2.0</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 px-3 bg-slate-100 text-slate-800 text-xs font-bold rounded-lg"
          >
            Menu
          </button>
        </div>
      </header>

      {/* MOBILE COMPANION DRAWER MENU */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-150 p-4 space-y-3 flex flex-col">
          <button
            onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-400' : 'text-slate-650'}`}
          >
            Dashboard
          </button>
          
          {hasAccessTo('clienti') && (
<button
            onClick={() => { setActiveTab('clienti'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'clienti' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-400' : 'text-slate-650'}`}
          >
            Clienti
          </button>
)}

          {hasAccessTo('prove') && (
<button
            onClick={() => { setActiveTab('prove'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'prove' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-400' : 'text-slate-650'}`}
          >
            Prove
          </button>
)}

          {hasAccessTo('accettazione') && (
<button
            onClick={() => { setActiveTab('accettazione'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'accettazione' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-400' : 'text-slate-650'}`}
          >
            Accettazione Campioni
          </button>
)}

          {hasAccessTo('prove') && (
<button
            onClick={() => { setActiveTab('areeSpecialistiche'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'areeSpecialistiche' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-400' : 'text-slate-650'}`}
          >
            Aree Specialistiche (Nutrizione & Rifiuti)
          </button>
)}

          {hasAccessTo('fatturazione') && (
<button
            onClick={() => { setActiveTab('fatturazione'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'fatturazione' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-400' : 'text-slate-650'}`}
          >
            Fatturazione
          </button>
)}

          {hasAccessTo('reagentario') && (
<button
            onClick={() => { setActiveTab('reagentario'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'reagentario' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-400' : 'text-slate-650'}`}
          >
            Reagentario
          </button>
)}

          {hasAccessTo('operatori') && (
            <button
              onClick={() => { setActiveTab('operatori'); setMobileMenuOpen(false); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'operatori' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-400' : 'text-slate-650'}`}
            >
              Gestione Operatori
            </button>
          )}

          {hasAccessTo('audit') && (
            <button
              onClick={() => { setActiveTab('audit'); setMobileMenuOpen(false); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'audit' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-400' : 'text-slate-650'}`}
            >
              Registro Attività / Log
            </button>
          )}

          {hasAccessTo('statistiche') && (
<button
            onClick={() => { setActiveTab('statistiche'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'statistiche' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-400' : 'text-slate-650'}`}
          >
            Statistiche & Analisi
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
        
        {/* TAB ACTIVE SELECT */}
        <div className="transition mt-2 lg:mt-0">
          
          {/* A) CHOSEN TAB: DASHBOARD */}
          {activeTab === 'dashboard' && hasAccessTo('dashboard') && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Titolo Tab */}
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight" id="dashboard-main-title">
                  Dashboard
                </h1>
                <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
                  Benvenuto in LUPO 2.0 — scegli un&apos;area da gestire o monitora lo stato del sistema.
                </p>
              </div>

              {/* PANNELLO DI CONTROLLO STATO CLOUD & SESSIONE OPERATORE (Richiesta Utente) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                
                {/* MODULO 1: DATABASE CLOUD SUPABASE */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs flex flex-col justify-between group hover:border-emerald-200 transition-colors duration-300">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                          <Database className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Database Cloud</h4>
                          <span className="text-[10px] text-slate-500 font-medium block">Stato connessione e sincronia</span>
                        </div>
                      </div>
                      
                      {/* Stato */}
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-155">
                        <span className={`h-2 w-2 rounded-full ${
                          supabaseStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                          supabaseStatus === 'loading' ? 'bg-amber-500 animate-pulse' :
                          supabaseStatus === 'error' ? 'bg-rose-500' : 'bg-slate-300'
                        }`} />
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-700">
                          {supabaseStatus === 'connected' ? 'Attivo' :
                           supabaseStatus === 'loading' ? 'Connessione...' :
                           supabaseStatus === 'error' ? 'In Errore' : 'Disconnesso'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                      {supabaseStatus === 'connected' 
                        ? 'I tuoi dati locali di Lupo LIMS sono sincronizzati e protetti nel cloud in tempo reale.'
                        : supabaseStatus === 'error'
                        ? 'Rilevato un disallineamento nello schema del database. Clicca sotto per i dettagli.'
                        : 'Configura le chiavi di accesso Supabase nel file d\'ambiente per abilitare il Cloud.'}
                    </p>
                  </div>

                  {/* Azione Database */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {supabaseStatus === 'connected' ? (
                      <button
                        onClick={handleSyncLocalData}
                        className="w-full text-xs bg-emerald-650 hover:bg-emerald-700 text-white font-black uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-3xs active:scale-[0.99]"
                      >
                        <FolderSync className="h-4 w-4" /> Sincronizza Cloud
                      </button>
                    ) : supabaseStatus === 'error' ? (
                      <button
                        onClick={() => setShowErrorModal(true)}
                        className="w-full text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                      >
                        Vedi Dettaglio Errore Schema
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full text-xs bg-slate-100 text-slate-400 font-black uppercase tracking-wider py-2.5 px-4 rounded-xl cursor-not-allowed text-center border border-slate-200/50"
                      >
                        In Attesa di Credenziali
                      </button>

                )}
                  </div>

                </div>

                {/* MODULO 2: SESSIONE OPERATORE */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs flex flex-col justify-between group hover:border-indigo-200 transition-colors duration-300">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                          <KeyRound className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Autenticazione</h4>
                          <span className="text-[10px] text-slate-500 font-medium block">Sessione di lavoro corrente</span>
                        </div>
                      </div>

                      {/* Ruolo Badge */}
                      {currentUser ? (
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border leading-none shrink-0 ${
                          actualRole === 'AM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          userRole === 'admin' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 
                          'bg-indigo-50 text-indigo-800 border-indigo-200'
                        }`}>
                          {actualRole === 'AM' ? 'Amministrativo' :
                           userRole === 'admin' ? 'Amministratore' : 'Utente'}
                        </span>
                      ) : (
                        <span className="bg-slate-50 text-slate-500 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border border-slate-150">
                          Profilo Ospite
                        </span>

                )}
                    </div>

                    <div className="flex items-center gap-2.5 bg-slate-50/60 p-2.5 rounded-xl border border-slate-150 min-h-[44px]">
                      {currentUser ? (
                        <>
                          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] text-slate-400 uppercase font-black block leading-tight">Email Connessa</span>
                            <span className="text-xs font-bold text-slate-700 truncate block" title={currentUser.email}>
                              {currentUser.email}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="h-2 w-2 rounded-full bg-slate-350 shrink-0" />
                          <div className="flex-1">
                            <span className="text-[10px] text-slate-400 uppercase font-black block leading-tight">Nessuna Sessione</span>
                            <span className="text-xs font-semibold text-slate-500 block leading-tight">
                              Sei in modalità sola lettura. Accedi per operare.
                            </span>
                          </div>
                        </>

                )}
                    </div>

                  </div>

                  {/* Azione Sessione */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    {currentUser ? (
                      <button
                        onClick={handleLogout}
                        className="w-full text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer border border-slate-250/60 active:scale-[0.99]"
                      >
                        <LogOut className="h-4 w-4 text-slate-500" /> Disconnetti Account
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowLoginModal(true)}
                        className="w-full text-xs bg-indigo-650 hover:bg-indigo-700 text-white font-black uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-3xs active:scale-[0.99]"
                      >
                        <LogIn className="h-4 w-4" /> Accedi a Lupo LIMS
                      </button>

                )}
                  </div>

                </div>

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
                    <FileText className="h-9 w-9" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-indigo-600 transition-colors">
                    Accettazione Campioni
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Registro accettazione campioni in arrivo
                  </p>

                </div>
)}

                {/* Aree Specialistiche (Etichetta Nutrizionale & Rifiuti) */}
                {hasAccessTo('prove') && (
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

                
{hasAccessTo('reagentario') && (
<div
                  onClick={() => setActiveTab('reagentario')}
                  className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-purple-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  id="card-dash-reagentario"
                >
                  <div className="w-20 h-20 rounded-full bg-purple-50/80 border border-purple-100/50 flex items-center justify-center mx-auto mb-6 text-purple-500/95 group-hover:scale-105 transition-transform duration-300">
                    <Archive className="h-9 w-9" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-purple-600 transition-colors">
                    Reagentario
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Tracciamento scorte reagenti chimici, scadenze e lotti di laboratorio
                  </p>

                </div>
)}

                
                {hasAccessTo('dashboard') && (
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

                {/* 9) Gestione Operatori & Password */}
                {hasAccessTo('operatori') && (
                  <div
                    onClick={() => setActiveTab('operatori')}
                    className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-slate-800 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                    id="card-dash-operatori"
                  >
                    <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-250 flex items-center justify-center mx-auto mb-6 text-slate-800 group-hover:scale-105 transition-transform duration-300">
                      <KeyRound className="h-9 w-9" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-slate-950 transition-colors">
                      Gestione Operatori
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                      Aggiungi, modifica e rimuovi operatori accreditati, le loro qualifiche o le password della firma
                    </p>
                  </div>
                )}

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
                  <div className="w-11 h-11 bg-amber-50 text-amber-550 rounded-xl flex items-center justify-center border border-amber-100/50 font-bold text-sm">
                    €
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
                  <div className="flex items-center gap-2 mb-4">
                    <FolderDot className="h-5 w-5 text-slate-400" />
                    <h3 className="font-extrabold text-base text-slate-850 tracking-tight">Top Categorie</h3>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {topCategories.map(([category, count]) => (
                      <div key={category} className="py-3 flex justify-between items-center text-sm">
                        <span className="text-slate-800 font-bold">{category}</span>
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-mono font-bold text-xs">{count}</span>

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
                        <div key={client.id} className="py-3 flex justify-between items-center text-sm">
                          <div>
                            <span className="text-slate-800 font-bold block">{client.denominazione}</span>
                            {client.indirizzo && (
                              <span className="text-[11px] text-slate-400 block mt-0.5">{client.indirizzo.split(',')[1] || client.indirizzo.split('(')[1] || 'Imola'}</span>

                )}
                          </div>
                          
                          <div className="text-right">
                            <span className="px-2 py-0.5 bg-slate-100 font-mono text-[10px] text-slate-500 rounded font-bold">28/05/2026</span>
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

              {/* AREA REVISIONI & RIEMISSIONI RDP (Richiesta Utente) */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs animate-fadeIn space-y-6" id="dashboard-area-revisioni-rdp">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl shrink-0">
                      <FolderSync className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-850 tracking-tight">
                        Area Revisione & Riemissione RDP
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Richiama un Rapporto di Prova emesso per apportare correzioni storiche controllate e riemettere in Rev.01, Rev.02, ecc.
                      </p>
                    </div>
                  </div>
                  
                  {/* Badge indicatore di conformità */}
                  <div className="self-start sm:self-auto px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Conforme ISO/IEC 17025
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Form di emissione revisione */}
                  <div className="lg:col-span-7 bg-slate-50/50 rounded-2xl p-6 border border-slate-150 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1">
                      📝 Compila Nuova Riemissione
                    </h3>

                    {revisioneSuccessMessage && (
                      <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-xl text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
                        <span className="font-semibold">{revisioneSuccessMessage}</span>
                        <button onClick={() => setRevisioneSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 font-bold px-1">&times;</button>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* 1. Selezione RDP da Richiamare */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          1. Seleziona Rapporto di Prova da Richiamare
                        </label>
                        <select
                          value={revisioneSelectedAccId}
                          onChange={(e) => {
                            setRevisioneSelectedAccId(e.target.value);
                            const found = accettazioni.find(a => a.id === e.target.value);
                            // Impostiamo operatore di default se presente
                            if (found && found.firmatarioTecnico) {
                              setRevisioneOperatore(found.firmatarioTecnico);
                            } else {
                              setRevisioneOperatore(operators[0]?.nome || '');
                            }
                          }}
                          className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">-- Seleziona un rapporto completato --</option>
                          {accettazioni
                            .filter(a => a.analisiStato === 'Completato')
                            .map(a => (
                              <option key={a.id} value={a.id}>
                                {a.codiceAccettazione} - {a.descrizioneCampione} (Rev. {a.revisioneCorrente !== undefined ? String(a.revisioneCorrente).padStart(2, '0') : '00'})
                              </option>
                            ))
                          }
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Vengono mostrati unicamente i rapporti di prova emessi e completati per cui è possibile emettere revisioni.
                        </p>
                      </div>

                      {/* 2. Motivo della Revisione */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          2. Motivazione della Correzione / Revisione
                        </label>
                        <textarea
                          placeholder="Fornisci una sintetica descrizione scientifica del motivo per cui si sta riemettendo il rapporto (es. 'Rettifica della formula analitica' o 'Aggiornamento dati anagrafici del committente')"
                          value={revisioneMotivoInput}
                          onChange={(e) => setRevisioneMotivoInput(e.target.value)}
                          rows={3}
                          className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 leading-normal"
                        />
                      </div>

                      {/* 3. Operatore Certificante */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            3. Operatore Certificante
                          </label>
                          <select
                            value={revisioneOperatore}
                            onChange={(e) => setRevisioneOperatore(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="">-- Seleziona Responsabile --</option>
                            {operators
                              .filter(o => o.attivo !== false && o.autorizzatoFirma !== false)
                              .map(o => (
                                <option key={o.nome} value={o.nome}>{o.nome} ({o.ruoloFirma || o.ruolo})</option>
                              ))
                            }
                          </select>
                        </div>

                        {/* Pulsante Azione */}
                        <div className="flex items-end">
                          <button
                            type="button"
                            disabled={!revisioneSelectedAccId || !revisioneMotivoInput.trim() || !revisioneOperatore}
                            onClick={() => {
                              const targetAcc = accettazioni.find(a => a.id === revisioneSelectedAccId);
                              if (targetAcc) {
                                handleEmitNewRevision(revisioneSelectedAccId, revisioneMotivoInput, revisioneOperatore);
                                setRevisioneSuccessMessage(`Nuova revisione Rev. ${String((targetAcc.revisioneCorrente || 0) + 1).padStart(2, '0')} emessa con successo per ${targetAcc.codiceAccettazione}! Ora il rapporto è sbloccato per modifiche.`);
                                setRevisioneSelectedAccId('');
                                setRevisioneMotivoInput('');
                                // Spostiamo l'utente su accettazione campioni
                                setTimeout(() => {
                                  setActiveTab('accettazione');
                                }, 1500);
                              }
                            }}
                            className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                              (!revisioneSelectedAccId || !revisioneMotivoInput.trim() || !revisioneOperatore)
                              ? 'bg-slate-200 text-slate-450 cursor-not-allowed'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xs shadow-2xs'
                            }`}
                          >
                            <Sparkles className="h-4 w-4" />
                            Emetti Revisione
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Registro storico revisioni attive */}
                  <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                        <History className="h-4 w-4" /> Registro Storico Revisioni Attive
                      </h3>

                      <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                        {accettazioni
                          .filter(a => a.revisioneCorrente !== undefined && a.revisioneCorrente > 0)
                          .map(a => (
                            <div key={a.id} className="bg-slate-50/50 border border-slate-150 p-3 rounded-xl space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-mono text-xs font-black text-slate-800">{a.codiceAccettazione}</span>
                                  <span className="ml-2 px-1.5 py-0.5 bg-indigo-50 border border-indigo-150 text-[9px] font-black font-mono text-indigo-700 rounded uppercase">
                                    Rev. {String(a.revisioneCorrente).padStart(2, '0')}
                                  </span>
                                <span className="text-[9px] text-slate-400 font-medium font-mono">{a.dataRevisione?.split(' ')[0]}</span>
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-650 leading-relaxed font-normal line-clamp-2">
                                <strong>Motivazione:</strong> &ldquo;{a.revisioneMotivo}&rdquo;
                              </p>
                              <div className="flex items-center justify-between text-[10px] border-t border-slate-100 pt-1.5 mt-1">
                                <span className="text-slate-450">Firma: <strong>{a.firmatarioTecnico || 'Resp. Tecnico'}</strong></span>
                                <button
                                  onClick={() => {
                                    setActiveTab('accettazione');
                                    setTimeout(() => {
                                      // Prova ad evidenziare o espandere
                                      const row = document.getElementById(`acc-row-${a.id}`);
                                      if (row) {
                                        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      }
                                    }, 200);
                                  }}
                                  className="text-indigo-600 hover:text-indigo-900 font-extrabold flex items-center gap-0.5 cursor-pointer uppercase text-[9px] tracking-wider"
                                >
                                  Apri RDP <ChevronRight className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))
                        }
                        {accettazioni.filter(a => a.revisioneCorrente !== undefined && a.revisioneCorrente > 0).length === 0 && (
                          <div className="text-center py-12 text-slate-400 text-xs">
                            <FolderSync className="h-8 w-8 text-slate-300 mx-auto mb-2 animate-bounce" />
                            Nessun certificato in revisione al momento.
                          </div>

                )}
                      </div>

                    </div>

                    <div className="border-t border-slate-150 pt-4 mt-4 bg-slate-50 border -mx-6 -mb-6 p-4 rounded-b-2xl text-[10px] text-slate-500 leading-normal font-normal">
                      💡 <strong>Linee Guida d&apos;Ufficio:</strong> Ogni revisione riemessa traccia lo storico dell&apos;RDP originale nel sistema. Nel PDF/A di stampa, la dicitura riepilogherà la sostituzione corretta a norma di legge. Puoi modificare anagrafica, date o analisi direttamente nella scheda campione e riconsultare o stampare.
                    </div>
                  </div>
                </div>
              </div>

            </div>

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
            />

                )}
          {/* C) CHOSEN TAB: PROVE */}
          
          {activeTab === 'prove' && hasAccessTo('prove') && (
            <ProveSection
              operators={operators}
              prove={prove}
              onAddProva={handleAddProva}
              onDeleteProva={handleDeleteProva}
              onUpdateProva={handleUpdateProva}
              selectedProvaId={selectedProvaId}
              onClearSelectedProvaId={() => setSelectedProvaId(null)}
              currentUser={currentUser}
              userRole={userRole}
            />
          )}

          {/* D) CHOSEN TAB: PREVENTIVI */}
          {activeTab === 'preventivi' && hasAccessTo('preventivi') && (
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
              operators={operators}
              selectedPreventivoId={selectedPreventivoId}
              onClearSelectedPreventivo={() => setSelectedPreventivoId(null)}
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
              setReagentiRitirati={setReagentiRitirati}
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
              operators={operators}
              onViewPreventivo={handleGoToPreventivo}
            />

                )}

          {/* F1) CHOSEN TAB: AREE SPECIALISTICHE */}
          {activeTab === 'areeSpecialistiche' && (
            <AreeSpecialisticheSection
              accettazioni={accettazioni}
              clients={clients}
              prove={prove}
              onGoToDashboard={() => setActiveTab('dashboard')}
            />
          )}
          {/* F2) CHOSEN TAB: FATTURAZIONE */}
          
          {activeTab === 'fatturazione' && hasAccessTo('fatturazione') && (
            <FatturazioneSection
              pratiche={praticheFatturazione}
              onUpdatePratiche={handleUpdatePratiche}
              auditLogs={auditLogs}
              operators={operators}
              addAuditLogEntry={handleAddAuditLogEntry}
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
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            setShowLoginModal(false);
            fetchUserRole();
          }}
        />

                )}
      {showErrorModal && (
        <DatabaseErrorModal
          onClose={() => setShowErrorModal(false)}
          errorMsg={supabaseErrorMsg}
        />

                )}
    </div>
  );
}
