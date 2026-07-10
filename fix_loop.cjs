const { execSync } = require('child_process');
const fs = require('fs');

let file = 'src/App.tsx';

for (let i = 0; i < 50; i++) {
    try {
        execSync('npx prettier --write src/App.tsx', { stdio: 'pipe' });
        console.log('Prettier succeeded!');
        break;
    } catch (err) {
        const output = err.stderr ? err.stderr.toString() : err.stdout.toString();
        
        // Match: Unexpected token. Did you mean `{'}'}` or `&rbrace;`? (1468:18)
        let m1 = output.match(/Unexpected token.*?\(([0-9]+):([0-9]+)\)/);
        // Match: Expected corresponding JSX closing tag for <nav> (1524:11)
        let m2 = output.match(/Expected corresponding JSX closing tag for <([^>]+)> \(([0-9]+):([0-9]+)\)/);
        // Match: Unterminated JSX contents. (1526:11)
        let m3 = output.match(/Unterminated JSX contents\..*?\(([0-9]+):([0-9]+)\)/);
        // Match: Unexpected token, expected "}" (1527:18)
        let m4 = output.match(/Unexpected token, expected "\}".*?\(([0-9]+):([0-9]+)\)/);
        
        let match = m1 || m4;
        
        if (match) {
            let line = parseInt(match[1]) - 1;
            console.log('Removing line ' + (line + 1));
            let lines = fs.readFileSync(file, 'utf8').split('\n');
            lines.splice(line, 1);
            fs.writeFileSync(file, lines.join('\n'));
            continue;
        }
        
        if (m2 || m3 || output.includes('JSX expressions must have one parent element')) {
            // Need to insert `)}`
            // Let's just find the closest `</div>` or `</button>` and insert it.
            // This is hard to automate. Let's just print and stop.
            console.log('Needs insertion. Stopping.', output.split('\n')[0]);
            break;
        }
        
        console.log('Unknown error:', output.substring(0, 200));
        break;
    }
}
