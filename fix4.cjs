const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Find and fix 1969
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(')}') && lines[i+1] && lines[i+1].includes('</div>')) {
        let temp = lines[i];
        lines[i] = lines[i+1];
        lines[i+1] = temp;
    }
}

fs.writeFileSync(file, lines.join('\n'));
