import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { X, Mail, Lock, Shield, ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react';

interface LoginModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setErrorMsg("Errore: Supabase non è configurato.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Sign In
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      setSuccessMsg("Accesso effettuato con successo!");
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err: any) {
      console.error("Errore Auth:", err);
      setErrorMsg(err.message || "Si è verificato un errore imprevisto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-150 animate-scaleIn relative overflow-hidden">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-emerald-55 rounded-2xl text-emerald-600 mb-3 shadow-xs">
            <Shield className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            Accedi all'Area Riservata
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Inserisci le tue credenziali per autenticarti e sbloccare i permessi.
          </p>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold leading-relaxed">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold flex items-start gap-2 leading-relaxed">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@azienda.it"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2 text-xs font-medium focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold uppercase tracking-wider py-3 rounded-xl transition duration-200 flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Elaborazione...
              </span>
            ) : (
              <>
                Accedi
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

        </form>

      </div>
    </div>
  );
}
