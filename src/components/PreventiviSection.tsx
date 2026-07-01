import React, { useState } from 'react';
import { Preventivo, Pacchetto, Client, Prova, Operator, LimiteRiferimento } from '../types';
import { Plus, Search, FileText, CheckCircle2, XCircle, Clock, ShoppingBag, Trash2, Tag, Calendar, ChevronRight, Calculator, Download, Pencil, Eye, EyeOff, ChevronUp, ChevronDown, Printer, X, Settings, FolderPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const getDaysOfValidity = (validita?: string): number => {
  if (!validita) return 90; // default to 90
  const match = validita.match(/\d+/);
  if (match) {
    return parseInt(match[0], 10);
  }
  return 90; // default if not found
};

const formatDateItalianFullMonth = (dateStr: string): string => {
  if (!dateStr) return '';
  
  // Rimuovi eventuale orario o fusi orari (es. T00:00:00+00:00 o fusi orari con spazio)
  const cleanDateStr = dateStr.split('T')[0].split(' ')[0].trim();
  
  // Gestione formato YYYY-MM-DD
  const dateParts = cleanDateStr.split('-');
  if (dateParts.length !== 3) {
    // Gestione formato DD/MM/YYYY
    const slashesParts = cleanDateStr.split('/');
    if (slashesParts.length === 3) {
      const day = parseInt(slashesParts[0], 10);
      const month = parseInt(slashesParts[1], 10);
      const year = parseInt(slashesParts[2], 10);
      
      const months = [
        'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
      ];
      
      if (month >= 1 && month <= 12 && !isNaN(day) && !isNaN(year)) {
        return `${day} ${months[month - 1]} ${year}`;
      }
    }
    
    // Fallback generico: rimuovi semplicemente il suffisso temporale dopo la T
    return dateStr.split('T')[0];
  }
  
  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10);
  const day = parseInt(dateParts[2], 10);
  
  const months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  
  if (month >= 1 && month <= 12 && !isNaN(day) && !isNaN(year)) {
    return `${day} ${months[month - 1]} ${year}`;
  }
  
  return cleanDateStr;
};

const getOfferValidityStatus = (dataCreazione: string, validita?: string) => {
  if (!dataCreazione) return { expired: false, daysLeft: 0, text: 'N/A', scadenzaFormattata: '' };
  
  const dateParts = dataCreazione.split('-');
  if (dateParts.length !== 3) return { expired: false, daysLeft: 0, text: 'N/A', scadenzaFormattata: '' };
  
  const emissione = new Date(
    parseInt(dateParts[0], 10),
    parseInt(dateParts[1], 10) - 1,
    parseInt(dateParts[2], 10)
  );
  
  if (isNaN(emissione.getTime())) {
    return { expired: false, daysLeft: 0, text: 'N/A', scadenzaFormattata: '' };
  }
  
  const daysOfValidity = getDaysOfValidity(validita);
  
  const scadenza = new Date(emissione.getTime());
  scadenza.setDate(scadenza.getDate() + daysOfValidity);
  
  const tempToday = new Date();
  const today = new Date(tempToday.getFullYear(), tempToday.getMonth(), tempToday.getDate());
  
  // Calculate difference in milliseconds
  const diffTime = scadenza.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const formattedScadenza = scadenza.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  
  if (diffDays < 0) {
    return {
      expired: true,
      daysLeft: Math.abs(diffDays),
      text: `Scaduta da ${Math.abs(diffDays)} gg (${formattedScadenza})`,
      scadenzaFormattata: formattedScadenza
    };
  } else if (diffDays === 0) {
    return {
      expired: false,
      isToday: true,
      daysLeft: 0,
      text: `Scade Oggi! (${formattedScadenza})`,
      scadenzaFormattata: formattedScadenza
    };
  } else {
    return {
      expired: false,
      daysLeft: diffDays,
      text: `Valido ancora ${diffDays} gg (${formattedScadenza})`,
      scadenzaFormattata: formattedScadenza
    };
  }
};

interface PreventiviSectionProps {
  preventivi: Preventivo[];
  pacchetti: Pacchetto[];
  clients: Client[];
  prove: Prova[];
  onAddPreventivo: (newPrev: Preventivo) => void;
  onAddPacchetto: (newPack: Pacchetto) => void;
  onUpdatePacchetto: (updatedPack: Pacchetto) => void;
  onDeletePreventivo: (id: string) => void;
  onDeletePacchetto: (id: string) => void;
  onGoToProva?: (id: string) => void;
  operators?: Operator[];
  selectedPreventivoId?: string | null;
  onClearSelectedPreventivo?: () => void;
  printOnlyId?: string | null;
}

