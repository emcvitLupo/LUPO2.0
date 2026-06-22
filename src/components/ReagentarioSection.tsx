import React, { useState, useMemo } from 'react';
import { Reagente, ReagenteRitirato } from '../types';
import { Plus, Search, AlertTriangle, CheckCircle, Flame, ShieldAlert, Archive, Trash2, Edit, Calendar, Info, RefreshCw, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReagentarioSectionProps {
  reagenti: Reagente[];
  onAddReagente: (newReagente: Reagente) => void;
  onDeleteReagente: (id: string) => void;
  onUpdateReagente: (updatedReagente: Reagente) => void;
  reagentiRitirati: ReagenteRitirato[];
  setReagentiRitirati: React.Dispatch<React.SetStateAction<ReagenteRitirato[]>>;
}

export function ReagentarioSection({
  reagenti,
  onAddReagente,
  onDeleteReagente,
  onUpdateReagente,
  reagentiRitirati,
  setReagentiRitirati
}: ReagentarioSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sottoScorta' | 'scaduti'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [reagDeletingId, setReagDeletingId] = useState<string | null>(null);

  // States per NUOVO / MODIFICA REAGENTE
  const [nome, setNome] = useState('');
  const [formula, setFormula] = useState('');
  const [marca, setMarca] = useState('');
  const [codice, setCodice] = useState('');
  const [lotto, setLotto] = useState('');
  const [scadenza, setScadenza] = useState('');
  const [quantita, setQuantita] = useState('');
  const [unita, setUnita] = useState('ml');
  const [collocazione, setCollocazione] = useState('');
  const [soglia, setSoglia] = useState('');
  const [costo, setCosto] = useState('');
  const [annoAcquisto, setAnnoAcquisto] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Editing state
  const [editingReagente, setEditingReagente] = useState<Reagente | null>(null);

  // Per il rabbocco o consumo rapido di un reagente esistente
  const [adjustQtyId, setAdjustQtyId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');

  // Selettore della vista: 'attivo' = Inventario Attivo, 'storico' = Storico Reagenti Ritirati
  const [currentView, setCurrentView] = useState<'attivo' | 'storico'>('attivo');

  // States per RITIRO REAGENTE
  const [retiringReagente, setRetiringReagente] = useState<Reagente | null>(null);
  const [retireQty, setRetireQty] = useState('');
  const [retireYear, setRetireYear] = useState(new Date().getFullYear().toString());
  const [retireMotivo, setRetireMotivo] = useState('Consumato');
  const [retireCosto, setRetireCosto] = useState('');

  // States per MODIFICA RECORD RITIRATO
  const [editingRetirato, setEditingRetirato] = useState<ReagenteRitirato | null>(null);
  const [editRetireQty, setEditRetireQty] = useState('');
  const [editRetireYear, setEditRetireYear] = useState('');
  const [editRetireMotivo, setEditRetireMotivo] = useState('Consumato');
  const [editRetireCosto, setEditRetireCosto] = useState('');

  const today = new Date();

  // Helper per controllare lo stato di allerta
  const getReagenteStatus = (r: Reagente) => {
    const sottoScorta = r.quantitaDisponibile <= r.livelloSottoScorta;
    
    const expDate = new Date(r.dataScadenza);
    const timeDiff = expDate.getTime() - today.getTime();
    const daysToExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    const scaduto = daysToExpiry <= 0;
    const inScadenza = daysToExpiry > 0 && daysToExpiry <= 30;

    return {
      sottoScorta,
      scaduto,
      inScadenza,
      daysToExpiry
    };
  };

  // Start Editing Flow
  const handleStartEdit = (reag: Reagente) => {
    setEditingReagente(reag);
    setShowAddForm(false);
    setNome(reag.nome);
    setFormula(reag.formulaChimica || '');
    setMarca(reag.marcaProduttore || '');
    setCodice(reag.codiceProdotto || '');
    setLotto(reag.lotto || '');
    setScadenza(reag.dataScadenza || '');
    setQuantita(reag.quantitaDisponibile.toString());
    setUnita(reag.unitaMisura || 'ml');
    setCollocazione(reag.collocazione || '');
    setSoglia(reag.livelloSottoScorta.toString());
    setCosto(reag.costo !== undefined ? reag.costo.toString() : '');
    setAnnoAcquisto(reag.annoAcquisto !== undefined ? reag.annoAcquisto.toString() : new Date().getFullYear().toString());
    setFormError(null);
  };

  // Filtraggio dei reagenti
  const filteredReagenti = reagenti.filter(r => {
    const matchesSearch = r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.formulaChimica.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.collocazione.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.marcaProduttore.toLowerCase().includes(searchTerm.toLowerCase());
    
    const status = getReagenteStatus(r);

    if (filterType === 'sottoScorta') {
      return matchesSearch && status.sottoScorta;
    }
    if (filterType === 'scaduti') {
      return matchesSearch && (status.scaduto || status.inScadenza);
    }
    return matchesSearch;
  });

  // Statistiche e aggregati sui reagenti ritirati (per anno e totali)
  const retiredStats = useMemo(() => {
    const stats: {
      totalCost: number;
      byYear: Record<number, number>;
      byMotivo: Record<string, number>;
      totalCount: number;
    } = {
      totalCost: 0,
      byYear: {},
      byMotivo: {},
      totalCount: reagentiRitirati.length
    };

    reagentiRitirati.forEach(rr => {
      const cost = rr.costoRitirato || 0;
      stats.totalCost += cost;
      
      const yr = rr.annoRitiro;
      stats.byYear[yr] = (stats.byYear[yr] || 0) + cost;

      const m = rr.motivo || 'Consumato';
      stats.byMotivo[m] = (stats.byMotivo[m] || 0) + 1;
    });

    return stats;
  }, [reagentiRitirati]);

  // Filtraggio dello storico dei ritirati per termine di ricerca
  const filteredRitirati = useMemo(() => {
    return reagentiRitirati.filter(rr => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        rr.nome.toLowerCase().includes(term) ||
        (rr.formulaChimica && rr.formulaChimica.toLowerCase().includes(term)) ||
        (rr.marcaProduttore && rr.marcaProduttore.toLowerCase().includes(term)) ||
        (rr.lotto && rr.lotto.toLowerCase().includes(term)) ||
        (rr.motivo && rr.motivo.toLowerCase().includes(term)) ||
        rr.annoRitiro.toString().includes(term)
      );
    });
  }, [reagentiRitirati, searchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const nomeClean = nome.trim();
    if (!nomeClean) {
      setFormError("Il Nome Commerciale Reagente è obbligatorio.");
      return;
    }

    const qVal = parseFloat(quantita);
    if (isNaN(qVal) || qVal < 0) {
      setFormError("La quantità disponibile deve essere un valore numerico positivo o uguale a zero.");
      return;
    }

    const sVal = soglia ? parseFloat(soglia) : 100;
    if (soglia && (isNaN(sVal) || sVal < 0)) {
      setFormError("Il livello di sotto scorta deve essere un valore numerico positivo o uguale a zero.");
      return;
    }

    const cVal = costo ? parseFloat(costo) : 0;
    if (costo && (isNaN(cVal) || cVal < 0)) {
      setFormError("Il costo di acquisto deve essere un valore numerico di Euro positivo.");
      return;
    }

    const yVal = annoAcquisto ? parseInt(annoAcquisto) : new Date().getFullYear();
    if (annoAcquisto && (isNaN(yVal) || yVal < 1900 || yVal > 2100)) {
      setFormError("L'anno di acquisto inserito non è valido (es. 2026).");
      return;
    }

    const newReag: Reagente = {
      id: 'r_' + Date.now(),
      nome: nomeClean,
      formulaChimica: formula.trim(),
      marcaProduttore: marca.trim() || 'Generico',
      codiceProdotto: codice.trim() || 'N/A',
      lotto: lotto.trim() || 'N/A',
      dataScadenza: scadenza || new Date(today.getFullYear() + 2, today.getMonth(), today.getDate()).toISOString().split('T')[0],
      quantitaDisponibile: qVal,
      unitaMisura: unita,
      collocazione: collocazione.trim() || 'Scaffale Standard',
      livelloSottoScorta: sVal,
      costo: cVal,
      annoAcquisto: yVal
    };

    onAddReagente(newReag);

    // Reset Form
    setNome('');
    setFormula('');
    setMarca('');
    setCodice('');
    setLotto('');
    setScadenza('');
    setQuantita('');
    setUnita('ml');
    setCollocazione('');
    setSoglia('');
    setCosto('');
    setAnnoAcquisto('');
    setFormError(null);
    setShowAddForm(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReagente) return;
    setFormError(null);

    const nomeClean = nome.trim();
    if (!nomeClean) {
      setFormError("Il Nome Commerciale Reagente è obbligatorio.");
      return;
    }

    const qVal = parseFloat(quantita);
    if (isNaN(qVal) || qVal < 0) {
      setFormError("La quantità disponibile deve essere un valore numerico positivo o uguale a zero.");
      return;
    }

    const sVal = soglia ? parseFloat(soglia) : 100;
    if (soglia && (isNaN(sVal) || sVal < 0)) {
      setFormError("Il livello di sotto scorta deve essere un valore numerico positivo o uguale a zero.");
      return;
    }

    const cVal = costo ? parseFloat(costo) : 0;
    if (costo && (isNaN(cVal) || cVal < 0)) {
      setFormError("Il costo di acquisto deve essere un valore numerico di Euro positivo o uguale a zero.");
      return;
    }

    const yVal = annoAcquisto ? parseInt(annoAcquisto) : new Date().getFullYear();
    if (annoAcquisto && (isNaN(yVal) || yVal < 1900 || yVal > 2100)) {
      setFormError("L'anno di acquisto inserito non è valido (es. 2026).");
      return;
    }

    const updatedReag: Reagente = {
      ...editingReagente,
      nome: nomeClean,
      formulaChimica: formula.trim(),
      marcaProduttore: marca.trim() || 'Generico',
      codiceProdotto: codice.trim() || 'N/A',
      lotto: lotto.trim() || 'N/A',
      dataScadenza: scadenza || new Date(today.getFullYear() + 2, today.getMonth(), today.getDate()).toISOString().split('T')[0],
      quantitaDisponibile: qVal,
      unitaMisura: unita,
      collocazione: collocazione.trim() || 'Scaffale Standard',
      livelloSottoScorta: sVal,
      costo: cVal,
      annoAcquisto: yVal
    };

    onUpdateReagente(updatedReag);

    // Reset Form & Exit Edit
    setEditingReagente(null);
    setNome('');
    setFormula('');
    setMarca('');
    setCodice('');
    setLotto('');
    setScadenza('');
    setQuantita('');
    setUnita('ml');
    setCollocazione('');
    setSoglia('');
    setCosto('');
    setAnnoAcquisto('');
    setFormError(null);
  };

  // Funzione per aggiornare la quantità disponibile (rabbocco/consumo)
  const handleAdjustQuantity = (id: string, isRefill: boolean) => {
    const current = reagenti.find(r => r.id === id);
    if (!current || !adjustAmount) return;

    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newQty = isRefill 
      ? current.quantitaDisponibile + amount 
      : Math.max(0, current.quantitaDisponibile - amount);

    onUpdateReagente({
      ...current,
      quantitaDisponibile: newQty
    });

    setAdjustQtyId(null);
    setAdjustAmount('');
  };

  const handleStartRetire = (r: Reagente) => {
    setRetiringReagente(r);
    // Suggest retiring entire remaining active quantity
    setRetireQty(r.quantitaDisponibile.toString());
    setRetireYear(new Date().getFullYear().toString());
    setRetireMotivo('Consumato');
    // Default to the original total cost input or 0
    setRetireCosto((r.costo || 0).toString());
    setFormError(null);
    
    // Reset other sub-forms
    setEditingReagente(null);
    setShowAddForm(false);
  };

  const handleRetireSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!retiringReagente) return;

    const qtyToRetire = parseFloat(retireQty);
    if (isNaN(qtyToRetire) || qtyToRetire <= 0 || qtyToRetire > retiringReagente.quantitaDisponibile) {
      setFormError(`La quantità da ritirare deve essere superiore a 0 e non superiore alla giacenza attuale (${retiringReagente.quantitaDisponibile} ${retiringReagente.unitaMisura})`);
      return;
    }

    const yr = parseInt(retireYear);
    if (isNaN(yr) || yr < 1900 || yr > 2100) {
      setFormError('Inserire un anno di ritiro valido (es. 2026).');
      return;
    }

    const costRelative = parseFloat(retireCosto);
    if (isNaN(costRelative) || costRelative < 0) {
      setFormError('Inserire un costo del ritiro valido (espresso in €, es. 15.50).');
      return;
    }

    // 1. Create retired record
    const retiredRecord: ReagenteRitirato = {
      id: 'rr_' + Date.now(),
      reagenteId: retiringReagente.id,
      nome: retiringReagente.nome,
      formulaChimica: retiringReagente.formulaChimica,
      marcaProduttore: retiringReagente.marcaProduttore,
      lotto: retiringReagente.lotto,
      quantitaRitirata: qtyToRetire,
      unitaMisura: retiringReagente.unitaMisura,
      costoRitirato: costRelative,
      annoRitiro: yr,
      dataRitiro: new Date().toISOString().substring(0, 10),
      motivo: retireMotivo
    };

    // 2. Subtract from active stock or delete if depleted
    const remainingQty = parseFloat((retiringReagente.quantitaDisponibile - qtyToRetire).toFixed(4));
    if (remainingQty <= 0) {
      onDeleteReagente(retiringReagente.id);
    } else {
      onUpdateReagente({
        ...retiringReagente,
        quantitaDisponibile: remainingQty
      });
    }

    // 3. Save to retired list
    setReagentiRitirati(prev => [retiredRecord, ...prev]);

    // 4. Reset
    setRetiringReagente(null);
    setFormError(null);
  };

  const handleStartEditRetirato = (rr: ReagenteRitirato) => {
    setEditingRetirato(rr);
    setEditRetireQty(rr.quantitaRitirata.toString());
    setEditRetireYear(rr.annoRitiro.toString());
    setEditRetireMotivo(rr.motivo);
    setEditRetireCosto(rr.costoRitirato.toString());
    setFormError(null);
  };

  const handleEditRetiratoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRetirato) return;

    const qty = parseFloat(editRetireQty);
    if (isNaN(qty) || qty <= 0) {
      setFormError('La quantità ritirata deve essere superiore a 0.');
      return;
    }

    const yr = parseInt(editRetireYear);
    if (isNaN(yr) || yr < 1900 || yr > 2100) {
      setFormError('Inserire un anno di ritiro valido (es. 2026).');
      return;
    }

    const cost = parseFloat(editRetireCosto);
    if (isNaN(cost) || cost < 0) {
      setFormError('Inserire un costo valido.');
      return;
    }

    // Update retired array state
    setReagentiRitirati(prev => prev.map(rr => 
      rr.id === editingRetirato.id ? {
        ...rr,
        quantitaRitirata: qty,
        annoRitiro: yr,
        motivo: editRetireMotivo,
        costoRitirato: cost
      } : rr
    ));

    setEditingRetirato(null);
    setFormError(null);
  };

  const handleDeleteRetirato = (id: string) => {
    setReagentiRitirati(prev => prev.filter(rr => rr.id !== id));
  };

  return (
    <div className="space-y-6">
      
      {/* Testata di Controllo & Allarmi */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <Archive className="h-5.5 w-5.5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">
              Controllo Reagentario Chimico
            </h3>
            <p className="text-xs text-slate-400">Tracciamento della disponibilità, lotti, scadenze e alloggiamenti dei reagenti nel laboratorio</p>
          </div>
        </div>

        <button
          onClick={() => {
            setShowAddForm(true);
            setFormError(null);
            setNome('');
            setFormula('');
            setMarca('');
            setCodice('');
            setLotto('');
            setScadenza('');
            setQuantita('');
            setUnita('ml');
            setCollocazione('');
            setSoglia('');
          }}
          className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition"
          id="btn-show-add-reagente"
        >
          <Plus className="h-4 w-4" /> Registra / Carica Nuovo Reagente
        </button>
      </div>
      {/* Selettore Vista Principale: Inventario Attivo vs Storico Ritirati */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-250 self-start gap-1 max-w-md">
        <button
          onClick={() => {
            setCurrentView('attivo');
            setFormError(null);
          }}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            currentView === 'attivo'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
          }`}
        >
          <Layers className="h-3.5 w-3.5 text-sky-500" />
          Inventario Attivo ({reagenti.length})
        </button>
        <button
          onClick={() => {
            setCurrentView('storico');
            setFormError(null);
          }}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            currentView === 'storico'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
          }`}
          id="btn-view-storico-ritirati"
        >
          <Archive className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
          Storico Reagenti Ritirati ({reagentiRitirati.length})
        </button>
      </div>

      {currentView === 'attivo' ? (
        <>
          {/* Riquadro Filtri Orizzontali */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Ricerca testuale */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca reagente per nome chimico, formula (es. H2SO4), marca o collocazione..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800"
            id="input-search-reagents"
          />
        </div>

        {/* Tasti Filtro Stato */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              filterType === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600'
            }`}
          >
            Tutti i Reagenti
          </button>
          <button
            onClick={() => setFilterType('sottoScorta')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              filterType === 'sottoScorta'
                ? 'bg-amber-600 text-white'
                : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Sotto Scorta
          </button>
          <button
            onClick={() => setFilterType('scaduti')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              filterType === 'scaduti'
                ? 'bg-rose-600 text-white'
                : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Scaduti / In Scadenza
          </button>
        </div>
      </div>

      {/* Sezione Contenuto */}
      <AnimatePresence mode="wait">
        
        {/* FORM REGISTRAZIONE NUOVO REAGENTE */}
        {editingReagente ? (
          <motion.div
            key="edit-reagent"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white p-6 rounded-xl border border-blue-200 bg-blue-50/5 shadow-md max-w-3xl mx-auto text-xs"
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-blue-100">
              <h4 className="font-extrabold text-sm text-blue-800 flex items-center gap-1.5 font-sans uppercase tracking-wider">
                <Edit className="h-4 w-4" /> Modifica / Correggi Dati Reagente
              </h4>
              <button
                type="button"
                onClick={() => {
                  setEditingReagente(null);
                  setFormError(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                Annulla
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-150 rounded-xl text-xs font-semibold text-rose-700 animate-fadeIn flex items-center gap-2">
                  <span className="font-extrabold text-sm">&bull;</span>
                  <span>{formError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-600 font-bold uppercase mb-1">Nome Commerciale Reagente *</label>
                  <input
                    type="text"
                    required
                    placeholder="es. Aceto di Metile purissimo / Acido Cloridrico 37%"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Formula Chimica</label>
                  <input
                    type="text"
                    placeholder="es. HCl o C2H5OH"
                    value={formula}
                    onChange={(e) => setFormula(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Marca Produttore</label>
                  <input
                    type="text"
                    placeholder="es. Carlo Erba / Sigma-Aldrich"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Codice Prodotto Produttore</label>
                  <input
                    type="text"
                    placeholder="es. 410301"
                    value={codice}
                    onChange={(e) => setCodice(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Lotto di Produzione per Tracciabilità</label>
                  <input
                    type="text"
                    placeholder="es. L24115A"
                    value={lotto}
                    onChange={(e) => setLotto(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Quantità Disponibile *</label>
                  <input
                    type="number"
                    required
                    placeholder="es. 1000"
                    value={quantita}
                    onChange={(e) => setQuantita(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Unità di Misura *</label>
                  <select
                    value={unita}
                    onChange={(e) => setUnita(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                  >
                    <option value="ml">ml (Millilitri)</option>
                    <option value="g">g (Grammi)</option>
                    <option value="mg">mg (Milligrammi)</option>
                    <option value="confezioni">Confezioni / Flaconi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Livello di Sotto Scorta *</label>
                  <input
                    type="number"
                    required
                    placeholder="es. 250"
                    value={soglia}
                    onChange={(e) => setSoglia(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Data Scadenza *</label>
                  <input
                    type="date"
                    required
                    value={scadenza}
                    onChange={(e) => setScadenza(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Costo di Acquisto (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="es. 45.50"
                    value={costo}
                    onChange={(e) => setCosto(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Anno di Acquisto</label>
                  <input
                    type="number"
                    placeholder={`es. ${new Date().getFullYear()}`}
                    value={annoAcquisto}
                    onChange={(e) => setAnnoAcquisto(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Collocazione nel Laboratorio</label>
                  <input
                    type="text"
                    placeholder="es. Armadio Sicurezza Acidi - Ripiano 2"
                    value={collocazione}
                    onChange={(e) => setCollocazione(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingReagente(null);
                    setFormError(null);
                  }}
                  className="px-4 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Salva Modifiche Reagente
                </button>
              </div>
            </form>
          </motion.div>
        ) : showAddForm ? (
          <motion.div
            key="add-reagent"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-md max-w-3xl mx-auto text-xs"
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h4 className="font-extrabold text-sm text-slate-800 font-sans uppercase tracking-wider">Caricamento / Check-in Flacone Reagente</h4>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                Annulla
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-150 rounded-xl text-xs font-semibold text-rose-700 animate-fadeIn flex items-center gap-2">
                  <span className="font-extrabold text-sm">&bull;</span>
                  <span>{formError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-600 font-bold uppercase mb-1">Nome Commerciale Reagente *</label>
                  <input
                    type="text"
                    required
                    placeholder="es. Aceto di Metile purissimo / Acido Cloridrico 37%"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Formula Chimica</label>
                  <input
                    type="text"
                    placeholder="es. HCl o C2H5OH"
                    value={formula}
                    onChange={(e) => setFormula(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Marca Produttore</label>
                  <input
                    type="text"
                    placeholder="es. Carlo Erba / Sigma-Aldrich"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Codice Prodotto Produttore</label>
                  <input
                    type="text"
                    placeholder="es. 410301"
                    value={codice}
                    onChange={(e) => setCodice(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Lotto di Produzione per Tracciabilità</label>
                  <input
                    type="text"
                    placeholder="es. L24115A"
                    value={lotto}
                    onChange={(e) => setLotto(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Quantità Disponibile *</label>
                  <input
                    type="number"
                    required
                    placeholder="es. 1000"
                    value={quantita}
                    onChange={(e) => setQuantita(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Unità di Misura *</label>
                  <select
                    value={unita}
                    onChange={(e) => setUnita(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                  >
                    <option value="ml">ml (Millilitri)</option>
                    <option value="g">g (Grammi)</option>
                    <option value="mg">mg (Milligrammi)</option>
                    <option value="confezioni">Confezioni / Flaconi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Livello di Sotto Scorta *</label>
                  <input
                    type="number"
                    required
                    placeholder="es. 250"
                    value={soglia}
                    onChange={(e) => setSoglia(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Data Scadenza *</label>
                  <input
                    type="date"
                    required
                    value={scadenza}
                    onChange={(e) => setScadenza(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Costo di Acquisto (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="es. 45.50"
                    value={costo}
                    onChange={(e) => setCosto(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Anno di Acquisto</label>
                  <input
                    type="number"
                    placeholder={`es. ${new Date().getFullYear()}`}
                    value={annoAcquisto}
                    onChange={(e) => setAnnoAcquisto(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Collocazione nel Laboratorio</label>
                  <input
                    type="text"
                    placeholder="es. Armadio Sicurezza Acidi - Ripiano 2"
                    value={collocazione}
                    onChange={(e) => setCollocazione(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs cursor-pointer"
                >
                  Indietro
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  id="submit-new-reagente"
                >
                  Registra Reagente in Inventario
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* LISTA REAGENTI */
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredReagenti.length === 0 ? (
              <div className="col-span-3 text-center py-20 bg-white border border-slate-150 rounded-xl text-slate-400">
                Nessun reagente soddisfa i criteri di ricerca corrente.
              </div>
            ) : (
              filteredReagenti.map(reag => {
                const status = getReagenteStatus(reag);
                const isAdjusting = adjustQtyId === reag.id;

                return (
                  <div
                    key={reag.id}
                    className={`bg-white border rounded-xl p-5 shadow-sm hover:shadow transition flex flex-col justify-between ${
                      status.scaduto || status.inScadenza
                        ? 'border-red-200 bg-red-50/20 shadow-red-50/30'
                        : status.sottoScorta
                        ? 'border-amber-200 bg-amber-50/10'
                        : 'border-slate-100'
                    }`}
                  >
                    <div>
                      {/* Badge di Stato in alto */}
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          {status.scaduto ? (
                            <span className="text-[9px] font-extrabold text-red-700 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3" /> SCADUTO
                            </span>
                          ) : status.inScadenza ? (
                            <span className="text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                              <Flame className="h-3 w-3" /> INC. SCADENZA
                            </span>
                          ) : status.sottoScorta ? (
                            <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> SOTTO SCORTA
                            </span>
                          ) : (
                            <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> CONFORME / DISPONIBILE
                            </span>
                          )}
                        </div>

                        {/* Elimina */}
                        {reagDeletingId === reag.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-100 animate-fadeIn shrink-0">
                            <span className="text-[9px] font-bold text-rose-700 px-1">Cancellarlo?</span>
                            <button
                              onClick={() => {
                                onDeleteReagente(reag.id);
                                setReagDeletingId(null);
                              }}
                              className="bg-rose-600 text-white rounded px-1.5 py-0.5 text-[9px] font-bold cursor-pointer hover:bg-rose-700"
                            >
                              Sì
                            </button>
                            <button
                              onClick={() => setReagDeletingId(null)}
                              className="bg-white border border-slate-200 text-slate-500 rounded px-1.5 py-0.5 text-[9px] font-bold cursor-pointer hover:bg-slate-50"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleStartRetire(reag)}
                              className="text-slate-300 hover:text-emerald-500 transition p-1 cursor-pointer"
                              title="Ritira / Dismetti negli anni"
                              id={`btn-retire-reag-${reag.id}`}
                            >
                              <Archive className="h-3.5 w-3.5 text-emerald-500" />
                            </button>
                            <button
                              onClick={() => handleStartEdit(reag)}
                              className="text-slate-300 hover:text-blue-500 transition p-1 cursor-pointer"
                              title="Modifica Reagente"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setReagDeletingId(reag.id);
                              }}
                              className="text-slate-300 hover:text-red-500 transition p-1 cursor-pointer"
                              title="Elimina Reagente"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Info Reagente */}
                      <div className="mt-3">
                        <h4 className="font-extrabold text-slate-800 text-sm leading-tight">
                          {reag.nome}
                        </h4>
                        {reag.formulaChimica && (
                          <span className="font-mono text-xs font-bold text-slate-500 mt-1 block">
                            [{reag.formulaChimica}]
                          </span>
                        )}
                      </div>

                      {/* Griglia Dettaglio Tecnologico */}
                      <div className="mt-3.5 grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                        <div>
                          <strong className="text-slate-400 block tracking-wide uppercase text-[9px]">Produttore</strong>
                          <span>{reag.marcaProduttore}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400 block tracking-wide uppercase text-[9px]">Codice / Lotto</strong>
                          <span className="font-mono">{reag.codiceProdotto} / {reag.lotto}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400 block tracking-wide uppercase text-[9px]">Alloggiamento</strong>
                          <span>{reag.collocazione}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400 block tracking-wide uppercase text-[9px]">Scadenza</strong>
                          <span className={`font-mono font-semibold ${status.scaduto || status.inScadenza ? 'text-red-600' : 'text-slate-650'}`}>
                            {reag.dataScadenza}
                          </span>
                        </div>
                        <div>
                          <strong className="text-slate-400 block tracking-wide uppercase text-[9px]">Costo Acquisto</strong>
                          <span className="font-sans font-extrabold text-slate-700">
                            {reag.costo !== undefined ? `€ ${Number(reag.costo).toFixed(2)}` : '€ 0.00'}
                          </span>
                        </div>
                        <div>
                          <strong className="text-slate-400 block tracking-wide uppercase text-[9px]">Anno Acquisto</strong>
                          <span className="font-sans font-semibold text-slate-650">
                            {reag.annoAcquisto || 'N/D'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stato Quantita Quantometrico e Tasti di adeguamento veloce */}
                    <div className="mt-5 border-t border-slate-100 pt-3 flex flex-col gap-2 bg-slate-50/80 p-3 rounded-lg -mx-5 -mb-5 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 font-bold">Giacenza Disponibile:</span>
                        <span className={`text-sm font-extrabold ${status.sottoScorta ? 'text-amber-600' : 'text-slate-800'}`}>
                          {reag.quantitaDisponibile} {reag.unitaMisura}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 font-medium">
                        Soglia minima di attenzione: {reag.livelloSottoScorta} {reag.unitaMisura}
                      </div>

                      {/* Pulsanti consumo / rabbocco rapido */}
                      <div className="mt-1">
                        {isAdjusting ? (
                          <div className="flex gap-1">
                            <input
                              type="number"
                              required
                              placeholder="Qty"
                              value={adjustAmount}
                              onChange={(e) => setAdjustAmount(e.target.value)}
                              className="w-16 px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded text-center outline-none"
                            />
                            <button
                              onClick={() => handleAdjustQuantity(reag.id, true)}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold"
                            >
                              Carica
                            </button>
                            <button
                              onClick={() => handleAdjustQuantity(reag.id, false)}
                              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-850 text-white rounded text-[10px] font-bold"
                            >
                              Consuma
                            </button>
                            <button
                              onClick={() => setAdjustQtyId(null)}
                              className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px]"
                            >
                              Annulla
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAdjustQtyId(reag.id); setAdjustAmount(''); }}
                            className="w-full text-center py-1 bg-white border border-slate-250 hover:bg-slate-100 text-[10px] font-bold text-slate-700 rounded transition"
                          >
                            Aggiorna Stock / Rabbocca o Consuma
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </motion.div>
        )}

      </AnimatePresence>
        </>
      ) : (
        <div className="space-y-6">
          {/* 1. SEZIONE MODIFICA RECORD RITIRATO (se attivo) */}
          {editingRetirato && (
            <motion.div
              key="edit-retired-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white p-6 rounded-xl border border-blue-200 bg-blue-50/5 shadow-md max-w-3xl mx-auto text-xs space-y-4"
            >
              <div className="flex justify-between items-center pb-2 border-b border-blue-150">
                <h4 className="font-extrabold text-sm text-blue-800 flex items-center gap-1.5 font-sans uppercase tracking-wider">
                  <Edit className="h-4 w-4" /> Correggi Dati Record Ritirato / Storico
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setEditingRetirato(null);
                    setFormError(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer font-sans"
                >
                  Annulla
                </button>
              </div>

              <form onSubmit={handleEditRetiratoSubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-xs font-semibold text-rose-700 animate-fadeIn flex items-center gap-2">
                    <span className="font-extrabold text-sm">&bull;</span>
                    <span>{formError}</span>
                  </div>
                )}

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-700 font-semibold text-xs leading-none">
                  Modifica inserimento retroattivo per: <strong>{editingRetirato.nome}</strong> [Lotto: {editingRetirato.lotto || 'N/D'}]
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-slate-600 font-bold uppercase mb-1">
                      Quantità Ritirata ({editingRetirato.unitaMisura}) *
                    </label>
                    <input
                      type="number"
                      required
                      step="any"
                      value={editRetireQty}
                      onChange={(e) => setEditRetireQty(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold uppercase mb-1">
                      Anno di Ritiro *
                    </label>
                    <input
                      type="number"
                      required
                      min="1900"
                      max="2100"
                      value={editRetireYear}
                      onChange={(e) => setEditRetireYear(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold uppercase mb-1">
                      Valore Economico Ritiro (€) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={editRetireCosto}
                      onChange={(e) => setEditRetireCosto(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-sans font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold uppercase mb-1">
                      Motivo del Ritiro *
                    </label>
                    <select
                      value={editRetireMotivo}
                      onChange={(e) => setEditRetireMotivo(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs text-slate-800"
                    >
                      <option value="Consumato">Consumato per Analisi</option>
                      <option value="Scaduto">Scaduto / Smaltito</option>
                      <option value="Danneggiato">Danneggiato / Contaminato</option>
                      <option value="Ritirato">Ritirato dal Commercio</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRetirato(null);
                      setFormError(null);
                    }}
                    className="px-4 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs cursor-pointer font-semibold"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Salva Correzione Storico
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* 2. RIEPILOGO COSTI RITIRATI PER ANNO */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card Costo Totale Storico */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block mb-1">
                  Valore Totale Reagenti Dismessi
                </span>
                <h4 className="text-2xl font-extrabold text-slate-800 font-sans">
                  € {retiredStats.totalCost.toFixed(2)}
                </h4>
              </div>
              <div className="mt-4 text-xs text-slate-500 bg-slate-50 p-2.5 border border-slate-100 rounded-lg flex items-center gap-1.5">
                <Info className="h-4 w-4 text-sky-500 shrink-0" />
                <span>
                  Valore complessivo calcolato su <strong>{retiredStats.totalCount}</strong> lotti / prelievi d'inventario archiviati negli anni.
                </span>
              </div>
            </div>

            {/* Card Ripartizione Costo per Anno */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs md:col-span-2">
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block mb-2.5">
                Valore Economico Dismesso o Consumato per Anno di Esercizio
              </span>
              
              {Object.keys(retiredStats.byYear).length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-medium">
                  Nessun prelievo o dismissione stoccata storicamente.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {Object.entries(retiredStats.byYear)
                    .sort((a, b) => Number(b[0]) - Number(a[0]))
                    .map(([year, cost]) => (
                      <div key={year} className="bg-slate-50 border border-slate-100 p-3 rounded-lg flex flex-col justify-between">
                        <div className="flex items-center gap-1 text-slate-500 font-bold text-xs">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>Anno {year}</span>
                        </div>
                        <span className="text-md font-extrabold text-slate-800 block mt-2 text-indigo-600">
                          € {(cost as number).toFixed(2)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. FILTRO & LISTA COMPLETA RIGHE RITIRATE */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wide">
                  Registro Storico dei Reagenti Ritiranti negli Anni
                </h4>
                <p className="text-[10px] text-slate-400">Inserimenti storici retrospettivi dei reagenti scaricati dal magazzino negli anni passati</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cerca per nome, lotto, formula o motivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 px-3 text-xs bg-white border border-slate-250 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-800"
                />
              </div>
            </div>

            {filteredRitirati.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                Nessun record di dismissione corrisponde ai parametri cercati.
              </div>
            ) : (
              <div className="overflow-x-auto text-[11px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/60 text-[9px] uppercase font-bold text-slate-500 border-b border-slate-200">
                      <th className="p-3">Data & Anno</th>
                      <th className="p-3">Nome Commerciale</th>
                      <th className="p-3">Dettagli Chimici</th>
                      <th className="p-3">Quantità Dismessa</th>
                      <th className="p-3 text-right">Costo Relativo</th>
                      <th className="p-3">Motivazione</th>
                      <th className="p-3 text-center">Azioni Correzione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 text-slate-700">
                    {filteredRitirati.map(rr => (
                      <tr key={rr.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-mono text-[10px] text-slate-550 block">{rr.dataRitiro}</span>
                          <span className="inline-block bg-slate-200 text-slate-800 rounded px-1.5 py-0.5 text-[9px] font-bold mt-0.5">
                            Anno {rr.annoRitiro}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {rr.nome}
                          {rr.lotto && (
                            <span className="block font-mono text-[9px] text-slate-400 font-normal">Lotto: {rr.lotto}</span>
                          )}
                        </td>
                        <td className="p-3">
                          {rr.formulaChimica && (
                            <span className="font-mono text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded leading-none">
                              {rr.formulaChimica}
                            </span>
                          )}
                          {rr.marcaProduttore && (
                            <span className="block text-[9px] text-slate-400 mt-1">{rr.marcaProduttore}</span>
                          )}
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          {rr.quantitaRitirata} {rr.unitaMisura}
                        </td>
                        <td className="p-3 font-extrabold text-slate-800 text-right whitespace-nowrap">
                          € {(rr.costoRitirato || 0).toFixed(2)}
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            rr.motivo === 'Consumato'
                              ? 'bg-emerald-150 text-emerald-800'
                              : rr.motivo === 'Scaduto'
                              ? 'bg-amber-150 text-amber-800'
                              : rr.motivo === 'Danneggiato'
                              ? 'bg-rose-150 text-rose-800'
                              : 'bg-slate-150 text-slate-800'
                          }`}>
                            {rr.motivo}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleStartEditRetirato(rr)}
                              className="text-blue-600 hover:text-blue-800 transition p-1 hover:bg-blue-50 rounded"
                              title="Modifica / Correggi Record"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Rimuovere questo record di ritiro dallo storico? (Attenzione: questa azione correggerà solo il registro e non ripristinerà la quantità in inventario)`)) {
                                  handleDeleteRetirato(rr.id);
                                }
                              }}
                              className="text-rose-600 hover:text-rose-800 transition p-1 hover:bg-rose-50 rounded"
                              title="Elimina Record dallo Storico"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
