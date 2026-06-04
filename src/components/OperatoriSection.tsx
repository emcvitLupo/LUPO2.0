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

  // Form states
  const [nome, setNome] = useState('');
  const [ruolo, setRuolo] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordMap, setShowPasswordMap] = useState<Record<number, boolean>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setNome('');
    setRuolo('');
    setPassword('');
    setEditingIndex(null);
    setShowForm(false);
    setFormError(null);
  };

  const handleEdit = (index: number) => {
    const op = operators[index];
    setNome(op.nome);
    setRuolo(op.ruolo);
    setPassword(op.password);
    setEditingIndex(index);
    setShowForm(true);
    setFormError(null);
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

    // Controlla se il nome esiste già (escludendo se stesso in caso di modifica)
    const duplicate = operators.some((op, idx) => op.nome.toLowerCase() === trimmedNome.toLowerCase() && idx !== editingIndex);
    if (duplicate) {
      setFormError(`Un operatore con il nome "${trimmedNome}" è già presente a sistema.`);
      return;
    }

    const newOp: Operator = {
      nome: trimmedNome,
      ruolo: trimmedRuolo,
      password: trimmedPass
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
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Qualifica / Ruolo (*):
              </label>
              <input
                type="text"
                value={ruolo}
                onChange={(e) => setRuolo(e.target.value)}
                placeholder="es: Responsabile Quality o Tecnico Chimico"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-slate-950 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none"
                required
              />
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
              className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs hover:shadow-2xs transition-all relative flex flex-col justify-between space-y-4 text-left"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-950 tracking-tight leading-snug">
                      {op.nome}
                    </h3>
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
