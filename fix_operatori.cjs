const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    "const filtered = fetched.filter(op => !op.nome.toLowerCase().includes('valerio') && !op.nome.toLowerCase().includes('tempesta'));\n        setOperators(filtered);\n        localStorage.setItem('lab_operators', JSON.stringify(filtered));",
    "setOperators(fetched);\n        localStorage.setItem('lab_operators', JSON.stringify(fetched));"
);

fs.writeFileSync(file, content);
