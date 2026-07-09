const fs = require('fs');
let file = 'src/components/AccettazioneSection.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                                          <Printer className="h-3.5 w-3.5" /> Emetti Rapporto {acc.codiceAccettazione}
                                        </button>`;

const replaceStr = `                                          <Printer className="h-3.5 w-3.5" /> Emetti Rapporto {acc.codiceAccettazione}
                                        </button>
                                        <button
                                          onClick={() => setExpandedId(null)}
                                          className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg px-4 py-2 text-xs font-bold transition shadow-sm cursor-pointer"
                                        >
                                          Chiudi e torna al registro
                                        </button>`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync(file, content);
console.log('patched close button');
