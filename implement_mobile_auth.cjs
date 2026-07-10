const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

function wrapButton(tab, buttonStr) {
    if (!content.includes(buttonStr)) {
        console.log('Could not find button for', tab);
        return;
    }
    content = content.replace(buttonStr, `{hasAccessTo('${tab}') && (\n${buttonStr}\n)}`);
}

// Mobile sidebar buttons

wrapButton('clienti', `<button
            onClick={() => { setActiveTab('clienti'); setMobileMenuOpen(false); }}
            className={\`px-4 py-2 text-xs font-bold rounded-lg text-left \${activeTab === 'clienti' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-400' : 'text-slate-650'}\`}
          >
            Clienti
          </button>`);

wrapButton('prove', `<button
            onClick={() => { setActiveTab('prove'); setMobileMenuOpen(false); }}
            className={\`px-4 py-2 text-xs font-bold rounded-lg text-left \${activeTab === 'prove' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-400' : 'text-slate-650'}\`}
          >
            Prove
          </button>`);

wrapButton('preventivi', `<button
            onClick={() => { setActiveTab('preventivi'); setMobileMenuOpen(false); }}
            className={\`px-4 py-2 text-xs font-bold rounded-lg text-left \${activeTab === 'preventivi' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-400' : 'text-slate-650'}\`}
          >
            Preventivi
          </button>`);

wrapButton('accettazione', `<button
            onClick={() => { setActiveTab('accettazione'); setMobileMenuOpen(false); }}
            className={\`px-4 py-2 text-xs font-bold rounded-lg text-left \${activeTab === 'accettazione' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-400' : 'text-slate-650'}\`}
          >
            Accettazione Campioni
          </button>`);

wrapButton('fatturazione', `<button
            onClick={() => { setActiveTab('fatturazione'); setMobileMenuOpen(false); }}
            className={\`px-4 py-2 text-xs font-bold rounded-lg text-left \${activeTab === 'fatturazione' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-400' : 'text-slate-650'}\`}
          >
            Fatturazione
          </button>`);

wrapButton('reagentario', `<button
            onClick={() => { setActiveTab('reagentario'); setMobileMenuOpen(false); }}
            className={\`px-4 py-2 text-xs font-bold rounded-lg text-left \${activeTab === 'reagentario' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-400' : 'text-slate-650'}\`}
          >
            Reagentario
          </button>`);

wrapButton('statistiche', `<button
            onClick={() => { setActiveTab('statistiche'); setMobileMenuOpen(false); }}
            className={\`px-4 py-2 text-xs font-bold rounded-lg text-left \${activeTab === 'statistiche' ? 'bg-indigo-50 text-indigo-700 border-l-4 border-l-indigo-400' : 'text-slate-650'}\`}
          >
            Statistiche & Analisi
          </button>`);

fs.writeFileSync(file, content);
