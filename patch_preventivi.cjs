const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

const opzProvaCheckbox = `
                            <div className="flex items-center gap-1 ml-3 border-l pl-3 border-slate-200">
                              <input 
                                type="checkbox"
                                checked={!!item.opzionale}
                                onChange={(e) => {
                                  setSelectedQuoteProve(selectedQuoteProve.map(p => 
                                    p.provaId === item.provaId ? { ...p, opzionale: e.target.checked } : p
                                  ));
                                }}
                                className="h-3 w-3 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                id={\`opz-prova-\${item.provaId}\`}
                              />
                              <label htmlFor={\`opz-prova-\${item.provaId}\`} className="text-slate-500 text-[10px] cursor-pointer">Opzionale</label>
                            </div>
`;

if (!content.includes('opz-prova-')) {
  // Try to find the exact place to replace
  let match = content.match(/<input[^>]*type="number"[^>]*value=\{item\.quantita\}[^>]*onChange=\{.*?handleUpdateProvaQty.*?}[^>]*\/>/);
  if (match) {
    content = content.replace(match[0], match[0] + opzProvaCheckbox);
    fs.writeFileSync('src/components/PreventiviSection.tsx', content);
  }
}
