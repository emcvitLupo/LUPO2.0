import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Info, 
  FlaskConical,
  Atom,
  ShieldCheck,
  Scale,
  Percent,
  Sparkles,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import { 
  COMPOSTI_IDROCARBURI_TOTALI, 
  calcolaSommaIdrocarburiTotali, 
  CompostoIdrocarburiInput,
  RisultatoSommaIdrocarburi
} from '../utils/idrocarburiTotali';
import { Prova, RisultatoProva, QuadernoCalcolo } from '../types';

export interface IdrocarburiTotaliApplyData {
  sommaValore: string;
  sommaIncertezza: string;
  quadernoCalcolo?: QuadernoCalcolo;
  compostiUpdates: Record<string, { valoreRilevato: string; incertezza: string; unitaMisura?: string; isBelowLoq: boolean }>;
}

interface IdrocarburiTotaliModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetProva?: Prova;
  allProveCampione?: Prova[];
  tempRisultati?: Record<string, RisultatoProva>;
  onApply: (data: IdrocarburiTotaliApplyData) => void;
}

export const IdrocarburiTotaliModal: React.FC<IdrocarburiTotaliModalProps> = ({
  isOpen,
  onClose,
  targetProva,
  allProveCampione = [],
  tempRisultati = {},
  onApply
}) => {
  // 4 Composti State
  const [compostiState, setCompostiState] = useState<Array<{
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
  }>>([]);

  const [precision, setPrecision] = useState<number>(3);
  const [unitaMisura, setUnitaMisura] = useState<string>('µg/L');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Inizializza i dati leggendo eventuali prove già presenti nel campione o inserite in tempRisultati
  useEffect(() => {
    if (!isOpen) return;

    const initial = COMPOSTI_IDROCARBURI_TOTALI.map((c) => {
      // Cerca se tra le prove del campione c'è una prova corrispondente a questo composto
      const matchProva = allProveCampione.find(p => {
        const pNome = p.nome.toLowerCase();
        return c.nomi.some(n => pNome.includes(n));
      });

      const provaId = matchProva?.id;
      const resVal = provaId && tempRisultati[provaId] ? tempRisultati[provaId] : undefined;
      
      const rawValore = resVal?.valoreRilevato || '';
      const defaultLoq = matchProva?.limiteQuantificazione || c.defaultLoq;
      const isBelow = rawValore.startsWith('<') || rawValore.startsWith('≤') || (rawValore === '' && true);
      const cleanVal = isBelow && (rawValore.startsWith('<') || rawValore.startsWith('≤'))
        ? rawValore.replace(/^[<≤=]+\s*/, '').trim() 
        : rawValore;

      return {
        key: c.key,
        nome: c.nomeStandard,
        formulaMolecolare: c.formulaMolecolare,
        cas: c.cas,
        valore: cleanVal || defaultLoq,
        isBelowLoq: isBelow,
        loq: defaultLoq,
        incertezza: resVal?.incertezza && resVal.incertezza !== 'N/D' ? resVal.incertezza.replace('±', '').trim() : '0.002',
        unita: matchProva?.unitaMisura || targetProva?.unitaMisura || 'µg/L',
        provaIdCorrispondente: provaId
      };
    });

    setCompostiState(initial);
    if (targetProva?.unitaMisura) {
      setUnitaMisura(targetProva.unitaMisura);
    }
  }, [isOpen, targetProva, allProveCampione, tempRisultati]);

  if (!isOpen) return null;

  // Calcola in tempo reale la somma e le incertezze
  const inputsForCalc: CompostoIdrocarburiInput[] = compostiState.map(c => {
    const cleanLoq = (c.loq || '').replace(/^[<≤=]+\s*/, '') || c.loq;
    return {
      nome: c.nome,
      valoreRilevato: c.isBelowLoq ? `≤ ${cleanLoq}` : c.valore,
      loq: c.loq,
      incertezza: c.isBelowLoq ? 'N/D' : (c.incertezza ? `± ${c.incertezza}` : '0'),
      unitaMisura: c.unita
    };
  });

  const calcResult: RisultatoSommaIdrocarburi = calcolaSommaIdrocarburiTotali(inputsForCalc, precision);

  const handleToggleBelowLoq = (index: number) => {
    setCompostiState(prev => {
      const copy = [...prev];
      copy[index].isBelowLoq = !copy[index].isBelowLoq;
      return copy;
    });
  };

  const handleSetBelowLoqState = (index: number, isBelow: boolean) => {
    setCompostiState(prev => {
      const copy = [...prev];
      copy[index].isBelowLoq = isBelow;
      return copy;
    });
  };

  const handleUpdateValore = (index: number, val: string) => {
    setCompostiState(prev => {
      const copy = [...prev];
      copy[index].valore = val;
      if (val.startsWith('<') || val.startsWith('≤') || val.startsWith('<=')) {
        copy[index].isBelowLoq = true;
      }
      return copy;
    });
  };

  const handleUpdateLoq = (index: number, val: string) => {
    setCompostiState(prev => {
      const copy = [...prev];
      copy[index].loq = val;
      return copy;
    });
  };

  const handleUpdateIncertezza = (index: number, val: string) => {
    setCompostiState(prev => {
      const copy = [...prev];
      copy[index].incertezza = val;
      return copy;
    });
  };

  const handleConfirmAndApply = () => {
    // Costruisce il quaderno di calcolo da allegare alla prova somma
    const quaderno: QuadernoCalcolo = {
      formula: "Somma(Bromoformio, Cloroformio, Bromodiclorometano, Dibromoclorometano) [LOQ/2 se ≤ LOQ; Somma Incertezze solo composti >= LOQ]",
      variabili: compostiState.map(c => {
        const cleanLoq = (c.loq || '').replace(/^[<≤=]+\s*/, '') || c.loq;
        return {
          id: `comp_${c.key}`,
          simbolo: c.nome.substring(0, 4).toUpperCase(),
          descrizione: `${c.nome} (${c.formulaMolecolare}, LOQ: ${cleanLoq} ${c.unita}) - ${c.isBelowLoq ? 'Sotto LOQ (usato LOQ/2)' : 'Quantificato'}`,
          valore: c.isBelowLoq ? `≤ ${cleanLoq}` : c.valore
        };
      }),
      risultatoCalcolato: calcResult.sommaConcentrazione,
      tipoCalcolo: 'idrocarburi_totali'
    };

    // Prepara eventuali aggiornamenti per i singoli composti presenti nel campione
    const compostiUpdates: Record<string, { valoreRilevato: string; incertezza: string; unitaMisura?: string; isBelowLoq: boolean }> = {};
    compostiState.forEach(c => {
      if (c.provaIdCorrispondente) {
        const cleanLoq = (c.loq || '').replace(/^[<≤=]+\s*/, '') || c.loq;
        compostiUpdates[c.provaIdCorrispondente] = {
          valoreRilevato: c.isBelowLoq ? `≤ ${cleanLoq}` : c.valore,
          incertezza: c.isBelowLoq ? 'N/D' : (c.incertezza ? `± ${c.incertezza}` : 'N/D'),
          unitaMisura: c.unita,
          isBelowLoq: c.isBelowLoq
        };
      }
    });

    onApply({
      sommaValore: calcResult.sommaConcentrazioneFormatted,
      sommaIncertezza: calcResult.sommaIncertezzaFormatted,
      quadernoCalcolo: quaderno,
      compostiUpdates
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* Intestazione Modal con gradiente istituzionale laboratorio */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-teal-950 to-emerald-900 text-white flex items-center justify-between shadow-md border-b border-teal-800/40">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-300 shadow-inner">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Calcolo Somma Idrocarburi Totali & Trialometani (THM)
                </h3>
                <span className="bg-emerald-400/20 text-emerald-300 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-400/40">
                  UNI EN ISO 15680 • EPA 524.2
                </span>
              </div>
              <p className="text-xs text-teal-200/90 mt-0.5">
                Regola di calcolo normata: trattamento dei limiti di quantificazione (<strong className="text-white">≤ LOQ → LOQ/2</strong>) e propagazione delle incertezze estese
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
            title="Chiudi finestra"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* SCHEDA GRAFICA FORMULA MATEMATICA SCIENTIFICA (Visual Equation Card)      */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-teal-950 text-white p-4 sm:p-5 border-b border-slate-800 shadow-inner">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Box Equazione Grafica */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Atom className="h-4 w-4 text-emerald-400" />
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                  Formula Matematica di Sommatoria Metrologica
                </span>
              </div>

              {/* Equazione formattata ad alto contrasto */}
              <div className="bg-slate-950/80 border border-teal-500/30 rounded-xl p-3 shadow-lg">
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

                {/* Didascalia interattiva delle condizioni */}
                <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-300 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>Se <strong className="text-amber-300">C_i ≤ LOQ_i</strong> ➔ <strong className="text-amber-300">C_i* = LOQ_i / 2</strong> (incertezza U_i = N/D)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Se <strong className="text-emerald-300">C_i &gt; LOQ_i</strong> ➔ <strong className="text-emerald-300">C_i* = C_i</strong> (incertezza U_i misurata)</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-indigo-300">
                    <Scale className="h-3 w-3" />
                    <span>Incertezza totale: <strong>U_tot = ∑ U_i (dei soli composti quantificati)</strong></span>
                  </span>
                </div>
              </div>
            </div>

            {/* Espressione Valorizzata Live */}
            <div className="lg:w-80 bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Calcolo Espanso in Tempo Reale
              </span>
              <div className="font-mono text-xs text-emerald-200 leading-relaxed break-words bg-black/30 p-2 rounded border border-white/5">
                {calcResult.composti.map((c, i) => (
                  <span key={i}>
                    {i > 0 && <span className="text-slate-500"> + </span>}
                    <span className={c.isBelowLoq ? 'text-amber-300 font-semibold' : 'text-emerald-300 font-bold'}>
                      {c.isBelowLoq ? `(${c.valoreUsatoPerSomma.toFixed(precision)})` : c.valoreUsatoPerSomma.toFixed(precision)}
                    </span>
                  </span>
                ))}
                <span className="text-slate-400"> = </span>
                <strong className="text-white font-black text-sm">{calcResult.sommaConcentrazioneFormatted} {unitaMisura}</strong>
              </div>
              <div className="text-[10px] text-slate-400 mt-1.5 flex items-center justify-between">
                <span>Incertezza estesa totale:</span>
                <span className="font-mono font-bold text-indigo-300">{calcResult.sommaIncertezzaFormatted}</span>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* BARRA GRAFICA DI COMPOSIZIONE DEI 4 COMPOSTI (Stacked Distribution)       */}
          {/* ========================================================================= */}
          {calcResult.sommaConcentrazione > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-teal-400" />
                  <span>Ripartizione percentuale dei singoli composti nella concentrazione totale:</span>
                </span>
                <span className="text-[10px] text-slate-400">
                  {calcResult.quantiSottoLoq} composti a metà LOQ • {calcResult.quantiSopraLoq} composti quantificati
                </span>
              </div>

              {/* Barra segmentata proporzionale */}
              <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-700/80 shadow-inner">
                {calcResult.composti.map((comp, idx) => {
                  const pct = (comp.valoreUsatoPerSomma / calcResult.sommaConcentrazione) * 100;
                  const cfg = COMPOSTI_IDROCARBURI_TOTALI[idx];
                  return (
                    <div
                      key={idx}
                      style={{ width: `${pct}%` }}
                      className={`h-full ${cfg.coloreTheme.barColor} transition-all duration-300 relative group cursor-pointer`}
                      title={`${comp.nome}: ${comp.valoreUsatoPerSomma.toFixed(precision)} ${unitaMisura} (${pct.toFixed(1)}%) - ${comp.isBelowLoq ? 'LOQ/2' : 'Misurato'}`}
                    />
                  );
                })}
              </div>

              {/* Legenda della barra proporzionale */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px]">
                {calcResult.composti.map((comp, idx) => {
                  const pct = (comp.valoreUsatoPerSomma / calcResult.sommaConcentrazione) * 100;
                  const cfg = COMPOSTI_IDROCARBURI_TOTALI[idx];
                  return (
                    <div key={idx} className="flex items-center justify-between bg-slate-950/60 px-2 py-1 rounded border border-slate-800 text-slate-300">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`w-2 h-2 rounded-full ${cfg.coloreTheme.dot}`}></span>
                        <span className="truncate font-semibold">{comp.nome}</span>
                      </div>
                      <div className="font-mono text-right pl-1 shrink-0">
                        <span className="text-white font-bold">{pct.toFixed(1)}%</span>
                        {comp.isBelowLoq && <span className="text-amber-400 text-[9px] ml-1">(LOQ/2)</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* CORPO MODAL: SWITCH VISTA E CONTROLLI DEI 4 COMPOSTI                       */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/70">
          
          {/* Barra comandi sopra le schede: selettore vista e indicazioni */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Visualizzazione:</span>
              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-white text-teal-800 shadow-3xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Schede Chimiche
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white text-teal-800 shadow-3xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5" /> Tabella Dati
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Decimali:</span>
                <select
                  value={precision}
                  onChange={(e) => setPrecision(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-teal-500"
                >
                  <option value={2}>2 decimali (0.00)</option>
                  <option value={3}>3 decimali (0.000)</option>
                  <option value={4}>4 decimali (0.0000)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600">U.M.:</span>
                <input
                  type="text"
                  value={unitaMisura}
                  onChange={(e) => setUnitaMisura(e.target.value)}
                  className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-teal-500 text-center"
                />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* VISTA 1: 4 SCHEDE CHIMICHE INTERATTIVE (GRIGLIA AD ALTO IMPATTO)         */}
          {/* ========================================================================= */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {compostiState.map((c, idx) => {
                const compCalcolato = calcResult.composti[idx];
                const meta = COMPOSTI_IDROCARBURI_TOTALI[idx];

                return (
                  <div 
                    key={c.key} 
                    className={`rounded-2xl border transition-all duration-200 shadow-2xs overflow-hidden flex flex-col justify-between ${
                      c.isBelowLoq 
                        ? 'bg-amber-50/20 border-amber-200/80 hover:border-amber-300' 
                        : 'bg-white border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    {/* Header Card con nome, formula chimica e CAS */}
                    <div className={`p-3.5 border-b flex items-start justify-between gap-2 ${
                      c.isBelowLoq ? 'bg-amber-100/40 border-amber-200/80' : 'bg-slate-50/80 border-slate-100'
                    }`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${meta.coloreTheme.dot}`}></span>
                          <span className="text-sm font-black text-slate-900">{c.nome}</span>
                          <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border ${meta.coloreTheme.badge}`}>
                            {c.formulaMolecolare}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5 pl-4.5">
                          <span>CAS: {c.cas}</span>
                          {c.provaIdCorrispondente && (
                            <span className="text-emerald-700 font-bold">
                              • 🔗 Collegato a prova nel campione
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pill di stato compatto */}
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        c.isBelowLoq 
                          ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}>
                        {c.isBelowLoq ? '≤ LOQ (LOQ/2)' : 'Quantificato'}
                      </span>
                    </div>

                    {/* Corpo Card con Switch a 2 stati e inputs */}
                    <div className="p-4 space-y-3 flex-1">
                      
                      {/* Switch a 2 pulsanti ben visibile */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                          Stato Analitico del Composto:
                        </label>
                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleSetBelowLoqState(idx, true)}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              c.isBelowLoq
                                ? 'bg-amber-500 text-white shadow-3xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>≤ LOQ (Usa LOQ/2)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetBelowLoqState(idx, false)}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                              !c.isBelowLoq
                                ? 'bg-emerald-600 text-white shadow-3xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>≥ LOQ (Misurato)</span>
                          </button>
                        </div>
                      </div>

                      {/* Griglia Input Dati */}
                      <div className="grid grid-cols-3 gap-2.5 pt-1">
                        
                        {/* LOQ */}
                        <div>
                          <label className="text-[9.5px] font-bold text-slate-600 block mb-0.5">
                            LOQ ({unitaMisura}):
                          </label>
                          <input
                            type="text"
                            value={c.loq}
                            onChange={(e) => handleUpdateLoq(idx, e.target.value)}
                            placeholder="0.01"
                            className="w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-teal-400 focus:outline-none"
                          />
                        </div>

                        {/* Valore Rilevato */}
                        <div>
                          <label className="text-[9.5px] font-bold text-slate-600 block mb-0.5">
                            Valore Letto:
                          </label>
                          {c.isBelowLoq ? (
                            <div className="px-2 py-1.5 bg-amber-50 border border-amber-300 rounded-lg text-xs font-mono font-black text-amber-900 text-center">
                              ≤ {(c.loq || '0.01').replace(/^[<≤=]+\s*/, '')}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={c.valore}
                              onChange={(e) => handleUpdateValore(idx, e.target.value)}
                              placeholder="es. 0.04"
                              className="w-full px-2.5 py-1.5 border border-emerald-300 bg-emerald-50/50 rounded-lg text-xs font-mono font-black text-emerald-950 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                            />
                          )}
                        </div>

                        {/* Incertezza */}
                        <div>
                          <label className="text-[9.5px] font-bold text-slate-600 block mb-0.5">
                            Incertezza (±):
                          </label>
                          {c.isBelowLoq ? (
                            <div className="px-1.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] text-slate-400 font-medium italic text-center truncate" title="Non computata per legge quando inferiore al LOQ">
                              Non applicabile
                            </div>
                          ) : (
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-xs text-slate-400 font-bold">±</span>
                              <input
                                type="text"
                                value={c.incertezza}
                                onChange={(e) => handleUpdateIncertezza(idx, e.target.value)}
                                placeholder="0.002"
                                className="w-full pl-5 pr-2 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-teal-400 focus:outline-none"
                              />
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Box Contributo Effettivo Calcolato alla Somma */}
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                        c.isBelowLoq ? 'bg-amber-100/50 border-amber-200' : 'bg-emerald-50/60 border-emerald-200'
                      }`}>
                        <div className="space-y-0.5">
                          <span className="text-[9.5px] font-bold uppercase tracking-wide text-slate-500 block">
                            Contributo effettivo alla somma:
                          </span>
                          {c.isBelowLoq ? (
                            <span className="text-[10px] text-amber-900 font-medium">
                              Regola LOQ/2: ({c.loq} / 2)
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-900 font-medium">
                              Valore quantificato misurato
                            </span>
                          )}
                        </div>

                        <div className="text-right font-mono">
                          <span className={`text-base font-black ${c.isBelowLoq ? 'text-amber-950' : 'text-emerald-950'}`}>
                            {compCalcolato?.valoreUsatoPerSomma.toFixed(precision)}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 ml-1">{unitaMisura}</span>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* VISTA 2: TABELLA DATI SINTETICA */
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider">
                    <th className="py-2.5 px-3">Composto Chimico</th>
                    <th className="py-2.5 px-3 w-40">Stato Analitico</th>
                    <th className="py-2.5 px-3 w-28">LOQ ({unitaMisura})</th>
                    <th className="py-2.5 px-3 w-32">Valore Rilevato</th>
                    <th className="py-2.5 px-3 w-32">Contributo Somma</th>
                    <th className="py-2.5 px-3 w-32">Incertezza (±)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {compostiState.map((c, idx) => {
                    const compCalcolato = calcResult.composti[idx];
                    const meta = COMPOSTI_IDROCARBURI_TOTALI[idx];
                    return (
                      <tr key={c.key} className={c.isBelowLoq ? "bg-amber-50/30 hover:bg-amber-50/50 transition-colors" : "hover:bg-slate-50 transition-colors"}>
                        
                        {/* Nome Composto */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${meta.coloreTheme.dot}`}></span>
                            <span>{c.nome}</span>
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${meta.coloreTheme.badge}`}>
                              {c.formulaMolecolare}
                            </span>
                          </div>
                          {c.provaIdCorrispondente && (
                            <div className="text-[10px] text-emerald-700 font-medium mt-0.5 pl-4">
                              🔗 Collegato nel campione
                            </div>
                          )}
                        </td>

                        {/* Switch Sotto LOQ */}
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => handleToggleBelowLoq(idx)}
                            className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs ${
                              c.isBelowLoq
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                            }`}
                          >
                            {c.isBelowLoq ? (
                              <>
                                <ShieldCheck className="h-3.5 w-3.5 text-amber-700" /> ≤ LOQ (LOQ/2)
                              </>
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-700" /> ≥ LOQ (Misurato)
                              </>
                            )}
                          </button>
                        </td>

                        {/* LOQ */}
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={c.loq}
                            onChange={(e) => handleUpdateLoq(idx, e.target.value)}
                            placeholder="es. 0.01"
                            className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded text-xs font-mono font-semibold text-slate-800 focus:ring-1 focus:ring-teal-500"
                          />
                        </td>

                        {/* Valore Rilevato */}
                        <td className="py-3 px-3">
                          {c.isBelowLoq ? (
                            <div className="px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs font-mono font-bold text-amber-800 text-center">
                              ≤ {(c.loq || '0.01').replace(/^[<≤=]+\s*/, '')}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={c.valore}
                              onChange={(e) => handleUpdateValore(idx, e.target.value)}
                              placeholder="es. 0.04"
                              className="w-full px-2 py-1.5 border border-emerald-300 bg-emerald-50/40 rounded text-xs font-mono font-bold text-emerald-900 focus:ring-1 focus:ring-emerald-500"
                            />
                          )}
                        </td>

                        {/* Contributo effettivo */}
                        <td className="py-3 px-3 font-mono">
                          <div className="flex items-center gap-1">
                            <span className={`font-black ${c.isBelowLoq ? 'text-amber-800' : 'text-emerald-900'}`}>
                              {compCalcolato?.valoreUsatoPerSomma.toFixed(precision)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-sans">{unitaMisura}</span>
                          </div>
                          {c.isBelowLoq && (
                            <span className="text-[9px] text-amber-700 font-sans block">
                              (metà LOQ: {c.loq}/2)
                            </span>
                          )}
                        </td>

                        {/* Incertezza */}
                        <td className="py-3 px-3">
                          {c.isBelowLoq ? (
                            <div className="px-2 py-1 bg-slate-100 border border-slate-200 rounded text-[11px] text-slate-400 italic text-center font-medium">
                              Non riportata
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400 font-bold">±</span>
                              <input
                                type="text"
                                value={c.incertezza}
                                onChange={(e) => handleUpdateIncertezza(idx, e.target.value)}
                                placeholder="0.002"
                                className="w-full px-2 py-1 border border-slate-200 bg-white rounded text-xs font-mono font-semibold text-slate-800 focus:ring-1 focus:ring-emerald-500"
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

          {/* ========================================================================= */}
          {/* RIQUADRO RISULTATI CALCOLATI AD ALTO CONTRASTO                             */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Box Somma Concentrazione */}
            <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50 to-teal-50/40 rounded-2xl border border-emerald-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-600 font-extrabold uppercase tracking-wider mb-1.5">
                  <span className="flex items-center gap-1.5 text-emerald-950">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <span>Concentrazione Totale Calcolata</span>
                  </span>
                  <span className="text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border border-emerald-300">
                    {calcResult.quantiSottoLoq} &lt; LOQ • {calcResult.quantiSopraLoq} misurati
                  </span>
                </div>
                <div className="flex items-baseline gap-2.5 mt-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-emerald-950 tracking-tight">
                    {calcResult.sommaConcentrazioneFormatted}
                  </span>
                  <span className="text-base font-extrabold text-slate-600 font-mono">
                    {unitaMisura}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-emerald-850 mt-3 border-t border-emerald-200/60 pt-2 font-medium">
                Somma algebrica formale conforme: {calcResult.dettaglioCalcoloText}
              </p>
            </div>

            {/* Box Somma Incertezze */}
            <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50 to-purple-50/40 rounded-2xl border border-indigo-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-600 font-extrabold uppercase tracking-wider mb-1.5">
                  <span className="flex items-center gap-1.5 text-indigo-950">
                    <Scale className="h-4 w-4 text-indigo-600" />
                    <span>Incertezza Estesa Totale (± U)</span>
                  </span>
                  <span className="text-indigo-800 bg-indigo-100/80 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border border-indigo-300">
                    {calcResult.quantiSopraLoq > 0 ? `${calcResult.quantiSopraLoq} composti con incertezza` : 'Nessun composto quantificato'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2.5 mt-2">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-indigo-950 tracking-tight">
                    {calcResult.sommaIncertezzaFormatted}
                  </span>
                  {calcResult.sommaIncertezza > 0 && (
                    <span className="text-base font-extrabold text-slate-600 font-mono">
                      {unitaMisura}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-indigo-850 mt-3 border-t border-indigo-200/60 pt-2 font-medium">
                {calcResult.tuttiSottoLoq
                  ? 'Tutti i composti sono < LOQ: incertezza non riportata (N/D) come da regolamento ACCREDIA.'
                  : 'Somma algebrica diretta delle sole incertezze dei composti quantificati (≥ LOQ).'}
              </p>
            </div>

          </div>

        </div>

        {/* Footer Modal con azioni */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
          <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
            La formula e i dettagli di calcolo verranno registrati automaticamente nel Quaderno di Laboratorio.
          </div>
          
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer border border-slate-200"
            >
              Annulla
            </button>
            
            <button
              type="button"
              onClick={handleConfirmAndApply}
              className="px-5 py-2.5 text-xs font-black text-white bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 hover:from-emerald-700 hover:to-slate-950 rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer hover:shadow-lg"
            >
              <Check className="h-4 w-4 text-emerald-300" /> 
              Applica a &ldquo;{targetProva?.nome || 'Idrocarburi Totali'}&rdquo; &amp; Sincronizza RdP
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
