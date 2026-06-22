/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
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

// Retrieve Supabase config from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// ==========================================
// 1. CLIENTS MAPPING & ACTIONS (Tabella: 'clienti')
// ==========================================
export function mapClientToDb(client: Client) {
  return {
    id: client.id,
    denominazione: client.denominazione,
    nome: client.nome || null,
    cognome: client.cognome || null,
    partita_iva: client.partitaIva || null,
    codice_fiscale: client.codiceFiscale || null,
    email: client.email,
    pec: client.pec || null,
    codice_destinatario: client.codiceDestinatario || null,
    telefono: client.telefono || null,
    indirizzo: client.indirizzo || null,
    comune: client.comune || null,
    note: client.note || null,
    fatturato_annuo: client.fatturatoAnnuo || {},
    categorie_fatturato: client.categorieFatturato || {}
  };
}

export function mapDbToClient(db: any): Client {
  return {
    id: db.id,
    denominazione: db.denominazione || '',
    nome: db.nome || undefined,
    cognome: db.cognome || undefined,
    partitaIva: db.partita_iva !== undefined && db.partita_iva !== null ? db.partita_iva : (db.partitaIva || ''),
    codiceFiscale: db.codice_fiscale !== undefined && db.codice_fiscale !== null ? db.codice_fiscale : (db.codiceFiscale || undefined),
    email: db.email || '',
    pec: db.pec || undefined,
    codiceDestinatario: db.codice_destinatario !== undefined && db.codice_destinatario !== null ? db.codice_destinatario : (db.codiceDestinatario || undefined),
    telefono: db.telefono || '',
    indirizzo: db.indirizzo || '',
    comune: db.comune || undefined,
    note: db.note || undefined,
    fatturatoAnnuo: typeof db.fatturato_annuo === 'object' && db.fatturato_annuo !== null 
      ? db.fatturato_annuo 
      : (typeof db.fatturatoAnnuo === 'object' && db.fatturatoAnnuo !== null ? db.fatturatoAnnuo : {}),
    categorieFatturato: typeof db.categorie_fatturato === 'object' && db.categorie_fatturato !== null 
      ? db.categorie_fatturato 
      : (typeof db.categorieFatturato === 'object' && db.categorieFatturato !== null ? db.categorieFatturato : {})
  };
}

export async function fetchClientsFromSupabase(): Promise<Client[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('clienti')
    .select('*')
    .order('denominazione', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapDbToClient);
}

export async function insertClientToSupabase(client: Client): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('clienti').insert([mapClientToDb(client)]);
  if (error) throw error;
}

export async function updateClientInSupabase(client: Client): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('clienti').update(mapClientToDb(client)).eq('id', client.id);
  if (error) throw error;
}

export async function deleteClientFromSupabase(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('clienti').delete().eq('id', id);
  if (error) throw error;
}

// ==========================================
// 2. PROVE MAPPING & ACTIONS (Tabella: 'prove')
// ==========================================
export function mapProvaToDb(prova: Prova) {
  return {
    id: prova.id,
    nome: prova.nome,
    categoria_merceologica: prova.categoriaMerceologica,
    metodo_analitico: prova.metodoAnalitico,
    prezzo_listino: prova.prezzoListino,
    tempo_esecuzione_giorni: prova.tempoEsecuzioneGiorni,
    descrizione: prova.descrizione || null,
    accreditata_accredia: prova.accreditataAccredia || false,
    punti_incertezza: prova.puntiIncertezza || [],
    punti_ripetibilita: prova.puntiRipetibilita || [],
    limite_quantificazione: prova.limiteQuantificazione || null,
    limiti_riferimento: prova.limitiRiferimento || []
  };
}

