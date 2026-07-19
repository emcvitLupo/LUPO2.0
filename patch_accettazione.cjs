const fs = require('fs');
let content = fs.readFileSync('src/components/AccettazioneSection.tsx', 'utf8');

const updatedGetResolved = `  const getResolvedProveForAccettazione = (acc: AccettazioneCampione) => {
    if (!acc.preventivoAssociatoId) return [];
    const assocPrev = preventivi.find(p => p.id === acc.preventivoAssociatoId);
    if (!assocPrev) return [];
    
    const resolved: Prova[] = [];
    const addedIds = new Set<string>();

    // 1) Prove individuali
    assocPrev.proveSelezionate?.forEach(item => {
      if (!addedIds.has(item.provaId)) {
        if (acc.proveSelezionateDaPreventivo && !acc.proveSelezionateDaPreventivo.includes(item.provaId)) return;
        const p = prove.find(x => x.id === item.provaId);
        if (p) {
          resolved.push(p);
          addedIds.add(p.id);
        }
      }
    });

    // 2) Prove incluse nei pacchetti
    assocPrev.pacchettiSelezionati?.forEach(item => {
      const pack = pacchetti.find(x => x.id === item.pacchettoId);
      if (pack) {
        pack.proveIds?.forEach(pid => {
          if (!addedIds.has(pid)) {
            if (acc.proveSelezionateDaPreventivo && !acc.proveSelezionateDaPreventivo.includes(pid)) return;
            const p = prove.find(x => x.id === pid);
            if (p) {
              resolved.push(p);
              addedIds.add(pid);
            }
          }
        });
      }
    });

    return resolved;
  };`;

content = content.replace(
  /  const getResolvedProveForAccettazione = \(acc: AccettazioneCampione\) => \{[\s\S]*?    return resolved;\n  \};/m,
  updatedGetResolved
);

fs.writeFileSync('src/components/AccettazioneSection.tsx', content);
