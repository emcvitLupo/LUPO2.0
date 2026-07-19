const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

const updatedRowTotal = `                      const optionalTotal = (prev.proveSelezionate?.filter(p => p.opzionale).reduce((s, p) => s + (p.quantita * p.prezzoApplicato), 0) || 0) +
                        (prev.pacchettiSelezionati?.filter(p => p.opzionale).reduce((s, p) => s + (p.quantita * p.prezzoApplicato), 0) || 0);
                      
                      return (
                  <tr 
                    key={prev.id} 
                    className="border-b border-slate-200 hover:bg-slate-50 transition text-xs relative group cursor-pointer"
                    onClick={() => handleRowClick(prev)}
                  >`;

content = content.replace(
  /                  return \(\n                  <tr \n                    key=\{prev\.id\} \n                    className="border-b border-slate-200 hover:bg-slate-50 transition text-xs relative group cursor-pointer"\n                    onClick=\{.*?handleRowClick.*?\}>\n/m,
  updatedRowTotal + '\n'
);

const updatedTotalDisplay = `                    <td className="py-2 px-2.5 align-top text-right font-mono font-bold text-slate-900">
                      €{prev.totale.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {optionalTotal > 0 && (
                        <div className="text-[9px] text-slate-400 font-medium italic mt-0.5">
                          +€{optionalTotal.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} opz.
                        </div>
                      )}
                    </td>`;

content = content.replace(
  /                    <td className="py-2 px-2\.5 align-top text-right font-mono font-bold text-slate-900">\n                      €\{prev\.totale\.toLocaleString\('it-IT', \{ minimumFractionDigits: 2, maximumFractionDigits: 2 \}\)\}\n                    <\/td>/,
  updatedTotalDisplay
);

fs.writeFileSync('src/components/PreventiviSection.tsx', content);