export function mapDbToProva(db: any): Prova {
  return {
    id: db.id,
    nome: db.nome || '',
    categoriaMerceologica: db.categoria_merceologica || '',
    metodoAnalitico: db.metodo_analitico || '',
    prezzoListino: Number(db.prezzo_listino) || 0,
    tempoEsecuzioneGiorni: Number(db.tempo_esecuzione_giorni) || 0,
    descrizione: db.descrizione || undefined,
    accreditataAccredia: !!db.accreditata_accredia,
    puntiIncertezza: Array.isArray(db.punti_incertezza) ? db.punti_incertezza : [],
    puntiRipetibilita: Array.isArray(db.punti_ripetibilita) ? db.punti_ripetibilita : [],
    limiteQuantificazione: db.limite_quantificazione || undefined,
    limitiRiferimento: Array.isArray(db.limiti_riferimento) ? db.limiti_riferimento : []
  };
}

export async function fetchProveFromSupabase(): Promise<Prova[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('prove').select('*').order('nome', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapDbToProva);
}

export async function insertProvaToSupabase(p: Prova): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('prove').insert([mapProvaToDb(p)]);
  if (error) throw error;
}

export async function updateProvaInSupabase(p: Prova): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('prove').update(mapProvaToDb(p)).eq('id', p.id);
  if (error) throw error;
}

export async function deleteProvaFromSupabase(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('prove').delete().eq('id', id);
  if (error) throw error;
}

// ==========================================
// 3. PACCHETTI MAPPING & ACTIONS (Tabella: 'pacchetti')
// ==========================================
export function mapPacchettoToDb(p: Pacchetto) {
  return {
    id: p.id,
    nome: p.nome,
    descrizione: p.descrizione,
    categoria_merceologica: p.categoriaMerceologica,
    prove_ids: p.proveIds || [],
    prezzo_scontato: p.prezzoScontato
  };
}

export function mapDbToPacchetto(db: any): Pacchetto {
  return {
    id: db.id,
    nome: db.nome || '',
    descrizione: db.descrizione || '',
    categoriaMerceologica: db.categoria_merceologica || '',
    proveIds: Array.isArray(db.prove_ids) ? db.prove_ids : [],
    prezzoScontato: Number(db.prezzo_scontato) || 0
  };
}

export async function fetchPacchettiFromSupabase(): Promise<Pacchetto[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('pacchetti').select('*').order('nome', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapDbToPacchetto);
}

export async function insertPacchettoToSupabase(p: Pacchetto): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('pacchetti').insert([mapPacchettoToDb(p)]);
  if (error) throw error;
}

export async function updatePacchettoInSupabase(p: Pacchetto): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('pacchetti').update(mapPacchettoToDb(p)).eq('id', p.id);
  if (error) throw error;
}

export async function deletePacchettoFromSupabase(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('pacchetti').delete().eq('id', id);
  if (error) throw error;
}

// ==========================================
// 4. PREVENTIVI MAPPING & ACTIONS (Tabella: 'preventivi')
// ==========================================
export function mapPreventivoToDb(p: Preventivo) {
  return {
    id: p.id,
    codice: p.codice,
    cliente_id: p.clienteId,
    data_creazione: p.dataCreazione,
    stato: p.stato,
    prove_selezionate: p.proveSelezionate || [],
    pacchetti_selezionati: p.pacchettiSelezionati || [],
    totale: p.totale,
    sconto_percentuale: p.scontoPercentuale || null,
    nascondi_prezzi_singoli: p.nascondiPrezziSingoli || false,
    note: p.note || null,
    nota_qualita_personalizzata: p.notaQualitaPersonalizzata || null,
    stato_history: p.statoHistory || [],
    validita_offerta: p.validitaOfferta || null,
    oggetto_offerta: p.oggettoOfferta || null,
    modalita_condizioni: p.modalitaCondizioni || null,
    metodo_campionamento: p.metodoCampionamento || null,
    quantita_campione: p.quantitaCampione || null,
    tempo_consegna: p.tempoConsegna || null,
    modalita_invio_rapporto: p.modalitaInvioRapporto || null,
    prova_subappaltata: p.provaSubappaltata || null,
    titolo_modulo: p.titoloModulo || null,
    include_privacy: p.includePrivacy || false,
    privacy_text: p.privacyText || null,
    include_contract: p.includeContract || false,
    contract_text: p.contractText || null,
    contract_model_name: p.contractModelName || null,
    nome_modulo: p.nomeModulo || null
  };
}

