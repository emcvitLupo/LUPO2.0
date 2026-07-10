const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('{hasAccessTo(') && lines[i+1] && lines[i+1].trim() === lines[i].trim()) {
        lines.splice(i, 1); // remove one of them
    }
}

// for the closing tags, we have )} followed by )} on the next line.
for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === ')}' && lines[i+1] && lines[i+1].trim() === ')}') {
        lines.splice(i, 1);
    }
}

fs.writeFileSync(file, lines.join('\n'));
