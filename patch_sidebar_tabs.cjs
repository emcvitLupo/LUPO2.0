const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetClienti = `<button
              onClick={() => setActiveTab('clienti')}`;
const replaceClienti = `{hasAccessTo('clienti') && (
            <button
              onClick={() => setActiveTab('clienti')}`;

content = content.replace(targetClienti, replaceClienti);
content = content.replace(`Clienti
            </button>`, `Clienti
            </button>
            )}`);

const targetProve = `<button
              onClick={() => setActiveTab('prove')}`;
const replaceProve = `{hasAccessTo('prove') && (
            <button
              onClick={() => setActiveTab('prove')}`;

content = content.replace(targetProve, replaceProve);
content = content.replace(`Prove
            </button>`, `Prove
            </button>
            )}`);

const targetPreventivi = `<button
              onClick={() => setActiveTab('preventivi')}`;
const replacePreventivi = `{hasAccessTo('preventivi') && (
            <button
              onClick={() => setActiveTab('preventivi')}`;

content = content.replace(targetPreventivi, replacePreventivi);
content = content.replace(`Preventivi
            </button>`, `Preventivi
            </button>
            )}`);

const targetAccettazione = `<button
              onClick={() => setActiveTab('accettazione')}`;
const replaceAccettazione = `{hasAccessTo('accettazione') && (
            <button
              onClick={() => setActiveTab('accettazione')}`;

content = content.replace(targetAccettazione, replaceAccettazione);
content = content.replace(`Accettazione Campioni
            </button>`, `Accettazione Campioni
            </button>
            )}`);

const targetFatturazione = `<button
              onClick={() => setActiveTab('fatturazione')}`;
const replaceFatturazione = `{hasAccessTo('fatturazione') && (
            <button
              onClick={() => setActiveTab('fatturazione')}`;

content = content.replace(targetFatturazione, replaceFatturazione);
content = content.replace(`Fatturazione
            </button>`, `Fatturazione
            </button>
            )}`);

const targetReagentario = `<button
              onClick={() => setActiveTab('reagentario')}`;
const replaceReagentario = `{hasAccessTo('reagentario') && (
            <button
              onClick={() => setActiveTab('reagentario')}`;

content = content.replace(targetReagentario, replaceReagentario);
content = content.replace(`Reagentario
            </button>`, `Reagentario
            </button>
            )}`);

const targetOperatori = `{actualRole !== 'AM' && (
              <button
                onClick={() => setActiveTab('operatori')}`;
const replaceOperatori = `{actualRole !== 'AM' && hasAccessTo('operatori') && (
              <button
                onClick={() => setActiveTab('operatori')}`;

content = content.replace(targetOperatori, replaceOperatori);

const targetStatistiche = `<button
              onClick={() => setActiveTab('statistiche')}`;
const replaceStatistiche = `{hasAccessTo('dashboard') && (
            <button
              onClick={() => setActiveTab('statistiche')}`;

content = content.replace(targetStatistiche, replaceStatistiche);
content = content.replace(`Statistiche
            </button>`, `Statistiche
            </button>
            )}`);

fs.writeFileSync(file, content);
console.log('patched sidebar tabs');
