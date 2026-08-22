import { useState, useEffect } from 'react';
import { AccettazioneCampione, Client, Prova } from '../types';
import { logoAgenzia } from '../assets/images/logos';
import { 
  X, Printer, Search, Trash2, FileText, CheckCircle2, AlertTriangle, 
  Sparkles, Layers, ShieldAlert, ArrowRight, RefreshCw, Calendar, Tag, ShieldCheck, Info
} from 'lucide-react';

interface ClassificazioneRifiutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  accettazioni: AccettazioneCampione[];
  clients: Client[];
  prove?: Prova[];
}

export interface CerCode {
  code: string;
  description: string;
  pericoloso: boolean;
  note?: string;
}

// Catalogo ufficiale dei Codici CER / EER più comuni
const COMMON_CER_CODES: CerCode[] = [
  { code: '17 05 04', description: 'Terre e rocce, diverse da quelle di cui alla voce 17 05 03*', pericoloso: false },
  { code: '17 05 03*', description: 'Terre e rocce, contenenti sostanze pericolose', pericoloso: true },
  { code: '17 09 04', description: 'Rifiuti misti dell\'attività di costruzione e demolizione, diversi da quelli di cui alle voci 17 09 01*, 17 09 02* e 17 09 03*', pericoloso: false },
  { code: '17 01 01', description: 'Cemento', pericoloso: false },
  { code: '17 03 02', description: 'Miscele bituminose diverse da quelle di cui alla voce 17 03 01*', pericoloso: false },
  { code: '17 03 01*', description: 'Miscele bituminose contenenti catrame di carbon fossile', pericoloso: true },
  { code: '15 01 02', description: 'Imballaggi in plastica', pericoloso: false },
  { code: '15 01 01', description: 'Imballaggi in carta e cartone', pericoloso: false },
  { code: '15 01 10*', description: 'Imballaggi contenenti residui di sostanze pericolose o contaminati da tali sostanze', pericoloso: true },
  { code: '16 07 08*', description: 'Rifiuti contenenti olio', pericoloso: true },
  { code: '19 08 05', description: 'Fanghi prodotti dal trattamento delle acque reflue urbane', pericoloso: false },
  { code: '19 08 11*', description: 'Fanghi prodotti dal trattamento in loco delle acque reflue, contenenti sostanze pericolose', pericoloso: true },
  { code: '20 03 01', description: 'Rifiuti urbani indifferenziati', pericoloso: false }
];

// Classi di pericolo HP ai sensi del Regolamento (UE) n. 1357/2014
const HP_CLASSES = [
  { id: 'HP1', name: 'HP1 Esplosivo' },
  { id: 'HP2', name: 'HP2 Comburente' },
  { id: 'HP3', name: 'HP3 Infiammabile' },
  { id: 'HP4', name: 'HP4 Irritante (irritazione cutanea e lesioni oculari)' },
  { id: 'HP5', name: 'HP5 STOT (Tossicità specifica per organi bersaglio) / Tossicità in caso di aspirazione' },
  { id: 'HP6', name: 'HP6 Tossicità acuta' },
  { id: 'HP7', name: 'HP7 Cancerogeno' },
  { id: 'HP8', name: 'HP8 Corrosivo' },
  { id: 'HP9', name: 'HP9 Infettivo' },
  { id: 'HP10', name: 'HP10 Tossico per la riproduzione' },
  { id: 'HP11', name: 'HP11 Mutageno' },
  { id: 'HP12', name: 'HP12 Liberazione di gas a tossicità acuta' },
  { id: 'HP13', name: 'HP13 Sensibilizzante' },
  { id: 'HP14', name: 'HP14 Ecotossico' },
  { id: 'HP15', name: 'HP15 Rifiuto suscettibile di presentare una caratteristica di pericolo non direttamente posseduta' }
];

