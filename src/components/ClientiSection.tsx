import React, { useState, useEffect, useMemo } from 'react';
import { Client, Preventivo, Prova, Pacchetto, AccettazioneCampione } from '../types';
import { 
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  LineChart as RechartsLineChart,
  Line as RechartsLine,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  CartesianGrid as RechartsCartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer as RechartsResponsiveContainer,
  Cell as RechartsCell
} from 'recharts';
import { 
  Plus, 
  Search, 
  Calendar, 
  Landmark, 
  Info, 
  Trash2, 
  Briefcase, 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  User, 
  Users, 
  ChevronRight, 
  DollarSign,
  Pencil,
  Copy,
  TrendingUp,
  FileText,
  ClipboardList,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ClientiSectionProps {
  clients: Client[];
  onAddClient: (newClient: Client) => void;
  onDeleteClient: (id: string) => void;
  onUpdateClient: (updatedClient: Client) => void;
  preventivi?: Preventivo[];
  prove?: Prova[];
  pacchetti?: Pacchetto[];
  accettazioni?: AccettazioneCampione[];
}

export function ClientiSection({ 
  clients, 
  onAddClient, 
  onDeleteClient, 
  onUpdateClient, 
  preventivi = [],
  prove = [],
  pacchetti = [],
  accettazioni = []
}: ClientiSectionProps) {
  // Stati di visualizzazione: 'archive' | 'detail' | 'add'
  const [viewMode, setViewMode] = useState<'archive' | 'detail' | 'add'>('archive');
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clients[0]?.id || null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clientDeletingId, setClientDeletingId] = useState<string | null>(null);

  // Clipboard copies toast state
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 1500);
  };

  // Stato espansione preventivi collegati
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);

  const getProvaInfo = (id: string): Prova | undefined => {
    return prove.find(p => p.id === id);
  };

  const getPacchettoInfo = (id: string): Pacchetto | undefined => {
    return pacchetti.find(p => p.id === id);
  };

  // Sotto-tab attivo per la scheda cliente ('info' | 'financial' | 'preventivi')
  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'financial' | 'preventivi'>('info');

  // Stato per la modifica inline delle note commerciali
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [tempInlineNote, setTempInlineNote] = useState('');

  // Form states per nuovo cliente
  const [denominazione, setDenominazione] = useState('');
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [partitaIva, setPartitaIva] = useState('');
  const [email, setEmail] = useState('');
  const [pec, setPec] = useState('');
  const [telefono, setTelefono] = useState('');
  const [indirizzo, setIndirizzo] = useState('');
  const [comune, setComune] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  
  // Per l'inserimento dinamico di dati di fatturato sul form di creazione
  const [inputAnniFatturato, setInputAnniFatturato] = useState<{ anno: string; importo: string }[]>([
    { anno: '2025', importo: '' },
    { anno: '2026', importo: '' }
  ]);
  const [inputCategorieFatturato, setInputCategorieFatturato] = useState<{ categoria: string; anno: string; importo: string }[]>([
    { categoria: 'Oli e Grassi', anno: '2025', importo: '' },
    { categoria: 'Vini ed Aceti', anno: '2025', importo: '' }
  ]);

  // Gestione aggiunta riga fatturato anno/categoria nel form di creazione o modifica
  const addAnnoInputRow = () => {
    setInputAnniFatturato([...inputAnniFatturato, { anno: '2026', importo: '' }]);
  };
  const removeAnnoInputRow = (index: number) => {
    setInputAnniFatturato(inputAnniFatturato.filter((_, i) => i !== index));
  };

  const addCategoriaInputRow = () => {
    setInputCategorieFatturato([...inputCategorieFatturato, { categoria: 'Oli e Grassi', anno: '2026', importo: '' }]);
  };
  const removeCategoriaInputRow = (index: number) => {
    setInputCategorieFatturato(inputCategorieFatturato.filter((_, i) => i !== index));
  };

  // Stati per l'aggiunta rapida di un nuovo record di fatturato a un cliente esistente
  const [quickAnno, setQuickAnno] = useState('2026');
  const [quickImporto, setQuickImporto] = useState('');
  const [quickCat, setQuickCat] = useState('Oli e Grassi');
  const [quickCatAnno, setQuickCatAnno] = useState('2026');
  const [quickCatImporto, setQuickCatImporto] = useState('');

  const filteredClients = clients.filter(c =>
    c.denominazione.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.partitaIva.includes(searchTerm) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.pec && c.pec.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.nome && c.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.cognome && c.cognome.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedClient = clients.find(c => c.id === selectedClientId);

  // Calcolo automatico e sincronizzato del fatturato per anno e categoria per ogni cliente
  const computedFinancialData = useMemo(() => {
    if (!selectedClient) {
      return {
        fatturatoAnnuo: {} as Record<string, number>,
        categorieFatturato: {} as Record<string, Record<string, number>>,
        totalByYear: [] as { year: string; total: number }[],
        categoryByYear: [] as { year: string; [category: string]: any }[],
        reportsByCategoryAndYear: [] as { year: string; [category: string]: any }[],
        totalReportsByYear: [] as { year: string; total: number }[]
      };
    }

    // Partiamo dagli storici impostati sul cliente
    const fatturatoAnnuo: Record<string, number> = { ...selectedClient.fatturatoAnnuo };
    const categorieFatturato: Record<string, Record<string, number>> = {};
    
    // Inizializza categorieFatturato con i dati storici del cliente se provvisti
    if (selectedClient.categorieFatturato) {
      Object.entries(selectedClient.categorieFatturato).forEach(([cat, valObj]) => {
        categorieFatturato[cat] = { ...valObj };
      });
    }

    // Filtriamo i preventivi approvati di questo specifico cliente
    const clientPreventivi = (preventivi || []).filter(
      p => p.clienteId === selectedClient.id && p.stato === 'Approvato'
    );

    // Elaboriamo l'apporto monetario dei singoli preventivi approvati per categoria analitica
    clientPreventivi.forEach(p => {
      const year = p.dataCreazione ? p.dataCreazione.split('-')[0] : '2026';
      
      let totalValueCalculated = 0;
      const categorySharesPrev: Record<string, number> = {};

      p.proveSelezionate.forEach(item => {
        const pr = prove.find(x => x.id === item.provaId);
        const cat = pr?.categoriaMerceologica || 'Generale';
        const subtotal = item.prezzoApplicato * item.quantita;
        categorySharesPrev[cat] = (categorySharesPrev[cat] || 0) + subtotal;
        totalValueCalculated += subtotal;
      });

      p.pacchettiSelezionati.forEach(item => {
        const pack = pacchetti.find(x => x.id === item.pacchettoId);
        const cat = pack?.categoriaMerceologica || 'Generale';
        const subtotal = item.prezzoApplicato * item.quantita;
        categorySharesPrev[cat] = (categorySharesPrev[cat] || 0) + subtotal;
        totalValueCalculated += subtotal;
      });

      const factor = p.scontoPercentuale && p.scontoPercentuale > 0 
        ? (1 - p.scontoPercentuale / 100) 
        : 1;

      // Se non abbiamo dettagli di prove nel preventivo ma c'è un gettone totale
      if (totalValueCalculated === 0 && p.totale > 0) {
        categorySharesPrev['Generale'] = p.totale;
        totalValueCalculated = p.totale;
      }

      const discountScale = (p.totale && totalValueCalculated > 0) ? (p.totale / totalValueCalculated) : factor;

      Object.entries(categorySharesPrev).forEach(([cat, rawVal]) => {
        const finalVal = rawVal * discountScale;
        if (!categorieFatturato[cat]) {
          categorieFatturato[cat] = {};
        }
        categorieFatturato[cat][year] = (categorieFatturato[cat][year] || 0) + finalVal;
      });
    });

    // Uniformiamo e sincronizziamo il fatturatoAnnuo finale e coerente per evitare sfasamenti tra totale e categorie
    const yearsSet = new Set<string>();
    Object.keys(fatturatoAnnuo).forEach(yr => yearsSet.add(yr));
    Object.values(categorieFatturato).forEach(yrRecord => {
      Object.keys(yrRecord).forEach(yr => yearsSet.add(yr));
    });

    const finalFatturatoAnnuo: Record<string, number> = {};
    yearsSet.forEach(yr => {
      let sumFromCategories = 0;
      Object.values(categorieFatturato).forEach(yrRecord => {
        sumFromCategories += yrRecord[yr] || 0;
      });

      // Se non ci sono ricavi per categorie ma c'era lo storico iniziale per quell'anno, usiamo lo storico
      finalFatturatoAnnuo[yr] = sumFromCategories > 0 ? sumFromCategories : (fatturatoAnnuo[yr] || 0);
    });

    // 1) Dati per Grafico Andamento Fatturato Annuo Complessivo
    const totalByYear = Object.entries(finalFatturatoAnnuo)
      .map(([yr, total]) => ({ year: yr, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => a.year.localeCompare(b.year));

    // 2) Dati per Grafico Fatturato per Categoria ed Anno
    const categoryByYearMap: Record<string, Record<string, number>> = {};
    Object.entries(categorieFatturato).forEach(([cat, yrRecord]) => {
      Object.entries(yrRecord).forEach(([yr, val]) => {
        if (!categoryByYearMap[yr]) {
          categoryByYearMap[yr] = {};
        }
        categoryByYearMap[yr][cat] = (categoryByYearMap[yr][cat] || 0) + Math.round(val * 100) / 100;
      });
    });

    const categoryByYear = Object.entries(categoryByYearMap)
      .map(([yr, catVals]) => ({
        year: yr,
        ...catVals
      }))
      .sort((a, b) => a.year.localeCompare(b.year));

    // 3) Dati per Grafico e indicatori dei Rapporti di Prova Emessi
    const clientAccettazioni = (accettazioni || []).filter(
      acc => acc.intestatarioRapportoClienteId === selectedClient.id
    );

    const reportsCountMap: Record<string, Record<string, number>> = {};
    const totalReportsByYearMap: Record<string, number> = {};

    clientAccettazioni.forEach(acc => {
      const year = acc.dataAccettazione ? acc.dataAccettazione.split('-')[0] : '2026';
      // Mappiamo le categorie merceologiche dell'accettazione
      const cat = acc.categoriaMerceologica || acc.matrice || 'Generale';

      if (!reportsCountMap[year]) {
        reportsCountMap[year] = {};
      }
      reportsCountMap[year][cat] = (reportsCountMap[year][cat] || 0) + 1;
      totalReportsByYearMap[year] = (totalReportsByYearMap[year] || 0) + 1;
    });

    // Assicuriamo che anche gli anni in cui ci sono preventivi ma non accettazioni compaiano nei conteggi
    yearsSet.forEach(yr => {
      if (!reportsCountMap[yr]) {
        reportsCountMap[yr] = {};
      }
      if (!totalReportsByYearMap[yr]) {
        totalReportsByYearMap[yr] = 0;
      }
    });

    const reportsByCategoryAndYear = Object.entries(reportsCountMap)
      .map(([yr, catCounts]) => ({
        year: yr,
        ...catCounts
      }))
      .sort((a, b) => a.year.localeCompare(b.year));

    const totalReportsByYear = Object.entries(totalReportsByYearMap)
      .map(([yr, total]) => ({ year: yr, total }))
      .sort((a, b) => a.year.localeCompare(b.year));

    return {
      fatturatoAnnuo: finalFatturatoAnnuo,
      categorieFatturato,
      totalByYear,
      categoryByYear,
      reportsByCategoryAndYear,
      totalReportsByYear
    };
  }, [selectedClient, preventivi, prove, pacchetti, accettazioni]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const denomClean = denominazione.trim();
    if (!denomClean) {
      setFormError("Errore: La Ragione sociale / Nome cliente è obbligatorio.");
      return;
    }

    const nomeClean = nome.trim();
    const cognomeClean = cognome.trim();
    const isAzienda = !nomeClean && !cognomeClean;

    // Controllo Partita IVA
    const pIvaClean = partitaIva.trim();
    if (isAzienda && !pIvaClean) {
      setFormError("Errore: La Partita IVA è obbligatorio per le aziende.");
      return;
    }

    if (pIvaClean) {
      if (!/^\d{11}$/.test(pIvaClean)) {
        setFormError("Errore di formato: La Partita IVA deve essere composta esattamente da 11 cifre numeriche.");
        return;
      }
      
      // Verifica formale della validità (Algoritmo di Luhn applicato alla Partita IVA italiana)
      let sum = 0;
      for (let i = 0; i < 10; i++) {
        let val = parseInt(pIvaClean.charAt(i), 10);
        if (i % 2 === 0) {
          sum += val;
        } else {
          let temp = val * 2;
          if (temp > 9) temp -= 9;
          sum += temp;
        }
      }
      let checkDigit = (10 - (sum % 10)) % 10;
      if (checkDigit !== parseInt(pIvaClean.charAt(10), 10)) {
        setFormError("Errore di validità: La Partita IVA inserita non è formalmente valida (fallito algoritmo di controllo dello Stato Italiano).");
        return;
      }

      // Controllo duplicati Partita IVA
      const existsPIva = clients.some(c => 
        c.partitaIva && 
        c.partitaIva.trim() === pIvaClean && 
        (!isEditMode || c.id !== selectedClientId)
      );
      if (existsPIva) {
        setFormError("Errore di coerenza: Esiste già un cliente registrato nel database con questa Partita IVA.");
        return;
      }
    }

    // Controllo Indirizzo
    const indirizzoClean = indirizzo.trim();
    if (!indirizzoClean) {
      setFormError("Errore: L'Indirizzo è obbligatorio.");
      return;
    }

    // Controllo Comune
    const comuneClean = comune.trim();
    if (!comuneClean) {
      setFormError("Errore: Il Comune è obbligatorio.");
      return;
    }

    // Controllo Email
    const emailClean = email.trim();
    if (!emailClean) {
      setFormError("Errore: L'indirizzo Email è obbligatorio.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailClean)) {
      setFormError("Errore di formato: L'indirizzo Email inserito non è valido.");
      return;
    }
    // Controllo duplicati Email
    const existsEmail = clients.some(c => 
      c.email && 
      c.email.trim().toLowerCase() === emailClean.toLowerCase() && 
      (!isEditMode || c.id !== selectedClientId)
    );
    if (existsEmail) {
      setFormError("Errore di coerenza: Questo indirizzo Email è già utilizzato da un altro cliente in archivio.");
      return;
    }

    // Controllo PEC
    const pecClean = pec.trim();
    if (pecClean) {
      if (!emailRegex.test(pecClean)) {
        setFormError("Errore di formato: L'indirizzo PEC inserito non è valido.");
        return;
      }
      const existsPec = clients.some(c => 
        c.pec && 
        c.pec.trim().toLowerCase() === pecClean.toLowerCase() && 
        (!isEditMode || c.id !== selectedClientId)
      );
      if (existsPec) {
        setFormError("Errore di coerenza: Questo indirizzo PEC è già utilizzato da un altro cliente in archivio.");
        return;
      }
    }

    // Controllo Telefono
    const telClean = telefono.trim();
    if (!telClean) {
      setFormError("Errore: Il numero di Telefono è obbligatorio.");
      return;
    }
    if (!/^\+?[0-9\s\-]+$/.test(telClean) || telClean.replace(/[^0-9]/g, '').length < 5) {
      setFormError("Errore di formato: Il numero di Telefono non è valido. Fornisci un numero numerico di almeno 5 cifre (prefisso internazionale ammesso).");
      return;
    }
    // Controllo duplicati Telefono
    const existsTel = clients.some(c => 
      c.telefono && 
      c.telefono.trim().replace(/[^0-9]/g, '') === telClean.replace(/[^0-9]/g, '') && 
      (!isEditMode || c.id !== selectedClientId)
    );
    if (existsTel) {
      setFormError("Errore di coerenza: Questo numero di Telefono è già associato ad un altro cliente in archivio.");
      return;
    }

    // Elaborazione fatturato annuo complessivo
    const fatturatoAnnuo: Record<string, number> = {};
    inputAnniFatturato.forEach(item => {
      if (item.anno && item.importo) {
        fatturatoAnnuo[item.anno.trim()] = parseFloat(item.importo) || 0;
      }
    });

    // Elaborazione fatturato per categoria
    const categorieFatturato: Record<string, Record<string, number>> = {};
    inputCategorieFatturato.forEach(item => {
      if (item.categoria.trim() && item.anno.trim() && item.importo) {
        const cat = item.categoria.trim();
        const yr = item.anno.trim();
        const imp = parseFloat(item.importo) || 0;
        
        if (!categorieFatturato[cat]) {
          categorieFatturato[cat] = {};
        }
        categorieFatturato[cat][yr] = imp;
      }
    });

    if (isEditMode && selectedClientId && selectedClient) {
      const updatedClient: Client = {
        id: selectedClientId,
        denominazione: denomClean,
        nome: nomeClean || undefined,
        cognome: cognomeClean || undefined,
        partitaIva: pIvaClean,
        email: emailClean,
        pec: pecClean || undefined,
        telefono: telClean,
        indirizzo: indirizzoClean,
        comune: comuneClean,
        note: note.trim() || undefined,
        fatturatoAnnuo: selectedClient.fatturatoAnnuo || {},
        categorieFatturato: selectedClient.categorieFatturato || {}
      };
      onUpdateClient(updatedClient);
      setViewMode('detail');
    } else {
      const newClient: Client = {
        id: 'c_' + Date.now(),
        denominazione: denomClean,
        nome: nomeClean || undefined,
        cognome: cognomeClean || undefined,
        partitaIva: pIvaClean,
        email: emailClean,
        pec: pecClean || undefined,
        telefono: telClean,
        indirizzo: indirizzoClean,
        comune: comuneClean,
        note: note.trim() || undefined,
        fatturatoAnnuo: {},
        categorieFatturato: {}
      };

      onAddClient(newClient);
      setSelectedClientId(newClient.id);
      setViewMode('detail');
    }
    
    // Reset del form
    setDenominazione('');
    setNome('');
    setCognome('');
    setPartitaIva('');
    setEmail('');
    setPec('');
    setTelefono('');
    setIndirizzo('');
    setComune('');
    setNote('');
    setInputAnniFatturato([{ anno: '2025', importo: '' }, { anno: '2026', importo: '' }]);
    setInputCategorieFatturato([
      { categoria: 'Oli e Grassi', anno: '2025', importo: '' },
      { categoria: 'Vini ed Aceti', anno: '2025', importo: '' }
    ]);
    setIsEditMode(false);
  };

  // Aggiungi fatturato annuo a cliente esistente
  const handleAddQuickFatturato = () => {
    if (!selectedClient || !quickAnno || !quickImporto) return;
    const val = parseFloat(quickImporto);
    if (isNaN(val)) return;

    const updated: Client = {
      ...selectedClient,
      fatturatoAnnuo: {
        ...selectedClient.fatturatoAnnuo,
        [quickAnno]: val
      }
    };
    onUpdateClient(updated);
    setQuickImporto('');
  };

  // Aggiungi fatturato categoria a cliente esistente
  const handleAddQuickCatFatturato = () => {
    if (!selectedClient || !quickCat || !quickCatAnno || !quickCatImporto) return;
    const val = parseFloat(quickCatImporto);
    if (isNaN(val)) return;

    const currentCatFatturato = { ...(selectedClient.categorieFatturato[quickCat] || {}) };
    currentCatFatturato[quickCatAnno] = val;

    const updated: Client = {
      ...selectedClient,
      categorieFatturato: {
        ...selectedClient.categorieFatturato,
        [quickCat]: currentCatFatturato
      }
    };
    onUpdateClient(updated);
    setQuickCatImporto('');
  };

  const handleOpenDetails = (id: string) => {
    setSelectedClientId(id);
    const client = clients.find(c => c.id === id);
    if (client) {
      setTempInlineNote(client.note || '');
    }
    setActiveDetailTab('info');
    setIsEditingNote(false);
    setViewMode('detail');
  };

  // Sincronizza lo stato delle note commerciali inline quando cambia cliente o nota
  useEffect(() => {
    if (selectedClient && !isEditingNote) {
      setTempInlineNote(selectedClient.note || '');
    }
  }, [selectedClientId, selectedClient?.note, isEditingNote]);

  // Aggiorna le note commerciali inline direttamente dal dettaglio profilo
  const handleUpdateInlineNote = () => {
    if (!selectedClient) return;
    const updated: Client = {
      ...selectedClient,
      note: tempInlineNote.trim() || undefined
    };
    onUpdateClient(updated);
    setIsEditingNote(false);
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">

        {/* 1) VIEW MODE: ARCHIVE */}
        {viewMode === 'archive' && (
          <motion.div
            key="archive"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Header Archivio */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-extrabold uppercase">
                    Anagrafiche
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-bold">
                    {clients.length} accounts registrati
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
                  Archivio Clienti
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consulta, cerca o inserisci le anagrafiche dei clienti del laboratorio
                </p>
              </div>

              <button
                onClick={() => {
                  setIsEditMode(false);
                  setFormError(null);
                  setDenominazione('');
                  setPartitaIva('');
                  setNome('');
                  setCognome('');
                  setEmail('');
                  setPec('');
                  setTelefono('');
                  setIndirizzo('');
                  setComune('');
                  setNote('');
                  setInputAnniFatturato([{ anno: '2025', importo: '' }, { anno: '2026', importo: '' }]);
                  setInputCategorieFatturato([
                    { categoria: 'Oli e Grassi', anno: '2025', importo: '' },
                    { categoria: 'Vini ed Aceti', anno: '2025', importo: '' }
                  ]);
                  setViewMode('add');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer self-stretch sm:self-auto justify-center"
                id="btn-add-client-from-archive"
              >
                <Plus className="h-4 w-4" /> Nuovo Cliente
              </button>
            </div>

            {/* Ricerca e Filtri */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs flex items-center">
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cerca cliente per denominazione, p.iva, mail o nome referente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-550 focus:bg-white transition"
                  id="search-clienti-archivio"
                />
              </div>
            </div>

            {/* Elenco Clienti Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredClients.length === 0 ? (
                <div className="col-span-full bg-white border border-slate-150 rounded-2xl p-16 text-center text-slate-400 text-sm">
                  Nessun cliente corrisponde ai criteri di ricerca.
                </div>
              ) : (
                filteredClients.map((client) => {
                  const haReferente = client.nome || client.cognome;
                  const fatturatoUltimo = client.fatturatoAnnuo['2026'] || client.fatturatoAnnuo['2025'] || 0;
                  
                  return (
                    <div 
                      key={client.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-3xs hover:shadow-xs hover:border-blue-500/50 transition duration-200 flex flex-col justify-between"
                      id={`client-card-${client.id}`}
                    >
                      <div>
                        {/* Testata Card */}
                        <div className="flex justify-between items-start gap-4">
                          <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600 shrink-0">
                            <Landmark className="h-5 w-5" />
                          </div>
                          
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 font-mono block">PARTITA IVA</span>
                            <span className="text-xs font-semibold text-slate-600 font-mono">{client.partitaIva || 'n/d'}</span>
                          </div>
                        </div>

                        {/* Denominazione e Referente */}
                        <div className="mt-4">
                          <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition tracking-tight line-clamp-1">
                            {client.denominazione}
                          </h3>
                          
                          {haReferente ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-100/80 rounded-md text-slate-700 text-[10px] font-bold mt-1.5 border border-slate-200/30">
                              <User className="h-3.5 w-3.5 text-slate-500" />
                              <span>Referente: {client.nome || ''} {client.cognome || ''}</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-md text-slate-400 text-[10px] italic mt-1.5 border border-slate-200/10">
                              <span>Nessun referente specificato</span>
                            </div>
                          )}
                        </div>

                        {/* Contatti */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2 text-xs">
                          {client.email && (
                            <div className="flex items-center gap-2 text-slate-500">
                              <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span className="truncate">{client.email}</span>
                            </div>
                          )}
                          {client.pec && (
                            <div className="flex items-center gap-2 text-slate-500">
                              <Mail className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                              <span className="truncate text-[11px] font-medium text-slate-600">PEC: {client.pec}</span>
                            </div>
                          )}
                          {client.telefono && (
                            <div className="flex items-center gap-2 text-slate-500">
                              <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span>{client.telefono}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer card */}
                      <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                        <div className="font-mono">
                          <span className="text-[9px] text-slate-400 font-bold block uppercase leading-none">Ultimo Fatturato</span>
                          <span className="text-xs font-bold text-slate-700">€{fatturatoUltimo.toLocaleString('it-IT')}</span>
                        </div>

                        <div className="flex gap-1.5 items-center">
                          {clientDeletingId === client.id ? (
                            <div className="flex items-center gap-1.5 bg-rose-50 p-1.5 rounded-lg border border-rose-100 animate-fadeIn">
                              <span className="text-[10px] font-bold text-rose-700">Sicuro?</span>
                              <button
                                onClick={() => {
                                  onDeleteClient(client.id);
                                  setClientDeletingId(null);
                                }}
                                className="bg-rose-600 text-white rounded px-1.5 py-0.5 text-[9px] font-bold cursor-pointer hover:bg-rose-700"
                              >
                                Sì
                              </button>
                              <button
                                onClick={() => setClientDeletingId(null)}
                                className="bg-white border border-slate-200 text-slate-500 rounded px-1.5 py-0.5 text-[9px] font-bold cursor-pointer hover:bg-slate-50"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setClientDeletingId(client.id);
                              }}
                              className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Elimina"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleOpenDetails(client.id)}
                            className="bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg transition flex items-center gap-0.5"
                          >
                            Apri Profilo <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}

        {/* 2) VIEW MODE: DETAILS */}
        {viewMode === 'detail' && selectedClient && (
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Back Button and Header card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <button
                onClick={() => setViewMode('archive')}
                className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1.5 transition mb-5 focus:outline-none cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Torna all&apos;Archivio Clienti
              </button>

              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Profilo Cliente Attivo
                    </span>
                    {(() => {
                      const ltvVal = (Object.values(computedFinancialData.fatturatoAnnuo) as number[]).reduce((sum: number, curr: number) => sum + curr, 0);
                      const bStats = ltvVal >= 2500 
                        ? { label: '💎 CLIENTE PLATINUM KEY', style: 'bg-teal-50 border-teal-200 text-teal-800' }
                        : ltvVal >= 500 
                          ? { label: '⭐ PARTNER GOLD', style: 'bg-amber-50 border-amber-250 text-amber-850' }
                          : { label: '💼 CLIENTE SILVER', style: 'bg-slate-100 border-slate-200 text-slate-700' };
                      return (
                        <span className={`text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full border tracking-wider ${bStats.style}`}>
                          {bStats.label}
                        </span>
                      );
                    })()}
                    <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                      ID: {selectedClient.id}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-850 tracking-tight">
                    {selectedClient.denominazione}
                  </h2>
                  <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
                    <span>Partita IVA:</span>
                    <span className="font-bold text-slate-600 block">{selectedClient.partitaIva || 'Nessuna'}</span>
                    {selectedClient.partitaIva && (
                      <button
                        onClick={() => copyToClipboard(selectedClient.partitaIva, 'piva')}
                        className="p-1 hover:bg-slate-150 rounded transition text-slate-400 hover:text-slate-600 cursor-pointer flex items-center gap-1"
                        title="Copia negli appunti"
                      >
                        <Copy className="h-3 w-3" />
                        {copiedField === 'piva' && <span className="text-[9px] text-emerald-600 font-bold font-sans animate-scaleIn">Copiato!</span>}
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Client Stats Widgets */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl min-w-[130px]">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">FATTURATO LTV</span>
                    <span className="text-sm font-extrabold text-slate-800 block mt-0.5 font-sans">
                      €{(Object.values(computedFinancialData.fatturatoAnnuo) as number[]).reduce((sum: number, curr: number) => sum + curr, 0).toLocaleString('it-IT')}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl min-w-[130px]">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">PREVENTIVI EMESSI</span>
                    <span className="text-sm font-extrabold text-blue-600 block mt-0.5">
                      {preventivi.filter(p => p.clienteId === selectedClient.id).length} documenti
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-150 p-3 rounded-xl min-w-[130px] flex flex-col justify-center">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">REFERENTE</span>
                    <span className="text-xs font-bold text-slate-700 mt-0.5 truncate max-w-[150px]">
                      {selectedClient.nome || selectedClient.cognome ? (
                        `${selectedClient.nome || ''} ${selectedClient.cognome || ''}`
                      ) : (
                        <span className="text-slate-400 italic font-normal">Non dato</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons (Edit & Delete) */}
              <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-5 border-t border-slate-100">
                {/* Visual subtabs indicators */}
                <div className="flex p-1 bg-slate-100 rounded-xl max-w-full overflow-x-auto text-xs shrink-0 select-none">
                  <button
                    onClick={() => setActiveDetailTab('info')}
                    className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      activeDetailTab === 'info' 
                        ? 'bg-white text-slate-800 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-850'
                    }`}
                  >
                    <User className="h-3.5 w-3.5" /> Dati & Note Commerciali
                  </button>
                  <button
                    onClick={() => setActiveDetailTab('financial')}
                    className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      activeDetailTab === 'financial' 
                        ? 'bg-white text-slate-800 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-850'
                    }`}
                  >
                    <TrendingUp className="h-3.5 w-3.5" /> Analisi Fatturati ({Object.keys(computedFinancialData.fatturatoAnnuo).length})
                  </button>
                  <button
                    onClick={() => setActiveDetailTab('preventivi')}
                    className={`px-4 py-2 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      activeDetailTab === 'preventivi' 
                        ? 'bg-white text-slate-800 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-850'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" /> Storico Preventivi ({preventivi.filter(p => p.clienteId === selectedClient.id).length})
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => {
                      setIsEditMode(true);
                      setFormError(null);
                      setDenominazione(selectedClient.denominazione);
                      setPartitaIva(selectedClient.partitaIva || '');
                      setNome(selectedClient.nome || '');
                      setCognome(selectedClient.cognome || '');
                      setEmail(selectedClient.email || '');
                      setPec(selectedClient.pec || '');
                      setTelefono(selectedClient.telefono || '');
                      setIndirizzo(selectedClient.indirizzo || '');
                      setComune(selectedClient.comune || '');
                      setNote(selectedClient.note || '');
                      
                      const annualita = Object.entries(selectedClient.fatturatoAnnuo).map(([anno, valore]) => ({
                        anno,
                        importo: valore.toString()
                      }));
                      setInputAnniFatturato(annualita.length > 0 ? annualita : [{ anno: '2025', importo: '' }]);

                      const catRows: { categoria: string; anno: string; importo: string }[] = [];
                      Object.entries(selectedClient.categorieFatturato || {}).forEach(([categoria, datiAnno]) => {
                        Object.entries(datiAnno || {}).forEach(([anno, valore]) => {
                          catRows.push({ categoria, anno, importo: valore.toString() });
                        });
                      });
                      setInputCategorieFatturato(catRows.length > 0 ? catRows : [{ categoria: 'Oli e Grassi', anno: '2025', importo: '' }]);

                      setViewMode('add');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3.5 py-1.5 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    id="btn-edit-client-details"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Modifica Anagrafica
                  </button>

                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(true);
                      }}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-750 border border-rose-100 rounded-lg px-3 py-1.5 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" /> Elimina
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-150 rounded-lg p-1.5 animate-fadeIn">
                      <span className="text-[10px] font-bold text-rose-750 px-1">Sicuro?</span>
                      <button
                        onClick={() => {
                          onDeleteClient(selectedClient.id);
                          setShowDeleteConfirm(false);
                          setViewMode('archive');
                        }}
                        className="bg-rose-600 hover:bg-rose-700 text-white rounded px-2 py-1 text-[10px] font-bold transition cursor-pointer"
                      >
                        Sì, elimina
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded px-2 py-1 text-[10px] font-bold transition cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* TAB CONTENT */}
            
            {/* 1. INFO GENERALE & NOTE TAB */}
            {activeDetailTab === 'info' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left Card: Recapiti e Sede */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
                  <h3 className="font-extrabold text-xs text-slate-400 tracking-wider uppercase border-b border-slate-100 pb-2">
                    Recapiti Anagrafici & Sede
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Referente Nom/Cognome */}
                    <div className="col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-150/60">
                      <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Referente d&apos;Azienda</span>
                      <span className="text-slate-800 font-extrabold text-sm flex items-center gap-2 mt-1">
                        <User className="h-4 w-4 text-blue-500 shrink-0" />
                        {selectedClient.nome || selectedClient.cognome ? (
                          `${selectedClient.nome || ''} ${selectedClient.cognome || ''}`
                        ) : (
                          <span className="text-slate-400 italic font-normal">Nessun referente associato</span>
                        )}
                      </span>
                    </div>

                    {/* Email */}
                    <div className="space-y-1 relative">
                      <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider font-sans">INDIRIZZO EMAIL</span>
                      {selectedClient.email ? (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <a href={`mailto:${selectedClient.email}`} className="text-blue-600 hover:underline font-bold text-xs flex items-center gap-2 break-all">
                            <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                            {selectedClient.email}
                          </a>
                          <button
                            onClick={() => copyToClipboard(selectedClient.email, 'email')}
                            className="p-1 hover:bg-slate-100 rounded transition text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                            title="Copia e-mail"
                          >
                            {copiedField === 'email' ? <span className="text-[10px] text-emerald-600 font-extrabold animate-scaleIn">✓</span> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs block pt-0.5 font-sans">Nessuna specificata</span>
                      )}
                    </div>

                    {/* PEC */}
                    <div className="space-y-1 relative font-sans">
                      <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider font-sans">INDIRIZZO PEC (Posta Certificata)</span>
                      {selectedClient.pec ? (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <a href={`mailto:${selectedClient.pec}`} className="text-blue-650 hover:underline font-bold text-xs flex items-center gap-2 break-all">
                            <Mail className="h-4 w-4 text-indigo-400 shrink-0" />
                            {selectedClient.pec}
                          </a>
                          <button
                            onClick={() => copyToClipboard(selectedClient.pec, 'pec')}
                            className="p-1 hover:bg-slate-100 rounded transition text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"
                            title="Copia PEC"
                          >
                            {copiedField === 'pec' ? <span className="text-[10px] text-emerald-600 font-extrabold animate-scaleIn">✓</span> : <Copy className="h-3 w-3" />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400/70 italic text-xs block pt-0.5 font-sans">Nessuna PEC registrata</span>
                      )}
                    </div>

                    {/* Telefono */}
                    <div className="space-y-1 col-span-2">
                      <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider font-sans">CONTATTO TELEFONICO</span>
                      {selectedClient.telefono ? (
                        <span className="text-slate-700 font-mono font-bold text-xs flex items-center gap-2 pt-0.5">
                          <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                          {selectedClient.telefono}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-xs block pt-0.5 font-sans">Nessuno specificato</span>
                      )}
                    </div>

                    {/* Indirizzo Operativo */}
                    <div className="col-span-2 space-y-1 pt-1.5 border-t border-slate-100">
                      <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider font-sans">INDIRIZZO SEDE SOCIETARIA</span>
                      {selectedClient.indirizzo ? (
                        <div className="flex items-start justify-between gap-2 pt-1 font-sans">
                          <span className="text-slate-700 text-xs flex items-start gap-2 font-semibold leading-relaxed">
                            <MapPin className="h-4 w-4 text-slate-450 shrink-0 mt-0.5" />
                            <span>{selectedClient.indirizzo}{selectedClient.comune ? `, ${selectedClient.comune}` : ''}</span>
                          </span>
                          <button
                            onClick={() => {
                              const fullAddr = `${selectedClient.indirizzo}${selectedClient.comune ? `, ${selectedClient.comune}` : ''}`;
                              copyToClipboard(fullAddr, 'addr');
                            }}
                            className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded text-[9.5px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer transition shrink-0"
                            title="Copia Indirizzo Sede"
                          >
                            <Copy className="h-3 w-3 text-slate-400" />
                            <span>{copiedField === 'addr' ? 'Copiato!' : 'Copia'}</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs block pt-0.5 font-sans">Nessun indirizzo registrato</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Card: Note Commerciali Box con editing inline */}
                <div className="bg-amber-50/15 p-5 rounded-2xl border border-amber-200/50 shadow-2xs flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-amber-200/40 pb-2">
                      <span className="text-amber-800 font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span className="text-sm">📝</span> SCHEDA ACCORDI COMMERCIALI
                      </span>
                      
                      {!isEditingNote && (
                        <button
                          onClick={() => {
                            setTempInlineNote(selectedClient.note || '');
                            setIsEditingNote(true);
                          }}
                          className="text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200/80 rounded px-2 py-1 transition cursor-pointer flex items-center gap-1"
                        >
                          <Pencil className="h-3 w-3" /> Modifica Note
                        </button>
                      )}
                    </div>

                    <p className="text-[11.5px] text-amber-700/95 leading-normal">
                      Questo archivio raccoglie <strong>accordi di tariffario esclusivi</strong>, <strong>requisiti di fatturazione particolari</strong>, percentuali di sconto applicate o vincoli di consegna speciali.
                    </p>

                    {isEditingNote ? (
                      <div className="space-y-2 mt-4 animate-fadeIn">
                        <textarea
                          rows={4}
                          value={tempInlineNote}
                          onChange={(e) => setTempInlineNote(e.target.value)}
                          placeholder="es. Sconto del 10% applicato alle prove del vino. Inviare preventivi a acquisti@azienda.it"
                          className="w-full text-xs p-2.5 border border-amber-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
                        />
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            onClick={() => setIsEditingNote(false)}
                            className="bg-white border border-slate-200 text-slate-500 rounded px-2.5 py-1 text-[11px] font-bold cursor-pointer hover:bg-slate-50"
                          >
                            Annulla
                          </button>
                          <button
                            onClick={handleUpdateInlineNote}
                            className="bg-amber-600 hover:bg-amber-750 text-white rounded px-3 py-1 text-[11px] font-bold cursor-pointer transition flex items-center gap-1 shadow-xs"
                          >
                            <Check className="h-3 w-3" /> Salva Accordi
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 p-4 bg-white border border-amber-100 rounded-xl leading-relaxed text-slate-750 text-xs min-h-[90px] shadow-2xs">
                        {selectedClient.note ? (
                          <p className="whitespace-pre-line font-medium text-slate-850 italic">
                            &ldquo;{selectedClient.note}&rdquo;
                          </p>
                        ) : (
                          <div className="text-slate-400 italic text-center py-4 space-y-1">
                            <p>Nessun accordo commerciale inserito.</p>
                            <button 
                              onClick={() => {
                                setTempInlineNote('');
                                setIsEditingNote(true);
                              }}
                              className="text-blue-600 hover:underline text-[11px] font-bold"
                            >
                              Clicca qui per digitarne uno
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-amber-700/85 bg-amber-50/60 p-2.5 rounded-lg border border-amber-100/60 mt-4">
                    <strong>N.B:</strong> Le note commerciali salvate sono visibili a tutti gli analisti al momento della stesura di nuovi preventivi.
                  </div>
                </div>

              </div>
            )}

            {/* 2. ANALISI FATTURATI TAB */}
            {activeDetailTab === 'financial' && (
              <div className="space-y-6">
                
                {/* Banner di stato Sincronizzazione Automatica */}
                <div className="bg-emerald-50/70 border border-emerald-150 p-4 rounded-xl flex items-start gap-3 bg">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700 shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                      Sincronizzazione Finanziaria Automatica Attiva
                    </h4>
                    <p className="text-[11px] text-emerald-600/90 leading-relaxed mt-0.5">
                      Tutti i dati relativi al fatturato annuo e alla ripartizione del fatturato per categoria merceologica vengono determinati in tempo reale sulla base dei preventivi approvati ed effettivamente fatturati. Anche i dati sui rapporti di prova sono aggregati automaticamente a partire dai campioni registrati. La digitazione manuale delle annualità è stata rimossa per preservare l&apos;allineamento contabile.
                    </p>
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-3xs">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Fatturato LTV Totale</span>
                    <span className="text-xl font-black text-slate-850 block mt-1 font-sans">
                      € {(Object.values(computedFinancialData.fatturatoAnnuo) as number[]).reduce((sum: number, v: number) => sum + v, 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                      Aggregato storico complessivo di tutte le annualità contabili del cliente.
                    </p>
                  </div>

                  <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-3xs">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Rapporti di Prova Emessi</span>
                    <span className="text-xl font-black text-blue-600 block mt-1">
                      {computedFinancialData.totalReportsByYear.reduce((sum: number, item: { total: number }) => sum + item.total, 0)} rapporti
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                      Volume complessivo di rapporti di prova emessi per anno per questo cliente.
                    </p>
                  </div>

                  <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-3xs">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Canale Predominante</span>
                    <span className="text-xl font-black text-emerald-600 block mt-1 truncate">
                      {(() => {
                        let bestCat = 'Generale';
                        let maxVal = -1;
                        Object.entries(computedFinancialData.categorieFatturato).forEach(([cat, valObj]) => {
                          const tot = Object.values(valObj).reduce((s, v) => s + v, 0);
                          if (tot > maxVal) {
                            maxVal = tot;
                            bestCat = cat;
                          }
                        });
                        return bestCat;
                      })()}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                      Reparto del laboratorio chimico maggiormente coperto da questo intestatario.
                    </p>
                  </div>
                </div>

                {/* Grafici: Andamento Fatturato & Ripartizione Categoria */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Grafico 1: Trend Fatturato */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-400 tracking-wider uppercase border-b border-slate-100 pb-2 flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-blue-500" /> Variazione del Fatturato per Anno (€)
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-normal">
                        Rappresentazione storica di come varia il fatturato annuo globale del cliente.
                      </p>
                    </div>

                    <div className="h-64 w-full pt-2">
                      {computedFinancialData.totalByYear.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-150 rounded-xl">
                          Nessun dato finanziario consolidato per questo cliente.
                        </div>
                      ) : (
                        <RechartsResponsiveContainer width="100%" height="100%">
                          <RechartsLineChart data={computedFinancialData.totalByYear} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
                            <RechartsCartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <RechartsXAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                            <RechartsYAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => `€${val}`} />
                            <RechartsTooltip 
                              formatter={(value: any) => [`€ ${Number(value).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, 'Fatturato Annuo'] }
                              contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }}
                            />
                            <RechartsLine type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5, strokeWidth: 2 }} activeDot={{ r: 7 }} />
                          </RechartsLineChart>
                        </RechartsResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Grafico 2: Categoria per Anno */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-400 tracking-wider uppercase border-b border-slate-100 pb-2 flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4 text-purple-500" /> Fatturato per Categoria Merceologica per Anno (€)
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-normal">
                        Ripartizione annuale dettagliata del fatturato in base alla categoria associata ai flussi lavorati.
                      </p>
                    </div>

                    <div className="h-64 w-full pt-2">
                      {computedFinancialData.categoryByYear.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-150 rounded-xl">
                          Nessun record di spesa diviso per categorie merceologiche.
                        </div>
                      ) : (
                        <RechartsResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={computedFinancialData.categoryByYear} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
                            <RechartsCartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <RechartsXAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                            <RechartsYAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => `€${val}`} />
                            <RechartsTooltip 
                              formatter={(value: any, name: any) => [`€ ${Number(value).toLocaleString('it-IT')}`, name] }
                              contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }}
                            />
                            <RechartsLegend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                            {Array.from(new Set([
                              'Oli e Grassi', 'Vini ed Aceti', 'Cereali e Farine', 
                              'Allergeni e Tracce', 'Terreni e Acque rurale', 'Generale', 'Altro'
                            ])).map((cat) => {
                              const colors: Record<string, string> = {
                                'Oli e Grassi': '#f59e0b',
                                'Vini ed Aceti': '#84cc16',
                                'Cereali e Farine': '#06b6d4',
                                'Allergeni e Tracce': '#ec4899',
                                'Terreni e Acque rurale': '#10b981',
                                'Generale': '#6366f1',
                                'Altro': '#8b5cf6'
                              };
                              return (
                                <RechartsBar 
                                  key={cat} 
                                  dataKey={cat} 
                                  stackId="a" 
                                  fill={colors[cat] || '#64748b'} 
                                  radius={[2, 2, 0, 0]} 
                                />
                              );
                            })}
                          </RechartsBarChart>
                        </RechartsResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                {/* Grafici: Rapporti di Prova per Categoria & Trend Totale Rapporti */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Grafico 3: Rapporti per Categoria */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-400 tracking-wider uppercase border-b border-slate-100 pb-2 flex items-center gap-1.5">
                        <ClipboardList className="h-4 w-4 text-emerald-500" /> Rapporti di Prova Emessi per Categoria
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-normal">
                        Frequenza ed emissione dei certificati analitici annui suddivisi per reparto di riferimento.
                      </p>
                    </div>

                    <div className="h-64 w-full pt-2">
                      {computedFinancialData.reportsByCategoryAndYear.length === 0 || computedFinancialData.totalReportsByYear.reduce((s: number, x: { total: number }) => s + x.total, 0) === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-150 rounded-xl text-center p-4">
                          Nessun rapporto di prova registrato o emesso per conto del cliente. I campioni compariranno contestualmente alle accettazioni.
                        </div>
                      ) : (
                        <RechartsResponsiveContainer width="100%" height="100%">
                          <RechartsBarChart data={computedFinancialData.reportsByCategoryAndYear} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
                            <RechartsCartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <RechartsXAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                            <RechartsYAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => `${val}`} />
                            <RechartsTooltip 
                              formatter={(value: any, name: any) => [`${value} rapporti emessi`, name] }
                              contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }}
                            />
                            <RechartsLegend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                            {Array.from(new Set([
                              'Oli e Grassi', 'Vini ed Aceti', 'Cereali e Farine', 
                              'Allergeni e Tracce', 'Terreni e Acque rurale', 'Generale', 'Altro'
                            ])).map((cat) => {
                              const colors: Record<string, string> = {
                                'Oli e Grassi': '#f59e0b',
                                'Vini ed Aceti': '#84cc16',
                                'Cereali e Farine': '#06b6d4',
                                'Allergeni e Tracce': '#ec4899',
                                'Terreni e Acque rurale': '#10b981',
                                'Generale': '#6366f1',
                                'Altro': '#8b5cf6'
                              };
                              return (
                                <RechartsBar 
                                  key={cat} 
                                  dataKey={cat} 
                                  stackId="b" 
                                  fill={colors[cat] || '#475569'} 
                                  radius={[2, 2, 0, 0]} 
                                />
                              );
                            })}
                          </RechartsBarChart>
                        </RechartsResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Grafico 4: Trend Totale Rapporti */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                    <div>
                      <h3 className="font-extrabold text-xs text-slate-400 tracking-wider uppercase border-b border-slate-100 pb-2 flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-amber-500" /> Totale Assoluto Rapporti Emessi per Anno
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-normal">
                        Frequenza quantitativa e andamento cronologico dei rapporti di prova complessivi generati per il cliente.
                      </p>
                    </div>

                    <div className="h-64 w-full pt-2">
                      {computedFinancialData.totalReportsByYear.length === 0 || computedFinancialData.totalReportsByYear.reduce((s: number, x: { total: number }) => s + x.total, 0) === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-150 rounded-xl">
                          Nessun campione di prova censito per questo cliente.
                        </div>
                      ) : (
                        <RechartsResponsiveContainer width="100%" height="100%">
                          <RechartsLineChart data={computedFinancialData.totalReportsByYear} margin={{ top: 10, right: 10, left: -5, bottom: 5 }}>
                            <RechartsCartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <RechartsXAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                            <RechartsYAxis tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} tickFormatter={(val) => `${val}`} />
                            <RechartsTooltip 
                              formatter={(value: any) => [`${value} rapporti`, 'Totale Certificati'] }
                              contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }}
                            />
                            <RechartsLine type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, strokeWidth: 2 }} activeDot={{ r: 7 }} />
                          </RechartsLineChart>
                        </RechartsResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tabella di Sintesi Commerciale del Cliente */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-400 tracking-wider uppercase border-b border-slate-100 pb-2">
                      Prospetto Analitico delle Annualità Sincronizzate
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-normal">
                      Sintesi numerica dettagliata del fatturato complessivo d&apos;exercice e dei rapporti di prova rilasciati.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-150 text-slate-400 font-extrabold uppercase text-[9px] tracking-wider bg-slate-50">
                          <th className="py-2.5 px-3 rounded-l-lg">Anno d&apos;Esercizio</th>
                          <th className="py-2.5 px-3 text-right">Fatturato Sincronizzato (€)</th>
                          <th className="py-2.5 px-3 text-right">Certificati Emessi (RDP)</th>
                          <th className="py-2.5 px-3 rounded-r-lg">Quota Canali d&apos;Entrata</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {computedFinancialData.totalByYear
                          .slice()
                          .sort((a, b) => b.year.localeCompare(a.year))
                          .map((row) => {
                            const matchingReport = computedFinancialData.totalReportsByYear.find(x => x.year === row.year);
                            const rdpCount = matchingReport ? matchingReport.total : 0;
                            
                            // Costruzione stringa dettagliata dei canali per l'anno
                            const canaliString = Object.entries(computedFinancialData.categorieFatturato)
                              .map(([cat, yrObj]) => {
                                const val = yrObj[row.year] || 0;
                                if (val > 0) return `${cat}: €${Math.round(val).toLocaleString('it-IT')}`;
                                return null;
                              })
                              .filter(Boolean)
                              .join(' | ');

                            return (
                              <tr key={row.year} className="hover:bg-slate-50/50 transition duration-150">
                                <td className="py-3 px-3 font-bold text-slate-800">{row.year}</td>
                                <td className="py-3 px-3 text-right font-black text-slate-900 font-mono">
                                  € {row.total.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-3 px-3 text-right font-bold text-blue-600 font-mono">
                                  {rdpCount} rdp
                                </td>
                                <td className="py-3 px-3 text-slate-500 text-[10px] truncate max-w-xs sm:max-w-md">
                                  {canaliString || <span className="text-slate-350 italic">Nessun canale merceologico registrato</span>}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* 3. STORICO PREVENTIVI TAB */}
            {activeDetailTab === 'preventivi' && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div>
                  <h3 className="font-extrabold text-xs text-slate-400 tracking-wider uppercase border-b border-slate-100 pb-2">
                    Storico Documenti & Preventivi Collegati
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Consultazione dinamica di tutti i preventivi contabili elaborati per {selectedClient.denominazione} sul gestionale.
                  </p>
                </div>

                {preventivi.filter(p => p.clienteId === selectedClient.id).length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                    <ClipboardList className="h-8 w-8 text-slate-300 mx-auto" />
                    <div>Nessun preventivo associato a questo cliente nelle sessioni attuali.</div>
                    <p className="text-[10px] text-slate-400 block max-w-sm mx-auto">
                      Puoi emettere un preventivo con prove singole o pacchetti accreditati accedendo all&apos;apposita area &quot;Preventivi&quot;.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-3">Codice</th>
                          <th className="py-2.5 px-3">Data Creazione</th>
                          <th className="py-2.5 px-3">Prove incluse</th>
                          <th className="py-2.5 px-3">Valore Totale</th>
                          <th className="py-2.5 px-3 text-center">Stato</th>
                          <th className="py-2.5 px-3 text-center">Azioni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {preventivi
                          .filter(p => p.clienteId === selectedClient.id)
                          .map((prev) => {
                            const isExpanded = expandedQuoteId === prev.id;
                            const totVoci = prev.proveSelezionate.length + prev.pacchettiSelezionati.length;
                            return (
                              <React.Fragment key={prev.id}>
                                <tr className="hover:bg-slate-50/50 font-medium text-slate-700 transition duration-150">
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
                                  <td className="py-3 px-3 text-slate-500 font-mono">{prev.dataCreazione}</td>
                                  <td className="py-3 px-3 font-semibold text-slate-600">
                                    {totVoci} {totVoci === 1 ? 'prova del tariffario' : 'prove del tariffario'}
                                  </td>
                                  <td className="py-3 px-3 font-bold text-slate-850 font-mono">
                                    €{prev.totale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                                    {prev.scontoPercentuale && prev.scontoPercentuale > 0 ? (
                                      <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-100 ml-1.5 inline-block">
                                        -{prev.scontoPercentuale}%
                                      </span>
                                    ) : null}
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-3xs uppercase tracking-wide border ${
                                      prev.stato === 'Approvato' 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                        : prev.stato === 'Rifiutato'
                                        ? 'bg-red-50 text-red-700 border-red-100'
                                        : 'bg-amber-50 text-amber-700 border-amber-100'
                                    }`}>
                                      {prev.stato}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <button
                                      onClick={() => setExpandedQuoteId(isExpanded ? null : prev.id)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-lg border border-slate-200 transition text-[10.5px] font-bold cursor-pointer"
                                      title="Espandi o contrai la scheda delle specifiche del preventivo"
                                    >
                                      {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                      {isExpanded ? 'Chiudi' : 'Voci'}
                                    </button>
                                  </td>
                                </tr>

                                {/* Box Dettagli Spiegati */}
                                {isExpanded && (
                                  <tr className="bg-slate-50/40">
                                    <td colSpan={6} className="p-4 border-b border-slate-100">
                                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs space-y-4 text-xs animate-fadeIn">
                                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                          <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                                            <FileText className="h-4 w-4 text-slate-500" /> Articoli inclusi nel preventivo {prev.codice}
                                          </span>
                                          {prev.nascondiPrezziSingoli && prev.proveSelezionate.length > 1 && (
                                            <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-150 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-3xs">
                                              <EyeOff className="h-3 w-3" /> Prezzi singoli delle prove nascosti
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
                                                      {!(prev.nascondiPrezziSingoli && prev.proveSelezionate.length > 1) && (
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
                                                        <tr key={item.provaId} className="text-slate-650 hover:bg-slate-50/20">
                                                          <td className="py-1.5 px-3 font-semibold text-slate-800">{info?.nome || 'Parametro Chimico'}</td>
                                                          <td className="py-1.5 px-3 text-slate-400 font-mono text-[9px]">{info?.metodoAnalitico || 'Generale'}</td>
                                                          <td className="py-1.5 px-3 text-center font-bold text-slate-705">{item.quantita}</td>
                                                          {!(prev.nascondiPrezziSingoli && prev.proveSelezionate.length > 1) && (
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
                                                    <tr className="bg-slate-50 border-b border-slate-150/70 font-bold text-purple-705">
                                                      <th className="py-2 px-3">Pacchetto Commerciale</th>
                                                      <th className="py-2 px-3 text-center">Quantità ordinata</th>
                                                      <th className="py-2 px-3 text-right">Tariffa Standard</th>
                                                      <th className="py-2 px-3 text-right">Prezzo Netto</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-slate-100">
                                                    {prev.pacchettiSelezionati.map(item => {
                                                      const info = getPacchettoInfo(item.pacchettoId);
                                                      return (
                                                        <tr key={item.pacchettoId} className="text-slate-650 hover:bg-slate-50/20">
                                                          <td className="py-1.5 px-3 font-semibold text-slate-850">{info?.nome || 'Pacchetto Speciale'}</td>
                                                          <td className="py-1.5 px-3 text-center font-bold text-slate-705">{item.quantita}</td>
                                                          <td className="py-1.5 px-3 text-right font-mono text-slate-500">€{item.prezzoApplicato.toFixed(2)}</td>
                                                          <td className="py-1.5 px-3 text-right font-mono font-bold text-purple-700">€{(item.quantita * item.prezzoApplicato).toFixed(2)}</td>
                                                        </tr>
                                                      );
                                                    })}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {/* Note di preventivo */}
                                        {prev.note && (
                                          <div className="py-2 px-3 bg-slate-50 border border-slate-150 rounded-lg text-slate-500 font-medium">
                                            <span className="font-bold text-slate-600 block uppercase text-[8.5px] tracking-wider mb-0.5">Note commerciali preventivatore:</span>
                                            <p className="leading-relaxed text-[11px] italic">"{prev.note}"</p>
                                          </div>
                                        )}

                                        {/* Totali Riassunti */}
                                        <div className="pt-2 border-t border-slate-150 flex flex-col items-end space-y-1">
                                          {prev.scontoPercentuale && prev.scontoPercentuale > 0 ? (
                                            <>
                                              <div className="text-slate-500 font-medium text-[10.5px]">
                                                Imponibile Lordo: <span className="font-mono font-bold text-slate-700 ml-1">€{(prev.totale / (1 - prev.scontoPercentuale / 100)).toFixed(2)}</span>
                                              </div>
                                              <div className="text-rose-600 font-bold text-[10.5px] bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                                Sconto Applicato ({prev.scontoPercentuale}%): <span className="font-mono ml-1">-€{((prev.totale / (1 - prev.scontoPercentuale / 100)) - prev.totale).toFixed(2)}</span>
                                              </div>
                                            </>
                                          ) : null}
                                          <div className="bg-slate-50 border border-slate-150 rounded-lg px-3 py-1.5 flex items-baseline gap-2 mt-1 shadow-2xs">
                                            <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider">Totale Netto:</span>
                                            <span className="text-sm font-black text-slate-900 font-mono">€{prev.totale.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </motion.div>
        )}

        {/* 3) VIEW MODE: ADD NEW CLIENT */}
        {viewMode === 'add' && (
          <motion.div
            key="add"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs h-full">
              {/* Header registrazione */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <div>
                  <button
                    onClick={() => {
                      setViewMode(isEditMode ? 'detail' : 'archive');
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1.5 transition mb-1 cursor-pointer focus:outline-none"
                  >
                    <ArrowLeft className="h-4 w-4" /> {isEditMode ? "Torna al Dettaglio" : "Torna all'Archivio Clienti"}
                  </button>
                  <h3 className="font-extrabold text-lg text-slate-800 tracking-tight mt-1">
                    {isEditMode ? `Modifica Profilo: ${denominazione}` : 'Registrazione Nuovo Account & Fatturati Chimici'}
                  </h3>
                </div>
                
                <button
                  type="button"
                  onClick={() => setViewMode('archive')}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold py-1 px-3 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Annulla
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                
                {formError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-150 rounded-xl text-xs font-semibold text-rose-700 animate-fadeIn flex items-center gap-2">
                    <span className="font-extrabold text-sm">&bull;</span>
                    <span>{formError}</span>
                  </div>
                )}
                
                {/* Dati Aziendali */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">
                    Dati Societari Principali
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Denominazione / Ragione Sociale *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="es. AgriLab S.r.l."
                        value={denominazione}
                        onChange={(e) => setDenominazione(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-slate-250 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Partita IVA (11 cifre)
                      </label>
                      <input
                        type="text"
                        placeholder="es. 01234567890"
                        value={partitaIva}
                        onChange={(e) => setPartitaIva(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-slate-250 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Referente details (Nome e Cognome richiesti dal cliente) */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">
                    Riferimento Referente (Nome e Cognome)
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Nome Referente / Titolare
                      </label>
                      <input
                        type="text"
                        placeholder="es. Mario"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-slate-250 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Cognome Referente / Titolare
                      </label>
                      <input
                        type="text"
                        placeholder="es. Rossi"
                        value={cognome}
                        onChange={(e) => setCognome(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-slate-250 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Contatti */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">
                    Recapiti di Contatto
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Email di Contatto *
                      </label>
                      <input
                        type="email"
                        placeholder="es. qualita@azienda.it"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-slate-250 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Indirizzo PEC (Posta Certificata)
                      </label>
                      <input
                        type="email"
                        placeholder="es. azienda@legalmail.it"
                        value={pec}
                        onChange={(e) => setPec(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-slate-250 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Telefono / Mobile *
                      </label>
                      <input
                        type="text"
                        placeholder="es. +39 051-123456"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-slate-250 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Indirizzo Sede Legale/Operativa *
                      </label>
                      <input
                        type="text"
                        placeholder="es. Via dell'Artigianato 10"
                        value={indirizzo}
                        onChange={(e) => setIndirizzo(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-slate-250 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                        Comune (provincia) *
                      </label>
                      <input
                        type="text"
                        placeholder="es. Imola (BO)"
                        value={comune}
                        onChange={(e) => setComune(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-slate-250 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                  {/* Informativa Automazione Fatturati Sincronizzati */}
                  <div className="bg-emerald-50/60 border border-emerald-150 p-4 rounded-xl flex items-start gap-2.5">
                    <span className="text-emerald-600 text-base">📊</span>
                    <div>
                      <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                        Aggiornamento Fatturato Automatico Attivo
                      </h4>
                      <p className="text-[10.5px] text-emerald-650 mt-0.5 leading-relaxed font-semibold">
                        L&apos;andamento del fatturato annuale, la mappatura merceologica e i certificati analitici emessi vengono aggiornati in tempo reale per questo cliente in base ai flussi contabili e di laboratorio. Non occorre compilare o registrare le annualità manualmente.
                      </p>
                    </div>
                  </div>

                {/* Note */}
                <div className="bg-amber-50/20 p-4 rounded-xl border border-amber-200/50 space-y-2.5">
                  <label className="block text-xs font-black text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span className="text-sm">📝</span> d) Note Commerciali ed Accordi di Vendita
                  </label>
                  <p className="text-[10.5px] text-amber-700/90 leading-relaxed">
                    Usa questo spazio per specificare sconti accordati, listini dedicati concordati con il titolare, esenzioni particolari, contatti di fatturazione specifici o dettagli contrattuali da ricordare al momento di emettere un preventivo nell&apos;archivio.
                  </p>
                  <textarea
                    rows={3}
                    placeholder="Esempio: Applicare 15% di sconto sul pacchetto Vini. Spedire preventivi sempre con copia a amministrazione@... Scadenza pagamenti a 60 giorni d.f."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-amber-250 bg-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder-slate-400"
                  ></textarea>
                </div>

                 {/* Buttons submit */}
                 <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                   <button
                     type="button"
                     onClick={() => setViewMode(isEditMode ? 'detail' : 'archive')}
                     className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm transition hover:bg-slate-50 font-semibold cursor-pointer"
                   >
                     Annulla
                   </button>
                   <button
                     type="submit"
                     className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow cursor-pointer"
                     id="submit-new-client"
                   >
                     {isEditMode ? 'Salva Modifiche' : "Registra ed Aggiungi all'Archivio"}
                   </button>
                 </div>
              </form>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
