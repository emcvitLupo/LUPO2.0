/**
 * Utility per il parsing delle Fatture Elettroniche (FatturaPA XML)
 * e motore di matching intelligente con i Rapporti di Prova (RdP) e Pratiche LIMS.
 */

import { PraticaFatturazione, Client } from '../types';

export interface ParsedFatturaXml {
  id: string; // File ID o nome file
  fileName: string;
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
}

export interface MatchResult {
  pratica: PraticaFatturazione;
  fatturaTrovata: ParsedFatturaXml | null;
  tipoMatch: 'EXACT_RDP' | 'PREVENTIVO' | 'FISCAL_CLIENT' | 'ALREADY_INVOICED' | 'NO_MATCH';
  isCumulativa: boolean;
  altriRdpNellaFattura: string[];
  motivoMatch: string;
  selezionato: boolean;
}

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
 * Esegue il parsing di una stringa XML di Fattura Elettronica (FatturaPA).
 */
export function parseFatturaElettronicaXml(xmlString: string, fileName: string, fileId?: string): ParsedFatturaXml | null {
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
      // Ricerca per localName
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

    // 1. Dati Generali Documento
    const numeroFattura = getTagValue(xmlDoc, 'Numero') || fileName.replace(/\.xml$/i, '');
    let dataFattura = getTagValue(xmlDoc, 'Data') || '';
    // Assicuriamo formato ISO YYYY-MM-DD
    if (dataFattura && dataFattura.includes('T')) {
      dataFattura = dataFattura.split('T')[0];
    }
    const rawImporto = getTagValue(xmlDoc, 'ImportoTotaleDocumento');
    const importoTotale = rawImporto ? parseFloat(rawImporto.replace(',', '.')) : 0;
    const divisa = getTagValue(xmlDoc, 'Divisa') || 'EUR';

    // 2. Dati Cessionario Committente (Cliente)
    let pIva = '';
    let cf = '';
    let denominazione = '';

    // Cerca nel blocco CessionarioCommittente
    const cessionarioList = xmlDoc.getElementsByTagName('*');
    for (let i = 0; i < cessionarioList.length; i++) {
      if (cessionarioList[i].localName === 'CessionarioCommittente') {
        const comm = cessionarioList[i];
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

    // 3. Causali e Linee di Dettaglio
    const causali = getAllTagValues(xmlDoc, 'Causale');
    const descrizioniLinee = getAllTagValues(xmlDoc, 'Descrizione');
    const note = getAllTagValues(xmlDoc, 'Note');

    const testoCompleto = [
      numeroFattura,
      ...causali,
      ...descrizioniLinee,
      ...note,
      fileName
    ].join(' ');

    const codiciEstratti = estraiCodiciDalTesto(testoCompleto);

    return {
      id: fileId || fileName,
      fileName,
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
      preventiviCitati: codiciEstratti.preventivi
    };
  } catch (err) {
    console.error(`Errore parsing fattura ${fileName}:`, err);
    return null;
  }
}

/**
 * Motore di Riconciliazione: incrocia la lista di Pratiche del gestionale con le Fatture XML caricate.
 */
export function riconciliaPraticheConFattureXml(
  pratiche: PraticaFatturazione[],
  fattureXml: ParsedFatturaXml[],
  clients?: Client[]
): MatchResult[] {
  // Mappa di supporto per i clienti per lookup rapido di P.IVA e CF
  const clientMap = new Map<string, { pIva: string; cf: string; nome: string }>();
  if (clients) {
    clients.forEach(c => {
      clientMap.set(c.id, {
        pIva: normalizzaCodiceFiscale(c.partitaIva),
        cf: normalizzaCodiceFiscale(c.codiceFiscale),
        nome: c.denominazione.toLowerCase()
      });
    });
  }

  // Pre-calcoliamo quanti RdP compaiono in ogni fattura (per gestire il caso cumulativo)
  const fatturaToPraticheMap = new Map<string, string[]>();

  const results: MatchResult[] = pratiche.map(pratica => {
    const cleanPIva = normalizzaCodiceFiscale(pratica.partitaIva);
    const cleanCF = normalizzaCodiceFiscale(pratica.codiceFiscale);
    const clientData = pratica.clienteId ? clientMap.get(pratica.clienteId) : null;
    
    const targetPIva = cleanPIva || clientData?.pIva || '';
    const targetCF = cleanCF || clientData?.cf || '';
    const targetNome = (pratica.nomeCliente || clientData?.nome || '').toLowerCase();
    
    const cleanRdpCode = (pratica.numeroCampione || '').toUpperCase().trim();
    const cleanPrevCode = (pratica.numeroPreventivo || '').toUpperCase().trim();

    // Se la pratica è già fatturata con lo stesso numero di fattura presente negli XML
    const xmlGiaAssociato = fattureXml.find(f => 
      pratica.statoFatturazione === 'Fatturato' && 
      pratica.numeroFattura && 
      f.numeroFattura.toUpperCase() === pratica.numeroFattura.toUpperCase()
    );

    if (xmlGiaAssociato) {
      const arr = fatturaToPraticheMap.get(xmlGiaAssociato.id) || [];
      arr.push(pratica.numeroCampione);
      fatturaToPraticheMap.set(xmlGiaAssociato.id, arr);

      return {
        pratica,
        fatturaTrovata: xmlGiaAssociato,
        tipoMatch: 'ALREADY_INVOICED',
        isCumulativa: false,
        altriRdpNellaFattura: [],
        motivoMatch: `Già fatturata con fattura n. ${pratica.numeroFattura}`,
        selezionato: false
      };
    }

    // 1. Cerca MATCH ESATTO per Codice RdP / Numero Campione nel testo XML
    let matchedFattura: ParsedFatturaXml | null = null;
    let matchType: MatchResult['tipoMatch'] = 'NO_MATCH';
    let matchReason = '';

    for (const fattura of fattureXml) {
      // Verifica fiscale (stesso committente)
      const fiscalMatch = 
        (targetPIva && fattura.partitaIva && fattura.partitaIva === targetPIva) ||
        (targetCF && fattura.codiceFiscale && fattura.codiceFiscale === targetCF) ||
        (targetNome && fattura.denominazione && (
          fattura.denominazione.toLowerCase().includes(targetNome) ||
          targetNome.includes(fattura.denominazione.toLowerCase())
        ));

      // Match RdP esplicito nel testo o nei codici estratti
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

      // Match Preventivo esplicito
      const prevExplicitMatch = cleanPrevCode && (
        fattura.testoCompleto.toUpperCase().includes(cleanPrevCode) ||
        fattura.preventiviCitati.some(p => p.includes(cleanPrevCode) || cleanPrevCode.includes(p))
      );

      if (prevExplicitMatch && fiscalMatch) {
        matchedFattura = fattura;
        matchType = 'PREVENTIVO';
        matchReason = `Trovato riferimento al preventivo ${cleanPrevCode} e coincidenza fiscale cliente (${fattura.denominazione})`;
        break;
      }

      // Match Fiscale Unico (se la fattura appartiene allo stesso cliente e non sono specificati altri RdP)
      if (fiscalMatch && !matchedFattura) {
        // Assegna come candidato se non troviamo di meglio
        matchedFattura = fattura;
        matchType = 'FISCAL_CLIENT';
        matchReason = `Coincidenza anagrafica cliente (${fattura.denominazione} - P.IVA ${fattura.partitaIva || fattura.codiceFiscale})`;
      }
    }

    if (matchedFattura) {
      const arr = fatturaToPraticheMap.get(matchedFattura.id) || [];
      arr.push(pratica.numeroCampione);
      fatturaToPraticheMap.set(matchedFattura.id, arr);
    }

    return {
      pratica,
      fatturaTrovata: matchedFattura,
      tipoMatch: matchedFattura ? matchType : 'NO_MATCH',
      isCumulativa: false, // Sarà aggiornato nel post-processing
      altriRdpNellaFattura: [],
      motivoMatch: matchReason || 'Nessun riscontro XML trovato per questa pratica',
      selezionato: matchedFattura !== null && pratica.statoFatturazione !== 'Fatturato'
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
