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
  Check, 
  ChevronRight,
  ShieldCheck,
  Search,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Folder,
  FolderOpen,
  ArrowLeft,
  FileCode,
  Download,
  CreditCard,
  Pin,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
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
  parents?: string[];
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

  // Cartella Google Drive Predefinita (salvata in localStorage per sync in 1 clic)
  const [savedDefaultFolder, setSavedDefaultFolder] = useState<{ id: string; name: string } | null>(() => {
    try {
      const raw = localStorage.getItem('lims_google_default_folder');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Regola riconoscimento stato pagamento ('auto' | 'paid' | 'unpaid')
  const [forcePaidMode, setForcePaidMode] = useState<'auto' | 'paid' | 'unpaid'>('auto');

  // Loading & Processing States
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [loadingStatusText, setLoadingStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // In-App Google Drive Explorer State
  const [driveConnected, setDriveConnected] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<{ id: string; name: string }>({ id: 'root', name: 'Il mio Drive' });
  const [folderHistory, setFolderHistory] = useState<Array<{ id: string; name: string }>>([]);
  const [folderItems, setFolderItems] = useState<GoogleDriveItem[]>([]);

  // Parsed XML & Reconciliation Results
  const [parsedInvoices, setParsedInvoices] = useState<ParsedFatturaXml[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set());
  // Override manuali per stato pagato / data pagamento per singola pratica prima dell'applicazione
  const [paidOverrides, setPaidOverrides] = useState<Record<string, { pagato: boolean; dataPagamento: string }>>({});
  const [filterType, setFilterType] = useState<'all' | 'matched' | 'payment_update' | 'cumulative' | 'unmatched'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Script loading flags & token storage
  const [, setGisLoaded] = useState(false);
  const tokenClientRef = useRef<any>(null);
  const accessTokenRef = useRef<string | null>(null);

  // Carica GIS quando la modale è aperta
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

  // Salva o rimuove la cartella Drive predefinita
  const handleSaveDefaultFolder = (folder: { id: string; name: string } | null) => {
    setSavedDefaultFolder(folder);
    if (folder) {
      localStorage.setItem('lims_google_default_folder', JSON.stringify(folder));
    } else {
      localStorage.removeItem('lims_google_default_folder');
    }
  };

  // Esegue la riconciliazione ogni volta che cambiano i file XML parsati
  useEffect(() => {
    if (parsedInvoices.length > 0) {
      const results = riconciliaPraticheConFattureXml(pratiche, parsedInvoices, clients);
      setMatchResults(results);

      const preSelected = new Set<string>();
      const initialOverrides: Record<string, { pagato: boolean; dataPagamento: string }> = {};

      results.forEach(r => {
        if (r.selezionato) {
          preSelected.add(r.pratica.id);
        }
        if (r.fatturaTrovata) {
          initialOverrides[r.pratica.id] = {
            pagato: r.pagatoProposto,
            dataPagamento: r.dataPagamentoProposta || new Date().toISOString().split('T')[0]
          };
        }
      });
      setSelectedMatchIds(preSelected);
      setPaidOverrides(initialOverrides);
    } else {
      setMatchResults([]);
      setSelectedMatchIds(new Set());
      setPaidOverrides({});
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
      
      const query = `'${folderId}' in parents and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,modifiedTime,size,parents)&pageSize=150&orderBy=folder,name&supportsAllDrives=true&includeItemsFromAllDrives=true`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 401) {
          accessTokenRef.current = null;
        }
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

  // Risolve i nomi delle cartelle genitore su Google Drive per riconoscere cartelle "Pagate" / "Da Pagare"
  const resolveFolderNamesMap = async (parentIds: string[], token: string): Promise<Map<string, string>> => {
    const map = new Map<string, string>();
    const uniqueIds = Array.from(new Set(parentIds.filter(Boolean)));
    for (const pid of uniqueIds) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${pid}?fields=id,name&supportsAllDrives=true`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const info = await res.json();
          if (info?.name) {
            map.set(pid, info.name);
          }
        }
      } catch {
        // Ignora errori non bloccanti su singola cartella
      }
    }
    return map;
  };

  // 2. SCANSIONE AUTOMATICA INTEGRALE XML SU GOOGLE DRIVE
  const handleAutoScanAllDriveXmls = async () => {
    setIsLoadingDrive(true);
    setLoadingStatusText("Ricerca automatica di tutti i file XML di Fattura su Google Drive...");
    setErrorMessage(null);

    try {
      const token = await obtainOAuthToken();

      const query = `name contains '.xml' and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,parents,modifiedTime)&pageSize=500&supportsAllDrives=true&includeItemsFromAllDrives=true`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 401) accessTokenRef.current = null;
        throw new Error(`Impossibile eseguire la ricerca su Google Drive (HTTP ${res.status})`);
      }

      const data = await res.json();
      const files: GoogleDriveItem[] = data.files || [];

      if (files.length === 0) {
        setErrorMessage("Nessun file con estensione .xml trovato nel tuo account Google Drive.");
        setIsLoadingDrive(false);
        return;
      }

      setLoadingStatusText(`Risoluzione cartelle di appartenenza per ${files.length} file XML...`);
      const allParentIds = files.flatMap(f => f.parents || []);
      const folderNamesMap = await resolveFolderNamesMap(allParentIds, token);

      const parsedList: ParsedFatturaXml[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const parentFolderName = file.parents?.[0] ? folderNamesMap.get(file.parents[0]) : undefined;
        setLoadingStatusText(`Analisi XML (${i + 1}/${files.length}): ${file.name}${parentFolderName ? ` [${parentFolderName}]` : ''}...`);
        try {
          const content = await fetchFileContent(file.id, token);
          const parsed = parseFatturaElettronicaXml(content, file.name, file.id, {
            folderName: parentFolderName,
            forcePaidMode,
            fileModifiedDate: file.modifiedTime
          });
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

  // 3. IMPORTA TUTTI I FILE XML DALLA CARTELLA CORRENTE O PREDEFINITA
  const handleImportFolderXmls = async (targetFolder: { id: string; name: string } = currentFolder) => {
    setIsLoadingDrive(true);
    setLoadingStatusText(`Importazione di tutti i file XML da "${targetFolder.name}" (incluse sottocartelle Pagate / Da Pagare)...`);
    setErrorMessage(null);

    try {
      const token = await obtainOAuthToken();
      const xmls = await fetchXmlsFromFolder(targetFolder.id, targetFolder.name, token);

      if (xmls.length === 0) {
        setErrorMessage(`Nessun file XML valido trovato all'interno della cartella "${targetFolder.name}" o nelle sue sottocartelle.`);
      } else {
        setParsedInvoices(xmls);
      }
    } catch (err: any) {
      setErrorMessage(`Errore durante l'importazione: ${err.message}`);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  // Funzione ricorsiva per elencare e scaricare XML da una cartella di Google Drive preservando il percorso cartella (es. "Fatture / Pagate")
  const fetchXmlsFromFolder = async (folderId: string, folderPathName: string, token: string): Promise<ParsedFatturaXml[]> => {
    const listUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,modifiedTime)&pageSize=500&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    
    const res = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      if (res.status === 401) accessTokenRef.current = null;
      throw new Error(`Impossibile leggere la cartella (HTTP ${res.status})`);
    }

    const data = await res.json();
    const files: GoogleDriveItem[] = data.files || [];
    const results: ParsedFatturaXml[] = [];

    for (const file of files) {
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        const subPath = folderPathName ? `${folderPathName} / ${file.name}` : file.name;
        setLoadingStatusText(`Scansione sottocartella "${subPath}"...`);
        const subFiles = await fetchXmlsFromFolder(file.id, subPath, token);
        results.push(...subFiles);
      } else if (file.name?.toLowerCase().endsWith('.xml') || file.mimeType?.includes('xml')) {
        setLoadingStatusText(`Lettura XML: ${file.name} (${folderPathName})...`);
        const content = await fetchFileContent(file.id, token);
        const parsed = parseFatturaElettronicaXml(content, file.name, file.id, {
          folderName: folderPathName,
          forcePaidMode,
          fileModifiedDate: file.modifiedTime
        });
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

  // GESTIONE CARICAMENTO MANUALE FILE O INTERA CARTELLA LOCALE (Drag & Drop, File Input o Directory Input)
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
      setErrorMessage("Nessun file con estensione .xml trovato nei file o nella cartella selezionata.");
      return;
    }

    setIsLoadingDrive(true);
    setLoadingStatusText(`Lettura di ${xmlFiles.length} file XML locali...`);
    setErrorMessage(null);

    const parsedList: ParsedFatturaXml[] = [];

    for (const f of xmlFiles) {
      try {
        const text = await f.text();
        // Estrae eventuale nome cartella dal webkitRelativePath (es. "Fatture_Drive/Pagate/IT01234.xml" -> "Fatture_Drive / Pagate")
        const relPath = (f as any).webkitRelativePath as string | undefined;
        let folderFromPath = '';
        if (relPath && relPath.includes('/')) {
          const parts = relPath.split('/');
          parts.pop(); // rimuove il nome del file
          folderFromPath = parts.join(' / ');
        }
        const fileModIso = f.lastModified ? new Date(f.lastModified).toISOString().split('T')[0] : undefined;

        const parsed = parseFatturaElettronicaXml(text, f.name, relPath || f.name, {
          folderName: folderFromPath || undefined,
          forcePaidMode,
          fileModifiedDate: fileModIso
        });
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

  // Ricalcola lo stato pagato/non pagato se l'utente cambia il selettore forcePaidMode mentre gli XML sono già caricati
  const handleChangeForcePaidMode = (newMode: 'auto' | 'paid' | 'unpaid') => {
    setForcePaidMode(newMode);
    if (parsedInvoices.length > 0) {
      const updatedXmls = parsedInvoices.map(inv => {
        if (newMode === 'paid') {
          return {
            ...inv,
            pagatoRilevato: true,
            dataPagamentoRilevata: inv.dataPagamentoRilevata || inv.dataScadenzaPagamento || inv.dataFattura || new Date().toISOString().split('T')[0],
            fonteStatoPagamento: 'CARTELLA_DRIVE' as const,
            dettaglioStatoPagamento: `Forzato come PAGATO da selettore utente`
          };
        }
        if (newMode === 'unpaid') {
          return {
            ...inv,
            pagatoRilevato: false,
            dataPagamentoRilevata: undefined,
            fonteStatoPagamento: 'CARTELLA_DRIVE' as const,
            dettaglioStatoPagamento: `Forzato come DA PAGARE da selettore utente`
          };
        }
        return inv;
      });
      setParsedInvoices(updatedXmls);
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

  // Toggle stato Pagato / Non Pagato per una singola riga nella tabella di anteprima
  const handleToggleRowPaidOverride = (praticaId: string, defaultDate?: string) => {
    setPaidOverrides(prev => {
      const current = prev[praticaId] || { pagato: false, dataPagamento: defaultDate || new Date().toISOString().split('T')[0] };
      const nextPaid = !current.pagato;
      return {
        ...prev,
        [praticaId]: {
          pagato: nextPaid,
          dataPagamento: nextPaid ? (current.dataPagamento || defaultDate || new Date().toISOString().split('T')[0]) : ''
        }
      };
    });
    // Se l'utente modifica lo stato pagamento sulla riga, la seleziona automaticamente per l'applicazione
    setSelectedMatchIds(prev => {
      const next = new Set(prev);
      next.add(praticaId);
      return next;
    });
  };

  const handleChangeRowPaidDate = (praticaId: string, newDate: string) => {
    setPaidOverrides(prev => ({
      ...prev,
      [praticaId]: {
        pagato: true,
        dataPagamento: newDate
      }
    }));
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

  // APPLICAZIONE FINALE DELLE RICONCILIAZIONI (FATTURA + STATO PAGAMENTO) NEL GESTIONALE
  const handleApplyReconciliation = () => {
    if (selectedMatchIds.size === 0) {
      alert("Seleziona almeno una pratica da riconciliare.");
      return;
    }

    let countPagate = 0;
    let countDaPagare = 0;

    const updatedPratiche = pratiche.map(p => {
      if (selectedMatchIds.has(p.id)) {
        const match = matchResults.find(m => m.pratica.id === p.id);
        if (match?.fatturaTrovata) {
          const override = paidOverrides[p.id];
          const finalPaid = override !== undefined ? override.pagato : match.pagatoProposto;
          const finalPaidDate = finalPaid
            ? (override?.dataPagamento || match.dataPagamentoProposta || match.fatturaTrovata.dataFattura || new Date().toISOString().split('T')[0])
            : '';

          if (finalPaid) countPagate++;
          else countDaPagare++;

          const xmlTag = `Riconciliato da XML (${match.fatturaTrovata.fileName})`;
          const existingNote = (p.note || '').trim();
          const updatedNote = existingNote.includes(match.fatturaTrovata.fileName)
            ? existingNote
            : existingNote
            ? `${existingNote} | ${xmlTag}`
            : xmlTag;

          return {
            ...p,
            statoFatturazione: 'Fatturato' as const,
            numeroFattura: match.fatturaTrovata.numeroFattura,
            dataFattura: match.fatturaTrovata.dataFattura || p.dataFattura || new Date().toISOString().split('T')[0],
            pagato: finalPaid,
            dataPagamento: finalPaidDate,
            note: updatedNote
          };
        }
      }
      return p;
    });

    onUpdatePratiche(updatedPratiche);

    const operatore = selectedOperator || operators[0]?.nome || 'Amministrazione';
    addAuditLogEntry(
      operatore,
      'Fatturazione',
      'Riconciliazione Automatica XML & Pagamenti (Drive)',
      `${selectedMatchIds.size} pratiche elaborate`,
      `Fatturate: ${selectedMatchIds.size} (${countPagate} saldate/pagate, ${countDaPagare} da pagare)`
    );

    alert(
      `✅ Riconciliazione XML completata con successo!\n\n` +
      `• Pratiche aggiornate: ${selectedMatchIds.size}\n` +
      `• Segnate come PAGATE (Saldate): ${countPagate}\n` +
      `• Segnate come DA PAGARE: ${countDaPagare}`
    );
    onClose();
  };

  // Filtra i risultati per visualizzazione
  const filteredMatches = matchResults.filter(item => {
    if (filterType === 'matched' && !item.fatturaTrovata) return false;
    if (filterType === 'payment_update' && item.tipoMatch !== 'PAYMENT_UPDATE') return false;
    if (filterType === 'cumulative' && !item.isCumulativa) return false;
    if (filterType === 'unmatched' && item.fatturaTrovata) return false;

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
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl overflow-hidden flex flex-col max-h-[93vh]"
      >
        {/* INTESTAZIONE MODALE */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold tracking-tight">
                  Riconciliazione Automatica Fatture XML & Stato Pagamenti
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-bold uppercase">
                  Google Drive + FatturaPA
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Incrocia i Rapporti di Prova (RdP) con i file XML su Drive e imposta in automatico se la fattura è <strong>Pagata</strong> o <strong>Da Pagare</strong>.
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

        {/* BARRA TAB DI SELEZIONE MODALITÀ + REGOLA STATO PAGAMENTO */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap justify-between items-center gap-3 shrink-0">
          <div className="flex flex-wrap gap-2">
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

            {parsedInvoices.length > 0 && (
              <button
                onClick={() => setParsedInvoices([])}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
              >
                ↺ Nuova Scansione
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Selettore Regola Riconoscimento Pagamento */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Stato Pagamento:</span>
              <select
                value={forcePaidMode}
                onChange={(e) => handleChangeForcePaidMode(e.target.value as 'auto' | 'paid' | 'unpaid')}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                title="Scegli come determinare se le fatture XML lette sono Pagate o Non Pagate"
              >
                <option value="auto">🤖 Auto (da XML &lt;DatiPagamento&gt; + Nome Cartella Drive)</option>
                <option value="paid">✅ Segna tutte le fatture lette come PAGATE</option>
                <option value="unpaid">⏳ Segna tutte le fatture lette come DA PAGARE</option>
              </select>
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
              Chiavi API ({clientId ? 'Configurate ✅' : 'Da impostare ⚠️'})
            </button>
          </div>
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
                className="text-rose-400 hover:text-rose-700 font-bold text-xs cursor-pointer"
              >
                Chiudi
              </button>
            </div>
          )}

          {/* BANNER CARTELLA PREDEFINITA (SE CONFIGURATA) */}
          {activeTab === 'drive' && parsedInvoices.length === 0 && savedDefaultFolder && (
            <div className="p-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
                  <Pin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-300 font-bold block">
                    Cartella Google Drive Predefinita
                  </span>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    📂 {savedDefaultFolder.name}
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    Legge i file XML nella cartella (ed eventuali sottocartelle <code>Pagate</code> / <code>Da Pagare</code>) e aggiorna fatture e saldi.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleImportFolderXmls(savedDefaultFolder)}
                  disabled={isLoadingDrive}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                  Sincronizza Ora in 1 Clic
                </button>
                <button
                  onClick={() => handleSaveDefaultFolder(null)}
                  className="p-2 text-slate-400 hover:text-rose-300 hover:bg-white/10 rounded-lg transition cursor-pointer"
                  title="Rimuovi cartella predefinita"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: GOOGLE DRIVE (SCANSIONE + ESPLORATORE CARTELLE) */}
          {activeTab === 'drive' && parsedInvoices.length === 0 && (
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
                      Scansione Automatica Fatture XML e Pagamenti
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Cerca tutti i file <code>.xml</code> nel tuo Google Drive, legge i tag <code>&lt;DatiPagamento&gt;</code> e il nome della cartella (es. <strong>&quot;Pagate&quot;</strong> o <strong>&quot;Da Pagare&quot;</strong>) per impostare in automatico lo stato del pagamento.
                    </p>
                  </div>

                  <button
                    onClick={handleAutoScanAllDriveXmls}
                    disabled={isLoadingDrive}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                    {isLoadingDrive ? (loadingStatusText || 'Scansione in corso...') : '⚡ Scansiona Tutti i File XML su Drive'}
                  </button>
                </div>

                {/* OPZIONE 2: SFOGLIA LE CARTELLE DI GOOGLE DRIVE */}
                <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200/80 rounded-2xl p-5 space-y-3.5 shadow-xs flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Seleziona una Cartella Specifica su Google Drive
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Sfoglia le cartelle del tuo Drive (es. <code>Fatture_XML</code> con sottocartelle <code>Pagate</code> / <code>Da Pagare</code>) e salvala come predefinita per le prossime sincronizzazioni.
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
              {(driveConnected || folderItems.length > 0) && (
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

                    <div className="flex flex-wrap items-center gap-2">
                      {currentFolder.id !== 'root' && (
                        <button
                          onClick={() => handleSaveDefaultFolder(currentFolder)}
                          className={`px-3 py-1.5 border rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                            savedDefaultFolder?.id === currentFolder.id
                              ? 'bg-indigo-100 border-indigo-300 text-indigo-800'
                              : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'
                          }`}
                          title="Memorizza questa cartella per sincronizzarla in 1 clic"
                        >
                          <Pin className="w-3.5 h-3.5 text-indigo-600" />
                          {savedDefaultFolder?.id === currentFolder.id ? 'Cartella Predefinita ✓' : 'Imposta come Predefinita'}
                        </button>
                      )}

                      <button
                        onClick={() => handleImportFolderXmls(currentFolder)}
                        disabled={isLoadingDrive}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Riconcilia Tutti gli XML di Questa Cartella
                      </button>
                    </div>
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

              {/* GUIDA ORGANIZZAZIONE CARTELLE PER PAGAMENTI AUTOMATICI */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">Come funziona l&apos;impostazione automatica Pagato / Non Pagato:</strong> il sistema legge automaticamente i tag <code>&lt;DatiPagamento&gt;</code> e le causali di quietanza dentro ciascun file XML. Inoltre, se organizzi i file XML su Drive in sottocartelle chiamate ad esempio <strong><code>Pagate</code></strong> (o <code>Saldate</code>) e <strong><code>Da Pagare</code></strong> (o <code>Insolute</code>), il programma imposterà automaticamente lo stato di pagamento corrispondente!
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CARICAMENTO LOCALE / DRAG & DROP FILE O CARTELLA */}
          {activeTab === 'upload' && parsedInvoices.length === 0 && (
            <div className="space-y-4">
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleLocalFilesUpload}
                className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/30 rounded-2xl p-8 text-center transition space-y-4"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                  <FileUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Trascina qui i file XML o seleziona una cartella (es. Google Drive Desktop)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Supporta anche la lettura ricorsiva di sottocartelle <code>Pagate</code> e <code>Da Pagare</code>
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition">
                    <FolderOpen className="w-4 h-4" />
                    Scegli Intera Cartella XML
                    <input 
                      type="file" 
                      multiple 
                      {...({ webkitdirectory: '', directory: '' } as any)}
                      onChange={handleLocalFilesUpload}
                      className="hidden" 
                    />
                  </label>

                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl shadow-xs cursor-pointer transition">
                    <UploadCloud className="w-4 h-4 text-blue-500" />
                    Scegli Singoli File XML
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
          {parsedInvoices.length > 0 && activeTab !== 'settings' && (
            <div className="space-y-4 pt-1">
              
              {/* KPI DI RICONCILIAZIONE FATTURE & PAGAMENTI */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Fatture XML Lette</span>
                  <p className="text-xl font-black text-slate-900 mt-0.5">{parsedInvoices.length}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">RdP Abbinati</span>
                  <p className="text-xl font-black text-emerald-800 mt-0.5">
                    {matchResults.filter(m => m.fatturaTrovata).length}
                  </p>
                </div>
                <div className="bg-teal-50 border border-teal-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-teal-800 uppercase">Rilevate Pagate ✓</span>
                  <p className="text-xl font-black text-teal-800 mt-0.5">
                    {matchResults.filter(m => m.fatturaTrovata && (paidOverrides[m.pratica.id]?.pagato ?? m.pagatoProposto)).length}
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-800 uppercase">Rilevate Da Pagare ⏳</span>
                  <p className="text-xl font-black text-amber-800 mt-0.5">
                    {matchResults.filter(m => m.fatturaTrovata && !(paidOverrides[m.pratica.id]?.pagato ?? m.pagatoProposto)).length}
                  </p>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase">Pronte da Applicare</span>
                  <p className="text-xl font-black text-indigo-900 mt-0.5">
                    {selectedMatchIds.size}
                  </p>
                </div>
              </div>

              {/* CONTROLLI FILTRI E RICERCA */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${filterType === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    Tutte ({matchResults.length})
                  </button>
                  <button
                    onClick={() => setFilterType('matched')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${filterType === 'matched' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700'}`}
                  >
                    Abbinate ({matchResults.filter(m => m.fatturaTrovata).length})
                  </button>
                  <button
                    onClick={() => setFilterType('payment_update')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${filterType === 'payment_update' ? 'bg-teal-700 text-white' : 'bg-teal-50 text-teal-700'}`}
                  >
                    Nuovi Pagamenti Rilevati ({matchResults.filter(m => m.tipoMatch === 'PAYMENT_UPDATE').length})
                  </button>
                  <button
                    onClick={() => setFilterType('cumulative')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${filterType === 'cumulative' ? 'bg-purple-700 text-white' : 'bg-purple-50 text-purple-700'}`}
                  >
                    Fatture Cumulative ({matchResults.filter(m => m.isCumulativa).length})
                  </button>
                  <button
                    onClick={() => setFilterType('unmatched')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${filterType === 'unmatched' ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-700'}`}
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
                      <th className="p-3">Stato Pagamento (XML / Drive)</th>
                      <th className="p-3">Tipo Corrispondenza</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredMatches.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                          Nessun record corrispondente ai filtri selezionati.
                        </td>
                      </tr>
                    ) : (
                      filteredMatches.map(res => {
                        const isChecked = selectedMatchIds.has(res.pratica.id);
                        const hasMatch = !!res.fatturaTrovata;
                        const rowPaidState = paidOverrides[res.pratica.id]?.pagato ?? res.pagatoProposto;
                        const rowPaidDate = paidOverrides[res.pratica.id]?.dataPagamento ?? res.dataPagamentoProposta;

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
                              <div className="font-bold text-slate-800 max-w-[180px] truncate" title={res.pratica.nomeCliente}>
                                {res.pratica.nomeCliente}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {res.pratica.partitaIva ? `P.IVA: ${res.pratica.partitaIva}` : ''}
                                {res.pratica.codiceFiscale ? ` CF: ${res.pratica.codiceFiscale}` : ''}
                              </div>
                            </td>

                            <td className="p-3 whitespace-nowrap">
                              <div className="flex flex-col gap-0.5">
                                <span className={`inline-block w-fit px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  res.pratica.statoFatturazione === 'Fatturato'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {res.pratica.statoFatturazione}
                                </span>
                                <span className={`text-[10px] font-bold ${res.pratica.pagato ? 'text-emerald-700' : 'text-slate-400'}`}>
                                  {res.pratica.pagato ? `Saldato (${res.pratica.dataPagamento || ''})` : 'Non saldato'}
                                </span>
                              </div>
                            </td>

                            <td className="p-3">
                              {res.fatturaTrovata ? (
                                <div className="space-y-0.5">
                                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                    <span>Fatt. {res.fatturaTrovata.numeroFattura} del {res.fatturaTrovata.dataFattura}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    Tot: €{res.fatturaTrovata.importoTotale.toFixed(2)} &bull; {res.fatturaTrovata.fileName}
                                  </div>
                                  {res.fatturaTrovata.folderName && (
                                    <div className="text-[9.5px] text-indigo-700 font-semibold">
                                      📂 {res.fatturaTrovata.folderName}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Nessun file XML trovato</span>
                              )}
                            </td>

                            {/* COLONNA STATO PAGAMENTO INTERATTIVA */}
                            <td className="p-3">
                              {res.fatturaTrovata ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleRowPaidOverride(res.pratica.id, res.fatturaTrovata?.dataFattura)}
                                      className={`px-2.5 py-1 rounded-lg font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 transition cursor-pointer border ${
                                        rowPaidState
                                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                                          : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                      }`}
                                      title="Clicca per cambiare manualmente tra Pagata e Da Pagare"
                                    >
                                      {rowPaidState ? (
                                        <>
                                          <Check className="w-3 h-3 stroke-[3]" />
                                          PAGATA (Saldata)
                                        </>
                                      ) : (
                                        <>
                                          <Clock className="w-3 h-3" />
                                          DA PAGARE
                                        </>
                                      )}
                                    </button>

                                    {rowPaidState && (
                                      <input
                                        type="date"
                                        value={rowPaidDate || ''}
                                        onChange={(e) => handleChangeRowPaidDate(res.pratica.id, e.target.value)}
                                        className="text-[10px] font-mono font-bold text-emerald-800 bg-white border border-emerald-200 rounded px-1.5 py-0.5 w-[108px]"
                                        title="Data di pagamento / incasso"
                                      />
                                    )}
                                  </div>
                                  <div className="text-[9.5px] text-slate-500 leading-tight max-w-[230px]" title={res.fatturaTrovata.dettaglioStatoPagamento}>
                                    {res.fatturaTrovata.dettaglioStatoPagamento}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">—</span>
                              )}
                            </td>

                            <td className="p-3">
                              {res.tipoMatch === 'PAYMENT_UPDATE' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold text-[10px]">
                                  <CreditCard className="w-3 h-3" /> Aggiornamento Saldo
                                </span>
                              ) : res.isCumulativa ? (
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
                                  Già Allineata
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
                <strong>{selectedMatchIds.size}</strong> pratiche selezionate per l&apos;aggiornamento di fattura e stato pagamento.
              </span>
            ) : (
              <span>Seleziona una cartella da Google Drive o dal PC per iniziare l&apos;incrocio automatico.</span>
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
                Applica Fatture e Pagamenti ({selectedMatchIds.size} Pratiche)
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
