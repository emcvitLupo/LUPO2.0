const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

function insertAfterMatch(search, add) {
    let idx = lines.findIndex(l => l.includes(search));
    if (idx !== -1) {
        lines.splice(idx + 1, 0, add);
    }
}

// 1. operatori sidebar
insertAfterMatch('Gestione Operatori / Ruoli', '                )}');

// 2. operatori mobile
insertAfterMatch('Gestione Operatori', '          )}'); // Wait! There are two 'Gestione Operatori' (one for sidebar, one for mobile, one for dash). Let's be specific.
