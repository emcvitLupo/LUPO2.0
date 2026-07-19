const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

const updatedMapStart = `              filteredAndSortedQuotes.map(prev => {
                const clientDetails = clients.find(c => c.id === prev.clienteId);
                const vStatus = getOfferValidityStatus(prev.dataCreazione, prev.validitaOfferta);
                const optionalTotal = (prev.proveSelezionate?.filter(p => p.opzionale).reduce((s, p) => s + (p.quantita * p.prezzoApplicato), 0) || 0) +
                        (prev.pacchettiSelezionati?.filter(p => p.opzionale).reduce((s, p) => s + (p.quantita * p.prezzoApplicato), 0) || 0);`;

content = content.replace(
  /              filteredAndSortedQuotes\.map\(prev => \{\n                const clientDetails = clients\.find\(c => c\.id === prev\.clienteId\);\n                const vStatus = getOfferValidityStatus\(prev\.dataCreazione, prev\.validitaOfferta\);/m,
  updatedTotalMapStart1 = updatedMapStart
);

fs.writeFileSync('src/components/PreventiviSection.tsx', content);
