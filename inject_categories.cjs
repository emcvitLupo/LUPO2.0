const fs = require('fs');
let content = fs.readFileSync('src/components/ProveSection.tsx', 'utf8');

// 1. Imports
if (!content.includes('Settings')) {
  content = content.replace("import { Download, CheckCircle, AlertCircle }", "import { Download, CheckCircle, AlertCircle, Settings }");
}

// 2. States and logic
const statesInjection = `
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [manageCatEditId, setManageCatEditId] = useState<string | null>(null);
  const [manageCatEditValue, setManageCatEditValue] = useState('');

  const INITIAL_CATEGORIES = ["Oli e Grassi", "Vini ed Aceti", "Cereali e Farine", "Allergeni e Tracce", "Terreni e Acque rurale"];
  const [savedCategories, setSavedCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('lab_categorie_prove');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return INITIAL_CATEGORIES;
  });

  const saveCategories = (newCats: string[]) => {
    setSavedCategories(newCats);
    localStorage.setItem('lab_categorie_prove', JSON.stringify(newCats));
  };

  const handleDeleteCategory = (cat: string) => {
    if (confirm(\`Sei sicuro di voler eliminare la categoria "\${cat}"? Le prove associate verranno spostate in "Altro".\`)) {
      saveCategories(savedCategories.filter(c => c !== cat));
      prove.forEach(p => {
        if (p.categoriaMerceologica === cat) {
          onUpdateProva({ ...p, categoriaMerceologica: 'Altro' });
        }
      });
    }
  };

  const handleUpdateCategory = (oldCat: string, newCat: string) => {
    if (!newCat.trim() || oldCat === newCat) {
      setManageCatEditId(null);
      return;
    }
    const cleanNew = newCat.trim();
    const newSaved = savedCategories.map(c => c === oldCat ? cleanNew : c);
    if (!newSaved.includes(cleanNew)) newSaved.push(cleanNew);
    saveCategories(Array.from(new Set(newSaved)));
    
    prove.forEach(p => {
      if (p.categoriaMerceologica === oldCat) {
        onUpdateProva({ ...p, categoriaMerceologica: cleanNew });
      }
    });
    setManageCatEditId(null);
  };
`;

if (!content.includes('const [savedCategories, setSavedCategories]')) {
  content = content.replace("const [showAddForm, setShowAddForm] = useState(false);", statesInjection + "\n  const [showAddForm, setShowAddForm] = useState(false);");
}

// 3. handleEditProva
content = content.replace(
  `const defaultCategories = ["Oli e Grassi", "Vini ed Aceti", "Cereali e Farine", "Allergeni e Tracce", "Terreni e Acque rurale"];
    if (defaultCategories.includes(p.categoriaMerceologica)) {`,
  `if (savedCategories.includes(p.categoriaMerceologica)) {`
);

// 4. dropdownCategorie
content = content.replace(
  `const defaultCategories = ["Oli e Grassi", "Vini ed Aceti", "Cereali e Farine", "Allergeni e Tracce", "Terreni e Acque rurale"];
  const dropdownCategorie = Array.from(new Set([...defaultCategories, ...archivioCategorie]));`,
  `const dropdownCategorie = Array.from(new Set([...savedCategories, ...archivioCategorie]));`
);

// 5. handleSubmit
const handleSubInjection = `
    if (catMerceologica && !savedCategories.includes(catMerceologica)) {
      saveCategories([...savedCategories, catMerceologica]);
    }
`;
if (!content.includes('saveCategories([...savedCategories, catMerceologica])')) {
  content = content.replace(
    `const catMerceologica = (categoria === 'Nuova Categoria...' && customCategoria.trim()) 
      ? customCategoria.trim() 
      : categoria;`,
    `const catMerceologica = (categoria === 'Nuova Categoria...' && customCategoria.trim()) 
      ? customCategoria.trim() 
      : categoria;
${handleSubInjection}`
  );
}

// 6. UI in the form
const uiFormInjection = `
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowManageCategories(true)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                      title="Gestisci Categorie"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
`;
if (!content.includes('Gestisci Categorie')) {
  content = content.replace(
    `</select>
                    {categoria === 'Nuova Categoria...' && (`,
    `${uiFormInjection}
                    {categoria === 'Nuova Categoria...' && (`
  );
}

// 7. Modal
const modalJSX = `
      {/* MANAGE CATEGORIES MODAL */}
      <AnimatePresence>
        {showManageCategories && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-150 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Gestione Categorie</h3>
                    <p className="text-[10px] text-slate-500">Modifica o elimina le categorie merceologiche</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowManageCategories(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto max-h-[60vh] space-y-2">
                {dropdownCategorie.map(cat => (
                  <div key={cat} className="flex items-center justify-between p-2 border border-slate-100 rounded-lg hover:bg-slate-50">
                    {manageCatEditId === cat ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={manageCatEditValue}
                          onChange={(e) => setManageCatEditValue(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-emerald-500 rounded focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateCategory(cat, manageCatEditValue)}
                          className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 cursor-pointer"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setManageCatEditId(null)}
                          className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-slate-700 truncate mr-2">{cat}</span>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setManageCatEditId(cat);
                              setManageCatEditValue(cat);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                            title="Modifica"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title="Elimina"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-slate-150 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setShowManageCategories(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 bg-slate-150 rounded-xl transition-colors cursor-pointer"
                >
                  Chiudi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
`;

if (!content.includes('MANAGE CATEGORIES MODAL')) {
  content = content.replace(/    <\/div>\n  \);\n}/g, modalJSX + '\n    </div>\n  );\n}');
}

fs.writeFileSync('src/components/ProveSection.tsx', content);
