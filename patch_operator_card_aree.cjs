const fs = require('fs');
let file = 'src/components/OperatoriSection.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                )}
              </div>

              {/* Box Info Credenziali Sicurezza */}`;

const replaceStr = `                )}
              </div>

              {/* Aree di Accesso */}
              <div className="p-2.5 bg-slate-50/60 border border-slate-200/50 rounded-xl space-y-1.5 text-left">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-700 font-extrabold pb-0.5 border-b border-slate-200/50">
                  <span className="uppercase tracking-widest">Aree di Accesso Consentite</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {op.areeCompetenza && op.areeCompetenza.length > 0 ? (
                    op.areeCompetenza.map(areaId => {
                      const areaLabel = AREE_DISPONIBILI.find(a => a.id === areaId)?.label || areaId;
                      return (
                        <span key={areaId} className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-600 rounded text-[8.5px] font-bold shadow-3xs">
                          {areaLabel}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[9px] text-slate-400 italic font-medium">Nessuna area specifica o tutte consentite (default)</span>
                  )}
                </div>
              </div>

              {/* Box Info Credenziali Sicurezza */}`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
} else {
  console.log("Could not find targetStr");
}

fs.writeFileSync(file, content);
console.log('patched operator card aree');
