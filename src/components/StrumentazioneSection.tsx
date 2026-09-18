import React, { useState } from 'react';
import { Strumento, StoricaTaratura } from '../types';
import {
  Plus,
  Search,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  X,
  Clock,
  ShieldCheck,
  History,
} from 'lucide-react';

interface StrumentazioneSectionProps {
  strumenti: Strumento[];
  onAddStrumento: (s: Strumento) => void;
  onUpdateStrumento: (s: Strumento) => void;
  onDeleteStrumento: (id: string) => void;
}

function getTaraturaStatus(prossimaTaratura?: string): {
  stato: 'valida' | 'in_scadenza' | 'scaduta' | 'non_definita';
  giorniRimasti: number | null;
  label: string;
  colorClass: string;
  badgeClass: string;
} {
  if (!prossimaTaratura) {
    return { stato: 'non_definita', giorniRimasti: null, label: 'Taratura non programmata', colorClass: 'text-slate-500', badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  const scadenza = new Date(prossimaTaratura); scadenza.setHours(0, 0, 0, 0);
  const giorniRimasti = Math.ceil((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
  if (giorniRimasti < 0) return { stato: 'scaduta', giorniRimasti, label: `Taratura scaduta da ${Math.abs(giorniRimasti)} giorni`, colorClass: 'text-red-700', badgeClass: 'bg-red-50 text-red-700 border-red-200' };
  if (giorniRimasti <= 30) return { stato: 'in_scadenza', giorniRimasti, label: `Scade tra ${giorniRimasti} giorni`, colorClass: 'text-amber-700', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' };
  return { stato: 'valida', giorniRimasti, label: `Valida ancora ${giorniRimasti} giorni`, colorClass: 'text-green-700', badgeClass: 'bg-green-50 text-green-700 border-green-200' };
}

const formatDateIT = (iso?: string) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };

const emptyStrumento = (): Omit<Strumento, 'id'> => ({
  codice: '', nome: '', marca: '', modello: '', matricola: '', collocazione: '',
  ultimaTaratura: '', prossimaTaratura: '', periodicitaTaraturaMesi: 12,
  certificatoTaratura: '', enteTaratore: '', storicoTarature: [], note: '', attivo: true,
});

export const StrumentazioneSection: React.FC<StrumentazioneSectionProps> = ({
  strumenti, onAddStrumento, onUpdateStrumento, onDeleteStrumento,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStato, setFilterStato] = useState<'tutti' | 'valida' | 'in_scadenza' | 'scaduta'>('tutti');
  const [showOnlyAttivi, setShowOnlyAttivi] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Omit<Strumento, 'id'>>(emptyStrumento());
  const [newTaratura, setNewTaratura] = useState<Partial<StoricaTaratura>>({});
  const [showStorico, setShowStorico] = useState<string | null>(null);

  const strumentiFiltrati = strumenti.filter(s => {
    if (showOnlyAttivi && !s.attivo) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!s.nome.toLowerCase().includes(q) && !s.codice.toLowerCase().includes(q) && !s.marca.toLowerCase().includes(q) && !s.modello.toLowerCase().includes(q)) return false;
    }
    if (filterStato !== 'tutti' && getTaraturaStatus(s.prossimaTaratura).stato !== filterStato) return false;
    return true;
  });

  const statCounts = {
    valida: strumenti.filter(s => s.attivo && getTaraturaStatus(s.prossimaTaratura).stato === 'valida').length,
    in_scadenza: strumenti.filter(s => s.attivo && getTaraturaStatus(s.prossimaTaratura).stato === 'in_scadenza').length,
    scaduta: strumenti.filter(s => s.attivo && getTaraturaStatus(s.prossimaTaratura).stato === 'scaduta').length,
  };

  const handleSave = () => {
    if (!formData.codice.trim() || !formData.nome.trim()) { alert('Codice e Nome sono obbligatori.'); return; }
    if (editingId) { onUpdateStrumento({ ...formData, id: editingId }); setEditingId(null); }
    else { onAddStrumento({ ...formData, id: `STR-${Date.now()}` }); setShowAddForm(false); }
    setFormData(emptyStrumento());
  };

  const handleEdit = (s: Strumento) => { setFormData({ ...s }); setEditingId(s.id); setShowAddForm(false); setExpandedId(s.id); };

  const handleAddTaratura = (strumento: Strumento) => {
    if (!newTaratura.data) { alert('La data di taratura e obbligatoria.'); return; }
    const newEntry: StoricaTaratura = { data: newTaratura.data!, certificato: newTaratura.certificato, ente: newTaratura.ente, esito: newTaratura.esito || 'Conforme', note: newTaratura.note };
    const updated: Strumento = { ...strumento, storicoTarature: [...(strumento.storicoTarature || []), newEntry], ultimaTaratura: newTaratura.data };
    onUpdateStrumento(updated);
    setNewTaratura({});
  };

  const FILTER_BADGES = [
    { key: 'tutti', label: 'Tutti', count: strumenti.filter(s => s.attivo).length, cls: 'bg-slate-100 text-slate-700 border-slate-200' },
    { key: 'valida', label: '🟢 Valida', count: statCounts.valida, cls: 'bg-green-50 text-green-700 border-green-200' },
    { key: 'in_scadenza', label: '🟡 In Scadenza', count: statCounts.in_scadenza, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    { key: 'scaduta', label: '🔴 Scaduta', count: statCounts.scaduta, cls: 'bg-red-50 text-red-700 border-red-200' },
  ] as const;

  const FORM_FIELDS = [
    { label: 'Codice *', key: 'codice', placeholder: 'es. BAL-001' },
    { label: 'Nome Strumento *', key: 'nome', placeholder: 'es. Bilancia Analitica' },
    { label: 'Marca', key: 'marca', placeholder: 'es. Mettler Toledo' },
    { label: 'Modello', key: 'modello', placeholder: 'es. XPR204' },
    { label: 'Matricola / N. Serie', key: 'matricola', placeholder: 'Numero di serie' },
    { label: 'Collocazione', key: 'collocazione', placeholder: 'es. Sala Bilance' },
    { label: 'Ente Taratore', key: 'enteTaratore', placeholder: 'es. SIT, Accredia, Interno' },
    { label: 'N. Certificato Taratura', key: 'certificatoTaratura', placeholder: 'Numero certificato corrente' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-indigo-600" />
            Anagrafe Strumentazione
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Gestione apparecchiature e tarature — ISO/IEC 17025 §6.4</p>
        </div>
        <button onClick={() => { setShowAddForm(true); setEditingId(null); setFormData(emptyStrumento()); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer">
          <Plus className="h-4 w-4" /> Aggiungi Strumento
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {FILTER_BADGES.map(b => (
          <button key={b.key} onClick={() => setFilterStato(b.key as any)} className={`px-3 py-1 rounded-full text-xs font-bold border cursor-pointer transition ${b.cls} ${filterStato === b.key ? 'ring-2 ring-offset-1 ring-indigo-400' : 'opacity-80 hover:opacity-100'}`}>
            {b.label} ({b.count})
          </button>
        ))}
        <label className="flex items-center gap-1.5 px-3 py-1 text-xs text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={showOnlyAttivi} onChange={e => setShowOnlyAttivi(e.target.checked)} className="rounded" /> Solo attivi
        </label>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cerca per nome, codice, marca..." className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
      </div>

      {(showAddForm || editingId) && (
        <div className="border border-indigo-200 bg-indigo-50/40 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-indigo-900 text-sm">{editingId ? 'Modifica Strumento' : 'Nuovo Strumento'}</span>
            <button onClick={() => { setShowAddForm(false); setEditingId(null); setFormData(emptyStrumento()); }} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FORM_FIELDS.map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">{f.label}</label>
                <input type="text" value={(formData as any)[f.key] || ''} onChange={e => setFormData(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder}
                  className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            ))}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Ultima Taratura</label>
              <input type="date" value={formData.ultimaTaratura || ''} onChange={e => setFormData(prev => ({ ...prev, ultimaTaratura: e.target.value }))} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Prossima Taratura</label>
              <input type="date" value={formData.prossimaTaratura || ''} onChange={e => setFormData(prev => ({ ...prev, prossimaTaratura: e.target.value }))} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Periodicita Taratura (mesi)</label>
              <input type="number" min={1} value={formData.periodicitaTaraturaMesi || 12} onChange={e => setFormData(prev => ({ ...prev, periodicitaTaraturaMesi: parseInt(e.target.value) || 12 }))} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Note</label>
            <textarea rows={2} value={formData.note || ''} onChange={e => setFormData(prev => ({ ...prev, note: e.target.value }))} className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
              <input type="checkbox" checked={formData.attivo} onChange={e => setFormData(prev => ({ ...prev, attivo: e.target.checked }))} className="rounded" /> Strumento Attivo
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowAddForm(false); setEditingId(null); setFormData(emptyStrumento()); }} className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer transition">Annulla</button>
            <button onClick={handleSave} className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer transition shadow-sm">{editingId ? 'Salva Modifiche' : 'Aggiungi Strumento'}</button>
          </div>
        </div>
      )}

      {strumentiFiltrati.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Wrench className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-semibold">Nessuno strumento trovato.</p>
          <p className="text-xs mt-1">Aggiungi il primo strumento con il pulsante in alto a destra.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {strumentiFiltrati.map(s => {
            const ts = getTaraturaStatus(s.prossimaTaratura);
            const isExpanded = expandedId === s.id;
            const isEditing = editingId === s.id;
            return (
              <div key={s.id} className={`border rounded-2xl overflow-hidden transition-all ${!s.attivo ? 'opacity-60' : ''} ${ts.stato === 'scaduta' ? 'border-red-200' : ts.stato === 'in_scadenza' ? 'border-amber-200' : 'border-slate-200'}`}>
                <div className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${ts.stato === 'scaduta' ? 'bg-red-50/30' : ts.stato === 'in_scadenza' ? 'bg-amber-50/30' : 'bg-white'} hover:bg-slate-50/80 transition`} onClick={() => setExpandedId(isExpanded ? null : s.id)}>
                  <div className="shrink-0">
                    {ts.stato === 'scaduta' ? <XCircle className="h-5 w-5 text-red-500" /> : ts.stato === 'in_scadenza' ? <AlertTriangle className="h-5 w-5 text-amber-500" /> : ts.stato === 'valida' ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Clock className="h-5 w-5 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{s.codice}</span>
                      <span className="font-bold text-sm text-slate-900">{s.nome}</span>
                      {!s.attivo && <span className="text-[9px] font-bold bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">Archiviato</span>}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap mt-0.5">
                      <span className="text-xs text-slate-500">{s.marca} {s.modello}</span>
                      {s.collocazione && <span className="text-[10px] text-slate-400">{s.collocazione}</span>}
                    </div>
                  </div>
                  <div className="shrink-0 hidden sm:block">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ts.badgeClass}`}>
                      {ts.stato === 'scaduta' ? '🔴' : ts.stato === 'in_scadenza' ? '🟡' : ts.stato === 'valida' ? '🟢' : '⚪'} {ts.label}
                    </span>
                  </div>
                  <div className="shrink-0 hidden md:block text-right">
                    <p className="text-[10px] text-slate-400">Ultima: <strong className="text-slate-600">{formatDateIT(s.ultimaTaratura)}</strong></p>
                    <p className="text-[10px] text-slate-400">Prossima: <strong className={ts.colorClass}>{formatDateIT(s.prossimaTaratura)}</strong></p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-700 cursor-pointer" title="Modifica"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => { if (confirm(`Eliminare "${s.nome}"?`)) onDeleteStrumento(s.id); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 cursor-pointer" title="Elimina"><Trash2 className="h-3.5 w-3.5" /></button>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                  </div>
                </div>
                {isExpanded && !isEditing && (
                  <div className="border-t border-slate-100 bg-white px-4 py-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                      {[
                        { l: 'Codice', v: s.codice }, { l: 'Matricola', v: s.matricola || '—' },
                        { l: 'Ente Taratore', v: s.enteTaratore || '—' }, { l: 'Periodicita', v: s.periodicitaTaraturaMesi ? `${s.periodicitaTaraturaMesi} mesi` : '—' },
                        { l: 'N. Certificato', v: s.certificatoTaratura || '—' }, { l: 'Ultima Taratura', v: formatDateIT(s.ultimaTaratura) },
                        { l: 'Prossima Taratura', v: formatDateIT(s.prossimaTaratura) }, { l: 'Collocazione', v: s.collocazione || '—' },
                      ].map(item => (
                        <div key={item.l}><span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{item.l}</span><span className="font-semibold text-slate-800">{item.v}</span></div>
                      ))}
                    </div>
                    {s.note && <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-600"><span className="font-bold text-slate-700 block mb-0.5">Note:</span>{s.note}</div>}
                    <div className="border-t border-slate-100 pt-3">
                      <button onClick={() => setShowStorico(showStorico === s.id ? null : s.id)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer">
                        <History className="h-3.5 w-3.5" /> Storico Tarature ({(s.storicoTarature || []).length})
                        {showStorico === s.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                      {showStorico === s.id && (
                        <div className="mt-2 space-y-2">
                          {(s.storicoTarature || []).length === 0 ? (
                            <p className="text-xs text-slate-400 italic">Nessuna taratura registrata nello storico.</p>
                          ) : (
                            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                              <thead className="bg-slate-50"><tr>{['Data','Ente','Certificato','Esito','Note'].map(h => <th key={h} className="text-left px-2 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">{h}</th>)}</tr></thead>
                              <tbody>
                                {[...(s.storicoTarature || [])].reverse().map((t, i) => (
                                  <tr key={i} className="border-b border-slate-100 last:border-0">
                                    <td className="px-2 py-1.5 font-mono font-semibold">{formatDateIT(t.data)}</td>
                                    <td className="px-2 py-1.5 text-slate-600">{t.ente || '—'}</td>
                                    <td className="px-2 py-1.5 text-slate-600">{t.certificato || '—'}</td>
                                    <td className="px-2 py-1.5"><span className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${t.esito === 'Conforme' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.esito || 'Conforme'}</span></td>
                                    <td className="px-2 py-1.5 text-slate-500">{t.note || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          <div className="mt-3 border border-dashed border-indigo-200 bg-indigo-50/30 rounded-xl p-3 space-y-2">
                            <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">+ Registra Nuova Taratura</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              <div><label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Data *</label><input type="date" value={newTaratura.data || ''} onChange={e => setNewTaratura(p => ({ ...p, data: e.target.value }))} className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white" /></div>
                              <div><label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Ente Taratore</label><input type="text" value={newTaratura.ente || ''} onChange={e => setNewTaratura(p => ({ ...p, ente: e.target.value }))} placeholder="es. SIT, Interno" className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white" /></div>
                              <div><label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">N. Certificato</label><input type="text" value={newTaratura.certificato || ''} onChange={e => setNewTaratura(p => ({ ...p, certificato: e.target.value }))} className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white" /></div>
                              <div><label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Esito</label><select value={newTaratura.esito || 'Conforme'} onChange={e => setNewTaratura(p => ({ ...p, esito: e.target.value as any }))} className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white"><option value="Conforme">Conforme</option><option value="Non Conforme">Non Conforme</option></select></div>
                              <div className="sm:col-span-2"><label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Note</label><input type="text" value={newTaratura.note || ''} onChange={e => setNewTaratura(p => ({ ...p, note: e.target.value }))} className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white" /></div>
                            </div>
                            <button onClick={() => handleAddTaratura(s)} className="mt-1 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition shadow-sm"><ShieldCheck className="h-3.5 w-3.5" /> Registra Taratura</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StrumentazioneSection;
