const fs = require('fs');
let file = 'src/components/ClientiSection.tsx';
let content = fs.readFileSync(file, 'utf8');

const additionalImports = `
import { AlertCircle } from 'lucide-react';
`;

content = content.replace("import { Download, CheckCircle } from 'lucide-react';", "import { Download, CheckCircle, AlertCircle } from 'lucide-react';");


const importLogic = `
  const handleImportClients = async () => {
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
    
    // Ignoriamo le intestazioni (prima riga), presupponendo la struttura fissa
    const dataLines = lines.slice(1);
    const newClients = [];
    
    for (const line of dataLines) {
      // Split by tab (usually what Sheets uses when copying)
      const parts = line.split('\\t').map(p => p.trim());
      
      // If we don't have enough parts, fallback to semicolon or comma if it seems like a CSV
      let columns = parts;
      if (columns.length < 5 && line.includes(';')) {
          columns = line.split(';').map(p => p.trim());
      } else if (columns.length < 5 && line.includes(',')) {
          columns = line.split(',').map(p => p.trim());
      }
      
      // Structure: cognome, nome, indirizzo, citta, P.IVA, CF, codice univoco, e-mail, pec, tel
      const cognome = columns[0] || '';
      const nome = columns[1] || '';
      const indirizzo = columns[2] || '';
      const comune = columns[3] || '';
      const pIva = columns[4] || '';
      const cf = columns[5] || '';
      const codiceDestinatario = columns[6] || '';
      const email = columns[7] || '';
      const pec = columns[8] || '';
      const telefono = columns[9] || '';
      
      const denominazione = nome || cognome ? \`\${nome} \${cognome}\`.trim() : 'Sconosciuto';
      
      // Skip if empty P.IVA and empty CF and empty email (probably empty row)
      if (!pIva && !cf && !email && !denominazione) continue;

      const newClient = {
        id: 'c_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
        denominazione,
        nome: nome || undefined,
        cognome: cognome || undefined,
        partitaIva: pIva,
        codiceFiscale: cf || undefined,
        email: email || '',
        pec: pec || undefined,
        codiceDestinatario: codiceDestinatario || undefined,
        telefono: telefono || undefined,
        indirizzo: indirizzo || undefined,
        comune: comune || undefined,
        note: undefined,
        fatturatoAnnuo: {},
        categorieFatturato: {}
      };
      
      newClients.push(newClient);
    }
    
    if (newClients.length === 0) {
      setImportError('Nessun cliente valido trovato nei dati incollati.');
      return;
    }
    
    // Save to database
    try {
      const { insertClientToSupabase } = await import('../utils/supabaseClient');
      
      let success = 0;
      for (const client of newClients) {
          try {
              // Controlli basici per duplicati
              const exists = clients.some(c => (c.partitaIva && c.partitaIva === client.partitaIva) || (c.codiceFiscale && c.codiceFiscale === client.codiceFiscale));
              if (!exists) {
                  await insertClientToSupabase(client);
                  success++;
              }
          } catch(e) {
              console.error("Errore importazione riga:", e);
          }
      }
      
      if (success > 0) {
          setImportSuccessCount(success);
          // Update local state by re-fetching
          setTimeout(() => {
              window.location.reload(); // Simple way to refresh data
          }, 1500);
      } else {
          setImportError('Nessun nuovo cliente importato. Potrebbero essere tutti duplicati (stessa Partita IVA o CF).');
      }
      
    } catch (err: any) {
       setImportError('Errore di connessione al database durante l\\'importazione.');
       console.error(err);
    }
  };
`;

if (!content.includes('const handleImportClients')) {
  content = content.replace('  const handleSubmit = (e: React.FormEvent) => {', importLogic + '\n  const handleSubmit = (e: React.FormEvent) => {');
  fs.writeFileSync(file, content);
}
