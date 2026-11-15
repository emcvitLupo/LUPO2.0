import { useState, useEffect, useMemo } from 'react';
import { AccettazioneCampione, Client, Prova, Operator } from '../types';
import {
  Scale,
  Trash2,
  ArrowRight,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Layers,
  AlertCircle,
  LayoutDashboard,
  Search,
  Unlock,
  Lock,
  ExternalLink,
  Clock,
  Sparkles,
  Building2
} from 'lucide-react';
import { EtichettaNutrizionaleModal } from './EtichettaNutrizionaleModal';
import { ClassificazioneRifiutoModal } from './ClassificazioneRifiutoModal';

interface AreeSpecialisticheSectionProps {
  accettazioni: AccettazioneCampione[];
  clients: Client[];
  prove?: Prova[];
  operators?: Operator[];
  onUpdateAccettazione?: (acc: AccettazioneCampione) => void;
  onGoToDashboard?: () => void;
  pendingTarget?: { sampleId: string; module?: 'nutrizionale' | 'rifiuti' } | null;
  onClearPendingTarget?: () => void;
  onGoToAccettazione?: (accId: string, fromLabel?: string) => void;
}

const FOOD_KEYWORDS = [
  'etichetta nutrizionale',
  'etichette nutrizionali',
  'nutrizional',
  'aliment',
  'olio',
  'vino',
  'sfarinat',
  'farina',
  'pane',
  'pasta',
  'forno',
  'conserv',
  'latte',
  'formagg',
  'latticin',
  'miele',
  'dolci',
  'bevanda',
  'carne',
  'salum',
  'pesce',
  'ittic',
  'ortofrutt',
  'frutta',
  'verdura',
  'agroaliment',
  'mangim',
];

const WASTE_KEYWORDS = [
  'rifiut',
  'cer',
  'eer',
  'scavo',
  'demolizione',
  'fresato',
  'fango',
  'asfalto',
  'caratterizzazione',
  'rifiuto',
  'terre e rocce',
  'eluate',
  'eluato',
];

