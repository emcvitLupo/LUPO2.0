const fs = require('fs');
let file = 'src/components/StatisticheSection.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "    const mesiNomiLunghi = [\n      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',\n      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'\n    ];\n    const mesiNomiShort = [\n      'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',\n      'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'\n    ];",
  ""
);

const toTop = `const mesiNomiLunghi = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];
const mesiNomiShort = [
  'Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu',
  'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'
];

export function StatisticheSection({`;

content = content.replace("export function StatisticheSection({", toTop);

fs.writeFileSync(file, content);
console.log('patched mesi');
