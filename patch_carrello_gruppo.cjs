const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

// For Prove
content = content.replace(
  /\{info\?.accreditataAccredia && \(\n\s*<span className="px-1.5 py-0.2 bg-emerald-100\/70 text-emerald-800 text-\[8px\] rounded font-black tracking-wider uppercase border border-emerald-250">\n\s*🛡️ Accredia\n\s*<\/span>\n\s*\)\}/m,
  "{info?.accreditataAccredia && (\n                                <span className=\"px-1.5 py-0.2 bg-emerald-100/70 text-emerald-800 text-[8px] rounded font-black tracking-wider uppercase border border-emerald-250\">\n                                  🛡️ Accredia\n                                </span>\n                              )}\n                              {item.gruppo && (\n                                <span className=\"px-1.5 py-0.5 bg-blue-100/80 text-blue-800 text-[9px] rounded font-bold border border-blue-200\">\n                                  {item.gruppo}\n                                </span>\n                              )}"
);

// For Pacchetti
content = content.replace(
  /<span className="truncate max-w-\[200px\]">\{info\?.nome \|\| 'Pacchetto'\}<\/span>/,
  "<span className=\"truncate max-w-[200px] flex items-center gap-1.5\">\n                              {info?.nome || 'Pacchetto'}\n                              {item.gruppo && (\n                                <span className=\"px-1.5 py-0.5 bg-blue-100/80 text-blue-800 text-[9px] rounded font-bold border border-blue-200\">\n                                  {item.gruppo}\n                                </span>\n                              )}\n                            </span>"
);

fs.writeFileSync('src/components/PreventiviSection.tsx', content);
