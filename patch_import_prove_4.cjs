const fs = require('fs');
let file = 'src/components/ProveSection.tsx';
let content = fs.readFileSync(file, 'utf8');

const importModalUI = `
      {/* IMPORT MODAL */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-150 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Download className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Importa Prove da Excel</h3>
                    <p className="text-[10px] text-slate-500">Copia e incolla i dati da Google Sheets o Excel</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="mb-4 bg-blue-50 text-blue-800 p-4 rounded-xl text-xs">
                  <strong className="block mb-1">Struttura richiesta (incluse le intestazioni nella prima riga):</strong>
                  <code className="bg-white px-2 py-1 rounded text-blue-900 font-mono text-[10px] border border-blue-100">
                    nome prova analitica | metodo analitico | standard
                  </code>
                </div>

                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full h-64 p-3 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none whitespace-pre"
                  placeholder="Incolla qui i dati..."
                  disabled={importSuccessCount > 0}
                />

                {importError && (
                  <div className="mt-4 p-3 bg-rose-50 text-rose-600 rounded-xl text-xs flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>{importError}</p>
                  </div>
                )}
                
                {importSuccessCount > 0 && (
                  <div className="mt-4 p-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <p><strong>{importSuccessCount}</strong> prove importate con successo! Ricaricamento in corso...</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-150 bg-slate-50 flex justify-end gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 bg-slate-150 rounded-xl transition-colors cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  onClick={handleImportProve}
                  disabled={importSuccessCount > 0}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm cursor-pointer disabled:opacity-50"
                >
                  Importa Dati
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
`;

if (!content.includes('IMPORT MODAL')) {
  content = content.replace(/    <\/div>\n  \);\n}/g, importModalUI + '\n    </div>\n  );\n}');
  fs.writeFileSync(file, content);
}
