const fs = require('fs');
let file = 'src/components/ClientiSection.tsx';
let content = fs.readFileSync(file, 'utf8');

const importButton = `
              <div className="flex flex-col sm:flex-row gap-2">
              {(userRole === 'admin' || currentUser !== null) && (
                  <button
                    onClick={() => {
                      setShowImportModal(true);
                      setImportText('');
                      setImportError(null);
                      setImportSuccessCount(0);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer self-stretch sm:self-auto justify-center"
                    title="Importa da Excel"
                  >
                    <Download className="h-4 w-4" /> Importa Excel
                  </button>
              )}
              {(userRole === 'admin' || currentUser !== null) && (
`;

content = content.replace("{(userRole === 'admin' || currentUser !== null) && (", importButton);

const closeDivStr = `                </button>\n              )}\n              </div>`;
content = content.replace(`                </button>\n              )}`, closeDivStr);

fs.writeFileSync(file, content);
