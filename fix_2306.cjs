const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

let idx = lines.findIndex(l => l.includes('setRevisioneSuccessMessage(null)'));
if (idx !== -1) {
    // The previous line is </div>. Let's move it to the next line.
    lines.splice(idx - 1, 1);
    lines.splice(idx, 0, '                      </div>\n                    )}');
}

fs.writeFileSync(file, lines.join('\n'));
