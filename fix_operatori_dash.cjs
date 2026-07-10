const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`{actualRole !== 'AM' && (`)) {
        if (lines[i+1].includes(`{hasAccessTo('operatori') && (`)) {
            lines[i] = `                {actualRole !== 'AM' && hasAccessTo('operatori') && (`;
            lines.splice(i+1, 1); // remove the {hasAccessTo...
        }
    }
}

// now fix the closing tags. We have )} at 2167 and )} at 2169.
// But we removed one opening, so we need to remove one closing.
let closingFound = false;
for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].includes('Gestione Operatori')) {
        // Look ahead for )}
        for (let j = i; j < i + 15; j++) {
            if (lines[j] && lines[j].trim() === ')}' && lines[j+1] && lines[j+1].trim() === '' && lines[j+2] && lines[j+2].trim() === ')}') {
                lines.splice(j, 1);
                break;
            }
        }
        break;
    }
}

fs.writeFileSync(file, lines.join('\n'));
