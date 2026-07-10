const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

let start = lines.findIndex(l => l.includes('const hasAccessTo ='));
if (start !== -1) {
    let insertIdx = start + 3; 
    // const hasAccessTo = (areaId: string) => {
    //   // Admin bypasses area restrictions
    //   if (actualRole === 'ADMIN') return true;
    
    lines.splice(insertIdx, 0, "    if (areaId === 'operatori') return false; // Solo ADMIN (già autorizzato sopra)");
}

fs.writeFileSync(file, lines.join('\n'));
