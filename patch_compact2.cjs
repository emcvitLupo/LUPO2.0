const fs = require('fs');
let file = 'src/components/AccettazioneSection.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                            {/* Dati Campionamento Disposti Orizzontalmente per Ottimizzare lo Spazio */}
                            <div className="col-span-12 p-3 bg-white grid grid-cols-2 md:grid-cols-5 gap-3.5 text-[9.5px]">
                              <div>
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Numero Campione</span>
                                <span className="font-mono font-bold text-slate-850 block">{previewReportAcc.codiceAccettazione}</span>
                              </div>
                              <div>
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase block">Data Ricevimento</span>
                                <span className="text-slate-800 font-medium block">{previewReportAcc.dataAccettazione} {previewReportAcc.oraRicevimento ? \`ore \${previewReportAcc.oraRicevimento}\` : ''}</span>
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
                            </div>`;

const replaceStr = `                            {/* Dati Campionamento Disposti Orizzontalmente per Ottimizzare lo Spazio */}
                            <div className="col-span-12 py-2 px-1 bg-white grid grid-cols-2 md:grid-cols-5 gap-y-1.5 gap-x-2 text-[9px]">
                              <div>
                                <span className="text-[7px] font-bold text-slate-400 uppercase block leading-none mb-0.5">N. Campione</span>
                                <span className="font-mono font-bold text-slate-850 block leading-tight">{previewReportAcc.codiceAccettazione}</span>
                              </div>
                              <div>
                                <span className="text-[7px] font-bold text-slate-400 uppercase block leading-none mb-0.5">Ricevimento</span>
                                <span className="text-slate-800 font-medium block leading-tight">{previewReportAcc.dataAccettazione} {previewReportAcc.oraRicevimento ? \`\${previewReportAcc.oraRicevimento}\` : ''}</span>
                              </div>
                              <div>
                                <span className="text-[7px] font-bold text-slate-400 uppercase block leading-none mb-0.5">Inizio Prove</span>
                                <span className="font-mono text-slate-800 font-medium block leading-tight">{previewReportAcc.dataInizioProva || previewReportAcc.dataAccettazione}</span>
                              </div>
                              <div>
                                <span className="text-[7px] font-bold text-slate-400 uppercase block leading-none mb-0.5">Fine Prove</span>
                                <span className="font-mono text-slate-800 font-medium block leading-tight">{previewReportAcc.dataTermineProva || previewReportAcc.consegnaPrevista || todayStr}</span>
                              </div>
                              <div>
                                <span className="text-[7px] font-bold text-slate-400 uppercase block leading-none mb-0.5">Cat. Merceologica</span>
                                <span className="text-slate-800 font-normal block leading-tight truncate">{currentCategory}</span>
                              </div>

                              <div className="md:col-span-2">
                                <span className="text-[7px] font-bold text-slate-400 uppercase block leading-none mb-0.5">Desc. Campione</span>
                                <span className="text-slate-800 font-medium block leading-tight truncate" title={previewReportAcc.descrizioneCampione}>{previewReportAcc.descrizioneCampione}</span>
                              </div>
                              <div className="md:col-span-2">
                                <span className="text-[7px] font-bold text-slate-400 uppercase block leading-none mb-0.5">Etichetta</span>
                                <span className="text-slate-700 font-medium italic block leading-tight truncate" title={previewReportAcc.etichettaCampione || 'N.A.'}>{previewReportAcc.etichettaCampione || 'N.A.'}</span>
                              </div>
                              <div>
                                <span className="text-[7px] font-bold text-slate-400 uppercase block leading-none mb-0.5">Quantità/Imball.</span>
                                <span className="text-slate-800 font-medium block leading-tight truncate">{previewReportAcc.quantitaCampione || 'N.D.'} - {previewReportAcc.imballaggio || 'Bott. idonea'}</span>
                              </div>

                              <div className="md:col-span-5 flex flex-wrap gap-x-4 gap-y-1">
                                <div>
                                  <span className="text-[7px] font-bold text-slate-400 uppercase inline-block mr-1">Campionamento:</span>
                                  <span className="text-slate-800 font-medium inline-block text-[8px]">{previewReportAcc.campionatoDa || 'A cura del Cliente'}</span>
                                </div>
                                <div>
                                  <span className="text-[7px] font-bold text-slate-400 uppercase inline-block mr-1">Procedura:</span>
                                  <span className="text-slate-600 italic inline-block text-[8px]">{previewReportAcc.proceduraCampionamento || 'Non dichiarata'}</span>
                                </div>
                                <div>
                                  <span className="text-[7px] font-bold text-slate-400 uppercase inline-block mr-1">Info Cliente:</span>
                                  <span className="text-slate-600 italic font-medium inline-block text-[8px]">{previewReportAcc.informazioniCliente || 'N.A.'}</span>
                                </div>
                              </div>
                            </div>`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
} else {
  console.log("Could not find targetStr");
}

fs.writeFileSync(file, content);
console.log('patched details compact 2');
