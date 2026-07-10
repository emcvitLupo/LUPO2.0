const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "if (actualRole === 'ADMIN') return true;",
  "if (actualRole === 'ADMIN' || (currentUser?.email && currentUser.email.toLowerCase().includes('carmine.marroccella'))) return true;"
);

fs.writeFileSync(file, content);
