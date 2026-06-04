import React, { useState } from 'react';
import { Reagente } from '../types';
import { Plus, Search, AlertTriangle, CheckCircle, Flame, ShieldAlert, Archive, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReagentarioSectionProps {
  reagenti: Reagente[];
  onAddReagente: (newReagente: Reagente) => void;
  onDeleteReagente: (id: string) => void;
  onUpdateReagente: (updatedReagente: Reagente) => void;
}

export function ReagentarioSection({
  reagenti,
  onAddReagente,
  onDeleteReagente,
  onUpdateReagente
}: ReagentarioSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sottoScorta' | 'scaduti'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [reagDeletingId, setReagDeletingId] = useState<string | null>(null);

  // States per NUOVO REAGENTE
  const [nome, setNome] = useState('');
  const [formula, setFormula] = useState('');
  const [marca, setMarca] = useState('');
  const [codice, setCodice] = useState('');
  const [lotto, setLotto] = useState('');
  const [scadenza, setScadenza] = useState('');
  const [quantita, setQuantita] = useState('');
  const [unita, setUnita] = useState('ml');
  const [collocazione, setCollocazione] = useState('');
  const [soglia, setSoglia] = useState('');

  // Per il rabbocco o consumo rapido di un reagente esistente
  const [adjustQtyId, setAdjustQtyId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');

  const today = new Date();

  // Helper per controllare lo stato di allerta
  const getReagenteStatus = (r: Reagente) => {
    const sottoScorta = r.quantitaDisponibile <= r.livelloSottoScorta;
    
    const expDate = new Date(r.dataScadenza);
    const timeDiff = expDate.getTime() - today.getTime();
    const daysToExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    const scaduto = daysToExpiry <= 0;
    const inScadenza = daysToExpiry > 0 && daysToExpiry <= 30;

    return {
      sottoScorta,
      scaduto,
      inScadenza,
      daysToExpiry
    };
  };

  // Filtraggio dei reagenti
  const filteredReagenti = reagenti.filter(r => {
    const matchesSearch = r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.formulaChimica.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.collocazione.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.marcaProduttore.toLowerCase().includes(searchTerm.toLowerCase());
    
    const status = getReagenteStatus(r);

    if (filterType === 'sottoScorta') {
      return matchesSearch && status.sottoScorta;
    }
    if (filterType === 'scaduti') {
      return matchesSearch && (status.scaduto || status.inScadenza);
    }
    return matchesSearch;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !quantita) return;

    const newReag: Reagente = {
      id: 'r_' + Date.now(),
      nome: nome.trim(),
      formulaChimica: formula.trim(),
      marcaProduttore: marca.trim() || 'Generico',
      codiceProdotto: codice.trim() || 'N/A',
      lotto: lotto.trim() || 'N/A',
      dataScadenza: scadenza || new Date(today.getFullYear() + 2, today.getMonth(), today.getDate()).toISOString().split('T')[0],
      quantitaDisponibile: parseFloat(quantita) || 0,
      unitaMisura: unita,
      collocazione: collocazione.trim() || 'Scaffale Standard',
      livelloSottoScorta: parseFloat(soglia) || 100
    };

    onAddReagente(newReag);

    // Reset Form
    setNome('');
    setFormula('');
    setMarca('');
    setCodice('');
    setLotto('');
    setScadenza('');
    setQuantita('');
    setUnita('ml');
    setCollocazione('');
    setSoglia('');
    setShowAddForm(false);
  };

  // Funzione per aggiornare la quantità disponibile (rabbocco/consumo)
  const handleAdjustQuantity = (id: string, isRefill: boolean) => {
    const current = reagenti.find(r => r.id === id);
    if (!current || !adjustAmount) return;

    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newQty = isRefill 
      ? current.quantitaDisponibile + amount 
      : Math.max(0, current.quantitaDisponibile - amount);

    onUpdateReagente({
      ...current,
      quantitaDisponibile: newQty
    });

    setAdjustQtyId(null);
    setAdjustAmount('');
  };

  return (
    <div className="space-y-6">
      
      {/* Testata di Controllo & Allarmi */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <Archive className="h-5.5 w-5.5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-800">
              Controllo Reagentario Chimico
            </h3>
            <p className="text-xs text-slate-400">Tracciamento della disponibilità, lotti, scadenze e alloggiamenti dei reagenti nel laboratorio</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-4 py-2 text-sm font-semibold flex items-center justify-center gap-1.5 transition"
          id="btn-show-add-reagente"
        >
          <Plus className="h-4 w-4" /> Registra / Carica Nuovo Reagente
        </button>
      </div>

      {/* Riquadro Filtri Orizzontali */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Ricerca testuale */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cerca reagente per nome chimico, formula (es. H2SO4), marca o collocazione..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-800"
            id="input-search-reagents"
          />
        </div>

        {/* Tasti Filtro Stato */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              filterType === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600'
            }`}
          >
            Tutti i Reagenti
          </button>
          <button
            onClick={() => setFilterType('sottoScorta')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              filterType === 'sottoScorta'
                ? 'bg-amber-600 text-white'
                : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" /> Sotto Scorta
          </button>
          <button
            onClick={() => setFilterType('scaduti')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              filterType === 'scaduti'
                ? 'bg-rose-600 text-white'
                : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-600'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Scaduti / In Scadenza
          </button>
        </div>
      </div>

      {/* Sezione Contenuto */}
      <AnimatePresence mode="wait">
        
        {/* FORM REGISTRAZIONE NUOVO REAGENTE */}
        {showAddForm ? (
          <motion.div
            key="add-reagent"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-md max-w-3xl mx-auto text-xs"
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h4 className="font-extrabold text-sm text-slate-800">Caricamento / Check-in Flacone Reagente</h4>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                Annulla
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-slate-600 font-bold uppercase mb-1">Nome Commerciale Reagente *</label>
                  <input
                    type="text"
                    required
                    placeholder="es. Aceto di Metile purissimo / Acido Cloridrico 37%"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Formula Chimica</label>
                  <input
                    type="text"
                    placeholder="es. HCl o C2H5OH"
                    value={formula}
                    onChange={(e) => setFormula(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Marca Produttore</label>
                  <input
                    type="text"
                    placeholder="es. Carlo Erba / Sigma-Aldrich"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Codice Prodotto Produttore</label>
                  <input
                    type="text"
                    placeholder="es. 410301"
                    value={codice}
                    onChange={(e) => setCodice(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Lotto di Produzione per Tracciabilità</label>
                  <input
                    type="text"
                    placeholder="es. L24115A"
                    value={lotto}
                    onChange={(e) => setLotto(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Quantità Disponibile *</label>
                  <input
                    type="number"
                    required
                    placeholder="es. 1000"
                    value={quantita}
                    onChange={(e) => setQuantita(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Unità di Misura *</label>
                  <select
                    value={unita}
                    onChange={(e) => setUnita(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="ml">ml (Millilitri)</option>
                    <option value="g">g (Grammi)</option>
                    <option value="mg">mg (Milligrammi)</option>
                    <option value="confezioni">Confezioni / Flaconi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Livello di Sotto Scorta *</label>
                  <input
                    type="number"
                    required
                    placeholder="es. 250"
                    value={soglia}
                    onChange={(e) => setSoglia(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Data Scadenza *</label>
                  <input
                    type="date"
                    required
                    value={scadenza}
                    onChange={(e) => setScadenza(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase mb-1">Collocazione nel Laboratorio (es. Armadio / Ripiano)</label>
                <input
                  type="text"
                  placeholder="es. Armadio Sicurezza Acidi - Ripiano 2"
                  value={collocazione}
                  onChange={(e) => setCollocazione(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs"
                >
                  Indietro
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
                  id="submit-new-reagente"
                >
                  Registra Reagente in Inventario
                </button>
              </div>
            </form>
          </motion.div>
        ) : (
          /* LISTA REAGENTI */
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredReagenti.length === 0 ? (
              <div className="col-span-3 text-center py-20 bg-white border border-slate-150 rounded-xl text-slate-400">
                Nessun reagente soddisfa i criteri di ricerca corrente.
              </div>
            ) : (
              filteredReagenti.map(reag => {
                const status = getReagenteStatus(reag);
                const isAdjusting = adjustQtyId === reag.id;

                return (
                  <div
                    key={reag.id}
                    className={`bg-white border rounded-xl p-5 shadow-sm hover:shadow transition flex flex-col justify-between ${
                      status.scaduto
                        ? 'border-red-200 bg-red-50/10'
                        : status.sottoScorta
                        ? 'border-amber-200 bg-amber-50/10'
                        : 'border-slate-100'
                    }`}
                  >
                    <div>
                      {/* Badge di Stato in alto */}
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          {status.scaduto ? (
                            <span className="text-[9px] font-extrabold text-red-700 bg-red-50 border border-red-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3" /> SCADUTO
                            </span>
                          ) : status.inScadenza ? (
                            <span className="text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                              <Flame className="h-3 w-3" /> INC. SCADENZA
                            </span>
                          ) : status.sottoScorta ? (
                            <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> SOTTO SCORTA
                            </span>
                          ) : (
                            <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> CONFORME / DISPONIBILE
                            </span>
                          )}
                        </div>

                        {/* Elimina */}
                        {reagDeletingId === reag.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-100 animate-fadeIn shrink-0">
                            <span className="text-[9px] font-bold text-rose-700 px-1">Cancellarlo?</span>
                            <button
                              onClick={() => {
                                onDeleteReagente(reag.id);
                                setReagDeletingId(null);
                              }}
                              className="bg-rose-600 text-white rounded px-1.5 py-0.5 text-[9px] font-bold cursor-pointer hover:bg-rose-700"
                            >
                              Sì
                            </button>
                            <button
                              onClick={() => setReagDeletingId(null)}
                              className="bg-white border border-slate-200 text-slate-500 rounded px-1.5 py-0.5 text-[9px] font-bold cursor-pointer hover:bg-slate-50"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setReagDeletingId(reag.id);
                            }}
                            className="text-slate-300 hover:text-red-500 transition p-1"
                            title="Elimina Reagente"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Info Reagente */}
                      <div className="mt-3">
                        <h4 className="font-extrabold text-slate-800 text-sm leading-tight">
                          {reag.nome}
                        </h4>
                        {reag.formulaChimica && (
                          <span className="font-mono text-xs font-bold text-slate-500 mt-1 block">
                            [{reag.formulaChimica}]
                          </span>
                        )}
                      </div>

                      {/* Griglia Dettaglio Tecnologico */}
                      <div className="mt-3.5 grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                        <div>
                          <strong className="text-slate-400 block tracking-wide uppercase text-[9px]">Produttore</strong>
                          <span>{reag.marcaProduttore}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400 block tracking-wide uppercase text-[9px]">Codice / Lotto</strong>
                          <span className="font-mono">{reag.codiceProdotto} / {reag.lotto}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400 block tracking-wide uppercase text-[9px]">Alloggiamento</strong>
                          <span>{reag.collocazione}</span>
                        </div>
                        <div>
                          <strong className="text-slate-400 block tracking-wide uppercase text-[9px]">Scadenza</strong>
                          <span className={`font-mono font-semibold ${status.scaduto || status.inScadenza ? 'text-red-600' : 'text-slate-650'}`}>
                            {reag.dataScadenza}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stato Quantita Quantometrico e Tasti di adeguamento veloce */}
                    <div className="mt-5 border-t border-slate-100 pt-3 flex flex-col gap-2 bg-slate-50/80 p-3 rounded-lg -mx-5 -mb-5 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 font-bold">Giacenza Disponibile:</span>
                        <span className={`text-sm font-extrabold ${status.sottoScorta ? 'text-amber-600' : 'text-slate-800'}`}>
                          {reag.quantitaDisponibile} {reag.unitaMisura}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 font-medium">
                        Soglia minima di attenzione: {reag.livelloSottoScorta} {reag.unitaMisura}
                      </div>

                      {/* Pulsanti consumo / rabbocco rapido */}
                      <div className="mt-1">
                        {isAdjusting ? (
                          <div className="flex gap-1">
                            <input
                              type="number"
                              required
                              placeholder="Qty"
                              value={adjustAmount}
                              onChange={(e) => setAdjustAmount(e.target.value)}
                              className="w-16 px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded text-center outline-none"
                            />
                            <button
                              onClick={() => handleAdjustQuantity(reag.id, true)}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold"
                            >
                              Carica
                            </button>
                            <button
                              onClick={() => handleAdjustQuantity(reag.id, false)}
                              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-850 text-white rounded text-[10px] font-bold"
                            >
                              Consuma
                            </button>
                            <button
                              onClick={() => setAdjustQtyId(null)}
                              className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px]"
                            >
                              Annulla
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAdjustQtyId(reag.id); setAdjustAmount(''); }}
                            className="w-full text-center py-1 bg-white border border-slate-250 hover:bg-slate-100 text-[10px] font-bold text-slate-700 rounded transition"
                          >
                            Aggiorna Stock / Rabbocca o Consuma
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