export function mapDbToPreventivo(db: any): Preventivo {
  return {
    id: db.id,
    codice: db.codice || '',
    clienteId: db.cliente_id || '',
    dataCreazione: db.data_creazione || '',
    stato: db.stato || 'In Approvazione',
    proveSelezionate: Array.isArray(db.prove_selezionate) ? db.prove_selezionate : [],
    pacchettiSelezionati: Array.isArray(db.pacchetti_selezionati) ? db.pacchetti_selezionati : [],
    totale: Number(db.totale) || 0,
    scontoPercentuale: db.sconto_percentuale !== null ? Number(db.sconto_percentuale) : undefined,
    nascondiPrezziSingoli: !!db.nascondi_prezzi_singoli,
    note: db.note || undefined,
    notaQualitaPersonalizzata: db.nota_qualita_personalizzata || undefined,
    statoHistory: Array.isArray(db.stato_history) ? db.stato_history : [],
    validitaOfferta: db.validita_offerta || undefined,
    oggettoOfferta: db.oggetto_offerta || undefined,
    modalitaCondizioni: db.modalita_condizioni || undefined,
    metodoCampionamento: db.metodo_campionamento || undefined,
    quantitaCampione: db.quantita_campione || undefined,
    tempoConsegna: db.tempo_consegna || undefined,
    modalitaInvioRapporto: db.modalita_invio_rapporto || undefined,
    provaSubappaltata: db.prova_subappaltata || undefined,
    titoloModulo: db.titolo_modulo || undefined,
    includePrivacy: !!db.include_privacy,
    privacyText: db.privacy_text || undefined,
    includeContract: !!db.include_contract,
    contractText: db.contract_text || undefined,
    contractModelName: db.contract_model_name || undefined,
    nomeModulo: db.nome_modulo || undefined
  };
}

export async function fetchPreventiviFromSupabase(): Promise<Preventivo[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('preventivi').select('*').order('data_creazione', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapDbToPreventivo);
}

export async function insertPreventivoToSupabase(p: Preventivo): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('preventivi').insert([mapPreventivoToDb(p)]);
  if (error) throw error;
}

export async function updatePreventivoInSupabase(p: Preventivo): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('preventivi').update(mapPreventivoToDb(p)).eq('id', p.id);
  if (error) throw error;
}

export async function deletePreventivoFromSupabase(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('preventivi').delete().eq('id', id);
  if (error) throw error;
}

// ==========================================
// 5. REAGENTANO MAPPING & ACTIONS (Tabella: 'reagenti')
// ==========================================
export function mapReagenteToDb(r: Reagente) {
  return {
    id: r.id,
    nome: r.nome,
    formula_chimica: r.formulaChimica,
    marca_produttore: r.marcaProduttore,
    codice_prodotto: r.codiceProdotto,
    lotto: r.lotto,
    data_scadenza: r.dataScadenza,
    quantita_disponibile: r.quantitaDisponibile,
    unita_misura: r.unitaMisura,
    collocazione: r.collocazione,
    livello_sotto_scorta: r.livelloSottoScorta,
    costo: r.costo || null,
    anno_acquisto: r.annoAcquisto || null
  };
}

export function mapDbToReagente(db: any): Reagente {
  return {
    id: db.id,
    nome: db.nome || '',
    formulaChimica: db.formula_chimica || '',
    marcaProduttore: db.marca_produttore || '',
    codiceProdotto: db.codice_prodotto || '',
    lotto: db.lotto || '',
    dataScadenza: db.data_scadenza || '',
    quantitaDisponibile: Number(db.quantita_disponibile) || 0,
    unitaMisura: db.unita_misura || '',
    collocazione: db.collocazione || '',
    livelloSottoScorta: Number(db.livello_sotto_scorta) || 0,
    costo: db.costo !== null ? Number(db.costo) : undefined,
    annoAcquisto: db.anno_acquisto !== null ? Number(db.anno_acquisto) : undefined
  };
}

