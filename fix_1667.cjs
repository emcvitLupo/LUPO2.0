const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Find line 1670 and 1671 and delete them!
let lineStr = lines[1670 - 1];
if (lineStr.includes('</button>')) {
    lines.splice(1670 - 1, 2); // remove 1670 and 1671
    // insert them after Gestione Operatori
    lines.splice(1675 - 1, 0, '            </button>\n          )}');
}

fs.writeFileSync(file, lines.join('\n'));
