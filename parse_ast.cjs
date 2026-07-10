const fs = require('fs');
const parser = require('@babel/parser');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

try {
    parser.parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
    });
    console.log("Success!");
} catch (e) {
    console.log("Error at line", e.loc.line, "col", e.loc.column);
    console.log(e.message);
}
