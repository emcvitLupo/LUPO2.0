const fs = require('fs');
let file = 'src/types.ts';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `  isResponsabileTecnico?: boolean; // Se abilitato come Responsabile Tecnico
}`;

const replaceStr = `  isResponsabileTecnico?: boolean; // Se abilitato come Responsabile Tecnico
  areeCompetenza?: string[]; // Aree a cui l'operatore può accedere
}`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
} else {
  console.log("Could not find targetStr");
}
fs.writeFileSync(file, content);
console.log('patched types');
