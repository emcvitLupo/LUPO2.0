import { Client, Prova, Preventivo, Reagente } from '../types';
import { Users, FileSpreadsheet, FlaskConical, AlertTriangle, Euro } from 'lucide-react';

interface StatsProps {
  clients: Client[];
  prove: Prova[];
  preventivi: Preventivo[];
  reagenti: Reagente[];
}

export function DashboardStats({ clients, prove, preventivi, reagenti }: StatsProps) {
  // Calcolo statistiche utili
  const totaleClienti = clients.length;
  const totaleProve = prove.length;
  
  // Preventivi approvati o attivi
  const preventiviAttivi = preventivi.filter(p => p.stato === 'In Approvazione' || p.stato === 'Approvato').length;
  
  // Reagenti sotto scorta o vicini alla scadenza
  const reagentiAlert = reagenti.filter(r => {
    const sottoScorta = r.quantitaDisponibile <= r.livelloSottoScorta;
    const scadutoOScadenza = new Date(r.dataScadenza).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000; // 30 giorni
    return sottoScorta || scadutoOScadenza;
  }).length;

  // Calcolo fatturato stimato 2026 (totale dei preventivi approvati o fatturati nel range dell'anno corrente o somma fatturato)
  let fatturato2026 = 0;
  clients.forEach(c => {
    if (c.fatturatoAnnuo['2026']) {
      fatturato2026 += c.fatturatoAnnuo['2026'];
    }
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* Clinenti Card */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 transition hover:shadow-md">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
          <Users className="h-6 w-6" id="icon-clients-stat" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Clienti Attivi</p>
          <p className="text-2xl font-bold text-slate-800">{totaleClienti}</p>
        </div>
      </div>

      {/* Prove Card */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 transition hover:shadow-md">
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
          <FlaskConical className="h-6 w-6" id="icon-prove-stat" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Prove a Tariffario</p>
          <p className="text-2xl font-bold text-slate-800">{totaleProve}</p>
        </div>
      </div>

      {/* Preventivi Card */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 transition hover:shadow-md">
        <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
          <FileSpreadsheet className="h-6 w-6" id="icon-preventivi-stat" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Preventivi Attivi</p>
          <p className="text-2xl font-bold text-slate-800">{preventiviAttivi}</p>
        </div>
      </div>

      {/* Reagenti Allerta Card */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 transition hover:shadow-md">
        <div className={`p-3 rounded-lg ${reagentiAlert > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
          <AlertTriangle className="h-6 w-6" id="icon-reagenti-stat" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Allertele Reagenti</p>
          <p className={`text-2xl font-bold ${reagentiAlert > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
            {reagentiAlert}
          </p>
        </div>
      </div>

      {/* Fatturato Estimato Card */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 transition hover:shadow-md">
        <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
          <Euro className="h-6 w-6" id="icon-fatturato-stat" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fatturato 2026</p>
          <p className="text-2xl font-bold text-slate-800">
            €{fatturato2026.toLocaleString('it-IT')}
          </p>
        </div>
      </div>
    </div>
  );
}
