import { useState, useEffect } from 'react';
import { 
  Client, 
  Prova, 
  Pacchetto, 
  Preventivo, 
  Reagente, 
  ReagenteRitirato, 
  AccettazioneCampione, 
  Operator, 
  PraticaFatturazione, 
  AuditLog 
} from '../types';
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
} from '../utils/supabaseClient';
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
} from '../mockData';

const getDaysOfValidityApp = (validita?: string): number => {
  if (!validita) return 90;
  const match = validita.match(/\d+/);
  if (match) {
    return parseInt(match[0], 10);
  }
  return 90;
};

const isOfferExpiredApp = (dataCreazione: string, validita?: string): boolean => {
  if (!dataCreazione) return false;
  const dateParts = dataCreazione.split('-');
  if (dateParts.length !== 3) return false;
  
  const emissione = new Date(
    parseInt(dateParts[0], 10),
    parseInt(dateParts[1], 10) - 1,
    parseInt(dateParts[2], 10)
  );
  if (isNaN(emissione.getTime())) return false;
  
  const daysOfValidity = getDaysOfValidityApp(validita);
  const scadenza = new Date(emissione.getTime());
  scadenza.setDate(scadenza.getDate() + daysOfValidity);
  
  const tempToday = new Date();
  const today = new Date(tempToday.getFullYear(), tempToday.getMonth(), tempToday.getDate());
  
  const diffTime = scadenza.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays < 0;
};

