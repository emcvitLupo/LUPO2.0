import React, { useState } from 'react';
import { Operator } from '../types';
import { 
  UserPlus, 
  Trash2, 
  Edit, 
  ShieldCheck, 
  Lock, 
  User, 
  UserCog,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OperatoriSectionProps {
  operators: Operator[];
  onUpdateOperators: (ops: Operator[]) => void;
  onRestoreDefaults?: () => void;
}

export function OperatoriSection({ operators, onUpdateOperators }: OperatoriSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [customAlert, setCustomAlert] = useState<string | null>(null);

  // Dynamic pool of roles that can be customized in local storage
  const [rolesList, setRolesList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lims_operator_roles');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      'Responsabile Tecnico', 
      'Responsabile di Reparto', 
      'Vice Responsabile Tecnico', 
      'Chimico Senior',
      'Tecnico Chimico',
      'Tecnico Microbiologo',
      'Operatore di Laboratorio'
    ];
  });
  const [newRoleInput, setNewRoleInput] = useState('');
  const [showNewRoleInput, setShowNewRoleInput] = useState(false);
  const [showManageRoles, setShowManageRoles] = useState(false);

  // Stati per la gestione dinamica delle qualifiche di firma (per i firmatari dei report)
  const [signatureQualsList, setSignatureQualsList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('lims_signature_quals');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return ['Responsabile di Reparto', 'V.ce Responsabile Tecnico'];
  });
  const [newSigQualInput, setNewSigQualInput] = useState('');
  const [selectedSigQuals, setSelectedSigQuals] = useState<string[]>([]);

  // Form states
  const [nome, setNome] = useState('');
  const [ruolo, setRuolo] = useState('');
  const [password, setPassword] = useState('');
  const [attivo, setAttivo] = useState(true);
  const [autorizzatoFirma, setAutorizzatoFirma] = useState(true);
  const [ruoloFirma, setRuoloFirma] = useState('Responsabile di Reparto');
  const [isResponsabileReparto, setIsResponsabileReparto] = useState(false);
  const [isResponsabileTecnico, setIsResponsabileTecnico] = useState(false);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<number, boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setNome('');
    setRuolo('');
    setPassword('');
    setAttivo(true);
    setAutorizzatoFirma(true);
    setRuoloFirma('Responsabile di Reparto');
    setIsResponsabileReparto(false);
    setIsResponsabileTecnico(false);
    setSelectedSigQuals([]);
    setNewSigQualInput('');
    setEditingIndex(null);
    setShowForm(false);
    setFormError(null);
    setShowNewRoleInput(false);
    setShowManageRoles(false);
    setNewRoleInput('');
  };

  const handleEdit = (index: number) => {
    const op = operators[index];
    setNome(op.nome);
    setRuolo(op.ruolo);
    setPassword(op.password);
    setAttivo(op.attivo !== false);
    setAutorizzatoFirma(op.autorizzatoFirma !== false);
    setRuoloFirma(op.ruoloFirma || 'Responsabile di Reparto');
    
    // Ripopoliamo selectedSigQuals a partire dalla stringa ruoloFirma
    const parsedSigQuals = op.ruoloFirma 
      ? op.ruoloFirma.split(' & ').map(item => item.trim()).filter(Boolean)
      : [];
    setSelectedSigQuals(parsedSigQuals);

    // Check if the operator holds either / both signature qualifications
    const holdsReparto = op.isResponsabileReparto || (op.ruoloFirma || '').toLowerCase().includes('reparto') || (op.ruolo || '').toLowerCase() === 'responsabile di reparto';
    const holdsTecnico = op.isResponsabileTecnico || (op.ruoloFirma || '').toLowerCase().includes('tecnico') || (op.ruolo || '').toLowerCase().includes('tecnico');
    setIsResponsabileReparto(holdsReparto);
    setIsResponsabileTecnico(holdsTecnico);

    setEditingIndex(index);
    setShowForm(true);
    setFormError(null);
    setShowNewRoleInput(false);
    setShowManageRoles(false);
    setNewRoleInput('');
  };

  const handleDelete = (index: number) => {
    if (operators.length <= 1) {
      setCustomAlert("Deve esserci almeno un operatore abilitato nel sistema LIMS per firmare le registrazioni.");
      return;
    }
    setDeletingIndex(index);
  };

  const confirmDelete = () => {
    if (deletingIndex !== null) {
      const copy = operators.filter((_, i) => i !== deletingIndex);
      onUpdateOperators(copy);
      setDeletingIndex(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedNome = nome.trim();
    const trimmedRuolo = ruolo.trim();
    const trimmedPass = password.trim();

    if (!trimmedNome || !trimmedRuolo || !trimmedPass) {
      setFormError("Tutti i campi con l'asterisco (*) sono obbligatori.");
      return;
    }

    if (autorizzatoFirma && selectedSigQuals.length === 0) {
      setFormError("Essendo configurato come firmatario, devi selezionare almeno una qualifica di firma (es. Responsabile di Reparto / V.ce Responsabile Tecnico).");
      return;
    }

    // Controlla se il nome esiste già (escludendo se stesso in caso di modifica)
    const duplicate = operators.some((op, idx) => op.nome.toLowerCase() === trimmedNome.toLowerCase() && idx !== editingIndex);
    if (duplicate) {
      setFormError(`Un operatore con il nome "${trimmedNome}" è già presente a sistema.`);
      return;
    }

    // Generate readable ruoloFirma string combining selected qualifications
    const combinedRuoloFirma = selectedSigQuals.length > 0 ? selectedSigQuals.join(' & ') : 'Responsabile di Reparto';
    const isRep = selectedSigQuals.includes('Responsabile di Reparto');
    const isTec = selectedSigQuals.includes('V.ce Responsabile Tecnico');

    const newOp: Operator = {
      nome: trimmedNome,
      ruolo: trimmedRuolo,
      password: trimmedPass,
      attivo: attivo,
      autorizzatoFirma: autorizzatoFirma,
      ruoloFirma: autorizzatoFirma ? combinedRuoloFirma : undefined,
      isResponsabileReparto: autorizzatoFirma ? isRep : false,
      isResponsabileTecnico: autorizzatoFirma ? isTec : false
    };

    let updatedList: Operator[];
    if (editingIndex !== null) {
      updatedList = operators.map((op, idx) => idx === editingIndex ? newOp : op);
    } else {
      updatedList = [...operators, newOp];
    }

    onUpdateOperators(updatedList);
    resetForm();
  };

  const togglePasswordVisibility = (idx: number) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Intestazione */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            🔑 Gestione Operatori & Password
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            Configura gli operatori accreditati del laboratorio e imposta le loro password o PIN per le firme di sicurezza ed audit trail.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <UserPlus className="h-4 w-4" /> Nuovo Operatore
        </button>
      </div>

      {showForm && (
        <div className="p-5 md:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-850 uppercase tracking-wider flex items-center gap-1.5">
              {editingIndex !== null ? '✏️ Modifica Operatore Registrato' : '✨ Registra Nuovo Operatore LIMS'}
            </h3>
            <button
              onClick={resetForm}
              className="text-xs text-slate-400 hover:text-slate-700 font-bold"
            >
              Annulla
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {/* Nome/Cognome */}
            <div className="space-y-1.5 text-left">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Nome e Cognome (*):
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="es: Dott. Mario Rossi"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-slate-950 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none"
                required
              />
            </div>

            {/* Ruolo / Qualifica */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Qualifica / Ruolo (*):
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowManageRoles(!showManageRoles);
                      setShowNewRoleInput(false);
                    }}
                    className="text-[9px] font-extrabold text-[#4f46e5] hover:text-[#4338ca] transition uppercase tracking-wider cursor-pointer"
                  >
                    {showManageRoles ? '× Chiudi' : '⚙️ Gestisci Ruoli'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewRoleInput(!showNewRoleInput);
                      setShowManageRoles(false);
                    }}
                    className="text-[9px] font-extrabold text-[#4f46e5] hover:text-[#4338ca] transition uppercase tracking-wider cursor-pointer"
                  >
                    {showNewRoleInput ? '× Annulla' : '+ Crea Nuovo'}
                  </button>
                </div>
              </div>
              
              {showManageRoles ? (
                <div className="bg-slate-55 border border-slate-200 rounded-xl p-2 max-h-40 overflow-y-auto space-y-1">
                  <span className="block text-[8.5px] font-extrabold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 mb-1">
                    Elimina Qualifiche Ruoli:
                  </span>
                  {rolesList.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic p-1">Nessun ruolo registrato.</p>
                  ) : (
                    rolesList.map((r) => (
                      <div key={r} className="flex justify-between items-center bg-white p-1 px-2 rounded-lg border border-slate-100 shadow-sm">
                        <span className="text-[11px] font-semibold text-slate-705">{r}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = rolesList.filter((x) => x !== r);
                            setRolesList(updated);
                            localStorage.setItem('lims_operator_roles', JSON.stringify(updated));
                            if (ruolo === r) {
                              setRuolo('');
                            }
                          }}
                          className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition cursor-pointer"
                          title="Elimina"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : showNewRoleInput ? (
                <div className="flex gap-1.5 items-center bg-slate-55 p-1.5 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    value={newRoleInput}
                    onChange={(e) => setNewRoleInput(e.target.value)}
                    placeholder="es: Chimico Senior"
                    className="flex-1 bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clean = newRoleInput.trim();
                      if (!clean) return;
                      if (!rolesList.includes(clean)) {
                        const updated = [...rolesList, clean];
                        setRolesList(updated);
                        localStorage.setItem('lims_operator_roles', JSON.stringify(updated));
                      }
                      setRuolo(clean);
                      setShowNewRoleInput(false);
                      setNewRoleInput('');
                    }}
                    className="bg-slate-950 text-white font-black px-2.5 py-1.5 rounded-lg text-[10px] uppercase cursor-pointer hover:bg-slate-800 shrink-0"
                  >
                    Salva
                  </button>
                </div>
              ) : (
                <select
                  value={ruolo}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRuolo(val);
                    if (autorizzatoFirma) {
                      setRuoloFirma(val);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-slate-950 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                  required
                >
                  <option value="">Seleziona ruolo...</option>
                  {rolesList.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Password / PIN */}
            <div className="space-y-1.5 text-left relative">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Password di Sicurezza / PIN (*):
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="es: rossi123"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-slate-950 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none pr-10"
                required
              />
            </div>

            {/* Abilitazioni e Stato */}
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 pt-5 border-t border-slate-100 items-start">
              
              {/* Checkbox Attivo + Spiegazione di Stato */}
              <div className="space-y-1 text-left p-3.5 bg-emerald-50/20 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="op-attivo"
                    checked={attivo}
                    onChange={(e) => setAttivo(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="op-attivo" className="text-xs font-extrabold text-slate-805 cursor-pointer select-none">
                    Stato: Attivo
                  </label>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal font-medium pl-6">
                  L'operatore <strong>Attivo</strong> ha l'autorizzazione per accedere al LIMS, caricare registrazioni, gestire campioni e apporre la firma tracciata nell'Audit Trail. Se disabilitato, l'operatore non potrà più autenticarsi nelle operazioni del laboratorio.
                </p>
              </div>

              {/* Checkbox Autorizzato alla Firma */}
              <div className="space-y-1 text-left p-3.5 bg-indigo-50/20 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="op-firma"
                    checked={autorizzatoFirma}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setAutorizzatoFirma(val);
                      if (val) {
                        if (selectedSigQuals.length === 0) {
                          setSelectedSigQuals(['Responsabile di Reparto']);
                        }
                      } else {
                        setSelectedSigQuals([]);
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-550 cursor-pointer"
                  />
                  <label htmlFor="op-firma" className="text-xs font-extrabold text-slate-805 cursor-pointer select-none">
                    Abilitato alla Firma dei Rapporti
                  </label>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal font-medium pl-6">
                  Se abilitato, questo operatore potrà comparire nei campi di firma ufficiale dei certificati dei rapporti di prova (RdP).
                </p>
              </div>

              {/* Sezione Qualifiche di Firma Multiple Dinamiche */}
              {autorizzatoFirma && (
                <div className="space-y-3.5 text-left p-3.5 bg-amber-50/10 rounded-2xl border border-amber-200/60">
                  <div className="flex justify-between items-center pb-1 border-b border-amber-100">
                    <span className="block text-[10px] font-bold text-amber-800 uppercase tracking-widest">
                      Qualifiche di Firma:
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {signatureQualsList.map((q) => (
                      <div key={q} className="flex items-center justify-between group">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={selectedSigQuals.includes(q)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSigQuals([...selectedSigQuals, q]);
                              } else {
                                setSelectedSigQuals(selectedSigQuals.filter(item => item !== q));
                              }
                            }}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-amber-700 focus:ring-amber-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-755">
                            {q}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = signatureQualsList.filter(item => item !== q);
                            setSignatureQualsList(updated);
                            setSelectedSigQuals(selectedSigQuals.filter(item => item !== q));
                            localStorage.setItem('lims_signature_quals', JSON.stringify(updated));
                          }}
                          className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-700 transition cursor-pointer p-0.5"
                          title="Elimina questa qualifica di firma"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Campo inline per aggiungere nuove qualifiche al volo */}
                  <div className="pt-2.5 border-t border-slate-100">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Aggiungi Nuova Qualifica di Firma</span>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Es: Direttore Tecnico..."
                        value={newSigQualInput}
                        onChange={(e) => setNewSigQualInput(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = newSigQualInput.trim();
                            if (!val) return;
                            if (signatureQualsList.includes(val)) return;
                            const updated = [...signatureQualsList, val];
                            setSignatureQualsList(updated);
                            setNewSigQualInput('');
                            localStorage.setItem('lims_signature_quals', JSON.stringify(updated));
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = newSigQualInput.trim();
                          if (!val) return;
                          if (signatureQualsList.includes(val)) return;
                          const updated = [...signatureQualsList, val];
                          setSignatureQualsList(updated);
                          setNewSigQualInput('');
                          localStorage.setItem('lims_signature_quals', JSON.stringify(updated));
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-black px-2.5 py-1 rounded-lg text-xs transition cursor-pointer flex items-center justify-center"
                        title="Aggiungi qualifica"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[9.5px] text-slate-400 font-medium leading-relaxed pt-1.5 border-t border-slate-100">
                    * Puoi selezionare più qualifiche contemporaneamente o aggiungerne di nuove digitandole sopra. Passa il mouse su una riga per mostrare il cestino di eliminazione.
                  </p>
                </div>
              )}
            </div>

            {formError && (
              <div className="md:col-span-3 text-xs bg-rose-50 border border-rose-150 p-2.5 rounded-xl text-rose-700 font-bold text-left">
                ⚠️ {formError}
              </div>
            )}

            <div className="md:col-span-3 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition shadow-xs cursor-pointer"
              >
                {editingIndex !== null ? 'Salva Modifiche' : 'Aggiungi Operatore'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid degli Operatori Attivi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {operators.map((op, idx) => {
          const isShowPassword = !!showPasswordMap[idx];
          return (
            <div 
              key={idx}
              className={`bg-white border rounded-3xl p-6 shadow-3xs hover:shadow-2xs transition-all relative flex flex-col justify-between space-y-4 text-left ${
                op.attivo === false ? 'opacity-65 border-slate-200 bg-slate-50/55' : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    op.attivo === false ? 'bg-slate-200 text-slate-400' : 'bg-slate-100 text-slate-700'
                  }`}>
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-extrabold text-sm text-slate-950 tracking-tight leading-snug">
                        {op.nome}
                      </h3>
                      {op.attivo === false ? (
                        <span className="px-1.5 py-0.2 bg-rose-50 text-rose-700 border border-rose-150 text-[8px] font-black uppercase rounded tracking-wider">
                          Disattivato
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-800 border border-emerald-150 text-[8px] font-black uppercase rounded tracking-wider">
                          Attivo
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                      {op.ruolo}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(idx)}
                    className="p-1 px-1.5 rounded bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 text-[10px] font-bold cursor-pointer"
                    title="Modifica"
                  >
                    <Edit className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(idx)}
                    className="p-1 px-1.5 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-800 text-[10px] font-bold cursor-pointer"
                    title="Elimina"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Badges di Ruolo Firma */}
              <div className="flex flex-col gap-1.5">
                {op.autorizzatoFirma !== false ? (
                  <div className="p-2.5 bg-indigo-50/60 border border-indigo-100/50 rounded-xl text-[10.5px] text-indigo-950 font-bold space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-900 font-extrabold pb-0.5 border-b border-indigo-100/30">
                      <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span>Qualifiche di Firma Abilitate:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(op.isResponsabileReparto || (op.ruoloFirma || '').toLowerCase().includes('reparto') || (op.ruolo || '').toLowerCase() === 'responsabile di reparto') && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-850 border border-amber-200 rounded text-[9.5px] font-bold">
                          ✍️ Responsabile di Reparto
                        </span>
                      )}
                      {(op.isResponsabileTecnico || (op.ruoloFirma || '').toLowerCase().includes('tecnico') || (op.ruolo || '').toLowerCase().includes('tecnico')) && (
                        <span className="px-2 py-0.5 bg-[#4f46e5]/10 text-[#4338ca] border border-[#a5b4fc]/30 rounded text-[9.5px] font-bold">
                          🔬 V.ce Responsabile Tecnico
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-500 font-semibold flex items-center gap-1.5 italic">
                    <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>Non abilitato alla firma dei rapporti</span>
                  </div>
                )}
              </div>

              {/* Box Info Credenziali Sicurezza */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-450">Password Firma:</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-slate-800 text-[12px] bg-white border border-slate-150 px-2.5 py-1 rounded-md shadow-3xs">
                    {isShowPassword ? op.password : '••••••••'}
                  </span>
                  <button
                    onClick={() => togglePasswordVisibility(idx)}
                    className="p-1 text-slate-450 hover:text-slate-850 cursor-pointer"
                    title={isShowPassword ? "Nascondi Password" : "Mostra Password"}
                  >
                    {isShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 pt-1 opacity-90">
                <ShieldCheck className="h-3.5 w-3.5" /> Abilitato ad audit trail e firma
              </div>
            </div>
          );
        })}
      </div>

      {/* Box esplicativo d'uso */}
      <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl flex items-start gap-3 text-left">
        <Info className="h-5 w-5 text-indigo-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-extrabold text-[11px] text-indigo-950 uppercase tracking-wider">🔒 Tracciabilità & Regola della Doppia Autenticazione</h4>
          <p className="text-slate-500 text-[10.5px] leading-relaxed">
            Ogni volta che viene inserito un campione, modificato un preventivo, salvato un risultato di prova o variato un qualsiasi stato di accertamento, il sistema richiede all'operatore di selezionare il proprio nominativo e di firmare inserendo la corrispondente password di sicurezza. Questo assicura l'integrità totale delle registrazioni e l'inalterabilità dell'Audit Trail.
          </p>
        </div>
      </div>

      {/* DIALOG DI CONFERMA ELIMINAZIONE OPERATORE */}
      <AnimatePresence>
        {deletingIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col text-left"
            >
              <div className="bg-rose-600 p-5 text-white">
                <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                  ⚠️ Conferma Eliminazione
                </h3>
                <p className="text-[10px] text-rose-100 font-medium mt-0.5">Operazione non revocabile</p>
              </div>

              <div className="p-5 space-y-3 text-xs leading-relaxed text-slate-650">
                <p>
                  Sei sicuro di voler eliminare l'operatore <strong className="text-slate-900">"{operators[deletingIndex]?.nome}"</strong>?
                </p>
                <p className="text-[10.5px] text-slate-450 bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
                  L'operazione non influirà sui vecchi record storici di audit trail, ma l'operatore non potrà più autenticarsi o validare nuove misure.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingIndex(null)}
                  className="flex-1 p-2.5 rounded-xl border border-slate-200 text-slate-650 font-bold hover:bg-slate-100 transition text-xs cursor-pointer text-center"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 p-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition shadow-xs text-xs cursor-pointer text-center"
                >
                  Sì, Elimina
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DIALOG DI AVVISO DI SICUREZZA (OPERAZIONE NEGATA) */}
      <AnimatePresence>
        {customAlert !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col text-left"
            >
              <div className="bg-slate-950 p-5 text-white">
                <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2 text-amber-400">
                  ⚠️ Azione Non Consentita
                </h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Vincolo di integrità del LIMS</p>
              </div>

              <div className="p-5 text-xs leading-relaxed text-slate-650">
                {customAlert}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCustomAlert(null)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 text-white font-bold hover:bg-slate-900 transition shadow-xs text-xs cursor-pointer text-center"
                >
                  Ho Capito
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
