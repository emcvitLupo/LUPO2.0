const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

let idx = lines.findIndex(l => l.includes('return (') && !l.includes('=>'));
// to be safe, search backwards from 1322
let insertIdx = 1321;

const toInsert = `  // --- Check Area Access Control ---
  const loggedOperator = operators.find(o => o.nome.toLowerCase() === (userProfileName || '').toLowerCase());
  const hasAccessTo = (areaId: string) => {
    // Admin bypasses area restrictions
    if (actualRole === 'ADMIN') return true; 
    
    // AM bypasses for fatturazione
    if (actualRole === 'AM') {
        if (areaId === 'fatturazione') return true;
        if (areaId === 'clienti') return true;
        if (areaId === 'dashboard') return true;
        return false;
    }

    if (loggedOperator && loggedOperator.areeCompetenza && loggedOperator.areeCompetenza.length > 0) {
      if (areaId === 'clienti') return true;
      if (areaId === 'dashboard') return true;
      if (areaId === 'prove') return loggedOperator.areeCompetenza.includes('Laboratorio') || loggedOperator.areeCompetenza.includes('Direzione Tecnica');
      if (areaId === 'preventivi') return loggedOperator.areeCompetenza.includes('Commerciale');
      if (areaId === 'accettazione') return loggedOperator.areeCompetenza.includes('Accettazione');
      if (areaId === 'fatturazione') return loggedOperator.areeCompetenza.includes('Amministrazione');
      if (areaId === 'reagentario') return loggedOperator.areeCompetenza.includes('Laboratorio');
      return true; // if unmatched
    }
    
    // Default fallback
    return true;
  };`;

lines.splice(insertIdx - 1, 0, toInsert);

fs.writeFileSync(file, lines.join('\n'));
