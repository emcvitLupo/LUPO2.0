const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(`Statistiche & Report
            </button>`, `Statistiche & Report
            </button>
            )}`);

fs.writeFileSync(file, content);
