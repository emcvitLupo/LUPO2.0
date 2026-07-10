const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// 1. operatori sidebar
lines.splice(1451, 0, '                )}');

// 2. operatori mobile
lines.splice(1670, 0, '          )}');

// 3. revisioneSuccessMessage
// Let's find it.
let revIdx = lines.findIndex(l => l.includes('{revisioneSuccessMessage && ('));
console.log('revIdx:', revIdx);
if (revIdx !== -1) {
    // it's a div. Let's find the closing div.
    for (let i = revIdx + 1; i < lines.length; i++) {
        if (lines[i].includes('</div>')) {
            lines.splice(i + 1, 0, '                    )}');
            break;
        }
    }
}

fs.writeFileSync(file, lines.join('\n'));