export async function fetchReagentiFromSupabase(): Promise<Reagente[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('reagenti').select('*').order('nome', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapDbToReagente);
}

export async function insertReagenteToSupabase(r: Reagente): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('reagenti').insert([mapReagenteToDb(r)]);
  if (error) throw error;
}

export async function updateReagenteInSupabase(r: Reagente): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('reagenti').update(mapReagenteToDb(r)).eq('id', r.id);
  if (error) throw error;
}

export async function deleteReagenteFromSupabase(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('reagenti').delete().eq('id', id);
  if (error) throw error;
}

// ==========================================
// 6. REAGENTI RITIRATI MAPPING & ACTIONS (Tabella: 'reagenti_ritirati')
// ==========================================
export function mapReagenteRitiratoToDb(r: ReagenteRitirato) {
  return {
    id: r.id,
    reagente_id: r.reagenteId,
    nome: r.nome,
    formula_chimica: r.formulaChimica || null,
    marca_produttore: r.marcaProduttore || null,
    lotto: r.lotto || null,
    quantita_ritirata: r.quantitaRitirata,
    unita_misura: r.unitaMisura,
    costo_ritirato: r.costoRitirato,
    anno_ritiro: r.annoRitiro,
    data_ritiro: r.dataRitiro,
    motivo: r.motivo
  };
}

export function mapDbToReagenteRitirato(db: any): ReagenteRitirato {
  return {
    id: db.id,
    reagenteId: db.reagente_id || '',
    nome: db.nome || '',
    formulaChimica: db.formula_chimica || undefined,
    marcaProduttore: db.marca_produttore || undefined,
    lotto: db.lotto || undefined,
    quantitaRitirata: Number(db.quantita_ritirata) || 0,
    unitaMisura: db.unita_misura || '',
    costoRitirato: Number(db.costo_ritirato) || 0,
    annoRitiro: Number(db.anno_ritiro) || 2026,
    dataRitiro: db.data_ritiro || '',
    motivo: db.motivo || ''
  };
}

export async function fetchReagentiRitiratiFromSupabase(): Promise<ReagenteRitirato[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('reagenti_ritirati').select('*').order('data_ritiro', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapDbToReagenteRitirato);
}

export async function insertReagenteRitiratoToSupabase(r: ReagenteRitirato): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('reagenti_ritirati').insert([mapReagenteRitiratoToDb(r)]);
  if (error) throw error;
}

export async function deleteReagenteRitiratoFromSupabase(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('reagenti_ritirati').delete().eq('id', id);
  if (error) throw error;
}

export async function updateReagenteRitiratoInSupabase(r: ReagenteRitirato): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('reagenti_ritirati').update(mapReagenteRitiratoToDb(r)).eq('id', r.id);
  if (error) throw error;
}

