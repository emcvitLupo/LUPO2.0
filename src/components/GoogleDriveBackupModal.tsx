import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Database,
  UploadCloud,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Key,
  Lock,
  FolderOpen,
  FileJson,
  Eye,
  EyeOff,
  Clock,
  HardDrive,
  Check
} from 'lucide-react';
import {
  Client,
  Prova,
  Pacchetto,
  Preventivo,
  AccettazioneCampione,
  PraticaFatturazione,
  Reagente,
  ReagenteRitirato,
  Strumento,
  Operator,
  AuditLog
} from '../types';
import { SYNCED_LIMS_SETTINGS_KEYS } from '../utils/supabaseClient';
import { verifyOperatorPassword } from '../utils/limsHelpers';
import { getOperatorQualificationLabel } from '../utils/operatorSanitizer';

export interface LimsDatabaseBackupPayload {
  meta: {
    app: string;
    version: string;
    exportedAt: string;
    exportedBy: string;
    counts: {
      clients: number;
      prove: number;
      pacchetti: number;
      preventivi: number;
      accettazioni: number;
      praticheFatturazione: number;
      reagenti: number;
      reagentiRitirati: number;
      strumenti: number;
      operators: number;
      auditLogs: number;
      settingsCount: number;
    };
  };
  data: {
    clients: Client[];
    prove: Prova[];
    pacchetti: Pacchetto[];
    preventivi: Preventivo[];
    accettazioni: AccettazioneCampione[];
    praticheFatturazione: PraticaFatturazione[];
    reagenti: Reagente[];
    reagentiRitirati: ReagenteRitirato[];
    strumenti: Strumento[];
    operators: Operator[];
    auditLogs: AuditLog[];
    limsSettings: Record<string, string>;
  };
}

interface DriveBackupFileItem {
  id: string;
  name: string;
  modifiedTime?: string;
  size?: string;
}

interface GoogleDriveBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  prove: Prova[];
  pacchetti: Pacchetto[];
  preventivi: Preventivo[];
  accettazioni: AccettazioneCampione[];
  praticheFatturazione: PraticaFatturazione[];
  reagenti: Reagente[];
  reagentiRitirati: ReagenteRitirato[];
  strumenti: Strumento[];
  operators: Operator[];
  auditLogs: AuditLog[];
  currentUserProfileName?: string | null;
  isSupabaseConnected: boolean;
  onRestoreFullBackup: (
    payload: LimsDatabaseBackupPayload,
    syncToSupabase: boolean,
    operatorName: string,
    sourceLabel: string
  ) => Promise<void>;
  addAuditLogEntry: (utente: string, sezione: string, campo: string, vOld: string, vNew: string) => void;
}

const BACKUP_FOLDER_NAME = 'LIMS_LUPO_2.0_Backups';
const EXTRA_LOCAL_ARCHIVE_KEYS = [
  'archivio_imballaggi',
  'archivio_etichette_campione',
  'archivio_campionato_da',
  'archivio_procedure_campionamento',
  'archivio_qualita_consegnante'
];

