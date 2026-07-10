const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('&& (')) {
        console.log(`Line ${i+1}: ${lines[i].trim()}`);
    }
}
