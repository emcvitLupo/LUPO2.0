const fs = require('fs');
const parser = require('@babel/parser');
const { execSync } = require('child_process');

let file = 'src/App.tsx';

for (let i = 0; i < 50; i++) {
    let content = fs.readFileSync(file, 'utf8');
    try {
        parser.parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx']
        });
        console.log("Success!");
        break;
    } catch (e) {
        if (e.message.includes('Unexpected token `}`') || e.message.includes('Unexpected token, expected "}"')) {
            let line = e.loc.line - 1;
            let lines = content.split('\n');
            // Check if line actually has `}`
            if (lines[line].includes('}')) {
                console.log('Removing extra } at', line + 1);
                lines.splice(line, 1);
                fs.writeFileSync(file, lines.join('\n'));
            } else {
                console.log('Line does not have }, maybe insertion needed at', line + 1);
                // If it's Unexpected token, expected "}", it means we missed a closing bracket.
                // Usually this is very hard to fix blindly.
                if (e.message.includes('expected "}"')) {
                    lines.splice(line, 0, '                )}');
                    fs.writeFileSync(file, lines.join('\n'));
                } else {
                    console.log('Stopping');
                    break;
                }
            }
        } else {
            console.log('Other error:', e.message);
            
            // Could be missing parent element.
            if (e.message.includes('Adjacent JSX elements must be wrapped in an enclosing tag')) {
                // Actually babel will say this. We'll just print it.
                break;
            }
            break;
        }
    }
}
