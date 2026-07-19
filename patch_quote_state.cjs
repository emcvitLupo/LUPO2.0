const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

content = content.replace(
  /const \[selectedQuoteProve, setSelectedQuoteProve\] = useState<Array<\{ provaId: string; quantita: number; prezzoApplicato: number; limitiSelezionati\?: LimiteRiferimento\[\] \}>>\(\[\]\);/g,
  "const [selectedQuoteProve, setSelectedQuoteProve] = useState<Array<{ provaId: string; quantita: number; prezzoApplicato: number; limitiSelezionati?: LimiteRiferimento[]; opzionale?: boolean; gruppo?: string; uniqueId: string }>>([]);"
);

content = content.replace(
  /const \[selectedQuotePacchetti, setSelectedQuotePacchetti\] = useState<Array<\{ pacchettoId: string; quantita: number; prezzoApplicato: number \}>>\(\[\]\);/g,
  "const [selectedQuotePacchetti, setSelectedQuotePacchetti] = useState<Array<{ pacchettoId: string; quantita: number; prezzoApplicato: number; opzionale?: boolean; gruppo?: string; uniqueId: string }>>([]);\n  const [activeGruppoName, setActiveGruppoName] = useState<string>('');"
);

fs.writeFileSync('src/components/PreventiviSection.tsx', content);
