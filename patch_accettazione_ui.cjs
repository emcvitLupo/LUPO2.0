const fs = require('fs');
let content = fs.readFileSync('src/components/AccettazioneSection.tsx', 'utf8');

// 1. State
const stateStr = `
  const [proveSelezionateDaPreventivo, setProveSelezionateDaPreventivo] = useState<string[] | null>(null);
  
  // When preventivoId changes, by default we select ALL tests in that preventivo
  useEffect(() => {
    if (preventivoId && showAddForm) {
      if (editingAccId) return; // Se stiamo modificando, usiamo i valori già caricati
      const assocPrev = preventivi.find(p => p.id === preventivoId);
      if (assocPrev) {
        const allIds = new Set<string>();
        assocPrev.proveSelezionate?.forEach(item => allIds.add(item.provaId));
        assocPrev.pacchettiSelezionati?.forEach(item => {
          const pack = pacchetti.find(x => x.id === item.pacchettoId);
          pack?.proveIds?.forEach(pid => allIds.add(pid));
        });
        setProveSelezionateDaPreventivo(Array.from(allIds));
      } else {
        setProveSelezionateDaPreventivo(null);
      }
    }
  }, [preventivoId, showAddForm, editingAccId, preventivi, pacchetti]);
`;

if (!content.includes('const [proveSelezionateDaPreventivo')) {
  content = content.replace(
    /const \[preventivoId, setPreventivoId\] = useState\(''\);/g,
    `const [preventivoId, setPreventivoId] = useState('');\n${stateStr}`
  );
}

// 2. Edit population
const editPopStr = `
    setPreventivoId(acc.preventivoAssociatoId || '');
    setProveSelezionateDaPreventivo(acc.proveSelezionateDaPreventivo || null);
`;
content = content.replace(
  /setPreventivoId\(acc.preventivoAssociatoId \|\| ''\);/g,
  editPopStr
);

// 3. Reset
const resetStr = `
    setPreventivoId('');
    setProveSelezionateDaPreventivo(null);
`;
content = content.replace(
  /setPreventivoId\(''\);/g,
  resetStr
);

// 4. Save
content = content.replace(
  /preventivoAssociatoId: preventivoId \|\| undefined,/g,
  `preventivoAssociatoId: preventivoId || undefined,
        proveSelezionateDaPreventivo: proveSelezionateDaPreventivo || undefined,`
);

