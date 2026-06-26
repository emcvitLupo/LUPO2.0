import React, { useState, useRef, useEffect } from 'react';
import { AccettazioneCampione, Client, Preventivo, Prova, Pacchetto, RisultatoProva, Operator, VariableCalcolo, QuadernoCalcolo } from '../types';
import { evaluateFormula, FORMULA_PRESETS, FormulaPreset } from '../utils/mathLims';
import { 
  Building, 
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
  BookOpen
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

// Helper to automatically convert/format a value lower than the LOQ to "< [LOQ_VAL]"
export function checkIfValueBelowLOQ(valStr: string, loqStr?: string): string {
  if (!valStr || !loqStr) return valStr;

  const valClean = valStr.trim().replace(',', '.');
  const loqClean = loqStr.trim().replace(',', '.');

  // Extract first floating-point or integer number from both
  const valMatch = valClean.match(/[-+]?[0-9]*\.?[0-9]+/);
  const loqMatch = loqClean.match(/[-+]?[0-9]*\.?[0-9]+/);

  if (valMatch && loqMatch) {
    const valNum = parseFloat(valMatch[0]);
    const loqNum = parseFloat(loqMatch[0]);

    if (!isNaN(valNum) && !isNaN(loqNum)) {
      if (valNum < loqNum) {
        return `< ${loqStr.trim()}`;
      }
    }
  }
  return valStr;
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
  onViewPreventivo?: (id: string) => void;
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
  onViewPreventivo
 }: AccettazioneSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMatrice, setSelectedMatrice] = useState<string>('Tutte');
  const [showForm, setShowForm] = useState(false);
  const [editingAcc, setEditingAcc] = useState<AccettazioneCampione | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Stati per la gestione risultati e certificati (Richiesta Utente)
  const [editingResultsAccId, setEditingResultsAccId] = useState<string | null>(null);
  const [tempRisultati, setTempRisultati] = useState<Record<string, Partial<RisultatoProva>>>({});
  const [previewReportAcc, setPreviewReportAcc] = useState<AccettazioneCampione | null>(null);
  const [activeCalcRowId, setActiveCalcRowId] = useState<string | null>(null);
  const [openQuadernoRowId, setOpenQuadernoRowId] = useState<string | null>(null);
  const [showLabNotebookInPrint, setShowLabNotebookInPrint] = useState<boolean>(false);
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

  const [customNota2, setCustomNota2] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('lims_custom_nota_2');
      return stored || `Rapporto di Prova emesso ai termini di legge e inserito nell'archivio digitale del laboratorio certificatore.`;
    } catch {
      return `Rapporto di Prova emesso ai termini di legge e inserito nell'archivio digitale del laboratorio certificatore.`;
    }
  });

  const [nota1Presets, setNota1Presets] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('lims_nota1_presets');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      `Il presente Rapporto riguarda esclusivamente il campione sottoposto a prova ed esso non può essere riprodotto parzialmente, se non previa autorizzazione scritta da parte di questo Laboratorio. I risultati si riferiscono al campione così come ricevuto. L'incertezza estesa per le prove chimiche, ove riportata, è espressa con un fattore di copertura K=2 che per una distribuzione normale dei dati, corrisponde a un livello di fiducia di circa 95%. L'incertezza estesa per le prove microbiologiche, ove riportata, è espressa come intervallo di fiducia con un fattore di copertura K=1,96 corrispondente a un livello di fiducia di circa 95%.`,
      `Il campione è conforme ai parametri stabiliti. I risultati sono riferiti al campione tal quale consegnato dal committente.`,
      `Il presente Rapporto di Prova non può essere riprodotto parzialmente senza l'approvazione scritta del Laboratorio. I risultati si riferiscono unicamente al campione provato.`,
      `Nessuna nota iniziale.`
    ];
  });

  const [selectedNota2Type, setSelectedNota2Type] = useState<'conformita' | 'opinioni'>('conformita');
  const [selectedNota2Category, setSelectedNota2Category] = useState<string>('Acqua Potabile');
  const [tempNewNota1, setTempNewNota1] = useState<string>('');
  const [selectedNota1Index, setSelectedNota1Index] = useState<number>(-1);
  const [editingNota1Text, setEditingNota1Text] = useState<string>('');

  const [nota2Presets, setNota2Presets] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('lims_nota2_presets');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      `Rapporto di Prova emesso in conformità ai requisiti normativi. Tutti i parametri analizzati risultano conformi.`,
      `Rapporto di Prova emesso ai termini di legge e inserito nell'archivio digitale del laboratorio certificatore.`,
      `Il presente rapporto è registrato nell'archivio ufficiale LIMS e conservato a norma di legge.`
    ];
  });
  const [selectedNota2Index, setSelectedNota2Index] = useState<number>(-1);
  const [selectedDichiarazioneId, setSelectedDichiarazioneId] = useState<string>('');
  const [selectedOpinioniId, setSelectedOpinioniId] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem('lims_nota1_presets', JSON.stringify(nota1Presets));
    } catch {}
  }, [nota1Presets]);

  useEffect(() => {
    try {
      localStorage.setItem('lims_nota2_presets', JSON.stringify(nota2Presets));
    } catch {}
  }, [nota2Presets]);

  const [printLocation, setPrintLocation] = useState<string>('L\'Aquila');
  const [printDate, setPrintDate] = useState<string>(() => {
    // Return today in YYYY-MM-DD
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  });
  const [ruoloTecnicoEsteso, setRuoloTecnicoEsteso] = useState<string>('Dott. Chim. V.ce Responsabile / Responsabile Tecnico');

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
      localStorage.setItem('lims_custom_nota_2', customNota2);
    } catch {}
  }, [customNota2]);

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
  const [preventivoId, setPreventivoId] = useState('');
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

  // Mappa delle password degli operatori del laboratorio (dinamica o fallback)
  const OPERATOR_PASSWORDS: Record<string, string> = {};
  if (operators && operators.length > 0) {
    operators.forEach(op => {
      OPERATOR_PASSWORDS[op.nome] = op.password;
    });
  } else {
    OPERATOR_PASSWORDS['Dott. Chim. F. Lupo'] = 'lupo123';
    OPERATOR_PASSWORDS['Dott.ssa S. Bianchi'] = 'bianchi123';
    OPERATOR_PASSWORDS['Dott. R. Vitale'] = 'vitale123';
  }
  OPERATOR_PASSWORDS['Altro'] = 'lims123';

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
  const [qualitaConsegnante, setQualitaConsegnante] = useState<'titolare' | 'corriere' | 'altro'>('titolare');
  const [tempAccettazioneConforme, setTempAccettazioneConforme] = useState<'si' | 'no' | 'N/A'>('si');
  const [tempTrasportoConforme, setTempTrasportoConforme] = useState<'si' | 'no' | 'N/A'>('si');
  const [tempConservazioneConforme, setTempConservazioneConforme] = useState<'si' | 'no' | 'N/A'>('si');

  // Calcolo automatico della data di consegna risultati in base al preventivo e tempi prove
  useEffect(() => {
    const refDate = dataAccettazione ? new Date(dataAccettazione) : new Date();
    if (isNaN(refDate.getTime())) return;

    if (!preventivoId) {
      // Di default +7 giorni se nessun preventivo è selezionato
      refDate.setDate(refDate.getDate() + 7);
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
  }, [preventivoId, dataAccettazione, preventivi, prove, pacchetti]);

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

  const addImballaggio = (newVal: string) => {
    const val = newVal.trim();
    if (val && !archivioImballaggi.includes(val)) {
      const nextList = [...archivioImballaggi, val];
      setArchivioImballaggi(nextList);
      localStorage.setItem('archivio_imballaggi', JSON.stringify(nextList));
    }
  };

  const addCampionatoDa = (newVal: string) => {
    const val = newVal.trim();
    if (val && !archivioCampionatoDa.includes(val)) {
      const nextList = [...archivioCampionatoDa, val];
      setArchivioCampionatoDa(nextList);
      localStorage.setItem('archivio_campionato_da', JSON.stringify(nextList));
    }
  };

  const addProceduraCampionamento = (newVal: string) => {
    const val = newVal.trim();
    if (val && !archivioProcedureCampionamento.includes(val)) {
      const nextList = [...archivioProcedureCampionamento, val];
      setArchivioProcedureCampionamento(nextList);
      localStorage.setItem('archivio_procedure_campionamento', JSON.stringify(nextList));
    }
  };

  const [showNewImballaggioInput, setShowNewImballaggioInput] = useState(false);
  const [newImballaggioValue, setNewImballaggioValue] = useState('');

  const [showNewCampionatoDaInput, setShowNewCampionatoDaInput] = useState(false);
  const [newCampionatoDaValue, setNewCampionatoDaValue] = useState('');

  const [showNewProceduraCampionamentoInput, setShowNewProceduraCampionamentoInput] = useState(false);
  const [newProceduraCampionamentoValue, setNewProceduraCampionamentoValue] = useState('');

  const handleSaveNewImballaggio = () => {
    const val = newImballaggioValue.trim();
    if (val) {
      addImballaggio(val);
      setImballaggio(val);
    }
    setShowNewImballaggioInput(false);
    setNewImballaggioValue('');
  };

  const handleSaveNewCampionatoDa = () => {
    const val = newCampionatoDaValue.trim();
    if (val) {
      addCampionatoDa(val);
      setCampionatoDa(val);
    }
    setShowNewCampionatoDaInput(false);
    setNewCampionatoDaValue('');
  };

  const handleSaveNewProceduraCampionamento = () => {
    const val = newProceduraCampionamentoValue.trim();
    if (val) {
      addProceduraCampionamento(val);
      setProceduraCampionamento(val);
    }
    setShowNewProceduraCampionamentoInput(false);
    setNewProceduraCampionamentoValue('');
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

  // Calcola il prossimo codice accettazione suggerito
  const generateSuggestedCode = () => {
    const currentYear = new Date().getFullYear();
    const prefix = `ACC-${currentYear}-`;
    const siblingCodes = accettazioni
      .filter(a => a.codiceAccettazione.startsWith(prefix))
      .map(a => {
        const parts = a.codiceAccettazione.split('-');
        return parseInt(parts[parts.length - 1]) || 0;
      });
    const maxNum = siblingCodes.length > 0 ? Math.max(...siblingCodes) : 0;
    const nextNum = maxNum + 1;
    return `${prefix}${nextNum.toString().padStart(4, '0')}`;
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
    setPreventivoId('');
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
    setQualitaConsegnante('titolare');
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
    setDescrizione(acc.descrizioneCampione);
    setQuantita(acc.quantitaCampione);
    setTemperatura(acc.temperaturaArrivo || '');
    setStatoInArrivo(acc.statoInArrivo);
    setIntestatarioId(acc.intestatarioRapportoClienteId);
    setDestinatarioFatturaId(acc.destinatarioFatturaClienteId);
    setCopiaFattura(acc.intestatarioRapportoClienteId === acc.destinatarioFatturaClienteId);
    setPreventivoId(acc.preventivoAssociatoId || '');
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
    setQualitaConsegnante(acc.qualitaConsegnante || 'titolare');
    setTempAccettazioneConforme(acc.tempAccettazioneConforme || 'si');
    setTempTrasportoConforme(acc.tempTrasportoConforme || 'si');
    setTempConservazioneConforme(acc.tempConservazioneConforme || 'si');

    if (categorieMerceologicheDisponibili.includes(acc.matrice)) {
      setMatrice(acc.matrice);
      setCustomMatrice('');
    } else {
      setMatrice(acc.matrice || categorieMerceologicheDisponibili[0] || 'Oli e Grassi');
      setCustomMatrice(acc.matrice || '');
    }

    setShowForm(true);
  };

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
    // Auto-seleziona l'ultimo preventivo registrato per quel cliente pagatore se esiste
    const clientPrev = preventivi.filter(p => p.clienteId === id && p.stato === 'Approvato');
    if (clientPrev.length > 0) {
      setPreventivoId(clientPrev[clientPrev.length - 1].id);
    } else {
      setPreventivoId('');
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
    const finalBillId = destinatarioFatturaId;
    const finalIntestatarioId = copiaFattura ? destinatarioFatturaId : intestatarioId;

    if (!descrizione.trim() || !finalIntestatarioId || !finalBillId) {
      setFormError("Compila tutti i campi obbligatori della scheda d'accettazione (inclusi Cliente Intestatario e Pagatore).");
      return;
    }

    if (!preventivoId) {
      setFormError("Errore di coerenza: Non è consentito registrare l'accettazione di un campione senza selezionare un preventivo/offerta di riferimento.");
      return;
    }

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

      const updated: AccettazioneCampione = {
        ...editingAcc,
        dataAccettazione: dataAccettazione || editingAcc.dataAccettazione,
        descrizioneCampione: descrizione.trim(),
        matrice: finalMatrice || 'Generale',
        quantitaCampione: quantita.trim() || 'N.D.',
        temperaturaArrivo: temperatura.trim() || undefined,
        statoInArrivo: statoInArrivo,
        intestatarioRapportoClienteId: finalIntestatarioId,
        destinatarioFatturaClienteId: finalBillId,
        preventivoAssociatoId: preventivoId || undefined,
        consegnaPrevista: consegna || undefined,
        noteLab: note.trim() || undefined,
        analisiStato: statoAnalisi,
        operatorRegistrazione: operator.trim(),
        operatorRegistrazioneRuolo: operatorRuolo.trim(),
        statoHistory: history,
        
        // Nuovi campi LIMS (Accettazione)
        categoriaMerceologica: finalMatrice,
        informazioniCliente: informazioniCliente.trim(),
        destinatarioFinale: getClientDenominazione(finalIntestatarioId),
        etichettaCampione: etichettaCampione.trim(),
        imballaggio: imballaggio.trim(),
        campionatoDa: campionatoDa.trim(),
        proceduraCampionamento: proceduraCampionamento.trim(),
        oraRicevimento: oraRicevimento.trim(),
        dataInizioProva: dataAccettazione || new Date().toISOString().split('T')[0],
        dataTermineProva: consegna || undefined,
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
    } else {
      const firstRepar = (operators || []).find(o => 
        o.attivo !== false && 
        o.autorizzatoFirma !== false && 
        ((o.ruoloFirma || '').toLowerCase() === 'responsabile di reparto' || (o.ruolo || '').toLowerCase() === 'responsabile di reparto')
      )?.nome;

      const secondRepar = (operators || []).find(o => 
        o.attivo !== false && 
        o.autorizzatoFirma !== false && 
        ((o.ruoloFirma || '').toLowerCase() === 'responsabile di reparto' || (o.ruolo || '').toLowerCase() === 'responsabile di reparto') && 
        o.nome !== firstRepar
      )?.nome;

      const techSign = (operators || []).find(o => 
        o.attivo !== false && 
        o.autorizzatoFirma !== false && 
        ((o.ruoloFirma || '').toLowerCase().includes('tecnico') || (o.ruolo || '').toLowerCase().includes('tecnico'))
      );

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

      const newAcc: AccettazioneCampione = {
        id: 'acc_' + Date.now(),
        codiceAccettazione: generateSuggestedCode(),
        dataAccettazione: dataAccettazione || new Date().toISOString().split('T')[0],
        descrizioneCampione: descrizione.trim(),
        matrice: finalMatrice || 'Generale',
        quantitaCampione: quantita.trim() || 'N.D.',
        temperaturaArrivo: temperatura.trim() || undefined,
        statoInArrivo: statoInArrivo,
        intestatarioRapportoClienteId: finalIntestatarioId,
        destinatarioFatturaClienteId: finalBillId,
        preventivoAssociatoId: preventivoId || undefined,
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
        destinatarioFinale: getClientDenominazione(finalIntestatarioId),
        etichettaCampione: etichettaCampione.trim(),
        imballaggio: imballaggio.trim(),
        campionatoDa: campionatoDa.trim(),
        proceduraCampionamento: proceduraCampionamento.trim(),
        oraRicevimento: oraRicevimento.trim(),
        dataInizioProva: dataAccettazione || new Date().toISOString().split('T')[0],
        dataTermineProva: consegna || undefined,
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

  // Filtra i campioni inseriti
  const filteredAccettazioni = accettazioni.filter(acc => {
    // 1) Cerca per codice accettazione, descrizione campione o note
    const query = searchTerm.toLowerCase();
    const matchSearch = 
      acc.codiceAccettazione.toLowerCase().includes(query) ||
      acc.descrizioneCampione.toLowerCase().includes(query) ||
      (acc.noteLab && acc.noteLab.toLowerCase().includes(query));

    // 2) Filtra per Matrice
    const matchMatrice = selectedMatrice === 'Tutte' || acc.matrice === selectedMatrice;

    return matchSearch && matchMatrice;
  });

  const getClientDenominazione = (id: string) => {
    const c = clients.find(cl => cl.id === id);
    return c ? c.denominazione : 'Cliente Sconosciuto';
  };

  const getClientEmail = (id: string) => {
    const c = clients.find(cl => cl.id === id);
    return c ? c.email : '';
  };

  // Metodi di supporto per Risultati Prove (Emissione Rapporto Prova)
  const getResolvedProveForAccettazione = (acc: AccettazioneCampione) => {
    if (!acc.preventivoAssociatoId) return [];
    const assocPrev = preventivi.find(p => p.id === acc.preventivoAssociatoId);
    if (!assocPrev) return [];
    
    const resolved: Prova[] = [];
    const addedIds = new Set<string>();

    // 1) Prove individuali
    assocPrev.proveSelezionate?.forEach(item => {
      if (!addedIds.has(item.provaId)) {
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
            const p = prove.find(x => x.id === pid);
            if (p) {
              resolved.push(p);
              addedIds.add(pid);
            }
          }
        });
      }
    });

    return resolved;
  };

  const handleStartEditResults = (acc: AccettazioneCampione) => {
    const resolved = getResolvedProveForAccettazione(acc);
    const initialTemp: Record<string, Partial<RisultatoProva>> = {};
    const assocPrev = preventivi.find(prev => prev.id === acc.preventivoAssociatoId);
    
    resolved.forEach(p => {
      const existing = acc.risultatiAnalisi?.find(r => r.provaId === p.id);
      
      // Auto-predisposizione dell'unità di misura in base al tipo di prova per comodità dell'analista
      let defaultUm = 'g/100g';
      if (p.nome.toLowerCase().includes('perossid')) defaultUm = 'meq O2/kg';
      else if (p.nome.toLowerCase().includes('acidit')) defaultUm = '% acic. oleico';
      else if (p.nome.toLowerCase().includes('ph')) defaultUm = 'u pH';
      else if (p.nome.toLowerCase().includes('densit')) defaultUm = 'g/cm³';
      else if (p.nome.toLowerCase().includes('escherichia') || p.nome.toLowerCase().includes('carica b')) defaultUm = 'UFC/g';
      else if (p.nome.toLowerCase().includes('metalli') || p.nome.toLowerCase().includes('piombo') || p.nome.toLowerCase().includes('rame')) defaultUm = 'mg/kg';
      else if (p.nome.toLowerCase().includes('umidit')) defaultUm = '%';

      const prevProvaItem = assocPrev?.proveSelezionate?.find(item => item.provaId === p.id);
      const defaultLimitiValue = existing?.limitiSelezionati || prevProvaItem?.limitiSelezionati || [];

      initialTemp[p.id] = {
        provaId: p.id,
        valoreRilevato: existing?.valoreRilevato || '',
        incertezza: existing?.escludiIncertezza ? 'N/D' : (existing?.incertezza || '± 0.01'),
        ripetibilita: existing?.ripetibilita || '',
        incertezzaPercentuale: existing?.escludiIncertezza ? '' : (existing?.incertezzaPercentuale || ''),
        escludiIncertezza: existing?.escludiIncertezza || false,
        unitaMisura: existing?.unitaMisura || defaultUm,
        conforme: existing?.conforme || 'Conforme',
        operatore: existing?.operatore || acc.operatorRegistrazione || 'Dott. Chim. F. Lupo',
        dataAnalisi: existing?.dataAnalisi || new Date().toISOString().split('T')[0],
        limitiSelezionati: defaultLimitiValue,
        quadernoCalcolo: existing?.quadernoCalcolo
      };
    });
    
    setTempRisultati(initialTemp);
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
        operatore: acc.operatorRegistrazione || 'Dott. Chim. F. Lupo',
        dataAnalisi: new Date().toISOString().split('T')[0],
        limitiSelezionati: defaultLimitiValue
      };
    });
    
    setTempRisultati(sampleValues);
  };

  const handleSaveResults = (acc: AccettazioneCampione) => {
    const resultsArray: RisultatoProva[] = (Object.values(tempRisultati) as Partial<RisultatoProva>[]).map(r => {
      const p = prove.find(x => x.id === r.provaId);
      const originalVal = r.valoreRilevato || 'N/D';
      const formattedVal = p ? checkIfValueBelowLOQ(originalVal, p.limiteQuantificazione) : originalVal;

      return {
        provaId: r.provaId!,
        valoreRilevato: formattedVal,
        incertezza: r.escludiIncertezza ? 'N/D' : (r.incertezza || 'N/D'),
        ripetibilita: r.ripetibilita || 'N/D',
        incertezzaPercentuale: r.escludiIncertezza ? '' : (r.incertezzaPercentuale || ''),
        escludiIncertezza: r.escludiIncertezza || false,
        unitaMisura: r.unitaMisura || 'mg/kg',
        conforme: r.conforme || 'Conforme',
        operatore: r.operatore || 'Dott. Chim. F. Lupo',
        dataAnalisi: r.dataAnalisi || new Date().toISOString().split('T')[0],
        limitiSelezionati: r.limitiSelezionati || [],
        quadernoCalcolo: r.quadernoCalcolo
      };
    });

    const prevStatus = acc.analisiStato;
    const history = acc.statoHistory ? [...acc.statoHistory] : [];
    
    if (prevStatus !== 'Completato') {
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
        statoNuovo: 'Completato',
        dataOra: formattedDate,
        operatore: firstOperatorName
      });
    }

    const updatedAcc: AccettazioneCampione = {
      ...acc,
      risultatiAnalisi: resultsArray,
      analisiStato: 'Completato', // Salvare i risultati imposta automaticamente lo stato a completato
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

  return (
    <div className="space-y-6">
      
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

        <button
          onClick={handleOpenAdd}
          className="w-full sm:w-auto bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-wide flex items-center justify-center gap-1.5 transition shadow-2xs hover:shadow-xs"
          id="btn-registra-accettazione"
        >
          <Plus className="h-4 w-4" /> Accetta Nuovo Campione
        </button>
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
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-3xs flex flex-col md:flex-row gap-4">
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
      </div>

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
              <h4 className="font-extrabold text-base text-slate-800 flex items-center gap-1.5">
                {editingAcc ? `Modifica Scheda Campione: ${editingAcc.codiceAccettazione}` : 'Registrazione di un Nuovo Campione / Accettazione'}
              </h4>
              <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-slate-700">
              {/* Riga 1: Descrizione e Matrice */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  </select>
                </div>
              </div>

              {/* Riga 2: Stato campione */}
              <div className="grid grid-cols-1 gap-4">
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
                <span className="text-[11px] font-black text-slate-400 tracking-wider uppercase block">Associazione Anagrafica e Amministrativa</span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cliente pagatore */}
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 flex items-center gap-1 mb-1">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                      Il Cliente (Colui che paga e a cui è fatturato) *
                    </label>
                    <span className="text-[10px] text-slate-400 block mb-1">Il committente a cui viene intestata la fattura del rapporto</span>
                    <SearchableSelect<Client>
                      items={clients}
                      value={destinatarioFatturaId}
                      onChange={(val) => handleClientePagatoreChange(val)}
                      getDisplayValue={(c) => `${c.denominazione} (P.Iva: ${c.partitaIva})`}
                      getSearchText={(c) => `${c.denominazione} ${c.partitaIva}`}
                      getItemId={(c) => c.id}
                      placeholder="Digita per cercare il cliente pagatore..."
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
                        Coincide con il Cliente pagatore
                      </label>
                    </div>
                    <span className="text-[10px] text-slate-400 block mb-1">Ente a cui è intestata la conformità nel certificato</span>
                    <SearchableSelect<Client>
                      items={clients}
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

                {/* Preventivo / Quotazione Associato */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 flex items-center gap-1 mb-1">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-amber-500" />
                    Preventivo o Offerta Associata al Campione (*)
                  </label>
                  <span className="text-[10px] text-slate-400 block mb-1">Il collegamento è obbligatorio: i campioni accettati verranno registrati e trasmessi automaticamente a Fatturazione.</span>
                  <SearchableSelect<Preventivo>
                    items={preventivi.filter(p => !destinatarioFatturaId || p.clienteId === destinatarioFatturaId || p.clienteId === intestatarioId)}
                    value={preventivoId}
                    onChange={(val) => setPreventivoId(val)}
                    getDisplayValue={(p) => {
                      const clientName = clients.find(cl => cl.id === p.clienteId)?.denominazione || 'Sconosciuto';
                      return `${p.codice} • Totale: €${p.totale} • Stato: ${p.stato} (${clientName})`;
                    }}
                    getSearchText={(p) => {
                      const clientName = clients.find(cl => cl.id === p.clienteId)?.denominazione || 'Sconosciuto';
                      return `${p.codice} ${p.totale} ${clientName}`;
                    }}
                    getItemId={(p) => p.id}
                    placeholder="Digita per cercare il preventivo, offerta o cliente..."
                    required
                  />

                  {/* Avviso di Allerta / Blocco & Informazioni di Tracciabilità */}
                  <div className={`mt-2.5 p-3 rounded-xl border text-[11px] leading-relaxed transition-all ${
                    !preventivoId 
                      ? 'bg-rose-50 border-rose-200 text-rose-800' 
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}>
                    <div className="flex gap-2 items-start">
                      <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${!preventivoId ? 'text-rose-650' : 'text-emerald-700'}`} />
                      <div>
                        <p className="font-extrabold uppercase text-[9.5px] tracking-wider">
                          {!preventivoId ? "⚠️ BLOCCO ACCETTAZIONE CAMPIO-LIMS" : "✅ COERENZA FLUSSO ACCETTAZIONE"}
                        </p>
                        <p className="font-semibold text-[10.5px]">
                          {!preventivoId 
                            ? "Non è consentito salvare il campione senza legare un preventivo. L'inserimento è bloccato." 
                            : "Preventivo correttamente collegato. All'atto del salvataggio, la scheda campione verrà inviata direttamente al modulo Fatturazione per €" + (preventivi.find(p => p.id === preventivoId)?.totale || 0) + "."}
                        </p>
                        <p className="text-[10px] mt-1 text-slate-550 leading-relaxed font-normal">
                          💡 <strong>Multiuso Preventivo:</strong> Puoi associare lo stesso identico preventivo a più campioni differenti consegnati dallo stesso cliente (es. tamponi multipli consecutivi addebitati sullo stesso accordo).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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
                      {showNewCampionatoDaInput ? (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="Nuovo campionatore..."
                            value={newCampionatoDaValue}
                            onChange={(e) => setNewCampionatoDaValue(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-indigo-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveNewCampionatoDa();
                              }
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleSaveNewCampionatoDa}
                            className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition"
                          >
                            Salva
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowNewCampionatoDaInput(false); setNewCampionatoDaValue(''); }}
                            className="px-2.5 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition"
                          >
                            Annulla
                          </button>
                        </div>
                      ) : (
                        <select
                          value={campionatoDa}
                          onChange={(e) => {
                            if (e.target.value === '__add_new__') {
                              setShowNewCampionatoDaInput(true);
                            } else {
                              setCampionatoDa(e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                        >
                          <option value="">Seleziona campionatore...</option>
                          {archivioCampionatoDa.map(item => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                          {campionatoDa && !archivioCampionatoDa.includes(campionatoDa) && (
                            <option value={campionatoDa}>{campionatoDa}</option>
                          )}
                          <option value="__add_new__" className="text-indigo-600 font-bold bg-indigo-50">+ Aggiungi nuova voce...</option>
                        </select>
                      )}
                    </div>

                    {/* Metodo / Procedura di Campionamento */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Metodo/Procedura di Campionamento
                      </label>
                      {showNewProceduraCampionamentoInput ? (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="Nuova procedura..."
                            value={newProceduraCampionamentoValue}
                            onChange={(e) => setNewProceduraCampionamentoValue(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-indigo-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveNewProceduraCampionamento();
                              }
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleSaveNewProceduraCampionamento}
                            className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition"
                          >
                            Salva
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowNewProceduraCampionamentoInput(false); setNewProceduraCampionamentoValue(''); }}
                            className="px-2.5 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition"
                          >
                            Annulla
                          </button>
                        </div>
                      ) : (
                        <select
                          value={proceduraCampionamento}
                          onChange={(e) => {
                            if (e.target.value === '__add_new__') {
                              setShowNewProceduraCampionamentoInput(true);
                            } else {
                              setProceduraCampionamento(e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                        >
                          <option value="">Seleziona procedura...</option>
                          {archivioProcedureCampionamento.map(item => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                          {proceduraCampionamento && !archivioProcedureCampionamento.includes(proceduraCampionamento) && (
                            <option value={proceduraCampionamento}>{proceduraCampionamento}</option>
                          )}
                          <option value="__add_new__" className="text-indigo-600 font-bold bg-indigo-50">+ Aggiungi nuova voce...</option>
                        </select>
                      )}
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
                      <select
                        value={qualitaConsegnante}
                        onChange={(e) => setQualitaConsegnante(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800"
                      >
                        <option value="titolare">👤 Titolare / Delegato</option>
                        <option value="corriere">🚚 Corriere / Spedizioniere</option>
                        <option value="altro">❓ Altro soggetto</option>
                      </select>
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
                      <input
                        type="text"
                        placeholder="es: Etichetta original del produttore"
                        value={etichettaCampione}
                        onChange={(e) => setEtichettaCampione(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                      />
                    </div>

                    {/* Imballaggio / Confezionamento */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Imballaggio / Confezionamento
                      </label>
                      {showNewImballaggioInput ? (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            placeholder="Nuovo imballaggio..."
                            value={newImballaggioValue}
                            onChange={(e) => setNewImballaggioValue(e.target.value)}
                            className="flex-1 px-3 py-1.5 border border-indigo-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveNewImballaggio();
                              }
                            }}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={handleSaveNewImballaggio}
                            className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition"
                          >
                            Salva
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowNewImballaggioInput(false); setNewImballaggioValue(''); }}
                            className="px-2.5 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition"
                          >
                            Annulla
                          </button>
                        </div>
                      ) : (
                        <select
                          value={imballaggio}
                          onChange={(e) => {
                            if (e.target.value === '__add_new__') {
                              setShowNewImballaggioInput(true);
                            } else {
                              setImballaggio(e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                        >
                          <option value="">Seleziona imballaggio...</option>
                          {archivioImballaggi.map(item => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                          {imballaggio && !archivioImballaggi.includes(imballaggio) && (
                            <option value={imballaggio}>{imballaggio}</option>
                          )}
                          <option value="__add_new__" className="text-indigo-600 font-bold bg-indigo-50">+ Aggiungi nuova voce...</option>
                        </select>
                      )}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Data Consegna Risultati Prevista
                  </label>
                  <input
                    type="date"
                    value={consegna}
                    readOnly
                    className="w-full px-3 py-2 border border-rose-200/60 rounded-lg text-xs bg-rose-50/20 text-rose-950 font-bold focus:outline-none cursor-not-allowed select-none shadow-3xs"
                  />
                  <p className="text-[10px] text-rose-700/90 font-semibold mt-1 flex items-center gap-1">
                    <span>📌</span>
                    <span>Calcolato automaticamente in base ai tempi analitici (giorni) delle prove collegate al preventivo.</span>
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
                          setOperatorRuolo(foundOp.ruolo || 'Responsabile Tecnico');
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 hover:border-slate-650 text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                    >
                      {operators && operators.length > 0 ? (
                        operators.map(op => (
                          <option key={op.nome} value={op.nome}>{op.nome}</option>
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
                      Ruolo / Qualifica nel Laboratorio (*)
                    </label>
                    <select
                      value={operatorRuolo}
                      onChange={(e) => setOperatorRuolo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 hover:border-slate-650 text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
                    >
                      <option value="Responsabile Tecnico">Responsabile Tecnico</option>
                      <option value="Responsabile di Reparto">Responsabile di Reparto</option>
                      <option value="Vice Responsabile Tecnico">Vice Responsabile Tecnico</option>
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
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 hover:border-slate-650 text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-400"
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
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow cursor-pointer"
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
            {filteredAccettazioni.length === 0 ? (
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
                {filteredAccettazioni.map(acc => {
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
                    if (acc.analisiStato === 'Completato') {
                      return { deliveryStatus: 'ok', diffDays: null, countdownText: '✓ COMPLETATO' };
                    }
                    const delDate = new Date(acc.consegnaPrevista);
                    if (isNaN(delDate.getTime())) {
                      return { deliveryStatus: 'ok', diffDays: null, countdownText: '' };
                    }
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    delDate.setHours(0,0,0,0);
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
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-md text-[10px] font-extrabold uppercase">
                              🏷️ {acc.matrice}
                            </span>
                            
                            {alertBadge}
                            
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
                              className={`px-2.5 py-0.5 border rounded-md text-[10px] font-extrabold transition hover:bg-slate-900 hover:text-white active:scale-95 cursor-pointer flex items-center gap-1.5 ${analisiBadge}`}
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

                          <div className="flex items-center gap-1.5 self-end">
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

                            {/* Espansione Dettagli */}
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : acc.id)}
                              className="p-1.5 px-2 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-[10px] font-bold cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              Redigi Rapporto & Dettagli
                            </button>
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
                                <p className="flex items-center gap-1">
                                  <Building className="h-3 w-3 text-blue-500 shrink-0" />
                                  <span>Rapporto: <strong>{getClientDenominazione(acc.intestatarioRapportoClienteId)}</strong>{getClientEmail(acc.intestatarioRapportoClienteId) ? ` (${getClientEmail(acc.intestatarioRapportoClienteId)})` : ''}</span>
                                </p>
                                <p className="flex items-center gap-1">
                                  <CreditCard className="h-3 w-3 text-emerald-500 shrink-0" />
                                  <span>Fattura a: <strong>{getClientDenominazione(acc.destinatarioFatturaClienteId)}</strong></span>
                                </p>
                              </div>
                            </div>

                            <div className="bg-white p-3 rounded-lg border border-slate-150 shadow-3xs space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Riferimento Preventivo</span>
                              {assocPrev ? (
                                <div className="text-slate-600 font-mono space-y-0.5">
                                  <p>
                                    Codice: <strong className="text-slate-800">{assocPrev.codice}</strong>
                                  </p>
                                  <p>Data: {assocPrev.dataCreazione}</p>
                                  <p>Totale: <strong className="text-slate-800">€{assocPrev.totale.toFixed(2)}</strong></p>
                                </div>
                              ) : (
                                <p className="text-slate-400 italic leading-snug">Nessun preventivo formalmente associato inserito nel record di accettazione.</p>
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
                                  {/* TABELLA O COMPILATORE INLINE */}
                                  <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-3xs">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="bg-slate-50 text-slate-450 uppercase text-[9px] font-black tracking-wider border-b border-slate-200">
                                          <th className="p-3">Analisi / Metodo</th>
                                          <th className="p-3 w-32">Risultato</th>
                                          <th className="p-3 w-32">Incertezza</th>
                                          <th className="p-3 w-32">Incertezza (%)</th>
                                          <th className="p-3 w-36">Unità di misura</th>
                                          <th className="p-3 w-28">Data</th>
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
                                                    {p.nome}
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
                                                  </div>
                                                </td>
                                                <td className="p-2">
                                                  <div className="flex gap-1 items-center">
                                                    <input 
                                                      type="text"
                                                      value={currentVal.valoreRilevato || ''}
                                                      onChange={(e) => {
                                                      const val = e.target.value;
                                                      setTempRisultati(prev => {
                                                        const updatedRow = { ...prev[p.id], valoreRilevato: val };
                                                        
                                                        // Calcolo automatico di incertezza assoluta e percentuale (Correzione Richiesta Utente)
                                                        if (updatedRow.escludiIncertezza) {
                                                          updatedRow.incertezza = 'N/D';
                                                          updatedRow.incertezzaPercentuale = '';
                                                        } else if (p.puntiIncertezza && p.puntiIncertezza.length > 0) {
                                                          const automatedResult = calculateAutomatedUncertainty(val, p.puntiIncertezza);
                                                          if (automatedResult) {
                                                            updatedRow.incertezza = automatedResult.incertezza;
                                                            updatedRow.incertezzaPercentuale = automatedResult.incertezzaPercentuale;
                                                          } else {
                                                            updatedRow.incertezza = 'N/D';
                                                            updatedRow.incertezzaPercentuale = '';
                                                          }
                                                        } else if (updatedRow.incertezza && updatedRow.incertezza !== 'N/D') {
                                                          // Se c'è già un'incertezza assoluta, aggiorniamo la incertezzaPercentuale
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
                                                              const valueDecimals = fraction.length;
                                                              const precision = Math.max(valueDecimals, 2);
                                                              updatedRow.incertezzaPercentuale = `${pct.toFixed(precision)}%`;
                                                            }
                                                          }
                                                        } else if (updatedRow.incertezzaPercentuale) {
                                                          // Fallback se è presente solo una percentuale inserita manualmente
                                                          const cleaned = val.replace(',', '.');
                                                          const numericMatch = cleaned.match(/[-+]?[0-9]*\.?[0-9]+/);
                                                          const pctFloat = parseFloat(updatedRow.incertezzaPercentuale.replace('%', '').trim());
                                                          if (numericMatch && !isNaN(pctFloat)) {
                                                            const value = parseFloat(numericMatch[0]);
                                                            const expanded = value * (pctFloat / 100);
                                                            const fraction = numericMatch[0].split('.')[1] || '';
                                                            const valueDecimals = fraction.length;
                                                            const precision = Math.max(valueDecimals, 2);
                                                            updatedRow.incertezza = `± ${expanded.toFixed(precision)}`;
                                                          }
                                                        }
                                                        
                                                        return {
                                                          ...prev,
                                                          [p.id]: updatedRow
                                                        };
                                                      });
                                                    }}
                                                    placeholder="es: 0.18, Assente"
                                                    onBlur={(e) => {
                                                      const finalVal = checkIfValueBelowLOQ(e.target.value, p.limiteQuantificazione);
                                                      if (finalVal !== e.target.value) {
                                                        setTempRisultati(prev => {
                                                          const updatedRow = { ...prev[p.id], valoreRilevato: finalVal };
                                                          
                                                          if (updatedRow.escludiIncertezza) {
                                                            updatedRow.incertezza = 'N/D';
                                                            updatedRow.incertezzaPercentuale = '';
                                                          } else if (p.puntiIncertezza && p.puntiIncertezza.length > 0) {
                                                            const automatedResult = calculateAutomatedUncertainty(finalVal, p.puntiIncertezza);
                                                            if (automatedResult) {
                                                              updatedRow.incertezza = automatedResult.incertezza;
                                                              updatedRow.incertezzaPercentuale = automatedResult.incertezzaPercentuale;
                                                            } else {
                                                              updatedRow.incertezza = 'N/D';
                                                              updatedRow.incertezzaPercentuale = '';
                                                            }
                                                          } else if (updatedRow.incertezza && updatedRow.incertezza !== 'N/D') {
                                                            // Se c'è già un'incertezza assoluta, aggiorniamo la incertezzaPercentuale
                                                            const cleanedVal = finalVal.replace(',', '.');
                                                            const valMatch = cleanedVal.match(/[-+]?[0-9]*\.?[0-9]+/);
                                                            const cleanedInc = updatedRow.incertezza.replace('±', '').trim().replace(',', '.');
                                                            const incMatch = cleanedInc.match(/[-+]?[0-9]*\.?[0-9]+/);
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
                                                          }
                                                          
                                                          return {
                                                            ...prev,
                                                            [p.id]: updatedRow
                                                          };
                                                        });
                                                      }
                                                    }}
                                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-850"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() => setOpenQuadernoRowId(openQuadernoRowId === p.id ? null : p.id)}
                                                    className={`px-1.5 py-1.5 rounded-lg border flex items-center justify-center transition cursor-pointer shrink-0 ${
                                                      openQuadernoRowId === p.id 
                                                        ? 'bg-indigo-650 border-indigo-650 text-white shadow-3xs' 
                                                        : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-250 text-emerald-850 shadow-3xs'
                                                    }`}
                                                    title="📒 Quaderno di Laboratorio: imposta formule e variabili di calcolo"
                                                  >
                                                    <BookOpen className="h-3.5 w-3.5" />
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
                                                          return {
                                                            ...prev,
                                                            [p.id]: updatedRow
                                                          };
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
                                                <td className="p-2">
                                                  <input 
                                                    type="date"
                                                    value={currentVal.dataAnalisi || ''}
                                                    onChange={(e) => setTempRisultati(prev => ({
                                                      ...prev,
                                                      [p.id]: { ...prev[p.id], dataAnalisi: e.target.value }
                                                    }))}
                                                    className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-xs font-mono text-slate-650 focus:outline-none focus:ring-1 focus:ring-slate-850"
                                                  />
                                                </td>
                                              </tr>

                                              {/* Sub-row per il Quaderno di Laboratorio - Calcolo Formule e Variabili */}
                                              {openQuadernoRowId === p.id && (() => {
                                                const quad = currentVal.quadernoCalcolo || { formula: '', variabili: [] };
                                                const variables = quad.variabili || [];
                                                const formula = quad.formula || '';
                                                const evalResult = evaluateFormula(formula, variables);
                                                
                                                return (
                                                  <tr className="bg-slate-55 border-b border-indigo-100/50">
                                                    <td colSpan={6} className="px-3 pb-3 pt-1">
                                                      <div className="bg-indigo-50/20 rounded-xl border border-indigo-200/80 p-4 shadow-3xs max-w-4xl space-y-3.5 text-left">
                                                      <div className="flex items-center justify-between pb-1.5 border-b border-indigo-100/60">
                                                        <div className="flex items-center gap-2">
                                                          <span className="p-1 px-1.5 bg-indigo-100 text-indigo-700 rounded-md">
                                                            <BookOpen className="h-4 w-4" />
                                                          </span>
                                                          <div>
                                                            <span className="font-extrabold text-[#1e293b] text-xs uppercase tracking-wide">
                                                              📒 Quaderno di Laboratorio LIMS • Registro Calcoli Chimici
                                                            </span>
                                                            <p className="text-[10px] text-slate-400">
                                                              Imposta variabili e formule matematiche per calcolare il valore rilevato per la determinazione di: <strong className="text-slate-700">{p.nome}</strong>
                                                            </p>
                                                          </div>
                                                        </div>
                                                        <button 
                                                          type="button"
                                                          onClick={() => setOpenQuadernoRowId(null)}
                                                          className="text-slate-400 hover:text-slate-655 p-1 cursor-pointer hover:bg-slate-100 rounded-lg transition animate-none"
                                                        >
                                                          <X className="h-3.5 w-3.5" />
                                                        </button>
                                                      </div>

                                                      {/* Preset Selections */}
                                                      <div id={`preset-section-${p.id}`} className="space-y-3 bg-white p-3.5 rounded-xl border border-indigo-150 shadow-3xs">
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1 border-b border-indigo-50">
                                                          <span className="text-[10px] font-black text-slate-805 uppercase tracking-wider flex items-center gap-1.5">
                                                            🧬 Modelli di Calcolo Predefiniti & Personalizzabili del Laboratorio
                                                          </span>
                                                          <div className="flex items-center gap-2">
                                                            {/* Bottone per mostrare form di creazione */}
                                                            <button
                                                              type="button"
                                                              onClick={() => {
                                                                setNewModelName('');
                                                                setNewModelDesc('');
                                                                setShowSaveModelFormId(showSaveModelFormId === p.id ? null : p.id);
                                                              }}
                                                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded text-[10px] font-extrabold text-indigo-900 transition flex items-center gap-1 cursor-pointer"
                                                            >
                                                              <Plus className="h-3 w-3" /> Crea Nuovo Modello
                                                            </button>

                                                            {/* Bottone Importatore JSON */}
                                                            <input 
                                                              type="file"
                                                              id={`import-presets-file-${p.id}`}
                                                              accept=".json"
                                                              onChange={handleImportJSON}
                                                              className="hidden"
                                                            />
                                                            <button
                                                              type="button"
                                                              onClick={() => document.getElementById(`import-presets-file-${p.id}`)?.click()}
                                                              className="px-2.5 py-1 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded text-[10px] font-extrabold text-violet-900 transition flex items-center gap-1 cursor-pointer"
                                                            >
                                                              <FileSpreadsheet className="h-3 w-3" /> Carica Modello JSON
                                                            </button>
                                                          </div>
                                                        </div>

                                                        {/* Lista dei preset */}
                                                        <div className="space-y-2">
                                                          {/* Standard Presets */}
                                                          <div>
                                                            <span className="text-[8.5px] font-bold text-slate-450 uppercase tracking-widest block mb-1">
                                                              Formule Standard LIMS:
                                                            </span>
                                                            <div className="flex flex-wrap gap-1.5">
                                                              {FORMULA_PRESETS.map((preset, prIdx) => (
                                                                <button
                                                                  type="button"
                                                                  key={prIdx}
                                                                  onClick={() => {
                                                                    setTempRisultati(prev => {
                                                                      const row = prev[p.id] || {};
                                                                      return {
                                                                        ...prev,
                                                                        [p.id]: {
                                                                          ...row,
                                                                          quadernoCalcolo: {
                                                                            formula: preset.formula,
                                                                            variabili: preset.variabili.map((v, idx) => ({
                                                                              id: 'v_' + Date.now() + '_' + idx,
                                                                              simbolo: v.simbolo,
                                                                              descrizione: v.descrizione,
                                                                              valore: v.valore
                                                                            }))
                                                                          }
                                                                        }
                                                                      };
                                                                    });
                                                                  }}
                                                                  className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-350 rounded text-[10px] font-bold text-slate-800 transition cursor-pointer"
                                                                  title={preset.descrizione}
                                                                >
                                                                  🧪 {preset.nome}
                                                                </button>
                                                              ))}
                                                            </div>
                                                          </div>

                                                          {/* Custom Presets */}
                                                          {customFormulaPresets.length > 0 && (
                                                            <div className="pt-2 border-t border-slate-100 space-y-1.5">
                                                              <div className="flex items-center justify-between">
                                                                <span className="text-[8.5px] font-bold text-violet-600 uppercase tracking-widest block">
                                                                  Modelli Caricati / Personalizzati:
                                                                </span>
                                                              </div>
                                                              <div className="flex flex-wrap gap-1.5 animate-none">
                                                                {customFormulaPresets.map((preset, prIdx) => {
                                                                  const isConfirming = confirmDeletePreset?.rowId === p.id && confirmDeletePreset?.index === prIdx;
                                                                  
                                                                  if (isConfirming) {
                                                                    return (
                                                                      <div key={prIdx} className="inline-flex items-center bg-red-50 border border-red-200 rounded px-2 py-0.5 text-[9.5px] font-extrabold text-red-900 transition gap-1.5 shadow-3xs">
                                                                        <span>Eliminare "{preset.nome}"?</span>
                                                                        <button
                                                                          type="button"
                                                                          onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            e.preventDefault();
                                                                            setCustomFormulaPresets(prev => {
                                                                              const filtered = prev.filter((_, idx) => idx !== prIdx);
                                                                              localStorage.setItem('lims_custom_formula_presets', JSON.stringify(filtered));
                                                                              return filtered;
                                                                            });
                                                                            setConfirmDeletePreset(null);
                                                                          }}
                                                                          className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[8.5px] font-black cursor-pointer transition shadow-3xs"
                                                                        >
                                                                          Sì
                                                                        </button>
                                                                        <button
                                                                          type="button"
                                                                          onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            e.preventDefault();
                                                                            setConfirmDeletePreset(null);
                                                                          }}
                                                                          className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[8.5px] font-black cursor-pointer transition"
                                                                        >
                                                                          No
                                                                        </button>
                                                                      </div>
                                                                    );
                                                                  }

                                                                  return (
                                                                    <div key={prIdx} className="inline-flex items-center bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded pl-2.5 pr-1 py-0.5 text-[10px] font-bold text-violet-900 transition gap-1 shadow-3xs">
                                                                      <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                          setTempRisultati(prev => {
                                                                            const row = prev[p.id] || {};
                                                                            return {
                                                                              ...prev,
                                                                              [p.id]: {
                                                                                ...row,
                                                                                quadernoCalcolo: {
                                                                                  formula: preset.formula,
                                                                                  variabili: preset.variabili.map((v, idx) => ({
                                                                                    id: 'v_' + Date.now() + '_' + idx,
                                                                                    simbolo: v.simbolo,
                                                                                    descrizione: v.descrizione,
                                                                                    valore: v.valore
                                                                                  }))
                                                                                }
                                                                              }
                                                                            };
                                                                          });
                                                                        }}
                                                                        className="cursor-pointer hover:underline text-left text-violet-950 font-bold"
                                                                        title={`${preset.descrizione} - Formula: ${preset.formula}`}
                                                                      >
                                                                        ✨ {preset.nome}
                                                                      </button>
                                                                      <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                          e.stopPropagation();
                                                                          e.preventDefault();
                                                                          setConfirmDeletePreset({ rowId: p.id, index: prIdx });
                                                                        }}
                                                                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-650 rounded transition shrink-0 cursor-pointer flex items-center justify-center animate-none"
                                                                        title={`Elimina definitivamente "${preset.nome}"`}
                                                                      >
                                                                        <X className="h-3 w-3" />
                                                                      </button>
                                                                    </div>
                                                                  );
                                                                })}
                                                              </div>
                                                            </div>
                                                          )}
                                                        </div>

                                                        {/* FORM DI CREAZIONE/SALVATAGGIO RAPIDO MODELLO */}
                                                        {showSaveModelFormId === p.id && (
                                                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3 text-xs mt-2 transition-all">
                                                            <div className="flex justify-between items-center pb-1 border-b border-slate-200">
                                                              <span className="font-extrabold text-slate-800 uppercase text-[10px] tracking-wide flex items-center gap-1.5">
                                                                💾 Salva la Formula Corrente come Nuovo Modello
                                                              </span>
                                                              <button 
                                                                type="button" 
                                                                onClick={() => setShowSaveModelFormId(null)}
                                                                className="text-slate-400 hover:text-slate-600"
                                                              >
                                                                <X className="h-3.5 w-3.5" />
                                                              </button>
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-1">
                                                              <div>
                                                                <label className="block text-[8.5px] font-black text-slate-450 uppercase tracking-widest mb-1">
                                                                  Nome del Modello <span className="text-red-500">*</span>
                                                                </label>
                                                                <input 
                                                                  type="text"
                                                                  value={newModelName}
                                                                  onChange={(e) => setNewModelName(e.target.value)}
                                                                  placeholder="es: Analisi Cloruri con titolatore"
                                                                  className="w-full bg-white border border-slate-250 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
                                                                />
                                                              </div>
                                                              <div>
                                                                <label className="block text-[8.5px] font-black text-slate-450 uppercase tracking-widest mb-1">
                                                                  Descrizione Breve
                                                                </label>
                                                                <input 
                                                                  type="text"
                                                                  value={newModelDesc}
                                                                  onChange={(e) => setNewModelDesc(e.target.value)}
                                                                  placeholder="es: Calcolo concentrazione con titolante"
                                                                  className="w-full bg-white border border-slate-250 rounded px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                                />
                                                              </div>
                                                            </div>
                                                            
                                                            <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-sans space-y-1.5">
                                                              <div>
                                                                <span className="text-[9px] font-bold text-indigo-950 block">Formula registrata:</span>
                                                                <code className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{formula || '(Nessuna formula impostata)'}</code>
                                                              </div>
                                                              <div>
                                                                <span className="text-[9px] font-bold text-slate-450 block">Variabili associate ({variables.length}):</span>
                                                                <div className="flex flex-wrap gap-1 mt-1 text-[10px] font-mono text-slate-600 font-semibold animate-none">
                                                                  {variables.map(v => (
                                                                    <span key={v.id} className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.2" title={v.descrizione}>
                                                                      {v.simbolo} = {v.valore}
                                                                    </span>
                                                                  ))}
                                                                  {variables.length === 0 && <span className="italic text-slate-400">Nessuna variabile definita</span>}
                                                                </div>
                                                              </div>
                                                            </div>
                                                            
                                                            <div className="flex justify-end gap-1.5 pt-1">
                                                              <button
                                                                type="button"
                                                                onClick={() => setShowSaveModelFormId(null)}
                                                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-bold text-slate-700 transition cursor-pointer"
                                                              >
                                                                Annulla
                                                              </button>
                                                              <button
                                                                type="button"
                                                                onClick={() => {
                                                                  if (!newModelName.trim()) {
                                                                    alert("Per favore, inserisci un nome per il modello.");
                                                                    return;
                                                                  }
                                                                  if (!formula.trim()) {
                                                                    alert("Impossibile salvare un modello senza formula.");
                                                                    return;
                                                                  }
                                                                  
                                                                  const newPreset: FormulaPreset = {
                                                                    nome: newModelName.trim(),
                                                                    descrizione: newModelDesc.trim() || 'Modello personalizzato utente LIMS',
                                                                    formula: formula.trim(),
                                                                    variabili: variables.map(v => ({
                                                                      simbolo: v.simbolo,
                                                                      descrizione: v.descrizione,
                                                                      valore: v.valore
                                                                    }))
                                                                  };
                                                                  
                                                                  setCustomFormulaPresets(prev => {
                                                                    const updated = [...prev, newPreset];
                                                                    localStorage.setItem('lims_custom_formula_presets', JSON.stringify(updated));
                                                                    return updated;
                                                                  });
                                                                  
                                                                  setNewModelName('');
                                                                  setNewModelDesc('');
                                                                  setShowSaveModelFormId(null);
                                                                  alert(`Modello "${newPreset.nome}" salvato con successo! È ora disponibile tra i modelli rapidi.`);
                                                                }}
                                                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-extrabold transition cursor-pointer shadow-3xs"
                                                              >
                                                                Salva Modello LIMS
                                                              </button>
                                                            </div>
                                                          </div>
                                                        )}
                                                      </div>

                                                      {/* Variables & Evaluation Section */}
                                                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
                                                            {/* Variabili */}
                                                            <div className="md:col-span-7 space-y-2">
                                                              <div className="flex items-center justify-between pb-1 font-sans">
                                                                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide">
                                                                  1. Variabili di Calcolo ({variables.length})
                                                                </span>
                                                                <button
                                                                  type="button"
                                                                  onClick={() => {
                                                                    setTempRisultati(prev => {
                                                                      const row = prev[p.id] || {};
                                                                      const currentQuad = row.quadernoCalcolo || { formula: '', variabili: [] };
                                                                      const newVar = {
                                                                        id: 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                                                                        simbolo: String.fromCharCode(65 + (currentQuad.variabili.length % 26)), // A, B, C...
                                                                        descrizione: 'Nuovo Parametro',
                                                                        valore: 1.0
                                                                      };
                                                                      return {
                                                                        ...prev,
                                                                        [p.id]: {
                                                                          ...row,
                                                                          quadernoCalcolo: {
                                                                            ...currentQuad,
                                                                            variabili: [...currentQuad.variabili, newVar]
                                                                          }
                                                                        }
                                                                      };
                                                                    });
                                                                  }}
                                                                  className="text-[9.5px] font-extrabold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-150 px-2.5 py-0.5 rounded cursor-pointer"
                                                                >
                                                                  + Nuova Variabile
                                                                </button>
                                                              </div>

                                                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                                                {variables.map((v, vIdx) => (
                                                                  <div key={v.id} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 text-xs shadow-3xs">
                                                                    {/* Simbolo */}
                                                                    <div className="w-14 shrink-0">
                                                                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Lettera</label>
                                                                      <input
                                                                        type="text"
                                                                        value={v.simbolo}
                                                                        onChange={(e) => {
                                                                          const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                                                          setTempRisultati(prev => {
                                                                            const row = prev[p.id] || {};
                                                                            const currentQuad = row.quadernoCalcolo!;
                                                                            const updatedVars = [...currentQuad.variabili];
                                                                            updatedVars[vIdx] = { ...updatedVars[vIdx], simbolo: val };
                                                                            return {
                                                                              ...prev,
                                                                              [p.id]: {
                                                                                ...row,
                                                                                quadernoCalcolo: {
                                                                                  ...currentQuad,
                                                                                  variabili: updatedVars
                                                                                }
                                                                              }
                                                                            };
                                                                          });
                                                                        }}
                                                                        className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-black text-indigo-900 text-center uppercase font-mono"
                                                                        placeholder="es: A"
                                                                        maxLength={3}
                                                                      />
                                                                    </div>

                                                                    {/* Descrizione */}
                                                                    <div className="flex-1">
                                                                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Parametro / Significato</label>
                                                                      <input
                                                                        type="text"
                                                                        value={v.descrizione}
                                                                        onChange={(e) => {
                                                                          const val = e.target.value;
                                                                          setTempRisultati(prev => {
                                                                            const row = prev[p.id] || {};
                                                                            const currentQuad = row.quadernoCalcolo!;
                                                                            const updatedVars = [...currentQuad.variabili];
                                                                            updatedVars[vIdx] = { ...updatedVars[vIdx], descrizione: val };
                                                                            return {
                                                                              ...prev,
                                                                              [p.id]: {
                                                                                ...row,
                                                                                quadernoCalcolo: {
                                                                                  ...currentQuad,
                                                                                  variabili: updatedVars
                                                                                }
                                                                              }
                                                                            };
                                                                          });
                                                                        }}
                                                                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-[11px] font-semibold text-slate-700 font-sans"
                                                                        placeholder="Descrizione (es. Peso in grammi)"
                                                                      />
                                                                    </div>

                                                                    {/* Valore */}
                                                                    <div className="w-24 shrink-0">
                                                                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Valore Misurato</label>
                                                                      <input
                                                                        type="text"
                                                                        value={v.valore}
                                                                        onChange={(e) => {
                                                                          const val = e.target.value;
                                                                          setTempRisultati(prev => {
                                                                            const row = prev[p.id] || {};
                                                                            const currentQuad = row.quadernoCalcolo!;
                                                                            const updatedVars = [...currentQuad.variabili];
                                                                            updatedVars[vIdx] = { ...updatedVars[vIdx], valore: val };
                                                                            return {
                                                                              ...prev,
                                                                              [p.id]: {
                                                                                ...row,
                                                                                quadernoCalcolo: {
                                                                                  ...currentQuad,
                                                                                  variabili: updatedVars
                                                                                }
                                                                              }
                                                                            };
                                                                          });
                                                                        }}
                                                                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-0.5 font-mono text-[11px] font-bold text-slate-850 text-right"
                                                                      />
                                                                    </div>

                                                                    {/* Elimina */}
                                                                    <button
                                                                      type="button"
                                                                      onClick={() => {
                                                                        setTempRisultati(prev => {
                                                                          const row = prev[p.id] || {};
                                                                          const currentQuad = row.quadernoCalcolo!;
                                                                          return {
                                                                            ...prev,
                                                                            [p.id]: {
                                                                              ...row,
                                                                              quadernoCalcolo: {
                                                                                ...currentQuad,
                                                                                variabili: currentQuad.variabili.filter((_, idx) => idx !== vIdx)
                                                                              }
                                                                            }
                                                                          };
                                                                        });
                                                                      }}
                                                                      className="text-slate-400 hover:text-red-650 pt-2 p-1.5 transition rounded-lg hover:bg-slate-100"
                                                                    >
                                                                      <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                  </div>
                                                                ))}

                                                                {variables.length === 0 && (
                                                                  <div className="text-center py-5 border border-dashed border-slate-200 rounded-xl text-slate-400 italic text-[11px]">
                                                                    Nessuna variabile impostata. Seleziona un modello rapido sopra o aggiungila a piacimento.
                                                                  </div>
                                                                )}
                                                              </div>
                                                            </div>

                                                            {/* Formula & Computazione */}
                                                            <div className="md:col-span-5 bg-indigo-50/10 p-3 rounded-xl border border-indigo-100 flex flex-col justify-between space-y-3.5 shadow-3xs">
                                                              <div className="space-y-1.5">
                                                                <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide block">
                                                                  2. Configura Formula
                                                                </span>
                                                                <div>
                                                                  <input
                                                                    type="text"
                                                                    value={formula}
                                                                    onChange={(e) => {
                                                                      const val = e.target.value;
                                                                      setTempRisultati(prev => {
                                                                        const row = prev[p.id] || {};
                                                                        const currentQuad = row.quadernoCalcolo || { formula: '', variabili: [] };
                                                                        return {
                                                                          ...prev,
                                                                          [p.id]: {
                                                                            ...row,
                                                                            quadernoCalcolo: {
                                                                              ...currentQuad,
                                                                              formula: val
                                                                            }
                                                                          }
                                                                        };
                                                                      });
                                                                    }}
                                                                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-855 focus:ring-1 focus:ring-indigo-550 focus:border-indigo-550 focus:outline-none"
                                                                    placeholder="es: (B - A) * 100 / C"
                                                                  />
                                                                  <span className="text-[9px] text-slate-400 leading-tight block mt-1 pb-1.5 border-b border-indigo-50/70 font-sans">
                                                                    Supporta operazioni base (+, -, *, /) e parentesi, sostituite dinamiche con i valori immessi.
                                                                  </span>
                                                                  <div className="pt-2 flex justify-end">
                                                                    <button
                                                                      type="button"
                                                                      onClick={() => {
                                                                        setNewModelName('');
                                                                        setNewModelDesc('');
                                                                        setShowSaveModelFormId(showSaveModelFormId === p.id ? null : p.id);
                                                                        
                                                                        // Attendi brevemente per l'animazione di apertura del form
                                                                        setTimeout(() => {
                                                                          document.getElementById(`preset-section-${p.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                                                        }, 80);
                                                                      }}
                                                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 border border-violet-200 hover:border-violet-350 text-violet-900 text-[10px] font-extrabold rounded-md cursor-pointer transition shadow-3xs"
                                                                      title="Salva la configurazione corrente (formula e variabili) come modello riutilizzabile"
                                                                    >
                                                                      💾 Salva modifica come Nuovo Modello
                                                                    </button>
                                                                  </div>
                                                                </div>
                                                              </div>

                                                              <div className="bg-white p-3.5 rounded-lg border border-slate-200/85 space-y-2 font-sans">
                                                                <span className="text-[9px] font-black text-slate-455 uppercase tracking-widest block">
                                                                  Risultato Calcolatore LIMS
                                                                </span>
                                                                {evalResult.error ? (
                                                                  <div className="text-[10.5px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/40">
                                                                    ⚠️ {evalResult.error}
                                                                  </div>
                                                                ) : evalResult.value !== null ? (
                                                                  <div className="flex flex-col gap-2">
                                                                    <div className="text-xl font-mono font-black text-indigo-900 leading-none">
                                                                      {evalResult.value !== 0 && Math.abs(evalResult.value) < 0.0001
                                                                        ? evalResult.value.toFixed(8).replace(/\.?0+$/, '')
                                                                        : evalResult.value.toFixed(6).replace(/\.?0+$/, '')}
                                                                      <span className="text-[10px] text-slate-500 ml-1.5 font-sans font-extrabold uppercase">
                                                                        {currentVal.unitaMisura || 'mg/kg'}
                                                                      </span>
                                                                    </div>
                                                                    <button
                                                                      type="button"
                                                                      onClick={() => {
                                                                        const formattedValue = evalResult.value! !== 0 && Math.abs(evalResult.value!) < 0.0001
                                                                          ? evalResult.value!.toFixed(8).replace(/\.?0+$/, '')
                                                                          : evalResult.value!.toFixed(6).replace(/\.?0+$/, '');
                                                                        setTempRisultati(prev => {
                                                                          const row = prev[p.id] || {};
                                                                          const updatedRow = {
                                                                            ...row,
                                                                            valoreRilevato: formattedValue
                                                                          };

                                                                          // Recalculate uncertainty using rules
                                                                          if (p.puntiIncertezza && p.puntiIncertezza.length > 0) {
                                                                            const automatedResult = calculateAutomatedUncertainty(formattedValue, p.puntiIncertezza);
                                                                            if (automatedResult) {
                                                                              updatedRow.incertezza = automatedResult.incertezza;
                                                                              updatedRow.incertezzaPercentuale = automatedResult.incertezzaPercentuale;
                                                                            }
                                                                          }
                                                                          return { ...prev, [p.id]: updatedRow };
                                                                        });
                                                                        // auto close quaderno upon applying
                                                                        setOpenQuadernoRowId(null);
                                                                      }}
                                                                      className="w-full py-2.5 text-[10.5px] font-black text-center text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition cursor-pointer tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-xs"
                                                                    >
                                                                      <Check className="h-4 w-4" /> 📤 Invia Risultato al Rapporto di Prova
                                                                    </button>
                                                                  </div>
                                                                ) : (
                                                                  <div className="text-[11px] italic text-slate-400">
                                                                    Nessuna operazione in corso. Immetti dei dati numerici.
                                                                  </div>
                                                                )}
                                                              </div>
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
                                            return (
                                              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/20">
                                                <td className="p-3">
                                                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                                                    {p.nome}
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
                                                </td>
                                                <td className="p-3 font-bold text-slate-850">
                                                  {rData ? (
                                                    <span className="text-emerald-700 font-extrabold">{rData.valoreRilevato}</span>
                                                  ) : (
                                                    <span className="text-slate-400 italic font-medium flex items-center gap-1">
                                                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping shrink-0"></span>
                                                      In attesa analitica
                                                    </span>
                                                  )}
                                                </td>
                                                <td className="p-3 font-mono text-slate-700">
                                                  {rData ? (rData.incertezza || 'N/D') : '-'}
                                                </td>
                                                <td className="p-3 font-mono text-slate-700">
                                                  {rData ? (rData.incertezzaPercentuale || 'N/D') : '-'}
                                                </td>
                                                <td className="p-3 text-slate-500 font-mono">
                                                  {rData ? rData.unitaMisura : '-'}
                                                </td>
                                                <td className="p-3 text-slate-500 font-mono text-[11px] leading-relaxed">
                                                  {rData ? rData.dataAnalisi : '-'}
                                                </td>
                                              </tr>
                                            );
                                          }
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* SEZIONE DEDICATA ALLE FIRME E RESPONSABILITÀ TECNICHE (Richiesta Utente) */}
                                  {acc.risultatiAnalisi && acc.risultatiAnalisi.length > 0 && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 space-y-4 text-left">
                                      <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
                                        <Award className="h-4 w-4 text-slate-700" />
                                        <div>
                                          <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide">✍️ Configurazione Firme e Responsabilità Tecniche</h5>
                                          <p className="text-[10px] text-slate-500">Seleziona i firmatari autorizzati che compariranno nel Rapporto di Prova finale</p>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* SELEZIONE RESPONSABILI DI REPARTO */}
                                        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-150 shadow-3xs">
                                          <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-widest">
                                            Responsabili di Reparto (Fino a 2):
                                          </label>
                                          
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
                                              {(operators || []).filter(o => 
                                                o.attivo !== false && 
                                                o.autorizzatoFirma !== false && 
                                                (o.isResponsabileReparto || (o.ruoloFirma || '').toLowerCase().includes('reparto') || (o.ruolo || '').toLowerCase() === 'responsabile di reparto')
                                              ).map(op => (
                                                <option key={op.nome} value={op.nome}>{op.nome}</option>
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
                                              {(operators || []).filter(o => 
                                                o.attivo !== false && 
                                                o.autorizzatoFirma !== false && 
                                                (o.isResponsabileReparto || (o.ruoloFirma || '').toLowerCase().includes('reparto') || (o.ruolo || '').toLowerCase() === 'responsabile di reparto')
                                              ).map(op => {
                                                if (op.nome === acc.firmatarioReparto1) return null;
                                                return <option key={op.nome} value={op.nome}>{op.nome}</option>;
                                              })}
                                            </select>
                                          </div>
                                        </div>

                                        {/* SELEZIONE RESPONSABILE TECNICO O VICE */}
                                        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-150 shadow-3xs text-left">
                                          <div className="space-y-2">
                                            <label className="block text-[10px] font-extrabold text-[#475569] uppercase tracking-widest">
                                              Responsabilità Tecnica (*):
                                            </label>
                                            <p className="text-[9.5px] text-slate-450 leading-relaxed font-medium">
                                              Seleziona la persona preposta e la specifica qualifica con cui firmerà il Rapporto di Prova.
                                            </p>
                                          </div>

                                          <div className="space-y-1">
                                            <span className="text-[9px] text-[#475569] font-bold block">Persona Preposta (*)</span>
                                            <select
                                              value={acc.firmatarioTecnico || ''}
                                              onChange={(e) => {
                                                const name = e.target.value;
                                                const op = (operators || []).find(o => o.nome === name);
                                                // Assegna il ruolo predefinita dell'operatore se presente, altrimenti fall back a Responsabile di Reparto
                                                const role = (op?.ruoloFirma ? op.ruoloFirma : 'Responsabile di Reparto') as any;
                                                onUpdateAccettazione({
                                                  ...acc,
                                                  firmatarioTecnico: name || undefined,
                                                  ruoloFirmatarioTecnico: role
                                                });
                                              }}
                                              className="w-full bg-slate-50 border border-slate-205 focus:bg-white focus:ring-1 focus:ring-indigo-550 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                                            >
                                              <option value="">-- Seleziona Operatore Autorizzato --</option>
                                              {(operators || []).filter(o => o.attivo !== false && o.autorizzatoFirma !== false).map(op => (
                                                <option key={op.nome} value={op.nome}>{op.nome} ({op.ruolo || op.ruoloFirma || 'Operatore'})</option>
                                              ))}
                                            </select>
                                          </div>

                                          <div className="space-y-1">
                                            <span className="text-[9px] text-[#475569] font-bold block">Ruolo Stampato nel Rapporto (*)</span>
                                            <select
                                              value={acc.ruoloFirmatarioTecnico || 'V.ce Responsabile Tecnico'}
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
                                                  return ['Responsabile di Reparto', 'V.ce Responsabile Tecnico'];
                                                })();
                                                const roleOptions = [...signatureQuals];
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
                                    </div>
                                  )}

                                  {/* SEZIONE DEDICATA ALLE NOTE/AVVERTENZE DEL RAPPORTO */}
                                  {acc.risultatiAnalisi && acc.risultatiAnalisi.length > 0 && (() => {
                                    const currentNota1Val = acc.nota1 !== undefined ? acc.nota1 : customNota1;
                                    const currentNota2Val = acc.nota2 !== undefined ? acc.nota2 : customNota2;
                                    const currentDichiarazioneVal = acc.dichiarazioneConformita || '';
                                    const currentOpinioniVal = acc.opinioniInterpretazioni || '';
                                    const availableOpinions = (opinioniDizionario[selectedNota2Category] || []).filter(o => o.tipo === selectedNota2Type);

                                    return (
                                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mt-4 space-y-6 text-left animate-fadeIn">
                                        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                                          <Edit3 className="h-5 w-5 text-[#4338ca] font-bold" />
                                          <div>
                                            <h5 className="text-sm font-black text-slate-800 uppercase tracking-wide">📝 Configurazione Note del Rapporto di Prova</h5>
                                            <p className="text-xs text-slate-500">Gestisci i testi ufficiali e associa dinamicamente diciture, conformità e giudizi</p>
                                          </div>
                                        </div>

                                        {/* RIQUADRO NOTA 1 */}
                                        <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-xs space-y-3">
                                          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                            <div className="flex items-center gap-1.5">
                                              <span className="inline-block bg-indigo-100 text-indigo-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md font-bold">Nota 1</span>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                onUpdateAccettazione({
                                                  ...acc,
                                                  nota1: `Il presente Rapporto riguarda esclusivamente il campione sottoposto a prova ed esso non può essere riprodotto parzialmente, se non previa autorizzazione scritta da parte di questo Laboratorio. I risultati si riferiscono al campione così come ricevuto. L'incertezza estesa per le prove chimiche, ove riportata, è espressa con un fattore di copertura K=2 che per una distribuzione normale dei dati, corrisponde a un livello di fiducia di circa 95%. L'incertezza estesa per le prove microbiologiche, ove riportata, è espressa come intervallo di fiducia con un fattore di copertura K=1,96 corrispondente a un livello di fiducia di circa 95%.`
                                                });
                                                setSelectedNota1Index(-1);
                                              }}
                                              className="text-[10px] text-[#4f46e5] hover:underline font-extrabold uppercase tracking-tight cursor-pointer"
                                            >
                                              Ripristina Default
                                            </button>
                                          </div>
                                          <p className="text-xs text-slate-400 leading-normal">
                                            Verrà stampata e posizionata dopo la tabella dei risultati analitici, prima delle firme del certificato.
                                          </p>

                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                                            {/* Col 1: Preset selector */}
                                            <div className="space-y-1 md:col-span-1">
                                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Seleziona Modello Nota 1</label>
                                              <select
                                                value={selectedNota1Index}
                                                onChange={(e) => {
                                                  const idx = parseInt(e.target.value, 10);
                                                  setSelectedNota1Index(idx);
                                                  if (idx >= 0) {
                                                    const val = nota1Presets[idx];
                                                    onUpdateAccettazione({
                                                      ...acc,
                                                      nota1: val
                                                    });
                                                  }
                                                }}
                                                className="w-full bg-slate-50 border border-slate-205 focus:bg-white rounded-lg p-2 text-xs font-semibold text-slate-705 focus:outline-none cursor-pointer"
                                              >
                                                <option value={-1}>-- Scegli nota salvata --</option>
                                                {nota1Presets.map((preset, idx) => (
                                                  <option key={idx} value={idx}>
                                                    {preset.length > 40 ? `${preset.substring(0, 40)}...` : preset}
                                                  </option>
                                                ))}
                                              </select>
                                            </div>

                                            {/* Col 2: Textarea editor */}
                                            <div className="space-y-1 md:col-span-2">
                                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Testo della Nota da stampare:</label>
                                              <textarea
                                                rows={4}
                                                value={currentNota1Val}
                                                onChange={(e) => {
                                                  const newVal = e.target.value;
                                                  onUpdateAccettazione({
                                                    ...acc,
                                                    nota1: newVal
                                                  });
                                                  const matchedIdx = nota1Presets.findIndex(p => p.trim() === newVal.trim());
                                                  setSelectedNota1Index(matchedIdx);
                                                }}
                                                className="w-full bg-slate-50 border border-slate-205 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded-lg p-2 text-xs font-medium text-slate-700 focus:outline-none leading-relaxed shadow-3xs"
                                                placeholder="Scrivi qui la nota 1 (puoi caricarne una salvata o scriverne una nuova)..."
                                              />

                                              {/* Actions */}
                                              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                                                {selectedNota1Index >= 0 ? (
                                                  <>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const updated = [...nota1Presets];
                                                        updated[selectedNota1Index] = currentNota1Val.trim();
                                                        setNota1Presets(updated);
                                                      }}
                                                      disabled={!currentNota1Val.trim()}
                                                      className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-1.5 px-3 rounded text-[9px] uppercase tracking-wider transition cursor-pointer text-center flex items-center justify-center gap-1 shadow-3xs"
                                                    >
                                                      🔄 Sovrascrivi Modello
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const updated = [...nota1Presets];
                                                        updated.splice(selectedNota1Index, 1);
                                                        setNota1Presets(updated);
                                                        setSelectedNota1Index(-1);
                                                      }}
                                                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold py-1.5 px-3 rounded text-[9px] uppercase tracking-wider transition cursor-pointer text-center flex items-center justify-center gap-1 shadow-3xs"
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
                                                    if (nota1Presets.includes(val)) return;
                                                    const updated = [...nota1Presets, val];
                                                    setNota1Presets(updated);
                                                    setSelectedNota1Index(updated.length - 1);
                                                  }}
                                                  disabled={!currentNota1Val.trim() || nota1Presets.includes(currentNota1Val.trim())}
                                                  className="bg-[#4f46e5]/10 hover:bg-[#4f46e5]/20 disabled:opacity-50 text-[#4338ca] border border-[#a5b4fc]/30 font-extrabold py-1.5 px-3 rounded text-[9px] uppercase tracking-wider transition cursor-pointer text-center flex items-center justify-center gap-1 shadow-3xs"
                                                >
                                                  📥 Salva come Nuovo Modello
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>

                                        {/* LA GRIGLIA DEI 2 RIQUADRI COMPARTIMENTATI */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                                          {/* RIQUADRO A: DICHIARAZIONE DI CONFORMITÀ / OPINIONI ED INTERPRETAZIONI */}
                                          <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-xs space-y-4 flex flex-col justify-between">
                                            <div className="space-y-3">
                                              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="inline-block bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md font-bold">DICHIARAZIONE DI CONFORMITÀ / OPINIONI ED INTERPRETAZIONI</span>
                                                </div>
                                              </div>

                                              {/* Categoria Merceologica Selector */}
                                              <div className="space-y-1">
                                                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Categoria Merceologica Riferimento</label>
                                                <select
                                                  value={selectedNota2Category}
                                                  onChange={(e) => {
                                                    setSelectedNota2Category(e.target.value);
                                                    setSelectedDichiarazioneId('');
                                                    setSelectedOpinioniId('');
                                                  }}
                                                  className="w-full bg-slate-50 border border-slate-205 rounded-lg p-1.5 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                                                >
                                                  {(() => {
                                                    const categoriesFromProve = Array.from(new Set(prove.map(p => p.categoriaMerceologica).filter(Boolean)));
                                                    const allCategoriesForNota2 = Array.from(new Set([
                                                      ...categoriesFromProve,
                                                      ...Object.keys(opinioniDizionario)
                                                    ])).filter(Boolean);

                                                    return allCategoriesForNota2.map((catKey) => (
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
                                                      const match = (opinioniDizionario[selectedNota2Category] || []).find(o => o.id === selId);
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
                                                    {(opinioniDizionario[selectedNota2Category] || [])
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
                                                    const match = (opinioniDizionario[selectedNota2Category] || [])
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
                                                            const list = prev[selectedNota2Category] || [];
                                                            return {
                                                              ...prev,
                                                              [selectedNota2Category]: list.map(item => item.id === selectedDichiarazioneId ? { ...item, testo: text } : item)
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
                                                            const list = prev[selectedNota2Category] || [];
                                                            return {
                                                              ...prev,
                                                              [selectedNota2Category]: list.filter(item => item.id !== selectedDichiarazioneId)
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
                                                            const list = prev[selectedNota2Category] || [];
                                                            return {
                                                              ...prev,
                                                              [selectedNota2Category]: [...list, { id: newId, testo: text, tipo: 'conformita' }]
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
                                                      const match = (opinioniDizionario[selectedNota2Category] || []).find(o => o.id === selId);
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
                                                    {(opinioniDizionario[selectedNota2Category] || [])
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
                                                    const match = (opinioniDizionario[selectedNota2Category] || [])
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
                                                            const list = prev[selectedNota2Category] || [];
                                                            return {
                                                              ...prev,
                                                              [selectedNota2Category]: list.map(item => item.id === selectedOpinioniId ? { ...item, testo: text } : item)
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
                                                            const list = prev[selectedNota2Category] || [];
                                                            return {
                                                              ...prev,
                                                              [selectedNota2Category]: list.filter(item => item.id !== selectedOpinioniId)
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
                                                            const list = prev[selectedNota2Category] || [];
                                                            return {
                                                              ...prev,
                                                              [selectedNota2Category]: [...list, { id: newId, testo: text, tipo: 'opinioni' }]
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

                                          {/* RIQUADRO B: NOTA 2 */}
                                          <div className="bg-white p-4 rounded-xl border border-slate-150 shadow-xs space-y-4 flex flex-col justify-between">
                                            <div className="space-y-3">
                                              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="inline-block bg-indigo-100 text-indigo-805 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md font-bold">Nota 2</span>
                                                </div>
                                                {currentNota2Val.trim() && (
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      onUpdateAccettazione({
                                                        ...acc,
                                                        nota2: ''
                                                      });
                                                      setSelectedNota2Index(-1);
                                                    }}
                                                    className="text-[9px] text-rose-600 hover:text-rose-700 font-extrabold uppercase tracking-tight cursor-pointer"
                                                  >
                                                    Svuota Nota 2
                                                  </button>
                                                )}
                                              </div>

                                              <p className="text-xs text-slate-400 leading-normal">
                                                Verrà stampata e posizionata in calce, sotto le firme dei responsabili, per certificazioni addizionali.
                                              </p>

                                              {/* Dropdown for Nota 2 */}
                                              <div className="space-y-1">
                                                <label className="block text-[10px] font-bold text-[#475569] uppercase tracking-wider">Seleziona Modello Nota 2</label>
                                                <select
                                                  value={selectedNota2Index}
                                                  onChange={(e) => {
                                                    const idx = parseInt(e.target.value, 10);
                                                    setSelectedNota2Index(idx);
                                                    if (idx >= 0) {
                                                      const val = nota2Presets[idx];
                                                      onUpdateAccettazione({
                                                        ...acc,
                                                        nota2: val
                                                      });
                                                    }
                                                  }}
                                                  className="w-full bg-slate-50 border border-slate-202 rounded-lg p-2 text-xs font-semibold focus:outline-none cursor-pointer text-slate-700"
                                                >
                                                  <option value={-1}>-- Scegli nota 2 salvata --</option>
                                                  {nota2Presets.map((preset, idx) => (
                                                    <option key={idx} value={idx}>
                                                      {preset.length > 50 ? `${preset.substring(0, 50)}...` : preset}
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>

                                              {/* Textarea for Nota 2 */}
                                              <div className="space-y-1">
                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Testo Nota 2 (Modificabile):</label>
                                                <textarea
                                                  rows={5}
                                                  value={currentNota2Val}
                                                  onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    onUpdateAccettazione({
                                                      ...acc,
                                                      nota2: newVal
                                                    });
                                                    const idx = nota2Presets.findIndex(p => p.trim() === newVal.trim());
                                                    setSelectedNota2Index(idx);
                                                  }}
                                                  className="w-full bg-slate-50 border border-slate-205 focus:bg-white focus:ring-1 focus:ring-[#4f46e5] rounded-lg p-2 text-xs font-medium text-slate-700 focus:outline-none leading-relaxed shadow-3xs"
                                                  placeholder="Scrivi qui la nota 2 (puoi caricarne una salvata o scriverne una nuova)..."
                                                />
                                              </div>

                                              {/* Actions for Nota 2 */}
                                              <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-slate-105">
                                                {selectedNota2Index >= 0 ? (
                                                  <>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const updated = [...nota2Presets];
                                                        updated[selectedNota2Index] = currentNota2Val.trim();
                                                        setNota2Presets(updated);
                                                      }}
                                                      disabled={!currentNota2Val.trim()}
                                                      className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold py-1.5 px-3 rounded text-[9px] uppercase tracking-wider transition cursor-pointer text-center flex items-center justify-center gap-1 shadow-3xs"
                                                    >
                                                      🔄 Sovrascrivi Modello
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const updated = [...nota2Presets];
                                                        updated.splice(selectedNota2Index, 1);
                                                        setNota2Presets(updated);
                                                        setSelectedNota2Index(-1);
                                                      }}
                                                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold py-1.5 px-3 rounded text-[9px] uppercase tracking-wider transition cursor-pointer text-center flex items-center justify-center gap-1 shadow-3xs"
                                                    >
                                                      🗑️ Elimina Modello
                                                    </button>
                                                  </>
                                                ) : null}
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const val = currentNota2Val.trim();
                                                    if (!val) return;
                                                    if (nota2Presets.includes(val)) return;
                                                    const updated = [...nota2Presets, val];
                                                    setNota2Presets(updated);
                                                    setSelectedNota2Index(updated.length - 1);
                                                  }}
                                                  disabled={!currentNota2Val.trim() || nota2Presets.includes(currentNota2Val.trim())}
                                                  className="bg-[#4f46e5]/10 hover:bg-[#4f46e5]/20 disabled:opacity-50 text-[#4338ca] border border-[#a5b4fc]/30 font-extrabold py-1.5 px-3 rounded text-[9px] uppercase tracking-wider transition cursor-pointer text-center flex items-center justify-center gap-1 shadow-3xs"
                                                >
                                                  📥 Salva come Nuovo Modello
                                                </button>
                                              </div>
                                            </div>
                                          </div>

                                        </div>
                                      </div>
                                    );
                                    })()}

                                  {/* AZIONI DI GESTIONE */}
                                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-250 mt-2">
                                    <div className="flex items-center gap-2">
                                      {isEditing ? (
                                        <>
                                          <button
                                            onClick={() => handleSaveResults(acc)}
                                            className="bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition shadow cursor-pointer"
                                          >
                                            <Save className="h-3.5 w-3.5" /> Salva e Completa Analisi
                                          </button>
                                          
                                          <button
                                            onClick={() => {
                                              handleFillSampleValues(acc);
                                              // Se pre-compiliamo, impostiamo anche i firmatari consigliati di default!
                                              const firstRepar = (operators || []).find(o => o.attivo !== false && o.autorizzatoFirma !== false && (o.isResponsabileReparto || (o.ruoloFirma || '').toLowerCase().includes('reparto') || (o.ruolo || '').toLowerCase() === 'responsabile di reparto'))?.nome;
                                              const secondRepar = (operators || []).find(o => o.attivo !== false && o.autorizzatoFirma !== false && (o.isResponsabileReparto || (o.ruoloFirma || '').toLowerCase().includes('reparto') || (o.ruolo || '').toLowerCase() === 'responsabile di reparto') && o.nome !== firstRepar)?.nome;
                                              const techSign = (operators || []).find(o => o.attivo !== false && o.autorizzatoFirma !== false && (o.isResponsabileTecnico || (o.ruoloFirma || '').toLowerCase().includes('tecnico') || (o.ruolo || '').toLowerCase().includes('tecnico')));
                                              const defaultTechRole = techSign ? (techSign.ruoloFirma?.includes('Reparto') ? 'Responsabile di Reparto' : 'V.ce Responsabile Tecnico') : 'V.ce Responsabile Tecnico';
                                              
                                              onUpdateAccettazione({
                                                ...acc,
                                                firmatarioReparto1: firstRepar,
                                                firmatarioReparto2: secondRepar,
                                                firmatarioTecnico: techSign?.nome,
                                                ruoloFirmatarioTecnico: defaultTechRole as any
                                              });
                                            }}
                                            className="bg-amber-500 hover:bg-amber-600 text-white rounded-lg px-3 py-2.5 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition shadow cursor-pointer"
                                            title="Simula e pre-compila determinazioni analitiche con valori realistici e fissa firmatari predefiniti"
                                          >
                                            ⚡ Compila Esempio
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
                                          className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2.5 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition shadow cursor-pointer"
                                        >
                                          <Pencil className="h-3.5 w-3.5" /> 
                                          {acc.risultatiAnalisi && acc.risultatiAnalisi.length > 0 
                                            ? 'Modifica Risultati' 
                                            : 'Rileva Risultati di Laboratorio'}
                                        </button>
                                      )}
                                    </div>

                                    {/* GENERAZIONE RAPPORTO DI PROVA UFFICIALE */}
                                    {!isEditing && acc.risultatiAnalisi && acc.risultatiAnalisi.length > 0 && (
                                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3.5 mt-2 sm:mt-0">
                                        {!acc.firmatarioReparto1 || !acc.firmatarioTecnico ? (
                                          <div className="p-2 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[10.5px] font-bold leading-normal flex items-center gap-1.5 max-w-xs sm:max-w-md animate-pulse">
                                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                            <span>Configura Primo Responsabile Reparto e Responsabile Tecnico per emettere il rapporto</span>
                                          </div>
                                        ) : null}
                                        
                                        <button
                                          onClick={() => {
                                            if (!acc.firmatarioReparto1 || !acc.firmatarioTecnico) {
                                              return;
                                            }
                                            setPreviewReportAcc(acc);
                                          }}
                                          disabled={!acc.firmatarioReparto1 || !acc.firmatarioTecnico}
                                          className={`rounded-lg px-4.5 py-2.5 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition shadow-sm ${
                                            !acc.firmatarioReparto1 || !acc.firmatarioTecnico
                                              ? 'bg-slate-200 border border-slate-300 text-slate-400 cursor-not-allowed shadow-none'
                                              : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow hover:shadow-indigo-150 cursor-pointer'
                                          }`}
                                        >
                                          <Printer className="h-3.5 w-3.5" /> Emetti Rapporto {acc.codiceAccettazione}
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
          const client = clients.find(c => c.id === previewReportAcc.intestatarioRapportoClienteId);
          const payingClient = clients.find(c => c.id === previewReportAcc.destinatarioFatturaClienteId) || client;
          const resolvedProve = getResolvedProveForAccettazione(previewReportAcc);
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
              // Se il risultato ha un prefisso "<" (minore) indica che è sotto il LOQ o la soglia, quindi non supera
              if (resultVal.trim().startsWith('<')) {
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
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-indigo-500 rounded-lg text-white shrink-0">
                      <Award className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400">Rapporto di Prova LIMS Avanzato - Pannello di Emissione</h4>
                      <h3 className="font-black text-sm text-white">Certificato: Rapporto di Prova N. {previewReportAcc.codiceAccettazione}</h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const printContent = document.getElementById('lims-printable-area')?.innerHTML;
                        if (printContent) {
                          const win = window.open('', '_blank');
                          if (win) {
                            win.document.write(`
                              <html>
                                <head>
                                  <title> </title>
                                  <script src="https://cdn.tailwindcss.com"></script>
                                  <style>
                                    @page {
                                      size: A4;
                                      margin: 0;
                                    }
                                    body {
                                      font-family: 'Inter', system-ui, -apple-system, sans-serif;
                                      padding: 15mm;
                                      color: #0f172a;
                                      background: white;
                                      -webkit-print-color-adjust: exact;
                                      print-color-adjust: exact;
                                    }
                                    .printable-sheet {
                                      max-width: 100%;
                                      width: 100%;
                                      box-shadow: none !important;
                                      padding: 0 !important;
                                      border: none !important;
                                    }
                                    .avoid-break {
                                      page-break-inside: avoid;
                                      break-inside: avoid;
                                    }
                                    table {
                                      width: 100%;
                                      border-collapse: collapse;
                                      page-break-inside: auto;
                                    }
                                    tr {
                                      page-break-inside: avoid;
                                      page-break-after: auto;
                                    }
                                    thead {
                                      display: table-header-group;
                                    }
                                  </style>
                                </head>
                                <body>
                                  <div class="printable-sheet">
                                    ${printContent}
                                  </div>
                                  <script>
                                    window.onload = function() { 
                                      setTimeout(function() {
                                        window.print(); 
                                        window.close(); 
                                      }, 600);
                                    }
                                  </script>
                                </body>
                              </html>
                            `);
                            win.document.close();
                          }
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      <Printer className="h-3.5 w-3.5" /> Stampa Certificato A4
                    </button>

                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-slate-800 rounded-lg px-3 py-2 cursor-pointer border border-slate-700 transition hover:bg-slate-750 select-none">
                      <input 
                        type="checkbox"
                        checked={showLabNotebookInPrint}
                        onChange={(e) => setShowLabNotebookInPrint(e.target.checked)}
                        className="rounded border-slate-600 text-indigo-500 focus:ring-0 cursor-pointer h-3.5 w-3.5 accent-indigo-600"
                      />
                      <span>Allegati Quaderno Lab.</span>
                    </label>
                    
                    <button
                      onClick={() => setPreviewReportAcc(null)}
                      className="p-2 bg-slate-800 hover:bg-slate-705 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* AREA PRINCIPALE: FOGLIO A4 CERTIFICATO */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-slate-100">
                  
                  {/* COLONNA DESTRA: LIVE PREVIEW DEL FOGLIO A4 CERTIFICATO */}
                  <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100 flex justify-center min-h-0 relative select-text">
                    <div 
                      id="lims-printable-area"
                      className="w-full max-w-[210mm] bg-white p-6 md:p-12 border border-slate-350 shadow-xl rounded-sm text-slate-900 text-[11.5px] leading-relaxed flex flex-col justify-between"
                      style={{ minHeight: '297mm' }}
                    >
                      <div>
                        {/* HEADER PRINCIPALE DEL LABORATORIO - LOGO A SINISTRA E DESTRA VUOTO */}
                        <div className="border-b-4 border-slate-950 pb-4 mb-5 flex justify-between items-end gap-4">
                          <div className="text-left">
                            <div className="flex flex-col items-start pr-1">
                              <span className="text-[16px] font-extrabold text-[#444444] tracking-wide" style={{ fontFamily: '"Inter", sans-serif', fontWeight: 700 }}>
                                Agenzia per lo Sviluppo
                              </span>
                              
                              <svg viewBox="0 0 200 18" className="w-56 h-5 mt-0.5" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                  <linearGradient id="redSwoop" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#9a1c18" />
                                    <stop offset="100%" stopColor="#ba231d" />
                                  </linearGradient>
                                </defs>
                                {/* Left loop swooping down and flat to the right */}
                                <path
                                  d="M 32 14 C 18 14 0 14 2.5 5 C 4 1 12 1 15 3.5 C 10.5 4.5 5.5 8 5.5 10.5 C 5.5 12.5 10 12.5 18 12.5 L 115 12.5 C 122 12.5 125 12.5 120 7"
                                  fill="none"
                                  stroke="url(#redSwoop)"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                {/* The long thin support-line curving at the right */}
                                <path
                                  d="M 22 14 L 180 14 C 196 14 191 5 184 3"
                                  fill="none"
                                  stroke="url(#redSwoop)"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                />
                              </svg>
                              
                              <span className="text-[7.5px] uppercase font-black text-slate-500 tracking-wider mt-1 text-left max-w-xl leading-normal font-sans">
                                AZIENDA SPECIALE della Camera di Commercio del Gran Sasso d'Italia
                              </span>
                            </div>
                            
                            <div className="mt-3 text-left text-[8px] md:text-[8.5px] text-slate-500 space-y-0.5 leading-normal max-w-xl">
                              <div>Sede legale ed amministrativa: <span className="font-semibold text-slate-800">Corso Vittorio Emanuele n°86 - 67100 L'Aquila</span></div>
                              <div>Laboratorio: <span className="font-semibold text-slate-800">Via degli Opifici n°1 - Z.I. di Bazzano - 67100 L'Aquila</span></div>
                              <div>P.IVA: <span className="font-mono font-semibold text-slate-800">01751450667</span></div>
                            </div>

                            {/* Accreditamento e marchi integrati sul lato sinistro, in basso al logo */}
                            <div className="mt-3.5 flex items-center gap-3 border-t border-slate-100 pt-3">
                              <span className="text-[9px] font-mono font-black text-[#8c1c16] bg-[#8c1c16]/5 px-2 py-0.5 rounded border border-[#8c1c16]/12">
                                LAB N° 0451L
                              </span>
                              <div className="text-[7.5px] uppercase text-slate-400 font-extrabold tracking-tight leading-normal">
                                Membro degli Accordi di Mutuo Riconoscimento <span className="text-[#8c1c16] font-black">EA, IAF e ILAC</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Destra completamente vuota, come espressamente richiesto dall'utente */}
                          <div className="shrink-0 w-2"></div>
                        </div>

                        {/* TITOLO CERTIFICATO - CON Dicitura espressamente richiesta */}
                        <div className="text-center rounded-lg p-3 mb-5 border border-emerald-150/80" style={{ backgroundColor: '#eefcf5', color: '#044e37' }}>
                          <h2 className="text-xs font-black uppercase tracking-widest leading-none flex justify-center items-center gap-1.5 flex-wrap">
                            <span className="text-emerald-950">Rapporto di Prova N. {previewReportAcc.codiceAccettazione}</span>
                            {previewReportAcc.revisioneCorrente !== undefined && previewReportAcc.revisioneCorrente > 0 && (
                              <span className="bg-emerald-600/10 text-emerald-800 border border-emerald-200/60 text-[9.5px] px-1.5 py-0.5 rounded font-black tracking-normal">
                                Rev. {String(previewReportAcc.revisioneCorrente).padStart(2, '0')}
                              </span>
                            )}
                          </h2>
                          <div className="flex justify-center items-center text-[9px] font-bold mt-1.5 px-4 border-t border-emerald-200/50 pt-1.5 gap-4 text-emerald-800/90">
                            <span>{printLocation}, {printDate.split('-').reverse().join('/')}</span>
                            {previewReportAcc.revisioneCorrente !== undefined && previewReportAcc.revisioneCorrente > 0 && previewReportAcc.dataRevisione && (
                              <span className="text-emerald-700 font-mono">Revisione del: {previewReportAcc.dataRevisione}</span>
                            )}
                          </div>
                        </div>

                        {/* PARAMETRI ACCETTAZIONE ED IDENTIFICAZIONE CAMPIONE - COMPACT LAYOUT */}
                        <div className="border border-slate-200 rounded-lg overflow-hidden mb-4 text-left">
                          <div className="grid grid-cols-1 md:grid-cols-12 text-[9.5px] leading-tight">
                            {/* Blocco Cliente e Destinatario in sequenza orizzontale permanente */}
                            <div className="col-span-12 p-3 bg-slate-50/50 border-b border-slate-200 grid grid-cols-2 gap-6">
                              <div className="border-r border-dashed border-slate-200/80 pr-6 text-left">
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Cliente</span>
                                {payingClient ? (
                                  <div className="space-y-0.5 text-slate-800 font-medium">
                                    <h5 className="font-extrabold text-[11px] text-slate-900 uppercase">{payingClient.denominazione}</h5>
                                    <p className="text-slate-600 text-[9.5px]">{payingClient.indirizzo}</p>
                                    <p className="font-mono text-[8.5px] text-slate-400">P.IVA / C.F.: <strong className="text-slate-700 font-medium">{payingClient.partitaIva}</strong></p>
                                  </div>
                                ) : (
                                  <p className="text-slate-400 italic">Cliente n.d.</p>
                                )}
                              </div>

                              <div className="text-left pl-2">
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Destinatario Finale</span>
                                <div className="space-y-0.5 text-slate-800 font-medium">
                                  <h5 className="font-extrabold text-[11px] text-slate-900 uppercase">
                                    {previewReportAcc.destinatarioFinale && previewReportAcc.destinatarioFinale !== 'Stesso Committente'
                                      ? previewReportAcc.destinatarioFinale
                                      : (client ? client.denominazione : 'Nessuno')}
                                  </h5>
                                  {client && (!previewReportAcc.destinatarioFinale || previewReportAcc.destinatarioFinale === 'Stesso Committente') && (
                                    <>
                                      <p className="text-slate-600 text-[9.5px]">{client.indirizzo}</p>
                                      <p className="font-mono text-[8.5px] text-slate-400">Dettaglio: <strong className="text-slate-700 font-medium">{client.email}</strong></p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Dati Campionamento Disposti Orizzontalmente per Ottimizzare lo Spazio */}
                            <div className="col-span-12 p-3 bg-white grid grid-cols-2 md:grid-cols-5 gap-3.5 text-[9.5px]">
                              <div>
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Numero Campione</span>
                                <span className="font-mono font-bold text-slate-850 block">{previewReportAcc.codiceAccettazione}</span>
                              </div>
                              <div>
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Data Ricevimento</span>
                                <span className="text-slate-800 font-medium block">{previewReportAcc.dataAccettazione} {previewReportAcc.oraRicevimento ? `ore ${previewReportAcc.oraRicevimento}` : ''}</span>
                              </div>
                              <div>
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Inizio Prove</span>
                                <span className="font-mono text-slate-800 font-medium block">{previewReportAcc.dataInizioProva || previewReportAcc.dataAccettazione}</span>
                              </div>
                              <div>
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Termine Prove</span>
                                <span className="font-mono text-slate-800 font-medium block">{previewReportAcc.dataTermineProva || previewReportAcc.consegnaPrevista || todayStr}</span>
                              </div>
                              <div>
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Categoria Merceologica</span>
                                <span className="text-slate-800 font-normal block leading-tight">{currentCategory}</span>
                              </div>

                              <div className="md:col-span-2">
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Descrizione Campione</span>
                                <span className="text-slate-800 font-medium block leading-tight">{previewReportAcc.descrizioneCampione} <span className="text-[8.5px] text-slate-400 font-normal">da parte del laboratorio</span></span>
                              </div>
                              <div className="md:col-span-2">
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Etichetta Campione</span>
                                <span className="text-slate-700 font-medium italic block leading-tight truncate">{previewReportAcc.etichettaCampione || 'Nessuna etichetta allegata'}</span>
                              </div>
                              <div>
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Quantità</span>
                                <span className="text-slate-800 font-medium block">{previewReportAcc.quantitaCampione || 'N/A'}</span>
                              </div>

                              <div>
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Imballaggio</span>
                                <span className="text-slate-800 font-medium block">{previewReportAcc.imballaggio || 'Bottiglia idonea'}</span>
                              </div>
                              <div className="md:col-span-2">
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Campionamento a cura di</span>
                                <span className="text-slate-800 font-medium block">{previewReportAcc.campionatoDa || 'A cura del Cliente'}</span>
                              </div>
                              <div className="md:col-span-2">
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Procedura di Campionamento</span>
                                <span className="text-slate-600 italic block leading-tight">{previewReportAcc.proceduraCampionamento || 'Non dichiarata'}</span>
                              </div>

                              <div className="md:col-span-5 border-t border-slate-100 pt-2 mt-1">
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Informazioni dal Cliente</span>
                                <span className="text-slate-600 italic font-medium block leading-normal">{previewReportAcc.informazioniCliente || 'Nessuna riserva / Informazione idonea.'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* TABELLA CONGIUNTA DEI RISULTATI ANALITICI E DEI LIMITI SELEZIONATI */}
                        <div className="mt-4 mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white text-left">
                          <table className="w-full text-left text-[10px] border-collapse">
                            <thead>
                              <tr className="text-emerald-950 font-sans uppercase text-[8px] font-bold tracking-wider" style={{ backgroundColor: '#eefcf5' }}>
                                <th className="p-3 text-left border-r border-emerald-200/50 font-bold">Prova</th>
                                <th className="p-3 text-left border-r border-emerald-200/50 font-bold">Metodo di prova</th>
                                <th className="p-3 text-right border-r border-emerald-200/50 font-bold w-[95px]">Risultato</th>
                                <th className="p-3 text-center border-r border-emerald-200/50 font-bold w-[85px]">Incertezza</th>
                                <th className="p-3 text-center border-r border-emerald-200/50 font-bold w-[95px]">Unità di misura</th>
                                <th className="p-3 text-left font-bold">Limiti di legge</th>
                              </tr>
                            </thead>
                            <tbody>
                              {resolvedProve.map((p, idx) => {
                                const rData = previewReportAcc.risultatiAnalisi?.find(r => r.provaId === p.id);
                                
                                // Verifica se il risultato supera un qualsiasi limite associato
                                const exceeds = rData?.limitiSelezionati?.some(lim => isValueExceedingLimit(rData.valoreRilevato, lim.valore));

                                return (
                                  <tr key={p.id} className={`border-b border-slate-150 last:border-none ${idx % 2 === 1 ? 'bg-slate-50/20' : 'bg-white'} hover:bg-slate-50/40 transition-colors`}>
                                    {/* 1. Prova e bollini */}
                                    <td className="p-3 border-r border-slate-150 font-medium align-middle">
                                      <div className="text-slate-950 flex flex-wrap items-center gap-1.5 leading-tight">
                                        <span className="font-extrabold text-[10.5px]">{p.nome}</span>
                                        {p.accreditataAccredia && (
                                          <span className="inline-flex items-center gap-0.5 text-[7px] font-extrabold bg-emerald-50 text-emerald-800 px-1 py-0.5 rounded-sm border border-emerald-200 uppercase leading-none shrink-0" title="Attività accreditata da ACCREDIA">
                                            🛡️ ACCREDIA
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    {/* 2. Metodo */}
                                    <td className="p-3 border-r border-slate-150 text-slate-500 font-mono text-[9px] leading-tight align-middle">
                                      <div className="text-slate-700 font-semibold">{p.metodoAnalitico || 'Metodo Interno'}</div>
                                      {p.limiteQuantificazione && (
                                        <div className="text-[7.5px] text-amber-805 font-bold bg-amber-50/70 border border-amber-200/40 rounded px-1.5 py-0.5 mt-0.5 inline-block font-sans lowercase tracking-wider">
                                          loq: {p.limiteQuantificazione}
                                        </div>
                                      )}
                                    </td>

                                    {/* 3. Risultato */}
                                    <td className={`p-3 border-r border-slate-150 text-right font-mono text-[11px] align-middle font-bold ${exceeds ? 'bg-red-50/10' : ''}`}>
                                      {rData ? (
                                        exceeds ? (
                                          <span className="font-extrabold text-red-700 bg-red-100/50 border border-red-200 px-1.5 py-0.5 rounded shadow-3xs inline-block">
                                            {rData.valoreRilevato}
                                          </span>
                                        ) : (
                                          <span className="text-slate-900 font-bold">
                                            {rData.valoreRilevato}
                                          </span>
                                        )
                                      ) : (
                                        <span className="text-slate-400 italic font-medium">Non rilevato</span>
                                      )}
                                    </td>

                                    {/* 4. Incertezza */}
                                    <td className="p-3 border-r border-slate-150 text-center text-slate-700 font-mono text-[9.5px] align-middle">
                                      {rData ? (
                                        <span className="font-medium text-slate-800">{rData.incertezza || 'N/D'}</span>
                                      ) : '-'}
                                    </td>

                                    {/* 5. Unità di misura */}
                                    <td className="p-3 border-r border-slate-150 text-center text-slate-600 font-mono text-[9.5px] align-middle">
                                      {rData ? (
                                        <span className="font-medium text-slate-700">{rData.unitaMisura}</span>
                                      ) : '-'}
                                    </td>

                                    {/* 6. Limiti di Legge */}
                                    <td className="p-3 text-[9px] text-slate-600 leading-tight align-middle">
                                      {rData?.limitiSelezionati && rData.limitiSelezionati.length > 0 ? (
                                        <div className="space-y-1.5">
                                          {rData.limitiSelezionati.map((lim, lIdx) => (
                                            <div key={lim.id || lIdx} className="border-b border-dashed border-slate-100 last:border-none pb-1 last:pb-0">
                                              <div>
                                                <span className="text-slate-505 text-[8.5px]">Soglia: </span>
                                                <strong className="text-slate-900 font-bold">{lim.valore}</strong>{' '}
                                                <span className="text-[8.5px] text-slate-400 font-medium">{lim.unitaMisura || rData.unitaMisura}</span>
                                              </div>
                                              <div className="text-[8px] text-slate-400 font-medium overflow-hidden text-ellipsis whitespace-nowrap max-w-[185px]" title={lim.norma}>
                                                {lim.norma}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="text-[9px] text-slate-400 italic">Nessun limite impostato</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* ALLEGATO QUADERNO DI LABORATORIO (CALCOLI) */}
                        {showLabNotebookInPrint && previewReportAcc.risultatiAnalisi?.some(r => r.quadernoCalcolo?.formula) && (
                          <div className="mt-4 border border-indigo-200 p-4 rounded-xl bg-indigo-50/5 text-[10px] mb-5 avoid-break">
                            <span className="font-extrabold text-indigo-950 uppercase tracking-wider text-[8.5px] flex items-center gap-1.5 mb-2 pb-1 border-b border-indigo-150">
                              📒 Allegato Registro Calcolo di Laboratorio
                            </span>
                            <div className="space-y-2">
                              {previewReportAcc.risultatiAnalisi
                                .filter(r => r.quadernoCalcolo?.formula)
                                .map((r, rIdx) => {
                                  const matchedProva = resolvedProve.find(p => p.id === r.provaId);
                                  const qc = r.quadernoCalcolo!;
                                  return (
                                    <div key={rIdx} className="bg-slate-50/30 p-2 rounded border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-2">
                                      <div className="col-span-1 border-b md:border-b-0 md:border-r border-slate-200 pr-2">
                                        <span className="font-bold text-slate-800 text-[10px]">Analisi: <strong className="text-indigo-900">{matchedProva?.nome || 'Determinazione'}</strong></span>
                                        <div className="font-mono text-indigo-950 text-[10px] font-bold mt-1">Valore: {r.valoreRilevato} {r.unitaMisura}</div>
                                      </div>
                                      <div className="col-span-1 border-b md:border-b-0 md:border-r border-slate-200 px-2">
                                        <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider">Formula applicata:</span>
                                        <code className="bg-white border rounded px-1.5 py-0.5 font-mono text-emerald-800 font-bold block text-center mt-1 text-[10px]">{qc.formula}</code>
                                      </div>
                                      <div className="col-span-1 pl-2">
                                        <span className="text-[8px] font-black text-slate-400 uppercase block tracking-wider font-bold">Variabili misurate:</span>
                                        <div className="space-y-0.5 mt-1 font-mono text-[9px]">
                                          {qc.variabili.map((v, vIdx) => (
                                            <div key={vIdx} className="flex justify-between items-center">
                                              <span className="text-indigo-700 font-bold">{v.simbolo} <span className="font-sans text-slate-400 text-[8px]">({v.descrizione})</span></span>
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



                        {/* NOTA 1 (Dopo i Risultati - Spostato come richiesto) */}
                        {((previewReportAcc.nota1 !== undefined ? previewReportAcc.nota1 : customNota1) || '').trim() && (
                          <div className="mt-6 mb-4 p-4 rounded-xl border border-slate-200 bg-[#4f46e5]/5 border-indigo-200/50 text-[10px] leading-relaxed text-slate-600 font-medium italic relative">
                            <span className="absolute -top-2 left-4 bg-white border border-slate-200 px-2 rounded-full text-[8px] font-bold text-slate-700 uppercase tracking-widest block shadow-3xs">
                              Avvertenze e Annotazioni Generali del Rapporto
                            </span>
                            <p className="whitespace-pre-line">{previewReportAcc.nota1 !== undefined ? previewReportAcc.nota1 : customNota1}</p>
                          </div>
                        )}

                        {/* Dichiarazione di Conformità (ISO 17025) */}
                        {(previewReportAcc.dichiarazioneConformita || '').trim() && (
                          <div className="mt-4 mb-4 p-4 rounded-xl border border-emerald-200 bg-emerald-55/20 text-[10px] leading-relaxed text-slate-700 font-medium relative text-left">
                            <span className="absolute -top-2 left-4 bg-white border border-emerald-200 px-2 rounded-full text-[8px] font-black text-emerald-800 uppercase tracking-widest block shadow-3xs">
                              Dichiarazione di Conformità
                            </span>
                            <p className="whitespace-pre-line font-medium">{previewReportAcc.dichiarazioneConformita}</p>
                          </div>
                        )}

                        {/* Opinioni ed Interpretazioni (ISO 17025) */}
                        {(previewReportAcc.opinioniInterpretazioni || '').trim() && (
                          <div className="mt-4 mb-4 p-4 rounded-xl border border-indigo-200 bg-indigo-50/10 text-[10px] leading-relaxed text-slate-700 font-medium relative text-left">
                            <span className="absolute -top-2 left-4 bg-white border border-indigo-150 px-2 rounded-full text-[8px] font-black text-indigo-900 uppercase tracking-widest block shadow-3xs">
                              Opinioni ed Interpretazioni
                            </span>
                            <p className="whitespace-pre-line font-medium">{previewReportAcc.opinioniInterpretazioni}</p>
                          </div>
                        )}

                      </div>

                      {/* FIRME AUTOGRAFE PROFESSIONALI - ORDINATE COME RICHIESTO */}
                      <div className="mt-10 pt-4 border-t border-slate-950 font-bold text-[10px] uppercase tracking-normal avoid-break pr-2">
                        <div className="grid grid-cols-2 gap-x-12 text-left items-start">
                          
                          {/* COLONNA SINISTRA: FIRMA DEI RESPONSABILI DI REPARTO */}
                          <div className="space-y-4">
                            <div className="border-b border-dashed border-slate-200 pb-1">
                              <span className="text-[7.5px] text-slate-400 font-bold uppercase tracking-widest leading-none font-mono block">
                                I Responsabili di Reparto Analitici
                              </span>
                            </div>
                            
                            {/* Reparto 1 */}
                            <div className="space-y-1">
                              <div className="font-mono text-[9px] font-bold text-slate-850 leading-tight">
                                {previewReportAcc.firmatarioReparto1 || (operators || []).find(o => o.attivo !== false && o.autorizzatoFirma !== false && ((o.ruoloFirma || '').toLowerCase() === 'responsabile di reparto' || (o.ruolo || '').toLowerCase() === 'responsabile di reparto'))?.nome || 'Dott.ssa S. Bianchi'}
                              </div>
                              <div className="text-[7px] font-semibold text-emerald-800 bg-emerald-50/60 border border-emerald-100 rounded px-1.5 py-0.5 inline-block normal-case font-mono tracking-normal leading-none">
                                🔒 Firma Elettronica Certificata (Chimica)
                              </div>
                            </div>

                            {/* Reparto 2 (se selezionato) */}
                            {previewReportAcc.firmatarioReparto2 && (
                              <div className="space-y-1 pt-2 border-t border-slate-100">
                                <div className="font-mono text-[9px] font-bold text-slate-850 leading-tight">
                                  {previewReportAcc.firmatarioReparto2}
                                </div>
                                <div className="text-[7px] font-semibold text-emerald-800 bg-emerald-50/60 border border-emerald-100 rounded px-1.5 py-0.5 inline-block normal-case font-mono tracking-normal leading-none font-medium">
                                  🔒 Firma Elettronica Certificata (Microbiologia)
                                </div>
                              </div>
                            )}
                          </div>

                          {/* COLONNA RESPONSABILITA' TECNICA */}
                          <div className="pt-10 flex flex-col items-end text-right">
                            <div className="w-full max-w-[240px] space-y-4">
                              <div className="border-b border-dashed border-slate-200 pb-1 text-right">
                                <span className="text-[7.5px] text-slate-400 font-bold uppercase tracking-widest leading-none font-mono block">
                                  Il Responsabile Tecnico
                                </span>
                              </div>
                              
                              <div className="space-y-1.5">
                                <div className="font-mono text-[9px] font-bold text-slate-900 leading-tight uppercase font-medium">
                                  {previewReportAcc.firmatarioTecnico || (operators || []).find(o => o.attivo !== false && o.autorizzatoFirma !== false && ((o.ruoloFirma || '').toLowerCase().includes('tecnico') || (o.ruolo || '').toLowerCase() === 'responsabile tecnico'))?.nome || 'Dott. Chim. F. Lupo'}
                                </div>
                                <div className="text-[7px] text-slate-500 font-semibold tracking-tight uppercase leading-normal font-sans">
                                  {ruoloTecnicoEsteso}
                                </div>
                                <div className="text-[7px] font-semibold text-indigo-800 bg-indigo-50/60 border border-indigo-100 rounded px-1.5 py-0.5 inline-block normal-case font-mono tracking-normal leading-none">
                                  🔑 Firma Digitale Qualificata (CAD)
                                </div>
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* SECONDA NOTA / AGGIUNTA DOPO LA FIRMA DEL/DEI RESPONSABILE/I DI REPARTO */}
                        {((previewReportAcc.nota2 !== undefined ? previewReportAcc.nota2 : customNota2) || '').trim() && (
                          <div className="mt-5 border-t border-dashed border-slate-300 pt-2.5 text-[9px] text-slate-500 italic leading-relaxed normal-case font-medium">
                            <span className="not-italic font-bold text-slate-700 uppercase tracking-wider text-[8px] block">Certificazione e Dettagli d&apos;Archivio Certificato:</span>
                            <p className="whitespace-pre-line">{previewReportAcc.nota2 !== undefined ? previewReportAcc.nota2 : customNota2}</p>
                          </div>
                        )}

                        {previewReportAcc.revisioneCorrente !== undefined && previewReportAcc.revisioneCorrente > 0 && (
                          <div className="mt-5 border border-amber-200 bg-amber-50/10 p-3 rounded-lg text-[8.5px] text-slate-600 leading-normal normal-case font-normal avoid-break text-left">
                            <span className="font-extrabold uppercase tracking-wider text-[8px] block text-amber-800 border-b border-amber-100 pb-1 mb-1.5 text-left">
                              ⚠️ NOTA DI RETTIFICA & REVISIONE CONTROLLATA
                            </span>
                            Il presente Rapporto di Prova in <strong>Revisione {String(previewReportAcc.revisioneCorrente).padStart(2, '0')}</strong> annulla e sostituisce a tutti gli effetti il Rapporto di Prova precedentemente emesso per questo campione (Rev. {String(previewReportAcc.revisioneCorrente - 1).padStart(2, '0')}).
                            {previewReportAcc.revisioneMotivo && (
                              <p className="mt-1 text-slate-800 text-left">
                                <strong>Motivazione della riemissione:</strong> &ldquo;<span className="italic">{previewReportAcc.revisioneMotivo}</span>&rdquo;
                              </p>
                            )}
                            <p className="mt-1 text-[7.5px] text-slate-400 font-mono text-left">
                              Impronta archivio storico: {previewReportAcc.id}-REV-{previewReportAcc.revisioneCorrente} · Emissione digitale autorizzata da {previewReportAcc.firmatarioTecnico || 'Responsabile Tecnico'} il {previewReportAcc.dataRevisione}.
                            </p>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>

                </div>

                {/* FOOTER DEL MODAL */}
                <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 shrink-0 border-t border-slate-150">
                  <button
                    onClick={() => setPreviewReportAcc(null)}
                    className="bg-slate-205 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 text-xs rounded-xl cursor-pointer transition shadow-3xs"
                  >
                    Chiudi Anteprima
                  </button>
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
                  className="p-1 px-2.5 rounded-lg bg-slate-800 text-slate-350 hover:bg-slate-700 text-xs font-bold font-mono transition cursor-pointer"
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
                              ? 'bg-slate-950 text-white border-slate-950 shadow-md'
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
                              ? 'bg-slate-950 text-white border-slate-950 shadow-md'
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
                      operators.map(op => (
                        <option key={op.nome} value={op.nome}>{op.nome} ({op.ruolo})</option>
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
                  className="flex-1 p-2.5 rounded-xl bg-slate-950 text-white font-bold hover:bg-slate-900 transition shadow-md text-xs cursor-pointer"
                >
                  Firma e Conferma
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
