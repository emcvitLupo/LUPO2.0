const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

function wrapDashCard(tabStr, startStr, endStr) {
    if (!content.includes(startStr)) {
        console.log('Could not find start for', tabStr);
        return;
    }
    
    // Replace the start and end carefully
    // Usually these cards end with </p>\n\n                </div>
    
    let regex = new RegExp(`(<div\\s+onClick={\\(\\) => setActiveTab\\('${tabStr}'\\)}[\\s\\S]*?<\\/p>\\s*<\\/div>)`, 'm');
    
    let match = content.match(regex);
    if(match) {
        let block = match[1];
        let replacement = `{hasAccessTo('${tabStr === 'statistiche' ? 'dashboard' : tabStr}') && (\n${block}\n)}`;
        content = content.replace(block, replacement);
    } else {
        console.log('Could not match block for', tabStr);
    }
}

wrapDashCard('clienti', `onClick={() => setActiveTab('clienti')}`);
wrapDashCard('prove', `onClick={() => setActiveTab('prove')}`);
wrapDashCard('preventivi', `onClick={() => setActiveTab('preventivi')}`);
wrapDashCard('accettazione', `onClick={() => setActiveTab('accettazione')}`);
wrapDashCard('fatturazione', `onClick={() => setActiveTab('fatturazione')}`);
wrapDashCard('reagentario', `onClick={() => setActiveTab('reagentario')}`);

fs.writeFileSync(file, content);

wrapDashCard('statistiche', `onClick={() => setActiveTab('statistiche')}`);
wrapDashCard('operatori', `onClick={() => setActiveTab('operatori')}`);

fs.writeFileSync(file, content);