export function AreeSpecialisticheSection({
  accettazioni,
  clients,
  prove = [],
  operators = [],
  onUpdateAccettazione,
  onGoToDashboard,
  pendingTarget,
  onClearPendingTarget,
  onGoToAccettazione,
}: AreeSpecialisticheSectionProps) {
  const [isNutriModalOpen, setIsNutriModalOpen] = useState(false);
  const [isRifiutiModalOpen, setIsRifiutiModalOpen] = useState(false);
  const [targetSampleId, setTargetSampleId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mostraTuttiCampioni, setMostraTuttiCampioni] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'tutti' | 'salvati' | 'da_elaborare'>('tutti');

  useEffect(() => {
    if (pendingTarget && pendingTarget.sampleId) {
      setTargetSampleId(pendingTarget.sampleId);
      const sample = accettazioni.find(a => a.id === pendingTarget.sampleId || a.codiceAccettazione === pendingTarget.sampleId);
      if (pendingTarget.module === 'rifiuti') {
        setIsRifiutiModalOpen(true);
      } else if (pendingTarget.module === 'nutrizionale') {
        setIsNutriModalOpen(true);
      } else if (sample) {
        const cat = (sample.categoriaMerceologica || '').toLowerCase().trim();
        const mat = (sample.matrice || '').toLowerCase().trim();
        const desc = (sample.descrizioneCampione || '').toLowerCase().trim();
        const isWaste = !!sample.datiClassificazioneRifiuto || WASTE_KEYWORDS.some(kw => cat.includes(kw) || mat.includes(kw) || desc.includes(kw));
        if (isWaste) {
          setIsRifiutiModalOpen(true);
        } else {
          setIsNutriModalOpen(true);
        }
      } else {
        setIsNutriModalOpen(true);
      }
      onClearPendingTarget?.();
    }
  }, [pendingTarget, accettazioni, onClearPendingTarget]);

  const getClientName = (acc: AccettazioneCampione) => {
    const cl = clients.find(
      c => c.id === acc.intestatarioRapportoClienteId || c.id === acc.destinatarioFatturaClienteId
    );
    return cl?.denominazione || 'Cliente N/D';
  };

  // Filtriamo i report alimentari / etichetta nutrizionale
  const reportNutrizionali = useMemo(() => {
    return accettazioni.filter(acc => {
      const hasSaved = !!acc.datiEtichettaNutrizionale;
      if (statusFilter === 'salvati' && !hasSaved) return false;
      if (statusFilter === 'da_elaborare' && hasSaved) return false;

      let matchesCategory = true;
      if (!mostraTuttiCampioni && !hasSaved) {
        const cat = (acc.categoriaMerceologica || '').toLowerCase().trim();
        const mat = (acc.matrice || '').toLowerCase().trim();
        const desc = (acc.descrizioneCampione || '').toLowerCase().trim();
        matchesCategory = FOOD_KEYWORDS.some(kw => cat.includes(kw) || mat.includes(kw) || desc.includes(kw));
      }
      if (!matchesCategory) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const clName = getClientName(acc).toLowerCase();
      return (
        acc.codiceAccettazione.toLowerCase().includes(q) ||
        (acc.descrizioneCampione || '').toLowerCase().includes(q) ||
        (acc.matrice || '').toLowerCase().includes(q) ||
        clName.includes(q)
      );
    });
  }, [accettazioni, clients, mostraTuttiCampioni, statusFilter, searchTerm]);

  // Filtriamo i report rifiuti / caratterizzazione
  const reportRifiuti = useMemo(() => {
    return accettazioni.filter(acc => {
      const hasSaved = !!acc.datiClassificazioneRifiuto;
      if (statusFilter === 'salvati' && !hasSaved) return false;
      if (statusFilter === 'da_elaborare' && hasSaved) return false;

      let matchesCategory = true;
      if (!mostraTuttiCampioni && !hasSaved) {
        const cat = (acc.categoriaMerceologica || '').toLowerCase().trim();
        const mat = (acc.matrice || '').toLowerCase().trim();
        const desc = (acc.descrizioneCampione || '').toLowerCase().trim();
        matchesCategory = WASTE_KEYWORDS.some(kw => cat.includes(kw) || mat.includes(kw) || desc.includes(kw));
      }
      if (!matchesCategory) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const clName = getClientName(acc).toLowerCase();
      const cer = (acc.datiClassificazioneRifiuto?.codiceCer || '').toLowerCase();
      return (
        acc.codiceAccettazione.toLowerCase().includes(q) ||
        (acc.descrizioneCampione || '').toLowerCase().includes(q) ||
        (acc.matrice || '').toLowerCase().includes(q) ||
        clName.includes(q) ||
        cer.includes(q)
      );
    });
  }, [accettazioni, clients, mostraTuttiCampioni, statusFilter, searchTerm]);

  const savedNutriCount = accettazioni.filter(a => !!a.datiEtichettaNutrizionale).length;
  const savedRifiutiCount = accettazioni.filter(a => !!a.datiClassificazioneRifiuto).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Sezione */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col gap-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl shadow-inner">
              <Scale className="h-8 w-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Aree Specialistiche del Laboratorio
                </h1>
                <span className="bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border border-indigo-200">
                  Moduli Avanzati
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Sezione operativa dedicata a Etichettatura Nutrizionale (Reg. UE 1169/2011) e Classificazione Rifiuti (D.Lgs. 152/2006 - Reg. UE 1357/2014).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onGoToDashboard && (
              <button
                onClick={onGoToDashboard}
                className="px-4 py-2.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-2xl font-bold text-xs flex items-center gap-2 border border-slate-200 hover:border-indigo-200 transition cursor-pointer shadow-2xs active:scale-95"
              >
                <LayoutDashboard className="h-4 w-4 text-indigo-600" />
                <span>Torna alla Dashboard</span>
              </button>
            )}

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl px-4 py-2.5 text-right">
              <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Campioni Alimentari</div>
              <div className="text-sm font-black text-emerald-950">
                {reportNutrizionali.length} Idonei {savedNutriCount > 0 ? `(${savedNutriCount} salvate)` : ''}
              </div>
            </div>

            <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl px-4 py-2.5 text-right">
              <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Campioni Rifiuti</div>
              <div className="text-sm font-black text-indigo-950">
                {reportRifiuti.length} Idonei {savedRifiutiCount > 0 ? `(${savedRifiutiCount} salvati)` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Barra di Ricerca, Filtro Stato e Sblocco Filtro Categorie */}
        <div className="pt-4 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cerca campione per codice (es. ACC-2026), cliente, matrice o codice CER..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filtro Stato Lavorazione */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setStatusFilter('tutti')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'tutti' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tutti
              </button>
              <button
                onClick={() => setStatusFilter('da_elaborare')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'da_elaborare' ? 'bg-amber-500 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Da elaborare
              </button>
              <button
                onClick={() => setStatusFilter('salvati')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  statusFilter === 'salvati' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Già Salvati ({savedNutriCount + savedRifiutiCount})
              </button>
            </div>

            {/* Sblocco Filtro Categorie Merceologiche */}
            <button
              type="button"
              onClick={() => setMostraTuttiCampioni(prev => !prev)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer ${
                mostraTuttiCampioni
                  ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Attiva per visualizzare tutti i campioni del laboratorio anche se non contengono parole chiave alimentari o rifiuti"
            >
              {mostraTuttiCampioni ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Tutti i campioni sbloccati ({accettazioni.length})</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mostra tutti i campioni del laboratorio</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* GRIGLIA DIVISA A METÀ (50/50 SPLIT) CON LISTA OPERATIVA CAMPIONI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PARTE 1: STESURA ETICHETTA NUTRIZIONALE */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-105 transition-transform shadow-sm">
                <Scale className="h-7 w-7" />
              </div>
              <span className="bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-200">
                Reg. UE 1169/2011
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight group-hover:text-emerald-700 transition-colors">
              Stesura Etichetta Nutrizionale
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed">
              Elaborazione dei valori nutrizionali per 100g/100ml e per porzione, verifica automatica del <strong>Bilancio di Massa a 100 g</strong>, arrotondamenti normativi (Allegato XV) e calcolo Assunzioni di Riferimento (% RI).
            </p>

            {/* Box Punti Chiave */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Allegato XV UE</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Bilancio a 100 g</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                <FileText className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>Stampa PDF A4</span>
              </div>
            </div>

            {/* LISTA OPERATIVA CAMPIONI ALIMENTARI */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Campioni Alimentari Pronti ({reportNutrizionali.length})
                </span>
                <span className="text-[11px] text-emerald-700 font-bold">
                  {savedNutriCount} etichette salvate
                </span>
              </div>

              {reportNutrizionali.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                  <p className="text-xs font-bold text-slate-600">
                    Nessun campione alimentare trovato con i filtri attuali.
                  </p>
                  {!mostraTuttiCampioni && (
                    <button
                      type="button"
                      onClick={() => setMostraTuttiCampioni(true)}
                      className="mt-2 text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" /> Sblocca tutti i campioni del laboratorio
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                  {reportNutrizionali.map(acc => {
                    const saved = acc.datiEtichettaNutrizionale;
                    const clName = getClientName(acc);
                    return (
                      <div
                        key={acc.id}
                        className={`p-3 rounded-2xl border transition flex flex-col gap-2 ${
                          saved
                            ? 'bg-emerald-50/40 border-emerald-200 hover:bg-emerald-50/80'
                            : 'bg-slate-50/70 border-slate-200 hover:border-emerald-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {acc.codiceAccettazione}
                              </span>
                              {saved ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3" /> Etichetta Salvata
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3" /> Da elaborare
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-slate-800 mt-1 truncate">
                              {acc.descrizioneCampione || acc.matrice}
                            </p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                              {clName}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setTargetSampleId(acc.id);
                                setIsNutriModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition cursor-pointer shadow-2xs"
                            >
                              {saved ? 'Apri Etichetta' : 'Elabora'}
                            </button>
                            {onGoToAccettazione && (
                              <button
                                type="button"
                                onClick={() => onGoToAccettazione(acc.id, 'Aree Specialistiche (Nutrizionale)')}
                                className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Vai al Rapporto di Prova in Accettazione"
                              >
                                <span>RdP</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Anteprima rapida valori nutrizionali salvati */}
                        {saved && saved.valori && (
                          <div className="pt-1.5 border-t border-emerald-200/60 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-emerald-950">
                            <span className="bg-white px-2 py-0.5 rounded border border-emerald-200 font-bold">
                              ⚡ {Math.round(saved.valori.energiaKcal || 0)} kcal / {Math.round(saved.valori.energiaKj || 0)} kJ
                            </span>
                            <span>Grassi: <strong>{saved.valori.grassi}g</strong></span>
                            <span>Carb: <strong>{saved.valori.carboidrati}g</strong></span>
                            <span>Prot: <strong>{saved.valori.proteine}g</strong></span>
                            <span>Sale: <strong>{saved.valori.sale}g</strong></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-150">
            <button
              onClick={() => {
                setTargetSampleId(null);
                setIsNutriModalOpen(true);
              }}
              className="w-full bg-emerald-650 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <span>Apri Stesura Etichetta Nutrizionale</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* PARTE 2: CLASSIFICAZIONE DEL RIFIUTO */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs hover:border-indigo-300 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-105 transition-transform shadow-sm">
                <Trash2 className="h-7 w-7" />
              </div>
              <span className="bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border border-indigo-200 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" /> D.Lgs. 152/2006
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight group-hover:text-indigo-700 transition-colors">
              Classificazione del Rifiuto
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed">
              Caratterizzazione analitica e classificazione dei rifiuti (Catalogo Codici CER/EER, verifica classi di pericolo <strong>HP1–HP15</strong> ai sensi del Reg. UE 1357/2014 e frasi normative pre-impostate per il Giudizio Tecnico).
            </p>

            {/* Box Punti Chiave */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-900">
                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span>Catalogo EER/CER</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-900">
                <AlertCircle className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span>Classi HP1 - HP15</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-900">
                <Layers className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span>Frasi Normative</span>
              </div>
            </div>

            {/* LISTA OPERATIVA CAMPIONI RIFIUTI */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Campioni Rifiuti &amp; Terre Pronti ({reportRifiuti.length})
                </span>
                <span className="text-[11px] text-indigo-700 font-bold">
                  {savedRifiutiCount} classificazioni salvate
                </span>
              </div>

              {reportRifiuti.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                  <p className="text-xs font-bold text-slate-600">
                    Nessun campione rifiuto/ambientale trovato con i filtri attuali.
                  </p>
                  {!mostraTuttiCampioni && (
                    <button
                      type="button"
                      onClick={() => setMostraTuttiCampioni(true)}
                      className="mt-2 text-xs font-bold text-indigo-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" /> Sblocca tutti i campioni del laboratorio
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                  {reportRifiuti.map(acc => {
                    const saved = acc.datiClassificazioneRifiuto;
                    const clName = getClientName(acc);
                    return (
                      <div
                        key={acc.id}
                        className={`p-3 rounded-2xl border transition flex flex-col gap-2 ${
                          saved
                            ? 'bg-indigo-50/40 border-indigo-200 hover:bg-indigo-50/80'
                            : 'bg-slate-50/70 border-slate-200 hover:border-indigo-300 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {acc.codiceAccettazione}
                              </span>
                              {saved ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 border border-indigo-300">
                                  <CheckCircle2 className="w-3 h-3" /> Classificato
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  <Clock className="w-3 h-3" /> Da classificare
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-slate-800 mt-1 truncate">
                              {acc.descrizioneCampione || acc.matrice}
                            </p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
                              <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                              {clName}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setTargetSampleId(acc.id);
                                setIsRifiutiModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold transition cursor-pointer shadow-2xs"
                            >
                              {saved ? 'Apri Scheda' : 'Classifica'}
                            </button>
                            {onGoToAccettazione && (
                              <button
                                type="button"
                                onClick={() => onGoToAccettazione(acc.id, 'Aree Specialistiche (Rifiuti)')}
                                className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Vai al Rapporto di Prova in Accettazione"
                              >
                                <span>RdP</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Anteprima rapida classificazione rifiuto salvata */}
                        {saved && (
                          <div className="pt-1.5 border-t border-indigo-200/60 flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                            <span className="bg-white px-2 py-0.5 rounded border border-indigo-200 font-mono font-bold text-indigo-950">
                              EER/CER: {saved.codiceCer || 'N/D'}
                            </span>
                            {saved.isPericoloso ? (
                              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 font-black">
                                ⚠️ PERICOLOSO {saved.selectedHp?.length ? `(${saved.selectedHp.join(', ')})` : ''}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-black">
                                ✓ NON PERICOLOSO
                              </span>
                            )}
                            {saved.operazioneDestinazione && (
                              <span className="text-slate-600 truncate">
                                Dest.: <strong>{saved.operazioneDestinazione}</strong>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-150">
            <button
              onClick={() => {
                setTargetSampleId(null);
                setIsRifiutiModalOpen(true);
              }}
              className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <span>Apri Classificazione del Rifiuto</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Etichetta Nutrizionale */}
      <EtichettaNutrizionaleModal
        isOpen={isNutriModalOpen}
        onClose={() => {
          setIsNutriModalOpen(false);
          setTargetSampleId(null);
        }}
        accettazioni={accettazioni}
        clients={clients}
        prove={prove}
        operators={operators}
        onUpdateAccettazione={onUpdateAccettazione}
        initialSampleId={targetSampleId}
        onGoToAccettazione={onGoToAccettazione}
      />

      {/* Modal Classificazione Rifiuto */}
      <ClassificazioneRifiutoModal
        isOpen={isRifiutiModalOpen}
        onClose={() => {
          setIsRifiutiModalOpen(false);
          setTargetSampleId(null);
        }}
        accettazioni={accettazioni}
        clients={clients}
        prove={prove}
        operators={operators}
        onUpdateAccettazione={onUpdateAccettazione}
        initialSampleId={targetSampleId}
        onGoToAccettazione={onGoToAccettazione}
      />
    </div>
  );
}
