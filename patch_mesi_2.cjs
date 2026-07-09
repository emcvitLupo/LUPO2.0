const fs = require('fs');
let file = 'src/components/StatisticheSection.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /    const mesiNomiLunghi = \[\s*'Gennaio',\s*'Febbraio',\s*'Marzo',\s*'Aprile',\s*'Maggio',\s*'Giugno',\s*'Luglio',\s*'Agosto',\s*'Settembre',\s*'Ottobre',\s*'Novembre',\s*'Dicembre'\s*\];\s*const mesiNomiShort = \['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'\];/g,
  ""
);

fs.writeFileSync(file, content);
console.log('patched mesi again');
