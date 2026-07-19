const fs = require('fs');
let content = fs.readFileSync('src/components/AccettazioneSection.tsx', 'utf8');

const calcStr = `€{(() => {
                                    if (!acc.proveSelezionateDaPreventivo) return assocPrev.totale.toFixed(2);
                                    let total = 0;
                                    assocPrev.proveSelezionate?.forEach(item => {
                                      if (acc.proveSelezionateDaPreventivo?.includes(item.provaId)) {
                                        total += (item.prezzoApplicato * item.quantita);
                                      }
                                    });
                                    assocPrev.pacchettiSelezionati?.forEach(item => {
                                      const pack = pacchetti.find(x => x.id === item.pacchettoId);
                                      if (pack && pack.proveIds.some(pid => acc.proveSelezionateDaPreventivo?.includes(pid))) {
                                        total += (item.prezzoApplicato * item.quantita);
                                      }
                                    });
                                    if (assocPrev.scontoPercentuale) {
                                      total = total - (total * assocPrev.scontoPercentuale / 100);
                                    }
                                    return total.toFixed(2);
                                  })()}`;

content = content.replace(
  /<p>Totale: <strong className="text-slate-800">€\{assocPrev\.totale\.toFixed\(2\)\}<\/strong><\/p>/,
  '<p>Totale Campione: <strong className="text-slate-800">' + calcStr + '</strong></p>'
);

fs.writeFileSync('src/components/AccettazioneSection.tsx', content);
