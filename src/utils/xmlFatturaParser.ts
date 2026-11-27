/**
 * Utility per il parsing delle Fatture Elettroniche (FatturaPA XML)
 * e motore di matching intelligente con i Rapporti di Prova (RdP), Pratiche LIMS e Stato Pagamenti.
 */

import { PraticaFatturazione, Client } from '../types';

export interface ParsedFatturaXml {
  id: string; // File ID o nome file
  fileName: string;
  folderName?: string; // Nome della cartella Drive o locale di provenienza
  numeroFattura: string;
  dataFattura: string; // YYYY-MM-DD
  importoTotale: number;
  divisa: string;
  
  // Dati Cessionario / Committente (Cliente)
  partitaIva: string;
  codiceFiscale: string;
  denominazione: string;
  
  // Dettaglio righe e causali
  causali: string[];
  descrizioniLinee: string[];
  testoCompleto: string;
  
  // RdP e Preventivi estratti
  rdpCitati: string[];
  preventiviCitati: string[];

  // Dati Pagamento estratti da <DatiPagamento> / <DettaglioPagamento> e/o Cartella Drive
  condizioniPagamento?: string;       // es. TP01 (a rate), TP02 (completo), TP03 (anticipo)
  modalitaPagamento?: string;         // es. MP01 (contanti), MP05 (bonifico), MP08 (carta), MP12 (RIBA)
  modalitaPagamentoDesc?: string;     // Descrizione leggibile modalità
  dataScadenzaPagamento?: string;     // YYYY-MM-DD
  importoPagamento?: number;
  pagatoRilevato: boolean;            // True se rilevata come PAGATA, False se DA PAGARE
  dataPagamentoRilevata?: string;     // YYYY-MM-DD
  fonteStatoPagamento: 'CARTELLA_DRIVE' | 'NOME_FILE' | 'QUIETANZA_XML' | 'DATI_PAGAMENTO_XML' | 'DEFAULT_DA_PAGARE';
  dettaglioStatoPagamento: string;
}

export interface MatchResult {
  pratica: PraticaFatturazione;
  fatturaTrovata: ParsedFatturaXml | null;
  tipoMatch: 'EXACT_RDP' | 'PREVENTIVO' | 'FISCAL_CLIENT' | 'PAYMENT_UPDATE' | 'ALREADY_INVOICED' | 'NO_MATCH';
  isCumulativa: boolean;
  altriRdpNellaFattura: string[];
  motivoMatch: string;
  selezionato: boolean;
  pagatoProposto: boolean;
  dataPagamentoProposta: string;
  aggiornaSoloPagamento?: boolean;
}

export interface ParseXmlOptions {
  folderName?: string;
  forcePaidMode?: 'auto' | 'paid' | 'unpaid';
  fileModifiedDate?: string;
}

const MODALITA_PAGAMENTO_MAP: Record<string, string> = {
  MP01: 'Contanti',
  MP02: 'Assegno',
  MP03: 'Assegno circolare',
  MP04: 'Contanti presso Tesoreria',
  MP05: 'Bonifico Bancario',
  MP06: 'Vaglia cambiario',
  MP07: 'Bollettino bancario',
  MP08: 'Carta di pagamento / POS',
  MP09: 'RID',
  MP10: 'RID utenze',
  MP11: 'RID veloce',
  MP12: 'RIBA (Ricevuta Bancaria)',
  MP13: 'MAV',
  MP14: 'Quietanza erario',
  MP15: 'Giroconto su conti di contabilità speciale',
  MP16: 'Domiciliazione bancaria',
  MP17: 'Domiciliazione postale',
  MP18: 'Bollettino di c/c postale',
  MP19: 'SEPA Direct Debit',
  MP20: 'SEPA Direct Debit CORE',
  MP21: 'SEPA Direct Debit B2B',
  MP22: 'Trattenuta su somme già riscosse',
  MP23: 'PagoPA'
};

