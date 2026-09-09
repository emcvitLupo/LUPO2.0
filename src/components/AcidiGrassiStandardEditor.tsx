import React, { useState, useMemo } from 'react';
import { 
  FAME_37_MASTER_LIST, 
  calcolaProfiloAcidiGrassi, 
  ClasseAcidoGrasso 
} from '../utils/acidiGrassi';
import { 
  FlaskConical, 
  RotateCcw, 
  Check, 
  Info, 
  Sparkles, 
  Save, 
  Sliders, 
  Scale, 
  Layers,
  ChevronDown
} from 'lucide-react';

export interface StandardItemData {
  numero: number;
  mi: number;
  areaStd: number;
  fPrime?: number;
}

interface AcidiGrassiStandardEditorProps {
  provaNome?: string;
  metodoAnalitico?: string;
  initialStandard?: StandardItemData[];
  onSaveStandard?: (updatedStandard: StandardItemData[]) => void;
  onClose?: () => void;
  readOnly?: boolean;
}

export const AcidiGrassiStandardEditor: React.FC<AcidiGrassiStandardEditorProps> = ({
  provaNome = 'Composizione Acidi Grassi',
  metodoAnalitico = 'UNI EN ISO 12966-2 / UNI EN ISO 12966-4',
  initialStandard,
  onSaveStandard,
  onClose,
  readOnly = false
}) => {
  // Stato locale dei 37 composti standard (Area 1)
  const [standardData, setStandardData] = useState<Array<{ numero: number; mi: number; areaStd: number }>>(() => {
    if (initialStandard && initialStandard.length === 37) {
      return initialStandard.map(s => ({
        numero: s.numero,
        mi: s.mi,
        areaStd: s.areaStd
      }));
    }
    return FAME_37_MASTER_LIST.map(def => ({
      numero: def.numero,
      mi: def.miDefault,
      areaStd: def.areaStdDefault
    }));
  });

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Calcolo dei parametri dello standard
  const calcResult = useMemo(() => {
    // Array con areaCampione = 0 per calcolare solo la taratura standard
    const inputArr = standardData.map(d => ({
      ...d,
      areaCampione: 0
    }));
    return calcolaProfiloAcidiGrassi(inputArr);
  }, [standardData]);

  const handleUpdateField = (numero: number, field: 'mi' | 'areaStd', val: number) => {
    if (readOnly) return;
    setStandardData(prev => prev.map(item => item.numero === numero ? { ...item, [field]: val } : item));
  };

  const handleResetToNominal = () => {
    if (readOnly) return;
    setStandardData(FAME_37_MASTER_LIST.map(def => ({
      numero: def.numero,
      mi: def.miDefault,
      areaStd: def.areaStdDefault
    })));
    setFeedbackMsg('🔄 Valori nominali dello Standard FAME 37 (MR 552) ripristinati.');
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleSave = () => {
    const updatedStandard: StandardItemData[] = calcResult.items.map(it => ({
      numero: it.numero,
      mi: it.mi,
      areaStd: it.areaStd,
      fPrime: it.fPrime
    }));
    if (onSaveStandard) {
      onSaveStandard(updatedStandard);
    }
    setFeedbackMsg('✅ Standard di Riferimento (Area 1) salvato con successo per questa prova!');
    setTimeout(() => {
      setFeedbackMsg(null);
      if (onClose) onClose();
    }, 1500);
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
    <div className="bg-white border border-amber-200 rounded-2xl p-4 md:p-6 shadow-sm space-y-5">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 text-white p-4 rounded-xl shadow-md border border-amber-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-amber-500 text-amber-950 text-[10px] font-black uppercase tracking-wider">
              Area 1 • Standard di Riferimento
            </span>
            <span className="text-xs text-amber-200 font-mono font-bold">
              {metodoAnalitico}
            </span>
          </div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-amber-400 shrink-0" />
            Taratura Standard FAME 37 (Esteri Metilici Acidi Grassi)
          </h3>
          <p className="text-xs text-slate-300">
            Definizione dei parametri di calibrazione: concentrazioni note mi (µg/mL), Aree Standard Area_std e calcolo dei fattori relativi F&apos;i normalizzati su Acido Palmitico C16:0 (F&apos;C16 = 1,00).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {!readOnly && (
            <button
              type="button"
              onClick={handleResetToNominal}
              className="px-3 py-1.5 text-xs font-bold text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
              title="Ripristina valori standard nominali da scheda tecnica MR 552"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Valori Nominali</span>
            </button>
          )}
          {onSaveStandard && !readOnly && (
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-bold text-amber-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Save className="h-4 w-4" />
              <span>Salva Taratura Standard</span>
            </button>
          )}
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

      {/* KPI Cards della Calibrazione Standard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl shadow-3xs">
          <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wide block">
            Somma Conc. Standard (Sm)
          </span>
          <div className="text-lg font-black text-indigo-950 mt-0.5 font-mono">
            {calcResult.totaleMiStd.toFixed(1)} <span className="text-xs font-normal text-indigo-700">µg/mL</span>
          </div>
          <span className="text-[10px] text-indigo-600 font-medium">37 composti analizzati</span>
        </div>

        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl shadow-3xs">
          <span className="text-[10px] font-black text-amber-800 uppercase tracking-wide block">
            Somma Aree Standard (SA)
          </span>
          <div className="text-lg font-black text-amber-950 mt-0.5 font-mono">
            {calcResult.totaleAreaStd.toLocaleString('it-IT')}
          </div>
          <span className="text-[10px] text-amber-700 font-medium">Conteggio integrale GC-FID</span>
        </div>

        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl shadow-3xs">
          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wide block">
            Fattore Palmitico (F_C16)
          </span>
          <div className="text-lg font-black text-emerald-950 mt-0.5 font-mono">
            {calcResult.fPalmitico.toFixed(4)}
          </div>
          <span className="text-[10px] text-emerald-700 font-medium">Riferimento di normalizzazione</span>
        </div>

        <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-xl shadow-3xs">
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-wide block">
            Fattore Relativo Normalizzato
          </span>
          <div className="text-lg font-black text-slate-900 mt-0.5 font-mono">
            F&apos;<sub>C16</sub> = 1,00
          </div>
          <span className="text-[10px] text-slate-500 font-medium">F&apos;i = Fi / F_C16 per tutti i 37 FAME</span>
        </div>
      </div>

      {/* Info formula box */}
      <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2">
        <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p>
            <strong>Formule di taratura Area 1:</strong> % Peso Teorica = <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200 font-bold">(mi × 100) / Sm</code> • Wi% = <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200 font-bold">(Area_std × 100) / SA</code> • Fi = <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200 font-bold">% Peso / Wi%</code> • F&apos;i = <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-200 font-bold">Fi / F_C16</code>.
          </p>
          <p className="text-[11px] text-amber-800">
            Questi fattori <strong>F&apos;i</strong> verranno ereditati automaticamente nel <strong>Quaderno di Laboratorio (Area 2: Campione Analitico)</strong> della sezione Accettazione e Risultati per calcolare l&apos;Area Corretta (F&apos;i × Ai).
          </p>
        </div>
      </div>

      {/* Tabella 37 Componenti Standard */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-3xs">
        <div className="max-h-[520px] overflow-y-auto overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold z-10 text-[11px]">
              <tr>
                <th className="p-2.5 w-12 text-center">N°</th>
                <th className="p-2.5 min-w-[200px]">Esteri Metilici Acidi Grassi</th>
                <th className="p-2.5 w-28 text-center">Classe</th>
                <th className="p-2.5 min-w-[130px] text-right bg-indigo-50/80 border-x border-indigo-200">
                  mi (µg/mL)
                </th>
                <th className="p-2.5 w-28 text-right">% Peso Teorica</th>
                <th className="p-2.5 min-w-[160px] text-right bg-indigo-50/80 border-x border-indigo-200">
                  Area Std (manuale)
                </th>
                <th className="p-2.5 w-24 text-right">Wi (%)</th>
                <th className="p-2.5 w-24 text-right">Fi Assoluto</th>
                <th className="p-2.5 w-28 text-right bg-amber-50/90 font-black border-l border-amber-200 text-amber-950">
                  F&apos;i (C16=1)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {calcResult.items.map((item) => {
                const isPalmitico = item.numero === 12;
                return (
                  <tr 
                    key={item.numero} 
                    className={`hover:bg-slate-50/90 transition-colors ${
                      isPalmitico ? 'bg-amber-50/40 font-bold' : ''
                    }`}
                  >
                    <td className="p-2 text-center font-mono text-[11px] text-slate-400">
                      {item.numero}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{item.nome}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({item.sigla})</span>
                        {isPalmitico && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[9px] font-black uppercase">
                            Pivot C16:0
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      {renderClasseBadge(item.classe)}
                    </td>
                    <td className="p-1.5 bg-indigo-50/30 border-x border-indigo-200 text-right">
                      {readOnly ? (
                        <span className="font-mono text-xs text-slate-900 font-bold pr-2">{item.mi.toFixed(1)}</span>
                      ) : (
                        <input
                          type="number"
                          step="any"
                          value={item.mi || ''}
                          onChange={(e) => handleUpdateField(item.numero, 'mi', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          className="w-full bg-white border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 text-right font-mono font-bold text-xs text-slate-900 focus:outline-none transition shadow-3xs"
                        />
                      )}
                    </td>
                    <td className="p-2 text-right font-mono text-[11px] text-slate-600">
                      {item.pesoPercentualeStd.toFixed(2)} %
                    </td>
                    <td className="p-1.5 bg-indigo-50/30 border-x border-indigo-200 text-right">
                      {readOnly ? (
                        <span className="font-mono text-xs text-slate-900 font-bold pr-2">{item.areaStd.toLocaleString('it-IT')}</span>
                      ) : (
                        <input
                          type="number"
                          step="any"
                          value={item.areaStd || ''}
                          onChange={(e) => handleUpdateField(item.numero, 'areaStd', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                          className="w-full bg-white border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 text-right font-mono font-bold text-xs text-slate-900 focus:outline-none transition shadow-3xs"
                        />
                      )}
                    </td>
                    <td className="p-2 text-right font-mono text-[11px] text-slate-600">
                      {item.wiStd.toFixed(2)} %
                    </td>
                    <td className="p-2 text-right font-mono text-[11px] text-slate-600">
                      {item.fi.toFixed(3)}
                    </td>
                    <td className="p-2 text-right font-mono text-xs font-black text-amber-950 bg-amber-50/60 border-l border-amber-200">
                      {item.fPrime.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-slate-900 text-white font-mono text-xs font-bold border-t-2 border-slate-700 z-10">
              <tr>
                <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-slate-300">
                  Totali Standard:
                </td>
                <td className="p-3 text-right text-indigo-300 bg-slate-950 border-x border-slate-800">
                  {calcResult.totaleMiStd.toFixed(1)} µg/mL
                </td>
                <td className="p-3 text-right text-slate-300">
                  100,00 %
                </td>
                <td className="p-3 text-right text-amber-300 bg-slate-950 border-x border-slate-800">
                  {calcResult.totaleAreaStd.toLocaleString('it-IT')}
                </td>
                <td className="p-3 text-right text-slate-300">
                  100,00 %
                </td>
                <td className="p-3 text-right text-slate-300">
                  -
                </td>
                <td className="p-3 text-right text-amber-400 font-black border-l border-slate-800">
                  C16 = 1,00
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
