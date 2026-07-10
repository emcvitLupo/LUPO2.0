const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// For 1) Anagrafica Clienti
content = content.replace(`                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Anagrafica e archivio storico dei clienti del laboratorio
                  </p>
                </div>`, `                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Anagrafica e archivio storico dei clienti del laboratorio
                  </p>
                </div>
                )}`);

// For 2) Tariffario Prove
content = content.replace(`{/* 2) Tariffario Prove */}
                <div`, `{hasAccessTo('prove') && (
                <div`);
content = content.replace(`                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Gestione del tariffario analitico e delle prove accreditate
                  </p>
                </div>`, `                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Gestione del tariffario analitico e delle prove accreditate
                  </p>
                </div>
                )}`);

// For 3) Preventivi e contratti (Let's check what the text actually is!)
