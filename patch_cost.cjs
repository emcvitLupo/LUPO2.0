const fs = require('fs');
let content = fs.readFileSync('src/components/AccettazioneSection.tsx', 'utf8');

const calcStr = `"Preventivo correttamente collegato. All'atto del salvataggio, la scheda campione verrà inviata direttamente al modulo Fatturazione per €" + (() => {
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
                            })() + "."}`;

content = content.replace(
  /"Preventivo correttamente collegato\. All'atto del salvataggio, la scheda campione verrà inviata direttamente al modulo Fatturazione per €" \+ \(preventivi\.find\(p => p\.id === preventivoId\)\?.totale \|\| 0\) \+ "\."\}/,
  calcStr + "}"
);

fs.writeFileSync('src/components/AccettazioneSection.tsx', content);
