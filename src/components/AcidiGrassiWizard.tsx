import React, { useState, useMemo } from 'react';
import { 
  FAME_37_MASTER_LIST, 
  calcolaProfiloAcidiGrassi, 
  getInitialFAMEState,
  ClasseAcidoGrasso
} from '../utils/acidiGrassi';
import { 
  FlaskConical, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Layers, 
  CheckCircle2, 
  Info,
  Sliders,
  ChevronDown,
  Calculator,
  ChevronUp,
  Scale,
  Percent
} from 'lucide-react';

export interface StandardReferenceItem {
  numero: number;
  mi: number;
  areaStd: number;
  fPrime?: number;
}

interface AcidiGrassiWizardProps {
  provaNome?: string;
  provaMetodo?: string;
  allProveCampione?: any[];
  standardAcidiGrassi?: StandardReferenceItem[];
  opzioniReportDefault?: {
    reportSaturi?: boolean;
    reportMonoinsaturi?: boolean;
    reportPolinsaturi?: boolean;
  };
  existingData?: any;
  onApplyResults: (data: {
    valoreRilevato: string;
    incertezza?: string;
    quadernoData: {
      formula: string;
      tipoCalcolo: string;
      noteStrumento: string;
      variabili: { id: string; simbolo: string; descrizione: string; valore: any }[];
      acidiGrassiDettaglio: any;
    };
    relatedUpdates?: Record<string, { valoreRilevato: string; incertezza?: string }>;
  }) => void;
  onClose?: () => void;
}

