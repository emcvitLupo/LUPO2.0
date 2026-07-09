const fs = require('fs');
let file = 'src/components/AccettazioneSection.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                            {/* Accreditamento e marchi integrati sul lato sinistro, in basso al logo */}
                            <div className="mt-3.5 flex items-center gap-3 border-t border-slate-100 pt-3">
                              <span className="text-[9px] font-mono font-black text-[#8c1c16] bg-[#8c1c16]/5 px-2 py-0.5 rounded border border-[#8c1c16]/12">
                                LAB N° 0451L
                              </span>
                              <div className="text-[7.5px] uppercase text-slate-400 font-extrabold tracking-tight leading-normal">
                                Membro degli Accordi di Mutuo Riconoscimento <span className="text-[#8c1c16] font-black">EA, IAF e ILAC</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Destra: Logo ACCREDIA se sono presenti prove accreditate */}
                          {hasAccreditedTests ? (
                            <div className="shrink-0 flex flex-col items-center justify-center border border-slate-200/60 p-1.5 rounded-xl bg-white shadow-3xs">
                              <img`;

const replaceStr = `                          </div>
                          
                          {/* Destra: Logo ACCREDIA se sono presenti prove accreditate */}
                          {hasAccreditedTests ? (
                            <div className="shrink-0 flex flex-col items-center justify-center p-1.5">
                              {modelloRdpText && <div className="text-[7px] text-slate-500 font-bold uppercase tracking-widest mb-1">{modelloRdpText}</div>}
                              <img`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
} else {
  console.log("Could not find targetStr");
}

fs.writeFileSync(file, content);
console.log('patched logo mod');
