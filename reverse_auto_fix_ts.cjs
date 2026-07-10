const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const errors = [
    1451, 1466, 1524, 1546, 1573, 1669, 1678, 1706, 1728, 1749, 1763, 
    1847, 1880, 1903, 1923, 2077, 2139, 2176, 2267, 2373, 2425, 2438, 
    2456, 2471, 2490, 2502, 2518, 2529, 2549, 2561, 2591, 2600, 2606
];

// Reversing insertion.
// The script did: lines.splice(idx + 1, 0, '                )}');
// Since it was done in descending order, we can just remove them in descending order exactly at idx + 1.
errors.sort((a, b) => b - a);

for (let lineNum of errors) {
    const idx = lineNum - 1;
    // check if it is indeed the one we inserted
    if (lines[idx + 1] === '                )}') {
        lines.splice(idx + 1, 1);
    }
}

fs.writeFileSync(file, lines.join('\n'));
console.log('Reversed auto_fix_ts');