export const AcidiGrassiWizard: React.FC<AcidiGrassiWizardProps> = ({
  provaNome = 'Composizione Acidi Grassi',
  provaMetodo = 'UNI EN ISO 12966-2 / UNI EN ISO 12966-4',
  allProveCampione = [],
  standardAcidiGrassi,
  opzioniReportDefault,
  existingData,
  onApplyResults,
  onClose
}) => {
  // Stato toggle per visualizzare i dettagli dello Standard di Riferimento (Area 1)
  const [showStandardDetails, setShowStandardDetails] = useState<boolean>(false);

  // Selezione frazioni da riportare nel Rapporto di Prova (RdP)
  const [reportSaturi, setReportSaturi] = useState<boolean>(() => {
    if (existingData?.reportSaturi !== undefined) return !!existingData.reportSaturi;
    if (existingData?.classiSelezionateRdP?.saturi !== undefined) return !!existingData.classiSelezionateRdP.saturi;
    if (opzioniReportDefault?.reportSaturi !== undefined) return !!opzioniReportDefault.reportSaturi;
    return true;
  });

  const [reportMonoinsaturi, setReportMonoinsaturi] = useState<boolean>(() => {
    if (existingData?.reportMonoinsaturi !== undefined) return !!existingData.reportMonoinsaturi;
    if (existingData?.classiSelezionateRdP?.monoinsaturi !== undefined) return !!existingData.classiSelezionateRdP.monoinsaturi;
    if (opzioniReportDefault?.reportMonoinsaturi !== undefined) return !!opzioniReportDefault.reportMonoinsaturi;
    return true;
  });

  const [reportPolinsaturi, setReportPolinsaturi] = useState<boolean>(() => {
    if (existingData?.reportPolinsaturi !== undefined) return !!existingData.reportPolinsaturi;
    if (existingData?.classiSelezionateRdP?.polinsaturi !== undefined) return !!existingData.classiSelezionateRdP.polinsaturi;
    if (opzioniReportDefault?.reportPolinsaturi !== undefined) return !!opzioniReportDefault.reportPolinsaturi;
    return true;
  });

  // Inizializza i 37 FAME combinando i parametri dello standard (Area 1) e le aree campione (Area 2)
  const [itemsData, setItemsData] = useState(() => {
    // 1. Mappa standard da Area 1 (se definita sulla prova, altrimenti nominale)
    const stdMap = new Map<number, { mi: number; areaStd: number }>();
    if (standardAcidiGrassi && standardAcidiGrassi.length === 37) {
      standardAcidiGrassi.forEach(s => stdMap.set(s.numero, { mi: s.mi, areaStd: s.areaStd }));
    } else {
      FAME_37_MASTER_LIST.forEach(def => stdMap.set(def.numero, { mi: def.miDefault, areaStd: def.areaStdDefault }));
    }

    // 2. Mappa aree campione esistenti nel quaderno
    const existingAreaMap = new Map<number, number>();
    if (existingData?.items && Array.isArray(existingData.items)) {
      existingData.items.forEach((it: any) => {
        const num = it.num || it.numero;
        const area = it.area || it.areaCampione || 0;
        if (num) existingAreaMap.set(num, area);
      });
    }

    return FAME_37_MASTER_LIST.map(def => {
      const std = stdMap.get(def.numero) || { mi: def.miDefault, areaStd: def.areaStdDefault };
      const campArea = existingAreaMap.has(def.numero) 
        ? (existingAreaMap.get(def.numero) || 0) 
        : (def.areaCampioneDefault || 0);

      return {
        numero: def.numero,
        mi: std.mi,
        areaStd: std.areaStd,
        areaCampione: campArea
      };
    });
  });

  const [grassoTotale, setGrassoTotale] = useState<number | ''>(() => {
    if (existingData?.grassoTotale) return existingData.grassoTotale;
    return 14.2;
  });
  const [useGrassoTotale, setUseGrassoTotale] = useState<boolean>(() => !!existingData?.grassoTotale);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Calcolo dinamico in tempo reale (Area 2 su parametri Area 1)
  const result = useMemo(() => {
    return calcolaProfiloAcidiGrassi(
      itemsData, 
      useGrassoTotale && typeof grassoTotale === 'number' && grassoTotale > 0 ? grassoTotale : undefined
    );
  }, [itemsData, grassoTotale, useGrassoTotale]);

  // Calcolo stringa dinamica anteprima per il Rapporto di Prova (RdP)
  const computedRdpString = useMemo(() => {
    const parts: string[] = [];
    const isGrasso = useGrassoTotale && typeof grassoTotale === 'number' && grassoTotale > 0 && result.gSaturi100g !== undefined;

    if (reportSaturi) {
      if (isGrasso) {
        parts.push(`Saturi: ${result.gSaturi100g?.toFixed(2)} g/100g`);
      } else {
        parts.push(`Saturi: ${result.percentualeSaturi.toFixed(2)} %`);
      }
    }

    if (reportMonoinsaturi) {
      if (isGrasso) {
        parts.push(`Monoinsaturi: ${result.gMonoinsaturi100g?.toFixed(2)} g/100g`);
      } else {
        parts.push(`Monoinsaturi: ${result.percentualeMonoinsaturi.toFixed(2)} %`);
      }
    }

    if (reportPolinsaturi) {
      if (isGrasso) {
        parts.push(`Polinsaturi: ${result.gPolinsaturi100g?.toFixed(2)} g/100g`);
      } else {
        parts.push(`Polinsaturi: ${result.percentualePolinsaturi.toFixed(2)} %`);
      }
    }

    if (parts.length === 0) {
      return '(Nessuna frazione selezionata da riportare nel RdP)';
    }

    return parts.join(' | ');
  }, [result, reportSaturi, reportMonoinsaturi, reportPolinsaturi, useGrassoTotale, grassoTotale]);

  // Aggiornamento manuale singola area campione
  const handleUpdateSampleArea = (numero: number, val: number) => {
    setItemsData(prev => prev.map(it => it.numero === numero ? { ...it, areaCampione: val } : it));
  };

  // Carica i dati di esempio per test rapidi
  const handleLoadSampleDefaults = () => {
    setItemsData(prev => prev.map(it => {
      const def = FAME_37_MASTER_LIST[it.numero - 1];
      return {
        ...it,
        areaCampione: def.areaCampioneDefault || 0
      };
    }));
    setFeedbackMsg('✅ Aree di esempio del Campione caricate nelle 37 righe.');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Azzera tutte le 37 aree del campione
  const handleClearSampleAreas = () => {
    setItemsData(prev => prev.map(it => ({ ...it, areaCampione: 0 })));
    setFeedbackMsg('🧹 Aree campione azzerate. Digita i conteggi integrali del cromatogramma.');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Quick preset selezioni per RdP
  const handleSetReportPreset = (preset: 'all' | 'saturi' | 'mono' | 'poli' | 'insaturi') => {
    switch (preset) {
      case 'all':
        setReportSaturi(true);
        setReportMonoinsaturi(true);
        setReportPolinsaturi(true);
        break;
      case 'saturi':
        setReportSaturi(true);
        setReportMonoinsaturi(false);
        setReportPolinsaturi(false);
        break;
      case 'mono':
        setReportSaturi(false);
        setReportMonoinsaturi(true);
        setReportPolinsaturi(false);
        break;
      case 'poli':
        setReportSaturi(false);
        setReportMonoinsaturi(false);
        setReportPolinsaturi(true);
        break;
      case 'insaturi':
        setReportSaturi(false);
        setReportMonoinsaturi(true);
        setReportPolinsaturi(true);
        break;
    }
  };

  // Applica al RdP e salva il Quaderno di Laboratorio
  const handleSaveAndApply = () => {
    if (!reportSaturi && !reportMonoinsaturi && !reportPolinsaturi) {
      setFeedbackMsg('⚠️ Seleziona almeno una frazione (Saturi, Monoinsaturi o Polinsaturi) da riportare nel Rapporto di Prova.');
      setTimeout(() => setFeedbackMsg(null), 4000);
      return;
    }

    const sfaStr = `${result.percentualeSaturi.toFixed(2)}%`;
    const mufaStr = `${result.percentualeMonoinsaturi.toFixed(2)}%`;
    const pufaStr = `${result.percentualePolinsaturi.toFixed(2)}%`;

    const mainResult = computedRdpString;

    // Riconoscimento automatico delle altre prove nutrizionali nel campione
    const relatedUpdates: Record<string, { valoreRilevato: string; incertezza?: string }> = {};

    allProveCampione.forEach(otherProva => {
      const oNome = (otherProva.nome || '').toLowerCase();
      if (reportSaturi && oNome.includes('satur') && !oNome.includes('mono') && !oNome.includes('poli')) {
        const val = useGrassoTotale && result.gSaturi100g !== undefined
          ? `${result.gSaturi100g.toFixed(2)} g/100g`
          : `${result.percentualeSaturi.toFixed(2)} %`;
        relatedUpdates[otherProva.id] = { valoreRilevato: val };
      } else if (reportMonoinsaturi && oNome.includes('monoinsatur')) {
        const val = useGrassoTotale && result.gMonoinsaturi100g !== undefined
          ? `${result.gMonoinsaturi100g.toFixed(2)} g/100g`
          : `${result.percentualeMonoinsaturi.toFixed(2)} %`;
        relatedUpdates[otherProva.id] = { valoreRilevato: val };
      } else if (reportPolinsaturi && oNome.includes('polinsatur')) {
        const val = useGrassoTotale && result.gPolinsaturi100g !== undefined
          ? `${result.gPolinsaturi100g.toFixed(2)} g/100g`
          : `${result.percentualePolinsaturi.toFixed(2)} %`;
        relatedUpdates[otherProva.id] = { valoreRilevato: val };
      }
    });

    onApplyResults({
      valoreRilevato: mainResult,
      quadernoData: {
        formula: "FAME 37 (F'i = Fi/F_c16, Ai_corr = F'i*Ai, % = Ai_corr/Totale*100)",
        tipoCalcolo: 'acidi_grassi',
        noteStrumento: `Profilo Acidi Grassi FAME 37 GC-FID: Area Corr Totale = ${result.totaleAreaCorretta.toLocaleString('it-IT')} | Riportati in RdP: ${[reportSaturi && `Saturi (${sfaStr})`, reportMonoinsaturi && `Monoinsaturi (${mufaStr})`, reportPolinsaturi && `Polinsaturi (${pufaStr})`].filter(Boolean).join(', ')} ${useGrassoTotale ? `(su grasso totale ${grassoTotale} g/100g)` : ''}`,
        variabili: [
          { id: 'v_sfa', simbolo: 'SFA', descrizione: 'Acidi Grassi Saturi (%)', valore: result.percentualeSaturi.toFixed(2) },
          { id: 'v_mufa', simbolo: 'MUFA', descrizione: 'Acidi Grassi Monoinsaturi (%)', valore: result.percentualeMonoinsaturi.toFixed(2) },
          { id: 'v_pufa', simbolo: 'PUFA', descrizione: 'Acidi Grassi Polinsaturi (%)', valore: result.percentualePolinsaturi.toFixed(2) },
          { id: 'v_tot_corr', simbolo: 'A_CORR', descrizione: 'Somma Aree Corrette GC-FID', valore: Math.round(result.totaleAreaCorretta) }
        ],
        acidiGrassiDettaglio: {
          totaleMiStd: result.totaleMiStd,
          totaleAreaStd: result.totaleAreaStd,
          totaleAreaCampione: result.totaleAreaCampione,
          totaleAreaCorretta: result.totaleAreaCorretta,
          percentualeSaturi: result.percentualeSaturi,
          percentualeMonoinsaturi: result.percentualeMonoinsaturi,
          percentualePolinsaturi: result.percentualePolinsaturi,
          reportSaturi: reportSaturi,
          reportMonoinsaturi: reportMonoinsaturi,
          reportPolinsaturi: reportPolinsaturi,
          classiSelezionateRdP: {
            saturi: reportSaturi,
            monoinsaturi: reportMonoinsaturi,
            polinsaturi: reportPolinsaturi
          },
          grassoTotale: useGrassoTotale ? grassoTotale : null,
          gSaturi100g: result.gSaturi100g,
          gMonoinsaturi100g: result.gMonoinsaturi100g,
          gPolinsaturi100g: result.gPolinsaturi100g,
          items: result.items.map(it => ({
            num: it.numero,
            nome: it.nome,
            sigla: it.sigla,
            classe: it.classe,
            fPrime: it.fPrime,
            area: it.areaCampione,
            areaCorr: it.areaCorretta,
            pct: it.valorePercentuale
          }))
        }
      },
      relatedUpdates
    });
  };

  const renderClasseBadge = (classe: ClasseAcidoGrasso) => {
    switch (classe) {
      case 'saturo':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">Saturo</span>;
      case 'monoinsaturo':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Monoinsaturo</span>;
      case 'polinsaturo':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">Polinsaturo</span>;
    }
  };

  return (
    <div className="bg-white border border-indigo-200 rounded-2xl p-4 md:p-6 shadow-sm space-y-5 animate-fadeIn">
      {/* Header Banner - Area 2 Campione Analitico */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-amber-950 text-white p-4 rounded-xl shadow-md border border-indigo-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-emerald-500 text-emerald-950 text-[10px] font-black uppercase tracking-wider">
              Area 2 • Campione Analitico
            </span>
            <span className="text-xs text-indigo-200 font-mono font-bold">
              {provaMetodo}
            </span>
          </div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-amber-400 shrink-0" />
            Quaderno Analitico: Profilo Acidi Grassi FAME 37
          </h3>
          <p className="text-xs text-slate-300">
            Inserimento manuale delle Aree cromatografiche rilevate (Ai). Calcolo istantaneo di Aree Corrette (F&apos;i × Ai), % e ripartizione nutrizionale in Saturi, Monoinsaturi e Polinsaturi con fattori di taratura ereditati dall&apos;<strong>Area 1 (Standard di Riferimento)</strong>.
          </p>
        </div>

        {/* Action Buttons Top */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={handleClearSampleAreas}
            className="px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
            title="Azzera tutte le aree del campione per una nuova determinazione"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Azzera Aree</span>
          </button>
          <button
            type="button"
            onClick={handleLoadSampleDefaults}
            className="px-3 py-1.5 text-xs font-bold text-indigo-100 hover:text-white bg-indigo-900/60 hover:bg-indigo-800/80 border border-indigo-700 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
            title="Carica dati di esempio per verificare le formule e i totali"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Dati Esempio</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 rounded-lg border border-slate-700 transition cursor-pointer"
            >
              Chiudi
            </button>
          )}
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2 animate-fadeIn">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* KPI Cards: Risultati Nutrizionali Calcolati */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl shadow-3xs">
          <span className="text-[10px] font-black text-rose-800 uppercase tracking-wide block">
            Acidi Grassi Saturi (SFA)
          </span>
          <div className="text-xl font-black text-rose-950 mt-0.5 font-mono">
            {result.percentualeSaturi.toFixed(2)} %
          </div>
          {useGrassoTotale && result.gSaturi100g !== undefined && (
            <span className="text-xs text-rose-700 font-mono font-bold block mt-0.5">
              = {result.gSaturi100g.toFixed(2)} g / 100g
            </span>
          )}
          <span className="text-[10px] text-rose-600 font-medium">Somma C4:0 ... C24:0</span>
        </div>

        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl shadow-3xs">
          <span className="text-[10px] font-black text-amber-800 uppercase tracking-wide block">
            Monoinsaturi (MUFA)
          </span>
          <div className="text-xl font-black text-amber-950 mt-0.5 font-mono">
            {result.percentualeMonoinsaturi.toFixed(2)} %
          </div>
          {useGrassoTotale && result.gMonoinsaturi100g !== undefined && (
            <span className="text-xs text-amber-700 font-mono font-bold block mt-0.5">
              = {result.gMonoinsaturi100g.toFixed(2)} g / 100g
            </span>
          )}
          <span className="text-[10px] text-amber-700 font-medium">Somma C14:1 ... C24:1</span>
        </div>

        <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl shadow-3xs">
          <span className="text-[10px] font-black text-sky-800 uppercase tracking-wide block">
            Polinsaturi (PUFA)
          </span>
          <div className="text-xl font-black text-sky-950 mt-0.5 font-mono">
            {result.percentualePolinsaturi.toFixed(2)} %
          </div>
          {useGrassoTotale && result.gPolinsaturi100g !== undefined && (
            <span className="text-xs text-sky-700 font-mono font-bold block mt-0.5">
              = {result.gPolinsaturi100g.toFixed(2)} g / 100g
            </span>
          )}
          <span className="text-[10px] text-sky-700 font-medium">Somma C18:2, EPA, DHA...</span>
        </div>

        <div className="p-3.5 bg-slate-900 text-white rounded-xl shadow-3xs border border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wide block">
              Somma Percentuali Totali
            </span>
            <div className="text-xl font-black text-emerald-400 mt-0.5 font-mono">
              {result.sommaPercentuali.toFixed(2)} %
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            Tot. Aree Corr: {Math.round(result.totaleAreaCorretta).toLocaleString('it-IT')}
          </span>
        </div>
      </div>

      {/* Controllo Grasso Totale & Drawer Informativo Standard */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 select-none">
            <input
              type="checkbox"
              checked={useGrassoTotale}
              onChange={(e) => setUseGrassoTotale(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-0 h-4 w-4 cursor-pointer accent-indigo-600"
            />
            <span>Conversione su alimento tal quale (g / 100g)</span>
          </label>
          {useGrassoTotale && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 font-medium">Grasso totale nel campione:</span>
              <input
                type="number"
                step="0.01"
                value={grassoTotale}
                onChange={(e) => setGrassoTotale(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="es: 14.2"
                className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="font-bold text-slate-700">g/100g</span>
            </div>
          )}
        </div>

        {/* Pulsante per mostrare/nascondere lo standard Area 1 */}
        <button
          type="button"
          onClick={() => setShowStandardDetails(!showStandardDetails)}
          className="text-xs font-bold text-indigo-700 hover:text-indigo-950 flex items-center gap-1.5 cursor-pointer bg-indigo-50 hover:bg-indigo-100/70 px-2.5 py-1.5 rounded-lg border border-indigo-200 transition"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>{showStandardDetails ? 'Nascondi Taratura Standard (Area 1)' : 'Mostra Taratura Standard (Area 1)'}</span>
          {showStandardDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Drawer Trasparente Standard di Riferimento (Area 1) */}
      {showStandardDetails && (
        <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-600" />
              Fattori di Taratura Ereditati da Area 1 (Catalogo Prove)
            </span>
            <span className="text-[11px] font-mono font-bold text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200">
              F_C16 = {result.fPalmitico.toFixed(4)} • F&apos;<sub>C16</sub> = 1,00
            </span>
          </div>
          <p className="text-xs text-amber-900">
            I fattori relativi <strong>F&apos;i</strong> mostrati nella tabella provengono dalla configurazione dello <strong>Standard di Riferimento (Area 1)</strong> definita nel catalogo prove. Vengono moltiplicati per ciascuna area campione (Ai) per ottenere l&apos;<strong>Area Corretta (F&apos;i × Ai)</strong>.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="bg-white p-2 rounded border border-amber-200">
              <span className="text-slate-500 block">Totale mi Std:</span>
              <strong className="font-mono text-slate-850">{result.totaleMiStd.toFixed(1)} µg/mL</strong>
            </div>
            <div className="bg-white p-2 rounded border border-amber-200">
              <span className="text-slate-500 block">Totale Aree Std:</span>
              <strong className="font-mono text-slate-850">{result.totaleAreaStd.toLocaleString('it-IT')}</strong>
            </div>
            <div className="bg-white p-2 rounded border border-amber-200">
              <span className="text-slate-500 block">Composti tarati:</span>
              <strong className="font-mono text-slate-850">37 Esteri Metilici</strong>
            </div>
            <div className="bg-white p-2 rounded border border-amber-200">
              <span className="text-slate-500 block">Metodo GC-FID:</span>
              <strong className="font-mono text-slate-850">ISO 12966-2/4</strong>
            </div>
          </div>
        </div>
      )}

      {/* Tabella 37 Componenti: Inserimento Manuale Aree Campione (Area 2) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-700 px-1">
          <span className="font-bold flex items-center gap-1.5 text-slate-900">
            <Layers className="h-4 w-4 text-emerald-600" />
            Tabella Determinazione Cromatografica Campione (37 Acidi Grassi)
          </span>
          <span className="font-mono font-bold bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800">
            Tot. Aree Campione: {result.totaleAreaCampione.toLocaleString('it-IT')}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-3xs">
          <div className="max-h-[500px] overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold z-10 text-[11px]">
                <tr>
                  <th className="p-2.5 w-12 text-center">N°</th>
                  <th className="p-2.5 min-w-[200px]">Esteri Metilici Acidi Grassi</th>
                  <th className="p-2.5 w-28 text-center">Classe</th>
                  <th className="p-2.5 w-24 text-right">F&apos;i (Area 1)</th>
                  <th className="p-2.5 min-w-[180px] text-right bg-emerald-50/80 border-x border-emerald-200 font-black text-emerald-950">
                    Area Campione manuale (Ai)
                  </th>
                  <th className="p-2.5 w-36 text-right">F&apos;i × Ai (Area Corr.)</th>
                  <th className="p-2.5 w-32 text-right bg-slate-50 font-black">Valore %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {result.items.map((item) => {
                  const isQuantified = item.areaCampione > 0;
                  return (
                    <tr 
                      key={item.numero} 
                      className={`hover:bg-slate-50/90 transition-colors ${
                        isQuantified ? 'bg-emerald-50/20 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      <td className="p-2 text-center font-mono text-[11px] text-slate-400">
                        {item.numero}
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{item.nome}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({item.sigla})</span>
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        {renderClasseBadge(item.classe)}
                      </td>
                      <td className="p-2 text-right font-mono text-[11px] text-slate-600">
                        {item.fPrime.toFixed(2)}
                      </td>
                      <td className="p-1.5 bg-emerald-50/40 border-x border-emerald-200 text-right">
                        <input
                          type="number"
                          step="any"
                          value={item.areaCampione || ''}
                          onChange={(e) => handleUpdateSampleArea(item.numero, e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          placeholder="0"
                          className="w-full bg-white border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded px-2.5 py-1 text-right font-mono font-bold text-xs text-slate-900 focus:outline-none transition shadow-3xs"
                        />
                      </td>
                      <td className="p-2 text-right font-mono text-[11px] text-slate-700">
                        {item.areaCorretta > 0 ? Math.round(item.areaCorretta).toLocaleString('it-IT') : '-'}
                      </td>
                      <td className="p-2 text-right font-mono text-xs font-black text-slate-900 bg-slate-50/60">
                        {item.valorePercentuale > 0 ? `${item.valorePercentuale.toFixed(4)} %` : '0,0000 %'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="sticky bottom-0 bg-slate-900 text-white font-mono text-xs font-bold border-t-2 border-slate-700 z-10">
                <tr>
                  <td colSpan={4} className="p-3 text-right uppercase tracking-wider text-slate-300">
                    Totali Campione (Area 2):
                  </td>
                  <td className="p-3 text-right text-emerald-300 bg-slate-950 border-x border-slate-800 font-black">
                    {result.totaleAreaCampione.toLocaleString('it-IT')}
                  </td>
                  <td className="p-3 text-right text-amber-300">
                    {Math.round(result.totaleAreaCorretta).toLocaleString('it-IT')}
                  </td>
                  <td className="p-3 text-right text-emerald-400 font-black">
                    {result.sommaPercentuali > 0 ? `${result.sommaPercentuali.toFixed(2)} %` : '0,00 %'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SELEZIONE FRAZIONI DA RIPORTARE NEL RAPPORTO DI PROVA (RdP)               */}
      {/* ========================================================================= */}
      <div className="p-4 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-50 border-2 border-indigo-300/80 rounded-2xl space-y-3.5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/60 pb-2.5">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-indigo-600" />
              Selezione Frazioni da Riportare nel Rapporto di Prova (RdP)
            </span>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Seleziona se riportare nel Rapporto di Prova gli <strong>Acidi Grassi Saturi</strong>, <strong>Monoinsaturi</strong> o <strong>Polinsaturi</strong>.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-500 mr-1">Preimposta:</span>
            <button
              type="button"
              onClick={() => handleSetReportPreset('all')}
              className="px-2 py-1 text-[10px] font-bold rounded-md bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-900 transition shadow-3xs cursor-pointer"
            >
              Tutti e 3
            </button>
            <button
              type="button"
              onClick={() => handleSetReportPreset('saturi')}
              className="px-2 py-1 text-[10px] font-bold rounded-md bg-white hover:bg-rose-50 border border-rose-200 text-rose-900 transition shadow-3xs cursor-pointer"
            >
              Solo Saturi
            </button>
            <button
              type="button"
              onClick={() => handleSetReportPreset('mono')}
              className="px-2 py-1 text-[10px] font-bold rounded-md bg-white hover:bg-amber-50 border border-amber-200 text-amber-900 transition shadow-3xs cursor-pointer"
            >
              Solo Monoinsaturi
            </button>
            <button
              type="button"
              onClick={() => handleSetReportPreset('poli')}
              className="px-2 py-1 text-[10px] font-bold rounded-md bg-white hover:bg-sky-50 border border-sky-200 text-sky-900 transition shadow-3xs cursor-pointer"
            >
              Solo Polinsaturi
            </button>
            <button
              type="button"
              onClick={() => handleSetReportPreset('insaturi')}
              className="px-2 py-1 text-[10px] font-bold rounded-md bg-white hover:bg-teal-50 border border-teal-200 text-teal-900 transition shadow-3xs cursor-pointer"
            >
              Mono + Poli
            </button>
          </div>
        </div>

        {/* 3 Interactive Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Saturi */}
          <div
            onClick={() => setReportSaturi(!reportSaturi)}
            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between gap-2 shadow-3xs ${
              reportSaturi
                ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-200 text-rose-950'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100/80 opacity-70'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer font-black text-xs pointer-events-none">
                <input
                  type="checkbox"
                  checked={reportSaturi}
                  onChange={() => {}}
                  className="rounded border-rose-300 text-rose-600 focus:ring-0 h-4 w-4 accent-rose-600 cursor-pointer"
                />
                <span>Acidi Grassi Saturi (SFA)</span>
              </label>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${reportSaturi ? 'bg-rose-200 text-rose-900' : 'bg-slate-200 text-slate-500'}`}>
                {reportSaturi ? 'INCLUSO IN RdP' : 'ESCLUSO'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-base font-black font-mono">
                {result.percentualeSaturi.toFixed(2)} %
                {useGrassoTotale && result.gSaturi100g !== undefined && (
                  <span className="text-xs font-bold block opacity-90">
                    ({result.gSaturi100g.toFixed(2)} g/100g)
                  </span>
                )}
              </div>
              <span className="text-[10px] opacity-75 block">Somma C4:0 ... C24:0</span>
            </div>
          </div>

          {/* Card 2: Monoinsaturi */}
          <div
            onClick={() => setReportMonoinsaturi(!reportMonoinsaturi)}
            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between gap-2 shadow-3xs ${
              reportMonoinsaturi
                ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-200 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100/80 opacity-70'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer font-black text-xs pointer-events-none">
                <input
                  type="checkbox"
                  checked={reportMonoinsaturi}
                  onChange={() => {}}
                  className="rounded border-amber-300 text-amber-600 focus:ring-0 h-4 w-4 accent-amber-600 cursor-pointer"
                />
                <span>Monoinsaturi (MUFA)</span>
              </label>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${reportMonoinsaturi ? 'bg-amber-200 text-amber-900' : 'bg-slate-200 text-slate-500'}`}>
                {reportMonoinsaturi ? 'INCLUSO IN RdP' : 'ESCLUSO'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-base font-black font-mono">
                {result.percentualeMonoinsaturi.toFixed(2)} %
                {useGrassoTotale && result.gMonoinsaturi100g !== undefined && (
                  <span className="text-xs font-bold block opacity-90">
                    ({result.gMonoinsaturi100g.toFixed(2)} g/100g)
                  </span>
                )}
              </div>
              <span className="text-[10px] opacity-75 block">Somma C14:1 ... C24:1</span>
            </div>
          </div>

          {/* Card 3: Polinsaturi */}
          <div
            onClick={() => setReportPolinsaturi(!reportPolinsaturi)}
            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer select-none flex flex-col justify-between gap-2 shadow-3xs ${
              reportPolinsaturi
                ? 'bg-sky-50/90 border-sky-400 ring-2 ring-sky-200 text-sky-950'
                : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100/80 opacity-70'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer font-black text-xs pointer-events-none">
                <input
                  type="checkbox"
                  checked={reportPolinsaturi}
                  onChange={() => {}}
                  className="rounded border-sky-300 text-sky-600 focus:ring-0 h-4 w-4 accent-sky-600 cursor-pointer"
                />
                <span>Polinsaturi (PUFA)</span>
              </label>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${reportPolinsaturi ? 'bg-sky-200 text-sky-900' : 'bg-slate-200 text-slate-500'}`}>
                {reportPolinsaturi ? 'INCLUSO IN RdP' : 'ESCLUSO'}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-base font-black font-mono">
                {result.percentualePolinsaturi.toFixed(2)} %
                {useGrassoTotale && result.gPolinsaturi100g !== undefined && (
                  <span className="text-xs font-bold block opacity-90">
                    ({result.gPolinsaturi100g.toFixed(2)} g/100g)
                  </span>
                )}
              </div>
              <span className="text-[10px] opacity-75 block">Omega 3, Omega 6, EPA, DHA...</span>
            </div>
          </div>
        </div>

        {/* Live Preview of the string for RdP */}
        <div className="p-3 bg-white border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 shrink-0">
              📝 Anteprima Valore nel Rapporto di Prova:
            </span>
            <code className="px-2.5 py-1 bg-slate-900 text-emerald-300 font-mono font-bold text-xs rounded-lg border border-slate-700 break-all">
              {computedRdpString}
            </code>
          </div>
          <span className="text-[10px] text-indigo-900 font-medium shrink-0">
            Colonna &quot;Valore Rilevato&quot; RdP
          </span>
        </div>
      </div>

      {/* Pulsante Finale di Salvataggio e Applicazione al RdP */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
        <div className="text-xs text-slate-500">
          I valori calcolati verranno memorizzati nel <strong>Quaderno di Laboratorio</strong> del campione e trascritti nel <strong>Rapporto di Prova (RdP)</strong>.
        </div>
        <button
          type="button"
          onClick={handleSaveAndApply}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 hover:from-emerald-700 hover:via-teal-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Applica Risultati al Rapporto di Prova (RdP)</span>
        </button>
      </div>
    </div>
  );
};
