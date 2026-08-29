import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Info, 
  FlaskConical
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
    valore: string;
    isBelowLoq: boolean;
    loq: string;
    incertezza: string;
    unita: string;
    provaIdCorrispondente?: string;
  }>>([]);

  const [precision, setPrecision] = useState<number>(3);
  const [unitaMisura, setUnitaMisura] = useState<string>('µg/L');

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
      const isBelow = rawValore.startsWith('<') || (rawValore === '' && true); // default a true se vuoto o <
      const cleanVal = isBelow && rawValore.startsWith('<') 
        ? rawValore.replace('<', '').trim() 
        : rawValore;

      return {
        key: c.key,
        nome: c.nomeStandard,
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
  const inputsForCalc: CompostoIdrocarburiInput[] = compostiState.map(c => ({
    nome: c.nome,
    valoreRilevato: c.isBelowLoq ? `< ${c.loq}` : c.valore,
    loq: c.loq,
    incertezza: c.isBelowLoq ? 'N/D' : (c.incertezza ? `± ${c.incertezza}` : '0'),
    unitaMisura: c.unita
  }));

  const calcResult: RisultatoSommaIdrocarburi = calcolaSommaIdrocarburiTotali(inputsForCalc, precision);

  const handleToggleBelowLoq = (index: number) => {
    setCompostiState(prev => {
      const copy = [...prev];
      copy[index].isBelowLoq = !copy[index].isBelowLoq;
      return copy;
    });
  };

  const handleUpdateValore = (index: number, val: string) => {
    setCompostiState(prev => {
      const copy = [...prev];
      copy[index].valore = val;
      if (val.startsWith('<')) {
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
      formula: "Somma(Bromoformio, Cloroformio, Bromodiclorometano, Dibromoclorometano) [LOQ/2 se < LOQ; Somma Incertezze solo composti >= LOQ]",
      variabili: compostiState.map(c => ({
        id: `comp_${c.key}`,
        simbolo: c.nome.substring(0, 4).toUpperCase(),
        descrizione: `${c.nome} (LOQ: ${c.loq} ${c.unita}) - ${c.isBelowLoq ? 'Sotto LOQ (usato LOQ/2)' : 'Quantificato'}`,
        valore: c.isBelowLoq ? `< ${c.loq}` : c.valore
      }))
    };

    // Prepara eventuali aggiornamenti per i singoli composti presenti nel campione
    const compostiUpdates: Record<string, { valoreRilevato: string; incertezza: string; unitaMisura?: string; isBelowLoq: boolean }> = {};
    compostiState.forEach(c => {
      if (c.provaIdCorrispondente) {
        compostiUpdates[c.provaIdCorrispondente] = {
          valoreRilevato: c.isBelowLoq ? `< ${c.loq}` : c.valore,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Intestazione Modal */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-850 via-teal-900 to-slate-900 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Calcolo Somma Idrocarburi Totali
                </h3>
                <span className="bg-emerald-400/20 text-emerald-300 text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md border border-emerald-400/30">
                  Regola LOQ / 2 & Somma Incertezze
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Somma dei 4 composti (Bromoformio, Cloroformio, Bromodiclorometano, Dibromoclorometano)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Box informativo regole */}
        <div className="px-6 py-3 bg-emerald-50/70 border-b border-emerald-100 text-xs text-emerald-950 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-emerald-900">Regole di calcolo applicate:</span>
            <ul className="list-disc list-inside space-y-0.5 text-[11.5px] text-emerald-850">
              <li>Se un composto è <strong>&lt; LOQ</strong>, il suo contributo alla somma è pari alla metà del limite: <strong>LOQ / 2</strong>.</li>
              <li>Per i composti <strong>&lt; LOQ</strong> l&apos;incertezza <strong>non viene riportata</strong> (non contribuisce all&apos;incertezza totale).</li>
              <li>L&apos;incertezza degli Idrocarburi Totali è la <strong>somma delle incertezze</strong> dei soli composti quantificati (≥ LOQ).</li>
            </ul>
          </div>
        </div>

        {/* Corpo Modal con Tabella dei 4 composti */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider">
                  <th className="py-2.5 px-3">Composto</th>
                  <th className="py-2.5 px-3 w-32">Stato &lt; LOQ</th>
                  <th className="py-2.5 px-3 w-28">LOQ ({unitaMisura})</th>
                  <th className="py-2.5 px-3 w-32">Valore Rilevato</th>
                  <th className="py-2.5 px-3 w-32">Contributo alla Somma</th>
                  <th className="py-2.5 px-3 w-32">Incertezza (±)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {compostiState.map((c, idx) => {
                  const compCalcolato = calcResult.composti[idx];
                  return (
                    <tr key={c.key} className={c.isBelowLoq ? "bg-amber-50/30 hover:bg-amber-50/50 transition-colors" : "hover:bg-slate-50 transition-colors"}>
                      
                      {/* Nome Composto */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          {c.nome}
                        </div>
                        {c.provaIdCorrispondente && (
                          <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                            🔗 Collegato a prova nel campione
                          </div>
                        )}
                      </td>

                      {/* Switch Sotto LOQ */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleToggleBelowLoq(idx)}
                          className={`w-full px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs ${
                            c.isBelowLoq
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {c.isBelowLoq ? (
                            <>
                              <Check className="h-3 w-3 text-amber-700" /> &lt; LOQ (LOQ/2)
                            </>
                          ) : (
                            <>
                              <span className="text-slate-400">≥ LOQ (Misurato)</span>
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
                          className="w-full px-2 py-1 border border-slate-200 bg-white rounded text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>

                      {/* Valore Rilevato */}
                      <td className="py-3 px-3">
                        {c.isBelowLoq ? (
                          <div className="px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs font-mono font-bold text-amber-800 text-center">
                            &lt; {c.loq || '0.01'}
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={c.valore}
                            onChange={(e) => handleUpdateValore(idx, e.target.value)}
                            placeholder="es. 0.04"
                            className="w-full px-2 py-1 border border-emerald-300 bg-emerald-50/40 rounded text-xs font-mono font-bold text-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        )}
                      </td>

                      {/* Contributo effettivo */}
                      <td className="py-3 px-3 font-mono">
                        <div className="flex items-center gap-1">
                          <span className={`font-bold ${c.isBelowLoq ? 'text-amber-800' : 'text-slate-900'}`}>
                            {compCalcolato?.valoreUsatoPerSomma.toFixed(precision)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-sans">{c.unita}</span>
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
                              className="w-full px-2 py-1 border border-slate-200 bg-white rounded text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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

          {/* Riquadro Risultati Calcolati */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Box Somma Concentrazione */}
            <div className="p-4 bg-white rounded-xl border border-emerald-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                  <span>Risultato Concentrazione Totale</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                    {calcResult.quantiSottoLoq} &lt; LOQ ({calcResult.quantiSottoLoq} × LOQ/2)
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black font-mono text-emerald-950">
                    {calcResult.sommaConcentrazioneFormatted}
                  </span>
                  <span className="text-sm font-bold text-slate-600 font-mono">
                    {unitaMisura}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Somma algebrica dei 4 contributi (valori quantificati + LOQ/2 per quelli &lt; LOQ)
              </p>
            </div>

            {/* Box Somma Incertezze */}
            <div className="p-4 bg-white rounded-xl border border-indigo-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                  <span>Incertezza Estesa Totale</span>
                  <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded font-bold">
                    {calcResult.quantiSopraLoq} composti quantificati
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black font-mono text-indigo-950">
                    {calcResult.sommaIncertezzaFormatted}
                  </span>
                  {calcResult.sommaIncertezza > 0 && (
                    <span className="text-sm font-bold text-slate-600 font-mono">
                      {unitaMisura}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                {calcResult.tuttiSottoLoq
                  ? 'Tutti i composti sono < LOQ: incertezza non riportata (N/D)'
                  : 'Somma delle sole incertezze dei composti quantificati (≥ LOQ)'}
              </p>
            </div>

          </div>

          {/* Dettagli e opzioni precisione */}
          <div className="flex items-center justify-between bg-slate-100/80 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Decimali di precisione:</span>
              <select
                value={precision}
                onChange={(e) => setPrecision(Number(e.target.value))}
                className="px-2 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-800"
              >
                <option value={2}>2 decimali (es. 0.04)</option>
                <option value={3}>3 decimali (es. 0.040)</option>
                <option value={4}>4 decimali (es. 0.0400)</option>
              </select>
            </div>
            <div className="text-slate-500 text-[11px] font-medium">
              I dati verranno registrati anche nel Quaderno di Laboratorio
            </div>
          </div>

        </div>

        {/* Footer Modal con azioni */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Annulla
          </button>
          
          <button
            type="button"
            onClick={handleConfirmAndApply}
            className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer hover:shadow-lg"
          >
            <Check className="h-4 w-4" /> 
            Applica a &ldquo;{targetProva?.nome || 'Idrocarburi Totali'}&rdquo; &amp; Sincronizza RdP
          </button>
        </div>

      </div>
    </div>
  );
};
