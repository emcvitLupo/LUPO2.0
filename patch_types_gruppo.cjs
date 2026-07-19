const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

content = content.replace(
  /limitiSelezionati\?: LimiteRiferimento\[\];/g,
  'limitiSelezionati?: LimiteRiferimento[];\n    gruppo?: string;'
);

content = content.replace(
  /opzionale\?: boolean;\n  }>;(\n\s*pacchettiSelezionati: Array<{)/g,
  'opzionale?: boolean;\n    gruppo?: string;\n  }>;$1'
);

// We should also patch pacchettiSelezionati
content = content.replace(
  /opzionale\?: boolean;\n  }>;(\n\s*totale: number;)/g,
  'opzionale?: boolean;\n    gruppo?: string;\n  }>;$1'
);

fs.writeFileSync('src/types.ts', content);
