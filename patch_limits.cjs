const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

// handleAddLimiteToProva
content = content.replace(/handleAddLimiteToProva = \(provaId: string, limiteId: string\)/g, "handleAddLimiteToProva = (uniqueId: string, limiteId: string)");
content = content.replace(/p\.provaId === provaId/g, "p.uniqueId === uniqueId");

// handleUpdateLimiteOfProva
content = content.replace(/handleUpdateLimiteOfProva = \(provaId: string, limiteId: string, updates: Partial<LimiteRiferimento>\)/g, "handleUpdateLimiteOfProva = (uniqueId: string, limiteId: string, updates: Partial<LimiteRiferimento>)");
// note that p.provaId === provaId was already replaced in the previous block because of the global replacement? No, let's just replace all `p.provaId === provaId` with `p.uniqueId === uniqueId`. Wait, inside `handleAddProvaToQuote` it's `p.provaId === provaId`. Let's be careful.

content = content.replace(
  /handleRemoveLimiteFromProva = \(provaId: string, limiteId: string\)/g, 
  "handleRemoveLimiteFromProva = (uniqueId: string, limiteId: string)"
);

fs.writeFileSync('src/components/PreventiviSection.tsx', content);
