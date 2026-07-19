const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

if (!content.includes('proveSelezionateDaPreventivo')) {
  content = content.replace(
    /preventivoAssociatoId\?: string; \/\/ ID del preventivo collegato \(opzionale\)/g,
    'preventivoAssociatoId?: string;\n  proveSelezionateDaPreventivo?: string[]; // IDs of specific tests selected from the quote'
  );
  fs.writeFileSync('src/types.ts', content);
}
