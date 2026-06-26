import React, { useState, useEffect } from 'react';
import { Prova, LimiteRiferimento } from '../types';
import { Plus, Search, HelpCircle, Tag, Layers, Trash2, Pencil, ChevronDown, TrendingUp, Info, Check, X, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface ProveSectionProps {
  prove: Prova[];
  onAddProva: (newProva: Prova) => void;
  onDeleteProva: (id: string) => void;
  onUpdateProva: (updatedProva: Prova) => void;
  selectedProvaId?: string | null;
  onClearSelectedProvaId?: () => void;
  currentUser?: any;
  userRole?: 'admin' | 'utente' | null;
}

export function calculateLinearRegression(punti: Array<{ concentrazione: number; incertezza: number }>) {
  if (punti.length < 2) return null;

  const n = punti.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (const pt of punti) {
    sumX += pt.concentrazione;
    sumY += pt.incertezza;
    sumXY += pt.concentrazione * pt.incertezza;
    sumXX += pt.concentrazione * pt.concentrazione;
    sumYY += pt.incertezza * pt.incertezza;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return null;
  }

  const m = (n * sumXY - sumX * sumY) / denominator;
  const q = (sumY - m * sumX) / n;

  // Calcolo R^2
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;

  for (const pt of punti) {
    const yEst = m * pt.concentrazione + q;
    ssTot += Math.pow(pt.incertezza - meanY, 2);
    ssRes += Math.pow(pt.incertezza - yEst, 2);
  }

  const r2 = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);

  return { m, q, r2 };
}

export function calculateLinearRegressionRipetibilita(punti: Array<{ concentrazione: number; ripetibilita: number }>) {
  if (punti.length < 2) return null;

  const n = punti.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  let sumYY = 0;

  for (const pt of punti) {
    sumX += pt.concentrazione;
    sumY += pt.ripetibilita;
    sumXY += pt.concentrazione * pt.ripetibilita;
    sumXX += pt.concentrazione * pt.concentrazione;
    sumYY += pt.ripetibilita * pt.ripetibilita;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return null;
  }

  const m = (n * sumXY - sumX * sumY) / denominator;
  const q = (sumY - m * sumX) / n;

  // Calcolo R^2
  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;

  for (const pt of punti) {
    const yEst = m * pt.concentrazione + q;
    ssTot += Math.pow(pt.ripetibilita - meanY, 2);
    ssRes += Math.pow(pt.ripetibilita - yEst, 2);
  }

  const r2 = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);

  return { m, q, r2 };
}

