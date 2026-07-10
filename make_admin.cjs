const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

let start = lines.findIndex(l => l.includes('setActualRole(roleStr);'));
if (start !== -1) {
    let insertIdx = start;
    lines.splice(insertIdx, 0, `      if (user.email && (user.email.toLowerCase() === 'carmine.marroccella@agenziaperlosvilupo.aq.camcom.it' || user.email.toLowerCase() === 'carmine.marroccella@agenziaperlosviluppo.aq.camcom.it')) {
        roleStr = 'ADMIN';
      }`);
}

fs.writeFileSync(file, lines.join('\n'));
