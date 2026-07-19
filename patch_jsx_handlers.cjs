const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

// Replace handleRemoveProvaFromQuote(item.provaId) with item.uniqueId
content = content.replace(/handleRemoveProvaFromQuote\(item\.provaId\)/g, "handleRemoveProvaFromQuote(item.uniqueId)");
content = content.replace(/handleUpdateProvaQty\(item\.provaId,/g, "handleUpdateProvaQty(item.uniqueId,");
content = content.replace(/handleUpdateProvaPrice\(item\.provaId,/g, "handleUpdateProvaPrice(item.uniqueId,");
content = content.replace(/handleAddLimiteToProva\(item\.provaId,/g, "handleAddLimiteToProva(item.uniqueId,");
content = content.replace(/handleUpdateLimiteOfProva\(item\.provaId,/g, "handleUpdateLimiteOfProva(item.uniqueId,");
content = content.replace(/handleRemoveLimiteFromProva\(item\.provaId,/g, "handleRemoveLimiteFromProva(item.uniqueId,");
content = content.replace(/p\.provaId === item\.provaId \? \{ \.\.\.p, opzionale: e\.target\.checked \} : p/g, "p.uniqueId === item.uniqueId ? { ...p, opzionale: e.target.checked } : p");
content = content.replace(/key=\{item\.provaId\}/g, "key={item.uniqueId}");
content = content.replace(/id=\{\`opz-prova-\$\{item\.provaId\}\`\}/g, "id={`opz-prova-${item.uniqueId}`}");
content = content.replace(/htmlFor=\{\`opz-prova-\$\{item\.provaId\}\`\}/g, "htmlFor={`opz-prova-${item.uniqueId}`}");

fs.writeFileSync('src/components/PreventiviSection.tsx', content);