export function GoogleDriveBackupModal({
  isOpen,
  onClose,
  clients,
  prove,
  pacchetti,
  preventivi,
  accettazioni,
  praticheFatturazione,
  reagenti,
  reagentiRitirati,
  strumenti,
  operators,
  auditLogs,
  currentUserProfileName,
  isSupabaseConnected,
  onRestoreFullBackup,
  addAuditLogEntry
}: GoogleDriveBackupModalProps) {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore' | 'settings'>('backup');

  // Credenziali Google OAuth (condivise con il modulo Riconciliazione XML)
  const [clientId, setClientId] = useState<string>(() => {
    return localStorage.getItem('lims_google_client_id') || (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';
  });
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('lims_google_api_key') || (import.meta.env.VITE_GOOGLE_API_KEY as string) || '';
  });
  const [showClientId, setShowClientId] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [credentialsSavedMsg, setCredentialsSavedMsg] = useState(false);

  // Stato ultimo backup registrato
  const [lastBackupInfo, setLastBackupInfo] = useState<{
    dateStr: string;
    destination: string;
    fileName: string;
  } | null>(() => {
    try {
      const raw = localStorage.getItem('lims_last_backup_info');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Stati operativi Google Drive
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Stati scheda Ripristino
  const [driveBackupFiles, setDriveBackupFiles] = useState<DriveBackupFileItem[]>([]);
  const [pendingRestorePayload, setPendingRestorePayload] = useState<LimsDatabaseBackupPayload | null>(null);
  const [pendingRestoreSourceLabel, setPendingRestoreSourceLabel] = useState<string>('');
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [operatorPassword, setOperatorPassword] = useState<string>('');
  const [syncSupabaseOnRestore, setSyncSupabaseOnRestore] = useState<boolean>(true);

  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const activeOps = operators.filter(o => o.attivo !== false);
    if (activeOps.length > 0 && !selectedOperator) {
      setSelectedOperator(activeOps[0].nome);
    }
  }, [operators, selectedOperator]);

  useEffect(() => {
    setSyncSupabaseOnRestore(isSupabaseConnected);
  }, [isSupabaseConnected]);

  if (!isOpen) return null;

  // Costruisce il pacchetto JSON completo del database LIMS in modo isolato e sicuro
  const buildFullBackupPayload = (): LimsDatabaseBackupPayload => {
    const limsSettings: Record<string, string> = {};
    const allKeys = Array.from(new Set([...SYNCED_LIMS_SETTINGS_KEYS, ...EXTRA_LOCAL_ARCHIVE_KEYS]));
    allKeys.forEach(k => {
      try {
        const val = localStorage.getItem(k);
        if (val !== null) {
          limsSettings[k] = val;
        }
      } catch {
        // Ignora errori di accesso localStorage
      }
    });

    const exportedBy = currentUserProfileName || selectedOperator || operators[0]?.nome || 'Amministratore LIMS';

    return {
      meta: {
        app: 'LUPO 2.0 - LIMS Laboratorio Chimico Merceologico',
        version: '2.0',
        exportedAt: new Date().toISOString(),
        exportedBy,
        counts: {
          clients: clients.length,
          prove: prove.length,
          pacchetti: pacchetti.length,
          preventivi: preventivi.length,
          accettazioni: accettazioni.length,
          praticheFatturazione: praticheFatturazione.length,
          reagenti: reagenti.length,
          reagentiRitirati: reagentiRitirati.length,
          strumenti: strumenti.length,
          operators: operators.length,
          auditLogs: auditLogs.length,
          settingsCount: Object.keys(limsSettings).length
        }
      },
      data: {
        clients,
        prove,
        pacchetti,
        preventivi,
        accettazioni,
        praticheFatturazione,
        reagenti,
        reagentiRitirati,
        strumenti,
        operators,
        auditLogs,
        limsSettings
      }
    };
  };

  const getTimestampSuffix = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}_${hh}-${min}`;
  };

  const recordBackupSuccess = (destination: string, fileName: string) => {
    const info = {
      dateStr: new Date().toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      destination,
      fileName
    };
    setLastBackupInfo(info);
    try {
      localStorage.setItem('lims_last_backup_info', JSON.stringify(info));
    } catch {}
  };

  // 1. DOWNLOAD BACKUP SU PC LOCALE (.JSON)
  const handleDownloadLocalBackup = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const payload = buildFullBackupPayload();
      const jsonString = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const fileName = `LIMS_Backup_${getTimestampSuffix()}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      recordBackupSuccess('PC Locale (File .JSON)', fileName);
      setSuccessMessage(`Backup completo scaricato con successo sul tuo PC: "${fileName}".`);
      addAuditLogEntry(
        currentUserProfileName || selectedOperator || 'Amministratore',
        'Sistema / Database',
        'Esportazione Backup Completo su PC',
        '-',
        `File: ${fileName} (${accettazioni.length} campioni, ${preventivi.length} preventivi, ${clients.length} clienti)`
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Errore durante la generazione del file di backup locale.');
    }
  };

  // OTTIENE TOKEN OAUTH2 GOOGLE CON PERMESSO SCRITTURA FILE DELL'APP (drive.file + drive.readonly)
  const obtainDriveWriteToken = async (): Promise<string> => {
    if (accessTokenRef.current) {
      return accessTokenRef.current;
    }

    if (!clientId.trim()) {
      setActiveTab('settings');
      throw new Error('Inserisci il tuo Google OAuth Client ID nella scheda "Impostazioni Google Drive" (oppure usa il pulsante "Scarica Backup su PC").');
    }

    if (!window.google?.accounts?.oauth2) {
      throw new Error('Il servizio Google Identity Services non è ancora pronto. Verifica la connessione internet o ricarica la pagina.');
    }

    return new Promise((resolve, reject) => {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId.trim(),
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
          callback: (response: any) => {
            if (response.error) {
              reject(new Error(`Autorizzazione Google negata: ${response.error} (${response.error_description || ''})`));
              return;
            }
            accessTokenRef.current = response.access_token;
            resolve(response.access_token);
          },
          error_callback: (err: any) => {
            reject(new Error(err?.message || 'Finestra di autenticazione Google chiusa o bloccata dal browser.'));
          }
        });
        tokenClient.requestAccessToken({ prompt: '' });
      } catch (err: any) {
        reject(err);
      }
    });
  };

  // Trova o crea la cartella dedicata LIMS_LUPO_2.0_Backups su Google Drive
  const ensureBackupFolderOnDrive = async (token: string): Promise<string> => {
    const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${BACKUP_FOLDER_NAME}' and trashed = false`;
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=5&supportsAllDrives=true&includeItemsFromAllDrives=true`;

    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      if (res.status === 401) accessTokenRef.current = null;
      throw new Error(`Impossibile accedere a Google Drive (HTTP ${res.status}).`);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    // Crea la cartella se non esiste
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: BACKUP_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });

    if (!createRes.ok) {
      const errJson = await createRes.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Impossibile creare la cartella "${BACKUP_FOLDER_NAME}" su Google Drive.`);
    }

    const folderData = await createRes.json();
    return folderData.id;
  };

  // Carica o aggiorna un file JSON su Google Drive (Multipart Upload)
  const uploadJsonFileToDrive = async (
    token: string,
    folderId: string,
    fileName: string,
    jsonString: string,
    existingFileId?: string
  ): Promise<string> => {
    const boundary = '-------lims_backup_boundary_' + Date.now();
    const metadata: any = existingFileId
      ? { name: fileName, mimeType: 'application/json' }
      : { name: fileName, mimeType: 'application/json', parents: [folderId] };

    const multipartBody =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${jsonString}\r\n` +
      `--${boundary}--`;

    const uploadUrl = existingFileId
      ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&supportsAllDrives=true`
      : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true`;

    const res = await fetch(uploadUrl, {
      method: existingFileId ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });

    if (!res.ok) {
      if (res.status === 401) accessTokenRef.current = null;
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Errore HTTP ${res.status} durante il salvataggio di "${fileName}" su Google Drive.`);
    }

    const result = await res.json();
    return result.id;
  };

  // 2. SALVA BACKUP COMPLETO SU GOOGLE DRIVE (Snapshot Datato + LIMS_Database_Latest.json)
  const handleSaveBackupToGoogleDrive = async () => {
    setIsBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setStatusMessage('Autenticazione con Google Drive in corso...');

    try {
      const token = await obtainDriveWriteToken();

      setStatusMessage(`Verifica cartella "${BACKUP_FOLDER_NAME}" su Google Drive...`);
      const folderId = await ensureBackupFolderOnDrive(token);

      const payload = buildFullBackupPayload();
      const jsonString = JSON.stringify(payload, null, 2);
      const snapshotFileName = `LIMS_Backup_${getTimestampSuffix()}.json`;
      const latestFileName = 'LIMS_Database_Latest.json';

      // 1. Crea lo snapshot storico datato
      setStatusMessage(`Salvataggio snapshot storico "${snapshotFileName}" su Google Drive...`);
      await uploadJsonFileToDrive(token, folderId, snapshotFileName, jsonString);

      // 2. Cerca se esiste già LIMS_Database_Latest.json nella cartella e aggiornalo
      setStatusMessage(`Aggiornamento copia master "${latestFileName}" su Google Drive...`);
      const qLatest = `'${folderId}' in parents and name = '${latestFileName}' and trashed = false`;
      const latestSearchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(qLatest)}&fields=files(id,name)&pageSize=1&supportsAllDrives=true&includeItemsFromAllDrives=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      let existingLatestId: string | undefined;
      if (latestSearchRes.ok) {
        const latestData = await latestSearchRes.json();
        if (latestData.files && latestData.files.length > 0) {
          existingLatestId = latestData.files[0].id;
        }
      }
      await uploadJsonFileToDrive(token, folderId, latestFileName, jsonString, existingLatestId);

      recordBackupSuccess(`Google Drive (/${BACKUP_FOLDER_NAME})`, snapshotFileName);
      setSuccessMessage(
        `Backup completato su Google Drive nella cartella "${BACKUP_FOLDER_NAME}"! Salvati sia lo snapshot "${snapshotFileName}" sia la copia aggiornata "${latestFileName}".`
      );

      addAuditLogEntry(
        currentUserProfileName || selectedOperator || 'Amministratore',
        'Sistema / Database',
        'Backup Cloud su Google Drive',
        '-',
        `Cartella: ${BACKUP_FOLDER_NAME} — File: ${snapshotFileName} + ${latestFileName}`
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Errore durante il salvataggio del backup su Google Drive.');
    } finally {
      setIsBusy(false);
      setStatusMessage('');
    }
  };

  // 3. ELENCA I FILE DI BACKUP DISPONIBILI SU GOOGLE DRIVE
  const handleListDriveBackups = async () => {
    setIsBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setStatusMessage('Ricerca dei backup LIMS presenti sul tuo Google Drive...');

    try {
      const token = await obtainDriveWriteToken();
      const q = `(name contains 'LIMS_Backup_' or name = 'LIMS_Database_Latest.json') and trashed = false`;
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=30&supportsAllDrives=true&includeItemsFromAllDrives=true`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 401) accessTokenRef.current = null;
        throw new Error(`Errore durante la lettura dei backup da Google Drive (HTTP ${res.status}).`);
      }

      const data = await res.json();
      const files: DriveBackupFileItem[] = data.files || [];
      setDriveBackupFiles(files);
      if (files.length === 0) {
        setErrorMessage('Nessun file di backup LIMS trovato sul tuo Google Drive.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Errore nella ricerca dei backup su Google Drive.');
    } finally {
      setIsBusy(false);
      setStatusMessage('');
    }
  };

  // 4. SCARICA E VERIFICA UN FILE DI BACKUP SELEZIONATO DA GOOGLE DRIVE
  const handleSelectDriveBackupForRestore = async (file: DriveBackupFileItem) => {
    setIsBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setStatusMessage(`Lettura e verifica di "${file.name}" da Google Drive...`);

    try {
      const token = await obtainDriveWriteToken();
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`Impossibile scaricare il file "${file.name}" da Google Drive (HTTP ${res.status}).`);
      }

      const parsed = await res.json();
      validateAndSetPendingRestore(parsed, `Google Drive: ${file.name}`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Il file selezionato su Google Drive non è un backup LIMS valido.');
    } finally {
      setIsBusy(false);
      setStatusMessage('');
    }
  };

  // 5. CARICA UN FILE DI BACKUP (.JSON) DAL PC LOCALE
  const handleLocalFileUploadForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const parsed = JSON.parse(String(event.target?.result || ''));
        validateAndSetPendingRestore(parsed, `File PC: ${file.name}`);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Il file selezionato non è un JSON di backup LIMS valido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const validateAndSetPendingRestore = (raw: any, sourceLabel: string) => {
    const dataBlock = raw?.data || raw;
    if (
      !dataBlock ||
      !Array.isArray(dataBlock.clients) ||
      !Array.isArray(dataBlock.prove) ||
      !Array.isArray(dataBlock.preventivi) ||
      !Array.isArray(dataBlock.accettazioni)
    ) {
      throw new Error('Struttura del file non valida: mancano le tabelle fondamentali del database LIMS (clienti, prove, preventivi, accettazioni).');
    }

    const normalizedPayload: LimsDatabaseBackupPayload = {
      meta: raw.meta || {
        app: 'LUPO 2.0 - LIMS',
        version: '2.0',
        exportedAt: new Date().toISOString(),
        exportedBy: 'Backup Esterno',
        counts: {
          clients: dataBlock.clients.length,
          prove: dataBlock.prove.length,
          pacchetti: Array.isArray(dataBlock.pacchetti) ? dataBlock.pacchetti.length : 0,
          preventivi: dataBlock.preventivi.length,
          accettazioni: dataBlock.accettazioni.length,
          praticheFatturazione: Array.isArray(dataBlock.praticheFatturazione) ? dataBlock.praticheFatturazione.length : 0,
          reagenti: Array.isArray(dataBlock.reagenti) ? dataBlock.reagenti.length : 0,
          reagentiRitirati: Array.isArray(dataBlock.reagentiRitirati) ? dataBlock.reagentiRitirati.length : 0,
          strumenti: Array.isArray(dataBlock.strumenti) ? dataBlock.strumenti.length : 0,
          operators: Array.isArray(dataBlock.operators) ? dataBlock.operators.length : 0,
          auditLogs: Array.isArray(dataBlock.auditLogs) ? dataBlock.auditLogs.length : 0,
          settingsCount: dataBlock.limsSettings ? Object.keys(dataBlock.limsSettings).length : 0
        }
      },
      data: {
        clients: dataBlock.clients,
        prove: dataBlock.prove,
        pacchetti: Array.isArray(dataBlock.pacchetti) ? dataBlock.pacchetti : [],
        preventivi: dataBlock.preventivi,
        accettazioni: dataBlock.accettazioni,
        praticheFatturazione: Array.isArray(dataBlock.praticheFatturazione) ? dataBlock.praticheFatturazione : [],
        reagenti: Array.isArray(dataBlock.reagenti) ? dataBlock.reagenti : [],
        reagentiRitirati: Array.isArray(dataBlock.reagentiRitirati) ? dataBlock.reagentiRitirati : [],
        strumenti: Array.isArray(dataBlock.strumenti) ? dataBlock.strumenti : [],
        operators: Array.isArray(dataBlock.operators) ? dataBlock.operators : operators,
        auditLogs: Array.isArray(dataBlock.auditLogs) ? dataBlock.auditLogs : auditLogs,
        limsSettings: dataBlock.limsSettings && typeof dataBlock.limsSettings === 'object' ? dataBlock.limsSettings : {}
      }
    };

    setPendingRestorePayload(normalizedPayload);
    setPendingRestoreSourceLabel(sourceLabel);
    setOperatorPassword('');
  };

  // 6. ESECUZIONE RIPRISTINO PROTETTO DA PASSWORD OPERATORE (ISO/IEC 17025)
  const handleConfirmRestore = async () => {
    if (!pendingRestorePayload) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!verifyOperatorPassword(selectedOperator, operatorPassword, operators)) {
      setErrorMessage(`La password di firma inserita per l'operatore ${selectedOperator} non è corretta.`);
      return;
    }

    setIsBusy(true);
    setStatusMessage('Ripristino completo del database LIMS in corso...');
    try {
      await onRestoreFullBackup(
        pendingRestorePayload,
        syncSupabaseOnRestore && isSupabaseConnected,
        selectedOperator,
        pendingRestoreSourceLabel
      );
      setSuccessMessage(
        `Database ripristinato con successo da "${pendingRestoreSourceLabel}"${
          syncSupabaseOnRestore && isSupabaseConnected ? ' e sincronizzato con Supabase Cloud!' : '!'
        }`
      );
      setPendingRestorePayload(null);
      setOperatorPassword('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Errore durante il ripristino del database.');
    } finally {
      setIsBusy(false);
      setStatusMessage('');
    }
  };

  const handleSaveGoogleSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('lims_google_client_id', clientId.trim());
    localStorage.setItem('lims_google_api_key', apiKey.trim());
    accessTokenRef.current = null;
    setCredentialsSavedMsg(true);
    setTimeout(() => setCredentialsSavedMsg(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-left">
        {/* Header Modale */}
        <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-xs">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider">
                  Cassaforte Backup &amp; Ripristino Database (Google Drive / PC)
                </h3>
                <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-300 border border-emerald-500/40">
                  ISO/IEC 17025 §7.11 &amp; §8.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Modulo autonomo di salvataggio integrale su Google Drive e PC locale (non interferisce con il lavoro in tempo reale su Supabase)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Chiudi finestra"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra Navigazione Schede */}
        <div className="bg-slate-100 px-6 pt-3 border-b border-slate-200 flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('backup');
              setErrorMessage(null);
            }}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer border-t border-x ${
              activeTab === 'backup'
                ? 'bg-white text-indigo-700 border-slate-200 shadow-2xs'
                : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <UploadCloud className="h-4 w-4" />
            <span>1. Salva Backup (Google Drive / PC)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('restore');
              setErrorMessage(null);
            }}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer border-t border-x ${
              activeTab === 'restore'
                ? 'bg-white text-amber-700 border-slate-200 shadow-2xs'
                : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <RefreshCw className="h-4 w-4" />
            <span>2. Ripristina Database (Da Drive / PC)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('settings');
              setErrorMessage(null);
            }}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer border-t border-x ${
              activeTab === 'settings'
                ? 'bg-white text-slate-900 border-slate-200 shadow-2xs'
                : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            <Key className="h-4 w-4" />
            <span>3. Impostazioni Google Drive</span>
          </button>
        </div>

        {/* Corpo Modale */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs text-slate-700">
          {/* Messaggi di stato / errore / successo */}
          {isBusy && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3 text-indigo-900 font-bold animate-pulse">
              <RefreshCw className="h-5 w-5 text-indigo-600 animate-spin shrink-0" />
              <span>{statusMessage || 'Operazione in corso...'}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 font-semibold">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-900 font-bold">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* SCHEDA 1: SALVA BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-5">
              {/* Stato Ultimo Backup & Conteggi Database Attuale */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span className="font-black text-slate-800 uppercase tracking-wider text-[11px]">
                      Fotografia Attuale del Database LIMS Pronto per il Salvataggio
                    </span>
                  </div>
                  {lastBackupInfo ? (
                    <span className="text-[10.5px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <Clock className="h-3 w-3 text-emerald-600" />
                      Ultimo backup: {lastBackupInfo.dateStr} ({lastBackupInfo.destination})
                    </span>
                  ) : (
                    <span className="text-[10.5px] font-mono bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold">
                      Nessun backup manuale ancora registrato su questo browser
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                  {[
                    { label: 'Clienti', count: clients.length },
                    { label: 'Prove & Metodi', count: prove.length },
                    { label: 'Pacchetti', count: pacchetti.length },
                    { label: 'Preventivi', count: preventivi.length },
                    { label: 'Campioni / RdP', count: accettazioni.length },
                    { label: 'Pratiche Fatt.', count: praticheFatturazione.length },
                    { label: 'Reagenti Attivi', count: reagenti.length },
                    { label: 'Storico Ritirati', count: reagentiRitirati.length },
                    { label: 'Strumentazione', count: strumenti.length },
                    { label: 'Operatori & Log', count: `${operators.length} / ${auditLogs.length}` }
                  ].map(item => (
                    <div key={item.label} className="bg-white border border-slate-200/80 rounded-xl p-2.5">
                      <span className="text-[9px] font-bold uppercase text-slate-400 block">{item.label}</span>
                      <span className="text-sm font-black font-mono text-slate-900">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Due Opzioni di Salvataggio Manuale (Google Drive & PC) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Google Drive Cloud */}
                <div className="p-5 bg-indigo-50/40 border-2 border-indigo-200 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider">
                        Opzione A • Cloud Google Drive
                      </span>
                      <UploadCloud className="h-5 w-5 text-indigo-600" />
                    </div>
                    <h4 className="text-sm font-black text-slate-900 pt-1">
                      Salva Direttamente sul tuo Google Drive
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Crea automaticamente sul tuo Google Drive la cartella{' '}
                      <code className="font-mono font-bold text-indigo-900 bg-indigo-100/80 px-1.5 py-0.5 rounded">
                        {BACKUP_FOLDER_NAME}
                      </code>{' '}
                      e salva sia una copia datata (storico versioni) sia il file sempre aggiornato{' '}
                      <code className="font-mono font-bold text-slate-800">LIMS_Database_Latest.json</code>.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-indigo-100">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={handleSaveBackupToGoogleDrive}
                      className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                    >
                      <UploadCloud className="h-4 w-4" />
                      <span>Salva Backup su Google Drive Ora</span>
                    </button>
                    {!clientId.trim() && (
                      <p className="text-[10px] text-amber-800 font-semibold text-center">
                        ⚠️ Richiede Google OAuth Client ID nella scheda &ldquo;3. Impostazioni Google Drive&rdquo;.
                      </p>
                    )}
                  </div>
                </div>

                {/* Card 2: PC Locale / Google Drive Desktop */}
                <div className="p-5 bg-emerald-50/40 border-2 border-emerald-200 rounded-2xl flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider">
                        Opzione B • File Locale / Drive Desktop
                      </span>
                      <HardDrive className="h-5 w-5 text-emerald-600" />
                    </div>
                    <h4 className="text-sm font-black text-slate-900 pt-1">
                      Scarica File Completo sul PC (.JSON)
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Genera istantaneamente un singolo file{' '}
                      <code className="font-mono font-bold text-emerald-900 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                        LIMS_Backup_DATA_ORA.json
                      </code>{' '}
                      con l&apos;intero database. Funziona sempre (anche senza configurare chiavi OAuth) e puoi salvarlo direttamente nella tua cartella <strong>Google Drive per Desktop</strong> o chiavetta USB.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-emerald-100">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={handleDownloadLocalBackup}
                      className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                    >
                      <Download className="h-4 w-4" />
                      <span>Scarica Backup Completo su PC (.JSON)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SCHEDA 2: RIPRISTINA DATABASE */}
          {activeTab === 'restore' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sorgente 1: Da Google Drive */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                      <FolderOpen className="h-4 w-4 text-indigo-600" />
                      A. Carica Backup dal tuo Google Drive
                    </span>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={handleListDriveBackups}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Cerca Backup su Drive</span>
                    </button>
                  </div>

                  {driveBackupFiles.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-150 bg-white border border-slate-200 rounded-xl">
                      {driveBackupFiles.map(f => (
                        <div key={f.id} className="p-2.5 flex items-center justify-between gap-2 hover:bg-indigo-50/40">
                          <div className="min-w-0">
                            <div className="font-mono font-bold text-slate-900 truncate text-[11px]">{f.name}</div>
                            {f.modifiedTime && (
                              <div className="text-[10px] text-slate-500">
                                Modificato: {new Date(f.modifiedTime).toLocaleString('it-IT')}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleSelectDriveBackupForRestore(f)}
                            className="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 rounded-lg text-[10.5px] font-extrabold shrink-0 cursor-pointer transition"
                          >
                            Seleziona
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      Clicca su &ldquo;Cerca Backup su Drive&rdquo; per elencare gli snapshot salvati nel tuo account Google Drive.
                    </p>
                  )}
                </div>

                {/* Sorgente 2: Da File Locale */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="font-black text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                      <FileJson className="h-4 w-4 text-emerald-600" />
                      B. Carica File di Backup dal PC (.JSON)
                    </span>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Seleziona un file <code className="font-mono font-bold">.json</code> di backup scaricato in precedenza sul computer o dalla cartella Google Drive Desktop.
                    </p>
                  </div>
                  <label className="w-full py-2.5 px-4 bg-white hover:bg-emerald-50 text-emerald-800 border-2 border-dashed border-emerald-300 rounded-xl font-extrabold text-xs text-center cursor-pointer transition block">
                    <span>📂 Sfoglia e Carica File .JSON dal PC</span>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleLocalFileUploadForRestore}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Anteprima di Sicurezza e Convalida con Password prima del Ripristino */}
              {pendingRestorePayload && (
                <div className="p-5 bg-amber-50/70 border-2 border-amber-300 rounded-2xl space-y-4 animate-fadeIn">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                        Verifica Pre-Ripristino Database (ISO/IEC 17025 §7.11)
                      </span>
                      <h4 className="text-sm font-black text-slate-900">
                        Sorgente selezionata: <span className="font-mono text-indigo-800">{pendingRestoreSourceLabel}</span>
                      </h4>
                    </div>
                    <div className="text-right text-[10.5px] font-mono text-slate-600">
                      <div>Data Backup: <strong>{new Date(pendingRestorePayload.meta.exportedAt).toLocaleString('it-IT')}</strong></div>
                      <div>Esportato da: <strong>{pendingRestorePayload.meta.exportedBy}</strong></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { label: 'Clienti', val: pendingRestorePayload.data.clients.length },
                      { label: 'Prove', val: pendingRestorePayload.data.prove.length },
                      { label: 'Preventivi', val: pendingRestorePayload.data.preventivi.length },
                      { label: 'Campioni / RdP', val: pendingRestorePayload.data.accettazioni.length },
                      { label: 'Pratiche Fatt.', val: pendingRestorePayload.data.praticheFatturazione.length }
                    ].map(c => (
                      <div key={c.label} className="bg-white p-2 rounded-lg border border-amber-200 text-center">
                        <span className="text-[9px] font-bold uppercase text-slate-400 block">{c.label}</span>
                        <span className="text-sm font-black font-mono text-slate-900">{c.val}</span>
                      </div>
                    ))}
                  </div>

                  {isSupabaseConnected && (
                    <label className="flex items-center gap-2.5 p-3 bg-white border border-amber-200 rounded-xl cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={syncSupabaseOnRestore}
                        onChange={e => setSyncSupabaseOnRestore(e.target.checked)}
                        className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Riallinea automaticamente anche il database Cloud Supabase con i dati di questo backup
                      </span>
                    </label>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                        Operatore Autorizzato al Ripristino (*):
                      </label>
                      <select
                        value={selectedOperator}
                        onChange={e => setSelectedOperator(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800"
                      >
                        {operators.filter(o => o.attivo !== false).map(op => (
                          <option key={op.nome} value={op.nome}>
                            {op.nome} ({getOperatorQualificationLabel(op)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                        Password Personale Operatore (*):
                      </label>
                      <input
                        type="password"
                        value={operatorPassword}
                        onChange={e => {
                          setOperatorPassword(e.target.value);
                          setErrorMessage(null);
                        }}
                        placeholder="Digita la password dell'operatore..."
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setPendingRestorePayload(null)}
                      className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
                    >
                      Annulla Selezione
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={handleConfirmRestore}
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase tracking-wide flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Firma e Ripristina Database</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SCHEDA 3: IMPOSTAZIONI GOOGLE DRIVE */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveGoogleSettings} className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider">
                  Credenziali OAuth 2.0 Google Drive (Condivise con Riconciliazione Fatture XML)
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Se hai già inserito il <strong>Google OAuth Client ID</strong> nel modulo di Riconciliazione Fatture XML, viene usato automaticamente anche qui. In alternativa puoi incollarlo qui sotto (oppure usare sempre il download diretto su PC dalla scheda 1 senza alcuna chiave Google).
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    Google OAuth 2.0 Client ID:
                  </label>
                  <div className="relative">
                    <input
                      type={showClientId ? 'text' : 'password'}
                      value={clientId}
                      onChange={e => setClientId(e.target.value)}
                      placeholder="es. 1234567890-abcdefg.apps.googleusercontent.com"
                      className="w-full bg-white border border-slate-300 rounded-xl py-2.5 pl-3 pr-10 text-xs font-mono text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowClientId(!showClientId)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showClientId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-600 mb-1">
                    Google API Key (Opzionale):
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder="es. AIzaSy..."
                      className="w-full bg-white border border-slate-300 rounded-xl py-2.5 pl-3 pr-10 text-xs font-mono text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                {credentialsSavedMsg && (
                  <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                    <Check className="h-4 w-4" /> Credenziali salvate!
                  </span>
                )}
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wide cursor-pointer transition"
                >
                  Salva Credenziali Google
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <span>
            🔒 Nessun processo in background: il modulo esegue operazioni solo quando premi i pulsanti in questa finestra.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
