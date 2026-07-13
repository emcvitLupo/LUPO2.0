const fs = require('fs');

let content = fs.readFileSync('src/components/ClientiSection.tsx', 'utf8');

const stateInjection = `  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessCount, setImportSuccessCount] = useState(0);
`;
content = content.replace('// Form states per nuovo cliente', stateInjection + '\n  // Form states per nuovo cliente');

const importLogic = `
  const handleImportClients = async () => {
    setImportError(null);
    setImportSuccessCount(0);
    
    if (!importText.trim()) {
      setImportError('Incolla i dati dal foglio Excel.');
      return;
    }

    // Parsing tab-separated values (Google Sheets copy-paste)
    const lines = importText.split('\\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) {
      setImportError('Dati insufficienti o formato non valido. Includi le intestazioni e almeno una riga di dati.');
      return;
    }
    
    // Ignoriamo le intestazioni (prima riga), presupponendo la struttura fissa
    const dataLines = lines.slice(1);
    const newClients = [];
    
    for (const line of dataLines) {
      // Split by tab (usually what Sheets uses when copying)
      const parts = line.split('\\t').map(p => p.trim());
      
      // If we don't have enough parts, fallback to semicolon or comma if it seems like a CSV
      let columns = parts;
      if (columns.length < 5 && line.includes(';')) {
          columns = line.split(';').map(p => p.trim());
      } else if (columns.length < 5 && line.includes(',')) {
          columns = line.split(',').map(p => p.trim());
      }
      
      // Structure: cognome, nome, indirizzo, citta, P.IVA, CF, codice univoco, e-mail, pec, tel
      const cognome = columns[0] || '';
      const nome = columns[1] || '';
      const indirizzo = columns[2] || '';
      const comune = columns[3] || '';
      const pIva = columns[4] || '';
      const cf = columns[5] || '';
      const codiceDestinatario = columns[6] || '';
      const email = columns[7] || '';
      const pec = columns[8] || '';
      const telefono = columns[9] || '';
      
      const denominazione = nome || cognome ? \`\${nome} \${cognome}\`.trim() : 'Sconosciuto';
      
      // Skip if empty P.IVA and empty CF and empty email (probably empty row)
      if (!pIva && !cf && !email && !denominazione) continue;

      const newClient = {
        id: 'c_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
        denominazione,
        nome: nome || undefined,
        cognome: cognome || undefined,
        partitaIva: pIva,
        codiceFiscale: cf || undefined,
        email: email || '',
        pec: pec || undefined,
        codiceDestinatario: codiceDestinatario || undefined,
        telefono: telefono || undefined,
        indirizzo: indirizzo || undefined,
        comune: comune || undefined,
        note: undefined,
        fatturatoAnnuo: {},
        categorieFatturato: {}
      };
      
      newClients.push(newClient);
    }
    
    if (newClients.length === 0) {
      setImportError('Nessun cliente valido trovato nei dati incollati.');
      return;
    }
    
    // Save to database
    try {
      const { insertClientToSupabase } = await import('../utils/supabaseClient');
      
      let success = 0;
      for (const client of newClients) {
          try {
              // Controlli basici per duplicati
              const exists = clients.some(c => (c.partitaIva && c.partitaIva === client.partitaIva) || (c.codiceFiscale && c.codiceFiscale === client.codiceFiscale));
              if (!exists) {
                  await insertClientToSupabase(client);
                  success++;
              }
          } catch(e) {
              console.error("Errore importazione riga:", e);
          }
      }
      
      if (success > 0) {
          setImportSuccessCount(success);
          // Update local state by re-fetching
          setTimeout(() => {
              window.location.reload(); // Simple way to refresh data
          }, 1500);
      } else {
          setImportError('Nessun nuovo cliente importato. Potrebbero essere tutti duplicati (stessa Partita IVA o CF).');
      }
      
    } catch (err: any) {
       setImportError('Errore di connessione al database durante l\\'importazione.');
       console.error(err);
    }
  };
`;

content = content.replace('  const handleSaveClient = async () => {', importLogic + '\n  const handleSaveClient = async () => {');

const buttonInjection = `                  <button
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
                  <button`;
content = content.replace('<button\n                  onClick={() => {\n                    setViewMode(\'add\');', buttonInjection.replace('<button', '<button\n                  onClick={() => {\n                    setViewMode(\'add\');'));

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
                    <h3 className="font-bold text-slate-800">Importa Clienti da Excel</h3>
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
                    cognome | nome | indirizzo | citta | P.IVA | CF | codice univoco | e-mail | pec | tel
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
                    <p><strong>{importSuccessCount}</strong> clienti importati con successo! Ricaricamento in corso...</p>
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
                  onClick={handleImportClients}
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

content = content.replace('      {/* MAIN CONTENT AREA */}', importModalUI + '\n      {/* MAIN CONTENT AREA */}');

const importIcons = `import { Users, FileDown, Plus, Search, MapPin, Phone, Mail, Building, Landmark, History, Edit3, X, Save, ShieldAlert, AlertCircle, FileText, Download, CheckCircle, Copy } from 'lucide-react';`;
content = content.replace(/import { Users.*? } from 'lucide-react';/s, importIcons);

fs.writeFileSync('src/components/ClientiSection.tsx', content);

