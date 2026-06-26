import { useState, useEffect } from 'react';
import { Client, Prova, Pacchetto, Preventivo, Reagente, ReagenteRitirato, AccettazioneCampione, Operator, PraticaFatturazione, AuditLog } from './types';
import {
  isSupabaseConfigured,
  supabase,
  fetchClientsFromSupabase,
  insertClientToSupabase,
  updateClientInSupabase,
  deleteClientFromSupabase,
  fetchProveFromSupabase,
  insertProvaToSupabase,
  updateProvaInSupabase,
  deleteProvaFromSupabase,
  fetchPacchettiFromSupabase,
  insertPacchettoToSupabase,
  updatePacchettoInSupabase,
  deletePacchettoFromSupabase,
  fetchPreventiviFromSupabase,
  insertPreventivoToSupabase,
  updatePreventivoInSupabase,
  deletePreventivoFromSupabase,
  fetchReagentiFromSupabase,
  insertReagenteToSupabase,
  updateReagenteInSupabase,
  deleteReagenteFromSupabase,
  fetchReagentiRitiratiFromSupabase,
  insertReagenteRitiratoToSupabase,
  deleteReagenteRitiratoFromSupabase,
  updateReagenteRitiratoInSupabase,
  fetchAccettazioniFromSupabase,
  insertAccettazioneToSupabase,
  updateAccettazioneInSupabase,
  deleteAccettazioneFromSupabase,
  fetchOperatorsFromSupabase,
  insertOperatorToSupabase,
  updateOperatorInSupabase,
  deleteOperatorFromSupabase,
  fetchPraticheFromSupabase,
  insertPraticaToSupabase,
  updatePraticaInSupabase,
  deletePraticaFromSupabase,
  fetchAuditLogsFromSupabase,
  insertAuditLogToSupabase,
  syncAllLocalDataToSupabase,
  formatSupabaseError
} from './utils/supabaseClient';
import {
  INITIAL_CLIENTS,
  INITIAL_PROVE,
  INITIAL_PACCHETTI,
  INITIAL_PREVENTIVI,
  INITIAL_REAGENTI,
  INITIAL_REAGENTI_RITIRATI,
  INITIAL_ACCETTAZIONI,
  INITIAL_OPERATORS,
  INITIAL_PRATICHE_FATTURAZIONE,
  INITIAL_AUDIT_LOGS
} from './mockData';

import { ClientiSection } from './components/ClientiSection';
import { ProveSection } from './components/ProveSection';
import { PreventiviSection } from './components/PreventiviSection';
import { ReagentarioSection } from './components/ReagentarioSection';
import { AccettazioneSection } from './components/AccettazioneSection';
import { FatturazioneSection } from './components/FatturazioneSection';
import { StatisticheSection } from './components/StatisticheSection';
import { OperatoriSection } from './components/OperatoriSection';
import { LoginModal } from './components/LoginModal';
import { DatabaseErrorModal } from './components/DatabaseErrorModal';

import { 
  Users, 
  FlaskConical, 
  FileSpreadsheet, 
  Archive, 
  LayoutDashboard, 
  Database,
  ArrowRight,
  Sparkles,
  ChevronRight,
  TrendingUp,
  FolderDot,
  FileText,
  BarChart3,
  KeyRound,
  Receipt,
  History,
  FolderSync,
  ShieldAlert,
  CheckCircle
} from 'lucide-react';

