const fs = require('fs');
let file = 'src/components/StatisticheSection.tsx';
let content = fs.readFileSync(file, 'utf8');

// The block that was wrongly inserted
const wrongBlock = `    // F) Accredia per Mese
    const accrediaMensileMap: Record<string, { totali: number; accredia: number }> = {};
    mesiNomiLunghi.forEach(m => {
      accrediaMensileMap[m] = { totali: 0, accredia: 0 };
    });

    accettazioni.forEach(a => {
      const date = a.dataAccettazione;
      if (date) {
        const meseIndex = parseInt(date.split('-')[1] || '1') - 1;
        const meseNome = mesiNomiLunghi[meseIndex] || 'Gennaio';
        if (accrediaMensileMap[meseNome]) {
          accrediaMensileMap[meseNome].totali++;

          if (a.preventivoAssociatoId) {
            const prev = preventivi.find(p => p.id === a.preventivoAssociatoId);
            if (prev) {
              const hasAccrediaProva = prev.proveSelezionate?.some(item => {
                const pr = proveMap.get(item.provaId);
                return pr?.accreditataAccredia === true;
              });
              const hasAccrediaPacchetto = prev.pacchettiSelezionati?.some(item => {
                const pac = pacchettiMap.get(item.pacchettoId);
                return pac?.proveIds?.some(pid => {
                  const pr = proveMap.get(pid);
                  return pr?.accreditataAccredia === true;
                });
              });
              if (hasAccrediaProva || hasAccrediaPacchetto) {
                accrediaMensileMap[meseNome].accredia++;
              }
            }
          }
        }
      }
    });

    const accrediaMensileData = mesiNomiLunghi.map(m => {
      const t = accrediaMensileMap[m].totali;
      const a = accrediaMensileMap[m].accredia;
      return {
        name: m.substring(0, 3),
        totali: t,
        accredia: a,
        percentuale: t > 0 ? Number(((a / t) * 100).toFixed(1)) : 0
      };
    });

`;

content = content.replace(wrongBlock, ""); // remove from the wrong place

// Now put it just before the return of `statisticheAggiuntive`
const anchor = `      campioniAccredia
    };
  }, [preventivi, accettazioni, reagenti, proveMap, pacchettiMap]);`;

content = content.replace(anchor, wrongBlock + anchor);

fs.writeFileSync(file, content);
console.log('patched fix');
