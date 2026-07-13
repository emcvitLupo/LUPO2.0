const fs = require('fs');
let file = 'src/components/ProveSection.tsx';
let content = fs.readFileSync(file, 'utf8');

const importLogic = `
  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessCount, setImportSuccessCount] = useState(0);

  const handleImportProve = async () => {
    setImportError(null);
    setImportSuccessCount(0);
    
    if (!importText.trim()) {
      setImportError('Incolla i dati dal foglio Excel.');
      return;
    }

    // Parsing tab-separated values (Google Sheets copy-paste)
    const lines = importText.split('\\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 2) {
      setImportError('Dati insufficienti o formato non valido. Includi le intestazioni e almeno una riga di dati.');
      return;
    }
    
    // Ignoriamo le intestazioni (prima riga)
    const dataLines = lines.slice(1);
    const newProve = [];
    
    for (const line of dataLines) {
      const parts = line.split('\\t').map(p => p.trim());
      
      let columns = parts;
      if (columns.length < 3 && line.includes(';')) {
          columns = line.split(';').map(p => p.trim());
      } else if (columns.length < 3 && line.includes(',')) {
          columns = line.split(',').map(p => p.trim());
      }
      
      // Structure: nome prova analitica | metodo analitico | standard
      const nomeProva = columns[0] || '';
      const metodoAnalitico = columns[1] || '';
      const standard = columns[2] || '';
      
      if (!nomeProva) continue;

      const newProva = {
        id: 'p_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
        nome: nomeProva,
        categoriaMerceologica: 'Tutte', // Default category
        metodoAnalitico: metodoAnalitico,
        prezzoListino: 0,
        tempoEsecuzioneGiorni: 1,
        descrizione: standard ? \`Standard/Norma: \${standard}\` : undefined,
        accreditataAccredia: false,
        puntiIncertezza: [],
        puntiRipetibilita: [],
        limiteQuantificazione: undefined,
        unitaMisura: undefined,
        limitiRiferimento: [],
        formulaCalcolo: undefined,
        tecnicoEsecutore: undefined,
        variabiliCalcolo: []
      };
      
      newProve.push(newProva);
    }
    
    if (newProve.length === 0) {
      setImportError('Nessuna prova valida trovata nei dati incollati.');
      return;
    }
    
    try {
      const { insertProvaToSupabase } = await import('../utils/supabaseClient');
      
      let success = 0;
      for (const prova of newProve) {
          try {
              const exists = prove.some(p => p.nome.toLowerCase() === prova.nome.toLowerCase());
              if (!exists) {
                  await insertProvaToSupabase(prova);
                  success++;
              }
          } catch(e) {
              console.error("Errore importazione riga:", e);
          }
      }
      
      if (success > 0) {
          setImportSuccessCount(success);
          setTimeout(() => {
              window.location.reload();
          }, 1500);
      } else {
          setImportError('Nessuna nuova prova importata. Potrebbero essere tutte duplicate.');
      }
      
    } catch (err: any) {
       setImportError('Errore di connessione al database durante l\\'importazione.');
       console.error(err);
    }
  };
`;

if (!content.includes('const handleImportProve')) {
  content = content.replace('  const [showAddForm, setShowAddForm] = useState(false);', importLogic + '\n  const [showAddForm, setShowAddForm] = useState(false);');
  fs.writeFileSync(file, content);
}