export function useAppData() {
  // Caricamento stati con persistenza localStorage
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('lab_clients');
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  });

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
    return parsed;
  });

  const [praticheFatturazione, setPraticheFatturazione] = useState<PraticaFatturazione[]>(() => {
    const saved = localStorage.getItem('lab_pratiche_fatturazione');
    return saved ? JSON.parse(saved) : INITIAL_PRATICHE_FATTURAZIONE;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('lab_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [supabaseStatus, setSupabaseStatus] = useState<'idle' | 'loading' | 'connected' | 'error' | 'not_configured'>('idle');
  const [supabaseErrorMsg, setSupabaseErrorMsg] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'utente' | null>(null);
  const [actualRole, setActualRole] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfileName, setUserProfileName] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);

  // Pannelli attivi e navigazione
  const [initialPrintQuoteId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('printQuoteId');
    }
    return null;
  });

  const [activeTab, setActiveTabState] = useState<string>(() => {
    try {
      return localStorage.getItem('lims_active_tab') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('lims_active_tab', tab);
    } catch (e) {
      console.error('Error saving active tab to localStorage', e);
    }
  };

  const [selectedProvaId, setSelectedProvaId] = useState<string | null>(null);
  const [selectedPreventivoId, setSelectedPreventivoId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);

  // Revisioni RDP
  const [revisioneSelectedAccId, setRevisioneSelectedAccId] = useState<string>('');
  const [revisioneMotivoInput, setRevisioneMotivoInput] = useState<string>('');
  const [revisioneOperatore, setRevisioneOperatore] = useState<string>('');
  const [revisioneSuccessMessage, setRevisioneSuccessMessage] = useState<string | null>(null);

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

      let roleStr = 'ADMIN';
      
      try {
        let { data, error } = await supabase
          .from('profili')
          .select('ruolo, nome')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          console.log("Profilo non trovato o errore. Tento la creazione automatica come ADMIN...", error);
          const defaultProfile = {
            id: user.id,
            email: user.email,
            nome: user.email?.split('@')[0] || 'Operatore',
            ruolo: 'ADMIN'
          };
          
          const { data: upsertData, error: upsertError } = await supabase
            .from('profili')
            .upsert([defaultProfile])
            .select('ruolo, nome')
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
        if (data && data.nome) {
          setUserProfileName(data.nome);
        }
      } catch (profileErr) {
        console.warn("Errore non fatale durante il recupero del ruolo da 'profili':", profileErr);
      }

      if (user.email && (user.email.toLowerCase() === 'carmine.marroccella@agenziaperlosvilupo.aq.camcom.it' || user.email.toLowerCase() === 'carmine.marroccella@agenziaperlosviluppo.aq.camcom.it')) {
        roleStr = 'ADMIN';
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

      const isNetworkErr = (err: any) => {
        const str = String(err?.message || err || '').toLowerCase();
        return str.includes('failed to fetch') || str.includes('networkerror') || str.includes('typeerror');
      };

      let fetchedClientsList: Client[] = [];
      try {
        fetchedClientsList = await fetchClientsFromSupabase();
      } catch (err: any) {
        console.error('Error fetching clients:', err);
        if (isNetworkErr(err)) {
          setSupabaseStatus('not_configured');
          setSupabaseErrorMsg(null);
          return;
        }
        failedTables.push('clienti');
        errorMsgs.push(`clienti: ${err.message || String(err)}`);
      }

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
            if (isNetworkErr(syncErr)) {
              setSupabaseStatus('not_configured');
              setSupabaseErrorMsg(null);
              return;
            }
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
        if (isNetworkErr(err)) {
          setSupabaseStatus('not_configured');
          setSupabaseErrorMsg(null);
          return;
        }
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
        if (isNetworkErr(err)) {
          setSupabaseStatus('not_configured');
          setSupabaseErrorMsg(null);
          return;
        }
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
        if (isNetworkErr(err)) {
          setSupabaseStatus('not_configured');
          setSupabaseErrorMsg(null);
          return;
        }
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
        if (isNetworkErr(err)) {
          setSupabaseStatus('not_configured');
          setSupabaseErrorMsg(null);
          return;
        }
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
        if (isNetworkErr(err)) {
          setSupabaseStatus('not_configured');
          setSupabaseErrorMsg(null);
          return;
        }
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
        if (isNetworkErr(err)) {
          setSupabaseStatus('not_configured');
          setSupabaseErrorMsg(null);
          return;
        }
        failedTables.push('accettazioni');
        errorMsgs.push(`accettazioni: ${err.message || String(err)}`);
      }

      // 8. Fetch Operatori
      try {
        const fetched = await fetchOperatorsFromSupabase();
        setOperators(fetched);
        localStorage.setItem('lab_operators', JSON.stringify(fetched));
      } catch (err: any) {
        console.error('Error fetching operatori:', err);
        if (isNetworkErr(err)) {
          setSupabaseStatus('not_configured');
          setSupabaseErrorMsg(null);
          return;
        }
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
        if (isNetworkErr(err)) {
          setSupabaseStatus('not_configured');
          setSupabaseErrorMsg(null);
          return;
        }
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
        if (isNetworkErr(err)) {
          setSupabaseStatus('not_configured');
          setSupabaseErrorMsg(null);
          return;
        }
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

  // Controllo automatico dei preventivi scaduti
  useEffect(() => {
    if (!preventivi || preventivi.length === 0) return;

    const toUpdate = preventivi.filter(
      p => p.stato === 'In Approvazione' && isOfferExpiredApp(p.dataCreazione, p.validitaOfferta)
    );
    if (toUpdate.length === 0) return;

    const now = new Date();
    const formattedDate = now.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const updatedPreventivi = preventivi.map(p => {
      if (p.stato === 'In Approvazione' && isOfferExpiredApp(p.dataCreazione, p.validitaOfferta)) {
        const newLog = {
          statoPrecedente: p.stato,
          statoNuovo: 'Scaduto' as const,
          dataOra: formattedDate,
          operatore: 'Sistema (Verifica Validità)'
        };
        const history = p.statoHistory ? [...p.statoHistory, newLog] : [newLog];
        return {
          ...p,
          stato: 'Scaduto' as const,
          statoHistory: history
        };
      }
      return p;
    });

    setPreventivi(updatedPreventivi);

    toUpdate.forEach(async (eq) => {
      handleAddAuditLogEntry(
        'Sistema',
        'Preventivi',
        'Scadenza Automatica',
        eq.codice,
        `Preventivo ${eq.codice} contrassegnato come Scaduto automaticamente per superamento termini di validità`
      );

      if (isSupabaseConfigured) {
        const matchingUpdated = updatedPreventivi.find(up => up.id === eq.id);
        if (matchingUpdated) {
          try {
            await updatePreventivoInSupabase(matchingUpdated);
          } catch (error) {
            console.error(`Errore nel salvataggio su Supabase del preventivo scaduto ${eq.codice}:`, error);
          }
        }
      }
    });
  }, [preventivi]);

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

    handleAddAuditLogEntry(
      userProfileName || 'Sistema',
      'Clienti',
      'Creazione/Registrazione Anagrafica',
      '-',
      `${newClient.denominazione} (P.IVA: ${newClient.partitaIva})`
    );

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
    const deleted = clients.find(c => c.id === id);
    setClients(prev => prev.filter(c => c.id !== id));

    if (deleted) {
      handleAddAuditLogEntry(
        userProfileName || 'Sistema',
        'Clienti',
        'Eliminazione Anagrafica',
        deleted.denominazione,
        'Eliminato'
      );
    }

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
    const old = clients.find(c => c.id === updatedClient.id);
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));

    handleAddAuditLogEntry(
      userProfileName || 'Sistema',
      'Clienti',
      'Modifica Anagrafica',
      old ? old.denominazione : '-',
      updatedClient.denominazione
    );

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

    handleAddAuditLogEntry(
      userProfileName || 'Sistema',
      'Prove & Metodi',
      'Nuova Prova Analitica',
      '-',
      `${newProva.nome} (${newProva.categoriaMerceologica})`
    );

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
    const deleted = prove.find(p => p.id === id);
    setProve(prev => prev.filter(p => p.id !== id));

    if (deleted) {
      handleAddAuditLogEntry(
        userProfileName || 'Sistema',
        'Prove & Metodi',
        'Eliminazione Prova',
        deleted.nome,
        'Eliminato'
      );
    }

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
    const old = prove.find(p => p.id === updatedProva.id);
    setProve(prev => prev.map(p => p.id === updatedProva.id ? updatedProva : p));

    handleAddAuditLogEntry(
      userProfileName || 'Sistema',
      'Prove & Metodi',
      'Modifica Prova Analitica',
      old ? old.nome : '-',
      updatedProva.nome
    );

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

    handleAddAuditLogEntry(
      userProfileName || 'Sistema',
      'Preventivi',
      'Creazione/Salvataggio Offerta',
      '-',
      `Preventivo ${newPrev.codice} (${newPrev.stato})`
    );

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

    handleAddAuditLogEntry(
      userProfileName || 'Sistema',
      'Preventivi',
      'Nuovo Pacchetto Prova',
      '-',
      newPack.nome
    );

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
    const deleted = preventivi.find(p => p.id === id);
    setPreventivi(prev => prev.filter(p => p.id !== id));

    if (deleted) {
      handleAddAuditLogEntry(
        userProfileName || 'Sistema',
        'Preventivi',
        'Eliminazione Preventivo',
        deleted.codice,
        'Eliminato'
      );
    }

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

    handleAddAuditLogEntry(
      userProfileName || 'Sistema',
      'Reagentario',
      'Nuovo Reagente',
      '-',
      `${newReag.nome} (Lotto: ${newReag.lotto})`
    );

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
    const deleted = reagenti.find(r => r.id === id);
    setReagenti(prev => prev.filter(r => r.id !== id));

    if (deleted) {
      handleAddAuditLogEntry(
        userProfileName || 'Sistema',
        'Reagentario',
        'Eliminazione Reagente',
        deleted.nome,
        'Eliminato'
      );
    }

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
    const old = reagenti.find(r => r.id === updatedReag.id);
    setReagenti(prev => prev.map(r => r.id === updatedReag.id ? updatedReag : r));

    handleAddAuditLogEntry(
      userProfileName || 'Sistema',
      'Reagentario',
      'Modifica Reagente',
      old ? `${old.nome} [Qty: ${old.quantitaDisponibile}]` : '-',
      `${updatedReag.nome} [Qty: ${updatedReag.quantitaDisponibile}]`
    );

    if (isSupabaseConfigured) {
      try {
        await updateReagenteInSupabase(updatedReag);
      } catch (error: any) {
        console.error('Error updating reagente in Supabase:', error);
        alert(`Errore di modifica "Reagente" su Supabase:\n${formatSupabaseError(error)}`);
      }
    }
  };

  // HANDLERS ACCETTAZIONE
  const handleAddAccettazione = async (newAcc: AccettazioneCampione) => {
    setAccettazioni(prev => [...prev, newAcc]);

    const client = clients.find(c => c.id === newAcc.destinatarioFatturaClienteId);
    const preventivo = preventivi.find(p => p.id === newAcc.preventivoAssociatoId);

    if (newAcc.preventivoAssociatoId && newAcc.preventivoAssociatoId.trim() !== '') {
      const existingSamplesWithQuoteCount = accettazioni.filter(
        a => a.preventivoAssociatoId === newAcc.preventivoAssociatoId
      ).length;

      if (existingSamplesWithQuoteCount === 0) {
        const foundQuote = preventivi.find(p => p.id === newAcc.preventivoAssociatoId);
        if (foundQuote && foundQuote.stato === 'In Approvazione') {
          const now = new Date();
          const formattedDate = now.toLocaleString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          });

          const newLog = {
            statoPrecedente: foundQuote.stato,
            statoNuovo: 'Approvato' as const,
            dataOra: formattedDate,
            operatore: newAcc.operatorRegistrazione || 'Sistema (Accettazione)'
          };

          const history = foundQuote.statoHistory ? [...foundQuote.statoHistory, newLog] : [newLog];

          const updatedQuote: Preventivo = {
            ...foundQuote,
            stato: 'Approvato',
            statoHistory: history
          };

          setPreventivi(prev => prev.map(p => p.id === updatedQuote.id ? updatedQuote : p));

          if (isSupabaseConfigured) {
            try {
              await updatePreventivoInSupabase(updatedQuote);
            } catch (error: any) {
              console.error('Error auto-updating preventivo to Approvato in Supabase:', error);
            }
          }

          handleAddAuditLogEntry(
            newAcc.operatorRegistrazione || 'Sistema',
            'Preventivi',
            'Approvazione Automatica',
            foundQuote.codice,
            `Preventivo ${foundQuote.codice} approvato automaticamente all'accettazione del primo campione (${newAcc.codiceAccettazione})`
          );
        }
      }
    }

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

    const storicoAggiornato = acc.storicoRevisioni ? [...acc.storicoRevisioni, snapshot] : [snapshot];

    const accAggiornata: AccettazioneCampione = {
      ...acc,
      revisioneCorrente: nuovaRevisioneNumero,
      revisioneMotivo: motivo,
      dataRevisione: new Date().toLocaleDateString('it-IT') + ' ore ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      storicoRevisioni: storicoAggiornato,
    };

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

  const categoryCounts: Record<string, number> = {};
  prove.forEach(p => {
    const cat = p.categoria || 'Generale';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const latestClients = [...clients].slice(-3).reverse();

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
    .slice(0, 3);

  const loggedOperator = operators.find(o => o.nome.toLowerCase() === (userProfileName || '').toLowerCase());
  const hasAccessTo = (areaId: string) => {
    if (actualRole === 'ADMIN' || (currentUser?.email && currentUser.email.toLowerCase().includes('carmine.marroccella'))) return true; 
    if (areaId === 'operatori') return false;
    
    if (actualRole === 'AM') {
        if (areaId === 'fatturazione') return true;
        if (areaId === 'clienti') return true;
        if (areaId === 'dashboard') return true;
        return false;
    }

    if (loggedOperator && loggedOperator.areeCompetenza && loggedOperator.areeCompetenza.length > 0) {
      if (areaId === 'clienti') return true;
      if (areaId === 'dashboard') return true;
      if (areaId === 'prove') return loggedOperator.areeCompetenza.includes('Laboratorio') || loggedOperator.areeCompetenza.includes('Direzione Tecnica');
      if (areaId === 'preventivi') return loggedOperator.areeCompetenza.includes('Commerciale');
      if (areaId === 'accettazione') return loggedOperator.areeCompetenza.includes('Accettazione');
      if (areaId === 'fatturazione') return loggedOperator.areeCompetenza.includes('Amministrazione');
      if (areaId === 'reagentario') return loggedOperator.areeCompetenza.includes('Laboratorio');
      return true;
    }
    
    return true;
  };

  return {
    // States
    clients,
    prove,
    pacchetti,
    preventivi,
    reagenti,
    reagentiRitirati,
    setReagentiRitirati,
    accettazioni,
    operators,
    praticheFatturazione,
    auditLogs,
    setAuditLogs,
    supabaseStatus,
    supabaseErrorMsg,
    userRole,
    actualRole,
    currentUser,
    userProfileName,
    showLoginModal,
    setShowLoginModal,
    showErrorModal,
    setShowErrorModal,
    initialPrintQuoteId,
    activeTab,
    setActiveTab,
    selectedProvaId,
    setSelectedProvaId,
    selectedPreventivoId,
    setSelectedPreventivoId,
    mobileMenuOpen,
    setMobileMenuOpen,
    showRestoreModal,
    setShowRestoreModal,
    revisioneSelectedAccId,
    setRevisioneSelectedAccId,
    revisioneMotivoInput,
    setRevisioneMotivoInput,
    revisioneOperatore,
    setRevisioneOperatore,
    revisioneSuccessMessage,
    setRevisioneSuccessMessage,

    // Handlers
    fetchUserRole,
    handleLogout,
    handleAddAuditLogEntry,
    handleGoToProva,
    handleGoToPreventivo,
    handleAddClient,
    handleDeleteClient,
    handleUpdateClient,
    handleAddProva,
    handleDeleteProva,
    handleUpdateProva,
    handleAddPreventivo,
    handleAddPacchetto,
    handleUpdatePacchetto,
    handleDeletePreventivo,
    handleDeletePacchetto,
    handleAddReagente,
    handleDeleteReagente,
    handleUpdateReagente,
    handleAddAccettazione,
    handleDeleteAccettazione,
    handleUpdateAccettazione,
    handleEmitNewRevision,
    handleUpdateOperators,
    handleUpdateReagentiRitirati,
    handleSyncLocalData,
    handleUpdatePratiche,
    handleRestoreDefaults,

    // Computed
    totaleClienti,
    fatturatoTotale,
    fatturatoMedio,
    topCategories,
    latestClients,
    reagentsNearExpiry,
    hasAccessTo
  };
}