export function PreventiviSection({
  preventivi,
  pacchetti,
  clients,
  prove,
  onAddPreventivo,
  onAddPacchetto,
  onUpdatePacchetto,
  onDeletePreventivo,
  onDeletePacchetto,
  onGoToProva,
  operators,
  selectedPreventivoId,
  onClearSelectedPreventivo,
  printOnlyId
}: PreventiviSectionProps) {
  const [activeTab, setActiveTab] = useState<'preventivi' | 'pacchetti' | 'condizioni'>('preventivi');
  const [showAddQuote, setShowAddQuote] = useState(false);
  const [showAddPackage, setShowAddPackage] = useState(false);

  const filterActiveConditions = (p: Preventivo) => {
    return [
      { key: 'pagamento', label: "Condizioni di Pagamento", text: p.modalitaCondizioni, defaultId: 1 },
      { key: 'campionamento', label: "Metodo di Campionamento", text: p.metodoCampionamento, defaultId: 2 },
      { key: 'quantita', label: "Quantità Minima Campione", text: p.quantitaCampione, defaultId: 3 },
      { key: 'tempo', label: "Tempi di Consegna Risultati", text: p.tempoConsegna, defaultId: 4 },
      { key: 'materiali', label: "Materiali di Campionamento", text: p.materialiCampionamento, defaultId: 5 },
      { key: 'invio', label: "Modalità Invio Rapporto", text: p.modalitaInvioRapporto, defaultId: 6 },
      { key: 'subappalto', label: "Luogo Esecuzione / Subappalto", text: p.provaSubappaltata, defaultId: 7 },
      { key: 'accredia', label: "Qualità e Note ACCREDIA", text: p.noteQualitaAccredia, defaultId: 'Q', isBadge: true, bg: 'bg-amber-50 text-amber-850' },
      { key: 'accettazione', label: "Note di Accettazione Campione", text: p.noteAccettazione, defaultId: 8 },
      { key: 'outro', label: "Altre Clausole e Note", text: p.altroCondizioni || (p as any).outro || (p as any).altro, defaultId: 9 },
      { key: 'note', label: "Note Specifiche", text: p.note, defaultId: 'N', isBadge: true, bg: 'bg-indigo-50 text-indigo-850' }
    ].filter(item => item.text && item.text.trim() !== '');
  };

  // States per Tracciabilità Cambio Stato Preventivo
  const [tracingQuoteStatusId, setTracingQuoteStatusId] = useState<string | null>(null);
  const [tracingSelectedStatus, setTracingSelectedStatus] = useState<'In Approvazione' | 'Approvato' | 'Rifiutato' | 'Scaduto'>('In Approvazione');
  const [tracingOperator, setTracingOperator] = useState<string>(() => {
    return operators && operators.length > 0 ? operators[0].nome : 'Dott. Chim. F. Lupo';
  });
  const [tracingCustomOperator, setTracingCustomOperator] = useState<string>('');
  const [tracingPassword, setTracingPassword] = useState<string>('');
  const [tracingError, setTracingError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    title: string;
    desc?: string;
    action: () => void;
  } | null>(null);

  // Mappa delle password degli operatori del laboratorio (dinamica o fallback)
  const OPERATOR_PASSWORDS: Record<string, string> = {};
  if (operators && operators.length > 0) {
    operators.forEach(op => {
      OPERATOR_PASSWORDS[op.nome] = op.password;
    });
  } else {
    OPERATOR_PASSWORDS['Dott. Chim. F. Lupo'] = 'lupo123';
    OPERATOR_PASSWORDS['Dott.ssa S. Bianchi'] = 'bianchi123';
    OPERATOR_PASSWORDS['Dott. R. Vitale'] = 'vitale123';
  }
  OPERATOR_PASSWORDS['Altro'] = 'lims123';

  // States per NUOVO PACCHETTO
  const [packageName, setPackageName] = useState('');
  const [packageDesc, setPackageDesc] = useState('');
  const [packageCategory, setPackageCategory] = useState('Oli e Grassi');
  const [selectedPackProve, setSelectedPackProve] = useState<string[]>([]);
  const [packagePrice, setPackagePrice] = useState('');
  const [editingPacchetto, setEditingPacchetto] = useState<Pacchetto | null>(null);

  // States per SALVA PREVENTIVO COME PACCHETTO
  const [saveAsPackageQuote, setSaveAsPackageQuote] = useState<Preventivo | null>(null);
  const [newPackageName, setNewPackageName] = useState('');
  const [newPackageDesc, setNewPackageDesc] = useState('');
  const [newPackageCategory, setNewPackageCategory] = useState('Oli e Grassi');
  const [newPackagePrice, setNewPackagePrice] = useState<number | string>('');

  // States per NUOVO/MODIFICATO PREVENTIVO
  const [editingPreventivo, setEditingPreventivo] = useState<Preventivo | null>(null);
  const [nascondiPrezziSingoli, setNascondiPrezziSingoli] = useState<boolean>(false);
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [printPreviewQuote, setPrintPreviewQuote] = useState<Preventivo | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      if (printPreviewQuote) {
        const prevTitle = document.title;
        document.title = " ";
        return () => {
          document.title = prevTitle;
        };
      }
    }
  }, [printPreviewQuote]);

  React.useEffect(() => {
    if (selectedPreventivoId) {
      setActiveTab('preventivi');
      setShowAddQuote(false);
      setExpandedQuoteId(selectedPreventivoId);
      
      const timer = setTimeout(() => {
        const el = document.getElementById(`quote-row-${selectedPreventivoId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 250);

      return () => clearTimeout(timer);
    }
  }, [selectedPreventivoId]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const printQuoteId = params.get('printQuoteId');
      if (printQuoteId && preventivi && preventivi.length > 0) {
        const found = preventivi.find(p => p.id === printQuoteId);
        if (found) {
          setPrintPreviewQuote(found);
          try {
            const newUrl = window.location.pathname + window.location.hash;
            window.history.replaceState({}, '', newUrl);
          } catch (e) {
            console.error(e);
          }
          const printTimer = setTimeout(() => {
            window.focus();
            window.print();
          }, 800);
          return () => clearTimeout(printTimer);
        }
      }
    }
  }, [preventivi]);

  const [quoteClienteId, setQuoteClienteId] = useState(clients[0]?.id || '');
  const [clientSearchText, setClientSearchText] = useState(() => {
    const firstClient = clients[0];
    return firstClient ? firstClient.denominazione : '';
  });
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteQualityNote, setQuoteQualityNote] = useState('');
  const [quoteDiscount, setQuoteDiscount] = useState<number>(0);
  const [quoteCategoryFilter, setQuoteCategoryFilter] = useState<string>('Tutte');
  const [quoteSearchTerm, setQuoteSearchTerm] = useState<string>('');

  // Filtri e Ricerche per l'Archivio Storico Preventivi (Richiesta Utente)
  const [prevSearchQuery, setPrevSearchQuery] = useState<string>('');
  const [prevStatusFilter, setPrevStatusFilter] = useState<string>('Tutti');
  const [prevValidityFilter, setPrevValidityFilter] = useState<string>('Tutti');
  const [prevSortBy, setPrevSortBy] = useState<string>('data-desc');
  const [prevDateFrom, setPrevDateFrom] = useState<string>('');
  const [prevDateTo, setPrevDateTo] = useState<string>('');

  // Modelli di Note Predefinite con salvataggio persistente (Richiesta Utente)
  const [presetNotesTemplates, setPresetNotesTemplates] = useState<string[]>(() => {
    const saved = localStorage.getItem('lab_preset_notes_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (err) {
        // ignore
      }
    }
    return [
      '(*) Prova non accreditata da ACCREDIA',
      '(**) Prova effettuata presso "nome laboratorio", numero accreditamento'
    ];
  });

  // Salva automaticamente le note predefinite in localStorage quando cambiano
  React.useEffect(() => {
    localStorage.setItem('lab_preset_notes_templates', JSON.stringify(presetNotesTemplates));
  }, [presetNotesTemplates]);

  // Stati ausiliari per la gestione in-situ dei template note
  const [newPresetNoteText, setNewPresetNoteText] = useState('');
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [showPresetNotesDropdown, setShowPresetNotesDropdown] = useState(false);

  // Custom Form Title, Privacy and Contract Options
  // Master defaults for Contract Conditions (persisted)
  const [defaultContractModelName, setDefaultContractModelName] = useState(() => {
    return localStorage.getItem('lab_default_contract_model_name') || 'Allegato 1 CONDIZIONI GENERALI - PG 69 Rev. 19 del 18/09/2024';
  });

  const [defaultContractText, setDefaultContractText] = useState(() => {
    return localStorage.getItem('lab_default_contract_text') || (
      '1. ACCETTAZIONE DEL MANDATO: L\'esecuzione delle prove richieste è subordinata all\'accettazione formale del presente preventivo da parte del Cliente tramite timbro, firma e restituzione dello stesso.\n' +
      '2. LIMITAZIONE DI RESPONSABILITÀ: La responsabilità civile del Laboratorio nei confronti del Cliente per risarcimento danni di qualunque genere derivanti da negligenza o inadempienza è espressamente limitata a una somma massima non superiore all\'importo fatturato per la specifica prova o determinazione analitica che ha generato il danno.\n' +
      '3. CONSERVAZIONE DEI CAMPIONI: I residui dei campioni analizzati saranno conservati presso i nostri laboratori per un periodo massimo di 30 giorni consecutivi a partire dalla data di emissione del relativo Rapporto di Prova, trascorsi i quali si procederà al loro smaltimento in conformità alle leggi vigenti.\n' +
      '4. RISERVATEZZA E SEGRETO PROFESSIONALE: Le parti si impegnano a mantenere la massima riservatezza sulle informazioni scambiate e sui risultati analitici, che non saranno rivelati a soggetti esterni senza preventivo consenso scritto, salvo obblighi di legge.\n' +
      '5. PAGAMENTI E FORO COMPETENTE: Il mancato pagamento nei termini concordati comporterà l\'addebito degli interessi di mora ex D.Lgs. 231/2002. Per ogni controversia è esclusivamente competente l\'Ufficio Giudiziario competente per il territorio della sede legale del Laboratorio.'
    );
  });

  const [defaultPrivacyText, setDefaultPrivacyText] = useState(() => {
    return localStorage.getItem('lab_default_privacy_text') || (
      'I dati personali forniti dal Cliente verranno trattati dal Laboratorio Biochem S.r.l. esclusivamente per l\'adempimento delle prestazioni contrattuali e degli obblighi di legge. Il trattamento avviene in modo lecito, secondo correttezza e con l\'adozione di idonee misure di sicurezza. I dati non saranno ceduti a terzi, se non per adempimenti di legge o per l\'esecuzione di servizi subappaltati espressamente autorizzati. In ogni momento il Cliente potrà esercitare i diritti previsti dal Regolamento UE scrivendo all\'indirizzo e-mail del Titolare.'
    );
  });

  const [defaultIncludePrivacy, setDefaultIncludePrivacy] = useState<boolean>(() => {
    return localStorage.getItem('lab_default_include_privacy') !== 'false';
  });

  const [defaultIncludeContract, setDefaultIncludeContract] = useState<boolean>(() => {
    return localStorage.getItem('lab_default_include_contract') !== 'false';
  });

  React.useEffect(() => {
    localStorage.setItem('lab_default_include_privacy', String(defaultIncludePrivacy));
  }, [defaultIncludePrivacy]);

  React.useEffect(() => {
    localStorage.setItem('lab_default_include_contract', String(defaultIncludeContract));
  }, [defaultIncludeContract]);

  // Modelli di Titoli del Modulo Predefiniti con salvataggio persistente (Richiesta Utente)
  const [presetTitoloTemplates, setPresetTitoloTemplates] = useState<string[]>(() => {
    const saved = localStorage.getItem('lab_preset_titolo_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (err) {
        // ignore
      }
    }
    return [
      'PROPOSTA DI PREVENTIVO',
      'OFFERTA COMMERCIALE',
      'CONTRATTO DI PROVA',
      'OFFERTA DI PRESTAZIONE ANALITICA'
    ];
  });

  // Salva automaticamente i titoli predefiniti in localStorage quando cambiano
  React.useEffect(() => {
    localStorage.setItem('lab_preset_titolo_templates', JSON.stringify(presetTitoloTemplates));
  }, [presetTitoloTemplates]);

  // Stato di default del Nome del Modulo salvato (es. MOD. BIO-04 REV. 05)
  const [defaultNomeModulo, setDefaultNomeModulo] = useState(() => {
    return localStorage.getItem('lab_default_nome_modulo') || 'MOD. BIO-04 REV. 02';
  });

  const [quoteNomeModulo, setQuoteNomeModulo] = useState(defaultNomeModulo);

  // Sincronizza defaultNomeModulo in localStorage per i futuri preventivi
  React.useEffect(() => {
    localStorage.setItem('lab_default_nome_modulo', defaultNomeModulo);
  }, [defaultNomeModulo]);

  // Stato di default del Titolo del Modulo salvato
  const [defaultTitoloModulo, setDefaultTitoloModulo] = useState(() => {
    return localStorage.getItem('lab_default_titolo_modulo') || 'PROPOSTA DI PREVENTIVO';
  });

  // Sincronizza defaultTitoloModulo in localStorage per i futuri preventivi
  React.useEffect(() => {
    localStorage.setItem('lab_default_titolo_modulo', defaultTitoloModulo);
  }, [defaultTitoloModulo]);

  // Stato di default del Codice Modulo delle Condizioni Generali di Contratto
  const [defaultContractModelCode, setDefaultContractModelCode] = useState(() => {
    return localStorage.getItem('lab_default_contract_model_code') || 'PG 69 REV. 19 del 18/09/2024';
  });

  // Sincronizza defaultContractModelCode in localStorage per i futuri preventivi
  React.useEffect(() => {
    localStorage.setItem('lab_default_contract_model_code', defaultContractModelCode);
  }, [defaultContractModelCode]);

  // Stati ausiliari per la gestione in-situ dei template titolo del modulo
  const [newPresetTitoloText, setNewPresetTitoloText] = useState('');
  const [editingTitoloIndex, setEditingTitoloIndex] = useState<number | null>(null);
  const [editingTitoloText, setEditingTitoloText] = useState('');
  const [showPresetTitoloDropdown, setShowPresetTitoloDropdown] = useState(false);

  const [quoteTitoloModulo, setQuoteTitoloModulo] = useState(defaultTitoloModulo);
  const [quoteIncludePrivacy, setQuoteIncludePrivacy] = useState(defaultIncludePrivacy);
  const [quotePrivacyText, setQuotePrivacyText] = useState(defaultPrivacyText);
  const [quoteIncludeContract, setQuoteIncludeContract] = useState(defaultIncludeContract);
  const [quoteContractText, setQuoteContractText] = useState(defaultContractText);
  const [quoteContractModelName, setQuoteContractModelName] = useState(defaultContractModelName);
  const [quoteContractModelCode, setQuoteContractModelCode] = useState(defaultContractModelCode);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('lab_default_contract_model_name');
      if (!storedName || storedName === 'CONDIZIONI GENERALE DI CONTRATTO - MOD. BIO-04 REV. 02') {
        localStorage.setItem('lab_default_contract_model_name', 'Allegato 1 CONDIZIONI GENERALI - PG 69 Rev. 19 del 18/09/2024');
        setDefaultContractModelName('Allegato 1 CONDIZIONI GENERALI - PG 69 Rev. 19 del 18/09/2024');
        setQuoteContractModelName('Allegato 1 CONDIZIONI GENERALI - PG 69 Rev. 19 del 18/09/2024');
      }
      const storedCode = localStorage.getItem('lab_default_contract_model_code');
      if (!storedCode || storedCode === 'MOD. CONTR-01 REV. 01') {
        localStorage.setItem('lab_default_contract_model_code', 'PG 69 REV. 19 del 18/09/2024');
        setDefaultContractModelCode('PG 69 REV. 19 del 18/09/2024');
        setQuoteContractModelCode('PG 69 REV. 19 del 18/09/2024');
      }
    }
  }, []);

  // Configurable options state for Validity, Subject and Conditions
  const [opzioniValidita, setOpzioniValidita] = useState<string[]>([
    '30 Giorni',
    '60 Giorni',
    '90 Giorni',
    '120 Giorni'
  ]);
  const [nuovaValidita, setNuovaValidita] = useState('');
  const [quoteValidita, setQuoteValidita] = useState('90 Giorni');

  // 11 Default selections for conditions, stored in localStorage
  const [defaultQuoteOggetto, setDefaultQuoteOggetto] = useState<string>(() => {
    return localStorage.getItem('lab_default_quote_oggetto') || 'In risposta alla Vs. cortese richiesta';
  });
  const [defaultQuoteModalita, setDefaultQuoteModalita] = useState<string>(() => {
    return localStorage.getItem('lab_default_quote_modalita') || 'Pagamento: Rimessa diretta a 30 giorni data fattura fine mese.';
  });
  const [defaultQuoteCampionamento, setDefaultQuoteCampionamento] = useState<string>(() => {
    return localStorage.getItem('lab_default_quote_campionamento') || 'Campionamento a cura del Cliente.';
  });
  const [defaultQuoteQuantitaCampione, setDefaultQuoteQuantitaCampione] = useState<string>(() => {
    return localStorage.getItem('lab_default_quote_quantita_campione') || 'Quantità minima indicata per ciascuna determinazione analitica.';
  });
  const [defaultQuoteTempoConsegna, setDefaultQuoteTempoConsegna] = useState<string>(() => {
    return localStorage.getItem('lab_default_quote_tempo_consegna') || 'Entro 7-10 giorni lavorativi a decorrere dalla data di ricevimento dei campioni.';
  });
  const [defaultQuoteInvioRapporto, setDefaultQuoteInvioRapporto] = useState<string>(() => {
    return localStorage.getItem('lab_default_quote_invio_rapporto') || 'Invio del Rapporto di Prova in formato PDF firmato digitalmente a mezzo e-mail ordinaria o PEC.';
  });
  const [defaultQuoteProvaSubappaltata, setDefaultQuoteProvaSubappaltata] = useState<string>(() => {
    return localStorage.getItem('lab_default_quote_prova_subappaltata') || 'Le prove analitiche verranno interamente eseguite presso la nostra sede autorizzata.';
  });
  const [defaultQuoteNoteQualitaAccredia, setDefaultQuoteNoteQualitaAccredia] = useState<string>(() => {
    return localStorage.getItem('lab_default_quote_note_qualita_accredia') || 'Le prove analitiche contrassegnate dal simbolo (*) non sono coperte da accreditamento ACCREDIA.';
  });
  const [defaultQuoteMaterialiCampionamento, setDefaultQuoteMaterialiCampionamento] = useState<string>(() => {
    return localStorage.getItem('lab_default_quote_materiali_campionamento') || 'Contenitori sterili monouso per campionamento microbiologico forniti gratuitamente dal laboratorio Biochem.';
  });
  const [defaultQuoteNoteAccettazione, setDefaultQuoteNoteAccettazione] = useState<string>(() => {
    return localStorage.getItem('lab_default_quote_note_accettazione') || 'I campioni vengono accettati dal lunedì al giovedì dalle ore 9:00 alle ore 16:00.';
  });
  const [defaultQuoteAltro, setDefaultQuoteAltro] = useState<string>(() => {
    return localStorage.getItem('lab_default_quote_altro') || 'Nessuna dicitura o condizione aggiuntiva concordata.';
  });

  const [opzioniOggetto, setOpzioniOggetto] = useState<string[]>([
    'In risposta alla Vs. cortese richiesta',
    'Offerta per esecuzione di prove analitiche e microbiologiche',
    'Proposta commerciale per pacchetto analitico forfettario',
    'Controllo qualità periodico ed autocontrollo'
  ]);
  const [nuovOggetto, setNuovOggetto] = useState('');
  const [quoteOggetto, setQuoteOggetto] = useState<string>(defaultQuoteOggetto);

  const [opzioniModalita, setOpzioniModalita] = useState<string[]>([
    'Pagamento: Rimessa diretta a 30 giorni data fattura fine mese.',
    'Pagamento: Bonifico bancario 30 gg. D.F.F.M.',
    'Pagamento: Bonifico bancario all\'ordine (anticipato).',
    'Pagamento: Rimessa diretta a presentazione fattura.'
  ]);
  const [nuovaModalita, setNuovaModalita] = useState('');
  const [quoteModalita, setQuoteModalita] = useState<string>(defaultQuoteModalita);

  // 1. METODO DI CAMPIONAMENTO
  const [opzioniCampionamento, setOpzioniCampionamento] = useState<string[]>([
    'Campionamento a cura del Cliente.',
    'Campionamento a cura dei tecnici del Laboratorio secondo metodiche interne conformi a standard ISO.',
    'Campionamento programmato a cura del laboratorio Biochem Analytical su appuntamento.'
  ]);
  const [nuovoCampionamento, setNuovoCampionamento] = useState('');
  const [quoteCampionamento, setQuoteCampionamento] = useState<string>(defaultQuoteCampionamento);

  // 2. QUANTITÀ DI CAMPIONE
  const [opzioniQuantitaCampione, setOpzioniQuantitaCampione] = useState<string[]>([
    'Quantità minima indicata per ciascuna determinazione analitica.',
    'Almeno 1 Litro in idoneo contenitore sterile monouso (plastica o vetro).',
    'Almeno 500g in busta ermetica pulita per campionamento solidi/alimenti.'
  ]);
  const [nuovaQuantitaCampione, setNuovaQuantitaCampione] = useState('');
  const [quoteQuantitaCampione, setQuoteQuantitaCampione] = useState<string>(defaultQuoteQuantitaCampione);

  // 3. TEMPO DI CONSEGNA RISULTATI
  const [opzioniTempoConsegna, setOpzioniTempoConsegna] = useState<string[]>([
    'Entro 7-10 giorni lavorativi a decorrere dalla data di ricevimento dei campioni.',
    'Entro 3-5 giorni lavorativi (servizio rapido urgente previa validazione tecnica).',
    'Entro 15 giorni lavorativi dalla data ufficiale di accettazione del campione.'
  ]);
  const [nuovoTempoConsegna, setNuovoTempoConsegna] = useState('');
  const [quoteTempoConsegna, setQuoteTempoConsegna] = useState<string>(defaultQuoteTempoConsegna);

  // 4. MODALITÀ INVIO RAPPORTO DI PROVA
  const [opzioniInvioRapporto, setOpzioniInvioRapporto] = useState<string[]>([
    'Invio del Rapporto di Prova in formato PDF firmato digitalmente a mezzo e-mail ordinaria o PEC.',
    'Pubblicazione diretta sul Portale Web Clienti del Laboratorio Biochem.',
    'Ritiro della copia cartacea stampata del Rapporto di Prova presso la segreteria.'
  ]);
  const [nuovoInvioRapporto, setNuovoInvioRapporto] = useState('');
  const [quoteInvioRapporto, setQuoteInvioRapporto] = useState<string>(defaultQuoteInvioRapporto);

  // 5. PROVA EFFETTUATA PRESSO ALTRO LABORATORIO
  const [opzioniProvaSubappaltata, setOpzioniProvaSubappaltata] = useState<string[]>([
    'Le prove analitiche verranno interamente eseguite presso la nostra sede autorizzata.',
    'Qualora necessario, alcune determinazioni speciali potranno essere subappaltate a laboratori esterni qualificati Biochem.',
    'Subappalto a laboratori esterni accreditati ACCREDIA secondo necessità analitica, chiaramente identificati all\'interno del Rapporto di Prova.'
  ]);
  const [nuovoProvaSubappaltata, setNuovoProvaSubappaltata] = useState('');
  const [quoteProvaSubappaltata, setQuoteProvaSubappaltata] = useState<string>(defaultQuoteProvaSubappaltata);

  // 10. NOTE DI QUALITÀ ACCREDIA
  const [opzioniNoteQualitaAccredia, setOpzioniNoteQualitaAccredia] = useState<string[]>(() => {
    const saved = localStorage.getItem('lab_opzioni_qualita_accredia');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      'Le prove analitiche contrassegnate dal simbolo (*) non sono coperte da accreditamento ACCREDIA.',
      'Le analisi sono eseguite in conformità ai requisiti gestionali e tecnici della norma UNI EN ISO/IEC 17025.',
      'L\'accreditamento ACCREDIA si riferisce unicamente alle prove indicate ed attesta la competenza tecnica del laboratorio.'
    ];
  });
  const [nuovaNoteQualitaAccredia, setNuovaNoteQualitaAccredia] = useState('');
  const [quoteNoteQualitaAccredia, setQuoteNoteQualitaAccredia] = useState<string>(defaultQuoteNoteQualitaAccredia);

  React.useEffect(() => {
    localStorage.setItem('lab_opzioni_qualita_accredia', JSON.stringify(opzioniNoteQualitaAccredia));
  }, [opzioniNoteQualitaAccredia]);

  // 11. MATERIALI FORNITI PER IL CAMPIONAMENTO
  const [opzioniMaterialiCampionamento, setOpzioniMaterialiCampionamento] = useState<string[]>(() => {
    const saved = localStorage.getItem('lab_opzioni_materiali_campionamento');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      'Contenitori sterili monouso per campionamento microbiologico forniti gratuitamente dal laboratorio Biochem.',
      'Flaconi in vetro scuro con idoneo conservante chimico forniti dal laboratorio su richiesta del cliente.',
      'Nessun materiale fornito; campionamento eseguito autonomamente dal cliente con materiale idoneo proprio.'
    ];
  });
  const [nuovaMaterialiCampionamento, setNuovaMaterialiCampionamento] = useState('');
  const [quoteMaterialiCampionamento, setQuoteMaterialiCampionamento] = useState<string>(defaultQuoteMaterialiCampionamento);

  React.useEffect(() => {
    localStorage.setItem('lab_opzioni_materiali_campionamento', JSON.stringify(opzioniMaterialiCampionamento));
  }, [opzioniMaterialiCampionamento]);

  // 12. NOTE PER L'ACCETTAZIONE
  const [opzioniNoteAccettazione, setOpzioniNoteAccettazione] = useState<string[]>(() => {
    const saved = localStorage.getItem('lab_opzioni_note_accettazione');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      'I campioni vengono accettati dal lunedì al giovedì dalle ore 9:00 alle ore 16:00.',
      'All\'atto della consegna, il campione deve essere accompagnato dalla Richiesta di Prova debitamente compilata.',
      'I campioni deperibili devono pervenire in regime di refrigerazione controllata (tra +2°C e +8°C).'
    ];
  });
  const [nuovaNoteAccettazione, setNuovaNoteAccettazione] = useState('');
  const [quoteNoteAccettazione, setQuoteNoteAccettazione] = useState<string>(defaultQuoteNoteAccettazione);

  React.useEffect(() => {
    localStorage.setItem('lab_opzioni_note_accettazione', JSON.stringify(opzioniNoteAccettazione));
  }, [opzioniNoteAccettazione]);

  // 13. ALTRO
  const [opzioniAltro, setOpzioniAltro] = useState<string[]>(() => {
    const saved = localStorage.getItem('lab_opzioni_altro_condizioni');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      'Per qualsiasi contestazione in merito ai risultati, contattare la Direzione Tecnica entro 10 giorni dall\'emissione del RdP.',
      'I Rapporti di Prova originali sono conservati in archivio digitale sicuro per un periodo minimo di 10 anni.',
      'Nessuna dicitura o condizione aggiuntiva concordata.'
    ];
  });
  const [nuovaAltro, setNuovaAltro] = useState('');
  const [quoteAltro, setQuoteAltro] = useState<string>(defaultQuoteAltro);

  React.useEffect(() => {
    localStorage.setItem('lab_opzioni_altro_condizioni', JSON.stringify(opzioniAltro));
  }, [opzioniAltro]);

  // Synchronize active selections in 'condizioni' tab to default states & localStorage
  React.useEffect(() => {
    if (activeTab === 'condizioni') {
      setDefaultQuoteOggetto(quoteOggetto);
      localStorage.setItem('lab_default_quote_oggetto', quoteOggetto);
    }
  }, [quoteOggetto, activeTab]);

  React.useEffect(() => {
    if (activeTab === 'condizioni') {
      setDefaultQuoteModalita(quoteModalita);
      localStorage.setItem('lab_default_quote_modalita', quoteModalita);
    }
  }, [quoteModalita, activeTab]);

  React.useEffect(() => {
    if (activeTab === 'condizioni') {
      setDefaultQuoteCampionamento(quoteCampionamento);
      localStorage.setItem('lab_default_quote_campionamento', quoteCampionamento);
    }
  }, [quoteCampionamento, activeTab]);

  React.useEffect(() => {
    if (activeTab === 'condizioni') {
      setDefaultQuoteQuantitaCampione(quoteQuantitaCampione);
      localStorage.setItem('lab_default_quote_quantita_campione', quoteQuantitaCampione);
    }
  }, [quoteQuantitaCampione, activeTab]);

  React.useEffect(() => {
    if (activeTab === 'condizioni') {
      setDefaultQuoteTempoConsegna(quoteTempoConsegna);
      localStorage.setItem('lab_default_quote_tempo_consegna', quoteTempoConsegna);
    }
  }, [quoteTempoConsegna, activeTab]);

  React.useEffect(() => {
    if (activeTab === 'condizioni') {
      setDefaultQuoteInvioRapporto(quoteInvioRapporto);
      localStorage.setItem('lab_default_quote_invio_rapporto', quoteInvioRapporto);
    }
  }, [quoteInvioRapporto, activeTab]);

  React.useEffect(() => {
    if (activeTab === 'condizioni') {
      setDefaultQuoteProvaSubappaltata(quoteProvaSubappaltata);
      localStorage.setItem('lab_default_quote_prova_subappaltata', quoteProvaSubappaltata);
    }
  }, [quoteProvaSubappaltata, activeTab]);

  React.useEffect(() => {
    if (activeTab === 'condizioni') {
      setDefaultQuoteNoteQualitaAccredia(quoteNoteQualitaAccredia);
      localStorage.setItem('lab_default_quote_note_qualita_accredia', quoteNoteQualitaAccredia);
    }
  }, [quoteNoteQualitaAccredia, activeTab]);

  React.useEffect(() => {
    if (activeTab === 'condizioni') {
      setDefaultQuoteMaterialiCampionamento(quoteMaterialiCampionamento);
      localStorage.setItem('lab_default_quote_materiali_campionamento', quoteMaterialiCampionamento);
    }
  }, [quoteMaterialiCampionamento, activeTab]);

  React.useEffect(() => {
    if (activeTab === 'condizioni') {
      setDefaultQuoteNoteAccettazione(quoteNoteAccettazione);
      localStorage.setItem('lab_default_quote_note_accettazione', quoteNoteAccettazione);
    }
  }, [quoteNoteAccettazione, activeTab]);

  React.useEffect(() => {
    if (activeTab === 'condizioni') {
      setDefaultQuoteAltro(quoteAltro);
      localStorage.setItem('lab_default_quote_altro', quoteAltro);
    }
  }, [quoteAltro, activeTab]);

  // Gestione autonoma Denominazione del Modulo (Preset)
  const [presetNomeModuloTemplates, setPresetNomeModuloTemplates] = useState<string[]>(() => {
    const saved = localStorage.getItem('lab_preset_nome_modulo_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (err) {}
    }
    return [
      'MOD. BIO-04 REV. 02',
      'MOD. CHIM-01 REV. 04',
      'MOD. ACCR-12 REV. 01',
      'MOD. LIMS-02 REV. 03'
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('lab_preset_nome_modulo_templates', JSON.stringify(presetNomeModuloTemplates));
  }, [presetNomeModuloTemplates]);

  const [newPresetNomeModuloText, setNewPresetNomeModuloText] = useState('');
  const [editingNomeModuloIndex, setEditingNomeModuloIndex] = useState<number | null>(null);
  const [editingNomeModuloText, setEditingNomeModuloText] = useState('');
  const [showPresetNomeModuloDropdown, setShowPresetNomeModuloDropdown] = useState(false);

  // Stato per la modifica inline delle opzioni nelle categorie di Modalità e Condizioni
  const [editingOption, setEditingOption] = useState<{
    category: string;
    index: number;
    text: string;
  } | null>(null);

  // Destinatario Finale del Rapporto di Prova (RdP)
  const [quoteDestinatarioFinale, setQuoteDestinatarioFinale] = useState('');
  const [destinatarioSearchText, setDestinatarioSearchText] = useState('');
  const [isDestinatarioDropdownOpen, setIsDestinatarioDropdownOpen] = useState(false);

  // Righe aggiunte individualmente nel preventivo
  const [selectedQuoteProve, setSelectedQuoteProve] = useState<Array<{ provaId: string; quantita: number; prezzoApplicato: number; limitiSelezionati?: LimiteRiferimento[] }>>([]);
  const [selectedQuotePacchetti, setSelectedQuotePacchetti] = useState<Array<{ pacchettoId: string; quantita: number; prezzoApplicato: number }>>([]);

  const handleOpenEditPreventivo = (prev: Preventivo) => {
    setEditingPreventivo(prev);
    setQuoteClienteId(prev.clienteId);
    const exC = clients.find(c => c.id === prev.clienteId);
    setClientSearchText(exC ? exC.denominazione : '');
    setQuoteNotes(prev.note || '');
    setQuoteQualityNote(prev.notaQualitaPersonalizzata || '');
    setQuoteDiscount(prev.scontoPercentuale || 0);
    setSelectedQuoteProve(prev.proveSelezionate || []);
    setSelectedQuotePacchetti(prev.pacchettiSelezionati || []);
    setNascondiPrezziSingoli(prev.nascondiPrezziSingoli || false);
    setQuoteCategoryFilter('Tutte');

    // Populate custom title, privacy and contract properties
    setQuoteTitoloModulo(prev.titoloModulo || defaultTitoloModulo);
    setQuoteIncludePrivacy(prev.includePrivacy !== undefined ? prev.includePrivacy : true);
    setQuotePrivacyText(prev.privacyText || defaultPrivacyText);
    setQuoteIncludeContract(prev.includeContract !== undefined ? prev.includeContract : true);
    setQuoteContractText(prev.contractText || defaultContractText);
    setQuoteContractModelName(prev.contractModelName || defaultContractModelName);
    setQuoteContractModelCode(prev.contractModelCode || defaultContractModelCode);
    setQuoteNomeModulo(prev.nomeModulo || defaultNomeModulo);

    // Populate and select configurable properties
    const val = prev.validitaOfferta || '90 Giorni';
    setOpzioniValidita(current => {
      if (val && !current.includes(val)) {
        return [...current, val];
      }
      return current;
    });
    setQuoteValidita(val);

    const ogg = prev.oggettoOfferta || 'In risposta alla Vs. cortese richiesta';
    setOpzioniOggetto(current => {
      if (ogg && !current.includes(ogg)) {
        return [...current, ogg];
      }
      return current;
    });
    setQuoteOggetto(ogg);

    const mod = prev.modalitaCondizioni !== undefined ? prev.modalitaCondizioni : 'Pagamento: Rimessa diretta a 30 giorni data fattura fine mese.';
    setOpzioniModalita(current => {
      if (mod && !current.includes(mod)) {
        return [...current, mod];
      }
      return current;
    });
    setQuoteModalita(mod);

    const camp = prev.metodoCampionamento !== undefined ? prev.metodoCampionamento : 'Campionamento a cura del Cliente.';
    setOpzioniCampionamento(current => {
      if (camp && !current.includes(camp)) {
        return [...current, camp];
      }
      return current;
    });
    setQuoteCampionamento(camp);

    const quant = prev.quantitaCampione !== undefined ? prev.quantitaCampione : 'Quantità minima indicata per ciascuna determinazione analitica.';
    setOpzioniQuantitaCampione(current => {
      if (quant && !current.includes(quant)) {
        return [...current, quant];
      }
      return current;
    });
    setQuoteQuantitaCampione(quant);

    const tempo = prev.tempoConsegna !== undefined ? prev.tempoConsegna : 'Entro 7-10 giorni lavorativi a decorrere dalla data di ricevimento dei campioni.';
    setOpzioniTempoConsegna(current => {
      if (tempo && !current.includes(tempo)) {
        return [...current, tempo];
      }
      return current;
    });
    setQuoteTempoConsegna(tempo);

    const invio = prev.modalitaInvioRapporto !== undefined ? prev.modalitaInvioRapporto : 'Invio del Rapporto di Prova in formato PDF firmato digitalmente a mezzo e-mail ordinaria o PEC.';
    setOpzioniInvioRapporto(current => {
      if (invio && !current.includes(invio)) {
        return [...current, invio];
      }
      return current;
    });
    setQuoteInvioRapporto(invio);

    const sub = prev.provaSubappaltata !== undefined ? prev.provaSubappaltata : 'Le prove analitiche verranno interamente eseguite presso la nostra sede autorizzata.';
    setOpzioniProvaSubappaltata(current => {
      if (sub && !current.includes(sub)) {
        return [...current, sub];
      }
      return current;
    });
    setQuoteProvaSubappaltata(sub);

    const accredia = prev.noteQualitaAccredia !== undefined ? prev.noteQualitaAccredia : 'Le prove analitiche contrassegnate dal simbolo (*) non sono coperte da accreditamento ACCREDIA.';
    setOpzioniNoteQualitaAccredia(current => {
      if (accredia && !current.includes(accredia)) {
        return [...current, accredia];
      }
      return current;
    });
    setQuoteNoteQualitaAccredia(accredia);

    const mat = prev.materialiCampionamento !== undefined ? prev.materialiCampionamento : 'Contenitori sterili monouso per campionamento microbiologico forniti gratuitamente dal laboratorio Biochem.';
    setOpzioniMaterialiCampionamento(current => {
      if (mat && !current.includes(mat)) {
        return [...current, mat];
      }
      return current;
    });
    setQuoteMaterialiCampionamento(mat);

    const acc = prev.noteAccettazione !== undefined ? prev.noteAccettazione : 'I campioni vengono accettati dal lunedì al giovedì dalle ore 9:00 alle ore 16:00.';
    setOpzioniNoteAccettazione(current => {
      if (acc && !current.includes(acc)) {
        return [...current, acc];
      }
      return current;
    });
    setQuoteNoteAccettazione(acc);

    const alt = prev.altroCondizioni !== undefined ? prev.altroCondizioni : 'Nessuna dicitura o condizione aggiuntiva concordata.';
    setOpzioniAltro(current => {
      if (alt && !current.includes(alt)) {
        return [...current, alt];
      }
      return current;
    });
    setQuoteAltro(alt);

    // Destinatario finale
    setQuoteDestinatarioFinale(prev.destinatarioFinale || '');
    setDestinatarioSearchText(prev.destinatarioFinale || '');

    setShowAddPackage(false);
    setShowAddQuote(true);
  };

  const handleOpenEditPacchetto = (pack: Pacchetto) => {
    setEditingPacchetto(pack);
    setPackageName(pack.nome);
    setPackageDesc(pack.descrizione || '');
    setPackageCategory(pack.categoriaMerceologica || 'Oli e Grassi');
    setSelectedPackProve(pack.proveIds);
    setPackagePrice(pack.prezzoScontato.toString());
    setShowAddQuote(false);
    setShowAddPackage(true);
    // scorriamo l'utente in cima alla pagina per vedere il form chiaramente
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calcolo totale dinamico per Nuovo Preventivo
  const calcolaImponibileQuote = () => {
    const totProve = selectedQuoteProve.reduce((sum, item) => sum + (item.quantita * item.prezzoApplicato), 0);
    const totPacks = selectedQuotePacchetti.reduce((sum, item) => sum + (item.quantita * item.prezzoApplicato), 0);
    return totProve + totPacks;
  };

  const calcolaTotalePreventivo = () => {
    const imp = calcolaImponibileQuote();
    const sc = (imp * (quoteDiscount || 0)) / 100;
    return Math.max(0, imp - sc);
  };

  // Helper per ottenere informazioni collegate
  const getClienteName = (id: string) => {
    return clients.find(c => c.id === id)?.denominazione || 'Cliente sconosciuto';
  };

  const getProvaInfo = (id: string) => {
    return prove.find(p => p.id === id);
  };

  const getPacchettoInfo = (id: string) => {
    return pacchetti.find(p => p.id === id);
  };

  // Gestione Salvataggio Preventivo come Pacchetto
  const handleOpenSaveAsPackage = (prev: Preventivo) => {
    setSaveAsPackageQuote(prev);
    setNewPackageName(`Pacchetto ${prev.codice}`);
    setNewPackageDesc(`Pacchetto derivato dal preventivo ${prev.codice}`);
    
    const categoriesFromProve = Array.from(new Set(prove.map(p => p.categoriaMerceologica).filter(Boolean)));
    const defaultCat = categoriesFromProve.length > 0 ? categoriesFromProve[0] : "Oli e Grassi";
    setNewPackageCategory(defaultCat);
    setNewPackagePrice(prev.totale);
  };

  const handleConfirmSaveAsPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveAsPackageQuote) return;
    if (!newPackageName.trim()) {
      alert("Per favore, inserisci un nome per il pacchetto.");
      return;
    }

    const pIds = new Set<string>();
    saveAsPackageQuote.proveSelezionate?.forEach(item => {
      pIds.add(item.provaId);
    });
    saveAsPackageQuote.pacchettiSelezionati?.forEach(item => {
      const pack = pacchetti.find(p => p.id === item.pacchettoId);
      if (pack && pack.proveIds) {
        pack.proveIds.forEach(pid => pIds.add(pid));
      }
    });

    const selectedPids = Array.from(pIds);
    if (selectedPids.length === 0) {
      alert("Questo preventivo non contiene analisi da poter raggruppare in un pacchetto!");
      return;
    }

    const newPack: Pacchetto = {
      id: 'pa_' + Date.now(),
      nome: newPackageName.trim(),
      descrizione: newPackageDesc.trim(),
      categoriaMerceologica: newPackageCategory,
      proveIds: selectedPids,
      prezzoScontato: parseFloat(newPackagePrice.toString()) || 0
    };

    onAddPacchetto(newPack);
    setSaveAsPackageQuote(null);
    setNewPackageName('');
    setNewPackageDesc('');
    setNewPackagePrice('');
    
    // Switch to packages tab and show them the newly created item
    setActiveTab('pacchetti');
  };

  // Inserimento o modifica del pacchetto nel sistema
  const handleSubmitPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageName.trim() || selectedPackProve.length === 0 || !packagePrice) return;

    if (editingPacchetto) {
      const updatedPack: Pacchetto = {
        ...editingPacchetto,
        nome: packageName.trim(),
        descrizione: packageDesc.trim(),
        categoriaMerceologica: packageCategory,
        proveIds: selectedPackProve,
        prezzoScontato: parseFloat(packagePrice) || 0
      };
      onUpdatePacchetto(updatedPack);
    } else {
      const newPack: Pacchetto = {
        id: 'pa_' + Date.now(),
        nome: packageName.trim(),
        descrizione: packageDesc.trim(),
        categoriaMerceologica: packageCategory,
        proveIds: selectedPackProve,
        prezzoScontato: parseFloat(packagePrice) || 0
      };
      onAddPacchetto(newPack);
    }

    // Reset Form Pacchetto
    setPackageName('');
    setPackageDesc('');
    setSelectedPackProve([]);
    setPackagePrice('');
    setEditingPacchetto(null);
    setShowAddPackage(false);
  };

  // Inserimento nuovo preventivo nel sistema
  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteClienteId) return;
    if (selectedQuoteProve.length === 0 && selectedQuotePacchetti.length === 0) {
      alert("Seleziona almeno una prova o un pacchetto per compilare il preventivo!");
      return;
    }

    const totalCalculated = calcolaTotalePreventivo();

    let finalPrev: Preventivo;
    if (editingPreventivo) {
      finalPrev = {
        ...editingPreventivo,
        clienteId: quoteClienteId,
        proveSelezionate: selectedQuoteProve,
        pacchettiSelezionati: selectedQuotePacchetti,
        totale: totalCalculated,
        scontoPercentuale: quoteDiscount || 0,
        nascondiPrezziSingoli: nascondiPrezziSingoli,
        note: quoteNotes.trim() || undefined,
        notaQualitaPersonalizzata: quoteQualityNote.trim() || undefined,
        validitaOfferta: quoteValidita,
        oggettoOfferta: quoteOggetto,
        modalitaCondizioni: quoteModalita,
        metodoCampionamento: quoteCampionamento,
        quantitaCampione: quoteQuantitaCampione,
        tempoConsegna: quoteTempoConsegna,
        modalitaInvioRapporto: quoteInvioRapporto,
        provaSubappaltata: quoteProvaSubappaltata,
        noteQualitaAccredia: quoteNoteQualitaAccredia,
        materialiCampionamento: quoteMaterialiCampionamento,
        noteAccettazione: quoteNoteAccettazione,
        altroCondizioni: quoteAltro,
        destinatarioFinale: quoteDestinatarioFinale,
        titoloModulo: quoteTitoloModulo,
        includePrivacy: quoteIncludePrivacy,
        privacyText: quotePrivacyText,
        includeContract: quoteIncludeContract,
        contractText: quoteContractText,
        contractModelName: quoteContractModelName,
        contractModelCode: quoteContractModelCode,
        nomeModulo: quoteNomeModulo
      };
    } else {
      const codiceAnno = new Date().getFullYear();
      const numeroProgressivo = preventivi.length + 1;
      const formattedCodice = `PREV-${codiceAnno}-${String(numeroProgressivo).padStart(3, '0')}`;

      finalPrev = {
        id: 'pr_' + Date.now(),
        codice: formattedCodice,
        clienteId: quoteClienteId,
        dataCreazione: new Date().toISOString().split('T')[0],
        stato: 'In Approvazione',
        proveSelezionate: selectedQuoteProve,
        pacchettiSelezionati: selectedQuotePacchetti,
        totale: totalCalculated,
        scontoPercentuale: quoteDiscount || 0,
        nascondiPrezziSingoli: nascondiPrezziSingoli,
        note: quoteNotes.trim() || undefined,
        notaQualitaPersonalizzata: quoteQualityNote.trim() || undefined,
        validitaOfferta: quoteValidita,
        oggettoOfferta: quoteOggetto,
        modalitaCondizioni: quoteModalita,
        metodoCampionamento: quoteCampionamento,
        quantitaCampione: quoteQuantitaCampione,
        tempoConsegna: quoteTempoConsegna,
        modalitaInvioRapporto: quoteInvioRapporto,
        provaSubappaltata: quoteProvaSubappaltata,
        noteQualitaAccredia: quoteNoteQualitaAccredia,
        materialiCampionamento: quoteMaterialiCampionamento,
        noteAccettazione: quoteNoteAccettazione,
        altroCondizioni: quoteAltro,
        destinatarioFinale: quoteDestinatarioFinale,
        titoloModulo: quoteTitoloModulo,
        includePrivacy: quoteIncludePrivacy,
        privacyText: quotePrivacyText,
        includeContract: quoteIncludeContract,
        contractText: quoteContractText,
        contractModelName: quoteContractModelName,
        contractModelCode: quoteContractModelCode,
        nomeModulo: quoteNomeModulo
      };
    }

    onAddPreventivo(finalPrev);

    // Reset Form Preventivo
    setQuoteClienteId(clients[0]?.id || '');
    const defC = clients.find(c => c.id === (clients[0]?.id || ''));
    setClientSearchText(defC ? defC.denominazione : '');
    setIsClientDropdownOpen(false);
    setQuoteNotes('');
    setQuoteQualityNote('');
    setQuoteDiscount(0);
    setNascondiPrezziSingoli(false);
    setQuoteCategoryFilter('Tutte');
    setSelectedQuoteProve([]);
    setSelectedQuotePacchetti([]);
    setQuoteValidita('90 Giorni');
    setQuoteOggetto(defaultQuoteOggetto);
    setQuoteModalita(defaultQuoteModalita);
    setQuoteCampionamento(defaultQuoteCampionamento);
    setQuoteQuantitaCampione(defaultQuoteQuantitaCampione);
    setQuoteTempoConsegna(defaultQuoteTempoConsegna);
    setQuoteInvioRapporto(defaultQuoteInvioRapporto);
    setQuoteProvaSubappaltata(defaultQuoteProvaSubappaltata);
    setQuoteNoteQualitaAccredia(defaultQuoteNoteQualitaAccredia);
    setQuoteMaterialiCampionamento(defaultQuoteMaterialiCampionamento);
    setQuoteNoteAccettazione(defaultQuoteNoteAccettazione);
    setQuoteAltro(defaultQuoteAltro);
    setQuoteDestinatarioFinale('');
    setDestinatarioSearchText('');
    setQuoteTitoloModulo(defaultTitoloModulo);
    setQuoteIncludePrivacy(defaultIncludePrivacy);
    setQuotePrivacyText(defaultPrivacyText);
    setQuoteIncludeContract(defaultIncludeContract);
    setQuoteContractText(defaultContractText);
    setQuoteContractModelName(defaultContractModelName);
    setQuoteContractModelCode(defaultContractModelCode);
    setQuoteNomeModulo(defaultNomeModulo);
    setEditingPreventivo(null);
    setShowAddQuote(false);
  };

  // Gestione prove selezionate nel Costruttore di Preventivi
  const handleAddProvaToQuote = (provaId: string) => {
    const giaIncluso = selectedQuoteProve.find(p => p.provaId === provaId);
    if (giaIncluso) {
      // Incrementa quantità
      setSelectedQuoteProve(selectedQuoteProve.map(p =>
        p.provaId === provaId ? { ...p, quantita: p.quantita + 1 } : p
      ));
    } else {
      const defaultPrice = getProvaInfo(provaId)?.prezzoListino || 0;
      setSelectedQuoteProve([...selectedQuoteProve, { provaId, quantita: 1, prezzoApplicato: defaultPrice }]);
    }
  };

  const handleRemoveProvaFromQuote = (provaId: string) => {
    setSelectedQuoteProve(selectedQuoteProve.filter(p => p.provaId !== provaId));
  };

  const handleUpdateProvaQty = (provaId: string, qty: number) => {
    if (qty < 1) return;
    setSelectedQuoteProve(selectedQuoteProve.map(p =>
      p.provaId === provaId ? { ...p, quantita: qty } : p
    ));
  };

  const handleUpdateProvaPrice = (provaId: string, prezzo: number) => {
    setSelectedQuoteProve(selectedQuoteProve.map(p =>
      p.provaId === provaId ? { ...p, prezzoApplicato: prezzo } : p
    ));
  };

  // Gestione limiti per le prove nel preventivo
  const handleAddLimiteToProva = (provaId: string, predefinito?: LimiteRiferimento) => {
    setSelectedQuoteProve(selectedQuoteProve.map(p => {
      if (p.provaId === provaId) {
        const limiti = p.limitiSelezionati ? [...p.limitiSelezionati] : [];
        const newLim: LimiteRiferimento = predefinito 
          ? { ...predefinito, id: 'lim_' + Date.now() + '_' + Math.random().toString(36).substring(2,6) }
          : {
              id: 'lim_' + Date.now() + '_' + Math.random().toString(36).substring(2,6),
              valore: '',
              unitaMisura: 'mg/kg',
              norma: '',
              note: ''
            };
        return { ...p, limitiSelezionati: [...limiti, newLim] };
      }
      return p;
    }));
  };

  const handleUpdateLimiteOfProva = (provaId: string, limiteId: string, fields: Partial<LimiteRiferimento>) => {
    setSelectedQuoteProve(selectedQuoteProve.map(p => {
      if (p.provaId === provaId) {
        const limiti = (p.limitiSelezionati || []).map(l => {
          if (l.id === limiteId) {
            return { ...l, ...fields };
          }
          return l;
        });
        return { ...p, limitiSelezionati: limiti };
      }
      return p;
    }));
  };

  const handleRemoveLimiteFromProva = (provaId: string, limiteId: string) => {
    setSelectedQuoteProve(selectedQuoteProve.map(p => {
      if (p.provaId === provaId) {
        const limiti = (p.limitiSelezionati || []).filter(l => l.id !== limiteId);
        return { ...p, limitiSelezionati: limiti };
      }
      return p;
    }));
  };

  // Gestione pacchetti selezionati nel Costruttore di Preventivi
  const handleAddPacchettoToQuote = (pacchettoId: string) => {
    const giaIncluso = selectedQuotePacchetti.find(p => p.pacchettoId === pacchettoId);
    if (giaIncluso) {
      setSelectedQuotePacchetti(selectedQuotePacchetti.map(p =>
        p.pacchettoId === pacchettoId ? { ...p, quantita: p.quantita + 1 } : p
      ));
    } else {
      const defaultPrice = getPacchettoInfo(pacchettoId)?.prezzoScontato || 0;
      setSelectedQuotePacchetti([...selectedQuotePacchetti, { pacchettoId, quantita: 1, prezzoApplicato: defaultPrice }]);
    }
  };

  const handleRemovePacchettoFromQuote = (pacchettoId: string) => {
    setSelectedQuotePacchetti(selectedQuotePacchetti.filter(p => p.pacchettoId !== pacchettoId));
  };

  const handleUpdatePacchettoQty = (pacchettoId: string, qty: number) => {
    if (qty < 1) return;
    setSelectedQuotePacchetti(selectedQuotePacchetti.map(p =>
      p.pacchettoId === pacchettoId ? { ...p, quantita: qty } : p
    ));
  };

  // Modifica di stato per i preventivi con Tracciabilità Auditing
  const handleToggleState = (quoteId: string, currentStatus: string) => {
    setTracingQuoteStatusId(quoteId);
    setTracingSelectedStatus(currentStatus as any);
    setTracingPassword('');
    setTracingError(null);
    const foundQuote = preventivi.find(q => q.id === quoteId);
    
    const knownOperators = operators && operators.length > 0 
      ? operators.map(op => op.nome) 
      : ['Dott. Chim. F. Lupo', 'Dott.ssa S. Bianchi', 'Dott. R. Vitale'];
    const defaultOperator = operators && operators.length > 0
      ? operators[0].nome
      : 'Dott. Chim. F. Lupo';

    if (foundQuote && foundQuote.statoHistory && foundQuote.statoHistory.length > 0) {
      // Proponi l'ultimo operatore usato o quello di default
      const lastOp = foundQuote.statoHistory[foundQuote.statoHistory.length - 1].operatore;
      if (knownOperators.includes(lastOp)) {
        setTracingOperator(lastOp);
        setTracingCustomOperator('');
      } else {
        setTracingOperator('Altro');
        setTracingCustomOperator(lastOp);
      }
    } else {
      setTracingOperator(defaultOperator);
      setTracingCustomOperator('');
    }
  };

  const handleConfirmStatusChange = () => {
    if (!tracingQuoteStatusId) return;
    const foundQuote = preventivi.find(q => q.id === tracingQuoteStatusId);
    if (!foundQuote) return;

    // Controllo Password dell'operatore per validare il cambio stato (Richiesta Utente)
    const correctPassword = OPERATOR_PASSWORDS[tracingOperator] || 'lims123';
    if (tracingPassword !== correctPassword) {
      setTracingError(`La password di firma inserita per l'operatore ${tracingOperator} non è corretta.`);
      return;
    }

    const op = tracingOperator === 'Altro' ? (tracingCustomOperator.trim() || 'Operatore Generico') : tracingOperator;
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
      statoNuovo: tracingSelectedStatus,
      dataOra: formattedDate,
      operatore: op
    };

    const history = foundQuote.statoHistory ? [...foundQuote.statoHistory, newLog] : [newLog];

    const updated: Preventivo = {
      ...foundQuote,
      stato: tracingSelectedStatus,
      statoHistory: history
    };

    onAddPreventivo(updated);
    setTracingQuoteStatusId(null);
    setTracingCustomOperator('');
    setTracingPassword('');
    setTracingError(null);
  };

  // Esportazione dei dati della prova in formato testuale CSV
  const handleExportCSV = (prev: Preventivo) => {
    const cliente = getClienteName(prev.clienteId);
    
    // Colonne intestazione
    const headers = [
      'Codice Preventivo',
      'Cliente',
      'Data Emissione',
      'Tipologia',
      'Nome della Prova / Pacchetto',
      'Metodo / Dettagli',
      'Tempo Esecuzione (Giorni)',
      'Quantita',
      'Prezzo Unitario (€)',
      'Prezzo Totale (€)'
    ];

    const rows: string[][] = [];

    const isPriceHidden = prev.nascondiPrezziSingoli && (prev.proveSelezionate.length + prev.pacchettiSelezionati.length) > 1;

    // 1. Processa le singole prove selezionate
    prev.proveSelezionate.forEach(item => {
      const pInfo = getProvaInfo(item.provaId);
      rows.push([
        prev.codice,
        cliente,
        prev.dataCreazione,
        'Prova Singola',
        pInfo?.nome ? (pInfo.accreditataAccredia ? `${pInfo.nome} (Accreditata ACCREDIA)` : pInfo.nome) : 'n/d',
        pInfo?.metodoAnalitico || 'n/d',
        pInfo?.tempoEsecuzioneGiorni?.toString() || 'n/d',
        item.quantita.toString(),
        isPriceHidden ? 'Incluso nel totale' : item.prezzoApplicato.toFixed(2),
        isPriceHidden ? 'Incluso nel totale' : (item.quantita * item.prezzoApplicato).toFixed(2)
      ]);
    });

    // 2. Processa i pacchetti aggiunti
    prev.pacchettiSelezionati.forEach(item => {
      const packInfo = getPacchettoInfo(item.pacchettoId);
      rows.push([
        prev.codice,
        cliente,
        prev.dataCreazione,
        'Pacchetto',
        packInfo?.nome || 'n/d',
        packInfo?.descrizione || 'n/d',
        'Varia',
        item.quantita.toString(),
        isPriceHidden ? 'Incluso nel totale' : item.prezzoApplicato.toFixed(2),
        isPriceHidden ? 'Incluso nel totale' : (item.quantita * item.prezzoApplicato).toFixed(2)
      ]);
      
      // Sotto-voci: elenca anche le singole prove del pacchetto per trasparenza
      packInfo?.proveIds.forEach(pId => {
        const pInfo = getProvaInfo(pId);
        rows.push([
          prev.codice,
          cliente,
          prev.dataCreazione,
          `  └─ Prova inclusa in ${packInfo.nome}`,
          pInfo?.nome ? (pInfo.accreditataAccredia ? `${pInfo.nome} (Accreditata ACCREDIA)` : pInfo.nome) : 'n/d',
          pInfo?.metodoAnalitico || 'n/d',
          pInfo?.tempoEsecuzioneGiorni?.toString() || 'n/d',
          item.quantita.toString(),
          '0.00',
          '0.00'
        ]);
      });
    });

    // Riga per il totale
    rows.push([]);
    if (prev.scontoPercentuale && prev.scontoPercentuale > 0) {
      const imponibile = prev.totale / (1 - prev.scontoPercentuale / 100);
      rows.push([
        'IMPONIBILE LORDO',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        imponibile.toFixed(2)
      ]);
      rows.push([
        `SCONTO APPLICATO (${prev.scontoPercentuale}%)`,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        `-${(imponibile - prev.totale).toFixed(2)}`
      ]);
    }
    rows.push([
      'TOTALE NETTO PREVENTIVATO',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      prev.totale.toFixed(2)
    ]);

    if (prev.note) {
      rows.push([]);
      rows.push(['Note del Preventivo:', prev.note]);
    }

    // Costruzione CSV con codifica UTF-8 BOM per visualizzazione corretta in MS Excel
    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(';'),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';'))
    ].join('\r\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${prev.codice}_esportazione.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (printOnlyId) {
    const prev = preventivi.find(p => p.id === printOnlyId);
    if (prev) {
      const client = clients.find(c => c.id === prev.clienteId);
      const isPriceHidden = prev.nascondiPrezziSingoli && (prev.proveSelezionate.length + prev.pacchettiSelezionati.length) > 1;
      
      const subtotal = prev.proveSelezionate.reduce((sum, item) => sum + (item.quantita * item.prezzoApplicato), 0) +
        prev.pacchettiSelezionati.reduce((sum, item) => sum + (item.quantita * item.prezzoApplicato), 0);
      
      const discountAmount = prev.scontoPercentuale ? (subtotal * prev.scontoPercentuale) / 100 : 0;
      const taxableAmount = prev.totale;
      const vatAmount = taxableAmount * 0.22;
      const totalWithVat = taxableAmount + vatAmount;

      const hasAccredia = prev.proveSelezionate.some(item => getProvaInfo(item.provaId)?.accreditataAccredia) ||
        prev.pacchettiSelezionati.some(item => getPacchettoInfo(item.pacchettoId)?.proveIds.some(pid => getProvaInfo(pid)?.accreditataAccredia));

      return (
        <div className="min-h-screen bg-slate-900 flex flex-col print:bg-white print:block">
          {/* Top minimal bar (non-printable) */}
          <div className="bg-slate-950 px-6 py-4 flex justify-between items-center text-white shrink-0 print:hidden shadow-lg border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-emerald-400 font-bold" />
              <div>
                <h3 className="font-extrabold text-xs tracking-wider uppercase text-slate-205">Lupo 2.0 — Stampa Preventivo Ufficiale</h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  Preventivo {prev.codice} — {client?.denominazione || 'Cliente'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  window.focus();
                  window.print();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md border border-emerald-550 flex items-center gap-2 transition cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                Lancia Stampa / PDF
              </button>
              <button
                onClick={() => {
                  window.close();
                  // Fallback in case window.close() is blocked by browser policy
                  setTimeout(() => {
                    window.location.href = window.location.origin + window.location.pathname;
                  }, 100);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-extrabold text-xs rounded-xl shadow-md border border-slate-700 flex items-center gap-2 transition cursor-pointer"
              >
                Chiudi e Torna all&apos;App
              </button>
            </div>
          </div>

          {/* Fully visible print preview sheet on-screen */}
          <div className="flex-1 bg-slate-900/40 p-6 md:p-12 overflow-y-auto print:p-0 print:bg-white flex justify-center">
            <div 
              id="print-area-container"
              className="bg-white p-8 md:p-14 w-full max-w-4xl shadow-2xl rounded-2xl print:shadow-none print:rounded-none print:p-[1.6cm] font-sans text-slate-800"
            >
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  @page {
                    margin: 0 !important;
                  }
                  body {
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  body * {
                    visibility: hidden !important;
                  }
                  #print-area-container, #print-area-container * {
                    visibility: visible !important;
                  }
                  nav, aside, header, footer, button, .print\\:hidden, #sidebar-accettazione, #card-dash-accettazione {
                    display: none !important;
                    height: 0 !important;
                    overflow: hidden !important;
                  }
                  #print-area-container {
                    display: block !important;
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    height: auto !important;
                    margin: 0 !important;
                    padding: 1.6cm !important;
                    border: none !important;
                    box-shadow: none !important;
                    background: white !important;
                    color: black !important;
                  }
                  .break-before-page {
                    page-break-before: always !important;
                    break-before: page !important;
                  }
                }
                @media screen {
                  .break-before-page {
                    margin-top: 3rem !important;
                    padding-top: 3rem !important;
                    border-top: 3px dashed #cbd5e1 !important;
                    position: relative;
                  }
                  .break-before-page::before {
                    content: "SCAFFOLD: NUOVA PAGINA (ALLEGATO)";
                    position: absolute;
                    top: -12px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #f1f5f9;
                    color: #64748b;
                    font-size: 9px;
                    font-weight: 800;
                    padding: 2px 8px;
                    border-radius: 9999px;
                    border: 1px solid #cbd5e1;
                    letter-spacing: 0.05em;
                  }
                }
              `}} />

              {/* FOGLIO A4 - CONTENITORE PRINCIPALE */}
              <div className="max-w-[720px] mx-auto space-y-8 print:max-w-full print:w-full print:mx-0">
                
                {/* INTESTAZIONE DOCUMENTALE */}
                <div className="flex justify-between items-start gap-6 border-b-2 border-slate-900 pb-5">
                  <div>
                    {/* Marchio Lab */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-lg tracking-wider">
                        BC
                      </div>
                      <div>
                        <h1 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tight m-0">BIOCHEM ANALYTICAL</h1>
                        <p className="text-[9px] font-bold text-slate-500 tracking-widest uppercase mb-0">Laboratorio di Analisi e Controllo Qualità</p>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-3 font-mono leading-relaxed">
                      Sede Legale: Via delle Scienze n. 42, 00100 Roma (RM)<br />
                      P.IVA / C.F. 01234567890 | Cap. Soc. 150.000 € i.v.<br />
                      Tel: 06 555 1234 | E-mail: preventivi@biochem-analytical.it
                    </div>
                  </div>
                  <div className="text-right border-l-2 border-slate-200 pl-5 min-w-[150px]">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-150">PROPOSTA DI PREVENTIVO</span>
                    <p className="text-[10.5px] text-slate-605 font-bold m-0 mt-3">PROPOSTA COMMERCIALE</p>
                    <p className="text-[9px] text-slate-400 m-0">Rif. Interno: PRO-REV-2026</p>
                  </div>
                </div>

                {/* AREA METADATI PREVENTIVO / INTESTATARI */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  
                  {/* Blocco Metadati */}
                  <div className="border border-slate-200 p-4 rounded-2xl space-y-1.5 bg-slate-50/20">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-0.5">Dati Preventivo</span>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Codice Documento:</span>
                      <span className="font-mono font-bold text-slate-900">{prev.codice}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Data Emissione:</span>
                      <span className="font-mono text-slate-700 font-semibold">{formatDateItalianFullMonth(prev.dataCreazione)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Validità Offerta:</span>
                      <span className="text-slate-700 font-extrabold">{prev.validitaOfferta || '90 Giorni'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Data di Scadenza:</span>
                      <span className="font-mono text-slate-700 font-semibold">
                        {(() => {
                          const status = getOfferValidityStatus(prev.dataCreazione, prev.validitaOfferta);
                          return formatDateItalianFullMonth(status.scadenzaFormattata);
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Intestatario / Cliente */}
                  <div className="border border-slate-200 p-4 rounded-2xl space-y-1.5">
                    <span className="text-[9px] font-black uppercase text-slate-450 tracking-widest block mb-1">Cliente Spett.le</span>
                    <h4 className="font-bold text-slate-900 text-sm leading-tight mb-0">{client?.denominazione || 'Cliente non specificato'}</h4>
                    <p className="text-xs text-slate-500 leading-snug pt-1">
                      {client?.indirizzo && <span>📍 {client.indirizzo}<br /></span>}
                      {client?.partitaIva && <span>P.IVA: <strong className="font-mono">{client.partitaIva}</strong><br /></span>}
                      {client?.email && <span>✉️ {client.email} | 📞 {client.telefono}</span>}
                    </p>
                    {prev.destinatarioFinale && prev.destinatarioFinale !== 'Stesso Committente' && prev.destinatarioFinale !== client?.denominazione && (
                      <div className="mt-2.5 pt-2 border-t border-slate-150">
                        <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block mb-0.5">Destinatario Finale RdP</span>
                        <span className="text-[11px] font-bold text-slate-800 leading-tight block">🏢 {prev.destinatarioFinale}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* INTRODUZIONE / OGGETTO */}
                <div className="text-xs text-slate-700 leading-relaxed space-y-1.5 mt-2">
                  {prev.oggettoOfferta !== "" && (
                    <div className="font-semibold text-slate-900 text-xs">
                      {prev.oggettoOfferta || defaultQuoteOggetto}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 font-medium">
                    Provvediamo a trasmettere la nostra migliore proposta commerciale relativa all&apos;esecuzione delle prove analitiche, merceologiche o pacchetti forfettari qui specificati:
                  </div>
                </div>

                {/* TABELLA DETTAGLIATA ARTICOLI INCLUSI */}
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-white/50">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                        <th className="py-2.5 px-3">Prova</th>
                        <th className="py-2.5 px-3">Metodo</th>
                        <th className="py-2.5 px-3 text-center">Qtà</th>
                        {!isPriceHidden ? (
                          <>
                            <th className="py-2.5 px-3 text-right">Unitario</th>
                            <th className="py-2.5 px-3 text-right">Totale Netto</th>
                          </>
                        ) : (
                          <th className="py-2.5 px-3 text-center">Note Prezzo</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-700">
                      {/* Singole Prove */}
                      {prev.proveSelezionate.map(item => {
                        const info = getProvaInfo(item.provaId);
                        return (
                          <tr key={item.provaId} className={`hover:bg-slate-50/55 ${info?.accreditataAccredia ? 'bg-emerald-50/15' : ''}`}>
                            <td className="py-2.5 px-3 font-semibold text-slate-850">
                              <div className="flex items-start gap-1">
                                <span>{info?.nome || 'Parametro Chimico'}{info?.accreditataAccredia && ' *'}</span>
                              </div>
                              {item.limitiSelezionati && item.limitiSelezionati.length > 0 && (
                                <div className="mt-1.5 space-y-0.5 text-[10px] pl-1 font-normal text-slate-600">
                                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Limiti e Note Normative:</div>
                                  {item.limitiSelezionati.map(lim => (
                                    <div key={lim.id} className="flex flex-wrap items-center gap-1 text-[10.5px]">
                                      <span className="font-mono text-slate-800 font-bold bg-slate-50 px-1 border border-slate-150 rounded">{lim.valore} {lim.unitaMisura}</span>
                                      <span className="text-slate-400 font-serif">→</span>
                                      <span className="text-emerald-700 font-semibold">{lim.norma}</span>
                                      {lim.note && <span className="text-slate-400 text-[9.5px] italic">({lim.note})</span>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 font-mono text-[9px] font-semibold">{info?.metodoAnalitico || 'Generale'}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-705">{item.quantita}</td>
                            {!isPriceHidden ? (
                              <>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-500">€{item.prezzoApplicato.toFixed(2)}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">€{(item.quantita * item.prezzoApplicato).toFixed(2)}</td>
                              </>
                            ) : (
                              <td className="py-2.5 px-3 text-center text-slate-450 italic text-[10px]">Incluso nel preventivo</td>
                            )}
                          </tr>
                        );
                      })}

                      {/* Pacchetti */}
                      {prev.pacchettiSelezionati.map(item => {
                        const info = getPacchettoInfo(item.pacchettoId);
                        return (
                          <tr key={item.pacchettoId} className="hover:bg-slate-50/55">
                            <td className="py-2.5 px-3 font-semibold text-slate-850">
                              <div className="font-bold text-purple-900">{info?.nome || 'Pacchetto Speciale'}</div>
                              {info?.proveIds && info.proveIds.length > 0 && (
                                <div className="text-[9px] text-slate-400 mt-1 pl-1 border-l border-slate-205 leading-relaxed font-normal">
                                  Include: {info.proveIds.map((pId, idx) => {
                                    const pInfo = getProvaInfo(pId);
                                    return (
                                      <span key={pId} className="inline-flex items-center gap-0.5">
                                        {pInfo?.nome}
                                        {pInfo?.accreditataAccredia && ' *'}
                                        {idx < info.proveIds.length - 1 ? ', ' : ''}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 italic font-medium text-[10px]">Pacchetto Multi-Analitico</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-705">{item.quantita}</td>
                            {!isPriceHidden ? (
                              <>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-500">€{item.prezzoApplicato.toFixed(2)}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700">€{(item.quantita * item.prezzoApplicato).toFixed(2)}</td>
                              </>
                            ) : (
                              <td className="py-2.5 px-3 text-center text-slate-450 italic text-[10px]">Incluso nel preventivo</td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* NOTE ACCREDIA */}
                {hasAccredia && (
                  <div className="bg-emerald-50/30 border border-emerald-150/80 rounded-lg p-3 text-[10px] text-emerald-800 leading-relaxed shadow-3xs">
                    <strong className="font-bold uppercase tracking-wide block mb-0.5">Note:</strong>
                    {prev.noteQualitaAccredia ? (
                      <span className="whitespace-pre-line">{prev.noteQualitaAccredia}</span>
                    ) : (
                      <span>
                        * Prova accreditata da ACCREDIA. Le analisi contrassegnate sopra con l'asterisco (*) sono coperte da accreditamento nazionale ai sensi della norma internazionale <strong>UNI EN ISO/IEC 17025</strong>. L&apos;accreditamento attesta l&apos;idoneità tecnica del laboratorio e garantisce l&apos;imparzialità, l&apos;indipendenza e l&apos;accuratezza legale del rapporto di prova emesso ad ogni effetto di legge.
                      </span>
                    )}
                  </div>
                )}

                {/* SEZIONE TOTALI PREVENTIVATI */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
                  <div className="text-[10px] text-slate-450 space-y-1 max-w-sm">
                    <p className="m-0 italic font-medium">
                      * I prezzi indicati sono al netto di I.V.A. (22%).<br />
                      * Biochem Analytical garantisce che le attività analitiche saranno eseguite in conformità con i requisiti previsti dalle procedure di qualità accreditate.
                    </p>
                    {hasAccredia && (
                      <p className="m-0 text-emerald-800 font-bold pt-1 uppercase text-[8px] tracking-wide">
                        🛡️ Sotto tutela di Accreditamento ACCREDIA n. 1234 L.
                      </p>
                    )}
                  </div>

                  <div className="w-full sm:w-72 bg-slate-50/60 border border-slate-200 p-4 rounded-2xl space-y-2">
                    {prev.scontoPercentuale ? (
                      <>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Imponibile Lordo:</span>
                          <span className="font-mono">€{(prev.totale / (1 - prev.scontoPercentuale / 100)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-rose-600 font-semibold bg-rose-50/80 px-1.5 py-0.5 rounded border border-rose-100">
                          <span>Sconto ({prev.scontoPercentuale}%):</span>
                          <span className="font-mono">-€{((prev.totale / (1 - prev.scontoPercentuale / 100)) - prev.totale).toFixed(2)}</span>
                        </div>
                      </>
                    ) : null}
                    <div className="flex justify-between text-xs text-slate-705 font-bold">
                      <span>Imponibile Netto:</span>
                      <span className="font-mono">€{taxableAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>I.V.A. (22%):</span>
                      <span className="font-mono">€{vatAmount.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-250 pt-2 flex justify-between text-sm font-black text-slate-900 bg-slate-100/60 -mx-4 -mb-4 p-4 rounded-b-2xl">
                      <span>TOTALE CON IVA:</span>
                      <span className="font-mono text-base">€{totalWithVat.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* TERMINI ED AREA FIRME (ORGANIZZAZIONE COMPLETA ED ELEGANTE) */}
                <div className="pt-6 border-t border-slate-200 text-xs text-slate-800 space-y-4">
                  {(() => {
                    const activeConditionsList = filterActiveConditions(prev);

                    if (activeConditionsList.length === 0) return null;

                    let standardIndex = 1;
                    const renderedItems = activeConditionsList.map(item => {
                      let displayId: string;
                      let bgClass = "bg-slate-100 text-slate-700";
                      if (item.isBadge) {
                        displayId = item.defaultId as string;
                        bgClass = item.bg || "";
                      } else {
                        displayId = String(standardIndex++);
                      }
                      return { ...item, displayId, bgClass };
                    });

                    const midpoint = Math.ceil(renderedItems.length / 2);
                    const leftColItems = renderedItems.slice(0, midpoint);
                    const rightColItems = renderedItems.slice(midpoint);

                    return (
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-150 space-y-3">
                        <strong className="font-black text-slate-900 block uppercase tracking-wider text-[10px] pb-1.5 border-b border-slate-200">
                          Modalità, Clausole e Condizioni Generali di Fornitura
                        </strong>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-[10px] text-slate-600 font-semibold leading-relaxed">
                          {/* Colonna 1 */}
                          <div className="space-y-3">
                            {leftColItems.map(item => (
                              <div key={item.key} className="flex items-start gap-2">
                                <span className={`w-5 h-5 rounded-full ${item.bgClass} flex items-center justify-center font-black text-[9px] shrink-0 mt-0.5`}>
                                  {item.displayId}
                                </span>
                                <div>
                                  <span className="text-slate-900 font-extrabold uppercase text-[8.5px] tracking-wider block">{item.label}:</span>
                                  <div className="whitespace-pre-line text-slate-600 mt-0.5 leading-relaxed">{item.text}</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Colonna 2 */}
                          <div className="space-y-3">
                            {rightColItems.map(item => (
                              <div key={item.key} className="flex items-start gap-2">
                                <span className={`w-5 h-5 rounded-full ${item.bgClass} flex items-center justify-center font-black text-[9px] shrink-0 mt-0.5`}>
                                  {item.displayId}
                                </span>
                                <div>
                                  <span className="text-slate-900 font-extrabold uppercase text-[8.5px] tracking-wider block">{item.label}:</span>
                                  <div className="whitespace-pre-line text-slate-600 mt-0.5 leading-relaxed">{item.text}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                  <p className="m-0 pt-2 text-[9px] text-slate-400 border-t border-slate-200/50 mt-2 italic text-center font-medium">
                    Per accettazione si prega di restituire copia timbrata e firmata della presente proposta di preventivo.
                  </p>

                  {/* Firme per accettazione */}
                  <div className="flex justify-between items-baseline gap-8 text-center pt-4">
                    <div className="flex-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block mb-12">Per Accettazione (Il Cliente)</span>
                      <div className="border-b border-dashed border-slate-300 w-full inline-block"></div>
                      <span className="text-[9px] text-slate-400 mt-1 block font-medium">Timbro e Firma Legale</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block mb-12">Biochem Analytical S.r.l.</span>
                      <div className="border-b border-dashed border-slate-300 w-full inline-block"></div>
                      <span className="text-[9px] text-emerald-800 font-bold mt-1 block font-semibold">Direzione di Laboratorio</span>
                    </div>
                  </div>
                </div>

                {/* INFORMATIVA PRIVACY INTEGRATA */}
                {defaultIncludePrivacy && (prev.privacyText || defaultPrivacyText) && (
                  <div className="pt-8 border-t border-slate-300 mt-8 break-before-page">
                    <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3 mb-5">
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest m-0 flex items-center gap-2">
                          <span>🛡️ INFORMATIVA PRIVACY</span>
                        </h3>
                        <p className="text-[10px] text-blue-800 font-extrabold tracking-wide uppercase m-0 mt-0.5">
                          Trattamento dei Dati Personali (Reg. UE 2016/679 - GDPR)
                        </p>
                      </div>
                      <div className="text-right text-[8.5px] text-slate-500 font-mono leading-relaxed">
                        <div className="text-[9.5px] text-slate-850 font-extrabold uppercase tracking-wide mb-0.5 font-mono">
                          REG. UE 2016/679 (GDPR)
                        </div>
                        Riferimento Preventivo: <strong>{prev.codice}</strong><br />
                        Data d&apos;Emissione: {formatDateItalianFullMonth(prev.dataCreazione)}<br />
                        Cliente Committente: {client?.denominazione}
                      </div>
                    </div>

                    {/* Layout a due colonne per l'informativa sulla privacy, proprio come un contratto professionale */}
                    <div className="text-[8.5px] text-slate-655 text-justify font-sans leading-normal mb-6" style={{ columnCount: 2, columnGap: '24px' }}>
                      {(prev.privacyText || defaultPrivacyText).split('\n').map((paragraph, idx) => {
                        if (!paragraph.trim()) return null;
                        return (
                          <p key={idx} className="mb-2 break-inside-avoid">
                            {paragraph}
                          </p>
                        );
                      })}
                    </div>
                    
                    {/* Area di Consenso Privacy Sottoscritta */}
                    <div className="grid grid-cols-2 gap-8 pt-6 mt-6 border-t border-slate-200 border-dashed text-center break-inside-avoid">
                      <div className="text-left flex items-start gap-2 max-w-[95%] leading-normal text-[8px] text-slate-500">
                        <span className="inline-block w-3.5 h-3.5 border border-slate-400 rounded-sm bg-white mt-0.5 shrink-0 flex items-center justify-center font-bold text-slate-800 text-[9px]"></span>
                        <span>
                          Il Cliente Committente dichiara di aver ricevuto, letto e pienamente compreso l&apos;informativa soprastante e acconsente espressamente al trattamento dei dati personali forniti per le finalità connesse all&apos;esecuzione del presente mandato.
                        </span>
                      </div>
                      <div>
                        <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-450 block mb-12">Firma Consenso GDPR del Cliente</span>
                        <div className="border-b border-dashed border-slate-300 w-full inline-block"></div>
                        <span className="text-[8px] text-slate-400 mt-1 block font-medium">Per Accettazione ed Espresso Consenso</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ALLEGATO CONDIZIONI GENERALI DI CONTRATTO (PAGINA INTEGRATIVA DI STAMPA) */}
                {defaultIncludeContract && (prev.contractText || defaultContractText) && (
                  <div className="pt-8 border-t border-slate-300 mt-8 break-before-page">
                    <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3 mb-5">
                      <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest m-0 flex items-center gap-2">
                          <span>📄 ALLEGATO CONTRATTUALE</span>
                        </h3>
                        <p className="text-[10px] text-blue-800 font-extrabold tracking-wide uppercase m-0 mt-0.5">
                          {prev.contractModelName || defaultContractModelName}
                        </p>
                      </div>
                      <div className="text-right text-[8.5px] text-slate-500 font-mono leading-relaxed">
                        <div className="text-[9.5px] text-slate-850 font-extrabold uppercase tracking-wide mb-0.5 font-mono">
                          {prev.contractModelCode || defaultContractModelCode}
                        </div>
                        Riferimento Preventivo: <strong>{prev.codice}</strong><br />
                        Data d&apos;Emissione: {formatDateItalianFullMonth(prev.dataCreazione)}<br />
                        Cliente Committente: {client?.denominazione}
                      </div>
                    </div>

                    {/* Layout a due colonne per condizioni generali, proprio come i contratti ufficiali professionali */}
                    <div className="text-[8.5px] text-slate-655 text-justify font-sans leading-normal mb-6" style={{ columnCount: 2, columnGap: '24px' }}>
                      {(prev.contractText || defaultContractText).split('\n').map((paragraph, idx) => {
                        if (!paragraph.trim()) return null;
                        return (
                          <p key={idx} className="mb-2 break-inside-avoid">
                            {paragraph}
                          </p>
                        );
                      })}
                    </div>
                    
                    {/* Doppia Sottoscrizione Specifica Clausole Vessatorie (Art. 1341-1342 C.C.) - FONDAMENTALE IN ITALIA */}
                    <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[8px] leading-relaxed break-inside-avoid">
                      <p className="font-extrabold text-slate-800 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <span>⚖️</span> Approvazione specifica delle clausole vessatorie (ai sensi degli artt. 1341 e 1342 c.c.)
                      </p>
                      <p className="text-slate-600 text-justify mb-3">
                        Il Cliente dichiara di aver preso visione, di aver attentamente esaminato e di approvare specificamente, con la sottoscrizione apposta a fianco, ai sensi e per gli effetti degli articoli 1341 e 1342 del Codice Civile italiano, le clausole contenute nelle soprastanti Condizioni Generali di Contratto: <strong>Articolo 2 (Limitazione di responsabilità e importo massimo di risarcimento civile)</strong> e <strong>Articolo 5 (Pattuizione del Foro competente ed esclusivo per ogni controversia giudiziaria)</strong>.
                      </p>
                      <div className="flex justify-end">
                        <div className="w-[45%] text-center border-t border-dashed border-slate-350 pt-1.5 mt-4">
                          <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-450 block">Firma per Approvazione Specifica del Cliente</span>
                        </div>
                      </div>
                    </div>

                    {/* Area di Sottoscrizione Principale dell'Allegato */}
                    <div className="grid grid-cols-2 gap-8 pt-6 mt-6 border-t border-slate-200 border-dashed text-center break-inside-avoid">
                      <div>
                        <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-450 block mb-12">Il Cliente Committente (Timbro e Firma)</span>
                        <div className="border-b border-dashed border-slate-300 w-full inline-block"></div>
                        <span className="text-[8px] text-slate-400 mt-1 block font-medium">Per Accettazione e Sottoscrizione delle Condizioni Generali</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-450 block mb-12">Laboratorio Biochem Analytical S.r.l.</span>
                        <div className="border-b border-dashed border-slate-300 w-full inline-block"></div>
                        <span className="text-[8px] text-emerald-800 font-extrabold mt-1 block">La Direzione</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Selettore Tab Superiore */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1.5 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => { setActiveTab('preventivi'); setShowAddQuote(false); setShowAddPackage(false); }}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'preventivi'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="h-4 w-4 text-blue-500" />
            Preventivi Emessi
          </button>
          <button
            onClick={() => { setActiveTab('pacchetti'); setShowAddQuote(false); setShowAddPackage(false); }}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'pacchetti'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="h-4 w-4 text-purple-500" />
            Pacchetti Analisi
          </button>
          <button
            onClick={() => { setActiveTab('condizioni'); setShowAddQuote(false); setShowAddPackage(false); }}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'condizioni'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="h-4 w-4 text-emerald-500" />
            Modalità e Condizioni
          </button>
        </div>

         {activeTab === 'preventivi' ? (
          <button
            onClick={() => {
              const defId = clients[0]?.id || '';
              setQuoteClienteId(defId);
              const defC = clients.find(c => c.id === defId);
              setClientSearchText(defC ? defC.denominazione : '');
              setIsClientDropdownOpen(false);
              setShowAddQuote(true);
            }}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg px-4 py-2 flex items-center justify-center gap-1.5 transition shadow select-none"
            id="btn-new-preventivo"
          >
            <Plus className="h-4 w-4" /> Componi Preventivo
          </button>
        ) : activeTab === 'pacchetti' ? (
          <button
            onClick={() => setShowAddPackage(true)}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg px-4 py-2 flex items-center justify-center gap-1.5 transition shadow select-none"
            id="btn-new-pacchetto"
          >
            <Plus className="h-4 w-4" /> Crea Pacchetto Standard
          </button>
        ) : (
          <div className="text-xs text-slate-400 font-semibold italic bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
            ⚙️ Personalizzazione modelli e clausole commerciali
          </div>
        )}
      </div>

      {/* Sezione Contenuto */}
      <AnimatePresence mode="wait">
        
        {/* FORM REGISTRAZIONE / COMPILAZIONE PREVENTIVO */}
        {showAddQuote && activeTab === 'preventivi' ? (
          <motion.div
            key="add-quote"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-md grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Colonna Sinistra del Form: Scelta Cliente e Prodotti */}
            <div className="lg:col-span-7 space-y-4">
              <div className="pb-3 border-b border-slate-100 flex justify-between items-center">
                <h4 className="font-extrabold text-slate-800">
                  {editingPreventivo ? `Modifica Preventivo: ${editingPreventivo.codice}` : 'Composizione Guidata Preventivo Analitico'}
                </h4>
                <button
                  onClick={() => {
                    setShowAddQuote(false);
                    setEditingPreventivo(null);
                    setQuoteClienteId(clients[0]?.id || '');
                    const defC = clients.find(c => c.id === (clients[0]?.id || ''));
                    setClientSearchText(defC ? defC.denominazione : '');
                    setIsClientDropdownOpen(false);
                    setQuoteNotes('');
                    setQuoteQualityNote('');
                    setQuoteDiscount(0);
                    setNascondiPrezziSingoli(false);
                    setSelectedQuoteProve([]);
                    setSelectedQuotePacchetti([]);
                    setQuoteValidita('90 Giorni');
                    setQuoteOggetto(defaultQuoteOggetto);
                    setQuoteModalita(defaultQuoteModalita);
                    setQuoteNoteQualitaAccredia(defaultQuoteNoteQualitaAccredia);
                    setQuoteMaterialiCampionamento(defaultQuoteMaterialiCampionamento);
                    setQuoteNoteAccettazione(defaultQuoteNoteAccettazione);
                    setQuoteAltro(defaultQuoteAltro);
                    setQuoteDestinatarioFinale('');
                    setDestinatarioSearchText('');
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  Indietro alla lista
                </button>
              </div>

              {/* Box Cliente */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Cliente Committente
                </label>
                
                <div className="relative">
                  <div className="flex gap-1 items-center">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={clientSearchText}
                        onChange={(e) => {
                          setClientSearchText(e.target.value);
                          setIsClientDropdownOpen(true);
                          if (!e.target.value.trim()) {
                            setQuoteClienteId('');
                          }
                        }}
                        onFocus={(e) => {
                          e.target.select();
                          setIsClientDropdownOpen(true);
                        }}
                        placeholder="Digita le iniziali o il nome per cercare il cliente..."
                        className="w-full pl-3 pr-16 py-2 text-sm border border-slate-200 rounded-lg bg-white font-bold text-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                      {clientSearchText && (
                        <button
                          type="button"
                          onClick={() => {
                            setClientSearchText('');
                            setQuoteClienteId('');
                            setIsClientDropdownOpen(true);
                          }}
                          className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer p-1 rounded-full hover:bg-slate-100"
                          title="Svuota selezione"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer p-1 rounded-full hover:bg-slate-100"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {isClientDropdownOpen && (
                    <>
                      {/* Backdrop per chiusura al click fuori */}
                      <div 
                        className="fixed inset-0 z-40 cursor-default" 
                        onClick={() => setIsClientDropdownOpen(false)} 
                      />
                      
                      <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 font-sans">
                        {(() => {
                          const selectedClient = clients.find(c => c.id === quoteClienteId);
                          const isExactMatch = selectedClient && clientSearchText === selectedClient.denominazione;
                          const query = isExactMatch ? "" : clientSearchText.toLowerCase().trim();
                          
                          const filtered = clients.filter(c => {
                            if (!query) return true;
                            return (
                              c.denominazione.toLowerCase().includes(query) ||
                              (c.nome && c.nome.toLowerCase().includes(query)) ||
                              (c.cognome && c.cognome.toLowerCase().includes(query)) ||
                              c.partitaIva.toLowerCase().includes(query)
                            );
                          });

                          // Ordina per dare priorità a chi inizia con le lettere digitate
                          if (query) {
                            filtered.sort((a, b) => {
                              const aDen = a.denominazione.toLowerCase();
                              const bDen = b.denominazione.toLowerCase();
                              const aStarts = aDen.startsWith(query);
                              const bStarts = bDen.startsWith(query);
                              if (aStarts && !bStarts) return -1;
                              if (!aStarts && bStarts) return 1;
                              return a.denominazione.localeCompare(b.denominazione);
                            });
                          } else {
                            filtered.sort((a, b) => a.denominazione.localeCompare(b.denominazione));
                          }

                          if (filtered.length === 0) {
                            return (
                              <div className="px-3 py-2.5 text-xs text-slate-500 italic text-center">
                                Nessun cliente trovato per "{clientSearchText}"
                              </div>
                            );
                          }

                          return filtered.map(c => {
                            const isSelected = c.id === quoteClienteId;
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setQuoteClienteId(c.id);
                                  setClientSearchText(c.denominazione);
                                  setIsClientDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 text-xs flex flex-col gap-0.5 hover:bg-blue-50 transition cursor-pointer border-b border-slate-50 last:border-0 ${
                                  isSelected ? 'bg-blue-50/70 border-l-2 border-l-blue-600 font-extrabold text-blue-900' : 'text-slate-700 font-medium'
                                }`}
                              >
                                <span className={`text-xs ${isSelected ? 'text-blue-950 font-black' : 'text-slate-950 font-bold'}`}>
                                  {c.denominazione}
                                </span>
                                {(c.nome || c.cognome) && (
                                  <span className="text-[10px] text-slate-500 font-medium italic">
                                    Referente: {c.nome || ''} {c.cognome || ''}
                                  </span>
                                )}
                                <span className="text-[9px] text-slate-400 font-mono">
                                  P.IVA: {c.partitaIva} {c.comune ? `| Comune: ${c.comune}` : ''}
                                </span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </>
                  )}
                </div>

                {(() => {
                  const selClient = clients.find(c => c.id === quoteClienteId);
                  if (!selClient) return null;
                  return (
                    <div className="mt-2.5 p-3 bg-emerald-50/15 border border-emerald-100 rounded-lg flex flex-col gap-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">
                          Dati Anagrafica Connessi
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">ID: {selClient.id}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-650 pt-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-400">Referente:</span>
                          <span className="text-slate-800 font-extrabold">
                            {selClient.nome || selClient.cognome ? `${selClient.nome || ''} ${selClient.cognome || ''}` : 'Nessuno'}
                          </span>
                        </div>
                        {selClient.email && (
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-semibold text-slate-400">Mail:</span>
                            <span className="text-blue-600 hover:underline truncate font-bold font-sans" title={selClient.email}>
                              {selClient.email}
                            </span>
                          </div>
                        )}
                        {selClient.telefono && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-400">Tel:</span>
                            <span className="text-slate-800 font-mono font-bold">{selClient.telefono}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 sm:col-span-2">
                          <span className="font-semibold text-slate-400">Sede:</span>
                          <span className="text-slate-700 font-medium truncate" title={`${selClient.indirizzo || ''} ${selClient.comune || ''}`}>
                            {selClient.indirizzo ? `${selClient.indirizzo}${selClient.comune ? `, ${selClient.comune}` : ''}` : 'Nessuna sede registrata'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Selettori rapidi prove con scelta categoria preventiva */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 p-2.5 bg-slate-50 border border-slate-150 rounded-lg">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase">
                      Filtra per Area/Categoria:
                    </label>
                    <p className="text-[10px] text-slate-400">Scegli la categoria prima di selezionare le prove</p>
                  </div>
                  <select
                    value={quoteCategoryFilter}
                    onChange={(e) => setQuoteCategoryFilter(e.target.value)}
                    className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-705 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer min-w-[200px]"
                  >
                    <option value="Tutte">📂 Tutte le Categorie ({prove.length})</option>
                    {Array.from(new Set(prove.map(p => p.categoriaMerceologica))).map(cat => (
                      <option key={cat} value={cat}>🔬 {cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <span className="block text-[11px] font-black text-slate-500 uppercase tracking-wide">
                    Cerca Parametri Analitici:
                  </span>
                  <div className="relative min-w-[240px]">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-slate-400 pointer-events-none">
                      <Search className="h-3 w-3" />
                    </span>
                    <input
                      type="text"
                      placeholder="Cerca per nome, metodo..."
                      value={quoteSearchTerm}
                      onChange={(e) => setQuoteSearchTerm(e.target.value)}
                      className="w-full pl-7.5 pr-7 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold text-slate-705 placeholder-slate-400"
                    />
                    {quoteSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setQuoteSearchTerm('')}
                        className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-650 font-bold cursor-pointer text-[10px]"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <span className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Aggiungi Prove Analitiche Individuali
                </span>
                <div className="max-h-48 overflow-y-auto border border-slate-150 rounded-lg p-2 bg-slate-50/50 space-y-1">
                  {prove
                    .filter(pr => quoteCategoryFilter === 'Tutte' || pr.categoriaMerceologica === quoteCategoryFilter)
                    .filter(pr => {
                      if (!quoteSearchTerm) return true;
                      const term = quoteSearchTerm.toLowerCase();
                      return (
                        pr.nome.toLowerCase().includes(term) ||
                        (pr.metodoAnalitico && pr.metodoAnalitico.toLowerCase().includes(term)) ||
                        pr.categoriaMerceologica.toLowerCase().includes(term)
                      );
                    })
                    .map(pr => (
                      <div
                        key={pr.id}
                        onClick={() => handleAddProvaToQuote(pr.id)}
                        className={`flex justify-between items-center p-2 rounded hover:bg-white border cursor-pointer transition text-xs ${
                          pr.accreditataAccredia 
                            ? 'border-emerald-100/50 hover:border-emerald-250 bg-emerald-50/15' 
                            : 'border-transparent hover:border-slate-100'
                        }`}
                      >
                        <div className="font-semibold text-slate-705 flex items-center gap-1.5">
                          {pr.nome}
                          {pr.accreditataAccredia && (
                            <span className="px-1.5 py-0.2 bg-emerald-100/70 border border-emerald-300 text-emerald-800 rounded font-black text-[8px] uppercase tracking-wider" title="Metodo Accreditato ACCREDIA">
                              🛡️ Accredia
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono text-[10px]">({pr.categoriaMerceologica})</span>
                          <span className="text-emerald-700 font-bold">€{pr.prezzoListino.toFixed(2)}</span>
                          <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[9px] font-bold">+ Aggiungi</span>
                        </div>
                      </div>
                    ))}
                  {prove
                    .filter(pr => quoteCategoryFilter === 'Tutte' || pr.categoriaMerceologica === quoteCategoryFilter)
                    .filter(pr => {
                      if (!quoteSearchTerm) return true;
                      const term = quoteSearchTerm.toLowerCase();
                      return (
                        pr.nome.toLowerCase().includes(term) ||
                        (pr.metodoAnalitico && pr.metodoAnalitico.toLowerCase().includes(term)) ||
                        pr.categoriaMerceologica.toLowerCase().includes(term)
                      );
                    }).length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                      ❌ Nessuna prova analitica corrispondente ai filtri o alle parole cercate.
                    </div>
                  )}
                </div>
              </div>

              {/* Selettori rapidi pacchetti */}
              {pacchetti.length > 0 && (
                <div>
                  <span className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    Oppure Seleziona un Pacchetto Preformato (Scontato)
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {pacchetti.map(pa => (
                      <div
                        key={pa.id}
                        onClick={() => handleAddPacchettoToQuote(pa.id)}
                        className="bg-purple-50/40 hover:bg-purple-50/90 border border-purple-100 rounded-lg p-3 cursor-pointer transition text-xs flex justify-between items-center"
                      >
                        <div>
                          <div className="font-bold text-purple-950">{pa.nome}</div>
                          <div className="text-[10px] text-purple-600 mt-1">{pa.proveIds.length} prove incluse</div>
                        </div>
                        <div className="text-right">
                          <div className="font-extrabold text-purple-800">€{pa.prezzoScontato.toFixed(2)}</div>
                          <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded font-bold">Aggiungi</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Note specifiche per il preventivo (es. sconti extra, tempistiche di consegna campioni)
                </label>
                <textarea
                  rows={2}
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder="Scrivi qui eventuali condizioni speciali concordate..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white font-medium text-slate-700"
                ></textarea>
              </div>

            </div>

            {/* Colonna Destra del Form: Carrello dinamico / Calcolo totale */}
            <div className="lg:col-span-5 bg-slate-50 p-4 rounded-xl border border-slate-150 flex flex-col justify-between">
              <div>
                <h5 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <Calculator className="h-4 w-4 text-blue-500" />
                  Riepilogo Costi Calcolati
                </h5>

                {/* Lista carrello prove */}
                {selectedQuoteProve.length === 0 && selectedQuotePacchetti.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 text-xs">
                    Nessun servizio selezionato. Fai click sulle prove o sui pacchetti a sinistra per popolare il preventivo.
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                    {/* Prove nel carrello */}
                    {selectedQuoteProve.map(item => {
                      const info = getProvaInfo(item.provaId);
                      return (
                        <div key={item.provaId} className={`p-2.5 rounded-lg border shadow-sm text-xs space-y-2 ${
                          info?.accreditataAccredia 
                            ? 'bg-emerald-50/15 border-emerald-150 shadow-emerald-50/10' 
                            : 'bg-white border-slate-150'
                        }`}>
                          <div className="flex justify-between font-bold text-slate-700">
                            <span className="truncate max-w-[200px] flex items-center gap-1.5">
                              {info?.nome || 'Prova'}
                              {info?.accreditataAccredia && (
                                <span className="px-1.5 py-0.2 bg-emerald-100/70 text-emerald-800 text-[8px] rounded font-black tracking-wider uppercase border border-emerald-250">
                                  🛡️ Accredia
                                </span>
                              )}
                            </span>
                            <button
                              onClick={() => handleRemoveProvaFromQuote(item.provaId)}
                              className="text-red-500 hover:text-red-700 font-bold"
                            >
                              ×
                            </button>
                          </div>
                          <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400">Q.ta campioni:</span>
                              <input
                                type="number"
                                min="1"
                                value={item.quantita}
                                onChange={(e) => handleUpdateProvaQty(item.provaId, parseInt(e.target.value) || 1)}
                                className="w-10 text-center border rounded bg-slate-50 text-xs font-bold leading-tight"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400">Prezzo cad:</span>
                              <input
                                type="number"
                                step="0.5"
                                value={item.prezzoApplicato}
                                onChange={(e) => handleUpdateProvaPrice(item.provaId, parseFloat(e.target.value) || 0)}
                                className="w-16 text-center border rounded bg-slate-50 text-xs font-bold leading-tight"
                              />
                            </div>
                          </div>

                          {/* Gestione Limiti Selezionati per Prova nel Preventivo */}
                          <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-[11px] space-y-1.5">
                            <div className="flex justify-between items-center font-bold text-slate-500 text-[9.5px] uppercase tracking-wider">
                              <span>⚖️ Limiti di Riferimento ({item.limitiSelezionati?.length || 0})</span>
                              <div className="flex gap-1">
                                {info?.limitiRiferimento && info.limitiRiferimento.length > 0 && (
                                  <select
                                    onChange={(e) => {
                                      const picked = info.limitiRiferimento?.find(l => l.id === e.target.value);
                                      if (picked) handleAddLimiteToProva(item.provaId, picked);
                                      e.target.value = "";
                                    }}
                                    className="bg-slate-150 hover:bg-slate-200 text-slate-700 border border-slate-350 text-[9px] font-bold px-1 py-0.5 rounded focus:outline-none"
                                  >
                                    <option value="">+ Predefinito</option>
                                    {info.limitiRiferimento.map(lim => (
                                      <option key={lim.id} value={lim.id}>
                                        {lim.valore} {lim.unitaMisura} - {lim.norma.substring(0, 15)}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>

                            {item.limitiSelezionati && item.limitiSelezionati.length > 0 && (
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1 bg-slate-50 p-2 rounded border border-slate-150">
                                {item.limitiSelezionati.map((limSel) => (
                                  <div key={limSel.id} className="grid grid-cols-12 gap-1 items-center bg-white p-1.5 rounded border border-slate-200 relative group shadow-3xs">
                                    <div className="col-span-3">
                                      <input
                                        type="text"
                                        value={limSel.valore}
                                        onChange={(e) => handleUpdateLimiteOfProva(item.provaId, limSel.id, { valore: e.target.value })}
                                        placeholder="Limite"
                                        className="w-full text-[10px] font-bold border border-slate-200 rounded px-1 py-0.5 bg-slate-50 text-slate-800 focus:bg-white"
                                        title="Valore Limite"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <input
                                        type="text"
                                        value={limSel.unitaMisura}
                                        onChange={(e) => handleUpdateLimiteOfProva(item.provaId, limSel.id, { unitaMisura: e.target.value })}
                                        placeholder="U.M."
                                        className="w-full text-[9px] border border-slate-200 rounded px-0.5 py-0.5 bg-slate-50 focus:bg-white text-center"
                                        title="Unità di Misura"
                                      />
                                    </div>
                                    <div className="col-span-6">
                                      <input
                                        type="text"
                                        value={limSel.norma}
                                        onChange={(e) => handleUpdateLimiteOfProva(item.provaId, limSel.id, { norma: e.target.value })}
                                        placeholder="Norma/Riferimento"
                                        className="w-full text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-slate-50 focus:bg-white text-slate-700 font-semibold"
                                        title="Riferimento Legale/Capitolato"
                                      />
                                    </div>
                                    <div className="col-span-1 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveLimiteFromProva(item.provaId, limSel.id)}
                                        className="text-slate-400 hover:text-red-500 font-bold"
                                        title="Rimuovi"
                                      >
                                        ×
                                      </button>
                                    </div>
                                    <div className="col-span-12 mt-1">
                                      <input
                                        type="text"
                                        value={limSel.note || ''}
                                        onChange={(e) => handleUpdateLimiteOfProva(item.provaId, limSel.id, { note: e.target.value })}
                                        placeholder="Note / Condizioni applicabilità..."
                                        className="w-full text-[9px] italic border-none bg-transparent hover:bg-slate-50 px-1 py-0.2 focus:bg-white text-slate-400 focus:outline-none"
                                        title="Note / Condizioni"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Pacchetti nel carrello */}
                    {selectedQuotePacchetti.map(item => {
                      const info = getPacchettoInfo(item.pacchettoId);
                      return (
                        <div key={item.pacchettoId} className="bg-purple-50/50 p-2.5 rounded-lg border border-purple-150 text-xs space-y-2">
                          <div className="flex justify-between font-bold text-purple-950">
                            <span className="truncate max-w-[200px]">{info?.nome || 'Pacchetto'}</span>
                            <button
                              onClick={() => handleRemovePacchettoFromQuote(item.pacchettoId)}
                              className="text-purple-600 hover:text-purple-900 font-bold"
                            >
                              ×
                            </button>
                          </div>
                          <div className="flex justify-between items-center pt-1.5 border-t border-purple-100 text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-purple-700">Q.ta:</span>
                              <input
                                type="number"
                                min="1"
                                value={item.quantita}
                                onChange={(e) => handleUpdatePacchettoQty(item.pacchettoId, parseInt(e.target.value) || 1)}
                                className="w-10 text-center border rounded bg-white text-xs font-bold leading-tight"
                              />
                            </div>
                            <div className="text-right">
                              <span className="text-slate-400 mr-2">Totale pacchetto:</span>
                              <span className="font-extrabold text-purple-900">€{(item.quantita * item.prezzoApplicato).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Box Calcolatore Finale delle tasse ed invio */}
              <div className="mt-4 pt-3 border-t border-slate-200 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase">Totale Imponibile:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    €{calcolaImponibileQuote().toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Sconto Input */}
                <div className="flex items-center justify-between gap-4 bg-slate-100/60 p-2.5 rounded-lg border border-slate-150 text-xs">
                  <span className="font-bold text-slate-600 flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5 text-blue-500" /> Sconto Cliente (%):
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={quoteDiscount || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setQuoteDiscount(isNaN(val) ? 0 : Math.max(0, Math.min(100, val)));
                      }}
                      className="w-14 px-1.5 py-1 text-center bg-white border border-slate-250 rounded font-bold text-slate-700 font-sans text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="font-bold text-slate-500">%</span>
                  </div>
                </div>

                {/* Opzione nascondi prezzi singole prove (se prove > 1) */}
                {selectedQuoteProve.length > 1 && (
                  <div className="flex items-center justify-between gap-4 bg-slate-105 p-2.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
                    <span className="font-bold text-slate-600 flex items-center gap-1.5">
                      <EyeOff className="h-3.5 w-3.5 text-indigo-505" /> Nascondi costi singoli prove:
                    </span>
                    <input
                      type="checkbox"
                      checked={nascondiPrezziSingoli}
                      onChange={(e) => setNascondiPrezziSingoli(e.target.checked)}
                      className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                    />
                  </div>
                )}

                {quoteDiscount > 0 && (
                  <div className="flex justify-between items-center text-xs text-rose-600 font-bold px-1">
                    <span>Valore Sconto ({quoteDiscount}%):</span>
                    <span>
                      -€{((calcolaImponibileQuote() * quoteDiscount) / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="font-extrabold text-slate-700 text-xs uppercase">Importo Netto Finale:</span>
                  <span className="font-black text-lg text-slate-900 font-mono">
                    €{calcolaTotalePreventivo().toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddQuote(false);
                      setEditingPreventivo(null);
                      setQuoteClienteId(clients[0]?.id || '');
                      setQuoteNotes('');
                      setQuoteQualityNote('');
                      setQuoteDiscount(0);
                      setNascondiPrezziSingoli(false);
                      setSelectedQuoteProve([]);
                      setSelectedQuotePacchetti([]);
                      setQuoteValidita('90 Giorni');
                      setQuoteOggetto(defaultQuoteOggetto);
                      setQuoteModalita(defaultQuoteModalita);
                      setQuoteNoteQualitaAccredia(defaultQuoteNoteQualitaAccredia);
                      setQuoteMaterialiCampionamento(defaultQuoteMaterialiCampionamento);
                      setQuoteNoteAccettazione(defaultQuoteNoteAccettazione);
                      setQuoteAltro(defaultQuoteAltro);
                      setQuoteDestinatarioFinale('');
                      setDestinatarioSearchText('');
                      setQuoteTitoloModulo(defaultTitoloModulo);
                      setQuoteIncludePrivacy(defaultIncludePrivacy);
                      setQuotePrivacyText(defaultPrivacyText);
                      setQuoteIncludeContract(defaultIncludeContract);
                      setQuoteContractText(defaultContractText);
                    }}
                    className="py-2 border border-slate-300 text-slate-600 rounded-lg text-xs font-bold transition hover:bg-white cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitQuote}
                    className="py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow cursor-pointer"
                    id="btn-registra-preventivo"
                  >
                    {editingPreventivo ? 'Salva Modifiche' : 'Emetti ed Invia'}
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        ) : showAddPackage && activeTab === 'pacchetti' ? (
          /* FORM CREAZIONE NUOVO PACCHETTO STANDARD */
          <motion.div
            key="add-package"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-md max-w-2xl mx-auto"
          >
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-800">
                {editingPacchetto ? `Modifica Pacchetto Standard: ${editingPacchetto.nome}` : 'Crea un Nuovo Pacchetto Analitico Standard'}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowAddPackage(false);
                  setEditingPacchetto(null);
                  setPackageName('');
                  setPackageDesc('');
                  setSelectedPackProve([]);
                  setPackagePrice('');
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Annulla
              </button>
            </div>

            <form onSubmit={handleSubmitPackage} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-bold uppercase mb-1">Nome Pacchetto Commerciale *</label>
                <input
                  type="text"
                  required
                  placeholder="es. Analisi Completa Terreni Agrari"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold uppercase mb-1">Descrizione Pacchetto</label>
                <textarea
                  rows={2}
                  placeholder="Seleziona questo pacchetto per determinare i nutrienti principali dei terreni dei coltivatori..."
                  value={packageDesc}
                  onChange={(e) => setPackageDesc(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Categoria Merceologica Correlata</label>
                  <select
                    value={packageCategory}
                    onChange={(e) => setPackageCategory(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    {(() => {
                      const categoriesFromProve = Array.from(new Set(prove.map(p => p.categoriaMerceologica).filter(Boolean)));
                      const finalCategories = categoriesFromProve.length > 0 
                        ? categoriesFromProve 
                        : ["Oli e Grassi", "Vini ed Aceti", "Cereali e Farine", "Allergeni e Tracce", "Terreni e Acque rurale"];
                      return finalCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ));
                    })()}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold uppercase mb-1">Prezzo Forfettario Scontato (€) *</label>
                  <input
                    type="number"
                    required
                    placeholder="Valore complessivo scontato"
                    value={packagePrice}
                    onChange={(e) => setPackagePrice(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Lista di prove registrate per la spunta multi-selettore */}
              <div>
                <label className="block text-slate-600 font-bold uppercase mb-2">Seleziona quali prove fanno parte del pacchetto *</label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50 space-y-1.5">
                  {prove.map(p => {
                    const selected = selectedPackProve.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer py-1 hover:bg-white px-2 rounded">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            if (selected) {
                              setSelectedPackProve(selectedPackProve.filter(id => id !== p.id));
                            } else {
                              setSelectedPackProve([...selectedPackProve, p.id]);
                            }
                          }}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="text-xs">
                          <span className="font-semibold text-slate-700">{p.nome}</span>
                          <span className="text-[10px] text-slate-400 ml-1">({p.metodoAnalitico}) - €{p.prezzoListino}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPackage(false);
                    setEditingPacchetto(null);
                    setPackageName('');
                    setPackageDesc('');
                    setSelectedPackProve([]);
                    setPackagePrice('');
                  }}
                  className="px-4 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition"
                  id="submit-new-package"
                >
                  {editingPacchetto ? 'Salva Modifiche Pacchetto' : 'Registra Pacchetto Commerciale'}
                </button>
              </div>

            </form>
          </motion.div>
        ) : (
          /* VISUALIZZAZIONE TABELLE standard */
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {activeTab === 'preventivi' ? (
              /* TABELLA PREVENTIVI */
              <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden p-5">
                <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex justify-between items-center">
                  <span>Archivio Storico Preventivi Elaborati</span>
                  <span className="text-xs font-mono lowercase text-slate-400">fai clic sullo stato per modificarlo rapidamente</span>
                </h4>

                {/* Pannello Ricerca e Filtri (Richiesta Utente) */}
                <div className="bg-slate-50 border border-slate-150/80 rounded-xl p-4.5 mb-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      🔎 Filtri di Ricerca ed Ordinamento Preventivi
                    </span>
                    {(prevSearchQuery || prevStatusFilter !== 'Tutti' || prevValidityFilter !== 'Tutti' || prevDateFrom || prevDateTo || prevSortBy !== 'data-desc') && (
                      <button
                        onClick={() => {
                          setPrevSearchQuery('');
                          setPrevStatusFilter('Tutti');
                          setPrevValidityFilter('Tutti');
                          setPrevDateFrom('');
                          setPrevDateTo('');
                          setPrevSortBy('data-desc');
                        }}
                        className="text-[10px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-150 px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer self-start md:self-auto"
                      >
                        Reset Filtri ↩
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
                    {/* Barra Ricerca Cliente / Codice */}
                    <div className="sm:col-span-2 md:col-span-3 relative">
                      <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Cerca Cliente o Codice</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={prevSearchQuery}
                          onChange={(e) => setPrevSearchQuery(e.target.value)}
                          placeholder="Digita P.IVA, cliente o codice..."
                          className="w-full text-xs font-bold pl-8.5 pr-7 py-1.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg outline-none placeholder-slate-400 text-slate-805"
                        />
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        {prevSearchQuery && (
                          <button
                            onClick={() => setPrevSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 font-black cursor-pointer text-xs"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filtro per Stato */}
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Stato</label>
                      <select
                        value={prevStatusFilter}
                        onChange={(e) => setPrevStatusFilter(e.target.value)}
                        className="w-full text-xs font-bold p-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none text-slate-805 cursor-pointer"
                      >
                        <option value="Tutti">🟢 Tutti gli stati</option>
                        <option value="In Approvazione">⏳ In Approvazione</option>
                        <option value="Approvato">✅ Approvato</option>
                        <option value="Rifiutato">❌ Rifiutato</option>
                        <option value="Scaduto">⚠️ Scaduto</option>
                      </select>
                    </div>

                    {/* Filtro per Validità Offerta */}
                    <div className="md:col-span-2">
                      <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Validità Offerta</label>
                      <select
                        value={prevValidityFilter}
                        onChange={(e) => setPrevValidityFilter(e.target.value)}
                        className="w-full text-xs font-bold p-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none text-slate-805 cursor-pointer"
                      >
                        <option value="Tutti">⏱️ Qualsiasi scadenza</option>
                        <option value="Validi">⏳ Offerte Valide</option>
                        <option value="InScadenza">⚠️ In Scadenza (≤10 gg)</option>
                        <option value="Scaduti">❌ Offerte Scadute</option>
                      </select>
                    </div>

                    {/* Range Date - DA */}
                    <div className="md:col-span-1">
                      <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Dal</label>
                      <input
                        type="date"
                        value={prevDateFrom}
                        onChange={(e) => setPrevDateFrom(e.target.value)}
                        className="w-full text-xs font-bold p-1 bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none text-slate-855 cursor-pointer"
                      />
                    </div>

                    {/* Range Date - A */}
                    <div className="md:col-span-1">
                      <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Al</label>
                      <input
                        type="date"
                        value={prevDateTo}
                        onChange={(e) => setPrevDateTo(e.target.value)}
                        className="w-full text-xs font-bold p-1 bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none text-slate-855 cursor-pointer"
                      />
                    </div>

                    {/* Ordinamento */}
                    <div className="md:col-span-3">
                      <label className="block text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">Ordina per</label>
                      <select
                        value={prevSortBy}
                        onChange={(e) => setPrevSortBy(e.target.value)}
                        className="w-full text-xs font-bold p-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-lg outline-none text-slate-805 cursor-pointer"
                      >
                        <option value="data-desc">📅 Più recenti</option>
                        <option value="data-asc">📅 Meno recenti</option>
                        <option value="importo-desc">💰 Totale descrescente</option>
                        <option value="importo-asc">💰 Totale crescente</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Stats Riepilogative dei Preventivi Filtrati */}
                {preventivi.length > 0 && (
                  (() => {
                    const filteredQuotesLocal = (() => {
                      let result = [...preventivi];

                      // Search filter: client name, code, object, referente, or P.IVA
                      if (prevSearchQuery.trim()) {
                        const q = prevSearchQuery.toLowerCase().trim();
                        result = result.filter(prev => {
                          const clientName = getClienteName(prev.clienteId).toLowerCase();
                          const clientCode = prev.codice.toLowerCase();
                          const clientObj = (prev.oggettoOfferta || '').toLowerCase();
                          const clientDetails = clients.find(c => c.id === prev.clienteId);
                          const clientReferente = clientDetails 
                            ? `${clientDetails.nome || ''} ${clientDetails.cognome || ''}`.toLowerCase()
                            : '';
                          const clientPiva = clientDetails ? clientDetails.partitaIva.toLowerCase() : '';

                          return (
                            clientName.includes(q) ||
                            clientCode.includes(q) ||
                            clientObj.includes(q) ||
                            clientReferente.includes(q) ||
                            clientPiva.includes(q)
                          );
                        });
                      }

                      // Status filter
                      if (prevStatusFilter !== 'Tutti') {
                        result = result.filter(prev => prev.stato === prevStatusFilter);
                      }

                      // Date filter: Da
                      if (prevDateFrom) {
                        result = result.filter(prev => prev.dataCreazione >= prevDateFrom);
                      }

                      // Date filter: A
                      if (prevDateTo) {
                        result = result.filter(prev => prev.dataCreazione <= prevDateTo);
                      }

                      // Validity filter
                      if (prevValidityFilter !== 'Tutti') {
                        result = result.filter(prev => {
                          const vStatus = getOfferValidityStatus(prev.dataCreazione, prev.validitaOfferta);
                          if (prevValidityFilter === 'Validi') {
                            return !vStatus.expired;
                          } else if (prevValidityFilter === 'Scaduti') {
                            return vStatus.expired;
                          } else if (prevValidityFilter === 'InScadenza') {
                            return !vStatus.expired && vStatus.daysLeft <= 10;
                          }
                          return true;
                        });
                      }

                      return result;
                    })();

                    const filteredQuotesCount = filteredQuotesLocal.length;
                    const filteredTotalSum = filteredQuotesLocal.reduce((sum, p) => sum + p.totale, 0);
                    const approvedCount = filteredQuotesLocal.filter(p => p.stato === 'Approvato').length;
                    const filteredApprovatiSum = filteredQuotesLocal.filter(p => p.stato === 'Approvato').reduce((sum, p) => sum + p.totale, 0);
                    const pendingCount = filteredQuotesLocal.filter(p => p.stato === 'In Approvazione').length;
                    const filteredPendingSum = filteredQuotesLocal.filter(p => p.stato === 'In Approvazione').reduce((sum, p) => sum + p.totale, 0);

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 animate-fadeIn">
                        <div className="bg-slate-50/50 border border-slate-150 p-3 rounded-xl text-left">
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Documenti Filtrati</span>
                          <span className="text-base font-black text-slate-800 font-mono leading-none block mt-1">{filteredQuotesCount}</span>
                          <span className="text-[9.5px] font-medium text-slate-400 block mt-0.5">su {preventivi.length} totali</span>
                        </div>

                        <div className="bg-emerald-50/25 border border-emerald-100 p-3 rounded-xl text-left">
                          <span className="block text-[9px] font-black text-emerald-800/80 uppercase tracking-widest">Totale Approvato</span>
                          <span className="text-base font-black text-emerald-700 font-mono leading-none block mt-1">
                            €{filteredApprovatiSum.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9.5px] font-bold text-emerald-600 block mt-0.5">{approvedCount} preventivi</span>
                        </div>

                        <div className="bg-amber-50/25 border border-amber-100 p-3 rounded-xl text-left">
                          <span className="block text-[9px] font-black text-amber-800/80 uppercase tracking-widest">In Approvazione</span>
                          <span className="text-base font-black text-amber-700 font-mono leading-none block mt-1">
                            €{filteredPendingSum.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9.5px] font-bold text-amber-600 block mt-0.5">{pendingCount} in sospeso</span>
                        </div>

                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-left">
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Importo Totale Medio</span>
                          <span className="text-base font-black text-slate-900 font-mono leading-none block mt-1">
                            €{filteredTotalSum.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[9.5px] font-medium text-slate-400 block mt-0.5">Media: €{filteredQuotesCount > 0 ? (filteredTotalSum / filteredQuotesCount).toFixed(2) : '0'}</span>
                        </div>
                      </div>
                    );
                  })()
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider bg-slate-50/55 text-[10px]">
                        <th className="py-2.5 px-3">Codice</th>
                        <th className="py-2.5 px-3">Cliente</th>
                        <th className="py-2.5 px-3">Emissione e Validità</th>
                        <th className="py-2.5 px-3">Elementi Inclusi</th>
                        <th className="py-2.5 px-3 text-right">Totale Preventivato</th>
                        <th className="py-2.5 px-3 text-center">Stato</th>
                        <th className="py-2.5 px-3 text-center">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {preventivi.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-slate-400">
                            Nessun preventivo elaborato in archivio. Clicca su "Componi Preventivo" in alto.
                          </td>
                        </tr>
                      ) : (() => {
                        const filteredList = (() => {
                          let result = [...preventivi];

                          // Search filter: client, code, object, referente, or P.IVA
                          if (prevSearchQuery.trim()) {
                            const q = prevSearchQuery.toLowerCase().trim();
                            result = result.filter(prev => {
                              const clientName = getClienteName(prev.clienteId).toLowerCase();
                              const clientCode = prev.codice.toLowerCase();
                              const clientObj = (prev.oggettoOfferta || '').toLowerCase();
                              const clientDetails = clients.find(c => c.id === prev.clienteId);
                              const clientReferente = clientDetails 
                                ? `${clientDetails.nome || ''} ${clientDetails.cognome || ''}`.toLowerCase()
                                : '';
                              const clientPiva = clientDetails ? clientDetails.partitaIva.toLowerCase() : '';

                              return (
                                clientName.includes(q) ||
                                clientCode.includes(q) ||
                                clientObj.includes(q) ||
                                clientReferente.includes(q) ||
                                clientPiva.includes(q)
                              );
                            });
                          }

                          // Status Filter
                          if (prevStatusFilter !== 'Tutti') {
                            result = result.filter(prev => prev.stato === prevStatusFilter);
                          }

                          // Date filter: Da
                          if (prevDateFrom) {
                            result = result.filter(prev => prev.dataCreazione >= prevDateFrom);
                          }

                          // Date filter: A
                          if (prevDateTo) {
                            result = result.filter(prev => prev.dataCreazione <= prevDateTo);
                          }

                          // Validity state filter
                          if (prevValidityFilter !== 'Tutti') {
                            result = result.filter(prev => {
                              const vStatus = getOfferValidityStatus(prev.dataCreazione, prev.validitaOfferta);
                              if (prevValidityFilter === 'Validi') {
                                return !vStatus.expired;
                              } else if (prevValidityFilter === 'Scaduti') {
                                return vStatus.expired;
                              } else if (prevValidityFilter === 'InScadenza') {
                                return !vStatus.expired && vStatus.daysLeft <= 10;
                              }
                              return true;
                            });
                          }

                          // Sort logic
                          result.sort((a, b) => {
                            if (prevSortBy === 'data-desc') {
                              return b.dataCreazione.localeCompare(a.dataCreazione) || b.id.localeCompare(a.id);
                            }
                            if (prevSortBy === 'data-asc') {
                              return a.dataCreazione.localeCompare(b.dataCreazione) || a.id.localeCompare(b.id);
                            }
                            if (prevSortBy === 'importo-desc') {
                              return b.totale - a.totale;
                            }
                            if (prevSortBy === 'importo-asc') {
                              return a.totale - b.totale;
                            }
                            return 0;
                          });

                          return result;
                        })();

                        if (filteredList.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} className="text-center py-10 text-slate-400 font-semibold italic">
                                Nessun preventivo corrisponde ai filtri di ricerca impostati.
                              </td>
                            </tr>
                          );
                        }

                        return filteredList.map(prev => {
                          const totVoci = prev.proveSelezionate.length + prev.pacchettiSelezionati.length;
                          const isExpanded = expandedQuoteId === prev.id;
                          return (
                            <React.Fragment key={prev.id}>
                              <tr 
                                id={`quote-row-${prev.id}`}
                                className={`transition duration-300 border-b border-slate-100 ${
                                  selectedPreventivoId === prev.id 
                                    ? 'bg-amber-50/50 hover:bg-amber-100/50 ring-2 ring-amber-400 ring-offset-0' 
                                    : 'hover:bg-slate-50/50'
                                }`}
                              >
                                <td className="py-3 px-3">
                                  <button
                                    onClick={() => {
                                      setExpandedQuoteId(isExpanded ? null : prev.id);
                                      if (selectedPreventivoId) {
                                        onClearSelectedPreventivo?.();
                                      }
                                    }}
                                    className="font-mono font-bold text-slate-800 hover:text-blue-600 transition cursor-pointer text-left flex items-center gap-1.5 focus:outline-none"
                                    title="Clicca per mostrare/nascondere i dettagli"
                                  >
                                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                                    {prev.codice}
                                  </button>
                                </td>
                                <td className="py-3 px-3 font-semibold">{getClienteName(prev.clienteId)}</td>
                                <td className="py-3 px-3 text-slate-500 font-medium font-sans">
                                  {(() => {
                                    const status = getOfferValidityStatus(prev.dataCreazione, prev.validitaOfferta);
                                    const emissioneFormattata = formatDateItalianFullMonth(prev.dataCreazione);
                                    const scadenzaFormattata = formatDateItalianFullMonth(status.scadenzaFormattata);
                                    
                                    if (status.expired) {
                                      return (
                                        <div className="flex flex-col gap-0.5" title={`Data Scadenza: ${scadenzaFormattata} (Validità: ${prev.validitaOfferta || '90 Giorni'})`}>
                                          <span className="text-slate-400 line-through font-semibold">{emissioneFormattata}</span>
                                          <span className="text-[10px] font-black text-rose-750 bg-rose-50 border border-rose-200/80 px-1.5 py-0.5 rounded inline-flex items-center gap-1 w-fit mt-0.5 shadow-2xs">
                                            ⚠️ Offerta Scaduta
                                          </span>
                                          <span className="text-[9.5px] text-slate-400 font-mono mt-0.5">Scaduta il {scadenzaFormattata}</span>
                                        </div>
                                      );
                                    } else if (status.isToday) {
                                      return (
                                        <div className="flex flex-col gap-0.5" title={`Data Scadenza: ${scadenzaFormattata} (Validità: ${prev.validitaOfferta || '90 Giorni'})`}>
                                          <span className="text-slate-800 font-bold">{emissioneFormattata}</span>
                                          <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded inline-flex items-center gap-1 w-fit mt-0.5 animate-pulse shadow-2xs">
                                            ⏳ Scade OGGI!
                                          </span>
                                        </div>
                                      );
                                    } else {
                                      const isUrgent = status.daysLeft <= 10;
                                      const badgeColor = isUrgent 
                                        ? 'text-amber-700 bg-amber-50 border-amber-200/80' 
                                        : 'text-emerald-700 bg-emerald-50 border-emerald-200/80';
                                      return (
                                        <div className="flex flex-col gap-0.5" title={`Data Scadenza: ${scadenzaFormattata} (Validità: ${prev.validitaOfferta || '90 Giorni'})`}>
                                          <span className="text-slate-700 font-semibold">{emissioneFormattata}</span>
                                          <span className={`text-[10px] font-bold ${badgeColor} border px-1.5 py-0.5 rounded inline-flex items-center gap-1 w-fit mt-0.5 shadow-2xs`}>
                                            ⏳ {status.daysLeft} gg rimasti
                                          </span>
                                          <span className="text-[9.5px] text-slate-400 font-mono mt-0.5">Fino al {scadenzaFormattata}</span>
                                        </div>
                                      );
                                    }
                                  })()}
                                </td>
                                <td className="py-3 px-3">
                                  <span className="text-slate-500">
                                    {totVoci} {totVoci === 1 ? 'prova del tariffario' : 'prove del tariffario'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right font-mono">
                                  <span className="font-extrabold text-slate-800 block">
                                    €{prev.totale.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                  {prev.scontoPercentuale && prev.scontoPercentuale > 0 ? (
                                    <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 inline-block mt-0.5">
                                      Sconto {prev.scontoPercentuale}%
                                    </span>
                                  ) : null}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <button
                                    onClick={() => handleToggleState(prev.id, prev.stato)}
                                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase transition cursor-pointer select-none inline-flex items-center gap-1 ${
                                      prev.stato === 'Approvato'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                        : prev.stato === 'In Approvazione'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                        : prev.stato === 'Scaduto'
                                        ? 'bg-orange-50 text-orange-700 border border-orange-100'
                                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                                    }`}
                                    title="Clicca per cambiare rapidamente lo stato contabile"
                                  >
                                    {prev.stato === 'Approvato' && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                                    {prev.stato === 'In Approvazione' && <Clock className="h-3 w-3 shrink-0" />}
                                    {prev.stato === 'Rifiutato' && <XCircle className="h-3 w-3 shrink-0" />}
                                    {prev.stato === 'Scaduto' && <XCircle className="h-3 w-3 shrink-0" />}
                                    {prev.stato}
                                  </button>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {/* Pulsante Dettagli */}
                                    <button
                                      onClick={() => setExpandedQuoteId(isExpanded ? null : prev.id)}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-lg border border-slate-200 transition text-[10px] font-bold cursor-pointer h-[24px]"
                                      title="Mostra gli elementi inclusi nel preventivo"
                                    >
                                      {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                      {isExpanded ? 'Chiudi' : 'Voci'}
                                    </button>

                                    {/* Pulsante Modifica (Consenti sempre o evidenzia se approvato) */}
                                    <button
                                      onClick={() => handleOpenEditPreventivo(prev)}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-100 transition text-[10px] font-bold cursor-pointer h-[24px]"
                                      title="Modifica questo preventivo"
                                    >
                                      <Pencil className="h-3 w-3" />
                                      Modifica
                                    </button>

                                    {/* Pulsante Crea Pacchetto */}
                                    <button
                                      onClick={() => handleOpenSaveAsPackage(prev)}
                                      className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-100 transition text-[10px] font-bold cursor-pointer h-[24px]"
                                      title="Salva questo preventivo come pacchetto di analisi riutilizzabile"
                                    >
                                      <FolderPlus className="h-3 w-3" />
                                      Pacchetto
                                    </button>

                                    {false && (
                                      <button
                                        onClick={() => handleExportCSV(prev)}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg border border-emerald-100 transition-all duration-200 text-[10px] font-bold cursor-pointer h-[24px]"
                                        title="Esporta i dettagli delle prove in CSV"
                                      >
                                        <Download className="h-3 w-3" />
                                        CSV
                                      </button>
                                    )}

                                    <button
                                      onClick={() => setPrintPreviewQuote(prev)}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 hover:bg-purple-605 text-purple-700 hover:text-white rounded-lg border border-purple-200 transition-all duration-200 text-[10px] font-bold cursor-pointer h-[24px]"
                                      title="Vedi anteprima di stampa ufficiale"
                                      id={`btn-stampa-${prev.id}`}
                                    >
                                      <Printer className="h-3 w-3" />
                                      Stampa
                                    </button>

                                    <button
                                      onClick={() => setDeleteConfirm({
                                        title: 'Conferma eliminazione preventivo',
                                        desc: `Sei sicuro di voler eliminare definitivamente il preventivo ${prev.codice}? Questa operazione è irreversibile.`,
                                        action: () => onDeletePreventivo(prev.id)
                                      })}
                                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 transition rounded-lg"
                                      title="Cancella preventivo"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Box Dettaglio Espanso */}
                              {isExpanded && (() => {
                                const isPriceHidden = prev.nascondiPrezziSingoli && (prev.proveSelezionate.length + prev.pacchettiSelezionati.length) > 1;
                                return (
                                  <tr className="bg-slate-50/40">
                                    <td colSpan={7} className="p-4 border-b border-slate-100">
                                      <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-4 animate-fadeIn text-xs">
                                        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                          <div className="flex items-center gap-2.5">
                                            <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                                              <FileText className="h-4 w-4 text-slate-500" /> Articoli inclusi nel preventivo {prev.codice}
                                            </span>
                                            <button
                                              onClick={() => handleOpenSaveAsPackage(prev)}
                                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded border border-emerald-150 transition text-[9px] font-black uppercase tracking-wider cursor-pointer"
                                              title="Salva questo preventivo come pacchetto di analisi riutilizzabile"
                                            >
                                              <FolderPlus className="h-2.5 w-2.5" />
                                              Salva come Pacchetto
                                            </button>
                                          </div>
                                          {isPriceHidden && (
                                            <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-150 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-3xs">
                                              <EyeOff className="h-3 w-3" /> Prezzi delle singole voci nascosti
                                            </span>
                                          )}
                                        </div>

                                        <div className="space-y-4">
                                          {/* Singole Prove */}
                                          {prev.proveSelezionate && prev.proveSelezionate.length > 0 && (
                                            <div>
                                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                <span>🔬 Prove Analitiche Selezionate</span>
                                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-bold font-mono">({prev.proveSelezionate.length})</span>
                                              </div>
                                              <div className="border border-slate-150/80 rounded-lg overflow-hidden bg-slate-50/15">
                                                <table className="w-full text-left border-collapse text-[11px]">
                                                  <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-150/70 font-bold text-slate-500">
                                                      <th className="py-2 px-3">Prova / Parametro</th>
                                                      <th className="py-2 px-3">Metodo</th>
                                                      <th className="py-2 px-3 text-center">Quantità Campioni</th>
                                                      {!isPriceHidden && (
                                                        <>
                                                          <th className="py-2 px-3 text-right">Prezzo Unitario</th>
                                                          <th className="py-2 px-3 text-right">Importo Lordo</th>
                                                        </>
                                                      )}
                                                    </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-slate-100">
                                                    {prev.proveSelezionate.map(item => {
                                                      const info = getProvaInfo(item.provaId);
                                                      return (
                                                        <tr key={item.provaId} className={`text-slate-650 hover:bg-slate-50/20 ${info?.accreditataAccredia ? 'bg-emerald-50/10' : ''}`}>
                                                          <td className="py-1.5 px-3 font-semibold text-slate-850">
                                                            <div className="flex items-center gap-1.5">
                                                              <button
                                                                type="button"
                                                                onClick={() => onGoToProva?.(item.provaId)}
                                                                className="hover:text-amber-700 hover:underline inline-flex items-center gap-1 text-left cursor-pointer font-semibold"
                                                                title="Vedi dettagli nel Catalogo Prove"
                                                               >
                                                                {info?.nome || 'Parametro Chimico'}
                                                                <span className="text-[9px] text-slate-400 font-normal shrink-0">(vedi 🔍)</span>
                                                              </button>
                                                              {info?.accreditataAccredia && ' *'}
                                                              {info?.accreditataAccredia && (
                                                                <span className="px-1.5 py-0.2 bg-emerald-50 border border-emerald-150 text-emerald-800 text-[8px] rounded font-black uppercase tracking-wider">
                                                                  🛡️ Accredia
                                                                </span>
                                                              )}
                                                            </div>
                                                            {item.limitiSelezionati && item.limitiSelezionati.length > 0 && (
                                                              <div className="mt-1 pb-1 space-y-0.5 text-[10px]">
                                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">⚖️ Limiti Selezionati:</div>
                                                                {item.limitiSelezionati.map(lim => (
                                                                  <div key={lim.id} className="inline-flex flex-wrap items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-205 text-slate-700 mr-1.5 mt-0.5">
                                                                    <strong className="text-slate-850 font-mono">{lim.valore} {lim.unitaMisura}</strong>
                                                                    <span className="text-slate-400">|</span>
                                                                    <span className="text-emerald-700 font-semibold">{lim.norma}</span>
                                                                    {lim.note && <span className="text-slate-400 text-[9px] italic">({lim.note})</span>}
                                                                  </div>
                                                                ))}
                                                              </div>
                                                            )}
                                                          </td>
                                                          <td className="py-1.5 px-3 text-slate-400 font-mono text-[9px] font-semibold">{info?.metodoAnalitico || 'Generale'}</td>
                                                          <td className="py-1.5 px-3 text-center font-bold text-slate-705">{item.quantita}</td>
                                                          {!isPriceHidden && (
                                                            <>
                                                              <td className="py-1.5 px-3 text-right font-mono text-slate-500">€{item.prezzoApplicato.toFixed(2)}</td>
                                                              <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-800">€{(item.quantita * item.prezzoApplicato).toFixed(2)}</td>
                                                            </>
                                                          )}
                                                        </tr>
                                                      );
                                                    })}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          )}

                                          {/* Pacchetti Selezionati */}
                                          {prev.pacchettiSelezionati && prev.pacchettiSelezionati.length > 0 && (
                                            <div>
                                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                <span>📦 Pacchetti Bundle Commerciali</span>
                                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-bold font-mono">({prev.pacchettiSelezionati.length})</span>
                                              </div>
                                              <div className="border border-slate-150/80 rounded-lg overflow-hidden bg-slate-50/15">
                                                <table className="w-full text-left border-collapse text-[11px]">
                                                  <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-150/70 font-bold text-purple-700">
                                                      <th className="py-2 px-3">Pacchetto Commerciale</th>
                                                      <th className="py-2 px-3 text-center">Quantità ordinata</th>
                                                      {!isPriceHidden && (
                                                        <>
                                                          <th className="py-2 px-3 text-right">Tariffa Standard</th>
                                                          <th className="py-2 px-3 text-right">Prezzo Netto</th>
                                                        </>
                                                      )}
                                                    </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-slate-100">
                                                    {prev.pacchettiSelezionati.map(item => {
                                                      const info = getPacchettoInfo(item.pacchettoId);
                                                      return (
                                                        <tr key={item.pacchettoId} className="text-slate-650 hover:bg-slate-50/20">
                                                          <td className="py-1.5 px-3">
                                                            <div className="font-semibold text-slate-850">{info?.nome || 'Pacchetto Speciale'}</div>
                                                            {info?.proveIds && info.proveIds.length > 0 && (
                                                              <div className="text-[9px] text-slate-400 mt-1 pl-1 border-l border-slate-205 flex flex-wrap gap-x-1.5 items-center">
                                                                Include: {info.proveIds.map((pId, idx) => {
                                                                  const pInfo = getProvaInfo(pId);
                                                                  return (
                                                                    <button
                                                                      type="button"
                                                                      key={pId}
                                                                      onClick={() => onGoToProva?.(pId)}
                                                                      className="hover:text-emerald-700 hover:underline cursor-pointer inline-flex items-center gap-0.5 text-left text-xs text-slate-500 font-medium"
                                                                      title="Vedi nel Catalogo Prove  (collegamento)"
                                                                    >
                                                                      {pInfo?.nome}
                                                                      {pInfo?.accreditataAccredia && ' *'}
                                                                      {pInfo?.accreditataAccredia && <strong className="text-emerald-700 ml-0.5"> (🛡️ Accredia)</strong>}
                                                                      {idx < info.proveIds.length - 1 ? ',' : ''}
                                                                    </button>
                                                                  );
                                                                })}
                                                              </div>
                                                            )}
                                                          </td>
                                                          <td className="py-1.5 px-3 text-center font-bold text-slate-705">{item.quantita}</td>
                                                          {!isPriceHidden && (
                                                            <>
                                                              <td className="py-1.5 px-3 text-right font-mono text-slate-500">€{item.prezzoApplicato.toFixed(2)}</td>
                                                              <td className="py-1.5 px-3 text-right font-mono font-bold text-purple-700">€{(item.quantita * item.prezzoApplicato).toFixed(2)}</td>
                                                            </>
                                                          )}
                                                        </tr>
                                                      );
                                                    })}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          )}
                                        </div>

                                        {(() => {
                                          const hasAccreditati = prev.proveSelezionate.some(item => getProvaInfo(item.provaId)?.accreditataAccredia) ||
                                            prev.pacchettiSelezionati.some(item => getPacchettoInfo(item.pacchettoId)?.proveIds.some(pid => getProvaInfo(pid)?.accreditataAccredia));
                                          
                                          return hasAccreditati ? (
                                            <div className="mt-3 bg-emerald-50/30 border border-emerald-150/80 rounded-lg p-2.5 flex items-start gap-2 text-[10px] text-emerald-800 leading-relaxed shadow-3xs">
                                              <span className="text-xs shrink-0 select-none">*</span>
                                              <div>
                                                <strong className="font-bold text-[10px] uppercase tracking-wide block mb-0.5">Note:</strong>
                                                {prev.noteQualitaAccredia ? (
                                                  <span className="whitespace-pre-line">{prev.noteQualitaAccredia}</span>
                                                ) : (
                                                  <span>
                                                    <strong>* Prova accreditata da ACCREDIA</strong>. Le analisi contrassegnate con l'asterisco (*) sono coperte da accreditamento nazionale di qualità ai sensi della norma internazionale <strong>UNI EN ISO/IEC 17025</strong>. L&apos;accreditamento attesta l&apos;idoneità tecnica del laboratorio e garantisce l&apos;imparzialità e l&apos;accuratezza legale del rapporto di prova emesso.
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          ) : null;
                                        })()}

                                      {/* Note di preventivo */}
                                      {prev.note && (
                                        <div className="py-2.5 px-3 bg-emerald-50/15 border border-emerald-150 rounded-lg text-slate-650 font-medium text-[11px] leading-relaxed">
                                          <span className="font-bold text-emerald-800 block uppercase text-[9px] tracking-wider mb-0.5">Modalità e Condizioni Specifiche:</span>
                                          <p className="italic m-0">"{prev.note}"</p>
                                        </div>
                                      )}

                                      {/* Registro Audit e Tracciabilità Stati (Richiesta Utente) */}
                                      <div className="py-3 px-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2 mt-2">
                                        <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
                                          <span className="font-black text-slate-500 uppercase text-[9px] tracking-widest flex items-center gap-1.5">
                                            📊 Registro Audit e Tracciabilità Stati
                                          </span>
                                          <span className="text-[9px] bg-slate-200/60 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
                                            {prev.statoHistory?.length || 0} Eventi registrati
                                          </span>
                                        </div>
                                        {prev.statoHistory && prev.statoHistory.length > 0 ? (
                                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                            {prev.statoHistory.map((h, hIdx) => (
                                              <div key={hIdx} className="text-[11px] flex justify-between items-start p-1.5 bg-white border border-slate-150/50 rounded-md shadow-3xs">
                                                <div className="space-y-0.5">
                                                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                                    <span className="font-bold text-slate-500 text-[9px] uppercase">Cambio Stato:</span>
                                                    <span className="text-slate-400 font-extrabold font-mono text-[9px] uppercase line-through">{h.statoPrecedente || 'Iniziale'}</span>
                                                    <span className="text-slate-450 font-bold">&rarr;</span>
                                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-black tracking-wider uppercase ${
                                                      h.statoNuovo === 'Approvato' ? 'bg-emerald-50 text-emerald-700 font-black border border-emerald-200' :
                                                      h.statoNuovo === 'Invio alla Fatturazione' ? 'bg-blue-50 text-blue-700 font-black border border-blue-200' :
                                                      h.statoNuovo === 'In Approvazione' ? 'bg-amber-50 text-amber-700 font-bold border border-amber-200' :
                                                      'bg-rose-50 text-rose-700 font-bold border border-rose-200'
                                                    }`}>{h.statoNuovo}</span>
                                                  </div>
                                                  <div className="text-[10px] text-slate-500">
                                                    Modificato da: <strong className="text-slate-800 font-bold">{h.operatore}</strong>
                                                  </div>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-mono font-bold shrink-0">{h.dataOra}</span>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-slate-400 text-[10px] italic leading-relaxed">
                                            Nessuna modifica di stato registrata. Clicca sul badge dello stato contabile per registrare un cambio stato tracciabile e firmato.
                                          </p>
                                        )}
                                      </div>

                                      {/* Totali Riassunti */}
                                      <div className="pt-3 border-t border-slate-150 flex flex-col items-end space-y-1.5">
                                        {prev.scontoPercentuale && prev.scontoPercentuale > 0 ? (
                                          <>
                                            <div className="text-slate-500 font-medium text-[11px]">
                                              Imponibile Lordo: <span className="font-mono font-bold text-slate-700 ml-1">€{(prev.totale / (1 - prev.scontoPercentuale / 100)).toFixed(2)}</span>
                                            </div>
                                            <div className="text-rose-600 font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                              Sconto Applicato ({prev.scontoPercentuale}%): <span className="font-mono ml-1">-€{((prev.totale / (1 - prev.scontoPercentuale / 100)) - prev.totale).toFixed(2)}</span>
                                            </div>
                                          </>
                                        ) : null}
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-baseline gap-2.5 shadow-2xs mt-1.5">
                                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Totale Netto Preventivato:</span>
                                          <span className="text-base font-black text-slate-900 font-mono">€{prev.totale.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })()}
                            </React.Fragment>
                          );
                        })
                      })()
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 'pacchetti' ? (
              /* VISUALIZZAZIONE PACCHETTI STANDARD */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pacchetti.length === 0 ? (
                  <div className="col-span-3 text-center py-20 bg-white border border-slate-150 rounded-xl text-slate-400 py-10">
                    Nessun pacchetto standard definito nel listino commerciale del laboratorio.
                  </div>
                ) : (
                  pacchetti.map(pack => {
                    const totalSinglePrices = pack.proveIds.reduce((sum, pid) => sum + (getProvaInfo(pid)?.prezzoListino || 0), 0);
                    const discountAmount = totalSinglePrices - pack.prezzoScontato;
                    const discountPct = totalSinglePrices > 0 ? Math.round((discountAmount / totalSinglePrices) * 100) : 0;

                    return (
                      <div key={pack.id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              {pack.categoriaMerceologica}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenEditPacchetto(pack)}
                                className="text-slate-400 hover:text-blue-600 transition p-1"
                                title="Modifica pacchetto"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({
                                  title: 'Conferma eliminazione pacchetto',
                                  desc: `Sei sicuro di voler eliminare definitivamente il pacchetto "${pack.nome}"? Questa operazione è irreversibile.`,
                                  action: () => onDeletePacchetto(pack.id)
                                })}
                                className="text-slate-300 hover:text-red-500 transition p-1"
                                title="Elimina pacchetto"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <h5 className="font-extrabold text-sm text-slate-800 mt-2.5 leading-snug">
                            {pack.nome}
                          </h5>

                          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                            {pack.descrizione || 'Nessuna descrizione commerciale inserita.'}
                          </p>

                          {/* Prove incluse */}
                          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                              Costituzione del Pacchetto:
                            </span>
                            <ul className="space-y-1.5">
                              {pack.proveIds.map(pid => {
                                const info = getProvaInfo(pid);
                                return (
                                  <li key={pid} className="text-xs text-slate-600 flex justify-between items-start gap-1 p-1 hover:bg-slate-50/50 rounded">
                                    <div className="flex items-start gap-1">
                                      <ChevronRight className="h-3 w-3 text-purple-400 mt-0.5" />
                                      <div className="leading-tight">
                                        <button
                                          type="button"
                                          onClick={() => onGoToProva?.(pid)}
                                          className="font-semibold text-left text-slate-755 hover:text-purple-750 hover:underline cursor-pointer"
                                          title="Clicca per collegarti a questa prova nell'area PROVE"
                                        >
                                          <span>{info?.nome || 'Parametro Chimico'}</span>
                                          <span className="text-[9px] text-slate-400 font-normal ml-1 shrink-0 bg-slate-100 px-1 py-0.2 rounded">(collega 🔗)</span>
                                          {info && (
                                            <span className="text-[9px] text-slate-400 block font-mono">
                                              {info.metodoAnalitico} {info.accreditataAccredia && '• Accredia 🛡️'}
                                            </span>
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                    <div className="text-right whitespace-nowrap ml-2">
                                      <span className="font-mono text-slate-500 text-[10px]">€{info?.prezzoListino.toFixed(2)}</span>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>

                            {totalSinglePrices > 0 && (
                              <div className="bg-purple-50/30 rounded-lg p-2.5 mt-2.5 border border-purple-100/50 text-[10px] space-y-0.5">
                                <div className="flex justify-between font-bold text-purple-950">
                                  <span>Valore di listino cumulat.:</span>
                                  <span className="font-mono">€{totalSinglePrices.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-purple-700 font-semibold text-[9.5px]">
                                  <span>Sconto incorporato:</span>
                                  <span>-{discountPct}% (-€{discountAmount.toFixed(2)})</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between items-center bg-slate-50 -mx-5 -mb-5 px-5 py-3 rounded-b-xl">
                          <span className="text-xs font-bold text-slate-500 uppercase">Tariffa Forfettaria Pacchetto:</span>
                          <span className="text-base font-extrabold text-purple-700">
                            €{pack.prezzoScontato.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* SEZIONE GESTIONE MODALITÀ, CONDIZIONI E TEMPLATE STANDARD (Richiesta Utente) */
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm animate-fadeIn">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <h4 className="font-extrabold text-base text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <span>💼 Archivio Modelli e Clausole Commerciali Standard</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Crea, seleziona e gestisci le clausole standard per campionamento, quantità, tempistiche, modalità di invio dei rapporti di prova e subappalto.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // Ripristina i valori di fabbrica originali
                        setOpzioniValidita(['30 Giorni', '60 Giorni', '90 Giorni', '120 Giorni']);
                        setQuoteValidita('90 Giorni');
                        
                        setOpzioniOggetto([
                          'In risposta alla Vs. cortese richiesta',
                          'Offerta per esecuzione di prove analitiche e microbiologiche',
                          'Proposta commerciale per pacchetto analitico forfettario',
                          'Controllo qualità periodico ed autocontrollo'
                        ]);
                        setQuoteOggetto('In risposta alla Vs. cortese richiesta');
                        setDefaultQuoteOggetto('In risposta alla Vs. cortese richiesta');
                        localStorage.setItem('lab_default_quote_oggetto', 'In risposta alla Vs. cortese richiesta');
                        
                        setOpzioniModalita([
                          'Pagamento: Rimessa diretta a 30 giorni data fattura fine mese.',
                          'Pagamento: Bonifico bancario 30 gg. D.F.F.M.',
                          'Pagamento: Bonifico bancario all\'ordine (anticipato).',
                          'Pagamento: Rimessa diretta a presentazione fattura.'
                        ]);
                        setQuoteModalita('Pagamento: Rimessa diretta a 30 giorni data fattura fine mese.');
                        setDefaultQuoteModalita('Pagamento: Rimessa diretta a 30 giorni data fattura fine mese.');
                        localStorage.setItem('lab_default_quote_modalita', 'Pagamento: Rimessa diretta a 30 giorni data fattura fine mese.');

                        setOpzioniCampionamento([
                          'Campionamento a cura del Cliente.',
                          'Campionamento a cura dei tecnici del Laboratorio secondo metodiche interne conformi a standard ISO.',
                          'Campionamento programmato a cura del laboratorio Biochem Analytical su appuntamento.'
                        ]);
                        setQuoteCampionamento('Campionamento a cura del Cliente.');
                        setDefaultQuoteCampionamento('Campionamento a cura del Cliente.');
                        localStorage.setItem('lab_default_quote_campionamento', 'Campionamento a cura del Cliente.');

                        setOpzioniQuantitaCampione([
                          'Quantità minima indicata per ciascuna determinazione analitica.',
                          'Almeno 1 Litro in idoneo contenitore sterile monouso (plastica o vetro).',
                          'Almeno 500g in busta ermetica pulita per campionamento solidi/alimenti.'
                        ]);
                        setQuoteQuantitaCampione('Quantità minima indicata per ciascuna determinazione analitica.');
                        setDefaultQuoteQuantitaCampione('Quantità minima indicata per ciascuna determinazione analitica.');
                        localStorage.setItem('lab_default_quote_quantita_campione', 'Quantità minima indicata per ciascuna determinazione analitica.');

                        setOpzioniTempoConsegna([
                          'Entro 7-10 giorni lavorativi a decorrere dalla data di ricevimento dei campioni.',
                          'Entro 3-5 giorni lavorativi (servizio rapido urgente previa validazione tecnica).',
                          'Entro 15 giorni lavorativi dalla data ufficiale di accettazione del campione.'
                        ]);
                        setQuoteTempoConsegna('Entro 7-10 giorni lavorativi a decorrere dalla data di ricevimento dei campioni.');
                        setDefaultQuoteTempoConsegna('Entro 7-10 giorni lavorativi a decorrere dalla data di ricevimento dei campioni.');
                        localStorage.setItem('lab_default_quote_tempo_consegna', 'Entro 7-10 giorni lavorativi a decorrere dalla data di ricevimento dei campioni.');

                        setOpzioniInvioRapporto([
                          'Invio del Rapporto di Prova in formato PDF firmato digitalmente a mezzo e-mail ordinaria o PEC.',
                          'Pubblicazione diretta sul Portale Web Clienti del Laboratorio Biochem.',
                          'Ritiro della copia cartacea stampata del Rapporto di Prova presso la segreteria.'
                        ]);
                        setQuoteInvioRapporto('Invio del Rapporto di Prova in formato PDF firmato digitalmente a mezzo e-mail ordinaria o PEC.');
                        setDefaultQuoteInvioRapporto('Invio del Rapporto di Prova in formato PDF firmato digitalmente a mezzo e-mail ordinaria o PEC.');
                        localStorage.setItem('lab_default_quote_invio_rapporto', 'Invio del Rapporto di Prova in formato PDF firmato digitalmente a mezzo e-mail ordinaria o PEC.');

                        setOpzioniProvaSubappaltata([
                          'Le prove analitiche verranno interamente eseguite presso la nostra sede autorizzata.',
                          'Qualora necessario, alcune determinazioni speciali potranno essere subappaltate a laboratori esterni qualificati Biochem.',
                          'Subappalto a laboratori esterni accreditati ACCREDIA secondo necessità analitica, chiaramente identificati all\'interno del Rapporto di Prova.'
                        ]);
                        setQuoteProvaSubappaltata('Le prove analitiche verranno interamente eseguite presso la nostra sede autorizzata.');
                        setDefaultQuoteProvaSubappaltata('Le prove analitiche verranno interamente eseguite presso la nostra sede autorizzata.');
                        localStorage.setItem('lab_default_quote_prova_subappaltata', 'Le prove analitiche verranno interamente eseguite presso la nostra sede autorizzata.');

                        setOpzioniNoteQualitaAccredia([
                          'Le prove analitiche contrassegnate dal simbolo (*) non sono coperte da accreditamento ACCREDIA.',
                          'Le analisi sono eseguite in conformità ai requisiti gestionali e tecnici della norma UNI EN ISO/IEC 17025.',
                          'L\'accreditamento ACCREDIA si riferisce unicamente alle prove indicate ed attesta la competenza tecnica del laboratorio.'
                        ]);
                        setQuoteNoteQualitaAccredia('Le prove analitiche contrassegnate dal simbolo (*) non sono coperte da accreditamento ACCREDIA.');
                        setDefaultQuoteNoteQualitaAccredia('Le prove analitiche contrassegnate dal simbolo (*) non sono coperte da accreditamento ACCREDIA.');
                        localStorage.setItem('lab_default_quote_note_qualita_accredia', 'Le prove analitiche contrassegnate dal simbolo (*) non sono coperte da accreditamento ACCREDIA.');

                        setOpzioniMaterialiCampionamento([
                          'Contenitori sterili monouso per campionamento microbiologico forniti gratuitamente dal laboratorio Biochem.',
                          'Flaconi in vetro scuro con idoneo conservante chimico forniti dal laboratorio su richiesta del cliente.',
                          'Nessun materiale fornito; campionamento eseguito autonomamente dal cliente con materiale idoneo proprio.'
                        ]);
                        setQuoteMaterialiCampionamento('Contenitori sterili monouso per campionamento microbiologico forniti gratuitamente dal laboratorio Biochem.');
                        setDefaultQuoteMaterialiCampionamento('Contenitori sterili monouso per campionamento microbiologico forniti gratuitamente dal laboratorio Biochem.');
                        localStorage.setItem('lab_default_quote_materiali_campionamento', 'Contenitori sterili monouso per campionamento microbiologico forniti gratuitamente dal laboratorio Biochem.');

                        setOpzioniNoteAccettazione([
                          'I campioni vengono accettati dal lunedì al giovedì dalle ore 9:00 alle ore 16:00.',
                          'All\'atto della consegna, il campione deve essere accompagnato dalla Richiesta di Prova debitamente compilata.',
                          'I campioni deperibili devono pervenire in regime di refrigerazione controllata (tra +2°C e +8°C).'
                        ]);
                        setQuoteNoteAccettazione('I campioni vengono accettati dal lunedì al giovedì dalle ore 9:00 alle ore 16:00.');
                        setDefaultQuoteNoteAccettazione('I campioni vengono accettati dal lunedì al giovedì dalle ore 9:00 alle ore 16:00.');
                        localStorage.setItem('lab_default_quote_note_accettazione', 'I campioni vengono accettati dal lunedì al giovedì dalle ore 9:00 alle ore 16:00.');

                        setOpzioniAltro([
                          'Per qualsiasi contestazione in merito ai risultati, contattare la Direzione Tecnica entro 10 giorni dall\'emissione del RdP.',
                          'I Rapporti di Prova originali sono conservati in archivio digitale sicuro per un periodo minimo di 10 anni.',
                          'Nessuna dicitura o condizione aggiuntiva concordata.'
                        ]);
                        setQuoteAltro('Nessuna dicitura o condizione aggiuntiva concordata.');
                        setDefaultQuoteAltro('Nessuna dicitura o condizione aggiuntiva concordata.');
                        localStorage.setItem('lab_default_quote_altro', 'Nessuna dicitura o condizione aggiuntiva concordata.');

                        setPresetNomeModuloTemplates([
                          'MOD. BIO-04 REV. 02',
                          'MOD. CHIM-01 REV. 04',
                          'MOD. ACCR-12 REV. 01',
                          'MOD. LIMS-02 REV. 03'
                        ]);
                        setQuoteNomeModulo('MOD. BIO-04 REV. 02');
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition shrink-0 cursor-pointer"
                    >
                      🔄 Ripristina Default
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 font-sans">
                    
                    {/* CATEGORIA 2: OGGETTO DELLA PROPOSTA */}
                    <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">✍️</span>
                          <div>
                            <h5 className="font-black text-xs text-slate-750 uppercase tracking-wider">Oggetto della proposta</h5>
                            <span className="text-[10px] text-slate-400 font-bold">{opzioniOggetto.length} Modelli disponibili</span>
                          </div>
                        </div>
                      </div>

                      {/* Lista Opzioni */}
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {opzioniOggetto.map((opt, idx) => {
                          const isActive = quoteOggetto === opt;
                          const isEditing = editingOption?.category === 'oggetto' && editingOption?.index === idx;

                          if (isEditing) {
                            return (
                              <div key={opt + idx} className="p-2 rounded-lg border border-slate-300 bg-white shadow-3xs space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                <textarea
                                  rows={2}
                                  value={editingOption.text}
                                  onChange={(e) => setEditingOption({ ...editingOption, text: e.target.value })}
                                  className="w-full p-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans text-slate-800"
                                  autoFocus
                                />
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newText = editingOption.text.trim();
                                      if (newText) {
                                        setOpzioniOggetto(prev => {
                                          const next = [...prev];
                                          next[idx] = newText;
                                          return next;
                                        });
                                        if (isActive) {
                                          setQuoteOggetto(newText);
                                        }
                                        setEditingOption(null);
                                      }
                                    }}
                                    className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition cursor-pointer"
                                  >
                                    Salva
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingOption(null)}
                                    className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                                  >
                                    Annulla
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div 
                              key={opt}
                              onClick={() => setQuoteOggetto(opt)}
                              className={`flex justify-between items-center p-2.5 rounded-lg border shadow-3xs group transition select-none cursor-pointer ${
                                isActive 
                                  ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-250' 
                                  : 'bg-white border-slate-150 hover:bg-slate-100/50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isActive ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                                }`}>
                                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                </div>
                                <span className={`text-xs line-clamp-2 ${isActive ? 'text-emerald-950 font-bold' : 'text-slate-705 font-semibold'}`} title={opt}>
                                  {opt}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition duration-150 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingOption({ category: 'oggetto', index: idx, text: opt });
                                  }}
                                  className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition cursor-pointer"
                                  title="Modifica"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (opzioniOggetto.length === 1) return; // Non lasciare vuoto
                                    setDeleteConfirm({
                                      title: 'Conferma eliminazione oggetto offerta',
                                      desc: `Sei sicuro di voler eliminare la clausola "${opt}"?`,
                                      action: () => {
                                        setOpzioniOggetto(current => {
                                          const filtered = current.filter(o => o !== opt);
                                          if (quoteOggetto === opt) {
                                            setQuoteOggetto(filtered[0] || '');
                                          }
                                          return filtered;
                                        });
                                      }
                                    });
                                  }}
                                  disabled={opzioniOggetto.length === 1}
                                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition cursor-pointer disabled:opacity-30"
                                  title="Rimuovi questo termine"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Form Aggiunta */}
                      <div className="pt-2 border-t border-slate-200 space-y-1.5">
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Aggiungi Nuovo Oggetto</label>
                        <div className="flex flex-col gap-1.5">
                          <textarea
                            rows={2}
                            placeholder="Es: Offerta speciale per campionamenti d'acqua..."
                            value={nuovOggetto}
                            onChange={(e) => setNuovOggetto(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded focus:outline-none placeholder:text-slate-400 font-medium resize-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (nuovOggetto.trim() && !opzioniOggetto.includes(nuovOggetto.trim())) {
                                setOpzioniOggetto(prev => [...prev, nuovOggetto.trim()]);
                                setQuoteOggetto(nuovOggetto.trim());
                                setNuovOggetto('');
                              }
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 rounded transition cursor-pointer"
                          >
                            Aggiungi e Attiva Modello
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* CATEGORIA 1: VALIDITÀ DELL'OFFERTA */}
                    <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">📅</span>
                          <div>
                            <h5 className="font-extrabold text-xs text-slate-755 uppercase tracking-wider">Validità dell&apos;offerta</h5>
                            <span className="text-[10px] text-slate-400 font-bold">{opzioniValidita.length} Opzioni disponibili</span>
                          </div>
                        </div>
                      </div>

                      {/* Lista Opzioni */}
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {opzioniValidita.map((opt, idx) => {
                          const isActive = quoteValidita === opt;
                          const isEditing = editingOption?.category === 'validita' && editingOption?.index === idx;

                          if (isEditing) {
                            return (
                              <div key={opt + idx} className="p-2 rounded-lg border border-slate-300 bg-white shadow-3xs space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                <textarea
                                  rows={2}
                                  value={editingOption.text}
                                  onChange={(e) => setEditingOption({ ...editingOption, text: e.target.value })}
                                  className="w-full p-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans text-slate-800"
                                  autoFocus
                                />
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newText = editingOption.text.trim();
                                      if (newText) {
                                        setOpzioniValidita(prev => {
                                          const next = [...prev];
                                          next[idx] = newText;
                                          return next;
                                        });
                                        if (isActive) {
                                          setQuoteValidita(newText);
                                        }
                                        setEditingOption(null);
                                      }
                                    }}
                                    className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition cursor-pointer"
                                  >
                                    Salva
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingOption(null)}
                                    className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                                  >
                                    Annulla
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div 
                              key={opt}
                              onClick={() => setQuoteValidita(opt)}
                              className={`flex justify-between items-center p-2.5 rounded-lg border shadow-3xs group transition select-none cursor-pointer ${
                                isActive 
                                  ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-250' 
                                  : 'bg-white border-slate-150 hover:bg-slate-100/50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isActive ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                                }`}>
                                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                </div>
                                <span className={`text-xs truncate ${isActive ? 'text-emerald-950 font-bold' : 'text-slate-705 font-semibold'}`}>
                                  {opt}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition duration-150 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingOption({ category: 'validita', index: idx, text: opt });
                                  }}
                                  className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition cursor-pointer"
                                  title="Modifica"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (opzioniValidita.length === 1) return; // Non lasciare vuoto
                                    setDeleteConfirm({
                                      title: 'Conferma eliminazione termine di validità',
                                      desc: `Sei sicuro di voler eliminare la clausola "${opt}"?`,
                                      action: () => {
                                        setOpzioniValidita(current => {
                                          const filtered = current.filter(o => o !== opt);
                                          if (quoteValidita === opt) {
                                            setQuoteValidita(filtered[0] || '');
                                          }
                                          return filtered;
                                        });
                                      }
                                    });
                                  }}
                                  disabled={opzioniValidita.length === 1}
                                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition cursor-pointer disabled:opacity-30"
                                  title="Rimuovi questo termine"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Form Aggiunta */}
                      <div className="pt-2 border-t border-slate-200 space-y-1.5">
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Aggiungi Nuova Validità</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="Es: 45 Giorni"
                            value={nuovaValidita}
                            onChange={(e) => setNuovaValidita(e.target.value)}
                            className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded focus:outline-none placeholder:text-slate-400 font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (nuovaValidita.trim() && !opzioniValidita.includes(nuovaValidita.trim())) {
                                setOpzioniValidita(prev => [...prev, nuovaValidita.trim()]);
                                setQuoteValidita(nuovaValidita.trim());
                                setNuovaValidita('');
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded transition cursor-pointer"
                          >
                            Aggiungi e Attiva
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* CATEGORIA 3: MODALITÀ E CONDIZIONI DI PAGAMENTO */}
                    <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">💳</span>
                          <div>
                            <h5 className="font-black text-xs text-slate-750 uppercase tracking-wider">Modalità e Pagamenti</h5>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-400 font-bold">{opzioniModalita.length} Condizioni in archivio</span>
                              {quoteModalita ? (
                                <button 
                                  type="button" 
                                  onClick={() => setQuoteModalita('')}
                                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer bg-transparent border-none p-0"
                                >
                                  (Deseleziona per omettere)
                                </button>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400 italic bg-slate-100 px-1 py-0.5 rounded">
                                  (Omesso dalla stampa)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Lista Opzioni */}
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {opzioniModalita.map((opt, idx) => {
                          const isActive = quoteModalita === opt;
                          const isEditing = editingOption?.category === 'modalita' && editingOption?.index === idx;

                          if (isEditing) {
                            return (
                              <div key={opt + idx} className="p-2 rounded-lg border border-slate-300 bg-white shadow-3xs space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                <textarea
                                  rows={2}
                                  value={editingOption.text}
                                  onChange={(e) => setEditingOption({ ...editingOption, text: e.target.value })}
                                  className="w-full p-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans text-slate-800"
                                  autoFocus
                                />
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newText = editingOption.text.trim();
                                      if (newText) {
                                        setOpzioniModalita(prev => {
                                          const next = [...prev];
                                          next[idx] = newText;
                                          return next;
                                        });
                                        if (isActive) {
                                          setQuoteModalita(newText);
                                        }
                                        setEditingOption(null);
                                      }
                                    }}
                                    className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition cursor-pointer"
                                  >
                                    Salva
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingOption(null)}
                                    className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                                  >
                                    Annulla
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div 
                              key={opt}
                              onClick={() => setQuoteModalita(isActive ? '' : opt)}
                              className={`flex justify-between items-center p-2.5 rounded-lg border shadow-3xs group transition select-none cursor-pointer ${
                                isActive 
                                  ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-250' 
                                  : 'bg-white border-slate-150 hover:bg-slate-100/50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isActive ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                                }`}>
                                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                </div>
                                <span className={`text-xs line-clamp-2 ${isActive ? 'text-emerald-950 font-bold' : 'text-slate-705 font-semibold'}`} title={opt}>
                                  {opt}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition duration-150 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingOption({ category: 'modalita', index: idx, text: opt });
                                  }}
                                  className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition cursor-pointer"
                                  title="Modifica"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (opzioniModalita.length === 1) return; // Non lasciare vuoto
                                    setDeleteConfirm({
                                      title: 'Conferma eliminazione modalità e pagamenti',
                                      desc: `Sei sicuro di voler eliminare la clausola "${opt}"?`,
                                      action: () => {
                                        setOpzioniModalita(current => {
                                          const filtered = current.filter(o => o !== opt);
                                          if (quoteModalita === opt) {
                                            setQuoteModalita(filtered[0] || '');
                                          }
                                          return filtered;
                                        });
                                      }
                                    });
                                  }}
                                  disabled={opzioniModalita.length === 1}
                                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition cursor-pointer disabled:opacity-30"
                                  title="Rimuovi questo termine"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Form Aggiunta */}
                      <div className="pt-2 border-t border-slate-200 space-y-1.5">
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Aggiungi Modalità di Pagamento</label>
                        <div className="flex flex-col gap-1.5">
                          <textarea
                            rows={2}
                            placeholder="Es: Pagamento: RI.BA. 60 giorni d.f.f.m."
                            value={nuovaModalita}
                            onChange={(e) => setNuovaModalita(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded focus:outline-none placeholder:text-slate-400 font-medium resize-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (nuovaModalita.trim() && !opzioniModalita.includes(nuovaModalita.trim())) {
                                setOpzioniModalita(prev => [...prev, nuovaModalita.trim()]);
                                setQuoteModalita(nuovaModalita.trim());
                                setNuovaModalita('');
                              }
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 rounded transition cursor-pointer"
                          >
                            Aggiungi e Attiva Condizione
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* NUOVO BLOCCHI CLAUSOLE TECNICO-ANCHE DI LABORATORIO */}
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                      <span>🧪 Clausole Tecnico-Analitiche di Laboratorio (Campionamento, TAT, Subappalto)</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
                      
                      {/* CATEGORIA 4: METODO DI CAMPIONAMENTO */}
                      <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">🧪</span>
                              <div>
                                <h5 className="font-extrabold text-xs text-slate-750 uppercase tracking-wider">Metodo di Campionamento</h5>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] text-slate-400 font-bold">{opzioniCampionamento.length} Opzioni</span>
                                  {quoteCampionamento ? (
                                    <button 
                                      type="button" 
                                      onClick={() => setQuoteCampionamento('')}
                                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer bg-transparent border-none p-0"
                                    >
                                      (Deseleziona per omettere)
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-400 italic bg-slate-100 px-1 py-0.5 rounded">
                                      (Omesso dalla stampa)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Lista Opzioni */}
                          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                            {opzioniCampionamento.map((opt, idx) => {
                              const isActive = quoteCampionamento === opt;
                              const isEditing = editingOption?.category === 'campionamento' && editingOption?.index === idx;

                              if (isEditing) {
                                return (
                                  <div key={opt + idx} className="p-2 rounded-lg border border-slate-300 bg-white shadow-3xs space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                    <textarea
                                      rows={2}
                                      value={editingOption.text}
                                      onChange={(e) => setEditingOption({ ...editingOption, text: e.target.value })}
                                      className="w-full p-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans text-slate-800"
                                      autoFocus
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newText = editingOption.text.trim();
                                          if (newText) {
                                            setOpzioniCampionamento(prev => {
                                              const next = [...prev];
                                              next[idx] = newText;
                                              return next;
                                            });
                                            if (isActive) {
                                              setQuoteCampionamento(newText);
                                            }
                                            setEditingOption(null);
                                          }
                                        }}
                                        className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition cursor-pointer"
                                      >
                                        Salva
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingOption(null)}
                                        className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                                      >
                                        Annulla
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div 
                                  key={opt}
                                  onClick={() => setQuoteCampionamento(isActive ? '' : opt)}
                                  className={`flex justify-between items-center p-2.5 rounded-lg border shadow-3xs group transition select-none cursor-pointer ${
                                    isActive 
                                      ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-250' 
                                      : 'bg-white border-slate-150 hover:bg-slate-100/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      isActive ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                                    }`}>
                                      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className={`text-xs line-clamp-2 ${isActive ? 'text-emerald-950 font-bold' : 'text-slate-705 font-semibold'}`} title={opt}>
                                      {opt}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition duration-150 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingOption({ category: 'campionamento', index: idx, text: opt });
                                      }}
                                      className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition cursor-pointer"
                                      title="Modifica"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (opzioniCampionamento.length === 1) return;
                                        setDeleteConfirm({
                                          title: 'Conferma eliminazione metodo campionamento',
                                          desc: `Sei sicuro di voler eliminare la clausola "${opt}"?`,
                                          action: () => {
                                            setOpzioniCampionamento(current => {
                                              const filtered = current.filter(o => o !== opt);
                                              if (quoteCampionamento === opt) {
                                                setQuoteCampionamento(filtered[0] || '');
                                              }
                                              return filtered;
                                            });
                                          }
                                        });
                                      }}
                                      disabled={opzioniCampionamento.length === 1}
                                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition cursor-pointer disabled:opacity-30"
                                      title="Rimuovi"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Form Aggiunta */}
                        <div className="pt-2 border-t border-slate-200 space-y-1.5">
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Nuovo Metodo Campionamento</label>
                          <div className="flex flex-col gap-1.5">
                            <textarea
                              rows={2}
                              placeholder="Es: Campionamento a cura del cliente..."
                              value={nuovoCampionamento}
                              onChange={(e) => setNuovoCampionamento(e.target.value)}
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 bg-white rounded focus:outline-none placeholder:text-slate-400 font-medium resize-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (nuovoCampionamento.trim() && !opzioniCampionamento.includes(nuovoCampionamento.trim())) {
                                  setOpzioniCampionamento(prev => [...prev, nuovoCampionamento.trim()]);
                                  setQuoteCampionamento(nuovoCampionamento.trim());
                                  setNuovoCampionamento('');
                                }
                              }}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 rounded transition cursor-pointer"
                            >
                              Aggiungi e Attiva
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* CATEGORIA 5: QUANTITÀ DI CAMPIONE */}
                      <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">📦</span>
                              <div>
                                <h5 className="font-extrabold text-xs text-slate-750 uppercase tracking-wider">Quantità di Campione</h5>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] text-slate-400 font-bold">{opzioniQuantitaCampione.length} Opzioni</span>
                                  {quoteQuantitaCampione ? (
                                    <button 
                                      type="button" 
                                      onClick={() => setQuoteQuantitaCampione('')}
                                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer bg-transparent border-none p-0"
                                    >
                                      (Deseleziona per omettere)
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-400 italic bg-slate-100 px-1 py-0.5 rounded">
                                      (Omesso dalla stampa)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Lista Opzioni */}
                          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                            {opzioniQuantitaCampione.map((opt, idx) => {
                              const isActive = quoteQuantitaCampione === opt;
                              const isEditing = editingOption?.category === 'quantita' && editingOption?.index === idx;

                              if (isEditing) {
                                return (
                                  <div key={opt + idx} className="p-2 rounded-lg border border-slate-300 bg-white shadow-3xs space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                    <textarea
                                      rows={2}
                                      value={editingOption.text}
                                      onChange={(e) => setEditingOption({ ...editingOption, text: e.target.value })}
                                      className="w-full p-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans text-slate-800"
                                      autoFocus
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newText = editingOption.text.trim();
                                          if (newText) {
                                            setOpzioniQuantitaCampione(prev => {
                                              const next = [...prev];
                                              next[idx] = newText;
                                              return next;
                                            });
                                            if (isActive) {
                                              setQuoteQuantitaCampione(newText);
                                            }
                                            setEditingOption(null);
                                          }
                                        }}
                                        className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition cursor-pointer"
                                      >
                                        Salva
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingOption(null)}
                                        className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                                      >
                                        Annulla
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div 
                                  key={opt}
                                  onClick={() => setQuoteQuantitaCampione(isActive ? '' : opt)}
                                  className={`flex justify-between items-center p-2.5 rounded-lg border shadow-3xs group transition select-none cursor-pointer ${
                                    isActive 
                                      ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-250' 
                                      : 'bg-white border-slate-150 hover:bg-slate-100/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      isActive ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                                    }`}>
                                      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className={`text-xs line-clamp-2 ${isActive ? 'text-emerald-950 font-bold' : 'text-slate-705 font-semibold'}`} title={opt}>
                                      {opt}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition duration-150 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingOption({ category: 'quantita', index: idx, text: opt });
                                      }}
                                      className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition cursor-pointer"
                                      title="Modifica"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (opzioniQuantitaCampione.length === 1) return;
                                        setDeleteConfirm({
                                          title: 'Conferma eliminazione quantità di campione',
                                          desc: `Sei sicuro di voler eliminare la clausola "${opt}"?`,
                                          action: () => {
                                            setOpzioniQuantitaCampione(current => {
                                              const filtered = current.filter(o => o !== opt);
                                              if (quoteQuantitaCampione === opt) {
                                                setQuoteQuantitaCampione(filtered[0] || '');
                                              }
                                              return filtered;
                                            });
                                          }
                                        });
                                      }}
                                      disabled={opzioniQuantitaCampione.length === 1}
                                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition cursor-pointer disabled:opacity-30"
                                      title="Rimuovi"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Form Aggiunta */}
                        <div className="pt-2 border-t border-slate-200 space-y-1.5">
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Nuova Quantità/Istruzioni</label>
                          <div className="flex flex-col gap-1.5">
                            <textarea
                              rows={2}
                              placeholder="Es: Almeno 1 Litro in contenitore sterile..."
                              value={nuovaQuantitaCampione}
                              onChange={(e) => setNuovaQuantitaCampione(e.target.value)}
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 bg-white rounded focus:outline-none placeholder:text-slate-400 font-medium resize-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                  if (nuovaQuantitaCampione.trim() && !opzioniQuantitaCampione.includes(nuovaQuantitaCampione.trim())) {
                                    setOpzioniQuantitaCampione(prev => [...prev, nuovaQuantitaCampione.trim()]);
                                    setQuoteQuantitaCampione(nuovaQuantitaCampione.trim());
                                    setNuovaQuantitaCampione('');
                                  }
                              }}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 rounded transition cursor-pointer"
                            >
                              Aggiungi e Attiva
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* CATEGORIA 6: TEMPO DI CONSEGNA RISULTATI */}
                      <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">⏱️</span>
                              <div>
                                <h5 className="font-extrabold text-xs text-slate-750 uppercase tracking-wider">Tempo di Consegna del Rapporto di Prova</h5>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] text-slate-400 font-bold">{opzioniTempoConsegna.length} Opzioni</span>
                                  {quoteTempoConsegna ? (
                                    <button 
                                      type="button" 
                                      onClick={() => setQuoteTempoConsegna('')}
                                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer bg-transparent border-none p-0"
                                    >
                                      (Deseleziona per omettere)
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-400 italic bg-slate-100 px-1 py-0.5 rounded">
                                      (Omesso dalla stampa)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Lista Opzioni */}
                          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                            {opzioniTempoConsegna.map((opt, idx) => {
                              const isActive = quoteTempoConsegna === opt;
                              const isEditing = editingOption?.category === 'tempoconsegna' && editingOption?.index === idx;

                              if (isEditing) {
                                return (
                                  <div key={opt + idx} className="p-2 rounded-lg border border-slate-300 bg-white shadow-3xs space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                    <textarea
                                      rows={2}
                                      value={editingOption.text}
                                      onChange={(e) => setEditingOption({ ...editingOption, text: e.target.value })}
                                      className="w-full p-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans text-slate-800"
                                      autoFocus
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newText = editingOption.text.trim();
                                          if (newText) {
                                            setOpzioniTempoConsegna(prev => {
                                              const next = [...prev];
                                              next[idx] = newText;
                                              return next;
                                            });
                                            if (isActive) {
                                              setQuoteTempoConsegna(newText);
                                            }
                                            setEditingOption(null);
                                          }
                                        }}
                                        className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition cursor-pointer"
                                      >
                                        Salva
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingOption(null)}
                                        className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                                      >
                                        Annulla
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div 
                                  key={opt}
                                  onClick={() => setQuoteTempoConsegna(isActive ? '' : opt)}
                                  className={`flex justify-between items-center p-2.5 rounded-lg border shadow-3xs group transition select-none cursor-pointer ${
                                    isActive 
                                      ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-250' 
                                      : 'bg-white border-slate-150 hover:bg-slate-100/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      isActive ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                                    }`}>
                                      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className={`text-xs line-clamp-2 ${isActive ? 'text-emerald-950 font-bold' : 'text-slate-705 font-semibold'}`} title={opt}>
                                      {opt}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition duration-150 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingOption({ category: 'tempoconsegna', index: idx, text: opt });
                                      }}
                                      className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition cursor-pointer"
                                      title="Modifica"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (opzioniTempoConsegna.length === 1) return;
                                        setDeleteConfirm({
                                          title: 'Conferma eliminazione tempo di consegna',
                                          desc: `Sei sicuro di voler eliminare la clausola "${opt}"?`,
                                          action: () => {
                                            setOpzioniTempoConsegna(current => {
                                              const filtered = current.filter(o => o !== opt);
                                              if (quoteTempoConsegna === opt) {
                                                setQuoteTempoConsegna(filtered[0] || '');
                                              }
                                              return filtered;
                                            });
                                          }
                                        });
                                      }}
                                      disabled={opzioniTempoConsegna.length === 1}
                                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition cursor-pointer disabled:opacity-30"
                                      title="Rimuovi"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Form Aggiunta */}
                        <div className="pt-2 border-t border-slate-200 space-y-1.5">
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Nuovo Tempo di Consegna</label>
                          <div className="flex flex-col gap-1.5">
                            <textarea
                              rows={2}
                              placeholder="Es: Consegna entro 5-7 giorni lavorativi..."
                              value={nuovoTempoConsegna}
                              onChange={(e) => setNuovoTempoConsegna(e.target.value)}
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 bg-white rounded focus:outline-none placeholder:text-slate-400 font-medium resize-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (nuovoTempoConsegna.trim() && !opzioniTempoConsegna.includes(nuovoTempoConsegna.trim())) {
                                  setOpzioniTempoConsegna(prev => [...prev, nuovoTempoConsegna.trim()]);
                                  setQuoteTempoConsegna(nuovoTempoConsegna.trim());
                                  setNuovoTempoConsegna('');
                                }
                              }}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 rounded transition cursor-pointer"
                            >
                              Aggiungi e Attiva
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* CATEGORIA 7: MODALITÀ INVIO RAPPORTO DI PROVA */}
                      <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">✉️</span>
                              <div>
                                <h5 className="font-extrabold text-xs text-slate-750 uppercase tracking-wider">Modalità Invio Rapporto di Prova</h5>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] text-slate-400 font-bold">{opzioniInvioRapporto.length} Opzioni</span>
                                  {quoteInvioRapporto ? (
                                    <button 
                                      type="button" 
                                      onClick={() => setQuoteInvioRapporto('')}
                                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer bg-transparent border-none p-0"
                                    >
                                      (Deseleziona per omettere)
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-400 italic bg-slate-100 px-1 py-0.5 rounded">
                                      (Omesso dalla stampa)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Lista Opzioni */}
                          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                            {opzioniInvioRapporto.map((opt, idx) => {
                              const isActive = quoteInvioRapporto === opt;
                              const isEditing = editingOption?.category === 'inviorapporto' && editingOption?.index === idx;

                              if (isEditing) {
                                return (
                                  <div key={opt + idx} className="p-2 rounded-lg border border-slate-300 bg-white shadow-3xs space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                    <textarea
                                      rows={2}
                                      value={editingOption.text}
                                      onChange={(e) => setEditingOption({ ...editingOption, text: e.target.value })}
                                      className="w-full p-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans text-slate-800"
                                      autoFocus
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newText = editingOption.text.trim();
                                          if (newText) {
                                            setOpzioniInvioRapporto(prev => {
                                              const next = [...prev];
                                              next[idx] = newText;
                                              return next;
                                            });
                                            if (isActive) {
                                              setQuoteInvioRapporto(newText);
                                            }
                                            setEditingOption(null);
                                          }
                                        }}
                                        className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition cursor-pointer"
                                      >
                                        Salva
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingOption(null)}
                                        className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                                      >
                                        Annulla
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div 
                                  key={opt}
                                  onClick={() => setQuoteInvioRapporto(isActive ? '' : opt)}
                                  className={`flex justify-between items-center p-2.5 rounded-lg border shadow-3xs group transition select-none cursor-pointer ${
                                    isActive 
                                      ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-250' 
                                      : 'bg-white border-slate-150 hover:bg-slate-100/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      isActive ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                                    }`}>
                                      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className={`text-xs line-clamp-2 ${isActive ? 'text-emerald-950 font-bold' : 'text-slate-705 font-semibold'}`} title={opt}>
                                      {opt}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition duration-150 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingOption({ category: 'inviorapporto', index: idx, text: opt });
                                      }}
                                      className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition cursor-pointer"
                                      title="Modifica"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (opzioniInvioRapporto.length === 1) return;
                                        setDeleteConfirm({
                                          title: 'Conferma eliminazione modalità invio rapporto di prova',
                                          desc: `Sei sicuro di voler eliminare la clausola "${opt}"?`,
                                          action: () => {
                                            setOpzioniInvioRapporto(current => {
                                              const filtered = current.filter(o => o !== opt);
                                              if (quoteInvioRapporto === opt) {
                                                setQuoteInvioRapporto(filtered[0] || '');
                                              }
                                              return filtered;
                                            });
                                          }
                                        });
                                      }}
                                      disabled={opzioniInvioRapporto.length === 1}
                                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition cursor-pointer disabled:opacity-30"
                                      title="Rimuovi"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Form Aggiunta */}
                        <div className="pt-2 border-t border-slate-200 space-y-1.5">
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Nuovo Invio RdP</label>
                          <div className="flex flex-col gap-1.5">
                            <textarea
                              rows={2}
                              placeholder="Es: Invio tramite pec all'indirizzo..."
                              value={nuovoInvioRapporto}
                              onChange={(e) => setNuovoInvioRapporto(e.target.value)}
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 bg-white rounded focus:outline-none placeholder:text-slate-400 font-medium resize-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (nuovoInvioRapporto.trim() && !opzioniInvioRapporto.includes(nuovoInvioRapporto.trim())) {
                                  setOpzioniInvioRapporto(prev => [...prev, nuovoInvioRapporto.trim()]);
                                  setQuoteInvioRapporto(nuovoInvioRapporto.trim());
                                  setNuovoInvioRapporto('');
                                }
                              }}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 rounded transition cursor-pointer"
                            >
                              Aggiungi e Attiva
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* CATEGORIA 8: PROVA PRESSO ALTRO LABORATORIO */}
                      <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150 flex flex-col justify-between md:col-span-2 lg:col-span-1">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">🤝</span>
                              <div>
                                <h5 className="font-extrabold text-xs text-slate-750 uppercase tracking-wider">Esecuzione Prove Terze</h5>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] text-slate-400 font-bold">{opzioniProvaSubappaltata.length} Opzioni</span>
                                  {quoteProvaSubappaltata ? (
                                    <button 
                                      type="button" 
                                      onClick={() => setQuoteProvaSubappaltata('')}
                                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer bg-transparent border-none p-0"
                                    >
                                      (Deseleziona per omettere)
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-400 italic bg-slate-100 px-1 py-0.5 rounded">
                                      (Omesso dalla stampa)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Lista Opzioni */}
                          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                            {opzioniProvaSubappaltata.map((opt, idx) => {
                              const isActive = quoteProvaSubappaltata === opt;
                              const isEditing = editingOption?.category === 'provasubappaltata' && editingOption?.index === idx;

                              if (isEditing) {
                                return (
                                  <div key={opt + idx} className="p-2 rounded-lg border border-slate-300 bg-white shadow-3xs space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                    <textarea
                                      rows={2}
                                      value={editingOption.text}
                                      onChange={(e) => setEditingOption({ ...editingOption, text: e.target.value })}
                                      className="w-full p-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans text-slate-800"
                                      autoFocus
                                    />
                                    <div className="flex justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newText = editingOption.text.trim();
                                          if (newText) {
                                            setOpzioniProvaSubappaltata(prev => {
                                              const next = [...prev];
                                              next[idx] = newText;
                                              return next;
                                            });
                                            if (isActive) {
                                              setQuoteProvaSubappaltata(newText);
                                            }
                                            setEditingOption(null);
                                          }
                                        }}
                                        className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition cursor-pointer"
                                      >
                                        Salva
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingOption(null)}
                                        className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                                      >
                                        Annulla
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div 
                                  key={opt}
                                  onClick={() => setQuoteProvaSubappaltata(isActive ? '' : opt)}
                                  className={`flex justify-between items-center p-2.5 rounded-lg border shadow-3xs group transition select-none cursor-pointer ${
                                    isActive 
                                      ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-250' 
                                      : 'bg-white border-slate-150 hover:bg-slate-100/50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      isActive ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                                    }`}>
                                      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className={`text-xs line-clamp-2 ${isActive ? 'text-emerald-950 font-bold' : 'text-slate-705 font-semibold'}`} title={opt}>
                                      {opt}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition duration-150 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingOption({ category: 'provasubappaltata', index: idx, text: opt });
                                      }}
                                      className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition cursor-pointer"
                                      title="Modifica"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (opzioniProvaSubappaltata.length === 1) return;
                                        setDeleteConfirm({
                                          title: 'Conferma eliminazione clausola esecuzione prove terze',
                                          desc: `Sei sicuro di voler eliminare la clausola "${opt}"?`,
                                          action: () => {
                                            setOpzioniProvaSubappaltata(current => {
                                              const filtered = current.filter(o => o !== opt);
                                              if (quoteProvaSubappaltata === opt) {
                                                setQuoteProvaSubappaltata(filtered[0] || '');
                                              }
                                              return filtered;
                                            });
                                          }
                                        });
                                      }}
                                      disabled={opzioniProvaSubappaltata.length === 1}
                                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition cursor-pointer disabled:opacity-30"
                                      title="Rimuovi"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Form Aggiunta */}
                        <div className="pt-2 border-t border-slate-200 space-y-1.5">
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Nuovo Subappalto/Sede</label>
                          <div className="flex flex-col gap-1.5">
                            <textarea
                              rows={2}
                              placeholder="Es: Alcune analisi potranno essere subappaltate..."
                              value={nuovoProvaSubappaltata}
                              onChange={(e) => setNuovoProvaSubappaltata(e.target.value)}
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 bg-white rounded focus:outline-none placeholder:text-slate-400 font-medium resize-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (nuovoProvaSubappaltata.trim() && !opzioniProvaSubappaltata.includes(nuovoProvaSubappaltata.trim())) {
                                  setOpzioniProvaSubappaltata(prev => [...prev, nuovoProvaSubappaltata.trim()]);
                                  setQuoteProvaSubappaltata(nuovoProvaSubappaltata.trim());
                                  setNuovoProvaSubappaltata('');
                                }
                              }}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 rounded transition cursor-pointer"
                            >
                              Aggiungi e Attiva
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* CATEGORIA 10: NOTE DI QUALITÀ ACCREDIA */}
                      <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150 animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">🎖️</span>
                            <div>
                              <h5 className="font-extrabold text-xs text-slate-750 uppercase tracking-wider">Note Qualità ACCREDIA</h5>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-slate-400 font-bold">{opzioniNoteQualitaAccredia.length} Opzioni</span>
                                {quoteNoteQualitaAccredia ? (
                                  <button 
                                    type="button" 
                                    onClick={() => setQuoteNoteQualitaAccredia('')}
                                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer bg-transparent border-none p-0"
                                  >
                                    (Deseleziona per omettere)
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400 italic bg-slate-100 px-1 py-0.5 rounded">
                                    (Omesso dalla stampa)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Lista Opzioni */}
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {opzioniNoteQualitaAccredia.map((opt, idx) => {
                            const selectedNotes = quoteNoteQualitaAccredia
                              ? quoteNoteQualitaAccredia.split('\n').map(s => s.trim()).filter(Boolean)
                              : [];
                            const isActive = selectedNotes.includes(opt.trim());
                            const isEditing = editingOption?.category === 'qualitaaccredia' && editingOption?.index === idx;

                            if (isEditing) {
                              return (
                                <div key={opt + idx} className="p-2 rounded-lg border border-slate-300 bg-white shadow-3xs space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                  <textarea
                                    rows={2}
                                    value={editingOption.text}
                                    onChange={(e) => setEditingOption({ ...editingOption, text: e.target.value })}
                                    className="w-full p-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans text-slate-800"
                                    autoFocus
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newText = editingOption.text.trim();
                                        if (newText) {
                                          setOpzioniNoteQualitaAccredia(prev => {
                                            const next = [...prev];
                                            next[idx] = newText;
                                            return next;
                                          });
                                          if (isActive) {
                                            setQuoteNoteQualitaAccredia(prevQuote => {
                                              const notes = prevQuote ? prevQuote.split('\n').map(s => s.trim()).filter(Boolean) : [];
                                              const idxInNotes = notes.indexOf(opt.trim());
                                              if (idxInNotes !== -1) {
                                                notes[idxInNotes] = newText;
                                              }
                                              return notes.join('\n');
                                            });
                                          }
                                          setEditingOption(null);
                                        }
                                      }}
                                      className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition cursor-pointer"
                                    >
                                      Salva
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingOption(null)}
                                      className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                                    >
                                      Annulla
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div 
                                key={opt}
                                onClick={() => {
                                  setQuoteNoteQualitaAccredia(prevQuote => {
                                    const notes = prevQuote ? prevQuote.split('\n').map(s => s.trim()).filter(Boolean) : [];
                                    const trimmedOpt = opt.trim();
                                    const nextNotes = notes.includes(trimmedOpt)
                                      ? notes.filter(n => n !== trimmedOpt)
                                      : [...notes, trimmedOpt];
                                    return nextNotes.join('\n');
                                  });
                                }}
                                className={`flex justify-between items-center p-2.5 rounded-lg border shadow-3xs group transition select-none cursor-pointer ${
                                  isActive 
                                    ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-250' 
                                    : 'bg-white border-slate-150 hover:bg-slate-100/50'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                                    isActive ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                                  }`}>
                                    {isActive && (
                                      <svg className="h-2.5 w-2.5 text-white stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-705 font-semibold leading-relaxed break-words flex-1">
                                    {opt}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition duration-150 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingOption({ category: 'qualitaaccredia', index: idx, text: opt });
                                    }}
                                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition cursor-pointer"
                                    title="Modifica"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (opzioniNoteQualitaAccredia.length === 1) return;
                                      setDeleteConfirm({
                                        title: 'Conferma eliminazione nota ACCREDIA',
                                        desc: `Sei sicuro di voler eliminare questa dicitura?`,
                                        action: () => {
                                          setOpzioniNoteQualitaAccredia(current => {
                                            const filtered = current.filter(o => o !== opt);
                                            setQuoteNoteQualitaAccredia(prevQuote => {
                                              const notes = prevQuote ? prevQuote.split('\n').map(s => s.trim()).filter(Boolean) : [];
                                              const updatedNotes = notes.filter(n => n !== opt.trim());
                                              return updatedNotes.join('\n');
                                            });
                                            return filtered;
                                          });
                                        }
                                      });
                                    }}
                                    disabled={opzioniNoteQualitaAccredia.length === 1}
                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition cursor-pointer disabled:opacity-30"
                                    title="Rimuovi"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Form Aggiunta */}
                        <div className="pt-2 border-t border-slate-200 space-y-1.5">
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Aggiungi Nota ACCREDIA</label>
                          <div className="flex flex-col gap-1.5">
                            <textarea
                              rows={2}
                              placeholder="Es: Le prove segnate con (*) non sono accreditate..."
                              value={nuovaNoteQualitaAccredia}
                              onChange={(e) => setNuovaNoteQualitaAccredia(e.target.value)}
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 bg-white rounded focus:outline-none placeholder:text-slate-400 font-medium resize-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const trimmed = nuovaNoteQualitaAccredia.trim();
                                if (trimmed && !opzioniNoteQualitaAccredia.includes(trimmed)) {
                                  setOpzioniNoteQualitaAccredia(prev => [...prev, trimmed]);
                                  setQuoteNoteQualitaAccredia(prevQuote => {
                                    const notes = prevQuote ? prevQuote.split('\n').map(s => s.trim()).filter(Boolean) : [];
                                    if (!notes.includes(trimmed)) {
                                      notes.push(trimmed);
                                    }
                                    return notes.join('\n');
                                  });
                                  setNuovaNoteQualitaAccredia('');
                                }
                              }}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 rounded transition cursor-pointer"
                            >
                              Aggiungi e Attiva
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* CATEGORIA 11: MATERIALI CAMPIONAMENTO */}
                      <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150 animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">📦</span>
                            <div>
                              <h5 className="font-extrabold text-xs text-slate-750 uppercase tracking-wider">Materiali Campionamento</h5>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-slate-400 font-bold">{opzioniMaterialiCampionamento.length} Opzioni</span>
                                {quoteMaterialiCampionamento ? (
                                  <button 
                                    type="button" 
                                    onClick={() => setQuoteMaterialiCampionamento('')}
                                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer bg-transparent border-none p-0"
                                  >
                                    (Deseleziona per omettere)
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400 italic bg-slate-100 px-1 py-0.5 rounded">
                                    (Omesso dalla stampa)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Lista Opzioni */}
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {opzioniMaterialiCampionamento.map((opt, idx) => {
                            const isActive = quoteMaterialiCampionamento === opt;
                            const isEditing = editingOption?.category === 'materialicampionamento' && editingOption?.index === idx;

                            if (isEditing) {
                              return (
                                <div key={opt + idx} className="p-2 rounded-lg border border-slate-300 bg-white shadow-3xs space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                  <textarea
                                    rows={2}
                                    value={editingOption.text}
                                    onChange={(e) => setEditingOption({ ...editingOption, text: e.target.value })}
                                    className="w-full p-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans text-slate-800"
                                    autoFocus
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newText = editingOption.text.trim();
                                        if (newText) {
                                          setOpzioniMaterialiCampionamento(prev => {
                                            const next = [...prev];
                                            next[idx] = newText;
                                            return next;
                                          });
                                          if (isActive) {
                                            setQuoteMaterialiCampionamento(newText);
                                          }
                                          setEditingOption(null);
                                        }
                                      }}
                                      className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition cursor-pointer"
                                    >
                                      Salva
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingOption(null)}
                                      className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                                    >
                                      Annulla
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div 
                                key={opt}
                                onClick={() => setQuoteMaterialiCampionamento(isActive ? '' : opt)}
                                className={`flex justify-between items-center p-2.5 rounded-lg border shadow-3xs group transition select-none cursor-pointer ${
                                  isActive 
                                    ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-250' 
                                    : 'bg-white border-slate-150 hover:bg-slate-100/50'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                    isActive ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                                  }`}>
                                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                  </div>
                                  <span className="text-xs text-slate-705 font-semibold leading-relaxed break-words flex-1">
                                    {opt}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition duration-150 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingOption({ category: 'materialicampionamento', index: idx, text: opt });
                                    }}
                                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition cursor-pointer"
                                    title="Modifica"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (opzioniMaterialiCampionamento.length === 1) return;
                                      setDeleteConfirm({
                                        title: 'Conferma eliminazione materiale campionamento',
                                        desc: `Sei sicuro di voler eliminare questa dicitura?`,
                                        action: () => {
                                          setOpzioniMaterialiCampionamento(current => {
                                            const filtered = current.filter(o => o !== opt);
                                            if (quoteMaterialiCampionamento === opt) {
                                              setQuoteMaterialiCampionamento(filtered[0] || '');
                                            }
                                            return filtered;
                                          });
                                        }
                                      });
                                    }}
                                    disabled={opzioniMaterialiCampionamento.length === 1}
                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition cursor-pointer disabled:opacity-30"
                                    title="Rimuovi"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Form Aggiunta */}
                        <div className="pt-2 border-t border-slate-200 space-y-1.5">
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Aggiungi Materiale</label>
                          <div className="flex flex-col gap-1.5">
                            <textarea
                              rows={2}
                              placeholder="Es: Contenitori sterili forniti gratuitamente..."
                              value={nuovaMaterialiCampionamento}
                              onChange={(e) => setNuovaMaterialiCampionamento(e.target.value)}
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 bg-white rounded focus:outline-none placeholder:text-slate-400 font-medium resize-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                  if (nuovaMaterialiCampionamento.trim() && !opzioniMaterialiCampionamento.includes(nuovaMaterialiCampionamento.trim())) {
                                    setOpzioniMaterialiCampionamento(prev => [...prev, nuovaMaterialiCampionamento.trim()]);
                                    setQuoteMaterialiCampionamento(nuovaMaterialiCampionamento.trim());
                                    setNuovaMaterialiCampionamento('');
                                  }
                              }}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 rounded transition cursor-pointer"
                            >
                              Aggiungi e Attiva
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* CATEGORIA 12: NOTE PER L'ACCETTAZIONE */}
                      <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150 animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">📥</span>
                            <div>
                              <h5 className="font-extrabold text-xs text-slate-750 uppercase tracking-wider">Note per l&apos;Accettazione</h5>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-slate-400 font-bold">{opzioniNoteAccettazione.length} Opzioni</span>
                                {quoteNoteAccettazione ? (
                                  <button 
                                    type="button" 
                                    onClick={() => setQuoteNoteAccettazione('')}
                                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer bg-transparent border-none p-0"
                                  >
                                    (Deseleziona per omettere)
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400 italic bg-slate-100 px-1 py-0.5 rounded">
                                    (Omesso dalla stampa)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Lista Opzioni */}
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {opzioniNoteAccettazione.map((opt, idx) => {
                            const isActive = quoteNoteAccettazione === opt;
                            const isEditing = editingOption?.category === 'noteaccettazione' && editingOption?.index === idx;

                            if (isEditing) {
                              return (
                                <div key={opt + idx} className="p-2 rounded-lg border border-slate-300 bg-white shadow-3xs space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                  <textarea
                                    rows={2}
                                    value={editingOption.text}
                                    onChange={(e) => setEditingOption({ ...editingOption, text: e.target.value })}
                                    className="w-full p-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans text-slate-800"
                                    autoFocus
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newText = editingOption.text.trim();
                                        if (newText) {
                                          setOpzioniNoteAccettazione(prev => {
                                            const next = [...prev];
                                            next[idx] = newText;
                                            return next;
                                          });
                                          if (isActive) {
                                            setQuoteNoteAccettazione(newText);
                                          }
                                          setEditingOption(null);
                                        }
                                      }}
                                      className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition cursor-pointer"
                                    >
                                      Salva
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingOption(null)}
                                      className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                                    >
                                      Annulla
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div 
                                key={opt}
                                onClick={() => setQuoteNoteAccettazione(isActive ? '' : opt)}
                                className={`flex justify-between items-center p-2.5 rounded-lg border shadow-3xs group transition select-none cursor-pointer ${
                                  isActive 
                                    ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-250' 
                                    : 'bg-white border-slate-150 hover:bg-slate-100/50'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                    isActive ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                                  }`}>
                                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                  </div>
                                  <span className="text-xs text-slate-705 font-semibold leading-relaxed break-words flex-1">
                                    {opt}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition duration-150 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingOption({ category: 'noteaccettazione', index: idx, text: opt });
                                    }}
                                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition cursor-pointer"
                                    title="Modifica"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (opzioniNoteAccettazione.length === 1) return;
                                      setDeleteConfirm({
                                        title: 'Conferma eliminazione nota accettazione',
                                        desc: `Sei sicuro di voler eliminare questa dicitura?`,
                                        action: () => {
                                          setOpzioniNoteAccettazione(current => {
                                            const filtered = current.filter(o => o !== opt);
                                            if (quoteNoteAccettazione === opt) {
                                              setQuoteNoteAccettazione(filtered[0] || '');
                                            }
                                            return filtered;
                                          });
                                        }
                                      });
                                    }}
                                    disabled={opzioniNoteAccettazione.length === 1}
                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition cursor-pointer disabled:opacity-30"
                                    title="Rimuovi"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Form Aggiunta */}
                        <div className="pt-2 border-t border-slate-200 space-y-1.5">
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Aggiungi Nota Accettazione</label>
                          <div className="flex flex-col gap-1.5">
                            <textarea
                              rows={2}
                              placeholder="Es: I campioni vengono accettati dal lunedì al giovedì..."
                              value={nuovaNoteAccettazione}
                              onChange={(e) => setNuovaNoteAccettazione(e.target.value)}
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 bg-white rounded focus:outline-none placeholder:text-slate-400 font-medium resize-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (nuovaNoteAccettazione.trim() && !opzioniNoteAccettazione.includes(nuovaNoteAccettazione.trim())) {
                                  setOpzioniNoteAccettazione(prev => [...prev, nuovaNoteAccettazione.trim()]);
                                  setQuoteNoteAccettazione(nuovaNoteAccettazione.trim());
                                  setNuovaNoteAccettazione('');
                                }
                              }}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 rounded transition cursor-pointer"
                            >
                              Aggiungi e Attiva
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* SEZIONE ALTRO / CLAUSOLE AGGIUNTIVE */}
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                      <span>🔮 Altro / Clausole Aggiuntive</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">

                      {/* CATEGORIA 13: ALTRO */}
                      <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150 animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">🔮</span>
                            <div>
                              <h5 className="font-extrabold text-xs text-slate-755 uppercase tracking-wider">Altro / Clausole Aggiuntive</h5>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-slate-400 font-bold">{opzioniAltro.length} Opzioni</span>
                                {quoteAltro ? (
                                  <button 
                                    type="button" 
                                    onClick={() => setQuoteAltro('')}
                                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer bg-transparent border-none p-0"
                                  >
                                    (Deseleziona per omettere)
                                  </button>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400 italic bg-slate-100 px-1 py-0.5 rounded">
                                    (Omesso dalla stampa)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Lista Opzioni */}
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {opzioniAltro.map((opt, idx) => {
                            const isActive = quoteAltro === opt;
                            const isEditing = editingOption?.category === 'altro' && editingOption?.index === idx;

                            if (isEditing) {
                              return (
                                <div key={opt + idx} className="p-2 rounded-lg border border-slate-300 bg-white shadow-3xs space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                  <textarea
                                    rows={2}
                                    value={editingOption.text}
                                    onChange={(e) => setEditingOption({ ...editingOption, text: e.target.value })}
                                    className="w-full p-1.5 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans text-slate-800"
                                    autoFocus
                                  />
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newText = editingOption.text.trim();
                                        if (newText) {
                                          setOpzioniAltro(prev => {
                                            const next = [...prev];
                                            next[idx] = newText;
                                            return next;
                                          });
                                          if (isActive) {
                                            setQuoteAltro(newText);
                                          }
                                          setEditingOption(null);
                                        }
                                      }}
                                      className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition cursor-pointer"
                                    >
                                      Salva
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingOption(null)}
                                      className="px-2 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded transition cursor-pointer"
                                    >
                                      Annulla
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div 
                                key={opt}
                                onClick={() => setQuoteAltro(isActive ? '' : opt)}
                                className={`flex justify-between items-center p-2.5 rounded-lg border shadow-3xs group transition select-none cursor-pointer ${
                                  isActive 
                                    ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-250' 
                                    : 'bg-white border-slate-150 hover:bg-slate-100/50'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                    isActive ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
                                  }`}>
                                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                  </div>
                                  <span className="text-xs text-slate-705 font-semibold leading-relaxed break-words flex-1">
                                    {opt}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition duration-150 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingOption({ category: 'altro', index: idx, text: opt });
                                    }}
                                    className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition cursor-pointer"
                                    title="Modifica"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (opzioniAltro.length === 1) return;
                                      setDeleteConfirm({
                                        title: 'Conferma eliminazione clausola "Altro"',
                                        desc: `Sei sicuro di voler eliminare questa dicitura?`,
                                        action: () => {
                                          setOpzioniAltro(current => {
                                            const filtered = current.filter(o => o !== opt);
                                            if (quoteAltro === opt) {
                                              setQuoteAltro(filtered[0] || '');
                                            }
                                            return filtered;
                                          });
                                        }
                                      });
                                    }}
                                    disabled={opzioniAltro.length === 1}
                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition cursor-pointer disabled:opacity-30"
                                    title="Rimuovi"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Form Aggiunta */}
                        <div className="pt-2 border-t border-slate-200 space-y-1.5">
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Aggiungi Altra Clausola</label>
                          <div className="flex flex-col gap-1.5">
                            <textarea
                              rows={2}
                              placeholder="Es: Per qualsiasi contestazione rivolgersi a..."
                              value={nuovaAltro}
                              onChange={(e) => setNuovaAltro(e.target.value)}
                              className="w-full px-2.5 py-1 text-xs border border-slate-200 bg-white rounded focus:outline-none placeholder:text-slate-400 font-medium resize-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (nuovaAltro.trim() && !opzioniAltro.includes(nuovaAltro.trim())) {
                                  setOpzioniAltro(prev => [...prev, nuovaAltro.trim()]);
                                  setQuoteAltro(nuovaAltro.trim());
                                  setNuovaAltro('');
                                }
                              }}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 rounded transition cursor-pointer"
                            >
                              Aggiungi e Attiva
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* CATEGORIA 9 & 14 REORGANIZZATA: MODELLO MASTER CONTRATTO, CONDIZIONI GENERALI E PRIVACY */}
                  <div className="space-y-6 bg-slate-100/50 p-6 rounded-2xl border-2 border-dashed border-slate-200 mt-6 font-sans">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xl">📄</span>
                            <div>
                              <h5 className="font-extrabold text-xs text-slate-755 uppercase tracking-wider">Gestione Modello Master, Titoli e Codici dei Moduli</h5>
                              <p className="text-[10px] text-slate-400 font-bold m-0 mt-0.5">
                                Configura i titoli, i testi standard e i codici di identificazione (es. MOD. BIO-04 REV. 02) per il preventivo e l'allegato.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                          
                          {/* 1. CONTRATTO PRINCIPALE (PREVENTIVO) */}
                          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-3xs flex flex-col justify-between">
                            <div className="space-y-4">
                              <h6 className="font-bold text-xs text-slate-750 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                                <span className="text-sm">⚖️</span>
                                <span>Contratto Principale (Preventivo)</span>
                              </h6>

                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                  Titolo del Documento
                                </label>
                                <input
                                  type="text"
                                  value={defaultTitoloModulo}
                                  onChange={(e) => {
                                    setDefaultTitoloModulo(e.target.value);
                                    setQuoteTitoloModulo(e.target.value);
                                  }}
                                  placeholder="Es: PROPOSTA DI PREVENTIVO"
                                  className="w-full px-3 py-1.5 text-xs border border-slate-250 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold text-slate-800"
                                />
                                
                                {/* Lista Preset Titoli */}
                                <div className="space-y-1 pt-1 max-h-36 overflow-y-auto pr-1">
                                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Template rapidi disponibili:</span>
                                  {presetTitoloTemplates.map((t, tIdx) => {
                                    const isSel = defaultTitoloModulo === t;
                                    const isEditingT = editingTitoloIndex === tIdx;
                                    if (isEditingT) {
                                      return (
                                        <div key={t + tIdx} className="flex gap-1 items-center p-1 bg-slate-50 rounded border border-slate-200">
                                          <input
                                            type="text"
                                            value={editingTitoloText}
                                            onChange={(e) => setEditingTitoloText(e.target.value)}
                                            className="flex-1 px-1.5 py-0.5 text-[10px] border border-slate-250 rounded bg-white font-bold"
                                            autoFocus
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (editingTitoloText.trim()) {
                                                const updated = [...presetTitoloTemplates];
                                                updated[tIdx] = editingTitoloText.trim();
                                                setPresetTitoloTemplates(updated);
                                                if (isSel) {
                                                  setDefaultTitoloModulo(editingTitoloText.trim());
                                                  setQuoteTitoloModulo(editingTitoloText.trim());
                                                }
                                                setEditingTitoloIndex(null);
                                              }
                                            }}
                                            className="text-emerald-600 hover:text-emerald-700 font-extrabold text-[10px] px-1 cursor-pointer"
                                          >
                                            Salva
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingTitoloIndex(null)}
                                            className="text-slate-400 hover:text-slate-500 font-extrabold text-[10px] px-1 cursor-pointer"
                                          >
                                            Annulla
                                          </button>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div key={t} className={`flex justify-between items-center px-2 py-1 rounded text-xs border ${isSel ? 'bg-emerald-50/50 border-emerald-300 font-bold text-emerald-950' : 'bg-slate-50/50 border-slate-150 text-slate-700'} hover:bg-slate-100/50 transition duration-150`}>
                                        <span className="cursor-pointer flex-1 truncate" onClick={() => {
                                          setDefaultTitoloModulo(t);
                                          setQuoteTitoloModulo(t);
                                        }}>
                                          {t}
                                        </span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingTitoloIndex(tIdx);
                                              setEditingTitoloText(t);
                                            }}
                                            className="text-slate-400 hover:text-blue-600 p-0.5 rounded"
                                            title="Modifica"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = presetTitoloTemplates.filter((_, i) => i !== tIdx);
                                              setPresetTitoloTemplates(updated);
                                              if (isSel && updated.length > 0) {
                                                setDefaultTitoloModulo(updated[0]);
                                                setQuoteTitoloModulo(updated[0]);
                                              }
                                            }}
                                            className="text-slate-400 hover:text-red-500 p-0.5 rounded"
                                            title="Elimina"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Aggiungi Preset Titolo */}
                                <div className="flex gap-1 pt-1">
                                  <input
                                    type="text"
                                    placeholder="Nuovo template titolo..."
                                    value={newPresetTitoloText}
                                    onChange={(e) => setNewPresetTitoloText(e.target.value)}
                                    className="flex-1 px-2 py-1 text-[10px] border border-slate-200 rounded placeholder:text-slate-400 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (newPresetTitoloText.trim() && !presetTitoloTemplates.includes(newPresetTitoloText.trim())) {
                                        setPresetTitoloTemplates([...presetTitoloTemplates, newPresetTitoloText.trim()]);
                                        setDefaultTitoloModulo(newPresetTitoloText.trim());
                                        setQuoteTitoloModulo(newPresetTitoloText.trim());
                                        setNewPresetTitoloText('');
                                      }
                                    }}
                                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] rounded cursor-pointer shrink-0"
                                  >
                                    Aggiungi
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-1.5 pt-2 border-t border-slate-100 font-sans">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                  Codice del Modulo
                                </label>
                                <input
                                  type="text"
                                  value={quoteNomeModulo}
                                  onChange={(e) => {
                                    setQuoteNomeModulo(e.target.value);
                                    setDefaultNomeModulo(e.target.value);
                                  }}
                                  placeholder="Es: MOD. BIO-04 REV. 02"
                                  className="w-full px-3 py-1.5 text-xs border border-slate-250 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold text-slate-800"
                                />
                              </div>
                            </div>

                            <div className="pt-2 text-[10px] text-slate-400 italic">
                              * Le modifiche qui impostate diverranno il default per i nuovi preventivi.
                            </div>
                          </div>

                          {/* 2. CONDIZIONI GENERALI DI CONTRATTO (ALLEGATO) */}
                          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-3xs flex flex-col justify-between">
                            <div className="space-y-4">
                              <h6 className="font-bold text-xs text-slate-750 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                                <span className="text-sm">📄</span>
                                <span>Condizioni Generali (Allegato)</span>
                              </h6>

                              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 transition">
                                <div className="flex items-center gap-2.5">
                                  <input
                                    id="default-include-contract-checkbox"
                                    type="checkbox"
                                    checked={defaultIncludeContract}
                                    onChange={(e) => {
                                      setDefaultIncludeContract(e.target.checked);
                                      setQuoteIncludeContract(e.target.checked);
                                    }}
                                    className="h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <label htmlFor="default-include-contract-checkbox" className="text-xs font-black text-slate-700 cursor-pointer">
                                    Includi di default nella stampa
                                  </label>
                                </div>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${defaultIncludeContract ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                                  {defaultIncludeContract ? 'ATTIVO' : 'ESCLUSO'}
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                  Titolo dell'Allegato
                                </label>
                                <input
                                  type="text"
                                  value={defaultContractModelName}
                                  onChange={(e) => {
                                    setDefaultContractModelName(e.target.value);
                                    setQuoteContractModelName(e.target.value);
                                  }}
                                  placeholder="Es: CONDIZIONI GENERALI DI CONTRATTO"
                                  className="w-full px-3 py-1.5 text-xs border border-slate-250 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold text-slate-800"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                  Codice Modulo Allegato
                                </label>
                                <input
                                  type="text"
                                  value={defaultContractModelCode}
                                  onChange={(e) => {
                                    setDefaultContractModelCode(e.target.value);
                                    setQuoteContractModelCode(e.target.value);
                                  }}
                                  placeholder="Es: MOD. CONTR-01 REV. 01"
                                  className="w-full px-3 py-1.5 text-xs border border-slate-250 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono font-bold text-slate-800"
                                />
                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                  Codice identificativo stampato in <strong>alto a destra</strong> sul foglio delle condizioni generali.
                                </p>
                              </div>

                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                  Articoli / Clausole Contrattuali dell'Allegato
                                </label>
                                <textarea
                                  rows={6}
                                  value={defaultContractText}
                                  onChange={(e) => {
                                    setDefaultContractText(e.target.value);
                                    setQuoteContractText(e.target.value);
                                    localStorage.setItem('lab_default_contract_text', e.target.value);
                                  }}
                                  placeholder="Scrivi qui gli articoli contrattuali del modello..."
                                  className="w-full p-2.5 text-xs border border-slate-250 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans leading-relaxed resize-y text-slate-700 font-medium"
                                />
                              </div>
                            </div>
                          </div>

                          {/* 3. PRIVACY & GESTIONE ARCHIVIO CODICI */}
                          <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-3xs flex flex-col justify-between">
                            <div className="space-y-4">
                              <h6 className="font-bold text-xs text-slate-750 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                                <span className="text-sm">🔒</span>
                                <span>Privacy</span>
                              </h6>

                              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 transition">
                                <div className="flex items-center gap-2.5">
                                  <input
                                    id="default-include-privacy-checkbox"
                                    type="checkbox"
                                    checked={defaultIncludePrivacy}
                                    onChange={(e) => {
                                      setDefaultIncludePrivacy(e.target.checked);
                                      setQuoteIncludePrivacy(e.target.checked);
                                    }}
                                    className="h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <label htmlFor="default-include-privacy-checkbox" className="text-xs font-black text-slate-700 cursor-pointer">
                                    Includi di default nella stampa
                                  </label>
                                </div>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${defaultIncludePrivacy ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                                  {defaultIncludePrivacy ? 'ATTIVO' : 'ESCLUSO'}
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                  Testo Informativa sul Trattamento dei Dati (GDPR)
                                </label>
                                <textarea
                                  rows={5}
                                  value={defaultPrivacyText}
                                  onChange={(e) => {
                                    setDefaultPrivacyText(e.target.value);
                                    setQuotePrivacyText(e.target.value);
                                    localStorage.setItem('lab_default_privacy_text', e.target.value);
                                  }}
                                  placeholder="Scrivi qui l'informativa GDPR standard..."
                                  className="w-full p-2.5 text-xs border border-slate-250 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans leading-relaxed resize-y text-slate-700 font-medium"
                                />
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 italic">
                              💡 Digitando direttamente, modifichi il codice al volo. Tutte le modifiche sono subito memorizzate.
                            </div>
                          </div>

                        </div>
                      </div>

                </div>

                {/* Spiegazione Info box */}
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3">
                  <span className="text-xl">💡</span>
                  <div className="text-xs text-slate-700 space-y-1.5">
                    <strong className="block text-emerald-850 font-extrabold uppercase tracking-wider text-[10px]">Scelte rapide, automatiche e trasparenti</strong>
                    <p className="m-0 text-slate-650 leading-relaxed">
                      Clicca su un elemento qualsiasi per attivarlo (sarà evidenziato con la bordatura <strong className="text-emerald-700">verde</strong>). Quando componi o modifichi un preventivo, non dovrai piú selezionare ripetutamente queste voci: <strong>il sistema prenderà in automatico le opzioni standard selezionate in questa scheda</strong> e le stamperà direttamente sulla lettera di preventivo ufficiale.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {/* MODALE DI ANTEPRIMA DI STAMPA UFFICIALE */}
      <AnimatePresence>
        {printPreviewQuote && (() => {
          const prev = printPreviewQuote;
          const client = clients.find(c => c.id === prev.clienteId);
          
          // Calcola subtotale e importi
          const subtotal = prev.proveSelezionate.reduce((sum, item) => sum + (item.quantita * item.prezzoApplicato), 0) +
            prev.pacchettiSelezionati.reduce((sum, item) => sum + (item.quantita * item.prezzoApplicato), 0);
          
          const discountAmount = prev.scontoPercentuale ? (subtotal * prev.scontoPercentuale) / 100 : 0;
          const taxableAmount = prev.totale;
          const vatAmount = taxableAmount * 0.22;
          const totalWithVat = taxableAmount + vatAmount;

          const hasAccredia = prev.proveSelezionate.some(item => getProvaInfo(item.provaId)?.accreditataAccredia) ||
            prev.pacchettiSelezionati.some(item => getPacchettoInfo(item.pacchettoId)?.proveIds.some(pid => getProvaInfo(pid)?.accreditataAccredia));

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 md:p-10 print:fixed print:inset-0 print:z-[9999] print:bg-white print:p-0 print:block overflow-y-auto"
            >
              <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden print:max-h-none print:shadow-none print:rounded-none border border-slate-100 print:border-none">
                
                {/* INTESTAZIONE MODALE (NASCOSTA NELLA STAMPA REALE) */}
                <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0 print:hidden">
                  <div className="flex items-center gap-2">
                    <Printer className="h-5 w-5 text-purple-400 font-bold" />
                    <div>
                      <h3 className="font-extrabold text-sm tracking-wide">ANTEPRIMA DI STAMPA UFFICIALE</h3>
                      <p className="text-[10px] text-slate-400 font-mono flex flex-wrap items-center gap-2">
                        <span>Documento commerciale {prev.codice}</span>
                        {typeof window !== 'undefined' && window.self !== window.top && (
                          <span className="text-amber-450 font-black bg-amber-500/10 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider animate-pulse border border-amber-500/20">
                            ⚠️ Per salvare/stampare: Apri l'app in una nuova scheda
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {typeof window !== 'undefined' && window.self !== window.top ? (
                      <a
                        href={`${window.location.origin}${window.location.pathname}?printQuoteId=${prev.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md border border-emerald-550 flex items-center gap-2 transition cursor-pointer"
                      >
                        <Printer className="h-3.5 w-3.5 animate-bounce" />
                        Lancia Stampa / PDF (Nuova Scheda)
                      </a>
                    ) : (
                      <button
                        onClick={() => {
                          window.focus();
                          window.print();
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md border border-emerald-550 flex items-center gap-2 transition cursor-pointer"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Lancia Stampa / PDF
                      </button>
                    )}
                    <button
                      onClick={() => setPrintPreviewQuote(null)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 hover:border-slate-600 transition cursor-pointer"
                      title="Chiudi anteprima"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* AREA DI STAMPA EFFETTIVA (STILE A4 FISICO CON MARGINI MA RESPONSIVE) */}
                <div 
                  id="print-area-container"
                  className="overflow-y-auto p-8 md:p-12 bg-white flex-1 font-sans text-slate-800 print:p-0 print:overflow-visible"
                >
                  <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                      @page {
                        margin: 0 !important;
                      }
                      body {
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                      }
                      /* Nasconde tutti gli elementi della pagina durante la stampa */
                      body * {
                        visibility: hidden !important;
                      }
                      /* Mostra esclusivamente il contenitore di stampa ed i suoi figli */
                      #print-area-container, #print-area-container * {
                        visibility: visible !important;
                      }
                      /* Forza la scomparsa di elementi strutturali e pulsanti per evitare spazi vuoti */
                      nav, aside, header, footer, button, .print\\:hidden, #sidebar-accettazione, #card-dash-accettazione {
                        display: none !important;
                        height: 0 !important;
                        overflow: hidden !important;
                      }
                      #print-area-container {
                        display: block !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: auto !important;
                        margin: 0 !important;
                        padding: 1.6cm !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        color: black !important;
                      }
                      .break-before-page {
                        page-break-before: always !important;
                        break-before: page !important;
                      }
                    }
                    /* On-screen visual break representation */
                    @media screen {
                      .break-before-page {
                        margin-top: 3rem !important;
                        padding-top: 3rem !important;
                        border-top: 3px dashed #cbd5e1 !important;
                        position: relative;
                      }
                      .break-before-page::before {
                        content: "SCAFFOLD: NUOVA PAGINA (ALLEGATO)";
                        position: absolute;
                        top: -12px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: #f1f5f9;
                        color: #64748b;
                        font-size: 9px;
                        font-weight: 800;
                        padding: 2px 8px;
                        border-radius: 9999px;
                        border: 1px solid #cbd5e1;
                        letter-spacing: 0.05em;
                      }
                    }
                  `}} />
                  
                  {/* FOGLIO A4 - CONTENITORE PRINCIPALE */}
                  <div className="max-w-[720px] mx-auto space-y-8 print:max-w-full print:w-full print:mx-0">
                    
                    {/* INTESTAZIONE DOCUMENTALE */}
                    <div className="flex justify-between items-start gap-6 border-b-2 border-slate-900 pb-5">
                      <div>
                        {/* Marchio Lab */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-lg tracking-wider">
                            BC
                          </div>
                          <div>
                            <h1 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tight m-0">BIOCHEM ANALYTICAL</h1>
                            <p className="text-[9px] font-bold text-slate-500 tracking-widest uppercase mb-0">Laboratorio di Analisi e Controllo Qualità</p>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-3 font-mono leading-relaxed">
                          Sede Legale: Via delle Scienze n. 42, 00100 Roma (RM)<br />
                          P.IVA / C.F. 01234567890 | Cap. Soc. 150.000 € i.v.<br />
                          Tel: 06 555 1234 | E-mail: preventivi@biochem-analytical.it
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end">
                        <span className="bg-slate-100 border border-slate-200 text-slate-800 font-black text-[10px] tracking-widest px-3 py-1 rounded-md uppercase font-mono block">
                          {prev.titoloModulo || 'PROPOSTA DI PREVENTIVO'}
                        </span>
                        {prev.nomeModulo && (
                          <span className="text-[8px] text-slate-500 font-mono mt-1 uppercase block tracking-wider font-bold">
                            {prev.nomeModulo}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* BLOCCO METADATI PREVENTIVO + INFORMAZIONI CLIENTE */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {/* Dati Documento */}
                      <div className="bg-slate-50/75 border border-slate-150 p-4 rounded-2xl space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-0.5">Dati Preventivo</span>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Codice Documento:</span>
                          <span className="font-mono font-bold text-slate-900">{prev.codice}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Data Emissione:</span>
                          <span className="font-mono text-slate-700 font-semibold">{formatDateItalianFullMonth(prev.dataCreazione)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Validità Offerta:</span>
                          <span className="text-slate-700 font-extrabold">{prev.validitaOfferta || '90 Giorni'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Data di Scadenza:</span>
                          <span className="font-mono text-slate-700 font-semibold">
                            {(() => {
                              const status = getOfferValidityStatus(prev.dataCreazione, prev.validitaOfferta);
                              return formatDateItalianFullMonth(status.scadenzaFormattata);
                            })()}
                          </span>
                        </div>
                      </div>

                      {/* Intestatario / Cliente */}
                      <div className="border border-slate-200 p-4 rounded-2xl space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-450 tracking-widest block mb-1">Cliente Spett.le</span>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight mb-0">{client?.denominazione || 'Cliente non specificato'}</h4>
                        <p className="text-xs text-slate-500 leading-snug pt-1">
                          {client?.indirizzo && <span>📍 {client.indirizzo}<br /></span>}
                          {client?.partitaIva && <span>P.IVA: <strong className="font-mono">{client.partitaIva}</strong><br /></span>}
                          {client?.email && <span>✉️ {client.email} | 📞 {client.telefono}</span>}
                        </p>
                        {prev.destinatarioFinale && prev.destinatarioFinale !== 'Stesso Committente' && prev.destinatarioFinale !== client?.denominazione && (
                          <div className="mt-2.5 pt-2 border-t border-slate-150">
                            <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider block mb-0.5">Destinatario Finale RdP</span>
                            <span className="text-[11px] font-bold text-slate-800 leading-tight block">🏢 {prev.destinatarioFinale}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* INTRODUZIONE / OGGETTO */}
                    <div className="text-xs text-slate-700 leading-relaxed space-y-1.5 mt-2">
                      {prev.oggettoOfferta !== "" && (
                        <div className="font-semibold text-slate-900 text-xs">
                          {prev.oggettoOfferta || defaultQuoteOggetto}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500 font-medium">
                        Provvediamo a trasmettere la nostra migliore proposta commerciale relativa all&apos;esecuzione delle prove analitiche, merceologiche o pacchetti forfettari qui specificati:
                      </div>
                    </div>

                    {/* TABELLA DETTAGLIATA ARTICOLI INCLUSI */}
                    {(() => {
                      const isPriceHidden = prev.nascondiPrezziSingoli && (prev.proveSelezionate.length + prev.pacchettiSelezionati.length) > 1;
                      return (
                        <>
                          <div className="border border-slate-300 rounded-xl overflow-hidden bg-white/50">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider">
                                  <th className="py-2.5 px-3">Prova</th>
                                  <th className="py-2.5 px-3">Metodo</th>
                                  <th className="py-2.5 px-3 text-center">Qtà</th>
                                  {!isPriceHidden ? (
                                    <>
                                      <th className="py-2.5 px-3 text-right">Unitario</th>
                                      <th className="py-2.5 px-3 text-right">Totale Netto</th>
                                    </>
                                  ) : (
                                    <th className="py-2.5 px-3 text-center">Note Prezzo</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 text-slate-700">
                                {/* Singole Prove */}
                                {prev.proveSelezionate.map(item => {
                                  const info = getProvaInfo(item.provaId);
                                  return (
                                    <tr key={item.provaId} className={`hover:bg-slate-50/55 ${info?.accreditataAccredia ? 'bg-emerald-50/15' : ''}`}>
                                      <td className="py-2.5 px-3 font-semibold text-slate-850">
                                        <div className="flex items-start gap-1">
                                          <span>{info?.nome || 'Parametro Chimico'}{info?.accreditataAccredia && ' *'}</span>
                                        </div>
                                        {item.limitiSelezionati && item.limitiSelezionati.length > 0 && (
                                          <div className="mt-1.5 space-y-0.5 text-[10px] pl-1 font-normal text-slate-600">
                                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Limiti e Note Normative:</div>
                                            {item.limitiSelezionati.map(lim => (
                                              <div key={lim.id} className="flex flex-wrap items-center gap-1 text-[10.5px]">
                                                <span className="font-mono text-slate-800 font-bold bg-slate-50 px-1 border border-slate-150 rounded">{lim.valore} {lim.unitaMisura}</span>
                                                <span className="text-slate-400 font-serif">→</span>
                                                <span className="text-emerald-700 font-semibold">{lim.norma}</span>
                                                {lim.note && <span className="text-slate-400 text-[9.5px] italic">({lim.note})</span>}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[9px] font-semibold">{info?.metodoAnalitico || 'Generale'}</td>
                                      <td className="py-2.5 px-3 text-center font-bold text-slate-705">{item.quantita}</td>
                                      {!isPriceHidden ? (
                                        <>
                                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">€{item.prezzoApplicato.toFixed(2)}</td>
                                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">€{(item.quantita * item.prezzoApplicato).toFixed(2)}</td>
                                        </>
                                      ) : (
                                        <td className="py-2.5 px-3 text-center text-slate-450 italic text-[10px]">Incluso nel preventivo</td>
                                      )}
                                    </tr>
                                  );
                                })}

                                {/* Pacchetti */}
                                {prev.pacchettiSelezionati.map(item => {
                                  const info = getPacchettoInfo(item.pacchettoId);
                                  return (
                                    <tr key={item.pacchettoId} className="hover:bg-slate-50/55">
                                      <td className="py-2.5 px-3 font-semibold text-slate-850">
                                        <div className="font-bold text-purple-900">{info?.nome || 'Pacchetto Speciale'}</div>
                                        {info?.proveIds && info.proveIds.length > 0 && (
                                          <div className="text-[9px] text-slate-400 mt-1 pl-1 border-l border-slate-205 leading-relaxed font-normal">
                                            Include: {info.proveIds.map((pId, idx) => {
                                              const pInfo = getProvaInfo(pId);
                                              return (
                                                <span key={pId} className="inline-flex items-center gap-0.5">
                                                  {pInfo?.nome}
                                                  {pInfo?.accreditataAccredia && ' *'}
                                                  {idx < info.proveIds.length - 1 ? ', ' : ''}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-400 italic font-medium text-[10px]">Pacchetto Multi-Analitico</td>
                                      <td className="py-2.5 px-3 text-center font-bold text-slate-705">{item.quantita}</td>
                                      {!isPriceHidden ? (
                                        <>
                                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">€{item.prezzoApplicato.toFixed(2)}</td>
                                          <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-700">€{(item.quantita * item.prezzoApplicato).toFixed(2)}</td>
                                        </>
                                      ) : (
                                        <td className="py-2.5 px-3 text-center text-slate-450 italic text-[10px]">Incluso nel preventivo</td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* NOTE ACCREDIA */}
                          {hasAccredia && (
                            <div className="bg-emerald-50/30 border border-emerald-150/80 rounded-lg p-3 text-[10px] text-emerald-800 leading-relaxed shadow-3xs">
                              <strong className="font-bold uppercase tracking-wide block mb-0.5">Note:</strong>
                              {prev.noteQualitaAccredia ? (
                                <span className="whitespace-pre-line">{prev.noteQualitaAccredia}</span>
                              ) : (
                                <span>
                                  * Prova accreditata da ACCREDIA. Le analisi contrassegnate sopra con l'asterisco (*) sono coperte da accreditamento nazionale ai sensi della norma internazionale <strong>UNI EN ISO/IEC 17025</strong>. L&apos;accreditamento attesta l&apos;idoneità tecnica del laboratorio e garantisce l&apos;imparzialità, l&apos;indipendenza e l&apos;accuratezza legale del rapporto di prova emesso ad ogni effetto di legge.
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* SEZIONE TOTALI PREVENTIVATI */}
                    <div className="flex justify-end pt-3">
                      <div className="w-full sm:w-72 bg-slate-50/60 border border-slate-200 p-4 rounded-2xl space-y-2">
                        {prev.scontoPercentuale ? (
                          <>
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>Imponibile Lordo:</span>
                              <span className="font-mono">€{(prev.totale / (1 - prev.scontoPercentuale / 100)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-rose-600 font-semibold bg-rose-50/80 px-1.5 py-0.5 rounded border border-rose-100">
                              <span>Sconto ({prev.scontoPercentuale}%):</span>
                              <span className="font-mono">-€{((prev.totale / (1 - prev.scontoPercentuale / 100)) - prev.totale).toFixed(2)}</span>
                            </div>
                          </>
                        ) : null}
                        <div className="flex justify-between text-xs text-slate-705 font-bold">
                          <span>Imponibile Netto:</span>
                          <span className="font-mono">€{taxableAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>I.V.A. (22%):</span>
                          <span className="font-mono">€{vatAmount.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-slate-250 pt-2 flex justify-between text-sm font-black text-slate-900 bg-slate-100/60 -mx-4 -mb-4 p-4 rounded-b-2xl">
                          <span>TOTALE CON IVA:</span>
                          <span className="font-mono text-base">€{totalWithVat.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    {/* TERMINI ED AREA FIRME (ORGANIZZAZIONE COMPLETA ED ELEGANTE) */}
                    <div className="pt-6 border-t border-slate-200 text-xs text-slate-800 space-y-4">
                      {(() => {
                        const activeConditionsList = filterActiveConditions(prev);

                        if (activeConditionsList.length === 0) return null;

                        let standardIndex = 1;
                        const renderedItems = activeConditionsList.map(item => {
                          let displayId: string;
                          let bgClass = "bg-slate-100 text-slate-700";
                          if (item.isBadge) {
                            displayId = item.defaultId as string;
                            bgClass = item.bg || "";
                          } else {
                            displayId = String(standardIndex++);
                          }
                          return { ...item, displayId, bgClass };
                        });

                        const midpoint = Math.ceil(renderedItems.length / 2);
                        const leftColItems = renderedItems.slice(0, midpoint);
                        const rightColItems = renderedItems.slice(midpoint);

                        return (
                          <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-150 space-y-3">
                            <strong className="font-black text-slate-900 block uppercase tracking-wider text-[10px] pb-1.5 border-b border-slate-200">
                              Modalità, Clausole e Condizioni Generali di Fornitura
                            </strong>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-[10px] text-slate-600 font-semibold leading-relaxed">
                              {/* Colonna 1 */}
                              <div className="space-y-3">
                                {leftColItems.map(item => (
                                  <div key={item.key} className="flex items-start gap-2">
                                    <span className={`w-5 h-5 rounded-full ${item.bgClass} flex items-center justify-center font-black text-[9px] shrink-0 mt-0.5`}>
                                      {item.displayId}
                                    </span>
                                    <div>
                                      <span className="text-slate-900 font-extrabold uppercase text-[8.5px] tracking-wider block">{item.label}:</span>
                                      <div className="whitespace-pre-line text-slate-600 mt-0.5 leading-relaxed">{item.text}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Colonna 2 */}
                              <div className="space-y-3">
                                {rightColItems.map(item => (
                                  <div key={item.key} className="flex items-start gap-2">
                                    <span className={`w-5 h-5 rounded-full ${item.bgClass} flex items-center justify-center font-black text-[9px] shrink-0 mt-0.5`}>
                                      {item.displayId}
                                    </span>
                                    <div>
                                      <span className="text-slate-900 font-extrabold uppercase text-[8.5px] tracking-wider block">{item.label}:</span>
                                      <div className="whitespace-pre-line text-slate-600 mt-0.5 leading-relaxed">{item.text}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                        <p className="m-0 pt-2 text-[9px] text-slate-400 border-t border-slate-200/50 mt-2 italic text-center font-medium">
                          Per accettazione si prega di restituire copia timbrata e firmata della presente proposta di preventivo.
                        </p>

                      {/* Firme per accettazione */}
                      <div className="flex justify-between items-baseline gap-8 text-center pt-4">
                        <div className="flex-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block mb-12">Per Accettazione (Il Cliente)</span>
                          <div className="border-b border-dashed border-slate-300 w-full inline-block"></div>
                          <span className="text-[9px] text-slate-400 mt-1 block font-medium">Timbro e Firma Legale</span>
                        </div>
                        <div className="flex-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block mb-12">Biochem Analytical S.r.l.</span>
                          <div className="border-b border-dashed border-slate-300 w-full inline-block"></div>
                          <span className="text-[9px] text-emerald-800 font-bold mt-1 block font-semibold">Direzione di Laboratorio</span>
                        </div>
                      </div>
                    </div>

                    {/* INFORMATIVA PRIVACY INTEGRATA */}
                    {defaultIncludePrivacy && (prev.privacyText || defaultPrivacyText) && (
                      <div className="pt-8 border-t border-slate-300 mt-8 break-before-page">
                        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3 mb-5">
                          <div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest m-0 flex items-center gap-2">
                              <span>🛡️ INFORMATIVA PRIVACY</span>
                            </h3>
                            <p className="text-[10px] text-blue-800 font-extrabold tracking-wide uppercase m-0 mt-0.5">
                              Trattamento dei Dati Personali (Reg. UE 2016/679 - GDPR)
                            </p>
                          </div>
                          <div className="text-right text-[8.5px] text-slate-500 font-mono leading-relaxed">
                            <div className="text-[9.5px] text-slate-850 font-extrabold uppercase tracking-wide mb-0.5 font-mono">
                              REG. UE 2016/679 (GDPR)
                            </div>
                            Riferimento Preventivo: <strong>{prev.codice}</strong><br />
                            Data d&apos;Emissione: {formatDateItalianFullMonth(prev.dataCreazione)}<br />
                            Cliente Committente: {client?.denominazione}
                          </div>
                        </div>

                        {/* Layout a due colonne per l'informativa sulla privacy, proprio come un contratto professionale */}
                        <div className="text-[8.5px] text-slate-650 text-justify font-sans leading-normal mb-6" style={{ columnCount: 2, columnGap: '24px' }}>
                          {(prev.privacyText || defaultPrivacyText).split('\n').map((paragraph, idx) => {
                            if (!paragraph.trim()) return null;
                            return (
                              <p key={idx} className="mb-2 break-inside-avoid">
                                {paragraph}
                              </p>
                            );
                          })}
                        </div>
                        
                        {/* Area di Consenso Privacy Sottoscritta */}
                        <div className="grid grid-cols-2 gap-8 pt-6 mt-6 border-t border-slate-200 border-dashed text-center break-inside-avoid">
                          <div className="text-left flex items-start gap-2 max-w-[95%] leading-normal text-[8px] text-slate-500">
                            <span className="inline-block w-3.5 h-3.5 border border-slate-400 rounded-sm bg-white mt-0.5 shrink-0 flex items-center justify-center font-bold text-slate-800 text-[9px]"></span>
                            <span>
                              Il Cliente Committente dichiara di aver ricevuto, letto e pienamente compreso l&apos;informativa soprastante e acconsente espressamente al trattamento dei dati personali forniti per le finalità connesse all&apos;esecuzione del presente mandato.
                            </span>
                          </div>
                          <div>
                            <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-450 block mb-12">Firma Consenso GDPR del Cliente</span>
                            <div className="border-b border-dashed border-slate-300 w-full inline-block"></div>
                            <span className="text-[8px] text-slate-400 mt-1 block font-medium">Per Accettazione ed Espresso Consenso</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ALLEGATO CONDIZIONI GENERALI DI CONTRATTO (PAGINA INTEGRATIVA DI STAMPA) */}
                    {defaultIncludeContract && (prev.contractText || defaultContractText) && (
                      <div className="pt-8 border-t border-slate-300 mt-8 break-before-page">
                        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3 mb-5">
                          <div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest m-0 flex items-center gap-2">
                              <span>📄 ALLEGATO CONTRATTUALE</span>
                            </h3>
                            <p className="text-[10px] text-blue-800 font-extrabold tracking-wide uppercase m-0 mt-0.5">
                              {prev.contractModelName || defaultContractModelName}
                            </p>
                          </div>
                          <div className="text-right text-[8.5px] text-slate-500 font-mono leading-relaxed">
                            <div className="text-[9.5px] text-slate-850 font-extrabold uppercase tracking-wide mb-0.5 font-mono">
                              {prev.contractModelCode || defaultContractModelCode}
                            </div>
                            Riferimento Preventivo: <strong>{prev.codice}</strong><br />
                            Data d&apos;Emissione: {formatDateItalianFullMonth(prev.dataCreazione)}<br />
                            Cliente Committente: {client?.denominazione}
                          </div>
                        </div>

                        {/* Layout a due colonne per condizioni generali, proprio come i contratti ufficiali professionali */}
                        <div className="text-[8.5px] text-slate-650 text-justify font-sans leading-normal mb-6" style={{ columnCount: 2, columnGap: '24px' }}>
                          {(prev.contractText || defaultContractText).split('\n').map((paragraph, idx) => {
                            if (!paragraph.trim()) return null;
                            return (
                              <p key={idx} className="mb-2 break-inside-avoid">
                                {paragraph}
                              </p>
                            );
                          })}
                        </div>
                        
                        {/* Doppia Sottoscrizione Specifica Clausole Vessatorie (Art. 1341-1342 C.C.) - FONDAMENTALE IN ITALIA */}
                        <div className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[8px] leading-relaxed break-inside-avoid">
                          <p className="font-extrabold text-slate-800 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                            <span>⚖️</span> Approvazione specifica delle clausole vessatorie (ai sensi degli artt. 1341 e 1342 c.c.)
                          </p>
                          <p className="text-slate-600 text-justify mb-3">
                            Il Cliente dichiara di aver preso visione, di aver attentamente esaminato e di approvare specificamente, con la sottoscrizione apposta a fianco, ai sensi e per gli effetti degli articoli 1341 e 1342 del Codice Civile italiano, le clausole contenute nelle soprastanti Condizioni Generali di Contratto: <strong>Articolo 2 (Limitazione di responsabilità e importo massimo di risarcimento civile)</strong> e <strong>Articolo 5 (Pattuizione del Foro competente ed esclusivo per ogni controversia giudiziaria)</strong>.
                          </p>
                          <div className="flex justify-end">
                            <div className="w-[45%] text-center border-t border-dashed border-slate-350 pt-1.5 mt-4">
                              <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 block">Firma per Approvazione Specifica del Cliente</span>
                            </div>
                          </div>
                        </div>

                        {/* Area di Sottoscrizione Principale dell'Allegato */}
                        <div className="grid grid-cols-2 gap-8 pt-6 mt-6 border-t border-slate-200 border-dashed text-center break-inside-avoid">
                          <div>
                            <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-450 block mb-12">Il Cliente Committente (Timbro e Firma)</span>
                            <div className="border-b border-dashed border-slate-300 w-full inline-block"></div>
                            <span className="text-[8px] text-slate-400 mt-1 block font-medium">Per Accettazione e Sottoscrizione delle Condizioni Generali</span>
                          </div>
                          <div>
                            <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-450 block mb-12">Laboratorio Biochem Analytical S.r.l.</span>
                            <div className="border-b border-dashed border-slate-300 w-full inline-block"></div>
                            <span className="text-[8px] text-emerald-800 font-extrabold mt-1 block">La Direzione</span>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                </div>

              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* MODAL TRACCIABILITA CAMBIO STATO (Richiesta Utente) */}
      <AnimatePresence>
        {tracingQuoteStatusId && (() => {
          const matchingQuote = preventivi.find(q => q.id === tracingQuoteStatusId);
          if (!matchingQuote) return null;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden"
              >
                {/* Header */}
                <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-amber-400" />
                    <div>
                      <h3 className="font-extrabold text-sm uppercase tracking-wider">Cambio Stato Tracciabile</h3>
                      <p className="text-[10px] text-slate-400 font-mono">Preventivo: {matchingQuote.codice}</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setTracingQuoteStatusId(null)}
                    className="p-1 hover:bg-white/10 rounded-lg text-slate-350 hover:text-white transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4 text-xs">
                  {/* Stato Attuale */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                    <span className="font-bold text-slate-500">Stato Attuale:</span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      matchingQuote.stato === 'Approvato' ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' :
                      matchingQuote.stato === 'In Approvazione' ? 'bg-amber-50 text-amber-700 border border-amber-250' :
                      matchingQuote.stato === 'Scaduto' ? 'bg-orange-50 text-orange-700 border border-orange-250' :
                      'bg-rose-50 text-rose-700 border border-rose-250'
                    }`}>{matchingQuote.stato}</span>
                  </div>

                  {/* Storico Approvazioni (Audit Trail) */}
                  <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-100/80 rounded-xl text-left">
                    <span className="font-black text-slate-500 uppercase text-[9px] tracking-widest block mb-1">
                      🕒 Storico delle Approvazioni (Audit Trail)
                    </span>
                    {matchingQuote.statoHistory && matchingQuote.statoHistory.length > 0 ? (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {matchingQuote.statoHistory.map((h, hIdx) => (
                          <div key={hIdx} className="text-[10px] flex justify-between items-start p-2 bg-white border border-slate-150 rounded-lg shadow-3xs">
                            <div className="space-y-0.5">
                              <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                                <span className="text-slate-400 font-extrabold font-mono text-[8.5px] uppercase line-through">{h.statoPrecedente || 'Iniziale'}</span>
                                <span className="text-slate-450 font-bold">&rarr;</span>
                                <span className={`px-1 py-0.2 rounded text-[8.5px] font-black tracking-wider uppercase ${
                                  h.statoNuovo === 'Approvato' ? 'bg-emerald-50 text-emerald-700 font-black border border-emerald-150' :
                                  h.statoNuovo === 'Invio alla Fatturazione' ? 'bg-blue-50 text-blue-700 font-black border border-blue-150' :
                                  h.statoNuovo === 'In Approvazione' ? 'bg-amber-50 text-amber-700 font-bold border border-amber-150' :
                                  h.statoNuovo === 'Scaduto' ? 'bg-orange-50 text-orange-700 font-bold border border-orange-150' :
                                  'bg-rose-50 text-rose-700 border border-rose-150'
                                }`}>{h.statoNuovo}</span>
                              </div>
                              <div className="text-[9.5px] text-slate-500">
                                Gestito da: <strong className="text-slate-800 font-bold">{h.operatore}</strong>
                              </div>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono font-bold shrink-0">{h.dataOra}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-[10px] italic leading-relaxed px-1">
                        Nessun passaggio di stato registrato in precedenza (questo è lo stato iniziale).
                      </p>
                    )}
                  </div>

                  {/* Seleziona Nuovo Stato */}
                  <div className="space-y-1.5">
                    <label className="block font-black text-slate-500 uppercase text-[9px] tracking-widest">
                      Seleziona Nuovo Stato Contabile (*):
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { val: 'In Approvazione', label: '⏳ In Approvazione' },
                        { val: 'Approvato', label: '✅ Approvato' },
                        { val: 'Rifiutato', label: '❌ Rifiutato' },
                        { val: 'Scaduto', label: '⚠️ Scaduto' }
                      ].map(st => (
                        <button
                          key={st.val}
                          type="button"
                          onClick={() => setTracingSelectedStatus(st.val as any)}
                          className={`p-2.5 rounded-xl border text-center font-bold tracking-tight text-[10px] transition cursor-pointer flex flex-col items-center justify-center gap-1 leading-tight ${
                            tracingSelectedStatus === st.val
                              ? 'bg-slate-950 text-white border-slate-950 shadow-md'
                              : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Operatore Firma */}
                  <div className="space-y-2">
                    <label className="block font-black text-slate-500 uppercase text-[9px] tracking-widest">
                      Operatore che effettua la modifica (*):
                    </label>
                    <select
                      value={tracingOperator}
                      onChange={(e) => {
                        setTracingOperator(e.target.value);
                        setTracingPassword('');
                        setTracingError(null);
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      {operators && operators.length > 0 ? (
                        operators.map(op => (
                          <option key={op.nome} value={op.nome}>{op.nome} ({op.ruolo})</option>
                        ))
                      ) : (
                        <>
                          <option value="Dott. Chim. F. Lupo">Dott. Chim. F. Lupo (Biochem)</option>
                          <option value="Dott.ssa S. Bianchi">Dott.ssa S. Bianchi (Lab Tech)</option>
                          <option value="Dott. R. Vitale">Dott. R. Vitale (emcvit@gmail.com)</option>
                        </>
                      )}
                      <option value="Altro">Altro operatore (inserimento manuale)</option>
                    </select>

                    {tracingOperator === 'Altro' && (
                      <input
                        type="text"
                        value={tracingCustomOperator}
                        onChange={(e) => setTracingCustomOperator(e.target.value)}
                        placeholder="Nome e Cognome operatore..."
                        className="w-full bg-white border border-slate-250 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 mt-1.5 animate-fadeIn"
                        required
                      />
                    )}
                  </div>

                  {/* Codice Password Firma di Sicurezza (Richiesta Utente) */}
                  <div className="space-y-1.5 text-left">
                    <label className="block font-black text-rose-850 uppercase text-[9px] tracking-widest flex items-center gap-1">
                      🔐 Password di Firma Operatore (*):
                    </label>
                    <input
                      type="password"
                      required
                      value={tracingPassword}
                      onChange={(e) => {
                        setTracingPassword(e.target.value);
                        setTracingError(null);
                      }}
                      placeholder="Inserisci password per confermare la firma sul cambio stato..."
                      className="w-full text-xs font-semibold p-2.5 bg-white border border-rose-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl outline-none placeholder-slate-400 text-slate-805"
                    />
                    <p className="text-[9.5px] text-slate-400 leading-normal">
                      Digita la chiave d&apos;accesso dell&apos;operatore (es. <code className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded">lupo123</code>, <code className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded">bianchi123</code>, <code className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded">vitale123</code> o <code className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded">lims123</code>).
                    </p>
                  </div>

                  {/* Visualizzazione dell'errore (Richiesta Utente) */}
                  {tracingError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-left font-bold text-xs text-rose-800 animate-fadeIn">
                      ⚠️ {tracingError}
                    </div>
                  )}

                  {/* Informazioni d'ora e data */}
                  <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl text-[10.5px] leading-normal text-indigo-950 flex items-start gap-2">
                    <Clock className="h-4 w-4 text-indigo-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>Marcatura Temporale Automatica:</strong>
                      <p className="text-slate-500 font-mono font-semibold mt-0.5">{new Date().toLocaleString('it-IT')}</p>
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTracingQuoteStatusId(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold hover:bg-slate-100 transition cursor-pointer text-center"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmStatusChange}
                    className="flex-1 py-2.5 rounded-xl bg-slate-950 text-white font-bold hover:bg-slate-900 transition shadow-md cursor-pointer text-center"
                  >
                    Registra e Salva
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* MODAL DI CONFERMA CANCELLAZIONE REUSABLE */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 max-w-sm w-full space-y-4"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5 text-red-605" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-slate-900">
                    {deleteConfirm.title}
                  </h4>
                  {deleteConfirm.desc && (
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                      {deleteConfirm.desc}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-650 font-bold hover:bg-slate-50 transition text-xs cursor-pointer text-center"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteConfirm.action();
                    setDeleteConfirm(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-red-650 hover:bg-red-700 text-white font-bold transition shadow-xs text-xs cursor-pointer text-center"
                >
                  Sì, elimina
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DI SALVATAGGIO PREVENTIVO COME PACCHETTO */}
      <AnimatePresence>
        {saveAsPackageQuote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-w-md w-full"
            >
              <form onSubmit={handleConfirmSaveAsPackage}>
                <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <FolderPlus className="h-4.5 w-4.5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">Salva come Pacchetto</h4>
                      <p className="text-[10px] text-slate-400 font-bold">Crea un pacchetto forfettario riutilizzabile</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSaveAsPackageQuote(null)}
                    className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-650 transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Nome Specifico Pacchetto (*)
                    </label>
                    <input
                      type="text"
                      required
                      value={newPackageName}
                      onChange={(e) => setNewPackageName(e.target.value)}
                      placeholder="es. Pacchetto Nutrienti Terreno Avanzato"
                      className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none placeholder-slate-400 text-slate-805"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Descrizione
                    </label>
                    <textarea
                      value={newPackageDesc}
                      onChange={(e) => setNewPackageDesc(e.target.value)}
                      placeholder="Fornisci una descrizione delle analisi racchiuse in questo pacchetto..."
                      className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none placeholder-slate-400 text-slate-805 h-20 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Categoria Merceologica
                      </label>
                      <select
                        value={newPackageCategory}
                        onChange={(e) => setNewPackageCategory(e.target.value)}
                        className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 outline-none"
                      >
                        {(() => {
                          const categoriesFromProve = Array.from(new Set(prove.map(p => p.categoriaMerceologica).filter(Boolean)));
                          const finalCategories = categoriesFromProve.length > 0 
                            ? categoriesFromProve 
                            : ["Oli e Grassi", "Vini ed Aceti", "Cereali e Farine", "Allergeni e Tracce", "Terreni e Acque rurale"];
                          return finalCategories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ));
                        })()}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        Prezzo Scontato Forfettario (€) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={newPackagePrice}
                        onChange={(e) => setNewPackagePrice(e.target.value)}
                        className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl outline-none text-slate-805"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl">
                    <span className="block text-[9px] font-black text-emerald-800 uppercase tracking-widest mb-1">
                      Analisi incluse nel pacchetto:
                    </span>
                    <div className="max-h-24 overflow-y-auto text-[10px] font-bold text-slate-600 space-y-0.5 pr-1">
                      {(() => {
                        const directProve = saveAsPackageQuote.proveSelezionate?.map(p => getProvaInfo(p.provaId)?.nome).filter(Boolean) || [];
                        const packProveNames: string[] = [];
                        saveAsPackageQuote.pacchettiSelezionati?.forEach(item => {
                          const pInfo = getPacchettoInfo(item.pacchettoId);
                          pInfo?.proveIds.forEach(pid => {
                            const name = getProvaInfo(pid)?.nome;
                            if (name) packProveNames.push(name);
                          });
                        });
                        const allCombined = Array.from(new Set([...directProve, ...packProveNames]));
                        if (allCombined.length === 0) return <span className="italic text-slate-400">Nessuna prova rilevata</span>;
                        return allCombined.map((name, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 py-0.5 border-b border-slate-100/60 last:border-0">
                            <span className="text-emerald-500 shrink-0">✓</span>
                            <span className="truncate">{name}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveAsPackageQuote(null)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 bg-white text-slate-650 font-bold hover:bg-slate-100 transition text-xs cursor-pointer text-center"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-md text-xs cursor-pointer text-center"
                  >
                    Salva Pacchetto
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
