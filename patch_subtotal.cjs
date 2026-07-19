const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

const calcSubtotal = `const subtotal = prev.proveSelezionate.filter(p => !p.opzionale).reduce((sum, item) => sum + (item.quantita * item.prezzoApplicato), 0) +
        prev.pacchettiSelezionati.filter(p => !p.opzionale).reduce((sum, item) => sum + (item.quantita * item.prezzoApplicato), 0);
      const optionalTotal = prev.proveSelezionate.filter(p => p.opzionale).reduce((sum, item) => sum + (item.quantita * item.prezzoApplicato), 0) +
        prev.pacchettiSelezionati.filter(p => p.opzionale).reduce((sum, item) => sum + (item.quantita * item.prezzoApplicato), 0);`;

// There are two occurrences of subtotal calculation, replace both
content = content.replace(
  /const subtotal = prev.proveSelezionate.reduce\(\(sum, item\) => sum \+ \(item\.quantita \* item\.prezzoApplicato\), 0\) \+\n\s*prev.pacchettiSelezionati.reduce\(\(sum, item\) => sum \+ \(item\.quantita \* item\.prezzoApplicato\), 0\);/g,
  calcSubtotal
);

fs.writeFileSync('src/components/PreventiviSection.tsx', content);
