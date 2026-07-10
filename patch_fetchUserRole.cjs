const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `  const [actualRole, setActualRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);`;

const replaceStr = `  const [actualRole, setActualRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfileName, setUserProfileName] = useState<string | null>(null);`;

content = content.replace(targetStr, replaceStr);

const targetFetch = `        let { data, error } = await supabase
          .from('profili')
          .select('ruolo')
          .eq('id', user.id)
          .single();`;

const replaceFetch = `        let { data, error } = await supabase
          .from('profili')
          .select('ruolo, nome')
          .eq('id', user.id)
          .single();`;

content = content.replace(targetFetch, replaceFetch);

const targetUpsert = `          const { data: upsertData, error: upsertError } = await supabase
            .from('profili')
            .upsert([defaultProfile])
            .select('ruolo')
            .single();`;

const replaceUpsert = `          const { data: upsertData, error: upsertError } = await supabase
            .from('profili')
            .upsert([defaultProfile])
            .select('ruolo, nome')
            .single();`;

content = content.replace(targetUpsert, replaceUpsert);

const targetSetRole = `        if (data && data.ruolo) {
          roleStr = (data.ruolo || '').toString().trim().toUpperCase();
        }`;

const replaceSetRole = `        if (data && data.ruolo) {
          roleStr = (data.ruolo || '').toString().trim().toUpperCase();
        }
        if (data && data.nome) {
          setUserProfileName(data.nome);
        }`;

content = content.replace(targetSetRole, replaceSetRole);

fs.writeFileSync(file, content);
console.log('patched fetchUserRole');