// ==========================================
// 7. ACCETTAZIONI MAPPING & ACTIONS (Tabella: 'accettazioni')
// ==========================================
export function mapAccettazioneToDb(a: AccettazioneCampione) {
  return {
    id: a.id,
    codice_accettazione: a.codiceAccettazione,
    data_accettazione: a.dataAccettazione,
    descrizione_campione: a.descrizioneCampione,
    matrice: a.matrice,
    quantita_campione: a.quantitaCampione,
    temperatura_arrivo: a.temperaturaArrivo || null,
    stato_in_arrivo: a.statoInArrivo,
    intestatario_rapporto_cliente_id: a.intestatarioRapportoClienteId,
    destinatario_fattura_cliente_id: a.destinatarioFatturaClienteId,
    preventivo_associato_id: a.preventivoAssociatoId || null,
    consegna_prevista: a.consegnaPrevista || null,
    note_lab: a.noteLab || null,
    analisi_stato: a.analisiStato,
    operator_registrazione: a.operatorRegistrazione || null,
    operator_registrazione_ruolo: a.operatorRegistrazioneRuolo || null,
    risultati_analisi: a.risultatiAnalisi || [],
    categoria_merceologica: a.categoriaMerceologica || null,
    informazioni_cliente: a.informazioniCliente || null,
    destinatario_finale: a.destinatarioFinale || null,
    etichetta_campione: a.etichettaCampione || null,
    imballaggio: a.imballaggio || null,
    campionato_da: a.campionatoDa || null,
    procedura_campionamento: a.proceduraCampionamento || null,
    ora_ricevimento: a.oraRicevimento || null,
    data_inizio_prova: a.dataInizioProva || null,
    data_termine_prova: a.dataTermineProva || null,
    nota1: a.nota1 || null,
    nota2: a.nota2 || null,
    dichiarazione_conformita: a.dichiarazioneConformita || null,
    opinioni_interpretazioni: a.opinioniInterpretazioni || null,
    stato_history: a.statoHistory || [],
    firmatario_reparto1: a.firmatarioReparto1 || null,
    firmatario_reparto2: a.firmatarioReparto2 || null,
    firmatario_tecnico: a.firmatarioTecnico || null,
    ruolo_firmatario_tecnico: a.ruoloFirmatarioTecnico || null,
    giustificazione_non_idoneita: a.giustificazioneNonIdoneita || null,
    data_prelievo: a.dataPrelievo || null,
    ora_prelievo: a.oraPrelievo || null,
    consegnante_relazione: a.consegnanteRelazione || null,
    punto_prelievo: a.puntoPrelievo || null,
    temperatura_trasporto: a.temperaturaTrasporto || null,
    temperatura_conservazione_lab: a.temperaturaConservazioneLab || null,
    comune_prelievo: a.comunePrelievo || null,
    qualita_consegnante: a.qualitaConsegnante || null,
    autorizzazione_cliente: a.autorizzazioneCliente || null,
    riferimento_autorizzazione_email: a.riferimentoAutorizzazioneEmail || null,
    temp_accettazione_conforme: a.tempAccettazioneConforme || null,
    temp_trasporto_conforme: a.tempTrasportoConforme || null,
    temp_conservazione_conforme: a.tempConservazioneConforme || null,
    ricezione_condizioni_mpg069: a.ricezioneCondizioniMPG069 || null,
    revisione_corrente: a.revisioneCorrente || 0,
    revisione_motivo: a.revisioneMotivo || null,
    data_revisione: a.dataRevisione || null,
    storico_revisioni: a.storicoRevisioni || []
  };
}

