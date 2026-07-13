const fs = require('fs');
let file = 'src/components/ClientiSection.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
`              )}
              </div>
              {(userRole === 'admin' || currentUser !== null) && (`, 
`              )}
              {(userRole === 'admin' || currentUser !== null) && (`
);

content = content.replace(
`                </button>
              )}
            </div>`,
`                </button>
              )}
              </div>
            </div>`
);

fs.writeFileSync(file, content);
