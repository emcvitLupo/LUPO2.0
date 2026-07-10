const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const indices = [1969, 1986].map(i => i - 1); // 0-based

indices.forEach(idx => {
    lines[idx] = lines[idx] + '\n                )}';
});

fs.writeFileSync(file, lines.join('\n'));
console.log('patched specific lines 2');
