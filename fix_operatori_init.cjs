const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    "const parsed: Operator[] = saved ? JSON.parse(saved) : INITIAL_OPERATORS;\n    return parsed.filter(op => !op.nome.toLowerCase().includes('valerio') && !op.nome.toLowerCase().includes('tempesta'));",
    "const parsed: Operator[] = saved ? JSON.parse(saved) : INITIAL_OPERATORS;\n    return parsed;"
);

fs.writeFileSync(file, content);
