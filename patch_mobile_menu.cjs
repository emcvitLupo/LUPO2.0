const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetClienti = `<button
            onClick={() => { setActiveTab('clienti'); setMobileMenuOpen(false); }}`;
const replaceClienti = `{hasAccessTo('clienti') && (
          <button
            onClick={() => { setActiveTab('clienti'); setMobileMenuOpen(false); }}`;

content = content.replace(targetClienti, replaceClienti);
content = content.replace(`Clienti
          </button>`, `Clienti
          </button>
          )}`);

const targetProve = `<button
            onClick={() => { setActiveTab('prove'); setMobileMenuOpen(false); }}`;
const replaceProve = `{hasAccessTo('prove') && (
          <button
            onClick={() => { setActiveTab('prove'); setMobileMenuOpen(false); }}`;

content = content.replace(targetProve, replaceProve);
content = content.replace(`Prove
          </button>`, `Prove
          </button>
          )}`);

const targetPreventivi = `<button
            onClick={() => { setActiveTab('preventivi'); setMobileMenuOpen(false); }}`;
const replacePreventivi = `{hasAccessTo('preventivi') && (
          <button
            onClick={() => { setActiveTab('preventivi'); setMobileMenuOpen(false); }}`;

content = content.replace(targetPreventivi, replacePreventivi);
content = content.replace(`Preventivi
          </button>`, `Preventivi
          </button>
          )}`);

const targetAccettazione = `<button
            onClick={() => { setActiveTab('accettazione'); setMobileMenuOpen(false); }}`;
const replaceAccettazione = `{hasAccessTo('accettazione') && (
          <button
            onClick={() => { setActiveTab('accettazione'); setMobileMenuOpen(false); }}`;

content = content.replace(targetAccettazione, replaceAccettazione);
content = content.replace(`Accettazione Campioni
          </button>`, `Accettazione Campioni
          </button>
          )}`);

const targetFatturazione = `<button
            onClick={() => { setActiveTab('fatturazione'); setMobileMenuOpen(false); }}`;
const replaceFatturazione = `{hasAccessTo('fatturazione') && (
          <button
            onClick={() => { setActiveTab('fatturazione'); setMobileMenuOpen(false); }}`;

content = content.replace(targetFatturazione, replaceFatturazione);
content = content.replace(`Fatturazione
          </button>`, `Fatturazione
          </button>
          )}`);

const targetReagentario = `<button
            onClick={() => { setActiveTab('reagentario'); setMobileMenuOpen(false); }}`;
const replaceReagentario = `{hasAccessTo('reagentario') && (
          <button
            onClick={() => { setActiveTab('reagentario'); setMobileMenuOpen(false); }}`;

content = content.replace(targetReagentario, replaceReagentario);
content = content.replace(`Reagentario
          </button>`, `Reagentario
          </button>
          )}`);

fs.writeFileSync(file, content);
console.log('patched mobile menu');
