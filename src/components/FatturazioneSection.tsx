import React, { useState, useMemo, useEffect } from 'react';
import { PraticaFatturazione, AuditLog, Operator, Client, Preventivo } from '../types';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  FileSpreadsheet, 
  FileDown, 
  CheckCircle, 
  Clock, 
  Check, 
  AlertTriangle,
  Lock,
  Calendar,
  X,
  History,
  FileText,
  BadgeEuro,
  Printer,
  ExternalLink,
  FolderSync,
  Plus,
  Ban,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { logoAgenzia } from '../assets/images/logos';
import { getOperatorQualificationLabel } from '../utils/operatorSanitizer';
import { verifyOperatorPassword } from '../utils/limsHelpers';
import { GoogleDriveXmlReconciliationModal } from './GoogleDriveXmlReconciliationModal';

const executePrintSheet = (containerId: string, docTitle: string) => {
  const container = document.getElementById(containerId) || document.getElementById('fatturazione-print-content');
  if (!container) {
    window.focus();
    window.print();
    return;
  }

  // Clona il contenitore per garantire la risoluzione assoluta di tutte le immagini e stili
  const clone = container.cloneNode(true) as HTMLElement;
  const imgs = clone.querySelectorAll('img');
  imgs.forEach(img => {
    if (img.src) {
      img.setAttribute('src', img.src);
    }
  });

  const printContent = clone.innerHTML;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <base href="${origin}/">
  <title>${docTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    body { 
      font-family: 'Inter', system-ui, -apple-system, sans-serif; 
      padding: 0; 
      margin: 0; 
      color: #0f172a; 
      background: white; 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
    }
    .printable-sheet { 
      max-width: 100%; 
      width: 100%; 
      box-shadow: none !important; 
      padding: 0 !important; 
      border: none !important; 
    }
    .avoid-break { 
      page-break-inside: avoid; 
      break-inside: avoid; 
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      page-break-inside: auto; 
    }
    tr { 
      page-break-inside: avoid; 
      page-break-after: auto; 
    }
    thead { 
      display: table-header-group; 
    }
    img { 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
      display: inline-block; 
      max-width: 100%; 
    }
  </style>
</head>
<body class="bg-white text-slate-800">
  <div class="printable-sheet">${printContent}</div>
  <script>
    function doPrint() {
      const images = Array.from(document.images);
      const imgPromises = images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      });
      Promise.all(imgPromises).then(() => {
        setTimeout(() => {
          window.focus();
          window.print();
        }, 300);
      });
    }
    if (document.readyState === 'complete') {
      doPrint();
    } else {
      window.addEventListener('load', doPrint);
    }
  </script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1024,height=1000,menubar=yes,toolbar=yes,scrollbars=yes');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
  } else {
    let secretIframe = document.getElementById('secret-print-iframe') as HTMLIFrameElement;
    if (!secretIframe) {
      secretIframe = document.createElement('iframe');
      secretIframe.id = 'secret-print-iframe';
      secretIframe.style.position = 'fixed';
      secretIframe.style.right = '0';
      secretIframe.style.bottom = '0';
      secretIframe.style.width = '0';
      secretIframe.style.height = '0';
      secretIframe.style.border = '0';
      document.body.appendChild(secretIframe);
    }
    const doc = secretIframe.contentWindow?.document || secretIframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
    } else {
      window.focus();
      window.print();
    }
  }
};

interface FatturazioneSectionProps {
  pratiche: PraticaFatturazione[];
  onUpdatePratiche: (updated: PraticaFatturazione[]) => void;
  auditLogs: AuditLog[];
  operators: Operator[];
  addAuditLogEntry: (utente: string, sezione: string, campo: string, vOld: string, vNew: string) => void;
  clients?: Client[];
  preventivi?: Preventivo[];
  onViewPreventivo?: (id: string) => void;
  initialSearchQuery?: string | null;
  onClearInitialSearchQuery?: () => void;
  onGoToClient?: (clientId: string, fromLabel?: string) => void;
  onGoToAccettazione?: (codeOrId: string, fromLabel?: string) => void;
}

