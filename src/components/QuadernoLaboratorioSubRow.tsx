import React from 'react';
import { Prova, RisultatoProva, QuadernoCalcolo } from '../types';
import { evaluateFormula, FORMULA_PRESETS, FormulaPreset } from '../utils/mathLims';
import { BookOpen, Calculator, FlaskConical, X, Check } from 'lucide-react';

interface QuadernoLaboratorioSubRowProps {
  p: Prova;
  currentVal: RisultatoProva;
  customFormulaPresets: FormulaPreset[];
  kjeldahlMassaKHP: string;
  setKjeldahlMassaKHP: (val: string) => void;
  kjeldahlVolNaOH_KHP: string;
  setKjeldahlVolNaOH_KHP: (val: string) => void;
  kjeldahlTitoloNaOH: string;
  setKjeldahlTitoloNaOH: (val: string) => void;
  kjeldahlVolHCl: string;
  setKjeldahlVolHCl: (val: string) => void;
  kjeldahlVolNaOH_HCl: string;
  setKjeldahlVolNaOH_HCl: (val: string) => void;
  kjeldahlTitoloHCl: string;
  setKjeldahlTitoloHCl: (val: string) => void;
  kjeldahlVolBianco: string;
  setKjeldahlVolBianco: (val: string) => void;
  kjeldahlVolCampione: string;
  setKjeldahlVolCampione: (val: string) => void;
  kjeldahlPesoCampione: string;
  setKjeldahlPesoCampione: (val: string) => void;
  kjeldahlFattoreF: number;
  setKjeldahlFattoreF: (val: number) => void;
  kjeldahlActiveTab: 'standard' | 'kjeldahl_wizard';
  setKjeldahlActiveTab: (tab: 'standard' | 'kjeldahl_wizard') => void;
  onUpdateQuaderno: (quad: QuadernoCalcolo) => void;
  onApplyResult: (formattedVal: string, quad: QuadernoCalcolo) => void;
  onOpenIdrocarburiWizard?: () => void;
  onClose: () => void;
}