/**
 * Pulisce una Partita IVA o Codice Fiscale rimuovendo prefissi paese (IT), spazi e trattini.
 */
export function normalizzaCodiceFiscale(str?: string | null): string {
  if (!str) return '';
  return str.replace(/^IT/i, '').replace(/[\s\-_.]/g, '').toUpperCase();
}

/**
 * Estrae tutti i riferimenti a Rapporti di Prova e Preventivi da un testo descrittivo.
 */
export function estraiCodiciDalTesto(testo: string): { rdp: string[]; preventivi: string[] } {
  const rdpSet = new Set<string>();
  const prevSet = new Set<string>();

  // Pattern standard RdP: es. RDP-2026-0001, 2026/001, 26-0012, RdP n. 12, RDP2026001
  const rdpPatterns = [
    /\b(?:RDP|R\.D\.P\.|RAPPORTO(?:\s+DI\s+PROVA)?)\s*[-/N°.\s]*([0-9]{2,4}[-/][0-9]{1,6}|[0-9]{1,6}[-/][0-9]{2,4}|[0-9]{4,8})\b/gi,
    /\b(RDP[-_\s]?[0-9]{2,4}[-_\s]?[0-9]{1,6})\b/gi,
    /\b(CAMPIONE|CAMP\.)\s*[-/N°.\s]*([0-9]{2,4}[-/][0-9]{1,6}|[0-9]{1,6}[-/][0-9]{2,4})\b/gi
  ];

  for (const regex of rdpPatterns) {
    let match;
    while ((match = regex.exec(testo)) !== null) {
      const captured = match[1] || match[2] || match[0];
      if (captured && captured.trim().length >= 3) {
        rdpSet.add(captured.trim().toUpperCase());
      }
    }
  }

  // Pattern Preventivi: es. PREV-2026-001, P-2026/01, Prev. 12/26, PREV2026
  const prevPatterns = [
    /\b(?:PREV|PREVENTIVO|OFFERTA)\s*[-/N°.\s]*([0-9]{2,4}[-/][0-9]{1,6}|[0-9]{1,6}[-/][0-9]{2,4}|[0-9]{4,8})\b/gi,
    /\b(PREV[-_\s]?[0-9]{2,4}[-_\s]?[0-9]{1,6})\b/gi
  ];

  for (const regex of prevPatterns) {
    let match;
    while ((match = regex.exec(testo)) !== null) {
      const captured = match[1] || match[0];
      if (captured && captured.trim().length >= 3) {
        prevSet.add(captured.trim().toUpperCase());
      }
    }
  }

  return {
    rdp: Array.from(rdpSet),
    preventivi: Array.from(prevSet)
  };
}

/**
 * Determina in automatico se la fattura XML è Pagata o Da Pagare combinando:
 * 1) Regola esplicita utente / Nome cartella Google Drive (es. "Pagate", "Saldate" vs "Da Pagare", "Insolute")
 * 2) Nome del file XML (es. "..._PAGATA.xml")
 * 3) Diciture di quietanza/saldo nelle Causali / Descrizioni / Note dell'XML
 * 4) Tag <DatiPagamento> / <DettaglioPagamento> della FatturaPA
 */
