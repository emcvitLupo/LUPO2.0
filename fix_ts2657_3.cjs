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
insertAfterMatch('onClick={() => { setActiveTab(\'operatori\'); setMobileMenuOpen(false); }}', '            </button>\n          )}'); 
// wait, the button closes right there. I will just do exact index based on previous grep.

fs.writeFileSync(file, lines.join('\n'));
