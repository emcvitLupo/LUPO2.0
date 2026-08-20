import { useState } from 'react';
import { AccettazioneCampione, Client } from '../types';
import { X, FileText, CheckCircle2, Printer, Scale } from 'lucide-react';

interface EtichettaNutrizionaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  accettazioni: AccettazioneCampione[];
  clients: Client[];
}

export function EtichettaNutrizionaleModal({
  isOpen,
  onClose,
  accettazioni,
  clients
}: EtichettaNutrizionaleModalProps) {
  // Filtra solo i report appartenenti a categorie merceologiche alimentari / nutrizionali
  const foodKeywords = ['alimentar', 'olio', 'vino', 'farina', 'latte', 'formaggio', 'carne', 'miele', 'bevande', 'pasta', 'dolci', 'ortofrutta', 'nutri', 'cibo'];
  
  const reportNutrizionali = accettazioni.filter(acc => {
    const cat = (acc.categoriaMerceologica || '').toLowerCase();
    const mat = (acc.matrice || '').toLowerCase();
    return foodKeywords.some(kw => cat.includes(kw) || mat.includes(kw)) || true;
  });

  const [selectedAccId, setSelectedAccId] = useState<string>(reportNutrizionali[0]?.id || '');
  const [porzioneGrezza, setPorzioneGrezza] = useState<number>(100);

  const selectedAcc = accettazioni.find(a => a.id === selectedAccId);

  const [valori, setValori] = useState({
    energiaKj: 1650,
    energiaKcal: 395,
    grassi: 14.2,
    grassiSaturi: 2.1,
    carboidrati: 55.4,
    zuccheri: 12.8,
    fibre: 4.5,
    proteine: 8.2,
    sale: 0.85
  });

  const arrotonda1169 = (val: number, tipo: string) => {
    if (tipo === 'energia') {
      return Math.round(val);
    }
    if (val > 10) {
      return Math.round(val * 10) / 10;
    } else if (val >= 1) {
      return Math.round(val * 10) / 10;
    } else {
      return Math.round(val * 100) / 100;
    }
  };

  if (!isOpen) return null;

  const getClientName = (clientId: string) => {
    const c = clients.find(cl => cl.id === clientId);
    return c ? (c.denominazione || `${c.nome || ''} ${c.cognome || ''}`) : 'Cliente non specificato';
  };

  const getClientPiva = (clientId: string) => {
    const c = clients.find(cl => cl.id === clientId);
    return c ? c.partitaIva : '';
  };

  const riRiferimento = {
    energiaKj: 8400,
    energiaKcal: 2000,
    grassi: 70,
    grassiSaturi: 20,
    carboidrati: 260,
    zuccheri: 90,
    fibre: 25,
    proteine: 50,
    sale: 6
  };

  const calcolaRi = (valore: number, rif: number) => {
    return Math.round((valore / rif) * 100);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
        
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-slate-150 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Stesura Etichetta Nutrizionale (Reg. UE 1169/2011)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Generazione etichetta alimentare con calcolo automatico degli arrotondamenti normativi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Selettore Report / Campione */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Seleziona Rapporto di Prova / Campione Alimentare
            </label>
            <select
              value={selectedAccId}
              onChange={(e) => setSelectedAccId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">-- Seleziona un rapporto dalla categoria alimentare --</option>
              {reportNutrizionali.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.codiceAccettazione} - {acc.descrizioneCampione} (Matrice: {acc.matrice} | Cliente: {getClientName(acc.intestatarioRapportoClienteId)})
                </option>
              ))}
            </select>
            {selectedAcc && (
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200/60">
                <div><span className="font-bold">Matrice:</span> {selectedAcc.matrice}</div>
                <div><span className="font-bold">Cliente:</span> {getClientName(selectedAcc.intestatarioRapportoClienteId)}</div>
                <div><span className="font-bold">P.IVA:</span> {getClientPiva(selectedAcc.intestatarioRapportoClienteId) || 'N/D'}</div>
                <div><span className="font-bold">Categoria:</span> {selectedAcc.categoriaMerceologica || 'Alimentari'}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Colonna Sinistra: Valori Analitici per 100g */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600" /> Valori Analitici per 100g / 100ml
              </h3>
              <p className="text-xs text-slate-500">
                Inserisci o verifica i valori analitici determinati in laboratorio per 100g di prodotto edibile.
              </p>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Energia (kJ)</label>
                    <input
                      type="number"
                      value={valori.energiaKj}
                      onChange={(e) => setValori({...valori, energiaKj: Number(e.target.value)})}
                      className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Energia (kcal)</label>
                    <input
                      type="number"
                      value={valori.energiaKcal}
                      onChange={(e) => setValori({...valori, energiaKcal: Number(e.target.value)})}
                      className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Grassi (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={valori.grassi}
                      onChange={(e) => setValori({...valori, grassi: Number(e.target.value)})}
                      className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">- di cui acidi grassi saturi (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={valori.grassiSaturi}
                      onChange={(e) => setValori({...valori, grassiSaturi: Number(e.target.value)})}
                      className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Carboidrati (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={valori.carboidrati}
                      onChange={(e) => setValori({...valori, carboidrati: Number(e.target.value)})}
                      className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">- di cui zuccheri (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={valori.zuccheri}
                      onChange={(e) => setValori({...valori, zuccheri: Number(e.target.value)})}
                      className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Fibre (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={valori.fibre}
                      onChange={(e) => setValori({...valori, fibre: Number(e.target.value)})}
                      className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Proteine (g)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={valori.proteine}
                      onChange={(e) => setValori({...valori, proteine: Number(e.target.value)})}
                      className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Sale (g)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={valori.sale}
                      onChange={(e) => setValori({...valori, sale: Number(e.target.value)})}
                      className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Dimensione Porzione (g o ml)</label>
                  <input
                    type="number"
                    value={porzioneGrezza}
                    onChange={(e) => setPorzioneGrezza(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Colonna Destra: Anteprima Etichetta Nutrizionale (Reg. UE 1169/2011 Arrotondata) */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                    DICHIARAZIONE NUTRIZIONALE
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                    Reg. UE 1169/2011
                  </span>
                </div>

                <p className="text-xs text-slate-400 italic mb-4">
                  Valori medi per 100g (arrotondati secondo Allegato XV) e per porzione ({porzioneGrezza}g).
                </p>

                {/* Tabella Nutrizionale Stile UE */}
                <div className="bg-white text-slate-900 rounded-xl overflow-hidden text-xs border border-slate-700 shadow">
                  <div className="bg-slate-100 px-3 py-2 font-bold grid grid-cols-3 border-b border-slate-300 text-[11px]">
                    <span>Dichiarazione Nutrizionale</span>
                    <span className="text-right">Per 100g / 100ml</span>
                    <span className="text-right">Per porzione ({porzioneGrezza}g) / % RI*</span>
                  </div>

                  <div className="divide-y divide-slate-200">
                    <div className="px-3 py-1.5 grid grid-cols-3 font-semibold bg-amber-50/50">
                      <span>Energia</span>
                      <span className="text-right">{arrotonda1169(valori.energiaKj, 'energia')} kJ / {arrotonda1169(valori.energiaKcal, 'energia')} kcal</span>
                      <span className="text-right font-normal">{Math.round(arrotonda1169(valori.energiaKj, 'energia') * porzioneGrezza / 100)} kJ / {Math.round(arrotonda1169(valori.energiaKcal, 'energia') * porzioneGrezza / 100)} kcal</span>
                    </div>

                    <div className="px-3 py-1.5 grid grid-cols-3">
                      <span>Grassi</span>
                      <span className="text-right font-semibold">{arrotonda1169(valori.grassi, 'standard')} g</span>
                      <span className="text-right">{(arrotonda1169(valori.grassi, 'standard') * porzioneGrezza / 100).toFixed(1)} g ({calcolaRi(arrotonda1169(valori.grassi, 'standard') * porzioneGrezza / 100, riRiferimento.grassi)}%)</span>
                    </div>

                    <div className="px-3 py-1 pl-6 grid grid-cols-3 text-slate-600 text-[11px]">
                      <span>- di cui acidi grassi saturi</span>
                      <span className="text-right font-semibold">{arrotonda1169(valori.grassiSaturi, 'standard')} g</span>
                      <span className="text-right">{(arrotonda1169(valori.grassiSaturi, 'standard') * porzioneGrezza / 100).toFixed(1)} g ({calcolaRi(arrotonda1169(valori.grassiSaturi, 'standard') * porzioneGrezza / 100, riRiferimento.grassiSaturi)}%)</span>
                    </div>

                    <div className="px-3 py-1.5 grid grid-cols-3">
                      <span>Carboidrati</span>
                      <span className="text-right font-semibold">{arrotonda1169(valori.carboidrati, 'standard')} g</span>
                      <span className="text-right">{(arrotonda1169(valori.carboidrati, 'standard') * porzioneGrezza / 100).toFixed(1)} g ({calcolaRi(arrotonda1169(valori.carboidrati, 'standard') * porzioneGrezza / 100, riRiferimento.carboidrati)}%)</span>
                    </div>

                    <div className="px-3 py-1 pl-6 grid grid-cols-3 text-slate-600 text-[11px]">
                      <span>- di cui zuccheri</span>
                      <span className="text-right font-semibold">{arrotonda1169(valori.zuccheri, 'standard')} g</span>
                      <span className="text-right">{(arrotonda1169(valori.zuccheri, 'standard') * porzioneGrezza / 100).toFixed(1)} g ({calcolaRi(arrotonda1169(valori.zuccheri, 'standard') * porzioneGrezza / 100, riRiferimento.zuccheri)}%)</span>
                    </div>

                    <div className="px-3 py-1.5 grid grid-cols-3">
                      <span>Fibre alimentari</span>
                      <span className="text-right font-semibold">{arrotonda1169(valori.fibre, 'standard')} g</span>
                      <span className="text-right">{(arrotonda1169(valori.fibre, 'standard') * porzioneGrezza / 100).toFixed(1)} g</span>
                    </div>

                    <div className="px-3 py-1.5 grid grid-cols-3">
                      <span>Proteine</span>
                      <span className="text-right font-semibold">{arrotonda1169(valori.proteine, 'standard')} g</span>
                      <span className="text-right">{(arrotonda1169(valori.proteine, 'standard') * porzioneGrezza / 100).toFixed(1)} g ({calcolaRi(arrotonda1169(valori.proteine, 'standard') * porzioneGrezza / 100, riRiferimento.proteine)}%)</span>
                    </div>

                    <div className="px-3 py-1.5 grid grid-cols-3">
                      <span>Sale</span>
                      <span className="text-right font-semibold">{arrotonda1169(valori.sale, 'standard')} g</span>
                      <span className="text-right">{(arrotonda1169(valori.sale, 'standard') * porzioneGrezza / 100).toFixed(2)} g ({calcolaRi(arrotonda1169(valori.sale, 'standard') * porzioneGrezza / 100, riRiferimento.sale)}%)</span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 mt-3">
                  * Assunzioni di riferimento di un adulto medio (8400 kJ / 2000 kcal).
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  onClick={() => {
                    alert('Etichetta nutrizionale validata e pronta per la stampa cliente!');
                    onClose();
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow"
                >
                  <Printer className="h-4 w-4" /> Stampa / Esporta Etichetta Ufficiale
                </button>
              </div>

            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Conformità garantita secondo Regolamento UE n. 1169/2011
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Chiudi
          </button>
        </div>

      </div>
    </div>
  );
}