export function mapDbToAccettazione(db: any): AccettazioneCampione {
  return {
    id: db.id,
    codiceAccettazione: db.codice_accettazione || '',
    dataAccettazione: db.data_accettazione || '',
    descrizioneCampione: db.descrizione_campione || '',
    matrice: db.matrice || '',
    quantitaCampione: db.quantita_campione || '',
    temperaturaArrivo: db.temperatura_arrivo || undefined,
    statoInArrivo: db.stato_in_arrivo || 'Idoneo',
    intestatarioRapportoClienteId: db.intestatario_rapporto_cliente_id || '',
    destinatarioFatturaClienteId: db.destinatario_fattura_cliente_id || '',
    preventivoAssociatoId: db.preventivo_associato_id || undefined,
    consegnaPrevista: db.consegna_prevista || undefined,
    noteLab: db.note_lab || undefined,
    analisiStato: db.analisi_stato || 'In Attesa',
    operatorRegistrazione: db.operator_registrazione || undefined,
    operatorRegistrazioneRuolo: db.operator_registrazione_ruolo || undefined,
    risultatiAnalisi: Array.isArray(db.risultati_analisi) ? db.risultati_analisi : [],
    categoriaMerceologica: db.categoria_merceologica || undefined,
    informazioniCliente: db.informazioni_cliente || undefined,
    destinatarioFinale: db.destinatario_finale || undefined,
    etichettaCampione: db.etichetta_campione || undefined,
    imballaggio: db.imballaggio || undefined,
    campionatoDa: db.campionato_da || undefined,
    proceduraCampionamento: db.procedura_campionamento || undefined,
    oraRicevimento: db.ora_ricevimento || undefined,
    dataInizioProva: db.data_inizio_prova || undefined,
    dataTermineProva: db.data_termine_prova || undefined,
    nota1: db.nota1 || undefined,
    nota2: db.nota2 || undefined,
    dichiarazioneConformita: db.dichiarazione_conformita || undefined,
    opinioniInterpretazioni: db.opinioni_interpretazioni || undefined,
    statoHistory: Array.isArray(db.stato_history) ? db.stato_history : [],
    firmatarioReparto1: db.firmatario_reparto1 || undefined,
    firmatarioReparto2: db.firmatario_reparto2 || undefined,
    firmatarioTecnico: db.firmatario_tecnico || undefined,
    ruoloFirmatarioTecnico: db.ruolo_firmatario_tecnico || undefined,
    giustificazioneNonIdoneita: db.giustificazione_non_idoneita || undefined,
    dataPrelievo: db.data_prelievo || undefined,
    oraPrelievo: db.ora_prelievo || undefined,
    consegnanteRelazione: db.consegnante_relazione || undefined,
    puntoPrelievo: db.punto_prelievo || undefined,
    temperaturaTrasporto: db.temperatura_trasporto || undefined,
    temperaturaConservazioneLab: db.temperatura_conservazione_lab || undefined,
    comunePrelievo: db.comune_prelievo || undefined,
    qualitaConsegnante: db.qualita_consegnante || undefined,
    autorizzazioneCliente: db.autorizzazione_cliente || undefined,
    riferimentoAutorizzazioneEmail: db.riferimento_autorizzazione_email || undefined,
    tempAccettazioneConforme: db.temp_accettazione_conforme || undefined,
    tempTrasportoConforme: db.temp_trasporto_conforme || undefined,
    tempConservazioneConforme: db.temp_conservazione_conforme || undefined,
    ricezioneConditionsMPG069: db.ricezione_condizioni_mpg069 || undefined,
    revisioneCorrente: db.revisione_corrente !== null ? Number(db.revisione_corrente) : undefined,
    revisioneMotivo: db.revisione_motivo || undefined,
    dataRevisione: db.data_revisione || undefined,
    storicoRevisioni: Array.isArray(db.storico_revisioni) ? db.storico_revisioni : []
  } as any;
}

export async function fetchAccettazioniFromSupabase(): Promise<AccettazioneCampione[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('accettazioni').select('*').order('data_accettazione', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapDbToAccettazione);
}

export async function insertAccettazioneToSupabase(a: AccettazioneCampione): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('accettazioni').insert([mapAccettazioneToDb(a)]);
  if (error) throw error;
}

export async function updateAccettazioneInSupabase(a: AccettazioneCampione): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('accettazioni').update(mapAccettazioneToDb(a)).eq('id', a.id);
  if (error) throw error;
}

export async function deleteAccettazioneFromSupabase(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('accettazioni').delete().eq('id', id);
  if (error) throw error;
}

// ==========================================
// 8. OPERATORS MAPPING & ACTIONS (Tabella: 'operatori')
// ==========================================
export function mapOperatorToDb(o: Operator) {
  return {
    nome: o.nome,
    ruolo: o.ruolo,
    password: o.password,
    attivo: o.attivo || false,
    autorizzato_firma: o.autorizzatoFirma || false,
    ruolo_firma: o.ruoloFirma || null,
    is_responsabile_reparto: o.isResponsabileReparto || false,
    is_responsabile_tecnico: o.isResponsabileTecnico || false
  };
}