// 5. UI after the SearchableSelect of preventivoId
const uiStr = `
                  <SearchableSelect<Preventivo>
                    items={preventivi.filter(p => !destinatarioFatturaId || p.clienteId === destinatarioFatturaId || p.clienteId === intestatarioId)}
                    value={preventivoId}
                    onChange={(val) => setPreventivoId(val)}
                    getDisplayValue={(p) => {
                      const clientName = clients.find(cl => cl.id === p.clienteId)?.denominazione || 'Sconosciuto';
                      return \`\${p.codice} • Totale: €\${p.totale} • Stato: \${p.stato} (\${clientName})\`;
                    }}
                    getSearchText={(p) => {
                      const clientName = clients.find(cl => cl.id === p.clienteId)?.denominazione || 'Sconosciuto';
                      return \`\${p.codice} \${p.totale} \${clientName}\`;
                    }}
                    getItemId={(p) => p.id}
                    placeholder="Digita per cercare il preventivo, offerta o cliente..."
                    required
                  />

                  {/* UI per la selezione puntuale delle prove dal preventivo */}
                  {preventivoId && (
                    <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 p-2.5 border-b border-slate-200">
                        <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-indigo-500" />
                          Spunta Prove e Pacchetti da Applicare al Campione
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Deseleziona le prove o i pacchetti che non devono essere eseguiti per questo specifico campione (ad esempio prove opzionali).</p>
                      </div>
                      <div className="p-2 max-h-48 overflow-y-auto space-y-3 bg-white">
                        {(() => {
                          const assocPrev = preventivi.find(p => p.id === preventivoId);
                          if (!assocPrev) return null;
                          
                          const handleToggleTest = (pid: string, isChecked: boolean) => {
                            if (!proveSelezionateDaPreventivo) return;
                            if (isChecked) {
                              setProveSelezionateDaPreventivo([...proveSelezionateDaPreventivo, pid]);
                            } else {
                              setProveSelezionateDaPreventivo(proveSelezionateDaPreventivo.filter(id => id !== pid));
                            }
                          };

                          const handleTogglePackage = (packId: string, isChecked: boolean) => {
                            if (!proveSelezionateDaPreventivo) return;
                            const pack = pacchetti.find(x => x.id === packId);
                            if (!pack) return;
                            
                            if (isChecked) {
                              const newIds = new Set(proveSelezionateDaPreventivo);
                              pack.proveIds?.forEach(pid => newIds.add(pid));
                              setProveSelezionateDaPreventivo(Array.from(newIds));
                            } else {
                              const newIds = new Set(proveSelezionateDaPreventivo);
                              pack.proveIds?.forEach(pid => newIds.delete(pid));
                              setProveSelezionateDaPreventivo(Array.from(newIds));
                            }
                          };

                          return (
                            <>
                              {/* Pacchetti */}
                              {assocPrev.pacchettiSelezionati?.map(item => {
                                const pack = pacchetti.find(x => x.id === item.pacchettoId);
                                if (!pack) return null;
                                // Check if ALL tests in package are selected
                                const isAllSelected = pack.proveIds.every(pid => proveSelezionateDaPreventivo?.includes(pid));
                                const isSomeSelected = pack.proveIds.some(pid => proveSelezionateDaPreventivo?.includes(pid));
                                
                                return (
                                  <div key={item.pacchettoId} className="border border-purple-100 rounded-md p-2 bg-purple-50/20">
                                    <div className="flex items-center gap-2 mb-2 pb-1 border-b border-purple-100/50">
                                      <input 
                                        type="checkbox" 
                                        checked={isAllSelected}
                                        ref={input => { if (input) input.indeterminate = !isAllSelected && isSomeSelected; }}
                                        onChange={(e) => handleTogglePackage(item.pacchettoId, e.target.checked)}
                                        className="h-3.5 w-3.5 text-purple-600 rounded border-slate-300"
                                      />
                                      <span className="text-xs font-bold text-purple-900">{pack.nome} {item.opzionale && <span className="text-[9px] bg-slate-200 text-slate-600 px-1 rounded ml-1">Opzionale</span>}</span>
                                    </div>
                                    <div className="pl-5 space-y-1">
                                      {pack.proveIds.map(pid => {
                                        const pInfo = prove.find(x => x.id === pid);
                                        if (!pInfo) return null;
                                        return (
                                          <div key={pid} className="flex items-center gap-2">
                                            <input 
                                              type="checkbox"
                                              checked={proveSelezionateDaPreventivo?.includes(pid) || false}
                                              onChange={(e) => handleToggleTest(pid, e.target.checked)}
                                              className="h-3 w-3 text-emerald-600 rounded border-slate-300"
                                            />
                                            <span className="text-[10px] text-slate-600">{pInfo.nome}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Prove Singole */}
                              {assocPrev.proveSelezionate?.length > 0 && (
                                <div className="border border-slate-150 rounded-md p-2">
                                  <div className="text-[10px] font-bold text-slate-500 mb-2 pb-1 border-b border-slate-100 uppercase tracking-wider">Prove Singole</div>
                                  <div className="space-y-1.5">
                                    {assocPrev.proveSelezionate.map(item => {
                                      const pInfo = prove.find(x => x.id === item.provaId);
                                      if (!pInfo) return null;
                                      return (
                                        <div key={item.provaId} className="flex items-center gap-2">
                                          <input 
                                            type="checkbox"
                                            checked={proveSelezionateDaPreventivo?.includes(item.provaId) || false}
                                            onChange={(e) => handleToggleTest(item.provaId, e.target.checked)}
                                            className="h-3.5 w-3.5 text-emerald-600 rounded border-slate-300"
                                          />
                                          <span className="text-xs text-slate-700 font-medium">{pInfo.nome} {item.opzionale && <span className="text-[9px] bg-slate-200 text-slate-600 px-1 rounded ml-1">Opzionale</span>}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
`;

content = content.replace(
  /<SearchableSelect<Preventivo>[\s\S]*?required\n                  \/>/m,
  uiStr
);

fs.writeFileSync('src/components/AccettazioneSection.tsx', content);
