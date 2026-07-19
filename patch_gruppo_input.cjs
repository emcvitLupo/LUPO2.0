const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

const gruppoInput = `                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <span className="block text-[11px] font-black text-slate-500 uppercase tracking-wide">
                    Matrice / Nome Gruppo (Opzionale):
                  </span>
                  <div className="relative min-w-[240px]">
                    <input
                      type="text"
                      placeholder="es. Acqua di prima pioggia"
                      value={activeGruppoName}
                      onChange={(e) => setActiveGruppoName(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold text-slate-705 placeholder-slate-400"
                      title="Digita un nome per raggruppare le prove che aggiungerai da ora in poi (es. per matrice diversa o per scarichi diversi)."
                    />
                  </div>
                </div>`;

content = content.replace(
  /                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">\n\s*<span className="block text-\[11px\] font-black text-slate-500 uppercase tracking-wide">\n\s*Cerca Parametri Analitici:/,
  gruppoInput + '\n\n' + '                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">\n                  <span className="block text-[11px] font-black text-slate-500 uppercase tracking-wide">\n                    Cerca Parametri Analitici:'
);

fs.writeFileSync('src/components/PreventiviSection.tsx', content);
