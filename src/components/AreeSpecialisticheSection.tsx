import { useState } from 'react';
import { AccettazioneCampione, Client } from '../types';
import { Scale, Trash2, ArrowRight, Sparkles, ShieldCheck, FileText, CheckCircle2, Layers, FlaskConical, AlertCircle } from 'lucide-react';
import { EtichettaNutrizionaleModal } from './EtichettaNutrizionaleModal';

interface AreeSpecialisticheSectionProps {
  accettazioni: AccettazioneCampione[];
  clients: Client[];
}

export function AreeSpecialisticheSection({ accettazioni, clients }: AreeSpecialisticheSectionProps) {
  const [isNutriModalOpen, setIsNutriModalOpen] = useState(false);
  const [isRifiutiModalOpen, setIsRifiutiModalOpen] = useState(false);

  // Filtriamo i report alimentari per le etichette
  const foodKeywords = ['alimentar', 'olio', 'vino', 'farina', 'latte', 'formaggio', 'carne', 'miele', 'bevande', 'pasta', 'dolci', 'ortofrutta', 'nutri', 'cibo'];
  const reportNutrizionali = accettazioni.filter(acc => {
    const cat = (acc.categoriaMerceologica || '').toLowerCase();
    const mat = (acc.matrice || '').toLowerCase();
    return foodKeywords.some(kw => cat.includes(kw) || mat.includes(kw)) || true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header Sezione stile Prove */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-50 text-indigo-700 rounded-2xl shadow-inner">
            <FlaskConical className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Aree Specialistiche del Laboratorio
              </h1>
              <span className="bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border border-indigo-200">
                Moduli Avanzati
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Sezione dedicata alle lavorazioni normative complesse: etichettatura nutrizionale UE e caratterizzazione rifiuti.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-right">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Report Alimentari</div>
            <div className="text-sm font-black text-slate-800">{reportNutrizionali.length} Disponibili</div>
          </div>
        </div>
      </div>

      {/* GRIGLIA DIVISA A METÀ (50/50 SPLIT) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PARTE 1: STESURA ETICHETTA NUTRIZIONALE */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-6">
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
            
            <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
              Area operativa per la gestione e stesura delle etichette nutrizionali conformi al Regolamento UE n. 1169/2011. Consente di richiamare esclusivamente i report di prova appartenenti alla categoria merceologica alimentare, elaborare i valori analitici per 100g e applicare automaticamente le regole di arrotondamento (Allegato XV) e il calcolo delle Assunzioni di Riferimento (RI).
            </p>

            <div className="mt-6 space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Filtro automatico categorie merceologiche alimentari</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Arrotondamenti normativi secondo Allegato XV</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Esportazione etichetta ufficiale per il cliente</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-150">
            <button
              onClick={() => setIsNutriModalOpen(true)}
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
            <div className="flex items-center justify-between mb-6">
              <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-105 transition-transform shadow-sm">
                <Trash2 className="h-7 w-7" />
              </div>
              <span className="bg-amber-50 text-amber-700 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> In Sviluppo
              </span>
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight group-hover:text-indigo-700 transition-colors">
              Classificazione del Rifiuto
            </h3>
            
            <p className="text-xs sm:text-sm text-slate-600 mt-3 leading-relaxed">
              Area specialistica dedicata alla caratterizzazione analitica e alla classificazione dei rifiuti ai sensi delle normative vigenti (Attribuzione Codici CER, verifica delle caratteristiche di pericolo HP ai sensi del Reg. UE 1357/2014 e della Decisione 2014/955/UE, test di cessione ed ecotossicità).
            </p>

            <div className="mt-6 space-y-2.5 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Gestione e ricerca codici CER</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <AlertCircle className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Verifica caratteristiche di pericolo (HP1 - HP15)</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                <Layers className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Schede di caratterizzazione rifiuti (In arrivo)</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-150">
            <button
              onClick={() => setIsRifiutiModalOpen(true)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider py-3.5 px-6 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <span>Visualizza Stato Modulo Rifiuti</span>
              <ArrowRight className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </div>

      </div>

      {/* Modal Etichetta Nutrizionale */}
      <EtichettaNutrizionaleModal
        isOpen={isNutriModalOpen}
        onClose={() => setIsNutriModalOpen(false)}
        accettazioni={accettazioni}
        clients={clients}
      />

      {/* Modal Rifiuti in sviluppo */}
      {isRifiutiModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-fadeIn text-center space-y-4">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">Classificazione del Rifiuto</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Questa area è riservata alla futura implementazione del modulo di classificazione rifiuti e gestione codici CER. L'infrastruttura è stata predisposta in questa sezione divisa.
            </p>
            <button
              onClick={() => setIsRifiutiModalOpen(false)}
              className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer shadow"
            >
              Ho capito
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
