const fs = require('fs');
const content = fs.readFileSync('src/components/AccettazioneSection.tsx', 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex((line, i) => i === 3452 && line.includes('{openQuadernoRowId === p.id && (() => {'));
const endIndex = lines.findIndex((line, i) => i >= startIndex && line.includes('})()}'));

console.log('Start index:', startIndex);
console.log('End index:', endIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find bounds');
  process.exit(1);
}

const replacement = `                                              {openQuadernoRowId === p.id && (() => {
                                                const hasFormulaConfig = !!p.formulaCalcolo;
                                                const defaultQuad = { 
                                                  formula: p.formulaCalcolo || '', 
                                                  variabili: (p.variabiliCalcolo || []).map(v => ({ 
                                                    simbolo: v.simbolo, 
                                                    descrizione: v.descrizione, 
                                                    valore: '' as number | '' 
                                                  })) 
                                                };
                                                
                                                // Se currentVal.quadernoCalcolo esiste e ha variabili, le usiamo. 
                                                // Altrimenti inizializziamo dal default (ossia dalla prova stessa).
                                                const quad = (currentVal.quadernoCalcolo && currentVal.quadernoCalcolo.variabili.length > 0)
                                                  ? currentVal.quadernoCalcolo 
                                                  : defaultQuad;
                                                  
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
                                                              Inserimento variabili per calcolare il valore rilevato per la determinazione di: <strong className="text-slate-700">{p.nome}</strong>
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

                                                      {!hasFormulaConfig ? (
                                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-xs text-center font-medium shadow-3xs">
                                                          Nessuna formula di calcolo predisposta per questa prova.<br/>
                                                          Puoi configurare la formula e le relative variabili nella sezione <strong className="font-bold">Prove e Listino</strong>.
                                                        </div>
                                                      ) : (
                                                        <div className="space-y-4">
                                                          {/* Formula Applicata */}
                                                          <div className="bg-white p-3 rounded-xl border border-indigo-150 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-2">
                                                            <div className="flex flex-col gap-1">
                                                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Formula Aritmetica Applicata</span>
                                                              <code className="font-mono text-sm font-black text-indigo-700 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100 inline-block w-fit">
                                                                {formula}
                                                              </code>
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
                                                                          setTempRisultati(prev => {
                                                                            const row = prev[p.id] || {};
                                                                            const currentQuad = row.quadernoCalcolo && row.quadernoCalcolo.variabili.length > 0 
                                                                              ? row.quadernoCalcolo 
                                                                              : defaultQuad;
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
                                                              <div className="text-[10.5px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-md border border-amber-200/50">
                                                                ⚠️ {evalResult.error}
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
                                                                <button
                                                                  type="button"
                                                                  onClick={() => {
                                                                    const formattedValue = evalResult.value !== 0 && Math.abs(evalResult.value) < 0.0001
                                                                      ? evalResult.value.toFixed(8).replace(/\.?0+$/, '')
                                                                      : evalResult.value.toFixed(6).replace(/\.?0+$/, '');
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
                                                                      
                                                                      // Assicurati che il quadernoCalcolo aggiornato venga salvato nel risultato finale
                                                                      const currentQuad = row.quadernoCalcolo && row.quadernoCalcolo.variabili.length > 0 
                                                                        ? row.quadernoCalcolo 
                                                                        : defaultQuad;
                                                                      updatedRow.quadernoCalcolo = currentQuad;

                                                                      return {
                                                                        ...prev,
                                                                        [p.id]: updatedRow
                                                                      };
                                                                    });
                                                                    setOpenQuadernoRowId(null);
                                                                  }}
                                                                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-lg transition-colors shadow-3xs cursor-pointer flex items-center justify-center gap-1.5"
                                                                >
                                                                  <Check className="h-4 w-4" /> 📤 Invia Risultato al Rapporto di Prova
                                                                </button>
                                                              </div>
                                                            ) : (
                                                              <div className="text-[10px] text-slate-400 italic">
                                                                Inserisci i valori delle variabili per calcolare il risultato...
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                      )}
                                                      </div>
                                                    </td>
                                                  </tr>
                                                );
                                              })()}`;

const newLines = [
  ...lines.slice(0, startIndex),
  replacement,
  ...lines.slice(endIndex + 1) // +1 to exclude the old end line if it matched exactly
];

fs.writeFileSync('src/components/AccettazioneSection.tsx', newLines.join('\n'));
console.log('Replaced successfully');