export const QuadernoLaboratorioSubRow: React.FC<QuadernoLaboratorioSubRowProps> = ({
  p,
  currentVal,
  customFormulaPresets,
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
  const defaultQuad: QuadernoCalcolo = {
    formula: p.formulaCalcolo || '',
    variabili: (p.variabiliCalcolo || []).map((v, i) => ({
      id: v.id || `v-${i}-${v.simbolo}`,
      simbolo: v.simbolo,
      descrizione: v.descrizione,
      valore: ''
    }))
  };

  const quad = (currentVal.quadernoCalcolo && currentVal.quadernoCalcolo.variabili.length > 0)
    ? currentVal.quadernoCalcolo
    : defaultQuad;

  const variables = quad.variabili || [];
  const formula = quad.formula || '';
  const evalResult = evaluateFormula(formula, variables);

  // Calcoli reattivi per l'Assistente Kjeldahl (4 Fasi)
  const mKHP = Number(kjeldahlMassaKHP) || 0;
  const vNaOH_KHP = Number(kjeldahlVolNaOH_KHP) || 0;
  const calcTitoloNaOH = (mKHP > 0 && vNaOH_KHP > 0)
    ? (mKHP * 1000) / (vNaOH_KHP * 204.22)
    : null;

  const vHCl = Number(kjeldahlVolHCl) || 0;
  const vNaOH_HCl = Number(kjeldahlVolNaOH_HCl) || 0;
  const tNaOH_used = Number(kjeldahlTitoloNaOH) || (calcTitoloNaOH || 0.1);
  const calcTitoloHCl = (vHCl > 0 && vNaOH_HCl > 0 && tNaOH_used > 0)
    ? (vNaOH_HCl * tNaOH_used) / vHCl
    : null;

  const vCampione = Number(kjeldahlVolCampione) || 0;
  const vBianco = Number(kjeldahlVolBianco) || 0;
  const nTitolante = Number(kjeldahlTitoloHCl) || (calcTitoloHCl || (calcTitoloNaOH || 0.1));
  const pesoC = Number(kjeldahlPesoCampione) || 0;
  const fattoreF = Number(kjeldahlFattoreF) || 6.25;

  const deltaV = Math.max(0, vCampione - vBianco);
  const calcAzotoPercent = (pesoC > 0 && deltaV >= 0 && nTitolante > 0)
    ? (deltaV * nTitolante * 1.4007) / pesoC
    : null;
  const calcProteinePercent = calcAzotoPercent !== null
    ? calcAzotoPercent * fattoreF
    : null;

  const isKjeldahlOrProteine = (p.nome || '').toLowerCase().includes('protein') || 
    (p.nome || '').toLowerCase().includes('azoto') || 
    (p.nome || '').toLowerCase().includes('kjeldahl') ||
    (p.metodoAnalitico || '').toLowerCase().includes('kjeldahl') ||
    (p.metodoAnalitico || '').toLowerCase().includes('1871');

  // Determina la scheda attiva effettiva: se non è una prova di proteine/kjeldahl e l'utente non ha forzato la visualizzazione, usa 'standard'
  const effectiveTab = isKjeldahlOrProteine ? kjeldahlActiveTab : 'standard';

  return (
    <tr className="bg-slate-55 border-b border-indigo-100/50">
      <td colSpan={6} className="px-3 pb-3 pt-1">
        <div className="bg-indigo-50/20 rounded-xl border border-indigo-200/80 p-4 shadow-3xs max-w-5xl space-y-3.5 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-indigo-100/60 gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 px-1.5 bg-indigo-100 text-indigo-700 rounded-md shrink-0">
                <BookOpen className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-[#1e293b] text-xs uppercase tracking-wide">
                    📒 Quaderno di Laboratorio LIMS • Registro Calcoli
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-bold">
                    {p.nome}
                  </span>
                  {isKjeldahlOrProteine && (
                    <span className="text-[9.5px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                      🔬 Metodo Kjeldahl Disponibile
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Formule aritmetiche certificate e tracciabilità analitica conforme ISO/IEC 17025.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenIdrocarburiWizard && (
                <button
                  type="button"
                  onClick={onOpenIdrocarburiWizard}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-3xs transition-all cursor-pointer"
                  title="Apri Assistente Calcolo Idrocarburi Totali (Somma 4 composti con LOQ/2 e somma incertezze)"
                >
                  <FlaskConical className="h-4 w-4 text-emerald-600" />
                  <span>🧪 Calcolo Idrocarburi Totali</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 hover:text-slate-900 border border-slate-300 rounded-lg shadow-3xs transition-all cursor-pointer"
                title="Chiudi Quaderno di Laboratorio"
              >
                <X className="h-4 w-4 text-slate-500" />
                <span>Chiudi Quaderno</span>
              </button>
            </div>
          </div>

          {/* Tab Switcher: Viene mostrato con il Wizard Kjeldahl solo per prove di Proteine/Azoto/Kjeldahl */}
          {isKjeldahlOrProteine ? (
            <div className="flex items-center gap-1.5 p-1 bg-indigo-100/60 rounded-xl border border-indigo-200/50 w-fit">
              <button
                type="button"
                onClick={() => setKjeldahlActiveTab('standard')}
                className={`px-3 py-1 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  effectiveTab === 'standard'
                    ? 'bg-white text-indigo-900 shadow-3xs'
                    : 'text-indigo-700 hover:text-indigo-950'
                }`}
              >
                <Calculator className="h-3.5 w-3.5" /> Calcolatore Standard
              </button>
              <button
                type="button"
                onClick={() => setKjeldahlActiveTab('kjeldahl_wizard')}
                className={`px-3 py-1 text-[10.5px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  effectiveTab === 'kjeldahl_wizard'
                    ? 'bg-indigo-600 text-white shadow-3xs'
                    : 'text-indigo-700 hover:text-indigo-950 hover:bg-indigo-200/50'
                }`}
              >
                <FlaskConical className="h-3.5 w-3.5" /> 🔬 Assistente Kjeldahl (4 Fasi: NaOH, HCl, Bianco, Proteine %)
              </button>
            </div>
          ) : null}

          {/* VISTA 1: ASSISTENTE MODULARE KJELDAHL A 4 FASI (Attivo solo se selezionato e applicabile) */}
          {effectiveTab === 'kjeldahl_wizard' ? (
            <div className="space-y-4 pt-1">
              {/* Banner Metodo */}
              <div className="bg-slate-900 text-white p-3 rounded-xl shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-2 border border-slate-700">
                <div>
                  <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest block">
                    ISO 1871 • Reg. UE 1169/2011 • Metodo Kjeldahl
                  </span>
                  <p className="text-xs text-indigo-100 font-medium">
                    Determinazione dell&apos;Azoto Totale e delle Proteine Grezze con procedura a 4 stadi integrati.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-300 block">Equivalente N:</span>
                  <span className="font-mono text-xs font-black text-white bg-white/10 px-2 py-0.5 rounded border border-white/20">
                    1.4007 g/eq
                  </span>
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
                          value={kjeldahlMassaKHP}
                          onChange={(e) => setKjeldahlMassaKHP(e.target.value)}
                          placeholder="0.2042"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block">Vol. NaOH (mL):</label>
                        <input
                          type="number"
                          step="any"
                          value={kjeldahlVolNaOH_KHP}
                          onChange={(e) => setKjeldahlVolNaOH_KHP(e.target.value)}
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
                          setKjeldahlTitoloNaOH(calcTitoloNaOH.toFixed(4));
                        }
                      }}
                      disabled={calcTitoloNaOH === null}
                      className="text-[10px] px-2 py-1 bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold rounded cursor-pointer transition disabled:opacity-50"
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
                          value={kjeldahlVolHCl}
                          onChange={(e) => setKjeldahlVolHCl(e.target.value)}
                          placeholder="10.00"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block">Vol. NaOH (mL):</label>
                        <input
                          type="number"
                          step="any"
                          value={kjeldahlVolNaOH_HCl}
                          onChange={(e) => setKjeldahlVolNaOH_HCl(e.target.value)}
                          placeholder="10.05"
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-600 block">T_NaOH (N):</label>
                        <input
                          type="number"
                          step="any"
                          value={kjeldahlTitoloNaOH}
                          onChange={(e) => setKjeldahlTitoloNaOH(e.target.value)}
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
                          setKjeldahlTitoloHCl(calcTitoloHCl.toFixed(4));
                        }
                      }}
                      disabled={calcTitoloHCl === null}
                      className="text-[10px] px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold rounded cursor-pointer transition disabled:opacity-50"
                    >
                      ⚡ Usa Titolo HCl in Fase 4
                    </button>
                  </div>
                </div>

                {/* FASE 3: Bianco di Distillazione */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-800 uppercase tracking-wide flex items-center gap-1">
                        3️⃣ Bianco di Distillazione (Reagenti)
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold">Correzione Azoto</span>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Titolazione dell&apos;azoto residuo presente nei reattivi mineralizzanti (H2SO4, catalizzatori Kjeldahl e acqua).
                    </p>

                    <div className="pt-1">
                      <label className="text-[9px] font-bold text-slate-600 block">Volume Bianco V_Bianco (mL):</label>
                      <input
                        type="number"
                        step="any"
                        value={kjeldahlVolBianco}
                        onChange={(e) => setKjeldahlVolBianco(e.target.value)}
                        placeholder="0.05"
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-mono font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">V_Bianco = <strong className="font-mono text-slate-800">{Number(kjeldahlVolBianco) || 0} mL</strong></span>
                    <span className="text-[9.5px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                      ✓ Connesso a Fase 4
                    </span>
                  </div>
                </div>

                {/* FASE 4: Fattore F e Calcolo Proteine */}
                <div className="bg-white p-3.5 rounded-xl border border-emerald-300 shadow-3xs space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wide flex items-center gap-1">
                        4️⃣ Fattore di Conversione Kjeldahl (F)
                      </span>
                      <span className="text-[9px] text-emerald-700 font-bold font-mono">F = {fattoreF}</span>
                    </div>
                    <p className="text-[9.5px] text-slate-500">
                      Seleziona la matrice per impostare il fattore di conversione Azoto → Proteine:
                    </p>

                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setKjeldahlFattoreF(6.25)}
                        className={`px-1.5 py-1 text-[9px] rounded font-bold transition text-center cursor-pointer border ${
                          fattoreF === 6.25 ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                        }`}
                      >
                        🏷️ 6.25 (Reg. UE 1169)
                      </button>
                      <button
                        type="button"
                        onClick={() => setKjeldahlFattoreF(6.38)}
                        className={`px-1.5 py-1 text-[9px] rounded font-bold transition text-center cursor-pointer border ${
                          fattoreF === 6.38 ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                        }`}
                      >
                        🥛 6.38 (Latte/Formaggi)
                      </button>
                      <button
                        type="button"
                        onClick={() => setKjeldahlFattoreF(5.70)}
                        className={`px-1.5 py-1 text-[9px] rounded font-bold transition text-center cursor-pointer border ${
                          fattoreF === 5.70 ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                        }`}
                      >
                        🌾 5.70 (Farine)
                      </button>
                      <button
                        type="button"
                        onClick={() => setKjeldahlFattoreF(5.83)}
                        className={`px-1.5 py-1 text-[9px] rounded font-bold transition text-center cursor-pointer border ${
                          fattoreF === 5.83 ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                        }`}
                      >
                        🥣 5.83 (Orzo/Avena)
                      </button>
                      <button
                        type="button"
                        onClick={() => setKjeldahlFattoreF(5.95)}
                        className={`px-1.5 py-1 text-[9px] rounded font-bold transition text-center cursor-pointer border ${
                          fattoreF === 5.95 ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                        }`}
                      >
                        🍚 5.95 (Riso)
                      </button>
                      <button
                        type="button"
                        onClick={() => setKjeldahlFattoreF(5.30)}
                        className={`px-1.5 py-1 text-[9px] rounded font-bold transition text-center cursor-pointer border ${
                          fattoreF === 5.30 ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-emerald-50'
                        }`}
                      >
                        🌱 5.30 (Legumi)
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calcolo Finale Campione Kjeldahl */}
              <div className="bg-white p-4 rounded-xl border border-emerald-300 shadow-sm space-y-3">
                <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-emerald-100 pb-1.5">
                  🧪 Esecuzione Calcolo su Campione: ((V_Campione - V_Bianco) × N_titolante × 1.4007 × F) / Peso_Campione
                </span>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[9.5px] font-bold text-slate-700 block">V_Campione (mL):</label>
                    <input
                      type="number"
                      step="any"
                      value={kjeldahlVolCampione}
                      onChange={(e) => setKjeldahlVolCampione(e.target.value)}
                      placeholder="12.45"
                      className="w-full bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-bold text-slate-700 block">V_Bianco (mL):</label>
                    <input
                      type="number"
                      step="any"
                      value={kjeldahlVolBianco}
                      onChange={(e) => setKjeldahlVolBianco(e.target.value)}
                      placeholder="0.05"
                      className="w-full bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-bold text-slate-700 block">Titolo N Titolante:</label>
                    <input
                      type="number"
                      step="any"
                      value={kjeldahlTitoloHCl}
                      onChange={(e) => setKjeldahlTitoloHCl(e.target.value)}
                      placeholder="0.1000"
                      className="w-full bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-mono font-bold text-purple-900"
                    />
                  </div>
                  <div>
                    <label className="text-[9.5px] font-bold text-slate-700 block">Peso Campione (g):</label>
                    <input
                      type="number"
                      step="any"
                      value={kjeldahlPesoCampione}
                      onChange={(e) => setKjeldahlPesoCampione(e.target.value)}
                      placeholder="1.0500"
                      className="w-full bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Output Azoto e Proteine */}
                <div className="pt-2 border-t border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                      <span className="text-[8.5px] text-slate-400 uppercase font-black block">Azoto Totale (N %):</span>
                      <span className="font-mono text-sm font-black text-slate-700">
                        {calcAzotoPercent !== null ? calcAzotoPercent.toFixed(4) : '---'} %
                      </span>
                    </div>
                    <div className="bg-emerald-50 px-3.5 py-1.5 rounded-lg border border-emerald-200">
                      <span className="text-[8.5px] text-emerald-700 uppercase font-black block">Proteine Grezze (% w/w):</span>
                      <span className="font-mono text-lg font-black text-emerald-900">
                        {calcProteinePercent !== null ? calcProteinePercent.toFixed(2) : '---'} {currentVal.unitaMisura || p.unitaMisura || 'g/100g'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 transition-colors shadow-3xs cursor-pointer flex items-center justify-center gap-1"
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
                            { id: 'kj-vc', simbolo: "VC", descrizione: "Volume titolante per il campione (mL)", valore: Number(kjeldahlVolCampione) || 0 },
                            { id: 'kj-vb', simbolo: "VB", descrizione: "Volume titolante per il bianco reagenti (mL)", valore: Number(kjeldahlVolBianco) || 0 },
                            { id: 'kj-n', simbolo: "N", descrizione: "Titolo/Normalità effettiva titolante (N)", valore: Number(kjeldahlTitoloHCl) || 0.1 },
                            { id: 'kj-f', simbolo: "F", descrizione: `Fattore Kjeldahl (matrice F=${fattoreF})`, valore: fattoreF },
                            { id: 'kj-p', simbolo: "P", descrizione: "Peso dell'aliquota di campione pesata (g)", valore: Number(kjeldahlPesoCampione) || 0 },
                            { id: 'kj-tnaoh', simbolo: "T_NaOH", descrizione: "Titolo NaOH standardizzato con KHP (N)", valore: calcTitoloNaOH !== null ? calcTitoloNaOH.toFixed(4) : String(kjeldahlTitoloNaOH) },
                            { id: 'kj-ntot', simbolo: "N_tot", descrizione: "Azoto Totale N (% w/w)", valore: calcAzotoPercent !== null ? calcAzotoPercent.toFixed(4) : '' }
                          ],
                          risultatoCalcolato: Number(formattedValue)
                        };

                        onApplyResult(formattedValue, completeKjeldahlQuad);
                      }}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition-colors shadow-3xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" /> 📤 Invia Risultato Proteine al RdP & Salva Quaderno
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* VISTA 2: CALCOLATORE STANDARD GENERALE */
            <div className="space-y-4 pt-1">
              {/* Formula Applicata & Selettore Modelli */}
              <div className="bg-white p-3 rounded-xl border border-indigo-150 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Formula Aritmetica Applicata</span>
                  <code className="font-mono text-sm font-black text-indigo-700 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100 inline-block w-fit">
                    {formula || 'Nessuna formula impostata'}
                  </code>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold text-slate-500 whitespace-nowrap">Carica Modello:</label>
                  <select
                    onChange={(e) => {
                      const idx = e.target.value;
                      if (idx === '') return;
                      const allPresets = [...FORMULA_PRESETS, ...customFormulaPresets];
                      const preset = allPresets[parseInt(idx)];
                      if (preset) {
                        onUpdateQuaderno({
                          formula: preset.formula,
                          variabili: preset.variabili.map((v, i) => ({
                            id: `v-${i}-${v.simbolo}`,
                            simbolo: v.simbolo,
                            descrizione: v.descrizione,
                            valore: v.valore
                          }))
                        });
                      }
                    }}
                    defaultValue=""
                    className="text-[11px] bg-slate-50 hover:bg-white border border-indigo-200 text-indigo-900 rounded-lg px-2.5 py-1 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-3xs transition"
                  >
                    <option value="" disabled>✨ Seleziona modello predefinito...</option>
                    {[...FORMULA_PRESETS, ...customFormulaPresets].map((preset, idx) => (
                      <option key={idx} value={idx}>{preset.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Variabili Inputs */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide border-b border-indigo-50 pb-1.5 flex items-center gap-1.5">
                  Variabili di Calcolo
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {variables.map((v, vIdx) => (
                    <div key={v.simbolo + vIdx} className="flex flex-col gap-1 bg-white p-2.5 rounded-lg border border-slate-200 shadow-3xs hover:border-indigo-300 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-indigo-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                          {v.simbolo}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-600 truncate" title={v.descrizione}>
                          {v.descrizione}
                        </span>
                      </div>
                      <div className="mt-1">
                        <input
                          type="number"
                          step="any"
                          value={v.valore}
                          onChange={(e) => {
                            const val = e.target.value !== '' ? Number(e.target.value) : '';
                            const updatedVars = [...variables];
                            updatedVars[vIdx] = { ...updatedVars[vIdx], valore: val };
                            onUpdateQuaderno({
                              ...quad,
                              variabili: updatedVars
                            });
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-md px-2 py-1 font-mono text-xs font-bold text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-shadow"
                          placeholder="Inserisci valore..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risultato Computazione */}
              <div className="bg-white p-3.5 rounded-lg border border-indigo-150 shadow-3xs space-y-2">
                <span className="text-[9px] font-black text-slate-455 uppercase tracking-widest block">
                  Risultato Calcolatore LIMS
                </span>
                {evalResult.error ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-[10.5px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-md border border-amber-200/50">
                      ⚠️ {evalResult.error}
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 transition-colors shadow-3xs cursor-pointer flex items-center justify-center gap-1 self-end sm:self-auto"
                    >
                      <X className="h-4 w-4 text-slate-500" /> Chiudi Quaderno
                    </button>
                  </div>
                ) : evalResult.value !== null ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xl font-mono font-black text-indigo-900 leading-none bg-indigo-50/50 px-3 py-1.5 rounded-md border border-indigo-100 inline-block w-fit">
                      {evalResult.value !== 0 && Math.abs(evalResult.value) < 0.0001
                        ? evalResult.value.toFixed(8).replace(/\.?0+$/, '')
                        : evalResult.value.toFixed(6).replace(/\.?0+$/, '')}
                      <span className="text-[10px] text-slate-500 ml-1.5 font-sans font-extrabold uppercase">
                        {currentVal.unitaMisura || p.unitaMisura || ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 transition-colors shadow-3xs cursor-pointer flex items-center justify-center gap-1"
                      >
                        <X className="h-4 w-4 text-slate-500" /> Chiudi
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const formattedValue = evalResult.value !== 0 && Math.abs(evalResult.value) < 0.0001
                            ? evalResult.value.toFixed(8).replace(/\.?0+$/, '')
                            : evalResult.value.toFixed(6).replace(/\.?0+$/, '');
                          onApplyResult(formattedValue, quad);
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-lg transition-colors shadow-3xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Check className="h-4 w-4" /> 📤 Invia Risultato al Rapporto di Prova
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-[10px] text-slate-400 italic">
                      Inserisci i valori delle variabili per calcolare il risultato...
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 transition-colors shadow-3xs cursor-pointer flex items-center justify-center gap-1 self-end sm:self-auto"
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
