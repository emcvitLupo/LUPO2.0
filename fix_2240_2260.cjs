const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

for (let i = 2245; i < 2261; i++) {
    if (lines[i].includes(')}')) {
        if (i === 2247) { // 2248 is idx 2247
            lines[i] = ''; 
        } else if (i === 2250) { // 2251 is idx 2250
            lines[i] = '                      ))}';
        } else if (i === 2259) { // 2260 is idx 2259
            lines[i] = '';
        }
    }
}
fs.writeFileSync(file, lines.join('\n'));
