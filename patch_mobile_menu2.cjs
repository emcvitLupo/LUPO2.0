const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetOperatori = `{actualRole !== 'AM' && (
            <button
              onClick={() => { setActiveTab('operatori'); setMobileMenuOpen(false); }}`;
const replaceOperatori = `{actualRole !== 'AM' && hasAccessTo('operatori') && (
            <button
              onClick={() => { setActiveTab('operatori'); setMobileMenuOpen(false); }}`;

content = content.replace(targetOperatori, replaceOperatori);

const targetStatistiche = `<button
            onClick={() => { setActiveTab('statistiche'); setMobileMenuOpen(false); }}`;
const replaceStatistiche = `{hasAccessTo('dashboard') && (
          <button
            onClick={() => { setActiveTab('statistiche'); setMobileMenuOpen(false); }}`;

content = content.replace(targetStatistiche, replaceStatistiche);
content = content.replace(`Statistiche
          </button>
        </div>`, `Statistiche
          </button>
          )}
        </div>`);

fs.writeFileSync(file, content);
console.log('patched mobile menu 2');
