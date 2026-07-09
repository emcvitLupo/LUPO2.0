const fs = require('fs');
let file = 'src/components/AccettazioneSection.tsx';
let content = fs.readFileSync(file, 'utf8');

const stateInsertTarget = `  const [showLabNotebookInPrint, setShowLabNotebookInPrint] = useState<boolean>(false);`;
const stateInsertCode = `  const [showLabNotebookInPrint, setShowLabNotebookInPrint] = useState<boolean>(false);
  const [modelloRdpText, setModelloRdpText] = useState<string>(() => localStorage.getItem('lims_modello_rdp') || 'Modello 1 Rev. 1');

  useEffect(() => {
    localStorage.setItem('lims_modello_rdp', modelloRdpText);
  }, [modelloRdpText]);`;

if (content.includes(stateInsertTarget)) {
  content = content.replace(stateInsertTarget, stateInsertCode);
} else {
  console.log("Could not find stateInsertTarget");
}

const inputInsertTarget = `                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-indigo-500 rounded-lg px-3 py-2 cursor-pointer border border-indigo-400 transition hover:bg-indigo-600 select-none">
                      <input 
                        type="checkbox"
                        checked={showLabNotebookInPrint}`;
const inputInsertCode = `                    <div className="flex items-center bg-indigo-500 rounded-lg px-2 py-1.5 border border-indigo-400">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 mr-2">Modello RdP:</span>
                      <input 
                        type="text"
                        value={modelloRdpText}
                        onChange={(e) => setModelloRdpText(e.target.value)}
                        className="bg-indigo-600 border border-indigo-400 text-white text-[10px] rounded px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-white placeholder-indigo-300"
                        placeholder="Es: Modello 1"
                      />
                    </div>
                    <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-indigo-500 rounded-lg px-3 py-2 cursor-pointer border border-indigo-400 transition hover:bg-indigo-600 select-none">
                      <input 
                        type="checkbox"
                        checked={showLabNotebookInPrint}`;

if (content.includes(inputInsertTarget)) {
  content = content.replace(inputInsertTarget, inputInsertCode);
} else {
  console.log("Could not find inputInsertTarget");
}

fs.writeFileSync(file, content);
console.log('patched modello settings');