export function mapDbToOperator(db: any): Operator {
  return {
    nome: db.nome || '',
    ruolo: db.ruolo || '',
    password: db.password || '',
    attivo: !!db.attivo,
    autorizzatoFirma: !!db.autorizzato_firma,
    ruoloFirma: db.ruolo_firma || undefined,
    isResponsabileReparto: !!db.is_responsabile_reparto,
    isResponsabileTecnico: !!db.is_responsabile_tecnico
  };
}

export async function fetchOperatorsFromSupabase(): Promise<Operator[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('operatori').select('*').order('nome', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapDbToOperator);
}

export async function insertOperatorToSupabase(o: Operator): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('operatori').insert([mapOperatorToDb(o)]);
  if (error) throw error;
}

export async function updateOperatorInSupabase(o: Operator): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('operatori').update(mapOperatorToDb(o)).eq('nome', o.nome);
  if (error) throw error;
}

export async function deleteOperatorFromSupabase(nome: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('operatori').delete().eq('nome', nome);
  if (error) throw error;
}

// ==========================================
// 9. PRATICHE FATTURAZIONE MAPPING & ACTIONS (Tabella: 'pratiche_fatturazione')
// ==========================================
export function mapPraticaToDb(p: PraticaFatturazione) {
  return {
    id: p.id,
    numero_campione: p.numeroCampione,
    cliente_id: p.clienteId,
    nome_cliente: p.nomeCliente,
    partita_iva: p.partitaIva,
    numero_preventivo: p.numeroPreventivo,
    data_accettazione: p.dataAccettazione,
    importo: p.importo,
    stato_fatturazione: p.statoFatturazione,
    numero_fattura: p.numeroFattura || null,
    data_fattura: p.dataFattura || null,
    note: p.note || null,
    pagato: p.pagato || false,
    data_pagamento: p.dataPagamento || null
  };
}

export function mapDbToPratica(db: any): PraticaFatturazione {
  return {
    id: db.id,
    numeroCampione: db.numero_campione || '',
    clienteId: db.cliente_id || '',
    nomeCliente: db.nome_cliente || '',
    partitaIva: db.partita_iva || '',
    numeroPreventivo: db.numero_preventivo || '',
    dataAccettazione: db.data_accettazione || '',
    importo: Number(db.importo) || 0,
    statoFatturazione: db.stato_fatturazione || 'Da fatturare',
    numeroFattura: db.numero_fattura || '',
    dataFattura: db.data_fatura || '',
    note: db.note || '',
    pagato: !!db.pagato,
    dataPagamento: db.data_pagamento || undefined
  };
}

export async function fetchPraticheFromSupabase(): Promise<PraticaFatturazione[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('pratiche_fatturazione').select('*').order('data_accettazione', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapDbToPratica);
}

export async function insertPraticaToSupabase(p: PraticaFatturazione): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('pratiche_fatturazione').insert([mapPraticaToDb(p)]);
  if (error) throw error;
}

export async function updatePraticaInSupabase(p: PraticaFatturazione): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('pratiche_fatturazione').update(mapPraticaToDb(p)).eq('id', p.id);
  if (error) throw error;
}

export async function deletePraticaFromSupabase(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('pratiche_fatturazione').delete().eq('id', id);
  if (error) throw error;
}

// ==========================================
// 10. AUDIT LOGS MAPPING & ACTIONS (Tabella: 'audit_logs')
// ==========================================
export function mapAuditLogToDb(a: AuditLog) {
  return {
    id: a.id,
    data_ora: a.dataOra,
    utente: a.utente,
    sezione: a.sezione,
    campo: a.campo,
    valore_precedente: a.valorePrecedente,
    valore_nuovo: a.valoreNuovo
  };
}

