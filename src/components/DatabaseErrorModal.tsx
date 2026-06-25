import React from 'react';
import { Database, AlertTriangle, X, ExternalLink } from 'lucide-react';

interface DatabaseErrorModalProps {
  onClose: () => void;
  errorMsg: string | null;
}

export function DatabaseErrorModal({ onClose, errorMsg }: DatabaseErrorModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-100 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <Database className="h-5.5 w-5.5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Dettaglio Connessione Supabase</h3>
              <p className="text-xs text-slate-500 font-medium">Stato attuale delle tabelle e log di errore</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-700 text-sm">
          {/* Error Message Section */}
          <div className="bg-rose-50/70 border border-rose-100 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>LOG DI ERRORE RILEVATO</span>
            </div>
            <pre className="text-xs text-rose-700 bg-white/50 p-3 rounded-lg border border-rose-50 overflow-x-auto font-mono max-h-64 whitespace-pre-wrap leading-relaxed">
              {errorMsg || "Impossibile stabilire una connessione. Verifica che il database di Supabase sia raggiungibile e che le credenziali nel pannello di hosting/configurazione siano corrette."}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between sm:justify-end gap-3">
          <a 
            href="https://supabase.com/dashboard" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition"
          >
            <span>Apri Console Supabase</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