export default function App() {
  // Caricamento stati con persistenza localStorage
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('lab_clients');
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  });

  const [supabaseStatus, setSupabaseStatus] = useState<'idle' | 'loading' | 'connected' | 'error' | 'not_configured'>('idle');
  const [supabaseErrorMsg, setSupabaseErrorMsg] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'utente' | null>(null);
  const [actualRole, setActualRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);

  const fetchUserRole = async () => {
    if (!supabase) return;
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.log("Nessun utente loggato o errore nel recupero dell'utente:", userError);
        setUserRole(null);
        setActualRole(null);
        setCurrentUser(null);
        return;
      }
      setCurrentUser(user);

      // Definiamo un fallback nel caso in cui la tabella 'profili' non sia accessibile (es. per errori di policy RLS)
      let roleStr = 'ADMIN'; // Default di fallback per non bloccare l'utente autenticato durante lo sviluppo
      
      try {
        let { data, error } = await supabase
          .from('profili')
          .select('ruolo')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          console.log("Profilo non trovato o errore. Tento la creazione automatica come ADMIN...", error);
          // Creazione automatica del profilo come ADMIN per consentire al proprietario/testatore di operare da subito
          const defaultProfile = {
            id: user.id,
            email: user.email,
            nome: user.email?.split('@')[0] || 'Operatore',
            ruolo: 'ADMIN'
          };
          
          const { data: upsertData, error: upsertError } = await supabase
            .from('profili')
            .upsert([defaultProfile])
            .select('ruolo')
            .single();

          if (upsertError) {
            console.error("Errore durante la creazione automatica del profilo in 'profili':", upsertError);
          } else if (upsertData) {
            console.log("Profilo ADMIN creato con successo!");
            data = upsertData;
          }
        }

        if (data && data.ruolo) {
          roleStr = (data.ruolo || '').toString().trim().toUpperCase();
        }
      } catch (profileErr) {
        console.warn("Errore non fatale durante il recupero del ruolo da 'profili' (potrebbero esserci policy RLS attive). Uso fallback ADMIN:", profileErr);
      }

      setActualRole(roleStr);
      if (['ADMIN', 'AM', 'RT', 'VRT'].includes(roleStr)) {
        setUserRole('admin');
      } else {
        setUserRole('utente');
      }
    } catch (err) {
      console.error("Errore imprevisto in fetchUserRole:", err);
    }
  };

  const handleLogout = async () => {
    if (!supabase) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setCurrentUser(null);
      setUserRole(null);
      setActualRole(null);
      alert("Disconnessione effettuata con successo!");
    } catch (err: any) {
      console.error("Errore durante il logout:", err);
      alert(`Errore durante il logout: ${err.message}`);
    }
  };

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        fetchUserRole();
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setActualRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const initSupabase = async () => {
      if (!isSupabaseConfigured) {
        setSupabaseStatus('not_configured');
        return;
      }
      setSupabaseStatus('loading');
      
      const failedTables: string[] = [];
      const errorMsgs: string[] = [];

      let fetchedClientsList: Client[] = [];
      // Test connect with clients first
      try {
        fetchedClientsList = await fetchClientsFromSupabase();
      } catch (err: any) {
        console.error('Error fetching clients:', err);
        failedTables.push('clienti');
        errorMsgs.push(`clienti: ${err.message || String(err)}`);
      }

      // If clients loaded successfully, check if the database is completely brand new (0 clients)
      // and perform auto-migration so that their local database is automatically streamed to Supabase.
      if (failedTables.length === 0) {
        const hasMigrated = localStorage.getItem('lab_supabase_migrated') === 'true';
        if (fetchedClientsList.length === 0 && !hasMigrated) {
          try {
            console.log("Supabase is connected but empty. Performing auto-migration of local/default data to Supabase...");
            await syncAllLocalDataToSupabase(
              clients,
              prove,
              pacchetti,
              preventivi,
              reagenti,
              reagentiRitirati,
              accettazioni,
              operators,
              praticheFatturazione,
              auditLogs
            );
            localStorage.setItem('lab_supabase_migrated', 'true');
            console.log("Auto-migration complete. Re-fetching clients...");
            fetchedClientsList = await fetchClientsFromSupabase();
          } catch (syncErr: any) {
            console.error("Auto-migration during startup failed:", syncErr);
          }
        } else {
          localStorage.setItem('lab_supabase_migrated', 'true');
        }
      }

      // 1. Set Clienti
      if (failedTables.indexOf('clienti') === -1) {
        setClients(fetchedClientsList);
        localStorage.setItem('lab_clients', JSON.stringify(fetchedClientsList));
      }

      // 2. Fetch Prove
      try {
        const fetched = await fetchProveFromSupabase();
        setProve(fetched);
        localStorage.setItem('lab_prove', JSON.stringify(fetched));
      } catch (err: any) {
        console.error('Error fetching prove:', err);
        failedTables.push('prove');
        errorMsgs.push(`prove: ${err.message || String(err)}`);
      }

      // 3. Fetch Pacchetti
      try {
        const fetched = await fetchPacchettiFromSupabase();
        setPacchetti(fetched);
        localStorage.setItem('lab_pacchetti', JSON.stringify(fetched));
      } catch (err: any) {
        console.error('Error fetching pacchetti:', err);
        failedTables.push('pacchetti');
        errorMsgs.push(`pacchetti: ${err.message || String(err)}`);
      }

      // 4. Fetch Preventivi
      try {
        const fetched = await fetchPreventiviFromSupabase();
        setPreventivi(fetched);
        localStorage.setItem('lab_preventivi', JSON.stringify(fetched));
      } catch (err: any) {
        console.error('Error fetching preventivi:', err);
        failedTables.push('preventivi');
        errorMsgs.push(`preventivi: ${err.message || String(err)}`);
      }

      // 5. Fetch Reagenti
      try {
        const fetched = await fetchReagentiFromSupabase();
        setReagenti(fetched);
        localStorage.setItem('lab_reagenti', JSON.stringify(fetched));
      } catch (err: any) {
        console.error('Error fetching reagenti:', err);
        failedTables.push('reagenti');
        errorMsgs.push(`reagenti: ${err.message || String(err)}`);
      }

      // 6. Fetch Reagenti Ritirati
      try {
        const fetched = await fetchReagentiRitiratiFromSupabase();
        setReagentiRitirati(fetched);
        localStorage.setItem('lab_reagenti_ritirati', JSON.stringify(fetched));
      } catch (err: any) {
        console.error('Error fetching reagenti_ritirati:', err);
        failedTables.push('reagenti_ritirati');
        errorMsgs.push(`reagenti_ritirati: ${err.message || String(err)}`);
      }

      // 7. Fetch Accettazioni
      try {
        const fetched = await fetchAccettazioniFromSupabase();
        setAccettazioni(fetched);
        localStorage.setItem('lab_accettazioni', JSON.stringify(fetched));
      } catch (err: any) {
        console.error('Error fetching accettazioni:', err);
        failedTables.push('accettazioni');
        errorMsgs.push(`accettazioni: ${err.message || String(err)}`);
      }

      // 8. Fetch Operatori
      try {
        const fetched = await fetchOperatorsFromSupabase();
        const filtered = fetched.filter(op => !op.nome.toLowerCase().includes('valerio') && !op.nome.toLowerCase().includes('tempesta'));
        setOperators(filtered);
        localStorage.setItem('lab_operators', JSON.stringify(filtered));
      } catch (err: any) {
        console.error('Error fetching operatori:', err);
        failedTables.push('operatori');
        errorMsgs.push(`operatori: ${err.message || String(err)}`);
      }

      // 9. Fetch Pratiche Fatturazione
      try {
        const fetched = await fetchPraticheFromSupabase();
        setPraticheFatturazione(fetched);
        localStorage.setItem('lab_pratiche_fatturazione', JSON.stringify(fetched));
      } catch (err: any) {
        console.error('Error fetching pratiche_fatturazione:', err);
        failedTables.push('pratiche_fatturazione');
        errorMsgs.push(`pratiche_fatturazione: ${err.message || String(err)}`);
      }

      // 10. Fetch Audit Logs
      try {
        const fetched = await fetchAuditLogsFromSupabase();
        setAuditLogs(fetched);
        localStorage.setItem('lab_audit_logs', JSON.stringify(fetched));
      } catch (err: any) {
        console.error('Error fetching audit_logs:', err);
        failedTables.push('audit_logs');
        errorMsgs.push(`audit_logs: ${err.message || String(err)}`);
      }

      if (failedTables.length === 0) {
        setSupabaseStatus('connected');
        setSupabaseErrorMsg(null);
        await fetchUserRole();
      } else {
        setSupabaseStatus('error');
        setSupabaseErrorMsg(`Impossibile connettere alcune tabelle:\n` + errorMsgs.join('\n'));
      }
    };
    initSupabase();
  }, []);

  const [prove, setProve] = useState<Prova[]>(() => {
    const saved = localStorage.getItem('lab_prove');
    return saved ? JSON.parse(saved) : INITIAL_PROVE;
  });

  const [pacchetti, setPacchetti] = useState<Pacchetto[]>(() => {
    const saved = localStorage.getItem('lab_pacchetti');
    return saved ? JSON.parse(saved) : INITIAL_PACCHETTI;
  });

  const [preventivi, setPreventivi] = useState<Preventivo[]>(() => {
    const saved = localStorage.getItem('lab_preventivi');
    return saved ? JSON.parse(saved) : INITIAL_PREVENTIVI;
  });

  const [reagenti, setReagenti] = useState<Reagente[]>(() => {
    const saved = localStorage.getItem('lab_reagenti');
    return saved ? JSON.parse(saved) : INITIAL_REAGENTI;
  });

  const [reagentiRitirati, setReagentiRitirati] = useState<ReagenteRitirato[]>(() => {
    const saved = localStorage.getItem('lab_reagenti_ritirati');
    return saved ? JSON.parse(saved) : INITIAL_REAGENTI_RITIRATI;
  });

  const [accettazioni, setAccettazioni] = useState<AccettazioneCampione[]>(() => {
    const saved = localStorage.getItem('lab_accettazioni');
    return saved ? JSON.parse(saved) : INITIAL_ACCETTAZIONI;
  });

  const [operators, setOperators] = useState<Operator[]>(() => {
    const saved = localStorage.getItem('lab_operators');
    const parsed: Operator[] = saved ? JSON.parse(saved) : INITIAL_OPERATORS;
    return parsed.filter(op => !op.nome.toLowerCase().includes('valerio') && !op.nome.toLowerCase().includes('tempesta'));
  });

  const [praticheFatturazione, setPraticheFatturazione] = useState<PraticaFatturazione[]>(() => {
    const saved = localStorage.getItem('lab_pratiche_fatturazione');
    return saved ? JSON.parse(saved) : INITIAL_PRATICHE_FATTURAZIONE;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('lab_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  // Salva i dati localmente al variare degli stati
  useEffect(() => {
    localStorage.setItem('lab_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('lab_prove', JSON.stringify(prove));
  }, [prove]);

  useEffect(() => {
    localStorage.setItem('lab_pacchetti', JSON.stringify(pacchetti));
  }, [pacchetti]);

  useEffect(() => {
    localStorage.setItem('lab_preventivi', JSON.stringify(preventivi));
  }, [preventivi]);

  useEffect(() => {
    localStorage.setItem('lab_reagenti', JSON.stringify(reagenti));
  }, [reagenti]);

  useEffect(() => {
    localStorage.setItem('lab_reagenti_ritirati', JSON.stringify(reagentiRitirati));
  }, [reagentiRitirati]);

  useEffect(() => {
    localStorage.setItem('lab_accettazioni', JSON.stringify(accettazioni));
  }, [accettazioni]);

  useEffect(() => {
    localStorage.setItem('lab_operators', JSON.stringify(operators));
  }, [operators]);

  useEffect(() => {
    localStorage.setItem('lab_pratiche_fatturazione', JSON.stringify(praticheFatturazione));
  }, [praticheFatturazione]);

  useEffect(() => {
    localStorage.setItem('lab_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Gestione dei Pannelli attivi: 'dashboard' | 'clienti' | 'prove' | 'preventivi' | 'reagentario'
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedProvaId, setSelectedProvaId] = useState<string | null>(null);
  const [selectedPreventivoId, setSelectedPreventivoId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);

  // Gestione delle revisioni dei Rapporti Di Prova (RDP)
  const [revisioneSelectedAccId, setRevisioneSelectedAccId] = useState<string>('');
  const [revisioneMotivoInput, setRevisioneMotivoInput] = useState<string>('');
  const [revisioneOperatore, setRevisioneOperatore] = useState<string>('');
  const [revisioneSuccessMessage, setRevisioneSuccessMessage] = useState<string | null>(null);

  const handleGoToProva = (id: string) => {
    setSelectedProvaId(id);
    setActiveTab('prove');
  };

  const handleGoToPreventivo = (id: string) => {
    setSelectedPreventivoId(id);
    setActiveTab('preventivi');
  };

  // HANDLERS CLIENTS
  const handleAddClient = async (newClient: Client) => {
    setClients(prev => {
      const idx = prev.findIndex(c => c.id === newClient.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = newClient;
        return copy;
      }
      return [...prev, newClient];
    });

    if (isSupabaseConfigured) {
      try {
        await insertClientToSupabase(newClient);
      } catch (error: any) {
        console.error('Error writing client to Supabase:', error);
        alert(`Errore di salvataggio su Supabase:\n${formatSupabaseError(error)}`);
      }
    }
  };

  const handleDeleteClient = async (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));

    if (isSupabaseConfigured) {
      try {
        await deleteClientFromSupabase(id);
      } catch (error: any) {
        console.error('Error deleting client from Supabase:', error);
        alert(`Errore di cancellazione su Supabase:\n${formatSupabaseError(error)}`);
      }
    }
  };

  const handleUpdateClient = async (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));

    if (isSupabaseConfigured) {
      try {
        await updateClientInSupabase(updatedClient);
      } catch (error: any) {
        console.error('Error updating client in Supabase:', error);
        alert(`Errore di modifica su Supabase:\n${formatSupabaseError(error)}`);
      }
    }
  };

  // HANDLERS PROVE
  const handleAddProva = async (newProva: Prova) => {
    setProve(prev => [...prev, newProva]);
    if (isSupabaseConfigured) {
      try {
        await insertProvaToSupabase(newProva);
      } catch (error: any) {
        console.error('Error writing prova to Supabase:', error);
        alert(`Errore di salvataggio "Prova" su Supabase:\n${formatSupabaseError(error)}`);
      }
    }
  };

  const handleDeleteProva = async (id: string) => {
    setProve(prev => prev.filter(p => p.id !== id));
    if (isSupabaseConfigured) {
      try {
        await deleteProvaFromSupabase(id);
      } catch (error: any) {
        console.error('Error deleting prova from Supabase:', error);
        alert(`Errore di cancellazione "Prova" su Supabase:\n${formatSupabaseError(error)}`);
      }
    }
  };

  const handleUpdateProva = async (updatedProva: Prova) => {
    setProve(prev => prev.map(p => p.id === updatedProva.id ? updatedProva : p));
    if (isSupabaseConfigured) {
      try {
        await updateProvaInSupabase(updatedProva);
      } catch (error: any) {
        console.error('Error updating prova in Supabase:', error);
        alert(`Errore di modifica "Prova" su Supabase:\n${formatSupabaseError(error)}`);
      }
    }
  };

  // HANDLERS PACCHETTI E PREVENTIVI
  const handleAddPreventivo = async (newPrev: Preventivo) => {
    setPreventivi(prev => {
      const idx = prev.findIndex(p => p.id === newPrev.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = newPrev;
        return copy;
      }
      return [...prev, newPrev];
    });
    if (isSupabaseConfigured) {
      try {
        await updatePreventivoInSupabase(newPrev);
      } catch (e: any) {
        try {
          await insertPreventivoToSupabase(newPrev);
        } catch (err: any) {
          console.error('Error writing preventivo to Supabase:', err);
          alert(`Errore di salvataggio "Preventivo" su Supabase:\n${formatSupabaseError(err)}`);
        }
      }
    }
  };

  const handleAddPacchetto = async (newPack: Pacchetto) => {
    setPacchetti(prev => [...prev, newPack]);
    if (isSupabaseConfigured) {
      try {
        await insertPacchettoToSupabase(newPack);
      } catch (error: any) {
        console.error('Error writing pacchetto to Supabase:', error);
        alert(`Errore di creazione "Pacchetto" su Supabase:\n${formatSupabaseError(error)}`);
      }
    }
  };

  const handleUpdatePacchetto = async (updatedPack: Pacchetto) => {
    setPacchetti(prev => prev.map(p => p.id === updatedPack.id ? updatedPack : p));
    if (isSupabaseConfigured) {
      try {
        await updatePacchettoInSupabase(updatedPack);
      } catch (error: any) {
        console.error('Error updating pacchetto in Supabase:', error);
        alert(`Errore di modifica "Pacchetto" su Supabase:\n${formatSupabaseError(error)}`);
      }
    }
  };

  const handleDeletePreventivo = async (id: string) => {
    setPreventivi(prev => prev.filter(p => p.id !== id));
    if (isSupabaseConfigured) {
      try {
        await deletePreventivoFromSupabase(id);
      } catch (error: any) {
        console.error('Error deleting preventivo from Supabase:', error);
        alert(`Errore di rimozione "Preventivo" su Supabase:\n${formatSupabaseError(error)}`);
      }
    }
  };

  const handleDeletePacchetto = async (id: string) => {
    setPacchetti(prev => prev.filter(p => p.id !== id));
    if (isSupabaseConfigured) {
      try {
        await deletePacchettoFromSupabase(id);
      } catch (error: any) {
        console.error('Error deleting pacchetto from Supabase:', error);
        alert(`Errore di rimozione "Pacchetto" su Supabase:\n${formatSupabaseError(error)}`);
      }
    }
  };

  // HANDLERS REAGENTI
  const handleAddReagente = async (newReag: Reagente) => {
    setReagenti(prev => [...prev, newReag]);
    if (isSupabaseConfigured) {
      try {
        await insertReagenteToSupabase(newReag);
      } catch (error: any) {
        console.error('Error writing reagente to Supabase:', error);
        alert(`Errore di creazione "Reagente" su Supabase:\n${formatSupabaseError(error)}`);
      }
    }
  };

  const handleDeleteReagente = async (id: string) => {
    setReagenti(prev => prev.filter(r => r.id !== id));
    if (isSupabaseConfigured) {
      try {
        await deleteReagenteFromSupabase(id);
      } catch (error: any) {
        console.error('Error deleting reagente from Supabase:', error);
        alert(`Errore di rimozione "Reagente" su Supabase:\n${formatSupabaseError(error)}`);
      }
    }
  };

  const handleUpdateReagente = async (updatedReag: Reagente) => {
    setReagenti(prev => prev.map(r => r.id === updatedReag.id ? updatedReag : r));
    if (isSupabaseConfigured) {
      try {
        await updateReagenteInSupabase(updatedReag);
      } catch (error: any) {
        console.error('Error updating reagente in Supabase:', error);
        alert(`Errore di modifica "Reagente" su Supabase:\n${formatSupabaseError(error)}`);
      }
    }
  };

  // HANDLERS AUDIT SYSTEM LOGS
  const handleAddAuditLogEntry = async (
    utente: string,
    sezione: string,
    campo: string,
    valorePrecedente: string,
    valoreNuovo: string
  ) => {
    const now = new Date();
    const formattedDate = now.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + Math.random().toString(36).substring(2, 7),
      dataOra: formattedDate,
      utente: utente || 'Sistema',
      sezione: sezione,
      campo: campo,
      valorePrecedente: valorePrecedente || '-',
      valoreNuovo: valoreNuovo || '-'
    };

    setAuditLogs(prev => [newLog, ...prev]);

    if (isSupabaseConfigured) {
      try {
        await insertAuditLogToSupabase(newLog);
      } catch (error: any) {
        console.error('Error writing audit log to Supabase:', error);
      }
    }
  };

  // HANDLERS ACCETTAZIONE
  const handleAddAccettazione = async (newAcc: AccettazioneCampione) => {
    setAccettazioni(prev => [...prev, newAcc]);

    // Create billing practice automatically
    const client = clients.find(c => c.id === newAcc.destinatarioFatturaClienteId);
    const preventivo = preventivi.find(p => p.id === newAcc.preventivoAssociatoId);

    const newPratica: PraticaFatturazione = {
      id: 'prat_' + Date.now(),
      numeroCampione: newAcc.codiceAccettazione,
      clienteId: newAcc.destinatarioFatturaClienteId,
      nomeCliente: client ? client.denominazione : 'Cliente Sconosciuto',
      partitaIva: client ? client.partitaIva : '',
      numeroPreventivo: preventivo ? preventivo.codice : 'Senza Preventivo',
      dataAccettazione: newAcc.dataAccettazione,
      importo: preventivo ? preventivo.totale : 0,
      statoFatturazione: 'Da fatturare',
      numeroFattura: '',
      dataFattura: '',
      note: newAcc.noteLab || ''
    };

    setPraticheFatturazione(prev => [...prev, newPratica]);

    if (isSupabaseConfigured) {
      try {
        await insertAccettazioneToSupabase(newAcc);
      } catch (error: any) {
        console.error('Error writing accettazione to Supabase:', error);
        alert(`Errore di salvataggio "Accettazione" su Supabase:\n${formatSupabaseError(error)}`);
      }
      try {
        await insertPraticaToSupabase(newPratica);
      } catch (error: any) {
        console.error('Error writing practice to Supabase:', error);
        alert(`Errore di salvataggio "Pratica Fatturazione" su Supabase:\n${formatSupabaseError(error)}`);
      }
    }

    // Audit Log Entry
    handleAddAuditLogEntry(
      newAcc.operatorRegistrazione || 'Sistema',
      'Accettazione',
      'Creazione Campione',
      '-',
      `Campione ${newAcc.codiceAccettazione} registrato e inviato a fatturazione`
    );
  };

  const handleDeleteAccettazione = async (id: string) => {
    const target = accettazioni.find(a => a.id === id);
    setAccettazioni(prev => prev.filter(a => a.id !== id));
    if (target) {
      setPraticheFatturazione(prev => prev.filter(p => p.numeroCampione !== target.codiceAccettazione));
      
      if (isSupabaseConfigured) {
        try {
          await deleteAccettazioneFromSupabase(id);
        } catch (error: any) {
          console.error('Error deleting accettazione from Supabase:', error);
          alert(`Errore di eliminazione "Accettazione" su Supabase:\n${formatSupabaseError(error)}`);
        }
        try {
          const practice = praticheFatturazione.find(p => p.numeroCampione === target.codiceAccettazione);
          if (practice) {
            await deletePraticaFromSupabase(practice.id);
          }
        } catch (error: any) {
          console.error('Error deleting practice from Supabase:', error);
          alert(`Errore di eliminazione "Pratica" su Supabase:\n${formatSupabaseError(error)}`);
        }
      }

      handleAddAuditLogEntry(
        'Sistema',
        'Accettazione',
        'Eliminazione Campione',
        target.codiceAccettazione,
        'Eliminato dal sistema'
      );
    }
  };

  const handleUpdateAccettazione = async (updatedAcc: AccettazioneCampione) => {
    const oldAcc = accettazioni.find(a => a.id === updatedAcc.id);
    setAccettazioni(prev => prev.map(a => a.id === updatedAcc.id ? updatedAcc : a));

    // Update or insert a practice
    let resolvedPractice: PraticaFatturazione | null = null;

    setPraticheFatturazione(prev => {
      const idx = prev.findIndex(p => p.numeroCampione === updatedAcc.codiceAccettazione);
      const client = clients.find(c => c.id === updatedAcc.destinatarioFatturaClienteId);
      const preventivo = preventivi.find(p => p.id === updatedAcc.preventivoAssociatoId);

      const fieldsToUpdate = {
        clienteId: updatedAcc.destinatarioFatturaClienteId,
        nomeCliente: client ? client.denominazione : 'Cliente Sconosciuto',
        partitaIva: client ? client.partitaIva : '',
        numeroPreventivo: preventivo ? preventivo.codice : 'Senza Preventivo',
        dataAccettazione: updatedAcc.dataAccettazione,
        importo: preventivo ? preventivo.totale : 0,
        note: updatedAcc.noteLab || ''
      };

      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          ...fieldsToUpdate
        };
        resolvedPractice = copy[idx];
        return copy;
      } else {
        const newPratica: PraticaFatturazione = {
          id: 'prat_' + Date.now(),
          numeroCampione: updatedAcc.codiceAccettazione,
          statoFatturazione: 'Da fatturare',
          numeroFattura: '',
          dataFattura: '',
          ...fieldsToUpdate
        };
        resolvedPractice = newPratica;
        return [...prev, newPratica];
      }
    });

    if (isSupabaseConfigured) {
      try {
        await updateAccettazioneInSupabase(updatedAcc);
      } catch (error: any) {
        console.error('Error updating accettazione on Supabase:', error);
        alert(`Errore di aggiornamento "Accettazione" su Supabase:\n${formatSupabaseError(error)}`);
      }
      if (resolvedPractice) {
        const p: PraticaFatturazione = resolvedPractice;
        try {
          await updatePraticaInSupabase(p);
        } catch (e) {
          try {
            await insertPraticaToSupabase(p);
          } catch (err: any) {
            console.error('Error writing practice to Supabase:', err);
            alert(`Errore di salvataggio "Pratica Fatturazione" su Supabase:\n${formatSupabaseError(err)}`);
          }
        }
      }
    }

    // Check if status changed to log it
    if (oldAcc && oldAcc.analisiStato !== updatedAcc.analisiStato) {
      handleAddAuditLogEntry(
        updatedAcc.operatorRegistrazione || 'Sistema',
        'Accettazione',
        'Stato analisi',
        oldAcc.analisiStato,
        updatedAcc.analisiStato
      );
    } else {
      handleAddAuditLogEntry(
        updatedAcc.operatorRegistrazione || 'Sistema',
        'Accettazione',
        'Modifica Campione',
        `Campione ${updatedAcc.codiceAccettazione} modificato`,
        `Dati campione ${updatedAcc.codiceAccettazione} aggiornati`
      );
    }
  };

  const handleEmitNewRevision = (accettazioneId: string, motivo: string, operatore: string) => {
    const acc = accettazioni.find(a => a.id === accettazioneId);
    if (!acc) return;

    const numeroRevisioneCorrente = acc.revisioneCorrente || 0;
    const nuovaRevisioneNumero = numeroRevisioneCorrente + 1;

    // 1. Creiamo lo snapshot dei dati correnti al fine di storicizzarli
    const snapshot: any = {
      id: `rev-${acc.id}-${Date.now()}`,
      numeroRevisione: numeroRevisioneCorrente,
      dataOraEmissione: acc.dataRevisione || acc.dataTermineProva || acc.dataAccettazione,
      operatoreEmissione: acc.firmatarioTecnico || operatore || 'Dott. Chim. F. Lupo',
      motivoRevisione: acc.revisioneMotivo || 'Emissione Originale (Rev. 00)',
      
      descrizioneCampione: acc.descrizioneCampione,
      matrice: acc.matrice,
      quantitaCampione: acc.quantitaCampione,
      temperaturaArrivo: acc.temperaturaArrivo,
      statoInArrivo: acc.statoInArrivo,
      dataPrelievo: acc.dataPrelievo,
      oraPrelievo: acc.oraPrelievo,
      puntoPrelievo: acc.puntoPrelievo,
      dataInizioProva: acc.dataInizioProva,
      dataTermineProva: acc.dataTermineProva,
      risultatiAnalisi: acc.risultatiAnalisi ? JSON.parse(JSON.stringify(acc.risultatiAnalisi)) : [],
      dichiarazioneConformita: acc.dichiarazioneConformita || '',
      opinioniInterpretazioni: acc.opinioniInterpretazioni || '',
      nota1: acc.nota1 || '',
      nota2: acc.nota2 || '',
      firmatarioTecnico: acc.firmatarioTecnico || '',
      ruoloFirmatarioTecnico: acc.ruoloFirmatarioTecnico || '',
    };

    // 2. Prepariamo lo storico aggiornato
    const storicoAggiornato = acc.storicoRevisioni ? [...acc.storicoRevisioni, snapshot] : [snapshot];

    // 3. Creiamo l'oggetto aggiornato con la nuova versione incrementata, pronta per essere corretta
    const accAggiornata: AccettazioneCampione = {
      ...acc,
      revisioneCorrente: nuovaRevisioneNumero,
      revisioneMotivo: motivo,
      dataRevisione: new Date().toLocaleDateString('it-IT') + ' ore ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      storicoRevisioni: storicoAggiornato,
      // Lo stato rimane Completato per stampare i dati correnti, ma sblocca l'edit dei dati
    };

    // 4. Salviamo l'accettazione e generiamo un log di audit
    handleUpdateAccettazione(accAggiornata);

    handleAddAuditLogEntry(
      operatore || 'Responsabile Tecnico',
      'Accettazione',
      'Emissione Revisione RDP',
      `Rev. ${String(numeroRevisioneCorrente).padStart(2, '0')}`,
      `Generata nuova Rev. ${String(nuovaRevisioneNumero).padStart(2, '0')} per Rapporto ${acc.codiceAccettazione}. Motivo: ${motivo}`
    );
  };

  const handleUpdateOperators = async (newOperators: Operator[] | ((prev: Operator[]) => Operator[])) => {
    let resolved: Operator[];
    if (typeof newOperators === 'function') {
      resolved = newOperators(operators);
    } else {
      resolved = newOperators;
    }
    
    const deletedOps = operators.filter(oldOp => !resolved.some(newOp => newOp.nome === oldOp.nome));
    setOperators(resolved);

    if (isSupabaseConfigured) {
      for (const op of deletedOps) {
        try {
          await deleteOperatorFromSupabase(op.nome);
        } catch (err) {
          console.error('Error deleting operator from Supabase:', err);
        }
      }
      for (const op of resolved) {
        try {
          await updateOperatorInSupabase(op);
        } catch (e) {
          try {
            await insertOperatorToSupabase(op);
          } catch (err) {
            console.error('Error writing operator to Supabase:', err);
          }
        }
      }
    }
  };

  const handleUpdateReagentiRitirati = async (newValue: ReagenteRitirato[] | ((prev: ReagenteRitirato[]) => ReagenteRitirato[])) => {
    let resolved: ReagenteRitirato[];
    if (typeof newValue === 'function') {
      resolved = newValue(reagentiRitirati);
    } else {
      resolved = newValue;
    }

    const deleted = reagentiRitirati.filter(old => !resolved.some(current => current.id === old.id));
    setReagentiRitirati(resolved);

    if (isSupabaseConfigured) {
      for (const rr of deleted) {
        try {
          await deleteReagenteRitiratoFromSupabase(rr.id);
        } catch (err) {
          console.error('Error deleting retired reagent from Supabase:', err);
        }
      }
      for (const rr of resolved) {
        try {
          await updateReagenteRitiratoInSupabase(rr);
        } catch (e) {
          try {
            await insertReagenteRitiratoToSupabase(rr);
          } catch (err) {
            console.error('Error writing retired reagent to Supabase:', err);
          }
        }
      }
    }
  };

  const handleSyncLocalData = async () => {
    if (!isSupabaseConfigured) {
      alert("Errore: Supabase non è configurato. Controlla le tue credenziali.");
      return;
    }
    try {
      await syncAllLocalDataToSupabase(
        clients,
        prove,
        pacchetti,
        preventivi,
        reagenti,
        reagentiRitirati,
        accettazioni,
        operators,
        praticheFatturazione,
        auditLogs
      );
      alert("Sincronizzazione completata! Tutti i dati locali sono stati caricati o aggiornati su Supabase.");
    } catch (error: any) {
      console.error("Sync error:", error);
      alert(`Errore di sincronizzazione:\n${formatSupabaseError(error)}`);
    }
  };

  const handleUpdatePratiche = async (newPratiche: PraticaFatturazione[]) => {
    const deleted = praticheFatturazione.filter(old => !newPratiche.some(curr => curr.id === old.id));
    setPraticheFatturazione(newPratiche);

    if (isSupabaseConfigured) {
      for (const p of deleted) {
        try {
          await deletePraticaFromSupabase(p.id);
        } catch (err) {
          console.error('Error deleting practice from Supabase:', err);
        }
      }
      for (const p of newPratiche) {
        try {
          await updatePraticaInSupabase(p);
        } catch (e) {
          try {
            await insertPraticaToSupabase(p);
          } catch (err) {
            console.error('Error syncing practice to Supabase:', err);
          }
        }
      }
    }
  };

  // Svuota database e ripristina i dati iniziali
  const handleRestoreDefaults = () => {
    setClients(INITIAL_CLIENTS);
    setProve(INITIAL_PROVE);
    setPacchetti(INITIAL_PACCHETTI);
    setPreventivi(INITIAL_PREVENTIVI);
    setReagenti(INITIAL_REAGENTI);
    setAccettazioni(INITIAL_ACCETTAZIONI);
    setOperators(INITIAL_OPERATORS);
    setPraticheFatturazione(INITIAL_PRATICHE_FATTURAZIONE);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setActiveTab('dashboard');
    setShowRestoreModal(false);
  };

  // Calcolo statistiche veloci per la dashboard
  const totaleClienti = clients.length;
  
  let fatturatoTotale = 0;
  clients.forEach(c => {
    if (c.fatturatoAnnuo) {
      Object.entries(c.fatturatoAnnuo).forEach(([_, valore]) => {
        fatturatoTotale += Number(valore) || 0;
      });
    }
  });

  const fatturatoMedio = totaleClienti > 0 ? (fatturatoTotale / totaleClienti) : 0;

  // Calcolo delle Top Categorie basato sul numero di prove inserite
  const categoryCounts: Record<string, number> = {};
  prove.forEach(p => {
    const cat = p.categoria || 'Generale';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3); // top 3

  // Ultimi 3 clienti inseriti
  const latestClients = [...clients].slice(-3).reverse();

  // Reagenti in scadenza o scaduti (entro 30 giorni)
  const todayDate = new Date();
  const reagentsNearExpiry = [...reagenti]
    .map(r => {
      const expDate = new Date(r.dataScadenza);
      const timeDiff = expDate.getTime() - todayDate.getTime();
      const daysToExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));
      return {
        ...r,
        daysToExpiry,
        scaduto: daysToExpiry <= 0,
        inScadenza: daysToExpiry > 0 && daysToExpiry <= 30
      };
    })
    .filter(r => r.scaduto || r.inScadenza)
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry)
    .slice(0, 3); // top 3 per visualizzazione compatta in dashboard

  return (
    <div className="min-h-screen bg-slate-100/40 text-slate-700 font-sans flex flex-col lg:flex-row antialiased">
      
      {/* SIDEBAR NAVIGATION (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 sticky top-0 h-screen shrink-0 justify-between overflow-y-auto pb-6">
        <div className="flex flex-col p-6 space-y-8">
          
          {/* Brand/Logo Layout */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xl font-serif italic font-extrabold tracking-tight text-slate-900">LUPO 2.0</span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-600 block leading-none mt-0.5">LabMerceologico</span>
            </div>
          </div>

          {/* Sidebar Tabs */}
          <nav className="space-y-1.5" id="sidebar-links">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>

            <button
              onClick={() => setActiveTab('clienti')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'clienti'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-clienti"
            >
              <Users className="h-4 w-4" />
              Clienti
            </button>

            <button
              onClick={() => setActiveTab('prove')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'prove'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-prove"
            >
              <FlaskConical className="h-4 w-4" />
              Prove
            </button>

            <button
              onClick={() => setActiveTab('preventivi')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'preventivi'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-preventivi"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Preventivi
            </button>

            <button
              onClick={() => setActiveTab('accettazione')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'accettazione'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-accettazione"
            >
              <FileText className="h-4 w-4" />
              Accettazione Campioni
            </button>

            <button
              onClick={() => setActiveTab('fatturazione')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'fatturazione'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-fatturazione"
            >
              <Receipt className="h-4 w-4" />
              Fatturazione
            </button>

            <button
              onClick={() => setActiveTab('reagentario')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'reagentario'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-reagentario"
            >
              <Archive className="h-4 w-4" />
              Reagentario
            </button>

            {actualRole !== 'AM' && (
              <button
                onClick={() => setActiveTab('operatori')}
                className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                  activeTab === 'operatori'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                }`}
                id="sidebar-operatori"
              >
                <KeyRound className="h-4 w-4" />
                Gestione Operatori / Ruoli
              </button>
            )}

            <button
              onClick={() => setActiveTab('statistiche')}
              className={`w-full px-4 py-3 rounded-xl text-xs font-bold transition flex items-center gap-3 cursor-pointer ${
                activeTab === 'statistiche'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
              }`}
              id="sidebar-statistiche"
            >
              <BarChart3 className="h-4 w-4" />
              Statistiche & Report
            </button>
          </nav>
        </div>

        {/* Unified Status & Auth Control Center */}
        <div className="mx-6 bg-slate-50 border border-slate-205 rounded-2xl divide-y divide-slate-150 overflow-hidden shadow-2xs">
          {/* Section A: Database Supabase */}
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-450 flex items-center gap-1.5">
                <Database className="h-3 w-3 text-emerald-600" /> Database Supabase
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${
                  supabaseStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                  supabaseStatus === 'loading' ? 'bg-amber-500 animate-pulse' :
                  supabaseStatus === 'error' ? 'bg-rose-500' :
                  'bg-slate-300'
                }`} />
                <span className="text-[9.5px] font-black uppercase text-slate-800">
                  {supabaseStatus === 'connected' ? 'Attivo' :
                   supabaseStatus === 'loading' ? 'Connessione...' :
                   supabaseStatus === 'error' ? 'Errore' :
                   'Non Attivo'}
                </span>
              </div>
            </div>

            {supabaseStatus === 'connected' ? (
              <div className="space-y-2">
                <p className="text-[9px] text-slate-500 leading-normal font-medium">
                  I tuoi dati sono sincronizzati in tempo reale con Supabase.
                </p>
                <button
                  onClick={handleSyncLocalData}
                  className="w-full text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <FolderSync className="h-3 w-3" /> Sincronizza Cloud
                </button>
              </div>
            ) : supabaseStatus === 'error' ? (
              <div className="space-y-1.5">
                <p className="text-[9px] text-rose-600 leading-normal font-semibold">
                  Errore di connessione. Tabelle o colonne mancanti.
                </p>
                <button
                  onClick={() => setShowErrorModal(true)}
                  className="w-full text-[9px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-1.5 px-2.5 rounded-lg border border-rose-200 uppercase tracking-wider transition cursor-pointer text-center"
                >
                  Dettaglio Errore
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[9px] text-slate-500 leading-normal">
                  Configura VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nel file .env.
                </p>
              </div>
            )}
          </div>

          {/* Section B: User Session */}
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-450 flex items-center gap-1.5">
                <KeyRound className="h-3 w-3 text-indigo-600" /> Sessione Utente
              </span>
              {currentUser ? (
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                  actualRole === 'AM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  userRole === 'admin' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 
                  'bg-blue-50 text-blue-850 border-blue-200'
                }`}>
                  {actualRole === 'AM' ? 'Amministrativo' :
                   userRole === 'admin' ? 'Amministratore' : 'Utente'}
                </span>
              ) : (
                <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-slate-250">
                  Ospite
                </span>
              )}
            </div>
            
            {currentUser ? (
              <div className="space-y-2">
                <div className="text-[10px] text-slate-700 font-semibold truncate bg-slate-100/60 p-1.5 rounded-lg border border-slate-200/50 flex items-center gap-1.5" title={currentUser.email}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 animate-ping" />
                  <span className="truncate">{currentUser.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-[9px] bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 border border-slate-300/40"
                >
                  Disconnetti
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[9px] text-slate-500 leading-normal font-medium">
                  Effettua l'accesso per abilitare le operazioni di scrittura.
                </p>
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="w-full text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase tracking-wider py-1.5 px-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <KeyRound className="h-3 w-3" /> Accedi
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Restore Defaults button and footer */}
        <div className="p-6 border-t border-slate-100 space-y-4">
          <button
            onClick={() => setShowRestoreModal(true)}
            className="w-full text-[10px] bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2.5 rounded-xl border border-red-100 transition font-extrabold uppercase tracking-wide flex items-center justify-center gap-1.5 cursor-pointer"
            title="Ripristina dati di default"
          >
            <Database className="h-3.5 w-3.5" /> Ripristina Demo
          </button>
          <div className="text-[10px] text-slate-400 text-center font-mono leading-none">
            LUPO v2.0 • 2026
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER & NAVIGATION */}
      <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-600 text-white rounded-lg">
            <Database className="h-4 w-4" />
          </div>
          <span className="text-lg font-serif italic font-extrabold tracking-tight text-slate-900">LUPO 2.0</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 px-3 bg-slate-100 text-slate-800 text-xs font-bold rounded-lg"
          >
            Menu
          </button>
        </div>
      </header>

      {/* MOBILE COMPANION DRAWER MENU */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-slate-150 p-4 space-y-3 flex flex-col">
          <button
            onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'dashboard' ? 'bg-slate-905 text-slate-900 border-l-4 border-l-slate-800' : 'text-slate-650'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => { setActiveTab('clienti'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'clienti' ? 'bg-slate-905 text-slate-900 border-l-4 border-l-slate-800' : 'text-slate-650'}`}
          >
            Clienti
          </button>
          <button
            onClick={() => { setActiveTab('prove'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'prove' ? 'bg-slate-905 text-slate-900 border-l-4 border-l-slate-800' : 'text-slate-650'}`}
          >
            Prove
          </button>
          <button
            onClick={() => { setActiveTab('preventivi'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'preventivi' ? 'bg-slate-905 text-slate-900 border-l-4 border-l-slate-800' : 'text-slate-650'}`}
          >
            Preventivi
          </button>
          <button
            onClick={() => { setActiveTab('accettazione'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'accettazione' ? 'bg-slate-905 text-slate-900 border-l-4 border-l-slate-800' : 'text-slate-650'}`}
          >
            Accettazione Campioni
          </button>
          <button
            onClick={() => { setActiveTab('fatturazione'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'fatturazione' ? 'bg-slate-905 text-slate-900 border-l-4 border-l-slate-800' : 'text-slate-650'}`}
          >
            Fatturazione
          </button>
          <button
            onClick={() => { setActiveTab('reagentario'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'reagentario' ? 'bg-slate-905 text-slate-900 border-l-4 border-l-slate-800' : 'text-slate-650'}`}
          >
            Reagentario
          </button>
          {actualRole !== 'AM' && (
            <button
              onClick={() => { setActiveTab('operatori'); setMobileMenuOpen(false); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'operatori' ? 'bg-slate-905 text-slate-900 border-l-4 border-l-slate-800' : 'text-slate-650'}`}
            >
              Gestione Operatori
            </button>
          )}

          <button
            onClick={() => { setActiveTab('statistiche'); setMobileMenuOpen(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg text-left ${activeTab === 'statistiche' ? 'bg-slate-905 text-slate-900 border-l-4 border-l-slate-800' : 'text-slate-650'}`}
          >
            Statistiche & Analisi
          </button>
          
          {/* Mobile Supabase Status and Auth Widget */}
          <div className="border-t border-slate-150 pt-4 mt-2">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl divide-y divide-slate-150 overflow-hidden shadow-2xs">
              {/* Database Status */}
              <div className="p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] uppercase font-black tracking-wider text-slate-450 flex items-center gap-1">
                    <Database className="h-3 w-3 text-emerald-600" /> Database Supabase
                  </span>
                  <div className="flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      supabaseStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                      supabaseStatus === 'loading' ? 'bg-amber-500 animate-pulse' :
                      supabaseStatus === 'error' ? 'bg-rose-500' :
                      'bg-slate-300'
                    }`} />
                    <span className="text-[9.5px] font-black uppercase text-slate-800">
                      {supabaseStatus === 'connected' ? 'Attivo' : 'Non Attivo'}
                    </span>
                  </div>
                </div>
                {supabaseStatus === 'connected' && (
                  <button
                    onClick={() => { handleSyncLocalData(); setMobileMenuOpen(false); }}
                    className="w-full text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase py-1.5 px-2.5 rounded-lg transition-all"
                  >
                    Sincronizza Cloud
                  </button>
                )}
              </div>

              {/* User Session */}
              <div className="p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] uppercase font-black tracking-wider text-slate-450 flex items-center gap-1">
                    <KeyRound className="h-3 w-3 text-indigo-600" /> Sessione
                  </span>
                  {currentUser ? (
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                      actualRole === 'AM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      userRole === 'admin' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 
                      'bg-blue-50 text-blue-850 border-blue-200'
                    }`}>
                      {actualRole === 'AM' ? 'Amministrativo' :
                       userRole === 'admin' ? 'Amministratore' : 'Utente'}
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-slate-200">
                      Ospite
                    </span>
                  )}
                </div>
                {currentUser ? (
                  <div className="space-y-2">
                    <div className="text-[9px] text-slate-750 font-semibold truncate bg-slate-100/60 p-1 rounded border border-slate-200/50 flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate">{currentUser.email}</span>
                    </div>
                    <button
                      onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                      className="w-full text-[9px] bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold uppercase py-1.5 px-2.5 rounded-lg transition"
                    >
                      Disconnetti
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShowLoginModal(true); setMobileMenuOpen(false); }}
                    className="w-full text-[9px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase py-1.5 px-2.5 rounded-lg transition"
                  >
                    Accedi
                  </button>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => { setShowRestoreModal(true); setMobileMenuOpen(false); }}
            className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 rounded-lg text-left text-center mt-3 cursor-pointer hover:bg-red-100/50 transition "
          >
            Ripristina Demo
          </button>
        </div>
      )}

      {/* MAIN VIEWPORT PORT */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
        
        {/* TAB ACTIVE SELECT */}
        <div className="transition mt-2 lg:mt-0">
          
          {/* A) CHOSEN TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fadeIn">
              
              {/* Titolo Tab */}
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight" id="dashboard-main-title">
                  Dashboard
                </h1>
                <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
                  Benvenuto in LUPO 2.0 — scegli un&apos;area da gestire o monitora lo stato del sistema.
                </p>
              </div>

              {/* PANNELLO DI CONTROLLO STATO CLOUD & SESSIONE OPERATORE (Richiesta Utente) */}
              <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-3xl p-6 shadow-2xs flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-6 items-center w-full md:w-auto">
                  
                  {/* Stato Supabase */}
                  <div className="flex items-center gap-4 bg-white border border-slate-150 p-4 px-5 rounded-2xl shadow-3xs w-full sm:w-auto">
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                      <Database className="h-5.5 w-5.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Database Cloud</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`h-2.5 w-2.5 rounded-full ${
                          supabaseStatus === 'connected' ? 'bg-emerald-500 animate-pulse' :
                          supabaseStatus === 'loading' ? 'bg-amber-500 animate-pulse' :
                          supabaseStatus === 'error' ? 'bg-rose-500' : 'bg-slate-300'
                        }`} />
                        <span className="text-xs font-black uppercase text-slate-800">
                          {supabaseStatus === 'connected' ? 'Attivo' :
                           supabaseStatus === 'loading' ? 'Connessione...' :
                           supabaseStatus === 'error' ? 'In Errore' : 'Disattivato'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sessione Utente */}
                  <div className="flex items-center gap-4 bg-white border border-slate-150 p-4 px-5 rounded-2xl shadow-3xs w-full sm:w-auto">
                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                      <KeyRound className="h-5.5 w-5.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Operatore Attivo</span>
                      <div className="flex items-center gap-2 mt-0.5 min-w-0">
                        {currentUser ? (
                          <>
                            <span className="text-xs font-black text-slate-800 truncate" title={currentUser.email}>
                              {currentUser.email}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border leading-none shrink-0 ${
                              actualRole === 'AM' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              userRole === 'admin' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 
                              'bg-blue-50 text-blue-800 border-blue-200'
                            }`}>
                              {actualRole === 'AM' ? 'Amministrativo' :
                               userRole === 'admin' ? 'Amministratore' : 'Utente'}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs font-black text-slate-450 uppercase tracking-wide">
                            Accesso Ospite (Sola Lettura)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Azioni Sincronizzazione / Accedi */}
                <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                  {supabaseStatus === 'connected' && (
                    <button
                      onClick={handleSyncLocalData}
                      className="flex-1 md:flex-initial text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider py-3 px-5 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow active:scale-[0.98]"
                    >
                      <FolderSync className="h-4 w-4" /> Sincronizza Cloud
                    </button>
                  )}
                  
                  {supabaseStatus === 'error' && (
                    <button
                      onClick={() => setShowErrorModal(true)}
                      className="flex-1 md:flex-initial text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold uppercase tracking-wider py-3 px-5 rounded-xl transition cursor-pointer text-center"
                    >
                      Dettagli Errore
                    </button>
                  )}

                  {currentUser ? (
                    <button
                      onClick={handleLogout}
                      className="flex-1 md:flex-initial text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold uppercase tracking-wider py-3 px-5 rounded-xl transition cursor-pointer border border-slate-250/50 text-center active:scale-[0.98]"
                    >
                      Disconnetti
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowLoginModal(true)}
                      className="flex-1 md:flex-initial text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider py-3 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:shadow active:scale-[0.98]"
                    >
                      <KeyRound className="h-4 w-4" /> Accedi
                    </button>
                  )}
                </div>
              </div>

              {/* GRIGLIA FUNZIONALE: CARD CON ICONE GRANDI E COLORI TENUI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="dashboard-grid-cards">
                
                {/* 1) Anagrafica Clienti */}
                <div
                  onClick={() => setActiveTab('clienti')}
                  className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-blue-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  id="card-dash-clienti"
                >
                  <div className="w-20 h-20 rounded-full bg-blue-50/80 border border-blue-100/50 flex items-center justify-center mx-auto mb-6 text-blue-500/90 group-hover:scale-105 transition-transform duration-300">
                    <Users className="h-9 w-9" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-blue-600 transition-colors">
                    Clienti
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Anagrafica e archivio storico dei clienti del laboratorio
                  </p>
                </div>

                {/* 2) Tariffario Prove */}
                <div
                  onClick={() => setActiveTab('prove')}
                  className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-amber-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  id="card-dash-prove"
                >
                  <div className="w-20 h-20 rounded-full bg-amber-50/80 border border-amber-100/50 flex items-center justify-center mx-auto mb-6 text-amber-500/90 group-hover:scale-105 transition-transform duration-300">
                    <FlaskConical className="h-9 w-9" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-amber-600 transition-colors">
                    Prove
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Tariffario analitico delle prove e dei pacchetti chimici
                  </p>
                </div>

                {/* 3) Preventivi e contratti */}
                <div
                  onClick={() => setActiveTab('preventivi')}
                  className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-emerald-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  id="card-dash-preventivi"
                >
                  <div className="w-20 h-20 rounded-full bg-emerald-50/80 border border-emerald-100/50 flex items-center justify-center mx-auto mb-6 text-emerald-500/90 group-hover:scale-105 transition-transform duration-300">
                    <FileSpreadsheet className="h-9 w-9" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-emerald-600 transition-colors">
                    Preventivi
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Creazione, stampa e consultazione dei preventivi emessi
                  </p>
                </div>

                {/* 4) Accettazione Campioni */}
                <div
                  onClick={() => setActiveTab('accettazione')}
                  className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-indigo-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  id="card-dash-accettazione"
                >
                  <div className="w-20 h-20 rounded-full bg-indigo-50/80 border border-indigo-100/50 flex items-center justify-center mx-auto mb-6 text-indigo-500/95 group-hover:scale-105 transition-transform duration-300">
                    <FileText className="h-9 w-9" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-indigo-600 transition-colors">
                    Accettazione Campioni
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Registro accettazione campioni in arrivo
                  </p>
                </div>

                {/* 5) Reagentario Chimico */}
                <div
                  onClick={() => setActiveTab('reagentario')}
                  className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-purple-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  id="card-dash-reagentario"
                >
                  <div className="w-20 h-20 rounded-full bg-purple-50/80 border border-purple-100/50 flex items-center justify-center mx-auto mb-6 text-purple-500/95 group-hover:scale-105 transition-transform duration-300">
                    <Archive className="h-9 w-9" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-purple-600 transition-colors">
                    Reagentario
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Tracciamento scorte reagenti chimici, scadenze e lotti di laboratorio
                  </p>
                </div>

                {/* 6) Analisi & Statistiche */}
                <div
                  onClick={() => setActiveTab('statistiche')}
                  className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-emerald-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  id="card-dash-statistiche"
                >
                  <div className="w-20 h-20 rounded-full bg-emerald-50/80 border border-emerald-100/50 flex items-center justify-center mx-auto mb-6 text-emerald-600/95 group-hover:scale-105 transition-transform duration-300">
                    <BarChart3 className="h-9 w-9" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-emerald-600 transition-colors">
                    Statistiche & Analytics
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Visualizzazione fatturati, reportistiche e monitoraggio dei tempi d&apos;analisi
                  </p>
                </div>

                {/* 8) Amministrazione & Fatturazione */}
                <div
                  onClick={() => setActiveTab('fatturazione')}
                  className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-indigo-300 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  id="card-dash-fatturazione"
                >
                  <div className="w-20 h-20 rounded-full bg-indigo-50/80 border border-indigo-100/50 flex items-center justify-center mx-auto mb-6 text-indigo-600/95 group-hover:scale-105 transition-transform duration-300">
                    <Receipt className="h-9 w-9" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-indigo-600 transition-colors">
                    Fatturazione
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                    Gestione delle pratiche contabili, delle offerte approvate e delle fatture emesse
                  </p>
                </div>

                {/* 9) Gestione Operatori & Password */}
                {actualRole !== 'AM' && (
                  <div
                    onClick={() => setActiveTab('operatori')}
                    className="bg-white rounded-3xl border border-slate-150 p-8 text-center shadow-2xs hover:shadow-xs hover:border-slate-800 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                    id="card-dash-operatori"
                  >
                    <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-250 flex items-center justify-center mx-auto mb-6 text-slate-800 group-hover:scale-105 transition-transform duration-300">
                      <KeyRound className="h-9 w-9" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-850 tracking-tight group-hover:text-slate-950 transition-colors">
                      Gestione Operatori
                    </h3>
                    <p className="text-xs text-slate-400 mt-2 px-3 leading-relaxed">
                      Aggiungi, modifica e rimuovi operatori accreditati, le loro qualifiche o le password della firma
                    </p>
                  </div>
                )}

              </div>

              {/* STATS SUMMARY CON ICONE TENUI E DESIGN MINIMALE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Stat 1: Totale Clienti */}
                <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-2xs flex justify-between items-center">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block tracking-wider uppercase">Totale Clienti</span>
                    <span className="text-3xl font-extrabold text-slate-850 block mt-1.5 leading-none">
                      {totaleClienti}
                    </span>
                  </div>
                  <div className="w-11 h-11 bg-blue-50 text-blue-550 rounded-xl flex items-center justify-center border border-blue-100/50">
                    <Users className="h-5 w-5" />
                  </div>
                </div>

                {/* Stat 2: Fatturazione Totale */}
                <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-2xs flex justify-between items-center">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block tracking-wider uppercase">Fatturazione Totale</span>
                    <span className="text-2xl font-extrabold text-slate-850 block mt-1.5 leading-none">
                      € {fatturatoTotale.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="w-11 h-11 bg-amber-50 text-amber-550 rounded-xl flex items-center justify-center border border-amber-100/50 font-bold text-sm">
                    €
                  </div>
                </div>

                {/* Stat 3: Fatturazione Media */}
                <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-2xs flex justify-between items-center">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block tracking-wider uppercase">Fatturazione Media</span>
                    <span className="text-2xl font-extrabold text-slate-850 block mt-1.5 leading-none">
                      € {fatturatoMedio.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="w-11 h-11 bg-emerald-50 text-emerald-550 rounded-xl flex items-center justify-center border border-emerald-100/50">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>

              </div>

              {/* SEZIONI IN GRID: TOP CATEGORIE, ULTIMI CLIENTI & ALLERTA SCADENZE REAGENTI */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Box Left: Top Categorie */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs">
                  <div className="flex items-center gap-2 mb-4">
                    <FolderDot className="h-5 w-5 text-slate-400" />
                    <h3 className="font-extrabold text-base text-slate-850 tracking-tight">Top Categorie</h3>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {topCategories.map(([category, count]) => (
                      <div key={category} className="py-3 flex justify-between items-center text-sm">
                        <span className="text-slate-800 font-bold">{category}</span>
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-mono font-bold text-xs">{count}</span>
                      </div>
                    ))}
                    {topCategories.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400">Nessuna categoria censita.</div>
                    )}
                  </div>
                </div>

                {/* Box Center: Ultimi Clienti */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-slate-400" />
                        <h3 className="font-extrabold text-base text-slate-850 tracking-tight">Ultimi Clienti</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('clienti')}
                        className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-0.5 cursor-pointer"
                      >
                        Vedi tutti <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {latestClients.map((client) => (
                        <div key={client.id} className="py-3 flex justify-between items-center text-sm">
                          <div>
                            <span className="text-slate-800 font-bold block">{client.denominazione}</span>
                            {client.indirizzo && (
                              <span className="text-[11px] text-slate-400 block mt-0.5">{client.indirizzo.split(',')[1] || client.indirizzo.split('(')[1] || 'Imola'}</span>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <span className="px-2 py-0.5 bg-slate-100 font-mono text-[10px] text-slate-500 rounded font-bold">28/05/2026</span>
                          </div>
                        </div>
                      ))}
                      {latestClients.length === 0 && (
                        <div className="text-center py-6 text-xs text-slate-400">Nessun cliente inserito.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Box Right: Scadenze Reagenti (Near Expiry) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-rose-500" />
                        <h3 className="font-extrabold text-base text-slate-850 tracking-tight">Scadenze Reagenti</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('reagentario')}
                        className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-0.5 cursor-pointer"
                      >
                        Gestisci <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {reagentsNearExpiry.map((reag) => (
                        <div key={reag.id} className="py-3 flex justify-between items-center text-sm">
                          <div className="min-w-0 pr-2">
                            <span className="text-slate-800 font-bold block truncate">{reag.nome}</span>
                            <span className="text-[11px] font-mono text-slate-400 block mt-0.5 truncate">
                              {reag.formulaChimica ? `[${reag.formulaChimica}] · ` : ''}{reag.quantitaDisponibile} {reag.unitaMisura}
                            </span>
                          </div>
                          
                          <div className="text-right shrink-0">
                            {reag.scaduto ? (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-[10px] font-extrabold rounded uppercase tracking-wider animate-pulse">
                                SCADUTO
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-rose-50 text-rose-700 text-[10px] font-bold rounded">
                                -{reag.daysToExpiry} gg
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                      {reagentsNearExpiry.length === 0 && (
                        <div className="text-center py-6 text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                          <CheckCircle className="h-7 w-7 text-emerald-500/80 mb-1" />
                          <p className="font-bold text-slate-650">Scorte in validità</p>
                          <p className="text-[10px] text-slate-450 px-2 line-clamp-2">Nessun reagente scaduto o in scadenza nei prossimi 30 giorni.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* AREA REVISIONI & RIEMISSIONI RDP (Richiesta Utente) */}
              <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs animate-fadeIn space-y-6" id="dashboard-area-revisioni-rdp">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl shrink-0">
                      <FolderSync className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-850 tracking-tight">
                        Area Revisione & Riemissione RDP
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Richiama un Rapporto di Prova emesso per apportare correzioni storiche controllate e riemettere in Rev.01, Rev.02, ecc.
                      </p>
                    </div>
                  </div>
                  
                  {/* Badge indicatore di conformità */}
                  <div className="self-start sm:self-auto px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Conforme ISO/IEC 17025
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Form di emissione revisione */}
                  <div className="lg:col-span-7 bg-slate-50/50 rounded-2xl p-6 border border-slate-150 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1">
                      📝 Compila Nuova Riemissione
                    </h3>

                    {revisioneSuccessMessage && (
                      <div className="p-3 bg-emerald-50 border border-emerald-150 rounded-xl text-emerald-800 text-xs flex items-center justify-between animate-fadeIn">
                        <span className="font-semibold">{revisioneSuccessMessage}</span>
                        <button onClick={() => setRevisioneSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 font-bold px-1">&times;</button>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* 1. Selezione RDP da Richiamare */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          1. Seleziona Rapporto di Prova da Richiamare
                        </label>
                        <select
                          value={revisioneSelectedAccId}
                          onChange={(e) => {
                            setRevisioneSelectedAccId(e.target.value);
                            const found = accettazioni.find(a => a.id === e.target.value);
                            // Impostiamo operatore di default se presente
                            if (found && found.firmatarioTecnico) {
                              setRevisioneOperatore(found.firmatarioTecnico);
                            } else {
                              setRevisioneOperatore(operators[0]?.nome || '');
                            }
                          }}
                          className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">-- Seleziona un rapporto completato --</option>
                          {accettazioni
                            .filter(a => a.analisiStato === 'Completato')
                            .map(a => (
                              <option key={a.id} value={a.id}>
                                {a.codiceAccettazione} - {a.descrizioneCampione} (Rev. {a.revisioneCorrente !== undefined ? String(a.revisioneCorrente).padStart(2, '0') : '00'})
                              </option>
                            ))
                          }
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Vengono mostrati unicamente i rapporti di prova emessi e completati per cui è possibile emettere revisioni.
                        </p>
                      </div>

                      {/* 2. Motivo della Revisione */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          2. Motivazione della Correzione / Revisione
                        </label>
                        <textarea
                          placeholder="Fornisci una sintetica descrizione scientifica del motivo per cui si sta riemettendo il rapporto (es. 'Rettifica della formula analitica' o 'Aggiornamento dati anagrafici del committente')"
                          value={revisioneMotivoInput}
                          onChange={(e) => setRevisioneMotivoInput(e.target.value)}
                          rows={3}
                          className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 leading-normal"
                        />
                      </div>

                      {/* 3. Operatore Certificante */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            3. Operatore Certificante
                          </label>
                          <select
                            value={revisioneOperatore}
                            onChange={(e) => setRevisioneOperatore(e.target.value)}
                            className="w-full px-3.5 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="">-- Seleziona Responsabile --</option>
                            {operators
                              .filter(o => o.attivo !== false && o.autorizzatoFirma !== false)
                              .map(o => (
                                <option key={o.nome} value={o.nome}>{o.nome} ({o.ruoloFirma || o.ruolo})</option>
                              ))
                            }
                          </select>
                        </div>

                        {/* Pulsante Azione */}
                        <div className="flex items-end">
                          <button
                            type="button"
                            disabled={!revisioneSelectedAccId || !revisioneMotivoInput.trim() || !revisioneOperatore}
                            onClick={() => {
                              const targetAcc = accettazioni.find(a => a.id === revisioneSelectedAccId);
                              if (targetAcc) {
                                handleEmitNewRevision(revisioneSelectedAccId, revisioneMotivoInput, revisioneOperatore);
                                setRevisioneSuccessMessage(`Nuova revisione Rev. ${String((targetAcc.revisioneCorrente || 0) + 1).padStart(2, '0')} emessa con successo per ${targetAcc.codiceAccettazione}! Ora il rapporto è sbloccato per modifiche.`);
                                setRevisioneSelectedAccId('');
                                setRevisioneMotivoInput('');
                                // Spostiamo l'utente su accettazione campioni
                                setTimeout(() => {
                                  setActiveTab('accettazione');
                                }, 1500);
                              }
                            }}
                            className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
                              (!revisioneSelectedAccId || !revisioneMotivoInput.trim() || !revisioneOperatore)
                              ? 'bg-slate-200 text-slate-450 cursor-not-allowed'
                              : 'bg-indigo-600 text-white hover:bg-slate-900 hover:shadow-xs shadow-2xs'
                            }`}
                          >
                            <Sparkles className="h-4 w-4" />
                            Emetti Revisione
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Registro storico revisioni attive */}
                  <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-450 flex items-center gap-1.5">
                        <History className="h-4 w-4" /> Registro Storico Revisioni Attive
                      </h3>

                      <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                        {accettazioni
                          .filter(a => a.revisioneCorrente !== undefined && a.revisioneCorrente > 0)
                          .map(a => (
                            <div key={a.id} className="bg-slate-50/50 border border-slate-150 p-3 rounded-xl space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-mono text-xs font-black text-slate-800">{a.codiceAccettazione}</span>
                                  <span className="ml-2 px-1.5 py-0.5 bg-indigo-50 border border-indigo-150 text-[9px] font-black font-mono text-indigo-700 rounded uppercase">
                                    Rev. {String(a.revisioneCorrente).padStart(2, '0')}
                                  </span>
                                </div>
                                <span className="text-[9px] text-slate-400 font-medium font-mono">{a.dataRevisione?.split(' ')[0]}</span>
                              </div>
                              <p className="text-[11px] text-slate-650 leading-relaxed font-normal line-clamp-2">
                                <strong>Motivazione:</strong> &ldquo;{a.revisioneMotivo}&rdquo;
                              </p>
                              <div className="flex items-center justify-between text-[10px] border-t border-slate-100 pt-1.5 mt-1">
                                <span className="text-slate-450">Firma: <strong>{a.firmatarioTecnico || 'Resp. Tecnico'}</strong></span>
                                <button
                                  onClick={() => {
                                    setActiveTab('accettazione');
                                    setTimeout(() => {
                                      // Prova ad evidenziare o espandere
                                      const row = document.getElementById(`acc-row-${a.id}`);
                                      if (row) {
                                        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      }
                                    }, 200);
                                  }}
                                  className="text-indigo-600 hover:text-indigo-900 font-extrabold flex items-center gap-0.5 cursor-pointer uppercase text-[9px] tracking-wider"
                                >
                                  Apri RDP <ChevronRight className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))
                        }
                        {accettazioni.filter(a => a.revisioneCorrente !== undefined && a.revisioneCorrente > 0).length === 0 && (
                          <div className="text-center py-12 text-slate-400 text-xs">
                            <FolderSync className="h-8 w-8 text-slate-300 mx-auto mb-2 animate-bounce" />
                            Nessun certificato in revisione al momento.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-150 pt-4 mt-4 bg-slate-50 border -mx-6 -mb-6 p-4 rounded-b-2xl text-[10px] text-slate-500 leading-normal font-normal">
                      💡 <strong>Linee Guida d&apos;Ufficio:</strong> Ogni revisione riemessa traccia lo storico dell&apos;RDP originale nel sistema. Nel PDF/A di stampa, la dicitura riepilogherà la sostituzione corretta a norma di legge. Puoi modificare anagrafica, date o analisi direttamente nella scheda campione e riconsultare o stampare.
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* B) CHOSEN TAB: CLIENTI */}
          {activeTab === 'clienti' && (
            <ClientiSection
              clients={clients}
              onAddClient={handleAddClient}
              onDeleteClient={handleDeleteClient}
              onUpdateClient={handleUpdateClient}
              preventivi={preventivi}
              prove={prove}
              pacchetti={pacchetti}
              accettazioni={accettazioni}
              userRole={userRole}
              currentUser={currentUser}
              actualRole={actualRole}
              onOpenLogin={() => setShowLoginModal(true)}
            />
          )}

          {/* C) CHOSEN TAB: PROVE */}
          {activeTab === 'prove' && (
            <ProveSection
              prove={prove}
              onAddProva={handleAddProva}
              onDeleteProva={handleDeleteProva}
              onUpdateProva={handleUpdateProva}
              selectedProvaId={selectedProvaId}
              onClearSelectedProvaId={() => setSelectedProvaId(null)}
              currentUser={currentUser}
              userRole={userRole}
            />
          )}

          {/* D) CHOSEN TAB: PREVENTIVI */}
          {activeTab === 'preventivi' && (
            <PreventiviSection
              preventivi={preventivi}
              pacchetti={pacchetti}
              clients={clients}
              prove={prove}
              onAddPreventivo={handleAddPreventivo}
              onAddPacchetto={handleAddPacchetto}
              onUpdatePacchetto={handleUpdatePacchetto}
              onDeletePreventivo={handleDeletePreventivo}
              onDeletePacchetto={handleDeletePacchetto}
              onGoToProva={handleGoToProva}
              operators={operators}
              selectedPreventivoId={selectedPreventivoId}
              onClearSelectedPreventivo={() => setSelectedPreventivoId(null)}
            />
          )}

          {/* E) CHOSEN TAB: REAGENTARIO */}
          {activeTab === 'reagentario' && (
            <ReagentarioSection
              reagenti={reagenti}
              onAddReagente={handleAddReagente}
              onDeleteReagente={handleDeleteReagente}
              onUpdateReagente={handleUpdateReagente}
              reagentiRitirati={reagentiRitirati}
              setReagentiRitirati={handleUpdateReagentiRitirati}
            />
          )}

          {/* F) CHOSEN TAB: ACCETTAZIONE CAMPIONI */}
          {activeTab === 'accettazione' && (
            <AccettazioneSection
              accettazioni={accettazioni}
              clients={clients}
              preventivi={preventivi}
              prove={prove}
              pacchetti={pacchetti}
              onAddAccettazione={handleAddAccettazione}
              onDeleteAccettazione={handleDeleteAccettazione}
              onUpdateAccettazione={handleUpdateAccettazione}
              operators={operators}
              onViewPreventivo={handleGoToPreventivo}
            />
          )}

          {/* F2) CHOSEN TAB: FATTURAZIONE */}
          {activeTab === 'fatturazione' && (
            <FatturazioneSection
              pratiche={praticheFatturazione}
              onUpdatePratiche={handleUpdatePratiche}
              auditLogs={auditLogs}
              operators={operators}
              addAuditLogEntry={handleAddAuditLogEntry}
            />
          )}

          {/* H) CHOSEN TAB: GESTIONE OPERATORI */}
          {activeTab === 'operatori' && (
            actualRole === 'AM' ? (
              <div className="bg-white rounded-3xl border border-slate-150 p-12 text-center max-w-md mx-auto mt-12 shadow-sm">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
                  <KeyRound className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Accesso Negato</h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  Il profilo Amministrativo (AM) non è autorizzato ad accedere o ad operare nell'area di gestione degli operatori e delle credenziali di firma.
                </p>
              </div>
            ) : (
              <OperatoriSection
                operators={operators}
                onUpdateOperators={handleUpdateOperators}
              />
            )
          )}

          {/* G) CHOSEN TAB: STATISTICHE E BUSINESS INTELLIGENCE */}
          {activeTab === 'statistiche' && (
            <StatisticheSection
              preventivi={preventivi}
              clients={clients}
              prove={prove}
              pacchetti={pacchetti}
              accettazioni={accettazioni}
              reagenti={reagenti}
            />
          )}


        </div>
      </main>

      {showRestoreModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-150 animate-scaleIn">
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Ripristino Dati Dimostrativi
            </h3>
            <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
              Attenzione: questa operazione caricherà i dati dimostrativi iniziali ed eliminerà tutte le modifiche correnti (clienti, preventivi, tariffario e reagentario salvati). Vuoi procedere?
            </p>
            <div className="flex justify-end gap-2.5 mt-6 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={handleRestoreDefaults}
                className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Sì, Ripristina
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            setShowLoginModal(false);
            fetchUserRole();
          }}
        />
      )}

      {showErrorModal && (
        <DatabaseErrorModal
          onClose={() => setShowErrorModal(false)}
          errorMsg={supabaseErrorMsg}
        />
      )}

    </div>
  );
}
