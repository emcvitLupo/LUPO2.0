const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const errors = [
    1451, // for 1440 parent element (line 1451 is </button>)
    1466,
    1524,
    1546,
    1573,
    1669, // for 1664 parent element
    1678,
    1706, // for 1707
    1728, // for 1729
    1749, // for 1750
    1763, // for 1764
    1847, // for 1848
    1880, // for 1881
    1903, // for 1904
    1923, // for 1924
    2077, // for 2078
    2139,
    2176,
    2267, // JSX expressions must have one parent element
    2373, // for 2374
    2425, // for 2426
    2438, // for 2439
    2456, // for 2457
    2471, // for 2472
    2490, // for 2491
    2502, // for 2503
    2518, // for 2519
    2529, // for 2530
    2549, // for 2550
    2561, // for 2562
    2591, // for 2592
    2600, // for 2601
    2606  // for 2607
];

// we want to insert ')}' AFTER the given index line.
// We must sort descending so line numbers don't shift for earlier insertions.
errors.sort((a, b) => b - a);

for (let lineNum of errors) {
    const idx = lineNum - 1; // 0-based
    // insert ')}' after this line
    lines.splice(idx + 1, 0, '                )}');
}

fs.writeFileSync(file, lines.join('\n'));
console.log('auto fixed based on ts errors');
