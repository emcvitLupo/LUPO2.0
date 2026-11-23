import React, { useState, useRef, useEffect } from 'react';
import { AccettazioneCampione, Client, Preventivo, Prova, Pacchetto, RisultatoProva, Operator, VariableCalcolo, QuadernoCalcolo, Strumento, Reagente } from '../types';
import { logoAgenzia, logoAccredia } from '../assets/images/logos';
import { buildOperatorPasswordsMap, getTechnicalSigners, getDepartmentSigners } from '../utils/limsHelpers';
import { getOperatorQualificationLabel, getOperatorQualificationsList, normalizeQualificationLabel } from '../utils/operatorSanitizer';
import { evaluateFormula, FORMULA_PRESETS, FormulaPreset } from '../utils/mathLims';
import { QuadernoLaboratorioSubRow } from './QuadernoLaboratorioSubRow';
import { IdrocarburiTotaliModal, IdrocarburiTotaliApplyData } from './IdrocarburiTotaliModal';
import { identificaTipoCompostoIdrocarburi, calcolaSommaIdrocarburiTotali, isValueLowerThanLoq, isIdrocarburiSingoloComposto, isIdrocarburiSommaTotale, syncIdrocarburiTotaliResults } from '../utils/idrocarburiTotali';
import { isAcidiGrassiProva, getAcidiGrassiFrazioniDisplay } from '../utils/acidiGrassi';
import { 
  Building,
  Layers, 
  CreditCard, 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Trash2, 
  Pencil, 
  Calendar, 
  Thermometer, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Tag, 
  Info,
  X,
  FileText,
  Printer,
  Edit3,
  Save,
  Check,
  Award,
  AlertCircle,
  Calculator,
  Sparkles,
  ExternalLink,
  BookOpen,
  Repeat,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  FlaskConical,
  FileCheck,
  Copy,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Helper per l'interpolazione lineare dell'incertezza sulla base di punti di taratura (Richiesta Utente)
export function calculateInterpolatedUncertainty(valoreStr: string, punti: Array<{ concentrazione: number; incertezza: number }> | undefined): string | null {
  if (!punti || punti.length === 0 || !valoreStr) return null;
  
  const cleaned = valoreStr.replace(',', '.');
  const numericMatch = cleaned.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (!numericMatch) return null;
  
  const value = parseFloat(numericMatch[0]);
  if (isNaN(value)) return null;

  if (punti.length === 1) {
    return `± ${punti[0].incertezza}`;
  }

  // Ordina i punti per concentrazione
  const sortedPunti = [...punti].sort((a, b) => a.concentrazione - b.concentrazione);

  // Se inferiore o uguale alla concentrazione minima
  if (value <= sortedPunti[0].concentrazione) {
    return `± ${sortedPunti[0].incertezza}`;
  }

  // Se superiore o uguale alla concentrazione massima
  if (value >= sortedPunti[sortedPunti.length - 1].concentrazione) {
    return `± ${sortedPunti[sortedPunti.length - 1].incertezza}`;
  }

  // Interpolazione lineare
  for (let i = 0; i < sortedPunti.length - 1; i++) {
    const p1 = sortedPunti[i];
    const p2 = sortedPunti[i + 1];
    if (value >= p1.concentrazione && value <= p2.concentrazione) {
      if (p2.concentrazione === p1.concentrazione) {
        return `± ${p1.incertezza}`;
      }
      const t = (value - p1.concentrazione) / (p2.concentrazione - p1.concentrazione);
      const incertezzaInterp = p1.incertezza + t * (p2.incertezza - p1.incertezza);
      
      const fraction = numericMatch[0].split('.')[1] || '';
      const decimals = Math.max(fraction.length, 2);
      return `± ${incertezzaInterp.toFixed(decimals)}`;
    }
  }

  return `± ${sortedPunti[0].incertezza}`;
}

// Helper per calcolo automatico dell'incertezza e incertezza percentuale tramite retta di regressione o interpolazione
export function calculateAutomatedUncertainty(
  valoreStr: string,
  punti: Array<{ concentrazione: number; incertezza: number }> | undefined
): { incertezza: string; incertezzaPercentuale: string } | null {
  if (!valoreStr) return null;
  
  const cleaned = valoreStr.replace(',', '.');
  const numericMatch = cleaned.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (!numericMatch) return null;
  
  const x = parseFloat(numericMatch[0]);
  if (isNaN(x) || x === 0) return null;

  let absoluteUncertainty = 0;
  
  if (punti && punti.length >= 2) {
    // Calcolo coefficienti retta di regressione y = mx + q
    const n = punti.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (const pt of punti) {
      sumX += pt.concentrazione;
      sumY += pt.incertezza;
      sumXY += pt.concentrazione * pt.incertezza;
      sumXX += pt.concentrazione * pt.concentrazione;
    }

    const denominator = n * sumXX - sumX * sumX;
    if (denominator !== 0) {
      const m = (n * sumXY - sumX * sumY) / denominator; // pendenza
      const q = (sumY - m * sumX) / n;                  // intercetta
      // Richiesta Utente: radq( intercetta + (risultato^2 * la pendenza) )
      absoluteUncertainty = Math.sqrt(Math.max(0, q + (x * x * m)));
    } else {
      // Fallback a interpolazione lineare se denominatore nullo
      const inferredStr = calculateInterpolatedUncertainty(valoreStr, punti);
      if (inferredStr) {
        absoluteUncertainty = parseFloat(inferredStr.replace('±', '').trim());
      }
    }
  } else if (punti && punti.length === 1) {
    absoluteUncertainty = punti[0].incertezza;
  } else {
    return null;
  }

  // Incertezza percentuale (%) = (Incertezza assoluta / Risultato) × 100
  const percentUncertainty = (absoluteUncertainty / Math.abs(x)) * 100;

  // Formato basato sul numero di decimali del valore inserito (minimo 2 decimali)
  const fraction = numericMatch[0].split('.')[1] || '';
  const valueDecimals = fraction.length;
  const precision = Math.max(valueDecimals, 2);

  return {
    incertezza: `± ${absoluteUncertainty.toFixed(precision)}`,
    incertezzaPercentuale: `${percentUncertainty.toFixed(precision)}%`
  };
}

// Helper per l'interpolazione lineare della ripetibilità sulla base di punti di taratura (Richiesta Utente)
export function calculateInterpolatedRepeatability(valoreStr: string, punti: Array<{ concentrazione: number; ripetibilita: number }> | undefined): string | null {
  if (!punti || punti.length === 0 || !valoreStr) return null;
  
  const cleaned = valoreStr.replace(',', '.');
  const numericMatch = cleaned.match(/[-+]?[0-9]*\.?[0-9]+/);
  if (!numericMatch) return null;
  
  const value = parseFloat(numericMatch[0]);
  if (isNaN(value)) return null;

  if (punti.length === 1) {
    return `± ${punti[0].ripetibilita}`;
  }

  // Ordina i punti per concentrazione
  const sortedPunti = [...punti].sort((a, b) => a.concentrazione - b.concentrazione);

  // Se inferiore o uguale alla concentrazione minima
  if (value <= sortedPunti[0].concentrazione) {
    return `± ${sortedPunti[0].ripetibilita}`;
  }

  // Se superiore o uguale alla concentrazione massima
  if (value >= sortedPunti[sortedPunti.length - 1].concentrazione) {
    return `± ${sortedPunti[sortedPunti.length - 1].ripetibilita}`;
  }

  // Interpolazione lineare
  for (let i = 0; i < sortedPunti.length - 1; i++) {
    const p1 = sortedPunti[i];
    const p2 = sortedPunti[i + 1];
    if (value >= p1.concentrazione && value <= p2.concentrazione) {
      if (p2.concentrazione === p1.concentrazione) {
        return `± ${p1.ripetibilita}`;
      }
      const t = (value - p1.concentrazione) / (p2.concentrazione - p1.concentrazione);
      const ripetibilitaInterp = p1.ripetibilita + t * (p2.ripetibilita - p1.ripetibilita);
      
      const fraction = numericMatch[0].split('.')[1] || '';
      const decimals = Math.max(fraction.length, 2);
      return `± ${ripetibilitaInterp.toFixed(decimals)}`;
    }
  }

  return `± ${sortedPunti[0].ripetibilita}`;
}

// Helper per formattare i valori inferiori al LOQ standardizzando su "≤ [LOQ]" (senza duplicazioni come "< ≤")
export function checkIfValueBelowLOQ(valStr: string, loqStr?: string): string {
  if (!valStr) return valStr;

  const trimmedVal = valStr.trim();

  // Se il valore inserito o esistente inizia già con simboli di disuguaglianza (es. "< ≤ 0.05", "<≤ 0.05", "< 0.05", "<= 0.05", "≤ 0.05")
  if (/^[<≤=]+/.test(trimmedVal)) {
    const numPart = trimmedVal.replace(/^[<≤=\s]+/, '');
    return numPart ? `≤ ${numPart}` : trimmedVal;
  }

  if (!loqStr) return valStr;

  const cleanLoq = loqStr.trim().replace(/^[<≤=]+\s*/, '');
  const loqCleanNumStr = loqStr.trim().replace(',', '.');
  const valClean = trimmedVal.replace(',', '.');

  // Estrae il primo valore numerico da entrambi per il confronto
  const valMatch = valClean.match(/[-+]?[0-9]*\.?[0-9]+/);
  const loqMatch = loqCleanNumStr.match(/[-+]?[0-9]*\.?[0-9]+/);

  if (valMatch && loqMatch) {
    const valNum = parseFloat(valMatch[0]);
    const loqNum = parseFloat(loqMatch[0]);

    if (!isNaN(valNum) && !isNaN(loqNum)) {
      if (valNum < loqNum) {
        return `≤ ${cleanLoq || loqStr.trim()}`;
      }
    }
  }
  return valStr;
}

// Helper per garantire che all'anteprima/stampa RdP i valori sotto LOQ siano presentati come "≤ [LOQ]" senza mai mostrare "< ≤"
export function formatValoreRilevatoDisplay(val?: string): string {
  if (!val) return '';
  const trimmed = val.trim();
  if (/^[<≤=]+/.test(trimmed)) {
    const cleanNum = trimmed.replace(/^[<≤=\s]+/, '');
    return cleanNum ? `≤ ${cleanNum}` : trimmed;
  }
  return trimmed;
}

// Helper modulare per calcolare e sincronizzare automaticamente risultato, LOQ e incertezza
export function computeUpdatedResultRow(
  val: string, 
  prova: Prova, 
  existingRow: Partial<RisultatoProva> = {}
): RisultatoProva {
  const isLowerThanLoq = isValueLowerThanLoq(val, prova.limiteQuantificazione) || val.trim().startsWith('<') || val.trim().startsWith('≤');
  const updatedRow: RisultatoProva = { 
    ...existingRow,
    provaId: prova.id,
    valoreRilevato: val,
    incertezza: existingRow.incertezza || '',
    incertezzaPercentuale: existingRow.incertezzaPercentuale || '',
    escludiIncertezza: existingRow.escludiIncertezza || false,
  };

  if (updatedRow.escludiIncertezza || isLowerThanLoq) {
    updatedRow.incertezza = 'N/D';
    updatedRow.incertezzaPercentuale = '';
  } else if (prova.puntiIncertezza && prova.puntiIncertezza.length > 0) {
    const automatedResult = calculateAutomatedUncertainty(val, prova.puntiIncertezza);
    if (automatedResult) {
      updatedRow.incertezza = automatedResult.incertezza;
      updatedRow.incertezzaPercentuale = automatedResult.incertezzaPercentuale;
    } else {
      updatedRow.incertezza = 'N/D';
      updatedRow.incertezzaPercentuale = '';
    }
  } else if (updatedRow.incertezza && updatedRow.incertezza !== 'N/D') {
    const cleanedVal = val.replace(',', '.');
    const valMatch = cleanedVal.match(/[-+]?[0-9]*\.?[0-9]+/);
    const cleanedInc = updatedRow.incertezza.replace('±', '').trim().replace(',', '.');
    const incMatch = cleanedInc.match(/[-+]?[0-9]*\.?[0-9]+/);
    if (valMatch && incMatch) {
      const xVal = parseFloat(valMatch[0]);
      const yVal = parseFloat(incMatch[0]);
      if (!isNaN(xVal) && xVal !== 0 && !isNaN(yVal)) {
        const pct = (yVal / Math.abs(xVal)) * 100;
        const fraction = valMatch[0].split('.')[1] || '';
        const precision = Math.max(fraction.length, 2);
        updatedRow.incertezzaPercentuale = `${pct.toFixed(precision)}%`;
      }
    }
  } else if (updatedRow.incertezzaPercentuale) {
    const cleaned = val.replace(',', '.');
    const numericMatch = cleaned.match(/[-+]?[0-9]*\.?[0-9]+/);
    const pctFloat = parseFloat(updatedRow.incertezzaPercentuale.replace('%', '').trim());
    if (numericMatch && !isNaN(pctFloat)) {
      const value = parseFloat(numericMatch[0]);
      const expanded = value * (pctFloat / 100);
      const fraction = numericMatch[0].split('.')[1] || '';
      const precision = Math.max(fraction.length, 2);
      updatedRow.incertezza = `± ${expanded.toFixed(precision)}`;
    }
  }

  return updatedRow;
}

interface SearchableSelectProps<T> {
  items: T[];
  value: string;
  onChange: (value: string) => void;
  getDisplayValue: (item: T) => string;
  getSearchText: (item: T) => string;
  getItemId: (item: T) => string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  renderItem?: (item: T) => React.ReactNode;
}

function SearchableSelect<T>({
  items,
  value,
  onChange,
  getDisplayValue,
  getSearchText,
  getItemId,
  placeholder = "Seleziona...",
  disabled = false,
  required = false,
  renderItem
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedItem = items.find(item => getItemId(item) === value);
  const displayLabel = selectedItem ? getDisplayValue(selectedItem) : '';

  const filteredItems = items.filter(item => {
    const searchText = getSearchText(item).toLowerCase();
    const query = search.toLowerCase();
    return searchText.includes(query);
  });

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-3 py-2 border rounded-lg text-xs font-semibold cursor-pointer select-none transition-colors ${
          disabled 
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' 
            : isOpen 
            ? 'border-indigo-500 bg-white shadow-xs ring-1 ring-indigo-500' 
            : required && !value
            ? 'border-rose-300 bg-rose-50/10 hover:bg-rose-50/20'
            : 'border-slate-200 bg-white hover:bg-slate-50'
        }`}
      >
        <div className="truncate pr-4 flex-1">
          {isOpen ? (
            <input
              type="text"
              autoFocus
              placeholder="Digita per cercare..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-transparent border-none p-0 focus:outline-none text-xs font-semibold text-slate-800"
            />
          ) : (
            <span className={selectedItem ? "text-slate-800 font-bold" : "text-slate-400"}>
              {displayLabel || placeholder}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearch('');
              }}
              className="hover:text-slate-600 p-0.5"
              title="Cancella selezione"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto py-1 animate-fadeIn">
          {filteredItems.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 italic">Nessun elemento trovato</div>
          ) : (
            filteredItems.map((item) => {
              const itemId = getItemId(item);
              const isSelected = itemId === value;
              return (
                <div
                  key={itemId}
                  onClick={() => {
                    onChange(itemId);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`px-3 py-2 text-xs font-semibold cursor-pointer transition-colors flex items-center justify-between ${
                    isSelected 
                      ? 'bg-indigo-50 text-indigo-700 font-bold' 
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="truncate flex-1">
                    {renderItem ? renderItem(item) : getDisplayValue(item)}
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0 ml-2" />}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

interface ArchivioComboboxProps {
  title?: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  onSaveNew: (val: string) => void;
  onUpdate: (oldVal: string, newVal: string) => void;
  onDelete: (val: string) => void;
  placeholder?: string;
  quickAddPlaceholder?: string;
}

function ArchivioCombobox({
  title = "Voci Archivio",
  value,
  onChange,
  options,
  onSaveNew,
  onUpdate,
  onDelete,
  placeholder = "Seleziona o digita...",
  quickAddPlaceholder = "+ Inserisci nuova voce nell'archivio...",
}: ArchivioComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [deletingItem, setDeletingItem] = useState<string | null>(null);
  const [newItemInput, setNewItemInput] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setEditingItem(null);
        setDeletingItem(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Normalizza eventuale visualizzazione di vecchi valori come 'titolare', 'corriere', 'altro'
  const displayValue = value === 'titolare' 
    ? 'Titolare / Delegato' 
    : value === 'corriere' 
    ? 'Corriere / Spedizioniere' 
    : value === 'altro' 
    ? 'Altro soggetto' 
    : value;

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes((displayValue || '').toLowerCase())
  );

  const isExactMatch = options.some(
    opt => opt.toLowerCase() === (displayValue || '').trim().toLowerCase()
  );

  const handleStartEdit = (opt: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingItem(null);
    setEditingItem(opt);
    setEditingValue(opt);
  };

  const handleSaveEdit = (oldOpt: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (editingValue.trim() && editingValue.trim() !== oldOpt) {
      onUpdate(oldOpt, editingValue.trim());
      if (displayValue === oldOpt || value === oldOpt) {
        onChange(editingValue.trim());
      }
    }
    setEditingItem(null);
  };

  const handleStartDelete = (opt: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItem(null);
    setDeletingItem(opt);
  };

  const handleConfirmDelete = (opt: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(opt);
    setDeletingItem(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingItem(null);
  };

  const handleQuickAdd = (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (newItemInput.trim()) {
      const clean = newItemInput.trim();
      onSaveNew(clean);
      onChange(clean);
      setNewItemInput('');
      setIsOpen(false);
    }
  };

  const handleSaveCurrentValue = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (displayValue.trim() && !isExactMatch) {
      const clean = displayValue.trim();
      onSaveNew(clean);
      onChange(clean);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input Unico con pulsanti integrati */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={displayValue}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-14 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800 transition shadow-2xs"
        />

        <div className="absolute right-1 flex items-center gap-0.5">
          {displayValue && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition cursor-pointer"
              title="Cancella campo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-slate-500 hover:text-indigo-700 rounded hover:bg-slate-100 transition cursor-pointer"
            title={`Apri elenco ${title}`}
          >
            <ChevronDown className={`h-4 w-4 transform transition-transform duration-150 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Menu a Discesa Interattivo */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-72 flex flex-col animate-in fade-in zoom-in-95 duration-100">
          {/* Intestazione archivio */}
          <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-150 flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span>{title} ({options.length})</span>
            {displayValue && !isExactMatch && (
              <span className="text-indigo-700 normal-case font-bold">Nuova voce non salvata</span>
            )}
          </div>

          {/* Salvataggio Rapido del Testo Digitato */}
          {displayValue.trim() && !isExactMatch && (
            <div className="p-1.5 bg-indigo-50/80 border-b border-indigo-150">
              <button
                type="button"
                onClick={handleSaveCurrentValue}
                className="w-full px-2 py-1 text-[11px] font-bold text-indigo-800 bg-indigo-100/90 hover:bg-indigo-200 rounded-lg flex items-center justify-between transition cursor-pointer"
              >
                <span className="truncate flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5 shrink-0" /> Salva &ldquo;{displayValue.trim()}&rdquo; nell&apos;archivio
                </span>
                <span className="text-[9px] uppercase tracking-wider bg-indigo-700 text-white px-1.5 py-0.5 rounded font-black shrink-0">Salva</span>
              </button>
            </div>
          )}

          {/* Elenco Scrollabile con Modifica ed Eliminazione Inline */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 italic">
                Nessuna voce trovata con &ldquo;{displayValue}&rdquo;
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.toLowerCase() === (displayValue || '').trim().toLowerCase();
                const isEditing = editingItem === opt;
                const isDeleting = deletingItem === opt;

                if (isDeleting) {
                  return (
                    <div key={opt} className="p-2 bg-red-50 text-red-900 flex items-center justify-between gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="text-xs font-semibold truncate flex items-center gap-1">
                        <Trash2 className="h-3.5 w-3.5 text-red-600 shrink-0" />
                        <span>Eliminare <strong className="text-red-700">&ldquo;{opt}&rdquo;</strong>?</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleConfirmDelete(opt, e)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold transition cursor-pointer shadow-xs"
                        >
                          Elimina
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelDelete}
                          className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[11px] font-medium transition cursor-pointer"
                        >
                          Annulla
                        </button>
                      </div>
                    </div>
                  );
                }

                if (isEditing) {
                  return (
                    <div key={opt} className="p-1.5 bg-amber-50/80 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(opt, e);
                          if (e.key === 'Escape') setEditingItem(null);
                        }}
                        className="flex-1 px-2 py-1 text-xs border border-amber-400 bg-white rounded font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={(e) => handleSaveEdit(opt, e)}
                        className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition cursor-pointer"
                        title="Conferma modifica voce"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(null);
                        }}
                        className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 transition cursor-pointer"
                        title="Annulla"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={opt}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={`group px-2.5 py-1.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-bold'
                        : 'hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-2">
                      {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                      <span className="truncate">{opt}</span>
                    </div>

                    {/* Azioni rapide per voce: Modifica e Cancella */}
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleStartEdit(opt, e)}
                        className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                        title="Modifica questa voce nell'archivio"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleStartDelete(opt, e)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                        title="Elimina questa voce dall'archivio"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Inserimento Rapido Nuova Voce */}
          <div className="p-2 bg-slate-50 border-t border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder={quickAddPlaceholder}
                value={newItemInput}
                onChange={(e) => setNewItemInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleQuickAdd(e);
                  }
                }}
                className="flex-1 px-2 py-1 text-xs border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
              />
              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={!newItemInput.trim()}
                className="px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus className="h-3 w-3" /> Salva
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const QualitaConsegnanteCombobox = ArchivioCombobox;

export interface Nota1PresetItem {
  id: string;
  nome: string;
  testo: string;
}

export const DEFAULT_NOTA1_MODELS: Nota1PresetItem[] = [
  {
    id: 'nota1-standard-ufficiale',
    nome: 'Standard Ufficiale (Incertezza estesa e riproducibilità)',
    testo: `Il presente Rapporto riguarda esclusivamente il campione sottoposto a prova ed esso non può essere riprodotto parzialmente, se non previa autorizzazione scritta da parte di questo Laboratorio. I risultati si riferiscono al campione così come ricevuto. L'incertezza estesa per le prove chimiche, ove riportata, è espressa con un fattore di copertura K=2 che per una distribuzione normale dei dati, corrisponde a un livello di fiducia di circa 95%. L'incertezza estesa per le prove microbiologiche, ove riportata, è espressa come intervallo di fiducia con un fattore di copertura K=1,96 corrispondente a un livello di fiducia di circa 95%.`
  },
  {
    id: 'nota1-campione-conforme',
    nome: 'Campione Conforme / Tal Quale Ricevuto',
    testo: `Il campione è conforme ai parametri stabiliti. I risultati sono riferiti al campione tal quale consegnato dal committente.`
  },
  {
    id: 'nota1-riproduzione-riservata',
    nome: 'Riproduzione Riservata Laboratorio',
    testo: `Il presente Rapporto di Prova non può essere riprodotto parzialmente senza l'approvazione scritta del Laboratorio. I risultati si riferiscono unicamente al campione provato.`
  },
  {
    id: 'nota1-vuoto',
    nome: 'Nessuna Nota (Vuoto)',
    testo: ''
  }
];

interface AccettazioneSectionProps {
  accettazioni: AccettazioneCampione[];
  clients: Client[];
  preventivi: Preventivo[];
  prove: Prova[];
  pacchetti: Pacchetto[];
  onAddAccettazione: (newAcc: AccettazioneCampione) => void;
  onDeleteAccettazione: (id: string) => void;
  onUpdateAccettazione: (updatedAcc: AccettazioneCampione) => void;
  operators?: Operator[];
  onViewPreventivo?: (id: string, fromLabel?: string) => void;
  strumenti?: Strumento[];
  reagenti?: Reagente[];
  pendingPreventivoId?: string | null;
  onClearPendingPreventivo?: () => void;
  selectedAccettazioneId?: string | null;
  onClearSelectedAccettazioneId?: () => void;
  pendingClientId?: string | null;
  onClearPendingClientId?: () => void;
  onGoToClient?: (clientId: string, fromLabel?: string) => void;
  onGoToProva?: (provaId: string, fromLabel?: string) => void;
  onGoToAreeSpecialistiche?: (sampleId: string, module?: 'nutrizionale' | 'rifiuti', fromLabel?: string) => void;
  onGoToFatturazione?: (query: string, fromLabel?: string) => void;
  onStartRevisionBozza?: (accettazioneId: string, motivo: string, tipologia: string, operatore: string) => void;
  onOpenDiffModal?: (accId: string) => void;
}

export function AccettazioneSection({
  accettazioni,
  clients,
  preventivi,
  prove,
  pacchetti,
  onAddAccettazione,
  onDeleteAccettazione,
  onUpdateAccettazione,
  operators,
  onViewPreventivo,
  strumenti = [],
  reagenti = [],
  pendingPreventivoId,
  onClearPendingPreventivo,
  selectedAccettazioneId,
  onClearSelectedAccettazioneId,
  pendingClientId,
  onClearPendingClientId,
  onGoToClient,
  onGoToProva,
  onGoToAreeSpecialistiche,
  onGoToFatturazione,
  onStartRevisionBozza,
  onOpenDiffModal
 }: AccettazioneSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMatrice, setSelectedMatrice] = useState<string>('Tutte');
  const [selectedTecnico, setSelectedTecnico] = useState<string>('Tutti');
  const [selectedAnno, setSelectedAnno] = useState<string>('Tutti');
  const [selectedStatoFiltro, setSelectedStatoFiltro] = useState<'Tutti' | 'In Attesa' | 'In Corso' | 'Completato' | 'Scadenza'>('Tutti');
  const [showForm, setShowForm] = useState(false);
  const [editingAcc, setEditingAcc] = useState<AccettazioneCampione | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Stati per la gestione risultati e certificati (Richiesta Utente)
  const [editingResultsAccId, setEditingResultsAccId] = useState<string | null>(null);
  const [tempRisultati, setTempRisultati] = useState<Record<string, Partial<RisultatoProva>>>({});
  const [previewReportAcc, setPreviewReportAcc] = useState<AccettazioneCampione | null>(null);
  const [previewVerbaleAcc, setPreviewVerbaleAcc] = useState<AccettazioneCampione | null>(null);

  // Stati per avvio rapido Revisione Controllata RdP (ISO/IEC 17025 §7.8.8) direttamente dalla scheda campione
  const [revModalAcc, setRevModalAcc] = useState<AccettazioneCampione | null>(null);
  const [revTipologia, setRevTipologia] = useState<string>('Rettifica valore analitico / ricalcolo');
  const [revMotivo, setRevMotivo] = useState<string>('');
  const [revOperatore, setRevOperatore] = useState<string>('');

  const handleCloseReportAndReturnToList = () => {
    setPreviewReportAcc(null);
    setExpandedId(null);
    setEditingResultsAccId(null);
    setTempRisultati({});
    setAppliedFeedbackMsg(null);
  };
  const [activeCalcRowId, setActiveCalcRowId] = useState<string | null>(null);
  const [openQuadernoRowId, setOpenQuadernoRowId] = useState<string | null>(null);
  const [openRepeatabilityRowId, setOpenRepeatabilityRowId] = useState<string | null>(null);
  const [idrocarburiModalProva, setIdrocarburiModalProva] = useState<Prova | null>(null);
  const [showLabNotebookInPrint, setShowLabNotebookInPrint] = useState<boolean>(false);
  const [modelloRdpText, setModelloRdpText] = useState<string>(() => localStorage.getItem('lims_modello_rdp') || 'Modello 1 Rev. 1');
  const [rdpPaginationMode, setRdpPaginationMode] = useState<'auto' | '1-page' | '2-pages'>('auto');
  const [appliedFeedbackMsg, setAppliedFeedbackMsg] = useState<{ provaNome: string; val: string; rowId: string } | null>(null);

  // Stati per Assistente Calcolo Modulare Kjeldahl (4 Fasi)
  const [kjeldahlMassaKHP, setKjeldahlMassaKHP] = useState<number | string>(0.2042);
  const [kjeldahlVolNaOH_KHP, setKjeldahlVolNaOH_KHP] = useState<number | string>(10.05);
  const [kjeldahlVolHCl, setKjeldahlVolHCl] = useState<number | string>(10.00);
  const [kjeldahlVolNaOH_HCl, setKjeldahlVolNaOH_HCl] = useState<number | string>(10.05);
  const [kjeldahlTitoloNaOH, setKjeldahlTitoloNaOH] = useState<number | string>(0.0995);
  const [kjeldahlTitoloHCl, setKjeldahlTitoloHCl] = useState<number | string>(0.1000);
  const [kjeldahlVolBianco, setKjeldahlVolBianco] = useState<number | string>(0.05);
  const [kjeldahlVolCampione, setKjeldahlVolCampione] = useState<number | string>(12.45);
  const [kjeldahlPesoCampione, setKjeldahlPesoCampione] = useState<number | string>(1.0500);
  const [kjeldahlFattoreF, setKjeldahlFattoreF] = useState<number>(6.25);
  const [kjeldahlActiveTab, setKjeldahlActiveTab] = useState<'standard' | 'kjeldahl_wizard'>('standard');

  useEffect(() => {
    localStorage.setItem('lims_modello_rdp', modelloRdpText);
  }, [modelloRdpText]);
  const [coverageFactor, setCoverageFactor] = useState<number>(2);

  // Stati per personalizzazione Note e Dichiarazioni del Rapporto di Prova (Richiesta Utente)
  const [customNota1, setCustomNota1] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('lims_custom_nota_1');
      return stored || `Il presente Rapporto riguarda esclusivamente il campione sottoposto a prova ed esso non può essere riprodotto parzialmente, se non previa autorizzazione scritta da parte di questo Laboratorio. I risultati si riferiscono al campione così come ricevuto. L'incertezza estesa per le prove chimiche, ove riportata, è espressa con un fattore di copertura K=2 che per una distribuzione normale dei dati, corrisponde a un livello di fiducia di circa 95%. L'incertezza estesa per le prove microbiologiche, ove riportata, è espressa come intervallo di fiducia con un fattore di copertura K=1,96 corrispondente a un livello di fiducia di circa 95%.`;
    } catch {
      return `Il presente Rapporto riguarda esclusivamente il campione sottoposto a prova ed esso non può essere riprodotto parzialmente, se non previa autorizzazione scritta da parte di questo Laboratorio. I risultati si riferiscono al campione così come ricevuto. L'incertezza estesa per le prove chimiche, ove riportata, è espressa con un fattore di copertura K=2 che per una distribuzione normale dei dati, corrisponde a un livello di fiducia di circa 95%. L'incertezza estesa per le prove microbiologiche, ove riportata, è espressa come intervallo di fiducia con un fattore di copertura K=1,96 corrispondente a un livello di fiducia di circa 95%.`;
    }
  });

  const [nota1Presets, setNota1Presets] = useState<Nota1PresetItem[]>(() => {
    try {
      const stored = localStorage.getItem('lims_nota1_presets_v3');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any, idx: number) => {
            if (typeof item === 'string') {
              return {
                id: `nota1-${idx}-${Date.now()}`,
                nome: item.length > 35 ? `${item.substring(0, 35)}...` : item || `Modello Nota ${idx + 1}`,
                testo: item
              };
            }
            return {
              id: item.id || `nota1-${idx}-${Date.now()}`,
              nome: item.nome || (item.testo ? (item.testo.length > 35 ? `${item.testo.substring(0, 35)}...` : item.testo) : `Modello Nota ${idx + 1}`),
              testo: item.testo || ''
            };
          });
        }
      }
      const oldStored = localStorage.getItem('lims_nota1_presets');
      if (oldStored) {
        const oldParsed = JSON.parse(oldStored);
        if (Array.isArray(oldParsed) && oldParsed.length > 0) {
          return oldParsed.map((item: any, idx: number) => {
            if (typeof item === 'string') {
              return {
                id: `nota1-migrated-${idx}`,
                nome: item.length > 35 ? `${item.substring(0, 35)}...` : item || `Modello Nota ${idx + 1}`,
                testo: item
              };
            }
            return {
              id: item.id || `nota1-migrated-${idx}`,
              nome: item.nome || `Modello Nota ${idx + 1}`,
              testo: item.testo || ''
            };
          });
        }
      }
    } catch {}
    return DEFAULT_NOTA1_MODELS;
  });

  const [selectedNota1ModelId, setSelectedNota1ModelId] = useState<string>('');
  const [nota1ModelNameInput, setNota1ModelNameInput] = useState<string>('');

  const [selectedDichiarazioniType, setSelectedDichiarazioniType] = useState<'conformita' | 'opinioni'>('conformita');
  const [selectedDichiarazioniCategory, setSelectedDichiarazioniCategory] = useState<string>('Acqua Potabile');

  const [selectedDichiarazioneId, setSelectedDichiarazioneId] = useState<string>('');
  const [selectedOpinioniId, setSelectedOpinioniId] = useState<string>('');
  const [isNotesConfigOpen, setIsNotesConfigOpen] = useState<boolean>(true);
  const [isDichiarazioniConfigOpen, setIsDichiarazioniConfigOpen] = useState<boolean>(true);
  const [isNota1ConfigOpen, setIsNota1ConfigOpen] = useState<boolean>(true);

  useEffect(() => {
    try {
      localStorage.setItem('lims_nota1_presets_v3', JSON.stringify(nota1Presets));
    } catch {}
  }, [nota1Presets]);

  const [printLocation, setPrintLocation] = useState<string>('L\'Aquila');
  const [printDate, setPrintDate] = useState<string>(() => {
    // Return today in YYYY-MM-DD
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  });


  const [opinioniDizionario, setOpinioniDizionario] = useState<Record<string, Array<{ id: string; testo: string; tipo: 'conformita' | 'opinioni' }>>>(() => {
    try {
      const stored = localStorage.getItem('lims_opinioni_dizionario');
      if (stored) return JSON.parse(stored);
    } catch {}
    
    return {
      'Acqua Potabile': [
        { id: '1', testo: 'I parametri chimici e microbiologici determinati nel campione in esame risultano conformi ai requisiti previsti dal D.Lgs. 18/2023 per le acque destinate al consumo umano.', tipo: 'conformita' },
        { id: '2', testo: 'L\'analisi mostra un\'ottima stabilità microbiologica ed un profilo minerale ideale per il consumo ordinario.', tipo: 'opinioni' }
      ],
      'Olio EVO': [
        { id: '3', testo: 'Sulla base dei parametri analizzati, il campione risulta classificabile come Olio Extra Vergine di Oliva ai sensi del Reg. CEE 2568/91 e successive modifiche.', tipo: 'conformita' }
      ],
      'Sfarinati': [
        { id: '4', testo: 'Il campione analizzato risulta conforme ai requisiti della Legge 4 luglio 1967, n. 580 in materia di sfarinati di grano tenero.', tipo: 'conformita' }
      ],
      'Generico': [
        { id: '5', testo: 'Il campione di cui sopra, relativamente ai parametri determinati, è risultato conforme ai requisiti microbiologici e chimici previsti dalle vigenti normative di settore.', tipo: 'conformita' }
      ]
    };
  });

  // Teniamo traccia della selezione corrente per il certificato emesso
  const [selectedOpinioniIds, setSelectedOpinioniIds] = useState<string[]>([]);

  // Caricamento dinamico dei default per la categoria merceologica corrente quando cambia previewReportAcc
  useEffect(() => {
    if (previewReportAcc) {
      const currentCategory = (previewReportAcc.categoriaMerceologica || previewReportAcc.matrice || 'Generico').trim();
      // Trova la chiave corrispondente (case-insensitive o con fallback)
      let foundKey = 'Generico';
      const keys = Object.keys(opinioniDizionario);
      const match = keys.find(k => k.toLowerCase() === currentCategory.toLowerCase());
      if (match) {
        foundKey = match;
      } else {
        // se non esiste, creiamo la categoria vuota nel dizionario per permettere l'inserimento
        setOpinioniDizionario(prev => {
          if (prev[currentCategory]) return prev;
          return { ...prev, [currentCategory]: [] };
        });
        foundKey = currentCategory;
      }
      
      const initialIds = (opinioniDizionario[foundKey] || []).map(o => o.id);
      setSelectedOpinioniIds(initialIds);
    } else {
      setSelectedOpinioniIds([]);
    }
  }, [previewReportAcc]);

  // Persistenza delle note ed opinioni su localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lims_custom_nota_1', customNota1);
    } catch {}
  }, [customNota1]);

  useEffect(() => {
    try {
      localStorage.setItem('lims_opinioni_dizionario', JSON.stringify(opinioniDizionario));
    } catch {}
  }, [opinioniDizionario]);

  // Stati per modelli di formule personalizzati del quaderno di laboratorio (Richiesta LIMS)
  const [customFormulaPresets, setCustomFormulaPresets] = useState<FormulaPreset[]>(() => {
    try {
      const stored = localStorage.getItem('lims_custom_formula_presets');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [confirmDeletePreset, setConfirmDeletePreset] = useState<{ rowId: string; index: number } | null>(null);

  // Stati per il form di creazione/salvataggio di un nuovo modello
  const [showSaveModelFormId, setShowSaveModelFormId] = useState<string | null>(null); // memorizza provaId
  const [newModelName, setNewModelName] = useState('');
  const [newModelDesc, setNewModelDesc] = useState('');

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result as string);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        
        const valid: FormulaPreset[] = [];
        for (const item of list) {
          if (item && item.nome && item.formula) {
            valid.push({
              nome: String(item.nome),
              descrizione: String(item.descrizione || ''),
              formula: String(item.formula),
              variabili: Array.isArray(item.variabili) ? item.variabili.map((v: any) => ({
                simbolo: String(v.simbolo || 'X'),
                descrizione: String(v.descrizione || ''),
                valore: typeof v.valore === 'number' ? v.valore : 1.0
              })) : []
            });
          }
        }
        
        if (valid.length > 0) {
          setCustomFormulaPresets(prev => {
            const updated = [...prev, ...valid];
            localStorage.setItem('lims_custom_formula_presets', JSON.stringify(updated));
            return updated;
          });
          alert(`Modelli importati con successo: di ${valid.length} formule LIMS configurate!`);
        } else {
          alert("Il file caricato non contiene modelli validi.");
        }
      } catch (err) {
        alert("Errore durante la lettura del file JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Form Field States
  const [descrizione, setDescrizione] = useState('');
  const [matrice, setMatrice] = useState('Oli e Grassi');
  const [customMatrice, setCustomMatrice] = useState('');
  const [quantita, setQuantita] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [statoInArrivo, setStatoInArrivo] = useState<'Idoneo' | 'Non Idoneo' | 'Accettato con Riserva'>('Idoneo');
  const [intestatarioId, setIntestatarioId] = useState('');
  const [destinatarioFatturaId, setDestinatarioFatturaId] = useState('');
  const [copiaFattura, setCopiaFattura] = useState(true);
  const [modalitaAccettazione, setModalitaAccettazione] = useState<'preventivo' | 'listino_diretto' | 'uso_interno'>('preventivo');
  const [preventivoId, setPreventivoId] = useState('');
  const [pacchettiDirettiSelezionati, setPacchettiDirettiSelezionati] = useState<string[]>([]);
  const [directTestsSearch, setDirectTestsSearch] = useState<string>('');
  const [directTestsCategoryFilter, setDirectTestsCategoryFilter] = useState<string>('Tutte');
  const [autoApprovalBanner, setAutoApprovalBanner] = useState<{ quoteCode: string; sampleCode: string; isEdit?: boolean } | null>(null);
  const [mostraPreventiviScaduti, setMostraPreventiviScaduti] = useState<boolean>(false);

  useEffect(() => {
    if (autoApprovalBanner) {
      const timer = setTimeout(() => {
        setAutoApprovalBanner(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [autoApprovalBanner]);

  const [proveSelezionateDaPreventivo, setProveSelezionateDaPreventivo] = useState<string[] | null>(null);
  
  // When preventivoId changes, by default we select ALL tests in that preventivo
  useEffect(() => {
    if (modalitaAccettazione === 'preventivo' && preventivoId && showForm) {
      if (editingAcc && editingAcc.preventivoAssociatoId === preventivoId) return; // Se stiamo modificando lo stesso preventivo, usiamo i valori già caricati
      const assocPrev = preventivi.find(p => p.id === preventivoId);
      if (assocPrev) {
        const allIds = new Set<string>();
        assocPrev.proveSelezionate?.forEach(item => allIds.add(item.provaId));
        assocPrev.pacchettiSelezionati?.forEach(item => {
          const pack = pacchetti.find(x => x.id === item.pacchettoId);
          pack?.proveIds?.forEach(pid => allIds.add(pid));
        });
        setProveSelezionateDaPreventivo(Array.from(allIds));
      } else {
        setProveSelezionateDaPreventivo(null);
      }
    }
  }, [modalitaAccettazione, preventivoId, showForm, editingAcc, preventivi, pacchetti]);

  const [consegna, setConsegna] = useState('');
  const [note, setNote] = useState('');
  const [statoAnalisi, setStatoAnalisi] = useState<'In Attesa' | 'In Corso' | 'Completato' | 'Annullato'>('In Attesa');
  const [operator, setOperator] = useState<string>(() => {
    return operators && operators.length > 0 ? operators[0].nome : 'Dott. Chim. F. Lupo';
  });
  const [operatorRuolo, setOperatorRuolo] = useState<string>(() => {
    return operators && operators.length > 0 ? (operators[0].ruolo || 'Responsabile Tecnico') : 'Responsabile Tecnico';
  });
  const [formOperatorPassword, setFormOperatorPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // States per Tracciabilità Cambio Stato Rapid Campione
  const [tracingAccId, setTracingAccId] = useState<string | null>(null);
  const [tracingAccField, setTracingAccField] = useState<'analisiStato' | 'statoInArrivo' | null>(null);
  const [tracingSelectedAccStatus, setTracingSelectedAccStatus] = useState<string>('');
  const [tracingAccOperator, setTracingAccOperator] = useState<string>(() => {
    return operators && operators.length > 0 ? operators[0].nome : 'Dott. Chim. F. Lupo';
  });
  const [tracingAccCustomOperator, setTracingAccCustomOperator] = useState<string>('');
  const [tracingAccPassword, setTracingAccPassword] = useState<string>('');
  const [tracingAccError, setTracingAccError] = useState<string | null>(null);
  const [tracingGiustificazione, setTracingGiustificazione] = useState<string>('');

  // Mappa delle password degli operatori del laboratorio centralizzata
  const OPERATOR_PASSWORDS = buildOperatorPasswordsMap(operators);

  // Nuovi stati richiesti per il Rapporto di Prova LIMS
  const [dataAccettazione, setDataAccettazione] = useState('');
  const [categoriaMerceologica, setCategoriaMerceologica] = useState('');
  const [informazioniCliente, setInformazioniCliente] = useState('');
  const [destinatarioFinale, setDestinatarioFinale] = useState('');
  const [isDestinatarioModificatoManualmente, setIsDestinatarioModificatoManualmente] = useState(false);
  const [etichettaCampione, setEtichettaCampione] = useState('');
  const [imballaggio, setImballaggio] = useState('');
  const [campionatoDa, setCampionatoDa] = useState('');
  const [proceduraCampionamento, setProceduraCampionamento] = useState('');
  const [oraRicevimento, setOraRicevimento] = useState('');
  const [dataInizioProva, setDataInizioProva] = useState('');
  const [dataTermineProva, setDataTermineProva] = useState('');
  const [giustificazioneNonIdoneita, setGiustificazioneNonIdoneita] = useState('');

  // Campi integrati aggiuntivi (Richiesta Utente)
  const [dataPrelievo, setDataPrelievo] = useState('');
  const [oraPrelievo, setOraPrelievo] = useState('');
  const [consegnanteRelazione, setConsegnanteRelazione] = useState('');
  const [puntoPrelievo, setPuntoPrelievo] = useState('');
  const [temperaturaTrasporto, setTemperaturaTrasporto] = useState('');
  const [temperaturaConservazioneLab, setTemperaturaConservazioneLab] = useState('');

  // Nuovi stati corrispondenti al Verbale di Accettazione MPG 07
  const [comunePrelievo, setComunePrelievo] = useState('');
  const [qualitaConsegnante, setQualitaConsegnante] = useState<string>('Titolare / Delegato');
  const [tempAccettazioneConforme, setTempAccettazioneConforme] = useState<'si' | 'no' | 'N/A'>('si');
  const [tempTrasportoConforme, setTempTrasportoConforme] = useState<'si' | 'no' | 'N/A'>('si');
  const [tempConservazioneConforme, setTempConservazioneConforme] = useState<'si' | 'no' | 'N/A'>('si');

  // Calcolo automatico della data di consegna risultati in base al preventivo o alle prove dirette selezionate
  useEffect(() => {
    const refDate = dataAccettazione ? new Date(dataAccettazione) : new Date();
    if (isNaN(refDate.getTime())) return;

    if (modalitaAccettazione !== 'preventivo' || !preventivoId) {
      let maxDaysDirect = 0;
      if (proveSelezionateDaPreventivo && proveSelezionateDaPreventivo.length > 0) {
        proveSelezionateDaPreventivo.forEach(pid => {
          const found = prove.find(pr => pr.id === pid);
          if (found && found.tempoEsecuzioneGiorni && found.tempoEsecuzioneGiorni > maxDaysDirect) {
            maxDaysDirect = found.tempoEsecuzioneGiorni;
          }
        });
      }
      const finalDaysDirect = maxDaysDirect > 0 ? maxDaysDirect : 7;
      refDate.setDate(refDate.getDate() + finalDaysDirect);
      setConsegna(refDate.toISOString().split('T')[0]);
      return;
    }

    const selectedPrev = preventivi.find(p => p.id === preventivoId);
    if (!selectedPrev) return;

    let maxDays = 0;

    // Tempi di esecuzione delle singole prove
    if (selectedPrev.proveSelezionate && selectedPrev.proveSelezionate.length > 0) {
      selectedPrev.proveSelezionate.forEach(item => {
        const found = prove.find(pr => pr.id === item.provaId);
        if (found && found.tempoEsecuzioneGiorni) {
          if (found.tempoEsecuzioneGiorni > maxDays) {
            maxDays = found.tempoEsecuzioneGiorni;
          }
        }
      });
    }

    // Tempi di esecuzione dei pacchetti
    if (selectedPrev.pacchettiSelezionati && selectedPrev.pacchettiSelezionati.length > 0) {
      selectedPrev.pacchettiSelezionati.forEach(item => {
        const foundPkg = pacchetti.find(pk => pk.id === item.pacchettoId);
        if (foundPkg && foundPkg.proveIds) {
          foundPkg.proveIds.forEach(pId => {
            const found = prove.find(pr => pr.id === pId);
            if (found && found.tempoEsecuzioneGiorni) {
              if (found.tempoEsecuzioneGiorni > maxDays) {
                maxDays = found.tempoEsecuzioneGiorni;
              }
            }
          });
        }
      });
    }

    const finalDays = maxDays > 0 ? maxDays : 7;
    refDate.setDate(refDate.getDate() + finalDays);
    setConsegna(refDate.toISOString().split('T')[0]);
  }, [modalitaAccettazione, preventivoId, proveSelezionateDaPreventivo, dataAccettazione, preventivi, prove, pacchetti]);

  // Archivi dropdown persistenti in localStorage
  const [archivioImballaggi, setArchivioImballaggi] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('archivio_imballaggi');
      return saved ? JSON.parse(saved) : [
        "Bottiglia in vetro scuro",
        "Bottiglia in plastica (PET)",
        "Barattolo in vetro",
        "Sacco in plastica",
        "Campione sigillato dal cliente",
        "Contenitore sterile",
        "Flacone in PE"
      ];
    } catch {
      return ["Bottiglia in vetro scuro", "Bottiglia in plastica (PET)", "Barattolo in vetro", "Sacco in plastica", "Campione sigillato dal cliente", "Contenitore sterile", "Flacone in PE"];
    }
  });

  const saveImballaggiArchivio = (list: string[]) => {
    setArchivioImballaggi(list);
    localStorage.setItem('archivio_imballaggi', JSON.stringify(list));
  };

  const handleSaveNewImballaggio = (newVal: string) => {
    const val = newVal.trim();
    if (!val) return;
    if (!archivioImballaggi.includes(val)) {
      const updated = [...archivioImballaggi, val];
      saveImballaggiArchivio(updated);
    }
  };

  const handleUpdateImballaggio = (oldVal: string, newVal: string) => {
    const cleanNew = newVal.trim();
    if (!cleanNew) return;
    const updated = archivioImballaggi.map(q => q === oldVal ? cleanNew : q);
    saveImballaggiArchivio(updated);
    if (imballaggio === oldVal) {
      setImballaggio(cleanNew);
    }
  };

  const handleDeleteImballaggio = (valToDelete: string) => {
    const updated = archivioImballaggi.filter(q => q !== valToDelete);
    saveImballaggiArchivio(updated);
    if (imballaggio === valToDelete) {
      setImballaggio(updated[0] || '');
    }
  };

  const [archivioEtichette, setArchivioEtichette] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('archivio_etichette_campione');
      return saved ? JSON.parse(saved) : [
        "Etichetta originale del produttore",
        "Etichetta apposta dal cliente con identificativo",
        "Cartellino identificativo del laboratorio",
        "Etichetta sigillo di garanzia integro",
        "Nessuna etichetta allegata",
        "Etichetta manoscritta"
      ];
    } catch {
      return [
        "Etichetta originale del produttore",
        "Etichetta apposta dal cliente con identificativo",
        "Cartellino identificativo del laboratorio",
        "Etichetta sigillo di garanzia integro",
        "Nessuna etichetta allegata",
        "Etichetta manoscritta"
      ];
    }
  });

  const saveEtichetteArchivio = (list: string[]) => {
    setArchivioEtichette(list);
    localStorage.setItem('archivio_etichette_campione', JSON.stringify(list));
  };

  const handleSaveNewEtichetta = (newVal: string) => {
    const val = newVal.trim();
    if (!val) return;
    if (!archivioEtichette.includes(val)) {
      const updated = [...archivioEtichette, val];
      saveEtichetteArchivio(updated);
    }
  };

  const handleUpdateEtichetta = (oldVal: string, newVal: string) => {
    const cleanNew = newVal.trim();
    if (!cleanNew) return;
    const updated = archivioEtichette.map(q => q === oldVal ? cleanNew : q);
    saveEtichetteArchivio(updated);
    if (etichettaCampione === oldVal) {
      setEtichettaCampione(cleanNew);
    }
  };

  const handleDeleteEtichetta = (valToDelete: string) => {
    const updated = archivioEtichette.filter(q => q !== valToDelete);
    saveEtichetteArchivio(updated);
    if (etichettaCampione === valToDelete) {
      setEtichettaCampione(updated[0] || '');
    }
  };

  const [archivioCampionatoDa, setArchivioCampionatoDa] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('archivio_campionato_da');
      return saved ? JSON.parse(saved) : [
        "A cura del Cliente",
        "Tecnico di Laboratorio",
        "Tecnico incaricato (A cura del Committente)",
        "Personale Tecnico Abilitato"
      ];
    } catch {
      return ["A cura del Cliente", "Tecnico di Laboratorio", "Tecnico incaricato (A cura del Committente)", "Personale Tecnico Abilitato"];
    }
  });

  const saveCampionatoDaArchivio = (list: string[]) => {
    setArchivioCampionatoDa(list);
    localStorage.setItem('archivio_campionato_da', JSON.stringify(list));
  };

  const handleSaveNewCampionatoDa = (newVal: string) => {
    const val = newVal.trim();
    if (!val) return;
    if (!archivioCampionatoDa.includes(val)) {
      const updated = [...archivioCampionatoDa, val];
      saveCampionatoDaArchivio(updated);
    }
  };

  const handleUpdateCampionatoDa = (oldVal: string, newVal: string) => {
    const cleanNew = newVal.trim();
    if (!cleanNew) return;
    const updated = archivioCampionatoDa.map(q => q === oldVal ? cleanNew : q);
    saveCampionatoDaArchivio(updated);
    if (campionatoDa === oldVal) {
      setCampionatoDa(cleanNew);
    }
  };

  const handleDeleteCampionatoDa = (valToDelete: string) => {
    const updated = archivioCampionatoDa.filter(q => q !== valToDelete);
    saveCampionatoDaArchivio(updated);
    if (campionatoDa === valToDelete) {
      setCampionatoDa(updated[0] || '');
    }
  };

  const [archivioProcedureCampionamento, setArchivioProcedureCampionamento] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('archivio_procedure_campionamento');
      return saved ? JSON.parse(saved) : [
        "Nessuna / Fornito direttamente dal cliente",
        "Regolamento CEE n. 2568/91 e s.m.i.",
        "UNI EN ISO 5555",
        "Rapporti dell'Istituto Superiore di Sanità",
        "Procedura interna PR-CAMP-01"
      ];
    } catch {
      return ["Nessuna / Fornito direttamente dal cliente", "Regolamento CEE n. 2568/91 e s.m.i.", "UNI EN ISO 5555", "Rapporti dell'Istituto Superiore di Sanità", "Procedura interna PR-CAMP-01"];
    }
  });

  const saveProcedureCampionamentoArchivio = (list: string[]) => {
    setArchivioProcedureCampionamento(list);
    localStorage.setItem('archivio_procedure_campionamento', JSON.stringify(list));
  };

  const handleSaveNewProceduraCampionamento = (newVal: string) => {
    const val = newVal.trim();
    if (!val) return;
    if (!archivioProcedureCampionamento.includes(val)) {
      const updated = [...archivioProcedureCampionamento, val];
      saveProcedureCampionamentoArchivio(updated);
    }
  };

  const handleUpdateProceduraCampionamento = (oldVal: string, newVal: string) => {
    const cleanNew = newVal.trim();
    if (!cleanNew) return;
    const updated = archivioProcedureCampionamento.map(q => q === oldVal ? cleanNew : q);
    saveProcedureCampionamentoArchivio(updated);
    if (proceduraCampionamento === oldVal) {
      setProceduraCampionamento(cleanNew);
    }
  };

  const handleDeleteProceduraCampionamento = (valToDelete: string) => {
    const updated = archivioProcedureCampionamento.filter(q => q !== valToDelete);
    saveProcedureCampionamentoArchivio(updated);
    if (proceduraCampionamento === valToDelete) {
      setProceduraCampionamento(updated[0] || '');
    }
  };

  const [archivioQualitaConsegnante, setArchivioQualitaConsegnante] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('archivio_qualita_consegnante');
      return saved ? JSON.parse(saved) : [
        "Titolare / Delegato",
        "Corriere / Spedizioniere",
        "Tecnico di Campionamento",
        "Committente",
        "Altro soggetto"
      ];
    } catch {
      return [
        "Titolare / Delegato",
        "Corriere / Spedizioniere",
        "Tecnico di Campionamento",
        "Committente",
        "Altro soggetto"
      ];
    }
  });

  const saveQualitaConsegnanteArchivio = (list: string[]) => {
    setArchivioQualitaConsegnante(list);
    localStorage.setItem('archivio_qualita_consegnante', JSON.stringify(list));
  };

  const handleSaveNewQualita = (newVal: string) => {
    const val = newVal.trim();
    if (!val) return;
    if (!archivioQualitaConsegnante.includes(val)) {
      const updated = [...archivioQualitaConsegnante, val];
      saveQualitaConsegnanteArchivio(updated);
    }
  };

  const handleUpdateQualita = (oldVal: string, newVal: string) => {
    const cleanNew = newVal.trim();
    if (!cleanNew) return;
    const updated = archivioQualitaConsegnante.map(q => q === oldVal ? cleanNew : q);
    saveQualitaConsegnanteArchivio(updated);
    if (qualitaConsegnante === oldVal) {
      setQualitaConsegnante(cleanNew);
    }
  };

  const handleDeleteQualita = (valToDelete: string) => {
    const updated = archivioQualitaConsegnante.filter(q => q !== valToDelete);
    saveQualitaConsegnanteArchivio(updated);
    if (qualitaConsegnante === valToDelete) {
      setQualitaConsegnante(updated[0] || '');
    }
  };

  const updateDestinatarioFinaleAutomaticamente = (clientId: string) => {
    if (!isDestinatarioModificatoManualmente) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setDestinatarioFinale(client.denominazione);
      } else {
        setDestinatarioFinale('');
      }
    }
  };

  // Stati per controllo manuale / personalizzazione del Codice Accettazione (N. Rapporto di Prova)
  const [customCodiceAccettazione, setCustomCodiceAccettazione] = useState<string>('');
  const [isCodiceAccettazioneManual, setIsCodiceAccettazioneManual] = useState<boolean>(false);

  // Calcola il contatore progressivo e il prossimo codice accettazione suggerito per l'anno di riferimento (reset a 1 ogni anno)
  const getSampleCounterInfo = (referenceDateOrYear?: string | number, excludeAccId?: string) => {
    let year: number;
    if (typeof referenceDateOrYear === 'number') {
      year = referenceDateOrYear;
    } else if (referenceDateOrYear && referenceDateOrYear.trim()) {
      const parsedYear = parseInt(referenceDateOrYear.trim().substring(0, 4), 10);
      year = !isNaN(parsedYear) && parsedYear > 1900 ? parsedYear : new Date().getFullYear();
    } else {
      year = new Date().getFullYear();
    }

    const prefix = `ACC-${year}-`;
    const matchingSamples = accettazioni.filter(a => {
      if (excludeAccId && a.id === excludeAccId) return false;
      return a.codiceAccettazione && a.codiceAccettazione.startsWith(prefix);
    });

    const siblingNums = matchingSamples.map(a => {
      const parts = a.codiceAccettazione.split('-');
      return parseInt(parts[parts.length - 1], 10) || 0;
    });

    const maxNum = siblingNums.length > 0 ? Math.max(...siblingNums) : 0;
    let nextNum = maxNum + 1;
    let suggestedCode = `${prefix}${nextNum.toString().padStart(4, '0')}`;
    while (accettazioni.some(a => a.id !== excludeAccId && a.codiceAccettazione.trim().toLowerCase() === suggestedCode.toLowerCase())) {
      nextNum++;
      suggestedCode = `${prefix}${nextNum.toString().padStart(4, '0')}`;
    }

    return {
      year,
      maxExisting: maxNum,
      nextNum,
      countForYear: matchingSamples.length,
      suggestedCode
    };
  };

  // Calcola il prossimo codice accettazione suggerito in base all'anno di accettazione (reset a 1 ogni anno)
  const generateSuggestedCode = (referenceDate?: string, excludeAccId?: string) => {
    return getSampleCounterInfo(referenceDate, excludeAccId).suggestedCode;
  };

  // Tutte le categorie merceologiche estratte dalle prove
  const categorieMerceologicheDisponibili = Array.from(
    new Set(prove.map(p => p.categoriaMerceologica).filter(Boolean))
  );

  const handleOpenAdd = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split('T')[0];

    setEditingAcc(null);
    setIsCodiceAccettazioneManual(false);
    setCustomCodiceAccettazione(generateSuggestedCode(todayStr));
    setDescrizione('');
    const defaultCat = categorieMerceologicheDisponibili[0] || 'Oli e Grassi';
    setMatrice(defaultCat);
    setCustomMatrice('');
    setQuantita('1 flacone da 500ml');
    setTemperatura('+18.0 °C');
    setStatoInArrivo('Idoneo');
    
    // Default to the first client if available
    const firstClient = clients[0]?.id || '';
    setIntestatarioId(firstClient);
    setDestinatarioFatturaId(firstClient);
    
    setModalitaAccettazione('preventivo');
    setPreventivoId('');
    setProveSelezionateDaPreventivo(null);
    setPacchettiDirettiSelezionati([]);
    setDirectTestsSearch('');
    setDirectTestsCategoryFilter('Tutte');

    setCopiaFattura(true);
    setConsegna(in7DaysStr);
    setNote('');
    setStatoAnalisi('In Attesa');
    const defaultOperator = operators && operators.length > 0 ? operators[0].nome : 'Dott. Chim. F. Lupo';
    const foundOp = (operators || []).find(o => o.nome === defaultOperator);
    const defaultRole = foundOp ? (foundOp.ruolo || 'Responsabile Tecnico') : 'Responsabile Tecnico';
    setOperator(defaultOperator);
    setOperatorRuolo(defaultRole);
    setFormOperatorPassword('');
    setFormError(null);

    // Nuovi campi LIMS (Accettazione)
    setDataAccettazione(todayStr);
    setCategoriaMerceologica('Analisi Agroalimentari / Oli di pressione');
    setInformazioniCliente('Campione fornito integro e idoneo per le determinazioni richieste.');
    const firstClientName = clients.find(c => c.id === firstClient)?.denominazione || '';
    setDestinatarioFinale(firstClientName);
    setIsDestinatarioModificatoManualmente(false);
    setEtichettaCampione('Etichetta originale del produttore');
    setImballaggio('Bottiglia in vetro scuro');
    setCampionatoDa('A cura del Cliente');
    setProceduraCampionamento('Regolamento CEE n. 2568/91 e s.m.i.');
    setOraRicevimento('10:30');
    setDataInizioProva(todayStr);
    setDataTermineProva(in7DaysStr);
    setGiustificazioneNonIdoneita('');

    // Campi integrati aggiuntivi (Richiesta Utente)
    setDataPrelievo(todayStr);
    setOraPrelievo('09:00');
    setConsegnanteRelazione('Persona incaricata dal cliente');
    setPuntoPrelievo('Punto di rete');
    setTemperaturaTrasporto('+4 °C');
    setTemperaturaConservazioneLab('+4 °C');

    // Nuovi campi per replica verbale accettazione PDF
    setComunePrelievo('');
    setQualitaConsegnante('Titolare / Delegato');
    setTempAccettazioneConforme('si');
    setTempTrasportoConforme('si');
    setTempConservazioneConforme('si');

    setShowForm(true);
  };

  const handleOpenEdit = (acc: AccettazioneCampione) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split('T')[0];

    setEditingAcc(acc);
    setIsCodiceAccettazioneManual(false);
    setCustomCodiceAccettazione(acc.codiceAccettazione);
    setDescrizione(acc.descrizioneCampione);
    setQuantita(acc.quantitaCampione);
    setTemperatura(acc.temperaturaArrivo || '');
    setStatoInArrivo(acc.statoInArrivo);
    setIntestatarioId(acc.intestatarioRapportoClienteId);
    setDestinatarioFatturaId(acc.destinatarioFatturaClienteId);
    setCopiaFattura(acc.intestatarioRapportoClienteId === acc.destinatarioFatturaClienteId);
    
    const resolvedEditMode = acc.modalitaAccettazione || (acc.preventivoAssociatoId ? 'preventivo' : 'listino_diretto');
    setModalitaAccettazione(resolvedEditMode);
    setPreventivoId(acc.preventivoAssociatoId || '');
    setProveSelezionateDaPreventivo(acc.proveSelezionateDaPreventivo || null);
    setPacchettiDirettiSelezionati(acc.pacchettiDirettiSelezionati || []);
    setDirectTestsSearch('');
    setDirectTestsCategoryFilter('Tutte');

    setConsegna(acc.consegnaPrevista || '');
    setNote(acc.noteLab || '');
    setStatoAnalisi(acc.analisiStato);
    const defaultOperator = operators && operators.length > 0 ? operators[0].nome : 'Dott. Chim. F. Lupo';
    const foundOp = (operators || []).find(o => o.nome === (acc.operatorRegistrazione || defaultOperator));
    const defaultRole = foundOp ? (foundOp.ruolo || 'Responsabile Tecnico') : 'Responsabile Tecnico';
    setOperator(acc.operatorRegistrazione || defaultOperator);
    setOperatorRuolo(acc.operatorRegistrazioneRuolo || defaultRole);
    setFormOperatorPassword('');
    setFormError(null);

    // Nuovi campi LIMS (Accettazione)
    setDataAccettazione(acc.dataAccettazione || todayStr);
    setCategoriaMerceologica(acc.categoriaMerceologica || 'Analisi Agroalimentari / Oli di pressione');
    setInformazioniCliente(acc.informazioniCliente || 'Campione fornito integro e idoneo per le determinazioni richieste.');
    
    const savedDest = acc.destinatarioFinale || '';
    const nameMatch = getClientDenominazione(acc.intestatarioRapportoClienteId);
    const isSameOrEmpty = !savedDest || savedDest === 'Stesso Committente' || savedDest === nameMatch;
    
    setDestinatarioFinale(isSameOrEmpty ? nameMatch : savedDest);
    setIsDestinatarioModificatoManualmente(!isSameOrEmpty);
    setEtichettaCampione(acc.etichettaCampione || 'Etichetta originale del produttore');
    setImballaggio(acc.imballaggio || 'Bottiglia in vetro scuro');
    setCampionatoDa(acc.campionatoDa || 'A cura del Cliente');
    setProceduraCampionamento(acc.proceduraCampionamento || 'Regolamento CEE n. 2568/91 e s.m.i.');
    setOraRicevimento(acc.oraRicevimento || '10:30');
    setDataInizioProva(acc.dataInizioProva || acc.dataAccettazione || todayStr);
    setDataTermineProva(acc.dataTermineProva || acc.consegnaPrevista || in7DaysStr);
    setGiustificazioneNonIdoneita(acc.giustificazioneNonIdoneita || '');

    // Campi integrati aggiuntivi (Richiesta Utente)
    setDataPrelievo(acc.dataPrelievo || todayStr);
    setOraPrelievo(acc.oraPrelievo || '09:00');
    setConsegnanteRelazione(acc.consegnanteRelazione || 'Persona incaricata dal cliente');
    setPuntoPrelievo(acc.puntoPrelievo || 'Punto di rete');
    setTemperaturaTrasporto(acc.temperaturaTrasporto || '+4 °C');
    setTemperaturaConservazioneLab(acc.temperaturaConservazioneLab || '+4 °C');

    // Carica nuovi campi per replica verbale accettazione PDF
    setComunePrelievo(acc.comunePrelievo || '');
    const rawQualita = acc.qualitaConsegnante || 'Titolare / Delegato';
    const mappedQualita = rawQualita === 'titolare' 
      ? 'Titolare / Delegato' 
      : rawQualita === 'corriere' 
      ? 'Corriere / Spedizioniere' 
      : rawQualita === 'altro' 
      ? 'Altro soggetto' 
      : rawQualita;
    setQualitaConsegnante(mappedQualita);
    setTempAccettazioneConforme(acc.tempAccettazioneConforme || 'si');
    setTempTrasportoConforme(acc.tempTrasportoConforme || 'si');
    setTempConservazioneConforme(acc.tempConservazioneConforme || 'si');

    if (categorieMerceologicheDisponibili.includes(acc.matrice)) {
      setMatrice(acc.matrice);
      setCustomMatrice('');
    } else {
      setMatrice('Altro...');
      setCustomMatrice(acc.matrice || '');
    }

    setShowForm(true);
  };

  // Clonazione rapida di un campione per accettazioni multiple dello stesso lotto/cliente
  const handleDuplicateAccettazione = (acc: AccettazioneCampione) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const in7Days = new Date();
    in7Days.setDate(in7Days.getDate() + 7);
    const in7DaysStr = in7Days.toISOString().split('T')[0];

    setEditingAcc(null);
    setIsCodiceAccettazioneManual(false);
    setCustomCodiceAccettazione(generateSuggestedCode(todayStr));
    setDescrizione(`${acc.descrizioneCampione} (Campione succ.)`);
    setQuantita(acc.quantitaCampione || '1 flacone da 500ml');
    setTemperatura(acc.temperaturaArrivo || '+18.0 °C');
    setStatoInArrivo('Idoneo');
    setIntestatarioId(acc.intestatarioRapportoClienteId);
    setDestinatarioFatturaId(acc.destinatarioFatturaClienteId);
    setCopiaFattura(acc.intestatarioRapportoClienteId === acc.destinatarioFatturaClienteId);

    const resolvedDupMode = acc.modalitaAccettazione || (acc.preventivoAssociatoId ? 'preventivo' : 'listino_diretto');
    setModalitaAccettazione(resolvedDupMode);
    setPreventivoId(acc.preventivoAssociatoId || '');
    setProveSelezionateDaPreventivo(acc.proveSelezionateDaPreventivo ? [...acc.proveSelezionateDaPreventivo] : null);
    setPacchettiDirettiSelezionati(acc.pacchettiDirettiSelezionati ? [...acc.pacchettiDirettiSelezionati] : []);
    setDirectTestsSearch('');
    setDirectTestsCategoryFilter('Tutte');

    setConsegna(acc.consegnaPrevista || in7DaysStr);
    setNote(acc.noteLab || '');
    setStatoAnalisi('In Attesa');
    const defaultOperator = operators && operators.length > 0 ? operators[0].nome : 'Dott. Chim. F. Lupo';
    const foundOp = (operators || []).find(o => o.nome === (acc.operatorRegistrazione || defaultOperator));
    const defaultRole = foundOp ? (foundOp.ruolo || 'Responsabile Tecnico') : 'Responsabile Tecnico';
    setOperator(acc.operatorRegistrazione || defaultOperator);
    setOperatorRuolo(acc.operatorRegistrazioneRuolo || defaultRole);
    setFormOperatorPassword('');
    setFormError(null);

    setDataAccettazione(todayStr);
    setCategoriaMerceologica(acc.categoriaMerceologica || acc.matrice || 'Generale');
    setInformazioniCliente(acc.informazioniCliente || 'Campione fornito integro e idoneo per le determinazioni richieste.');

    const savedDest = acc.destinatarioFinale || '';
    const nameMatch = getClientDenominazione(acc.intestatarioRapportoClienteId);
    const isSameOrEmpty = !savedDest || savedDest === 'Stesso Committente' || savedDest === nameMatch;
    setDestinatarioFinale(isSameOrEmpty ? nameMatch : savedDest);
    setIsDestinatarioModificatoManualmente(!isSameOrEmpty);

    setEtichettaCampione(acc.etichettaCampione || 'Etichetta originale del produttore');
    setImballaggio(acc.imballaggio || 'Bottiglia in vetro scuro');
    setCampionatoDa(acc.campionatoDa || 'A cura del Cliente');
    setProceduraCampionamento(acc.proceduraCampionamento || 'Regolamento CEE n. 2568/91 e s.m.i.');
    setOraRicevimento(acc.oraRicevimento || '10:30');
    setDataInizioProva(todayStr);
    setDataTermineProva(in7DaysStr);
    setGiustificazioneNonIdoneita('');

    setDataPrelievo(acc.dataPrelievo || todayStr);
    setOraPrelievo(acc.oraPrelievo || '09:00');
    setConsegnanteRelazione(acc.consegnanteRelazione || 'Persona incaricata dal cliente');
    setPuntoPrelievo(acc.puntoPrelievo || 'Punto di rete');
    setTemperaturaTrasporto(acc.temperaturaTrasporto || '+4 °C');
    setTemperaturaConservazioneLab(acc.temperaturaConservazioneLab || '+4 °C');
    setComunePrelievo(acc.comunePrelievo || '');
    setQualitaConsegnante(acc.qualitaConsegnante || 'Titolare / Delegato');
    setTempAccettazioneConforme(acc.tempAccettazioneConforme || 'si');
    setTempTrasportoConforme(acc.tempTrasportoConforme || 'si');
    setTempConservazioneConforme(acc.tempConservazioneConforme || 'si');

    if (categorieMerceologicheDisponibili.includes(acc.matrice)) {
      setMatrice(acc.matrice);
      setCustomMatrice('');
    } else {
      setMatrice('Altro...');
      setCustomMatrice(acc.matrice || '');
    }

    setShowForm(true);
  };

  // Auto-apertura scheda Nuova Accettazione quando si clicca "Crea Accettazione" da un Preventivo Approvato
  useEffect(() => {
    if (pendingPreventivoId) {
      const targetPrev = preventivi.find(p => p.id === pendingPreventivoId);
      if (targetPrev) {
        handleOpenAdd();
        const billClientId = targetPrev.clienteId;
        const rdpClientId = targetPrev.clienteFinaleId || targetPrev.clienteId;
        setDestinatarioFatturaId(billClientId);
        setIntestatarioId(rdpClientId);
        setCopiaFattura(billClientId === rdpClientId);
        setPreventivoId(targetPrev.id);

        const rdpClientName = clients.find(c => c.id === rdpClientId)?.denominazione || '';
        if (targetPrev.destinatarioFinale && targetPrev.destinatarioFinale !== 'Stesso Committente') {
          setDestinatarioFinale(targetPrev.destinatarioFinale);
          setIsDestinatarioModificatoManualmente(true);
        } else {
          setDestinatarioFinale(rdpClientName);
          setIsDestinatarioModificatoManualmente(false);
        }

        // Pre-imposta matrice/categoria dalla prima prova o pacchetto del preventivo
        const firstGroup = targetPrev.proveSelezionate?.find(x => x.gruppo && x.gruppo !== 'Generale')?.gruppo
          || targetPrev.pacchettiSelezionati?.find(x => x.gruppo && x.gruppo !== 'Generale')?.gruppo;
        const firstProvaCat = targetPrev.proveSelezionate?.[0]
          ? prove.find(pr => pr.id === targetPrev.proveSelezionate[0].provaId)?.categoriaMerceologica
          : targetPrev.pacchettiSelezionati?.[0]
          ? pacchetti.find(pk => pk.id === targetPrev.pacchettiSelezionati[0].pacchettoId)?.categoriaMerceologica
          : undefined;
        const suggestedMatrice = firstGroup || firstProvaCat;
        if (suggestedMatrice) {
          if (categorieMerceologicheDisponibili.includes(suggestedMatrice)) {
            setMatrice(suggestedMatrice);
            setCustomMatrice('');
          } else {
            setMatrice('Altro...');
            setCustomMatrice(suggestedMatrice);
          }
          setCategoriaMerceologica(suggestedMatrice);
          setDescrizione(`Campione rif. ${targetPrev.codice} (${suggestedMatrice})`);
        } else {
          setDescrizione(`Campione rif. ${targetPrev.codice}`);
        }
      }
      onClearPendingPreventivo?.();
    }
  }, [pendingPreventivoId]);

  // Auto-espansione e scroll quando si naviga a un campione specifico da un'altra area (per ID o per Codice Campione)
  useEffect(() => {
    if (selectedAccettazioneId) {
      const targetAcc = accettazioni.find(
        a => a.id === selectedAccettazioneId || a.codiceAccettazione === selectedAccettazioneId
      );
      if (targetAcc) {
        setShowForm(false);
        setSelectedMatrice('Tutte');
        setSelectedTecnico('Tutti');
        setSelectedAnno('Tutti');
        setSelectedStatoFiltro('Tutti');
        setSearchTerm('');
        setExpandedId(targetAcc.id);
        setTimeout(() => {
          const el = document.getElementById(`acc-row-${targetAcc.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 250);
      }
      onClearSelectedAccettazioneId?.();
    }
  }, [selectedAccettazioneId, accettazioni, onClearSelectedAccettazioneId]);

  // Auto-apertura form Nuova Accettazione pre-selezionando il cliente quando si arriva da Scheda Cliente
  useEffect(() => {
    if (pendingClientId) {
      const targetClient = clients.find(c => c.id === pendingClientId);
      if (targetClient) {
        handleOpenAdd();
        setIntestatarioId(targetClient.id);
        setDestinatarioFatturaId(targetClient.id);
        setCopiaFattura(true);
        setDestinatarioFinale(targetClient.denominazione);
        setIsDestinatarioModificatoManualmente(false);
      }
      onClearPendingClientId?.();
    }
  }, [pendingClientId, clients, onClearPendingClientId]);

  const handleCancel = () => {
    setShowForm(false);
    setEditingAcc(null);
    setFormOperatorPassword('');
    setFormError(null);
  };

  const handleIntestatarioChange = (id: string) => {
    setIntestatarioId(id);
    if (id !== destinatarioFatturaId) {
      setCopiaFattura(false);
    }
    updateDestinatarioFinaleAutomaticamente(id);
  };

  const handleClientePagatoreChange = (id: string) => {
    setDestinatarioFatturaId(id);
    if (copiaFattura) {
      setIntestatarioId(id);
      updateDestinatarioFinaleAutomaticamente(id);
    }
    if (modalitaAccettazione === 'preventivo') {
      // Auto-seleziona l'ultimo preventivo valido/attivo per quel cliente pagatore (Approvato o In Approvazione)
      const clientPrev = preventivi.filter(p => p.clienteId === id && (p.stato === 'Approvato' || p.stato === 'In Approvazione'));
      if (clientPrev.length > 0) {
        setPreventivoId(clientPrev[clientPrev.length - 1].id);
      } else {
        setPreventivoId('');
        setProveSelezionateDaPreventivo(null);
      }
    }
  };

  const handleCopiaFatturaChange = (checked: boolean) => {
    setCopiaFattura(checked);
    if (checked) {
      setIntestatarioId(destinatarioFatturaId);
      updateDestinatarioFinaleAutomaticamente(destinatarioFatturaId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalBillId = modalitaAccettazione === 'uso_interno' && !destinatarioFatturaId
      ? '__LAB_INTERNO__'
      : destinatarioFatturaId;
    const finalIntestatarioId = copiaFattura
      ? finalBillId
      : (modalitaAccettazione === 'uso_interno' && !intestatarioId ? '__LAB_INTERNO__' : intestatarioId);

    if (!descrizione.trim() || !finalIntestatarioId || !finalBillId) {
      setFormError("Compila tutti i campi obbligatori della scheda d'accettazione (inclusi Cliente Intestatario e Pagatore).");
      return;
    }

    if (modalitaAccettazione === 'preventivo' && !preventivoId) {
      setFormError("Errore di coerenza: Hai selezionato la modalità 'Con Preventivo / Contratto', ma non hai indicato alcun preventivo. Seleziona un preventivo oppure scegli 'Accettazione Diretta da Listino' o 'Uso Interno / Ring Test'.");
      return;
    }

    if (modalitaAccettazione !== 'preventivo' && (!proveSelezionateDaPreventivo || proveSelezionateDaPreventivo.length === 0)) {
      setFormError("Seleziona almeno una prova o un pacchetto analitico dal catalogo per registrare il campione.");
      return;
    }

    // Controllo se il preventivo selezionato è Scaduto o Rifiutato (solo in modalità preventivo)
    const selectedQuoteObj = modalitaAccettazione === 'preventivo' ? preventivi.find(p => p.id === preventivoId) : undefined;
    if (selectedQuoteObj) {
      if (selectedQuoteObj.stato === 'Scaduto') {
        const proceed = window.confirm(
          `⚠️ ATTENZIONE: Il preventivo selezionato (${selectedQuoteObj.codice}) risulta SCADUTO.\n\nProcedendo con l'accettazione, assocerai al campione un'offerta fuori dai termini di validità.\n\nVuoi procedere comunque?`
        );
        if (!proceed) return;
      } else if (selectedQuoteObj.stato === 'Rifiutato') {
        const proceed = window.confirm(
          `⛔ ATTENZIONE: Il preventivo selezionato (${selectedQuoteObj.codice}) risulta RIFIUTATO dal committente.\n\nVuoi procedere comunque con l'accettazione collegata a questo preventivo?`
        );
        if (!proceed) return;
      }
    }

    const isQuoteInApproval = selectedQuoteObj && selectedQuoteObj.stato === 'In Approvazione';
    const quoteCodeToNotify = selectedQuoteObj?.codice;

    // Validazione della password dell'operatore per la firma dell'Audit Trail di Accettazione
    const correctPassword = OPERATOR_PASSWORDS[operator] || 'lims123';
    if (formOperatorPassword !== correctPassword) {
      setFormError(`La password di firma inserita per l'operatore ${operator} non è corretta.`);
      return;
    }

    const finalMatrice = matrice === 'Altro...' ? customMatrice.trim() : matrice;

    if (editingAcc) {
      const history = editingAcc.statoHistory ? [...editingAcc.statoHistory] : [];
      const op = operator.trim() || 'Operatore Generico';
      const nowFormatted = new Date().toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      if (editingAcc.analisiStato !== statoAnalisi) {
        history.push({
          campoModificato: 'analisiStato',
          statoPrecedente: editingAcc.analisiStato,
          statoNuovo: statoAnalisi,
          dataOra: nowFormatted,
          operatore: op
        });
      }

      if (editingAcc.statoInArrivo !== statoInArrivo) {
        history.push({
          campoModificato: 'statoInArrivo',
          statoPrecedente: editingAcc.statoInArrivo,
          statoNuovo: statoInArrivo,
          dataOra: nowFormatted,
          operatore: op
        });
      }

      const finalEditCodice = (isCodiceAccettazioneManual && customCodiceAccettazione.trim())
        ? customCodiceAccettazione.trim()
        : (customCodiceAccettazione.trim() || editingAcc.codiceAccettazione);

      if (accettazioni.some(a => a.id !== editingAcc.id && a.codiceAccettazione.trim().toLowerCase() === finalEditCodice.toLowerCase())) {
        setFormError(`Attenzione: il codice accettazione / RdP "${finalEditCodice}" è già assegnato a un altro campione in archivio.`);
        return;
      }

      const updated: AccettazioneCampione = {
        ...editingAcc,
        codiceAccettazione: finalEditCodice,
        dataAccettazione: dataAccettazione || editingAcc.dataAccettazione,
        descrizioneCampione: descrizione.trim(),
        matrice: finalMatrice || 'Generale',
        quantitaCampione: quantita.trim() || 'N.D.',
        temperaturaArrivo: temperatura.trim() || undefined,
        statoInArrivo: statoInArrivo,
        intestatarioRapportoClienteId: finalIntestatarioId,
        destinatarioFatturaClienteId: finalBillId,
        modalitaAccettazione: modalitaAccettazione,
        preventivoAssociatoId: modalitaAccettazione === 'preventivo' ? (preventivoId || undefined) : undefined,
        proveSelezionateDaPreventivo: proveSelezionateDaPreventivo || undefined,
        pacchettiDirettiSelezionati: modalitaAccettazione !== 'preventivo' && pacchettiDirettiSelezionati.length > 0 ? pacchettiDirettiSelezionati : undefined,
        consegnaPrevista: consegna || undefined,
        noteLab: note.trim() || undefined,
        analisiStato: statoAnalisi,
        operatorRegistrazione: operator.trim(),
        operatorRegistrazioneRuolo: operatorRuolo.trim(),
        statoHistory: history,
        
        // Nuovi campi LIMS (Accettazione)
        categoriaMerceologica: finalMatrice,
        informazioniCliente: informazioniCliente.trim(),
        destinatarioFinale: (destinatarioFinale && destinatarioFinale.trim()) ? destinatarioFinale.trim() : getClientDenominazione(finalIntestatarioId),
        etichettaCampione: etichettaCampione.trim(),
        imballaggio: imballaggio.trim(),
        campionatoDa: campionatoDa.trim(),
        proceduraCampionamento: proceduraCampionamento.trim(),
        oraRicevimento: oraRicevimento.trim(),
        dataInizioProva: dataInizioProva || dataAccettazione || new Date().toISOString().split('T')[0],
        dataTermineProva: dataTermineProva || consegna || undefined,
        giustificazioneNonIdoneita: giustificazioneNonIdoneita.trim() || undefined,

        // Campi integrati aggiuntivi (Richiesta Utente)
        dataPrelievo: dataPrelievo.trim() || undefined,
        oraPrelievo: oraPrelievo.trim() || undefined,
        consegnanteRelazione: consegnanteRelazione.trim() || undefined,
        puntoPrelievo: puntoPrelievo.trim() || undefined,
        temperaturaTrasporto: temperaturaTrasporto.trim() || undefined,
        temperaturaConservazioneLab: temperaturaConservazioneLab.trim() || undefined,
        comunePrelievo: comunePrelievo.trim() || undefined,
        qualitaConsegnante: qualitaConsegnante,
        tempAccettazioneConforme: tempAccettazioneConforme,
        tempTrasportoConforme: tempTrasportoConforme,
        tempConservazioneConforme: tempConservazioneConforme
      };
      onUpdateAccettazione(updated);
      if (isQuoteInApproval && quoteCodeToNotify) {
        setAutoApprovalBanner({
          quoteCode: quoteCodeToNotify,
          sampleCode: finalEditCodice,
          isEdit: true
        });
      }
    } else {
      const deptSigners = getDepartmentSigners(operators);
      const firstRepar = deptSigners[0]?.nome;
      const secondRepar = deptSigners[1]?.nome;

      const techSigners = getTechnicalSigners(operators);
      const techSign = techSigners[0];

      const initialLog = {
        campoModificato: 'analisiStato' as const,
        statoPrecedente: undefined,
        statoNuovo: 'In Attesa' as const,
        dataOra: new Date().toLocaleString('it-IT', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        operatore: operator.trim() || 'Operatore Generico'
      };

      const targetDate = dataAccettazione || new Date().toISOString().split('T')[0];
      const finalNewCodice = (isCodiceAccettazioneManual && customCodiceAccettazione.trim())
        ? customCodiceAccettazione.trim()
        : generateSuggestedCode(targetDate);

      if (accettazioni.some(a => a.codiceAccettazione.trim().toLowerCase() === finalNewCodice.toLowerCase())) {
        setFormError(`Attenzione: il codice accettazione / RdP "${finalNewCodice}" è già assegnato a un altro campione in archivio. Usa un numero univoco o clicca su "Ricalcola Automatico".`);
        return;
      }

      const newAcc: AccettazioneCampione = {
        id: 'acc_' + Date.now(),
        codiceAccettazione: finalNewCodice,
        dataAccettazione: targetDate,
        descrizioneCampione: descrizione.trim(),
        matrice: finalMatrice || 'Generale',
        quantitaCampione: quantita.trim() || 'N.D.',
        temperaturaArrivo: temperatura.trim() || undefined,
        statoInArrivo: statoInArrivo,
        intestatarioRapportoClienteId: finalIntestatarioId,
        destinatarioFatturaClienteId: finalBillId,
        modalitaAccettazione: modalitaAccettazione,
        preventivoAssociatoId: modalitaAccettazione === 'preventivo' ? (preventivoId || undefined) : undefined,
        proveSelezionateDaPreventivo: proveSelezionateDaPreventivo || undefined,
        pacchettiDirettiSelezionati: modalitaAccettazione !== 'preventivo' && pacchettiDirettiSelezionati.length > 0 ? pacchettiDirettiSelezionati : undefined,
        consegnaPrevista: consegna || undefined,
        noteLab: note.trim() || undefined,
        analisiStato: 'In Attesa',
        operatorRegistrazione: operator.trim(),
        operatorRegistrazioneRuolo: operatorRuolo.trim(),
        statoHistory: [initialLog],

        // Pre-popolamento automatico firmatari consigliati
        firmatarioReparto1: firstRepar || undefined,
        firmatarioReparto2: secondRepar || undefined,
        firmatarioTecnico: techSign?.nome || undefined,
        ruoloFirmatarioTecnico: (techSign?.ruoloFirma || 'V.ce Responsabile Tecnico') as any,

        // Nuovi campi LIMS (Accettazione) - popolati in automatico per coerenza
        categoriaMerceologica: finalMatrice,
        informazioniCliente: informazioniCliente.trim(),
        destinatarioFinale: (destinatarioFinale && destinatarioFinale.trim()) ? destinatarioFinale.trim() : getClientDenominazione(finalIntestatarioId),
        etichettaCampione: etichettaCampione.trim(),
        imballaggio: imballaggio.trim(),
        campionatoDa: campionatoDa.trim(),
        proceduraCampionamento: proceduraCampionamento.trim(),
        oraRicevimento: oraRicevimento.trim(),
        dataInizioProva: dataInizioProva || dataAccettazione || new Date().toISOString().split('T')[0],
        dataTermineProva: dataTermineProva || consegna || undefined,
        giustificazioneNonIdoneita: giustificazioneNonIdoneita.trim() || undefined,

        // Campi integrati aggiuntivi (Richiesta Utente)
        dataPrelievo: dataPrelievo.trim() || undefined,
        oraPrelievo: oraPrelievo.trim() || undefined,
        consegnanteRelazione: consegnanteRelazione.trim() || undefined,
        puntoPrelievo: puntoPrelievo.trim() || undefined,
        temperaturaTrasporto: temperaturaTrasporto.trim() || undefined,
        temperaturaConservazioneLab: temperaturaConservazioneLab.trim() || undefined,
        comunePrelievo: comunePrelievo.trim() || undefined,
        qualitaConsegnante: qualitaConsegnante,
        tempAccettazioneConforme: tempAccettazioneConforme,
        tempTrasportoConforme: tempTrasportoConforme,
        tempConservazioneConforme: tempConservazioneConforme
      };
      onAddAccettazione(newAcc);
      if (isQuoteInApproval && quoteCodeToNotify) {
        setAutoApprovalBanner({
          quoteCode: quoteCodeToNotify,
          sampleCode: finalNewCodice,
          isEdit: false
        });
      }
    }

    setShowForm(false);
    setEditingAcc(null);
  };

  // Cambio di stato con auditing e controllo password per i campioni LIMS
  const handleToggleAccStatus = (accId: string, field: 'analisiStato' | 'statoInArrivo', currentStatus: string) => {
    setTracingAccId(accId);
    setTracingAccField(field);
    setTracingSelectedAccStatus(currentStatus);
    setTracingAccPassword('');
    setTracingAccError(null);
    const foundAcc = accettazioni.find(a => a.id === accId);
    setTracingGiustificazione(foundAcc?.giustificazioneNonIdoneita || '');
    
    const knownOperators = operators && operators.length > 0 
      ? operators.map(op => op.nome) 
      : ['Dott. Chim. F. Lupo', 'Dott.ssa S. Bianchi', 'Dott. R. Vitale'];
    const defaultOperator = operators && operators.length > 0
      ? operators[0].nome
      : 'Dott. Chim. F. Lupo';

    if (foundAcc && foundAcc.statoHistory && foundAcc.statoHistory.length > 0) {
      const lastOp = foundAcc.statoHistory[foundAcc.statoHistory.length - 1].operatore;
      if (knownOperators.includes(lastOp)) {
        setTracingAccOperator(lastOp);
        setTracingAccCustomOperator('');
      } else {
        setTracingAccOperator('Altro');
        setTracingAccCustomOperator(lastOp);
      }
    } else {
      setTracingAccOperator(defaultOperator);
      setTracingAccCustomOperator('');
    }
  };

  const handleConfirmAccStatusChange = () => {
    if (!tracingAccId || !tracingAccField) return;
    const foundAcc = accettazioni.find(a => a.id === tracingAccId);
    if (!foundAcc) return;

    // Controllo Password dell'analista/operatore per validare la firma e garantire integrità dell'Audit Trail
    const correctPassword = OPERATOR_PASSWORDS[tracingAccOperator] || 'lims123';
    if (tracingAccPassword !== correctPassword) {
      setTracingAccError(`La password di sicurezza per l'operatore ${tracingAccOperator} non è corretta.`);
      return;
    }

    const op = tracingAccOperator === 'Altro' ? (tracingAccCustomOperator.trim() || 'Operatore Generico') : tracingAccOperator;
    const formattedDate = new Date().toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const previousValue = tracingAccField === 'analisiStato' ? foundAcc.analisiStato : foundAcc.statoInArrivo;

    const newLog = {
      campoModificato: tracingAccField,
      statoPrecedente: previousValue,
      statoNuovo: tracingSelectedAccStatus as any,
      dataOra: formattedDate,
      operatore: op
    };

    const history = foundAcc.statoHistory ? [...foundAcc.statoHistory, newLog] : [newLog];

    const updatedAcc = {
      ...foundAcc,
      [tracingAccField]: tracingSelectedAccStatus as any,
      statoHistory: history,
      giustificazioneNonIdoneita: tracingAccField === 'statoInArrivo' ? (tracingGiustificazione.trim() || undefined) : foundAcc.giustificazioneNonIdoneita
    };

    onUpdateAccettazione(updatedAcc);
    setTracingAccId(null);
    setTracingAccField(null);
    setTracingAccPassword('');
    setTracingAccError(null);
  };

  // Helper per verificare se un campione è in scadenza (<= 2 gg) o scaduto
  const isCampioneInScadenzaORitardo = (acc: AccettazioneCampione): boolean => {
    if (!acc.consegnaPrevista || acc.analisiStato === 'Completato' || acc.analisiStato === 'Annullato') return false;
    const delDate = new Date(acc.consegnaPrevista);
    if (isNaN(delDate.getTime())) return false;
    delDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((delDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 2;
  };

  // Filtra i campioni inseriti
  const filteredAccettazioni = accettazioni.filter(acc => {
    // 1) Cerca per codice accettazione, descrizione, note, cliente, preventivo, comune o etichetta
    const query = searchTerm.toLowerCase().trim();
    const clientIntest = (clients.find(c => c.id === acc.intestatarioRapportoClienteId)?.denominazione || '').toLowerCase();
    const clientBill = (clients.find(c => c.id === acc.destinatarioFatturaClienteId)?.denominazione || '').toLowerCase();
    const prevCode = (preventivi.find(p => p.id === acc.preventivoAssociatoId)?.codice || '').toLowerCase();

    const matchSearch = !query ||
      acc.codiceAccettazione.toLowerCase().includes(query) ||
      acc.descrizioneCampione.toLowerCase().includes(query) ||
      (acc.matrice && acc.matrice.toLowerCase().includes(query)) ||
      (acc.noteLab && acc.noteLab.toLowerCase().includes(query)) ||
      (acc.comunePrelievo && acc.comunePrelievo.toLowerCase().includes(query)) ||
      (acc.puntoPrelievo && acc.puntoPrelievo.toLowerCase().includes(query)) ||
      (acc.etichettaCampione && acc.etichettaCampione.toLowerCase().includes(query)) ||
      clientIntest.includes(query) ||
      clientBill.includes(query) ||
      prevCode.includes(query);

    // 2) Filtra per Matrice
    const matchMatrice = selectedMatrice === 'Tutte' || acc.matrice === selectedMatrice;

    // 3) Filtra per Anno (estratto da dataAccettazione o codice es. ACC-2027-0001)
    let matchAnno = true;
    if (selectedAnno !== 'Tutti') {
      const yearFromDate = acc.dataAccettazione ? acc.dataAccettazione.substring(0, 4) : '';
      const yearFromCodeMatch = acc.codiceAccettazione ? acc.codiceAccettazione.match(/ACC-(\d{4})-/) : null;
      const yearFromCode = yearFromCodeMatch ? yearFromCodeMatch[1] : '';
      matchAnno = yearFromDate === selectedAnno || yearFromCode === selectedAnno;
    }

    // 4) Filtra per Tecnico (Filtro Personale)
    let matchTecnico = true;
    if (selectedTecnico !== 'Tutti') {
      matchTecnico = (acc.risultatiAnalisi?.some(r => r.operatore === selectedTecnico) ?? false) || acc.operatorRegistrazione === selectedTecnico;
    }

    // 5) Filtra per Stato Analisi / Scadenza
    let matchStato = true;
    if (selectedStatoFiltro === 'Scadenza') {
      matchStato = isCampioneInScadenzaORitardo(acc);
    } else if (selectedStatoFiltro !== 'Tutti') {
      matchStato = acc.analisiStato === selectedStatoFiltro;
    }

    return matchSearch && matchMatrice && matchAnno && matchTecnico && matchStato;
  });

  // Contatori per i filtri rapidi di stato analisi
  const statoCounts = {
    tutti: accettazioni.length,
    inAttesa: accettazioni.filter(a => a.analisiStato === 'In Attesa').length,
    inCorso: accettazioni.filter(a => a.analisiStato === 'In Corso').length,
    completato: accettazioni.filter(a => a.analisiStato === 'Completato').length,
    scadenza: accettazioni.filter(a => isCampioneInScadenzaORitardo(a)).length,
  };

  // Esportazione Registro Accettazioni in formato CSV / Excel
  const handleExportRegistroCSV = () => {
    const headers = [
      'Codice Accettazione',
      'Data Accettazione',
      'Ora Arrivo',
      'Descrizione Campione',
      'Categoria Merceologica',
      'Quantita',
      'Cliente Intestatario RdP',
      'Cliente Fatturazione',
      'Preventivo Associato',
      'Stato in Arrivo',
      'Stato Analisi',
      'Consegna Prevista',
      'Comune Prelievo',
      'Punto Prelievo',
      'Temp. Arrivo',
      'Revisione RdP',
      'Operatore Registrazione'
    ];
    const rows = filteredAccettazioni.map(a => {
      const cIntest = clients.find(c => c.id === a.intestatarioRapportoClienteId)?.denominazione || '';
      const cBill = clients.find(c => c.id === a.destinatarioFatturaClienteId)?.denominazione || '';
      const pCode = preventivi.find(p => p.id === a.preventivoAssociatoId)?.codice || '';
      return [
        a.codiceAccettazione,
        a.dataAccettazione,
        a.oraRicevimento || '',
        a.descrizioneCampione,
        a.matrice,
        a.quantitaCampione || '',
        cIntest,
        cBill,
        pCode,
        a.statoInArrivo,
        a.analisiStato,
        a.consegnaPrevista || '',
        a.comunePrelievo || '',
        a.puntoPrelievo || '',
        a.temperaturaArrivo || '',
        a.revisioneCorrente ? `Rev. ${String(a.revisioneCorrente).padStart(2, '0')}` : 'Rev. 00',
        a.operatorRegistrazione || ''
      ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Registro_Accettazione_Campioni_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getClientDenominazione = (id: string) => {
    if (id === '__LAB_INTERNO__') return 'Laboratorio Chimico Merceologico (Uso Interno / QC / Ring Test)';
    const c = clients.find(cl => cl.id === id);
    return c ? c.denominazione : 'Cliente Sconosciuto';
  };

  const computeDirectListinoTotal = (testIds?: string[] | null, packageIds?: string[] | null): number => {
    let total = 0;
    const coveredProveIds = new Set<string>();

    if (packageIds && packageIds.length > 0) {
      packageIds.forEach(packId => {
        const pack = pacchetti.find(x => x.id === packId);
        if (pack) {
          const hasActiveTests = !testIds || pack.proveIds.some(pid => testIds.includes(pid));
          if (hasActiveTests) {
            total += (pack.prezzoScontato || 0);
            pack.proveIds.forEach(pid => coveredProveIds.add(pid));
          }
        }
      });
    }

    if (testIds && testIds.length > 0) {
      testIds.forEach(pid => {
        if (!coveredProveIds.has(pid)) {
          const pr = prove.find(x => x.id === pid);
          if (pr) {
            total += (pr.prezzoListino || 0);
          }
        }
      });
    }

    return Number(total.toFixed(2));
  };

  const getClientEmail = (id: string) => {
    const c = clients.find(cl => cl.id === id);
    return c ? c.email : '';
  };

  // Metodi di supporto per Risultati Prove (Emissione Rapporto Prova)
  const getResolvedProveForAccettazione = (acc: AccettazioneCampione) => {
    const resolved: Prova[] = [];
    const addedIds = new Set<string>();

    if (acc.preventivoAssociatoId) {
      const assocPrev = preventivi.find(p => p.id === acc.preventivoAssociatoId);
      if (assocPrev) {
        // 1) Prove individuali
        assocPrev.proveSelezionate?.forEach(item => {
          if (!addedIds.has(item.provaId)) {
            if (acc.proveSelezionateDaPreventivo && !acc.proveSelezionateDaPreventivo.includes(item.provaId)) return;
            const p = prove.find(x => x.id === item.provaId);
            if (p) {
              resolved.push(p);
              addedIds.add(p.id);
            }
          }
        });

        // 2) Prove incluse nei pacchetti
        assocPrev.pacchettiSelezionati?.forEach(item => {
          const pack = pacchetti.find(x => x.id === item.pacchettoId);
          if (pack) {
            pack.proveIds?.forEach(pid => {
              if (!addedIds.has(pid)) {
                if (acc.proveSelezionateDaPreventivo && !acc.proveSelezionateDaPreventivo.includes(pid)) return;
                const p = prove.find(x => x.id === pid);
                if (p) {
                  resolved.push(p);
                  addedIds.add(pid);
                }
              }
            });
          }
        });
      }
    }

    // Risolvi anche da pacchetti diretti se selezionati senza preventivo
    if (acc.pacchettiDirettiSelezionati && Array.isArray(acc.pacchettiDirettiSelezionati)) {
      acc.pacchettiDirettiSelezionati.forEach(packId => {
        const pack = pacchetti.find(x => x.id === packId);
        if (pack) {
          pack.proveIds?.forEach(pid => {
            if (!addedIds.has(pid)) {
              if (acc.proveSelezionateDaPreventivo && !acc.proveSelezionateDaPreventivo.includes(pid)) return;
              const p = prove.find(x => x.id === pid);
              if (p) {
                resolved.push(p);
                addedIds.add(pid);
              }
            }
          });
        }
      });
    }

    // Risolvi anche da risultatiAnalisi presenti direttamente nell'accettazione
    if (acc.risultatiAnalisi && Array.isArray(acc.risultatiAnalisi)) {
      acc.risultatiAnalisi.forEach(item => {
        if (item.provaId && !addedIds.has(item.provaId)) {
          const p = prove.find(x => x.id === item.provaId);
          if (p) {
            resolved.push(p);
            addedIds.add(p.id);
          }
        }
      });
    }

    // Risolvi anche da proveSelezionateDaPreventivo se registrate
    if (acc.proveSelezionateDaPreventivo && Array.isArray(acc.proveSelezionateDaPreventivo)) {
      acc.proveSelezionateDaPreventivo.forEach(pid => {
        if (!addedIds.has(pid)) {
          const p = prove.find(x => x.id === pid);
          if (p) {
            resolved.push(p);
            addedIds.add(p.id);
          }
        }
      });
    }

    return resolved;
  };

  const handleStartEditResults = (acc: AccettazioneCampione) => {
    const resolved = getResolvedProveForAccettazione(acc);
    const initialTemp: Record<string, Partial<RisultatoProva>> = {};
    const assocPrev = preventivi.find(prev => prev.id === acc.preventivoAssociatoId);
    
    resolved.forEach(p => {
      const existing = acc.risultatiAnalisi?.find(r => r.provaId === p.id);
      
      // Auto-predisposizione dell'unità di misura (priorità a valore esistente o configurato nella prova, poi fallback)
      let defaultUm = (p as any).unitaMisura || (p.limitiRiferimento?.[0]?.unitaMisura) || 'g/100g';
      if (!(p as any).unitaMisura && !(p.limitiRiferimento?.[0]?.unitaMisura)) {
        if (p.nome.toLowerCase().includes('perossid')) defaultUm = 'meq O2/kg';
        else if (p.nome.toLowerCase().includes('acidit')) defaultUm = '% acid. oleico';
        else if (p.nome.toLowerCase().includes('ph')) defaultUm = 'u pH';
        else if (p.nome.toLowerCase().includes('densit')) defaultUm = 'g/cm³';
        else if (p.nome.toLowerCase().includes('escherichia') || p.nome.toLowerCase().includes('carica b')) defaultUm = 'UFC/g';
        else if (p.nome.toLowerCase().includes('metalli') || p.nome.toLowerCase().includes('piombo') || p.nome.toLowerCase().includes('rame')) defaultUm = 'mg/kg';
        else if (p.nome.toLowerCase().includes('umidit')) defaultUm = '%';
      }

      const prevProvaItem = assocPrev?.proveSelezionate?.find(item => item.provaId === p.id);
      const defaultLimitiValue = existing?.limitiSelezionati || prevProvaItem?.limitiSelezionati || [];

      initialTemp[p.id] = {
        provaId: p.id,
        valoreRilevato: existing?.valoreRilevato ? checkIfValueBelowLOQ(existing.valoreRilevato, p.limiteQuantificazione) : '',
        incertezza: existing?.escludiIncertezza ? 'N/D' : (existing?.incertezza || '± 0.01'),
        ripetibilita: existing?.ripetibilita || '',
        incertezzaPercentuale: existing?.escludiIncertezza ? '' : (existing?.incertezzaPercentuale || ''),
        escludiIncertezza: existing?.escludiIncertezza || false,
        unitaMisura: existing?.unitaMisura || defaultUm,
        conforme: existing?.conforme || 'Conforme',
        operatore: existing?.operatore || p?.tecnicoEsecutore || acc.operatorRegistrazione || 'Dott. Chim. F. Lupo',
        dataAnalisi: existing?.dataAnalisi || new Date().toISOString().split('T')[0],
        limitiSelezionati: defaultLimitiValue,
        quadernoCalcolo: existing?.quadernoCalcolo,
        determinazioniRipetibilita: existing?.determinazioniRipetibilita || []
      };
    });
    
    const synchronizedTemp = syncIdrocarburiTotaliResults(initialTemp, resolved);
    setTempRisultati(synchronizedTemp);
    setEditingResultsAccId(acc.id);
  };

  const handleFillSampleValues = (acc: AccettazioneCampione) => {
    const resolved = getResolvedProveForAccettazione(acc);
    const sampleValues: Record<string, Partial<RisultatoProva>> = {};
    const assocPrev = preventivi.find(prev => prev.id === acc.preventivoAssociatoId);
    
    resolved.forEach(p => {
      let mockVal = 'Assente';
      let mockUm = 'mg/kg';
      let mockInc = '± 0.01';
      let mockPct = '10%';

      if (p.nome.toLowerCase().includes('acidit')) {
        mockVal = '0.22';
        mockPct = '10%';
        mockUm = '% acid. oleico';
        mockInc = '± 0.02';
      } else if (p.nome.toLowerCase().includes('perossid')) {
        mockVal = '7.5';
        mockPct = '5%';
        mockUm = 'meq O2/kg';
        mockInc = '± 0.4';
      } else if (p.nome.toLowerCase().includes('metalli') || p.nome.toLowerCase().includes('ferro') || p.nome.toLowerCase().includes('rame')) {
        mockVal = '0.04';
        mockPct = '12%';
        mockUm = 'mg/kg';
        mockInc = '± 0.005';
      } else if (p.nome.toLowerCase().includes('pesticid') || p.nome.toLowerCase().includes('fitofarmac')) {
        mockVal = '< L.O.D. (<0.01)';
        mockPct = '';
        mockUm = 'mg/kg';
        mockInc = 'N/D';
      } else if (p.nome.toLowerCase().includes('ph')) {
        mockVal = '6.7';
        mockPct = '1.5%';
        mockUm = 'u pH';
        mockInc = '± 0.1';
      } else if (p.nome.toLowerCase().includes('escherichia') || p.nome.toLowerCase().includes('bacill')) {
        mockVal = 'Assente / 25g';
        mockPct = '';
        mockUm = 'UFC/g';
        mockInc = 'N/D';
      } else if (p.nome.toLowerCase().includes('umidit')) {
        mockVal = '10.5';
        mockPct = '2%';
        mockUm = '%';
        mockInc = '± 0.2';
      } else {
        mockVal = '85.4';
        mockPct = '10%';
        mockUm = 'mg/L';
        mockInc = '± 1.2';
      }
      
      // Calcolo tramite regressione se i punti sono configurati
      if (p.puntiIncertezza && p.puntiIncertezza.length > 0) {
        const automated = calculateAutomatedUncertainty(mockVal, p.puntiIncertezza);
        if (automated) {
          mockInc = automated.incertezza;
          mockPct = automated.incertezzaPercentuale;
        }
      }

      const prevProvaItem = assocPrev?.proveSelezionate?.find(item => item.provaId === p.id);
      const defaultLimitiValue = prevProvaItem?.limitiSelezionati || [];
      
      sampleValues[p.id] = {
        provaId: p.id,
        valoreRilevato: mockVal,
        incertezza: mockInc,
        ripetibilita: 'N/D',
        incertezzaPercentuale: mockPct,
        escludiIncertezza: false,
        unitaMisura: mockUm,
        conforme: 'Conforme',
        operatore: p?.tecnicoEsecutore || acc.operatorRegistrazione || 'Dott. Chim. F. Lupo',
        dataAnalisi: new Date().toISOString().split('T')[0],
        limitiSelezionati: defaultLimitiValue
      };
    });
    
    setTempRisultati(sampleValues);
  };

  const handleSaveResults = (acc: AccettazioneCampione, forceMode?: 'in_corso' | 'completato') => {
    const resolved = getResolvedProveForAccettazione(acc);
    const resultsArray: RisultatoProva[] = (Object.values(tempRisultati) as Partial<RisultatoProva>[]).map(r => {
      const p = prove.find(x => x.id === r.provaId);
      const rawVal = (r.valoreRilevato || '').trim();
      const formattedVal = rawVal
        ? (p ? checkIfValueBelowLOQ(rawVal, p.limiteQuantificazione) : rawVal)
        : '';

      return {
        provaId: r.provaId!,
        valoreRilevato: formattedVal,
        incertezza: r.escludiIncertezza ? 'N/D' : (r.incertezza || 'N/D'),
        ripetibilita: r.ripetibilita || 'N/D',
        incertezzaPercentuale: r.escludiIncertezza ? '' : (r.incertezzaPercentuale || ''),
        escludiIncertezza: r.escludiIncertezza || false,
        unitaMisura: r.unitaMisura || (p as any)?.unitaMisura || 'mg/kg',
        conforme: r.conforme || 'Conforme',
        operatore: r.operatore || p?.tecnicoEsecutore || 'Dott. Chim. F. Lupo',
        dataAnalisi: r.dataAnalisi || new Date().toISOString().split('T')[0],
        limitiSelezionati: r.limitiSelezionati || [],
        quadernoCalcolo: r.quadernoCalcolo,
        determinazioniRipetibilita: r.determinazioniRipetibilita || []
      };
    });

    // Verifica se tutte le prove del campione hanno un risultato compilato (o frazioni acidi grassi compilate)
    const filledCount = resolved.filter(p => {
      const rItem = resultsArray.find(x => x.provaId === p.id);
      if (!rItem) return false;
      if (rItem.valoreRilevato && rItem.valoreRilevato.trim() !== '') return true;
      const fraz = getAcidiGrassiFrazioniDisplay(p, rItem);
      return !!(fraz && fraz.some(f => f.haValore));
    }).length;

    const allFilled = resolved.length > 0 && filledCount === resolved.length;
    const nextStatus: AccettazioneCampione['analisiStato'] =
      forceMode === 'in_corso'
        ? 'In Corso'
        : forceMode === 'completato'
        ? 'Completato'
        : allFilled
        ? 'Completato'
        : filledCount > 0
        ? 'In Corso'
        : acc.analisiStato;

    // Calcola date inizio/termine prove dalle date effettive di analisi se disponibili
    const validDates = resultsArray
      .filter(r => r.valoreRilevato && r.dataAnalisi)
      .map(r => r.dataAnalisi!)
      .sort();
    const minData = validDates.length > 0 ? validDates[0] : (acc.dataInizioProva || acc.dataAccettazione);
    const maxData = validDates.length > 0 ? validDates[validDates.length - 1] : (acc.dataTermineProva || acc.consegnaPrevista);

    const prevStatus = acc.analisiStato;
    const history = acc.statoHistory ? [...acc.statoHistory] : [];
    
    if (prevStatus !== nextStatus) {
      const formattedDate = new Date().toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      const firstOperatorName = resultsArray[0]?.operatore || 'Dott. Chim. F. Lupo';
      
      history.push({
        campoModificato: 'analisiStato',
        statoPrecedente: prevStatus,
        statoNuovo: nextStatus,
        dataOra: formattedDate,
        operatore: firstOperatorName
      });
    }

    const updatedAcc: AccettazioneCampione = {
      ...acc,
      risultatiAnalisi: resultsArray,
      analisiStato: nextStatus,
      dataInizioProva: minData,
      dataTermineProva: nextStatus === 'Completato' ? (maxData || new Date().toISOString().split('T')[0]) : acc.dataTermineProva,
      statoHistory: history
    };

    onUpdateAccettazione(updatedAcc);
    setEditingResultsAccId(null);
    setTempRisultati({});
  };

  const handleCalculateUncertainty = (rowId: string, valueStr: string, rsdPercent: number, k: number) => {
    if (!valueStr) return;
    const cleaned = valueStr.replace(',', '.');
    // Extract first number (integer or float) from the string
    const numericMatch = cleaned.match(/[-+]?[0-9]*\.?[0-9]+/);
    
    if (!numericMatch) {
      setTempRisultati(prev => ({
        ...prev,
        [rowId]: {
          ...prev[rowId],
          incertezza: 'N/D'
        }
      }));
      return;
    }

    const value = parseFloat(numericMatch[0]);
    if (isNaN(value)) {
      setTempRisultati(prev => ({
        ...prev,
        [rowId]: {
          ...prev[rowId],
          incertezza: 'N/D'
        }
      }));
      return;
    }

    // Expanded uncertainty = k * (rsdPercent / 100) * value
    const expandedUncertainty = k * (rsdPercent / 100) * value;
    
    // Format based on the decimal precision of the value for scientific consistency
    const fraction = numericMatch[0].split('.')[1] || '';
    const valueDecimals = fraction.length;
    
    // Ensure we have at least 2 decimals, or match the input precision
    const precision = Math.max(valueDecimals, 2);
    const formattedUncertainty = expandedUncertainty.toFixed(precision);
    const pct = value !== 0 ? (expandedUncertainty / Math.abs(value)) * 100 : 0;
    const formattedPct = `${pct.toFixed(precision)}%`;

    setTempRisultati(prev => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        incertezza: `± ${formattedUncertainty}`,
        incertezzaPercentuale: formattedPct
      }
    }));
  };

  const handleCalculateDirectUncertaintyPercent = (rowId: string, valueStr: string, desiredPercent: number) => {
    if (!valueStr) return;
    const cleaned = valueStr.replace(',', '.');
    const numericMatch = cleaned.match(/[-+]?[0-9]*\.?[0-9]+/);
    if (!numericMatch) return;
    const value = parseFloat(numericMatch[0]);
    if (isNaN(value)) return;

    const expandedUncertainty = (desiredPercent / 100) * value;
    const fraction = numericMatch[0].split('.')[1] || '';
    const valueDecimals = fraction.length;
    const precision = Math.max(valueDecimals, 2);

    const formattedUncertainty = expandedUncertainty.toFixed(precision);
    const formattedPct = `${desiredPercent.toFixed(precision)}%`;

    setTempRisultati(prev => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        incertezza: `± ${formattedUncertainty}`,
        incertezzaPercentuale: formattedPct
      }
    }));
  };

  // Statistiche accettazione
  const statTotale = accettazioni.length;
  const statIdoneo = accettazioni.filter(a => a.statoInArrivo === 'Idoneo').length;
  const statNonIdoneo = accettazioni.filter(a => a.statoInArrivo === 'Non Idoneo').length;
  const statRiserva = accettazioni.filter(a => a.statoInArrivo === 'Accettato con Riserva').length;

  // Tutte le categorie merceologiche estratte dalle prove e dalle accettazioni esistenti
  const matriciDisponibili = Array.from(new Set([
    ...prove.map(p => p.categoriaMerceologica).filter(Boolean),
    ...accettazioni.map(a => a.matrice).filter(Boolean)
  ]));

  // Tutti gli anni disponibili estratti dalle accettazioni e anno corrente
  const anniDisponibili = Array.from(new Set([
    new Date().getFullYear().toString(),
    ...accettazioni.map(a => {
      if (a.dataAccettazione) return a.dataAccettazione.substring(0, 4);
      const m = a.codiceAccettazione?.match(/ACC-(\d{4})-/);
      return m ? m[1] : '';
    }).filter(Boolean)
  ])).sort((a, b) => b.localeCompare(a));

  const activeAcc = expandedId ? accettazioni.find(a => a.id === expandedId) : null;
  const displayedAccettazioni = activeAcc ? [activeAcc] : filteredAccettazioni;

  return (
    <div className="space-y-6">
      
      {/* Banner Notifica Approvazione Automatica Preventivo */}
      {autoApprovalBanner && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-400 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-black text-emerald-950">
                Preventivo {autoApprovalBanner.quoteCode} approvato automaticamente!
              </p>
              <p className="text-xs text-emerald-800 mt-0.5">
                {autoApprovalBanner.isEdit
                  ? `Il preventivo è passato dallo stato "In Approvazione" ad "Approvato" a seguito del collegamento con il campione `
                  : `Il preventivo è passato dallo stato "In Approvazione" ad "Approvato" all'accettazione del campione `}
                <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-950">
                  {autoApprovalBanner.sampleCode}
                </strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {onViewPreventivo && (
              <button
                type="button"
                onClick={() => {
                  const q = preventivi.find(p => p.codice === autoApprovalBanner.quoteCode);
                  if (q) onViewPreventivo(q.id);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <span>Visualizza Preventivo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setAutoApprovalBanner(null)}
              className="px-3 py-2 bg-white text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
      
      {/* Intestazione e Statistiche visibili solo se non in modalità Scheda Autonoma o Form */}
      {!activeAcc && !showForm && (
        <>
          {/* Intestazione Sezione */}
          <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-xs">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-850">
                  Registro Accettazione Campioni
                </h3>
                <p className="text-xs text-slate-400">Archivio chimico-merceologico dei campioni in arrivo, reportistica e flussi amministrativi</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleExportRegistroCSV}
                className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs font-extrabold uppercase tracking-wide flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                title="Esporta il Registro Accettazione Campioni filtrato in formato CSV compatibile con Excel"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Esporta CSV
              </button>
              <button
                onClick={handleOpenAdd}
                className="flex-1 sm:flex-none bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-wide flex items-center justify-center gap-1.5 transition shadow-2xs hover:shadow-xs cursor-pointer"
                id="btn-registra-accettazione"
              >
                <Plus className="h-4 w-4" /> Accetta Nuovo Campione
              </button>
            </div>
          </div>

          {/* Barra Filtri Rapidi per Stato Analisi con Contatori */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'Tutti', label: 'Tutti i Campioni', count: statoCounts.tutti, activeClass: 'bg-slate-900 text-white border-slate-900' },
              { id: 'In Attesa', label: '⏳ In Attesa', count: statoCounts.inAttesa, activeClass: 'bg-slate-700 text-white border-slate-700' },
              { id: 'In Corso', label: '🧪 In Corso', count: statoCounts.inCorso, activeClass: 'bg-blue-600 text-white border-blue-600' },
              { id: 'Completato', label: '✅ Completati', count: statoCounts.completato, activeClass: 'bg-emerald-600 text-white border-emerald-600' },
              { id: 'Scadenza', label: '⚠️ In Scadenza / Ritardo', count: statoCounts.scadenza, activeClass: 'bg-rose-600 text-white border-rose-600' },
            ].map(tab => {
              const isActive = selectedStatoFiltro === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStatoFiltro(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-3xs ${
                    isActive
                      ? tab.activeClass
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Riquadri Statistiche Rapide */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-2xs flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registrati</span>
                <span className="text-xl font-extrabold text-slate-850 block mt-1">{statTotale} Campioni</span>
              </div>
              <div className="p-2 bg-slate-50 text-slate-500 rounded-lg border border-slate-100">
                <Tag className="h-4 w-4" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-2xs flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Idonei</span>
                <span className="text-xl font-extrabold text-emerald-600 block mt-1">{statIdoneo} Campioni</span>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100/50">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-2xs flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Non Idonei</span>
                <span className="text-xl font-extrabold text-rose-600 block mt-1">{statNonIdoneo} Campioni</span>
              </div>
              <div className="p-2 bg-red-50 text-red-650 rounded-lg border border-red-100/50">
                <X className="h-4 w-4" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-2xs flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Con Riserva</span>
                <span className="text-xl font-extrabold text-amber-650 block mt-1">{statRiserva} Campioni</span>
              </div>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-100/50">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Sezione Filtri e Ricerca */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs space-y-3">
            {/* Barra Stato Contatori Progressivi Annuali RdP (Verifica immediata reset a #0001 per il nuovo anno) */}
            <div className="flex flex-wrap items-center gap-2 pb-2.5 border-b border-slate-100">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                🔢 Contatori Annuali RdP:
              </span>
              {Array.from(new Set([String(new Date().getFullYear() + 1), String(new Date().getFullYear()), ...anniDisponibili])).slice(0, 4).map(yrStr => {
                const yrNum = parseInt(yrStr, 10);
                if (isNaN(yrNum)) return null;
                const sInfo = getSampleCounterInfo(yrNum);
                const isSelectedYr = selectedAnno === yrStr;
                return (
                  <button
                    key={yrStr}
                    type="button"
                    onClick={() => setSelectedAnno(isSelectedYr ? 'Tutti' : yrStr)}
                    className={`px-2.5 py-1 rounded-lg text-[10.5px] font-mono font-bold transition cursor-pointer border flex items-center gap-1.5 ${
                      isSelectedYr
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-indigo-50/50'
                    }`}
                    title={`Clicca per filtrare i campioni dell'anno ${yrStr}. Prossimo RdP disponibile: ${sInfo.suggestedCode}`}
                  >
                    <span className="font-sans font-black">Anno {yrStr}:</span>
                    <span>{sInfo.countForYear} campioni</span>
                    <span className={isSelectedYr ? 'text-indigo-200' : 'text-indigo-700 font-extrabold'}>
                      (Prossimo: {sInfo.suggestedCode})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              {/* Ricerca per Testo */}
              <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cerca per codice accettazione, categoria, descrizione campione..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 text-xs font-semibold"
              />
            </div>

            {/* Filtro per Anno */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase shrink-0">Anno:</span>
              <select
                value={selectedAnno}
                onChange={(e) => setSelectedAnno(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="Tutti">Tutti gli Anni</option>
                {anniDisponibili.map(anno => (
                  <option key={anno} value={anno}>{anno}</option>
                ))}
              </select>
            </div>

            {/* Filtro per Matrice */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase shrink-0">Categoria:</span>
              <select
                value={selectedMatrice}
                onChange={(e) => setSelectedMatrice(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                <option value="Tutte">Tutte le Categorie</option>
                {matriciDisponibili.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            
            {/* Filtro Personale (Tecnico) */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase shrink-0">Le mie analisi (Tecnico):</span>
              <select
                value={selectedTecnico}
                onChange={(e) => setSelectedTecnico(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Tutti">Tutti i Tecnici</option>
                {(operators || []).map(op => (
                  <option key={op.nome} value={op.nome}>{op.nome}</option>
                ))}
              </select>
            </div>
            </div>
          </div>
        </>
      )}

      {/* Intestazione Specifica della Scheda Autonoma Campione */}
      {activeAcc && !showForm && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCloseReportAndReturnToList}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition font-black flex items-center gap-2 text-xs cursor-pointer shadow-2xs hover:shadow-xs active:scale-95 shrink-0"
              title="Torna indietro all'elenco dei campioni accettati"
            >
              <ArrowLeft className="h-4 w-4 text-slate-700" />
              <span>Torna all&apos;Elenco Campioni Accettati</span>
            </button>

            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-lg text-slate-850">
                  Scheda Campione <span className="text-indigo-600 font-mono">#{activeAcc.codiceAccettazione}</span>
                </h3>
                <span className={`px-2.5 py-0.5 border rounded-md text-[10px] font-extrabold ${
                  activeAcc.statoInArrivo === 'Idoneo' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                  activeAcc.statoInArrivo === 'Non Idoneo' ? 'bg-red-50 text-red-800 border-red-200' :
                  'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {activeAcc.statoInArrivo}
                </span>
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                  activeAcc.analisiStato === 'Completato' ? 'bg-emerald-500 text-white' :
                  activeAcc.analisiStato === 'In Corso' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  Analisi: {activeAcc.analisiStato}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span>Matrice: <strong className="text-slate-800">{activeAcc.matrice}</strong></span>
                <span>•</span>
                <span>Data Accettazione: <strong className="text-slate-800">{activeAcc.dataAccettazione}</strong></span>
                <span>•</span>
                <span>Committente: <strong className="text-slate-800">{getClientDenominazione(activeAcc.intestatarioRapportoClienteId)}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={() => handleSaveResults(activeAcc)}
              className="bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition shadow cursor-pointer active:scale-95"
            >
              <Save className="h-4 w-4" /> Salva Risultati
            </button>
          </div>
        </div>
      )}

      {/* Contenuto Principale: Form di Registrazione / Registro Accettazioni */}
      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-md space-y-4"
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3 flex-wrap">
                <h4 className="font-extrabold text-base text-slate-800 flex items-center gap-1.5">
                  {editingAcc ? `Modifica Scheda Campione: ${editingAcc.codiceAccettazione}` : 'Registrazione di un Nuovo Campione / Accettazione'}
                </h4>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs" title="Codice Rapporto di Prova / Accettazione (riparte automaticamente da 0001 al cambio anno della data di accettazione)">
                  Codice RdP: <strong className="text-indigo-900">
                    {isCodiceAccettazioneManual
                      ? customCodiceAccettazione
                      : (editingAcc ? (customCodiceAccettazione || editingAcc.codiceAccettazione) : generateSuggestedCode(dataAccettazione))}
                  </strong>
                </span>
              </div>
              <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-slate-700">
              {/* Pannello Controllo Numerazione Annuale RdP & Codice Accettazione */}
              <div className="bg-indigo-50/40 border border-indigo-200/80 rounded-xl p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                      🔢 Numerazione Rapporto di Prova (Reset Annuale Automatico a #0001)
                    </span>
                    <span className="text-[10px] bg-white text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-full font-mono font-bold shadow-3xs">
                      {(() => {
                        const sInfo = getSampleCounterInfo(dataAccettazione, editingAcc?.id);
                        return sInfo.maxExisting === 0
                          ? `Anno ${sInfo.year}: Primo campione dell'anno (parte da #0001)`
                          : `Anno ${sInfo.year}: Ultimo registrato #${String(sInfo.maxExisting).padStart(4, '0')} → Prossimo #${String(sInfo.nextNum).padStart(4, '0')}`;
                      })()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const recalc = generateSuggestedCode(dataAccettazione, editingAcc?.id);
                        setCustomCodiceAccettazione(recalc);
                        setIsCodiceAccettazioneManual(editingAcc ? true : false);
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 transition cursor-pointer shadow-3xs"
                      title="Ricalcola il prossimo numero progressivo disponibile in base all'anno della Data di Ricevimento/Accettazione"
                    >
                      🔄 Ricalcola da Anno Data Ricevimento ({dataAccettazione ? dataAccettazione.substring(0, 4) : new Date().getFullYear()})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isCodiceAccettazioneManual) {
                          setIsCodiceAccettazioneManual(false);
                          setCustomCodiceAccettazione(editingAcc ? editingAcc.codiceAccettazione : generateSuggestedCode(dataAccettazione));
                        } else {
                          setIsCodiceAccettazioneManual(true);
                          setCustomCodiceAccettazione(editingAcc ? (customCodiceAccettazione || editingAcc.codiceAccettazione) : generateSuggestedCode(dataAccettazione));
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer shadow-3xs"
                    >
                      {isCodiceAccettazioneManual ? '🔒 Blocca Automatico' : '✏️ Modifica Codice Manualmente'}
                    </button>
                  </div>
                </div>

                {isCodiceAccettazioneManual && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 items-center animate-fadeIn">
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-900 uppercase mb-1">
                        Codice Accettazione / N. Rapporto di Prova Personalizzato *
                      </label>
                      <input
                        type="text"
                        value={customCodiceAccettazione}
                        onChange={(e) => setCustomCodiceAccettazione(e.target.value)}
                        placeholder="Es. ACC-2026-0001"
                        className="w-full px-3 py-1.5 text-xs font-mono font-black bg-white border border-amber-400 rounded-lg text-slate-900 ring-1 ring-amber-300 focus:outline-none"
                      />
                    </div>
                    <div className="text-[10.5px] text-slate-600 leading-snug">
                      Puoi forzare manualmente il codice (es. <code className="font-mono font-bold text-indigo-800">ACC-{dataAccettazione ? dataAccettazione.substring(0, 4) : new Date().getFullYear()}-0001</code>). Il sistema verifica automaticamente che non vi siano duplicati in archivio.
                    </div>
                  </div>
                )}
              </div>

              {/* Riga 1: Descrizione, Categoria Merceologica e Quantità */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Descrizione del Campione da parte del laboratorio *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Esempio: Olio Extravergine di Oliva d'inizio campagna"
                    value={descrizione}
                    onChange={(e) => setDescrizione(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50/50 focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Categoria Merceologica *
                  </label>
                  <select
                    value={matrice}
                    onChange={(e) => setMatrice(e.target.value)}
                    className="w-full px-2 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white focus:outline-none"
                  >
                    {categorieMerceologicheDisponibili.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                    <option value="Altro...">Altro (Specifica categoria...)</option>
                  </select>
                  {matrice === 'Altro...' && (
                    <input
                      type="text"
                      required
                      placeholder="Digita nuova categoria merceologica..."
                      value={customMatrice}
                      onChange={(e) => setCustomMatrice(e.target.value)}
                      className="w-full mt-1.5 px-2.5 py-1.5 border border-indigo-300 rounded-lg text-xs font-semibold bg-indigo-50/30 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Quantità / Confezioni Ricevute *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="es: 1 flacone da 500ml, 2 sacchetti da 1kg"
                    value={quantita}
                    onChange={(e) => setQuantita(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold bg-white focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              {/* Riga 2: Stato campione (e Stato Analisi se in modifica) */}
              <div className={`grid grid-cols-1 ${editingAcc ? 'md:grid-cols-2' : ''} gap-4`}>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Valutazione Idoneità all&apos;accettazione *
                  </label>
                  <select
                    value={statoInArrivo}
                    onChange={(e) => setStatoInArrivo(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white focus:outline-none"
                  >
                    <option value="Idoneo" className="text-emerald-700">🟩 Idoneo (Conforme per l&apos;analisi)</option>
                    <option value="Non Idoneo" className="text-rose-700">🟥 Non Idoneo (Rifiutato / Scartato)</option>
                    <option value="Accettato con Riserva" className="text-amber-700">🟨 Accettato con Riserva (Nota tecnica)</option>
                  </select>
                </div>
                {editingAcc && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Stato Avanzamento Analisi
                    </label>
                    <select
                      value={statoAnalisi}
                      onChange={(e) => setStatoAnalisi(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white focus:outline-none"
                    >
                      <option value="In Attesa">⏳ In Attesa</option>
                      <option value="In Corso">🧪 In Corso</option>
                      <option value="Completato">✅ Completato</option>
                      <option value="Annullato">❌ Annullato</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Spazio Giustificazione Non Idoneità / Sospensione (Richiesta Utente) */}
              {statoInArrivo !== 'Idoneo' && (
                <div className="bg-rose-50/40 border border-rose-250/60 rounded-xl p-4.5 space-y-2 animate-fadeIn text-left">
                  <span className="text-xs font-black text-rose-800 uppercase tracking-widest block">
                    Motivazione di Sospensione / Non Idoneità o Riserva *
                  </span>
                  <p className="text-[10.5px] text-slate-500 italic leading-snug">
                    Fornisci la giustificazione formale del provvedimento. Queste informazioni verranno salvate nel record del campione per rintracciabilità ed audit trail.
                  </p>
                  <textarea
                    rows={2}
                    required
                    value={giustificazioneNonIdoneita}
                    onChange={(e) => setGiustificazioneNonIdoneita(e.target.value)}
                    placeholder="Esempio: Flacone pervenuto lesionato; sigillo di sicurezza rimosso; temperatura fuori soglia (+12.4°C); etc..."
                    className="w-full text-xs font-semibold p-3 bg-white border border-rose-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-lg outline-none placeholder-slate-400 text-slate-850 leading-normal"
                  />
                </div>
              )}

              {/* Sezione Associazioni Anagrafiche ed Economiche */}
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-slate-400 tracking-wider uppercase block">
                    Associazione Anagrafica, Contrattuale e Amministrativa (ISO/IEC 17025 §7.1)
                  </span>
                  {modalitaAccettazione === 'uso_interno' && destinatarioFatturaId !== '__LAB_INTERNO__' && (
                    <button
                      type="button"
                      onClick={() => {
                        setDestinatarioFatturaId('__LAB_INTERNO__');
                        setIntestatarioId('__LAB_INTERNO__');
                        setCopiaFattura(true);
                        setDestinatarioFinale('Laboratorio Chimico Merceologico (Uso Interno / QC / Ring Test)');
                      }}
                      className="px-2.5 py-1 bg-cyan-100 hover:bg-cyan-200 text-cyan-900 border border-cyan-300 rounded-lg text-[10.5px] font-extrabold transition cursor-pointer self-start sm:self-auto"
                    >
                      🔬 Intesta a Laboratorio Interno
                    </button>
                  )}
                </div>

                {/* Selettore Modalità di Accettazione (3 Opzioni) */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                    Modalità di Accettazione &amp; Riferimento Economico *
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setModalitaAccettazione('preventivo');
                        if (destinatarioFatturaId === '__LAB_INTERNO__') {
                          const firstCl = clients[0]?.id || '';
                          setDestinatarioFatturaId(firstCl);
                          setIntestatarioId(firstCl);
                        }
                        if (!preventivoId && destinatarioFatturaId && destinatarioFatturaId !== '__LAB_INTERNO__') {
                          const clientPrev = preventivi.filter(p => p.clienteId === destinatarioFatturaId && (p.stato === 'Approvato' || p.stato === 'In Approvazione'));
                          if (clientPrev.length > 0) {
                            setPreventivoId(clientPrev[clientPrev.length - 1].id);
                          }
                        }
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        modalitaAccettazione === 'preventivo'
                          ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/30 text-amber-950 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-black flex items-center gap-1.5">
                          <FileSpreadsheet className={`h-4 w-4 shrink-0 ${modalitaAccettazione === 'preventivo' ? 'text-amber-600' : 'text-slate-400'}`} />
                          1. Con Preventivo
                        </span>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          Consigliato
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        Importa prove e prezzi dall&apos;offerta concordata e invia in Fatturazione.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setModalitaAccettazione('listino_diretto');
                        setPreventivoId('');
                        if (destinatarioFatturaId === '__LAB_INTERNO__') {
                          const firstCl = clients[0]?.id || '';
                          setDestinatarioFatturaId(firstCl);
                          setIntestatarioId(firstCl);
                        }
                        if (!proveSelezionateDaPreventivo) {
                          setProveSelezionateDaPreventivo([]);
                        }
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        modalitaAccettazione === 'listino_diretto'
                          ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/25 text-indigo-950 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-black flex items-center gap-1.5">
                          <Layers className={`h-4 w-4 shrink-0 ${modalitaAccettazione === 'listino_diretto' ? 'text-indigo-600' : 'text-slate-400'}`} />
                          2. Diretta da Listino
                        </span>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                          Senza Prev.
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        Scegli prove/pacchetti da listino. Va in Fatturazione (preventivo associabile anche dopo).
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setModalitaAccettazione('uso_interno');
                        setPreventivoId('');
                        if (!proveSelezionateDaPreventivo) {
                          setProveSelezionateDaPreventivo([]);
                        }
                        setDestinatarioFatturaId('__LAB_INTERNO__');
                        setIntestatarioId('__LAB_INTERNO__');
                        setCopiaFattura(true);
                        setDestinatarioFinale('Laboratorio Chimico Merceologico (Uso Interno / QC / Ring Test)');
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        modalitaAccettazione === 'uso_interno'
                          ? 'bg-cyan-50/90 border-cyan-500 ring-2 ring-cyan-500/25 text-cyan-950 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-black flex items-center gap-1.5">
                          <FlaskConical className={`h-4 w-4 shrink-0 ${modalitaAccettazione === 'uso_interno' ? 'text-cyan-600' : 'text-slate-400'}`} />
                          3. Uso Interno / QC
                        </span>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 border border-cyan-200">
                          No Fattura
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug">
                        Autocontrollo, Ring Test o prove interne. Non genera pratiche in Fatturazione.
                      </p>
                    </button>
                  </div>
                </div>

                {(() => {
                  const internalLabClient: Client = {
                    id: '__LAB_INTERNO__',
                    denominazione: 'Laboratorio Chimico Merceologico (Uso Interno / QC / Ring Test)',
                    partitaIva: '01751450667',
                    codiceFiscale: '01751450667',
                    email: 'laboratorio@agenziagransasso.camcom.it',
                    telefono: '',
                    indirizzo: 'Via degli Opifici n°1 - Z.I. di Bazzano',
                    comune: "67100 L'Aquila",
                    fatturatoAnnuo: {},
                    categorieFatturato: {}
                  };
                  const selectableClients = (modalitaAccettazione === 'uso_interno' || destinatarioFatturaId === '__LAB_INTERNO__' || intestatarioId === '__LAB_INTERNO__')
                    ? [internalLabClient, ...clients.filter(c => c.id !== '__LAB_INTERNO__')]
                    : clients;

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cliente pagatore */}
                      <div>
                        <label className="block text-xs font-extrabold text-slate-700 flex items-center gap-1 mb-1">
                          <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                          {modalitaAccettazione === 'uso_interno'
                            ? 'Ente / Soggetto di Riferimento (Uso Interno o Ring Test) *'
                            : 'Il Cliente (Colui che paga e a cui è fatturato) *'}
                        </label>
                        <span className="text-[10px] text-slate-400 block mb-1">
                          {modalitaAccettazione === 'uso_interno'
                            ? 'Laboratorio interno oppure ente organizzatore del circuito interlaboratorio'
                            : 'Il committente a cui viene intestata la fattura del rapporto'}
                        </span>
                        <SearchableSelect<Client>
                          items={selectableClients}
                          value={destinatarioFatturaId}
                          onChange={(val) => handleClientePagatoreChange(val)}
                          getDisplayValue={(c) => `${c.denominazione} (P.Iva: ${c.partitaIva})`}
                          getSearchText={(c) => `${c.denominazione} ${c.partitaIva}`}
                          getItemId={(c) => c.id}
                          placeholder="Digita per cercare il cliente o laboratorio..."
                          required
                        />
                      </div>

                      {/* Destinatario finale del rapporto */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-xs font-extrabold text-slate-700 flex items-center gap-1">
                            <Building className="h-3.5 w-3.5 text-blue-500" /> 
                            Destinatario finale del Rapporto di Prova *
                          </label>
                          <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-500">
                            <input
                              type="checkbox"
                              checked={copiaFattura}
                              onChange={(e) => handleCopiaFatturaChange(e.target.checked)}
                              className="rounded text-indigo-600 focus:ring-0"
                            />
                            Coincide con il primo soggetto
                          </label>
                        </div>
                        <span className="text-[10px] text-slate-400 block mb-1">Ente a cui è intestata la conformità nel certificato</span>
                        <SearchableSelect<Client>
                          items={selectableClients}
                          value={copiaFattura ? destinatarioFatturaId : intestatarioId}
                          onChange={(val) => handleIntestatarioChange(val)}
                          getDisplayValue={(c) => `${c.denominazione} (P.Iva: ${c.partitaIva})`}
                          getSearchText={(c) => `${c.denominazione} ${c.partitaIva}`}
                          getItemId={(c) => c.id}
                          placeholder="Digita per cercare il destinatario..."
                          disabled={copiaFattura}
                          required
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* CASO 1: Preventivo / Quotazione Associato */}
                {modalitaAccettazione === 'preventivo' ? (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                      <label className="block text-xs font-extrabold text-slate-700 flex items-center gap-1">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-amber-500" />
                        Preventivo o Offerta Associata al Campione (*)
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 cursor-pointer hover:text-slate-800 select-none">
                        <input
                          type="checkbox"
                          checked={mostraPreventiviScaduti}
                          onChange={(e) => setMostraPreventiviScaduti(e.target.checked)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5 cursor-pointer"
                        />
                        <span>Mostra anche Scaduti / Rifiutati</span>
                      </label>
                    </div>
                    <span className="text-[10px] text-slate-400 block mb-1">
                      Seleziona il preventivo del cliente (oppure scegli sopra &ldquo;2. Diretta da Listino&rdquo; se il campione è stato consegnato senza offerta preventiva).
                    </span>
                    
                    <SearchableSelect<Preventivo>
                      items={preventivi.filter(p => {
                        const matchesClient = !destinatarioFatturaId || p.clienteId === destinatarioFatturaId || p.clienteId === intestatarioId;
                        if (!matchesClient) return false;
                        if (p.id === preventivoId) return true;
                        if (!mostraPreventiviScaduti && (p.stato === 'Scaduto' || p.stato === 'Rifiutato')) {
                          return false;
                        }
                        return true;
                      })}
                      value={preventivoId}
                      onChange={(val) => {
                        setPreventivoId(val);
                        const foundPrev = preventivi.find(p => p.id === val);
                        if (foundPrev && foundPrev.clienteId) {
                          const billClientId = foundPrev.clienteId;
                          const rdpClientId = foundPrev.clienteFinaleId || foundPrev.clienteId;
                          setDestinatarioFatturaId(billClientId);
                          setIntestatarioId(rdpClientId);
                          setCopiaFattura(billClientId === rdpClientId);
                          updateDestinatarioFinaleAutomaticamente(rdpClientId);
                        }
                      }}
                      getDisplayValue={(p) => {
                        const clientName = clients.find(cl => cl.id === p.clienteId)?.denominazione || 'Sconosciuto';
                        const badgeStato = p.stato === 'Scaduto' 
                          ? '⚠️ [SCADUTO]' 
                          : p.stato === 'Rifiutato' 
                            ? '⛔ [RIFIUTATO]' 
                            : p.stato === 'In Approvazione'
                              ? '⏳ [IN APPROVAZIONE]'
                              : '✅ [APPROVATO]';
                        return `${p.codice} • ${badgeStato} • Totale: €${p.totale} (${clientName})`;
                      }}
                      getSearchText={(p) => {
                        const clientName = clients.find(cl => cl.id === p.clienteId)?.denominazione || 'Sconosciuto';
                        return `${p.codice} ${p.totale} ${clientName} ${p.stato}`;
                      }}
                      getItemId={(p) => p.id}
                      placeholder="Digita per cercare il preventivo, offerta o cliente..."
                      required
                    />

                    {/* Avvisi Contestuali sullo Stato del Preventivo Selezionato */}
                    {(() => {
                      const selP = preventivi.find(p => p.id === preventivoId);
                      if (!selP) return null;
                      if (selP.stato === 'Scaduto') {
                        return (
                          <div className="mt-2.5 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <p className="font-extrabold text-amber-950">Attenzione: Il preventivo selezionato ({selP.codice}) è SCADUTO</p>
                              <p className="text-[11px] text-amber-800 leading-normal">
                                I termini di validità temporale dell&apos;offerta sono scaduti. Il preventivo rimarrà archiviato come Scaduto. Procedi solo se concordato con la Direzione.
                              </p>
                            </div>
                          </div>
                        );
                      }
                      if (selP.stato === 'Rifiutato') {
                        return (
                          <div className="mt-2.5 p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-xs text-rose-900 shadow-2xs">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <p className="font-extrabold text-rose-950">Attenzione: Il preventivo selezionato ({selP.codice}) è RIFIUTATO</p>
                              <p className="text-[11px] text-rose-800 leading-normal">
                                Questa offerta risulta rifiutata dal committente. Verificare con l&apos;amministrazione prima di procedere con l&apos;accettazione.
                              </p>
                            </div>
                          </div>
                        );
                      }
                      if (selP.stato === 'In Approvazione') {
                        return (
                          <div className="mt-2.5 p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-900 shadow-2xs">
                            <Info className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="text-[11px]">
                              Questo preventivo è attualmente <strong>In Approvazione</strong>: al salvataggio del campione passerà <strong>automaticamente ad Approvato</strong>.
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* UI per la selezione puntuale delle prove dal preventivo */}
                    {preventivoId && (
                      <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 p-2.5 border-b border-slate-200">
                          <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-indigo-500" />
                            Spunta Prove e Pacchetti da Applicare al Campione
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Deseleziona le prove o i pacchetti che non devono essere eseguiti per questo specifico campione (ad esempio prove opzionali).</p>
                        </div>
                        <div className="p-2 max-h-48 overflow-y-auto space-y-3 bg-white">
                          {(() => {
                            const assocPrev = preventivi.find(p => p.id === preventivoId);
                            if (!assocPrev) return null;
                            
                            const handleToggleTest = (pid: string, isChecked: boolean) => {
                              if (!proveSelezionateDaPreventivo) return;
                              if (isChecked) {
                                setProveSelezionateDaPreventivo([...proveSelezionateDaPreventivo, pid]);
                              } else {
                                setProveSelezionateDaPreventivo(proveSelezionateDaPreventivo.filter(id => id !== pid));
                              }
                            };

                            const handleTogglePackage = (packId: string, isChecked: boolean) => {
                              if (!proveSelezionateDaPreventivo) return;
                              const pack = pacchetti.find(x => x.id === packId);
                              if (!pack) return;
                              
                              if (isChecked) {
                                const newIds = new Set(proveSelezionateDaPreventivo);
                                pack.proveIds?.forEach(pid => newIds.add(pid));
                                setProveSelezionateDaPreventivo(Array.from(newIds));
                              } else {
                                const newIds = new Set(proveSelezionateDaPreventivo);
                                pack.proveIds?.forEach(pid => newIds.delete(pid));
                                setProveSelezionateDaPreventivo(Array.from(newIds));
                              }
                            };

                            return (
                              <>
                                {/* Pacchetti */}
                                {assocPrev.pacchettiSelezionati?.map(item => {
                                  const pack = pacchetti.find(x => x.id === item.pacchettoId);
                                  if (!pack) return null;
                                  const isAllSelected = pack.proveIds.every(pid => proveSelezionateDaPreventivo?.includes(pid));
                                  const isSomeSelected = pack.proveIds.some(pid => proveSelezionateDaPreventivo?.includes(pid));
                                  
                                  return (
                                    <div key={item.pacchettoId} className="border border-purple-100 rounded-md p-2 bg-purple-50/20">
                                      <div className="flex items-center gap-2 mb-2 pb-1 border-b border-purple-100/50">
                                        <input 
                                          type="checkbox" 
                                          checked={isAllSelected}
                                          ref={input => { if (input) input.indeterminate = !isAllSelected && isSomeSelected; }}
                                          onChange={(e) => handleTogglePackage(item.pacchettoId, e.target.checked)}
                                          className="h-3.5 w-3.5 text-purple-600 rounded border-slate-300"
                                        />
                                        <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5 flex-wrap">
                                          {item.gruppo && item.gruppo !== 'Generale' && (
                                            <span className="text-[9px] bg-purple-200 text-purple-900 font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase shadow-3xs">
                                              {item.gruppo}
                                            </span>
                                          )}
                                          <span>{pack.nome}</span>
                                          {item.opzionale && <span className="text-[9px] bg-slate-200 text-slate-600 px-1 rounded ml-1">Opzionale</span>}
                                        </span>
                                      </div>
                                      <div className="pl-5 space-y-1">
                                        {pack.proveIds.map(pid => {
                                          const pInfo = prove.find(x => x.id === pid);
                                          if (!pInfo) return null;
                                          return (
                                            <div key={pid} className="flex items-center gap-2">
                                              <input 
                                                type="checkbox"
                                                checked={proveSelezionateDaPreventivo?.includes(pid) || false}
                                                onChange={(e) => handleToggleTest(pid, e.target.checked)}
                                                className="h-3 w-3 text-emerald-600 rounded border-slate-300"
                                              />
                                              <span className="text-[10px] text-slate-600">{pInfo.nome}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Prove Singole */}
                                {assocPrev.proveSelezionate?.length > 0 && (
                                  <div className="border border-slate-150 rounded-md p-2">
                                    <div className="text-[10px] font-bold text-slate-500 mb-2 pb-1 border-b border-slate-100 uppercase tracking-wider">Prove Singole</div>
                                    <div className="space-y-1.5">
                                      {assocPrev.proveSelezionate.map(item => {
                                        const pInfo = prove.find(x => x.id === item.provaId);
                                        if (!pInfo) return null;
                                        return (
                                          <div key={item.provaId} className="flex items-center gap-2">
                                            <input 
                                              type="checkbox"
                                              checked={proveSelezionateDaPreventivo?.includes(item.provaId) || false}
                                              onChange={(e) => handleToggleTest(item.provaId, e.target.checked)}
                                              className="h-3.5 w-3.5 text-emerald-600 rounded border-slate-300"
                                            />
                                            <span className="text-xs text-slate-700 font-medium flex items-center gap-1.5 flex-wrap">
                                              {item.gruppo && item.gruppo !== 'Generale' && (
                                                <span className="text-[9px] bg-slate-200 text-slate-800 font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase">
                                                  {item.gruppo}
                                                </span>
                                              )}
                                              <span>{pInfo.nome}</span>
                                              {item.opzionale && <span className="text-[9px] bg-slate-200 text-slate-600 px-1 rounded ml-1">Opzionale</span>}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Avviso di Allerta / Blocco & Informazioni di Tracciabilità (Modalità Preventivo) */}
                    <div className={`mt-2.5 p-3 rounded-xl border text-[11px] leading-relaxed transition-all ${
                      !preventivoId 
                        ? 'bg-rose-50 border-rose-200 text-rose-800' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                      <div className="flex gap-2 items-start">
                        <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${!preventivoId ? 'text-rose-650' : 'text-emerald-700'}`} />
                        <div>
                          <p className="font-extrabold uppercase text-[9.5px] tracking-wider">
                            {!preventivoId ? "⚠️ SELEZIONA UN PREVENTIVO O CAMBIA MODALITÀ" : "✅ COERENZA FLUSSO ACCETTAZIONE CON PREVENTIVO"}
                          </p>
                          <p className="font-semibold text-[10.5px]">
                            {!preventivoId 
                              ? "Seleziona un preventivo dall'elenco qui sopra, oppure clicca su '2. Diretta da Listino' o '3. Uso Interno / QC' se il campione non ha un preventivo." 
                              : "Preventivo correttamente collegato. All'atto del salvataggio, la scheda campione verrà inviata direttamente al modulo Fatturazione per €" + (() => {
                                const assocPrev = preventivi.find(p => p.id === preventivoId);
                                if (!assocPrev) return 0;
                                if (!proveSelezionateDaPreventivo) return assocPrev.totale.toFixed(2);
                                
                                let total = 0;
                                assocPrev.proveSelezionate?.forEach(item => {
                                  if (proveSelezionateDaPreventivo.includes(item.provaId)) {
                                    total += (item.prezzoApplicato * item.quantita);
                                  }
                                });
                                
                                assocPrev.pacchettiSelezionati?.forEach(item => {
                                  const pack = pacchetti.find(x => x.id === item.pacchettoId);
                                  if (pack) {
                                    const isSelected = pack.proveIds.some(pid => proveSelezionateDaPreventivo.includes(pid));
                                    if (isSelected) {
                                      total += (item.prezzoApplicato * item.quantita);
                                    }
                                  }
                                });

                                if (assocPrev.scontoPercentuale) {
                                  total = total - (total * assocPrev.scontoPercentuale / 100);
                                }
                                
                                return total.toFixed(2);
                              })() + "."}
                          </p>
                          <p className="text-[10px] mt-1 text-slate-550 leading-relaxed font-normal">
                            💡 <strong>Multiuso Preventivo:</strong> Puoi associare lo stesso identico preventivo a più campioni differenti consegnati dallo stesso cliente.
                          </p>
                          {preventivoId && onViewPreventivo && (
                            <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onViewPreventivo(preventivoId)}
                                className="px-2.5 py-1 bg-white hover:bg-emerald-100/70 text-emerald-800 border border-emerald-300 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
                                title="Apri questo preventivo nel modulo Preventivi per visualizzarlo o creare una revisione/integrazione per nuove prove emerse"
                              >
                                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Apri / Modifica / Integra Preventivo ({preventivi.find(p => p.id === preventivoId)?.codice})</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* CASO 2 & 3: Accettazione Diretta da Listino (Senza Preventivo) o Uso Interno / Ring Test */
                  <div className="space-y-3">
                    <div className="border border-slate-250 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className={`p-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        modalitaAccettazione === 'uso_interno'
                          ? 'bg-cyan-50/70 border-cyan-200'
                          : 'bg-indigo-50/70 border-indigo-200'
                      }`}>
                        <div>
                          <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                            <Layers className={`h-4 w-4 ${modalitaAccettazione === 'uso_interno' ? 'text-cyan-600' : 'text-indigo-600'}`} />
                            {modalitaAccettazione === 'uso_interno'
                              ? 'Selezione Prove Analitiche (Uso Interno / Ring Test / Controllo Qualità)'
                              : 'Selezione Diretta Prove e Pacchetti da Tariffario (Senza Preventivo)'}
                          </p>
                          <p className="text-[10.5px] text-slate-500">
                            Spunta i pacchetti o le singole prove richieste per questo campione.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          {matrice && matrice !== 'Altro...' && (
                            <button
                              type="button"
                              onClick={() => setDirectTestsCategoryFilter(prev => prev === matrice ? 'Tutte' : matrice)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border transition cursor-pointer ${
                                directTestsCategoryFilter === matrice
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              {directTestsCategoryFilter === matrice ? `✓ Filtro Matrice: ${matrice}` : `Filtra per ${matrice}`}
                            </button>
                          )}
                          {(proveSelezionateDaPreventivo && proveSelezionateDaPreventivo.length > 0) && (
                            <button
                              type="button"
                              onClick={() => {
                                setProveSelezionateDaPreventivo([]);
                                setPacchettiDirettiSelezionati([]);
                              }}
                              className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition cursor-pointer"
                            >
                              Svuota selezione
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Barra di Ricerca e Filtro Categoria */}
                      <div className="p-2.5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2 relative">
                          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={directTestsSearch}
                            onChange={(e) => setDirectTestsSearch(e.target.value)}
                            placeholder="Cerca prova per nome, metodo (es. UNI, ISO, pH, acidità) o pacchetto..."
                            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-250 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <select
                            value={directTestsCategoryFilter}
                            onChange={(e) => setDirectTestsCategoryFilter(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-250 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="Tutte">Tutte le categorie ({prove.length} prove)</option>
                            {Array.from(new Set([
                              ...prove.map(p => p.categoriaMerceologica),
                              ...pacchetti.map(pk => pk.categoriaMerceologica)
                            ])).filter(Boolean).sort().map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Riepilogo Pillole Prove Selezionate */}
                      {proveSelezionateDaPreventivo && proveSelezionateDaPreventivo.length > 0 && (
                        <div className="p-2.5 bg-emerald-50/50 border-b border-emerald-150 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-extrabold uppercase text-emerald-800 mr-1">
                            Selezionate ({proveSelezionateDaPreventivo.length}):
                          </span>
                          {proveSelezionateDaPreventivo.map(pid => {
                            const pObj = prove.find(x => x.id === pid);
                            if (!pObj) return null;
                            return (
                              <span
                                key={pid}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-emerald-300 text-emerald-900 rounded-md text-[10px] font-bold shadow-3xs"
                              >
                                <span>{pObj.nome}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProveSelezionateDaPreventivo(prev => (prev || []).filter(x => x !== pid));
                                  }}
                                  className="text-emerald-600 hover:text-rose-600 font-black ml-0.5 cursor-pointer"
                                  title="Rimuovi prova"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Elenco scrollabile Pacchetti e Prove dal Catalogo */}
                      <div className="p-2.5 max-h-64 overflow-y-auto space-y-3 bg-white">
                        {(() => {
                          const q = directTestsSearch.trim().toLowerCase();
                          const filteredPacks = pacchetti.filter(pk => {
                            if (directTestsCategoryFilter !== 'Tutte' && pk.categoriaMerceologica !== directTestsCategoryFilter) return false;
                            if (!q) return true;
                            return pk.nome.toLowerCase().includes(q) || (pk.descrizione || '').toLowerCase().includes(q) || pk.categoriaMerceologica.toLowerCase().includes(q);
                          });

                          const filteredProve = prove.filter(pr => {
                            if (directTestsCategoryFilter !== 'Tutte' && pr.categoriaMerceologica !== directTestsCategoryFilter) return false;
                            if (!q) return true;
                            return pr.nome.toLowerCase().includes(q) || pr.metodoAnalitico.toLowerCase().includes(q) || pr.categoriaMerceologica.toLowerCase().includes(q);
                          });

                          const currentTestIds = proveSelezionateDaPreventivo || [];

                          const handleToggleDirectPackage = (pack: Pacchetto, isChecked: boolean) => {
                            if (isChecked) {
                              setPacchettiDirettiSelezionati(prev => prev.includes(pack.id) ? prev : [...prev, pack.id]);
                              const nextTests = new Set(currentTestIds);
                              pack.proveIds?.forEach(pid => nextTests.add(pid));
                              setProveSelezionateDaPreventivo(Array.from(nextTests));
                            } else {
                              setPacchettiDirettiSelezionati(prev => prev.filter(id => id !== pack.id));
                              const nextTests = new Set(currentTestIds);
                              pack.proveIds?.forEach(pid => nextTests.delete(pid));
                              setProveSelezionateDaPreventivo(Array.from(nextTests));
                            }
                          };

                          const handleToggleDirectTest = (pid: string, isChecked: boolean) => {
                            if (isChecked) {
                              setProveSelezionateDaPreventivo(Array.from(new Set([...currentTestIds, pid])));
                            } else {
                              setProveSelezionateDaPreventivo(currentTestIds.filter(id => id !== pid));
                            }
                          };

                          if (filteredPacks.length === 0 && filteredProve.length === 0) {
                            return (
                              <p className="text-xs text-slate-400 italic text-center py-4">
                                Nessuna prova o pacchetto trovato con i filtri correnti.
                              </p>
                            );
                          }

                          return (
                            <>
                              {filteredPacks.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider border-b border-purple-100 pb-1">
                                    📦 Pacchetti Analitici ({filteredPacks.length})
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {filteredPacks.map(pack => {
                                      const isAllSelected = pack.proveIds.length > 0 && pack.proveIds.every(pid => currentTestIds.includes(pid));
                                      const isSomeSelected = pack.proveIds.some(pid => currentTestIds.includes(pid));
                                      const isPackChecked = pacchettiDirettiSelezionati.includes(pack.id) || isAllSelected;

                                      return (
                                        <label
                                          key={pack.id}
                                          className={`flex items-start justify-between gap-2 p-2 rounded-lg border text-xs cursor-pointer transition ${
                                            isPackChecked
                                              ? 'bg-purple-50/70 border-purple-300 text-purple-950'
                                              : 'bg-slate-50/40 border-slate-200 hover:border-purple-200 text-slate-700'
                                          }`}
                                        >
                                          <div className="flex items-start gap-2">
                                            <input
                                              type="checkbox"
                                              checked={isPackChecked}
                                              ref={input => { if (input) input.indeterminate = !isPackChecked && isSomeSelected; }}
                                              onChange={(e) => handleToggleDirectPackage(pack, e.target.checked)}
                                              className="mt-0.5 h-3.5 w-3.5 text-purple-600 rounded border-slate-300"
                                            />
                                            <div>
                                              <span className="font-bold block leading-snug">{pack.nome}</span>
                                              <span className="text-[10px] text-slate-500">
                                                {pack.categoriaMerceologica} · {pack.proveIds.length} prove incluse
                                              </span>
                                            </div>
                                          </div>
                                          {modalitaAccettazione === 'listino_diretto' && (
                                            <span className="font-mono font-extrabold text-purple-800 text-[11px] shrink-0">
                                              €{pack.prezzoScontato.toFixed(2)}
                                            </span>
                                          )}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {filteredProve.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">
                                    🧪 Prove Singole a Catalogo ({filteredProve.length})
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                                    {filteredProve.map(pInfo => {
                                      const isChecked = currentTestIds.includes(pInfo.id);
                                      return (
                                        <label
                                          key={pInfo.id}
                                          className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition ${
                                            isChecked
                                              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold'
                                              : 'bg-white border-slate-150 hover:border-slate-300 text-slate-700'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2 min-w-0">
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={(e) => handleToggleDirectTest(pInfo.id, e.target.checked)}
                                              className="h-3.5 w-3.5 text-emerald-600 rounded border-slate-300 shrink-0"
                                            />
                                            <div className="truncate">
                                              <span className="block truncate">{pInfo.nome}</span>
                                              <span className="text-[10px] text-slate-400 block truncate">
                                                {pInfo.metodoAnalitico} · {pInfo.categoriaMerceologica}
                                                {pInfo.accreditataAccredia ? ' · ★ ACCREDIA' : ''}
                                              </span>
                                            </div>
                                          </div>
                                          {modalitaAccettazione === 'listino_diretto' && (
                                            <span className="font-mono font-bold text-slate-700 text-[11px] shrink-0">
                                              €{pInfo.prezzoListino.toFixed(2)}
                                            </span>
                                          )}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Banner Riepilogo Economico e Flusso per Listino Diretto o Uso Interno */}
                    {(() => {
                      const countTests = proveSelezionateDaPreventivo?.length || 0;
                      const directTotal = computeDirectListinoTotal(proveSelezionateDaPreventivo, pacchettiDirettiSelezionati);

                      if (countTests === 0) {
                        return (
                          <div className="p-3 rounded-xl border bg-rose-50 border-rose-200 text-rose-800 text-[11px] flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                            <div>
                              <p className="font-extrabold uppercase text-[9.5px] tracking-wider">⚠️ NESSUNA PROVA SELEZIONATA</p>
                              <p className="font-semibold text-[10.5px]">
                                Spunta almeno una prova o un pacchetto analitico dall&apos;elenco sopra per poter registrare il campione.
                              </p>
                            </div>
                          </div>
                        );
                      }

                      if (modalitaAccettazione === 'uso_interno') {
                        return (
                          <div className="p-3 rounded-xl border bg-cyan-50 border-cyan-200 text-cyan-900 text-[11px] flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-cyan-700" />
                            <div>
                              <p className="font-extrabold uppercase text-[9.5px] tracking-wider">
                                🔬 CAMPIONE AD USO INTERNO / RING TEST / QC ({countTests} PROVE SELEZIONATE)
                              </p>
                              <p className="font-semibold text-[10.5px]">
                                Questo campione verrà registrato nel LIMS per l&apos;esecuzione delle prove ed emissione RdP, ma <strong>non genererà alcuna pratica in Fatturazione</strong>.
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="p-3 rounded-xl border bg-indigo-50 border-indigo-200 text-indigo-900 text-[11px] flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-indigo-700" />
                          <div>
                            <p className="font-extrabold uppercase text-[9.5px] tracking-wider">
                              🏷️ ACCETTAZIONE DIRETTA DA LISTINO ({countTests} PROVE SELEZIONATE · TOTALE €{directTotal.toFixed(2)})
                            </p>
                            <p className="font-semibold text-[10.5px]">
                              All&apos;atto del salvataggio, il campione verrà inviato a <strong>Fatturazione</strong> con importo da tariffario pari a <strong>€{directTotal.toFixed(2)}</strong>. Potrai comunque associare un preventivo formale anche in un secondo momento cliccando su &ldquo;Modifica&rdquo;.
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Dettagli Avanzati per il Rapporto di Prova e Tracciabilità LIMS (Richiesta Utente) */}
              <div className="bg-indigo-50/40 p-5 rounded-xl border border-indigo-150 space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-indigo-100">
                  <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg shadow-2xs">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-indigo-900 tracking-wider uppercase block">Dettagli Avanzati per il Rapporto di Prova & Tracciabilità LIMS</span>
                    <p className="text-[10px] text-indigo-600">Configurazione della tracciabilità completa in conformità ai requisiti normativi di prova</p>
                  </div>
                </div>

                {/* SOTTO-SEZIONE 1: CAMPIONAMENTO E PRELIEVO */}
                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-150 shadow-3xs">
                  <span className="text-[10px] font-black text-indigo-850 tracking-wider uppercase block border-b border-slate-100 pb-1">
                    📋 1. Dati del Campionamento e Prelievo
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Esecutore del Campionamento */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Esecutore del Campionamento
                      </label>
                      <ArchivioCombobox
                        title="Esecutori Campionamento"
                        value={campionatoDa}
                        onChange={setCampionatoDa}
                        options={archivioCampionatoDa}
                        onSaveNew={handleSaveNewCampionatoDa}
                        onUpdate={handleUpdateCampionatoDa}
                        onDelete={handleDeleteCampionatoDa}
                        placeholder="es. A cura del Cliente"
                        quickAddPlaceholder="+ Nuovo esecutore campionamento..."
                      />
                    </div>

                    {/* Metodo / Procedura di Campionamento */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Metodo/Procedura di Campionamento
                      </label>
                      <ArchivioCombobox
                        title="Procedure Campionamento"
                        value={proceduraCampionamento}
                        onChange={setProceduraCampionamento}
                        options={archivioProcedureCampionamento}
                        onSaveNew={handleSaveNewProceduraCampionamento}
                        onUpdate={handleUpdateProceduraCampionamento}
                        onDelete={handleDeleteProceduraCampionamento}
                        placeholder="es. Regolamento CEE n. 2568/91 e s.m.i."
                        quickAddPlaceholder="+ Nuova procedura di campionamento..."
                      />
                    </div>

                    {/* Punto di Prelievo */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Punto di Prelievo
                      </label>
                      <input
                        type="text"
                        placeholder="es: Presa d'acqua principale, Pozzo, Serbatoio"
                        value={puntoPrelievo}
                        onChange={(e) => setPuntoPrelievo(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
                      />
                    </div>

                    {/* Comune di Prelievo */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Comune di Prelievo
                      </label>
                      <input
                        type="text"
                        placeholder="es: L'Aquila, Sulmona, ecc."
                        value={comunePrelievo}
                        onChange={(e) => setComunePrelievo(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
                    {/* Data Prelievo */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Data del Prelievo
                      </label>
                      <input
                        type="date"
                        value={dataPrelievo}
                        onChange={(e) => setDataPrelievo(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-700"
                      />
                    </div>

                    {/* Ora del Prelievo */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Ora del Prelievo
                      </label>
                      <input
                        type="text"
                        placeholder="es: 08:30"
                        value={oraPrelievo}
                        onChange={(e) => setOraPrelievo(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-850"
                      />
                    </div>

                    {/* Chi ha assistito o consegna */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" title="Nome di chi consegna il campione">
                        Chi consegna il campione
                      </label>
                      <input
                        type="text"
                        placeholder="es: Sig. Mario Rossi (Delegato)"
                        value={consegnanteRelazione}
                        onChange={(e) => setConsegnanteRelazione(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    {/* In qualità di */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Consegnato in qualità di
                      </label>
                      <QualitaConsegnanteCombobox
                        value={qualitaConsegnante}
                        onChange={setQualitaConsegnante}
                        options={archivioQualitaConsegnante}
                        onSaveNew={handleSaveNewQualita}
                        onUpdate={handleUpdateQualita}
                        onDelete={handleDeleteQualita}
                        placeholder="es. Titolare / Delegato"
                      />
                    </div>
                  </div>
                </div>

                {/* SOTTO-SEZIONE 2: TRASPORTO, CONSERVAZIONE, RICEVIMENTO */}
                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-150 shadow-3xs">
                  <span className="text-[10px] font-black text-indigo-850 tracking-wider uppercase block border-b border-slate-100 pb-1">
                    🚚 2. Logistica, Trasporto e Conservazione
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* Data Ricevimento */}
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Data Arrivo/Ricevimento
                      </label>
                      <input
                        type="date"
                        value={dataAccettazione}
                        onChange={(e) => setDataAccettazione(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-slate-700"
                      />
                    </div>

                    {/* Ora Ricevimento */}
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Ora Arrivo
                      </label>
                      <input
                        type="text"
                        placeholder="es: 10:30"
                        value={oraRicevimento}
                        onChange={(e) => setOraRicevimento(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    {/* Temperatura ad Arrivo */}
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Temp. ad Accettazione
                      </label>
                      <input
                        type="text"
                        placeholder="es: +4 °C"
                        value={temperatura}
                        onChange={(e) => setTemperatura(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    {/* Temperatura durante il Trasporto */}
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Temp. durante Trasporto
                      </label>
                      <input
                        type="text"
                        placeholder="es: +4 °C, Controllata"
                        value={temperaturaTrasporto}
                        onChange={(e) => setTemperaturaTrasporto(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    {/* Temperatura di Conservazione Lab */}
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Temp. Conservazione Lab
                      </label>
                      <input
                        type="text"
                        placeholder="es: Frigo +4 °C / Ambiente"
                        value={temperaturaConservazioneLab}
                        onChange={(e) => setTemperaturaConservazioneLab(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  {/* Verifica conformità termiche dei campioni - come da verbale cartaceo */}
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-2.5 rounded-lg">
                    {/* Conformità Temp Accettazione */}
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Verifica Temp. Accettazione Conforme (2-8°C / 18-28°C)
                      </span>
                      <div className="flex gap-2">
                        {['si', 'no', 'N/A'].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setTempAccettazioneConforme(v as any)}
                            className={`flex-1 py-1 px-3 text-xs font-semibold rounded-lg border transition ${
                              tempAccettazioneConforme === v
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {v === 'si' ? '✅ Sì' : v === 'no' ? '❌ No' : '➖ N/A'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Conformità Temp Trasporto */}
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Verifica Temp. Trasporto Conforme (2-8°C alimenti)
                      </span>
                      <div className="flex gap-2">
                        {['si', 'no', 'N/A'].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setTempTrasportoConforme(v as any)}
                            className={`flex-1 py-1 px-3 text-xs font-semibold rounded-lg border transition ${
                              tempTrasportoConforme === v
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {v === 'si' ? '✅ Sì' : v === 'no' ? '❌ No' : '➖ N/A'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Conformità Temp Conservazione */}
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Verifica Temp. Conservazione Lab Conforme (2-8°C)
                      </span>
                      <div className="flex gap-2">
                        {['si', 'no', 'N/A'].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setTempConservazioneConforme(v as any)}
                            className={`flex-1 py-1 px-3 text-xs font-semibold rounded-lg border transition ${
                              tempConservazioneConforme === v
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {v === 'si' ? '✅ Sì' : v === 'no' ? '❌ No' : '➖ N/A'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SOTTO-SEZIONE 3: IDENTIFICAZIONE CAMPIONE E CERTIFICAZIONE */}
                <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-150 shadow-3xs">
                  <span className="text-[10px] font-black text-indigo-850 tracking-wider uppercase block border-b border-slate-100 pb-1">
                    🏷️ 3. Identificazione Campione e Confezionamento
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Etichetta Campione */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Etichetta Campione
                      </label>
                      <ArchivioCombobox
                        title="Archivio Etichette Campione"
                        value={etichettaCampione}
                        onChange={setEtichettaCampione}
                        options={archivioEtichette}
                        onSaveNew={handleSaveNewEtichetta}
                        onUpdate={handleUpdateEtichetta}
                        onDelete={handleDeleteEtichetta}
                        placeholder="es: Etichetta originale del produttore"
                        quickAddPlaceholder="+ Inserisci nuova etichetta..."
                      />
                    </div>

                    {/* Imballaggio / Confezionamento */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Imballaggio / Confezionamento
                      </label>
                      <ArchivioCombobox
                        title="Archivio Imballaggi / Confezionamenti"
                        value={imballaggio}
                        onChange={setImballaggio}
                        options={archivioImballaggi}
                        onSaveNew={handleSaveNewImballaggio}
                        onUpdate={handleUpdateImballaggio}
                        onDelete={handleDeleteImballaggio}
                        placeholder="es: Bottiglia in vetro scuro"
                        quickAddPlaceholder="+ Inserisci nuovo imballaggio..."
                      />
                    </div>

                    {/* Descrizione fornita dal Cliente (Informazioni Cliente) */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Descrizione fornita dal cliente
                      </label>
                      <input
                        type="text"
                        placeholder="Informazioni o descrizioni del cliente"
                        value={informazioniCliente}
                        onChange={(e) => setInformazioniCliente(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                </div>


              </div>

              {/* Fila Termini e Note */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Data Inizio Prove
                  </label>
                  <input
                    type="date"
                    value={dataInizioProva}
                    onChange={(e) => setDataInizioProva(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Data Termine Prove
                  </label>
                  <input
                    type="date"
                    value={dataTermineProva}
                    onChange={(e) => setDataTermineProva(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Data Consegna Risultati Prevista
                  </label>
                  <input
                    type="date"
                    value={consegna}
                    onChange={(e) => setConsegna(e.target.value)}
                    className="w-full px-3 py-2 border border-rose-200/60 rounded-lg text-xs bg-rose-50/20 text-rose-950 font-bold focus:outline-none focus:ring-1 focus:ring-rose-400 shadow-3xs"
                  />
                  <p className="text-[10px] text-rose-700/90 font-semibold mt-1 flex items-center gap-1">
                    <span>📌</span>
                    <span>Pre-calcolata dai tempi analitici delle prove (modificabile se necessario).</span>
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Note d&apos;Accettazione / Prescrizioni Tecniche del Laboratorio
                </label>
                <textarea
                  rows={2}
                  placeholder="Annotazioni sullo stato della confezione, anomalie, sigilli, accordi speciali, priorità chimico-analitica..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:outline-none"
                ></textarea>
              </div>

              {/* Firma Operatore per l'Audit Trail di Accettazione */}
              <div className="bg-slate-950 text-white p-4 rounded-xl border border-slate-800 space-y-3 shadow-md">
                <span className="text-[11px] font-black text-amber-400 tracking-wider uppercase block">
                  🔐 Firma con Validazione ed Audit Trail
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Selezione Operatore */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Operatore Firmatario (*)
                    </label>
                    <select
                      value={operator}
                      onChange={(e) => {
                        const val = e.target.value;
                        setOperator(val);
                        setFormOperatorPassword('');
                        setFormError(null);
                        
                        const foundOp = (operators || []).find(o => o.nome === val);
                        if (foundOp) {
                          setOperatorRuolo(getOperatorQualificationLabel(foundOp));
                        }
                      }}
                      className="w-full px-3 py-2 bg-indigo-400 border-indigo-400 hover:bg-indigo-500 hover:border-indigo-500 text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                    >
                      {operators && operators.length > 0 ? (
                        operators.filter(op => op.attivo !== false).map(op => (
                          <option key={op.nome} value={op.nome}>
                            {op.nome} ({getOperatorQualificationLabel(op)})
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="Dott. Chim. F. Lupo">Dott. Chim. F. Lupo</option>
                          <option value="Dott.ssa S. Bianchi">Dott.ssa S. Bianchi</option>
                          <option value="Dott. R. Vitale">Dott. R. Vitale</option>
                        </>
                      )}
                      <option value="Altro">Altro (Inserimento e tracciamento temporaneo)</option>
                    </select>
                  </div>

                  {/* Selezione Ruolo nel Laboratorio */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Qualifica / Ruolo (da Gestione Operatori) (*)
                    </label>
                    <select
                      value={operatorRuolo}
                      onChange={(e) => setOperatorRuolo(e.target.value)}
                      className="w-full px-3 py-2 bg-indigo-400 border-indigo-400 hover:bg-indigo-500 hover:border-indigo-500 text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                    >
                      {(() => {
                        const foundOp = (operators || []).find(o => o.nome === operator);
                        const opQuals = foundOp ? [getOperatorQualificationLabel(foundOp), ...getOperatorQualificationsList(foundOp)] : [];
                        const allOpQuals = (operators || []).flatMap(o => [getOperatorQualificationLabel(o), ...getOperatorQualificationsList(o)]);
                        const baseRoles = [
                          'Responsabile Tecnico',
                          'Vice Responsabile Tecnico',
                          'Responsabile di Reparto',
                          'Responsabile Amministrativo',
                          'Chimico Senior',
                          'Tecnico Chimico',
                          'Tecnico Microbiologo',
                          'Operatore Tecnico',
                          'Addetto Accettazione'
                        ];
                        const uniqueRoles = Array.from(new Set([
                          ...(operatorRuolo ? [normalizeQualificationLabel(operatorRuolo)] : []),
                          ...opQuals,
                          ...allOpQuals,
                          ...baseRoles
                        ])).filter(Boolean);
                        return uniqueRoles.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ));
                      })()}
                    </select>
                  </div>

                  {/* Password di Sicurezza dell'Operatore */}
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Chiave d&apos;Accesso / Password Operatore per l&apos;Audit Trail (*)
                    </label>
                    <input
                      type="password"
                      value={formOperatorPassword}
                      onChange={(e) => {
                        setFormOperatorPassword(e.target.value);
                        setFormError(null);
                      }}
                      placeholder="es: lupo123, bianchi123, vitale123 per confermare analitica"
                      className="w-full px-3 py-2 bg-indigo-400 border-indigo-400 hover:bg-indigo-500 hover:border-indigo-500 text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400"
                      required
                    />
                  </div>
                </div>

                {formError && (
                  <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-lg text-[11px] font-semibold text-rose-300 animate-fadeIn text-left">
                    ⚠️ {formError}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Indietro
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-400 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow cursor-pointer"
                >
                  {editingAcc ? 'Salva Modifiche Accettazione' : 'Conferma ed Accetta Campione'}
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* Registro Accettazioni */
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {displayedAccettazioni.length === 0 ? (
              <div className="text-center py-20 bg-white border border-slate-200 rounded-xl max-w-full">
                <AlertTriangle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">Nessun campione di accettazione registrato con questi criteri di ricerca.</p>
                <button 
                  onClick={handleOpenAdd}
                  className="text-xs text-blue-600 font-bold hover:underline mt-2 cursor-pointer"
                >
                  Registra un nuovo campione adesso
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {displayedAccettazioni.map(acc => {
                  const isExpanded = expandedId === acc.id;
                  const assocPrev = preventivi.find(p => p.id === acc.preventivoAssociatoId);

                  // Calcolo classe di stile per stato idoneità
                  let idoneitaBadge = '';
                  if (acc.statoInArrivo === 'Idoneo') {
                    idoneitaBadge = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                  } else if (acc.statoInArrivo === 'Non Idoneo') {
                    idoneitaBadge = 'bg-red-50 text-red-800 border-red-100';
                  } else {
                    idoneitaBadge = 'bg-amber-50 text-amber-800 border-amber-100';
                  }

                  // Calcolo classe di stile per stato analisi
                  let analisiBadge = '';
                  if (acc.analisiStato === 'In Attesa') {
                    analisiBadge = 'bg-slate-100 text-slate-600';
                  } else if (acc.analisiStato === 'In Corso') {
                    analisiBadge = 'bg-blue-50 text-blue-800 border-blue-200/50';
                  } else if (acc.analisiStato === 'Completato') {
                    analisiBadge = 'bg-emerald-500 text-white';
                  } else {
                    analisiBadge = 'bg-red-500 text-white';
                  }

                  // Calcolo stato consegna (ritardo o in scadenza) e relativo conto alla rovescia
                  const { deliveryStatus, diffDays, countdownText } = (() => {
                    if (!acc.consegnaPrevista) {
                      return { deliveryStatus: 'ok', diffDays: null, countdownText: '' };
                    }
                    const delDate = new Date(acc.consegnaPrevista);
                    if (isNaN(delDate.getTime())) {
                      return { deliveryStatus: 'ok', diffDays: null, countdownText: '' };
                    }
                    delDate.setHours(0,0,0,0);

                    if (acc.analisiStato === 'Completato') {
                      let compDate = new Date();
                      if (acc.dataTermineProva) {
                        compDate = new Date(acc.dataTermineProva);
                      } else if (acc.statoHistory) {
                        const compLog = acc.statoHistory.filter(h => h.statoNuovo === 'Completato').pop();
                        if (compLog && compLog.dataOra) {
                          const parts = compLog.dataOra.split(/[\s,]+/);
                          const dateParts = parts[0].split('/');
                          if (dateParts.length === 3) {
                            compDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
                          }
                        }
                      }
                      
                      compDate.setHours(0,0,0,0);
                      const diffTimeComp = delDate.getTime() - compDate.getTime();
                      const diffDaysComp = Math.ceil(diffTimeComp / (1000 * 60 * 60 * 24));
                      
                      if (diffDaysComp < 0) {
                        const absDays = Math.abs(diffDaysComp);
                        return { 
                          deliveryStatus: 'ritardo', 
                          diffDays: diffDaysComp, 
                          countdownText: `✓ COMPLETATO (IN RITARDO DI ${absDays} ${absDays === 1 ? 'GIORNO' : 'GIORNI'})` 
                        };
                      }
                      return { deliveryStatus: 'ok', diffDays: null, countdownText: '✓ COMPLETATO IN TEMPO' };
                    }
                    
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const diffTime = delDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    let status = 'ok';
                    let text = '';
                    if (diffDays < 0) {
                      status = 'ritardo';
                      const absDays = Math.abs(diffDays);
                      text = `⚠️ SCADUTO DA ${absDays} ${absDays === 1 ? 'GIORNO' : 'GIORNI'}`;
                    } else if (diffDays === 0) {
                      status = 'avvicina';
                      text = `⏰ SCADE OGGI!`;
                    } else if (diffDays === 1) {
                      status = 'avvicina';
                      text = `⏳ Scade domani`;
                    } else if (diffDays <= 2) {
                      status = 'avvicina';
                      text = `⏳ Conto alla rovescia: -${diffDays} gg`;
                    } else {
                      text = `⏳ Mancano ${diffDays} giorni`;
                    }
                    return { deliveryStatus: status, diffDays, countdownText: text };
                  })();

                  let alertStyle = '';
                  let alertBadge = null;
                  if (deliveryStatus === 'ritardo') {
                    alertStyle = 'border-l-4 border-l-rose-500 bg-rose-50/15 hover:bg-rose-50/20';
                    alertBadge = (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-extrabold uppercase tracking-wider rounded-md animate-pulse shrink-0 flex items-center gap-1 shadow-3xs" title={countdownText}>
                        {countdownText}
                      </span>
                    );
                  } else if (deliveryStatus === 'avvicina') {
                    alertStyle = 'border-l-4 border-l-amber-500 bg-amber-50/15 hover:bg-amber-50/20';
                    alertBadge = (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-extrabold uppercase tracking-wider rounded-md shrink-0 flex items-center gap-1 shadow-3xs" title={countdownText}>
                        {countdownText}
                      </span>
                    );
                  }

                  return (
                    <div 
                      key={acc.id} 
                      id={`acc-row-${acc.id}`}
                      className={`bg-white border rounded-xl shadow-xs transition-all duration-300 ${
                        isExpanded ? 'border-slate-300 ring-1 ring-slate-100 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                      } ${alertStyle}`}
                    >
                      {/* BARRA SUPERIORE COMPRESSA */}
                      <div className="p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        
                        {/* Codice, Titolo, Data, Matrice */}
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-1 bg-slate-900 text-white font-mono text-[10px] font-black rounded-lg uppercase tracking-wider">
                              {acc.codiceAccettazione}
                            </span>
                            {(acc.revisioneCorrente || 0) > 0 && (
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                                  acc.statoRevisione === 'In Bozza'
                                    ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                                    : 'bg-purple-100 text-purple-900 border-purple-300'
                                }`}
                                title={`Rapporto di Prova in Revisione ${String(acc.revisioneCorrente).padStart(2, '0')} (${acc.statoRevisione || 'Vigente'})`}
                              >
                                Rev. {String(acc.revisioneCorrente).padStart(2, '0')} · {acc.statoRevisione || 'Vigente'}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-md text-[10px] font-extrabold uppercase">
                              🏷️ {acc.matrice}
                            </span>
                            {acc.quantitaCampione && (
                              <span className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-md text-[10px] font-bold">
                                📦 {acc.quantitaCampione}
                              </span>
                            )}
                            {acc.preventivoAssociatoId ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewPreventivo?.(acc.preventivoAssociatoId!);
                                }}
                                className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[10px] font-black transition cursor-pointer flex items-center gap-1 shadow-3xs"
                                title={`Preventivo collegato: ${assocPrev ? assocPrev.codice : acc.preventivoAssociatoId}. Clicca per visualizzare, revisionare o integrare nuove prove.`}
                              >
                                <FileSpreadsheet className="h-3 w-3 text-amber-600" />
                                <span>{assocPrev ? assocPrev.codice : 'Prev. Collegato'}</span>
                              </button>
                            ) : acc.modalitaAccettazione === 'uso_interno' ? (
                              <span
                                className="px-2 py-0.5 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-md text-[10px] font-black flex items-center gap-1 shadow-3xs"
                                title="Campione ad Uso Interno / Ring Test / Controllo Qualità (Non Fatturabile)"
                              >
                                🔬 Uso Interno / QC
                              </span>
                            ) : (
                              <span
                                className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-md text-[10px] font-black flex items-center gap-1 shadow-3xs"
                                title="Accettazione Diretta da Listino (Senza Preventivo). Puoi collegare un preventivo in qualsiasi momento cliccando su Modifica."
                              >
                                🏷️ Da Listino (Senza Prev.)
                              </span>
                            )}
                            {/* Stato Idoneità Arrivo - Clickable per modifica rapida con password */}
                            <button
                              onClick={() => handleToggleAccStatus(acc.id, 'statoInArrivo', acc.statoInArrivo)}
                              className={`px-2.5 py-0.5 border rounded-md text-[10px] font-extrabold transition hover:opacity-80 active:scale-95 cursor-pointer flex items-center gap-1.5 ${idoneitaBadge}`}
                              title="Clicca per modificare lo stato in arrivo"
                            >
                              📦 Arrivo: {acc.statoInArrivo} ⚙️
                            </button>
 
                            {/* Stato Analisi - Clickable per cambia rapido con password */}
                            <button
                              onClick={() => handleToggleAccStatus(acc.id, 'analisiStato', acc.analisiStato)}
                              className={`px-2.5 py-0.5 border rounded-md text-[10px] font-extrabold transition hover:bg-indigo-500 hover:text-white active:scale-95 cursor-pointer flex items-center gap-1.5 ${analisiBadge}`}
                              title="Clicca per modificare lo stato dell'analisi"
                            >
                              🧪 Stato: {acc.analisiStato} ⚙️
                            </button>
                          </div>
 
                          <div>
                            <h4 className="font-extrabold text-slate-850 text-sm md:text-base leading-snug">
                              {acc.descrizioneCampione}
                            </h4>
                          </div>
                        </div>
 
                        {/* Informazioni Crono e Pulsantiera destra */}
                        <div className="flex flex-row lg:flex-col lg:items-end justify-between w-full lg:w-auto border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 shrink-0 gap-3">
                          <div className="text-left lg:text-right font-mono text-[10px] text-slate-400 space-y-0.5">
                            <div className="flex lg:justify-end items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Arrivo: {acc.dataAccettazione}</span>
                            </div>
                            {acc.consegnaPrevista && (
                              <div className="flex flex-col lg:items-end gap-0.5">
                                <div className="flex lg:justify-end items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span className={
                                    deliveryStatus === 'ritardo' 
                                      ? 'text-rose-600 font-black animate-pulse'
                                      : deliveryStatus === 'avvicina' 
                                      ? 'text-amber-650 font-black'
                                      : 'text-slate-500 font-bold'
                                  }>
                                    Resoconto: {acc.consegnaPrevista}
                                  </span>
                                </div>
                                {countdownText && (
                                  <span className={`text-[9px] font-bold uppercase tracking-wider ${
                                    deliveryStatus === 'ritardo' 
                                      ? 'text-rose-700 animate-pulse font-black' 
                                      : deliveryStatus === 'avvicina' 
                                      ? 'text-amber-700 font-extrabold' 
                                      : 'text-slate-500'
                                  }`}>
                                    {countdownText}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 self-end flex-wrap">
                            {/* Tasto Aree Specialistiche (Etichetta Nutrizionale / Rifiuti) */}
                            {onGoToAreeSpecialistiche && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onGoToAreeSpecialistiche(acc.id, undefined, `Campione ${acc.codiceAccettazione}`);
                                }}
                                className="p-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                                title="Apri questo campione nelle Aree Specialistiche (Etichetta Nutrizionale / Classificazione Rifiuti)"
                              >
                                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="hidden xl:inline">Aree Spec.</span>
                              </button>
                            )}

                            {/* Tasto Fatturazione Collegata */}
                            {onGoToFatturazione && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onGoToFatturazione(acc.codiceAccettazione, `Campione ${acc.codiceAccettazione}`);
                                }}
                                className="p-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                                title="Vai alla pratica contabile di fatturazione per questo campione"
                              >
                                <CreditCard className="h-3.5 w-3.5 text-amber-600" />
                                <span className="hidden xl:inline">Fattura</span>
                              </button>
                            )}

                            {/* Tasto Verbale di Accettazione & Etichetta Campione */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewVerbaleAcc(acc);
                              }}
                              className="p-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-750 border border-slate-250 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide shadow-3xs"
                              title="Stampa Verbale di Accettazione Campione (MPG 07) ed Etichetta / Cartellino identificativo"
                            >
                              <Tag className="h-3.5 w-3.5 text-slate-600" />
                              <span>Verbale / Etichetta</span>
                            </button>

                            {/* Tasto Duplica / Clona Campione */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateAccettazione(acc);
                              }}
                              className="p-1.5 px-2 bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                              title="Duplica questa scheda per accettare rapidamente un nuovo campione dello stesso lotto / cliente / preventivo"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              <span className="hidden xl:inline">Duplica</span>
                            </button>

                            {/* Tasti Revisione Controllata RdP (ISO/IEC 17025 §7.8.8) */}
                            {(acc.analisiStato === 'Completato' || (acc.revisioneCorrente || 0) > 0) && onStartRevisionBozza && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const techSigners = getTechnicalSigners(operators);
                                  const preferredOp = techSigners.find(o => o.nome === acc.firmatarioTecnico)
                                    || techSigners[0];
                                  setRevModalAcc(acc);
                                  setRevMotivo('');
                                  setRevTipologia('Rettifica errore materiale / analitico');
                                  setRevOperatore(preferredOp?.nome || (operators || [])[0]?.nome || '');
                                }}
                                className="p-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-850 border border-amber-250 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide"
                                title="Avvia una nuova Revisione Controllata del Rapporto di Prova (ISO/IEC 17025 §7.8.8)"
                              >
                                <RefreshCw className="h-3.5 w-3.5 text-amber-700" />
                                <span>Revisiona RdP</span>
                              </button>
                            )}

                            {(acc.revisioneCorrente || 0) > 0 && onOpenDiffModal && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenDiffModal(acc.id);
                                }}
                                className={`p-1.5 px-2.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide border ${
                                  acc.statoRevisione === 'In Bozza'
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs'
                                    : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-250'
                                }`}
                                title="Confronta le modifiche (Diff Side-by-Side) e approva/emetti la revisione del RdP"
                              >
                                <FileCheck className="h-3.5 w-3.5" />
                                <span>{acc.statoRevisione === 'In Bozza' ? 'Approva Rev.' : 'Storico Diff'}</span>
                              </button>
                            )}

                            {/* Tasto Diretto Stampa RdP */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const firstRepar = acc.firmatarioReparto1 || getDepartmentSigners(operators)[0]?.nome || 'Dott.ssa S. Bianchi';
                                const techSign = acc.firmatarioTecnico || getTechnicalSigners(operators)[0]?.nome || 'Dott. Chim. F. Lupo';
                                
                                setPreviewReportAcc({
                                  ...acc,
                                  firmatarioReparto1: acc.firmatarioReparto1 || firstRepar,
                                  firmatarioTecnico: acc.firmatarioTecnico || techSign,
                                });
                              }}
                              className="p-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wide shadow-3xs"
                              title="Visualizza e stampa subito il Rapporto di Prova (RdP)"
                            >
                              <Printer className="h-3.5 w-3.5 text-indigo-100" />
                              <span>Stampa RdP</span>
                            </button>

                            {/* Tasto Modifica */}
                            <button
                              onClick={() => handleOpenEdit(acc)}
                              className="p-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-lg transition-colors cursor-pointer"
                              title="Modifica scheda accettazione"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>

                            {/* Tasto Cancella con Flow */}
                            {deletingId === acc.id ? (
                              <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-100 animate-fadeIn text-[10px] font-bold">
                                <span className="text-red-700 px-1">Eliminare?</span>
                                <button
                                  onClick={() => {
                                    onDeleteAccettazione(acc.id);
                                    setDeletingId(null);
                                  }}
                                  className="bg-red-600 text-white rounded px-2 py-0.5 cursor-pointer hover:bg-red-700"
                                >
                                  Sì
                                </button>
                                <button
                                  onClick={() => setDeletingId(null)}
                                  className="bg-white border text-slate-500 rounded px-2 py-0.5 cursor-pointer hover:bg-slate-50"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingId(acc.id)}
                                className="p-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:text-red-650 hover:bg-red-50 hover:border-red-100 rounded-lg transition-colors cursor-pointer"
                                title="Cancella accettazione"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {/* Tasto Redigi Rapporto & Dettagli (Apre Scheda Autonoma) / Chiudi Scheda */}
                            {activeAcc ? (
                              <button
                                type="button"
                                onClick={handleCloseReportAndReturnToList}
                                className="p-1.5 px-3 bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-all flex items-center gap-1.5 text-xs font-black cursor-pointer shadow-xs active:scale-95"
                                title="Torna all'elenco generale dei campioni accettati"
                              >
                                <ArrowLeft className="h-3.5 w-3.5 text-slate-700" />
                                <span>Torna all&apos;Elenco</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedId(acc.id);
                                  handleStartEditResults(acc);
                                }}
                                className="p-1.5 px-3 bg-indigo-50 border border-indigo-200 text-indigo-750 hover:bg-indigo-100 hover:text-indigo-900 rounded-lg transition-all flex items-center gap-1.5 text-xs font-black cursor-pointer shadow-xs hover:shadow active:scale-95"
                                title="Apri la scheda autonoma del campione per redigere il rapporto di prova e compilare i dettagli"
                              >
                                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                                <span>Redigi Rapporto & Dettagli</span>
                              </button>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* BLOCCO DETTAGLI ESPANSO */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/50 animate-fadeIn space-y-4">
                          
                          {/* Righe Informative Tecniche */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3">

                            <div className="bg-white p-3 rounded-lg border border-slate-150 shadow-3xs space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Flussi Amministrativi</span>
                              <div className="space-y-1 text-slate-650">
                                <p className="flex items-center gap-1 flex-wrap">
                                  <Building className="h-3 w-3 text-blue-500 shrink-0" />
                                  <span>
                                    Rapporto:{' '}
                                    {onGoToClient && acc.intestatarioRapportoClienteId ? (
                                      <button
                                        type="button"
                                        onClick={() => onGoToClient(acc.intestatarioRapportoClienteId, `Campione ${acc.codiceAccettazione}`)}
                                        className="font-bold text-blue-700 hover:underline cursor-pointer"
                                        title="Vai alla scheda cliente"
                                      >
                                        {getClientDenominazione(acc.intestatarioRapportoClienteId)}
                                      </button>
                                    ) : (
                                      <strong>{getClientDenominazione(acc.intestatarioRapportoClienteId)}</strong>
                                    )}
                                    {getClientEmail(acc.intestatarioRapportoClienteId) ? ` (${getClientEmail(acc.intestatarioRapportoClienteId)})` : ''}
                                  </span>
                                </p>
                                <p className="flex items-center gap-1 flex-wrap">
                                  <CreditCard className="h-3 w-3 text-emerald-500 shrink-0" />
                                  <span>
                                    Fattura a:{' '}
                                    {onGoToClient && acc.destinatarioFatturaClienteId ? (
                                      <button
                                        type="button"
                                        onClick={() => onGoToClient(acc.destinatarioFatturaClienteId, `Campione ${acc.codiceAccettazione}`)}
                                        className="font-bold text-emerald-700 hover:underline cursor-pointer"
                                        title="Vai alla scheda cliente"
                                      >
                                        {getClientDenominazione(acc.destinatarioFatturaClienteId)}
                                      </button>
                                    ) : (
                                      <strong>{getClientDenominazione(acc.destinatarioFatturaClienteId)}</strong>
                                    )}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-slate-150 shadow-3xs space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Riferimento Preventivo / Modalità</span>
                              {assocPrev ? (
                                <div className="text-slate-600 font-mono space-y-0.5">
                                  <p>
                                    Codice: <strong className="text-slate-800">{assocPrev.codice}</strong>
                                  </p>
                                  <p>Data: {assocPrev.dataCreazione}</p>
                                  <p>Totale Campione: <strong className="text-slate-800">€{(() => {
                                    if (!acc.proveSelezionateDaPreventivo) return assocPrev.totale.toFixed(2);
                                    let total = 0;
                                    assocPrev.proveSelezionate?.forEach(item => {
                                      if (acc.proveSelezionateDaPreventivo?.includes(item.provaId)) {
                                        total += (item.prezzoApplicato * item.quantita);
                                      }
                                    });
                                    assocPrev.pacchettiSelezionati?.forEach(item => {
                                      const pack = pacchetti.find(x => x.id === item.pacchettoId);
                                      if (pack && pack.proveIds.some(pid => acc.proveSelezionateDaPreventivo?.includes(pid))) {
                                        total += (item.prezzoApplicato * item.quantita);
                                      }
                                    });
                                    if (assocPrev.scontoPercentuale) {
                                      total = total - (total * assocPrev.scontoPercentuale / 100);
                                    }
                                    return total.toFixed(2);
                                  })()}</strong></p>
                                </div>
                              ) : acc.modalitaAccettazione === 'uso_interno' ? (
                                <div className="text-cyan-900 space-y-0.5">
                                  <p className="font-extrabold text-xs">🔬 Uso Interno / Ring Test / QC</p>
                                  <p className="text-[11px] text-slate-600">Fatturazione: <strong>Esente (Non Fatturabile)</strong></p>
                                  <p className="text-[10.5px] text-slate-500">Prove selezionate: {acc.proveSelezionateDaPreventivo?.length || acc.risultatiAnalisi?.length || 0}</p>
                                </div>
                              ) : (
                                <div className="text-indigo-900 space-y-0.5">
                                  <p className="font-extrabold text-xs">🏷️ Accettazione Diretta da Listino</p>
                                  <p className="text-[11px] text-slate-600 font-mono">
                                    Totale da Tariffario: <strong className="text-slate-800">€{computeDirectListinoTotal(acc.proveSelezionateDaPreventivo, acc.pacchettiDirettiSelezionati).toFixed(2)}</strong>
                                  </p>
                                  <p className="text-[10px] text-slate-400 italic">Puoi associare un preventivo in seguito da &ldquo;Modifica&rdquo;.</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Motivazione di non idoneità o riserva in arrivo (Richiesta Utente) */}
                          {acc.statoInArrivo !== 'Idoneo' && (
                            <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3.5 space-y-1.5 text-xs text-left animate-fadeIn">
                              <span className="font-extrabold text-rose-800 uppercase tracking-widest text-[9.5px] block flex items-center gap-1.5">
                                ⚠️ Provvedimento Idoneità d&apos;Accettazione: <span className="bg-rose-100 px-2 py-0.5 rounded text-rose-905 font-black">{acc.statoInArrivo}</span>
                              </span>
                              {acc.giustificazioneNonIdoneita ? (
                                <blockquote className="text-slate-800 font-medium bg-white/85 p-3 rounded-lg border border-rose-150 leading-relaxed italic">
                                  &ldquo;{acc.giustificazioneNonIdoneita}&rdquo;
                                </blockquote>
                              ) : (
                                <p className="text-slate-500 italic mt-1 leading-normal font-medium bg-white/50 p-2.5 rounded border border-rose-100">
                                  Nessuna motivazione o giustificazione fornita al momento dell&apos;accettazione. Clicca su &ldquo;Modifica&rdquo; per inserire una giustificazione.
                                </p>
                              )}
                            </div>
                          )}

                          {/* Sezione dettagliata del Preventivo Collegato se esiste */}
                          {assocPrev && (
                            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-3xs space-y-2">
                              <h5 className="text-[10px] font-semibold text-slate-450 tracking-wider uppercase flex items-center justify-between gap-1.5">
                                <span className="flex items-center gap-1.5">
                                  <FileSpreadsheet className="h-3.5 w-3.5 text-amber-500" />
                                  Dettaglio Offerta Economica collegata ({assocPrev.codice})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onViewPreventivo && onViewPreventivo(assocPrev.id)}
                                  className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[9px] font-bold transition flex items-center gap-1 cursor-pointer focus:outline-none"
                                  title="Vai alla scheda del preventivo"
                                >
                                  Apri Preventivo <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                                </button>
                              </h5>
                              <div className="text-xs space-y-2">
                                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center">
                                  <div>
                                    <span className="text-slate-500 font-medium">Stato contrattuale preventivo:</span>
                                    <span className={`ml-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${
                                      assocPrev.stato === 'Approvato' 
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {assocPrev.stato}
                                    </span>
                                  </div>
                                  <span className="text-sm font-extrabold text-indigo-700">Valore: €{assocPrev.totale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                                </div>
                                
                                {assocPrev.note && (
                                  <p className="text-slate-400 text-[11px] leading-relaxed italic block border-l-2 border-l-amber-400 pl-2">
                                    &quot;{assocPrev.note}&quot;
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Note di laboratorio */}
                          {acc.noteLab && (
                            <div className="bg-slate-100/60 p-3 rounded-lg border border-slate-200 text-xs">
                              <span className="text-[10px] font-bold text-slate-450 block uppercase tracking-wider mb-1">Prescrizioni e Segnalazioni tecniche</span>
                              <p className="text-slate-600 leading-relaxed italic font-medium">
                                &quot;{acc.noteLab}&quot;
                              </p>
                            </div>
                          )}

                          {/* Registro Audit e Tracciabilità Stati Accettazione (Richiesta Utente) */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 mt-4 space-y-3 text-left">
                            <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                              <span className="font-extrabold text-slate-700 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                                📊 Tracciabilità e Storico Stati Campione
                              </span>
                              <span className="text-[9px] bg-slate-200/60 text-slate-705 px-2.5 py-0.5 rounded-full font-bold">
                                {acc.statoHistory?.length || 0} Eventi registrati
                              </span>
                            </div>
                            {acc.statoHistory && acc.statoHistory.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                {acc.statoHistory.map((h, hIdx) => (
                                  <div key={hIdx} className="text-[11px] flex flex-col justify-between p-3 bg-white border border-slate-150 rounded-lg shadow-3xs space-y-1.5">
                                    <div className="flex justify-between items-start gap-1">
                                      <span className="text-slate-450 font-mono text-[9px] font-bold shrink-0">{h.dataOra}</span>
                                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-black tracking-tighter uppercase shrink-0 ${
                                        h.campoModificato === 'analisiStato' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                      }`}>
                                        {h.campoModificato === 'analisiStato' ? 'Stato Analisi' : 'Stato In Arrivo'}
                                      </span>
                                    </div>
                                    <div className="text-[11px] flex flex-wrap items-center gap-x-1 font-medium text-slate-650">
                                      <span className="text-slate-440 font-extrabold text-[10px] line-through">{h.statoPrecedente || 'Iniziale'}</span>
                                      <span className="text-slate-400 font-bold">&rarr;</span>
                                      <span className={`px-1.5 rounded text-[10px] font-bold ${
                                        h.statoNuovo === 'Completato' ? 'bg-emerald-50 text-emerald-700' :
                                        h.statoNuovo === 'In Corso' ? 'bg-blue-50 text-blue-700' :
                                        'bg-slate-100 text-slate-700'
                                      }`}>{h.statoNuovo}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-1">
                                      Eseguito da: <strong className="text-slate-750 font-bold">{h.operatore}</strong>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-400 text-[10.5px] italic leading-normal m-0 p-1">
                                Nessun cambio di stato registrato. Eventuali modifiche allo stato in arrivo o allo stato analisi nel modulo di modifica saranno tracciate temporalmente con firma operatore in questo registro d'audit integrato.
                              </p>
                            )}
                          </div>

                          {/* SEZIONE GESTIONE RISULTATI & CERTIFICATORE (Richiesta Utente) */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 mt-4 space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-200">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-100 text-indigo-800 rounded-lg">
                                  <Award className="h-4 w-4" />
                                </div>
                                <div>
                                  <h6 className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">
                                    Rapporto di Prova
                                  </h6>
                                  <p className="text-[10px] text-slate-400">Inserimento risultati di laboratorio e stampa rapporto di prova ufficiale</p>
                                </div>
                              </div>
                              
                              <div className="text-[10px] font-bold text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-md">
                                Protocollo LIMS: <span className="font-mono text-slate-800 font-black">{acc.codiceAccettazione}</span>
                              </div>
                            </div>

                            {(() => {
                              const resolvedProve = getResolvedProveForAccettazione(acc);
                              
                              if (resolvedProve.length === 0) {
                                return (
                                  <div className="bg-amber-50/50 border border-amber-150 rounded-lg p-3 flex gap-2 text-xs text-amber-800">
                                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                                    <div className="space-y-1">
                                      <p className="font-bold">Nessuna prova associata</p>
                                      <p className="text-[11px] text-amber-700/90 leading-normal">
                                        Per compilare il Rapporto di Prova, associa questa accettazione a un preventivo attivo che contiene delle analisi o pacchetti di determinazioni.
                                      </p>
                                    </div>
                                  </div>
                                );
                              }

                              const isEditing = editingResultsAccId === acc.id;

                              return (
                                <div className="space-y-4">
                                  {isEditing && (
                                    <div className="bg-emerald-50/90 border border-emerald-300 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-900 shadow-xs animate-fadeIn">
                                      <div className="flex items-start sm:items-center gap-2.5">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                                        <span className="font-medium leading-relaxed">
                                          <strong className="text-emerald-950 font-extrabold uppercase tracking-wide">Modalità Inserimento Risultati Attiva:</strong> Inserisci i dati analitici, le firme, la <strong>Dichiarazione / Giudizio di Conformità</strong> e le <strong>Opinioni ed Interpretazioni</strong> nei riquadri in basso. Clicca sul pulsante qui a fianco o in fondo per salvare.
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                                        <button
                                          onClick={() => handleSaveResults(acc, 'in_corso')}
                                          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0"
                                          title="Salva i risultati finora inseriti mantenendo lo stato del campione 'In Corso'"
                                        >
                                          <Save className="h-3.5 w-3.5" /> Salva Bozza (In Corso)
                                        </button>
                                        <button
                                          onClick={() => handleSaveResults(acc, 'completato')}
                                          className="bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg px-3.5 py-2 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition shadow cursor-pointer shrink-0"
                                          title="Salva i risultati e imposta il campione come 'Completato'"
                                        >
                                          <CheckCircle2 className="h-4 w-4" /> Salva e Completa Analisi
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingResultsAccId(null);
                                            setTempRisultati({});
                                          }}
                                          className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg px-3 py-2 text-xs font-bold transition cursor-pointer shrink-0"
                                        >
                                          Annulla
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* BANNER DI CONFERMA QUADERNO DI CALCOLO */}
                                  {appliedFeedbackMsg && (
                                    <div className="bg-indigo-50 border-2 border-indigo-400 text-indigo-950 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fadeIn">
                                      <div className="flex items-center gap-2.5">
                                        <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0" />
                                        <div className="text-xs">
                                          <span className="font-black text-indigo-950 uppercase tracking-wide">
                                            Risultato Applicato alla Scheda:
                                          </span>{' '}
                                          Il valore <strong className="font-mono text-indigo-900 bg-white px-1.5 py-0.5 rounded border border-indigo-200">{appliedFeedbackMsg.val}</strong> è stato inserito nel campo &quot;Valore Rilevato&quot; per la prova <strong>{appliedFeedbackMsg.provaNome}</strong>.{' '}
                                          <span className="text-emerald-900 font-bold block sm:inline mt-1 sm:mt-0">
                                            👉 Clicca su &quot;Salva e Completa Analisi&quot; per consolidare definitivamente il Rapporto di Prova (RdP).
                                          </span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            handleSaveResults(acc);
                                            setAppliedFeedbackMsg(null);
                                          }}
                                          className="bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition shadow cursor-pointer"
                                          title="Salva immediatamente i risultati nel Rapporto di Prova"
                                        >
                                          <Save className="h-3.5 w-3.5" /> Salva Ora nel RdP
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setAppliedFeedbackMsg(null)}
                                          className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                                          title="Chiudi notifica"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* TABELLA O COMPILATORE INLINE */}
                                  <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-3xs">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50 text-slate-450 uppercase text-[9px] font-black tracking-wider border-b border-slate-200">
                                          <th className="p-3">Analisi / Metodo</th>
                                          <th className="p-3 min-w-[270px]">Risultato</th>
                                          <th className="p-3 w-32">Incertezza</th>
                                          <th className="p-3 w-32">Incertezza (%)</th>
                                          <th className="p-3 w-36">Unità di misura</th>
                                          <th className="p-3 w-40">Data & Tecnico</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {resolvedProve.map(p => {
                                          const rData = acc.risultatiAnalisi?.find(r => r.provaId === p.id);
                                          
                                          if (isEditing) {
                                            const currentVal = tempRisultati[p.id] || {};
                                            return (
                                              <React.Fragment key={p.id}>
                                                <tr className="border-b border-slate-100 hover:bg-slate-50/40">
                                                <td className="p-3">
                                                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                                                    <span>
                                                      {p.nome}
                                                      {!p.accreditataAccredia && (
                                                        <span className="text-slate-700 font-black ml-0.5" title="Prova NON accreditata da ACCREDIA">*</span>
                                                      )}
                                                    </span>
                                                    {p.accreditataAccredia && (
                                                      <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-1 py-0.2 rounded font-bold uppercase tracking-tighter" title="Accreditata ACCREDIA">
                                                        🛡️ ACCR
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="text-[10px] text-slate-450 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                                                    <span>{p.metodoAnalitico || 'Metodo Interno'}</span>
                                                    {p.limiteQuantificazione && (
                                                      <span className="text-[9px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.2 font-sans font-bold" title="Limite di Quantificazione">
                                                        LOQ: {p.limiteQuantificazione}
                                                      </span>
                                                    )}
                                                    {(!isIdrocarburiSingoloComposto(p) && (isIdrocarburiSommaTotale(p) || p.tipoMetodoCalcolo === 'idrocarburi_totali' || (p.nome || '').toLowerCase().includes('idrocarbur') || (p.nome || '').toLowerCase().includes('trialometan') || (p.nome || '').toLowerCase().includes('thm'))) && (
                                                      <span className="text-[9px] text-teal-800 bg-teal-50 border border-teal-200 rounded px-1.5 py-0.2 font-sans font-bold flex items-center gap-1" title="Somma e incertezza calcolate in automatico dai 4 composti singoli secondo le regole LOQ/2">
                                                        ✨ Somma automatica LOQ/2
                                                      </span>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="p-2 min-w-[270px]">
                                                  <div className="flex gap-1.5 items-center">
                                                    <input 
                                                      type="text"
                                                      value={currentVal.valoreRilevato || ''}
                                                      onChange={(e) => {
                                                        const val = e.target.value;
                                                        setTempRisultati(prev => {
                                                          const updated = {
                                                            ...prev,
                                                            [p.id]: computeUpdatedResultRow(val, p, prev[p.id])
                                                          };
                                                          return syncIdrocarburiTotaliResults(updated, resolvedProve, p.id);
                                                        });
                                                      }}
                                                      placeholder="es: 0.18, Assente"
                                                      onBlur={(e) => {
                                                        const finalVal = checkIfValueBelowLOQ(e.target.value, p.limiteQuantificazione);
                                                        setTempRisultati(prev => {
                                                          const updated = {
                                                            ...prev,
                                                            [p.id]: computeUpdatedResultRow(finalVal, p, prev[p.id])
                                                          };
                                                          return syncIdrocarburiTotaliResults(updated, resolvedProve, p.id);
                                                        });
                                                      }}
                                                      className={`min-w-[70px] flex-1 bg-white border rounded px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-850 transition-all ${appliedFeedbackMsg?.rowId === p.id ? 'border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50/40 text-indigo-950 font-bold' : 'border-slate-200'}`}
                                                    />
                                                   {(!isIdrocarburiSingoloComposto(p) && (isIdrocarburiSommaTotale(p) || p.tipoMetodoCalcolo === 'idrocarburi_totali' || (p.nome || '').toLowerCase().includes('idrocarbur') || (p.nome || '').toLowerCase().includes('trialometan') || (p.nome || '').toLowerCase().includes('thm') || (p.formulaCalcolo || '').toLowerCase().includes('loq/2') || (p.formulaCalcolo || '').toLowerCase().includes('bf + cf'))) && (
                                                     <button
                                                       type="button"
                                                       onClick={() => setIdrocarburiModalProva(p)}
                                                       className="px-2.5 py-1 rounded-lg border border-teal-600 bg-teal-600 hover:bg-teal-700 text-white shadow-3xs text-xs font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap transition cursor-pointer"
                                                       title="🧪 Assistente Calcolo Idrocarburi Totali (Somma Bromoformio + Cloroformio + Bromodiclorometano + Dibromoclorometano con regola LOQ/2 e somma incertezze)"
                                                     >
                                                       <FlaskConical className="h-3.5 w-3.5 shrink-0 text-white" />
                                                       <span>Assistente</span>
                                                     </button>
                                                   )}
                                                  {!isIdrocarburiSingoloComposto(p) && (p.formulaCalcolo || p.tipoMetodoCalcolo === 'idrocarburi_totali' || isIdrocarburiSommaTotale(p) || p.tipoMetodoCalcolo === 'kjeldahl' || (p.nome || '').toLowerCase().includes('protein') || (p.nome || '').toLowerCase().includes('azoto') || (p.nome || '').toLowerCase().includes('kjeldahl') || (p.metodoAnalitico || '').toLowerCase().includes('kjeldahl') || (p.metodoAnalitico || '').toLowerCase().includes('1871') || isAcidiGrassiProva(p)) && (
                                                    <button
                                                      type="button"
                                                      onClick={() => setOpenQuadernoRowId(openQuadernoRowId === p.id ? null : p.id)}
                                                       className={openQuadernoRowId === p.id ? "px-1.5 py-1.5 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 bg-indigo-600 border-indigo-600 text-white shadow-3xs" : "px-1.5 py-1.5 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800 shadow-3xs"}
                                                      title={openQuadernoRowId === p.id ? "Chiudi Quaderno di Laboratorio" : "📒 Quaderno di Laboratorio: inserisci le variabili per il calcolo"}
                                                    >
                                                      <BookOpen className="h-3.5 w-3.5" />
                                                    </button>
                                                  )}
                                                  <button
                                                    type="button"
                                                    onClick={() => setOpenRepeatabilityRowId(openRepeatabilityRowId === p.id ? null : p.id)}
                                                    className={`px-1.5 py-1.5 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 ${
                                                      openRepeatabilityRowId === p.id 
                                                        ? 'bg-orange-600 border-orange-600 text-white shadow-3xs' 
                                                        : 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-800 shadow-3xs'
                                                    }`}
                                                    title="🔄 Gestisci Prove di Ripetibilità / Determinazioni Multiple dei Tecnici"
                                                  >
                                                    <Repeat className="h-3.5 w-3.5" />
                                                  </button>
                                                   </div>
                                                 </td>
                                                 <td className="p-2 relative">
                                                  <div className="flex gap-1 items-center">
                                                    <input 
                                                      type="text"
                                                      disabled={!!currentVal.escludiIncertezza}
                                                      value={currentVal.escludiIncertezza ? 'N/D' : (currentVal.incertezza || '')}
                                                      onChange={(e) => {
                                                        const incStr = e.target.value;
                                                        setTempRisultati(prev => {
                                                          const row = prev[p.id] || {};
                                                          const updatedRow = { ...row, incertezza: incStr };
                                                          
                                                          // Calcolo dell'incertezza percentuale corrispondente
                                                          const valStr = updatedRow.valoreRilevato || '';
                                                          const valCleaned = valStr.replace(',', '.');
                                                          const valMatch = valCleaned.match(/[-+]?[0-9]*\.?[0-9]+/);
 
                                                          const incCleaned = incStr.replace('±', '').trim().replace(',', '.');
                                                          const incMatch = incCleaned.match(/[-+]?[0-9]*\.?[0-9]+/);
 
                                                          if (valMatch && incMatch) {
                                                            const xVal = parseFloat(valMatch[0]);
                                                            const yVal = parseFloat(incMatch[0]);
                                                            if (!isNaN(xVal) && xVal !== 0 && !isNaN(yVal)) {
                                                              const pct = (yVal / Math.abs(xVal)) * 100;
                                                              const fraction = valMatch[0].split('.')[1] || '';
                                                              const valueDecimals = fraction.length;
                                                              const precision = Math.max(valueDecimals, 2);
                                                              updatedRow.incertezzaPercentuale = `${pct.toFixed(precision)}%`;
                                                            }
                                                          }
                                                          const updated = {
                                                            ...prev,
                                                            [p.id]: updatedRow
                                                          };
                                                          return syncIdrocarburiTotaliResults(updated, resolvedProve, p.id);
                                                        });
                                                      }}
                                                      placeholder={currentVal.escludiIncertezza ? "N/D (Esclusa)" : "es: ± 0.02, N/D"}
                                                      className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-0"
                                                    />
                                                    
                                                    <button
                                                      type="button"
                                                      disabled={!!currentVal.escludiIncertezza}
                                                      onClick={() => setActiveCalcRowId(activeCalcRowId === p.id ? null : p.id)}
                                                      className={`px-1.5 py-1 rounded border flex items-center justify-center transition cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                                                        activeCalcRowId === p.id 
                                                          ? 'bg-indigo-600 border-indigo-600 text-white' 
                                                          : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                                                      }`}
                                                      title={currentVal.escludiIncertezza ? "Incertezza esclusa" : "Calcolatore automatico incertezza estesa"}
                                                    >
                                                      <Calculator className="h-3.5 w-3.5" />
                                                    </button>
                                                  </div>
                                                  <div className="mt-1 flex flex-col gap-1">
                                                    <label className="inline-flex items-center gap-1 hover:text-indigo-800 text-[10px] text-slate-500 cursor-pointer select-none font-bold">
                                                      <input 
                                                        type="checkbox"
                                                        checked={!!currentVal.escludiIncertezza}
                                                        onChange={(e) => {
                                                          const checked = e.target.checked;
                                                          setTempRisultati(prev => {
                                                            const row = prev[p.id] || {};
                                                            const updated = { 
                                                              ...row, 
                                                              escludiIncertezza: checked,
                                                              incertezza: checked ? 'N/D' : '',
                                                              incertezzaPercentuale: checked ? '' : ''
                                                            };
                                                            // Se deseleziona checked e ci sono puntiIncertezza, ricalcola l'incertezza
                                                            if (!checked && p.puntiIncertezza && p.puntiIncertezza.length > 0) {
                                                              const val = updated.valoreRilevato || '';
                                                              const automatedResult = calculateAutomatedUncertainty(val, p.puntiIncertezza);
                                                              if (automatedResult) {
                                                                updated.incertezza = automatedResult.incertezza;
                                                                updated.incertezzaPercentuale = automatedResult.incertezzaPercentuale;
                                                              }
                                                            }
                                                            return {
                                                              ...prev,
                                                              [p.id]: updated
                                                            };
                                                          });
                                                        }}
                                                        className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer h-3 w-3 accent-indigo-650"
                                                      />
                                                      <span>Ometti Incertezza</span>
                                                    </label>

                                                    {p.puntiIncertezza && p.puntiIncertezza.length > 0 && !currentVal.escludiIncertezza && (
                                                      <div className="text-[9px] font-bold text-teal-600 flex items-center gap-0.5" title="Stima automatica interpolata attiva per questa prova">
                                                        <Sparkles className="h-2.5 w-2.5 text-teal-500 animate-spin" />
                                                        <span>Calcolo da Retta attivo</span>
                                                      </div>
                                                    )}
                                                  </div>

                                                 {activeCalcRowId === p.id && (
                                                    <div className="absolute z-30 mt-1.5 right-2 bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-slate-700 w-64 space-y-2 text-[11px]">
                                                      <div className="flex justify-between items-center pb-1 border-b border-slate-100">
                                                        <span className="font-extrabold text-indigo-900 uppercase text-[9px] tracking-wide flex items-center gap-1">
                                                          <Calculator className="h-3 w-3" /> Incertezza Estesa (U)
                                                        </span>
                                                        <button 
                                                          type="button"
                                                          onClick={() => setActiveCalcRowId(null)}
                                                          className="text-slate-400 hover:text-slate-600"
                                                        >
                                                          <X className="h-3 w-3" />
                                                        </button>
                                                      </div>

                                                      <div className="space-y-2">
                                                        <div>
                                                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                                            Ripetibilità del Metodo (%)
                                                          </label>
                                                          <div className="flex flex-wrap gap-1">
                                                            {[1, 2, 5, 10, 15].map(pct => (
                                                              <button
                                                                type="button"
                                                                key={pct}
                                                                onClick={() => handleCalculateUncertainty(p.id, currentVal.valoreRilevato || '', pct, coverageFactor)}
                                                                className="bg-slate-100 hover:bg-indigo-100 hover:text-indigo-800 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[10px] transition cursor-pointer"
                                                              >
                                                                {pct}%
                                                              </button>
                                                            ))}
                                                          </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                          <div>
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                                                              Fattore k
                                                              <span className="font-normal lowercase text-[8px] text-slate-400 block">livello conf.</span>
                                                            </label>
                                                            <select
                                                              value={coverageFactor}
                                                              onChange={(e) => {
                                                                const k = parseFloat(e.target.value);
                                                                setCoverageFactor(k);
                                                                // Recalculate with default RSD (e.g. 5%) if value is present
                                                                handleCalculateUncertainty(p.id, currentVal.valoreRilevato || '', 5, k);
                                                              }}
                                                              className="w-full bg-white border border-slate-200 rounded p-1 text-[10px] focus:outline-none"
                                                            >
                                                              <option value="2">k=2 (95%)</option>
                                                              <option value="2.58">k=2.58 (99%)</option>
                                                              <option value="1">k=1 (68%)</option>
                                                            </select>
                                                          </div>
                                                          <div className="flex flex-col justify-end">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                                                              Custom RSD%
                                                            </label>
                                                            <input 
                                                              type="number"
                                                              placeholder="es: 3.5"
                                                              className="w-full bg-white border border-slate-200 rounded p-1 text-[10px] font-semibold text-center focus:outline-none"
                                                              onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                if (!isNaN(val)) {
                                                                  handleCalculateUncertainty(p.id, currentVal.valoreRilevato || '', val, coverageFactor);
                                                                }
                                                              }}
                                                            />
                                                          </div>
                                                        </div>

                                                        <div className="bg-slate-50 border border-slate-150 p-2 rounded-lg text-[10px] text-slate-500 leading-normal">
                                                          <span className="font-bold text-slate-600 block">Calcolo UNI EN ISO 17025:</span>
                                                           <code className="font-mono text-indigo-700 font-bold block mt-0.5">U = k × RSD% × Risultato</code>
                                                         </div>

                                                         <div className="border-t border-slate-150 pt-2 pb-1 space-y-1 mt-2 text-left">
                                                           <label className="text-[9px] font-black text-indigo-950 uppercase tracking-widest block mb-0.5">
                                                             Incertezza % Desiderata Diretta (U %)
                                                           </label>
                                                           <div className="flex gap-1.5 items-center">
                                                             <input 
                                                               type="number"
                                                               step="any"
                                                               placeholder="es: 10"
                                                               className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded p-1 text-[10px] font-bold text-slate-800 focus:outline-none"
                                                               onChange={(e) => {
                                                                 const val = parseFloat(e.target.value);
                                                                 if (!isNaN(val) && val >= 0) {
                                                                   handleCalculateDirectUncertaintyPercent(p.id, currentVal.valoreRilevato || '', val);
                                                                 }
                                                               }}
                                                             />
                                                             <span className="text-[10px] font-extrabold text-slate-500 shrink-0">%</span>
                                                           </div>
                                                           <p className="text-[8.2px] text-slate-400 leading-tight mt-0.5">
                                                             Digita direttamente la % finale desiderata per U (U = % × Risultato), bypassando il fattore k.
                                                           </p>
                                                         </div>
                                                         <div style={{display: 'none'}}>
                                                           <span className="font-bold text-slate-600 block">Calcolo UNI EN ISO 17025:</span>
                                                          <code className="font-mono text-indigo-700 font-bold block mt-0.5">U = k × RSD% × Risultato</code>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  )}
                                                </td>
                                                <td className="p-2 relative">
                                                  <input 
                                                    type="text"
                                                    value={currentVal.incertezzaPercentuale || ''}
                                                    onChange={(e) => {
                                                      const pctStr = e.target.value;
                                                      setTempRisultati(prev => {
                                                        const row = prev[p.id] || {};
                                                        const updatedRow = { ...row, incertezzaPercentuale: pctStr };
                                                        
                                                        // Calcolo automatico dell'incertezza assoluta se valoreRilevato è numerico
                                                        const valStr = updatedRow.valoreRilevato || '';
                                                        const cleaned = valStr.replace(',', '.');
                                                        const numericMatch = cleaned.match(/[-+]?[0-9]*\.?[0-9]+/);
                                                        const pctFloat = parseFloat(pctStr.replace('%', '').trim());

                                                        if (numericMatch && !isNaN(pctFloat)) {
                                                          const value = parseFloat(numericMatch[0]);
                                                          const expanded = value * (pctFloat / 100);
                                                          const fraction = numericMatch[0].split('.')[1] || '';
                                                          const valueDecimals = fraction.length;
                                                          const precision = Math.max(valueDecimals, 2);
                                                          updatedRow.incertezza = `± ${expanded.toFixed(precision)}`;
                                                        }

                                                        return {
                                                          ...prev,
                                                          [p.id]: updatedRow
                                                        };
                                                      });
                                                    }}
                                                    placeholder="es: 10%"
                                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                  />
                                                </td>
                                                <td className="p-2">
                                                  <input 
                                                    type="text"
                                                    value={currentVal.unitaMisura || ''}
                                                    onChange={(e) => setTempRisultati(prev => ({
                                                      ...prev,
                                                      [p.id]: { ...prev[p.id], unitaMisura: e.target.value }
                                                    }))}
                                                    placeholder="es: %, mg/kg"
                                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-855"
                                                  />
                                                </td>
                                                <td className="p-2 space-y-1.5">
                                                  <input 
                                                    type="date"
                                                    value={currentVal.dataAnalisi || ''}
                                                    onChange={(e) => setTempRisultati(prev => ({
                                                      ...prev,
                                                      [p.id]: { ...prev[p.id], dataAnalisi: e.target.value }
                                                    }))}
                                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-650 focus:outline-none focus:ring-1 focus:ring-slate-850"
                                                  />
                                                  <select
                                                    value={currentVal.operatore || p.tecnicoEsecutore || (operators || []).filter(op => op.attivo !== false)[0]?.nome || ''}
                                                    onChange={(e) => setTempRisultati(prev => ({
                                                      ...prev,
                                                      [p.id]: { ...prev[p.id], operatore: e.target.value }
                                                    }))}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                    title="Tecnico Esecutore"
                                                  >
                                                    <option value="">-- Tecnico --</option>
                                                    {(operators || []).filter(op => op.attivo !== false).map(op => (
                                                      <option key={op.nome} value={op.nome}>{op.nome} ({getOperatorQualificationLabel(op)})</option>
                                                    ))}
                                                  </select>
                                                </td>
                                              </tr>

                                              {/* Sub-row per il Quaderno di Laboratorio - Calcolo Formule e Variabili */}
                                              {openQuadernoRowId === p.id && (
                                                <QuadernoLaboratorioSubRow
                                                  p={p}
                                                  currentVal={currentVal}
                                                  customFormulaPresets={customFormulaPresets}
                                                  allProveCampione={resolvedProve}
                                                  tempRisultati={tempRisultati}
                                                  strumentiDisponibili={strumenti}
                                                  reagentiDisponibili={reagenti}
                                                  onUpdateMultipleRisultati={(updates) => {
                                                    setTempRisultati(prev => ({
                                                      ...prev,
                                                      ...updates
                                                    }));
                                                  }}
                                                  kjeldahlMassaKHP={kjeldahlMassaKHP}
                                                  setKjeldahlMassaKHP={setKjeldahlMassaKHP}
                                                  kjeldahlVolNaOH_KHP={kjeldahlVolNaOH_KHP}
                                                  setKjeldahlVolNaOH_KHP={setKjeldahlVolNaOH_KHP}
                                                  kjeldahlTitoloNaOH={kjeldahlTitoloNaOH}
                                                  setKjeldahlTitoloNaOH={setKjeldahlTitoloNaOH}
                                                  kjeldahlVolHCl={kjeldahlVolHCl}
                                                  setKjeldahlVolHCl={setKjeldahlVolHCl}
                                                  kjeldahlVolNaOH_HCl={kjeldahlVolNaOH_HCl}
                                                  setKjeldahlVolNaOH_HCl={setKjeldahlVolNaOH_HCl}
                                                  kjeldahlTitoloHCl={kjeldahlTitoloHCl}
                                                  setKjeldahlTitoloHCl={setKjeldahlTitoloHCl}
                                                  kjeldahlVolBianco={kjeldahlVolBianco}
                                                  setKjeldahlVolBianco={setKjeldahlVolBianco}
                                                  kjeldahlVolCampione={kjeldahlVolCampione}
                                                  setKjeldahlVolCampione={setKjeldahlVolCampione}
                                                  kjeldahlPesoCampione={kjeldahlPesoCampione}
                                                  setKjeldahlPesoCampione={setKjeldahlPesoCampione}
                                                  kjeldahlFattoreF={kjeldahlFattoreF}
                                                  setKjeldahlFattoreF={setKjeldahlFattoreF}
                                                  kjeldahlActiveTab={kjeldahlActiveTab}
                                                  setKjeldahlActiveTab={setKjeldahlActiveTab}
                                                  onOpenIdrocarburiWizard={() => setIdrocarburiModalProva(p)}
                                                  onUpdateQuaderno={(newQuad) => {
                                                    setTempRisultati(prev => {
                                                      const row = prev[p.id] || {};
                                                      return {
                                                        ...prev,
                                                        [p.id]: {
                                                          ...row,
                                                          quadernoCalcolo: newQuad
                                                        }
                                                      };
                                                    });
                                                  }}
                                                  onApplyResult={(formattedVal, finalQuad, incertezzaDirect) => {
                                                    setTempRisultati(prev => {
                                                      const row = prev[p.id] || {};
                                                      const updatedRow: RisultatoProva = {
                                                        ...row,
                                                        valoreRilevato: formattedVal,
                                                        quadernoCalcolo: finalQuad
                                                      };

                                                      if (incertezzaDirect !== undefined && incertezzaDirect !== null) {
                                                        updatedRow.incertezza = incertezzaDirect;
                                                      } else if (p.puntiIncertezza && p.puntiIncertezza.length > 0) {
                                                        const automatedResult = calculateAutomatedUncertainty(formattedVal, p.puntiIncertezza);
                                                        if (automatedResult) {
                                                          updatedRow.incertezza = automatedResult.incertezza;
                                                          updatedRow.incertezzaPercentuale = automatedResult.incertezzaPercentuale;
                                                        }
                                                      }

                                                      return {
                                                        ...prev,
                                                        [p.id]: updatedRow
                                                      };
                                                    });
                                                    setAppliedFeedbackMsg({ provaNome: p.nome, val: formattedVal, rowId: p.id });
                                                    setOpenQuadernoRowId(null);
                                                  }}
                                                  onClose={() => setOpenQuadernoRowId(null)}
                                                />
                                              )}

                                              {/* Sub-row per la gestione delle Prove di Ripetibilità dei Tecnici */}
                                              {openRepeatabilityRowId === p.id && (() => {
                                                const currentDets = currentVal.determinazioniRipetibilita || [];
                                                
                                                // Calcoli automatici delle statistiche
                                                const numericValues = currentDets
                                                  .map(d => parseFloat(d.valore.replace(',', '.')))
                                                  .filter(val => !isNaN(val));

                                                let average: number | null = null;
                                                let rsd: number | null = null;
                                                let maxDiff: number | null = null;

                                                if (numericValues.length > 0) {
                                                  const sum = numericValues.reduce((a, b) => a + b, 0);
                                                  average = sum / numericValues.length;

                                                  if (numericValues.length >= 2) {
                                                    if (numericValues.length === 2) {
                                                      const diff = Math.abs(numericValues[0] - numericValues[1]);
                                                      maxDiff = diff;
                                                      rsd = average > 0 ? (diff / average) * 100 : 0;
                                                    } else {
                                                      const mean = average;
                                                      const variance = numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (numericValues.length - 1);
                                                      const sd = Math.sqrt(variance);
                                                      maxDiff = sd;
                                                      rsd = mean > 0 ? (sd / mean) * 100 : 0;
                                                    }
                                                  }
                                                }

                                                const getPrecision = () => {
                                                  let maxDec = 2;
                                                  currentDets.forEach(d => {
                                                    const parts = d.valore.replace(',', '.').split('.');
                                                    if (parts.length === 2 && parts[1].length > maxDec) {
                                                      maxDec = parts[1].length;
                                                    }
                                                  });
                                                  return maxDec;
                                                };
                                                const precision = getPrecision();

                                                return (
                                                  <tr className="bg-amber-50/20 border-b border-orange-100/50">
                                                    <td colSpan={6} className="px-3 pb-3 pt-1">
                                                      <div className="bg-orange-50/20 rounded-xl border border-orange-200/85 p-4 shadow-3xs max-w-4xl space-y-3.5 text-left">
                                                        <div className="flex items-center justify-between pb-1.5 border-b border-orange-100/60">
                                                          <div className="flex items-center gap-2">
                                                            <span className="p-1 px-1.5 bg-orange-100 text-orange-750 rounded-md">
                                                              <Repeat className="h-4 w-4" />
                                                            </span>
                                                            <div>
                                                              <span className="font-extrabold text-slate-850 text-xs uppercase tracking-wide">
                                                                🔄 Prove di Ripetibilità dei Tecnici & Determinazioni Multiple
                                                              </span>
                                                              <p className="text-[10px] text-slate-500">
                                                                Registra le singole determinazioni eseguite dai tecnici per la prova: <strong className="text-slate-700">{p.nome}</strong>
                                                              </p>
                                                            </div>
                                                          </div>
                                                          <button 
                                                            type="button"
                                                            onClick={() => setOpenRepeatabilityRowId(null)}
                                                            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer hover:bg-slate-100 rounded-lg transition"
                                                          >
                                                            <X className="h-3.5 w-3.5" />
                                                          </button>
                                                        </div>

                                                        <div className="space-y-3">
                                                          {/* Elenco Determinazioni */}
                                                          {currentDets.length === 0 ? (
                                                            <div className="text-[11px] text-slate-450 italic py-2 pl-1 bg-white rounded-lg border border-slate-150 p-4 text-center">
                                                              Nessuna determinazione inserita. Aggiungi la prima prova di ripetibilità per iniziare.
                                                            </div>
                                                          ) : (
                                                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                                              {currentDets.map((det, index) => (
                                                                <div key={det.id} className="flex flex-col sm:flex-row gap-2 items-center bg-white p-2.5 rounded-lg border border-slate-200 shadow-3xs text-[11px]">
                                                                  <div className="flex items-center gap-2 shrink-0 font-bold text-orange-700">
                                                                    <span>Det. {index + 1}</span>
                                                                  </div>

                                                                  <div className="grid grid-cols-12 gap-2 flex-1 w-full">
                                                                    {/* Valore Rilevato */}
                                                                    <div className="col-span-3">
                                                                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Risultato</label>
                                                                      <input
                                                                        type="text"
                                                                        value={det.valore}
                                                                        onChange={(e) => {
                                                                          const val = e.target.value;
                                                                          setTempRisultati(prev => {
                                                                            const row = prev[p.id] || {};
                                                                            const currentD = [...(row.determinazioniRipetibilita || [])];
                                                                            const idx = currentD.findIndex(d => d.id === det.id);
                                                                            if (idx !== -1) {
                                                                              currentD[idx] = { ...currentD[idx], valore: val };
                                                                            }
                                                                            return { ...prev, [p.id]: { ...row, determinazioniRipetibilita: currentD } };
                                                                          });
                                                                        }}
                                                                        className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                                                        placeholder="es: 0.18"
                                                                      />
                                                                    </div>

                                                                    {/* Tecnico Esecutore */}
                                                                    <div className="col-span-5">
                                                                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Tecnico Esecutore</label>
                                                                      <select
                                                                        value={det.tecnico}
                                                                        onChange={(e) => {
                                                                          const val = e.target.value;
                                                                          setTempRisultati(prev => {
                                                                            const row = prev[p.id] || {};
                                                                            const currentD = [...(row.determinazioniRipetibilita || [])];
                                                                            const idx = currentD.findIndex(d => d.id === det.id);
                                                                            if (idx !== -1) {
                                                                              currentD[idx] = { ...currentD[idx], tecnico: val };
                                                                            }
                                                                            return { ...prev, [p.id]: { ...row, determinazioniRipetibilita: currentD } };
                                                                          });
                                                                        }}
                                                                        className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                                                      >
                                                                        <option value="">Seleziona Tecnico...</option>
                                                                        {(operators || []).filter(op => op.attivo !== false).map(op => (
                                                                          <option key={op.nome} value={op.nome}>{op.nome} ({getOperatorQualificationLabel(op)})</option>
                                                                        ))}
                                                                      </select>
                                                                    </div>

                                                                    {/* Data Analisi */}
                                                                    <div className="col-span-4">
                                                                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Data Analisi</label>
                                                                      <input
                                                                        type="date"
                                                                        value={det.dataAnalisi || ''}
                                                                        onChange={(e) => {
                                                                          const val = e.target.value;
                                                                          setTempRisultati(prev => {
                                                                            const row = prev[p.id] || {};
                                                                            const currentD = [...(row.determinazioniRipetibilita || [])];
                                                                            const idx = currentD.findIndex(d => d.id === det.id);
                                                                            if (idx !== -1) {
                                                                              currentD[idx] = { ...currentD[idx], dataAnalisi: val };
                                                                            }
                                                                            return { ...prev, [p.id]: { ...row, determinazioniRipetibilita: currentD } };
                                                                          });
                                                                        }}
                                                                        className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] font-mono text-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
                                                                      />
                                                                    </div>
                                                                  </div>

                                                                  {/* Delete button */}
                                                                  <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                      setTempRisultati(prev => {
                                                                        const row = prev[p.id] || {};
                                                                        const currentD = (row.determinazioniRipetibilita || []).filter(d => d.id !== det.id);
                                                                        return { ...prev, [p.id]: { ...row, determinazioniRipetibilita: currentD } };
                                                                      });
                                                                    }}
                                                                    className="text-red-500 hover:text-red-750 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg border border-red-150 transition cursor-pointer shrink-0 ml-2"
                                                                    title="Rimuovi determinazione"
                                                                  >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                  </button>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          )}

                                                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                                                            <button
                                                              type="button"
                                                              onClick={() => {
                                                                const newDet = {
                                                                  id: 'det_' + Date.now() + Math.random().toString(36).substr(2, 4),
                                                                  tecnico: currentVal.operatore || (operators || [])[0]?.nome || '',
                                                                  valore: '',
                                                                  dataAnalisi: currentVal.dataAnalisi || new Date().toISOString().split('T')[0]
                                                                };
                                                                setTempRisultati(prev => {
                                                                  const row = prev[p.id] || {};
                                                                  const currentD = row.determinazioniRipetibilita || [];
                                                                  return { ...prev, [p.id]: { ...row, determinazioniRipetibilita: [...currentD, newDet] } };
                                                                });
                                                              }}
                                                              className="w-full sm:w-auto px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-[10px] uppercase rounded-lg transition-colors shadow-3xs cursor-pointer flex items-center justify-center gap-1.5"
                                                            >
                                                              <Plus className="h-3.5 w-3.5" /> + Nuova Determinazione
                                                            </button>

                                                            {average !== null && (
                                                              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                                                {/* Riepilogo statistiche */}
                                                                <div className="bg-white px-3 py-2 rounded-lg border border-orange-255 text-[10.5px] text-slate-700 flex flex-wrap gap-x-4 gap-y-1 w-full sm:w-auto">
                                                                  <div>
                                                                    <span className="text-slate-400">Media Calcolata:</span>{' '}
                                                                    <strong className="text-orange-950 font-extrabold">{average.toFixed(precision)}</strong>
                                                                  </div>
                                                                  {rsd !== null && (
                                                                    <div>
                                                                      <span className="text-slate-400">{currentDets.length === 2 ? 'Scarto (RPD):' : 'Dev. Std. (RSD%):'}</span>{' '}
                                                                      <strong className="text-slate-900 font-bold">{rsd.toFixed(2)}%</strong>
                                                                    </div>
                                                                  )}
                                                                </div>

                                                                <button
                                                                  type="button"
                                                                  onClick={() => {
                                                                    if (average !== null) {
                                                                      setTempRisultati(prev => {
                                                                        const row = prev[p.id] || {};
                                                                        const updatedRow = { 
                                                                          ...row, 
                                                                          valoreRilevato: average!.toFixed(precision) 
                                                                        };

                                                                        // Ricalcola incertezza
                                                                        if (updatedRow.escludiIncertezza) {
                                                                          updatedRow.incertezza = 'N/D';
                                                                          updatedRow.incertezzaPercentuale = '';
                                                                        } else if (p.puntiIncertezza && p.puntiIncertezza.length > 0) {
                                                                          const automatedResult = calculateAutomatedUncertainty(updatedRow.valoreRilevato, p.puntiIncertezza);
                                                                          if (automatedResult) {
                                                                            updatedRow.incertezza = automatedResult.incertezza;
                                                                            updatedRow.incertezzaPercentuale = automatedResult.incertezzaPercentuale;
                                                                          }
                                                                        }

                                                                        return { ...prev, [p.id]: updatedRow };
                                                                      });
                                                                      setOpenRepeatabilityRowId(null);
                                                                    }
                                                                  }}
                                                                  className="w-full sm:w-auto px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[10px] uppercase rounded-lg transition-colors shadow-3xs cursor-pointer flex items-center justify-center gap-1.5"
                                                                >
                                                                  <Check className="h-3.5 w-3.5" /> Applica Media come Risultato
                                                                </button>
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                );
                                              })()}

                                              {/* Sub-row per la gestione dei limiti di riferimento */}
                                              <tr className="bg-slate-50 border-b border-slate-200">
                                                <td colSpan={6} className="px-3 pb-3 pt-1">
                                                  <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-3xs max-w-4xl space-y-2.5">
                                                    <div className="flex items-center justify-between">
                                                      <span className="font-extrabold text-slate-700 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                                                        ⚖️ Limiti di Riferimento applicabili ({p.nome})
                                                      </span>
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          const newLim = { 
                                                            id: 'lim_' + Date.now() + Math.random().toString(36).substr(2, 4), 
                                                            valore: '0.10', 
                                                            unitaMisura: currentVal.unitaMisura || 'mg/kg', 
                                                            norma: 'Reg. UE 2023/915', 
                                                            note: '' 
                                                          };
                                                          setTempRisultati(prev => {
                                                            const row = prev[p.id] || {};
                                                            const currentLims = row.limitiSelezionati || [];
                                                            return {
                                                              ...prev,
                                                              [p.id]: {
                                                                ...row,
                                                                limitiSelezionati: [...currentLims, newLim]
                                                              }
                                                            };
                                                          });
                                                        }}
                                                        className="text-[10px] font-black text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1 shrink-0"
                                                      >
                                                        + Aggiungi Limite Personalizzato
                                                      </button>
                                                    </div>

                                                    {/* Selezione dei limiti preconfigurati nella Prova (Richiesta Utente) */}
                                                    {p.limitiRiferimento && p.limitiRiferimento.length > 0 && (
                                                      <div className="bg-slate-50 border border-slate-150/80 rounded-xl p-3 text-left">
                                                        <span className="block text-[9.5px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                          📋 Limiti di Riferimento Preimpostati nel Metodo:
                                                        </span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                          {p.limitiRiferimento.map((tmplLim) => {
                                                            const isSelected = currentVal.limitiSelezionati?.some(
                                                              sel => sel.norma === tmplLim.norma && sel.valore === tmplLim.valore
                                                            );
                                                            return (
                                                              <button
                                                                key={tmplLim.id}
                                                                type="button"
                                                                onClick={() => {
                                                                  setTempRisultati(prev => {
                                                                    const row = prev[p.id] || {};
                                                                    const currentLims = row.limitiSelezionati || [];
                                                                    let updatedLims;
                                                                    if (isSelected) {
                                                                      updatedLims = currentLims.filter(
                                                                        sel => !(sel.norma === tmplLim.norma && sel.valore === tmplLim.valore)
                                                                      );
                                                                    } else {
                                                                      const newLim = {
                                                                        id: 'lim_sel_' + Date.now() + Math.random().toString(36).substr(2, 4),
                                                                        valore: tmplLim.valore,
                                                                        unitaMisura: tmplLim.unitaMisura || currentVal.unitaMisura || 'mg/kg',
                                                                        norma: tmplLim.norma,
                                                                        note: tmplLim.note || ''
                                                                      };
                                                                      updatedLims = [...currentLims, newLim];
                                                                    }
                                                                    return {
                                                                      ...prev,
                                                                      [p.id]: {
                                                                        ...row,
                                                                        limitiSelezionati: updatedLims
                                                                      }
                                                                    };
                                                                  });
                                                                }}
                                                                className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer shadow-3xs ${
                                                                  isSelected
                                                                    ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-750'
                                                                    : 'bg-white text-indigo-950 border-indigo-200/80 hover:bg-indigo-50/55 hover:border-indigo-300'
                                                                }`}
                                                              >
                                                                <span className="text-[11px] font-black shrink-0">{isSelected ? '✓' : '+'}</span>
                                                                <span className="truncate max-w-[280px]">{tmplLim.norma} (<span className="font-mono text-indigo-850 font-black">{tmplLim.valore}</span> {tmplLim.unitaMisura})</span>
                                                                {tmplLim.note && (
                                                                  <span className="opacity-80 font-medium italic text-[8.5px] truncate max-w-[120px]"> - {tmplLim.note}</span>
                                                                )}
                                                              </button>
                                                            );
                                                          })}
                                                        </div>
                                                      </div>
                                                    )}
                                                    
                                                    {(!currentVal.limitiSelezionati || currentVal.limitiSelezionati.length === 0) ? (
                                                      <div className="text-[11px] text-slate-450 italic py-1 pl-1">
                                                        Nessun limite di riferimento inserito per questa prova analitica su questo campione.
                                                      </div>
                                                    ) : (
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        {currentVal.limitiSelezionati.map((lim, index) => (
                                                          <div key={lim.id || index} className="flex gap-2 items-center bg-slate-50/50 p-2 rounded-lg border border-slate-150/80 relative text-[11px]">
                                                            <div className="grid grid-cols-12 gap-1.5 flex-1 pt-1">
                                                              {/* Valore */}
                                                              <div className="col-span-3">
                                                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Valore</label>
                                                                <input
                                                                  type="text"
                                                                  value={lim.valore}
                                                                  onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setTempRisultati(prev => {
                                                                      const row = prev[p.id] || {};
                                                                      const currentLims = [...(row.limitiSelezionati || [])];
                                                                      currentLims[index] = { ...currentLims[index], valore: val };
                                                                      return { ...prev, [p.id]: { ...row, limitiSelezionati: currentLims } };
                                                                    });
                                                                  }}
                                                                  className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10.5px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                  placeholder="es: 0.10"
                                                                />
                                                              </div>
                                                              
                                                              {/* U.M. */}
                                                              <div className="col-span-3">
                                                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">U.M.</label>
                                                                <input
                                                                  type="text"
                                                                  value={lim.unitaMisura}
                                                                  onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setTempRisultati(prev => {
                                                                      const row = prev[p.id] || {};
                                                                      const currentLims = [...(row.limitiSelezionati || [])];
                                                                      currentLims[index] = { ...currentLims[index], unitaMisura: val };
                                                                      return { ...prev, [p.id]: { ...row, limitiSelezionati: currentLims } };
                                                                    });
                                                                  }}
                                                                  className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10.5px] font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                  placeholder="es: mg/kg"
                                                                />
                                                              </div>
                                                              
                                                              {/* Norma */}
                                                              <div className="col-span-6">
                                                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Normativa / Riferimento</label>
                                                                <input
                                                                  type="text"
                                                                  value={lim.norma}
                                                                  onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setTempRisultati(prev => {
                                                                      const row = prev[p.id] || {};
                                                                      const currentLims = [...(row.limitiSelezionati || [])];
                                                                      currentLims[index] = { ...currentLims[index], norma: val };
                                                                      return { ...prev, [p.id]: { ...row, limitiSelezionati: currentLims } };
                                                                    });
                                                                  }}
                                                                  className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                  placeholder="es: Reg. UE 2023/915"
                                                                />
                                                              </div>
                                                              
                                                              {/* Note */}
                                                              <div className="col-span-12">
                                                                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Note applicative / Condizioni</label>
                                                                <input
                                                                  type="text"
                                                                  value={lim.note || ''}
                                                                  onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setTempRisultati(prev => {
                                                                      const row = prev[p.id] || {};
                                                                      const currentLims = [...(row.limitiSelezionati || [])];
                                                                      currentLims[index] = { ...currentLims[index], note: val };
                                                                      return { ...prev, [p.id]: { ...row, limitiSelezionati: currentLims } };
                                                                    });
                                                                  }}
                                                                  className="w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] italic text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                  placeholder="Nessuna nota applicativa aggiuntiva"
                                                                />
                                                              </div>
                                                            </div>
                                                            
                                                            {/* Delete button (Trash2) */}
                                                            <button
                                                              type="button"
                                                              onClick={() => {
                                                                setTempRisultati(prev => {
                                                                  const row = prev[p.id] || {};
                                                                  const currentLims = [...(row.limitiSelezionati || [])];
                                                                  currentLims.splice(index, 1);
                                                                  return { ...prev, [p.id]: { ...row, limitiSelezionati: currentLims } };
                                                                });
                                                              }}
                                                              className="text-red-500 hover:text-red-750 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg border border-red-150 transition cursor-pointer self-start mt-4"
                                                              title="Rimuovi limite"
                                                            >
                                                              <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    )}
                                                  </div>
                                                </td>
                                              </tr>
                                            </React.Fragment>
                                          );
                                          } else {
                                            const frazioniAG = getAcidiGrassiFrazioniDisplay(p, rData);

                                            return (
                                              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/20">
                                                <td className="p-3">
                                                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                                                    <span>
                                                      {p.nome}
                                                      {!p.accreditataAccredia && (
                                                        <span className="text-slate-700 font-black ml-0.5" title="Prova NON accreditata da ACCREDIA">*</span>
                                                      )}
                                                    </span>
                                                    {p.accreditataAccredia && (
                                                      <span className="text-[9px] text-emerald-800 bg-emerald-50 border border-emerald-100 px-1 py-0.2 rounded font-bold uppercase tracking-tighter" title="Accreditata ACCREDIA">
                                                        🛡️ ACCR
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex flex-wrap items-center gap-1.5">
                                                    <span>{p.metodoAnalitico || 'Metodo Interno'}</span>
                                                    {p.limiteQuantificazione && (
                                                      <span className="text-[9px] text-amber-800 bg-amber-50 border border-amber-250 rounded px-1.5 py-0.2 font-sans font-bold" title="Limite di Quantificazione">
                                                        LOQ: {p.limiteQuantificazione}
                                                      </span>
                                                    )}
                                                  </div>
                                                  {frazioniAG && frazioniAG.length > 0 && (
                                                    <div className="mt-2 pl-2 border-l-2 border-amber-400 space-y-1 bg-amber-50/40 rounded-r py-1 pr-2">
                                                      {frazioniAG.map((f) => (
                                                        <div key={f.chiave} className="text-[11px] text-slate-700 font-semibold flex items-center justify-between gap-1.5">
                                                          <span className="flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                                            <span>- {f.nome}</span>
                                                          </span>
                                                          <span className="text-[9.5px] font-mono font-bold text-slate-400">({f.sigla})</span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                </td>
                                                <td className="p-3 font-bold text-slate-850">
                                                  {frazioniAG && frazioniAG.length > 0 ? (
                                                    <div className="space-y-1">
                                                      <div className="text-[10px] invisible select-none leading-tight">.</div>
                                                      {frazioniAG.map((f) => (
                                                        <div key={f.chiave} className="text-emerald-700 font-extrabold font-mono text-xs leading-tight">
                                                          {f.haValore ? (
                                                            <span>{f.valoreSoloNumero}</span>
                                                          ) : (
                                                            <span className="text-slate-400 italic font-normal text-[10px]">N/D</span>
                                                          )}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  ) : rData ? (
                                                    <span className="text-emerald-700 font-extrabold">{formatValoreRilevatoDisplay(rData.valoreRilevato)}</span>
                                                  ) : (
                                                    <span className="text-slate-400 italic font-medium flex items-center gap-1">
                                                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping shrink-0"></span>
                                                      In attesa analitica
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="p-3 font-mono text-slate-700">
                                                  {frazioniAG && frazioniAG.length > 0 ? (
                                                    <div className="space-y-1">
                                                      <div className="text-[10px] invisible select-none leading-tight">.</div>
                                                      {frazioniAG.map((f) => (
                                                        <div key={f.chiave} className="text-slate-700 font-medium text-xs leading-tight">
                                                          {rData?.incertezza || 'N/D'}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  ) : (
                                                    rData ? (rData.incertezza || 'N/D') : '-'
                                                  )}
                                                </td>
                                                <td className="p-3 font-mono text-slate-700">
                                                  {frazioniAG && frazioniAG.length > 0 ? (
                                                    <div className="space-y-1">
                                                      <div className="text-[10px] invisible select-none leading-tight">.</div>
                                                      {frazioniAG.map((f) => (
                                                        <div key={f.chiave} className="text-slate-700 font-medium text-xs leading-tight">
                                                          {rData?.incertezzaPercentuale || 'N/D'}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  ) : (
                                                    rData ? (rData.incertezzaPercentuale || 'N/D') : '-'
                                                  )}
                                                </td>
                                                <td className="p-3 text-slate-500 font-mono">
                                                  {frazioniAG && frazioniAG.length > 0 ? (
                                                    <div className="space-y-1">
                                                      <div className="text-[10px] invisible select-none leading-tight">.</div>
                                                      {frazioniAG.map((f) => (
                                                        <div key={f.chiave} className="text-slate-600 font-medium text-xs leading-tight">
                                                          {f.unitaMisura || rData?.unitaMisura || '%'}
                                                        </div>
                                                      ))}
                                                    </div>
                                                  ) : (
                                                    rData ? rData.unitaMisura : '-'
                                                  )}
                                                </td>
                                                <td className="p-3 text-slate-500 font-mono text-[11px] leading-relaxed">
                                                  <div>{rData ? rData.dataAnalisi : '-'}</div>
                                                  {rData?.operatore && (
                                                    <div className="text-[9px] font-sans text-slate-400 mt-1 uppercase tracking-wider line-clamp-1" title={rData.operatore}>
                                                      👤 {rData.operatore}
                                                    </div>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          }
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* QUADRO RIASSUNTIVO IN MODALITÀ LETTURA (!isEditing) */}
                                  {!isEditing && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-3 space-y-3.5 text-left">
                                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                        <div className="flex items-center gap-2">
                                          <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                                            📋 Giudizio di Conformità, Opinioni, Note e Firme
                                          </h5>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleStartEditResults(acc)}
                                          className="text-[10px] font-black text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1 shrink-0"
                                        >
                                          <Pencil className="h-3 w-3" /> Modifica / Compila Diciture
                                        </button>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                                        {/* I Responsabili di Reparto (inseriti subito dopo l'ultima prova) */}
                                        {(acc.firmatarioReparto1 || acc.firmatarioReparto2) && (
                                          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-3xs md:col-span-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-[10.5px]">
                                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">I Responsabili di Reparto:</span>
                                            {acc.firmatarioReparto1 && (
                                              <div>
                                                <span className="text-slate-500 font-medium">Resp. Reparto 1: </span>
                                                <span className="font-bold text-slate-800">{acc.firmatarioReparto1}</span>
                                              </div>
                                            )}
                                            {acc.firmatarioReparto2 && (
                                              <div>
                                                <span className="text-slate-500 font-medium">Resp. Reparto 2: </span>
                                                <span className="font-bold text-slate-800">{acc.firmatarioReparto2}</span>
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Dichiarazione di Conformità */}
                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs space-y-1.5 flex flex-col justify-between">
                                          <div>
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="inline-block bg-emerald-100 text-emerald-850 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                                                Dichiarazione / Giudizio di Conformità
                                              </span>
                                            </div>
                                            {acc.dichiarazioneConformita?.trim() ? (
                                              <p className="text-slate-800 font-medium whitespace-pre-line text-[11px] leading-relaxed pt-1">
                                                {acc.dichiarazioneConformita}
                                              </p>
                                            ) : (
                                              <p className="text-slate-400 italic text-[10.5px] pt-1">
                                                Nessuna dichiarazione di conformità inserita. (Clicca su &quot;Modifica / Compila Diciture&quot; per selezionarla o scriverla).
                                              </p>
                                            )}
                                          </div>
                                        </div>

                                        {/* Opinioni ed Interpretazioni */}
                                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs space-y-1.5 flex flex-col justify-between">
                                          <div>
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="inline-block bg-indigo-100 text-indigo-850 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                                                Opinioni ed Interpretazioni (ISO/IEC 17025)
                                              </span>
                                            </div>
                                            {acc.opinioniInterpretazioni?.trim() ? (
                                              <p className="text-slate-800 font-medium whitespace-pre-line text-[11px] leading-relaxed pt-1">
                                                {acc.opinioniInterpretazioni}
                                              </p>
                                            ) : (
                                              <p className="text-slate-400 italic text-[10.5px] pt-1">
                                                Nessuna opinione o interpretazione inserita. (Clicca su &quot;Modifica / Compila Diciture&quot; per selezionarla o scriverla).
                                              </p>
                                            )}
                                          </div>
                                        </div>

                                        {/* Responsabile Tecnico / Responsabile del Laboratorio (inserito dopo conformità/opinioni se presenti, prima della Nota 1) */}
                                        {acc.firmatarioTecnico && (
                                          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-3xs md:col-span-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-[10.5px]">
                                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Approvazione RdP:</span>
                                            <div>
                                              <span className="text-slate-500 font-medium">{acc.ruoloFirmatarioTecnico || 'Responsabile Tecnico'}: </span>
                                              <span className="font-bold text-slate-800">{acc.firmatarioTecnico}</span>
                                            </div>
                                          </div>
                                        )}

                                        {/* Nota Finale del Rapporto di Prova (Collocata alla fine del RdP) */}
                                        {acc.nota1?.trim() && (
                                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs space-y-1 md:col-span-2">
                                            <span className="inline-block bg-slate-100 text-slate-700 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mb-1">
                                              Nota Finale del Rapporto (Note e Avvertenze in calce al RdP)
                                            </span>
                                            <p className="text-slate-700 text-[11px] leading-relaxed whitespace-pre-line">
                                              {acc.nota1}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* 1. SEZIONE DEDICATA AI RESPONSABILI DI REPARTO (FIRMA DELLE PROVE ANALITICHE - SUBITO DOPO LE PROVE) */}
                                  {(isEditing || (acc.risultatiAnalisi && acc.risultatiAnalisi.length > 0)) && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 mt-4 space-y-3 text-left animate-fadeIn">
                                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                                        <Award className="h-4 w-4 text-slate-700 shrink-0" />
                                        <div>
                                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                                            ✍️ Responsabile/i di Reparto (Firma Prove Analitiche Eseguite)
                                          </h5>
                                          <p className="text-[10px] text-slate-500">Seleziona i responsabili autorizzati di reparto che convalidano le prove analitiche subito dopo l&apos;ultima prova</p>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-slate-150 shadow-3xs">
                                        {/* Firmatario Reparto 1 */}
                                        <div className="space-y-1 text-left">
                                          <span className="text-[9px] text-[#475569] font-bold block">Primo Responsabile di Reparto (*)</span>
                                          <select
                                            value={acc.firmatarioReparto1 || ''}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              onUpdateAccettazione({
                                                ...acc,
                                                firmatarioReparto1: val || undefined
                                              });
                                            }}
                                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                                          >
                                            <option value="">-- Seleziona Responsabile di Reparto 1 --</option>
                                            {getDepartmentSigners(operators).map(op => (
                                              <option key={op.nome} value={op.nome}>{op.nome} ({getOperatorQualificationLabel(op)})</option>
                                            ))}
                                          </select>
                                        </div>

                                        {/* Firmatario Reparto 2 */}
                                        <div className="space-y-1 text-left">
                                          <span className="text-[9px] text-[#475569] font-bold block">Secondo Responsabile di Reparto (Opzionale)</span>
                                          <select
                                            value={acc.firmatarioReparto2 || ''}
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              onUpdateAccettazione({
                                                ...acc,
                                                firmatarioReparto2: val || undefined
                                              });
                                            }}
                                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                                          >
                                            <option value="">Nessuno (un solo responsabile)</option>
                                            {getDepartmentSigners(operators).map(op => {
                                              if (op.nome === acc.firmatarioReparto1) return null;
                                              return <option key={op.nome} value={op.nome}>{op.nome} ({getOperatorQualificationLabel(op)})</option>;
                                            })}
                                          </select>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* 2. SEZIONE DEDICATA A DICHIARAZIONE DI CONFORMITÀ / OPINIONI ED INTERPRETAZIONI (ISO/IEC 17025) */}
                                  {(isEditing || (acc.risultatiAnalisi && acc.risultatiAnalisi.length > 0)) && (() => {
                                    const currentDichiarazioneVal = acc.dichiarazioneConformita || '';
                                    const currentOpinioniVal = acc.opinioniInterpretazioni || '';

                                    return (
                                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 mt-4 space-y-4 text-left animate-fadeIn">
                                        {/* INTESTAZIONE INTERATTIVA CON FRECCIA APRI/CHIUDI */}
                                        <div 
                                          onClick={() => setIsDichiarazioniConfigOpen(prev => !prev)}
                                          className="flex items-center justify-between pb-2 border-b border-slate-200 cursor-pointer select-none group"
                                          title="Clicca per aprire o chiudere la sezione delle dichiarazioni di conformità e pareri"
                                        >
                                          <div className="flex items-center gap-2">
                                            <FileCheck className="h-5 w-5 text-emerald-600 font-bold shrink-0" />
                                            <div>
                                              <h5 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 group-hover:text-emerald-700 transition-colors">
                                                📋 Dichiarazione di Conformità / Opinioni ed Interpretazioni (ISO/IEC 17025)
                                              </h5>
                                              <p className="text-xs text-slate-500">Associa o redigi diciture di conformità ai requisiti e pareri tecnici conformi alla norma</p>
                                            </div>
                                          </div>

                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setIsDichiarazioniConfigOpen(prev => !prev);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 group-hover:border-emerald-300 rounded-lg text-slate-700 group-hover:text-emerald-700 font-bold text-xs shadow-3xs transition cursor-pointer shrink-0"
                                          >
                                            <span>{isDichiarazioniConfigOpen ? 'Riduci' : 'Espandi'}</span>
                                            {isDichiarazioniConfigOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                          </button>
                                        </div>

                                        {isDichiarazioniConfigOpen && (
                                          <div className="w-full bg-white p-4 rounded-xl border border-slate-150 shadow-xs space-y-4 animate-fadeIn">
                                            <div className="space-y-3">
                                              {/* Categoria Merceologica Selector */}
                                              <div className="space-y-1">
                                                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Categoria Merceologica Riferimento</label>
                                                <select
                                                  value={selectedDichiarazioniCategory}
                                                  onChange={(e) => {
                                                    setSelectedDichiarazioniCategory(e.target.value);
                                                    setSelectedDichiarazioneId('');
                                                    setSelectedOpinioniId('');
                                                  }}
                                                  className="w-full bg-slate-50 border border-slate-205 rounded-lg p-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                                                >
                                                  {(() => {
                                                    const categoriesFromProve = Array.from(new Set(prove.map(p => p.categoriaMerceologica).filter(Boolean)));
                                                    const allCategoriesForDichiarazioni = Array.from(new Set([
                                                      ...categoriesFromProve,
                                                      ...Object.keys(opinioniDizionario)
                                                    ])).filter(Boolean);

                                                    return allCategoriesForDichiarazioni.map((catKey) => (
                                                      <option key={catKey} value={catKey}>{catKey}</option>
                                                    ));
                                                  })()}
                                                </select>
                                              </div>

                                              {/* 1) PARTE 1 - DICHIARAZIONE DI CONFORMITÀ */}
                                              <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-150 space-y-2">
                                                <div className="flex justify-between items-center">
                                                  <label className="block text-[9.5px] font-extrabold text-emerald-800 uppercase tracking-wide">Dichiarazione di Conformità</label>
                                                  {currentDichiarazioneVal.trim() && (
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        onUpdateAccettazione({ ...acc, dichiarazioneConformita: '' });
                                                        setSelectedDichiarazioneId('');
                                                      }}
                                                      className="text-[9px] text-rose-600 hover:underline font-bold uppercase cursor-pointer"
                                                    >
                                                      Svuota
                                                    </button>
                                                  )}
                                                </div>

                                                {/* Preset list dropdown */}
                                                <div className="space-y-1">
                                                  <select
                                                    value={selectedDichiarazioneId}
                                                    onChange={(e) => {
                                                      const selId = e.target.value;
                                                      setSelectedDichiarazioneId(selId);
                                                      const match = (opinioniDizionario[selectedDichiarazioniCategory] || []).find(o => o.id === selId);
                                                      if (match) {
                                                        onUpdateAccettazione({
                                                          ...acc,
                                                          dichiarazioneConformita: match.testo
                                                        });
                                                      }
                                                    }}
                                                    className="w-full bg-white border border-slate-205 rounded-md p-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                                                  >
                                                    <option value="">-- Seleziona dicitura conformità --</option>
                                                    {(opinioniDizionario[selectedDichiarazioniCategory] || [])
                                                      .filter(o => o.tipo === 'conformita')
                                                      .map((o) => (
                                                        <option key={o.id} value={o.id}>
                                                          {o.testo.length > 50 ? `${o.testo.substring(0, 50)}...` : o.testo}
                                                        </option>
                                                      ))}
                                                  </select>
                                                </div>

                                                {/* Textarea editor */}
                                                <textarea
                                                  rows={3}
                                                  value={currentDichiarazioneVal}
                                                  onChange={(e) => {
                                                    const val = e.target.value;
                                                    onUpdateAccettazione({
                                                      ...acc,
                                                      dichiarazioneConformita: val
                                                    });
                                                    const match = (opinioniDizionario[selectedDichiarazioniCategory] || [])
                                                      .find(o => o.tipo === 'conformita' && o.testo.trim() === val.trim());
                                                    setSelectedDichiarazioneId(match ? match.id : '');
                                                  }}
                                                  placeholder="Scrivi o modifica la dicitura di conformità..."
                                                  className="w-full bg-white border border-slate-200 focus:ring-1 focus:ring-emerald-500 rounded p-1.5 text-xs font-medium text-slate-700 focus:outline-none"
                                                />

                                                {/* Action buttons for dictionary */}
                                                <div className="flex justify-end gap-1.5">
                                                  {selectedDichiarazioneId ? (
                                                    <>
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          const text = currentDichiarazioneVal.trim();
                                                          if (!text) return;
                                                          setOpinioniDizionario(prev => {
                                                            const list = prev[selectedDichiarazioniCategory] || [];
                                                            return {
                                                              ...prev,
                                                              [selectedDichiarazioniCategory]: list.map(item => item.id === selectedDichiarazioneId ? { ...item, testo: text } : item)
                                                            };
                                                          });
                                                        }}
                                                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-1 rounded text-[8.5px] uppercase shadow-3xs cursor-pointer"
                                                      >
                                                        Aggiorna in Archivio
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          setOpinioniDizionario(prev => {
                                                            const list = prev[selectedDichiarazioniCategory] || [];
                                                            return {
                                                              ...prev,
                                                              [selectedDichiarazioniCategory]: list.filter(item => item.id !== selectedDichiarazioneId)
                                                            };
                                                          });
                                                          onUpdateAccettazione({ ...acc, dichiarazioneConformita: '' });
                                                          setSelectedDichiarazioneId('');
                                                        }}
                                                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-2 py-1 rounded text-[8.5px] uppercase shadow-3xs cursor-pointer"
                                                      >
                                                        Elimina
                                                      </button>
                                                    </>
                                                  ) : (
                                                    currentDichiarazioneVal.trim() && (
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          const text = currentDichiarazioneVal.trim();
                                                          const newId = `dyn_dict_dc_${Date.now()}`;
                                                          setOpinioniDizionario(prev => {
                                                            const list = prev[selectedDichiarazioniCategory] || [];
                                                            return {
                                                              ...prev,
                                                              [selectedDichiarazioniCategory]: [...list, { id: newId, testo: text, tipo: 'conformita' }]
                                                            };
                                                          });
                                                          setSelectedDichiarazioneId(newId);
                                                        }}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded text-[8.5px] uppercase shadow-2xs cursor-pointer"
                                                      >
                                                        Salva nel Menu a Discesa
                                                      </button>
                                                    )
                                                  )}
                                                </div>
                                              </div>

                                              {/* 2) PARTE 2 - OPINIONI ED INTERPRETAZIONI */}
                                              <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-150 space-y-2">
                                                <div className="flex justify-between items-center">
                                                  <label className="block text-[9.5px] font-extrabold text-[#4f46e5] uppercase tracking-wide">Opinioni ed Interpretazioni</label>
                                                  {currentOpinioniVal.trim() && (
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        onUpdateAccettazione({ ...acc, opinioniInterpretazioni: '' });
                                                        setSelectedOpinioniId('');
                                                      }}
                                                      className="text-[9px] text-rose-600 hover:underline font-bold uppercase cursor-pointer"
                                                    >
                                                      Svuota
                                                    </button>
                                                  )}
                                                </div>

                                                {/* Preset list dropdown */}
                                                <div className="space-y-1">
                                                  <select
                                                    value={selectedOpinioniId}
                                                    onChange={(e) => {
                                                      const selId = e.target.value;
                                                      setSelectedOpinioniId(selId);
                                                      const match = (opinioniDizionario[selectedDichiarazioniCategory] || []).find(o => o.id === selId);
                                                      if (match) {
                                                        onUpdateAccettazione({
                                                          ...acc,
                                                          opinioniInterpretazioni: match.testo
                                                        });
                                                      }
                                                    }}
                                                    className="w-full bg-white border border-slate-205 rounded-md p-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                                                  >
                                                    <option value="">-- Seleziona dicitura opinioni --</option>
                                                    {(opinioniDizionario[selectedDichiarazioniCategory] || [])
                                                      .filter(o => o.tipo === 'opinioni')
                                                      .map((o) => (
                                                        <option key={o.id} value={o.id}>
                                                          {o.testo.length > 50 ? `${o.testo.substring(0, 50)}...` : o.testo}
                                                        </option>
                                                      ))}
                                                  </select>
                                                </div>

                                                {/* Textarea editor */}
                                                <textarea
                                                  rows={3}
                                                  value={currentOpinioniVal}
                                                  onChange={(e) => {
                                                    const val = e.target.value;
                                                    onUpdateAccettazione({
                                                      ...acc,
                                                      opinioniInterpretazioni: val
                                                    });
                                                    const match = (opinioniDizionario[selectedDichiarazioniCategory] || [])
                                                      .find(o => o.tipo === 'opinioni' && o.testo.trim() === val.trim());
                                                    setSelectedOpinioniId(match ? match.id : '');
                                                  }}
                                                  placeholder="Scrivi o modifica le opinioni ed interpretazioni..."
                                                  className="w-full bg-white border border-slate-205 focus:ring-1 focus:ring-indigo-500 rounded p-1.5 text-xs font-medium text-slate-700 focus:outline-none"
                                                />

                                                {/* Action buttons for dictionary */}
                                                <div className="flex justify-end gap-1.5">
                                                  {selectedOpinioniId ? (
                                                    <>
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          const text = currentOpinioniVal.trim();
                                                          if (!text) return;
                                                          setOpinioniDizionario(prev => {
                                                            const list = prev[selectedDichiarazioniCategory] || [];
                                                            return {
                                                              ...prev,
                                                              [selectedDichiarazioniCategory]: list.map(item => item.id === selectedOpinioniId ? { ...item, testo: text } : item)
                                                            };
                                                          });
                                                        }}
                                                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2 py-1 rounded text-[8.5px] uppercase shadow-3xs cursor-pointer"
                                                      >
                                                        Aggiorna in Archivio
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          setOpinioniDizionario(prev => {
                                                            const list = prev[selectedDichiarazioniCategory] || [];
                                                            return {
                                                              ...prev,
                                                              [selectedDichiarazioniCategory]: list.filter(item => item.id !== selectedOpinioniId)
                                                            };
                                                          });
                                                          onUpdateAccettazione({ ...acc, opinioniInterpretazioni: '' });
                                                          setSelectedOpinioniId('');
                                                        }}
                                                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold px-2 py-1 rounded text-[8.5px] uppercase shadow-3xs cursor-pointer"
                                                      >
                                                        Elimina
                                                      </button>
                                                    </>
                                                  ) : (
                                                    currentOpinioniVal.trim() && (
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          const text = currentOpinioniVal.trim();
                                                          const newId = `dyn_dict_op_${Date.now()}`;
                                                          setOpinioniDizionario(prev => {
                                                            const list = prev[selectedDichiarazioniCategory] || [];
                                                            return {
                                                              ...prev,
                                                              [selectedDichiarazioniCategory]: [...list, { id: newId, testo: text, tipo: 'opinioni' }]
                                                            };
                                                          });
                                                          setSelectedOpinioniId(newId);
                                                        }}
                                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2.5 py-1 rounded text-[8.5px] uppercase shadow-2xs cursor-pointer"
                                                      >
                                                        Salva nel Menu a Discesa
                                                      </button>
                                                    )
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  {/* 3. SEZIONE DEDICATA AL RESPONSABILE TECNICO / RESPONSABILE DEL LABORATORIO (DOPO IL GIUDIZIO DI CONFORMITÀ/OPINIONI, SEMPRE PRIMA DELLA NOTA 1) */}
                                  {(isEditing || (acc.risultatiAnalisi && acc.risultatiAnalisi.length > 0)) && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 mt-4 space-y-3 text-left animate-fadeIn">
                                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                                        <Award className="h-4 w-4 text-indigo-700 shrink-0" />
                                        <div>
                                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                                            ✍️ Responsabile Tecnico / Responsabile del Laboratorio (Approvazione Finale RdP)
                                          </h5>
                                          <p className="text-[10px] text-slate-500">Seleziona la persona preposta e la specifica qualifica per l&apos;approvazione del Rapporto di Prova e delle conformità</p>
                                        </div>
                                      </div>

                                      <div className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-3xs text-left grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                          <span className="text-[9px] text-[#475569] font-bold block">Persona Preposta (*)</span>
                                          <select
                                            value={acc.firmatarioTecnico || ''}
                                            onChange={(e) => {
                                              const name = e.target.value;
                                              const op = (operators || []).find(o => o.nome === name);
                                              const opQuals = getOperatorQualificationsList(op);
                                              const role = (opQuals[0] || op?.ruoloFirma || 'Responsabile Tecnico') as any;
                                              onUpdateAccettazione({
                                                ...acc,
                                                firmatarioTecnico: name || undefined,
                                                ruoloFirmatarioTecnico: role
                                              });
                                            }}
                                            className="w-full bg-slate-50 border border-slate-205 focus:bg-white focus:ring-1 focus:ring-indigo-550 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                                          >
                                            <option value="">-- Seleziona Responsabile Tecnico Autorizzato --</option>
                                            {getTechnicalSigners(operators).map(op => (
                                              <option key={op.nome} value={op.nome}>{op.nome} ({getOperatorQualificationLabel(op)})</option>
                                            ))}
                                          </select>
                                        </div>

                                        <div className="space-y-1">
                                          <span className="text-[9px] text-[#475569] font-bold block">Ruolo Stampato nel Rapporto (*)</span>
                                          <select
                                            value={acc.ruoloFirmatarioTecnico || 'Responsabile Tecnico'}
                                            disabled={!acc.firmatarioTecnico}
                                            onChange={(e) => {
                                              const selectedRole = e.target.value as any;
                                              onUpdateAccettazione({
                                                ...acc,
                                                ruoloFirmatarioTecnico: selectedRole
                                              });
                                            }}
                                            className={`w-full bg-slate-55 border border-slate-250 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none ${!acc.firmatarioTecnico ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                          >
                                            {(() => {
                                              const selectedTechOp = (operators || []).find(o => o.nome === acc.firmatarioTecnico);
                                              const opQuals = getOperatorQualificationsList(selectedTechOp);
                                              const signatureQuals = (() => {
                                                try {
                                                  const saved = localStorage.getItem('lims_signature_quals');
                                                  if (saved) {
                                                    const parsed = JSON.parse(saved);
                                                    if (Array.isArray(parsed) && parsed.length > 0) {
                                                      return parsed;
                                                    }
                                                  }
                                                } catch (err) {}
                                                return ['Responsabile Tecnico', 'Responsabile del Laboratorio', 'V.ce Responsabile Tecnico', 'Direttore Tecnico'];
                                              })();
                                              const roleOptions = Array.from(new Set([...opQuals, ...signatureQuals]));
                                              if (acc.ruoloFirmatarioTecnico && !roleOptions.includes(acc.ruoloFirmatarioTecnico)) {
                                                roleOptions.push(acc.ruoloFirmatarioTecnico);
                                              }
                                              return roleOptions.map(optionRole => (
                                                <option key={optionRole} value={optionRole}>{optionRole}</option>
                                              ));
                                            })()}
                                          </select>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* 4. SEZIONE DEDICATA ALLA NOTA 1 DEL RAPPORTO DI PROVA (SPOSTATA FISICAMENTE ALLA FINE) */}
                                  {(isEditing || (acc.risultatiAnalisi && acc.risultatiAnalisi.length > 0)) && (() => {
                                    const currentNota1Val = acc.nota1 !== undefined ? acc.nota1 : customNota1;

                                    return (
                                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-5 mt-4 space-y-4 text-left animate-fadeIn">
                                        {/* INTESTAZIONE INTERATTIVA CON FRECCIA APRI/CHIUDI */}
                                        <div 
                                          onClick={() => setIsNota1ConfigOpen(prev => !prev)}
                                          className="flex items-center justify-between pb-2 border-b border-slate-200 cursor-pointer select-none group"
                                          title="Clicca per aprire o chiudere la configurazione della Nota 1"
                                        >
                                          <div className="flex items-center gap-2">
                                            <FileText className="h-5 w-5 text-indigo-600 font-bold shrink-0" />
                                            <div>
                                              <h5 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2 group-hover:text-indigo-600 transition-colors">
                                                📌 Configurazione Nota 1 (Note e Avvertenze in calce al RdP)
                                              </h5>
                                              <p className="text-xs text-slate-500">Collocata fisicamente alla fine del Rapporto di Prova, dopo le firme dei responsabili</p>
                                            </div>
                                          </div>

                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setIsNota1ConfigOpen(prev => !prev);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 group-hover:border-indigo-300 rounded-lg text-slate-700 group-hover:text-indigo-600 font-bold text-xs shadow-3xs transition cursor-pointer shrink-0"
                                          >
                                            <span>{isNota1ConfigOpen ? 'Riduci' : 'Espandi'}</span>
                                            {isNota1ConfigOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                          </button>
                                        </div>

                                        {isNota1ConfigOpen && (
                                          <div className="space-y-6 pt-2 animate-fadeIn">
                                            {/* RIQUADRO NOTA 1 */}
                                        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-xs space-y-3">
                                          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                            <div className="flex items-center gap-1.5">
                                              <span className="inline-block bg-indigo-100 text-indigo-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md font-bold">Nota 1 (Collocata alla fine del RdP)</span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const defaultText = `Il presente Rapporto riguarda esclusivamente il campione sottoposto a prova ed esso non può essere riprodotto parzialmente, se non previa autorizzazione scritta da parte di questo Laboratorio. I risultati si riferiscono al campione così come ricevuto. L'incertezza estesa per le prove chimiche, ove riportata, è espressa con un fattore di copertura K=2 che per una distribuzione normale dei dati, corrisponde a un livello di fiducia di circa 95%. L'incertezza estesa per le prove microbiologiche, ove riportata, è espressa come intervallo di fiducia con un fattore di copertura K=1,96 corrispondente a un livello di fiducia di circa 95%.`;
                                                onUpdateAccettazione({
                                                  ...acc,
                                                  nota1: defaultText
                                                });
                                                const standardModel = nota1Presets.find(p => p.id === 'nota1-standard-ufficiale');
                                                if (standardModel) {
                                                  setSelectedNota1ModelId(standardModel.id);
                                                  setNota1ModelNameInput(standardModel.nome);
                                                } else {
                                                  setSelectedNota1ModelId('');
                                                  setNota1ModelNameInput('Standard Ufficiale (Incertezza estesa e riproducibilità)');
                                                }
                                              }}
                                              className="text-[10px] text-[#4f46e5] hover:underline font-extrabold uppercase tracking-tight cursor-pointer"
                                            >
                                              Ripristina Default
                                            </button>
                                          </div>
                                          <p className="text-xs text-slate-500 leading-normal">
                                            Verrà stampata e posizionata in calce al Rapporto di Prova, alla fine del documento dopo le firme dei responsabili.
                                          </p>

                                          <div className="space-y-3 pt-1">
                                            {/* Riga 1: Menu a discesa e campo Nome Modello */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                              <div className="space-y-1">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                  Seleziona Modello Nota 1
                                                </label>
                                                <select
                                                  value={selectedNota1ModelId}
                                                  onChange={(e) => {
                                                    const selId = e.target.value;
                                                    setSelectedNota1ModelId(selId);
                                                    const found = nota1Presets.find(p => p.id === selId);
                                                    if (found) {
                                                      setNota1ModelNameInput(found.nome);
                                                      onUpdateAccettazione({
                                                        ...acc,
                                                        nota1: found.testo
                                                      });
                                                    }
                                                  }}
                                                  className="w-full bg-slate-50 border border-slate-205 focus:bg-white rounded-lg p-2 text-xs font-semibold text-slate-705 focus:outline-none cursor-pointer shadow-3xs"
                                                >
                                                  <option value="">-- Scegli modello salvato o digita un nome sotto --</option>
                                                  {nota1Presets.map((preset) => (
                                                    <option key={preset.id} value={preset.id}>
                                                      {preset.nome}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>

                                              <div className="space-y-1">
                                                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                                  <span>✏️ Nome del Modello</span>
                                                  <span className="text-[9px] text-indigo-600 font-medium normal-case">(visibile nel menù a discesa)</span>
                                                </label>
                                                <input
                                                  type="text"
                                                  value={nota1ModelNameInput}
                                                  onChange={(e) => setNota1ModelNameInput(e.target.value)}
                                                  placeholder="Es: Standard Incertezza, Nota Microbiologia, Avvertenze Terreni..."
                                                  className="w-full bg-slate-50 border border-slate-205 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none shadow-3xs"
                                                />
                                              </div>
                                            </div>

                                            {/* Riga 2: Textarea editor */}
                                            <div className="space-y-1">
                                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                Testo della Nota 1 da stampare in calce al RdP:
                                              </label>
                                              <textarea
                                                rows={4}
                                                value={currentNota1Val}
                                                onChange={(e) => {
                                                  const newVal = e.target.value;
                                                  onUpdateAccettazione({
                                                    ...acc,
                                                    nota1: newVal
                                                  });
                                                  const matched = nota1Presets.find(p => p.testo.trim() === newVal.trim());
                                                  if (matched) {
                                                    setSelectedNota1ModelId(matched.id);
                                                    if (!nota1ModelNameInput.trim()) {
                                                      setNota1ModelNameInput(matched.nome);
                                                    }
                                                  }
                                                }}
                                                className="w-full bg-slate-50 border border-slate-205 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-700 focus:outline-none leading-relaxed shadow-3xs"
                                                placeholder="Scrivi qui il testo completo della nota 1 (puoi caricarne una salvata o scriverne una nuova)..."
                                              />

                                              {/* Actions */}
                                              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                                                {selectedNota1ModelId ? (
                                                  <>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const newName = nota1ModelNameInput.trim() || 'Modello Nota';
                                                        const newText = currentNota1Val.trim();
                                                        const updated = nota1Presets.map(p => 
                                                          p.id === selectedNota1ModelId 
                                                            ? { ...p, nome: newName, testo: newText } 
                                                            : p
                                                        );
                                                        setNota1Presets(updated);
                                                      }}
                                                      disabled={!currentNota1Val.trim()}
                                                      className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-1.5 px-3 rounded text-[9px] uppercase tracking-wider transition cursor-pointer text-center flex items-center justify-center gap-1 shadow-3xs"
                                                      title="Aggiorna sia il nome nel menu a discesa che il testo di questo modello"
                                                    >
                                                      🔄 Aggiorna / Sovrascrivi Modello
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const updated = nota1Presets.filter(p => p.id !== selectedNota1ModelId);
                                                        setNota1Presets(updated);
                                                        setSelectedNota1ModelId('');
                                                        setNota1ModelNameInput('');
                                                      }}
                                                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold py-1.5 px-3 rounded text-[9px] uppercase tracking-wider transition cursor-pointer text-center flex items-center justify-center gap-1 shadow-3xs"
                                                      title="Elimina questo modello dall'elenco salvato"
                                                    >
                                                      🗑️ Elimina Modello
                                                    </button>
                                                  </>
                                                ) : null}

                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const val = currentNota1Val.trim();
                                                    if (!val) return;
                                                    const assignedName = nota1ModelNameInput.trim() || (val.length > 35 ? `${val.substring(0, 35)}...` : val);
                                                    const newModel: Nota1PresetItem = {
                                                      id: `nota1-dyn-${Date.now()}`,
                                                      nome: assignedName,
                                                      testo: val
                                                    };
                                                    const updated = [...nota1Presets, newModel];
                                                    setNota1Presets(updated);
                                                    setSelectedNota1ModelId(newModel.id);
                                                    setNota1ModelNameInput(assignedName);
                                                  }}
                                                  disabled={!currentNota1Val.trim()}
                                                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold py-1.5 px-3 rounded text-[9px] uppercase tracking-wider transition cursor-pointer text-center flex items-center justify-center gap-1 shadow-3xs"
                                                  title="Salva con il nome indicato nell'input per ritrovarlo nel menù a discesa"
                                                >
                                                  📥 {selectedNota1ModelId ? 'Salva come Nuovo Modello Separato' : 'Salva nel Menù a Discesa con questo Nome'}
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  );
                                    })()}

                                  {/* AZIONI DI GESTIONE */}
                                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-250 mt-2">
                                    <div className="flex items-center gap-2">
                                      {isEditing ? (
                                        <>
                                          <button
                                            onClick={() => handleSaveResults(acc, 'in_corso')}
                                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                                            title="Salva i risultati finora inseriti mantenendo lo stato del campione 'In Corso'"
                                          >
                                            <Save className="h-3.5 w-3.5" /> Salva Bozza (In Corso)
                                          </button>
                                          <button
                                            onClick={() => handleSaveResults(acc, 'completato')}
                                            className="bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition shadow cursor-pointer"
                                            title="Salva i risultati e imposta il campione come 'Completato'"
                                          >
                                            <CheckCircle2 className="h-3.5 w-3.5" /> Salva e Completa Analisi
                                          </button>

                                          <button
                                            onClick={() => {
                                              setEditingResultsAccId(null);
                                              setTempRisultati({});
                                            }}
                                            className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg px-3 py-2.5 text-xs font-bold transition cursor-pointer"
                                          >
                                            Annulla
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          onClick={() => handleStartEditResults(acc)}
                                          className="bg-indigo-400 hover:bg-indigo-500 text-white rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition shadow cursor-pointer"
                                        >
                                          <Pencil className="h-3.5 w-3.5" /> 
                                          {acc.risultatiAnalisi && acc.risultatiAnalisi.length > 0 
                                            ? 'Modifica Risultati' 
                                            : 'Rileva Risultati di Laboratorio'}
                                        </button>
                                      )}
                                    </div>

                                    {/* GENERAZIONE RAPPORTO DI PROVA UFFICIALE */}
                                    {!isEditing && (
                                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3.5 mt-2 sm:mt-0">
                                        <button
                                          onClick={() => {
                                            const firstRepar = acc.firmatarioReparto1 || getDepartmentSigners(operators)[0]?.nome || 'Dott.ssa S. Bianchi';
                                            const techSign = acc.firmatarioTecnico || getTechnicalSigners(operators)[0]?.nome || 'Dott. Chim. F. Lupo';
                                            
                                            setPreviewReportAcc({
                                              ...acc,
                                              firmatarioReparto1: acc.firmatarioReparto1 || firstRepar,
                                              firmatarioTecnico: acc.firmatarioTecnico || techSign,
                                            });
                                          }}
                                          className="rounded-lg px-4.5 py-2.5 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow hover:shadow-indigo-150 cursor-pointer"
                                        >
                                          <Printer className="h-4 w-4" /> Emetti / Stampa Rapporto {acc.codiceAccettazione}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleCloseReportAndReturnToList}
                                          className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg px-4 py-2.5 text-xs font-black transition shadow-sm cursor-pointer flex items-center gap-1.5"
                                          title="Chiudi la scheda e torna all'elenco dei campioni accettati"
                                        >
                                          <ArrowLeft className="h-3.5 w-3.5" /> Torna all&apos;Elenco Campioni Accettati
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE DI ANTEPRIMA DEL RAPPORTO DI PROVA UFFICIALE (RICHIESTA UTENTE) */}
      <AnimatePresence>
        {previewReportAcc && (() => {
  const formatFirmatarioName = (name?: string) => {
    if (!name) return '';
    let n = name.trim();
    const nl = n.toLowerCase();
    if (nl.includes('marroccella') || nl.includes('marrocella')) {
      if (!nl.startsWith('dott')) return 'Dott. ' + n;
    }
    if (nl.includes('de simone')) {
      if (!nl.startsWith('dott')) return 'Dott.ssa ' + n;
    }
    return n;
  };

          const internalFallbackClient: Client = {
            id: '__LAB_INTERNO__',
            denominazione: 'Laboratorio Chimico Merceologico - Agenzia per lo Sviluppo (Uso Interno / QC / Ring Test)',
            partitaIva: '01751450667',
            codiceFiscale: '01751450667',
            email: 'laboratorio@agenziagransasso.camcom.it',
            telefono: '',
            indirizzo: 'Via degli Opifici n°1 - Z.I. di Bazzano',
            comune: "67100 L'Aquila",
            fatturatoAnnuo: {},
            categorieFatturato: {}
          };
          const client = previewReportAcc.intestatarioRapportoClienteId === '__LAB_INTERNO__'
            ? internalFallbackClient
            : clients.find(c => c.id === previewReportAcc.intestatarioRapportoClienteId);
          const payingClient = (previewReportAcc.destinatarioFatturaClienteId === '__LAB_INTERNO__'
            ? internalFallbackClient
            : clients.find(c => c.id === previewReportAcc.destinatarioFatturaClienteId)) || client;
          const resolvedProve = getResolvedProveForAccettazione(previewReportAcc);
          const hasAccreditedTests = resolvedProve.some(p => p.accreditataAccredia || (p as any).accreditata) || (previewReportAcc.risultatiAnalisi?.some(r => {
            const p = prove.find(x => x.id === r.provaId);
            return p?.accreditataAccredia || (p as any)?.accreditata;
          }) ?? false);

          const allExternalLabs = Array.from(new Set(resolvedProve.filter(p => p.eseguitaAllEsterno && p.laboratorioEsternoNome).map(p => p.laboratorioEsternoNome as string)));
          const todayStr = new Date().toLocaleDateString('it-IT');

          // Categoria merceologica corrente del campione per caricare opinioni abbinate
          const currentCategory = (previewReportAcc.categoriaMerceologica || previewReportAcc.matrice || 'Generico').trim();
          
          // Trova preset corrispondenti alla categoria corrente
          let foundCategoryKey = 'Generico';
          const keys = Object.keys(opinioniDizionario);
          const matchedKey = keys.find(k => k.toLowerCase() === currentCategory.toLowerCase());
          if (matchedKey) {
            foundCategoryKey = matchedKey;
          }
          const availableOpinioniList = opinioniDizionario[foundCategoryKey] || [];

          // Lista effettiva dei testi selezionati da inserire nel rapporto
          const activeOpinioniList = availableOpinioniList.filter(o => selectedOpinioniIds.includes(o.id));

          // Helper robusto per verificare se il valore rilevato supera il limite di legge
          const isValueExceedingLimit = (resultVal?: string, limitVal?: string): boolean => {
            if (!resultVal || !limitVal) return false;
            
            // Pulisce la stringa rimuovendo prefissi/suffissi non numerici per estrarre il numero reale
            const cleanResult = resultVal.replace(/[^\d.,-]/g, '').replace(',', '.');
            const cleanLimit = limitVal.replace(/[^\d.,-]/g, '').replace(',', '.');
            
            const resNum = parseFloat(cleanResult);
            const limNum = parseFloat(cleanLimit);
            
            if (!isNaN(resNum) && !isNaN(limNum)) {
              // Se il risultato ha un prefisso "<" o "≤" indica che è sotto il LOQ o la soglia, quindi non supera
              if (resultVal.trim().startsWith('<') || resultVal.trim().startsWith('≤')) {
                return false;
              }
              return resNum > limNum;
            }
            
            // Comparazione logica fallback per stringhe (es. Presente vs Assente)
            const rLower = resultVal.toLowerCase().trim();
            const lLower = limitVal.toLowerCase().trim();
            
            if (lLower.includes('assent') && rLower.includes('present')) {
              return true;
            }
            
            return false;
          };

          // Calcolo e suddivisione intelligente delle pagine A4 del Rapporto di Prova
          const allProve = resolvedProve;
          const hasNotebook = showLabNotebookInPrint && (previewReportAcc.risultatiAnalisi?.some(r => r.quadernoCalcolo?.formula) ?? false);
          const hasRepeatability = (previewReportAcc.risultatiAnalisi?.some(r => r.determinazioniRipetibilita && r.determinazioniRipetibilita.length > 0) ?? false);
          const hasConformita = !!(previewReportAcc.dichiarazioneConformita || '').trim();
          const hasOpinioni = !!(previewReportAcc.opinioniInterpretazioni || '').trim();
          const hasNota1 = !!((previewReportAcc.nota1 !== undefined ? previewReportAcc.nota1 : customNota1) || '').trim();
          const hasRevisione = (previewReportAcc.revisioneCorrente !== undefined && previewReportAcc.revisioneCorrente > 0);

          type RdpPageSpec = {
            pageNumber: number;
            isFirstPage: boolean;
            isLastPage: boolean;
            proveList: Prova[];
            showContinuationNotice?: boolean;
            hasRepeatabilityDetail: boolean;
            hasNotebook: boolean;
            hasFirmeReparto: boolean;
            hasConformita: boolean;
            hasOpinioni: boolean;
            hasFirmaTecnico: boolean;
            hasNota1: boolean;
            hasRevisione: boolean;
          };

          let rdpPages: RdpPageSpec[] = [];

          if (rdpPaginationMode === '1-page') {
            rdpPages = [{
              pageNumber: 1,
              isFirstPage: true,
              isLastPage: true,
              proveList: allProve,
              hasRepeatabilityDetail: hasRepeatability,
              hasNotebook,
              hasFirmeReparto: true,
              hasConformita,
              hasOpinioni,
              hasFirmaTecnico: true,
              hasNota1,
              hasRevisione
            }];
          } else if (rdpPaginationMode === '2-pages') {
            const p1Count = Math.max(1, Math.min(allProve.length, Math.ceil(allProve.length / 2)));
            rdpPages = [
              {
                pageNumber: 1,
                isFirstPage: true,
                isLastPage: false,
                proveList: allProve.slice(0, p1Count),
                showContinuationNotice: true,
                hasRepeatabilityDetail: false,
                hasNotebook: false,
                hasFirmeReparto: false,
                hasConformita: false,
                hasOpinioni: false,
                hasFirmaTecnico: false,
                hasNota1: false,
                hasRevisione: false
              },
              {
                pageNumber: 2,
                isFirstPage: false,
                isLastPage: true,
                proveList: allProve.slice(p1Count),
                hasRepeatabilityDetail: hasRepeatability,
                hasNotebook,
                hasFirmeReparto: true,
                hasConformita,
                hasOpinioni,
                hasFirmaTecnico: true,
                hasNota1,
                hasRevisione
              }
            ];
          } else {
            // Modalità automatica: stima dell'ingombro per garantire che nessun testo venga mai tagliato a cavallo dei fogli
            const extraTextLen = (previewReportAcc.dichiarazioneConformita || '').length + (previewReportAcc.opinioniInterpretazioni || '').length;
            const isCompactEnoughFor1Page = allProve.length <= 5 && !hasNotebook && !hasRepeatability && extraTextLen < 350;

            if (isCompactEnoughFor1Page) {
              rdpPages = [{
                pageNumber: 1,
                isFirstPage: true,
                isLastPage: true,
                proveList: allProve,
                hasRepeatabilityDetail: hasRepeatability,
                hasNotebook,
                hasFirmeReparto: true,
                hasConformita,
                hasOpinioni,
                hasFirmaTecnico: true,
                hasNota1,
                hasRevisione
              }];
            } else {
              // 2 pagine: su pagina 1 mettiamo fino a 6 prove se ci sono molte prove, oppure un blocco bilanciato
              const p1Count = allProve.length <= 8 ? Math.min(allProve.length, 5) : Math.min(allProve.length, 6);
              rdpPages = [
                {
                  pageNumber: 1,
                  isFirstPage: true,
                  isLastPage: false,
                  proveList: allProve.slice(0, p1Count),
                  showContinuationNotice: true,
                  hasRepeatabilityDetail: false,
                  hasNotebook: false,
                  hasFirmeReparto: false,
                  hasConformita: false,
                  hasOpinioni: false,
                  hasFirmaTecnico: false,
                  hasNota1: false,
                  hasRevisione: false
                },
                {
                  pageNumber: 2,
                  isFirstPage: false,
                  isLastPage: true,
                  proveList: allProve.slice(p1Count),
                  hasRepeatabilityDetail: hasRepeatability,
                  hasNotebook,
                  hasFirmeReparto: true,
                  hasConformita,
                  hasOpinioni,
                  hasFirmaTecnico: true,
                  hasNota1,
                  hasRevisione
                }
              ];
            }
          }

          const totalRdpPages = rdpPages.length;

          // Helper per renderizzare la tabella delle prove analitiche
          const renderProveTableSection = (proveList: Prova[], showContinuationBadge?: boolean) => {
            if (proveList.length === 0) return null;
            return (
              <div className="mt-3 mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white text-left avoid-break">
                <table className="w-full text-left text-[9.5px] border-collapse">
                  <thead>
                    <tr className="text-emerald-950 font-sans uppercase text-[7.5px] font-bold tracking-wider" style={{ backgroundColor: '#eefcf5' }}>
                      <th className="p-2.5 text-left border-r border-emerald-200/50 font-bold">Prova</th>
                      <th className="p-2.5 text-left border-r border-emerald-200/50 font-bold">Metodo di prova</th>
                      <th className="p-2.5 text-right border-r border-emerald-200/50 font-bold w-[90px]">Risultato</th>
                      <th className="p-2.5 text-center border-r border-emerald-200/50 font-bold w-[80px]">Incertezza</th>
                      <th className="p-2.5 text-center border-r border-emerald-200/50 font-bold w-[90px]">Unità di misura</th>
                      <th className="p-2.5 text-left font-bold">Limiti di legge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proveList.map((p, idx) => {
                      const rData = previewReportAcc.risultatiAnalisi?.find(r => r.provaId === p.id);
                      const exceeds = rData?.limitiSelezionati?.some(lim => isValueExceedingLimit(rData.valoreRilevato, lim.valore));
                      const frazioniAG = getAcidiGrassiFrazioniDisplay(p, rData);

                      // Controllo se il parametro è stato modificato rispetto alla revisione precedente
                      const lastSnapshot = previewReportAcc.storicoRevisioni && previewReportAcc.storicoRevisioni.length > 0
                        ? previewReportAcc.storicoRevisioni[previewReportAcc.storicoRevisioni.length - 1]
                        : null;
                      const oldRData = lastSnapshot?.risultatiAnalisi?.find(r => r.provaId === p.id || (r as any).nomeProva === p.nome);
                      const isTestRevised = (previewReportAcc.revisioneCorrente || 0) > 0 && lastSnapshot !== null && (
                        !oldRData ||
                        (oldRData.valoreRilevato ?? (oldRData as any).valore) !== (rData?.valoreRilevato ?? (rData as any)?.valore) ||
                        oldRData.incertezza !== rData?.incertezza ||
                        oldRData.conforme !== rData?.conforme
                      );

                      return (
                        <tr key={p.id} className={`border-b border-slate-150 last:border-none ${isTestRevised ? 'bg-amber-50/30' : idx % 2 === 1 ? 'bg-slate-50/20' : 'bg-white'} hover:bg-slate-50/40 transition-colors`}>
                          {/* 1. Prova e bollini */}
                          <td className="p-2.5 border-r border-slate-150 font-medium align-middle">
                            <div className="text-slate-950 flex flex-wrap items-center gap-1 leading-tight">
                              <span className="font-extrabold text-[10px]">
                                {p.nome}
                                {!p.accreditataAccredia && (
                                  <span className="text-slate-800 font-black ml-0.5" title="Prova NON accreditata da ACCREDIA">*</span>
                                )}
                                {p.eseguitaAllEsterno && p.laboratorioEsternoNome && (
                                  <span className="text-purple-700 font-black ml-0.5" title="Prova eseguita in subappalto presso laboratorio esterno partner">
                                    ({allExternalLabs.indexOf(p.laboratorioEsternoNome) + 1})
                                  </span>
                                )}
                              </span>
                              {isTestRevised && (
                                <span className="inline-flex items-center gap-0.5 text-[7px] font-black bg-amber-200 text-amber-950 border border-amber-400 px-1 py-0.5 rounded-xs uppercase leading-none shrink-0" title="Parametro analitico oggetto di rettifica in questa revisione">
                                  [Δ] REVISIONATO
                                </span>
                              )}
                              {p.accreditataAccredia && (
                                <span className="inline-flex items-center gap-0.5 text-[6.5px] font-extrabold bg-emerald-50 text-emerald-800 px-1 py-0.5 rounded-sm border border-emerald-200 uppercase leading-none shrink-0 print:hidden" title="Attività accreditata da ACCREDIA">
                                  🛡️ ACCREDIA
                                </span>
                              )}
                              {rData?.determinazioniRipetibilita && rData.determinazioniRipetibilita.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[6.5px] font-extrabold bg-orange-50 text-orange-800 px-1 py-0.5 rounded-sm border border-orange-200 uppercase leading-none shrink-0" title="Prova eseguita con determinazioni di ripetibilità multiple dei tecnici">
                                  🔄 RIPETIBILITÀ ({rData.determinazioniRipetibilita.length} DET)
                                </span>
                              )}
                            </div>
                            {frazioniAG && frazioniAG.length > 0 && (
                              <div className="mt-1.5 pl-2 border-l-2 border-amber-400 space-y-0.5 bg-amber-50/30 rounded-r py-0.5 pr-1.5">
                                {frazioniAG.map((f) => (
                                  <div key={f.chiave} className="text-[8.5px] text-slate-800 font-semibold flex items-center justify-between gap-1 leading-tight">
                                    <span>- {f.nome}</span>
                                    <span className="text-[7.5px] font-mono font-bold text-slate-500">({f.sigla})</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* 2. Metodo */}
                          <td className="p-2.5 border-r border-slate-150 text-slate-500 font-mono text-[8.5px] leading-tight align-middle">
                            <div className="text-slate-700 font-semibold">{p.metodoAnalitico || 'Metodo Interno'}</div>
                            {p.limiteQuantificazione && (
                              <div className="text-[7px] text-amber-805 font-bold bg-amber-50/70 border border-amber-200/40 rounded px-1 py-0.5 mt-0.5 inline-block font-sans lowercase tracking-wider">
                                loq: {p.limiteQuantificazione}
                              </div>
                            )}
                          </td>

                          {/* 3. Risultato */}
                          <td className={`p-2.5 border-r border-slate-150 text-right font-mono text-[10.5px] align-middle font-bold ${exceeds ? 'bg-red-50/10' : ''}`}>
                            {frazioniAG && frazioniAG.length > 0 ? (
                              <div className="space-y-0.5">
                                <div className="text-[9px] invisible select-none leading-tight">.</div>
                                {frazioniAG.map((f) => (
                                  <div key={f.chiave} className="text-slate-900 font-bold font-mono text-[9.5px] leading-tight">
                                    {f.haValore ? f.valoreSoloNumero : <span className="text-slate-400 italic font-normal text-[8px]">N/D</span>}
                                  </div>
                                ))}
                              </div>
                            ) : rData && rData.valoreRilevato ? (
                              exceeds ? (
                                <span className="font-extrabold text-red-700 bg-red-100/50 border border-red-200 px-1.5 py-0.5 rounded shadow-3xs inline-block">
                                  {isTestRevised && <span className="text-[8px] mr-1 text-amber-900 font-bold">[Δ]</span>}
                                  {formatValoreRilevatoDisplay(rData.valoreRilevato)}
                                </span>
                              ) : (
                                <span className="text-slate-900 font-bold">
                                  {isTestRevised && <span className="text-[8px] mr-1 text-amber-700 font-bold">[Δ]</span>}
                                  {formatValoreRilevatoDisplay(rData.valoreRilevato)}
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 italic font-medium">In attesa</span>
                            )}
                          </td>

                          {/* 4. Incertezza */}
                          <td className="p-2.5 border-r border-slate-150 text-center text-slate-700 font-mono text-[9px] align-middle">
                            {frazioniAG && frazioniAG.length > 0 ? (
                              <div className="space-y-0.5">
                                <div className="text-[9px] invisible select-none leading-tight">.</div>
                                {frazioniAG.map((f) => (
                                  <div key={f.chiave} className="text-slate-800 font-medium text-[8.5px] leading-tight">
                                    {rData?.incertezza || 'N/D'}
                                  </div>
                                ))}
                              </div>
                            ) : rData ? (
                              <span className="font-medium text-slate-800">{rData.incertezza || 'N/D'}</span>
                            ) : '-'}
                          </td>

                          {/* 5. Unità di misura */}
                          <td className="p-2.5 border-r border-slate-150 text-center text-slate-600 font-mono text-[9px] align-middle">
                            {frazioniAG && frazioniAG.length > 0 ? (
                              <div className="space-y-0.5">
                                <div className="text-[9px] invisible select-none leading-tight">.</div>
                                {frazioniAG.map((f) => (
                                  <div key={f.chiave} className="text-slate-700 font-medium text-[8.5px] leading-tight">
                                    {f.unitaMisura || rData?.unitaMisura || '%'}
                                  </div>
                                ))}
                              </div>
                            ) : rData ? (
                              <span className="font-medium text-slate-700">{rData.unitaMisura}</span>
                            ) : '-'}
                          </td>

                          {/* 6. Limiti di Legge */}
                          <td className="p-2.5 text-[8.5px] text-slate-600 leading-tight align-middle">
                            {rData?.limitiSelezionati && rData.limitiSelezionati.length > 0 ? (
                              <div className="space-y-1">
                                {rData.limitiSelezionati.map((lim, lIdx) => (
                                  <div key={lim.id || lIdx} className="border-b border-dashed border-slate-100 last:border-none pb-0.5 last:pb-0">
                                    <div>
                                      <span className="text-slate-500 text-[8px]">Soglia: </span>
                                      <strong className="text-slate-900 font-bold">{lim.valore}</strong>{' '}
                                      <span className="text-[8px] text-slate-400 font-medium">{lim.unitaMisura || rData.unitaMisura}</span>
                                    </div>
                                    <div className="text-[7.5px] text-slate-400 font-medium overflow-hidden text-ellipsis whitespace-nowrap max-w-[180px]" title={lim.norma}>
                                      {lim.norma}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[8.5px] text-slate-400 italic">Nessun limite impostato</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {proveList.some(p => !p.accreditataAccredia) && (
                  <div className="px-2.5 py-1 bg-slate-50/80 border-t border-slate-150 text-[8px] font-semibold text-slate-700 flex items-center gap-1.5 font-sans">
                    <span className="font-black text-slate-800 text-[10px]">*</span>
                    <span>Le prove contrassegnate con l&apos;asterisco (*) non sono accreditate da ACCREDIA.</span>
                  </div>
                )}
                {proveList.some(p => p.eseguitaAllEsterno && p.laboratorioEsternoNome) && (
                  <div className="px-2.5 py-1 bg-slate-50/80 border-t border-slate-150 text-[8px] font-semibold text-slate-700 flex flex-col gap-0.5 font-sans">
                    {Array.from(new Set(proveList.filter(p => p.eseguitaAllEsterno && p.laboratorioEsternoNome).map(p => p.laboratorioEsternoNome as string))).map(lab => (
                      <div key={lab} className="flex items-center gap-1.5">
                        <span className="font-black text-purple-700 text-[10px]">({allExternalLabs.indexOf(lab) + 1})</span>
                        <span>Prova eseguita in subappalto presso laboratorio esterno: <strong className="font-bold text-slate-800">{lab}</strong></span>
                      </div>
                    ))}
                  </div>
                )}
                {showContinuationBadge && (
                  <div className="p-2 bg-emerald-50/70 border-t border-emerald-100 text-center text-[8.5px] font-bold text-emerald-850 flex items-center justify-center gap-1.5 font-mono">
                    <span>➡️ Il Rapporto di Prova prosegue a Pagina 2 con ulteriori prove analitiche e relative convalidazioni / firme</span>
                  </div>
                )}
              </div>
            );
          };

          // Nuovo Stato Locale Temporaneo interno al Modal per l'aggiunta rapida di un'opinione
          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 md:p-4 overflow-hidden"
            >
              <motion.div 
                initial={{ scale: 0.96, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 15 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl overflow-hidden flex flex-col h-[95vh] border border-slate-200"
              >
                {/* BARRA SUPERIORE STRUMENTI DISPOSITIVO */}
                <div className="bg-slate-900 text-white p-3.5 sm:p-4 flex flex-wrap justify-between items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-500 rounded-lg text-white shrink-0">
                      <Award className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400">Rapporto di Prova LIMS Avanzato</h4>
                        <span className="bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[9px] font-mono font-bold">
                          📄 {totalRdpPages === 1 ? '1 Pagina A4 (Pag. 1/1)' : `${totalRdpPages} Pagine A4`}
                        </span>
                      </div>
                      <h3 className="font-black text-sm text-white">Certificato: Rapporto di Prova N. {previewReportAcc.codiceAccettazione}</h3>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Selettore Impaginazione A4 Antitaglio */}
                    <div className="flex items-center bg-indigo-500 rounded-lg px-2.5 py-1.5 border border-indigo-400">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-200 mr-2">Impaginazione A4:</span>
                      <select
                        value={rdpPaginationMode}
                        onChange={(e) => setRdpPaginationMode(e.target.value as any)}
                        className="bg-indigo-600 border border-indigo-400 text-white text-[10px] rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-white cursor-pointer font-bold"
                        title="Seleziona la modalità di distribuzione su fogli A4 per evitare qualsiasi taglio del testo"
                      >
                        <option value="auto">Automatica ({totalRdpPages} pag.)</option>
                        <option value="1-page">Forza 1 Pagina A4</option>
                        <option value="2-pages">Forza 2 Pagine A4</option>
                      </select>
                    </div>

                    <div className="flex items-center bg-indigo-500 rounded-lg px-2 py-1.5 border border-indigo-400">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 mr-2">Modello RdP:</span>
                      <input 
                        type="text"
                        value={modelloRdpText}
                        onChange={(e) => setModelloRdpText(e.target.value)}
                        className="bg-indigo-600 border border-indigo-400 text-white text-[10px] rounded px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-white placeholder-indigo-300 font-mono"
                        placeholder="Es: Modello 1"
                      />
                    </div>

                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-indigo-500 rounded-lg px-3 py-2 cursor-pointer border border-indigo-400 transition hover:bg-indigo-600 select-none">
                      <input 
                        type="checkbox"
                        checked={showLabNotebookInPrint}
                        onChange={(e) => setShowLabNotebookInPrint(e.target.checked)}
                        className="rounded border-slate-600 text-indigo-500 focus:ring-0 cursor-pointer h-3.5 w-3.5 accent-indigo-600"
                      />
                      <span>Allegati Quaderno Lab.</span>
                    </label>
                    
                    <button
                      onClick={handleCloseReportAndReturnToList}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                      title="Chiudi"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* AREA PRINCIPALE: FOGLI A4 CERTIFICATO */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-slate-100">
                  
                  {/* LIVE PREVIEW DEI FOGLI A4 CERTIFICATI (IMPAGINAZIONE A FOGLI REALI CONTRO I TAGLI) */}
                  <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100 flex justify-center min-h-0 relative select-text">
                    <div 
                      id="lims-printable-area"
                      className="w-full max-w-[210mm] flex flex-col gap-6"
                    >
                      {rdpPages.map((pageSpec, pIdx) => {
                        return (
                          <div
                            key={pageSpec.pageNumber}
                            className="rdp-page w-full max-w-[210mm] bg-white p-6 sm:p-8 md:p-10 border border-slate-350 shadow-xl rounded-sm text-slate-900 text-[11px] leading-relaxed flex flex-col justify-between relative overflow-hidden select-text"
                            style={{ minHeight: '297mm', boxSizing: 'border-box' }}
                          >
                            <div className="flex-1 flex flex-col justify-start">
                              
                              {/* 1. SE È LA PRIMA PAGINA (PAGINA 1): HEADER PRINCIPALE DEL LABORATORIO */}
                              {pageSpec.isFirstPage ? (
                                <>
                                  {/* HEADER PRINCIPALE DEL LABORATORIO (Regola Ufficiale) */}
                                  <div className="border-b-4 border-slate-950 pb-2.5 mb-4">
                                    <div className="flex justify-between items-start gap-4">
                                      {/* Sinistra: Logo Agenzia per lo Sviluppo + Indirizzo (3 righe ufficiali da convenzione) */}
                                      <div className="text-left flex flex-col items-start max-w-xl">
                                        <img
                                          src={logoAgenzia}
                                          onError={(e) => {
                                            if ((e.currentTarget as HTMLImageElement).src !== window.location.origin + '/logo_agenzia.png') {
                                              (e.currentTarget as HTMLImageElement).src = '/logo_agenzia.png';
                                            }
                                          }}
                                          alt="Agenzia per lo Sviluppo - AZIENDA SPECIALE della Camera di Commercio del Gran Sasso d'Italia"
                                          className="h-[44px] sm:h-[48px] w-auto max-w-[220px] sm:max-w-[240px] object-contain object-left block mb-1.5"
                                          referrerPolicy="no-referrer"
                                        />
                                        
                                        <div className="text-left text-[8.5px] sm:text-[9px] text-slate-800 space-y-0.5 leading-snug font-normal">
                                          <div>Sede legale ed amministrativa: Corso Vittorio Emanuele n°86 - 67100 L'Aquila</div>
                                          <div>Laboratorio: Via degli Opifici n°1 - Z.I. di Bazzano - 67100 L'Aquila</div>
                                          <div>P.iva 01751450667</div>
                                        </div>
                                      </div>

                                      {/* Destra: Logo ACCREDIA + Modello RdP + Numerazione Pagina */}
                                      <div className="shrink-0 flex flex-col items-end justify-between self-stretch">
                                        <div className="flex flex-col items-end justify-start min-h-[65px]">
                                          {hasAccreditedTests && (
                                            <img
                                              src={logoAccredia}
                                              onError={(e) => {
                                                if ((e.currentTarget as HTMLImageElement).src !== window.location.origin + '/ACCREDIA_nuovo_logo.png') {
                                                  (e.currentTarget as HTMLImageElement).src = '/ACCREDIA_nuovo_logo.png';
                                                }
                                              }}
                                              alt="Marchio Ufficiale di Accreditamento ACCREDIA"
                                              className="h-[75px] sm:h-[82px] w-auto max-w-[160px] sm:max-w-[180px] object-contain block mb-1"
                                              referrerPolicy="no-referrer"
                                            />
                                          )}
                                        </div>
                                        <div className="text-right space-y-0.5">
                                          {modelloRdpText && (
                                            <div className="text-[7.5px] text-slate-500 font-mono font-bold uppercase tracking-wider">
                                              {modelloRdpText}
                                            </div>
                                          )}
                                          <div className="text-[8px] font-mono text-slate-700 font-extrabold">
                                            Pag. {pageSpec.pageNumber} / {totalRdpPages}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* TITOLO CERTIFICATO */}
                                  <div className="text-center rounded-lg p-2.5 mb-3.5 border border-emerald-150/80" style={{ backgroundColor: '#eefcf5', color: '#044e37' }}>
                                    <h2 className="text-xs font-black uppercase tracking-widest leading-none flex justify-center items-center gap-1.5 flex-wrap">
                                      <span className="text-emerald-950">Rapporto di Prova N. {previewReportAcc.codiceAccettazione}</span>
                                      {previewReportAcc.revisioneCorrente !== undefined && previewReportAcc.revisioneCorrente > 0 && (
                                        <span className="bg-emerald-600/10 text-emerald-800 border border-emerald-200/60 text-[9px] px-1.5 py-0.5 rounded font-black tracking-normal">
                                          Rev. {String(previewReportAcc.revisioneCorrente).padStart(2, '0')}
                                        </span>
                                      )}
                                    </h2>
                                    <div className="flex justify-center items-center text-[8.5px] font-bold mt-1 px-4 border-t border-emerald-200/50 pt-1 gap-4 text-emerald-800/90">
                                      <span>{printLocation}, {printDate.split('-').reverse().join('/')}</span>
                                      {previewReportAcc.revisioneCorrente !== undefined && previewReportAcc.revisioneCorrente > 0 && previewReportAcc.dataRevisione && (
                                        <span className="text-emerald-700 font-mono">Revisione del: {previewReportAcc.dataRevisione}</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* PARAMETRI ACCETTAZIONE ED IDENTIFICAZIONE CAMPIONE - COMPACT LAYOUT */}
                                  <div className="border border-slate-200 rounded-lg overflow-hidden mb-3 text-left">
                                    <div className="grid grid-cols-1 md:grid-cols-12 text-[9px] leading-tight">
                                      {/* Blocco Cliente e Destinatario in sequenza orizzontale */}
                                      <div className="col-span-12 p-2.5 bg-slate-50/50 border-b border-slate-200 grid grid-cols-2 gap-4">
                                        <div className="border-r border-dashed border-slate-200/80 pr-4 text-left">
                                          <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Cliente</span>
                                          {payingClient ? (
                                            <div className="space-y-0.5 text-slate-800 font-medium">
                                              <h5 className="font-extrabold text-[10.5px] text-slate-900 uppercase leading-snug">{payingClient.denominazione}</h5>
                                              <p className="text-slate-600 text-[9px]">{payingClient.indirizzo}</p>
                                              <p className="font-mono text-[8px] text-slate-400">P.IVA / C.F.: <strong className="text-slate-700 font-medium">{payingClient.partitaIva}</strong></p>
                                            </div>
                                          ) : (
                                            <p className="text-slate-400 italic">Cliente n.d.</p>
                                          )}
                                        </div>

                                        <div className="text-left pl-1">
                                          <span className="text-[7px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Destinatario Finale</span>
                                          <div className="space-y-0.5 text-slate-800 font-medium">
                                            <h5 className="font-extrabold text-[10.5px] text-slate-900 uppercase leading-snug">
                                              {previewReportAcc.destinatarioFinale && previewReportAcc.destinatarioFinale !== 'Stesso Committente'
                                                ? previewReportAcc.destinatarioFinale
                                                : (client ? client.denominazione : 'Nessuno')}
                                            </h5>
                                            {client && (!previewReportAcc.destinatarioFinale || previewReportAcc.destinatarioFinale === 'Stesso Committente') && (
                                              <>
                                                <p className="text-slate-600 text-[9px]">{client.indirizzo}</p>
                                                <p className="font-mono text-[8px] text-slate-400">Dettaglio: <strong className="text-slate-700 font-medium">{client.email}</strong></p>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Dati Campionamento Disposti Orizzontalmente */}
                                      <div className="col-span-12 p-2.5 bg-white grid grid-cols-2 md:grid-cols-5 gap-2.5 text-[9px]">
                                        <div>
                                          <span className="text-[7px] font-bold text-slate-400 uppercase block">Numero Campione</span>
                                          <span className="font-mono font-bold text-slate-850 block">{previewReportAcc.codiceAccettazione}</span>
                                        </div>
                                        <div>
                                          <span className="text-[7px] font-bold text-slate-400 uppercase block">Data Ricevimento</span>
                                          <span className="text-slate-800 font-medium block">{previewReportAcc.dataAccettazione} {previewReportAcc.oraRicevimento ? `ore ${previewReportAcc.oraRicevimento}` : ''}</span>
                                        </div>
                                        <div>
                                          <span className="text-[7px] font-bold text-slate-400 uppercase block">Inizio Prove</span>
                                          <span className="font-mono text-slate-800 font-medium block">{previewReportAcc.dataInizioProva || previewReportAcc.dataAccettazione}</span>
                                        </div>
                                        <div>
                                          <span className="text-[7px] font-bold text-slate-400 uppercase block">Termine Prove</span>
                                          <span className="font-mono text-slate-800 font-medium block">{previewReportAcc.dataTermineProva || previewReportAcc.consegnaPrevista || todayStr}</span>
                                        </div>
                                        <div>
                                          <span className="text-[7px] font-bold text-slate-400 uppercase block">Categoria Merceologica</span>
                                          <span className="text-slate-800 font-normal block leading-tight">{currentCategory}</span>
                                        </div>

                                        <div className="md:col-span-2">
                                          <span className="text-[7px] font-bold text-slate-400 uppercase block">Descrizione Campione</span>
                                          <span className="text-slate-800 font-medium block leading-tight">{previewReportAcc.descrizioneCampione} <span className="text-[8px] text-slate-400 font-normal">da parte del laboratorio</span></span>
                                        </div>
                                        <div className="md:col-span-2">
                                          <span className="text-[7px] font-bold text-slate-400 uppercase block">Etichetta Campione</span>
                                          <span className="text-slate-700 font-medium italic block leading-tight truncate">{previewReportAcc.etichettaCampione || 'Nessuna etichetta allegata'}</span>
                                        </div>
                                        <div>
                                          <span className="text-[7px] font-bold text-slate-400 uppercase block">Quantità</span>
                                          <span className="text-slate-800 font-medium block">{previewReportAcc.quantitaCampione || 'N/A'}</span>
                                        </div>

                                        <div>
                                          <span className="text-[7px] font-bold text-slate-400 uppercase block">Imballaggio</span>
                                          <span className="text-slate-800 font-medium block">{previewReportAcc.imballaggio || 'Bottiglia idonea'}</span>
                                        </div>
                                        <div className="md:col-span-2">
                                          <span className="text-[7px] font-bold text-slate-400 uppercase block">Campionamento a cura di</span>
                                          <span className="text-slate-800 font-medium block">{previewReportAcc.campionatoDa || 'A cura del Cliente'}</span>
                                        </div>
                                        <div className="md:col-span-2">
                                          <span className="text-[7px] font-bold text-slate-400 uppercase block">Procedura di Campionamento</span>
                                          <span className="text-slate-600 italic block leading-tight">{previewReportAcc.proceduraCampionamento || 'Non dichiarata'}</span>
                                        </div>

                                        <div className="md:col-span-5 border-t border-slate-100 pt-1.5 mt-0.5">
                                          <span className="text-[7px] font-bold text-slate-400 uppercase block">Informazioni dal Cliente</span>
                                          <span className="text-slate-600 italic font-medium block leading-normal">{previewReportAcc.informazioniCliente || 'Nessuna riserva / Informazione idonea.'}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                /* HEADER DI CONTINUAZIONE COMPATTO (PAGINA 2+) */
                                <div className="border-b-2 border-slate-900 pb-2 mb-4">
                                  <div className="flex justify-between items-center gap-4">
                                    <div className="flex items-center gap-3">
                                      <img
                                        src={logoAgenzia}
                                        onError={(e) => {
                                          if ((e.currentTarget as HTMLImageElement).src !== window.location.origin + '/logo_agenzia.png') {
                                            (e.currentTarget as HTMLImageElement).src = '/logo_agenzia.png';
                                          }
                                        }}
                                        alt="Agenzia per lo Sviluppo"
                                        className="h-[32px] w-auto max-w-[150px] object-contain object-left block"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="border-l border-slate-300 pl-3">
                                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-900 font-mono">
                                          Rapporto di Prova N. {previewReportAcc.codiceAccettazione}
                                        </div>
                                        <div className="text-[8px] text-slate-500 font-medium">
                                          Foglio {pageSpec.pageNumber} di {totalRdpPages} · Continuazione
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-right flex items-center gap-3">
                                      <div className="hidden sm:block text-[8px] text-slate-600 leading-tight">
                                        <div>Campione: <strong className="font-mono text-slate-900">{previewReportAcc.codiceAccettazione}</strong></div>
                                        <div className="text-slate-400 truncate max-w-[200px]">{previewReportAcc.descrizioneCampione}</div>
                                      </div>
                                      {hasAccreditedTests && (
                                        <img
                                          src={logoAccredia}
                                          alt="Marchio Ufficiale di Accreditamento ACCREDIA"
                                          className="h-[38px] w-auto object-contain block"
                                          referrerPolicy="no-referrer"
                                        />
                                      )}
                                      <div className="text-[8.5px] font-mono text-slate-800 font-black bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                        Pag. {pageSpec.pageNumber} / {totalRdpPages}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* TABELLA PROVE ASSEGNATE A QUESTO FOGLIO */}
                              {renderProveTableSection(pageSpec.proveList, pageSpec.showContinuationNotice)}

                              {/* SEZIONE DETTAGLIO RIPETIBILITÀ (se assegnata a questa pagina) */}
                              {pageSpec.hasRepeatabilityDetail && previewReportAcc.risultatiAnalisi?.some(r => r.determinazioniRipetibilita && r.determinazioniRipetibilita.length > 0) && (
                                <div className="mt-3 border border-orange-200 p-3 rounded-lg bg-orange-50/5 text-[9.5px] mb-3 avoid-break text-left">
                                  <span className="font-extrabold text-orange-950 uppercase tracking-wider text-[8px] flex items-center gap-1.5 mb-2 pb-1 border-b border-orange-150">
                                    🔄 Dettaglio Tracciabilità Prove di Ripetibilità dei Tecnici
                                  </span>
                                  <div className="space-y-2">
                                    {previewReportAcc.risultatiAnalisi
                                      .filter(r => r.determinazioniRipetibilita && r.determinazioniRipetibilita.length > 0)
                                      .map((r, rIdx) => {
                                        const matchedProva = resolvedProve.find(p => p.id === r.provaId);
                                        const dets = r.determinazioniRipetibilita || [];
                                        
                                        const numericValues = dets
                                          .map(d => parseFloat(d.valore.replace(',', '.')))
                                          .filter(val => !isNaN(val));

                                        let average = 0;
                                        let statStr = '';
                                        if (numericValues.length > 0) {
                                          average = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
                                          if (numericValues.length >= 2) {
                                            if (numericValues.length === 2) {
                                              const diff = Math.abs(numericValues[0] - numericValues[1]);
                                              const rpd = average > 0 ? (diff / average) * 100 : 0;
                                              statStr = `Scarto (RPD): ${rpd.toFixed(2)}% | Diff: ${diff.toFixed(4)}`;
                                            } else {
                                              const mean = average;
                                              const variance = numericValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (numericValues.length - 1);
                                              const sd = Math.sqrt(variance);
                                              const rsd = mean > 0 ? (sd / mean) * 100 : 0;
                                              statStr = `SD: ${sd.toFixed(4)} | RSD%: ${rsd.toFixed(2)}%`;
                                            }
                                          }
                                        }

                                        return (
                                          <div key={rIdx} className="bg-white p-2 rounded border border-orange-150/80">
                                            <div className="flex justify-between items-center pb-1 border-b border-slate-100 mb-1.5">
                                              <span className="font-bold text-slate-800 text-[9.5px]">
                                                Prova Analitica: <strong className="text-orange-900 font-extrabold">{matchedProva?.nome || 'Determinazione'}{matchedProva && !matchedProva.accreditataAccredia ? ' *' : ''}</strong>
                                              </span>
                                              {statStr && (
                                                <span className="text-[8px] bg-orange-50 text-orange-800 border border-orange-150 px-2 py-0.5 rounded-full font-bold">
                                                  {statStr}
                                                </span>
                                              )}
                                            </div>
                                            
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 print:grid-cols-4">
                                              {dets.map((d, dIdx) => (
                                                <div key={d.id || dIdx} className="bg-slate-50/50 p-1.5 rounded border border-slate-150 text-[9px]">
                                                  <div className="flex justify-between items-center text-slate-400 font-black text-[7.5px] uppercase tracking-wider">
                                                    <span>Det. {dIdx + 1}</span>
                                                    {d.dataAnalisi && <span>{new Date(d.dataAnalisi).toLocaleDateString('it-IT')}</span>}
                                                  </div>
                                                  <div className="font-mono text-[10px] font-black text-slate-900 mt-0.5">
                                                    {d.valore} <span className="font-sans text-[8px] font-bold text-slate-500">{r.unitaMisura}</span>
                                                  </div>
                                                  <div className="text-[8px] font-bold text-indigo-950 mt-0.5 bg-indigo-50/50 px-1 py-0.5 rounded truncate" title={d.tecnico}>
                                                    👤 {d.tecnico || 'N/A'}
                                                  </div>
                                                </div>
                                              ))}
                                              
                                              <div className="bg-orange-50/30 p-1.5 rounded border border-orange-200 text-[9px]">
                                                <span className="text-orange-850 font-black text-[7.5px] uppercase tracking-wider block">Risultato Combinato</span>
                                                <div className="font-mono text-[11px] font-extrabold text-orange-950 mt-0.5">
                                                  {formatValoreRilevatoDisplay(r.valoreRilevato)} <span className="font-sans text-[8px] font-bold text-orange-850">{r.unitaMisura}</span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}

                              {/* ALLEGATO QUADERNO DI LABORATORIO (CALCOLI) */}
                              {pageSpec.hasNotebook && previewReportAcc.risultatiAnalisi?.some(r => r.quadernoCalcolo?.formula) && (
                                <div className="mt-3 border border-indigo-200 p-3 rounded-lg bg-indigo-50/5 text-[9.5px] mb-3 avoid-break">
                                  <span className="font-extrabold text-indigo-950 uppercase tracking-wider text-[8px] flex items-center gap-1.5 mb-2 pb-1 border-b border-indigo-150">
                                    📒 Allegato Registro Calcolo di Laboratorio
                                  </span>
                                  <div className="space-y-1.5">
                                    {previewReportAcc.risultatiAnalisi
                                      .filter(r => r.quadernoCalcolo?.formula)
                                      .map((r, rIdx) => {
                                        const matchedProva = resolvedProve.find(p => p.id === r.provaId);
                                        const qc = r.quadernoCalcolo!;
                                        return (
                                          <div key={rIdx} className="bg-slate-50/30 p-2 rounded border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-2">
                                            <div className="col-span-1 border-b md:border-b-0 md:border-r border-slate-200 pr-2">
                                              <span className="font-bold text-slate-800 text-[9.5px]">Analisi: <strong className="text-indigo-900">{matchedProva?.nome || 'Determinazione'}{matchedProva && !matchedProva.accreditataAccredia ? ' *' : ''}</strong></span>
                                              <div className="font-mono text-indigo-950 text-[9.5px] font-bold mt-0.5">Valore: {formatValoreRilevatoDisplay(r.valoreRilevato)} {r.unitaMisura}</div>
                                              {qc.noteStrumento && (
                                                <div className="text-[8px] text-slate-500 font-sans mt-1 flex items-center gap-1">
                                                  <span className="font-bold text-slate-600">🏷️ Strumento:</span>
                                                  <span className="text-slate-800 font-medium truncate" title={qc.noteStrumento}>{qc.noteStrumento}</span>
                                                </div>
                                              )}
                                            </div>
                                            <div className="col-span-1 border-b md:border-b-0 md:border-r border-slate-200 px-2">
                                              <span className="text-[7.5px] font-black text-slate-400 uppercase block tracking-wider">Formula applicata:</span>
                                              <code className="bg-white border rounded px-1.5 py-0.5 font-mono text-emerald-800 font-bold block text-center mt-0.5 text-[9px]">{qc.formula}</code>
                                            </div>
                                            <div className="col-span-1 pl-2">
                                              <span className="text-[7.5px] font-black text-slate-400 uppercase block tracking-wider font-bold">Variabili misurate:</span>
                                              <div className="space-y-0.5 mt-0.5 font-mono text-[8.5px]">
                                                {qc.variabili.map((v, vIdx) => (
                                                  <div key={vIdx} className="flex justify-between items-center">
                                                    <span className="text-indigo-700 font-bold">{v.simbolo} <span className="font-sans text-slate-400 text-[7.5px]">({v.descrizione})</span></span>
                                                    <span className="font-bold text-slate-700">{v.valore}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}

                              {/* 1. FIRME DEI RESPONSABILI DI REPARTO - Inserite subito dopo l'ultima prova */}
                              {pageSpec.hasFirmeReparto && (
                                <div className="mt-5 pt-2.5 border-t border-slate-300 font-bold text-[9.5px] uppercase tracking-normal avoid-break pr-2">
                                  <div className="flex justify-start text-left items-start">
                                    <div className="w-full max-w-[280px] space-y-2">
                                      <div className="border-b border-dashed border-slate-300 pb-1">
                                        <span className="text-[7px] text-slate-500 font-bold uppercase tracking-widest leading-none font-mono block">
                                          I Responsabili di Reparto
                                        </span>
                                      </div>
                                      
                                      {/* Reparto 1 */}
                                      <div className="space-y-0.5">
                                        <div className="font-mono text-[8.5px] font-bold text-slate-850 leading-tight">
                                          {formatFirmatarioName(previewReportAcc.firmatarioReparto1 || (operators || []).find(o => o.attivo !== false && o.autorizzatoFirma !== false && ((o.ruoloFirma || '').toLowerCase() === 'responsabile di reparto' || (o.ruolo || '').toLowerCase() === 'responsabile di reparto'))?.nome || 'Dott.ssa S. Bianchi')}
                                        </div>
                                        <div className="text-[6.5px] text-slate-500 font-semibold tracking-tight uppercase leading-normal font-sans">Responsabile di Reparto</div>
                                      </div>

                                      {/* Reparto 2 (se selezionato) */}
                                      {previewReportAcc.firmatarioReparto2 && (
                                        <div className="space-y-0.5 pt-1.5 border-t border-slate-100">
                                          <div className="font-mono text-[8.5px] font-bold text-slate-850 leading-tight">
                                            {formatFirmatarioName(previewReportAcc.firmatarioReparto2)}
                                          </div>
                                          <div className="text-[6.5px] text-slate-500 font-semibold tracking-tight uppercase leading-normal font-sans">Responsabile di Reparto</div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 2. Dichiarazione di Conformità (ISO 17025) / Giudizio di Conformità */}
                              {pageSpec.hasConformita && (previewReportAcc.dichiarazioneConformita || '').trim() && (
                                <div className="mt-4 mb-3 p-3 rounded-lg border border-emerald-200 bg-emerald-55/20 text-[9.5px] leading-relaxed text-slate-700 font-medium relative text-left avoid-break">
                                  <span className="absolute -top-2 left-4 bg-white border border-emerald-200 px-2 rounded-full text-[7.5px] font-black text-emerald-800 uppercase tracking-widest block shadow-3xs">
                                    Dichiarazione di Conformità / Giudizio di Conformità
                                  </span>
                                  <p className="whitespace-pre-line font-medium leading-relaxed">{previewReportAcc.dichiarazioneConformita}</p>
                                </div>
                              )}

                              {/* Opinioni ed Interpretazioni (ISO 17025) */}
                              {pageSpec.hasOpinioni && (previewReportAcc.opinioniInterpretazioni || '').trim() && (
                                <div className="mt-4 mb-3 p-3 rounded-lg border border-indigo-200 bg-indigo-50/10 text-[9.5px] leading-relaxed text-slate-700 font-medium relative text-left avoid-break">
                                  <span className="absolute -top-2 left-4 bg-white border border-indigo-150 px-2 rounded-full text-[7.5px] font-black text-indigo-900 uppercase tracking-widest block shadow-3xs">
                                    Opinioni ed Interpretazioni
                                  </span>
                                  <p className="whitespace-pre-line font-medium leading-relaxed">{previewReportAcc.opinioniInterpretazioni}</p>
                                </div>
                              )}

                              {/* 3. FIRMA RESPONSABILE TECNICO / RESPONSABILE DEL LABORATORIO */}
                              {pageSpec.hasFirmaTecnico && (
                                <div className="mt-4 pt-2.5 border-t border-slate-300 font-bold text-[9.5px] uppercase tracking-normal avoid-break pr-2">
                                  <div className="flex justify-end text-right items-start">
                                    <div className="w-full max-w-[280px] space-y-2 text-right">
                                      <div className="border-b border-dashed border-slate-300 pb-1 text-right">
                                        <span className="text-[7px] text-slate-500 font-bold uppercase tracking-widest leading-none font-mono block">
                                          {previewReportAcc.ruoloFirmatarioTecnico ? (previewReportAcc.ruoloFirmatarioTecnico.toLowerCase().startsWith('il ') ? previewReportAcc.ruoloFirmatarioTecnico : `Il ${previewReportAcc.ruoloFirmatarioTecnico}`) : 'Il Responsabile Tecnico'}
                                        </span>
                                      </div>
                                      
                                      <div className="space-y-1">
                                        <div className="font-mono text-[8.5px] font-bold text-slate-900 leading-tight uppercase font-medium">
                                          {formatFirmatarioName(previewReportAcc.firmatarioTecnico || (operators || []).find(o => o.attivo !== false && o.autorizzatoFirma !== false && ((o.ruoloFirma || '').toLowerCase().includes('tecnico') || (o.ruolo || '').toLowerCase() === 'responsabile tecnico'))?.nome || 'Dott. Chim. F. Lupo')}
                                        </div>
                                        <div className="text-[6.5px] text-slate-500 font-semibold tracking-tight uppercase leading-normal font-sans">
                                          {previewReportAcc.ruoloFirmatarioTecnico || 'Responsabile Tecnico'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 4. NOTA 1 COLLOCATA IN CALCE AL RAPPORTO DI PROVA */}
                              {pageSpec.hasNota1 && ((previewReportAcc.nota1 !== undefined ? previewReportAcc.nota1 : customNota1) || '').trim() && (
                                <div className="mt-4 border-t border-dashed border-slate-300 pt-2 text-[8.5px] text-slate-600 leading-relaxed normal-case font-sans avoid-break">
                                  <span className="not-italic font-bold text-slate-800 uppercase tracking-wider text-[8px] block font-mono mb-0.5">
                                    📌 Note e Avvertenze:
                                  </span>
                                  <p className="whitespace-pre-line leading-relaxed">{previewReportAcc.nota1 !== undefined ? previewReportAcc.nota1 : customNota1}</p>
                                </div>
                              )}

                              {/* NOTA DI RETTIFICA & REVISIONE */}
                              {pageSpec.hasRevisione && previewReportAcc.revisioneCorrente !== undefined && previewReportAcc.revisioneCorrente > 0 && (
                                <div className="mt-3 border border-amber-300 bg-amber-50/20 p-2.5 rounded-lg text-[8px] text-slate-700 leading-normal normal-case font-normal avoid-break text-left shadow-2xs">
                                  <div className="flex items-center justify-between border-b border-amber-200 pb-1 mb-1">
                                    <span className="font-extrabold uppercase tracking-wider text-[7.5px] text-amber-900 text-left">
                                      ⚠️ NOTA DI RETTIFICA & REVISIONE CONTROLLATA (ISO/IEC 17025 §7.8.8)
                                    </span>
                                    {previewReportAcc.tipologiaRevisione && (
                                      <span className="text-[7px] font-bold bg-amber-100/80 text-amber-900 px-1.5 py-0.5 rounded font-mono">
                                        {previewReportAcc.tipologiaRevisione}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-slate-850 text-left font-medium">
                                    Il presente Rapporto di Prova in <strong>Revisione {String(previewReportAcc.revisioneCorrente).padStart(2, '0')}</strong> annulla e sostituisce a tutti gli effetti il Rapporto di Prova precedentemente emesso per questo campione (Rev. {String(previewReportAcc.revisioneCorrente - 1).padStart(2, '0')}).
                                  </p>
                                  {previewReportAcc.revisioneMotivo && (
                                    <p className="mt-0.5 text-slate-800 text-left">
                                      <strong>Motivazione della rettifica:</strong> &ldquo;<span className="italic font-normal">{previewReportAcc.revisioneMotivo}</span>&rdquo;
                                    </p>
                                  )}
                                  {/* LEGENDA SIMBOLO [Δ] */}
                                  <div className="mt-1.5 bg-amber-50/60 border border-amber-200/70 rounded px-2 py-1 text-left">
                                    <p className="text-[7px] font-extrabold text-amber-800 uppercase tracking-wider mb-0.5 font-mono">
                                      📋 Legenda Segni di Revisione:
                                    </p>
                                    <p className="text-[7px] text-slate-700 leading-snug">
                                      <span className="font-mono font-bold text-amber-700">[Δ]</span> — Il simbolo <span className="font-mono font-bold">[Δ]</span> posto accanto a un parametro analitico indica che quel dato è stato oggetto di <strong>rettifica</strong> rispetto alla revisione precedente (Rev. {String(previewReportAcc.revisioneCorrente - 1).padStart(2, '0')}). I parametri privi del simbolo <span className="font-mono font-bold">[Δ]</span> rimangono invariati rispetto alla versione precedente.
                                    </p>
                                  </div>

                                  {/* SEZIONE APPROVAZIONE FORMALE O AVVISO BOZZA */}
                                  {previewReportAcc.statoRevisione === 'In Bozza' ? (
                                    <div className="mt-1.5 bg-rose-50/70 border border-rose-300 rounded px-2 py-1 text-left">
                                      <p className="text-[7px] font-extrabold text-rose-800 uppercase tracking-wider mb-0.5 font-mono">
                                        ⏳ BOZZA DI REVISIONE IN LAVORAZIONE (NON ANCORA APPROVATA):
                                      </p>
                                      <p className="text-[7px] text-rose-900 leading-snug font-semibold">
                                        Attenzione: La presente Revisione {String(previewReportAcc.revisioneCorrente).padStart(2, '0')} si trova attualmente in stato di <strong>BOZZA</strong> ed è in attesa di verifica Diff e convalida con PIN da parte del Responsabile autorizzato. Non costituisce emissione ufficiale definitiva.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="mt-1.5 bg-green-50/50 border border-green-200/70 rounded px-2 py-1 text-left">
                                      <p className="text-[7px] font-extrabold text-green-800 uppercase tracking-wider mb-0.5 font-mono">
                                        ✅ Approvazione Formale (ISO/IEC 17025 §7.8.8):
                                      </p>
                                      <p className="text-[7px] text-slate-700 leading-snug">
                                        La presente revisione è stata <strong>approvata e firmata</strong> da{' '}
                                        <span className="font-mono font-bold text-green-800">
                                          {previewReportAcc.firmatarioTecnico || 'Responsabile Tecnico'}
                                        </span>
                                        {previewReportAcc.ruoloFirmatarioTecnico && (
                                          <span className="text-slate-500"> ({previewReportAcc.ruoloFirmatarioTecnico})</span>
                                        )}
                                        {' '}il{' '}
                                        <span className="font-mono font-bold">{previewReportAcc.dataRevisione || printDate}</span>
                                        {' '}mediante convalida con PIN personale. L&apos;approvazione sostituisce a tutti gli effetti la versione Rev. {String(previewReportAcc.revisioneCorrente - 1).padStart(2, '0')} che è da considerarsi annullata e sostituita.
                                      </p>
                                    </div>
                                  )}

                                  <p className="mt-1 text-[7px] text-slate-400 font-mono text-left border-t border-slate-200/60 pt-0.5">
                                    Tracciabilità: ID {previewReportAcc.id}-REV-{previewReportAcc.revisioneCorrente} · Emissione digitale autorizzata da <strong>{previewReportAcc.firmatarioTecnico || 'Responsabile Tecnico'}</strong> il {previewReportAcc.dataRevisione || printDate}.
                                  </p>
                                </div>
                              )}

                            </div>

                            {/* PIÈ DI PAGINA UFFICIALE ISO/IEC 17025 CON NUMERAZIONE FORMATO "Pag. 1 / N" */}
                            <div className="pt-2 border-t border-slate-300 mt-3 flex justify-between items-center text-[8px] text-slate-500 font-mono select-none">
                              <div className="flex items-center gap-2">
                                <span>Rapporto di Prova N. <strong className="text-slate-800">{previewReportAcc.codiceAccettazione}</strong></span>
                                {previewReportAcc.revisioneCorrente !== undefined && previewReportAcc.revisioneCorrente > 0 && (
                                  <span className="font-bold text-slate-700"> Rev. {String(previewReportAcc.revisioneCorrente).padStart(2, '0')}</span>
                                )}
                                <span className="text-slate-400"> · Data: {printDate.split('-').reverse().join('/')}</span>
                              </div>
                              <div className="text-slate-400 hidden sm:block text-[7.5px] italic">
                                La riproduzione parziale del presente documento è vietata senza autorizzazione scritta del laboratorio
                              </div>
                              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[8.5px] bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                                <span>Pag. {pageSpec.pageNumber} / {totalRdpPages}</span>
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* FOOTER DEL MODAL */}
                <div className="bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0 border-t border-slate-200">
                  <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                    <span>Rapporto di Prova N. <span className="font-bold text-slate-800">{previewReportAcc.codiceAccettazione}</span></span>
                    <span className="text-slate-300">|</span>
                    <span className="font-mono text-[11px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded font-bold">
                      {totalRdpPages === 1 ? 'Foglio Unico (Pag. 1/1)' : `Fogli A4: ${totalRdpPages}`}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCloseReportAndReturnToList}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold px-5 py-2.5 text-xs rounded-xl cursor-pointer transition shadow-sm flex items-center gap-2"
                      title="Chiudi il Rapporto di Prova e ritorna direttamente all'elenco dei campioni accettati"
                    >
                      <span>⬅️ Chiudi RdP e Torna all'Elenco</span>
                    </button>

                    <button
                      onClick={() => {
                        const container = document.getElementById('lims-printable-area');
                        if (container) {
                          const clone = container.cloneNode(true) as HTMLElement;
                          const imgs = clone.querySelectorAll('img');
                          imgs.forEach(img => {
                            const currentSrc = img.getAttribute('src') || img.src;
                            if (currentSrc) {
                              if (currentSrc.startsWith('http') || currentSrc.startsWith('data:')) {
                                img.setAttribute('src', currentSrc);
                              } else {
                                const absoluteUrl = window.location.origin + (currentSrc.startsWith('/') ? '' : '/') + currentSrc;
                                img.setAttribute('src', absoluteUrl);
                              }
                            }
                          });
                          // Rimuove eventuali classi a schermo
                          clone.querySelectorAll('.print\\:hidden').forEach(el => el.remove());
                          const printContent = clone.innerHTML;
                          const origin = typeof window !== 'undefined' ? window.location.origin : '';
                          const win = window.open('', '_blank', 'width=1024,height=1000,menubar=yes,toolbar=yes,scrollbars=yes');
                          if (win) {
                            win.document.open();
                            win.document.write(`
                              <!DOCTYPE html>
                              <html lang="it">
                                <head>
                                  <meta charset="utf-8">
                                  <base href="${origin}/">
                                  <title>Rapporto_di_Prova_${previewReportAcc.codiceAccettazione}</title>
                                  <script src="https://cdn.tailwindcss.com"></script>
                                  <style>
                                    @page {
                                      size: A4 portrait;
                                      margin: 0;
                                    }
                                    *, *::before, *::after {
                                      box-sizing: border-box;
                                    }
                                    html, body {
                                      margin: 0 !important;
                                      padding: 0 !important;
                                      background: #ffffff !important;
                                      font-family: 'Inter', system-ui, -apple-system, sans-serif;
                                      -webkit-print-color-adjust: exact !important;
                                      print-color-adjust: exact !important;
                                      color: #0f172a;
                                    }
                                    .printable-sheet {
                                      margin: 0 !important;
                                      padding: 0 !important;
                                      width: 100% !important;
                                      box-shadow: none !important;
                                    }
                                    .rdp-page {
                                      width: 210mm !important;
                                      height: 297mm !important;
                                      max-height: 297mm !important;
                                      min-height: 297mm !important;
                                      padding: 10mm 13mm 10mm 13mm !important;
                                      box-sizing: border-box !important;
                                      page-break-after: always !important;
                                      break-after: page !important;
                                      page-break-inside: avoid !important;
                                      break-inside: avoid !important;
                                      display: flex !important;
                                      flex-direction: column !important;
                                      justify-content: space-between !important;
                                      overflow: hidden !important;
                                      position: relative !important;
                                      background: #ffffff !important;
                                      border: none !important;
                                      box-shadow: none !important;
                                      margin: 0 auto !important;
                                    }
                                    .rdp-page:last-child {
                                      page-break-after: auto !important;
                                      break-after: auto !important;
                                    }
                                    .avoid-break {
                                      page-break-inside: avoid !important;
                                      break-inside: avoid !important;
                                    }
                                    table {
                                      width: 100%;
                                      border-collapse: collapse;
                                      page-break-inside: avoid !important;
                                      break-inside: avoid !important;
                                    }
                                    tr {
                                      page-break-inside: avoid !important;
                                      break-inside: avoid !important;
                                    }
                                    img {
                                      -webkit-print-color-adjust: exact !important;
                                      print-color-adjust: exact !important;
                                      display: inline-block;
                                      max-width: 100%;
                                    }
                                  </style>
                                </head>
                                <body>
                                  <div class="printable-sheet">${printContent}</div>
                                  <script>
                                    function doPrint() {
                                      const images = Array.from(document.images);
                                      const imgPromises = images.map(img => {
                                        if (img.complete) return Promise.resolve();
                                        return new Promise(resolve => {
                                          img.onload = resolve;
                                          img.onerror = resolve;
                                        });
                                      });
                                      Promise.all(imgPromises).then(() => {
                                        setTimeout(() => {
                                          window.focus();
                                          window.print();
                                        }, 300);
                                      });
                                    }
                                    if (document.readyState === 'complete') {
                                      doPrint();
                                    } else {
                                      window.addEventListener('load', doPrint);
                                    }
                                  </script>
                                </body>
                              </html>
                            `);
                            win.document.close();
                          }
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-2.5 text-xs rounded-xl cursor-pointer transition shadow-sm flex items-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Stampa Certificato A4</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* MODALE DI CAMBIO STATO RAPIDO TRACCIABILE CON PASSWORD */}
      <AnimatePresence>
        {tracingAccId && tracingAccField && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col alert-dialog text-left"
            >
              {/* Header */}
              <div className="bg-slate-950 p-5 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                    🔐 Cambio Stato Tracciabile
                  </h3>
                  <p className="text-[10px] text-slate-300 font-medium">LIMS Security & Integrity Audit Trail</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTracingAccId(null);
                    setTracingAccField(null);
                  }}
                  className="p-1 px-2.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 text-xs font-bold font-mono transition cursor-pointer"
                >
                  ESC
                </button>
              </div>

              {/* Form Content */}
              <div className="p-5 space-y-4 text-xs">
                {/* Specifiche del Campione */}
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                  <span className="font-bold text-slate-500">Campione:</span>
                  <span className="font-extrabold text-slate-900">
                    {accettazioni.find(a => a.id === tracingAccId)?.codiceAccettazione}
                  </span>
                </div>

                {/* Seleziona Nuovo Stato */}
                <div className="space-y-1.5">
                  <label className="block font-black text-slate-500 uppercase text-[9px] tracking-widest">
                    Seleziona Nuovo Stato (*):
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {tracingAccField === 'analisiStato' ? (
                      [
                        { val: 'In Attesa', label: '⏳ In Attesa' },
                        { val: 'In Corso', label: '🧪 In Corso' },
                        { val: 'Completato', label: '✅ Completato' },
                        { val: 'Annullato', label: '❌ Annullato' }
                      ].map(st => (
                        <button
                          key={st.val}
                          type="button"
                          onClick={() => setTracingSelectedAccStatus(st.val as any)}
                          className={`p-2.5 rounded-xl border text-center font-bold tracking-wide text-[11px] transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            tracingSelectedAccStatus === st.val
                              ? 'bg-indigo-400 text-white border-indigo-400 shadow-md'
                              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))
                    ) : (
                      [
                        { val: 'Idoneo', label: '✅ Idoneo' },
                        { val: 'Non Idoneo', label: '❌ Non Idoneo' },
                        { val: 'Accettato con Riserva', label: '⚠️ Con Riserva' }
                      ].map(st => (
                        <button
                          key={st.val}
                          type="button"
                          onClick={() => setTracingSelectedAccStatus(st.val as any)}
                          className={`p-2.5 rounded-xl border text-center font-bold tracking-wide text-[11px] transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                            tracingSelectedAccStatus === st.val
                              ? 'bg-indigo-400 text-white border-indigo-400 shadow-md'
                              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Giustificazione Non Idoneità/Riserva se selezionato (Richiesta Utente) */}
                {tracingAccField === 'statoInArrivo' && tracingSelectedAccStatus !== 'Idoneo' && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-left animate-fadeIn">
                    <label className="block text-[9px] font-black text-rose-800 uppercase tracking-widest">
                      Giustificazione stato non idoneo / sospeso (*) :
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={tracingGiustificazione}
                      onChange={(e) => setTracingGiustificazione(e.target.value)}
                      placeholder="Indica il motivo dettagliato della sospensione o non-idoneità..."
                      className="w-full text-xs font-semibold p-2 bg-white border border-rose-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-lg outline-none placeholder-slate-400 text-slate-800"
                    />
                  </div>
                )}

                {/* Selezione Operatore */}
                <div className="space-y-2">
                  <label className="block font-black text-slate-500 uppercase text-[9px] tracking-widest">
                    Operatore Modificatore (*):
                  </label>
                  <select
                    value={tracingAccOperator}
                    onChange={(e) => {
                      setTracingAccOperator(e.target.value);
                      setTracingAccPassword('');
                      setTracingAccError(null);
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    {operators && operators.length > 0 ? (
                      operators.filter(op => op.attivo !== false).map(op => (
                        <option key={op.nome} value={op.nome}>{op.nome} ({getOperatorQualificationLabel(op)})</option>
                      ))
                    ) : (
                      <>
                        <option value="Dott. Chim. F. Lupo">Dott. Chim. F. Lupo (Biochem)</option>
                        <option value="Dott.ssa S. Bianchi">Dott.ssa S. Bianchi (Lab Tech)</option>
                        <option value="Dott. R. Vitale">Dott. R. Vitale (emcvit@gmail.com)</option>
                      </>
                    )}
                    <option value="Altro">Altro operatore (manuale)</option>
                  </select>

                  {tracingAccOperator === 'Altro' && (
                    <input
                      type="text"
                      value={tracingAccCustomOperator}
                      onChange={(e) => setTracingAccCustomOperator(e.target.value)}
                      placeholder="Nome e Cognome operatore..."
                      className="w-full bg-white border border-slate-250 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 mt-1.5 animate-fadeIn"
                      required
                    />
                  )}
                </div>

                {/* Password di Firma */}
                <div className="space-y-1.5">
                  <label className="block font-black text-slate-500 uppercase text-[9px] tracking-widest">
                    Password di Firma (*):
                  </label>
                  <input
                    type="password"
                    value={tracingAccPassword}
                    onChange={(e) => {
                      setTracingAccPassword(e.target.value);
                      setTracingAccError(null);
                    }}
                    placeholder="Digita la password per autorizzare l&apos;operazione (es: lupo123, bianchi123, vitale123)..."
                    className="w-full bg-white border border-slate-250 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950"
                    required
                  />
                </div>

                {tracingAccError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[10.5px] font-semibold text-rose-700 animate-fadeIn text-left leading-normal">
                    ⚠️ {tracingAccError}
                  </div>
                )}

                {/* TIMESTAMP AUTOMATICO */}
                <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl text-[10.5px] leading-normal text-indigo-950 flex items-start gap-2">
                  <Clock className="h-4 w-4 text-indigo-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Marcatura Temporale Audit LIMS:</strong>
                    <p className="text-slate-500 font-mono font-semibold mt-0.5">{new Date().toLocaleString('it-IT')}</p>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTracingAccId(null);
                    setTracingAccField(null);
                  }}
                  className="flex-1 p-2.5 rounded-xl border border-slate-200 text-slate-650 font-bold hover:bg-slate-100 transition text-xs cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAccStatusChange}
                  className="flex-1 p-2.5 rounded-xl bg-indigo-400 text-white font-bold hover:bg-indigo-500 transition shadow-md text-xs cursor-pointer"
                >
                  Firma e Conferma
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE DI CALCOLO CERTIFICATO IDROCARBURI TOTALI (SOMMA 4 COMPOSTI: Bromoformio, Cloroformio, Bromodiclorometano, Dibromoclorometano) */}
      {idrocarburiModalProva && (
        <IdrocarburiTotaliModal
          isOpen={!!idrocarburiModalProva}
          onClose={() => setIdrocarburiModalProva(null)}
          targetProva={idrocarburiModalProva}
          allProveCampione={
            editingResultsAccId 
              ? (() => {
                  const acc = accettazioni.find(a => a.id === editingResultsAccId);
                  return acc ? getResolvedProveForAccettazione(acc) : prove;
                })()
              : prove
          }
          tempRisultati={tempRisultati}
          onApply={({ sommaValore, sommaIncertezza, quadernoCalcolo, compostiUpdates }: IdrocarburiTotaliApplyData) => {
            setTempRisultati(prev => {
              const next = { ...prev };

              // 1. Identifica e aggiorna la prova degli Idrocarburi Totali
              const targetId = idrocarburiModalProva.id;
              next[targetId] = {
                ...(next[targetId] || {}),
                valoreRilevato: sommaValore,
                incertezza: sommaIncertezza,
                incertezzaPercentuale: '',
                quadernoCalcolo: quadernoCalcolo
              };

              // 2. Se presenti altre prove del campione corrispondenti ai 4 composti, sincronizza i loro valori ed incertezze
              Object.entries(compostiUpdates).forEach(([provaId, compData]) => {
                if (next[provaId]) {
                  next[provaId] = {
                    ...next[provaId],
                    valoreRilevato: compData.valoreRilevato,
                    incertezza: compData.incertezza,
                    incertezzaPercentuale: compData.isBelowLoq ? '' : (next[provaId]?.incertezzaPercentuale || '')
                  };
                }
              });

              return next;
            });
            setIdrocarburiModalProva(null);
          }}
        />
      )}

      {/* MODALE AVVIO REVISIONE CONTROLLATA RAPPORTO DI PROVA (ISO/IEC 17025 §7.8.8) */}
      <AnimatePresence>
        {revModalAcc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border border-slate-200 flex flex-col text-left"
            >
              <div className="bg-slate-950 p-5 text-white flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-amber-400" />
                    Avvia Revisione Controllata RdP
                  </h3>
                  <p className="text-[10px] text-slate-300 font-medium mt-0.5">
                    Procedura conforme a UNI CEI EN ISO/IEC 17025 §7.8.8 (Modifiche ai Rapporti di Prova)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRevModalAcc(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">Campione / Rapporto di Prova</span>
                    <span className="font-black text-slate-900 font-mono text-sm">{revModalAcc.codiceAccettazione}</span>
                    <span className="text-slate-600 ml-2 font-medium">({revModalAcc.descrizioneCampione})</span>
                  </div>
                  <span className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg font-mono font-black text-amber-900 text-xs">
                    Rev. {String((revModalAcc.revisioneCorrente || 0) + 1).padStart(2, '0')}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-black text-slate-600 uppercase text-[10px] tracking-wider">
                    Tipologia di Modifica / Rettifica *
                  </label>
                  <select
                    value={revTipologia}
                    onChange={(e) => setRevTipologia(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Rettifica errore materiale / analitico">Rettifica errore materiale / analitico</option>
                    <option value="Integrazione parametri analitici su richiesta cliente">Integrazione parametri analitici su richiesta cliente</option>
                    <option value="Modifica dati anagrafici / identificativi del campione">Modifica dati anagrafici / identificativi del campione</option>
                    <option value="Aggiornamento giudizio di conformità / opinioni">Aggiornamento giudizio di conformità / opinioni</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-black text-slate-600 uppercase text-[10px] tracking-wider">
                    Motivazione Dettagliata della Revisione (stampata sul RdP) *
                  </label>
                  <textarea
                    rows={3}
                    value={revMotivo}
                    onChange={(e) => setRevMotivo(e.target.value)}
                    placeholder="Descrivi la ragione tecnica o amministrativa che rende necessaria l'emissione del Rapporto di Prova revisionato..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-black text-slate-600 uppercase text-[10px] tracking-wider">
                    Operatore Richiedente *
                  </label>
                  <select
                    value={revOperatore}
                    onChange={(e) => setRevOperatore(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    {getTechnicalSigners(operators).map((op) => (
                      <option key={op.nome} value={op.nome}>
                        {op.nome} ({getOperatorQualificationLabel(op)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed">
                  📌 All&apos;avvio della revisione verrà salvato uno <strong>snapshot immutabile</strong> della versione corrente (Rev. {String(revModalAcc.revisioneCorrente || 0).padStart(2, '0')}). Potrai modificare i risultati e poi cliccare su <strong>&ldquo;Approva Rev.&rdquo;</strong> per confrontare le differenze (Diff Side-by-Side) con firma elettronica del Responsabile.
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRevModalAcc(null)}
                  className="px-4 py-2 rounded-xl border border-slate-250 text-slate-600 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  disabled={!revMotivo.trim()}
                  onClick={() => {
                    if (!revMotivo.trim() || !onStartRevisionBozza) return;
                    onStartRevisionBozza(revModalAcc.id, revMotivo.trim(), revTipologia, revOperatore);
                    const targetAcc = revModalAcc;
                    setRevModalAcc(null);
                    setExpandedId(targetAcc.id);
                    handleStartEditResults(targetAcc);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-extrabold text-xs uppercase tracking-wide transition shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Avvia Revisione in Bozza
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE VERBALE DI ACCETTAZIONE CAMPIONE (MPG 07) & ETICHETTA IDENTIFICATIVA */}
      <AnimatePresence>
        {previewVerbaleAcc && (() => {
          const vInternalLabClient: Client = {
            id: '__LAB_INTERNO__',
            denominazione: 'Laboratorio Chimico Merceologico - Agenzia per lo Sviluppo (Uso Interno / QC / Ring Test)',
            partitaIva: '01751450667',
            codiceFiscale: '01751450667',
            email: 'laboratorio@agenziagransasso.camcom.it',
            telefono: '',
            indirizzo: 'Via degli Opifici n°1 - Z.I. di Bazzano',
            comune: "67100 L'Aquila",
            fatturatoAnnuo: {},
            categorieFatturato: {}
          };
          const vClient = previewVerbaleAcc.intestatarioRapportoClienteId === '__LAB_INTERNO__'
            ? vInternalLabClient
            : clients.find(c => c.id === previewVerbaleAcc.intestatarioRapportoClienteId);
          const vFattClient = (previewVerbaleAcc.destinatarioFatturaClienteId === '__LAB_INTERNO__'
            ? vInternalLabClient
            : clients.find(c => c.id === previewVerbaleAcc.destinatarioFatturaClienteId)) || vClient;
          const vPrev = preventivi.find(p => p.id === previewVerbaleAcc.preventivoAssociatoId);
          const vProve = getResolvedProveForAccettazione(previewVerbaleAcc);

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white"
            >
              <motion.div
                initial={{ scale: 0.96, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 12 }}
                className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none text-left"
              >
                {/* Barra Azioni (Nascosta in stampa) */}
                <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 print:hidden">
                  <div className="flex items-center gap-2.5">
                    <Tag className="h-5 w-5 text-emerald-400" />
                    <div>
                      <h3 className="font-extrabold text-sm tracking-wide uppercase">
                        Verbale di Accettazione &amp; Cartellino Campione ({previewVerbaleAcc.codiceAccettazione})
                      </h3>
                      <p className="text-[11px] text-slate-300">
                        Ricevuta di presa in carico del campione e talloncino ritagliabile per identificazione contenitori
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                    >
                      <Printer className="h-4 w-4" /> Stampa Verbale + Etichetta
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewVerbaleAcc(null)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Chiudi
                    </button>
                  </div>
                </div>

                {/* Corpo Stampabile */}
                <div className="p-6 md:p-8 overflow-y-auto space-y-6 text-slate-900 print:p-4 print:overflow-visible">
                  {/* Intestazione Ufficiale conforme ad AGENTS.md (senza logo ACCREDIA in quanto Verbale di Accettazione) */}
                  <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 gap-4">
                    <div className="flex flex-col items-start text-left">
                      <img
                        src={logoAgenzia}
                        alt="Logo Agenzia per lo Sviluppo"
                        className="h-14 w-auto object-contain object-left mb-1.5"
                      />
                      <div className="text-[9.5px] text-slate-700 leading-snug font-medium space-y-0.5">
                        <p>Sede legale ed amministrativa: Corso Vittorio Emanuele n°86 - 67100 L&apos;Aquila</p>
                        <p>Laboratorio: Via degli Opifici n°1 - Z.I. di Bazzano - 67100 L&apos;Aquila</p>
                        <p>P.iva 01751450667</p>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="inline-block bg-slate-900 text-white px-3 py-1 rounded text-xs font-black uppercase tracking-wider">
                        VERBALE DI ACCETTAZIONE CAMPIONE
                      </span>
                      <p className="text-[10px] text-slate-600 font-bold mt-1">Mod. MPG 07 · Registro LIMS</p>
                      <p className="text-sm font-black text-slate-900 mt-1">
                        Cod. Campione: {previewVerbaleAcc.codiceAccettazione}
                      </p>
                      <p className="text-[10px] text-slate-600">
                        Data Ricevimento: <strong>{previewVerbaleAcc.dataAccettazione}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Sezione 1: Committente & Preventivo */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="border border-slate-300 rounded-lg p-3 space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                        Committente / Intestatario Rapporto di Prova
                      </span>
                      <p className="font-extrabold text-slate-900 text-sm">
                        {vClient?.denominazione || 'N/D'}
                      </p>
                      {vClient?.indirizzo && <p className="text-slate-600">{vClient.indirizzo}</p>}
                      <p className="text-slate-600">
                        {vClient?.partitaIva ? `P.IVA: ${vClient.partitaIva}` : ''}{' '}
                        {vClient?.codiceFiscale ? `· C.F.: ${vClient.codiceFiscale}` : ''}
                      </p>
                      {vFattClient && vFattClient.id !== vClient?.id && (
                        <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-150">
                          Intestatario Fattura: <strong>{vFattClient.denominazione}</strong>
                        </p>
                      )}
                    </div>

                    <div className="border border-slate-300 rounded-lg p-3 space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">
                        Riferimenti Contrattuali &amp; Consegna
                      </span>
                      <p>
                        Preventivo / Modalità:{' '}
                        <strong className="font-mono text-slate-900">
                          {vPrev
                            ? `${vPrev.codice} del ${vPrev.dataCreazione}`
                            : previewVerbaleAcc.modalitaAccettazione === 'uso_interno'
                              ? 'Uso Interno / Ring Test / QC (Non Commerciale)'
                              : 'Accettazione Diretta da Tariffario / Listino'}
                        </strong>
                      </p>
                      <p>
                        Consegna Prevista RdP:{' '}
                        <strong>{previewVerbaleAcc.consegnaPrevista || 'Da concordare'}</strong>
                      </p>
                      <p>
                        Campionamento eseguito da:{' '}
                        <strong>{previewVerbaleAcc.campionatoDa || 'Cliente'}</strong>
                        {previewVerbaleAcc.proceduraCampionamento ? ` (${previewVerbaleAcc.proceduraCampionamento})` : ''}
                      </p>
                      {(previewVerbaleAcc.comunePrelievo || previewVerbaleAcc.puntoPrelievo) && (
                        <p className="text-[11px] text-slate-700">
                          Luogo / Punto prelievo:{' '}
                          <strong>
                            {[previewVerbaleAcc.comunePrelievo, previewVerbaleAcc.puntoPrelievo].filter(Boolean).join(' - ')}
                          </strong>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Sezione 2: Identificazione Campione e Controlli MPG 07 in Accettazione */}
                  <div className="border border-slate-300 rounded-lg p-3.5 space-y-2.5 text-xs">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block border-b border-slate-200 pb-1">
                      Caratteristiche del Campione e Verifiche di Idoneità al Ricevimento (MPG 07)
                    </span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Descrizione Campione:</span>
                        <strong className="text-slate-900">{previewVerbaleAcc.descrizioneCampione}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Matrice / Categoria:</span>
                        <strong className="text-slate-900">{previewVerbaleAcc.matrice}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Quantità / Confezioni:</span>
                        <strong className="text-slate-900">{previewVerbaleAcc.quantitaCampione || '1 unità'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Imballaggio / Contenitore:</span>
                        <strong className="text-slate-900">{previewVerbaleAcc.imballaggio || 'Confezione integra'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Consegnato da / Qualità:</span>
                        <strong className="text-slate-900">
                          {previewVerbaleAcc.consegnanteRelazione || previewVerbaleAcc.qualitaConsegnante || 'Cliente'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Temp. al Ricevimento:</span>
                        <strong className="text-slate-900">
                          {previewVerbaleAcc.temperaturaArrivo ? `${previewVerbaleAcc.temperaturaArrivo}` : 'Ambiente'}
                          {previewVerbaleAcc.tempAccettazioneConforme ? ` (Conf.: ${previewVerbaleAcc.tempAccettazioneConforme.toUpperCase()})` : ''}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Esito Verifica Idoneità:</span>
                        <strong className={previewVerbaleAcc.statoInArrivo === 'Idoneo' ? 'text-emerald-700' : 'text-rose-700'}>
                          {previewVerbaleAcc.statoInArrivo}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Sigilli / Etichetta Cliente:</span>
                        <strong className="text-slate-900">
                          {previewVerbaleAcc.etichettaCampione || 'Assenti / N.A.'}
                        </strong>
                      </div>
                    </div>
                    {previewVerbaleAcc.giustificazioneNonIdoneita && (
                      <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-900">
                        <strong>Nota di Riserva / Non Idoneità:</strong> {previewVerbaleAcc.giustificazioneNonIdoneita}
                      </div>
                    )}
                    {previewVerbaleAcc.noteLab && (
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700">
                        <strong>Note di Accettazione:</strong> {previewVerbaleAcc.noteLab}
                      </div>
                    )}
                  </div>

                  {/* Sezione 3: Elenco Determinazioni Analitiche Richieste */}
                  <div className="border border-slate-300 rounded-lg p-3.5 space-y-2 text-xs">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block border-b border-slate-200 pb-1">
                      Elenco Determinazioni Analitiche Richieste ({vProve.length} prove)
                    </span>
                    {vProve.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                        {vProve.map((p, idx) => (
                          <div key={p.id} className="flex items-center justify-between text-[11px] py-1 px-2 bg-slate-50 rounded border border-slate-150">
                            <span className="font-bold text-slate-800">
                              {idx + 1}. {p.nome} {!p.accreditataAccredia ? '*' : ''}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500">{p.metodoAnalitico}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-[11px]">Nessuna prova analitica selezionata.</p>
                    )}
                  </div>

                  {/* Firme Verbale */}
                  <div className="grid grid-cols-2 gap-8 pt-4 text-xs">
                    <div className="border-t border-slate-400 pt-2 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        Firma per Consegna (Il Cliente / Incaricato)
                      </span>
                      <div className="h-8" />
                    </div>
                    <div className="border-t border-slate-400 pt-2 text-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">
                        Firma per Accettazione Laboratorio
                      </span>
                      <div className="h-8" />
                    </div>
                  </div>

                  {/* Linea tratteggiata di taglio per Cartellino / Etichetta Contenitore */}
                  <div className="border-t-2 border-dashed border-slate-400 pt-5 mt-4">
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      <span>✂️ Tagliare lungo la linea tratteggiata e applicare sul contenitore del campione</span>
                      <span>ETICHETTA IDENTIFICATIVA INTERNA LIMS</span>
                    </div>

                    <div className="border-2 border-slate-900 rounded-xl p-4 bg-white max-w-md mx-auto shadow-2xs">
                      <div className="flex justify-between items-center border-b border-slate-900 pb-2 mb-2">
                        <div>
                          <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 block">
                            AGENZIA PER LO SVILUPPO - LAB. CHIMICO
                          </span>
                          <span className="text-lg font-black font-mono text-slate-950 tracking-tight">
                            {previewVerbaleAcc.codiceAccettazione}
                          </span>
                        </div>
                        <div className="text-right font-mono text-[10px]">
                          <span className="font-bold block">Data: {previewVerbaleAcc.dataAccettazione}</span>
                          <span className="px-1.5 py-0.5 bg-slate-900 text-white rounded text-[9px] font-black uppercase">
                            {previewVerbaleAcc.statoInArrivo}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1 text-[11px]">
                        <p className=" truncate">
                          <span className="text-slate-500 font-semibold">Campione:</span>{' '}
                          <strong className="text-slate-900">{previewVerbaleAcc.descrizioneCampione}</strong>
                        </p>
                        <p>
                          <span className="text-slate-500 font-semibold">Matrice:</span>{' '}
                          <strong>{previewVerbaleAcc.matrice}</strong> ·{' '}
                          <span className="text-slate-500 font-semibold">Q.tà:</span>{' '}
                          <strong>{previewVerbaleAcc.quantitaCampione || '1 unità'}</strong>
                        </p>
                        <p>
                          <span className="text-slate-500 font-semibold">Scadenza RdP:</span>{' '}
                          <strong>{previewVerbaleAcc.consegnaPrevista || 'N/D'}</strong> ·{' '}
                          <span className="text-slate-500 font-semibold">Prove:</span>{' '}
                          <strong>{vProve.length}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
