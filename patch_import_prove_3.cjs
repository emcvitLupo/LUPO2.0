const fs = require('fs');
let file = 'src/components/ProveSection.tsx';
let content = fs.readFileSync(file, 'utf8');

const importButton = `
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                setShowImportModal(true);
                setImportText('');
                setImportError(null);
                setImportSuccessCount(0);
              }}
              className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition shadow cursor-pointer"
              title="Importa da Excel"
            >
              <Download className="h-4.5 w-4.5" /> Importa Excel
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition shadow cursor-pointer"
              id="btn-show-add-prova"
            >
              <Plus className="h-4.5 w-4.5" /> Registra Nuova Prova
            </button>
          </div>
`;

if (!content.includes('Importa Excel')) {
  // Replace the old button block
  content = content.replace(
`          <div className="flex gap-2 w-full sm:w-auto">
            {/* Tasto per aprire il form di inserimento */}
            <button
              onClick={() => setShowAddForm(true)}
              className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition shadow cursor-pointer"
              id="btn-show-add-prova"
            >
              <Plus className="h-4.5 w-4.5" /> Registra Nuova Prova
            </button>
          </div>`,
    importButton
  );
  
  fs.writeFileSync(file, content);
}
