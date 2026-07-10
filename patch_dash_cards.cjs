const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetClienti = `{/* 1) Anagrafica Clienti */}
                <div
                  onClick={() => setActiveTab('clienti')}`;
const replaceClienti = `{hasAccessTo('clienti') && (
                <div
                  onClick={() => setActiveTab('clienti')}`;

content = content.replace(targetClienti, replaceClienti);
content = content.replace(`Anagrafica Clienti
                  </p>
                </div>`, `Anagrafica Clienti
                  </p>
                </div>
                )}`);

const targetProve = `{/* 2) Gestione Prove */}
                <div
                  onClick={() => setActiveTab('prove')}`;
const replaceProve = `{hasAccessTo('prove') && (
                <div
                  onClick={() => setActiveTab('prove')}`;

content = content.replace(targetProve, replaceProve);
content = content.replace(`Gestione Prove
                  </p>
                </div>`, `Gestione Prove
                  </p>
                </div>
                )}`);

const targetPreventivi = `{/* 3) Preventivi e contratti */}
                <div
                  onClick={() => setActiveTab('preventivi')}`;
const replacePreventivi = `{hasAccessTo('preventivi') && (
                <div
                  onClick={() => setActiveTab('preventivi')}`;

content = content.replace(targetPreventivi, replacePreventivi);
content = content.replace(`Preventivi e Contratti
                  </p>
                </div>`, `Preventivi e Contratti
                  </p>
                </div>
                )}`);

const targetAccettazione = `{/* 4) Accettazione Campioni */}
                <div
                  onClick={() => setActiveTab('accettazione')}`;
const replaceAccettazione = `{hasAccessTo('accettazione') && (
                <div
                  onClick={() => setActiveTab('accettazione')}`;

content = content.replace(targetAccettazione, replaceAccettazione);
content = content.replace(`Accettazione
                  </p>
                </div>`, `Accettazione
                  </p>
                </div>
                )}`);

const targetReagentario = `{/* 5) Reagentario Chimico */}
                <div
                  onClick={() => setActiveTab('reagentario')}`;
const replaceReagentario = `{hasAccessTo('reagentario') && (
                <div
                  onClick={() => setActiveTab('reagentario')}`;

content = content.replace(targetReagentario, replaceReagentario);
content = content.replace(`Reagentario Chimico
                  </p>
                </div>`, `Reagentario Chimico
                  </p>
                </div>
                )}`);

const targetStatistiche = `{/* 6) Analisi & Statistiche */}
                <div
                  onClick={() => setActiveTab('statistiche')}`;
const replaceStatistiche = `{hasAccessTo('dashboard') && (
                <div
                  onClick={() => setActiveTab('statistiche')}`;

content = content.replace(targetStatistiche, replaceStatistiche);
content = content.replace(`Analisi & Statistiche
                  </p>
                </div>`, `Analisi & Statistiche
                  </p>
                </div>
                )}`);

const targetFatturazione = `{/* 8) Amministrazione & Fatturazione */}
                <div
                  onClick={() => setActiveTab('fatturazione')}`;
const replaceFatturazione = `{hasAccessTo('fatturazione') && (
                <div
                  onClick={() => setActiveTab('fatturazione')}`;

content = content.replace(targetFatturazione, replaceFatturazione);
content = content.replace(`Amministrazione
                  </p>
                </div>`, `Amministrazione
                  </p>
                </div>
                )}`);

const targetOperatori = `{/* 9) Gestione Operatori & Password */}
                {actualRole !== 'AM' && (
                  <div
                    onClick={() => setActiveTab('operatori')}`;
const replaceOperatori = `{/* 9) Gestione Operatori & Password */}
                {actualRole !== 'AM' && hasAccessTo('operatori') && (
                  <div
                    onClick={() => setActiveTab('operatori')}`;

content = content.replace(targetOperatori, replaceOperatori);

fs.writeFileSync(file, content);
console.log('patched dash cards');