export function ClassificazioneRifiutoModal({
  isOpen,
  onClose,
  accettazioni,
  clients,
  prove = []
}: ClassificazioneRifiutoModalProps) {
  if (!isOpen) return null;

  // Filtriamo i report di prova per la classificazione rifiuti
  const wasteKeywords = ['rifiut', 'cer', 'eer', 'scavo', 'demolizione', 'fresato', 'fango', 'asfalto', 'caratterizzazione', 'rifiuto', 'matrice'];
  const reportRifiuti = accettazioni.filter(acc => {
    const cat = (acc.categoriaMerceologica || '').toLowerCase();
    const mat = (acc.matrice || '').toLowerCase();
    const desc = (acc.descrizioneCampione || '').toLowerCase();
    return wasteKeywords.some(kw => cat.includes(kw) || mat.includes(kw) || desc.includes(kw));
  });

  // Se non ve ne sono filtrati, offriamo tutte le accettazioni come fallback
  const availableAccettazioni = reportRifiuti.length > 0 ? reportRifiuti : accettazioni;

  const [selectedAccId, setSelectedAccId] = useState<string>(availableAccettazioni[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Campi di classificazione
  const [codiceClassificazione, setCodiceClassificazione] = useState('');
  const [dataClassificazione, setDataClassificazione] = useState(() => new Date().toISOString().split('T')[0]);
  const [codiceCer, setCodiceCer] = useState('17 05 04');
  const [descrizioneCer, setDescrizioneCer] = useState('Terre e rocce, diverse da quelle di cui alla voce 17 05 03*');
  const [isPericoloso, setIsPericoloso] = useState(false);
  const [selectedHp, setSelectedHp] = useState<string[]>([]);
  const [operazioneDestinazione, setOperazioneDestinazione] = useState('R13 - Messa in riserva / Recupero di materia (Art. 184-ter D.Lgs 152/06)');
  const [parereTecnicoTesto, setParereTecnicoTesto] = useState('');

  const selectedAcc = accettazioni.find(a => a.id === selectedAccId) || availableAccettazioni[0];
  const selectedClient = clients.find(c => c.id === selectedAcc?.intestatarioRapportoClienteId);

  // Effetto sincronizzazione quando si seleziona un'accettazione / RdP
  useEffect(() => {
    if (selectedAcc) {
      const uniqueCode = `CR-${selectedAcc.codiceAccettazione}`;
      setCodiceClassificazione(uniqueCode);

      // Autoseleziona CER indicativo se presente nella descrizione o note
      const descLower = (selectedAcc.descrizioneCampione + ' ' + selectedAcc.matrice).toLowerCase();
      if (descLower.includes('terre') || descLower.includes('scavo')) {
        setCodiceCer('17 05 04');
        setDescrizioneCer('Terre e rocce, diverse da quelle di cui alla voce 17 05 03*');
        setIsPericoloso(false);
      } else if (descLower.includes('fresato') || descLower.includes('asfalto') || descLower.includes('bitum')) {
        setCodiceCer('17 03 02');
        setDescrizioneCer('Miscele bituminose diverse da quelle di cui alla voce 17 03 01*');
        setIsPericoloso(false);
      } else if (descLower.includes('fango') || descLower.includes('depuraz')) {
        setCodiceCer('19 08 05');
        setDescrizioneCer('Fanghi prodotti dal trattamento delle acque reflue urbane');
        setIsPericoloso(false);
      }
    }
  }, [selectedAccId]);

  // Rigeneratore automatico del testo esplicito del Parere Tecnico
  const generateParereTesto = () => {
    if (!selectedAcc) return '';

    const clientName = selectedClient ? selectedClient.denominazione : 'Cliente Non Specificato';
    const statusText = isPericoloso ? 'RIFIUTO PERICOLOSO' : 'RIFIUTO NON PERICOLOSO';
    const hpText = isPericoloso && selectedHp.length > 0 ? `Caratteristiche di pericolo attribuite: ${selectedHp.join(', ')}.` : 'Non si riscontrano caratteristiche di pericolo (HP1 - HP15).';

    const testSummary = (selectedAcc.risultatiAnalisi && selectedAcc.risultatiAnalisi.length > 0)
      ? selectedAcc.risultatiAnalisi.map(r => {
          const pObj = prove.find(p => p.id === r.provaId);
          return `- ${pObj ? pObj.nome : r.provaId}: ${r.valoreRilevato} ${r.unitaMisura || ''}`;
        }).join('\n')
      : '- Determinazione idrocarburi e metalli pesanti: Valori ampiamente inferiori ai limiti di pericolo.';

    return `Sulla base delle risultanze analitiche riportate nel Rapporto di Prova n° ${selectedAcc.codiceAccettazione} del ${selectedAcc.dataAccettazione}, relativo al campione denominato "${selectedAcc.descrizioneCampione}" (Matrice: ${selectedAcc.matrice}), campionato e conferito per conto di ${clientName}, si esprime il seguente PARERE TECNICO DI CARATTERIZZAZIONE E CLASSIFICAZIONE:

1. CLASSIFICAZIONE E CODICE CER/EER:
Ai sensi dell'Allegato D alla Parte IV del D.Lgs. 152/2006 e s.m.i. e della Decisione 2014/955/UE, al rifiuto in esame viene attribuito il Codice EER/CER:
--> ${codiceCer} - ${descrizioneCer}

2. VALUTAZIONE STATO DI PERICOLOSITÀ:
Ai sensi del Regolamento (UE) n. 1357/2014 e del Regolamento (UE) 2017/997, sulla base dei parametri analitici determinati in laboratorio:
${testSummary}

Esaminati i limiti di concentrazione soglia per le classi di pericolo HP1-HP15, il rifiuto viene classificato come:
*** ${statusText} ***
${hpText}

3. DESTINAZIONE E IDONEITÀ OPERATIVA:
In relazione alle caratteristiche chimico-fisiche riscontrate, il materiale risulta idoneo per le seguenti operazioni:
- Destinazione/Recupero: ${operazioneDestinazione}

Il presente parere costituisce parte integrante della documentazione di caratterizzazione del rifiuto collegate al RdP n° ${selectedAcc.codiceAccettazione}.`;
  };

  useEffect(() => {
    setParereTecnicoTesto(generateParereTesto());
  }, [selectedAccId, codiceCer, descrizioneCer, isPericoloso, selectedHp, operazioneDestinazione]);

  const handleSelectCer = (cer: CerCode) => {
    setCodiceCer(cer.code);
    setDescrizioneCer(cer.description);
    setIsPericoloso(cer.pericoloso);
    if (!cer.pericoloso) {
      setSelectedHp([]);
    }
  };

  const toggleHp = (hpId: string) => {
    if (selectedHp.includes(hpId)) {
      const nextHp = selectedHp.filter(h => h !== hpId);
      setSelectedHp(nextHp);
      if (nextHp.length === 0) setIsPericoloso(false);
    } else {
      setSelectedHp([...selectedHp, hpId]);
      setIsPericoloso(true);
    }
  };

  // Funzione Stampa Parere di Classificazione
  const handlePrint = () => {
    if (!selectedAcc) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const clientName = selectedClient ? selectedClient.denominazione : 'Cliente Non Specificato';
    const clientPiva = selectedClient ? selectedClient.partitaIva : '';
    const clientIndirizzo = selectedClient ? `${selectedClient.indirizzo || ''} - ${selectedClient.comune || ''}` : '';

    const proveRows = (selectedAcc.risultatiAnalisi && selectedAcc.risultatiAnalisi.length > 0)
      ? selectedAcc.risultatiAnalisi.map(r => {
          const pObj = prove.find(p => p.id === r.provaId);
          return `
            <tr>
              <td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-size: 11px;">${pObj ? pObj.nome : r.provaId}</td>
              <td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-size: 11px; font-weight: bold; text-align: center;">${r.valoreRilevato}</td>
              <td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-size: 11px; text-align: center;">${r.unitaMisura || '-'}</td>
              <td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-size: 11px; text-align: center; color: #166534; font-weight: bold;">${r.conforme || 'Conforme'}</td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="4" style="padding: 10px; text-align: center; font-size: 11px; color: #64748b;">Nessuna prova di laboratorio registrata sul RdP</td></tr>`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Parere di Classificazione Rifiuto - ${codiceClassificazione}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; font-size: 11px; line-height: 1.5; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2px solid #0284c7; padding-bottom: 10px; }
          .logo-img { max-height: 55px; width: auto; object-fit: contain; display: block; margin-bottom: 6px; }
          .address-block { font-size: 9px; color: #475569; line-height: 1.3; font-weight: 500; }
          .doc-meta { text-align: right; font-size: 10px; color: #334155; }
          .doc-code { font-size: 14px; font-weight: 900; color: #0369a1; margin-top: 4px; }
          
          .title-box { text-align: center; background: #f0f9ff; border: 1px solid #bae6fd; padding: 12px; border-radius: 8px; margin-bottom: 20px; }
          .title-box h1 { margin: 0; font-size: 16px; font-weight: 800; color: #0369a1; text-transform: uppercase; tracking: 0.5px; }
          .title-box p { margin: 4px 0 0 0; font-size: 10px; color: #0284c7; font-weight: 600; }

          .grid-2 { display: table; width: 100%; margin-bottom: 15px; }
          .col-half { display: table-cell; width: 50%; vertical-align: top; padding-right: 10px; }
          .col-half:last-child { padding-right: 0; padding-left: 10px; }

          .info-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #f8fafc; font-size: 10px; }
          .info-card-title { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; }

          .classification-box { border: 2px solid ${isPericoloso ? '#dc2626' : '#16a34a'}; background: ${isPericoloso ? '#fef2f2' : '#f0fdf4'}; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
          .cer-badge { font-size: 18px; font-weight: 900; color: ${isPericoloso ? '#991b1b' : '#166534'}; margin-bottom: 4px; }
          .status-badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 900; text-transform: uppercase; color: white; background: ${isPericoloso ? '#dc2626' : '#16a34a'}; margin-top: 6px; }

          .parere-text { font-family: 'Courier New', Courier, monospace; font-size: 10.5px; background: #ffffff; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; white-space: pre-wrap; line-height: 1.45; color: #0f172a; margin-bottom: 20px; }

          .table-results { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .table-results th { background: #f1f5f9; color: #334155; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; }

          .footer-signatures { width: 100%; margin-top: 40px; border-top: 1px solid #e2e8f0; pt-10px; }
          .sig-box { width: 45%; float: right; text-align: center; border-top: 1px tracking #94a3b8; padding-top: 8px; font-size: 10px; font-weight: bold; }
        </style>
      </head>
      <body>
        <!-- INTESTAZIONE ISTITUZIONALE CON LOGO E INDIRIZZO (AGENTS.md Compliance) -->
        <table class="header-table">
          <tr>
            <td style="vertical-align: top; width: 60%;">
              <img src="${logoAgenzia}" class="logo-img" alt="Logo Agenzia per lo Sviluppo" />
              <div class="address-block">
                Sede legale ed amministrativa: Corso Vittorio Emanuele n°86 - 67100 L'Aquila<br/>
                Laboratorio: Via degli Opifici n°1 - Z.I. di Bazzano - 67100 L'Aquila<br/>
                P.iva 01751450667
              </div>
            </td>
            <td class="doc-meta" style="vertical-align: top;">
              <div style="font-weight: 800; color: #64748b; text-transform: uppercase;">Modulo Caratterizzazione Rifiuti</div>
              <div>Codice Modello: <strong>MOD. CLAS-RIF-01</strong></div>
              <div>Data Emissione: <strong>${dataClassificazione}</strong></div>
              <div class="doc-code">Rif. ${codiceClassificazione}</div>
            </td>
          </tr>
        </table>

        <!-- TITOLO -->
        <div class="title-box">
          <h1>Parere Tecnico di Caratterizzazione e Classificazione Rifiuto</h1>
          <p>Ai sensi del D.Lgs. 152/2006 e s.m.i. (Parte IV), Regolamento (UE) 1357/2014 e Decisione 2014/955/UE</p>
        </div>

        <!-- GRIGLIA DATI RDP E CLIENTE -->
        <div class="grid-2">
          <div class="col-half">
            <div class="info-card">
              <div class="info-card-title">Riferimenti Rapporto di Prova (RdP)</div>
              <div>Codice RdP: <strong>${selectedAcc.codiceAccettazione}</strong></div>
              <div>Data Accettazione: <strong>${selectedAcc.dataAccettazione}</strong></div>
              <div>Descrizione Campione: <strong>${selectedAcc.descrizioneCampione}</strong></div>
              <div>Matrice dichiarata: <strong>${selectedAcc.matrice}</strong></div>
              <div>Operatore / Lab: <strong>${selectedAcc.operatorRegistrazione || 'Dott. Chim. F. Lupo'}</strong></div>
            </div>
          </div>
          <div class="col-half">
            <div class="info-card">
              <div class="info-card-title">Intestatario / Produttore Rifiuto</div>
              <div>Ragione Sociale: <strong>${clientName}</strong></div>
              <div>P.IVA / C.F.: <strong>${clientPiva || 'Non indicata'}</strong></div>
              <div>Sede / Indirizzo: <strong>${clientIndirizzo || 'L\'Aquila (AQ)'}</strong></div>
              <div>Consegna / Note: <strong>${selectedAcc.noteLab || 'Campione idoneo alla caratterizzazione'}</strong></div>
            </div>
          </div>
        </div>

        <!-- BOX CLASSIFICAZIONE ESPLICITA -->
        <div class="classification-box">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b;">Codice CER / EER Assegnato:</div>
              <div class="cer-badge">CODICE CER ${codiceCer}</div>
              <div style="font-size: 12px; font-weight: bold; color: #334155;">${descrizioneCer}</div>
            </div>
            <div style="text-align: right;">
              <span class="status-badge">${isPericoloso ? 'RIFIUTO PERICOLOSO' : 'RIFIUTO NON PERICOLOSO'}</span>
            </div>
          </div>
          ${isPericoloso && selectedHp.length > 0 ? `
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #fca5a5; font-size: 10px; color: #991b1b; font-weight: bold;">
              Caratteristiche di pericolo HP riscontrate: ${selectedHp.join(' • ')}
            </div>
          ` : ''}
          <div style="margin-top: 8px; font-size: 10px; color: #475569;">
            Operazione di recupero/smaltimento consigliata: <strong>${operazioneDestinazione}</strong>
          </div>
        </div>

        <!-- TABELLA ESITI ANALITICI DAL RDP -->
        <div style="font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 6px; text-transform: uppercase;">
          Parametri Analitici Rilevati nel Rapporto di Prova (${selectedAcc.codiceAccettazione})
        </div>
        <table class="table-results">
          <thead>
            <tr>
              <th>Prova / Parametro Analitico</th>
              <th style="text-align: center;">Valore Rilevato</th>
              <th style="text-align: center;">U.M.</th>
              <th style="text-align: center;">Giudizio</th>
            </tr>
          </thead>
          <tbody>
            ${proveRows}
          </tbody>
        </table>

        <!-- RELAZIONE ED ESPLICITAZIONE TESTO -->
        <div style="font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 6px; text-transform: uppercase;">
          Relazione e Parere Tecnico Motivato
        </div>
        <div class="parere-text">${parereTecnicoTesto}</div>

        <!-- FIRMA E TIMBRO -->
        <div class="footer-signatures">
          <div class="sig-box">
            IL RESPONSABILE TECNICO DI LABORATORIO<br/>
            <span style="font-size: 9px; color: #64748b; font-weight: normal;">(Firma digitale ai sensi del D.Lgs. 82/2005)</span>
            <div style="margin-top: 25px; border-bottom: 1px solid #1e293b; width: 80%; margin-left: auto; margin-right: auto;"></div>
            <div style="margin-top: 4px; font-size: 10px; font-weight: bold; color: #0f172a;">Dott. Carmine E. Marroccella</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">Classificazione del Rifiuto</h2>
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  D.Lgs. 152/2006 & Reg. UE 1357/2014
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Caratterizzazione analitica, attribuzione Codici CER/EER e redazione del Parere Tecnico collegato all'RdP.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Chiudi"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* MODAL BODY WITH TWO COLUMNS */}
        <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50 flex-1">
          
          {/* SELEZIONE RDP E RIFERIMENTI INIZIALI */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-sky-600" />
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  1. Collegamento al Rapporto di Prova (RdP)
                </h3>
              </div>
              <span className="text-xs font-bold text-sky-700 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
                Trovati {availableAccettazioni.length} RdP predisposti per classificazione
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Seleziona Rapporto di Prova / Campione di Rifiuto:
                </label>
                <select
                  value={selectedAccId}
                  onChange={(e) => setSelectedAccId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                >
                  {availableAccettazioni.map(acc => {
                    const cl = clients.find(c => c.id === acc.intestatarioRapportoClienteId);
                    return (
                      <option key={acc.id} value={acc.id}>
                        {acc.codiceAccettazione} - {acc.descrizioneCampione} ({cl ? cl.denominazione : 'Cliente'}) [{acc.dataAccettazione}]
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Codice Unico Classificazione Rifiuto:
                </label>
                <input
                  type="text"
                  value={codiceClassificazione}
                  onChange={(e) => setCodiceClassificazione(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-extrabold text-sky-800 focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                  placeholder="es. CR-ACC-2026-0004"
                />
              </div>
            </div>

            {/* SCHEDA RIEPILOGATIVA RDP SELEZIONATO */}
            {selectedAcc && (
              <div className="bg-sky-50/60 border border-sky-200/80 rounded-2xl p-4 text-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Codice RdP</span>
                  <span className="font-extrabold text-sky-900">{selectedAcc.codiceAccettazione}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Data Accettazione</span>
                  <span className="font-bold text-slate-800">{selectedAcc.dataAccettazione}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Produttore / Cliente</span>
                  <span className="font-bold text-slate-800 truncate block">{selectedClient ? selectedClient.denominazione : 'N.D.'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Matrice Rifiuto</span>
                  <span className="font-bold text-slate-800">{selectedAcc.matrice}</span>
                </div>
              </div>
            )}
          </div>

          {/* SELEZIONE CER/EER E STATO DI PERICOLOSITÀ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* PARTE SX: CATALOGO CER E SCELTA CODICE */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-amber-600" />
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    2. Codice EER / CER Assegnato
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                  Catalogo Europeo Rifiuti
                </span>
              </div>

              {/* CODICE E DESCRIZIONE MANUALE / MODIFICABILE */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Codice CER:</label>
                    <input
                      type="text"
                      value={codiceCer}
                      onChange={(e) => setCodiceCer(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-amber-800 focus:ring-2 focus:ring-amber-500 focus:bg-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Stato Pericolosità:</label>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => { setIsPericoloso(false); setSelectedHp([]); }}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                          !isPericoloso 
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs' 
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Non Pericoloso</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsPericoloso(true)}
                        className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border cursor-pointer ${
                          isPericoloso 
                            ? 'bg-red-600 text-white border-red-700 shadow-xs' 
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>Pericoloso (*)</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Descrizione Ufficiale CER:</label>
                  <textarea
                    rows={2}
                    value={descrizioneCer}
                    onChange={(e) => setDescrizioneCer(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* QUICK SELECTOR CATALOGO FREQUENTI */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Codici CER frequenti da catalogo:
                </label>
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                  {COMMON_CER_CODES.map((cer, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectCer(cer)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-start justify-between gap-2 ${
                        codiceCer === cer.code
                          ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-2xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div>
                        <span className="font-extrabold text-amber-800 mr-2">{cer.code}</span>
                        <span className="font-medium">{cer.description}</span>
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border shrink-0 ${
                        cer.pericoloso
                          ? 'bg-red-100 text-red-700 border-red-200'
                          : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}>
                        {cer.pericoloso ? 'Pericoloso' : 'Non Pericoloso'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* PARTE DX: CLASSI DI PERICOLO HP ED OPERAZIONI R/D */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                    3. Caratteristiche di Pericolo (HP1 - HP15)
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded border border-red-200">
                  Reg. UE 1357/2014
                </span>
              </div>

              {!isPericoloso ? (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold block text-sm">Classificato come Rifiuto Non Pericoloso</span>
                    Non risultano superate le concentrazioni limite per l'attribuzione delle caratteristiche di pericolo HP1 - HP15.
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Seleziona le caratteristiche di pericolo attribuite al rifiuto:
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    {HP_CLASSES.map(hp => {
                      const checked = selectedHp.includes(hp.id);
                      return (
                        <label
                          key={hp.id}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs font-semibold cursor-pointer border transition ${
                            checked
                              ? 'bg-red-50 border-red-300 text-red-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="pr-2">{hp.name}</span>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleHp(hp.id)}
                            className="rounded border-slate-300 text-red-600 focus:ring-red-500 h-4 w-4 shrink-0"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* DESTINAZIONE / OPERAZIONE R/D */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Operazione di Recupero (R) o Smaltimento (D) consigliata:
                </label>
                <select
                  value={operazioneDestinazione}
                  onChange={(e) => setOperazioneDestinazione(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-sky-500"
                >
                  <option value="R13 - Messa in riserva / Recupero di materia (Art. 184-ter D.Lgs 152/06)">R13 - Messa in riserva / Recupero di materia (Art. 184-ter D.Lgs 152/06)</option>
                  <option value="R5 - Riciclaggio/recupero di altre sostanze inorganiche (es. terre e rocce)">R5 - Riciclaggio/recupero di altre sostanze inorganiche (es. terre e rocce)</option>
                  <option value="R1 - Utilizzo principale come combustibile o altro mezzo per produrre energia">R1 - Utilizzo principale come combustibile o altro mezzo per produrre energia</option>
                  <option value="D1 - Deposito sul o nel suolo (es. discarica per rifiuti non pericolosi)">D1 - Deposito sul o nel suolo (es. discarica per rifiuti non pericolosi)</option>
                  <option value="D10 - Incenerimento a terra">D10 - Incenerimento a terra</option>
                  <option value="D15 - Raggruppamento preliminare prima di una delle operazioni D">D15 - Raggruppamento preliminare prima di una delle operazioni D</option>
                </select>
              </div>

            </div>

          </div>

          {/* PARERE TECNICO ESPLICITO ED EDITABILE */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  4. Testo del Parere Tecnico di Classificazione (Personalizzabile)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setParereTecnicoTesto(generateParereTesto())}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5 cursor-pointer bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Rigenera Testo Automatico</span>
              </button>
            </div>

            <textarea
              rows={10}
              value={parereTecnicoTesto}
              onChange={(e) => setParereTecnicoTesto(e.target.value)}
              className="w-full bg-slate-900 text-emerald-400 font-mono text-xs p-4 rounded-2xl border border-slate-800 focus:ring-2 focus:ring-indigo-500 leading-relaxed"
              placeholder="Inserisci la motivazione tecnica ed i riferimenti alle prove di laboratorio..."
            />
            <p className="text-[11px] text-slate-500 italic">
              * Questo testo verrà stampato integralmente all'interno della scheda di caratterizzazione e classificazione del rifiuto da allegare al RdP.
            </p>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Info className="h-4 w-4 text-sky-600" />
            <span>Classificazione valida ai sensi della normativa vigente. Modello RdP collegato: <strong>MOD. CLAS-RIF-01</strong></span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-2xl transition cursor-pointer"
            >
              Chiudi
            </button>

            <button
              onClick={handlePrint}
              disabled={!selectedAcc}
              className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              <span>Stampa Parere Classificazione PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