export function FatturazioneSection({
  pratiche,
  onUpdatePratiche,
  auditLogs,
  operators,
  addAuditLogEntry,
  clients,
  preventivi,
  onViewPreventivo,
  initialSearchQuery,
  onClearInitialSearchQuery,
  onGoToClient,
  onGoToAccettazione
}: FatturazioneSectionProps) {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Tutti' | 'Da fatturare' | 'Fatturato' | 'Annullato'>('Tutti');
  const [paymentFilter, setPaymentFilter] = useState<'Tutti' | 'Pagati' | 'Da pagare' | 'Insoluti'>('Tutti');
  const [amountFilter, setAmountFilter] = useState<'Tutti' | 'Zero' | 'Validi'>('Tutti');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  useEffect(() => {
    if (initialSearchQuery !== undefined && initialSearchQuery !== null) {
      setSearchTerm(initialSearchQuery);
      setStatusFilter('Tutti');
      setPaymentFilter('Tutti');
      setAmountFilter('Tutti');
      onClearInitialSearchQuery?.();
    }
  }, [initialSearchQuery, onClearInitialSearchQuery]);

  // Selezione multipla per azioni di blocco (Fattura cumulativa / Saldo rapido)
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [bulkInvoiceNum, setBulkInvoiceNum] = useState('');
  const [bulkInvoiceDate, setBulkInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showBulkInvoiceBar, setShowBulkInvoiceBar] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<keyof PraticaFatturazione | 'codiceFiscale'>('dataAccettazione');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Change status Modal state
  const [editingPraticaId, setEditingPraticaId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'Da fatturare' | 'Fatturato' | 'Annullato'>('Da fatturare');
  const [cancelReason, setCancelReason] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [operatorPIN, setOperatorPIN] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

  // RdP Protocollo & Data invio state
  const [rdpProtocolNumber, setRdpProtocolNumber] = useState('');
  const [rdpSendDate, setRdpSendDate] = useState('');
  const [editingImporto, setEditingImporto] = useState<string>('');

  // Advanced Payment fields
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [paymentDate, setPaymentDate] = useState<string>('');

  // Selected Client for payment monitoring
  const [selectedMonitorClient, setSelectedMonitorClient] = useState<string>('Tutti');
  const [searchComponentQuery, setSearchComponentQuery] = useState('');
  const [isMonitorDropdownOpen, setIsMonitorDropdownOpen] = useState(false);

  // Print Preview Modal state
  const [showReportPreviewModal, setShowReportPreviewModal] = useState<boolean>(false);
  const [showGoogleDriveReconcileModal, setShowGoogleDriveReconcileModal] = useState<boolean>(false);

  // Helper per recuperare il Codice Fiscale del cliente associato alla pratica
  const getCodiceFiscale = (p: PraticaFatturazione): string => {
    if (p.codiceFiscale && p.codiceFiscale.trim()) {
      return p.codiceFiscale.trim();
    }
    if (clients && clients.length > 0) {
      const matchedClient = clients.find(
        c => (p.clienteId && c.id === p.clienteId) || 
             (p.partitaIva && c.partitaIva === p.partitaIva) || 
             (p.nomeCliente && (c.denominazione || '').toLowerCase() === (p.nomeCliente || '').toLowerCase())
      );
      if (matchedClient?.codiceFiscale && matchedClient.codiceFiscale.trim()) {
        return matchedClient.codiceFiscale.trim();
      }
    }
    return '';
  };

  // List of unique clients from current practices
  const uniqueClients = useMemo(() => {
    const clientsMap = new Map<string, { id: string; nome: string }>();
    pratiche.forEach(p => {
      if (p.nomeCliente) {
        clientsMap.set(p.nomeCliente, { id: p.clienteId, nome: p.nomeCliente });
      }
    });
    return Array.from(clientsMap.values());
  }, [pratiche]);

  // Handler to toggle paid status directly inside the table row
  const handleTogglePaidDirect = (praticaId: string) => {
    const target = pratiche.find(p => p.id === praticaId);
    if (!target || target.statoFatturazione === 'Annullato') return;

    const nextPaid = !target.pagato;
    const nextDate = nextPaid ? new Date().toISOString().split('T')[0] : '';

    const updated = pratiche.map(p => {
      if (p.id === praticaId) {
        return {
          ...p,
          pagato: nextPaid,
          dataPagamento: nextDate
        };
      }
      return p;
    });

    onUpdatePratiche(updated);

    addAuditLogEntry(
      selectedOperator || 'Sistema Amm.',
      'Amministrazione',
      `Stato pagamento campione ${target.numeroCampione}`,
      target.pagato ? 'Pagato' : 'Non pagato',
      nextPaid ? 'Pagato' : 'Non pagato'
    );
  };

  // Sorting Handler
  const handleSort = (field: keyof PraticaFatturazione | 'codiceFiscale') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Set initial operator
  React.useEffect(() => {
    if (operators && operators.length > 0) {
      setSelectedOperator(operators[0].nome);
    } else {
      setSelectedOperator('Dott. Chim. F. Lupo');
    }
  }, [operators]);

  // Filter & Search Logic
  const filteredPratiche = useMemo(() => {
    return pratiche.filter(p => {
      const cf = getCodiceFiscale(p);
      // 1. Search filter
      const matchesSearch = 
        p.numeroCampione.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.partitaIva.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cf.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numeroPreventivo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.numeroFattura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Status filter
      const matchesStatus = statusFilter === 'Tutti' || p.statoFatturazione === statusFilter;

      // 2b. Payment filter
      const matchesPayment =
        paymentFilter === 'Tutti' ||
        (p.statoFatturazione !== 'Annullato' && (
          (paymentFilter === 'Pagati' && Boolean(p.pagato)) ||
          (paymentFilter === 'Da pagare' && !p.pagato) ||
          (paymentFilter === 'Insoluti' && p.statoFatturazione === 'Fatturato' && !p.pagato)
        ));

      // 3. Amount filter
      const matchesAmount = 
        amountFilter === 'Tutti' ||
        (amountFilter === 'Zero' && p.importo === 0) ||
        (amountFilter === 'Validi' && p.statoFatturazione !== 'Annullato' && p.importo > 0);

      // 4. Date range filter
      let matchesDates = true;
      if (dateStart) {
        matchesDates = matchesDates && p.dataAccettazione >= dateStart;
      }
      if (dateEnd) {
        matchesDates = matchesDates && p.dataAccettazione <= dateEnd;
      }

      return matchesSearch && matchesStatus && matchesPayment && matchesAmount && matchesDates;
    });
  }, [pratiche, searchTerm, statusFilter, paymentFilter, amountFilter, dateStart, dateEnd, clients]);

  // Sorted Pratiche
  const sortedPratiche = useMemo(() => {
    const sorted = [...filteredPratiche];
    sorted.sort((a, b) => {
      let valA: any = sortField === 'codiceFiscale' ? getCodiceFiscale(a) : a[sortField as keyof PraticaFatturazione];
      let valB: any = sortField === 'codiceFiscale' ? getCodiceFiscale(b) : b[sortField as keyof PraticaFatturazione];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        return sortDirection === 'asc'
          ? (valA === valB ? 0 : valA ? 1 : -1)
          : (valA === valB ? 0 : valA ? -1 : 1);
      }
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
    return sorted;
  }, [filteredPratiche, sortField, sortDirection, clients]);

  // Azioni massive sulle pratiche selezionate
  const handleBulkSetPaid = (paidValue: boolean) => {
    if (selectedRowIds.size === 0) return;
    const todayIso = new Date().toISOString().split('T')[0];
    const updated = pratiche.map(p => {
      if (selectedRowIds.has(p.id) && p.statoFatturazione !== 'Annullato') {
        return {
          ...p,
          pagato: paidValue,
          dataPagamento: paidValue ? (p.dataPagamento || todayIso) : ''
        };
      }
      return p;
    });
    onUpdatePratiche(updated);
    addAuditLogEntry(
      selectedOperator || 'Amministrazione',
      'Fatturazione',
      'Aggiornamento Pagamento Multiplo',
      `${selectedRowIds.size} pratiche selezionate`,
      paidValue ? `Segnate come PAGATE (${todayIso})` : 'Segnate come DA PAGARE'
    );
    setSelectedRowIds(new Set());
  };

  const handleBulkAssignInvoice = () => {
    if (selectedRowIds.size === 0 || !bulkInvoiceNum.trim() || !bulkInvoiceDate) return;
    const updated = pratiche.map(p => {
      if (selectedRowIds.has(p.id) && p.statoFatturazione !== 'Annullato') {
        return {
          ...p,
          statoFatturazione: 'Fatturato' as const,
          numeroFattura: bulkInvoiceNum.trim(),
          dataFattura: bulkInvoiceDate
        };
      }
      return p;
    });
    onUpdatePratiche(updated);
    addAuditLogEntry(
      selectedOperator || 'Amministrazione',
      'Fatturazione',
      'Fatturazione Cumulativa Multipla',
      `${selectedRowIds.size} pratiche selezionate`,
      `Fattura n. ${bulkInvoiceNum.trim()} del ${bulkInvoiceDate}`
    );
    setBulkInvoiceNum('');
    setShowBulkInvoiceBar(false);
    setSelectedRowIds(new Set());
  };

  // Allinea rapidamente l'importo netto della pratica al totale netto del preventivo collegato
  const handleAlignImportoToPreventivo = (pratica: PraticaFatturazione, targetNetto: number) => {
    const cleanNetto = Number((targetNetto || 0).toFixed(2));
    const oldNetto = pratica.importo;
    const updated = pratiche.map(p => (p.id === pratica.id ? { ...p, importo: cleanNetto } : p));
    onUpdatePratiche(updated);
    addAuditLogEntry(
      selectedOperator || 'Amministrazione',
      'Fatturazione',
      `Riallineamento Importo Netto (${pratica.numeroCampione} - ${pratica.numeroPreventivo})`,
      `€ ${oldNetto.toFixed(2)}`,
      `€ ${cleanNetto.toFixed(2)}`
    );
  };

  // Open Edit Modal
  const openEditModal = (pratica: PraticaFatturazione, presetStatus?: 'Da fatturare' | 'Fatturato' | 'Annullato') => {
    setEditingPraticaId(pratica.id);
    setSelectedStatus(presetStatus || pratica.statoFatturazione);
    setCancelReason('');
    setInvoiceNumber(pratica.numeroFattura || '');
    // Default invoice date to today if empty
    setInvoiceDate(pratica.dataFattura || new Date().toISOString().split('T')[0]);
    setIsPaid(pratica.pagato || false);
    setPaymentDate(pratica.dataPagamento || new Date().toISOString().split('T')[0]);
    setRdpProtocolNumber(pratica.numeroProtocolloRdP || '');
    setRdpSendDate(pratica.dataInvioRdP || '');
    setEditingImporto(pratica.importo.toFixed(2));
    setCustomNote(pratica.note || '');
    setOperatorPIN('');
    setModalError(null);
  };

  // Confirm Status Change
  const confirmStatusChange = () => {
    if (!editingPraticaId) return;
    const targetPratica = pratiche.find(p => p.id === editingPraticaId);
    if (!targetPratica) return;

    const parsedImporto = parseFloat(editingImporto.replace(',', '.'));
    const nextImporto = !isNaN(parsedImporto) && parsedImporto >= 0
      ? Number(parsedImporto.toFixed(2))
      : targetPratica.importo;

    // Transizioni protette (ISO/IEC 17025 §7.5.2 / §8.4): richiedono password operatore e motivazione
    const isCancelling = selectedStatus === 'Annullato' && targetPratica.statoFatturazione !== 'Annullato';
    const isStornoFattura = targetPratica.statoFatturazione === 'Fatturato' && selectedStatus === 'Da fatturare';
    const isRestoringCancelled = targetPratica.statoFatturazione === 'Annullato' && selectedStatus !== 'Annullato';
    const requiresAuth = isCancelling || isStornoFattura || isRestoringCancelled;

    if (requiresAuth) {
      if (cancelReason.trim().length < 3) {
        setModalError("Motivazione obbligatoria: per la tracciabilità ISO/IEC 17025 indica il motivo dell'operazione (es. emissione Nota di Credito, errore di imputazione, annullamento incarico).");
        return;
      }
      if (!verifyOperatorPassword(selectedOperator, operatorPIN, operators)) {
        setModalError(`La password di firma inserita per l'operatore ${selectedOperator} non è corretta.`);
        return;
      }
    }

    // Consistency Checks
    if (selectedStatus === 'Fatturato' && !invoiceNumber.trim()) {
      setModalError("Errore di coerenza: Non è consentito impostare lo stato 'Fatturato' senza specificare un numero di fattura valido.");
      return;
    }

    if (selectedStatus === 'Fatturato' && !invoiceDate) {
      setModalError("Errore di coerenza: Non è consentito impostare lo stato 'Fatturato' senza una data di fattura valida.");
      return;
    }

    const nowFormatted = new Date().toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const reasonClean = cancelReason.trim();
    const prevFatturaRef = targetPratica.numeroFattura
      ? `${targetPratica.numeroFattura}${targetPratica.dataFattura ? ' del ' + targetPratica.dataFattura : ''}`
      : '';

    let traceLine = '';
    if (isCancelling) {
      traceLine = `[ANNULLATA il ${nowFormatted} da ${selectedOperator} | Stato prec.: ${targetPratica.statoFatturazione}${prevFatturaRef ? ' (Fatt. ' + prevFatturaRef + ')' : ''} | Imp.: € ${targetPratica.importo.toFixed(2)} | Motivo: ${reasonClean}]`;
    } else if (isStornoFattura) {
      traceLine = `[STORNO FATTURA il ${nowFormatted} da ${selectedOperator} | Rimossa Fatt. ${prevFatturaRef || 'n.d.'} | Motivo: ${reasonClean}]`;
    } else if (isRestoringCancelled) {
      traceLine = `[RIPRISTINATA il ${nowFormatted} da ${selectedOperator} -> ${selectedStatus} | Motivo: ${reasonClean}]`;
    }
    const finalNote = [customNote.trim(), traceLine].filter(Boolean).join('\n');

    // Perform Update
    const updatedPratiche = pratiche.map(p => {
      if (p.id === editingPraticaId) {
        const isAnnullatoNext = selectedStatus === 'Annullato';
        const resetBilling = isAnnullatoNext || isStornoFattura;
        return {
          ...p,
          // L'importo storico non viene mai azzerato in modo distruttivo
          importo: isAnnullatoNext ? targetPratica.importo : nextImporto,
          statoFatturazione: selectedStatus,
          numeroFattura: selectedStatus === 'Fatturato' ? invoiceNumber.trim() : '',
          dataFattura: selectedStatus === 'Fatturato' ? invoiceDate : '',
          numeroProtocolloRdP: rdpProtocolNumber.trim() || undefined,
          dataInvioRdP: rdpSendDate.trim() || undefined,
          note: finalNote,
          pagato: resetBilling ? false : isPaid,
          dataPagamento: resetBilling ? '' : (isPaid ? paymentDate : ''),
          ...(isCancelling || isStornoFattura
            ? {
                motivoAnnullamento: reasonClean,
                operatoreAnnullamento: selectedOperator,
                dataAnnullamento: nowFormatted,
                fatturaPrecedenteAnnullata: prevFatturaRef || undefined
              }
            : {}),
          ...(isRestoringCancelled
            ? {
                motivoAnnullamento: undefined,
                operatoreAnnullamento: undefined,
                dataAnnullamento: undefined,
                fatturaPrecedenteAnnullata: undefined
              }
            : {})
        };
      }
      return p;
    });

    onUpdatePratiche(updatedPratiche);

    // Track modification in Audit Log!
    const userString = `${selectedOperator}`;
    const prevVal = `${targetPratica.statoFatturazione}${targetPratica.numeroFattura ? ' (' + targetPratica.numeroFattura + ')' : ''}${targetPratica.pagato ? ' [Pagato]' : ' [Non pagato]'} — € ${targetPratica.importo.toFixed(2)}`;
    const newVal = `${selectedStatus}${selectedStatus === 'Fatturato' ? ' (' + invoiceNumber.trim() + ')' : ''}${requiresAuth ? ` — Motivo: ${reasonClean}` : `${isPaid ? ' [Pagato]' : ' [Non pagato]'}`}`;
    const auditField = isCancelling
      ? `Annullamento Pratica Fatturazione (ISO 17025) — ${targetPratica.numeroCampione}`
      : isStornoFattura
      ? `Storno Fattura (Ritorno a Da fatturare) — ${targetPratica.numeroCampione}`
      : isRestoringCancelled
      ? `Ripristino Pratica Annullata — ${targetPratica.numeroCampione}`
      : 'Stato fatturazione e pagamento';

    addAuditLogEntry(
      userString,
      'Fatturazione',
      auditField,
      prevVal,
      newVal
    );

    // Reset and close modal
    setEditingPraticaId(null);
    setOperatorPIN('');
    setCancelReason('');
    setModalError(null);
  };

  // Export CSV (Excel)
  const handleExportCSV = () => {
    const headers = [
      'Numero Campione',
      'Cliente / Ragione Sociale',
      'Partita IVA',
      'Codice Fiscale',
      'Numero Preventivo',
      'Data Accettazione',
      'Importo Netto (€)',
      'IVA 22% (€)',
      'Totale Lordo Ivato (€)',
      'Stato Fatturazione',
      'Numero Fattura',
      'Data Fattura',
      'Stato Pagamento',
      'Data Pagamento',
      'Note'
    ];

    const rows = filteredPratiche.map(p => {
      const isAnn = p.statoFatturazione === 'Annullato';
      return [
        p.numeroCampione,
        p.nomeCliente.replace(/"/g, '""'),
        p.partitaIva || '',
        getCodiceFiscale(p),
        p.numeroPreventivo || '',
        p.dataAccettazione,
        isAnn ? '0.00' : p.importo.toFixed(2),
        isAnn ? '0.00' : (p.importo * 0.22).toFixed(2),
        isAnn ? '0.00' : (p.importo * 1.22).toFixed(2),
        p.statoFatturazione,
        p.numeroFattura || '',
        p.dataFattura || '',
        isAnn ? 'Annullata' : (p.pagato ? 'Saldato' : 'Da pagare'),
        p.dataPagamento || '',
        `${isAnn ? `[ANNULLATA - Imp. orig. € ${p.importo.toFixed(2)}] ` : ''}${(p.note || '')}`.replace(/"/g, '""')
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Lupo_Report_Fatturazione_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick print handler that triggers styled browser print view for accurate PDF generation
  const handlePrintPDF = () => {
    setShowReportPreviewModal(true);
  };

  // Helper date formatter for print sheet
  const formatPrintDate = (dStr?: string) => {
    if (!dStr) return '-';
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(dStr).toLocaleDateString('it-IT');
    } catch {
      return dStr;
    }
  };

  // Dedicated Print-friendly Report View
  const reportPrintViewContent = (
    <div id="fatturazione-print-content" className="bg-white text-slate-900 font-sans p-2 sm:p-6 space-y-6">
      {/* INTESTAZIONE ISTITUZIONALE UFFICIALE */}
      <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
        <div className="flex items-start gap-4">
          <img 
            src={logoAgenzia} 
            alt="Logo Agenzia per lo Sviluppo" 
            className="h-16 w-auto object-contain object-left"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-lg font-serif italic font-extrabold tracking-tight text-slate-900">LUPO 2.0</span>
              <span className="text-[9.5px] uppercase font-black tracking-widest text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Laboratorio LabMerceologico
              </span>
            </div>
            <h1 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              Registro Amministrazione & Monitoraggio Fatturazione Pratiche
            </h1>
            <div className="text-[9.5px] text-slate-600 font-medium space-y-0.5 mt-1">
              <div>Sede legale ed amministrativa: Corso Vittorio Emanuele n°86 - 67100 L'Aquila</div>
              <div>Laboratorio: Via degli Opifici n°1 - Z.I. di Bazzano - 67100 L'Aquila</div>
              <div>P.iva 01751450667</div>
            </div>
          </div>
        </div>
        <div className="text-right text-[10px] font-mono text-slate-600 space-y-0.5 shrink-0 pl-4">
          <div>Data Stampa: <strong className="text-slate-900 font-bold">{new Date().toLocaleDateString('it-IT')} {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</strong></div>
          <div>Operatore: <strong className="text-slate-900 font-bold">{selectedOperator || operators[0]?.nome || 'Amministrazione'}</strong></div>
          <div>Documento: <strong className="text-slate-900 font-bold">REP-FATT-{new Date().getFullYear()}</strong></div>
          <div>Pratiche Totali: <strong className="text-slate-900 font-bold">{filteredPratiche.length}</strong></div>
        </div>
      </div>

      {/* PARAMETRI DI FILTRO APPLICATI */}
      <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-[10px] text-slate-700 flex flex-wrap gap-x-6 gap-y-1">
        <div><strong className="text-slate-900 uppercase text-[9px]">Stato Fatturazione:</strong> {statusFilter}</div>
        <div><strong className="text-slate-900 uppercase text-[9px]">Stato Pagamento:</strong> {paymentFilter}</div>
        <div><strong className="text-slate-900 uppercase text-[9px]">Filtro Importi:</strong> {amountFilter === 'Tutti' ? 'Tutti gli importi' : amountFilter === 'Zero' ? 'Solo a zero (€ 0,00)' : 'Solo valorizzati (> € 0,00)'}</div>
        <div><strong className="text-slate-900 uppercase text-[9px]">Periodo Accettazione:</strong> {dateStart ? formatPrintDate(dateStart) : 'Inizio archivio'} &rarr; {dateEnd ? formatPrintDate(dateEnd) : 'Oggi'}</div>
        <div><strong className="text-slate-900 uppercase text-[9px]">Ricerca:</strong> {searchTerm ? `"${searchTerm}"` : 'Nessun filtro testuale'}</div>
      </div>

      {/* RIEPILOGO STATISTICO / KPI PER AMMINISTRAZIONE */}
      {(() => {
        const activeFilteredPratiche = filteredPratiche.filter(p => p.statoFatturazione !== 'Annullato');
        const countAnnullate = filteredPratiche.length - activeFilteredPratiche.length;
        const totalCount = activeFilteredPratiche.length;
        const countPagati = activeFilteredPratiche.filter(p => p.pagato).length;
        const countInSospeso = totalCount - countPagati;

        const totImportoNetto = activeFilteredPratiche.reduce((acc, p) => acc + p.importo, 0);
        const totIvaCalcolata = totImportoNetto * 0.22;
        const totImportoLordo = totImportoNetto * 1.22;
        const totPagato = activeFilteredPratiche.filter(p => p.pagato).reduce((acc, p) => acc + p.importo, 0);
        const totDaIncassare = totImportoNetto - totPagato;

        return (
          <div className="grid grid-cols-4 gap-3 text-left">
            <div className="border border-slate-300 bg-slate-50/60 p-2 rounded">
              <span className="block text-[8px] font-black text-slate-500 uppercase tracking-wider">Pratiche in Elenco</span>
              <span className="text-sm font-black text-slate-900 font-mono leading-none block mt-1">{totalCount}</span>
              <span className="text-[8.5px] text-slate-500 block mt-0.5">
                su {pratiche.length} totali registrate
                {countAnnullate > 0 ? ` • ${countAnnullate} annullate (escluse dai totali)` : ''}
              </span>
            </div>
            <div className="border border-emerald-300 bg-emerald-50/30 p-2 rounded">
              <span className="block text-[8px] font-black text-emerald-800 uppercase tracking-wider">Importo Già Saldato (Netto)</span>
              <span className="text-sm font-black text-emerald-700 font-mono leading-none block mt-1">
                € {totPagato.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[8.5px] text-emerald-700 font-bold block mt-0.5">{countPagati} pratiche saldate</span>
            </div>
            <div className="border border-amber-300 bg-amber-50/30 p-2 rounded">
              <span className="block text-[8px] font-black text-amber-800 uppercase tracking-wider">Da Incassare / Aperto</span>
              <span className="text-sm font-black text-amber-700 font-mono leading-none block mt-1">
                € {totDaIncassare.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[8.5px] text-amber-700 font-bold block mt-0.5">{countInSospeso} pratiche pendenti</span>
            </div>
            <div className="border border-indigo-300 bg-indigo-50/30 p-2 rounded">
              <span className="block text-[8px] font-black text-indigo-900 uppercase tracking-wider">Volume Netto & Lordo Ivato</span>
              <span className="text-sm font-black text-indigo-900 font-mono leading-none block mt-1">
                € {totImportoNetto.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[8px] text-indigo-700 font-bold block mt-0.5">IVA (22%): € {totIvaCalcolata.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &bull; Tot: € {totImportoLordo.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        );
      })()}

      {/* TABELLA DETTAGLIATA PRATICHE */}
      <div className="border border-slate-300 rounded overflow-hidden">
        <table className="w-full text-left border-collapse text-[9.5px]">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase tracking-wider text-[8px]">
              <th className="py-2 px-2 border-r border-slate-200 font-mono">N. Campione</th>
              <th className="py-2 px-2 border-r border-slate-200 font-mono">Prot. & Data RdP</th>
              <th className="py-2 px-2.5 border-r border-slate-200">Cliente / Ragione Sociale</th>
              <th className="py-2 px-2 border-r border-slate-200 font-mono">P. IVA</th>
              <th className="py-2 px-2 border-r border-slate-200 font-mono">Cod. Fiscale</th>
              <th className="py-2 px-2 border-r border-slate-200 font-mono">N. Offerta</th>
              <th className="py-2 px-2 border-r border-slate-200 text-center">Data Accett.</th>
              <th className="py-2 px-2 text-right border-r border-slate-200 font-mono">Importo (Netto & IVA)</th>
              <th className="py-2 px-2 text-center border-r border-slate-200">Stato</th>
              <th className="py-2 px-2 text-center border-r border-slate-200 font-mono">Fattura N.</th>
              <th className="py-2 px-2 text-center border-r border-slate-200 font-mono">Data Fatt.</th>
              <th className="py-2 px-2 text-center border-r border-slate-200">Pagato?</th>
              <th className="py-2 px-2 text-center font-mono">Data Incasso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {sortedPratiche.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center py-8 text-slate-400 italic">
                  Nessuna pratica contabile corrisponde ai parametri specificati.
                </td>
              </tr>
            ) : (
              sortedPratiche.map(p => {
                const isZero = p.importo === 0;
                const isAnn = p.statoFatturazione === 'Annullato';
                const codFiscale = getCodiceFiscale(p);
                return (
                  <tr key={p.id} className={`break-inside-avoid ${isAnn ? 'bg-rose-50/40' : isZero ? 'bg-amber-50/30' : ''}`}>
                    <td className="py-1.5 px-2 border-r border-slate-200 font-mono font-bold text-slate-900">
                      {p.numeroCampione}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200 font-mono text-[9px]">
                      {p.numeroProtocolloRdP ? (
                        <div>
                          <div className="font-bold text-blue-900">{p.numeroProtocolloRdP}</div>
                          {p.dataInvioRdP && <div className="text-[8px] text-slate-500">{formatPrintDate(p.dataInvioRdP)}</div>}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 border-r border-slate-200 font-bold text-slate-900 leading-tight">
                      {p.nomeCliente}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200 font-mono text-slate-600">
                      {p.partitaIva || '-'}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200 font-mono text-slate-600">
                      {codFiscale || '-'}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200 font-mono text-slate-600">
                      {p.numeroPreventivo || '-'}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center font-medium text-slate-700">
                      {formatPrintDate(p.dataAccettazione)}
                    </td>
                    <td className={`py-1.5 px-2 border-r border-slate-200 text-right font-mono font-bold ${isZero && !isAnn ? 'text-rose-600' : 'text-slate-900'}`}>
                      {isAnn ? (
                        <div>
                          <div className="line-through text-slate-400 font-bold leading-tight">
                            € {p.importo.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[7.5px] text-rose-700 font-semibold leading-tight">Escluso (Annullata)</div>
                        </div>
                      ) : isZero ? (
                        <span>€ 0,00</span>
                      ) : (
                        <div>
                          <div className="font-black text-slate-900 leading-tight">
                            € {p.importo.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[7.5px] text-indigo-700 font-semibold leading-tight">
                            + IVA 22%: € {(p.importo * 0.22).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[7px] text-slate-500 font-medium leading-tight">
                            (Tot: € {(p.importo * 1.22).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded font-black text-[8px] uppercase tracking-wider ${
                        p.statoFatturazione === 'Fatturato' 
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                          : isAnn
                          ? 'bg-rose-100 text-rose-900 border border-rose-300'
                          : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                      }`}>
                        {p.statoFatturazione}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono font-bold text-slate-800">
                      {p.numeroFattura || '-'}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono text-slate-600">
                      {formatPrintDate(p.dataFattura)}
                    </td>
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded font-bold text-[8px] uppercase tracking-wider ${
                        isAnn
                          ? 'bg-rose-50 text-rose-700'
                          : p.pagato 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isAnn ? 'Annullata' : p.pagato ? 'Sì (Saldato)' : 'No'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-600">
                      {formatPrintDate(p.dataPagamento)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {sortedPratiche.length > 0 && (() => {
            const activeSorted = sortedPratiche.filter(p => p.statoFatturazione !== 'Annullato');
            const totNetto = activeSorted.reduce((s, p) => s + p.importo, 0);
            const totIva = totNetto * 0.22;
            const totLordo = totNetto * 1.22;
            return (
              <tfoot>
                <tr className="bg-slate-100 font-black border-t-2 border-slate-900 text-[9.5px]">
                  <td colSpan={7} className="py-2 px-2.5 text-right uppercase tracking-wider">
                    Totale Complessivo Pratiche Filtrate (escluse annullate):
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-[9.5px] text-slate-950 font-bold leading-tight">
                    <div>Netto: € {totNetto.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="text-[7.5px] text-indigo-700 font-semibold">IVA 22%: € {totIva.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="text-[8px] text-slate-600 font-medium">Tot: € {totLordo.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </td>
                  <td colSpan={5} className="py-2 px-2 text-left text-[8.5px] text-slate-500">
                    {activeSorted.filter(p => p.pagato).length} saldate &bull; {activeSorted.filter(p => p.statoFatturazione === 'Fatturato').length} fatturate
                    {sortedPratiche.length !== activeSorted.length ? ` • ${sortedPratiche.length - activeSorted.length} annullate` : ''}
                  </td>
                </tr>
              </tfoot>
            );
          })()}
        </table>
      </div>

      {/* FOOTER DI CHIUSURA DOCUMENTO AMMINISTRATIVO */}
      <div className="grid grid-cols-2 gap-8 pt-6 mt-2 border-t border-slate-300 text-center break-inside-avoid">
        <div>
          <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-600 block mb-10">Compilato dall'Ufficio Amministrazione</span>
          <div className="border-b border-slate-400 w-3/4 mx-auto"></div>
          <span className="text-[8px] text-slate-500 mt-1 block font-medium">Gestione Contabilità e Pratiche LIMS</span>
        </div>
        <div>
          <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-600 block mb-10">Il Responsabile Amministrativo / Direzione</span>
          <div className="border-b border-slate-400 w-3/4 mx-auto"></div>
          <span className="text-[8px] text-slate-900 font-bold mt-1 block">Agenzia per lo Sviluppo</span>
        </div>
      </div>
      <div className="text-center text-[7.5px] text-slate-400 font-mono pt-1">
        Documento interno di gestione contabile e controllo di gestione — LabMerceologico Lupo 2.0 — Stampa autorizzata
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* DEDICATED PRINT-FRIENDLY VIEW FOR FATTURAZIONE SECTION */}
      <div className="hidden print:block print:w-full print:bg-white font-sans text-slate-900">
        {reportPrintViewContent}
      </div>

      {/* WEB INTERACTIVE UI WRAPPER */}
      <div className="print:hidden space-y-6">
      
      {/* Header and export buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-600 font-bold block">
            Laboratorio LabMerceologico LUPO 2.0
          </span>
          <h2 className="text-xl font-bold font-sans text-slate-900 tracking-tight mt-1">
            Area Amministrazione & Fatturazione
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Gestisci ed esporta l&apos;elenco delle pratiche da fatturare collegate all&apos;accettazione campioni e preventivi approvati.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setShowGoogleDriveReconcileModal(true)}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm border-0"
            title="Incrocia automaticamente le fatture XML di Google Drive con i RdP"
          >
            <FolderSync className="h-4 w-4 text-emerald-400" />
            Riconcilia Fatture XML (Drive)
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm shadow-emerald-600/10 border-0"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Esporta Excel (.CSV)
          </button>
          
          <button
            onClick={handlePrintPDF}
            className="px-3.5 py-2.5 bg-indigo-400 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm border-0"
          >
            <Printer className="h-4 w-4" />
            Esporta / Stampa PDF
          </button>
        </div>
      </div>

      {/* MONITORAGGIO AMMINISTRATIVO PAGAMENTI PER CLIENTE */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-3xs space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center p-1.5 bg-indigo-50 text-indigo-700 rounded-xl">
                <BadgeEuro className="h-4.5 w-4.5" />
              </span>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none">
                📊 Monitoraggio Pagamenti & Scadenze per Cliente
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 sm:mt-1">
              Verifica istantaneamente quanti campioni sono stati pagati, quanti pendono e i tempi di saldo medi.
            </p>
          </div>
          
          {/* Client Dropdown selector */}
          <div className="w-full lg:w-80 shrink-0 relative" onMouseLeave={() => setIsMonitorDropdownOpen(false)}>
            <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
              Seleziona o Cerca Cliente da Monitorare:
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Cerca cliente..."
                value={searchComponentQuery}
                onFocus={() => setIsMonitorDropdownOpen(true)}
                onChange={(e) => {
                  setSearchComponentQuery(e.target.value);
                  setIsMonitorDropdownOpen(true);
                  // If we manually change search and it matches exactly, set it
                  const exact = uniqueClients.find(cl => (cl.nome || '').toLowerCase() === (e.target.value || '').trim().toLowerCase());
                  if (exact) {
                    setSelectedMonitorClient(exact.nome);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-slate-900 focus:bg-white rounded-xl py-2 pl-8 pr-8 text-xs font-semibold text-slate-800 transition"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </span>
              {(searchComponentQuery || selectedMonitorClient !== 'Tutti') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchComponentQuery('');
                    setSelectedMonitorClient('Tutti');
                    setIsMonitorDropdownOpen(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-405 hover:text-slate-600 focus:outline-none cursor-pointer"
                  title="Mostra tutti i clienti"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {isMonitorDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMonitorClient('Tutti');
                    setSearchComponentQuery('');
                    setIsMonitorDropdownOpen(false);
                  }}
                  className={`w-full text-left py-2.5 px-3 text-xs font-semibold cursor-pointer transition flex items-center justify-between border-0 bg-transparent ${
                    selectedMonitorClient === 'Tutti' ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5">🌐 Mostra Tutti i Clienti Registrati</span>
                  {selectedMonitorClient === 'Tutti' && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                </button>

                {(() => {
                  const filtered = uniqueClients.filter(cl => 
                    (cl.nome || '').toLowerCase().includes((searchComponentQuery || '').toLowerCase())
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="py-3 px-3 text-2xs text-slate-400 text-center font-medium italic">
                        Nessun cliente corrispondente
                      </div>
                    );
                  }

                  return filtered.map(cl => (
                    <button
                      type="button"
                      key={cl.nome}
                      onClick={() => {
                        setSelectedMonitorClient(cl.nome);
                        setSearchComponentQuery(cl.nome);
                        setIsMonitorDropdownOpen(false);
                      }}
                      className={`w-full text-left py-2 px-3 text-xs font-semibold cursor-pointer transition flex items-center justify-between border-0 bg-transparent ${
                        selectedMonitorClient === cl.nome ? 'bg-indigo-50/70 text-indigo-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="truncate pr-2">{cl.nome}</span>
                      {selectedMonitorClient === cl.nome && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                    </button>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>

        {(() => {
          const clientPratiche = selectedMonitorClient === 'Tutti'
            ? pratiche
            : pratiche.filter(p => p.nomeCliente === selectedMonitorClient);

          const clientPraticheAttive = clientPratiche.filter(p => p.statoFatturazione !== 'Annullato');
          const totalCampioni = clientPraticheAttive.length;
          const campioniPagati = clientPraticheAttive.filter(p => p.pagato).length;
          const campioniDaPagare = totalCampioni - campioniPagati;

          const importoTotale = clientPraticheAttive.reduce((sum, p) => sum + p.importo, 0);
          const importoPagato = clientPraticheAttive.filter(p => p.pagato).reduce((sum, p) => sum + p.importo, 0);
          const importoDaPagare = importoTotale - importoPagato;

          // Compute delay latency
          let totalElapsedDays = 0;
          let countPaidInvoiced = 0;

          clientPraticheAttive.forEach(p => {
            if (p.pagato && p.dataFattura && p.dataPagamento) {
              const start = new Date(p.dataFattura);
              const end = new Date(p.dataPagamento);
              if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                const diffTime = end.getTime() - start.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                totalElapsedDays += diffDays >= 0 ? diffDays : 0;
                countPaidInvoiced++;
              }
            }
          });

          const tempoMedio = countPaidInvoiced > 0
            ? Math.round(totalElapsedDays / countPaidInvoiced)
            : null;

          return (
            <div className="space-y-4">
              {/* Dynamic stats row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Stat 1: Total */}
                <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl">
                  <span className="text-[8.5px] uppercase font-bold text-slate-400 block tracking-wider font-mono">Totale Campioni Ordinati</span>
                  <div className="flex justify-between items-baseline mt-1.5">
                    <span className="text-2xl font-black font-mono text-slate-800">{totalCampioni}</span>
                    <span className="text-xs text-slate-500 font-semibold">€ {importoTotale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Stat 2: Paid */}
                <div className="p-4 bg-emerald-50/45 border border-emerald-100 rounded-2xl">
                  <span className="text-[8.5px] uppercase font-bold text-emerald-800/80 block tracking-wider font-mono">Campioni Pagati ✓</span>
                  <div className="flex justify-between items-baseline mt-1.5">
                    <span className="text-2xl font-black font-mono text-emerald-700">{campioniPagati}</span>
                    <span className="text-xs text-emerald-600 font-bold">€ {importoPagato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Stat 3: Da pagare */}
                <div className="p-4 bg-amber-50/45 border border-amber-100 rounded-2xl">
                  <span className="text-[8.5px] uppercase font-bold text-amber-800/80 block tracking-wider font-mono">Campioni Da Pagare ⏳</span>
                  <div className="flex justify-between items-baseline mt-1.5">
                    <span className="text-2xl font-black font-mono text-amber-700">{campioniDaPagare}</span>
                    <span className="text-xs text-amber-600 font-extrabold">€ {importoDaPagare.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Stat 4: Average elapsed time */}
                <div className="p-4 bg-indigo-50/45 border border-indigo-100 rounded-2xl">
                  <span className="text-[8.5px] uppercase font-bold text-indigo-800/80 block tracking-wider font-mono">Tempo Medio Pagamento</span>
                  <div className="flex justify-between items-baseline mt-1.5">
                    <span className="text-xl font-black text-indigo-950 font-mono">
                      {tempoMedio !== null ? `${tempoMedio} ${tempoMedio === 1 ? 'giorno' : 'giorni'}` : 'N/D'}
                    </span>
                    <span className="text-[9.5px] text-indigo-500 font-medium">Da data fattura</span>
                  </div>
                </div>

              </div>

              {/* Specific client breakdown logs */}
              {selectedMonitorClient !== 'Tutti' && (
                <div className="bg-slate-50/50 rounded-xl border border-slate-150 p-4">
                  <h4 className="text-[8.5px] font-black uppercase tracking-widest text-slate-500 pb-2 border-b border-slate-250 block">
                    ⏱️ Registro Scadenze e Dettaglio Campioni per "{selectedMonitorClient}"
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 mt-2.5">
                    {clientPratiche.map(p => {
                      let desc = '';
                      let badge = '';
                      let badgeText = '';

                      if (p.statoFatturazione === 'Annullato') {
                        badgeText = '🚫 Pratica Annullata';
                        badge = 'bg-rose-50 text-rose-800 border-rose-200';
                      } else if (p.pagato) {
                        if (p.dataFattura && p.dataPagamento) {
                          const fDate = new Date(p.dataFattura);
                          const pDate = new Date(p.dataPagamento);
                          const delta = Math.ceil((pDate.getTime() - fDate.getTime()) / (1000 * 3600 * 24));
                          if (delta <= 0) {
                            badgeText = 'Pagato lo stesso giorno';
                          } else {
                            badgeText = `Pagato in ${delta} ${delta === 1 ? 'giorno' : 'giorni'}`;
                          }
                          badge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                        } else {
                          badgeText = 'Saldato in anticipo';
                          badge = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                        }
                      } else if (p.statoFatturazione === 'Fatturato' && p.dataFattura) {
                        const fDate = new Date(p.dataFattura);
                        const curr = new Date();
                        const delay = Math.ceil((curr.getTime() - fDate.getTime()) / (1000 * 3600 * 24));
                        badgeText = `In sofferenza da ${delay} gg`;
                        badge = 'bg-rose-50 text-rose-800 border-rose-200 font-extrabold animate-pulse';
                      } else {
                        badgeText = 'In attesa di fatturazione';
                        badge = 'bg-indigo-50 text-indigo-800 border-indigo-150';
                      }

                      return (
                        <div key={p.id} className="flex justify-between items-center py-2 px-3 bg-white border border-slate-205 rounded-xl hover:border-slate-300 text-2xs transition">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-800 font-mono">{p.numeroCampione}</span>
                            <span className="text-slate-300">|</span>
                            <span className={`font-mono ${p.statoFatturazione === 'Annullato' ? 'line-through text-slate-400' : 'text-slate-600'}`}>
                              Importo: € {p.importo.toFixed(2)}
                            </span>
                            {p.numeroFattura && (
                              <>
                                <span className="text-slate-300">|</span>
                                <span className="text-slate-500 font-mono">Fattura: {p.numeroFattura} ({p.dataFattura})</span>
                              </>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {p.dataPagamento && (
                              <span className="text-slate-400 font-mono text-[10px]">Data incasso: {p.dataPagamento}</span>
                            )}
                            <span className={`px-2 py-0.5 border rounded-md font-bold text-[9px] tracking-wide text-center uppercase leading-none block ${badge}`}>
                              {badgeText}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Main Grid: Search and Advanced Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-3xs space-y-4">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest block border-b border-slate-100 pb-2.5">
          🔍 Strumenti di Ricerca ed Excel-filters avanzati
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3.5">
          {/* Search bar */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cerca campione, cliente, fattura, preventivo..."
              className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-350 focus:border-slate-950 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 focus:outline-none focus:ring-0 transition"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-350 focus:border-slate-950 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-slate-800 focus:outline-none transition"
            >
              <option value="Tutti">📁 Fatturazione: Tutti</option>
              <option value="Da fatturare">⏳ Da fatturare</option>
              <option value="Fatturato">✅ Fatturato</option>
              <option value="Annullato">🚫 Annullato (Stornate / Non fatt.)</option>
            </select>
          </div>

          {/* Payment filter */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-350 focus:border-slate-950 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-slate-800 focus:outline-none transition"
            >
              <option value="Tutti">💳 Pagamento: Tutti</option>
              <option value="Pagati">✅ Saldati / Pagati</option>
              <option value="Da pagare">⏳ Da pagare (Non saldati)</option>
              <option value="Insoluti">🚨 Fatturati non pagati (Insoluti)</option>
            </select>
          </div>

          {/* Amount filter */}
          <div>
            <select
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value as any)}
              className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-350 focus:border-slate-950 rounded-xl py-2.5 px-3.5 text-xs font-semibold text-slate-800 focus:outline-none transition"
            >
              <option value="Tutti">🪙 Importo: Tutti</option>
              <option value="Zero">⚠️ Solo a zero/mancanti</option>
              <option value="Validi">💶 Solo importi valorizzati</option>
            </select>
          </div>

          {/* Quick Clear filters */}
          <div className="flex gap-1.5 matches-area">
            <div className="flex-1">
              <input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                title="Data inizio accettazione"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-2.5 text-[10px] font-bold text-slate-700"
              />
            </div>
            <div className="flex-1">
              <input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                title="Data fine accettazione"
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-2 px-2.5 text-[10px] font-bold text-slate-700"
              />
            </div>
            {(searchTerm || statusFilter !== 'Tutti' || paymentFilter !== 'Tutti' || amountFilter !== 'Tutti' || dateStart || dateEnd) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('Tutti');
                  setPaymentFilter('Tutti');
                  setAmountFilter('Tutti');
                  setDateStart('');
                  setDateEnd('');
                }}
                className="p-2 border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-xl transition shrink-0 cursor-pointer"
                title="Svuota tutti i filtri"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* BARRA AZIONI DI BLOCCO (QUANDO ALMENO UNA PRATICA È SELEZIONATA) */}
        {selectedRowIds.size > 0 && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-indigo-50/60 p-3 rounded-xl border border-indigo-200/80 animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-black font-mono">
                {selectedRowIds.size} selezionate
              </span>
              <span className="text-xs font-bold text-slate-700">
                Totale selezionato: € {pratiche.filter(p => selectedRowIds.has(p.id) && p.statoFatturazione !== 'Annullato').reduce((s, p) => s + p.importo, 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })} (Netto)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkSetPaid(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Check className="h-3.5 w-3.5" /> Segna come PAGATE
              </button>

              <button
                type="button"
                onClick={() => handleBulkSetPaid(false)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Clock className="h-3.5 w-3.5" /> Segna DA PAGARE
              </button>

              <button
                type="button"
                onClick={() => setShowBulkInvoiceBar(!showBulkInvoiceBar)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                🧾 Fattura Cumulativa
              </button>

              <button
                type="button"
                onClick={() => setSelectedRowIds(new Set())}
                className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Deseleziona
              </button>
            </div>

            {showBulkInvoiceBar && (
              <div className="w-full pt-2 border-t border-indigo-200/60 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-indigo-950">Assegna N. Fattura a tutte le {selectedRowIds.size} pratiche:</span>
                <input
                  type="text"
                  value={bulkInvoiceNum}
                  onChange={(e) => setBulkInvoiceNum(e.target.value)}
                  placeholder="N. Fattura (es. FT-2026-015)"
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-800"
                />
                <input
                  type="date"
                  value={bulkInvoiceDate}
                  onChange={(e) => setBulkInvoiceDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-slate-800"
                />
                <button
                  type="button"
                  disabled={!bulkInvoiceNum.trim() || !bulkInvoiceDate}
                  onClick={handleBulkAssignInvoice}
                  className="px-3.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Applica Fattura Cumulativa
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Excel-styled interactive Grid Table */}
      <div className="bg-white rounded-2xl border border-slate-205 shadow-md overflow-hidden">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-left border-collapse table-excel">
            <thead>
              <tr className="bg-amber-100 text-amber-900 text-[10.5px] uppercase tracking-wider font-bold">
                <th className="py-3 px-2.5 border-r border-amber-200 text-center w-9 select-none">
                  <input
                    type="checkbox"
                    checked={
                      sortedPratiche.filter(p => p.statoFatturazione !== 'Annullato').length > 0 &&
                      sortedPratiche.filter(p => p.statoFatturazione !== 'Annullato').every(p => selectedRowIds.has(p.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRowIds(new Set(sortedPratiche.filter(p => p.statoFatturazione !== 'Annullato').map(p => p.id)));
                      } else {
                        setSelectedRowIds(new Set());
                      }
                    }}
                    className="w-3.5 h-3.5 rounded border-amber-400 text-indigo-600 cursor-pointer"
                    title="Seleziona/Deseleziona tutte le pratiche attive visibili"
                  />
                </th>
                <th className="py-3 px-3 border-r border-amber-200 cursor-pointer hover:bg-amber-200 transition-colors" onClick={() => handleSort('numeroCampione')}>
                  <div className="flex items-center gap-1.5">
                    Numero Campione
                    <ArrowUpDown className="h-3 w-3 text-amber-700/60" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-amber-200 font-mono font-medium">Prot. & Invio RdP</th>
                <th className="py-3 px-4 border-r border-amber-200 cursor-pointer hover:bg-amber-200 transition-colors" onClick={() => handleSort('nomeCliente')}>
                  <div className="flex items-center gap-1.5">
                    Cliente / Ragione Sociale
                    <ArrowUpDown className="h-3 w-3 text-amber-700/60" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-amber-200">P. IVA</th>
                <th className="py-3 px-3 border-r border-amber-200 cursor-pointer hover:bg-amber-200 transition-colors" onClick={() => handleSort('codiceFiscale')}>
                  <div className="flex items-center gap-1.5">
                    Codice Fiscale
                    <ArrowUpDown className="h-3 w-3 text-amber-700/60" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-amber-200 font-mono font-medium">N. Offerta</th>
                <th className="py-3 px-3 border-r border-amber-200 cursor-pointer hover:bg-amber-200 transition-colors" onClick={() => handleSort('dataAccettazione')}>
                  <div className="flex items-center gap-1.5">
                    Data Accettazione
                    <ArrowUpDown className="h-3 w-3 text-amber-700/60" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-amber-200 text-right cursor-pointer hover:bg-amber-200 transition-colors" onClick={() => handleSort('importo')}>
                  <div className="flex items-center justify-end gap-1.5">
                    Importo (Netto & IVA)
                    <ArrowUpDown className="h-3 w-3 text-amber-700/60" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-amber-200 text-center cursor-pointer hover:bg-amber-200 transition-colors" onClick={() => handleSort('statoFatturazione')}>
                  <div className="flex items-center justify-center gap-1.5">
                    Stato
                    <ArrowUpDown className="h-3 w-3 text-amber-700/60" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-amber-200 font-mono text-center cursor-pointer hover:bg-amber-200 transition-colors" onClick={() => handleSort('numeroFattura')}>
                  <div className="flex items-center justify-center gap-1">
                    Fattura N.
                    <ArrowUpDown className="h-3 w-3 text-amber-700/60" />
                  </div>
                </th>
                <th className="py-3 px-3 border-r border-amber-200 text-center font-mono cursor-pointer hover:bg-amber-200 transition-colors" onClick={() => handleSort('dataFattura')}>
                  <div className="flex items-center justify-center gap-1">
                    Data Fatt.
                    <ArrowUpDown className="h-3 w-3 text-amber-700/60" />
                  </div>
                </th>
                <th className="py-3 px-4 border-r border-amber-200 text-center cursor-pointer hover:bg-amber-200 transition-colors" onClick={() => handleSort('pagato')}>
                  <div className="flex items-center justify-center gap-1">
                    Pagato?
                    <ArrowUpDown className="h-3 w-3 text-amber-700/60" />
                  </div>
                </th>
                <th className="py-3 px-6 text-center select-none print:hidden font-medium">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs">
              {sortedPratiche.map((p, idx) => {
                const isZero = p.importo === 0;
                const isAnnullato = p.statoFatturazione === 'Annullato';
                const codFiscale = getCodiceFiscale(p);
                const matchedPrev = preventivi?.find(
                  prev => prev.codice.trim().toLowerCase() === (p.numeroPreventivo || '').trim().toLowerCase() || prev.id === p.numeroPreventivo
                );
                const isRowSelected = selectedRowIds.has(p.id);

                return (
                  <tr 
                    key={p.id} 
                    className={`hover:bg-slate-50/50 transition-colors ${
                      isAnnullato
                        ? 'bg-rose-50/25 opacity-80'
                        : isRowSelected
                        ? 'bg-indigo-50/40'
                        : idx % 2 === 1
                        ? 'bg-slate-50/20'
                        : 'bg-white'
                    } ${!isAnnullato && isZero ? 'bg-amber-50/20' : ''}`}
                  >
                    {/* Checkbox Selezione */}
                    <td className="py-3.5 px-2.5 border-r border-slate-155 text-center select-none">
                      <input
                        type="checkbox"
                        disabled={isAnnullato}
                        checked={!isAnnullato && isRowSelected}
                        onChange={() => {
                          if (isAnnullato) return;
                          setSelectedRowIds(prev => {
                            const next = new Set(prev);
                            if (next.has(p.id)) next.delete(p.id);
                            else next.add(p.id);
                            return next;
                          });
                        }}
                        className={`w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 ${isAnnullato ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                        title={isAnnullato ? 'Pratica annullata (non selezionabile per azioni massive)' : 'Seleziona pratica'}
                      />
                    </td>
                    {/* Numero Campione */}
                    <td className="py-3.5 px-3 border-r border-slate-155 font-mono font-bold text-slate-800">
                      {onGoToAccettazione ? (
                        <button
                          type="button"
                          onClick={() => onGoToAccettazione(p.numeroCampione, `Fatturazione ${p.numeroCampione}`)}
                          className="text-left hover:text-indigo-600 hover:underline transition cursor-pointer inline-flex items-center gap-1 group"
                          title={`Vai al campione ${p.numeroCampione} in Accettazione & RdP`}
                        >
                          <span>{p.numeroCampione}</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity" />
                        </button>
                      ) : (
                        p.numeroCampione
                      )}
                    </td>

                    {/* Protocollo & Data Invio RdP */}
                    <td className="py-3.5 px-3 border-r border-slate-155 font-mono">
                      {p.numeroProtocolloRdP ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10.5px] font-bold text-blue-900 bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded font-mono inline-block w-fit">
                            📩 {p.numeroProtocolloRdP}
                          </span>
                          {p.dataInvioRdP && (
                            <span className="text-[10px] text-slate-500 font-sans flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {p.dataInvioRdP}
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="text-[10.5px] font-medium text-slate-400 hover:text-blue-600 border border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 px-2 py-0.5 rounded-lg transition cursor-pointer inline-flex items-center gap-1"
                          title="Inserisci protocollo e data invio RdP"
                        >
                          <Plus className="h-3 w-3" />
                          <span>RdP</span>
                        </button>
                      )}
                    </td>

                    {/* Cliente / Ragione Sociale */}
                    <td className="py-3.5 px-4 border-r border-slate-155 font-bold text-slate-900 leading-tight">
                      {onGoToClient && p.clienteId ? (
                        <button
                          type="button"
                          onClick={() => onGoToClient(p.clienteId, `Fatturazione ${p.numeroCampione}`)}
                          className="text-left hover:text-indigo-600 hover:underline transition cursor-pointer inline-flex items-center gap-1 group"
                          title={`Apri anagrafica cliente: ${p.nomeCliente}`}
                        >
                          <span>{p.nomeCliente}</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 text-indigo-500 transition-opacity shrink-0" />
                        </button>
                      ) : (
                        p.nomeCliente
                      )}
                    </td>

                    {/* Partita IVA */}
                    <td className="py-3.5 px-3 border-r border-slate-155 font-mono text-slate-600 font-medium">
                      {p.partitaIva || (
                        <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded">Mancante</span>
                      )}
                    </td>

                    {/* Codice Fiscale */}
                    <td className="py-3.5 px-3 border-r border-slate-155 font-mono text-slate-700 font-medium text-[11px]">
                      {codFiscale ? (
                        <span className="bg-slate-50 text-slate-800 px-1.5 py-0.5 rounded font-mono font-bold">{codFiscale}</span>
                      ) : (
                        <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded">Mancante</span>
                      )}
                    </td>

                    {/* Numero Offerta con collegamento */}
                    <td className="py-3.5 px-3 border-r border-slate-155 font-mono">
                      {p.numeroPreventivo && p.numeroPreventivo !== '-' && p.numeroPreventivo !== 'Senza Preventivo' ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (matchedPrev) {
                              onViewPreventivo?.(matchedPrev.id);
                            } else if (onViewPreventivo) {
                              onViewPreventivo(p.numeroPreventivo);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-200 hover:border-indigo-300 font-mono font-bold text-[11px] transition shadow-3xs cursor-pointer group"
                          title={`Apri offerta ${p.numeroPreventivo}`}
                        >
                          <FileText className="h-3 w-3 text-indigo-500 group-hover:scale-110 transition-transform" />
                          <span>{p.numeroPreventivo}</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
                        </button>
                      ) : (
                        <span className="text-slate-400 italic font-normal text-[10.5px]">-</span>
                      )}
                    </td>

                    {/* Data Accettazione */}
                    <td className="py-3.5 px-3 border-r border-slate-155 text-slate-600 font-bold">
                      {p.dataAccettazione}
                    </td>

                    {/* Importo Netto & IVA Calcolata */}
                    <td className={`py-3.5 px-3 border-r border-slate-155 text-right font-mono ${!isAnnullato && isZero ? 'text-rose-600 bg-red-50/30' : ''}`}>
                      {isAnnullato ? (
                        <div className="space-y-0.5 text-right">
                          <div className="text-xs font-bold text-slate-400 line-through">
                            € {p.importo.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-[9px] font-sans font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded inline-block">
                            🚫 ANNULLATA (Esclusa dai totali)
                          </div>
                        </div>
                      ) : isZero ? (
                        <div className="space-y-1 text-right">
                          <div className="inline-flex items-center gap-1 text-[10px] bg-amber-50 border border-amber-200 text-amber-800 px-1.5 py-0.5 rounded animate-pulse">
                            <AlertTriangle className="h-3 w-3 text-amber-600 block" />
                            € 0,00!
                          </div>
                          {matchedPrev && matchedPrev.totale > 0 && (
                            <div>
                              <button
                                type="button"
                                onClick={() => handleAlignImportoToPreventivo(p, matchedPrev.totale)}
                                className="text-[9px] font-sans font-black text-white bg-amber-600 hover:bg-amber-700 px-2 py-0.5 rounded shadow-3xs transition cursor-pointer"
                                title={`Allinea l'importo netto della pratica al totale netto del preventivo ${matchedPrev.codice} (€ ${matchedPrev.totale.toFixed(2)})`}
                              >
                                🔄 Allinea a € {matchedPrev.totale.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-0.5 text-right">
                          <div className="flex items-baseline justify-end gap-1 text-xs font-bold text-slate-900">
                            <span className="text-[8.5px] uppercase font-bold text-slate-400 tracking-wider">Netto:</span>
                            <span>€ {p.importo.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex items-baseline justify-end gap-1 text-[10px] font-bold text-indigo-700">
                            <span className="text-[8px] uppercase font-semibold text-indigo-400 tracking-wider">IVA (22%):</span>
                            <span>€ {(p.importo * 0.22).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="text-[9px] font-semibold text-slate-500 pt-0.5 border-t border-slate-100">
                            Tot: € {(p.importo * 1.22).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          {matchedPrev && Math.abs(p.importo - matchedPrev.totale) > 0.01 && (
                            <div className="pt-1 mt-1 border-t border-amber-200 flex flex-col items-end gap-1">
                              <span className="text-[8.5px] font-sans font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                ⚠️ Netto Prev.: € {matchedPrev.totale.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAlignImportoToPreventivo(p, matchedPrev.totale)}
                                className="text-[9px] font-sans font-black text-white bg-amber-600 hover:bg-amber-700 px-2 py-0.5 rounded shadow-3xs transition cursor-pointer"
                                title={`Allinea l'importo netto della pratica al totale netto del preventivo ${matchedPrev.codice} (€ ${matchedPrev.totale.toFixed(2)})`}
                              >
                                🔄 Allinea a € {matchedPrev.totale.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Stato Fatturazione */}
                    <td className="py-3.5 px-3 border-r border-slate-155 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border tracking-wide shadow-3xs ${
                          p.statoFatturazione === 'Fatturato'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-150'
                            : isAnnullato
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-150'
                        }`}>
                          {p.statoFatturazione === 'Fatturato' ? (
                            <CheckCircle className="h-3 w-3 text-emerald-600" />
                          ) : isAnnullato ? (
                            <Ban className="h-3 w-3 text-rose-600" />
                          ) : (
                            <Clock className="h-3 w-3 text-indigo-500/85" />
                          )}
                          {p.statoFatturazione}
                        </span>
                        {isAnnullato && (p.motivoAnnullamento || p.fatturaPrecedenteAnnullata) && (
                          <span
                            className="text-[9px] text-rose-700 font-medium max-w-[140px] truncate block"
                            title={`${p.fatturaPrecedenteAnnullata ? `Fatt. stornata: ${p.fatturaPrecedenteAnnullata} — ` : ''}${p.motivoAnnullamento || ''}`}
                          >
                            {p.motivoAnnullamento || `Ex Fatt. ${p.fatturaPrecedenteAnnullata}`}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Numero Fattura */}
                    <td className="py-3.5 px-3 border-r border-slate-155 font-mono text-[11px] text-center font-bold text-slate-800">
                      {p.numeroFattura ? (
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono font-bold text-[10.5px]">🧾 {p.numeroFattura}</span>
                      ) : p.fatturaPrecedenteAnnullata ? (
                        <span className="text-[10px] text-rose-500 line-through font-mono" title={`Fattura precedentemente associata e stornata: ${p.fatturaPrecedenteAnnullata}`}>
                          {p.fatturaPrecedenteAnnullata.split(' ')[0]}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic font-normal text-[10.5px]">-</span>
                      )}
                    </td>

                    {/* Data Fattura */}
                    <td className="py-3.5 px-3 border-r border-slate-155 text-center text-slate-500 font-mono text-[10.5px]">
                      {p.dataFattura || '-'}
                    </td>

                    {/* Pagamento (Avvenuto Pagamento checkbox) */}
                    <td className="py-3.5 px-4 border-r border-slate-155 text-center select-none">
                      {isAnnullato ? (
                        <span className="text-[9.5px] text-rose-500 font-bold tracking-wide uppercase leading-none">
                          Annullata
                        </span>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleTogglePaidDirect(p.id)}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition cursor-pointer shrink-0 focus:outline-none ${
                              p.pagato 
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs' 
                                : 'bg-white border-slate-300 text-transparent hover:border-slate-500'
                            }`}
                            title={p.pagato ? 'Segna come non pagato' : 'Segna come pagato'}
                          >
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </button>
                          {p.pagato ? (
                            <input
                              type="date"
                              value={p.dataPagamento || ''}
                              onChange={(e) => {
                                const updated = pratiche.map(prat => {
                                  if (prat.id === p.id) {
                                    return { ...prat, dataPagamento: e.target.value };
                                  }
                                  return prat;
                                });
                                onUpdatePratiche(updated);
                              }}
                              className="text-[10px] text-emerald-700 font-black tracking-wide font-mono leading-none bg-transparent border-0 p-0 m-0 focus:ring-0 cursor-pointer w-[95px]"
                            />
                          ) : (
                            <span className="text-[9.5px] text-slate-400 font-semibold tracking-wide uppercase leading-none">No</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Azioni Modifica */}
                    <td className="py-3 px-4 text-center select-none print:hidden">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="p-1 px-2 py-1 bg-indigo-400 border-0 hover:bg-indigo-500 text-white rounded-lg text-2xs font-extrabold shadow-3xs transition flex items-center justify-center gap-1 cursor-pointer"
                          title={isAnnullato ? 'Visualizza dettagli annullamento o ripristina pratica con password' : 'Gestisci stato fatturazione, protocollo RdP e pagamento'}
                        >
                          {isAnnullato ? <RotateCcw className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                          <span>{isAnnullato ? 'Gestisci / Ripristina' : 'Firma & Gestisci'}</span>
                        </button>
                        {!isAnnullato && (
                          <button
                            type="button"
                            onClick={() => openEditModal(p, 'Annullato')}
                            className="p-1 px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-2xs font-extrabold transition flex items-center justify-center gap-1 cursor-pointer"
                            title="Annulla questa pratica di fatturazione (richiede password operatore e motivazione ISO 17025)"
                          >
                            <Ban className="h-2.5 w-2.5" />
                            <span>Annulla</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {sortedPratiche.length === 0 && (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400 font-semibold italic text-xs">
                    Nessuna pratica contabile corrisponde ai filtri di ricerca selezionati.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Change Status Modal & Validation PIN */}
      <AnimatePresence>
        {editingPraticaId && (() => {
          const matchingPratica = pratiche.find(p => p.id === editingPraticaId);
          if (!matchingPratica) return null;

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 text-slate-700"
              >
                {/* Modal Header */}
                <div className="p-4 bg-slate-950 text-white flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-2">
                    <BadgeEuro className="h-5 w-5 text-indigo-400 block shrink-0" />
                    <div>
                      <h3 className="font-extrabold text-sm uppercase tracking-wider">Gestione Stato Pratica</h3>
                      <p className="text-[10px] text-slate-400 font-mono">Campione: {matchingPratica.numeroCampione}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setEditingPraticaId(null)}
                    className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer border-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4 text-xs text-left max-h-[82vh] overflow-y-auto">
                  {/* Current info */}
                  {(() => {
                    const modalCf = getCodiceFiscale(matchingPratica);
                    const modalMatchedPrev = preventivi?.find(
                      prev => prev.codice.trim().toLowerCase() === (matchingPratica.numeroPreventivo || '').trim().toLowerCase() || prev.id === matchingPratica.numeroPreventivo
                    );
                    return (
                      <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] leading-relaxed space-y-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-slate-600">Cliente pagatore: <strong className="text-slate-900 font-extrabold">{matchingPratica.nomeCliente}</strong></p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              P.IVA: <span className="font-bold text-slate-700">{matchingPratica.partitaIva || 'N/D'}</span>
                              {modalCf && <> &bull; C.F.: <span className="font-bold text-slate-700">{modalCf}</span></>}
                            </p>
                          </div>
                          {matchingPratica.numeroPreventivo && matchingPratica.numeroPreventivo !== '-' && matchingPratica.numeroPreventivo !== 'Senza Preventivo' && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPraticaId(null);
                                if (modalMatchedPrev) {
                                  onViewPreventivo?.(modalMatchedPrev.id);
                                } else if (onViewPreventivo) {
                                  onViewPreventivo(matchingPratica.numeroPreventivo);
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10.5px] font-bold font-mono transition"
                              title="Vai al preventivo"
                            >
                              <FileText className="h-3 w-3 text-indigo-500" />
                              <span>{matchingPratica.numeroPreventivo}</span>
                              <ExternalLink className="h-2.5 w-2.5 opacity-70" />
                            </button>
                          )}
                        </div>
                        <div className="pt-2 border-t border-slate-200 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                              Importo Netto Imponibile (€):
                            </label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                disabled={selectedStatus === 'Annullato'}
                                value={editingImporto}
                                onChange={(e) => setEditingImporto(e.target.value)}
                                className="w-28 bg-white disabled:bg-slate-100 border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-black text-slate-900 text-right focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              {selectedStatus !== 'Annullato' && modalMatchedPrev && Math.abs((parseFloat(editingImporto.replace(',', '.')) || 0) - modalMatchedPrev.totale) > 0.01 && (
                                <button
                                  type="button"
                                  onClick={() => setEditingImporto(modalMatchedPrev.totale.toFixed(2))}
                                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition cursor-pointer"
                                  title={`Imposta il totale netto del preventivo ${modalMatchedPrev.codice}`}
                                >
                                  🔄 Usa Netto Prev. (€ {modalMatchedPrev.totale.toFixed(2)})
                                </button>
                              )}
                            </div>
                          </div>
                          {(() => {
                            const previewNetto = parseFloat(editingImporto.replace(',', '.')) || 0;
                            return (
                              <div className="flex justify-between items-center text-[10.5px] font-mono bg-white p-2 rounded-lg border border-slate-200">
                                <span className={`text-slate-600 ${selectedStatus === 'Annullato' ? 'line-through opacity-60' : ''}`}>
                                  Netto: <strong className="text-slate-900">€ {previewNetto.toFixed(2)}</strong>
                                </span>
                                <span className={`text-indigo-700 font-semibold ${selectedStatus === 'Annullato' ? 'line-through opacity-60' : ''}`}>
                                  + IVA (22%): € {(previewNetto * 0.22).toFixed(2)}
                                </span>
                                <span className={`text-slate-900 font-bold bg-slate-200/60 px-1.5 py-0.5 rounded ${selectedStatus === 'Annullato' ? 'line-through opacity-60' : ''}`}>
                                  Tot: € {(previewNetto * 1.22).toFixed(2)}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Box Storico Annullamento / Storno (se la pratica risulta Annullata o ha una fattura stornata) */}
                  {(matchingPratica.statoFatturazione === 'Annullato' || matchingPratica.fatturaPrecedenteAnnullata) && (
                    <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-[10.5px] text-rose-900 space-y-1">
                      <div className="font-black uppercase text-[9px] tracking-wider flex items-center gap-1.5 text-rose-800">
                        <Ban className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <span>Tracciabilità Annullamento / Storno (ISO/IEC 17025 §7.5.2)</span>
                      </div>
                      {matchingPratica.operatoreAnnullamento && (
                        <div>
                          Operatore: <strong>{matchingPratica.operatoreAnnullamento}</strong>
                          {matchingPratica.dataAnnullamento ? ` (${matchingPratica.dataAnnullamento})` : ''}
                        </div>
                      )}
                      {matchingPratica.fatturaPrecedenteAnnullata && (
                        <div>
                          Fattura stornata: <strong className="font-mono">{matchingPratica.fatturaPrecedenteAnnullata}</strong>
                        </div>
                      )}
                      {matchingPratica.motivoAnnullamento && (
                        <div>
                          Motivazione: <strong className="italic">{matchingPratica.motivoAnnullamento}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Select status input */}
                  <div className="space-y-1.5">
                    <label className="block font-black text-slate-500 uppercase text-[9px] tracking-widest">
                      Seleziona Nuovo Stato di Fatturazione:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          val: 'Da fatturare',
                          label: matchingPratica.statoFatturazione === 'Fatturato' ? '⏳ Storna (Da fatt.)' : '⏳ Da fatturare',
                          activeClass: 'bg-indigo-500 text-white border-indigo-500 shadow-md'
                        },
                        {
                          val: 'Fatturato',
                          label: '✅ Fatturato',
                          activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        },
                        {
                          val: 'Annullato',
                          label: '🚫 Annullato',
                          activeClass: 'bg-rose-600 text-white border-rose-600 shadow-md'
                        }
                      ].map(st => (
                        <button
                          key={st.val}
                          type="button"
                          onClick={() => {
                            setSelectedStatus(st.val as any);
                            setModalError(null);
                          }}
                          className={`p-2.5 rounded-xl border text-center font-bold tracking-wide text-[11px] transition cursor-pointer ${
                            selectedStatus === st.val
                              ? st.activeClass
                              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Absolute conditional inputs for Invoice number and invoice date */}
                  <AnimatePresence>
                    {selectedStatus === 'Fatturato' && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-3 pt-1 border-t border-slate-100 mt-2"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="block font-black text-slate-500 uppercase text-[8.5px] tracking-wider">
                              Numero Fattura (*):
                            </label>
                            <input
                              type="text"
                              value={invoiceNumber}
                              onChange={(e) => setInvoiceNumber(e.target.value)}
                              placeholder="Es: FT-2026-0099"
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-950 text-slate-800"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block font-black text-slate-500 uppercase text-[8.5px] tracking-wider">
                              Data Fattura (*):
                            </label>
                            <input
                              type="date"
                              value={invoiceDate}
                              onChange={(e) => setInvoiceDate(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-slate-950 text-slate-800"
                              required
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Sezione Protocollo & Data Invio RdP */}
                  <div className="space-y-2 p-3 bg-blue-50/50 border border-blue-150 rounded-xl">
                    <span className="block font-black text-blue-900 uppercase text-[8.5px] tracking-widest flex items-center gap-1">
                      📩 Rapporto di Prova (RdP) Inviato al Cliente:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wide">
                          N° Protocollo RdP:
                        </label>
                        <input
                          type="text"
                          value={rdpProtocolNumber}
                          onChange={(e) => setRdpProtocolNumber(e.target.value)}
                          placeholder="es. RdP-2025/001"
                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-wide">
                          Data Invio RdP:
                        </label>
                        <input
                          type="date"
                          value={rdpSendDate}
                          onChange={(e) => setRdpSendDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stato Pagamento form inside Modal (nascosto se Annullato) */}
                  {selectedStatus !== 'Annullato' && (
                    <div className="space-y-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="block font-black text-slate-600 uppercase text-[8.5px] tracking-widest flex items-center gap-1">
                          💳 Avvenuto Pagamento / Saldo:
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsPaid(!isPaid)}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition cursor-pointer shrink-0 focus:outline-none ${
                            isPaid 
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs' 
                              : 'bg-white border-slate-300 text-transparent'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </button>
                      </div>

                      {isPaid && (
                        <div className="space-y-1 mt-1 animate-fadeIn">
                          <label className="block text-[8px] font-black text-slate-500 uppercase tracking-wide">
                            Data di Pagamento:
                          </label>
                          <input
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-800 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Note */}
                  <div className="space-y-1">
                    <label className="block font-black text-slate-500 uppercase text-[9px] tracking-widest">
                      Note Addizionali:
                    </label>
                    <textarea
                      value={customNote}
                      onChange={(e) => setCustomNote(e.target.value)}
                      placeholder="Commenti, estremi bollo, sconti ecc..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-950 text-slate-800 h-14 resize-none"
                    />
                  </div>

                  {/* Selected Operator (signature annotation) */}
                  <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="block font-black text-slate-600 uppercase text-[8.5px] tracking-widest flex items-center gap-1">
                      Operatore Firmatario
                    </span>
                    <select
                      value={selectedOperator}
                      onChange={(e) => {
                        setSelectedOperator(e.target.value);
                        setModalError(null);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[10.5px] font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950"
                    >
                      {operators.filter(op => op.attivo !== false).map(op => (
                        <option key={op.nome} value={op.nome}>{op.nome} ({getOperatorQualificationLabel(op)})</option>
                      ))}
                    </select>
                  </div>

                  {/* Blocco Convalida con Password & Motivazione (ISO/IEC 17025 §7.5.2 / §8.4) per Annullamento, Storno o Ripristino */}
                  {(() => {
                    const isCancelling = selectedStatus === 'Annullato' && matchingPratica.statoFatturazione !== 'Annullato';
                    const isStornoFattura = matchingPratica.statoFatturazione === 'Fatturato' && selectedStatus === 'Da fatturare';
                    const isRestoringCancelled = matchingPratica.statoFatturazione === 'Annullato' && selectedStatus !== 'Annullato';
                    const requiresAuth = isCancelling || isStornoFattura || isRestoringCancelled;
                    if (!requiresAuth) return null;

                    return (
                      <div className="p-3.5 bg-rose-50/80 border-2 border-rose-200 rounded-xl space-y-2.5 animate-fadeIn">
                        <div className="flex items-start gap-2">
                          <Lock className="h-4 w-4 text-rose-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="block font-black text-rose-900 uppercase text-[9px] tracking-wider">
                              {isCancelling
                                ? '🔐 Autorizzazione Annullamento Pratica (ISO/IEC 17025 §7.5.2)'
                                : isStornoFattura
                                ? '🔐 Autorizzazione Storno Fattura (ISO/IEC 17025 §7.5.2)'
                                : '🔐 Autorizzazione Ripristino Pratica Annullata'}
                            </span>
                            <p className="text-[10px] text-rose-800 leading-snug mt-0.5">
                              {isCancelling
                                ? "La pratica non verrà eliminata dal database ma contrassegnata come Annullata ed esclusa da tutti i totali contabili, conservando traccia nell'Audit Log."
                                : isStornoFattura
                                ? "Il numero e la data della fattura attuale verranno stornati per consentire una nuova fatturazione, conservando traccia nell'Audit Log."
                                : "La pratica tornerà attiva nei conteggi contabili con registrazione nell'Audit Log."}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block font-black text-rose-900 uppercase text-[8.5px] tracking-wider">
                            Motivazione Obbligatoria (*):
                          </label>
                          <textarea
                            value={cancelReason}
                            onChange={(e) => {
                              setCancelReason(e.target.value);
                              setModalError(null);
                            }}
                            placeholder="Es: Emissione Nota di Credito n. NC-2026-04 / Errore imputazione fattura / Incarico annullato dal cliente..."
                            className="w-full bg-white border border-rose-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-600 h-16 resize-none"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block font-black text-rose-900 uppercase text-[8.5px] tracking-wider">
                            Password Personale Operatore ({selectedOperator}) (*):
                          </label>
                          <input
                            type="password"
                            value={operatorPIN}
                            onChange={(e) => {
                              setOperatorPIN(e.target.value);
                              setModalError(null);
                            }}
                            placeholder="Digita la password dell'operatore per confermare..."
                            className="w-full bg-white border border-rose-300 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-600"
                            required
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {modalError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[10.5px] font-semibold text-rose-700 animate-fadeIn leading-relaxed">
                      ⚠️ {modalError}
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPraticaId(null)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-100 transition cursor-pointer text-center"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={confirmStatusChange}
                    className={`flex-1 py-2 rounded-xl text-white font-bold transition shadow-md cursor-pointer text-center ${
                      selectedStatus === 'Annullato' && matchingPratica.statoFatturazione !== 'Annullato'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-indigo-400 hover:bg-indigo-500'
                    }`}
                  >
                    {selectedStatus === 'Annullato' && matchingPratica.statoFatturazione !== 'Annullato'
                      ? '🚫 Firma e Annulla Pratica'
                      : matchingPratica.statoFatturazione === 'Fatturato' && selectedStatus === 'Da fatturare'
                      ? '🔄 Firma e Storna Fattura'
                      : 'Registra e Firma'}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
      </div>

      {/* MODALE DI ANTEPRIMA A SCHERMO DEL REPORT DI STAMPA FATTURAZIONE */}
      {showReportPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 sm:p-6 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-xs">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base tracking-wide uppercase">Anteprima Report PDF — Registro Fatturazione</h3>
                  <p className="text-[11px] text-slate-400">Visualizzazione esatta del layout generato per la stampa o l&apos;esportazione PDF</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => executePrintSheet('fatturazione-print-content', `Report_Fatturazione_${new Date().toISOString().split('T')[0]}`)}
                  className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-black px-4 py-2 rounded-xl flex items-center gap-2 transition shadow cursor-pointer"
                >
                  <Printer className="h-4 w-4" /> Stampa PDF / Esporta
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportPreviewModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-2 rounded-xl transition cursor-pointer"
                  title="Chiudi anteprima"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body (Exact Print View Render) */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-slate-100">
              <div className="bg-white shadow-lg border border-slate-300 max-w-5xl mx-auto p-6 rounded-sm">
                {reportPrintViewContent}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500 shrink-0">
              <span>Suggerimento: Nella finestra di stampa del browser seleziona "Salva come PDF" e orientamento "Orizzontale" per il miglior layout.</span>
              <button
                type="button"
                onClick={() => setShowReportPreviewModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition cursor-pointer"
              >
                Chiudi Anteprima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DI RICONCILIAZIONE AUTOMATICA FATTURE XML DA GOOGLE DRIVE */}
      <GoogleDriveXmlReconciliationModal
        isOpen={showGoogleDriveReconcileModal}
        onClose={() => setShowGoogleDriveReconcileModal(false)}
        pratiche={pratiche}
        onUpdatePratiche={onUpdatePratiche}
        clients={clients}
        operators={operators}
        selectedOperator={selectedOperator}
        addAuditLogEntry={addAuditLogEntry}
      />
    </div>
  );
}
