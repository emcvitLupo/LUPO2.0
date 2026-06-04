import { useState, useEffect } from 'react';
import { Client, Prova, Pacchetto, Preventivo, Reagente, AccettazioneCampione, Operator } from './types';
import {
  INITIAL_CLIENTS,
  INITIAL_PROVE,
  INITIAL_PACCHETTI,
  INITIAL_PREVENTIVI,
  INITIAL_REAGENTI,
  INITIAL_ACCETTAZIONI,
  INITIAL_OPERATORS
} from './mockData';

import { ClientiSection } from './components/ClientiSection';
import { ProveSection } from './components/ProveSection';
import { PreventiviSection } from './components/PreventiviSection';
import { ReagentarioSection } from './components/ReagentarioSection';
import { AccettazioneSection } from './components/AccettazioneSection';
import { StatisticheSection } from './components/StatisticheSection';
import { OperatoriSection } from './components/OperatoriSection';

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
  KeyRound
} from 'lucide-react';

export default function App() {
  // Caricamento stati con persistenza localStorage
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('lab_clients');
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  });

  const [prove, setProve] = useState<Prova[]>(() => {
    const saved = localStorage.getItem('lab_prove');
    return saved ? JSON.parse(saved) : INITIAL_PROVE;
  });

  const [pacchetti, setPacchetti] = useState<Pacchetto[]>(() => {
    const saved = localStorage.getItem('lab_pacchetti');
    return saved ? JSON.parse(saved) : INITIAL_PACCHETTI;
  });

  const [preventivi, setPreventivi] = useState<Preventivo[]>(() => {
    const saved = localStorage.getItem('lab_preventivi');
    return saved ? JSON.parse(saved) : INITIAL_PREVENTIVI;
  });

  const [reagenti, setReagenti] = useState<Reagente[]>(() => {
    const saved = localStorage.getItem('lab_reagenti');
    return saved ? JSON.parse(saved) : INITIAL_REAGENTI;
  });

  const [accettazioni, setAccettazioni] = useState<AccettazioneCampione[]>(() => {
    const saved = localStorage.getItem('lab_accettazioni');
    return saved ? JSON.parse(saved) : INITIAL_ACCETTAZIONI;
  });

  const [operators, setOperators] = useState<Operator[]>(() => {
    const saved = localStorage.getItem('lab_operators');
    return saved ? JSON.parse(saved) : INITIAL_OPERATORS;
  });

  // Salva i dati localmente al variare degli stati
  useEffect(() => {
    localStorage.setItem('lab_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('lab_prove', JSON.stringify(prove));
  }, [prove]);

  useEffect(() => {
    localStorage.setItem('lab_pacchetti', JSON.stringify(pacchetti));
  }, [pacchetti]);

  useEffect(() => {
    localStorage.setItem('lab_preventivi', JSON.stringify(preventivi));
  }, [preventivi]);

  useEffect(() => {
    localStorage.setItem('lab_reagenti', JSON.stringify(reagenti));
  }, [reagenti]);

  useEffect(() => {
    localStorage.setItem('lab_accettazioni', JSON.stringify(accettazioni));
  }, [accettazioni]);

  useEffect(() => {
    localStorage.setItem('lab_operators', JSON.stringify(operators));
  }, [operators]);

  // Gestione dei Pannelli attivi: 'dashboard' | 'clienti' | 'prove' | 'preventivi' | 'reagentario'
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedProvaId, setSelectedProvaId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);

  const handleGoToProva = (id: string) => {
    setSelectedProvaId(id);
    setActiveTab('prove');
  };

  // HANDLERS CLIENTS
  const handleAddClient = (newClient: Client) => {
    setClients(prev => {
      const idx = prev.findIndex(c => c.id === newClient.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = newClient;
        return copy;
      }
      return [...prev, newClient];
    });
  };

  const handleDeleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const handleUpdateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
  };

  // HANDLERS PROVE
  const handleAddProva = (newProva: Prova) => {
    setProve(prev => [...prev, newProva]);
  };

  const handleDeleteProva = (id: string) => {
    setProve(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdateProva = (updatedProva: Prova) => {
    setProve(prev => prev.map(p => p.id === updatedProva.id ? updatedProva : p));
  };

  // HANDLERS PACCHETTI E PREVENTIVI
  const handleAddPreventivo = (newPrev: Preventivo) => {
    setPreventivi(prev => {
      const idx = prev.findIndex(p => p.id === newPrev.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = newPrev;
        return copy;
      }
      return [...prev, newPrev];
    });
  };

  const handleAddPacchetto = (newPack: Pacchetto) => {
    setPacchetti(prev => [...prev, newPack]);
  };

  const handleUpdatePacchetto = (updatedPack: Pacchetto) => {
    setPacchetti(prev => prev.map(p => p.id === updatedPack.id ? updatedPack : p));
  };

  const handleDeletePreventivo = (id: string) => {
    setPreventivi(prev => prev.filter(p => p.id !== id));
  };

  const handleDeletePacchetto = (id: string) => {
    setPacchetti(prev => prev.filter(p => p.id !== id));
  };

  // HANDLERS REAGENTI
  const handleAddReagente = (newReag: Reagente) => {
    setReagenti(prev => [...prev, newReag]);
  };

  const handleDeleteReagente = (id: string) => {
    setReagenti(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateReagente = (updatedReag: Reagente) => {
    setReagenti(prev => prev.map(r => r.id === updatedReag.id ? updatedReag : r));
  };

  // HANDLERS ACCETTAZIONE
  const handleAddAccettazione = (newAcc: AccettazioneCampione) => {
    setAccettazioni(prev => [...prev, newAcc]);
  };

  const handleDeleteAccettazione = (id: string) => {
    setAccettazioni(prev => prev.filter(a => a.id !== id));
  };

  const handleUpdateAccettazione = (updatedAcc: AccettazioneCampione) => {
    setAccettazioni(prev => prev.map(a => a.id === updatedAcc.id ? updatedAcc : a));
  };

  // Svuota database e ripristina i dati iniziali
  const handleRestoreDefaults = () => {
    setClients(INITIAL_CLIENTS);
    setProve(INITIAL_PROVE);
    setPacchetti(INITIAL_PACCHETTI);
    setPreventivi(INITIAL_PREVENTIVI);
    setReagenti(INITIAL_REAGENTI);
    setAccettazioni(INITIAL_ACCETTAZIONI);
    setOperators(INITIAL_OPERATORS);
    setActiveTab('dashboard');
    setShowRestoreModal(false);
  };

  // Calcolo statistiche veloci per la dashboard
  const totaleClienti = clients.length;
  
  let fatturatoTotale = 0;
  clients.forEach(c => {
    if (c.fatturatoAnnuo) {
      Object.entries(c.fatturatoAnnuo).forEach(([_, valore]) => {
        fatturatoTotale += Number(valore) || 0;
      });
    }
  });

  const fatturatoMedio = totaleClienti > 0 ? (fatturatoTotale / totaleClienti) : 0;

  // Calcolo delle Top Categorie basato sul numero di prove inserite
  const categoryCounts: Record<string, number> = {};
  prove.forEach(p => {
    const cat = p.categoria || 'Generale';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3); // top 3

  // Ultimi 3 clienti inseriti
  const latestClients = [...clients].slice(-3).reverse();

  return (
    <div className="min-h-screen bg-slate-100/40 text-slate-700 font-sans flex flex-col lg:flex-row antialiased">
      
      {/* SIDEBAR NAVIGATION (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 sticky top-0 h-screen shrink-0 justify-between">
        <div className="flex flex-col p-6 space-y-8">
          
          {/* Brand/Logo Layout */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xl font-serif italic font-extrabold tracking-tight text-slate-900">LUPO 2.0</span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-600 block leading-none mt-0.5">LabMerceologico</span>
            </div>
          </div>

          {/* Sidebar Tabs */}
          <nav className="space-y-1.5" id="sidebar-links">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('clienti')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'clienti'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-clienti"
            >
              <Users className="h-4 w-4" />
              Clienti
            </button>

            <button
              onClick={() => setActiveTab('prove')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'prove'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-prove"
            >
              <FlaskConical className="h-4 w-4" />
              Prove
            </button>

            <button
              onClick={() => setActiveTab('preventivi')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'preventivi'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-preventivi"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Preventivi
            </button>

            <button
              onClick={() => setActiveTab('accettazione')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'accettazione'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-accettazione"
            >
              <FileText className="h-4 w-4" />
              Accettazione Campioni
            </button>

            <button
              onClick={() => setActiveTab('reagentario')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'reagentario'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-reagentario"
            >
              <Archive className="h-4 w-4" />
              Reagentario
            </button>

            <button
              onClick={() => setActiveTab('statistiche')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'statistiche'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-statistiche"
            >
              <BarChart3 className="h-4 w-4" />
              Statistiche & Report
            </button>

            <button
              onClick={() => setActiveTab('operatori')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'operatori'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-operatori"
            >
              <KeyRound className="h-4 w-4" />
              Operatori & Password
            </button>
          </nav>
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
      <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-50">
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
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'dashboard' ? 'bg-slate-905 text-slate-900 border-l-4 border-l-slate-800' : 'text-slate-650'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => { setActiveTab('clienti'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'clienti' ? 'bg-slate-905 text-slate-900 border-l-4 border-l-slate-800' : 'text-slate-650'}`}
          >
            Clienti
          </button>
          <button
            onClick={() => { setActiveTab('prove'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'prove' ? 'bg-slate-905 text-slate-900 border-l-4 border-l-slate-800' : 'text-slate-650'}`}
          >
            Prove
          </button>
          <button
            onClick={() => { setActiveTab('preventivi'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'preventivi' ? 'bg-slate-905 text-slate-900 border-l-4 border-l-slate-800' : 'text-slate-650'}`}
          >
            Preventivi
          </button>
          <button
            onClick={() => { setActiveTab('accettazione'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'accettazione' ? 'bg-slate-905 text-slate-900 border-l-4 border-l-slate-800' : 'text-slate-650'}`}
          >
            Accettazione Campioni
          </button>
          <button
            onClick={() => { setActiveTab('reagentario'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'reagentario' ? 'bg-slate-905 text-slate-900 border-l-4 border-l-slate-800' : 'text-slate-650'}`}
          >
            Reagentario
          </button>

          <button
            onClick={() => { setActiveTab('statistiche'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'statistiche' ? 'bg-slate-905 text-slate-900 border-l-4 border-l-slate-800' : 'text-slate-650'}`}
          >
            Statistiche & Analisi
          </button>

          <button
            onClick={() => { setActiveTab('operatori'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'operatori' ? 'bg-slate-905 text-slate-900 border-l-4 border-l-slate-800' : 'text-slate-650'}`}
          >
            Operatori & Password
          </button>
          
          <button
            onClick={() => { setShowRestoreModal(true); setMobileMenuOpen(false); }}
            className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 rounded-lg text-left text-center mt-3 cursor-pointer hover:bg-red-100/50 transition "
          >
            Ripristina Demo
          </button>
        </div>
      )}

      {/* MAIN VIEWPORT PORT */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
        
        {/* TAB ACTIVE SELECT */}
        <div className="transition mt-2 lg:mt-0">
          
          {/* A) CHOSEN TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Titolo Tab */}
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight" id="dashboard-main-title">
                  Dashboard
                </h1>
                <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
                  Benvenuto in LUPO 2.0 — scegli un&apos;area da gestire
                </p>
              </div>

              {/* GRIGLIA FUNZIONALE: CARD CON ICONE GRANDI E COLORI TENUI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="dashboard-grid-cards">
                
                {/* 1) Anagrafica Clienti */}
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

                {/* 2) Tariffario Prove */}
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

                {/* 3) Preventivi e contratti */}
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

                {/* 4) Accettazione Campioni */}
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

                {/* 5) Reagentario Chimico */}
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

                {/* 6) Analisi & Statistiche */}
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

                {/* 7) Operatori & Password */}
                <div
                  onClick={() => setActiveTab('operatori')}
                  className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-slate-800 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  id="card-dash-operatori"
                >
                  <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-6 text-slate-700 group-hover:scale-105 transition-transform duration-300">
                    <KeyRound className="h-9 w-9" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-slate-950 transition-colors">
                    Operatori & Password
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Gestione nomi e password dell&apos;equipe di laboratorio per firme a sistema
                  </p>
                </div>

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

              {/* SEZIONI SIDE-BY-SIDE: TOP CATEGORIE & ULTIMI CLIENTI */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
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

                {/* Box Right: Ultimi Clienti */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-slate-400" />
                        <h3 className="font-extrabold text-base text-slate-850 tracking-tight">Ultimi Clienti</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('clienti')}
                        className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-0.5"
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

              </div>

            </div>
          )}

          {/* B) CHOSEN TAB: CLIENTI */}
          {activeTab === 'clienti' && (
            <ClientiSection
              clients={clients}
              onAddClient={handleAddClient}
              onDeleteClient={handleDeleteClient}
              onUpdateClient={handleUpdateClient}
              preventivi={preventivi}
              prove={prove}
              pacchetti={pacchetti}
              accettazioni={accettazioni}
            />
          )}

          {/* C) CHOSEN TAB: PROVE */}
          {activeTab === 'prove' && (
            <ProveSection
              prove={prove}
              onAddProva={handleAddProva}
              onDeleteProva={handleDeleteProva}
              onUpdateProva={handleUpdateProva}
              selectedProvaId={selectedProvaId}
              onClearSelectedProvaId={() => setSelectedProvaId(null)}
            />
          )}

          {/* D) CHOSEN TAB: PREVENTIVI */}
          {activeTab === 'preventivi' && (
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
            />
          )}

          {/* E) CHOSEN TAB: REAGENTARIO */}
          {activeTab === 'reagentario' && (
            <ReagentarioSection
              reagenti={reagenti}
              onAddReagente={handleAddReagente}
              onDeleteReagente={handleDeleteReagente}
              onUpdateReagente={handleUpdateReagente}
            />
          )}

          {/* F) CHOSEN TAB: ACCETTAZIONE CAMPIONI */}
          {activeTab === 'accettazione' && (
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
            />
          )}

          {/* G) CHOSEN TAB: STATISTICHE E BUSINESS INTELLIGENCE */}
          {activeTab === 'statistiche' && (
            <StatisticheSection
              preventivi={preventivi}
              clients={clients}
              prove={prove}
              pacchetti={pacchetti}
              accettazioni={accettazioni}
              reagenti={reagenti}
            />
          )}

          {/* H) CHOSEN TAB: OPERATORI & PASSWORD */}
          {activeTab === 'operatori' && (
            <OperatoriSection
              operators={operators}
              onUpdateOperators={setOperators}
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

    </div>
  );
}
