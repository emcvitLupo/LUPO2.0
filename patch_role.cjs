const fs = require('fs');
let file = 'src/components/AccettazioneSection.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                                <div className="text-[7px] text-slate-500 font-semibold tracking-tight uppercase leading-normal font-sans">
                                  {ruoloTecnicoEsteso}
                                </div>`;

const replaceStr = `                                <div className="text-[7px] text-slate-500 font-semibold tracking-tight uppercase leading-normal font-sans">
                                  {previewReportAcc.ruoloFirmatarioTecnico || 'Responsabile Tecnico'}
                                </div>`;

content = content.replace(targetStr, replaceStr);

// Let's also replace the useState for ruoloTecnicoEsteso to not cause unused variable warnings
const stateTarget = `  const [ruoloTecnicoEsteso, setRuoloTecnicoEsteso] = useState<string>('Dott. Chim. V.ce Responsabile / Responsabile Tecnico');`;
content = content.replace(stateTarget, "");

fs.writeFileSync(file, content);
console.log('patched role');
