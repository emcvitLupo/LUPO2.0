import { useState, useEffect } from 'react';
import { 
  Client, 
  Prova, 
  Pacchetto, 
  Preventivo, 
  Reagente, 
  ReagenteRitirato, 
  AccettazioneCampione, 
  RevisioneRDP,
  Operator, 
  PraticaFatturazione, 
  AuditLog,
  Strumento
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
  fetchStrumentiFromSupabase,
  insertStrumentoToSupabase,
  updateStrumentoInSupabase,
  deleteStrumentoFromSupabase,
  fetchAndMergeLimsSettingsFromSupabase,
  installLocalStorageCloudBridge,
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
import { sanitizeOperatorsList } from '../utils/operatorSanitizer';
import { isOfferExpired, NavigationEntry, SECTION_LABELS } from '../utils/limsHelpers';

const isOfferExpiredApp = isOfferExpired;

const sanitizeClient = (c: any): Client => {
  if (!c) {
    return {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      denominazione: 'Cliente Non Denominato',
      partitaIva: '',
      email: '',
      telefono: '',
      indirizzo: '',
      fatturatoAnnuo: {},
      categorieFatturato: {}
    };
  }
  return {
    ...c,
    denominazione: c.denominazione || `${c.cognome || ''} ${c.nome || ''}`.trim() || 'Cliente Senza Nome',
    partitaIva: c.partitaIva || '',
    email: c.email || '',
    telefono: c.telefono || '',
    indirizzo: c.indirizzo || '',
    fatturatoAnnuo: c.fatturatoAnnuo || {},
    categorieFatturato: c.categorieFatturato || {}
  };
};

export function useAppData() {
  // Caricamento stati con persistenza localStorage
  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const saved = localStorage.getItem('lab_clients');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(Boolean).map(sanitizeClient);
        }
      }
    } catch (e) {}
    return INITIAL_CLIENTS.map(sanitizeClient);
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
    const sanitized = sanitizeOperatorsList(parsed);
    if (saved && JSON.stringify(sanitized) !== saved) {
      localStorage.setItem('lab_operators', JSON.stringify(sanitized));
    }
    return sanitized;
  });

  const [praticheFatturazione, setPraticheFatturazione] = useState<PraticaFatturazione[]>(() => {
    const saved = localStorage.getItem('lab_pratiche_fatturazione');
    return saved ? JSON.parse(saved) : INITIAL_PRATICHE_FATTURAZIONE;
  });

  const [strumenti, setStrumenti] = useState<Strumento[]>(() => {
    const saved = localStorage.getItem('lab_strumenti');
    return saved ? JSON.parse(saved) : [];
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('lab_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [supabaseStatus, setSupabaseStatus] = useState<'idle' | 'loading' | 'connected' | 'error' | 'not_configured'>('idle');
  const [supabaseErrorMsg, setSupabaseErrorMsg] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'utente' | null>(() => {
    try {
      const saved = localStorage.getItem('lims_local_auth_session');
      if (saved) return JSON.parse(saved).userRole || null;
    } catch {}
    return null;
  });
  const [actualRole, setActualRole] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('lims_local_auth_session');
      if (saved) return JSON.parse(saved).actualRole || null;
    } catch {}
    return null;
  });
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('lims_local_auth_session');
      if (saved) return JSON.parse(saved).currentUser || null;
    } catch {}
    return null;
  });
  const [userProfileName, setUserProfileName] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('lims_local_auth_session');
      if (saved) return JSON.parse(saved).userProfileName || null;
    } catch {}
    return null;
  });
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

  const [navigationHistory, setNavigationHistory] = useState<NavigationEntry[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProvaId, setSelectedProvaId] = useState<string | null>(null);
  const [selectedPreventivoId, setSelectedPreventivoId] = useState<string | null>(null);
  const [pendingQuoteClientId, setPendingQuoteClientId] = useState<string | null>(null);
  const [preventiviInitialSubTab, setPreventiviInitialSubTab] = useState<'preventivi' | 'pacchetti' | null>(null);
  const [selectedAccettazioneId, setSelectedAccettazioneId] = useState<string | null>(null);
  const [pendingAccettazionePreventivoId, setPendingAccettazionePreventivoId] = useState<string | null>(null);
  const [pendingAccettazioneClientId, setPendingAccettazioneClientId] = useState<string | null>(null);
  const [pendingAreeSpecTarget, setPendingAreeSpecTarget] = useState<{ sampleId: string; module: 'nutrizionale' | 'rifiuti' } | null>(null);
  const [pendingFatturazioneQuery, setPendingFatturazioneQuery] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showRestoreModal, setShowRestoreModal] = useState<boolean>(false);
  const [showBackupModal, setShowBackupModal] = useState<boolean>(false);

  const buildCurrentContextSnapshot = (customLabel?: string): NavigationEntry => {
    let computedLabel = customLabel || SECTION_LABELS[activeTab] || activeTab;
    if (!customLabel) {
      if (activeTab === 'clienti' && selectedClientId) {
        const c = clients.find(x => x.id === selectedClientId);
        if (c) computedLabel = `Clienti — ${c.denominazione}`;
      } else if (activeTab === 'preventivi' && selectedPreventivoId) {
        const p = preventivi.find(x => x.id === selectedPreventivoId || x.codice === selectedPreventivoId);
        if (p) computedLabel = `Preventivo ${p.codice}`;
      } else if (activeTab === 'accettazione' && selectedAccettazioneId) {
        const a = accettazioni.find(x => x.id === selectedAccettazioneId || x.codiceAccettazione === selectedAccettazioneId);
        if (a) computedLabel = `Campione ${a.codiceAccettazione}`;
      } else if (activeTab === 'prove' && selectedProvaId) {
        const pr = prove.find(x => x.id === selectedProvaId);
        if (pr) computedLabel = `Prova — ${pr.nome}`;
      }
    }
    return {
      tab: activeTab,
      label: computedLabel,
      context: {
        clientId: selectedClientId,
        preventivoId: selectedPreventivoId,
        accettazioneId: selectedAccettazioneId,
        provaId: selectedProvaId,
        praticaSearchQuery: pendingFatturazioneQuery,
      },
      timestamp: Date.now(),
    };
  };

  const pushNavigationSnapshot = (customFromLabel?: string) => {
    const snap = buildCurrentContextSnapshot(customFromLabel);
    setNavigationHistory(prev => {
      const last = prev[prev.length - 1];
      if (last && last.tab === snap.tab && last.label === snap.label) {
        return prev;
      }
      return [...prev.slice(-9), snap];
    });
  };

  const setActiveTab = (tab: string, options?: { skipHistory?: boolean; fromLabel?: string }) => {
    if (tab !== activeTab && !options?.skipHistory) {
      pushNavigationSnapshot(options?.fromLabel);
    }
    setActiveTabState(tab);
    try {
      localStorage.setItem('lims_active_tab', tab);
    } catch (e) {
      console.error('Error saving active tab to localStorage', e);
    }
  };

  const restoreNavigationEntry = (entry: NavigationEntry) => {
    setActiveTabState(entry.tab);
    try {
      localStorage.setItem('lims_active_tab', entry.tab);
    } catch {}
    if (entry.context) {
      if (entry.tab === 'clienti' && entry.context.clientId !== undefined) {
        setSelectedClientId(entry.context.clientId || null);
      }
      if (entry.tab === 'preventivi' && entry.context.preventivoId !== undefined) {
        setSelectedPreventivoId(entry.context.preventivoId || null);
      }
      if (entry.tab === 'accettazione' && entry.context.accettazioneId !== undefined) {
        setSelectedAccettazioneId(entry.context.accettazioneId || null);
      }
      if (entry.tab === 'prove' && entry.context.provaId !== undefined) {
        setSelectedProvaId(entry.context.provaId || null);
      }
      if (entry.tab === 'fatturazione' && entry.context.praticaSearchQuery !== undefined) {
        setPendingFatturazioneQuery(entry.context.praticaSearchQuery || null);
      }
    }
  };

  const handleNavigateBack = () => {
    setNavigationHistory(prev => {
      if (prev.length === 0) return prev;
      const target = prev[prev.length - 1];
      restoreNavigationEntry(target);
      return prev.slice(0, -1);
    });
  };

  const handleJumpToHistoryIndex = (index: number) => {
    setNavigationHistory(prev => {
      if (index < 0 || index >= prev.length) return prev;
      const target = prev[index];
      restoreNavigationEntry(target);
      return prev.slice(0, index);
    });
  };

  const handleClearNavigationHistory = () => {
    setNavigationHistory([]);
  };

  // Revisioni RDP
  const [revisioneSelectedAccId, setRevisioneSelectedAccId] = useState<string>('');
  const [revisioneMotivoInput, setRevisioneMotivoInput] = useState<string>('');
  const [revisioneTipologiaInput, setRevisioneTipologiaInput] = useState<string>('Errore materiale / battitura');
  const [revisioneOperatore, setRevisioneOperatore] = useState<string>('');
  const [revisioneSuccessMessage, setRevisioneSuccessMessage] = useState<string | null>(null);
  const [diffModalOpen, setDiffModalOpen] = useState<boolean>(false);
  const [diffAccId, setDiffAccId] = useState<string | null>(null);
  const [diffSnapshot, setDiffSnapshot] = useState<RevisioneRDP | null>(null);

  const applyLocalAuthenticatedSession = (emailStr: string, displayName?: string) => {
    const cleanEmail = (emailStr || '').toLowerCase().trim();
    const isCarmine = cleanEmail.includes('carmine') && (cleanEmail.includes('marroccella') || cleanEmail.includes('marrocella'));
    const isAmministrazione = cleanEmail.includes('amministrazione');

    const matchedOp = operators.find(o => {
      if (o.email && o.email.toLowerCase().trim() === cleanEmail) return true;
      if (isCarmine && (o.nome || '').toLowerCase().includes('carmine')) return true;
      return false;
    });

    const roleStr = isCarmine
      ? 'ADMIN'
      : isAmministrazione
      ? 'AM'
      : matchedOp?.isResponsabileTecnico
      ? 'RT'
      : 'UTENTE';
    const uRole: 'admin' | 'utente' = ['ADMIN', 'AM', 'RT', 'VRT'].includes(roleStr) ? 'admin' : 'utente';
    const uName = displayName || matchedOp?.nome || (isCarmine ? 'Dott. Carmine E. Marroccella' : cleanEmail.split('@')[0]);
    const userObj = { id: 'local_' + cleanEmail, email: cleanEmail, isLocalAuth: true };

    setCurrentUser(userObj);
    setActualRole(roleStr);
    setUserRole(uRole);
    setUserProfileName(uName);

    try {
      localStorage.setItem('lims_local_auth_session', JSON.stringify({
        currentUser: userObj,
        actualRole: roleStr,
        userRole: uRole,
        userProfileName: uName
      }));
    } catch {}
  };

  const fetchUserRole = async () => {
    try {
      const savedLocalSession = localStorage.getItem('lims_local_auth_session');
      if (savedLocalSession) {
        const parsed = JSON.parse(savedLocalSession);
        if (parsed?.currentUser?.email) {
          setCurrentUser(parsed.currentUser);
          setActualRole(parsed.actualRole || 'ADMIN');
          setUserRole(parsed.userRole || 'admin');
          setUserProfileName(parsed.userProfileName || null);
          return;
        }
      }
    } catch {}

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

      const cleanEmail = (user.email || '').toLowerCase().trim();
      const isCarmine = cleanEmail.includes('carmine') && (cleanEmail.includes('marroccella') || cleanEmail.includes('marrocella'));
      const isAmministrazione = cleanEmail.includes('amministrazione');

      let roleStr = isCarmine ? 'ADMIN' : (isAmministrazione ? 'AM' : 'UTENTE');
      
      try {
        let { data, error } = await supabase
          .from('profili')
          .select('ruolo, nome')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          console.log(`Profilo non trovato o errore. Tento la creazione automatica come ${roleStr}...`, error);
          const defaultProfile = {
            id: user.id,
            email: user.email,
            nome: user.email?.split('@')[0] || (isAmministrazione ? 'Amministrazione' : 'Operatore'),
            ruolo: roleStr
          };
          
          const { data: upsertData, error: upsertError } = await supabase
            .from('profili')
            .upsert([defaultProfile])
            .select('ruolo, nome')
            .single();

          if (upsertError) {
            console.error("Errore durante la creazione automatica del profilo in 'profili':", upsertError);
          } else if (upsertData) {
            console.log(`Profilo ${roleStr} creato con successo!`);
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

      // Garanzia ruoli in base all'identità
      if (isCarmine) {
        roleStr = 'ADMIN';
      } else if (isAmministrazione && roleStr === 'ADMIN') {
        // Se il profilo era stato precedentemente censito come ADMIN per errore, correggilo a 'AM'
        roleStr = 'AM';
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
    try {
      localStorage.removeItem('lims_local_auth_session');
    } catch {}
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Avviso signOut Supabase:", err);
      }
    }
    setCurrentUser(null);
    setUserRole(null);
    setActualRole(null);
    setUserProfileName(null);
    alert("Disconnessione effettuata con successo!");
  };

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        fetchUserRole();
      } else {
        try {
          if (localStorage.getItem('lims_local_auth_session')) return;
        } catch {}
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
    installLocalStorageCloudBridge();
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
              auditLogs,
              strumenti
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
        const sanitized = (fetchedClientsList || []).filter(Boolean).map(sanitizeClient);
        setClients(sanitized);
        localStorage.setItem('lab_clients', JSON.stringify(sanitized));
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

      // 7. Fetch Accettazioni (con recupero automatico dei campi locali salvati prima dell'aggiornamento SQL)
      try {
        const fetched = await fetchAccettazioniFromSupabase();
        const savedLocalAcc = localStorage.getItem('lab_accettazioni');
        let mergedAcc = fetched;
        const toPushBackAcc: AccettazioneCampione[] = [];
        if (savedLocalAcc) {
          try {
            const localAccList = JSON.parse(savedLocalAcc);
            if (Array.isArray(localAccList)) {
              mergedAcc = fetched.map(fAcc => {
                const localMatch = localAccList.find((l: any) => l.id === fAcc.id);
                if (!localMatch) return fAcc;
                const needsNutri = !fAcc.datiEtichettaNutrizionale && localMatch.datiEtichettaNutrizionale;
                const needsRifiuti = !fAcc.datiClassificazioneRifiuto && localMatch.datiClassificazioneRifiuto;
                const needsRevState = (!fAcc.statoRevisione && localMatch.statoRevisione) || (!fAcc.tipologiaRevisione && localMatch.tipologiaRevisione);
                if (needsNutri || needsRifiuti || needsRevState) {
                  const combined: AccettazioneCampione = {
                    ...fAcc,
                    datiEtichettaNutrizionale: fAcc.datiEtichettaNutrizionale || localMatch.datiEtichettaNutrizionale,
                    datiClassificazioneRifiuto: fAcc.datiClassificazioneRifiuto || localMatch.datiClassificazioneRifiuto,
                    statoRevisione: fAcc.statoRevisione || localMatch.statoRevisione,
                    tipologiaRevisione: fAcc.tipologiaRevisione || localMatch.tipologiaRevisione,
                    isLocked: fAcc.isLocked !== undefined ? fAcc.isLocked : localMatch.isLocked,
                    proveSelezionateDaPreventivo: fAcc.proveSelezionateDaPreventivo || localMatch.proveSelezionateDaPreventivo
                  };
                  toPushBackAcc.push(combined);
                  return combined;
                }
                return fAcc;
              });
            }
          } catch (e) {}
        }
        setAccettazioni(mergedAcc);
        localStorage.setItem('lab_accettazioni', JSON.stringify(mergedAcc));
        for (const item of toPushBackAcc) {
          updateAccettazioneInSupabase(item).catch(e => console.warn('Auto-sync accettazione extra fields:', e));
        }
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

      // 8. Fetch Operatori (senza reinserire operatori fantasma/eliminati da localStorage quando il DB Cloud è popolato)
      try {
        const fetched = await fetchOperatorsFromSupabase();
        const savedLocal = localStorage.getItem('lab_operators');
        let finalOperators = fetched;
        if (savedLocal) {
          try {
            const localOps = JSON.parse(savedLocal);
            if (Array.isArray(localOps)) {
              if (fetched.length > 0) {
                finalOperators = fetched.map(fOp => {
                  const fKey = (fOp.nome || '').toLowerCase().replace(/\s+/g, ' ').trim();
                  const match = localOps.find(
                    (l: any) => (l?.nome || '').toLowerCase().replace(/\s+/g, ' ').trim() === fKey
                  );
                  return {
                    ...fOp,
                    areeCompetenza:
                      fOp.areeCompetenza && fOp.areeCompetenza.length > 0
                        ? fOp.areeCompetenza
                        : match?.areeCompetenza || [],
                    email: fOp.email || match?.email
                  };
                });
              } else {
                finalOperators = localOps;
              }
            }
          } catch (e) {}
        }
        const sanitized = sanitizeOperatorsList(finalOperators);
        setOperators(sanitized);
        localStorage.setItem('lab_operators', JSON.stringify(sanitized));
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

      // 9. Fetch Pratiche Fatturazione (con recupero automatico di protocollo RdP e C.F. locali)
      try {
        const fetched = await fetchPraticheFromSupabase();
        const savedLocalPrat = localStorage.getItem('lab_pratiche_fatturazione');
        let mergedPrat = fetched;
        const toPushBackPrat: PraticaFatturazione[] = [];
        if (savedLocalPrat) {
          try {
            const localPratList = JSON.parse(savedLocalPrat);
            if (Array.isArray(localPratList)) {
              mergedPrat = fetched.map(fPrat => {
                const localMatch = localPratList.find((l: any) => l.id === fPrat.id);
                if (!localMatch) return fPrat;
                const needsRdp = (!fPrat.numeroProtocolloRdP && localMatch.numeroProtocolloRdP) || (!fPrat.dataInvioRdP && localMatch.dataInvioRdP);
                const needsCf = !fPrat.codiceFiscale && localMatch.codiceFiscale;
                const needsAnnull = (!fPrat.motivoAnnullamento && localMatch.motivoAnnullamento) ||
                  (!fPrat.operatoreAnnullamento && localMatch.operatoreAnnullamento) ||
                  (!fPrat.dataAnnullamento && localMatch.dataAnnullamento) ||
                  (!fPrat.fatturaPrecedenteAnnullata && localMatch.fatturaPrecedenteAnnullata);
                if (needsRdp || needsCf || needsAnnull) {
                  const combined: PraticaFatturazione = {
                    ...fPrat,
                    numeroProtocolloRdP: fPrat.numeroProtocolloRdP || localMatch.numeroProtocolloRdP,
                    dataInvioRdP: fPrat.dataInvioRdP || localMatch.dataInvioRdP,
                    codiceFiscale: fPrat.codiceFiscale || localMatch.codiceFiscale,
                    motivoAnnullamento: fPrat.motivoAnnullamento || localMatch.motivoAnnullamento,
                    operatoreAnnullamento: fPrat.operatoreAnnullamento || localMatch.operatoreAnnullamento,
                    dataAnnullamento: fPrat.dataAnnullamento || localMatch.dataAnnullamento,
                    fatturaPrecedenteAnnullata: fPrat.fatturaPrecedenteAnnullata || localMatch.fatturaPrecedenteAnnullata
                  };
                  toPushBackPrat.push(combined);
                  return combined;
                }
                return fPrat;
              });
            }
          } catch (e) {}
        }
        setPraticheFatturazione(mergedPrat);
        localStorage.setItem('lab_pratiche_fatturazione', JSON.stringify(mergedPrat));
        for (const item of toPushBackPrat) {
          updatePraticaInSupabase(item).catch(e => console.warn('Auto-sync pratica extra fields:', e));
        }
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

      // 9b. Fetch Strumenti (Anagrafe Strumentazione ISO/IEC 17025)
      try {
        const fetchedStrumenti = await fetchStrumentiFromSupabase();
        if (fetchedStrumenti.length > 0) {
          setStrumenti(fetchedStrumenti);
          localStorage.setItem('lab_strumenti', JSON.stringify(fetchedStrumenti));
        } else if (strumenti.length > 0) {
          for (const s of strumenti) {
            updateStrumentoInSupabase(s).catch(e => console.warn('Auto-sync strumento to Supabase:', e));
          }
        }
      } catch (err: any) {
        console.warn('Avviso caricamento tabella strumenti (potrebbe non essere ancora presente):', err);
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
        await fetchAndMergeLimsSettingsFromSupabase();
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

  const handleGoToClient = (clientId: string, fromContextLabel?: string) => {
    setSelectedClientId(clientId);
    setActiveTab('clienti', { fromLabel: fromContextLabel });
  };

  const handleGoToProva = (id: string, fromContextLabel?: string) => {
    setSelectedProvaId(id);
    setActiveTab('prove', { fromLabel: fromContextLabel });
  };

  const handleGoToPreventivo = (id: string, fromContextLabel?: string) => {
    setSelectedPreventivoId(id);
    setPreventiviInitialSubTab('preventivi');
    setActiveTab('preventivi', { fromLabel: fromContextLabel });
  };

  const handleGoToPacchetti = (fromContextLabel?: string) => {
    setPreventiviInitialSubTab('pacchetti');
    setActiveTab('preventivi', { fromLabel: fromContextLabel || 'Prove & Tariffario' });
  };

  const handleCreatePreventivoForClient = (clientId: string, fromContextLabel?: string) => {
    const cl = clients.find(c => c.id === clientId);
    setPendingQuoteClientId(clientId);
    setPreventiviInitialSubTab('preventivi');
    setActiveTab('preventivi', { fromLabel: fromContextLabel || (cl ? `Scheda Cliente: ${cl.denominazione}` : 'Clienti') });
  };

  const handleGoToAccettazione = (accIdOrCode: string, fromContextLabel?: string) => {
    const found = accettazioni.find(
      a => a.id === accIdOrCode || a.codiceAccettazione.trim().toLowerCase() === accIdOrCode.trim().toLowerCase()
    );
    setSelectedAccettazioneId(found ? found.id : accIdOrCode);
    setActiveTab('accettazione', { fromLabel: fromContextLabel });
  };

  const handleCreateAccettazioneFromPreventivo = (preventivoId: string) => {
    const prevObj = preventivi.find(p => p.id === preventivoId);
    setPendingAccettazionePreventivoId(preventivoId);
    setActiveTab('accettazione', { fromLabel: prevObj ? `Preventivo ${prevObj.codice}` : 'Preventivi' });
  };

  const handleCreateAccettazioneForClient = (clientId: string, fromContextLabel?: string) => {
    const cl = clients.find(c => c.id === clientId);
    setPendingAccettazioneClientId(clientId);
    setActiveTab('accettazione', { fromLabel: fromContextLabel || (cl ? `Scheda Cliente: ${cl.denominazione}` : 'Clienti') });
  };

  const handleGoToAreeSpecialistiche = (
    sampleId: string,
    module?: 'nutrizionale' | 'rifiuti',
    fromContextLabel?: string
  ) => {
    const acc = accettazioni.find(a => a.id === sampleId);
    let resolvedModule: 'nutrizionale' | 'rifiuti' = module || 'nutrizionale';
    if (!module && acc) {
      const text = `${acc.categoriaMerceologica || ''} ${acc.matrice || ''} ${acc.descrizioneCampione || ''}`.toLowerCase();
      if (acc.datiClassificazioneRifiuto || /rifiut|cer|eer|scavo|fango|demolizione|eluat/.test(text)) {
        resolvedModule = 'rifiuti';
      } else {
        resolvedModule = 'nutrizionale';
      }
    }
    setPendingAreeSpecTarget({ sampleId, module: resolvedModule });
    setActiveTab('areeSpecialistiche', {
      fromLabel: fromContextLabel || (acc ? `Campione ${acc.codiceAccettazione}` : 'Accettazione'),
    });
  };

  const handleGoToFatturazione = (queryFilter?: string, fromContextLabel?: string) => {
    if (queryFilter !== undefined) {
      setPendingFatturazioneQuery(queryFilter);
    }
    setActiveTab('fatturazione', { fromLabel: fromContextLabel });
  };

  // HANDLERS CLIENTS
  const handleAddClient = async (newClient: Client) => {
    const clean = sanitizeClient(newClient);
    setClients(prev => {
      const idx = prev.findIndex(c => c.id === clean.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = clean;
        return copy;
      }
      return [...prev, clean];
    });

    handleAddAuditLogEntry(
      userProfileName || 'Sistema',
      'Clienti',
      'Creazione/Registrazione Anagrafica',
      '-',
      `${clean.denominazione} (P.IVA: ${clean.partitaIva})`
    );

    if (isSupabaseConfigured) {
      try {
        await insertClientToSupabase(clean);
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
    const clean = sanitizeClient(updatedClient);
    const old = clients.find(c => c.id === clean.id);
    setClients(prev => prev.map(c => c.id === clean.id ? clean : c));

    handleAddAuditLogEntry(
      userProfileName || 'Sistema',
      'Clienti',
      'Modifica Anagrafica',
      old ? old.denominazione : '-',
      clean.denominazione
    );

    if (isSupabaseConfigured) {
      try {
        await updateClientInSupabase(clean);
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

    // Sincronizza automaticamente l'importo nelle pratiche di fatturazione ("Da fatturare") collegate a questo preventivo
    const updatedPraticheToSync: PraticaFatturazione[] = [];
    setPraticheFatturazione(prevPratiche => {
      let changed = false;
      const next = prevPratiche.map(prat => {
        if (prat.statoFatturazione === 'Fatturato' || prat.statoFatturazione === 'Annullato') return prat;
        const linkedAcc = accettazioni.find(a => a.codiceAccettazione === prat.numeroCampione);
        const matchesQuote =
          (linkedAcc && linkedAcc.preventivoAssociatoId === newPrev.id) ||
          (prat.numeroPreventivo && prat.numeroPreventivo.trim().toLowerCase() === newPrev.codice.trim().toLowerCase());
        if (!matchesQuote) return prat;

        const recalculatedImporto = linkedAcc
          ? computeImportoCampione(linkedAcc, newPrev)
          : Number((newPrev.totale || 0).toFixed(2));

        if (prat.importo !== recalculatedImporto || prat.numeroPreventivo !== newPrev.codice) {
          changed = true;
          const updatedPrat: PraticaFatturazione = {
            ...prat,
            numeroPreventivo: newPrev.codice,
            importo: recalculatedImporto
          };
          updatedPraticheToSync.push(updatedPrat);
          return updatedPrat;
        }
        return prat;
      });
      return changed ? next : prevPratiche;
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
      for (const upPrat of updatedPraticheToSync) {
        updatePraticaInSupabase(upPrat).catch(err =>
          console.warn('Errore aggiornamento automatico importo pratica da preventivo:', err)
        );
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

  // Helper per calcolare l'importo effettivo del campione in base alle prove selezionate dal preventivo o da listino diretto
  const computeImportoCampione = (acc: AccettazioneCampione, prevObj?: Preventivo): number => {
    if (acc.modalitaAccettazione === 'uso_interno') return 0;

    if (!prevObj) {
      // Calcolo da Listino Diretto (Senza Preventivo)
      let totalDirect = 0;
      const coveredProveIds = new Set<string>();

      if (acc.pacchettiDirettiSelezionati && acc.pacchettiDirettiSelezionati.length > 0) {
        acc.pacchettiDirettiSelezionati.forEach(packId => {
          const pack = pacchetti.find(x => x.id === packId);
          if (pack) {
            const hasActiveTests = !acc.proveSelezionateDaPreventivo || pack.proveIds.some(pid => acc.proveSelezionateDaPreventivo?.includes(pid));
            if (hasActiveTests) {
              totalDirect += (pack.prezzoScontato || 0);
              pack.proveIds.forEach(pid => coveredProveIds.add(pid));
            }
          }
        });
      }

      const activeTestIds = acc.proveSelezionateDaPreventivo && acc.proveSelezionateDaPreventivo.length > 0
        ? acc.proveSelezionateDaPreventivo
        : (acc.risultatiAnalisi?.map(r => r.provaId) || []);

      activeTestIds.forEach(pid => {
        if (!coveredProveIds.has(pid)) {
          const pr = prove.find(x => x.id === pid);
          if (pr) {
            totalDirect += (pr.prezzoListino || 0);
          }
        }
      });

      return Number(totalDirect.toFixed(2));
    }

    if (prevObj.isTotaleManualeForfait) {
      return Number(((prevObj.totaleManualeForfait !== undefined ? prevObj.totaleManualeForfait : prevObj.totale) || 0).toFixed(2));
    }

    if (!acc.proveSelezionateDaPreventivo || acc.proveSelezionateDaPreventivo.length === 0) {
      return Number((prevObj.totale || 0).toFixed(2));
    }

    const nonOptIds = new Set<string>();
    const optIds = new Set<string>();
    prevObj.proveSelezionate?.forEach(item => {
      if (item.opzionale) optIds.add(item.provaId);
      else nonOptIds.add(item.provaId);
    });
    prevObj.pacchettiSelezionati?.forEach(item => {
      const pack = pacchetti.find(x => x.id === item.pacchettoId);
      pack?.proveIds?.forEach(pid => {
        if (item.opzionale) optIds.add(pid);
        else nonOptIds.add(pid);
      });
    });

    const allNonOptSelected = nonOptIds.size > 0 && Array.from(nonOptIds).every(id => acc.proveSelezionateDaPreventivo?.includes(id));
    const anyOptSelected = Array.from(optIds).some(id => !nonOptIds.has(id) && acc.proveSelezionateDaPreventivo?.includes(id));
    if (allNonOptSelected && !anyOptSelected) {
      return Number((prevObj.totale || 0).toFixed(2));
    }

    let total = 0;
    prevObj.proveSelezionate?.forEach(item => {
      if (acc.proveSelezionateDaPreventivo?.includes(item.provaId)) {
        total += (item.prezzoApplicato * item.quantita);
      }
    });
    prevObj.pacchettiSelezionati?.forEach(item => {
      const pack = pacchetti.find(x => x.id === item.pacchettoId);
      if (pack && pack.proveIds.some(pid => acc.proveSelezionateDaPreventivo?.includes(pid))) {
        total += (item.prezzoApplicato * item.quantita);
      }
    });
    if (prevObj.scontoPercentuale) {
      total = total - (total * prevObj.scontoPercentuale / 100);
    }
    return Number(total.toFixed(2));
  };

  // HANDLERS ACCETTAZIONE
  const handleAddAccettazione = async (newAcc: AccettazioneCampione) => {
    setAccettazioni(prev => [...prev, newAcc]);

    const isUsoInterno = newAcc.modalitaAccettazione === 'uso_interno';
    const client = clients.find(c => c.id === newAcc.destinatarioFatturaClienteId);
    const preventivo = preventivi.find(p => p.id === newAcc.preventivoAssociatoId);
    const computedImporto = computeImportoCampione(newAcc, preventivo);

    if (!isUsoInterno && newAcc.preventivoAssociatoId && newAcc.preventivoAssociatoId.trim() !== '') {
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
          `Preventivo ${foundQuote.codice} approvato automaticamente all'accettazione del campione (${newAcc.codiceAccettazione})`
        );
      }
    }

    let newPratica: PraticaFatturazione | null = null;
    if (!isUsoInterno) {
      newPratica = {
        id: 'prat_' + Date.now(),
        numeroCampione: newAcc.codiceAccettazione,
        clienteId: newAcc.destinatarioFatturaClienteId,
        nomeCliente: client ? client.denominazione : 'Cliente Sconosciuto',
        partitaIva: client ? client.partitaIva : '',
        codiceFiscale: client ? client.codiceFiscale : '',
        numeroPreventivo: preventivo ? preventivo.codice : 'Da Listino (Senza Preventivo)',
        dataAccettazione: newAcc.dataAccettazione,
        importo: computedImporto,
        statoFatturazione: 'Da fatturare',
        numeroFattura: '',
        dataFattura: '',
        note: newAcc.noteLab || ''
      };
      setPraticheFatturazione(prev => [...prev, newPratica!]);
    }

    if (isSupabaseConfigured) {
      try {
        await insertAccettazioneToSupabase(newAcc);
      } catch (error: any) {
        console.error('Error writing accettazione to Supabase:', error);
        alert(`Errore di salvataggio "Accettazione" su Supabase:\n${formatSupabaseError(error)}`);
      }
      if (newPratica) {
        try {
          await insertPraticaToSupabase(newPratica);
        } catch (error: any) {
          console.error('Error writing practice to Supabase:', error);
          alert(`Errore di salvataggio "Pratica Fatturazione" su Supabase:\n${formatSupabaseError(error)}`);
        }
      }
    }

    handleAddAuditLogEntry(
      newAcc.operatorRegistrazione || 'Sistema',
      'Accettazione',
      'Creazione Campione',
      '-',
      isUsoInterno
        ? `Campione ${newAcc.codiceAccettazione} registrato (Uso Interno / Ring Test - Non Fatturabile)`
        : `Campione ${newAcc.codiceAccettazione} registrato e inviato a fatturazione (${preventivo ? preventivo.codice : 'Da Listino'})`
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

    // Se al campione viene collegato un preventivo ancora "In Approvazione", lo approviamo automaticamente
    if (updatedAcc.preventivoAssociatoId && updatedAcc.preventivoAssociatoId.trim() !== '') {
      const foundQuote = preventivi.find(p => p.id === updatedAcc.preventivoAssociatoId);
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
          operatore: updatedAcc.operatorRegistrazione || 'Sistema (Accettazione - Modifica Campione)'
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
            console.error('Error auto-updating preventivo to Approvato in Supabase on updateAccettazione:', error);
          }
        }

        handleAddAuditLogEntry(
          updatedAcc.operatorRegistrazione || 'Sistema',
          'Preventivi',
          'Approvazione Automatica',
          foundQuote.codice,
          `Preventivo ${foundQuote.codice} approvato automaticamente al collegamento con il campione (${updatedAcc.codiceAccettazione})`
        );
      }
    }

    let resolvedPractice: PraticaFatturazione | null = null;
    let practiceIdToDelete: string | null = null;
    const isUsoInterno = updatedAcc.modalitaAccettazione === 'uso_interno';

    setPraticheFatturazione(prev => {
      const idx = prev.findIndex(p => p.numeroCampione === updatedAcc.codiceAccettazione);

      if (isUsoInterno) {
        if (idx > -1 && prev[idx].statoFatturazione !== 'Fatturato' && prev[idx].statoFatturazione !== 'Annullato') {
          practiceIdToDelete = prev[idx].id;
          return prev.filter((_, i) => i !== idx);
        }
        return prev;
      }

      const client = clients.find(c => c.id === updatedAcc.destinatarioFatturaClienteId);
      const preventivo = preventivi.find(p => p.id === updatedAcc.preventivoAssociatoId);
      const computedImporto = computeImportoCampione(updatedAcc, preventivo);

      const fieldsToUpdate = {
        clienteId: updatedAcc.destinatarioFatturaClienteId,
        nomeCliente: client ? client.denominazione : 'Cliente Sconosciuto',
        partitaIva: client ? client.partitaIva : '',
        codiceFiscale: client ? client.codiceFiscale : '',
        numeroPreventivo: preventivo ? preventivo.codice : 'Da Listino (Senza Preventivo)',
        dataAccettazione: updatedAcc.dataAccettazione,
        importo: computedImporto
      };

      if (idx > -1) {
        const copy = [...prev];
        const isLockedPratica = copy[idx].statoFatturazione === 'Fatturato' || copy[idx].statoFatturazione === 'Annullato';
        copy[idx] = {
          ...copy[idx],
          ...fieldsToUpdate,
          // Pratiche già fatturate o annullate: l'importo registrato non viene alterato da modifiche al campione
          importo: isLockedPratica ? copy[idx].importo : fieldsToUpdate.importo,
          // Preserva le note amministrative già registrate sulla pratica (es. estremi fattura XML, CIG, note incasso)
          note: copy[idx].note ? copy[idx].note : (updatedAcc.noteLab || '')
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
          note: updatedAcc.noteLab || '',
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
      if (practiceIdToDelete) {
        try {
          await deletePraticaFromSupabase(practiceIdToDelete);
        } catch (err) {
          console.error('Error deleting practice from Supabase:', err);
        }
      } else if (resolvedPractice) {
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

  const handleStartRevisionBozza = (accettazioneId: string, motivo: string, tipologia: string, operatore: string) => {
    const acc = accettazioni.find(a => a.id === accettazioneId);
    if (!acc) return;

    // Se è già in bozza di revisione, aggiorniamo solo motivo/tipologia/operatore senza creare uno snapshot duplicato o incrementare il numero di revisione
    if (acc.statoRevisione === 'In Bozza') {
      const accAggiornataBozza: AccettazioneCampione = {
        ...acc,
        revisioneMotivo: motivo || acc.revisioneMotivo,
        tipologiaRevisione: tipologia || acc.tipologiaRevisione,
        isLocked: false,
      };
      handleUpdateAccettazione(accAggiornataBozza);
      return;
    }

    const numeroRevisioneCorrente = acc.revisioneCorrente || 0;
    const nuovaRevisioneNumero = numeroRevisioneCorrente + 1;

    const snapshot: RevisioneRDP = {
      id: `rev-${acc.id}-${Date.now()}`,
      numeroRevisione: numeroRevisioneCorrente,
      dataOraEmissione: acc.dataRevisione || acc.dataTermineProva || acc.dataAccettazione,
      operatoreEmissione: acc.firmatarioTecnico || operatore || 'Dott. Chim. F. Lupo',
      motivoRevisione: acc.revisioneMotivo || 'Emissione Originale (Rev. 00)',
      tipologiaRevisione: acc.tipologiaRevisione || 'Emissione Originale',
      stato: 'Annullata e Sostituita',
      
      descrizioneCampione: acc.descrizioneCampione,
      matrice: acc.matrice,
      quantitaCampione: acc.quantitaCampione,
      temperaturaArrivo: acc.temperaturaArrivo,
      statoInArrivo: acc.statoInArrivo,
      dataPrelievo: acc.dataPrelievo,
      oraPrelievo: acc.oraPrelievo,
      puntoPrelievo: acc.puntoPrelievo,
      comunePrelievo: acc.comunePrelievo,
      campionatoDa: acc.campionatoDa,
      proceduraCampionamento: acc.proceduraCampionamento,
      dataInizioProva: acc.dataInizioProva,
      dataTermineProva: acc.dataTermineProva,
      risultatiAnalisi: acc.risultatiAnalisi ? JSON.parse(JSON.stringify(acc.risultatiAnalisi)) : [],
      dichiarazioneConformita: acc.dichiarazioneConformita || '',
      opinioniInterpretazioni: acc.opinioniInterpretazioni || '',
      nota1: acc.nota1 || '',
      nota2: acc.nota2 || '',
      firmatarioReparto1: acc.firmatarioReparto1 || '',
      firmatarioReparto2: acc.firmatarioReparto2 || '',
      firmatarioTecnico: acc.firmatarioTecnico || '',
      ruoloFirmatarioTecnico: acc.ruoloFirmatarioTecnico || '',
    };

    const storicoAggiornato = acc.storicoRevisioni ? [...acc.storicoRevisioni, snapshot] : [snapshot];

    const accAggiornata: AccettazioneCampione = {
      ...acc,
      revisioneCorrente: nuovaRevisioneNumero,
      revisioneMotivo: motivo,
      tipologiaRevisione: tipologia,
      statoRevisione: 'In Bozza',
      isLocked: false,
      dataRevisione: new Date().toLocaleDateString('it-IT') + ' ore ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      storicoRevisioni: storicoAggiornato,
    };

    handleUpdateAccettazione(accAggiornata);

    handleAddAuditLogEntry(
      operatore || 'Operatore Laboratorio',
      'Accettazione',
      'Avvio Bozza Revisione RDP',
      `Rev. ${String(numeroRevisioneCorrente).padStart(2, '0')}`,
      `Aperta bozza Rev. ${String(nuovaRevisioneNumero).padStart(2, '0')} per Rapporto ${acc.codiceAccettazione}. Tipologia: ${tipologia}. Motivo: ${motivo}`
    );
  };

  const handleCancelRevisionBozza = (accettazioneId: string, operatore?: string) => {
    const acc = accettazioni.find(a => a.id === accettazioneId);
    if (!acc || acc.statoRevisione !== 'In Bozza') return;

    const storico = acc.storicoRevisioni || [];
    const lastSnapshot = storico.length > 0 ? storico[storico.length - 1] : null;
    const prevRevNum = Math.max(0, (acc.revisioneCorrente || 1) - 1);

    const accRipristinata: AccettazioneCampione = lastSnapshot
      ? {
          ...acc,
          descrizioneCampione: lastSnapshot.descrizioneCampione,
          matrice: lastSnapshot.matrice,
          quantitaCampione: lastSnapshot.quantitaCampione,
          temperaturaArrivo: lastSnapshot.temperaturaArrivo,
          statoInArrivo: lastSnapshot.statoInArrivo,
          dataPrelievo: lastSnapshot.dataPrelievo,
          oraPrelievo: lastSnapshot.oraPrelievo,
          puntoPrelievo: lastSnapshot.puntoPrelievo,
          comunePrelievo: lastSnapshot.comunePrelievo ?? acc.comunePrelievo,
          campionatoDa: lastSnapshot.campionatoDa ?? acc.campionatoDa,
          proceduraCampionamento: lastSnapshot.proceduraCampionamento ?? acc.proceduraCampionamento,
          dataInizioProva: lastSnapshot.dataInizioProva,
          dataTermineProva: lastSnapshot.dataTermineProva,
          risultatiAnalisi: lastSnapshot.risultatiAnalisi ? JSON.parse(JSON.stringify(lastSnapshot.risultatiAnalisi)) : [],
          dichiarazioneConformita: lastSnapshot.dichiarazioneConformita,
          opinioniInterpretazioni: lastSnapshot.opinioniInterpretazioni,
          nota1: lastSnapshot.nota1,
          nota2: lastSnapshot.nota2,
          firmatarioReparto1: lastSnapshot.firmatarioReparto1 ?? acc.firmatarioReparto1,
          firmatarioReparto2: lastSnapshot.firmatarioReparto2 ?? acc.firmatarioReparto2,
          firmatarioTecnico: lastSnapshot.firmatarioTecnico || acc.firmatarioTecnico,
          ruoloFirmatarioTecnico: (lastSnapshot.ruoloFirmatarioTecnico as any) || acc.ruoloFirmatarioTecnico,
          revisioneCorrente: prevRevNum,
          revisioneMotivo: prevRevNum === 0 ? undefined : lastSnapshot.motivoRevisione,
          tipologiaRevisione: prevRevNum === 0 ? undefined : lastSnapshot.tipologiaRevisione,
          statoRevisione: 'Vigente',
          isLocked: true,
          dataRevisione: prevRevNum === 0 ? undefined : lastSnapshot.dataOraEmissione,
          storicoRevisioni: storico.slice(0, -1),
        }
      : {
          ...acc,
          revisioneCorrente: 0,
          revisioneMotivo: undefined,
          tipologiaRevisione: undefined,
          statoRevisione: 'Vigente',
          isLocked: true,
        };

    handleUpdateAccettazione(accRipristinata);

    handleAddAuditLogEntry(
      operatore || 'Responsabile Laboratorio',
      'Accettazione',
      'Annullamento Bozza Revisione RDP',
      `Bozza Rev. ${String(acc.revisioneCorrente || 1).padStart(2, '0')}`,
      `Annullata bozza e ripristinata versione precedente Rev. ${String(prevRevNum).padStart(2, '0')} per Rapporto ${acc.codiceAccettazione}`
    );
  };

  const handleApproveAndEmitRevision = (accettazioneId: string, operatore: string, motivo?: string, tipologia?: string) => {
    const acc = accettazioni.find(a => a.id === accettazioneId);
    if (!acc) return;

    const dataOra = new Date().toLocaleDateString('it-IT') + ' ore ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

    const accAggiornata: AccettazioneCampione = {
      ...acc,
      statoRevisione: 'Vigente',
      isLocked: true,
      firmatarioTecnico: operatore || acc.firmatarioTecnico,
      dataRevisione: dataOra,
      revisioneMotivo: motivo || acc.revisioneMotivo,
      tipologiaRevisione: tipologia || acc.tipologiaRevisione,
    };

    handleUpdateAccettazione(accAggiornata);

    handleAddAuditLogEntry(
      operatore || 'Responsabile Tecnico',
      'Accettazione',
      'Approvazione & Emissione Ufficiale Revisione RDP',
      `Rev. ${String(acc.revisioneCorrente || 0).padStart(2, '0')}`,
      `Approvata e firmata ufficialmente Rev. ${String(acc.revisioneCorrente || 0).padStart(2, '0')} per Rapporto ${acc.codiceAccettazione}`
    );
  };

  const handleEmitNewRevision = (accettazioneId: string, motivo: string, operatore: string, tipologia?: string) => {
    const acc = accettazioni.find(a => a.id === accettazioneId);
    if (!acc) return;

    const numeroRevisioneCorrente = acc.revisioneCorrente || 0;
    const nuovaRevisioneNumero = numeroRevisioneCorrente + 1;

    const snapshot: RevisioneRDP = {
      id: `rev-${acc.id}-${Date.now()}`,
      numeroRevisione: numeroRevisioneCorrente,
      dataOraEmissione: acc.dataRevisione || acc.dataTermineProva || acc.dataAccettazione,
      operatoreEmissione: acc.firmatarioTecnico || operatore || 'Dott. Chim. F. Lupo',
      motivoRevisione: acc.revisioneMotivo || 'Emissione Originale (Rev. 00)',
      tipologiaRevisione: acc.tipologiaRevisione || 'Emissione Originale',
      stato: 'Annullata e Sostituita',
      
      descrizioneCampione: acc.descrizioneCampione,
      matrice: acc.matrice,
      quantitaCampione: acc.quantitaCampione,
      temperaturaArrivo: acc.temperaturaArrivo,
      statoInArrivo: acc.statoInArrivo,
      dataPrelievo: acc.dataPrelievo,
      oraPrelievo: acc.oraPrelievo,
      puntoPrelievo: acc.puntoPrelievo,
      comunePrelievo: acc.comunePrelievo,
      campionatoDa: acc.campionatoDa,
      proceduraCampionamento: acc.proceduraCampionamento,
      dataInizioProva: acc.dataInizioProva,
      dataTermineProva: acc.dataTermineProva,
      risultatiAnalisi: acc.risultatiAnalisi ? JSON.parse(JSON.stringify(acc.risultatiAnalisi)) : [],
      dichiarazioneConformita: acc.dichiarazioneConformita || '',
      opinioniInterpretazioni: acc.opinioniInterpretazioni || '',
      nota1: acc.nota1 || '',
      nota2: acc.nota2 || '',
      firmatarioReparto1: acc.firmatarioReparto1 || '',
      firmatarioReparto2: acc.firmatarioReparto2 || '',
      firmatarioTecnico: acc.firmatarioTecnico || '',
      ruoloFirmatarioTecnico: acc.ruoloFirmatarioTecnico || '',
    };

    const storicoAggiornato = acc.storicoRevisioni ? [...acc.storicoRevisioni, snapshot] : [snapshot];

    const accAggiornata: AccettazioneCampione = {
      ...acc,
      revisioneCorrente: nuovaRevisioneNumero,
      revisioneMotivo: motivo,
      tipologiaRevisione: tipologia || 'Errore materiale / battitura',
      statoRevisione: 'Vigente',
      isLocked: true,
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
    
    const sanitized = sanitizeOperatorsList(resolved);
    const deletedOps = operators.filter(oldOp => !sanitized.some(newOp => newOp.nome === oldOp.nome));
    setOperators(sanitized);
    localStorage.setItem('lab_operators', JSON.stringify(sanitized));

    if (isSupabaseConfigured) {
      for (const op of deletedOps) {
        try {
          await deleteOperatorFromSupabase(op.nome);
        } catch (err) {
          console.error('Error deleting operator from Supabase:', err);
        }
      }
      for (const op of sanitized) {
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
    const added = resolved.filter(curr => !reagentiRitirati.some(old => old.id === curr.id));
    setReagentiRitirati(resolved);

    added.forEach(rr => {
      handleAddAuditLogEntry(
        userProfileName || 'Sistema',
        'Reagentario',
        'Ritiro / Dismissione Reagente',
        `${rr.nome} [Lotto: ${rr.lotto || 'N/D'}]`,
        `Ritirati ${rr.quantitaRitirata} ${rr.unitaMisura} (${rr.motivo}) — Anno ${rr.annoRitiro} (€ ${(rr.costoRitirato || 0).toFixed(2)})`
      );
    });

    deleted.forEach(rr => {
      handleAddAuditLogEntry(
        userProfileName || 'Sistema',
        'Reagentario',
        'Rimozione Record Storico Ritirati',
        `${rr.nome} (${rr.quantitaRitirata} ${rr.unitaMisura})`,
        'Eliminato dallo storico'
      );
    });

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
        auditLogs,
        strumenti
      );
      alert("Sincronizzazione completata! Tutti i dati locali sono stati caricati o aggiornati su Supabase.");
    } catch (error: any) {
      console.error("Sync error:", error);
      alert(`Errore di sincronizzazione:\n${formatSupabaseError(error)}`);
    }
  };

  const handleUpdatePratiche = async (newPratiche: PraticaFatturazione[]) => {
    const prevMap = new Map(praticheFatturazione.map(item => [item.id, item]));
    const deleted = praticheFatturazione.filter(old => !newPratiche.some(curr => curr.id === old.id));
    const changedOrAdded = newPratiche.filter(curr => {
      const old = prevMap.get(curr.id);
      return !old || JSON.stringify(old) !== JSON.stringify(curr);
    });

    setPraticheFatturazione(newPratiche);

    if (isSupabaseConfigured) {
      for (const p of deleted) {
        try {
          await deletePraticaFromSupabase(p.id);
        } catch (err) {
          console.error('Error deleting practice from Supabase:', err);
        }
      }
      for (const p of changedOrAdded) {
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

  const handleRestoreFullBackup = async (
    backupPayload: any,
    alsoSyncSupabase: boolean,
    operatorName: string,
    sourceLabel: string
  ) => {
    const d = backupPayload?.data || backupPayload;
    if (!d || !Array.isArray(d.clients) || !Array.isArray(d.prove) || !Array.isArray(d.preventivi) || !Array.isArray(d.accettazioni)) {
      throw new Error('Formato backup non valido: tabelle principali mancanti.');
    }
    const nextClients = d.clients.filter(Boolean).map(sanitizeClient);
    const nextProve = d.prove;
    const nextPacchetti = Array.isArray(d.pacchetti) ? d.pacchetti : [];
    const nextPreventivi = d.preventivi;
    const nextAccettazioni = d.accettazioni;
    const nextPratiche = Array.isArray(d.praticheFatturazione) ? d.praticheFatturazione : [];
    const nextReagenti = Array.isArray(d.reagenti) ? d.reagenti : [];
    const nextReagentiRitirati = Array.isArray(d.reagentiRitirati) ? d.reagentiRitirati : [];
    const nextStrumenti = Array.isArray(d.strumenti) ? d.strumenti : [];
    const nextOperators = Array.isArray(d.operators) && d.operators.length > 0 ? sanitizeOperatorsList(d.operators) : operators;
    const nextAuditLogs = Array.isArray(d.auditLogs) ? d.auditLogs : auditLogs;

    setClients(nextClients);
    setProve(nextProve);
    setPacchetti(nextPacchetti);
    setPreventivi(nextPreventivi);
    setAccettazioni(nextAccettazioni);
    setPraticheFatturazione(nextPratiche);
    setReagenti(nextReagenti);
    setReagentiRitirati(nextReagentiRitirati);
    setStrumenti(nextStrumenti);
    setOperators(nextOperators);
    setAuditLogs(nextAuditLogs);

    localStorage.setItem('lab_clients', JSON.stringify(nextClients));
    localStorage.setItem('lab_prove', JSON.stringify(nextProve));
    localStorage.setItem('lab_pacchetti', JSON.stringify(nextPacchetti));
    localStorage.setItem('lab_preventivi', JSON.stringify(nextPreventivi));
    localStorage.setItem('lab_accettazioni', JSON.stringify(nextAccettazioni));
    localStorage.setItem('lab_pratiche_fatturazione', JSON.stringify(nextPratiche));
    localStorage.setItem('lab_reagenti', JSON.stringify(nextReagenti));
    localStorage.setItem('lab_reagenti_ritirati', JSON.stringify(nextReagentiRitirati));
    localStorage.setItem('lab_strumenti', JSON.stringify(nextStrumenti));
    localStorage.setItem('lab_operators', JSON.stringify(nextOperators));
    localStorage.setItem('lab_audit_logs', JSON.stringify(nextAuditLogs));

    if (d.limsSettings && typeof d.limsSettings === 'object') {
      Object.entries(d.limsSettings).forEach(([k, v]) => {
        if (typeof v === 'string') {
          try {
            localStorage.setItem(k, v);
          } catch {}
        }
      });
    }

    if (alsoSyncSupabase && isSupabaseConfigured) {
      await syncAllLocalDataToSupabase(
        nextClients,
        nextProve,
        nextPacchetti,
        nextPreventivi,
        nextReagenti,
        nextReagentiRitirati,
        nextAccettazioni,
        nextOperators,
        nextPratiche,
        nextAuditLogs,
        nextStrumenti
      );
    }

    await handleAddAuditLogEntry(
      operatorName || userProfileName || 'Amministratore',
      'Sistema / Database',
      'Ripristino Completo Database da Backup',
      sourceLabel,
      `Ripristinati ${nextClients.length} clienti, ${nextPreventivi.length} preventivi, ${nextAccettazioni.length} campioni, ${nextPratiche.length} pratiche${alsoSyncSupabase && isSupabaseConfigured ? ' (Sincronizzato su Supabase)' : ''}`
    );
  };

  // ─── CRUD STRUMENTAZIONE ─────────────────────────────────────────────────
  const handleAddStrumento = async (newStrumento: Strumento) => {
    const updated = [...strumenti, newStrumento];
    setStrumenti(updated);
    localStorage.setItem('lab_strumenti', JSON.stringify(updated));
    handleAddAuditLogEntry(
      userProfileName || 'Sistema',
      'Strumentazione',
      'Registrazione Nuovo Strumento',
      '-',
      `${newStrumento.codice} — ${newStrumento.nome} (Prossima taratura: ${newStrumento.prossimaTaratura || 'N/D'})`
    );
    if (isSupabaseConfigured) {
      try {
        await insertStrumentoToSupabase(newStrumento);
      } catch (error: any) {
        console.error('Error writing strumento to Supabase:', error);
        alert(`Errore di salvataggio "Strumento" su Supabase:\n${formatSupabaseError(error)}`);
      }
    }
  };

  const handleUpdateStrumento = async (updatedStrumento: Strumento) => {
    const old = strumenti.find(s => s.id === updatedStrumento.id);
    const updated = strumenti.map(s => s.id === updatedStrumento.id ? updatedStrumento : s);
    setStrumenti(updated);
    localStorage.setItem('lab_strumenti', JSON.stringify(updated));
    const oldTarCount = old?.storicoTarature?.length || 0;
    const newTarCount = updatedStrumento.storicoTarature?.length || 0;
    const actionLabel = newTarCount > oldTarCount ? 'Registrazione Nuova Taratura' : 'Modifica Scheda Strumento';
    handleAddAuditLogEntry(
      userProfileName || 'Sistema',
      'Strumentazione',
      actionLabel,
      old ? `${old.codice} (Ultima: ${old.ultimaTaratura || 'N/D'}, Prossima: ${old.prossimaTaratura || 'N/D'})` : '-',
      `${updatedStrumento.codice} — ${updatedStrumento.nome} (Ultima: ${updatedStrumento.ultimaTaratura || 'N/D'}, Prossima: ${updatedStrumento.prossimaTaratura || 'N/D'})`
    );
    if (isSupabaseConfigured) {
      try {
        await updateStrumentoInSupabase(updatedStrumento);
      } catch (error: any) {
        console.error('Error updating strumento in Supabase:', error);
        alert(`Errore di modifica "Strumento" su Supabase:\n${formatSupabaseError(error)}`);
      }
    }
  };

  const handleDeleteStrumento = async (strumentoId: string) => {
    const deleted = strumenti.find(s => s.id === strumentoId);
    const updated = strumenti.filter(s => s.id !== strumentoId);
    setStrumenti(updated);
    localStorage.setItem('lab_strumenti', JSON.stringify(updated));
    if (deleted) {
      handleAddAuditLogEntry(
        userProfileName || 'Sistema',
        'Strumentazione',
        'Rimozione Strumento',
        `${deleted.codice} — ${deleted.nome}`,
        'Eliminato dall\'anagrafe strumenti'
      );
    }
    if (isSupabaseConfigured) {
      try {
        await deleteStrumentoFromSupabase(strumentoId);
      } catch (error: any) {
        console.error('Error deleting strumento from Supabase:', error);
        alert(`Errore di rimozione "Strumento" su Supabase:\n${formatSupabaseError(error)}`);
      }
    }
  };

  // ─── AGGIORNAMENTO PRATICA FATTURAZIONE (campo RdP) ──────────────────────
  const handleUpdatePraticaRdP = (praticaId: string, numeroProtocolloRdP: string, dataInvioRdP: string) => {
    const updated = praticheFatturazione.map(p =>
      p.id === praticaId ? { ...p, numeroProtocolloRdP, dataInvioRdP } : p
    );
    setPraticheFatturazione(updated);
    localStorage.setItem('lab_pratiche_fatturazione', JSON.stringify(updated));
    if (isSupabaseConfigured) {
      const pratica = updated.find(p => p.id === praticaId);
      if (pratica) {
        updatePraticaInSupabase(pratica).catch(err =>
          console.error('Error updating pratica RdP to Supabase:', err)
        );
      }
    }
  };

  // Calcolo statistiche veloci per la dashboard (usa il maggiore tra lo storico statico clienti e le pratiche/preventivi reali)
  const totaleClienti = clients.length;
  
  let fatturatoStaticoClienti = 0;
  clients.forEach(c => {
    if (c.fatturatoAnnuo) {
      Object.entries(c.fatturatoAnnuo).forEach(([_, valore]) => {
        fatturatoStaticoClienti += Number(valore) || 0;
      });
    }
  });
  const fatturatoDaPratiche = praticheFatturazione.filter(p => p.statoFatturazione !== 'Annullato').reduce((sum, p) => sum + (Number(p.importo) || 0), 0);
  const fatturatoDaPreventiviApprovati = preventivi
    .filter(p => p.stato === 'Approvato')
    .reduce((sum, p) => sum + (Number(p.totale) || 0), 0);
  const fatturatoTotale = Math.max(fatturatoStaticoClienti, fatturatoDaPratiche, fatturatoDaPreventiviApprovati);

  const fatturatoMedio = totaleClienti > 0 ? (fatturatoTotale / totaleClienti) : 0;

  const categoryCounts: Record<string, number> = {};
  prove.forEach(p => {
    const cat = p.categoriaMerceologica || p.categoria || 'Generale';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const latestClients = [...clients].slice(-3).reverse();

  const campioniInLavorazioneCount = accettazioni.filter(a => a.analisiStato === 'In Attesa' || a.analisiStato === 'In Corso').length;
  const preventiviInAttesaCount = preventivi.filter(p => p.stato === 'In Approvazione').length;
  const praticheDaFatturareCount = praticheFatturazione.filter(p => p.statoFatturazione === 'Da fatturare').length;
  const praticheDaIncassareCount = praticheFatturazione.filter(p => p.statoFatturazione === 'Fatturato' && !p.pagato).length;
  const revisioniInBozzaCount = accettazioni.filter(a => a.statoRevisione === 'In Bozza').length;
  const revisioniTotaliCount = accettazioni.filter(a => (a.revisioneCorrente !== undefined && a.revisioneCorrente > 0) || (a.storicoRevisioni && a.storicoRevisioni.length > 0)).length;

  const todayDate = new Date();
  const reagentsNearExpiry = [...reagenti]
    .map(r => {
      const dataChiusa = r.dataNuovaScadenza || r.dataScadenzaChiusa || r.dataScadenza;
      let daysChiusa = 9999;
      if (dataChiusa) {
        const expDate = new Date(dataChiusa);
        daysChiusa = Math.ceil((expDate.getTime() - todayDate.getTime()) / (1000 * 3600 * 24));
      }
      let daysAperta = 9999;
      if (r.dataScadenzaAperta) {
        const expAperta = new Date(r.dataScadenzaAperta);
        daysAperta = Math.ceil((expAperta.getTime() - todayDate.getTime()) / (1000 * 3600 * 24));
      }
      const daysToExpiry = Math.min(daysChiusa, daysAperta);
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

  const hasAccessTo = (areaId: string) => {
    // 1. Carmine Marroccella (Super-Admin / Responsabile Tecnico) ha sempre pieno accesso
    const userEmail = (currentUser?.email || '').toLowerCase().trim();
    const isCarmine = userEmail.includes('carmine') && (userEmail.includes('marroccella') || userEmail.includes('marrocella'));
    if (isCarmine) return true;

    // 2. Se non vi è alcun utente autenticato (sessione aperta / demo locale), accesso consentito
    if (!currentUser) return true;

    // 3. Identifichiamo l'operatore corrispondente (per email, nome profilo, o account amministrazione)
    const emailPrefix = userEmail.split('@')[0].toLowerCase().trim();
    const profileName = (userProfileName || '').toLowerCase().trim();

    const matchedOperator = operators.find(o => {
      if (o.email && o.email.toLowerCase().trim() === userEmail) return true;
      const opNome = (o.nome || '').toLowerCase().trim();
      if (opNome === userEmail || opNome === emailPrefix || (profileName && opNome === profileName)) return true;
      if (userEmail.includes('amministrazione') && (opNome.includes('amministrazione') || (o.ruolo || '').toLowerCase().includes('amministrazione'))) {
        return true;
      }
      return false;
    });

    // 3b. Se l'operatore è registrato ma risulta Disattivato, blocca ogni accesso operativo (tranne bacheca base)
    if (matchedOperator && matchedOperator.attivo === false) {
      return areaId === 'dashboard';
    }

    // 4. Se l'operatore è registrato ed ha aree di competenza specifiche configurate
    if (matchedOperator && matchedOperator.areeCompetenza && matchedOperator.areeCompetenza.length > 0) {
      const allowed = matchedOperator.areeCompetenza;

      if (areaId === 'dashboard') {
        return true;
      }
      if (areaId === 'operatori') {
        return allowed.includes('operatori');
      }
      if (areaId === 'backupDrive') {
        return allowed.includes('backupDrive');
      }
      if (areaId === 'statistiche') {
        return allowed.includes('statistiche');
      }
      if (areaId === 'audit') {
        return allowed.includes('audit');
      }
      if (areaId === 'fatturazione') {
        return allowed.includes('fatturazione') || allowed.includes('Amministrazione');
      }
      if (areaId === 'preventivi') {
        return allowed.includes('preventivi') || allowed.includes('Commerciale');
      }
      if (areaId === 'accettazione') {
        return allowed.includes('accettazione');
      }
      if (areaId === 'revisioniRdp') {
        return allowed.includes('revisioniRdp') || allowed.includes('accettazione') || allowed.includes('prove') || allowed.includes('Laboratorio') || allowed.includes('Direzione Tecnica');
      }
      if (areaId === 'clienti') {
        return allowed.includes('clienti');
      }
      if (areaId === 'prove') {
        return allowed.includes('prove') || allowed.includes('Laboratorio') || allowed.includes('Direzione Tecnica');
      }
      if (areaId === 'areeSpecialistiche') {
        return allowed.includes('areeSpecialistiche') || allowed.includes('prove') || allowed.includes('Laboratorio') || allowed.includes('Direzione Tecnica');
      }
      if (areaId === 'reagentario') {
        return allowed.includes('reagentario') || allowed.includes('Laboratorio');
      }
      if (areaId === 'strumenti') {
        return allowed.includes('strumenti') || allowed.includes('reagentario') || allowed.includes('Laboratorio') || allowed.includes('Direzione Tecnica');
      }

      return allowed.includes(areaId);
    }

    // 5. Account Amministrazione (ruolo AM o email contenente 'amministrazione') senza aree specifiche configurate
    if (actualRole === 'AM' || userEmail.includes('amministrazione')) {
      if (areaId === 'fatturazione' || areaId === 'preventivi' || areaId === 'clienti' || areaId === 'dashboard') {
        return true;
      }
      // Blocca rigorosamente Statistiche, Operatori, Audit, Prove, Accettazione, Reagentario
      return false;
    }

    // 6. Altri utenti con ruolo ADMIN
    if (actualRole === 'ADMIN') {
      return true;
    }

    // 7. Utente non autorizzato di default per l'area
    if (areaId === 'dashboard' || areaId === 'clienti') return true;
    return false;
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
    navigationHistory,
    selectedClientId,
    setSelectedClientId,
    selectedProvaId,
    setSelectedProvaId,
    selectedPreventivoId,
    setSelectedPreventivoId,
    pendingQuoteClientId,
    setPendingQuoteClientId,
    preventiviInitialSubTab,
    setPreventiviInitialSubTab,
    selectedAccettazioneId,
    setSelectedAccettazioneId,
    pendingAccettazionePreventivoId,
    setPendingAccettazionePreventivoId,
    pendingAccettazioneClientId,
    setPendingAccettazioneClientId,
    pendingAreeSpecTarget,
    setPendingAreeSpecTarget,
    pendingFatturazioneQuery,
    setPendingFatturazioneQuery,
    mobileMenuOpen,
    setMobileMenuOpen,
    showRestoreModal,
    setShowRestoreModal,
    showBackupModal,
    setShowBackupModal,
    revisioneSelectedAccId,
    setRevisioneSelectedAccId,
    revisioneMotivoInput,
    setRevisioneMotivoInput,
    revisioneTipologiaInput,
    setRevisioneTipologiaInput,
    revisioneOperatore,
    setRevisioneOperatore,
    revisioneSuccessMessage,
    setRevisioneSuccessMessage,
    diffModalOpen,
    setDiffModalOpen,
    diffAccId,
    setDiffAccId,
    diffSnapshot,
    setDiffSnapshot,

    // Handlers
    fetchUserRole,
    applyLocalAuthenticatedSession,
    handleLogout,
    handleAddAuditLogEntry,
    handleNavigateBack,
    handleJumpToHistoryIndex,
    handleClearNavigationHistory,
    handleGoToClient,
    handleGoToProva,
    handleGoToPreventivo,
    handleGoToPacchetti,
    handleCreatePreventivoForClient,
    handleGoToAccettazione,
    handleCreateAccettazioneFromPreventivo,
    handleCreateAccettazioneForClient,
    handleGoToAreeSpecialistiche,
    handleGoToFatturazione,
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
    handleStartRevisionBozza,
    handleCancelRevisionBozza,
    handleApproveAndEmitRevision,
    handleEmitNewRevision,
    handleUpdateOperators,
    handleUpdateReagentiRitirati,
    handleSyncLocalData,
    handleUpdatePratiche,
    handleRestoreDefaults,
    handleRestoreFullBackup,
    handleAddStrumento,
    handleUpdateStrumento,
    handleDeleteStrumento,
    handleUpdatePraticaRdP,

    // Computed
    totaleClienti,
    fatturatoTotale,
    fatturatoMedio,
    topCategories,
    latestClients,
    reagentsNearExpiry,
    campioniInLavorazioneCount,
    preventiviInAttesaCount,
    praticheDaFatturareCount,
    praticheDaIncassareCount,
    revisioniInBozzaCount,
    revisioniTotaliCount,
    hasAccessTo,

    // Strumentazione
    strumenti,
    setStrumenti,
  };
}
