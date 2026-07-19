const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

const updatedTotalUI = `              {/* Box Calcolatore Finale delle tasse ed invio */}
              <div className="mt-4 pt-3 border-t border-slate-200 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase">Totale Imponibile (Fisso):</span>
                  <span className="font-bold text-slate-800 font-mono">
                    €{calcolaImponibileQuote().toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                {calcolaImponibileOpzionale() > 0 && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-slate-400 uppercase">Costi Opzionali (Non Inclusi):</span>
                    <span className="font-bold text-slate-400 font-mono italic">
                      +€{calcolaImponibileOpzionale().toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}`;

content = content.replace(
  /              \{\/\* Box Calcolatore Finale delle tasse ed invio \*\/\}\n              <div className="mt-4 pt-3 border-t border-slate-200 space-y-3">\n                <div className="flex justify-between items-center text-xs">\n                  <span className="font-bold text-slate-500 uppercase">Totale Imponibile:<\/span>\n                  <span className="font-bold text-slate-800 font-mono">\n                    €\{calcolaImponibileQuote\(\)\.toLocaleString\('it-IT', \{ minimumFractionDigits: 2, maximumFractionDigits: 2 \}\)\}\n                  <\/span>\n                <\/div>/,
  updatedTotalUI
);

fs.writeFileSync('src/components/PreventiviSection.tsx', content);
