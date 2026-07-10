const fs = require('fs');
let file = 'src/App.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// Find all lines with `                )}`
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(')}')) {
        // If the NEXT line is `</button>` or `</div>`, we should swap them!
        if (lines[i+1] && (lines[i+1].includes('</button>') || lines[i+1].includes('</div>'))) {
            let temp = lines[i];
            lines[i] = lines[i+1];
            lines[i+1] = temp;
            i++; // skip next
        }
    }
}

fs.writeFileSync(file, lines.join('\n'));
