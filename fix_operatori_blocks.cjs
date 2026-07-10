const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// We know exactly where these 3 blocks are.
// 1439: {actualRole !== 'AM' && (
//   <button ...> ... </button>
// 1452 is where we need )}
let i1 = lines.findIndex(l => l.includes("{actualRole !== 'AM' && (") && l.includes("button") === false);
// Wait, the button is on the next line.
console.log('Found i1:', i1);

fs.writeFileSync(file, lines.join('\n'));
