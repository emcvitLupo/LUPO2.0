const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

const opzPackCheckbox = `
                            <div className="flex items-center gap-1 ml-3 border-l pl-3 border-slate-200">
                              <input 
                                type="checkbox"
                                checked={!!item.opzionale}
                                onChange={(e) => {
                                  setSelectedQuotePacchetti(selectedQuotePacchetti.map(p => 
                                    p.pacchettoId === item.pacchettoId ? { ...p, opzionale: e.target.checked } : p
                                  ));
                                }}
                                className="h-3 w-3 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                id={\`opz-pack-\${item.pacchettoId}\`}
                              />
                              <label htmlFor={\`opz-pack-\${item.pacchettoId}\`} className="text-slate-500 text-[10px] cursor-pointer">Opzionale</label>
                            </div>
`;

if (!content.includes('opz-pack-')) {
  // Let's find the input for pacchetti quantity
  let regex = /(<input[^>]*type="number"[^>]*value=\{item\.quantita\}[^>]*onChange=\{[^\}]*handleUpdatePacchettoQty[^\}]*\}[^>]*\/>)/;
  let match = content.match(regex);
  if (match) {
    content = content.replace(match[0], match[0] + opzPackCheckbox);
    fs.writeFileSync('src/components/PreventiviSection.tsx', content);
  }
}