export function ProveSection({
  prove,
  onAddProva,
  onDeleteProva,
  onUpdateProva,
  selectedProvaId,
  onClearSelectedProvaId,
  currentUser = null,
  userRole = null
}: ProveSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tutte');

  useEffect(() => {
    if (selectedProvaId) {
      const match = prove.find(p => p.id === selectedProvaId);
      if (match) {
        setSelectedCategory('Tutte');
        setSearchTerm('');
        setShowAddForm(false);
        setTimeout(() => {
          const el = document.getElementById(`prova-${selectedProvaId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-4', 'ring-purple-500', 'ring-offset-2', 'scale-[1.01]');
            setTimeout(() => {
              el.classList.remove('ring-4', 'ring-purple-500', 'ring-offset-2', 'scale-[1.01]');
            }, 5000);
          }
        }, 350);
      }
      onClearSelectedProvaId?.();
    }
  }, [selectedProvaId, prove, onClearSelectedProvaId]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [provaDeletingId, setProvaDeletingId] = useState<string | null>(null);
  const [editingProva, setEditingProva] = useState<Prova | null>(null);

  // Form states per nuova/modificata prova
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('Oli e Grassi');
  const [customCategoria, setCustomCategoria] = useState('');
  const [metodo, setMetodo] = useState('');
  const [prezzo, setPrezzo] = useState('');
  const [tempo, setTempo] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [accreditataAccredia, setAccreditataAccredia] = useState<boolean>(false);
  const [limiteQuantificazione, setLimiteQuantificazione] = useState('');
  const [unitaMisura, setUnitaMisura] = useState('');

  // Stati per la relazione concentrazione / incertezza (Richiesta Utente)
  const [puntiIncertezza, setPuntiIncertezza] = useState<Array<{ concentrazione: number; incertezza: number }>>([]);
  const [inputConc, setInputConc] = useState('');
  const [inputInc, setInputInc] = useState('');
  const [editingPuntoIdx, setEditingPuntoIdx] = useState<number | null>(null);
  const [editPuntoConc, setEditPuntoConc] = useState('');
  const [editPuntoInc, setEditPuntoInc] = useState('');

  // Stati per la relazione concentrazione / ripetibilità (Richiesta Utente)
  const [puntiRipetibilita, setPuntiRipetibilita] = useState<Array<{ concentrazione: number; ripetibilita: number }>>([]);
  const [inputRipConc, setInputRipConc] = useState('');
  const [inputRipVal, setInputRipVal] = useState('');
  const [editingPuntoRipIdx, setEditingPuntoRipIdx] = useState<number | null>(null);
  const [editPuntoRipConc, setEditPuntoRipConc] = useState('');
  const [editPuntoRipVal, setEditPuntoRipVal] = useState('');

  // Stati per la gestione dei limiti di riferimento
  const [limitiRiferimento, setLimitiRiferimento] = useState<LimiteRiferimento[]>([]);
  const [inputLimValore, setInputLimValore] = useState('');
  const [inputLimUnita, setInputLimUnita] = useState('');
  const [inputLimNorma, setInputLimNorma] = useState('');
  const [inputLimNote, setInputLimNote] = useState('');

  // Inline editor per i singoli limiti di riferimento
  const [editingLimiteId, setEditingLimiteId] = useState<string | null>(null);
  const [editLimValore, setEditLimValore] = useState('');
  const [editLimUnita, setEditLimUnita] = useState('');
  const [editLimNorma, setEditLimNorma] = useState('');
  const [editLimNote, setEditLimNote] = useState('');

  // Stati per la modifica ed eliminazione delle categorie
  const [editingCategoryName, setEditingCategoryName] = useState<string | null>(null);
  const [newCategoryNameInput, setNewCategoryNameInput] = useState<string>('');
  const [deletingCategoryName, setDeletingCategoryName] = useState<string | null>(null);

  const handleRenameConfirm = (oldName: string) => {
    const trimmed = newCategoryNameInput.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingCategoryName(null);
      return;
    }

    prove.forEach(p => {
      if (p.categoriaMerceologica === oldName) {
        onUpdateProva({
          ...p,
          categoriaMerceologica: trimmed
        });
      }
    });

    if (selectedCategory === oldName) {
      setSelectedCategory(trimmed);
    }
    setEditingCategoryName(null);
  };

  const handleDeleteConfirm = (catName: string) => {
    prove.forEach(p => {
      if (p.categoriaMerceologica === catName) {
        onUpdateProva({
          ...p,
          categoriaMerceologica: 'Generale'
        });
      }
    });

    if (selectedCategory === catName) {
      setSelectedCategory('Tutte');
    }
    setDeletingCategoryName(null);
  };

  const handleAddPunto = () => {
    const conc = parseFloat(inputConc.replace(',', '.'));
    const inc = parseFloat(inputInc.replace(',', '.'));
    
    if (isNaN(conc) || isNaN(inc)) return;
    if (conc < 0 || inc < 0) return;

    // Aggiungi e ordina i punti per concentrazione crescente
    const nuoviPunti = [...puntiIncertezza, { concentrazione: conc, incertezza: inc }]
      .sort((a, b) => a.concentrazione - b.concentrazione);
      
    setPuntiIncertezza(nuoviPunti);
    setInputConc('');
    setInputInc('');
  };

  const handleRemovePunto = (idx: number) => {
    setPuntiIncertezza(puntiIncertezza.filter((_, i) => i !== idx));
    if (editingPuntoIdx === idx) setEditingPuntoIdx(null);
  };

  const handleStartEditPunto = (idx: number, p: { concentrazione: number; incertezza: number }) => {
    setEditingPuntoIdx(idx);
    setEditPuntoConc(p.concentrazione.toString());
    setEditPuntoInc(p.incertezza.toString());
  };

  const handleSavePunto = (idx: number) => {
    const conc = parseFloat(editPuntoConc.replace(',', '.'));
    const inc = parseFloat(editPuntoInc.replace(',', '.'));
    if (isNaN(conc) || isNaN(inc)) return;
    if (conc < 0 || inc < 0) return;

    const nuoviPunti = puntiIncertezza.map((p, i) => {
      if (i === idx) {
        return { concentrazione: conc, incertezza: inc };
      }
      return p;
    }).sort((a, b) => a.concentrazione - b.concentrazione);

    setPuntiIncertezza(nuoviPunti);
    setEditingPuntoIdx(null);
  };

  const handleAddPuntoRip = () => {
    const conc = parseFloat(inputRipConc.replace(',', '.'));
    const rip = parseFloat(inputRipVal.replace(',', '.'));
    
    if (isNaN(conc) || isNaN(rip)) return;
    if (conc < 0 || rip < 0) return;

    // Aggiungi e ordina i punti per concentrazione crescente
    const nuoviPunti = [...puntiRipetibilita, { concentrazione: conc, ripetibilita: rip }]
      .sort((a, b) => a.concentrazione - b.concentrazione);
      
    setPuntiRipetibilita(nuoviPunti);
    setInputRipConc('');
    setInputRipVal('');
  };

  const handleRemovePuntoRip = (idx: number) => {
    setPuntiRipetibilita(puntiRipetibilita.filter((_, i) => i !== idx));
    if (editingPuntoRipIdx === idx) setEditingPuntoRipIdx(null);
  };

  const handleStartEditPuntoRip = (idx: number, p: { concentrazione: number; ripetibilita: number }) => {
    setEditingPuntoRipIdx(idx);
    setEditPuntoRipConc(p.concentrazione.toString());
    setEditPuntoRipVal(p.ripetibilita.toString());
  };

  const handleSavePuntoRip = (idx: number) => {
    const conc = parseFloat(editPuntoRipConc.replace(',', '.'));
    const rip = parseFloat(editPuntoRipVal.replace(',', '.'));
    if (isNaN(conc) || isNaN(rip)) return;
    if (conc < 0 || rip < 0) return;

    const nuoviPunti = puntiRipetibilita.map((p, i) => {
      if (i === idx) {
        return { concentrazione: conc, ripetibilita: rip };
      }
      return p;
    }).sort((a, b) => a.concentrazione - b.concentrazione);

    setPuntiRipetibilita(nuoviPunti);
    setEditingPuntoRipIdx(null);
  };

  const handleAddLimiteRiferimento = () => {
    if (!inputLimValore.trim() || !inputLimNorma.trim()) return;
    const newLim: LimiteRiferimento = {
      id: 'lim_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      valore: inputLimValore.trim(),
      unitaMisura: inputLimUnita.trim() || 'mg/kg',
      norma: inputLimNorma.trim(),
      note: inputLimNote.trim() || undefined
    };
    setLimitiRiferimento([...limitiRiferimento, newLim]);
    setInputLimValore('');
    setInputLimUnita('');
    setInputLimNorma('');
    setInputLimNote('');
  };

  const handleRemoveLimiteRiferimento = (id: string) => {
    setLimitiRiferimento(limitiRiferimento.filter(l => l.id !== id));
  };

  const handleStartEditLimite = (lim: LimiteRiferimento) => {
    setEditingLimiteId(lim.id);
    setEditLimValore(lim.valore);
    setEditLimUnita(lim.unitaMisura);
    setEditLimNorma(lim.norma);
    setEditLimNote(lim.note || '');
  };

  const handleSaveEditLimite = (id: string) => {
    if (!editLimValore.trim() || !editLimNorma.trim()) return;
    setLimitiRiferimento(limitiRiferimento.map(l => {
      if (l.id === id) {
        return {
          ...l,
          valore: editLimValore.trim(),
          unitaMisura: editLimUnita.trim() || 'mg/kg',
          norma: editLimNorma.trim(),
          note: editLimNote.trim() || undefined
        };
      }
      return l;
    }));
    setEditingLimiteId(null);
  };

  const handleOpenEdit = (p: Prova) => {
    setEditingProva(p);
    setNome(p.nome);
    setMetodo(p.metodoAnalitico);
    setPrezzo(p.prezzoListino.toString());
    setTempo(p.tempoEsecuzioneGiorni.toString());
    setDescrizione(p.descrizione || '');
    setAccreditataAccredia(!!p.accreditataAccredia);
    setPuntiIncertezza(p.puntiIncertezza || []);
    setPuntiRipetibilita(p.puntiRipetibilita || []);
    setLimiteQuantificazione(p.limiteQuantificazione || '');
    setUnitaMisura(p.unitaMisura || '');
    setLimitiRiferimento(p.limitiRiferimento || []);
    setInputConc('');
    setInputInc('');
    setInputRipConc('');
    setInputRipVal('');
    setInputLimValore('');
    setInputLimUnita('');
    setInputLimNorma('');
    setInputLimNote('');
    
    const defaultCategories = ["Oli e Grassi", "Vini ed Aceti", "Cereali e Farine", "Allergeni e Tracce", "Terreni e Acque rurale"];
    if (defaultCategories.includes(p.categoriaMerceologica)) {
      setCategoria(p.categoriaMerceologica);
      setCustomCategoria('');
    } else {
      setCategoria('Nuova Categoria...');
      setCustomCategoria(p.categoriaMerceologica);
    }
    
    setShowAddForm(true);
  };

  const handleCancelForm = () => {
    setNome('');
    setMetodo('');
    setPrezzo('');
    setTempo('');
    setDescrizione('');
    setCustomCategoria('');
    setCategoria('Oli e Grassi');
    setAccreditataAccredia(false);
    setPuntiIncertezza([]);
    setPuntiRipetibilita([]);
    setLimiteQuantificazione('');
    setUnitaMisura('');
    setLimitiRiferimento([]);
    setInputConc('');
    setInputInc('');
    setInputRipConc('');
    setInputRipVal('');
    setInputLimValore('');
    setInputLimUnita('');
    setInputLimNorma('');
    setInputLimNote('');
    setEditingLimiteId(null);
    setEditingProva(null);
    setShowAddForm(false);
  };

  // Estrae tutte le categorie disponibili in archivio
  const archivioCategorie = Array.from(new Set(prove.map(p => p.categoriaMerceologica)));
  
  const defaultCategories = ["Oli e Grassi", "Vini ed Aceti", "Cereali e Farine", "Allergeni e Tracce", "Terreni e Acque rurale"];
  const dropdownCategorie = Array.from(new Set([...defaultCategories, ...archivioCategorie]));

  const handleFilterCategory = (cat: string) => {
    setSelectedCategory(cat);
  };

  // Filtraggio prove
  const filteredProve = prove.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.metodoAnalitico.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.categoriaMerceologica.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedCategory === 'Tutte') return matchesSearch;
    return p.categoriaMerceologica === selectedCategory && matchesSearch;
  });

  // Raggruppa le prove filtrate per categoria merceologica
  const groupedProve: Record<string, Prova[]> = {};
  filteredProve.forEach(p => {
    if (!groupedProve[p.categoriaMerceologica]) {
      groupedProve[p.categoriaMerceologica] = [];
    }
    groupedProve[p.categoriaMerceologica].push(p);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !metodo.trim() || !prezzo) return;

    const catMerceologica = (categoria === 'Nuova Categoria...' && customCategoria.trim()) 
      ? customCategoria.trim() 
      : categoria;

    if (editingProva) {
      const updatedProva: Prova = {
        ...editingProva,
        nome: nome.trim(),
        categoriaMerceologica: catMerceologica,
        metodoAnalitico: metodo.trim(),
        prezzoListino: parseFloat(prezzo) || 0,
        tempoEsecuzioneGiorni: parseInt(tempo) || 2,
        descrizione: descrizione.trim() || undefined,
        accreditataAccredia: accreditataAccredia,
        puntiIncertezza: puntiIncertezza,
        puntiRipetibilita: puntiRipetibilita,
        limiteQuantificazione: limiteQuantificazione.trim() || undefined,
        unitaMisura: unitaMisura.trim() || undefined,
        limitiRiferimento: limitiRiferimento
      };
      onUpdateProva(updatedProva);
    } else {
      const newProva: Prova = {
        id: 'p_' + Date.now(),
        nome: nome.trim(),
        categoriaMerceologica: catMerceologica,
        metodoAnalitico: metodo.trim(),
        prezzoListino: parseFloat(prezzo) || 0,
        tempoEsecuzioneGiorni: parseInt(tempo) || 2,
        descrizione: descrizione.trim() || undefined,
        accreditataAccredia: accreditataAccredia,
        puntiIncertezza: puntiIncertezza,
        puntiRipetibilita: puntiRipetibilita,
        limiteQuantificazione: limiteQuantificazione.trim() || undefined,
        unitaMisura: unitaMisura.trim() || undefined,
        limitiRiferimento: limitiRiferimento
      };
      onAddProva(newProva);
    }
    
    // Reset form
    setNome('');
    setMetodo('');
    setPrezzo('');
    setTempo('');
    setDescrizione('');
    setCustomCategoria('');
    setCategoria('Oli e Grassi');
    setAccreditataAccredia(false);
    setPuntiIncertezza([]);
    setPuntiRipetibilita([]);
    setLimiteQuantificazione('');
    setUnitaMisura('');
    setLimitiRiferimento([]);
    setInputConc('');
    setInputInc('');
    setInputRipConc('');
    setInputRipVal('');
    setInputLimValore('');
    setInputLimUnita('');
    setInputLimNorma('');
    setInputLimNote('');
    setEditingLimiteId(null);
    setEditingProva(null);
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Testata di Controllo & Filtro */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">
              Tariffario Prove Analitiche
            </h3>
            <p className="text-xs text-slate-400">Strutturato per categorie chimiche e merceologiche del laboratorio</p>
          </div>
        </div>

        {(currentUser !== null || userRole === 'admin') && (
          <div className="flex gap-2 w-full sm:w-auto">
            {/* Tasto per aprire il form di inserimento */}
            <button
              onClick={() => setShowAddForm(true)}
              className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition shadow cursor-pointer"
              id="btn-show-add-prova"
            >
              <Plus className="h-4.5 w-4.5" /> Registra Nuova Prova
            </button>
          </div>
        )}
      </div>

      {/* Riquadro Filtri con Ricerca e Dropdown Categorie */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Ricerca testuale */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca per nome prova, metodo di prova UNAV, OIV, ISO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs md:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium font-sans"
            id="input-search-tests"
          />
        </div>

        {/* Categorie Dropdown Menu */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:inline">Filtra per Area:</span>
          <div className="relative min-w-[210px] w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => handleFilterCategory(e.target.value)}
              className="w-full appearance-none bg-white border border-slate-200 hover:border-emerald-500 rounded-xl px-4 py-2.5 pr-10 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer transition shadow-2xs font-sans"
            >
              <option value="Tutte">📂 Tutte le Categorie ({prove.length})</option>
              {archivioCategorie.map(cat => {
                const count = prove.filter(p => p.categoriaMerceologica === cat).length;
                return (
                  <option key={cat} value={cat}>
                    🔬 {cat} ({count})
                  </option>
                );
              })}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-450">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Scorciatoie Rapide Aree Categorie (Pillole Interattive) */}
      <div className="flex items-center gap-1.5 flex-wrap pb-3.5 mb-2 overflow-x-auto scrollbar-none select-none border-b border-slate-100">
        <button
          type="button"
          onClick={() => handleFilterCategory('Tutte')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer shrink-0 ${
            selectedCategory === 'Tutte'
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-3xs'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          📂 Tutte ({prove.length})
        </button>
        {archivioCategorie.map(cat => {
          const count = prove.filter(p => p.categoriaMerceologica === cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => handleFilterCategory(cat)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-3xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              🔬 {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Contenuto Principale: Visualizzazione Gruppi o Form di Inserimento */}
      <AnimatePresence mode="wait">
        {showAddForm ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-md"
          >
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
              <h4 className="font-extrabold text-base text-slate-800">
                {editingProva ? `Modifica Prova: ${editingProva.nome}` : 'Aggiungi una Nuova Prova Analitica al Tariffario'}
              </h4>
              <button
                type="button"
                onClick={handleCancelForm}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
              >
                Annulla
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Nome Prova Analitica *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="es. Indice di Polifenoli Totali (IPT)"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Unità di Misura
                  </label>
                  <input
                    type="text"
                    placeholder="es. mg/kg, % vol, g/l"
                    value={unitaMisura}
                    onChange={(e) => setUnitaMisura(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Categoria Merceologica *
                  </label>
                  <div className="flex gap-2">
                    <select
                       value={categoria}
                       onChange={(e) => setCategoria(e.target.value)}
                       className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      {dropdownCategorie.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="Nuova Categoria...">+ Aggiungi Nuova Categoria...</option>
                    </select>
                    {categoria === 'Nuova Categoria...' && (
                      <input
                        type="text"
                        required
                        placeholder="Nome speciale..."
                        value={customCategoria}
                        onChange={(e) => setCustomCategoria(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-emerald-50/50"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Metodo Analitico / Standard *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="es. OIV-MA-AS203-01 / Rapporti ISTISAN"
                    value={metodo}
                    onChange={(e) => setMetodo(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Prezzo di Listino (€) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-400">€</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={prezzo}
                      onChange={(e) => setPrezzo(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Tempo Medio (Giorni)
                  </label>
                  <input
                    type="number"
                    placeholder="es. 3"
                    value={tempo}
                    onChange={(e) => setTempo(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Limite Quantificazione (LOQ)
                  </label>
                  <input
                    type="text"
                    placeholder="es. 0.01% o 10 mg/kg"
                    value={limiteQuantificazione}
                    onChange={(e) => setLimiteQuantificazione(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Descrizione Estesa e Requisiti Campione (Consigliato)
                </label>
                <textarea
                  rows={3}
                  placeholder="Minimo quantitativo di campione richiesto, condizioni di trasporto, interferenze chimiche note..."
                  value={descrizione}
                  onChange={(e) => setDescrizione(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-black text-slate-850 tracking-tight flex items-center gap-1.5">
                    🛡️ Accreditamento ACCREDIA
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Spunta questa opzione se il metodo analitico per questa determinazione è accreditato dall&apos;Organo Nazionale ACCREDIA.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={accreditataAccredia}
                    onChange={(e) => setAccreditataAccredia(e.target.checked)}
                    className="sr-only peer"
                    id="checkbox-accreditata-accredia"
                  />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Relazione Incertezza - Concentrazione (Richiesta Utente) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                  <div className="flex-1">
                    <h5 className="text-xs font-black text-slate-850 tracking-tight flex items-center gap-1.5 uppercase">
                      📈 Relazione Concentrazione / Incertezza
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Configura i punti di calibrazione dell&apos;incertezza. L&apos;applicazione calcolerà automaticamente l&apos;incertezza estesa applicando la formula della retta di regressione: radq(intercetta + (risultato² * pendenza)) quando inserirai il risultato nel rapporto di prova.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                  {/* Colonne Inserimento */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">📊 Inserimento Punti Colonna</span>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-[9px] text-slate-500 uppercase font-black mb-1">Concentrazione</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="es. 0.10"
                          value={inputConc}
                          onChange={(e) => setInputConc(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[9px] text-slate-500 uppercase font-black mb-1">Incertezza Assoluta (±)</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="es. 0.01"
                          value={inputInc}
                          onChange={(e) => setInputInc(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddPunto}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 shrink-0 h-[32px] cursor-pointer shadow-3xs"
                      >
                        <Plus className="h-4 w-4" /> Aggiungi
                      </button>
                    </div>

                    {/* Elenco dei punti inseriti */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[9px] font-black uppercase">
                            <th className="py-2 px-3">Concentrazione (C)</th>
                            <th className="py-2 px-3">Incertezza Assoluta (U)</th>
                            <th className="py-2 px-3 w-20 text-center">Azioni</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {puntiIncertezza.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="py-4 text-center text-slate-400 italic text-[11px]">
                                Nessun punto inserito. Il calcolatore automatico non stimerà l&apos;incertezza per questo parametro.
                              </td>
                            </tr>
                          ) : (
                            puntiIncertezza.map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 text-[11px]">
                                {editingPuntoIdx === idx ? (
                                  <>
                                    <td className="py-1 px-2">
                                      <input
                                        type="text"
                                        value={editPuntoConc}
                                        onChange={(e) => setEditPuntoConc(e.target.value)}
                                        className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none font-bold"
                                      />
                                    </td>
                                    <td className="py-1 px-2">
                                      <input
                                        type="text"
                                        value={editPuntoInc}
                                        onChange={(e) => setEditPuntoInc(e.target.value)}
                                        className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none font-bold animate-fadeIn"
                                      />
                                    </td>
                                    <td className="py-1 px-2 text-center flex items-center justify-center gap-1.5 h-[34px]">
                                      <button
                                        type="button"
                                        onClick={() => handleSavePunto(idx)}
                                        className="text-emerald-600 hover:text-emerald-800 transition p-1 cursor-pointer"
                                        title="Salva"
                                      >
                                        <Check className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingPuntoIdx(null)}
                                        className="text-slate-400 hover:text-slate-650 transition p-1 cursor-pointer"
                                        title="Annulla"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-2 px-3 font-mono font-bold text-slate-600">{p.concentrazione}</td>
                                    <td className="py-2 px-3 font-mono font-bold text-teal-700">± {p.incertezza}</td>
                                    <td className="py-2 px-3 text-center flex items-center justify-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditPunto(idx, p)}
                                        className="text-slate-400 hover:text-blue-600 transition p-1 cursor-pointer"
                                        title="Modifica punto"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePunto(idx)}
                                        className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                                        title="Rimuovi punto"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {/* Grafico di interpolazione */}
                  <div className="bg-slate-100/50 p-3 rounded-xl border border-slate-200/80 flex flex-col justify-between min-h-[170px]">
                    {puntiIncertezza.length >= 2 ? (() => {
                      const regression = calculateLinearRegression(puntiIncertezza);
                      return (
                        <div className="h-full flex flex-col justify-between">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-650 flex items-center gap-1">
                              <TrendingUp className="h-4 w-4 text-emerald-600" /> Curva di Taratura Incertezza
                            </span>
                          </div>
                          
                          {regression && (
                            <div className="bg-white/80 backdrop-blur-xs border border-slate-200 shadow-3xs p-2 rounded-lg text-[10px] space-y-0.5 font-mono mb-2 text-slate-705">
                              <div className="flex justify-between items-center text-slate-700">
                                <span className="font-bold text-slate-500">Equazione Regressione:</span>
                                <span className="font-extrabold text-teal-800">
                                  y = {regression.m.toFixed(4)}x {regression.q >= 0 ? '+' : '-'} {Math.abs(regression.q).toFixed(4)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center border-t border-slate-100 pt-0.5 text-slate-700">
                                <span className="font-bold text-slate-500">Coefficiente (R²):</span>
                                <span className="font-black text-rose-700 bg-rose-50 border border-rose-100 px-1 py-0.2 rounded">
                                  {regression.r2.toFixed(4)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center border-t border-slate-100 pt-0.5 text-slate-700">
                                <span className="font-bold text-slate-500">Formula Incertezza U(x):</span>
                                <span className="font-extrabold text-sky-800" title="√[intercetta + (risultato² * pendenza)]">
                                  √[{regression.q.toFixed(4)} + (x² * {regression.m.toFixed(4)})]
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="h-36 w-full mt-1.5" style={{ minWidth: 100 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={puntiIncertezza.map(pt => ({
                                  conc: pt.concentrazione,
                                  inc: pt.incertezza
                                }))}
                                margin={{ top: 5, right: 15, left: -20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis 
                                  dataKey="conc" 
                                  tick={{ fontSize: 9 }} 
                                  type="number"
                                  scale="linear"
                                />
                                <YAxis 
                                  tick={{ fontSize: 9 }} 
                                  type="number"
                                  scale="linear"
                                />
                                <Tooltip 
                                  contentStyle={{ fontSize: '10px', borderRadius: '8px' }}
                                  formatter={(val: any) => [`± ${val}`, 'U']}
                                  labelFormatter={(val: any) => `C: ${val}`}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="inc" 
                                  stroke="#0f766e" 
                                  strokeWidth={2.5}
                                  dot={{ r: 4, stroke: '#0f766e', strokeWidth: 1.5, fill: '#fff' }} 
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          <p className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-100 p-2 rounded-lg mt-2 leading-relaxed flex items-start gap-1">
                            <Info className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
                            <span>
                              Relazione lineare calcolata per concentrazioni comprese tra <strong>{puntiIncertezza[0].concentrazione}</strong> e <strong>{puntiIncertezza[puntiIncertezza.length-1].concentrazione}</strong>.
                            </span>
                          </p>
                        </div>
                      );
                    })() : (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <TrendingUp className="h-8 w-8 text-slate-300 mb-2" />
                        <span className="text-xs font-bold text-slate-500">Grafico interattivo non pronto</span>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-[220px] leading-relaxed">
                          Inserisci almeno 2 punti di taratura (concentrazioni diverse) per mostrare l&apos;andamento grafico del fattore di incertezza.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Relazione Concentrazione / Ripetibilità (Richiesta Utente) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                  <div className="flex-1">
                    <h5 className="text-xs font-black text-slate-850 tracking-tight flex items-center gap-1.5 uppercase">
                      📈 Relazione Concentrazione / Ripetibilità
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Configura i punti di calibrazione della ripetibilità. L&apos;applicazione calcolerà automaticamente la ripetibilità per interpolazione lineare quando inserirai il risultato nel rapporto di prova.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                  {/* Colonne Inserimento */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">📊 Inserimento Punti Colonna</span>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-[9px] text-slate-500 uppercase font-black mb-1">Concentrazione</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="es. 0.10"
                          value={inputRipConc}
                          onChange={(e) => setInputRipConc(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[9px] text-slate-500 uppercase font-black mb-1">Ripetibilità Assoluta (±)</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="es. 0.005"
                          value={inputRipVal}
                          onChange={(e) => setInputRipVal(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddPuntoRip}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 shrink-0 h-[32px] cursor-pointer shadow-3xs"
                      >
                        <Plus className="h-4 w-4" /> Aggiungi
                      </button>
                    </div>

                    {/* Elenco dei punti inseriti */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[9px] font-black uppercase">
                            <th className="py-2 px-3">Concentrazione (C)</th>
                            <th className="py-2 px-3">Ripetibilità Assoluta (R)</th>
                            <th className="py-2 px-3 w-20 text-center">Azioni</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {puntiRipetibilita.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="py-4 text-center text-slate-400 italic text-[11px]">
                                Nessun punto inserito. Il calcolatore automatico non stimerà la ripetibilità per questo parametro.
                              </td>
                            </tr>
                          ) : (
                            puntiRipetibilita.map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 text-[11px]">
                                {editingPuntoRipIdx === idx ? (
                                  <>
                                    <td className="py-1 px-2">
                                      <input
                                        type="text"
                                        value={editPuntoRipConc}
                                        onChange={(e) => setEditPuntoRipConc(e.target.value)}
                                        className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none font-bold"
                                      />
                                    </td>
                                    <td className="py-1 px-2">
                                      <input
                                        type="text"
                                        value={editPuntoRipVal}
                                        onChange={(e) => setEditPuntoRipVal(e.target.value)}
                                        className="w-full px-2 py-1 text-xs font-mono border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 focus:outline-none font-bold animate-fadeIn"
                                      />
                                    </td>
                                    <td className="py-1 px-2 text-center flex items-center justify-center gap-1.5 h-[34px]">
                                      <button
                                        type="button"
                                        onClick={() => handleSavePuntoRip(idx)}
                                        className="text-emerald-600 hover:text-emerald-800 transition p-1 cursor-pointer"
                                        title="Salva"
                                      >
                                        <Check className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingPuntoRipIdx(null)}
                                        className="text-slate-400 hover:text-slate-650 transition p-1 cursor-pointer"
                                        title="Annulla"
                                      >
                                        <X className="h-4 w-4" />
                                      </button>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-2 px-3 font-mono font-bold text-slate-600">{p.concentrazione}</td>
                                    <td className="py-2 px-3 font-mono font-bold text-indigo-700">± {p.ripetibilita}</td>
                                    <td className="py-2 px-3 text-center flex items-center justify-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditPuntoRip(idx, p)}
                                        className="text-slate-400 hover:text-blue-600 transition p-1 cursor-pointer"
                                        title="Modifica punto"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemovePuntoRip(idx)}
                                        className="text-slate-400 hover:text-rose-600 transition p-1 cursor-pointer"
                                        title="Rimuovi punto"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {/* Grafico di interpolazione */}
                  <div className="bg-slate-100/50 p-3 rounded-xl border border-slate-200/80 flex flex-col justify-between min-h-[170px]">
                    {puntiRipetibilita.length >= 2 ? (() => {
                      const regression = calculateLinearRegressionRipetibilita(puntiRipetibilita);
                      return (
                        <div className="h-full flex flex-col justify-between">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-650 flex items-center gap-1">
                              <TrendingUp className="h-4 w-4 text-indigo-600" /> Curva di Taratura Ripetibilità
                            </span>
                          </div>
                          
                          {regression && (
                            <div className="bg-white/80 backdrop-blur-xs border border-slate-200 shadow-3xs p-2 rounded-lg text-[10px] space-y-0.5 font-mono mb-2 text-slate-705">
                              <div className="flex justify-between items-center text-slate-700">
                                <span className="font-bold text-slate-500">Equazione Regressione:</span>
                                <span className="font-extrabold text-indigo-850">
                                  y = {regression.m.toFixed(4)}x {regression.q >= 0 ? '+' : '-'} {Math.abs(regression.q).toFixed(4)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center border-t border-slate-100 pt-0.5 text-slate-700">
                                <span className="font-bold text-slate-500">Coefficiente (R²):</span>
                                <span className="font-black text-rose-700 bg-rose-50 border border-rose-100 px-1 py-0.2 rounded">
                                  {regression.r2.toFixed(4)}
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="h-36 w-full mt-1.5" style={{ minWidth: 100 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={puntiRipetibilita.map(pt => ({
                                  conc: pt.concentrazione,
                                  rip: pt.ripetibilita
                                }))}
                                margin={{ top: 5, right: 15, left: -20, bottom: 5 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis 
                                  dataKey="conc" 
                                  tick={{ fontSize: 9 }} 
                                  type="number"
                                  scale="linear"
                                />
                                <YAxis 
                                  tick={{ fontSize: 9 }} 
                                  type="number"
                                  scale="linear"
                                />
                                <Tooltip 
                                  contentStyle={{ fontSize: '10px', borderRadius: '8px' }}
                                  formatter={(val: any) => [`± ${val}`, 'R']}
                                  labelFormatter={(val: any) => `C: ${val}`}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="rip" 
                                  stroke="#4f46e5" 
                                  strokeWidth={2.5}
                                  dot={{ r: 4, stroke: '#4f46e5', strokeWidth: 1.5, fill: '#fff' }} 
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                          <p className="text-[10px] text-indigo-800 bg-indigo-50 border border-indigo-100 p-2 rounded-lg mt-2 leading-relaxed flex items-start gap-1">
                            <Info className="h-3.5 w-3.5 shrink-0 text-indigo-600 mt-0.5" />
                            <span>
                              Relazione lineare calcolata per concentrazioni comprese tra <strong>{puntiRipetibilita[0].concentrazione}</strong> e <strong>{puntiRipetibilita[puntiRipetibilita.length-1].concentrazione}</strong>.
                            </span>
                          </p>
                        </div>
                      );
                    })() : (
                      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <TrendingUp className="h-8 w-8 text-slate-300 mb-2" />
                        <span className="text-xs font-bold text-slate-500">Grafico interattivo non pronto</span>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-[220px] leading-relaxed">
                          Inserisci almeno 2 punti di taratura (concentrazioni diverse) per mostrare l&apos;andamento grafico della ripetibilità.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Gestione Limiti di Riferimento e Normativa legislativa */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-4">
                <div>
                  <h5 className="text-xs font-black text-slate-850 tracking-tight flex items-center gap-1.5 uppercase">
                    ⚖️ Limiti di Riferimento & Normativa Applicabile
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Associa uno o più limiti di riferimento e relative normative per questa prova analitica. Durante i preventivi e i rapporti di prova potrai selezionare uno di questi limiti o digitarne uno personalizzato.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">📋 Inserisci Nuovo Limite</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 items-end">
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase font-black mb-1">Valore Limite</label>
                      <input
                        type="text"
                        placeholder="es. 0.10 o Assente"
                        value={inputLimValore}
                        onChange={(e) => setInputLimValore(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase font-black mb-1">Unità di Misura</label>
                      <input
                        type="text"
                        placeholder="es. mg/kg"
                        value={inputLimUnita}
                        onChange={(e) => setInputLimUnita(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase font-black mb-1">Norma o Rif. Legislativo</label>
                      <input
                        type="text"
                        placeholder="es. Reg. UE 2023/XXXX"
                        value={inputLimNorma}
                        onChange={(e) => setInputLimNorma(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-500 uppercase font-black mb-1">Note / Applicabilità (Opzionale)</label>
                      <input
                        type="text"
                        placeholder="es. Olio EVO"
                        value={inputLimNote}
                        onChange={(e) => setInputLimNote(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleAddLimiteRiferimento}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-1.5 text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-3xs"
                    >
                      <Plus className="h-4 w-4" /> Aggiungi Limite a Prova
                    </button>
                  </div>
                </div>

                {/* Elenco dei limiti inseriti */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[9px] font-black uppercase">
                        <th className="py-2.5 px-3">Valore Limite</th>
                        <th className="py-2.5 px-3 w-28">U.M.</th>
                        <th className="py-2.5 px-3">Norma / Capitolato</th>
                        <th className="py-2.5 px-3">Note Applicabilità</th>
                        <th className="py-2.5 px-3 w-20 text-center">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {limitiRiferimento.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400 italic text-[11px]">
                            Nessun limite definito. Questa prova non avrà limiti proposti di default.
                          </td>
                        </tr>
                      ) : (
                        limitiRiferimento.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50/50 text-[11px] transition-colors col-span-5 border-b border-slate-100">
                            {editingLimiteId === l.id ? (
                              <>
                                <td className="py-1.5 px-2">
                                  <input
                                    type="text"
                                    value={editLimValore}
                                    onChange={(e) => setEditLimValore(e.target.value)}
                                    className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded font-bold"
                                    autoFocus
                                  />
                                </td>
                                <td className="py-1.5 px-2">
                                  <input
                                    type="text"
                                    value={editLimUnita}
                                    onChange={(e) => setEditLimUnita(e.target.value)}
                                    className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded"
                                  />
                                </td>
                                <td className="py-1.5 px-2">
                                  <input
                                    type="text"
                                    value={editLimNorma}
                                    onChange={(e) => setEditLimNorma(e.target.value)}
                                    className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded"
                                  />
                                </td>
                                <td className="py-1.5 px-2">
                                  <input
                                    type="text"
                                    value={editLimNote}
                                    onChange={(e) => setEditLimNote(e.target.value)}
                                    className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded"
                                  />
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  <div className="flex items-center justify-center gap-1 mt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditLimite(l.id)}
                                      className="text-emerald-600 hover:text-emerald-850 font-bold px-1 py-0.5 rounded transition cursor-pointer"
                                      title="Salva modifiche"
                                    >
                                      Salva
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingLimiteId(null)}
                                      className="text-slate-400 hover:text-slate-650 px-1 py-0.5 rounded transition cursor-pointer"
                                      title="Annulla"
                                    >
                                      X
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{l.valore}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-650">{l.unitaMisura}</td>
                                <td className="py-2.5 px-3 text-slate-700 font-semibold">{l.norma}</td>
                                <td className="py-2.5 px-3 text-slate-550 italic">{l.note || 'Qualsiasi condizione'}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <div className="flex gap-2 justify-center items-center">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditLimite(l)}
                                      className="text-slate-400 hover:text-emerald-600 transition cursor-pointer"
                                      title="Modifica riga"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveLimiteRiferimento(l.id)}
                                      className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                      title="Rimuovi"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm transition hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Indietro
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition shadow cursor-pointer"
                  id="submit-new-prova"
                >
                  {editingProva ? 'Salva Modifiche' : 'Registra Prova in Archivio'}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* Elenco Gruppi */
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {Object.keys(groupedProve).length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-200 rounded-xl max-w-full">
                <p className="text-slate-400">Nessuna prova analitica trovata con questi requisiti di ricerca.</p>
              </div>
            ) : (
              Object.entries(groupedProve).map(([catMerceologica, listaProve]) => (
                <div key={catMerceologica} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 mb-4 bg-slate-50/50 -m-5 p-5 mb-4 gap-3">
                    <div className="flex-1">
                      {editingCategoryName === catMerceologica ? (
                        <div className="flex items-center gap-2 animate-fadeIn max-w-md">
                          <input
                            type="text"
                            value={newCategoryNameInput}
                            onChange={(e) => setNewCategoryNameInput(e.target.value)}
                            className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-bold text-slate-800 w-full"
                            placeholder="Nuovo nome categoria..."
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameConfirm(catMerceologica);
                              if (e.key === 'Escape') setEditingCategoryName(null);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameConfirm(catMerceologica)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer transition whitespace-nowrap shadow-3xs"
                          >
                            Salva
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategoryName(null)}
                            className="bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition whitespace-nowrap"
                          >
                            Annulla
                          </button>
                        </div>
                      ) : deletingCategoryName === catMerceologica ? (
                        <div className="flex items-center gap-3 bg-rose-50 border border-rose-150 p-2.5 rounded-lg animate-fadeIn text-[11px] font-bold text-rose-800">
                          <span>Riassegna le {listaProve.length} prove a &quot;Generale&quot; ed elimina questa categoria?</span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteConfirm(catMerceologica)}
                              className="bg-rose-650 hover:bg-rose-700 text-white rounded px-2.5 py-1 text-[10px] font-bold cursor-pointer transition shadow-3xs"
                            >
                              Sì, elimina
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingCategoryName(null)}
                              className="bg-white border border-slate-200 text-slate-600 rounded px-2.5 py-1 text-[10px] font-bold cursor-pointer transition"
                            >
                              Annulla
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/cat">
                          <Tag className="h-4 w-4 text-emerald-600 shrink-0" />
                          <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
                            {catMerceologica}
                          </h4>
                          
                          {/* Pulsanti Modifica / Elimina Categoria */}
                          <div className="flex items-center gap-0.5 ml-3 opacity-0 group-hover/cat:opacity-100 hover:opacity-100 focus-within:opacity-100 transition duration-150">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryName(catMerceologica);
                                setNewCategoryNameInput(catMerceologica);
                              }}
                              className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded p-1 transition cursor-pointer"
                              title="Rinomina questa categoria merceologica"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingCategoryName(catMerceologica)}
                              className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded p-1 transition cursor-pointer"
                              title="Elimina questa categoria merceologica"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <span className="text-xs font-bold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full shrink-0">
                      {listaProve.length} Prove catalogate
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {listaProve.map(prova => (
                      <div
                        key={prova.id}
                        id={`prova-${prova.id}`}
                        className="p-4 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100/50 transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <h5 className="font-bold text-slate-800 text-sm leading-snug">{prova.nome}</h5>
                              {prova.unitaMisura && (
                                <span className="px-1.5 py-0.5 bg-sky-50 text-sky-850 border border-sky-200 rounded font-bold text-[9px] shrink-0" title="Unità di Misura">
                                  {prova.unitaMisura}
                                </span>
                              )}
                            </div>
                            {(currentUser !== null || userRole === 'admin') && (
                              <div className="flex items-center gap-1 shrink-0">
                                {/* Edit Button */}
                                <button
                                  onClick={() => handleOpenEdit(prova)}
                                  className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded p-1 transition cursor-pointer"
                                  title="Modifica prova analitica"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>

                                {/* Delete Action Confirm Flow */}
                                {provaDeletingId === prova.id ? (
                                  <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-100 animate-fadeIn shrink-0">
                                    <span className="text-[9px] font-bold text-rose-700 px-0.5">Eliminare?</span>
                                    <button
                                      onClick={() => {
                                        onDeleteProva(prova.id);
                                        setProvaDeletingId(null);
                                      }}
                                      className="bg-rose-650 text-white rounded px-1.5 py-0.5 text-[9px] font-bold cursor-pointer hover:bg-rose-700"
                                    >
                                      Sì
                                    </button>
                                    <button
                                      onClick={() => setProvaDeletingId(null)}
                                      className="bg-white border border-slate-200 text-slate-500 rounded px-1.5 py-0.5 text-[9px] font-bold cursor-pointer hover:bg-slate-50"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setProvaDeletingId(prova.id)}
                                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded p-1 transition cursor-pointer"
                                    title="Cancella prova analitica"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] items-center">
                            <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded-md font-mono font-medium">
                              Rif: {prova.metodoAnalitico}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                              Tempo: {prova.tempoEsecuzioneGiorni} gg
                            </span>
                            {prova.accreditataAccredia && (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-bold flex items-center gap-1 text-[10px] uppercase shadow-3xs" title="Prova accreditata ACCREDIA">
                                <span className="w-1.5 h-1.5 bg-emerald-650 rounded-full animate-pulse"></span>
                                Accredia
                              </span>
                            )}
                            {prova.puntiIncertezza && prova.puntiIncertezza.length > 0 && (
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-850 border border-indigo-200 rounded-md font-bold flex items-center gap-1 text-[10px]" title="Modello d'incertezza configurato">
                                <TrendingUp className="h-3 w-3 text-indigo-650" />
                                {prova.puntiIncertezza.length} punti incertezza
                              </span>
                            )}
                            {prova.puntiRipetibilita && prova.puntiRipetibilita.length > 0 && (
                              <span className="px-2 py-0.5 bg-violet-50 text-violet-850 border border-violet-200 rounded-md font-bold flex items-center gap-1 text-[10px]" title="Modello di ripetibilità configurato">
                                <TrendingUp className="h-3 w-3 text-violet-650" />
                                {prova.puntiRipetibilita.length} punti ripetibilità
                              </span>
                            )}
                            {prova.limiteQuantificazione && (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md font-bold flex items-center gap-1 text-[10px] shadow-3xs" title="Limite di Quantificazione">
                                LOQ: {prova.limiteQuantificazione}
                              </span>
                            )}
                          </div>

                          {prova.descrizione && (
                            <p className="text-xs text-slate-400 mt-2.5 leading-relaxed bg-white/40 p-2 rounded">
                              {prova.descrizione}
                            </p>
                          )}

                          {prova.limitiRiferimento && prova.limitiRiferimento.length > 0 && (
                            <div className="mt-3 text-xs bg-slate-50 border border-slate-150 rounded-lg p-2.5">
                              <div className="font-extrabold text-[9px] uppercase text-slate-550 tracking-wider mb-2 flex items-center gap-1">
                                ⚖️ Limiti di Riferimento & Normative Associati
                              </div>
                              <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto">
                                {prova.limitiRiferimento.map(lim => (
                                  <div key={lim.id} className="py-1 flex items-start justify-between text-[11px] gap-2">
                                    <div className="font-mono font-black text-slate-800 shrink-0">
                                      {lim.valore} <span className="text-slate-400 font-sans font-medium text-[10px]">{lim.unitaMisura}</span>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-emerald-700 font-semibold leading-tight">{lim.norma}</div>
                                      {lim.note && <div className="text-[10px] text-slate-400 italic font-medium">{lim.note}</div>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                          <span className="text-slate-400">Prezzo Tarifa Listino:</span>
                          <span className="text-sm font-extrabold text-emerald-700">€{prova.prezzoListino.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
