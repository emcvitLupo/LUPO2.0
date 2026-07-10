const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const tabs = ['dashboard', 'clienti', 'prove', 'preventivi', 'reagentario', 'accettazione', 'fatturazione', 'operatori', 'statistiche'];
for (const tab of tabs) {
    let oldStr = `{activeTab === '${tab}' && (`;
    let newStr = `{activeTab === '${tab}' && hasAccessTo('${tab}') && (`;
    content = content.replace(oldStr, newStr);
}

fs.writeFileSync(file, content);
