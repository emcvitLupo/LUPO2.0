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

// Sidebar
wrapButton('clienti', `<button
              onClick={() => setActiveTab('clienti')}
              className={\`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer \${
                activeTab === 'clienti'
                  ? 'bg-indigo-400 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }\`}
              id="sidebar-clienti"
            >
              <Users className="h-4 w-4" />
              Clienti
            </button>`);

// Prove
wrapButton('prove', `<button
              onClick={() => setActiveTab('prove')}
              className={\`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer \${
                activeTab === 'prove'
                  ? 'bg-indigo-400 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }\`}
              id="sidebar-prove"
            >
              <FlaskConical className="h-4 w-4" />
              Prove
            </button>`);

// Preventivi
wrapButton('preventivi', `<button
              onClick={() => setActiveTab('preventivi')}
              className={\`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer \${
                activeTab === 'preventivi'
                  ? 'bg-indigo-400 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }\`}
              id="sidebar-preventivi"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Preventivi
            </button>`);

// Accettazione
wrapButton('accettazione', `<button
              onClick={() => setActiveTab('accettazione')}
              className={\`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer \${
                activeTab === 'accettazione'
                  ? 'bg-indigo-400 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }\`}
              id="sidebar-accettazione"
            >
              <FileText className="h-4 w-4" />
              Accettazione Campioni
            </button>`);

// Fatturazione
wrapButton('fatturazione', `<button
              onClick={() => setActiveTab('fatturazione')}
              className={\`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer \${
                activeTab === 'fatturazione'
                  ? 'bg-indigo-400 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }\`}
              id="sidebar-fatturazione"
            >
              <Receipt className="h-4 w-4" />
              Fatturazione
            </button>`);

// Reagentario
wrapButton('reagentario', `<button
              onClick={() => setActiveTab('reagentario')}
              className={\`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer \${
                activeTab === 'reagentario'
                  ? 'bg-indigo-400 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }\`}
              id="sidebar-reagentario"
            >
              <Archive className="h-4 w-4" />
              Reagentario
            </button>`);

// Statistiche
wrapButton('dashboard', `<button
              onClick={() => setActiveTab('statistiche')}
              className={\`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer \${
                activeTab === 'statistiche'
                  ? 'bg-indigo-400 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }\`}
              id="sidebar-statistiche"
            >
              <BarChart3 className="h-4 w-4" />
              Statistiche & Report
            </button>`);

fs.writeFileSync(file, content);
