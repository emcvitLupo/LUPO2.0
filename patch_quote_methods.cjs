const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

// Patch handleOpenEditPreventivo
content = content.replace(
  /setSelectedQuoteProve\(prev\.proveSelezionate \|\| \[\]\);/g,
  "setSelectedQuoteProve((prev.proveSelezionate || []).map(p => ({ ...p, uniqueId: Math.random().toString(36).substring(2, 9) })));"
);

content = content.replace(
  /setSelectedQuotePacchetti\(prev\.pacchettiSelezionati \|\| \[\]\);/g,
  "setSelectedQuotePacchetti((prev.pacchettiSelezionati || []).map(p => ({ ...p, uniqueId: Math.random().toString(36).substring(2, 9) })));"
);

// Patch handleAddProvaToQuote
const addProvaReplacement = `  const handleAddProvaToQuote = (provaId: string) => {
    const defaultPrice = getProvaInfo(provaId)?.prezzoListino || 0;
    const giaIncluso = selectedQuoteProve.find(p => p.provaId === provaId && p.gruppo === activeGruppoName);
    if (giaIncluso) {
      setSelectedQuoteProve(selectedQuoteProve.map(p =>
        p.uniqueId === giaIncluso.uniqueId ? { ...p, quantita: p.quantita + 1 } : p
      ));
    } else {
      setSelectedQuoteProve([...selectedQuoteProve, { provaId, quantita: 1, prezzoApplicato: defaultPrice, uniqueId: Math.random().toString(36).substring(2, 9), gruppo: activeGruppoName }]);
    }
  };`;

content = content.replace(
  /  const handleAddProvaToQuote = \(provaId: string\) => \{[\s\S]*?  \};/m,
  addProvaReplacement
);

// Patch handleRemoveProvaFromQuote
content = content.replace(
  /setSelectedQuoteProve\(selectedQuoteProve\.filter\(p => p\.provaId !== provaId\)\);/g,
  "setSelectedQuoteProve(selectedQuoteProve.filter(p => p.uniqueId !== provaId));" // Here we will pass uniqueId to this function instead of provaId
);
content = content.replace(/handleRemoveProvaFromQuote = \(provaId: string\)/g, "handleRemoveProvaFromQuote = (uniqueId: string)");

// Patch handleUpdateProvaQty
content = content.replace(
  /setSelectedQuoteProve\(selectedQuoteProve\.map\(p =>\n\s*p\.provaId === provaId \? \{ \.\.\.p, quantita: qty \} : p\n\s*\)\);/m,
  "setSelectedQuoteProve(selectedQuoteProve.map(p =>\n      p.uniqueId === uniqueId ? { ...p, quantita: qty } : p\n    ));"
);
content = content.replace(/handleUpdateProvaQty = \(provaId: string, qty: number\)/g, "handleUpdateProvaQty = (uniqueId: string, qty: number)");


// Patch handleUpdateProvaPrice
content = content.replace(
  /setSelectedQuoteProve\(selectedQuoteProve\.map\(p =>\n\s*p\.provaId === provaId \? \{ \.\.\.p, prezzoApplicato: price \} : p\n\s*\)\);/m,
  "setSelectedQuoteProve(selectedQuoteProve.map(p =>\n      p.uniqueId === uniqueId ? { ...p, prezzoApplicato: price } : p\n    ));"
);
content = content.replace(/handleUpdateProvaPrice = \(provaId: string, price: number\)/g, "handleUpdateProvaPrice = (uniqueId: string, price: number)");


fs.writeFileSync('src/components/PreventiviSection.tsx', content);
