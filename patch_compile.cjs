const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

// 1. Fix line 1371
content = content.replace(
  /const giaIncluso = selectedQuoteProve\.find\(p => p\.uniqueId === uniqueId && p\.gruppo === activeGruppoName\);/g,
  "const giaIncluso = selectedQuoteProve.find(p => p.provaId === provaId && p.gruppo === activeGruppoName);"
);

// 2. Fix line 1382
content = content.replace(
  /setSelectedQuoteProve\(selectedQuoteProve\.filter\(p => p\.uniqueId !== provaId\)\);/g,
  "setSelectedQuoteProve(selectedQuoteProve.filter(p => p.uniqueId !== uniqueId));"
);

// 3. Fix line 1392
content = content.replace(
  /const handleUpdateProvaPrice = \(provaId: string, prezzo: number\) => \{/g,
  "const handleUpdateProvaPrice = (uniqueId: string, prezzo: number) => {"
);

// 4. Fix line 1399
content = content.replace(
  /const handleAddLimiteToProva = \(provaId: string, predefinito\?: LimiteRiferimento\) => \{/g,
  "const handleAddLimiteToProva = (uniqueId: string, predefinito?: LimiteRiferimento) => {"
);

// 5. Fix line 1418
content = content.replace(
  /const handleUpdateLimiteOfProva = \(provaId: string, limiteId: string, fields: Partial<LimiteRiferimento>\) => \{/g,
  "const handleUpdateLimiteOfProva = (uniqueId: string, limiteId: string, fields: Partial<LimiteRiferimento>) => {"
);

fs.writeFileSync('src/components/PreventiviSection.tsx', content);
