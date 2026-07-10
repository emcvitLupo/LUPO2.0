const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(`Statistiche & Analisi
          </button>`, `Statistiche & Analisi
          </button>
          )}`);

fs.writeFileSync(file, content);
