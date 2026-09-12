import React, { useState } from 'react';
import { AccettazioneCampione, RevisioneRDP, Operator } from '../types';
import { computeRdpDiff, RdpDiffItem } from '../utils/rdpDiff';
import { X, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, FileText, Sparkles, Filter } from 'lucide-react';

interface RdpDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  accettazione: AccettazioneCampione | null;
  snapshotConfronto?: RevisioneRDP | null;
  operators: Operator[];
  currentUser?: string;
  onApproveRevision?: (accettazioneId: string, operatore: string, motivo: string, tipologia: string) => void;
}

export const RdpDiffModal: React.FC<RdpDiffModalProps> = ({
  isOpen,
  onClose,
  accettazione,
  snapshotConfronto,
  operators,
  currentUser,
  onApproveRevision,
}) => {
  const [selectedSezione, setSelectedSezione] = useState<string>('Tutte');
  const [approvingOperator, setApprovingOperator] = useState<string>(currentUser || '');
  const [operatorPin, setOperatorPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState<boolean>(false);

  if (!isOpen || !accettazione) return null;

  // Determine comparison target
  const oldSnapshot: RevisioneRDP | undefined =
    snapshotConfronto ||
    (accettazione.storicoRevisioni && accettazione.storicoRevisioni.length > 0
      ? accettazione.storicoRevisioni[accettazione.storicoRevisioni.length - 1]
      : undefined);

  if (!oldSnapshot) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl border border-slate-100">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mx-auto">
            <FileText className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-850">Nessuna Revisione Precedente</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Questo Rapporto di Prova ({accettazione.codiceAccettazione}) è attualmente in <strong>Emissione Originale (Rev. 00)</strong>. Non ci sono revisioni precedenti con cui effettuare il confronto.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    );
  }

  const diffResult = computeRdpDiff(oldSnapshot, accettazione);
  const revVecchia = String(oldSnapshot.numeroRevisione).padStart(2, '0');
  const revNuova = String(accettazione.revisioneCorrente ?? 1).padStart(2, '0');

  const filteredItems = selectedSezione === 'Tutte'
    ? diffResult.items
    : diffResult.items.filter(i => i.sezione === selectedSezione);

  const sezioni = ['Tutte', 'Parametri Analitici', 'Dati Campione', 'Note e Conformità', 'Firmatari e Date'];

  const handleConfirmApproval = () => {
    if (!onApproveRevision || !approvingOperator) {
      setPinError('Seleziona il responsabile firmatario.');
      return;
    }

    const matchedOp = operators.find(o => o.nome === approvingOperator);
    if (matchedOp && matchedOp.password) {
      if (operatorPin.trim() !== matchedOp.password.trim()) {
        setPinError('⚠️ Password / PIN Operatore non corretto. Inserisci la password per autorizzare la firma.');
        return;
      }
    } else if (!operatorPin.trim()) {
      setPinError('⚠️ Inserisci la password/PIN operatore per convalidare la firma.');
      return;
    }

    setPinError(null);
    setIsApproving(true);
    onApproveRevision(
      accettazione.id,
      approvingOperator,
      accettazione.revisioneMotivo || 'Revisione controllata approvata',
      accettazione.tipologiaRevisione || 'Rettifica valore analitico / ricalcolo'
    );
    setIsApproving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-black uppercase tracking-widest rounded-md">
                ISO/IEC 17025 §7.8.8
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {accettazione.codiceAccettazione}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2.5">
              Confronto Revisioni & Diff
              <span className="flex items-center gap-1.5 text-xs font-mono font-bold bg-slate-800 px-3 py-1 rounded-xl border border-slate-700 text-slate-300">
                <span>Rev. {revVecchia}</span>
                <ArrowRight className="h-3 w-3 text-indigo-400" />
                <span className="text-indigo-300 font-black">Rev. {revNuova}</span>
              </span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* METADATI REVISIONE & SOMMARIO */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700">Tipologia Revisione:</span>
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 font-semibold rounded-lg text-[11px]">
                {accettazione.tipologiaRevisione || oldSnapshot.tipologiaRevisione || 'Non specificata'}
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500">
                Stato: <strong className={accettazione.statoRevisione === 'In Bozza' ? 'text-amber-600' : 'text-emerald-700'}>
                  {accettazione.statoRevisione || 'Vigente'}
                </strong>
              </span>
            </div>
            {accettazione.revisioneMotivo && (
              <p className="text-slate-600 text-[11px] italic">
                &ldquo;{accettazione.revisioneMotivo}&rdquo;
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 ${
              diffResult.hasChanges ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
            }`}>
              {diffResult.hasChanges ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  <span>{diffResult.totalChanges} variazioni rilevate</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Nessuna variazione</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* FILTRI PER SEZIONE */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 overflow-x-auto shrink-0 bg-white">
          <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Filtra per:</span>
          {sezioni.map(sez => (
            <button
              key={sez}
              onClick={() => setSelectedSezione(sez)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedSezione === sez
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sez}
            </button>
          ))}
        </div>

        {/* TABELLA CONFRONTO DIFF */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              Nessuna differenza trovata in questa sezione.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4">Campo / Parametro</th>
                    <th className="py-2.5 px-4 bg-red-50/50 text-red-900 border-l border-r border-slate-200">
                      Rev. {revVecchia} (Precedente)
                    </th>
                    <th className="py-2.5 px-4 bg-emerald-50/50 text-emerald-900">
                      Rev. {revNuova} (Nuova)
                    </th>
                    <th className="py-2.5 px-3 text-center">Tipo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-mono">
                  {filteredItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-sans font-medium text-slate-800">
                        <div className="font-bold text-slate-900">{item.campo}</div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">{item.sezione}</span>
                      </td>
                      <td className="py-3 px-4 bg-red-50/20 text-red-700 border-l border-r border-slate-200">
                        <span className="line-through bg-red-100/80 px-1.5 py-0.5 rounded text-red-800">
                          {item.vecchioValore}
                        </span>
                      </td>
                      <td className="py-3 px-4 bg-emerald-50/20 text-emerald-700">
                        <span className="bg-emerald-100/90 font-bold px-1.5 py-0.5 rounded text-emerald-900">
                          {item.nuovoValore}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          item.tipoModifica === 'modificato'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : item.tipoModifica === 'aggiunto'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {item.tipoModifica}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER DI APPROVAZIONE / AZIONI */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="text-[11px] text-slate-500 text-left">
            📌 <strong>Conformità ISO 17025:</strong> Tutte le variazioni vengono registrate nel registro storico e stampate sul certificato.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Chiudi
            </button>

            {accettazione.statoRevisione === 'In Bozza' && onApproveRevision && (
              <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <select
                      value={approvingOperator}
                      onChange={(e) => {
                        setApprovingOperator(e.target.value);
                        setPinError(null);
                      }}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">-- Seleziona Responsabile --</option>
                      {operators
                        .filter(o => o.attivo !== false && o.autorizzatoFirma !== false)
                        .map(o => (
                          <option key={o.nome} value={o.nome}>
                            {o.nome} ({o.ruoloFirma || o.ruolo})
                          </option>
                        ))
                      }
                    </select>

                    <input
                      type="password"
                      placeholder="Password/PIN Operatore"
                      value={operatorPin}
                      onChange={(e) => {
                        setOperatorPin(e.target.value);
                        setPinError(null);
                      }}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500 w-44"
                    />

                    <button
                      disabled={!approvingOperator || !operatorPin.trim() || isApproving}
                      onClick={handleConfirmApproval}
                      className={`px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                        !approvingOperator || !operatorPin.trim() || isApproving ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Approva e Firma Rev. {revNuova}
                    </button>
                  </div>
                  {pinError && (
                    <div className="text-[10px] text-rose-600 font-bold text-right pr-1">
                      {pinError}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
