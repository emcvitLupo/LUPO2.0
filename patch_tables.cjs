const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

// The grouping logic:
const groupingLogic = `
const renderGroupedItems = (prev, isPriceHidden, isPrint = false) => {
  const groupsMap = new Map();
  const getGroup = (g) => {
    const key = g || 'Generale';
    if (!groupsMap.has(key)) groupsMap.set(key, { prove: [], pacchetti: [] });
    return groupsMap.get(key);
  };
  prev.proveSelezionate?.forEach(p => getGroup(p.gruppo).prove.push(p));
  prev.pacchettiSelezionati?.forEach(p => getGroup(p.gruppo).pacchetti.push(p));

  const sortedKeys = Array.from(groupsMap.keys()).sort((a,b) => {
    if (a === 'Generale') return -1;
    if (b === 'Generale') return 1;
    return a.localeCompare(b);
  });

  return sortedKeys.map(gruppo => {
    const { prove: grpProve, pacchetti: grpPack } = groupsMap.get(gruppo);
    return (
      <React.Fragment key={gruppo}>
        {gruppo !== 'Generale' && (
          <tr className="bg-slate-50/80 border-y border-slate-200">
            <td colSpan={isPriceHidden ? 4 : 5} className="py-2 px-3 font-bold text-slate-800 text-[11px] uppercase tracking-wider">
              {isPrint ? 'Matrice/Campione: ' : 'Gruppo: '}<span className="text-blue-700">{gruppo}</span>
            </td>
          </tr>
        )}
        {grpProve.map(item => {
          const info = getProvaInfo(item.provaId);
          return (
            <tr key={item.uniqueId} className={\`hover:bg-slate-50/55 \${info?.accreditataAccredia ? 'bg-emerald-50/15' : ''}\`}>
              <td className="py-2.5 px-3 font-semibold text-slate-850">
                <div className="flex items-start gap-1">
                  <span>{info?.nome || 'Parametro Chimico'}{info?.accreditataAccredia && ' *'}</span>
                </div>
                {item.limitiSelezionati && item.limitiSelezionati.length > 0 && (
                  <div className="mt-1.5 space-y-0.5 text-[10px] pl-1 font-normal text-slate-600">
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Limiti e Note Normative:</div>
                    {item.limitiSelezionati.map(lim => (
                      <div key={lim.id} className="flex flex-wrap items-center gap-1 text-[10.5px]">
                        <span className="font-mono text-slate-800 font-bold bg-slate-50 px-1 border border-slate-150 rounded">{lim.valore} {lim.unitaMisura}</span>
                        <span className="text-slate-400 font-serif">→</span>
                        <span className="text-emerald-700 font-semibold">{lim.norma}</span>
                        {lim.note && <span className="text-slate-400 text-[9.5px] italic">({lim.note})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </td>
              <td className="py-2.5 px-3 text-slate-400 font-mono text-[9px] font-semibold">{info?.metodoAnalitico || 'Generale'}</td>
              <td className="py-2.5 px-3 text-center font-bold text-slate-705">{item.quantita}</td>
              {(!isPriceHidden || item.opzionale) ? (
                <>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">€{item.prezzoApplicato.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">€{(item.quantita * item.prezzoApplicato).toFixed(2)}</td>
                </>
              ) : (
                <td className="py-2.5 px-3 text-center text-slate-450 italic text-[10px]">Incluso nel preventivo</td>
              )}
            </tr>
          );
        })}
        {grpPack.map(item => {
          const info = getPacchettoInfo(item.pacchettoId);
          return (
            <tr key={item.uniqueId} className="hover:bg-slate-50/55">
              <td className="py-2.5 px-3 font-bold text-purple-900">
                {info?.nome || 'Pacchetto Analitico'}
                <div className="text-[9px] text-purple-600 font-normal mt-0.5">
                  Include {info?.proveIds?.length || 0} determinazioni
                </div>
              </td>
              <td className="py-2.5 px-3 text-slate-400 italic font-medium text-[10px]">Pacchetto Multi-Analitico</td>
              <td className="py-2.5 px-3 text-center font-bold text-slate-705">{item.quantita}</td>
              {(!isPriceHidden || item.opzionale) ? (
                <>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">€{item.prezzoApplicato.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700">€{(item.quantita * item.prezzoApplicato).toFixed(2)}</td>
                </>
              ) : (
                <td className="py-2.5 px-3 text-center text-slate-450 italic text-[10px]">Incluso nel preventivo</td>
              )}
            </tr>
          );
        })}
      </React.Fragment>
    );
  });
};
`;

// Insert it somewhere at the top of PreventiviSection component, after `const calcolaTotalePreventivo`
content = content.replace(
  /  const calcolaTotalePreventivo = \(\) => \{[\s\S]*?  \};/m,
  "$&" + "\n\n" + groupingLogic
);

fs.writeFileSync('src/components/PreventiviSection.tsx', content);
