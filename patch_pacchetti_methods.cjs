const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

const addPacchettoReplacement = `  const handleAddPacchettoToQuote = (pacchettoId: string) => {
    const defaultPrice = getPacchettoInfo(pacchettoId)?.prezzoScontato || 0;
    const giaIncluso = selectedQuotePacchetti.find(p => p.pacchettoId === pacchettoId && p.gruppo === activeGruppoName);
    if (giaIncluso) {
      setSelectedQuotePacchetti(selectedQuotePacchetti.map(p =>
        p.uniqueId === giaIncluso.uniqueId ? { ...p, quantita: p.quantita + 1 } : p
      ));
    } else {
      setSelectedQuotePacchetti([...selectedQuotePacchetti, { pacchettoId, quantita: 1, prezzoApplicato: defaultPrice, uniqueId: Math.random().toString(36).substring(2, 9), gruppo: activeGruppoName }]);
    }
  };`;

content = content.replace(
  /  const handleAddPacchettoToQuote = \(pacchettoId: string\) => \{[\s\S]*?  \};/m,
  addPacchettoReplacement
);

content = content.replace(/handleRemovePacchettoFromQuote = \(pacchettoId: string\)/g, "handleRemovePacchettoFromQuote = (uniqueId: string)");
content = content.replace(/setSelectedQuotePacchetti\(selectedQuotePacchetti\.filter\(p => p\.pacchettoId !== pacchettoId\)\);/g, "setSelectedQuotePacchetti(selectedQuotePacchetti.filter(p => p.uniqueId !== uniqueId));");

content = content.replace(/handleUpdatePacchettoQty = \(pacchettoId: string, qty: number\)/g, "handleUpdatePacchettoQty = (uniqueId: string, qty: number)");
content = content.replace(
  /setSelectedQuotePacchetti\(selectedQuotePacchetti\.map\(p =>\n\s*p\.pacchettoId === pacchettoId \? \{ \.\.\.p, quantita: qty \} : p\n\s*\)\);/m,
  "setSelectedQuotePacchetti(selectedQuotePacchetti.map(p =>\n      p.uniqueId === uniqueId ? { ...p, quantita: qty } : p\n    ));"
);

content = content.replace(/handleRemovePacchettoFromQuote\(item\.pacchettoId\)/g, "handleRemovePacchettoFromQuote(item.uniqueId)");
content = content.replace(/handleUpdatePacchettoQty\(item\.pacchettoId,/g, "handleUpdatePacchettoQty(item.uniqueId,");
content = content.replace(/p\.pacchettoId === item\.pacchettoId \? \{ \.\.\.p, opzionale: e\.target\.checked \} : p/g, "p.uniqueId === item.uniqueId ? { ...p, opzionale: e.target.checked } : p");
content = content.replace(/key=\{item\.pacchettoId\}/g, "key={item.uniqueId}");
content = content.replace(/id=\{\`opz-pack-\$\{item\.pacchettoId\}\`\}/g, "id={`opz-pack-${item.uniqueId}`}");
content = content.replace(/htmlFor=\{\`opz-pack-\$\{item\.pacchettoId\}\`\}/g, "htmlFor={`opz-pack-${item.uniqueId}`}");


fs.writeFileSync('src/components/PreventiviSection.tsx', content);
