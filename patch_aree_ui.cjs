const fs = require('fs');
let file = 'src/components/OperatoriSection.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `              {/* Sezione Qualifiche di Firma Multiple Dinamiche */}
              {autorizzatoFirma && (
                <div className="space-y-3.5 text-left p-3.5 bg-amber-50/10 rounded-2xl border border-amber-200/60">`;

const replaceStr = `              {/* Aree di Competenza (Accesso) */}
              <div className="space-y-3.5 text-left p-3.5 bg-slate-50/50 rounded-2xl border border-slate-200">
                <div className="pb-1 border-b border-slate-200">
                  <span className="block text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                    Aree di Competenza (Accesso Consentito):
                  </span>
                  <p className="text-[9px] text-slate-500 font-medium mt-0.5">Seleziona le sezioni del LIMS a cui l'operatore può accedere.</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {AREE_DISPONIBILI.map((area) => (
                    <label key={area.id} className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={areeCompetenza.includes(area.id)}
                        onChange={() => handleToggleArea(area.id)}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-slate-800 focus:ring-slate-500 cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-slate-700">{area.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sezione Qualifiche di Firma Multiple Dinamiche */}
              {autorizzatoFirma && (
                <div className="space-y-3.5 text-left p-3.5 bg-amber-50/10 rounded-2xl border border-amber-200/60">`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
} else {
  console.log("Could not find targetStr");
}

fs.writeFileSync(file, content);
console.log('patched aree UI');
