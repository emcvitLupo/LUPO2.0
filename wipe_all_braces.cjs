const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// remove ALL standalone )}
content = content.replace(/^\s*\)\}\s*$/gm, '');

fs.writeFileSync(file, content);
