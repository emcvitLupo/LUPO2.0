import React, { useState, useEffect } from 'react';
import { Prova, RisultatoProva, QuadernoCalcolo, VariableCalcolo } from '../types';
import { evaluateFormula, extractVariablesFromFormula, FORMULA_PRESETS, FormulaPreset } from '../utils/mathLims';
import { AcidiGrassiWizard } from './AcidiGrassiWizard';
import { isAcidiGrassiProva } from '../utils/acidiGrassi';
import { 
  COMPOSTI_IDROCARBURI_TOTALI, 
  calcolaSommaIdrocarburiTotali, 
  CompostoIdrocarburiInput,
  RisultatoSommaIdrocarburi,
  isValueLowerThanLoq,
  isIdrocarburiSingoloComposto,
  isIdrocarburiSommaTotale,
  parseNumericValue
} from '../utils/idrocarburiTotali';
import { 
  BookOpen, 
  Calculator, 
  FlaskConical, 
  X, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Tag,
  HelpCircle,
  Sparkles,
  Atom,
  ShieldCheck,
  Scale,
  Percent,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';

interface QuadernoLaboratorioSubRowProps {
  p: Prova;
  currentVal: RisultatoProva;
  customFormulaPresets: FormulaPreset[];
  allProveCampione?: Prova[];
  tempRisultati?: Record<string, Partial<RisultatoProva>>;
  onUpdateMultipleRisultati?: (updates: Record<string, Partial<RisultatoProva>>) => void;
  // Props Kjeldahl (opzionali per compatibilità con il genitore)
  kjeldahlMassaKHP?: string | number;
  setKjeldahlMassaKHP?: (val: string) => void;
  kjeldahlVolNaOH_KHP?: string | number;
  setKjeldahlVolNaOH_KHP?: (val: string) => void;
  kjeldahlTitoloNaOH?: string | number;
  setKjeldahlTitoloNaOH?: (val: string) => void;
  kjeldahlVolHCl?: string | number;
  setKjeldahlVolHCl?: (val: string) => void;
  kjeldahlVolNaOH_HCl?: string | number;
  setKjeldahlVolNaOH_HCl?: (val: string) => void;
  kjeldahlTitoloHCl?: string | number;
  setKjeldahlTitoloHCl?: (val: string) => void;
  kjeldahlVolBianco?: string | number;
  setKjeldahlVolBianco?: (val: string) => void;
  kjeldahlVolCampione?: string | number;
  setKjeldahlVolCampione?: (val: string) => void;
  kjeldahlPesoCampione?: string | number;
  setKjeldahlPesoCampione?: (val: string) => void;
  kjeldahlFattoreF?: number;
  setKjeldahlFattoreF?: (val: number) => void;
  kjeldahlActiveTab?: 'standard' | 'kjeldahl_wizard';
  setKjeldahlActiveTab?: (tab: 'standard' | 'kjeldahl_wizard') => void;
  onUpdateQuaderno: (quad: QuadernoCalcolo) => void;
  onApplyResult: (formattedVal: string, quad: QuadernoCalcolo, incertezza?: string) => void;
  onOpenIdrocarburiWizard?: () => void;
  onClose: () => void;
}

export const QuadernoLaboratorioSubRow: React.FC<QuadernoLaboratorioSubRowProps> = ({
  p,
  currentVal,
  customFormulaPresets = [],
  allProveCampione = [],
  tempRisultati = {},
  onUpdateMultipleRisultati,
  kjeldahlMassaKHP,
  setKjeldahlMassaKHP,
  kjeldahlVolNaOH_KHP,
  setKjeldahlVolNaOH_KHP,
  kjeldahlTitoloNaOH,
  setKjeldahlTitoloNaOH,
  kjeldahlVolHCl,
  setKjeldahlVolHCl,
  kjeldahlVolNaOH_HCl,
  setKjeldahlVolNaOH_HCl,
  kjeldahlTitoloHCl,
  setKjeldahlTitoloHCl,
  kjeldahlVolBianco,
  setKjeldahlVolBianco,
  kjeldahlVolCampione,
  setKjeldahlVolCampione,
  kjeldahlPesoCampione,
  setKjeldahlPesoCampione,
  kjeldahlFattoreF,
  setKjeldahlFattoreF,
  kjeldahlActiveTab,
  setKjeldahlActiveTab,
  onUpdateQuaderno,
  onApplyResult,
  onOpenIdrocarburiWizard,
  onClose
}) => {
  // Verifiche per metodi specifici
  const isKjeldahlOrProteine = p.tipoMetodoCalcolo === 'kjeldahl' ||
    (p.nome || '').toLowerCase().includes('protein') || 
    (p.nome || '').toLowerCase().includes('azoto') || 
    (p.nome || '').toLowerCase().includes('kjeldahl') ||
    (p.metodoAnalitico || '').toLowerCase().includes('kjeldahl') ||
    (p.metodoAnalitico || '').toLowerCase().includes('1871');

  const isIdrocarburiOrTHM = !isIdrocarburiSingoloComposto(p) && (
    p.tipoMetodoCalcolo === 'idrocarburi_totali' ||
    isIdrocarburiSommaTotale(p) ||
    (p.nome || '').toLowerCase().includes('idrocarbur') || 
    (p.nome || '').toLowerCase().includes('trialometan') || 
    (p.nome || '').toLowerCase().includes('thm') ||
    (p.formulaCalcolo || '').toLowerCase().includes('loq/2') ||
    (p.formulaCalcolo || '').toLowerCase().includes('bf + cf')
  );

  const isAcidiGrassi = isAcidiGrassiProva(p);

  // Helper per associare una variabile del quaderno ad uno dei 4 composti idrocarburici
  const getCompoundKeyForVariable = (simbolo: string, descrizione?: string, index?: number): string | null => {
    const sym = (simbolo || '').toLowerCase().trim();
    const desc = (descrizione || '').toLowerCase().trim();

    if (sym === 'bf' || sym === 'chbr3' || desc.includes('bromoformio') || desc.includes('tribromometano') || (index === 0 && (!sym || sym === 'a'))) {
      return 'bromoformio';
    }
    if (sym === 'cf' || sym === 'chcl3' || desc.includes('cloroformio') || desc.includes('triclorometano') || (index === 1 && (!sym || sym === 'b'))) {
      return 'cloroformio';
    }
    if (sym === 'bdcm' || sym === 'chbrcl2' || desc.includes('bromodiclorometano') || desc.includes('diclorobromometano') || (index === 2 && (!sym || sym === 'c'))) {
      return 'bromodiclorometano';
    }
    if (sym === 'dbcm' || sym === 'chclbr2' || desc.includes('dibromoclorometano') || desc.includes('clorodibromometano') || (index === 3 && (!sym || sym === 'd'))) {
      return 'dibromoclorometano';
    }
    return null;
  };

  // Helper per calcolare il valore da inserire nella variabile del quaderno (LOQ/2 se ≤ LOQ o vuoto)
  const getHydrocarbonValueForCompound = (compoundKey: string): { valore: number; isBelow: boolean; rawVal: string; loqStr: string } => {
    const meta = COMPOSTI_IDROCARBURI_TOTALI.find(c => c.key === compoundKey);
    const defaultLoq = meta?.defaultLoq || '0.01';
    const parsedLoq = parseNumericValue(defaultLoq) || 0.01;

    if (!meta) return { valore: parsedLoq / 2, isBelow: true, rawVal: '', loqStr: defaultLoq };

    const matchProva = allProveCampione?.find(pr => {
      if (pr.id === p.id) return false;
      const prNome = (pr.nome || '').toLowerCase();
      return meta.nomi.some(n => prNome.includes(n));
    });

    const loq = matchProva?.limiteQuantificazione || defaultLoq;
    const loqNum = parseNumericValue(loq) || 0.01;

    if (!matchProva || !tempRisultati || !tempRisultati[matchProva.id]) {
      return { valore: loqNum / 2, isBelow: true, rawVal: '', loqStr: loq };
    }

    const resVal = tempRisultati[matchProva.id];
    const rawVal = (resVal?.valoreRilevato || '').trim();
    const isBelow = !rawVal || isValueLowerThanLoq(rawVal, loq) || rawVal.startsWith('<') || rawVal.startsWith('≤');

    if (isBelow) {
      return { valore: loqNum / 2, isBelow: true, rawVal, loqStr: loq };
    }

    const num = parseNumericValue(rawVal);
    return { valore: num !== null ? num : 0, isBelow: false, rawVal, loqStr: loq };
  };

  // Inizializzazione quaderno di default dalla prova o dal risultato esistente
  const existingQuad = currentVal.quadernoCalcolo;
  const initialFormula = existingQuad?.formula ?? p.formulaCalcolo ?? (isIdrocarburiOrTHM ? 'BF + CF + BDCM + DBCM' : '');

  const initialVariables: VariableCalcolo[] = (() => {
    if (isIdrocarburiOrTHM) {
      if (existingQuad?.variabili && existingQuad.variabili.length > 0) {
        return existingQuad.variabili.map((v, i) => {
          const compKey = getCompoundKeyForVariable(v.simbolo, v.descrizione, i);
          if (compKey) {
            const data = getHydrocarbonValueForCompound(compKey);
            const valToUse = (v.valore !== '' && v.valore !== undefined) ? v.valore : data.valore;
            return {
              ...v,
              valore: valToUse
            };
          }
          return v;
        });
      }
      if (p.variabiliCalcolo && p.variabiliCalcolo.length > 0) {
        return p.variabiliCalcolo.map((v, i) => {
          const compKey = getCompoundKeyForVariable(v.simbolo, v.descrizione, i);
          const val = compKey ? getHydrocarbonValueForCompound(compKey).valore : '';
          return {
            id: v.id || `v-${i}-${v.simbolo}`,
            simbolo: v.simbolo,
            descrizione: v.descrizione,
            valore: val
          };
        });
      }
      return [
        {
          id: 'v_bf',
          simbolo: 'BF',
          descrizione: 'Bromoformio (µg/L)',
          valore: getHydrocarbonValueForCompound('bromoformio').valore
        },
        {
          id: 'v_cf',
          simbolo: 'CF',
          descrizione: 'Cloroformio (µg/L)',
          valore: getHydrocarbonValueForCompound('cloroformio').valore
        },
        {
          id: 'v_bdcm',
          simbolo: 'BDCM',
          descrizione: 'Bromodiclorometano (µg/L)',
          valore: getHydrocarbonValueForCompound('bromodiclorometano').valore
        },
        {
          id: 'v_dbcm',
          simbolo: 'DBCM',
          descrizione: 'Dibromoclorometano (µg/L)',
          valore: getHydrocarbonValueForCompound('dibromoclorometano').valore
        }
      ];
    }

    return (existingQuad?.variabili && existingQuad.variabili.length > 0)
      ? existingQuad.variabili
      : (p.variabiliCalcolo && p.variabiliCalcolo.length > 0)
        ? p.variabiliCalcolo.map((v, i) => ({
            id: v.id || `v-${i}-${v.simbolo}`,
            simbolo: v.simbolo,
            descrizione: v.descrizione,
            valore: ''
          }))
        : [];
  })();

  const [formula, setFormula] = useState<string>(initialFormula);
  const [variables, setVariables] = useState<VariableCalcolo[]>(initialVariables);
  const [noteStrumento, setNoteStrumento] = useState<string>(existingQuad?.noteStrumento || '');
  const [showFormulaHelp, setShowFormulaHelp] = useState<boolean>(false);

  // Stato scheda attiva (standard vs kjeldahl vs idrocarburi vs acidi_grassi)
  const [activeTab, setActiveTab] = useState<'standard' | 'kjeldahl_wizard' | 'idrocarburi_wizard' | 'acidi_grassi_wizard'>(() => {
    if (existingQuad?.tipoCalcolo === 'kjeldahl') return 'kjeldahl_wizard';
    if (existingQuad?.tipoCalcolo === 'idrocarburi_totali') return 'idrocarburi_wizard';
    if (existingQuad?.tipoCalcolo === 'acidi_grassi') return 'acidi_grassi_wizard';
    if (kjeldahlActiveTab) return kjeldahlActiveTab;
    if (isAcidiGrassi) return 'acidi_grassi_wizard';
    if (isIdrocarburiOrTHM) return 'standard';
    if (isKjeldahlOrProteine) return 'kjeldahl_wizard';
    return 'standard';
  });

  // Stati locali per Assistente Grafico Idrocarburi Totali (LOQ/2)
  const [idroComposti, setIdroComposti] = useState<Array<{
    key: string;
    nome: string;
    formulaMolecolare: string;
    cas: string;
    valore: string;
    isBelowLoq: boolean;
    loq: string;
    incertezza: string;
    unita: string;
    provaIdCorrispondente?: string;
  }>>(() => {
    return COMPOSTI_IDROCARBURI_TOTALI.map(c => {
      // Cerca la prova del singolo composto tra le prove del campione
      const matchProva = allProveCampione.find(pr => {
        if (pr.id === p.id) return false;
        const prNome = (pr.nome || '').toLowerCase();
        return c.nomi.some(n => prNome.includes(n));
      });

      const resVal = matchProva && tempRisultati ? tempRisultati[matchProva.id] : undefined;
      const rawValore = resVal?.valoreRilevato || '';
      const defaultLoq = matchProva?.limiteQuantificazione || c.defaultLoq;

      const existingVar = existingQuad?.variabili?.find(v => 
        v.descrizione?.toLowerCase().includes(c.key) || 
        v.simbolo?.toLowerCase().includes(c.key.substring(0, 3))
      );
      const varVal = existingVar ? String(existingVar.valore) : '';
      const valToUse = rawValore || varVal;

      const isBelow = isValueLowerThanLoq(valToUse, defaultLoq) || 
                      valToUse.startsWith('<') || 
                      valToUse.startsWith('≤') || 
                      valToUse === '' || 
                      valToUse.includes('LOQ');

      const cleanVal = isBelow && (valToUse.startsWith('<') || valToUse.startsWith('≤'))
        ? valToUse.replace(/^[<≤=]+\s*/, '').trim()
        : (isBelow ? defaultLoq : valToUse);

      const incVal = resVal?.incertezza && resVal.incertezza !== 'N/D'
        ? resVal.incertezza.replace('±', '').trim()
        : (matchProva?.puntiIncertezza?.[0]?.incertezza ? String(matchProva.puntiIncertezza[0].incertezza) : '0.002');

      return {
        key: c.key,
        nome: c.nomeStandard,
        formulaMolecolare: c.formulaMolecolare,
        cas: c.cas,
        valore: cleanVal || defaultLoq,
        isBelowLoq: isBelow,
        loq: defaultLoq,
        incertezza: incVal,
        unita: matchProva?.unitaMisura || currentVal.unitaMisura || p.unitaMisura || 'µg/L',
        provaIdCorrispondente: matchProva?.id
      };
    });
  });

  // Sincronizzazione automatica se cambiano i risultati digitati nel campione
  useEffect(() => {
    if (!isIdrocarburiOrTHM || allProveCampione.length === 0 || Object.keys(tempRisultati).length === 0) return;
    setIdroComposti(prev => {
      let hasChanges = false;
      const next = prev.map((item, idx) => {
        const c = COMPOSTI_IDROCARBURI_TOTALI[idx];
        const matchProva = allProveCampione.find(pr => {
          if (pr.id === p.id) return false;
          const prNome = (pr.nome || '').toLowerCase();
          return c.nomi.some(n => prNome.includes(n));
        });
        if (!matchProva) return item;

        const resVal = tempRisultati[matchProva.id];
        if (!resVal || resVal.valoreRilevato === undefined) return item;

        const rawVal = resVal.valoreRilevato;
        const defaultLoq = matchProva.limiteQuantificazione || item.loq;
        const isBelow = isValueLowerThanLoq(rawVal, defaultLoq) || rawVal.startsWith('<') || rawVal.startsWith('≤') || rawVal === '';
        const cleanVal = isBelow && (rawVal.startsWith('<') || rawVal.startsWith('≤'))
          ? rawVal.replace(/^[<≤=]+\s*/, '').trim()
          : (isBelow ? defaultLoq : rawVal);
        const incVal = resVal.incertezza && resVal.incertezza !== 'N/D'
          ? resVal.incertezza.replace('±', '').trim()
          : item.incertezza;

        if (item.valore !== cleanVal || item.isBelowLoq !== isBelow || item.incertezza !== incVal || item.provaIdCorrispondente !== matchProva.id) {
          hasChanges = true;
          return {
            ...item,
            valore: cleanVal || defaultLoq,
            isBelowLoq: isBelow,
            loq: defaultLoq,
            incertezza: incVal,
            provaIdCorrispondente: matchProva.id
          };
        }
        return item;
      });
      return hasChanges ? next : prev;
    });

    // Sincronizza anche i valori nelle variabili del quaderno standard
    setVariables(prevVars => {
      let hasVarChanges = false;
      const updated = prevVars.map((v, i) => {
        const compKey = getCompoundKeyForVariable(v.simbolo, v.descrizione, i);
        if (compKey) {
          const compData = getHydrocarbonValueForCompound(compKey);
          if (v.valore !== compData.valore) {
            hasVarChanges = true;
            return { ...v, valore: compData.valore };
          }
        }
        return v;
      });
      return hasVarChanges ? updated : prevVars;
    });
  }, [tempRisultati, allProveCampione, isIdrocarburiOrTHM, p.id]);

  const [idroPrecision, setIdroPrecision] = useState<number>(3);
  const [idroViewMode, setIdroViewMode] = useState<'cards' | 'table'>('cards');

  const idroInputs: CompostoIdrocarburiInput[] = idroComposti.map(c => {
    const cleanLoq = (c.loq || '').replace(/^[<≤=]+\s*/, '') || c.loq;
    return {
      nome: c.nome,
      valoreRilevato: c.isBelowLoq ? `≤ ${cleanLoq}` : c.valore,
      loq: c.loq,
      incertezza: c.isBelowLoq ? 'N/D' : (c.incertezza ? `± ${c.incertezza}` : '0'),
      unitaMisura: c.unita
    };
  });

  const idroResult: RisultatoSommaIdrocarburi = calcolaSommaIdrocarburiTotali(idroInputs, idroPrecision);

  const handleIdroToggleBelowLoq = (index: number) => {
    setIdroComposti(prev => {
      const copy = [...prev];
      copy[index].isBelowLoq = !copy[index].isBelowLoq;
      return copy;
    });
  };

  const handleIdroSetBelowLoq = (index: number, isBelow: boolean) => {
    setIdroComposti(prev => {
      const copy = [...prev];
      copy[index].isBelowLoq = isBelow;
      return copy;
    });
  };

  const handleIdroUpdateValore = (index: number, val: string) => {
    setIdroComposti(prev => {
      const copy = [...prev];
      copy[index].valore = val;
      if (val.startsWith('<') || val.startsWith('≤') || val.startsWith('<=')) {
        copy[index].isBelowLoq = true;
      }
      return copy;
    });
  };

  const handleIdroUpdateLoq = (index: number, val: string) => {
    setIdroComposti(prev => {
      const copy = [...prev];
      copy[index].loq = val;
      return copy;
    });
  };

  const handleIdroUpdateIncertezza = (index: number, val: string) => {
    setIdroComposti(prev => {
      const copy = [...prev];
      copy[index].incertezza = val;
      return copy;
    });
  };

  // Stati locali per Kjeldahl incapsulati nel quaderno del campione
  const kData = existingQuad?.kjeldahlData;
  const [localMassaKHP, setLocalMassaKHP] = useState<string | number>(() => kData?.massaKHP ?? kjeldahlMassaKHP ?? 0.2042);
  const [localVolNaOH_KHP, setLocalVolNaOH_KHP] = useState<string | number>(() => kData?.volNaOH_KHP ?? kjeldahlVolNaOH_KHP ?? 10.05);
  const [localTitoloNaOH, setLocalTitoloNaOH] = useState<string | number>(() => kData?.titoloNaOH ?? kjeldahlTitoloNaOH ?? 0.0995);
  const [localVolHCl, setLocalVolHCl] = useState<string | number>(() => kData?.volHCl ?? kjeldahlVolHCl ?? 10.00);
  const [localVolNaOH_HCl, setLocalVolNaOH_HCl] = useState<string | number>(() => kData?.volNaOH_HCl ?? kjeldahlVolNaOH_HCl ?? 10.05);
  const [localTitoloHCl, setLocalTitoloHCl] = useState<string | number>(() => kData?.titoloHCl ?? kjeldahlTitoloHCl ?? 0.1000);
  const [localVolBianco, setLocalVolBianco] = useState<string | number>(() => kData?.volBianco ?? kjeldahlVolBianco ?? 0.05);
  const [localVolCampione, setLocalVolCampione] = useState<string | number>(() => kData?.volCampione ?? kjeldahlVolCampione ?? 12.45);
  const [localPesoCampione, setLocalPesoCampione] = useState<string | number>(() => kData?.pesoCampione ?? kjeldahlPesoCampione ?? 1.0500);
  const [localFattoreF, setLocalFattoreF] = useState<number>(() => kData?.fattoreF ?? kjeldahlFattoreF ?? 6.25);

  // Valutazione reattiva formula standard
  const evalResult = evaluateFormula(formula, variables);

  // Sincronizzazione automatica variabili dalla formula digitata
  const handleSyncVariablesFromFormula = () => {
    const extractedSymbols = extractVariablesFromFormula(formula);
    if (extractedSymbols.length === 0) return;

    const currentMap = new Map<string, VariableCalcolo>();
    variables.forEach(v => {
      currentMap.set(v.simbolo, v);
    });

    const newVars: VariableCalcolo[] = extractedSymbols.map((sym, idx) => {
      if (currentMap.has(sym)) {
        return currentMap.get(sym)!;
      }
      return {
        id: `v-auto-${idx}-${sym}`,
        simbolo: sym,
        descrizione: `Parametro ${sym}`,
        valore: ''
      };
    });

    setVariables(newVars);
    onUpdateQuaderno({
      formula,
      variabili: newVars,
      noteStrumento: noteStrumento.trim() || undefined,
      tipoCalcolo: 'generico'
    });
  };

  // Caricamento modello predefinito
  const handleApplyPreset = (presetIndexStr: string) => {
    if (presetIndexStr === '') return;
    const allPresets = [...FORMULA_PRESETS, ...customFormulaPresets];
    const preset = allPresets[parseInt(presetIndexStr, 10)];
    if (!preset) return;

    const newVars: VariableCalcolo[] = preset.variabili.map((v, i) => ({
      id: `v-preset-${i}-${v.simbolo}`,
      simbolo: v.simbolo,
      descrizione: v.descrizione,
      valore: v.valore
    }));

    setFormula(preset.formula);
    setVariables(newVars);

    onUpdateQuaderno({
      formula: preset.formula,
      variabili: newVars,
      noteStrumento: noteStrumento.trim() || undefined,
      tipoCalcolo: 'generico'
    });
  };

  // Aggiunta variabile manuale
  const handleAddVariable = () => {
    const nextCode = String.fromCharCode(65 + (variables.length % 26));
    const nextSymbol = variables.some(v => v.simbolo === nextCode) ? `${nextCode}${variables.length + 1}` : nextCode;
    const newVar: VariableCalcolo = {
      id: `v-user-${Date.now()}`,
      simbolo: nextSymbol,
      descrizione: `Nuovo parametro (${nextSymbol})`,
      valore: ''
    };
    const updated = [...variables, newVar];
    setVariables(updated);
    onUpdateQuaderno({
      formula,
      variabili: updated,
      noteStrumento: noteStrumento.trim() || undefined,
      tipoCalcolo: 'generico'
    });
  };

  // Rimozione variabile
  const handleRemoveVariable = (idxToRemove: number) => {
    const updated = variables.filter((_, idx) => idx !== idxToRemove);
    setVariables(updated);
    onUpdateQuaderno({
      formula,
      variabili: updated,
      noteStrumento: noteStrumento.trim() || undefined,
      tipoCalcolo: 'generico'
    });
  };

  // Modifica singola variabile
  const handleUpdateVariable = (idx: number, field: 'valore' | 'descrizione' | 'simbolo', value: any) => {
    const updated = [...variables];
    updated[idx] = {
      ...updated[idx],
      [field]: field === 'valore' && value !== '' ? Number(value) : value
    };
    setVariables(updated);
    onUpdateQuaderno({
      formula,
      variabili: updated,
      noteStrumento: noteStrumento.trim() || undefined,
      tipoCalcolo: 'generico'
    });
  };

  // Modifica formula testo
  const handleFormulaChange = (newFormula: string) => {
    setFormula(newFormula);
    onUpdateQuaderno({
      formula: newFormula,
      variabili: variables,
      noteStrumento: noteStrumento.trim() || undefined,
      tipoCalcolo: 'generico'
    });
  };

  // Modifica note strumento
  const handleNoteStrumentoChange = (newNote: string) => {
    setNoteStrumento(newNote);
    onUpdateQuaderno({
      formula,
      variabili: variables,
      noteStrumento: newNote.trim() || undefined,
      tipoCalcolo: activeTab === 'kjeldahl_wizard' ? 'kjeldahl' : 'generico',
      kjeldahlData: activeTab === 'kjeldahl_wizard' ? {
        massaKHP: localMassaKHP,
        volNaOH_KHP: localVolNaOH_KHP,
        titoloNaOH: localTitoloNaOH,
        volHCl: localVolHCl,
        volNaOH_HCl: localVolNaOH_HCl,
        titoloHCl: localTitoloHCl,
        volBianco: localVolBianco,
        volCampione: localVolCampione,
        pesoCampione: localPesoCampione,
        fattoreF: localFattoreF
      } : undefined
    });
  };

  // Calcoli reattivi per l'Assistente Kjeldahl (4 Fasi)
  const mKHP = Number(localMassaKHP) || 0;
  const vNaOH_KHP = Number(localVolNaOH_KHP) || 0;
  const calcTitoloNaOH = (mKHP > 0 && vNaOH_KHP > 0)
    ? (mKHP * 1000) / (vNaOH_KHP * 204.22)
    : null;

  const vHCl = Number(localVolHCl) || 0;
  const vNaOH_HCl = Number(localVolNaOH_HCl) || 0;
  const tNaOH_used = Number(localTitoloNaOH) || (calcTitoloNaOH || 0.1);
  const calcTitoloHCl = (vHCl > 0 && vNaOH_HCl > 0 && tNaOH_used > 0)
    ? (vNaOH_HCl * tNaOH_used) / vHCl
    : null;

  const vCampione = Number(localVolCampione) || 0;
  const vBianco = Number(localVolBianco) || 0;
  const nTitolante = Number(localTitoloHCl) || (calcTitoloHCl || (calcTitoloNaOH || 0.1));
  const pesoC = Number(localPesoCampione) || 0;
  const fattoreF = Number(localFattoreF) || 6.25;

  const deltaV = Math.max(0, vCampione - vBianco);
  const calcAzotoPercent = (pesoC > 0 && deltaV >= 0 && nTitolante > 0)
    ? (deltaV * nTitolante * 1.4007) / pesoC
    : null;
  const calcProteinePercent = calcAzotoPercent !== null
    ? calcAzotoPercent * fattoreF
    : null;

  return (
    <tr className="bg-slate-55 border-b border-indigo-100/50">
      <td colSpan={6} className="px-3 pb-3 pt-1">
        <div className="bg-white rounded-xl border border-indigo-200/90 p-4 shadow-sm max-w-5xl space-y-4 text-left">
          
          {/* INTESTAZIONE E AZIONI PRINCIPALI */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 shrink-0">
                <BookOpen className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-slate-850 text-xs uppercase tracking-wide">
                    📒 Quaderno di Laboratorio LIMS • Registro Calcoli
                  </span>
                  <span className="text-[10.5px] px-2.5 py-0.5 bg-indigo-50 text-indigo-900 border border-indigo-200/60 rounded-full font-bold">
                    {p.nome}
                  </span>
                  {p.metodoAnalitico && (
                    <span className="text-[9.5px] text-slate-500 font-mono">
                      Metodo: <strong>{p.metodoAnalitico}</strong>
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Registrazione calcoli analitici e tracciabilità strumentale conforme ISO/IEC 17025.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {isIdrocarburiOrTHM && onOpenIdrocarburiWizard && (
                <button
                  type="button"
                  onClick={onOpenIdrocarburiWizard}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-lg shadow-3xs transition cursor-pointer"
                  title="Apri Assistente Idrocarburi Totali (Somma 4 composti con LOQ/2 e propagazione incertezze)"
                >
                  <FlaskConical className="h-3.5 w-3.5 text-teal-600" />
                  <span>🧪 Assistente Idrocarburi (LOQ/2)</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 hover:text-slate-900 border border-slate-300 rounded-lg shadow-3xs transition cursor-pointer"
                title="Chiudi Quaderno di Laboratorio"
              >
                <X className="h-3.5 w-3.5 text-slate-500" />
                <span>Chiudi Quaderno</span>
              </button>
            </div>
          </div>

          {/* BANNER INFORMATIVO SE PROVA IDROCARBURI / THM */}
          {isIdrocarburiOrTHM && onOpenIdrocarburiWizard && (
            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950">
              <div className="flex items-start gap-2.5">
                <FlaskConical className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-xs text-emerald-900 block">
                    Metodo Ufficiale Somma Composti (Idrocarburi / Trialometani)
                  </span>
                  <span className="text-[10px] text-emerald-800">
                    La norma prevede il trattamento automatico dei singoli composti inferiori al limite (criterio ≤ LOQ → LOQ/2) e la somma differenziata delle incertezze.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenIdrocarburiWizard}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-3xs transition shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" /> Apri Assistente Dedicato
              </button>
            </div>
          )}

          {/* SELETTORE TAB */}
          {(isKjeldahlOrProteine || isIdrocarburiOrTHM || isAcidiGrassi) && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200 w-fit flex-wrap">
              {isAcidiGrassi && (
                <button
                  type="button"
                  onClick={() => setActiveTab('acidi_grassi_wizard')}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'acidi_grassi_wizard'
                      ? 'bg-gradient-to-r from-indigo-700 via-indigo-800 to-amber-700 text-white shadow-3xs'
                      : 'text-indigo-800 hover:text-indigo-950 hover:bg-indigo-100/50'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" /> 🧪 Profilo Acidi Grassi FAME 37 (Manuale GC-FID)
                </button>
              )}

              {isKjeldahlOrProteine && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('kjeldahl_wizard');
                    setKjeldahlActiveTab?.('kjeldahl_wizard');
                  }}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'kjeldahl_wizard'
                      ? 'bg-indigo-600 text-white shadow-3xs'
                      : 'text-indigo-800 hover:text-indigo-950 hover:bg-indigo-100/50'
                  }`}
                >
                  <FlaskConical className="h-3.5 w-3.5" /> 🔬 Assistente Kjeldahl (4 Fasi Integrate)
                </button>
              )}

              {isIdrocarburiOrTHM && (
                <button
                  type="button"
                  onClick={() => setActiveTab('idrocarburi_wizard')}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'idrocarburi_wizard'
                      ? 'bg-gradient-to-r from-teal-700 to-emerald-700 text-white shadow-3xs'
                      : 'text-teal-800 hover:text-teal-950 hover:bg-teal-100/50'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-emerald-300" /> 🧪 Assistente Grafico Idrocarburi (LOQ/2)
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setActiveTab('standard');
                  setKjeldahlActiveTab?.('standard');
                }}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'standard'
                    ? 'bg-white text-slate-900 shadow-3xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calculator className="h-3.5 w-3.5" /> Calcolatore Dinamico Formule
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SEZIONE 0: ASSISTENTE PROFILO ACIDI GRASSI (AREA 2: CAMPIONE ANALITICO)   */}
          {/* ========================================================================= */}
          {activeTab === 'acidi_grassi_wizard' && isAcidiGrassi ? (
            <AcidiGrassiWizard
              provaNome={p.nome || ''}
              provaMetodo={p.metodoAnalitico || ''}
              allProveCampione={allProveCampione}
              standardAcidiGrassi={p.standardAcidiGrassi}
              opzioniReportDefault={p.opzioniReportAcidiGrassi}
              existingData={currentVal.quadernoCalcolo?.acidiGrassiDettaglio}
              onApplyResults={({ valoreRilevato, incertezza, quadernoData, relatedUpdates }) => {
                const completeAcidiQuad: QuadernoCalcolo = {
                  formula: quadernoData.formula,
                  tipoCalcolo: 'acidi_grassi',
                  noteStrumento: quadernoData.noteStrumento,
                  variabili: quadernoData.variabili,
                  acidiGrassiDettaglio: quadernoData.acidiGrassiDettaglio
                };
                onApplyResult(valoreRilevato, completeAcidiQuad, incertezza);
                if (relatedUpdates && onUpdateMultipleRisultati && Object.keys(relatedUpdates).length > 0) {
                  onUpdateMultipleRisultati(relatedUpdates);
                }
              }}
              onClose={onClose}
            />
          ) : activeTab === 'kjeldahl_wizard' && isKjeldahlOrProteine ? (
            <div className="space-y-4 pt-1">
              {/* Banner Metodo */}
              <div className="bg-slate-900 text-white p-3.5 rounded-xl shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-2 border border-slate-700">
                <div>
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest block">
                    ISO 1871 • Reg. UE 1169/2011 • Metodo Kjeldahl
                  </span>
                  <p className="text-xs text-indigo-100 font-medium">
                    Procedura a 4 stadi integrati: standardizzazione reagenti, titolazione bianco/campione e calcolo proteine %.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[9px] text-slate-300 block">Equivalente Azoto (N):</span>
                    <span className="font-mono text-xs font-black text-white bg-white/10 px-2 py-0.5 rounded border border-white/20">
                      1.4007 g/eq
                    </span>
                  </div>
                </div>
              </div>

              {/* Griglia a 4 Fasi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* FASE 1: Titolo NaOH */}
                <div className="bg-white p-3.5 rounded-xl border border-sky-200 shadow-3xs space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-sky-800 uppercase tracking-wide flex items-center gap-1">
                        1️⃣ Titolo Effettivo NaOH (KHP)
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">PM KHP = 204.22</span>
                    </div>
                    <code className="text-[9.5px] font-mono text-sky-900 bg-sky-50 p-1.5 rounded border border-sky-100 block">
                      T_NaOH = (m_KHP × 1000) / (V_NaOH × 204.22)
                    </code>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block">Massa KHP (g):</label>
                        <input
                          type="number"
                          step="any"
                          value={localMassaKHP}
                          onChange={(e) => {
                            setLocalMassaKHP(e.target.value);
                            setKjeldahlMassaKHP?.(e.target.value);
                          }}
                          placeholder="0.2042"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block">Vol. NaOH (mL):</label>
                        <input
                          type="number"
                          step="any"
                          value={localVolNaOH_KHP}
                          onChange={(e) => {
                            setLocalVolNaOH_KHP(e.target.value);
                            setKjeldahlVolNaOH_KHP?.(e.target.value);
                          }}
                          placeholder="10.05"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-sky-100 flex items-center justify-between">
                    <div>
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Titolo NaOH:</span>
                      <span className="font-mono text-sm font-black text-sky-900">
                        {calcTitoloNaOH !== null ? calcTitoloNaOH.toFixed(4) : '---'} N
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (calcTitoloNaOH !== null) {
                          const valStr = calcTitoloNaOH.toFixed(4);
                          setLocalTitoloNaOH(valStr);
                          setKjeldahlTitoloNaOH?.(valStr);
                        }
                      }}
                      disabled={calcTitoloNaOH === null}
                      className="text-[10px] px-2.5 py-1 bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold rounded cursor-pointer transition disabled:opacity-50"
                    >
                      ⚡ Applica a Fase 2/4
                    </button>
                  </div>
                </div>

                {/* FASE 2: Titolo HCl */}
                <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-3xs space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-purple-800 uppercase tracking-wide flex items-center gap-1">
                        2️⃣ Titolo Effettivo HCl
                      </span>
                      <span className="text-[9px] text-purple-600 font-bold">Standard con NaOH</span>
                    </div>
                    <code className="text-[9.5px] font-mono text-purple-900 bg-purple-50 p-1.5 rounded border border-purple-100 block">
                      T_HCl = (V_NaOH × T_NaOH) / V_HCl
                    </code>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block">Vol. HCl (mL):</label>
                        <input
                          type="number"
                          step="any"
                          value={localVolHCl}
                          onChange={(e) => {
                            setLocalVolHCl(e.target.value);
                            setKjeldahlVolHCl?.(e.target.value);
                          }}
                          placeholder="10.00"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block">Vol. NaOH (mL):</label>
                        <input
                          type="number"
                          step="any"
                          value={localVolNaOH_HCl}
                          onChange={(e) => {
                            setLocalVolNaOH_HCl(e.target.value);
                            setKjeldahlVolNaOH_HCl?.(e.target.value);
                          }}
                          placeholder="10.05"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block">T_NaOH (N):</label>
                        <input
                          type="number"
                          step="any"
                          value={localTitoloNaOH}
                          onChange={(e) => {
                            setLocalTitoloNaOH(e.target.value);
                            setKjeldahlTitoloNaOH?.(e.target.value);
                          }}
                          placeholder="0.0995"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-purple-800"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-purple-100 flex items-center justify-between">
                    <div>
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Titolo HCl:</span>
                      <span className="font-mono text-sm font-black text-purple-900">
                        {calcTitoloHCl !== null ? calcTitoloHCl.toFixed(4) : '---'} N
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (calcTitoloHCl !== null) {
                          const valStr = calcTitoloHCl.toFixed(4);
                          setLocalTitoloHCl(valStr);
                          setKjeldahlTitoloHCl?.(valStr);
                        }
                      }}
                      disabled={calcTitoloHCl === null}
                      className="text-[10px] px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold rounded cursor-pointer transition disabled:opacity-50"
                    >
                      ⚡ Usa Titolo HCl in Fase 4
                    </button>
                  </div>
                </div>

                {/* FASE 3: Volume Bianco e Campione */}
                <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-3xs space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-amber-800 uppercase tracking-wide flex items-center gap-1">
                        3️⃣ Titolazione del Distillato
                      </span>
                      <span className="text-[9px] text-amber-600 font-bold">Volumi Reagenti</span>
                    </div>
                    <code className="text-[9.5px] font-mono text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-100 block">
                      ΔV = V_campione - V_bianco
                    </code>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block">Vol. Bianco (mL):</label>
                        <input
                          type="number"
                          step="any"
                          value={localVolBianco}
                          onChange={(e) => {
                            setLocalVolBianco(e.target.value);
                            setKjeldahlVolBianco?.(e.target.value);
                          }}
                          placeholder="0.05"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block">Vol. Campione (mL):</label>
                        <input
                          type="number"
                          step="any"
                          value={localVolCampione}
                          onChange={(e) => {
                            setLocalVolCampione(e.target.value);
                            setKjeldahlVolCampione?.(e.target.value);
                          }}
                          placeholder="12.45"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold text-amber-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-100 flex items-center justify-between">
                    <div>
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Volume Netto (ΔV):</span>
                      <span className="font-mono text-sm font-black text-amber-950">
                        {deltaV.toFixed(2)} mL
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-500 font-medium">Differenza Bianco Reagenti</span>
                  </div>
                </div>

                {/* FASE 4: Calcolo Finale Proteine */}
                <div className="bg-white p-3.5 rounded-xl border border-emerald-300 shadow-3xs space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                        4️⃣ Calcolo Finale Azoto & Proteine %
                      </span>
                      <span className="text-[9px] text-emerald-700 font-bold">Fattore di Conversione</span>
                    </div>
                    <code className="text-[9.5px] font-mono text-emerald-900 bg-emerald-50 p-1.5 rounded border border-emerald-100 block">
                      Proteine % = [(ΔV × N × 1.4007) / Peso] × F
                    </code>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block">Peso Campione (g):</label>
                        <input
                          type="number"
                          step="any"
                          value={localPesoCampione}
                          onChange={(e) => {
                            setLocalPesoCampione(e.target.value);
                            setKjeldahlPesoCampione?.(e.target.value);
                          }}
                          placeholder="1.0500"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block">Fattore F (Kjeldahl):</label>
                        <select
                          value={localFattoreF}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setLocalFattoreF(val);
                            setKjeldahlFattoreF?.(val);
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-semibold cursor-pointer"
                        >
                          <option value={6.25}>6.25 (Standard generale)</option>
                          <option value={5.70}>5.70 (Frumento / Farine)</option>
                          <option value={6.38}>6.38 (Latte e derivati)</option>
                          <option value={5.95}>5.95 (Riso)</option>
                          <option value={5.30}>5.30 (Semi oleosi)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-100 flex items-center justify-between">
                    <div>
                      <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Azoto Totale:</span>
                      <span className="font-mono text-xs font-bold text-slate-700">
                        {calcAzotoPercent !== null ? `${calcAzotoPercent.toFixed(3)} %` : '---'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8.5px] font-bold text-emerald-800 uppercase block">Proteine Grezze:</span>
                      <span className="font-mono text-base font-black text-emerald-700">
                        {calcProteinePercent !== null ? `${calcProteinePercent.toFixed(2)} %` : '---'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIEPILOGO & TRASFERIMENTO RISULTATO KJELDAHL */}
              <div className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                    Risultato Sintetico Calcolato
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-mono font-black text-indigo-950">
                      {calcProteinePercent !== null ? calcProteinePercent.toFixed(2) : '---'}
                    </span>
                    <span className="text-xs font-extrabold text-slate-500 uppercase">
                      {currentVal.unitaMisura || p.unitaMisura || 'g/100g (%)'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 transition cursor-pointer flex items-center gap-1"
                  >
                    <X className="h-4 w-4 text-slate-500" /> Chiudi
                  </button>
                  <button
                    type="button"
                    disabled={calcProteinePercent === null}
                    onClick={() => {
                      if (calcProteinePercent === null) return;
                      const formattedValue = calcProteinePercent.toFixed(2);

                      const completeKjeldahlQuad: QuadernoCalcolo = {
                        formula: "((VC - VB) * N * 1.4007 * F) / P",
                        variabili: [
                          { id: 'kj-vc', simbolo: "VC", descrizione: "Volume titolante per il campione (mL)", valore: Number(localVolCampione) || 0 },
                          { id: 'kj-vb', simbolo: "VB", descrizione: "Volume titolante per il bianco reagenti (mL)", valore: Number(localVolBianco) || 0 },
                          { id: 'kj-n', simbolo: "N", descrizione: "Titolo/Normalità effettiva titolante (N)", valore: Number(localTitoloHCl) || 0.1 },
                          { id: 'kj-f', simbolo: "F", descrizione: `Fattore Kjeldahl (matrice F=${localFattoreF})`, valore: localFattoreF },
                          { id: 'kj-p', simbolo: "P", descrizione: "Peso dell'aliquota di campione pesata (g)", valore: Number(localPesoCampione) || 0 },
                          { id: 'kj-tnaoh', simbolo: "T_NaOH", descrizione: "Titolo NaOH standardizzato con KHP (N)", valore: calcTitoloNaOH !== null ? calcTitoloNaOH.toFixed(4) : String(localTitoloNaOH) },
                          { id: 'kj-ntot', simbolo: "N_tot", descrizione: "Azoto Totale N (% w/w)", valore: calcAzotoPercent !== null ? calcAzotoPercent.toFixed(4) : '' }
                        ],
                        risultatoCalcolato: Number(formattedValue),
                        noteStrumento: noteStrumento.trim() || undefined,
                        tipoCalcolo: 'kjeldahl',
                        kjeldahlData: {
                          massaKHP: localMassaKHP,
                          volNaOH_KHP: localVolNaOH_KHP,
                          titoloNaOH: localTitoloNaOH,
                          volHCl: localVolHCl,
                          volNaOH_HCl: localVolNaOH_HCl,
                          titoloHCl: localTitoloHCl,
                          volBianco: localVolBianco,
                          volCampione: localVolCampione,
                          pesoCampione: localPesoCampione,
                          fattoreF: localFattoreF
                        }
                      };

                      onApplyResult(formattedValue, completeKjeldahlQuad);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition shadow-3xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> 📤 Invia Risultato Proteine al RdP & Salva Quaderno
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'idrocarburi_wizard' && isIdrocarburiOrTHM ? (
            /* ========================================================================= */
            /* SEZIONE 2: ASSISTENTE GRAFICO IDROCARBURI TOTALI / TRIALOMETANI (THM)     */
            /* ========================================================================= */
            <div className="space-y-4 pt-1">
              
              {/* Header Metodo e Riferimento Normativo */}
              <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-4 rounded-xl shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-3 border border-teal-800/60">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">
                      UNI EN ISO 15680 • EPA 524.2 • D.Lgs. 31/2001
                    </span>
                    <span className="bg-emerald-400/20 text-emerald-300 text-[9.5px] uppercase font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                      Regola LOQ/2 & Somma Incertezze
                    </span>
                  </div>
                  <p className="text-xs text-teal-100/90 font-medium">
                    Somma quantitativa dei 4 trialometani con censura del dato analitico: i composti ≤ LOQ contribuiscono con metà limite (LOQ/2) e senza incertezza.
                  </p>
                </div>

                {onOpenIdrocarburiWizard && (
                  <button
                    type="button"
                    onClick={onOpenIdrocarburiWizard}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg border border-white/20 transition cursor-pointer flex items-center gap-1.5 shrink-0"
                    title="Apri calcolatore in finestra popup separata"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-emerald-300" /> Finestra Popup (Modal)
                  </button>
                )}
              </div>

              {/* ========================================================================= */}
              {/* SCHEDA GRAFICA EQUAZIONE SCIENTIFICA (Visual Formula & Distribution)     */}
              {/* ========================================================================= */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-teal-950 text-white p-4 rounded-2xl border border-slate-800 shadow-md space-y-3">
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Equazione formattata ad alto contrasto */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Atom className="h-4 w-4 text-emerald-400" />
                      <span className="text-[10.5px] font-black uppercase tracking-widest text-emerald-400">
                        Equazione di Sommatoria Metrologica
                      </span>
                    </div>

                    <div className="bg-slate-950/80 border border-teal-500/30 rounded-xl p-3 shadow-inner">
                      <div className="flex items-baseline gap-2 flex-wrap font-mono text-sm sm:text-base font-bold text-slate-100">
                        <span className="text-emerald-400 text-base sm:text-lg font-black">C_totale</span>
                        <span className="text-slate-400">=</span>
                        <span className="text-slate-300">∑ (C_i*)</span>
                        <span className="text-slate-400">=</span>
                        <span className="text-sky-300">C_BF*</span>
                        <span className="text-slate-500">+</span>
                        <span className="text-emerald-300">C_CF*</span>
                        <span className="text-slate-500">+</span>
                        <span className="text-indigo-300">C_BDCM*</span>
                        <span className="text-slate-500">+</span>
                        <span className="text-amber-300">C_DBCM*</span>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-800 text-[10.5px] text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                          <span>Se <strong className="text-amber-300">C_i ≤ LOQ_i</strong> ➔ <strong className="text-amber-300">C_i* = LOQ_i / 2</strong></span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <span>Se <strong className="text-emerald-300">C_i &gt; LOQ_i</strong> ➔ <strong className="text-emerald-300">C_i* = C_i</strong></span>
                        </span>
                        <span className="flex items-center gap-1.5 text-indigo-300">
                          <Scale className="h-3 w-3" />
                          <span>Incertezza: <strong>U_tot = ∑ U_i (dei composti ≥ LOQ)</strong></span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Espressione Espansa in Tempo Reale */}
                  <div className="lg:w-80 bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Calcolo Espanso in Tempo Reale
                    </span>
                    <div className="font-mono text-xs text-emerald-200 leading-relaxed break-words bg-black/30 p-2 rounded border border-white/5">
                      {idroResult.composti.map((c, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-slate-500"> + </span>}
                          <span className={c.isBelowLoq ? 'text-amber-300 font-semibold' : 'text-emerald-300 font-bold'}>
                            {c.isBelowLoq ? `(${c.valoreUsatoPerSomma.toFixed(idroPrecision)})` : c.valoreUsatoPerSomma.toFixed(idroPrecision)}
                          </span>
                        </span>
                      ))}
                      <span className="text-slate-400"> = </span>
                      <strong className="text-white font-black text-sm">{idroResult.sommaConcentrazioneFormatted} {currentVal.unitaMisura || p.unitaMisura || 'µg/L'}</strong>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1.5 flex items-center justify-between">
                      <span>Incertezza estesa totale:</span>
                      <span className="font-mono font-bold text-indigo-300">{idroResult.sommaIncertezzaFormatted}</span>
                    </div>
                  </div>
                </div>

                {/* Barra di Distribuzione Proporzionale dei 4 Composti */}
                {idroResult.sommaConcentrazione > 0 && (
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[10.5px] text-slate-300 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Percent className="h-3 w-3 text-teal-400" />
                        <span>Ripartizione percentuale dei singoli composti nella concentrazione totale:</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {idroResult.quantiSottoLoq} a LOQ/2 • {idroResult.quantiSopraLoq} misurati
                      </span>
                    </div>

                    <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-700/80 shadow-inner">
                      {idroResult.composti.map((comp, idx) => {
                        const pct = (comp.valoreUsatoPerSomma / idroResult.sommaConcentrazione) * 100;
                        const cfg = COMPOSTI_IDROCARBURI_TOTALI[idx];
                        return (
                          <div
                            key={idx}
                            style={{ width: `${pct}%` }}
                            className={`h-full ${cfg.coloreTheme.barColor} transition-all duration-300`}
                            title={`${comp.nome}: ${comp.valoreUsatoPerSomma.toFixed(idroPrecision)} (${pct.toFixed(1)}%)`}
                          />
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5 text-[9.5px]">
                      {idroResult.composti.map((comp, idx) => {
                        const pct = (comp.valoreUsatoPerSomma / idroResult.sommaConcentrazione) * 100;
                        const cfg = COMPOSTI_IDROCARBURI_TOTALI[idx];
                        return (
                          <div key={idx} className="flex items-center justify-between bg-slate-950/60 px-2 py-1 rounded border border-slate-800 text-slate-300">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className={`w-2 h-2 rounded-full ${cfg.coloreTheme.dot}`}></span>
                              <span className="truncate font-semibold">{comp.nome}</span>
                            </div>
                            <span className="font-mono text-white font-bold pl-1">{pct.toFixed(1)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* Barra comandi sopra le schede: selettore vista e precisione */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Visualizzazione:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-white">
                    <button
                      type="button"
                      onClick={() => setIdroViewMode('cards')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                        idroViewMode === 'cards'
                          ? 'bg-teal-700 text-white shadow-3xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" /> Schede Chimiche
                    </button>
                    <button
                      type="button"
                      onClick={() => setIdroViewMode('table')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                        idroViewMode === 'table'
                          ? 'bg-teal-700 text-white shadow-3xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <TableIcon className="h-3.5 w-3.5" /> Tabella Dati
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Decimali:</span>
                  <select
                    value={idroPrecision}
                    onChange={(e) => setIdroPrecision(Number(e.target.value))}
                    className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-teal-500"
                  >
                    <option value={2}>2 decimali (0.00)</option>
                    <option value={3}>3 decimali (0.000)</option>
                    <option value={4}>4 decimali (0.0000)</option>
                  </select>
                </div>
              </div>

              {/* VISTA A SCHEDE O TABELLARE DEI 4 COMPOSTI */}
              {idroViewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {idroComposti.map((c, idx) => {
                    const compCalc = idroResult.composti[idx];
                    const meta = COMPOSTI_IDROCARBURI_TOTALI[idx];

                    return (
                      <div
                        key={c.key}
                        className={`rounded-xl border transition-all duration-200 shadow-2xs overflow-hidden flex flex-col justify-between ${
                          c.isBelowLoq
                            ? 'bg-amber-50/20 border-amber-200/80 hover:border-amber-300'
                            : 'bg-white border-slate-200 hover:border-teal-300'
                        }`}
                      >
                        {/* Header Card con nome e formula */}
                        <div className={`p-3 border-b flex items-start justify-between gap-2 ${
                          c.isBelowLoq ? 'bg-amber-100/40 border-amber-200/80' : 'bg-slate-50/80 border-slate-100'
                        }`}>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${meta.coloreTheme.dot}`}></span>
                              <span className="text-xs font-black text-slate-900">{c.nome}</span>
                              <span className={`text-[10.5px] font-mono font-bold px-1.5 py-0.5 rounded border ${meta.coloreTheme.badge}`}>
                                {c.formulaMolecolare}
                              </span>
                            </div>
                            <span className="text-[9.5px] text-slate-500 pl-4.5 block mt-0.5">
                              CAS: {c.cas}
                            </span>
                          </div>

                          <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            c.isBelowLoq
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          }`}>
                            {c.isBelowLoq ? '≤ LOQ (LOQ/2)' : 'Quantificato'}
                          </span>
                        </div>

                        {/* Corpo Card con Switch e Inputs */}
                        <div className="p-3 space-y-2.5 flex-1">
                          {/* Switch a 2 pulsanti */}
                          <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                            <button
                              type="button"
                              onClick={() => handleIdroSetBelowLoq(idx, true)}
                              className={`py-1 px-1.5 rounded-md text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                                c.isBelowLoq
                                  ? 'bg-amber-500 text-white shadow-3xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <ShieldCheck className="h-3 w-3" />
                              <span>≤ LOQ (LOQ/2)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleIdroSetBelowLoq(idx, false)}
                              className={`py-1 px-1.5 rounded-md text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                                !c.isBelowLoq
                                  ? 'bg-emerald-600 text-white shadow-3xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Check className="h-3 w-3" />
                              <span>≥ LOQ (Misurato)</span>
                            </button>
                          </div>

                          {/* Inputs LOQ, Valore, Incertezza */}
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-slate-500 block mb-0.5">
                                LOQ ({c.unita}):
                              </label>
                              <input
                                type="text"
                                value={c.loq}
                                onChange={(e) => handleIdroUpdateLoq(idx, e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 bg-white rounded-md text-xs font-mono font-bold text-slate-800"
                              />
                            </div>

                            <div>
                              <label className="text-[9px] font-bold text-slate-500 block mb-0.5">
                                Valore Letto:
                              </label>
                              {c.isBelowLoq ? (
                                <div className="px-1.5 py-1 bg-amber-50 border border-amber-300 rounded-md text-xs font-mono font-black text-amber-900 text-center">
                                  ≤ {(c.loq || '0.01').replace(/^[<≤=]+\s*/, '')}
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  value={c.valore}
                                  onChange={(e) => handleIdroUpdateValore(idx, e.target.value)}
                                  className="w-full px-2 py-1 border border-emerald-300 bg-emerald-50/50 rounded-md text-xs font-mono font-black text-emerald-950"
                                />
                              )}
                            </div>

                            <div>
                              <label className="text-[9px] font-bold text-slate-500 block mb-0.5">
                                Incertezza (±):
                              </label>
                              {c.isBelowLoq ? (
                                <div className="px-1 py-1 bg-slate-100 border border-slate-200 rounded-md text-[9px] text-slate-400 font-medium italic text-center truncate">
                                  Non app.
                                </div>
                              ) : (
                                <div className="relative">
                                  <span className="absolute left-1.5 top-1 text-[11px] text-slate-400 font-bold">±</span>
                                  <input
                                    type="text"
                                    value={c.incertezza}
                                    onChange={(e) => handleIdroUpdateIncertezza(idx, e.target.value)}
                                    className="w-full pl-4 pr-1.5 py-1 border border-slate-300 bg-white rounded-md text-xs font-mono font-bold text-slate-800"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Contributo effettivo calcolato */}
                          <div className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${
                            c.isBelowLoq ? 'bg-amber-100/50 border-amber-200' : 'bg-emerald-50/60 border-emerald-200'
                          }`}>
                            <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                              {c.isBelowLoq ? `LOQ/2 (${c.loq}/2):` : 'Misurato (≥ LOQ):'}
                            </span>
                            <div className="font-mono">
                              <span className={`text-sm font-black ${c.isBelowLoq ? 'text-amber-950' : 'text-emerald-950'}`}>
                                {compCalc?.valoreUsatoPerSomma.toFixed(idroPrecision)}
                              </span>
                              <span className="text-[10px] text-slate-500 ml-1">{c.unita}</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              ) : (
                /* VISTA TABELLARE */
                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[9.5px] font-black uppercase tracking-wider">
                        <th className="py-2 px-3">Composto Chimico</th>
                        <th className="py-2 px-3 w-36">Stato Analitico</th>
                        <th className="py-2 px-3 w-28">LOQ ({currentVal.unitaMisura || p.unitaMisura || 'µg/L'})</th>
                        <th className="py-2 px-3 w-32">Valore Letto</th>
                        <th className="py-2 px-3 w-32">Contributo Somma</th>
                        <th className="py-2 px-3 w-32">Incertezza (±)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {idroComposti.map((c, idx) => {
                        const compCalc = idroResult.composti[idx];
                        const meta = COMPOSTI_IDROCARBURI_TOTALI[idx];
                        return (
                          <tr key={c.key} className={c.isBelowLoq ? "bg-amber-50/30" : ""}>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${meta.coloreTheme.dot}`}></span>
                                <span>{c.nome}</span>
                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${meta.coloreTheme.badge}`}>
                                  {c.formulaMolecolare}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <button
                                type="button"
                                onClick={() => handleIdroToggleBelowLoq(idx)}
                                className={`w-full px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                                  c.isBelowLoq
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                }`}
                              >
                                {c.isBelowLoq ? (
                                  <><ShieldCheck className="h-3 w-3 text-amber-700" /> ≤ LOQ (LOQ/2)</>
                                ) : (
                                  <><Check className="h-3 w-3 text-emerald-700" /> ≥ LOQ</>
                                )}
                              </button>
                            </td>
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                value={c.loq}
                                onChange={(e) => handleIdroUpdateLoq(idx, e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono font-semibold"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              {c.isBelowLoq ? (
                                <div className="px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs font-mono font-bold text-amber-800 text-center">
                                  ≤ {(c.loq || '0.01').replace(/^[<≤=]+\s*/, '')}
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  value={c.valore}
                                  onChange={(e) => handleIdroUpdateValore(idx, e.target.value)}
                                  className="w-full px-2 py-1 border border-emerald-300 bg-emerald-50/40 rounded text-xs font-mono font-bold text-emerald-900"
                                />
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono">
                              <span className={`font-black ${c.isBelowLoq ? 'text-amber-800' : 'text-emerald-900'}`}>
                                {compCalc?.valoreUsatoPerSomma.toFixed(idroPrecision)}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {c.isBelowLoq ? (
                                <span className="text-[10px] text-slate-400 italic">Non applicabile</span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400 font-bold">±</span>
                                  <input
                                    type="text"
                                    value={c.incertezza}
                                    onChange={(e) => handleIdroUpdateIncertezza(idx, e.target.value)}
                                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                                  />
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Box Risultati Calcolati e Invio al RdP */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 rounded-xl border border-teal-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-6 flex-wrap">
                  {/* Somma Concentrazione */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 block mb-0.5">
                      Concentrazione Totale Sommata:
                    </span>
                    <div className="flex items-baseline gap-1.5 font-mono">
                      <span className="text-2xl sm:text-3xl font-black text-emerald-950">
                        {idroResult.sommaConcentrazioneFormatted}
                      </span>
                      <span className="text-xs font-bold text-slate-600">
                        {currentVal.unitaMisura || p.unitaMisura || 'µg/L'}
                      </span>
                    </div>
                  </div>

                  {/* Somma Incertezza */}
                  <div className="border-l border-teal-200/80 pl-4 sm:pl-6">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900 block mb-0.5">
                      Incertezza Estesa Totale (± U):
                    </span>
                    <div className="flex items-baseline gap-1.5 font-mono">
                      <span className="text-2xl sm:text-3xl font-black text-indigo-950">
                        {idroResult.sommaIncertezzaFormatted}
                      </span>
                      {idroResult.sommaIncertezza > 0 && (
                        <span className="text-xs font-bold text-slate-600">
                          {currentVal.unitaMisura || p.unitaMisura || 'µg/L'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 transition shadow-3xs cursor-pointer"
                  >
                    Chiudi
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const completeIdroQuad: QuadernoCalcolo = {
                        formula: "Somma(Bromoformio, Cloroformio, Bromodiclorometano, Dibromoclorometano) [LOQ/2 se ≤ LOQ; Somma Incertezze solo composti >= LOQ]",
                        variabili: idroComposti.map(c => {
                          const cleanLoq = (c.loq || '').replace(/^[<≤=]+\s*/, '') || c.loq;
                          return {
                            id: `comp_${c.key}`,
                            simbolo: c.nome.substring(0, 4).toUpperCase(),
                            descrizione: `${c.nome} (${c.formulaMolecolare}, LOQ: ${cleanLoq} ${c.unita}) - ${c.isBelowLoq ? 'Sotto LOQ (usato LOQ/2)' : 'Quantificato'}`,
                            valore: c.isBelowLoq ? `≤ ${cleanLoq}` : c.valore
                          };
                        }),
                        risultatoCalcolato: idroResult.sommaConcentrazione,
                        noteStrumento: noteStrumento.trim() || undefined,
                        tipoCalcolo: 'idrocarburi_totali'
                      };

                      onApplyResult(idroResult.sommaConcentrazioneFormatted, completeIdroQuad, idroResult.sommaIncertezzaFormatted);

                      if (onUpdateMultipleRisultati) {
                        const compUpdates: Record<string, Partial<RisultatoProva>> = {};
                        idroComposti.forEach(c => {
                          if (c.provaIdCorrispondente) {
                            const cleanLoq = (c.loq || '').replace(/^[<≤=]+\s*/, '') || c.loq;
                            compUpdates[c.provaIdCorrispondente] = {
                              valoreRilevato: c.isBelowLoq ? `≤ ${cleanLoq}` : c.valore,
                              incertezza: c.isBelowLoq ? 'N/D' : (c.incertezza ? `± ${c.incertezza}` : '0')
                            };
                          }
                        });
                        if (Object.keys(compUpdates).length > 0) {
                          onUpdateMultipleRisultati(compUpdates);
                        }
                      }
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs rounded-lg transition shadow-3xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="h-4 w-4" /> 📤 Invia Risultato Idrocarburi al RdP & Salva Quaderno
                  </button>
                </div>
              </div>

            </div>
          ) : (
            /* ========================================================================= */
            /* SEZIONE 2: CALCOLATORE ARITMETICO DINAMICO GENERALE                       */
            /* ========================================================================= */
            <div className="space-y-4 pt-1">
              
              {/* RIGA 1: FORMULA EDITABILE DAL VIVO */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-indigo-150 shadow-2xs space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-indigo-700 shrink-0" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                      Formula Aritmetica di Calcolo
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowFormulaHelp(!showFormulaHelp)}
                      className="text-slate-400 hover:text-indigo-600 transition"
                      title="Aiuto sintassi formula"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                    {p.formulaCalcolo && (
                      <span className="text-[10px] bg-emerald-100/90 text-emerald-900 border border-emerald-300/80 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                        <span>🔗 Formula associata alla prova</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Input Formula con auto-sync */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={formula}
                      onChange={(e) => handleFormulaChange(e.target.value)}
                      placeholder="es. ((VC - VB) * N * 1.4007 * F) / P oppure (A - B) / (A - C) * 100"
                      className="w-full bg-white border border-indigo-300 rounded-lg pl-3 pr-24 py-1.5 font-mono text-xs font-bold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      {evalResult.error ? (
                        <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          Errore sintassi
                        </span>
                      ) : formula.trim() ? (
                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          ✓ Valida
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncVariablesFromFormula}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-lg text-xs font-bold shadow-3xs transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    title="Estrae automaticamente tutte le variabili dalla formula senza cancellare i valori già inseriti"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-indigo-600" />
                    <span>⚡ Sincronizza Variabili</span>
                  </button>
                </div>

                {showFormulaHelp && (
                  <div className="p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100 text-[10px] text-slate-600 space-y-1">
                    <span className="font-bold text-indigo-900 block">Guida alla scrittura delle formule:</span>
                    <p>Puoi usare operatori aritmetici standard (<code className="font-bold">+</code>, <code className="font-bold">-</code>, <code className="font-bold">*</code>, <code className="font-bold">/</code>), parentesi <code className="font-bold">( )</code> e numeri con virgola o punto decimale (es. <code className="font-bold">1.4007</code>).</p>
                    <p>Tutti i simboli alfabetici (es. <code className="font-bold">V1</code>, <code className="font-bold">Peso</code>, <code className="font-bold">A</code>) vengono riconosciuti come variabili del quaderno di laboratorio.</p>
                  </div>
                )}
              </div>

              {/* RIGA 2: VARIABILI DI CALCOLO EDITABILI */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10.5px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      Variabili del Quaderno ({variables.length})
                    </span>
                    {isIdrocarburiOrTHM && (
                      <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-teal-600" />
                        Auto-compilazione LOQ/2 attiva
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isIdrocarburiOrTHM && onOpenIdrocarburiWizard && (
                      <button
                        type="button"
                        onClick={onOpenIdrocarburiWizard}
                        className="flex items-center gap-1 text-[10px] font-bold text-teal-900 bg-teal-100 hover:bg-teal-200 px-2.5 py-1 rounded-lg border border-teal-300 transition cursor-pointer shadow-3xs"
                        title="Apri Assistente Calcolo Idrocarburi Totali"
                      >
                        <FlaskConical className="h-3 w-3 text-teal-700" />
                        <span>🧪 Assistente Idrocarburi</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddVariable}
                      className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:text-indigo-950 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Aggiungi Parametro
                    </button>
                  </div>
                </div>

                {isIdrocarburiOrTHM && (
                  <div className="p-2.5 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl flex items-center justify-between gap-3 text-teal-950 text-xs shadow-3xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-teal-600 shrink-0" />
                      <div>
                        <span className="font-bold block text-teal-900">Valori inseriti in automatico dai singoli idrocarburi del campione</span>
                        <span className="text-[11px] text-teal-700">I composti ≤ LOQ o non rilevati sono inseriti con la regola LOQ/2 (metà limite di quantificazione).</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVariables(prev => prev.map((v, i) => {
                          const compKey = getCompoundKeyForVariable(v.simbolo, v.descrizione, i);
                          if (compKey) {
                            return { ...v, valore: getHydrocarbonValueForCompound(compKey).valore };
                          }
                          return v;
                        }));
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-teal-800 bg-white hover:bg-teal-100 border border-teal-300 rounded-lg shadow-3xs transition shrink-0 cursor-pointer"
                      title="Ricarica i valori aggiornati dai risultati dei singoli idrocarburi"
                    >
                      ⚡ Ricarica Valori
                    </button>
                  </div>
                )}

                {variables.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                    Nessuna variabile definita. Scrivi una formula sopra e clicca su <strong className="text-indigo-800">"⚡ Sincronizza Variabili"</strong>.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {variables.map((v, vIdx) => {
                      const compKey = isIdrocarburiOrTHM ? getCompoundKeyForVariable(v.simbolo, v.descrizione, vIdx) : null;
                      const compData = compKey ? getHydrocarbonValueForCompound(compKey) : null;

                      return (
                        <div key={v.id || v.simbolo + vIdx} className={`flex flex-col gap-1.5 bg-white p-3 rounded-xl border shadow-3xs transition-colors ${compData ? 'border-teal-200 hover:border-teal-400' : 'border-slate-200 hover:border-indigo-300'}`}>
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              <span className={`font-mono font-black px-2 py-0.5 rounded border text-xs ${compData ? 'text-teal-950 bg-teal-50 border-teal-200' : 'text-indigo-950 bg-indigo-50 border-indigo-150'}`}>
                                {v.simbolo}
                              </span>
                              <input
                                type="text"
                                value={v.descrizione}
                                onChange={(e) => handleUpdateVariable(vIdx, 'descrizione', e.target.value)}
                                placeholder="Descrizione..."
                                className="text-[10.5px] font-semibold text-slate-700 truncate bg-transparent hover:bg-slate-50 focus:bg-white border-b border-transparent focus:border-indigo-400 focus:outline-none flex-1"
                                title={v.descrizione}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveVariable(vIdx)}
                              className="text-slate-300 hover:text-red-600 transition p-1 cursor-pointer"
                              title="Rimuovi questa variabile"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>

                          <div>
                            <input
                              type="number"
                              step="any"
                              value={v.valore}
                              onChange={(e) => handleUpdateVariable(vIdx, 'valore', e.target.value)}
                              placeholder="Inserisci valore numerico..."
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                            />
                          </div>

                          {compData && (
                            <div className="text-[10px] text-teal-800 bg-teal-50/70 border border-teal-100 px-2 py-0.5 rounded font-medium flex items-center justify-between">
                              <span>Origine campione:</span>
                              <span className="font-bold">
                                {compData.isBelow ? `≤ ${compData.loqStr} (usato LOQ/2 = ${compData.valore})` : `Misurato = ${compData.valore}`}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RIGA 4: RISULTATO COMPUTAZIONE E INVIO AL RDP */}
              <div className="bg-white p-4 rounded-xl border border-indigo-150 shadow-3xs space-y-2.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                  Risultato Calcolatore LIMS
                </span>

                {evalResult.error ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="text-[11px] font-bold text-amber-900 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>⚠️ {evalResult.error}</span>
                      </div>
                      <span className="block text-[10px] font-normal text-amber-800 mt-0.5">
                        Verifica che tutte le variabili abbiano un valore e che la sintassi aritmetica sia bilanciata.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 transition shadow-3xs cursor-pointer flex items-center justify-center gap-1 self-end sm:self-auto"
                    >
                      <X className="h-4 w-4 text-slate-500" /> Chiudi Quaderno
                    </button>
                  </div>
                ) : evalResult.value !== null ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-baseline gap-2">
                      <div className="text-2xl font-mono font-black text-indigo-950 bg-indigo-50/60 px-3 py-1 rounded-lg border border-indigo-100 inline-block">
                        {evalResult.value !== 0 && Math.abs(evalResult.value) < 0.0001
                          ? evalResult.value.toFixed(8).replace(/\.?0+$/, '')
                          : evalResult.value.toFixed(6).replace(/\.?0+$/, '')}
                      </div>
                      <span className="text-xs text-slate-500 font-sans font-extrabold uppercase">
                        {currentVal.unitaMisura || p.unitaMisura || ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 transition shadow-3xs cursor-pointer flex items-center justify-center gap-1"
                      >
                        <X className="h-4 w-4 text-slate-500" /> Chiudi
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const formattedValue = evalResult.value !== 0 && Math.abs(evalResult.value) < 0.0001
                            ? evalResult.value.toFixed(8).replace(/\.?0+$/, '')
                            : evalResult.value.toFixed(6).replace(/\.?0+$/, '');

                          const finalQuad: QuadernoCalcolo = {
                            formula,
                            variabili: variables,
                            risultatoCalcolato: evalResult.value !== null ? evalResult.value : undefined,
                            noteStrumento: noteStrumento.trim() || undefined,
                            tipoCalcolo: 'generico'
                          };

                          onApplyResult(formattedValue, finalQuad);
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg transition shadow-3xs cursor-pointer flex items-center justify-center gap-1.5"
                        title="Trasferisce il valore calcolato nella riga della prova del campione"
                      >
                        <Check className="h-4 w-4" /> 📤 Invia Risultato al Rapporto di Prova
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-[11px] text-slate-400 italic">
                      Inserisci i valori delle variabili per eseguire il calcolo automatico...
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 transition shadow-3xs cursor-pointer flex items-center justify-center gap-1 self-end sm:self-auto"
                    >
                      <X className="h-4 w-4 text-slate-500" /> Chiudi Quaderno
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </td>
    </tr>
  );
};
