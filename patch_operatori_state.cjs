const fs = require('fs');
let file = 'src/components/OperatoriSection.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `  const [attivo, setAttivo] = useState(true);
  const [autorizzatoFirma, setAutorizzatoFirma] = useState(true);`;

const replaceStr = `  const [attivo, setAttivo] = useState(true);
  const [autorizzatoFirma, setAutorizzatoFirma] = useState(true);
  const [areeCompetenza, setAreeCompetenza] = useState<string[]>([]);
  
  const AREE_DISPONIBILI = [
    { id: 'dashboard', label: 'Dashboard & Statistiche' },
    { id: 'clienti', label: 'Anagrafica Clienti' },
    { id: 'preventivi', label: 'Preventivi & Contratti' },
    { id: 'accettazione', label: 'Accettazione Campioni' },
    { id: 'prove', label: 'Gestione Prove & Risultati' },
    { id: 'fatturazione', label: 'Amministrazione & Fatturazione' },
    { id: 'reagentario', label: 'Reagentario & Strumenti' },
    { id: 'operatori', label: 'Gestione Operatori' }
  ];

  const handleToggleArea = (id: string) => {
    setAreeCompetenza(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
} else {
  console.log("Could not find targetStr");
}

fs.writeFileSync(file, content);
console.log('patched operatori state');
