const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

const newCalcs = `
  const calcolaImponibileQuote = () => {
    const totProve = selectedQuoteProve.filter(p => !p.opzionale).reduce((sum, item) => sum + (item.quantita * item.prezzoApplicato), 0);
    const totPacks = selectedQuotePacchetti.filter(p => !p.opzionale).reduce((sum, item) => sum + (item.quantita * item.prezzoApplicato), 0);
    return totProve + totPacks;
  };

  const calcolaImponibileOpzionale = () => {
    const totProve = selectedQuoteProve.filter(p => p.opzionale).reduce((sum, item) => sum + (item.quantita * item.prezzoApplicato), 0);
    const totPacks = selectedQuotePacchetti.filter(p => p.opzionale).reduce((sum, item) => sum + (item.quantita * item.prezzoApplicato), 0);
    return totProve + totPacks;
  };
`;

content = content.replace(
  /  const calcolaImponibileQuote = \(\) => \{[\s\S]*?  \};/m,
  newCalcs.trim()
);

fs.writeFileSync('src/components/PreventiviSection.tsx', content);