export function mapDbToAuditLog(db: any): AuditLog {
  return {
    id: db.id,
    dataOra: db.data_ora || '',
    utente: db.utente || '',
    sezione: db.sezione || '',
    campo: db.campo || '',
    valorePrecedente: db.valore_precedente || '',
    valoreNuovo: db.valore_nuovo || ''
  };
}

export async function fetchAuditLogsFromSupabase(): Promise<AuditLog[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('audit_logs').select('*').order('id', { ascending: false }).limit(200);
  if (error) throw error;
  return (data || []).map(mapDbToAuditLog);
}

export async function insertAuditLogToSupabase(a: AuditLog): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('audit_logs').insert([mapAuditLogToDb(a)]);
  if (error) throw error;
}

export async function syncAllLocalDataToSupabase(
  clients: Client[],
  prove: Prova[],
  pacchetti: Pacchetto[],
  preventivi: Preventivo[],
  reagenti: Reagente[],
  reagentiRitirati: ReagenteRitirato[],
  accettazioni: AccettazioneCampione[],
  operators: Operator[],
  pratiche: PraticaFatturazione[],
  auditLogs: AuditLog[]
): Promise<void> {
  if (!supabase) return;

  // Sync clients
  if (clients.length > 0) {
    const { error } = await supabase.from('clienti').upsert(clients.map(mapClientToDb));
    if (error) throw new Error("Errore durante il caricamento dei Clienti: " + error.message);
  }

  // Sync prove
  if (prove.length > 0) {
    const { error } = await supabase.from('prove').upsert(prove.map(mapProvaToDb));
    if (error) throw new Error("Errore durante il caricamento delle Prove: " + error.message);
  }

  // Sync pacchetti
  if (pacchetti.length > 0) {
    const { error } = await supabase.from('pacchetti').upsert(pacchetti.map(mapPacchettoToDb));
    if (error) throw new Error("Errore durante il caricamento dei Pacchetti ANALISI: " + error.message);
  }

  // Sync preventivi
  if (preventivi.length > 0) {
    const { error } = await supabase.from('preventivi').upsert(preventivi.map(mapPreventivoToDb));
    if (error) throw new Error("Errore durante il caricamento dei Preventivi: " + error.message);
  }

  // Sync reagenti
  if (reagenti.length > 0) {
    const { error } = await supabase.from('reagenti').upsert(reagenti.map(mapReagenteToDb));
    if (error) throw new Error("Errore durante il caricamento dei Reagenti: " + error.message);
  }

  // Sync reagenti ritirati
  if (reagentiRitirati.length > 0) {
    const { error } = await supabase.from('reagenti_ritirati').upsert(reagentiRitirati.map(mapReagenteRitiratoToDb));
    if (error) throw new Error("Errore durante il caricamento dello Storico dei Reagenti Ritirati: " + error.message);
  }

  // Sync accettazioni
  if (accettazioni.length > 0) {
    const { error } = await supabase.from('accettazioni').upsert(accettazioni.map(mapAccettazioneToDb));
    if (error) throw new Error("Errore durante il caricamento delle Accettazioni: " + error.message);
  }

  // Sync operatori
  if (operators.length > 0) {
    const { error } = await supabase.from('operatori').upsert(operators.map(mapOperatorToDb));
    if (error) throw new Error("Errore durante il caricamento degli Operatori: " + error.message);
  }

  // Sync pratiche
  if (pratiche.length > 0) {
    const { error } = await supabase.from('pratiche_fatturazione').upsert(pratiche.map(mapPraticaToDb));
    if (error) throw new Error("Errore durante il caricamento delle Pratiche di Fatturazione: " + error.message);
  }

  // Sync audit
  if (auditLogs.length > 0) {
    // Only upload top 50 to avoid payload limit
    const logsToSync = auditLogs.slice(0, 50);
    const { error } = await supabase.from('audit_logs').upsert(logsToSync.map(mapAuditLogToDb));
    if (error) throw new Error("Errore durante il caricamento degli Audit Logs: " + error.message);
  }
}

