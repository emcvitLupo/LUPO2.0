const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

lines.splice(1451, 0, '                )}');

fs.writeFileSync(file, lines.join('\n'));