function rilevaStatoPagamentoAutomatico(params: {
  folderName?: string;
  fileName: string;
  forcePaidMode?: 'auto' | 'paid' | 'unpaid';
  fileModifiedDate?: string;
  dataFattura: string;
  condizioniPagamento: string;
  modalitaPagamento: string;
  modalitaPagamentoDesc: string;
  dataScadenzaPagamento: string;
  testoCausaliENote: string;
}): {
  pagatoRilevato: boolean;
  dataPagamentoRilevata: string;
  fonteStatoPagamento: ParsedFatturaXml['fonteStatoPagamento'];
  dettaglioStatoPagamento: string;
} {
  const {
    folderName = '',
    fileName,
    forcePaidMode = 'auto',
    fileModifiedDate,
    dataFattura,
    condizioniPagamento,
    modalitaPagamento,
    modalitaPagamentoDesc,
    dataScadenzaPagamento,
    testoCausaliENote
  } = params;

  const fallbackPaymentDate =
    (fileModifiedDate && fileModifiedDate.split('T')[0]) ||
    dataScadenzaPagamento ||
    dataFattura ||
    new Date().toISOString().split('T')[0];

  // 1. Forzatura manuale scelta dall'utente per la cartella/importazione
  if (forcePaidMode === 'paid') {
    return {
      pagatoRilevato: true,
      dataPagamentoRilevata: fallbackPaymentDate,
      fonteStatoPagamento: 'CARTELLA_DRIVE',
      dettaglioStatoPagamento: `Impostato come PAGATO da regola cartella${folderName ? ` ("${folderName}")` : ''}`
    };
  }
  if (forcePaidMode === 'unpaid') {
    return {
      pagatoRilevato: false,
      dataPagamentoRilevata: '',
      fonteStatoPagamento: 'CARTELLA_DRIVE',
      dettaglioStatoPagamento: `Impostato come DA PAGARE da regola cartella${folderName ? ` ("${folderName}")` : ''}`
    };
  }

  // 2. Rilevamento dal nome della Cartella Google Drive / Percorso locale
  if (folderName) {
    const cleanFolder = folderName.toLowerCase();
    if (/\b(da[\s_-]*pagare|non[\s_-]*pagat[aei]|insolut[aei]|in[\s_-]*scadenza|apert[aei]|pendenti|sospes[aei])\b/i.test(cleanFolder)) {
      return {
        pagatoRilevato: false,
        dataPagamentoRilevata: '',
        fonteStatoPagamento: 'CARTELLA_DRIVE',
        dettaglioStatoPagamento: `Cartella "${folderName}" identificata come fatture DA PAGARE`
      };
    }
    if (/\b(pagat[aei]|saldat[aei]|incassat[aei]|quietanzat[aei]|riscoss[aei]|chius[aei])\b/i.test(cleanFolder)) {
      return {
        pagatoRilevato: true,
        dataPagamentoRilevata: fallbackPaymentDate,
        fonteStatoPagamento: 'CARTELLA_DRIVE',
        dettaglioStatoPagamento: `Cartella "${folderName}" identificata come fatture PAGATE`
      };
    }
  }

  // 3. Rilevamento dal nome del file XML
  const cleanFile = fileName.toLowerCase();
  if (/(\b|_|-)(da[\s_-]*pagare|non[\s_-]*pagat[aoe]|insolut[aoe])(\b|_|-|\.)/i.test(cleanFile)) {
    return {
      pagatoRilevato: false,
      dataPagamentoRilevata: '',
      fonteStatoPagamento: 'NOME_FILE',
      dettaglioStatoPagamento: `Nome file "${fileName}" indica stato DA PAGARE`
    };
  }
  if (/(\b|_|-)(pagat[aoe]|saldat[aoe]|incassat[aoe]|quietanzat[aoe])(\b|_|-|\.)/i.test(cleanFile)) {
    return {
      pagatoRilevato: true,
      dataPagamentoRilevata: fallbackPaymentDate,
      fonteStatoPagamento: 'NOME_FILE',
      dettaglioStatoPagamento: `Nome file "${fileName}" indica stato PAGATO`
    };
  }

  // 4. Rilevamento da diciture di quietanza/saldo nelle Causali, Note o Linee della Fattura XML
  if (/\b(non\s+pagat[aoe]|da\s+pagare|in\s+attesa\s+di\s+pagamento|pagamento\s+a\s+\d+\s*(?:gg|giorni))\b/i.test(testoCausaliENote)) {
    return {
      pagatoRilevato: false,
      dataPagamentoRilevata: '',
      fonteStatoPagamento: 'QUIETANZA_XML',
      dettaglioStatoPagamento: `Causale XML indica pagamento differito / da saldare${dataScadenzaPagamento ? ` (Scad. ${dataScadenzaPagamento})` : ''}`
    };
  }

  if (/\b(fattura\s+quietanzata|gia['’]?\s+pagat[aoe]|pagat[aoe]\s+con\s+bonifico|pagat[aoe]\s+in\s+contanti|pagat[aoe]\s+con\s+pos|pagat[aoe]\s+con\s+carta|interamente\s+saldat[aoe]|pagamento\s+contestuale|pagamento\s+ricevuto|bonifico\s+ricevuto|quietanza\s+di\s+pagamento|saldato)\b/i.test(testoCausaliENote)) {
    return {
      pagatoRilevato: true,
      dataPagamentoRilevata: dataFattura || fallbackPaymentDate,
      fonteStatoPagamento: 'QUIETANZA_XML',
      dettaglioStatoPagamento: 'Rilevata quietanza di avvenuto pagamento nella causale/descrizione XML'
    };
  }

  // 5. Analisi blocco <DatiPagamento> / <DettaglioPagamento>
  // TP03 = Anticipo (già incassato), oppure MP01 (Contanti) / MP08 (Carta POS) / MP22 (Trattenuta su somme già riscosse) senza scadenza futura
  const isImmediatePaymentMethod = ['MP01', 'MP03', 'MP08', 'MP14', 'MP22'].includes(modalitaPagamento.toUpperCase());
  const isSameDayOrNoExpiry = !dataScadenzaPagamento || (dataFattura && dataScadenzaPagamento <= dataFattura);

  if (condizioniPagamento.toUpperCase() === 'TP03' || (isImmediatePaymentMethod && isSameDayOrNoExpiry)) {
    return {
      pagatoRilevato: true,
      dataPagamentoRilevata: dataScadenzaPagamento || dataFattura || fallbackPaymentDate,
      fonteStatoPagamento: 'DATI_PAGAMENTO_XML',
      dettaglioStatoPagamento: `Pagamento immediato da XML (${modalitaPagamentoDesc || condizioniPagamento})`
    };
  }

  // 6. Default: Fattura emessa con pagamento a scadenza / bonifico da incassare
  const scadenzaInfo = dataScadenzaPagamento ? ` — Scadenza: ${dataScadenzaPagamento}` : '';
  const modInfo = modalitaPagamentoDesc ? ` (${modalitaPagamentoDesc})` : '';
  return {
    pagatoRilevato: false,
    dataPagamentoRilevata: '',
    fonteStatoPagamento: modalitaPagamento ? 'DATI_PAGAMENTO_XML' : 'DEFAULT_DA_PAGARE',
    dettaglioStatoPagamento: `Da incassare${modInfo}${scadenzaInfo}`
  };
}

/**
 * Esegue il parsing di una stringa XML di Fattura Elettronica (FatturaPA).
 */
export function parseFatturaElettronicaXml(
  xmlString: string,
  fileName: string,
  fileId?: string,
  options?: ParseXmlOptions
): ParsedFatturaXml | null {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    // Controllo errori di parsing XML
    const parserError = xmlDoc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
      console.warn(`Errore parsing XML per il file ${fileName}:`, parserError[0].textContent);
      return null;
    }

    // Helper per trovare tag ignorando eventuali prefissi namespace (es. p: o FPA12:)
    const getTagValue = (parent: Element | Document, tagName: string): string => {
      const direct = parent.getElementsByTagName(tagName);
      if (direct.length > 0 && direct[0].textContent) {
        return direct[0].textContent.trim();
      }
      const allElements = parent.getElementsByTagName('*');
      for (let i = 0; i < allElements.length; i++) {
        if (allElements[i].localName === tagName && allElements[i].textContent) {
          return allElements[i].textContent!.trim();
        }
      }
      return '';
    };

    const getAllTagValues = (parent: Element | Document, tagName: string): string[] => {
      const results: string[] = [];
      const allElements = parent.getElementsByTagName('*');
      for (let i = 0; i < allElements.length; i++) {
        if (allElements[i].localName === tagName && allElements[i].textContent) {
          const val = allElements[i].textContent!.trim();
          if (val) results.push(val);
        }
      }
      return results;
    };

    // 1. Dati Generali Documento (cerchiamo dentro DatiGeneraliDocumento per evitare conflitti con tag Data/Numero di altri blocchi)
    let datiGenDoc: Element | Document = xmlDoc;
    const allNodes = xmlDoc.getElementsByTagName('*');
    for (let i = 0; i < allNodes.length; i++) {
      if (allNodes[i].localName === 'DatiGeneraliDocumento') {
        datiGenDoc = allNodes[i];
        break;
      }
    }

    const numeroFattura = getTagValue(datiGenDoc, 'Numero') || getTagValue(xmlDoc, 'Numero') || fileName.replace(/\.xml$/i, '');
    let dataFattura = getTagValue(datiGenDoc, 'Data') || getTagValue(xmlDoc, 'Data') || '';
    if (dataFattura && dataFattura.includes('T')) {
      dataFattura = dataFattura.split('T')[0];
    }
    const rawImporto = getTagValue(datiGenDoc, 'ImportoTotaleDocumento') || getTagValue(xmlDoc, 'ImportoTotaleDocumento');
    const importoTotale = rawImporto ? parseFloat(rawImporto.replace(',', '.')) : 0;
    const divisa = getTagValue(datiGenDoc, 'Divisa') || 'EUR';

    // 2. Dati Cessionario Committente (Cliente)
    let pIva = '';
    let cf = '';
    let denominazione = '';

    for (let i = 0; i < allNodes.length; i++) {
      if (allNodes[i].localName === 'CessionarioCommittente') {
        const comm = allNodes[i];
        pIva = getTagValue(comm, 'IdCodice');
        cf = getTagValue(comm, 'CodiceFiscale');
        denominazione = getTagValue(comm, 'Denominazione');
        if (!denominazione) {
          const nome = getTagValue(comm, 'Nome');
          const cognome = getTagValue(comm, 'Cognome');
          if (nome || cognome) {
            denominazione = `${nome} ${cognome}`.trim();
          }
        }
        break;
      }
    }

    // 3. Dati Pagamento (<DatiPagamento> e <DettaglioPagamento>)
    let condizioniPagamento = '';
    let modalitaPagamento = '';
    let dataScadenzaPagamento = '';
    let importoPagamento = importoTotale;

    for (let i = 0; i < allNodes.length; i++) {
      if (allNodes[i].localName === 'DatiPagamento') {
        const dp = allNodes[i];
        condizioniPagamento = getTagValue(dp, 'CondizioniPagamento');
        modalitaPagamento = getTagValue(dp, 'ModalitaPagamento');
        dataScadenzaPagamento = getTagValue(dp, 'DataScadenzaPagamento') || getTagValue(dp, 'DataRiferimentoTerminiPagamento');
        if (dataScadenzaPagamento && dataScadenzaPagamento.includes('T')) {
          dataScadenzaPagamento = dataScadenzaPagamento.split('T')[0];
        }
        const rawImpPag = getTagValue(dp, 'ImportoPagamento');
        if (rawImpPag) {
          const parsedImp = parseFloat(rawImpPag.replace(',', '.'));
          if (!isNaN(parsedImp)) importoPagamento = parsedImp;
        }
        break;
      }
    }

    const modalitaPagamentoDesc = modalitaPagamento
      ? (MODALITA_PAGAMENTO_MAP[modalitaPagamento.toUpperCase()] || modalitaPagamento)
      : undefined;

    // 4. Causali, Linee di Dettaglio e Riferimenti
    const causali = getAllTagValues(xmlDoc, 'Causale');
    const descrizioniLinee = getAllTagValues(xmlDoc, 'Descrizione');
    const note = getAllTagValues(xmlDoc, 'Note');
    const rifTesto = getAllTagValues(xmlDoc, 'RiferimentoTesto');
    const idDocumento = getAllTagValues(xmlDoc, 'IdDocumento');

    const testoCausaliENote = [...causali, ...descrizioniLinee, ...note, ...rifTesto].join(' ');

    const testoCompleto = [
      numeroFattura,
      ...causali,
      ...descrizioniLinee,
      ...note,
      ...rifTesto,
      ...idDocumento,
      fileName
    ].join(' ');

    const codiciEstratti = estraiCodiciDalTesto(testoCompleto);

    // 5. Rilevamento automatico stato pagamento (Pagata / Non Pagata)
    const statoPag = rilevaStatoPagamentoAutomatico({
      folderName: options?.folderName,
      fileName,
      forcePaidMode: options?.forcePaidMode,
      fileModifiedDate: options?.fileModifiedDate,
      dataFattura,
      condizioniPagamento,
      modalitaPagamento,
      modalitaPagamentoDesc: modalitaPagamentoDesc || '',
      dataScadenzaPagamento,
      testoCausaliENote
    });

    return {
      id: fileId || fileName,
      fileName,
      folderName: options?.folderName,
      numeroFattura,
      dataFattura,
      importoTotale,
      divisa,
      partitaIva: normalizzaCodiceFiscale(pIva),
      codiceFiscale: normalizzaCodiceFiscale(cf),
      denominazione,
      causali,
      descrizioniLinee,
      testoCompleto,
      rdpCitati: codiciEstratti.rdp,
      preventiviCitati: codiciEstratti.preventivi,
      condizioniPagamento: condizioniPagamento || undefined,
      modalitaPagamento: modalitaPagamento || undefined,
      modalitaPagamentoDesc,
      dataScadenzaPagamento: dataScadenzaPagamento || undefined,
      importoPagamento,
      pagatoRilevato: statoPag.pagatoRilevato,
      dataPagamentoRilevata: statoPag.dataPagamentoRilevata || undefined,
      fonteStatoPagamento: statoPag.fonteStatoPagamento,
      dettaglioStatoPagamento: statoPag.dettaglioStatoPagamento
    };
  } catch (err) {
    console.error(`Errore parsing fattura ${fileName}:`, err);
    return null;
  }
}

