const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Reverse fix4! 
// wait, fix4 iterated from 0 to length. When it swapped, line i became </div> and line i+1 became }
// So now we find </div> at line i, and } at line i+1, and swap them back!
for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i].includes('</div>') && lines[i+1] && lines[i+1].includes('}')) {
        // Only swap if this looks like what fix4 did (one has `</div>`, the other has `}`)
        // Let's be careful. Let's just swap them back.
        let temp = lines[i];
        lines[i] = lines[i+1];
        lines[i+1] = temp;
        // Skip the next line
        i++;
    }
}

fs.writeFileSync(file, lines.join('\n'));
console.log('reversed fix4');
