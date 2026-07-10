const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const accessDenied = `<div className="p-8 text-center text-slate-500 bg-white rounded-3xl shadow-sm border border-slate-100">Accesso negato. Non disponi dei permessi necessari per visualizzare questa sezione.</div>`;

const targetClienti = `{activeTab === 'clienti' && (`;
const replaceClienti = `{activeTab === 'clienti' && !hasAccessTo('clienti') && ${accessDenied}}
          {activeTab === 'clienti' && hasAccessTo('clienti') && (`;
content = content.replace(targetClienti, replaceClienti);

const targetProve = `{activeTab === 'prove' && (`;
const replaceProve = `{activeTab === 'prove' && !hasAccessTo('prove') && ${accessDenied}}
          {activeTab === 'prove' && hasAccessTo('prove') && (`;
content = content.replace(targetProve, replaceProve);

const targetPreventivi = `{activeTab === 'preventivi' && (`;
const replacePreventivi = `{activeTab === 'preventivi' && !hasAccessTo('preventivi') && ${accessDenied}}
          {activeTab === 'preventivi' && hasAccessTo('preventivi') && (`;
content = content.replace(targetPreventivi, replacePreventivi);

const targetAccettazione = `{activeTab === 'accettazione' && (`;
const replaceAccettazione = `{activeTab === 'accettazione' && !hasAccessTo('accettazione') && ${accessDenied}}
          {activeTab === 'accettazione' && hasAccessTo('accettazione') && (`;
content = content.replace(targetAccettazione, replaceAccettazione);

const targetFatturazione = `{activeTab === 'fatturazione' && (`;
const replaceFatturazione = `{activeTab === 'fatturazione' && !hasAccessTo('fatturazione') && ${accessDenied}}
          {activeTab === 'fatturazione' && hasAccessTo('fatturazione') && (`;
content = content.replace(targetFatturazione, replaceFatturazione);

const targetReagentario = `{activeTab === 'reagentario' && (`;
const replaceReagentario = `{activeTab === 'reagentario' && !hasAccessTo('reagentario') && ${accessDenied}}
          {activeTab === 'reagentario' && hasAccessTo('reagentario') && (`;
content = content.replace(targetReagentario, replaceReagentario);

const targetOperatori = `{activeTab === 'operatori' && (`;
const replaceOperatori = `{activeTab === 'operatori' && !hasAccessTo('operatori') && ${accessDenied}}
          {activeTab === 'operatori' && hasAccessTo('operatori') && (`;
content = content.replace(targetOperatori, replaceOperatori);

const targetStatistiche = `{activeTab === 'statistiche' && (`;
const replaceStatistiche = `{activeTab === 'statistiche' && !hasAccessTo('dashboard') && ${accessDenied}}
          {activeTab === 'statistiche' && hasAccessTo('dashboard') && (`;
content = content.replace(targetStatistiche, replaceStatistiche);

fs.writeFileSync(file, content);
console.log('patched tab bodies');
