const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

const updatedTotalCard = `                    <div className="flex justify-between text-xs text-slate-705 font-bold">
                      <span>Imponibile Netto:</span>
                      <span className="font-mono">€{taxableAmount.toFixed(2)}</span>
                    </div>
                    {optionalTotal > 0 && (
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold italic border-t border-slate-100 pt-1 mt-1">
                        <span>Totale Opzionale (Escluso):</span>
                        <span className="font-mono">+€{optionalTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-slate-500">`;

content = content.replace(
  /                    <div className="flex justify-between text-xs text-slate-705 font-bold">\n                      <span>Imponibile Netto:<\/span>\n                      <span className="font-mono">€\{taxableAmount\.toFixed\(2\)\}<\/span>\n                    <\/div>\n                    <div className="flex justify-between text-xs text-slate-500">/g,
  updatedTotalCard
);

const updatedTotalCard2 = `                        <div className="flex justify-between text-xs text-slate-705 font-bold">
                          <span>Imponibile Netto:</span>
                          <span className="font-mono">€{taxableAmount.toFixed(2)}</span>
                        </div>
                        {optionalTotal > 0 && (
                          <div className="flex justify-between text-[10px] text-slate-400 font-bold italic border-t border-slate-100 pt-1 mt-1">
                            <span>Totale Opzionale (Escluso):</span>
                            <span className="font-mono">+€{optionalTotal.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs text-slate-500">`;

content = content.replace(
  /                        <div className="flex justify-between text-xs text-slate-705 font-bold">\n                          <span>Imponibile Netto:<\/span>\n                          <span className="font-mono">€\{taxableAmount\.toFixed\(2\)\}<\/span>\n                        <\/div>\n                        <div className="flex justify-between text-xs text-slate-500">/g,
  updatedTotalCard2
);

fs.writeFileSync('src/components/PreventiviSection.tsx', content);
