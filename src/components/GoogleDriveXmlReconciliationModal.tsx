import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  RefreshCw, 
  FolderSync, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Layers, 
  Key, 
  UploadCloud, 
  FileUp, 
  HelpCircle, 
  Check, 
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Folder,
  FolderOpen,
  ArrowLeft,
  FileCode,
  Download,
  ListFilter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PraticaFatturazione, Client, Operator } from '../types';
import { 
  parseFatturaElettronicaXml, 
  riconciliaPraticheConFattureXml, 
  ParsedFatturaXml, 
  MatchResult 
} from '../utils/xmlFatturaParser';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface GoogleDriveItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  xmlCount?: number;
}

interface GoogleDriveXmlReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pratiche: PraticaFatturazione[];
  onUpdatePratiche: (updated: PraticaFatturazione[]) => void;
  clients?: Client[];
  operators: Operator[];
  selectedOperator?: string;
  addAuditLogEntry: (utente: string, sezione: string, campo: string, vOld: string, vNew: string) => void;
}

export function GoogleDriveXmlReconciliationModal({
  isOpen,
  onClose,
  pratiche,
  onUpdatePratiche,
  clients,
  operators,
  selectedOperator,
  addAuditLogEntry
}: GoogleDriveXmlReconciliationModalProps) {
  // Tabs: 'drive' | 'upload' | 'settings'
  const [activeTab, setActiveTab] = useState<'drive' | 'upload' | 'settings'>('drive');

  // Google Credentials (con supporto localStorage ed environment variables)
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('lims_google_api_key') || (import.meta.env.VITE_GOOGLE_API_KEY as string) || '';
  });
  const [clientId, setClientId] = useState<string>(() => {
    return localStorage.getItem('lims_google_client_id') || (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [showClientId, setShowClientId] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Loading & Processing States
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [loadingStatusText, setLoadingStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // In-App Google Drive Explorer State
  const [driveConnected, setDriveConnected] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<{ id: string; name: string }>({ id: 'root', name: 'Il mio Drive' });
  const [folderHistory, setFolderHistory] = useState<Array<{ id: string; name: string }>>([]);
  const [folderItems, setFolderItems] = useState<GoogleDriveItem[]>([]);
  const [searchDriveQuery, setSearchDriveQuery] = useState('');
  const [autoFoundXmlCount, setAutoFoundXmlCount] = useState<number | null>(null);

  // Parsed XML & Reconciliation Results
  const [parsedInvoices, setParsedInvoices] = useState<ParsedFatturaXml[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'matched' | 'cumulative' | 'unmatched'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Script loading flags & token storage
  const [gisLoaded, setGisLoaded] = useState(false);
  const tokenClientRef = useRef<any>(null);
  const accessTokenRef = useRef<string | null>(null);

  // Carica GIS e GAPI quando la modale è aperta
  useEffect(() => {
    if (!isOpen) return;

    if (window.google?.accounts?.oauth2) {
      setGisLoaded(true);
    } else {
      const checkGis = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          setGisLoaded(true);
          clearInterval(checkGis);
        }
      }, 500);
      return () => clearInterval(checkGis);
    }
  }, [isOpen]);

  // Salva credenziali localmente
  const handleSaveCredentials = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    localStorage.setItem('lims_google_api_key', apiKey.trim());
    localStorage.setItem('lims_google_client_id', clientId.trim());
    setSavedSuccess(true);
    setErrorMessage(null);
    setTimeout(() => setSavedSuccess(false), 3000);
    setActiveTab('drive');
  };

  // Rimuove le credenziali salvate nel browser
  const handleClearCredentials = () => {
    if (confirm("Sei sicuro di voler rimuovere le chiavi Google salvate in questo browser?")) {
      localStorage.removeItem('lims_google_api_key');
      localStorage.removeItem('lims_google_client_id');
      setApiKey('');
      setClientId('');
      accessTokenRef.current = null;
      setDriveConnected(false);
      setFolderItems([]);
      alert("Credenziali rimosse dal browser.");
    }
  };

  // Esegue la riconciliazione ogni volta che cambiano i file XML parsati
  useEffect(() => {
    if (parsedInvoices.length > 0) {
      const results = riconciliaPraticheConFattureXml(pratiche, parsedInvoices, clients);
      setMatchResults(results);

      // Pre-seleziona i risultati con match e non ancora fatturati
      const preSelected = new Set<string>();
      results.forEach(r => {
        if (r.selezionato) {
          preSelected.add(r.pratica.id);
        }
      });
      setSelectedMatchIds(preSelected);
    } else {
      setMatchResults([]);
      setSelectedMatchIds(new Set());
    }
  }, [parsedInvoices, pratiche, clients]);

  // OTTIENE IL TOKEN OAUTH E RESTITUISCE IL CONTROLLO
  const obtainOAuthToken = async (): Promise<string> => {
    if (accessTokenRef.current) {
      return accessTokenRef.current;
    }

    if (!clientId.trim()) {
      setActiveTab('settings');
      throw new Error("Inserisci il tuo Google OAuth Client ID nella scheda Impostazioni.");
    }

    if (!window.google?.accounts?.oauth2) {
      throw new Error("Il servizio Google Identity Services non è ancora caricato. Ricarica la pagina.");
    }

    return new Promise((resolve, reject) => {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId.trim(),
          scope: 'https://www.googleapis.com/auth/drive.readonly',
          callback: (response: any) => {
            if (response.error) {
              console.error('OAuth token error:', response);
              reject(new Error(`Autorizzazione negata da Google: ${response.error} (${response.error_description || ''})`));
              return;
            }
            accessTokenRef.current = response.access_token;
            setDriveConnected(true);
            resolve(response.access_token);
          },
          error_callback: (err: any) => {
            console.error('GIS Error callback:', err);
            reject(new Error(err.message || 'Finestra di accesso Google chiusa o bloccata.'));
          }
        });
        tokenClientRef.current = client;
        client.requestAccessToken({ prompt: '' });
      } catch (err: any) {
        reject(err);
      }
    });
  };

  // 1. ESPLORATORE DIRETTO GOOGLE DRIVE: Carica i contenuti di una cartella
  const loadFolderContents = async (folderId: string, folderName?: string) => {
    setIsLoadingDrive(true);
    setLoadingStatusText(`Caricamento cartella "${folderName || folderId}" da Google Drive...`);
    setErrorMessage(null);

    try {
      const token = await obtainOAuthToken();
      
      // Chiamata REST diretta a Google Drive v3
      const query = `'${folderId}' in parents and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime,size)&pageSize=100&orderBy=folder,name&supportsAllDrives=true&includeItemsFromAllDrives=true`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Errore HTTP ${res.status} nella lettura di Google Drive.`);
      }

      const data = await res.json();
      const items: GoogleDriveItem[] = data.files || [];
      
      setFolderItems(items);
      setCurrentFolder({ id: folderId, name: folderName || 'Cartella' });
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore durante la lettura di Google Drive.');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  // Entra in una sottocartella
  const handleNavigateToFolder = (folder: GoogleDriveItem) => {
    setFolderHistory(prev => [...prev, currentFolder]);
    loadFolderContents(folder.id, folder.name);
  };

  // Torna indietro nella cartella superiore
  const handleNavigateBack = () => {
    if (folderHistory.length === 0) return;
    const prevFolder = folderHistory[folderHistory.length - 1];
    setFolderHistory(prev => prev.slice(0, prev.length - 1));
    loadFolderContents(prevFolder.id, prevFolder.name);
  };

  // 2. SCANSIONE AUTOMATICA INTEGRALE XML SU GOOGLE DRIVE
  const handleAutoScanAllDriveXmls = async () => {
    setIsLoadingDrive(true);
    setLoadingStatusText("Ricerca automatica di tutti i file XML di Fattura su Google Drive...");
    setErrorMessage(null);

    try {
      const token = await obtainOAuthToken();

      // Cerca tutti i file XML presenti nel Drive
      const query = `name contains '.xml' and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType)&pageSize=500&supportsAllDrives=true&includeItemsFromAllDrives=true`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`Impossibile eseguire la ricerca su Google Drive (HTTP ${res.status})`);
      }

      const data = await res.json();
      const files: any[] = data.files || [];

      if (files.length === 0) {
        setErrorMessage("Nessun file con estensione .xml trovato nel tuo account Google Drive.");
        setIsLoadingDrive(false);
        return;
      }

      setLoadingStatusText(`Trovati ${files.length} file XML. Download ed elaborazione in corso...`);

      const parsedList: ParsedFatturaXml[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setLoadingStatusText(`Analisi XML (${i + 1}/${files.length}): ${file.name}...`);
        try {
          const content = await fetchFileContent(file.id, token);
          const parsed = parseFatturaElettronicaXml(content, file.name, file.id);
          if (parsed) {
            parsedList.push(parsed);
          }
        } catch (err) {
          console.warn(`Errore lettura file ${file.name}:`, err);
        }
      }

      if (parsedList.length === 0) {
        setErrorMessage("Trovati file XML, ma nessuno conteneva la struttura standard di Fattura Elettronica.");
      } else {
        setParsedInvoices(parsedList);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Errore durante la scansione automatica di Google Drive.');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  // 3. IMPORTA TUTTI I FILE XML DALLA CARTELLA CORRENTE
  const handleImportCurrentFolderXmls = async () => {
    setIsLoadingDrive(true);
    setLoadingStatusText(`Importazione di tutti i file XML da "${currentFolder.name}"...`);
    setErrorMessage(null);

    try {
      const token = await obtainOAuthToken();
      const xmls = await fetchXmlsFromFolder(currentFolder.id, token);

      if (xmls.length === 0) {
        setErrorMessage(`Nessun file XML valido trovato all'interno della cartella "${currentFolder.name}" o nelle sue sottocartelle.`);
      } else {
        setParsedInvoices(xmls);
      }
    } catch (err: any) {
      setErrorMessage(`Errore durante l'importazione: ${err.message}`);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  // Funzione ricorsiva per elencare e scaricare XML da una cartella di Google Drive
  const fetchXmlsFromFolder = async (folderId: string, token: string): Promise<ParsedFatturaXml[]> => {
    const listUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&pageSize=500&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    
    const res = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      throw new Error(`Impossibile leggere la cartella (HTTP ${res.status})`);
    }

    const data = await res.json();
    const files = data.files || [];
    const results: ParsedFatturaXml[] = [];

    for (const file of files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        const subFiles = await fetchXmlsFromFolder(file.id, token);
        results.push(...subFiles);
      } else if (file.name?.toLowerCase().endsWith('.xml') || file.mimeType?.includes('xml')) {
        const content = await fetchFileContent(file.id, token);
        const parsed = parseFatturaElettronicaXml(content, file.name, file.id);
        if (parsed) {
          results.push(parsed);
        }
      }
    }
    return results;
  };

  // Scarica il contenuto testuale di un file da Google Drive REST API
  const fetchFileContent = async (fileId: string, token: string): Promise<string> => {
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;
    const res = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      throw new Error(`Download fallito per il file ${fileId} (HTTP ${res.status})`);
    }
    return await res.text();
  };

  // GESTIONE CARICAMENTO MANUALE FILE LOCALI (Drag & Drop o File Input)
  const handleLocalFilesUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let files: File[] = [];
    if ('dataTransfer' in e) {
      e.preventDefault();
      files = Array.from(e.dataTransfer.files);
    } else if (e.target && e.target.files) {
      files = Array.from(e.target.files);
    }

    const xmlFiles = files.filter(f => f.name.toLowerCase().endsWith('.xml'));
    if (xmlFiles.length === 0) {
      setErrorMessage("Nessun file con estensione .xml trovato nei file caricati.");
      return;
    }

    setIsLoadingDrive(true);
    setLoadingStatusText(`Lettura di ${xmlFiles.length} file XML locali...`);
    setErrorMessage(null);

    const parsedList: ParsedFatturaXml[] = [];

    for (const f of xmlFiles) {
      try {
        const text = await f.text();
        const parsed = parseFatturaElettronicaXml(text, f.name, f.name);
        if (parsed) {
          parsedList.push(parsed);
        }
      } catch (err) {
        console.error(`Errore lettura file locale ${f.name}:`, err);
      }
    }

    setIsLoadingDrive(false);
    if (parsedList.length === 0) {
      setErrorMessage("Impossibile estrarre dati validi dai file XML forniti.");
    } else {
      setParsedInvoices(parsedList);
    }
  };

  // Toggle selezione singola riga
  const handleToggleSelect = (praticaId: string) => {
    setSelectedMatchIds(prev => {
      const next = new Set(prev);
      if (next.has(praticaId)) {
        next.delete(praticaId);
      } else {
        next.add(praticaId);
      }
      return next;
    });
  };

  // Seleziona / Deseleziona tutti
  const handleSelectAll = (select: boolean) => {
    if (select) {
      const allIds = new Set(filteredMatches.filter(m => m.fatturaTrovata).map(m => m.pratica.id));
      setSelectedMatchIds(allIds);
    } else {
      setSelectedMatchIds(new Set());
    }
  };

  // APPLICAZIONE FINALE DELLE RICONCILIAZIONI NEL GESTIONALE
  const handleApplyReconciliation = () => {
    if (selectedMatchIds.size === 0) {
      alert("Seleziona almeno una pratica da riconciliare.");
      return;
    }

    const updatedPratiche = pratiche.map(p => {
      if (selectedMatchIds.has(p.id)) {
        const match = matchResults.find(m => m.pratica.id === p.id);
        if (match?.fatturaTrovata) {
          return {
            ...p,
            statoFatturazione: 'Fatturato' as const,
            numeroFattura: match.fatturaTrovata.numeroFattura,
            dataFattura: match.fatturaTrovata.dataFattura || new Date().toISOString().split('T')[0],
            note: p.note ? `${p.note} | Riconciliato da XML (${match.fatturaTrovata.fileName})` : `Riconciliato da XML (${match.fatturaTrovata.fileName})`
          };
        }
      }
      return p;
    });

    onUpdatePratiche(updatedPratiche);

    // Registra nel log di audit
    const operatore = selectedOperator || operators[0]?.nome || 'Amministrazione';
    addAuditLogEntry(
      operatore,
      'Fatturazione',
      'Riconciliazione Automatica XML Google Drive',
      `${selectedMatchIds.size} pratiche aggiornate allo stato 'Fatturato'`,
      `Fatture associate da file XML`
    );

    alert(`✅ Riconciliazione completata con successo!\n${selectedMatchIds.size} pratiche sono state aggiornate con il numero e la data di fattura corrispondenti.`);
    onClose();
  };

  // Filtra i risultati per visualizzazione
  const filteredMatches = matchResults.filter(item => {
    // Filtro Tab
    if (filterType === 'matched' && !item.fatturaTrovata) return false;
    if (filterType === 'cumulative' && !item.isCumulativa) return false;
    if (filterType === 'unmatched' && item.fatturaTrovata) return false;

    // Filtro Ricerca
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRdp = item.pratica.numeroCampione?.toLowerCase().includes(q);
      const matchClient = item.pratica.nomeCliente?.toLowerCase().includes(q);
      const matchPiva = item.pratica.partitaIva?.toLowerCase().includes(q);
      const matchInvNum = item.fatturaTrovata?.numeroFattura.toLowerCase().includes(q);
      return matchRdp || matchClient || matchPiva || matchInvNum;
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* INTESTAZIONE MODALE */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Riconciliazione Automatica Fatture XML
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-bold uppercase">
                  Google Drive Integrato
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Incrocia i Rapporti di Prova (RdP) con i file XML delle fatture emesse su Google Drive o in locale.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BARRA TAB DI SELEZIONE MODALITÀ */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex justify-between items-center shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('drive')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'drive'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <FolderSync className="w-3.5 h-3.5 text-emerald-400" />
              Sincronizza da Google Drive
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
              Carica Cartella o XML Locali
            </button>
          </div>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Chiavi Google API ({clientId ? 'Configurate ✅' : 'Da impostare ⚠️'})
          </button>
        </div>

        {/* CORPO MODALE */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* MESSAGGIO DI ERRORE */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="font-bold">Attenzione:</strong> {errorMessage}
              </div>
              <button 
                onClick={() => setErrorMessage(null)} 
                className="text-rose-400 hover:text-rose-700 font-bold text-xs"
              >
                Chiudi
              </button>
            </div>
          )}

          {/* TAB 1: GOOGLE DRIVE (SCANSIONE + ESPLORATORE CARTELLE) */}
          {activeTab === 'drive' && (
            <div className="space-y-6">
              {parsedInvoices.length === 0 ? (
                <div className="space-y-5">
                  
                  {/* SEZIONE AZIONI DI AVVIO */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* OPZIONE 1: SCANSIONE AUTOMATICA XML SU TUTTO IL DRIVE */}
                    <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200/80 rounded-2xl p-5 space-y-3.5 shadow-xs flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                          <Search className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Scansione Automatica Fatture XML
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Cerca e analizza automaticamente tutti i file <code>.xml</code> presenti nel tuo Google Drive (incluso <strong>&quot;Fatture_XML&quot;</strong> e <strong>&quot;Condivisi con me&quot;</strong>).
                        </p>
                      </div>

                      <button
                        onClick={handleAutoScanAllDriveXmls}
                        disabled={isLoadingDrive}
                        className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <RefreshCw className={`w-4 h-4 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                        {isLoadingDrive ? (loadingStatusText || 'Scansione in corso...') : '⚡ Scansiona Tutti i File XML'}
                      </button>
                    </div>

                    {/* OPZIONE 2: SFOGLIA LE CARTELLE DI GOOGLE DRIVE */}
                    <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200/80 rounded-2xl p-5 space-y-3.5 shadow-xs flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                          <FolderOpen className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Esplora Cartelle Google Drive
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Naviga visivamente nelle cartelle del tuo Drive per selezionare la cartella specifica (es. <code>Fatture_XML &gt; 2024 &gt; Emesse</code>).
                        </p>
                      </div>

                      <button
                        onClick={() => loadFolderContents('root', 'Il mio Drive')}
                        disabled={isLoadingDrive}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Folder className="w-4 h-4" />
                        📂 Sfoglia Cartelle Drive
                      </button>
                    </div>
                  </div>

                  {/* ESPLORATORE VISIVO DELLE CARTELLE GOOGLE DRIVE (SE APERTO) */}
                  {folderItems.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-2">
                          {folderHistory.length > 0 && (
                            <button
                              onClick={handleNavigateBack}
                              className="p-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 transition cursor-pointer"
                              title="Cartella precedente"
                            >
                              <ArrowLeft className="w-4 h-4" />
                            </button>
                          )}
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">Posizione Corrente:</span>
                            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Folder className="w-4 h-4 text-amber-500" />
                              {currentFolder.name}
                            </h4>
                          </div>
                        </div>

                        <button
                          onClick={handleImportCurrentFolderXmls}
                          disabled={isLoadingDrive}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Riconcilia Tutti gli XML di Questa Cartella
                        </button>
                      </div>

                      {/* LISTA ELEMENTI CARTELLA */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto p-1">
                        {folderItems.map(item => {
                          const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
                          const isXml = item.name.toLowerCase().endsWith('.xml') || item.mimeType?.includes('xml');

                          return (
                            <div
                              key={item.id}
                              onClick={() => {
                                if (isFolder) {
                                  handleNavigateToFolder(item);
                                }
                              }}
                              className={`p-3 rounded-xl border transition flex items-center justify-between ${
                                isFolder 
                                  ? 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer shadow-2xs' 
                                  : isXml
                                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                                  : 'bg-white border-slate-200 opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {isFolder ? (
                                  <Folder className="w-5 h-5 text-amber-500 shrink-0" />
                                ) : isXml ? (
                                  <FileCode className="w-5 h-5 text-emerald-600 shrink-0" />
                                ) : (
                                  <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                                )}
                                <span className="text-xs font-semibold text-slate-800 truncate" title={item.name}>
                                  {item.name}
                                </span>
                              </div>

                              {isFolder && (
                                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 text-center">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Accesso sicuro con autorizzazione ufficiale Google: nessun file su Drive viene modificato o cancellato.
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 2: CARICAMENTO LOCALE / DRAG & DROP */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleLocalFilesUpload}
                className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/30 rounded-2xl p-8 text-center transition space-y-3"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                  <FileUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Trascina qui i file XML delle fatture</h3>
                  <p className="text-xs text-slate-500 mt-0.5">oppure seleziona i file dal tuo computer</p>
                </div>

                <div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs cursor-pointer transition">
                    <UploadCloud className="w-4 h-4 text-blue-500" />
                    Scegli file XML dal PC
                    <input 
                      type="file" 
                      multiple 
                      accept=".xml,text/xml" 
                      onChange={handleLocalFilesUpload}
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONFIGURAZIONE CHIAVI GOOGLE */}
          {activeTab === 'settings' && (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-5">
              <div className="border-b border-slate-200 pb-3 flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Key className="w-4 h-4 text-indigo-600" />
                    Configurazione Chiavi Google Cloud (Una Tantum)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Le credenziali rimangono memorizzate esclusivamente nel tuo browser locale (localStorage).
                  </p>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Identificativi Pubblici Sicuri
                </div>
              </div>

              {/* SPIEGAZIONE DI SICUREZZA */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-950 space-y-2">
                <div className="flex items-center gap-2 font-bold text-indigo-900">
                  <Lock className="w-4 h-4 text-indigo-600" />
                  Perché queste chiavi sono sicure?
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11.5px] text-slate-700 leading-relaxed">
                  <li>
                    <strong>OAuth Client ID</strong> è l&apos;identificativo client-side per Google Drive e non fornisce accesso ai dati senza il tuo login interattivo.
                  </li>
                  <li>
                    Il <strong>Client Secret</strong> (la password segreta del backend) <strong>NON</strong> è richiesto e <strong>NON</strong> va mai inserito qui.
                  </li>
                  <li>
                    La tua applicazione è protetta dalle <em>Origini JavaScript autorizzate</em> impostate su Google Cloud Console.
                  </li>
                </ul>
              </div>

              <form onSubmit={handleSaveCredentials} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Google OAuth Client ID (ID Client Web) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showClientId ? "text" : "password"}
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="123456789-xxxxxx.apps.googleusercontent.com"
                      className="w-full bg-white border border-slate-300 rounded-xl pl-3.5 pr-10 py-2 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowClientId(!showClientId)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                      title={showClientId ? "Nascondi ID" : "Mostra ID"}
                    >
                      {showClientId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Richiede l&apos;abilitazione di &quot;Google Drive API&quot; nella tua Google Cloud Console.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Google API Key (Chiave API opzionale)
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIzaSyD..."
                      className="w-full bg-white border border-slate-300 rounded-xl pl-3.5 pr-10 py-2 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                      title={showApiKey ? "Nascondi chiave" : "Mostra chiave"}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      Salva Credenziali
                    </button>

                    {(apiKey || clientId) && (
                      <button
                        type="button"
                        onClick={handleClearCredentials}
                        className="px-3.5 py-2.5 border border-rose-200 text-rose-700 hover:bg-rose-50 font-semibold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        Rimuovi dal Browser
                      </button>
                    )}
                  </div>

                  {savedSuccess && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> Credenziali salvate con successo!
                    </span>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* RISULTATI DELL'INCROCIO (SE CI SONO FILE XML CARICATI) */}
          {parsedInvoices.length > 0 && (
            <div className="space-y-4 pt-2">
              
              {/* KPI DI RICONCILIAZIONE */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Fatture XML Lette</span>
                  <p className="text-xl font-black text-slate-900 mt-0.5">{parsedInvoices.length}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">RdP Riconciliati</span>
                  <p className="text-xl font-black text-emerald-800 mt-0.5">
                    {matchResults.filter(m => m.tipoMatch === 'EXACT_RDP' || m.tipoMatch === 'PREVENTIVO').length}
                  </p>
                </div>
                <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-purple-700 uppercase">Fatture Cumulative</span>
                  <p className="text-xl font-black text-purple-800 mt-0.5">
                    {matchResults.filter(m => m.isCumulativa).length} RdP
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-700 uppercase">Da Riconciliare</span>
                  <p className="text-xl font-black text-amber-800 mt-0.5">
                    {selectedMatchIds.size}
                  </p>
                </div>
              </div>

              {/* CONTROLLI FILTRI E RICERCA */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${filterType === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    Tutte ({matchResults.length})
                  </button>
                  <button
                    onClick={() => setFilterType('matched')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${filterType === 'matched' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700'}`}
                  >
                    Abbinati ({matchResults.filter(m => m.fatturaTrovata).length})
                  </button>
                  <button
                    onClick={() => setFilterType('cumulative')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${filterType === 'cumulative' ? 'bg-purple-700 text-white' : 'bg-purple-50 text-purple-700'}`}
                  >
                    Fatture Cumulative ({matchResults.filter(m => m.isCumulativa).length})
                  </button>
                  <button
                    onClick={() => setFilterType('unmatched')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold ${filterType === 'unmatched' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-700'}`}
                  >
                    Senza Riscontro ({matchResults.filter(m => !m.fatturaTrovata).length})
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cerca RdP, cliente, fattura..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1 text-xs outline-hidden"
                    />
                  </div>

                  <button
                    onClick={() => handleSelectAll(selectedMatchIds.size !== filteredMatches.filter(m => m.fatturaTrovata).length)}
                    className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    {selectedMatchIds.size === filteredMatches.filter(m => m.fatturaTrovata).length ? 'Deseleziona' : 'Seleziona Tutti'}
                  </button>
                </div>
              </div>

              {/* TABELLA DEI RISULTATI DELL'INCROCIO */}
              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase sticky top-0 z-10 border-b border-slate-200 text-[10px]">
                    <tr>
                      <th className="p-3 w-10 text-center">Applica</th>
                      <th className="p-3">Codice RdP / Campione</th>
                      <th className="p-3">Cliente / Dati Fiscali</th>
                      <th className="p-3">Stato Attuale</th>
                      <th className="p-3">Fattura XML Abbinata</th>
                      <th className="p-3">Tipo Corrispondenza</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredMatches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                          Nessun record corrispondente ai filtri selezionati.
                        </td>
                      </tr>
                    ) : (
                      filteredMatches.map(res => {
                        const isChecked = selectedMatchIds.has(res.pratica.id);
                        const hasMatch = !!res.fatturaTrovata;

                        return (
                          <tr 
                            key={res.pratica.id} 
                            className={`transition hover:bg-slate-50/80 ${
                              isChecked ? 'bg-emerald-50/40' : !hasMatch ? 'opacity-65' : ''
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={!hasMatch}
                                onChange={() => handleToggleSelect(res.pratica.id)}
                                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-30"
                              />
                            </td>

                            <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {res.pratica.numeroCampione}
                              {res.pratica.numeroPreventivo && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  Prev: {res.pratica.numeroPreventivo}
                                </div>
                              )}
                            </td>

                            <td className="p-3">
                              <div className="font-bold text-slate-800 max-w-[200px] truncate" title={res.pratica.nomeCliente}>
                                {res.pratica.nomeCliente}
                              </div>
                              <div className="text-[10.5px] text-slate-500 font-mono">
                                {res.pratica.partitaIva ? `P.IVA: ${res.pratica.partitaIva}` : ''}
                                {res.pratica.codiceFiscale ? ` CF: ${res.pratica.codiceFiscale}` : ''}
                              </div>
                            </td>

                            <td className="p-3 whitespace-nowrap">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                                res.pratica.statoFatturazione === 'Fatturato'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {res.pratica.statoFatturazione}
                              </span>
                              {res.pratica.numeroFattura && (
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  N. {res.pratica.numeroFattura} ({res.pratica.dataFattura || 'senza data'})
                                </div>
                              )}
                            </td>

                            <td className="p-3">
                              {res.fatturaTrovata ? (
                                <div className="space-y-0.5">
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span>Fattura n. {res.fatturaTrovata.numeroFattura} del {res.fatturaTrovata.dataFattura}</span>
                                  </div>
                                  <div className="text-[10.5px] text-slate-500 font-mono">
                                    Tot: €{res.fatturaTrovata.importoTotale.toFixed(2)} &bull; File: {res.fatturaTrovata.fileName}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Nessun file XML trovato</span>
                              )}
                            </td>

                            <td className="p-3">
                              {res.isCumulativa ? (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-[10px]">
                                    <Layers className="w-3 h-3" /> Fattura Cumulativa (+{res.altriRdpNellaFattura.length} RdP)
                                  </span>
                                  <div className="text-[9.5px] text-purple-700">
                                    Altri: {res.altriRdpNellaFattura.join(', ')}
                                  </div>
                                </div>
                              ) : res.tipoMatch === 'EXACT_RDP' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  <CheckCircle2 className="w-3 h-3" /> Match RdP Diretto
                                </span>
                              ) : res.tipoMatch === 'PREVENTIVO' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px]">
                                  Match Preventivo
                                </span>
                              ) : res.tipoMatch === 'FISCAL_CLIENT' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[10px]">
                                  Match Fiscale Cliente
                                </span>
                              ) : res.tipoMatch === 'ALREADY_INVOICED' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px]">
                                  Già Conforme
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER AZIONI */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex justify-between items-center shrink-0">
          <div className="text-xs text-slate-500">
            {parsedInvoices.length > 0 ? (
              <span>
                <strong>{selectedMatchIds.size}</strong> pratiche selezionate per l&apos;aggiornamento dello stato.
              </span>
            ) : (
              <span>Seleziona una cartella da Google Drive per iniziare l&apos;incrocio.</span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Annulla
            </button>

            {parsedInvoices.length > 0 && (
              <button
                onClick={handleApplyReconciliation}
                disabled={selectedMatchIds.size === 0}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Applica Riconciliazione ({selectedMatchIds.size} Pratiche)
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
