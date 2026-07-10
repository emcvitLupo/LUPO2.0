const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `  const alertReagenti = reagenti
    .filter(r => {`;

const replaceStr = `  // --- Check Area Access Control ---
  const loggedOperator = operators.find(o => o.nome.toLowerCase() === (userProfileName || '').toLowerCase());
  const hasAccessTo = (areaId: string) => {
    // Admin bypasses area restrictions for the most part, except maybe AM
    if (actualRole === 'ADMIN') return true; 
    
    // If we have a LIMS operator mapped, check their specific areas
    if (loggedOperator && loggedOperator.areeCompetenza && loggedOperator.areeCompetenza.length > 0) {
      return loggedOperator.areeCompetenza.includes(areaId);
    }
    
    // Default fallback if no specific areas set or no operator mapped
    return true;
  };

  const alertReagenti = reagenti
    .filter(r => {`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync(file, content);
console.log('patched hasAccessTo');