/**
 * Motore di Riconciliazione: incrocia la lista di Pratiche del gestionale con le Fatture XML caricate,
 * rilevando sia le nuove fatture emesse sia gli aggiornamenti dello stato di pagamento (Pagata / Non Pagata).
 */
export function riconciliaPraticheConFattureXml(
  pratiche: PraticaFatturazione[],
  fattureXml: ParsedFatturaXml[],
  clients?: Client[]
): MatchResult[] {
  const clientMap = new Map<string, { pIva: string; cf: string; nome: string }>();
  if (clients) {
    clients.forEach(c => {
      clientMap.set(c.id, {
        pIva: normalizzaCodiceFiscale(c.partitaIva),
        cf: normalizzaCodiceFiscale(c.codiceFiscale),
        nome: (c.denominazione || '').toLowerCase()
      });
    });
  }

  const fatturaToPraticheMap = new Map<string, string[]>();

  const results: MatchResult[] = pratiche.map(pratica => {
    if (pratica.statoFatturazione === 'Annullato') {
      return {
        pratica,
        fatturaTrovata: null,
        tipoMatch: 'NO_MATCH',
        isCumulativa: false,
        altriRdpNellaFattura: [],
        motivoMatch: 'Pratica annullata (esclusa dalla riconciliazione XML)',
        selezionato: false,
        pagatoProposto: false,
        dataPagamentoProposta: ''
      };
    }
    const cleanPIva = normalizzaCodiceFiscale(pratica.partitaIva);
    const cleanCF = normalizzaCodiceFiscale(pratica.codiceFiscale);
    const clientData = pratica.clienteId ? clientMap.get(pratica.clienteId) : null;
    
    const targetPIva = cleanPIva || clientData?.pIva || '';
    const targetCF = cleanCF || clientData?.cf || '';
    const targetNome = (pratica.nomeCliente || clientData?.nome || '').toLowerCase();
    
    const cleanRdpCode = (pratica.numeroCampione || '').toUpperCase().trim();
    const cleanPrevCode = (pratica.numeroPreventivo || '').toUpperCase().trim();

    // 0. Verifica se la pratica è già fatturata con lo stesso numero di fattura presente negli XML
    const xmlGiaAssociato = fattureXml.find(f => 
      pratica.statoFatturazione === 'Fatturato' && 
      pratica.numeroFattura && 
      f.numeroFattura.toUpperCase().trim() === pratica.numeroFattura.toUpperCase().trim()
    );

    if (xmlGiaAssociato) {
      const arr = fatturaToPraticheMap.get(xmlGiaAssociato.id) || [];
      arr.push(pratica.numeroCampione);
      fatturaToPraticheMap.set(xmlGiaAssociato.id, arr);

      const currentPaid = Boolean(pratica.pagato);
      const detectedPaid = Boolean(xmlGiaAssociato.pagatoRilevato);
      const hasPaymentStatusChange = currentPaid !== detectedPaid;

      if (hasPaymentStatusChange) {
        return {
          pratica,
          fatturaTrovata: xmlGiaAssociato,
          tipoMatch: 'PAYMENT_UPDATE',
          isCumulativa: false,
          altriRdpNellaFattura: [],
          motivoMatch: detectedPaid
            ? `Aggiornamento pagamento: Fattura n. ${pratica.numeroFattura} rilevata come PAGATA (${xmlGiaAssociato.dettaglioStatoPagamento})`
            : `Aggiornamento pagamento: Fattura n. ${pratica.numeroFattura} rilevata come DA PAGARE (${xmlGiaAssociato.dettaglioStatoPagamento})`,
          selezionato: true,
          pagatoProposto: detectedPaid,
          dataPagamentoProposta: detectedPaid
            ? (xmlGiaAssociato.dataPagamentoRilevata || xmlGiaAssociato.dataFattura || new Date().toISOString().split('T')[0])
            : '',
          aggiornaSoloPagamento: true
        };
      }

      return {
        pratica,
        fatturaTrovata: xmlGiaAssociato,
        tipoMatch: 'ALREADY_INVOICED',
        isCumulativa: false,
        altriRdpNellaFattura: [],
        motivoMatch: `Già allineata con fattura n. ${pratica.numeroFattura} (${currentPaid ? 'Pagata' : 'Da pagare'})`,
        selezionato: false,
        pagatoProposto: currentPaid,
        dataPagamentoProposta: pratica.dataPagamento || (currentPaid ? xmlGiaAssociato.dataFattura : '')
      };
    }

    // 1. Cerca MATCH per Codice RdP / Numero Campione, Preventivo o Anagrafica Fiscale
    let matchedFattura: ParsedFatturaXml | null = null;
    let matchType: MatchResult['tipoMatch'] = 'NO_MATCH';
    let matchReason = '';

    for (const fattura of fattureXml) {
      const fiscalMatch = 
        (targetPIva && fattura.partitaIva && fattura.partitaIva === targetPIva) ||
        (targetCF && fattura.codiceFiscale && fattura.codiceFiscale === targetCF) ||
        (targetNome && fattura.denominazione && (
          fattura.denominazione.toLowerCase().includes(targetNome) ||
          targetNome.includes(fattura.denominazione.toLowerCase())
        ));

      const rdpExplicitMatch = cleanRdpCode && (
        fattura.testoCompleto.toUpperCase().includes(cleanRdpCode) ||
        fattura.rdpCitati.some(r => r.includes(cleanRdpCode) || cleanRdpCode.includes(r))
      );

      if (rdpExplicitMatch) {
        matchedFattura = fattura;
        matchType = 'EXACT_RDP';
        matchReason = `Trovato riferimento esplicito al campione ${cleanRdpCode} nella fattura n. ${fattura.numeroFattura}`;
        break;
      }

      const prevExplicitMatch = cleanPrevCode && cleanPrevCode !== 'SENZA PREVENTIVO' && cleanPrevCode !== '-' && (
        fattura.testoCompleto.toUpperCase().includes(cleanPrevCode) ||
        fattura.preventiviCitati.some(p => p.includes(cleanPrevCode) || cleanPrevCode.includes(p))
      );

      if (prevExplicitMatch && fiscalMatch) {
        matchedFattura = fattura;
        matchType = 'PREVENTIVO';
        matchReason = `Trovato riferimento al preventivo ${cleanPrevCode} e coincidenza fiscale cliente (${fattura.denominazione})`;
        break;
      }

      if (fiscalMatch && !matchedFattura) {
        matchedFattura = fattura;
        matchType = 'FISCAL_CLIENT';
        matchReason = `Coincidenza anagrafica cliente (${fattura.denominazione} - P.IVA ${fattura.partitaIva || fattura.codiceFiscale})`;
      }
    }

    if (matchedFattura) {
      const arr = fatturaToPraticheMap.get(matchedFattura.id) || [];
      arr.push(pratica.numeroCampione);
      fatturaToPraticheMap.set(matchedFattura.id, arr);

      // Se la pratica era già fatturata ma aveva un numero fattura formattato diversamente, verifichiamo se cambia il pagamento
      const isAlreadyInvoiced = pratica.statoFatturazione === 'Fatturato';
      const currentPaid = Boolean(pratica.pagato);
      const detectedPaid = Boolean(matchedFattura.pagatoRilevato);
      const shouldSelect = !isAlreadyInvoiced || (currentPaid !== detectedPaid);

      if (isAlreadyInvoiced && currentPaid !== detectedPaid) {
        matchType = 'PAYMENT_UPDATE';
        matchReason = detectedPaid
          ? `Rilevato AVVENUTO PAGAMENTO da XML (${matchedFattura.dettaglioStatoPagamento})`
          : `Rilevato stato DA PAGARE da XML (${matchedFattura.dettaglioStatoPagamento})`;
      }

      return {
        pratica,
        fatturaTrovata: matchedFattura,
        tipoMatch: matchType,
        isCumulativa: false,
        altriRdpNellaFattura: [],
        motivoMatch: matchReason,
        selezionato: shouldSelect,
        pagatoProposto: detectedPaid,
        dataPagamentoProposta: detectedPaid
          ? (matchedFattura.dataPagamentoRilevata || matchedFattura.dataFattura || new Date().toISOString().split('T')[0])
          : ''
      };
    }

    return {
      pratica,
      fatturaTrovata: null,
      tipoMatch: 'NO_MATCH',
      isCumulativa: false,
      altriRdpNellaFattura: [],
      motivoMatch: 'Nessun riscontro XML trovato per questa pratica',
      selezionato: false,
      pagatoProposto: Boolean(pratica.pagato),
      dataPagamentoProposta: pratica.dataPagamento || ''
    };
  });

  // Post-processing per identificare le FATTURE CUMULATIVE (1 fattura -> N RdP diversi)
  results.forEach(res => {
    if (res.fatturaTrovata) {
      const rdpInThisInvoice = fatturaToPraticheMap.get(res.fatturaTrovata.id) || [];
      if (rdpInThisInvoice.length > 1) {
        res.isCumulativa = true;
        res.altriRdpNellaFattura = rdpInThisInvoice.filter(r => r !== res.pratica.numeroCampione);
      }
    }
  });

  return results;
}
