import { useState, useEffect } from 'react';
import { AccettazioneCampione, Client, Prova, Operator } from '../types';
import { X, FileText, CheckCircle2, Printer, Scale, Search, RefreshCw, Calculator, Sparkles, ChevronDown, Save } from 'lucide-react';
import { logoAgenzia } from '../assets/images/logos';
import { getAcidiGrassiFrazioniDisplay } from '../utils/acidiGrassi';

interface EtichettaNutrizionaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  accettazioni: AccettazioneCampione[];
  clients: Client[];
  prove?: Prova[];
  operators?: Operator[];
  onUpdateAccettazione?: (acc: AccettazioneCampione) => void;
  initialSampleId?: string | null;
  onGoToAccettazione?: (accId: string, fromLabel?: string) => void;
}

const FOOD_KEYWORDS = [
  'etichetta nutrizionale',
  'etichette nutrizionali',
  'nutrizional',
  'aliment',
  'olio',
  'vino',
  'sfarinat',
  'farina',
  'pane',
  'pasta',
  'forno',
  'conserv',
  'latte',
  'formagg',
  'latticin',
  'miele',
  'dolci',
  'bevanda',
  'carne',
  'salum',
  'pesce',
  'ittic',
  'ortofrutt',
  'frutta',
  'verdura',
  'agroaliment',
  'mangim',
];

export function EtichettaNutrizionaleModal({
  isOpen,
  onClose,
  accettazioni,
  clients,
  prove = [],
  operators = [],
  onUpdateAccettazione,
  initialSampleId,
  onGoToAccettazione,
}: EtichettaNutrizionaleModalProps) {
  const [mostraTuttiCampioni, setMostraTuttiCampioni] = useState<boolean>(false);

  // Filtra i report alimentari / nutrizionali (o tutti se il toggle è attivo o se non vi sono match)
  const reportNutrizionaliBase = accettazioni.filter(acc => {
    if (acc.datiEtichettaNutrizionale) return true;
    const cat = (acc.categoriaMerceologica || '').toLowerCase().trim();
    const mat = (acc.matrice || '').toLowerCase().trim();
    const desc = (acc.descrizioneCampione || '').toLowerCase().trim();
    return FOOD_KEYWORDS.some(kw => cat.includes(kw) || mat.includes(kw) || desc.includes(kw));
  });

  const reportNutrizionali =
    mostraTuttiCampioni || reportNutrizionaliBase.length === 0
      ? accettazioni
      : reportNutrizionaliBase;

  const [selectedAccId, setSelectedAccId] = useState<string>(reportNutrizionali[0]?.id || '');

  useEffect(() => {
    if (isOpen && initialSampleId) {
      setMostraTuttiCampioni(true);
      setSelectedAccId(initialSampleId);
    }
  }, [isOpen, initialSampleId]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [porzioneGrezza, setPorzioneGrezza] = useState<number>(100);
  const [umidita, setUmidita] = useState<number>(0);
  const [ceneri, setCeneri] = useState<number>(0);
  const [firmatarioResponsabile, setFirmatarioResponsabile] = useState<string>(
    operators.find(o => o.attivo !== false && o.autorizzatoFirma !== false && (o.isResponsabileTecnico || (o.ruoloFirma || '').toLowerCase().includes('tecnico')))?.nome ||
    operators[0]?.nome ||
    'Dott. Chim. F. Lupo'
  );
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const selectedAcc = accettazioni.find(a => a.id === selectedAccId) || reportNutrizionali[0];

  const [valori, setValori] = useState({
    energiaKj: 1650,
    energiaKcal: 395,
    grassi: 14.2,
    grassiSaturi: 2.1,
    carboidrati: 55.4,
    zuccheri: 12.8,
    glucosio: 0,
    fruttosio: 0,
    saccarosio: 0,
    lattosio: 0,
    fibre: 0,
    proteine: 8.2,
    sodio: 0.34, // in g/100g
    sale: 0.85   // Sodio * 2.5
  });

  // Traccia quali prove e nutrienti sono effettivamente presenti nel RdP o selezionati per l'inclusione nell'etichetta
  const [vociAbilitate, setVociAbilitate] = useState<{
    energia: boolean;
    grassi: boolean;
    grassiSaturi: boolean;
    carboidrati: boolean;
    zuccheri: boolean;
    glucosio: boolean;
    fruttosio: boolean;
    saccarosio: boolean;
    lattosio: boolean;
    fibre: boolean;
    proteine: boolean;
    sale: boolean;
  }>({
    energia: true,
    grassi: true,
    grassiSaturi: true,
    carboidrati: true,
    zuccheri: true,
    glucosio: false,
    fruttosio: false,
    saccarosio: false,
    lattosio: false,
    fibre: false,
    proteine: true,
    sale: true
  });

  const toggleVoce = (chiave: keyof typeof vociAbilitate) => {
    setVociAbilitate(prev => ({
      ...prev,
      [chiave]: !prev[chiave]
    }));
  };

  // Funzione per estrarre ed ereditare i valori analitici direttamente dal Rapporto di Prova (RdP)
  const estraiValoriDaRdP = (acc?: AccettazioneCampione) => {
    if (!acc) return;

    const nuoviValori = {
      energiaKj: 0,
      energiaKcal: 0,
      grassi: 0,
      grassiSaturi: 0,
      carboidrati: 0,
      zuccheri: 0,
      glucosio: 0,
      fruttosio: 0,
      saccarosio: 0,
      lattosio: 0,
      fibre: 0,
      proteine: 0,
      sodio: 0,
      sale: 0
    };

    const nuoveVoci = {
      energia: false,
      grassi: false,
      grassiSaturi: false,
      carboidrati: false,
      zuccheri: false,
      glucosio: false,
      fruttosio: false,
      saccarosio: false,
      lattosio: false,
      fibre: false,
      proteine: false,
      sale: false
    };

    let trovatiValori = false;
    let umiditaTrovata = 0;
    let ceneriTrovate = 0;

    if (acc.risultatiAnalisi && Array.isArray(acc.risultatiAnalisi)) {
      acc.risultatiAnalisi.forEach(r => {
        const pObj = prove.find(p => p.id === r.provaId);
        const name = (pObj?.nome || r.provaId || '').toLowerCase();
        const rawVal = r.valoreRilevato || '';
        
        // Estrae eventuale numero floating point trovato nel valore rilevato
        const numMatch = rawVal ? rawVal.replace(',', '.').match(/-?\d+(\.\d+)?/) : null;
        const val = numMatch ? parseFloat(numMatch[0]) : 0;

        if (name.includes('umidit') || name.includes('acqua') || name.includes('moisture')) {
          umiditaTrovata = val;
        } else if (name.includes('cener') || name.includes('ash')) {
          ceneriTrovate = val;
        } else if (name.includes('energia') && (name.includes('kj') || name.includes('kilojoule'))) {
          nuoviValori.energiaKj = val;
          nuoveVoci.energia = true;
          trovatiValori = true;
        } else if (name.includes('energia') && (name.includes('kcal') || name.includes('cal'))) {
          nuoviValori.energiaKcal = val;
          nuoveVoci.energia = true;
          trovatiValori = true;
        } else if ((name.includes('grassi') || name.includes('lipidi') || name.includes('fat') || name.includes('sostanze grasse')) && !name.includes('saturi') && !name.includes('acidi grassi')) {
          nuoviValori.grassi = val;
          nuoveVoci.grassi = true;
          trovatiValori = true;
        } else if (name.includes('saturi') || name.includes('saturated')) {
          nuoviValori.grassiSaturi = val;
          nuoveVoci.grassiSaturi = true;
          trovatiValori = true;
        } else if ((name.includes('carboidrat') || name.includes('carbohydrate')) && !name.includes('zuccheri')) {
          nuoviValori.carboidrati = val;
          nuoveVoci.carboidrati = true;
          trovatiValori = true;
        } else if (name.includes('glucosio') || name.includes('glucose')) {
          nuoviValori.glucosio = val;
          nuoveVoci.glucosio = true;
          trovatiValori = true;
        } else if (name.includes('fruttosio') || name.includes('fructose')) {
          nuoviValori.fruttosio = val;
          nuoveVoci.fruttosio = true;
          trovatiValori = true;
        } else if (name.includes('saccarosio') || name.includes('sucrose')) {
          nuoviValori.saccarosio = val;
          nuoveVoci.saccarosio = true;
          trovatiValori = true;
        } else if (name.includes('lattosio') || name.includes('lactose')) {
          nuoviValori.lattosio = val;
          nuoveVoci.lattosio = true;
          trovatiValori = true;
        } else if (name.includes('zuccheri') || name.includes('sugars')) {
          nuoviValori.zuccheri = val;
          nuoveVoci.zuccheri = true;
          trovatiValori = true;
        } else if (name.includes('fibr') || name.includes('fibre')) {
          nuoviValori.fibre = val;
          nuoveVoci.fibre = true;
          trovatiValori = true;
        } else if (name.includes('protein') || name.includes('azoto totale')) {
          nuoviValori.proteine = val;
          nuoveVoci.proteine = true;
          trovatiValori = true;
        } else if (name.includes('sodio') || name.includes('sodium')) {
          const isMg = (r.unitaMisura || rawVal).toLowerCase().includes('mg');
          const sodioG = isMg ? val / 1000 : val;
          nuoviValori.sodio = Number(sodioG.toFixed(3));
          nuoviValori.sale = Number((sodioG * 2.5).toFixed(3));
          nuoveVoci.sale = true;
          trovatiValori = true;
        } else if (name.includes('sale') || name.includes('salt') || name.includes('cloruro di sodio') || name.includes('nacl')) {
          nuoviValori.sale = val;
          nuoviValori.sodio = Number((val / 2.5).toFixed(3));
          nuoveVoci.sale = true;
          trovatiValori = true;
        }

        // Lettura frazioni Acidi Grassi Saturi da Quaderno Gascromatografico se presente
        if (pObj && !nuoveVoci.grassiSaturi) {
          const frazioni = getAcidiGrassiFrazioniDisplay(pObj, r);
          if (frazioni && frazioni.length > 0) {
            const sommaSaturiPct = frazioni
              .filter(f => f.haValore && (f.sigla.endsWith(':0') || f.nome.toLowerCase().includes('saturi')))
              .reduce((sum, f) => {
                const n = parseFloat(f.valoreSoloNumero.replace(',', '.'));
                return sum + (isNaN(n) ? 0 : n);
              }, 0);
            if (sommaSaturiPct > 0) {
              // Se grassi totali sono noti e le frazioni sono in %, convertiamo in g/100g, altrimenti usiamo il valore diretto
              const saturiG = nuoviValori.grassi > 0 && sommaSaturiPct <= 100
                ? Number(((sommaSaturiPct / 100) * nuoviValori.grassi).toFixed(2))
                : Number(sommaSaturiPct.toFixed(2));
              nuoviValori.grassiSaturi = saturiG;
              nuoveVoci.grassiSaturi = true;
              trovatiValori = true;
            }
          }
        }
      });
    }

    if (umiditaTrovata > 0) setUmidita(umiditaTrovata);
    if (ceneriTrovate > 0) setCeneri(ceneriTrovate);

    // Se i carboidrati non sono stati misurati direttamente ma ci sono Umidità/Proteine/Grassi/Ceneri, calcola per differenza
    if (!nuoveVoci.carboidrati && (umiditaTrovata > 0 || ceneriTrovate > 0) && (nuoveVoci.proteine || nuoveVoci.grassi)) {
      const diffCarb = Math.max(0, 100 - (umiditaTrovata + nuoviValori.proteine + nuoviValori.grassi + ceneriTrovate + nuoviValori.fibre));
      nuoviValori.carboidrati = Number(diffCarb.toFixed(2));
      nuoveVoci.carboidrati = true;
      trovatiValori = true;
    }

    // Se sono presenti singoli zuccheri, abilita la voce totale zuccheri
    if (nuoveVoci.glucosio || nuoveVoci.fruttosio || nuoveVoci.saccarosio || nuoveVoci.lattosio) {
      nuoveVoci.zuccheri = true;
      if (nuoviValori.zuccheri === 0) {
        const sommaSingoli = nuoviValori.glucosio + nuoviValori.fruttosio + nuoviValori.saccarosio + nuoviValori.lattosio;
        if (sommaSingoli > 0) {
          nuoviValori.zuccheri = Number(sommaSingoli.toFixed(2));
        }
      }
    }

    // Auto-calcolo energia se non presente esplicitamente nel RdP ma ci sono macronutrienti
    if (nuoveVoci.grassi || nuoveVoci.carboidrati || nuoveVoci.proteine) {
      nuoveVoci.energia = true;
      if (nuoviValori.energiaKcal === 0) {
        nuoviValori.energiaKcal = Math.round(nuoviValori.grassi * 9 + nuoviValori.carboidrati * 4 + nuoviValori.proteine * 4 + (nuoveVoci.fibre ? nuoviValori.fibre * 2 : 0));
        nuoviValori.energiaKj = Math.round(nuoviValori.grassi * 37 + nuoviValori.carboidrati * 17 + nuoviValori.proteine * 17 + (nuoveVoci.fibre ? nuoviValori.fibre * 8 : 0));
      }
    }

    if (trovatiValori) {
      setValori(prev => ({ ...prev, ...nuoviValori }));
      setVociAbilitate(nuoveVoci);
    }
  };

  // Quando viene cambiato il RdP selezionato, ripristina eventuale scheda salvata o estrae dal RdP
  useEffect(() => {
    if (selectedAcc) {
      if (selectedAcc.firmatarioTecnico) {
        setFirmatarioResponsabile(selectedAcc.firmatarioTecnico);
      }
      if (selectedAcc.datiEtichettaNutrizionale) {
        const saved = selectedAcc.datiEtichettaNutrizionale;
        setPorzioneGrezza(saved.porzioneGrezza || 100);
        setValori(prev => ({ ...prev, ...saved.valori }));
        setVociAbilitate(prev => ({ ...prev, ...saved.vociAbilitate }));
        if (saved.valori.umidita !== undefined) setUmidita(saved.valori.umidita);
        if (saved.valori.ceneri !== undefined) setCeneri(saved.valori.ceneri);
        if (saved.firmatario) setFirmatarioResponsabile(saved.firmatario);
      } else {
        estraiValoriDaRdP(selectedAcc);
      }
    }
  }, [selectedAccId]);

  const handleSaveEtichettaToCampione = () => {
    if (!selectedAcc || !onUpdateAccettazione) return;
    onUpdateAccettazione({
      ...selectedAcc,
      datiEtichettaNutrizionale: {
        porzioneGrezza,
        valori: {
          ...valori,
          umidita,
          ceneri,
        },
        vociAbilitate,
        firmatario: firmatarioResponsabile,
        dataSalvataggio: new Date().toLocaleDateString('it-IT') + ' ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      },
    });
    setSaveFeedback('Etichetta nutrizionale salvata correttamente sul campione!');
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  const calcolaCarboidratiPerDifferenza = () => {
    const diff = Math.max(0, 100 - (umidita + valori.proteine + valori.grassi + ceneri + (vociAbilitate.fibre ? valori.fibre : 0)));
    setValori(prev => ({ ...prev, carboidrati: Number(diff.toFixed(2)) }));
    setVociAbilitate(prev => ({ ...prev, carboidrati: true }));
  };

  const getClientName = (clientId: string) => {
    const c = clients.find(cl => cl.id === clientId);
    return c ? (c.denominazione || `${c.nome || ''} ${c.cognome || ''}`) : 'Cliente non specificato';
  };

  const getClientPiva = (clientId: string) => {
    const c = clients.find(cl => cl.id === clientId);
    return c ? c.partitaIva : '';
  };

  // Gestione conversione Sodio -> Sale
  const handleSodioChange = (sodioVal: number) => {
    const saleCalcolato = Number((sodioVal * 2.5).toFixed(3));
    setValori(prev => ({
      ...prev,
      sodio: sodioVal,
      sale: saleCalcolato
    }));
  };

  const handleSaleChange = (saleVal: number) => {
    const sodioCalcolato = Number((saleVal / 2.5).toFixed(3));
    setValori(prev => ({
      ...prev,
      sale: saleVal,
      sodio: sodioCalcolato
    }));
  };

  // Calcolo automatico somma zuccheri specifici
  const sincronizzaTotaleZuccheri = () => {
    const somma = valori.glucosio + valori.fruttosio + valori.saccarosio + valori.lattosio;
    setValori(prev => ({ ...prev, zuccheri: Number(somma.toFixed(2)) }));
  };

  // Calcolo automatico energia da macronutrienti
  const calcolaEnergiaAutomatico = () => {
    const kcal = Math.round(valori.grassi * 9 + valori.carboidrati * 4 + valori.proteine * 4 + valori.fibre * 2);
    const kj = Math.round(valori.grassi * 37 + valori.carboidrati * 17 + valori.proteine * 17 + valori.fibre * 8);
    setValori(prev => ({ ...prev, energiaKcal: kcal, energiaKj: kj }));
  };

  // Arrotondamento Regolamento UE 1169/2011 (Allegato XV e Linee Guida Commissione Europea)
  const arrotonda1169 = (val: number, tipo: 'energia' | 'standard' | 'saturi' | 'sale' = 'standard') => {
    if (tipo === 'energia') {
      return Math.round(val);
    }
    if (tipo === 'sale') {
      if (val >= 1) return Math.round(val * 10) / 10;
      if (val >= 0.0125) return Math.round(val * 100) / 100;
      return 0;
    }
    if (tipo === 'saturi') {
      if (val >= 10) return Math.round(val);
      if (val >= 0.1) return Math.round(val * 10) / 10;
      return 0;
    }
    // Macronutrienti standard (Grassi, Carboidrati, Zuccheri, Fibre, Proteine)
    if (val >= 10) {
      return Math.round(val);
    } else if (val >= 0.5) {
      return Math.round(val * 10) / 10;
    } else if (val > 0) {
      return Math.round(val * 10) / 10;
    } else {
      return 0;
    }
  };

  const formatDisplay1169 = (val: number, tipo: 'standard' | 'saturi' | 'sale' = 'standard'): string => {
    if (val <= 0) return '0';
    if (tipo === 'sale' && val > 0 && val < 0.0125) return '< 0,01';
    if (tipo === 'saturi' && val > 0 && val < 0.1) return '< 0,1';
    if (tipo === 'standard' && val > 0 && val < 0.5) return '< 0,5';
    return String(arrotonda1169(val, tipo)).replace('.', ',');
  };

  const riRiferimento = {
    energiaKj: 8400,
    energiaKcal: 2000,
    grassi: 70,
    grassiSaturi: 20,
    carboidrati: 260,
    zuccheri: 90,
    fibre: 25,
    proteine: 50,
    sale: 6
  };

  const calcolaRi = (valore: number, rif: number) => {
    return Math.round((valore / rif) * 100);
  };

  // Filtraggio autocompletamento report nutrizionali
  const reportFiltrati = reportNutrizionali.filter(acc => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const cName = getClientName(acc.intestatarioRapportoClienteId).toLowerCase();
    const code = (acc.codiceAccettazione || '').toLowerCase();
    const desc = (acc.descrizioneCampione || '').toLowerCase();
    const mat = (acc.matrice || '').toLowerCase();
    return code.includes(term) || desc.includes(term) || mat.includes(term) || cName.includes(term);
  });

  const handlePrintLabel = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Impossibile aprire la finestra di stampa. Verificare che i popup siano abilitati nel browser.');
      return;
    }

    const clientName = selectedAcc ? getClientName(selectedAcc.intestatarioRapportoClienteId) : 'Cliente Generico';
    const clientPiva = selectedAcc ? getClientPiva(selectedAcc.intestatarioRapportoClienteId) : '';
    const codiceCampione = selectedAcc?.codiceAccettazione || 'N/D';
    const descrCampione = selectedAcc?.descrizioneCampione || 'Prodotto Alimentare';
    const matrice = selectedAcc?.matrice || 'Alimentare';
    const dataElaborazione = new Date().toLocaleDateString('it-IT');

    const eKj100 = arrotonda1169(valori.energiaKj, 'energia');
    const eKcal100 = arrotonda1169(valori.energiaKcal, 'energia');
    const grassi100 = arrotonda1169(valori.grassi, 'standard');
    const grassiSaturi100 = arrotonda1169(valori.grassiSaturi, 'saturi');
    const carboidrati100 = arrotonda1169(valori.carboidrati, 'standard');
    const zuccheri100 = arrotonda1169(valori.zuccheri, 'standard');
    const fibre100 = arrotonda1169(valori.fibre, 'standard');
    const proteine100 = arrotonda1169(valori.proteine, 'standard');
    const sale100 = arrotonda1169(valori.sale, 'sale');

    const grassi100Disp = formatDisplay1169(valori.grassi, 'standard');
    const grassiSaturi100Disp = formatDisplay1169(valori.grassiSaturi, 'saturi');
    const carboidrati100Disp = formatDisplay1169(valori.carboidrati, 'standard');
    const zuccheri100Disp = formatDisplay1169(valori.zuccheri, 'standard');
    const fibre100Disp = formatDisplay1169(valori.fibre, 'standard');
    const proteine100Disp = formatDisplay1169(valori.proteine, 'standard');
    const sale100Disp = formatDisplay1169(valori.sale, 'sale');

    const eKjPorz = Math.round(eKj100 * porzioneGrezza / 100);
    const eKcalPorz = Math.round(eKcal100 * porzioneGrezza / 100);
    const grassiPorz = (grassi100 * porzioneGrezza / 100).toFixed(1);
    const grassiSaturiPorz = (grassiSaturi100 * porzioneGrezza / 100).toFixed(1);
    const carboidratiPorz = (carboidrati100 * porzioneGrezza / 100).toFixed(1);
    const zuccheriPorz = (zuccheri100 * porzioneGrezza / 100).toFixed(1);
    const fibrePorz = (fibre100 * porzioneGrezza / 100).toFixed(1);
    const proteinePorz = (proteine100 * porzioneGrezza / 100).toFixed(1);
    const salePorz = (sale100 * porzioneGrezza / 100).toFixed(2);

    const riGrassi = calcolaRi(Number(grassiPorz), riRiferimento.grassi);
    const riSaturi = calcolaRi(Number(grassiSaturiPorz), riRiferimento.grassiSaturi);
    const riCarb = calcolaRi(Number(carboidratiPorz), riRiferimento.carboidrati);
    const riZuccheri = calcolaRi(Number(zuccheriPorz), riRiferimento.zuccheri);
    const riProt = calcolaRi(Number(proteinePorz), riRiferimento.proteine);
    const riSale = calcolaRi(Number(salePorz), riRiferimento.sale);

    const htmlContent = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <title>Dichiarazione Nutrizionale UE 1169/2011 - ${descrCampione}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      color: #0f172a;
      background: white;
      margin: 0;
      padding: 16px;
      font-size: 12px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .container { max-width: 760px; margin: 0 auto; border: 1px solid #cbd5e1; padding: 28px; border-radius: 14px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; border-bottom: 3px solid #0f172a; margin-bottom: 20px; }
    .logo { height: 52px; width: auto; max-width: 240px; object-fit: contain; object-position: left; display: block; margin-bottom: 6px; }
    .address { font-size: 9.5px; color: #1e293b; line-height: 1.35; }
    .doc-badge { font-family: monospace; font-size: 11px; font-weight: 800; background: #f1f5f9; color: #1e293b; padding: 4px 10px; border-radius: 6px; border: 1px solid #cbd5e1; display: inline-block; }
    .title-area { text-align: center; margin-bottom: 18px; }
    .title-area h2 { font-size: 17px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin: 0; letter-spacing: 0.4px; }
    .title-area p { font-size: 11px; color: #475569; font-weight: 600; margin: 4px 0 0 0; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; background: #f8fafc; padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 11.5px; margin-bottom: 20px; }
    .meta-label { font-size: 9.5px; font-weight: 700; text-transform: uppercase; color: #64748b; margin: 0 0 2px 0; }
    .meta-title { font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
    .meta-row { margin: 2px 0; color: #334155; }
    .table-box { border: 2px solid #0f172a; border-radius: 10px; overflow: hidden; margin-bottom: 18px; }
    .table-header-bar { background: #0f172a; color: white; padding: 10px 12px; font-weight: 800; display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; }
    table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    th { background: #f1f5f9; border-bottom: 1px solid #cbd5e1; padding: 9px 10px; text-align: left; font-weight: 800; color: #1e293b; }
    th.right, td.right { text-align: right; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    tr.energy-row { background: #fffbeb; font-weight: 800; }
    tr.sub-row td { color: #475569; font-size: 11px; }
    tr.sugar-row { background: #ecfdf5; font-weight: 700; color: #064e3b; }
    tr.sugar-detail td { font-size: 10.5px; color: #475569; padding-top: 5px; padding-bottom: 5px; }
    tr.salt-row { background: #f8fafc; }
    .pl-indent { padding-left: 24px !important; }
    .pl-deep { padding-left: 40px !important; }
    .notes { font-size: 9.5px; color: #64748b; line-height: 1.4; margin-bottom: 24px; }
    .footer-sig { padding-top: 16px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; }
    .sig-line { width: 220px; border-bottom: 1px solid #334155; margin-top: 28px; margin-bottom: 4px; margin-left: auto; margin-right: auto; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <img src="${logoAgenzia}" alt="Agenzia per lo Sviluppo" class="logo" />
        <div class="address">
          <div>Sede legale ed amministrativa: Corso Vittorio Emanuele n°86 - 67100 L'Aquila</div>
          <div>Laboratorio: Via degli Opifici n°1 - Z.I. di Bazzano - 67100 L'Aquila</div>
          <div>P.iva 01751450667</div>
        </div>
      </div>
      <div style="text-align: right;">
        <span class="doc-badge">MOD. NUT-1169</span>
        <div style="font-size: 10px; color: #64748b; margin-top: 6px;">Data: <strong>${dataElaborazione}</strong></div>
      </div>
    </div>

    <div class="title-area">
      <h2>DICHIARAZIONE NUTRIZIONALE UFFICIALE / NUTRITION DECLARATION</h2>
      <p>Redatta in conformità al Regolamento (UE) n. 1169/2011 (Allegato XV - Arrotondamenti e Tolleranze)</p>
    </div>

    <div class="meta-grid">
      <div>
        <p class="meta-label">Descrizione Campione / Sample Description</p>
        <p class="meta-title">${descrCampione}</p>
        <p class="meta-row"><strong>Codice RdP / Test Report Code:</strong> ${codiceCampione}</p>
        <p class="meta-row"><strong>Matrice / Food Matrix:</strong> ${matrice}</p>
      </div>
      <div>
        <p class="meta-label">Cliente / Client</p>
        <p class="meta-title">${clientName}</p>
        <p class="meta-row"><strong>Partita IVA / Tax ID:</strong> ${clientPiva || 'N/D'}</p>
        <p class="meta-row"><strong>Dimensione Porzione / Portion Size:</strong> ${porzioneGrezza} g / ml</p>
      </div>
    </div>

    <div class="table-box">
      <div class="table-header-bar">
        <span>DICHIARAZIONE NUTRIZIONALE / NUTRITION DECLARATION</span>
        <span style="font-weight: 400; font-style: italic; font-size: 10.5px;">Valori medi / Average values</span>
      </div>

      <table>
        <thead>
          <tr>
            <th>Dichiarazione Nutrizionale / Nutrition Declaration</th>
            <th class="right">Per 100g / 100ml</th>
            <th class="right">Per porzione (${porzioneGrezza}g)</th>
            <th class="right">% RI* / % AR*</th>
          </tr>
        </thead>
        <tbody>
          ${vociAbilitate.energia ? `
          <tr class="energy-row">
            <td>Energia / Energy</td>
            <td class="right">${eKj100} kJ / ${eKcal100} kcal</td>
            <td class="right">${eKjPorz} kJ / ${eKcalPorz} kcal</td>
            <td class="right">${calcolaRi(eKcalPorz, riRiferimento.energiaKcal)}%</td>
          </tr>
          ` : ''}

          ${vociAbilitate.grassi ? `
          <tr>
            <td><strong>Grassi / Fat</strong></td>
            <td class="right"><strong>${grassi100Disp} g</strong></td>
            <td class="right">${grassiPorz} g</td>
            <td class="right">${riGrassi}%</td>
          </tr>
          ` : ''}

          ${vociAbilitate.grassi && vociAbilitate.grassiSaturi ? `
          <tr class="sub-row">
            <td class="pl-indent">- di cui acidi grassi saturi / - of which saturates</td>
            <td class="right"><strong>${grassiSaturi100Disp} g</strong></td>
            <td class="right">${grassiSaturiPorz} g</td>
            <td class="right">${riSaturi}%</td>
          </tr>
          ` : ''}

          ${vociAbilitate.carboidrati ? `
          <tr>
            <td><strong>Carboidrati / Carbohydrate</strong></td>
            <td class="right"><strong>${carboidrati100Disp} g</strong></td>
            <td class="right">${carboidratiPorz} g</td>
            <td class="right">${riCarb}%</td>
          </tr>
          ` : ''}

          ${vociAbilitate.zuccheri ? `
          <tr class="sugar-row">
            <td class="pl-indent">- di cui zuccheri / - of which sugars</td>
            <td class="right"><strong>${zuccheri100Disp} g</strong></td>
            <td class="right">${zuccheriPorz} g</td>
            <td class="right">${riZuccheri}%</td>
          </tr>
          ` : ''}

          ${vociAbilitate.glucosio ? `
          <tr class="sugar-detail">
            <td class="pl-deep">• Glucosio / Glucose</td>
            <td class="right">${formatDisplay1169(valori.glucosio, 'standard')} g</td>
            <td class="right">${(valori.glucosio * porzioneGrezza / 100).toFixed(1)} g</td>
            <td class="right">-</td>
          </tr>` : ''}

          ${vociAbilitate.fruttosio ? `
          <tr class="sugar-detail">
            <td class="pl-deep">• Fruttosio / Fructose</td>
            <td class="right">${formatDisplay1169(valori.fruttosio, 'standard')} g</td>
            <td class="right">${(valori.fruttosio * porzioneGrezza / 100).toFixed(1)} g</td>
            <td class="right">-</td>
          </tr>` : ''}

          ${vociAbilitate.saccarosio ? `
          <tr class="sugar-detail">
            <td class="pl-deep">• Saccarosio / Sucrose</td>
            <td class="right">${formatDisplay1169(valori.saccarosio, 'standard')} g</td>
            <td class="right">${(valori.saccarosio * porzioneGrezza / 100).toFixed(1)} g</td>
            <td class="right">-</td>
          </tr>` : ''}

          ${vociAbilitate.lattosio ? `
          <tr class="sugar-detail">
            <td class="pl-deep">• Lattosio / Lactose</td>
            <td class="right">${formatDisplay1169(valori.lattosio, 'standard')} g</td>
            <td class="right">${(valori.lattosio * porzioneGrezza / 100).toFixed(1)} g</td>
            <td class="right">-</td>
          </tr>` : ''}

          ${vociAbilitate.fibre ? `
          <tr>
            <td><strong>Fibre alimentari / Fibre</strong></td>
            <td class="right"><strong>${fibre100Disp} g</strong></td>
            <td class="right">${fibrePorz} g</td>
            <td class="right">-</td>
          </tr>
          ` : ''}

          ${vociAbilitate.proteine ? `
          <tr>
            <td><strong>Proteine / Protein</strong></td>
            <td class="right"><strong>${proteine100Disp} g</strong></td>
            <td class="right">${proteinePorz} g</td>
            <td class="right">${riProt}%</td>
          </tr>
          ` : ''}

          ${vociAbilitate.sale ? `
          <tr class="salt-row">
            <td>
              <strong>Sale / Salt</strong>
              <div style="font-size: 9.5px; color: #64748b; font-weight: 400; margin-top: 2px;">
                (da Sodio / from Sodium: ${valori.sodio}g Na × 2,5)
              </div>
            </td>
            <td class="right"><strong>${sale100Disp} g</strong></td>
            <td class="right">${salePorz} g</td>
            <td class="right">${riSale}%</td>
          </tr>
          ` : ''}
        </tbody>
      </table>
    </div>

    <div class="notes">
      <div>* Assunzioni di riferimento di un adulto medio (8400 kJ / 2000 kcal) / Reference intake of an average adult (8400 kJ / 2000 kcal).</div>
      <div style="margin-top: 4px;">I valori sopra riportati sono stati derivati dalle analisi eseguite sul campione (RdP ${codiceCampione}) ed elaborati secondo il Regolamento (UE) n. 1169/2011 (Allegato XV). Il valore del sale è calcolato come Sodio × 2,5.</div>
    </div>

    <div class="footer-sig">
      <div>
        <div style="font-weight: 800; color: #0f172a;">Agenzia per lo Sviluppo</div>
        <div style="font-size: 10px; color: #64748b;">Laboratorio Chimico-Merceologico</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 10px; color: #64748b;">Il Responsabile di Laboratorio</div>
        <div class="sig-line"></div>
        <div style="font-size: 10.5px; font-weight: 800; color: #0f172a;">${firmatarioResponsabile}</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-fadeIn">
        
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-slate-150 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>Stesura Etichetta Nutrizionale</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  Reg. UE 1169/2011
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Sincronizzazione RdP alimentari, calcolo Sodio-Sale (×2,5), dettaglio zuccheri e bilinguismo IT/EN
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedAcc && onGoToAccettazione && (
              <button
                onClick={() => {
                  onClose();
                  onGoToAccettazione(selectedAcc.id, `Etichetta Nutrizionale (${selectedAcc.codiceAccettazione})`);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                title="Apri la scheda di questo campione in Accettazione Campioni"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Vai al Campione ({selectedAcc.codiceAccettazione})</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body Modal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Selettore con Ricerca / Autocompletamento RdP Alimentare */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 relative">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Search className="h-3.5 w-3.5 text-emerald-600" />
                Seleziona Rapporto di Prova / Campione Alimentare
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mostraTuttiCampioni}
                    onChange={(e) => setMostraTuttiCampioni(e.target.checked)}
                    className="rounded text-emerald-600 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span>Mostra tutti i campioni ({accettazioni.length})</span>
                </label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  Campioni: {reportNutrizionali.length}
                </span>
              </div>
            </div>

            {/* Input Campo Autocompletamento */}
            <div className="relative">
              <div 
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-emerald-500 shadow-2xs"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {selectedAcc ? (
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs shrink-0">
                      {selectedAcc.codiceAccettazione}
                    </span>
                    <span className="truncate font-bold">{selectedAcc.descrizioneCampione}</span>
                    <span className="text-slate-400 text-xs hidden sm:inline truncate">
                      ({selectedAcc.matrice} - {getClientName(selectedAcc.intestatarioRapportoClienteId)})
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400 text-xs">Digitare codice o descrizione per cercare un RdP...</span>
                )}
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* Menu a discesa fluttuante di ricerca */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 overflow-hidden animate-fadeIn">
                  <div className="p-2 border-b border-slate-100 bg-slate-50">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Cerca per codice RdP, campione, matrice o cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {searchTerm && (
                        <button 
                          onClick={() => setSearchTerm('')} 
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {reportFiltrati.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 italic">
                        Nessun rapporto di prova alimentare trovato per la ricerca "{searchTerm}".
                      </div>
                    ) : (
                      reportFiltrati.map(acc => (
                        <div
                          key={acc.id}
                          onClick={() => {
                            setSelectedAccId(acc.id);
                            setIsDropdownOpen(false);
                            setSearchTerm('');
                          }}
                          className={`p-3 hover:bg-emerald-50/70 transition cursor-pointer flex items-center justify-between ${
                            acc.id === selectedAccId ? 'bg-emerald-50 border-l-4 border-emerald-600' : ''
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">{acc.codiceAccettazione}</span>
                              <span className="font-semibold text-slate-800">{acc.descrizioneCampione}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Matrice: <span className="font-semibold text-slate-700">{acc.matrice}</span> | Cliente: <span className="font-semibold text-slate-700">{getClientName(acc.intestatarioRapportoClienteId)}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                            {acc.categoriaMerceologica || 'Alimentare'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dettagli sintetici del RdP selezionato + Tasto Ripristina */}
            {selectedAcc && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200/80">
                <div className="flex flex-wrap items-center gap-4">
                  <div><span className="font-bold text-slate-700">Matrice:</span> {selectedAcc.matrice}</div>
                  <div><span className="font-bold text-slate-700">Cliente:</span> {getClientName(selectedAcc.intestatarioRapportoClienteId)}</div>
                  <div><span className="font-bold text-slate-700">P.IVA:</span> {getClientPiva(selectedAcc.intestatarioRapportoClienteId) || 'N/D'}</div>
                  <div><span className="font-bold text-slate-700">Prove Collegate:</span> {selectedAcc.risultatiAnalisi?.length || 0}</div>
                </div>
                <button
                  onClick={() => estraiValoriDaRdP(selectedAcc)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition flex items-center gap-1 cursor-pointer"
                  title="Ricarica i dati analitici rilevati dal Rapporto di Prova"
                >
                  <RefreshCw className="h-3 w-3" />
                  Sincronizza da RdP
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Colonna Sinistra: Inserimento / Modifica Diretta Valori */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-150">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" /> 
                  Parametri e Prove Nutrizionali
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {Object.values(vociAbilitate).filter(Boolean).length} prove incluse
                </span>
              </div>
              <p className="text-[11px] text-slate-500 italic">
                Vengono incluse nella dichiarazione solo le prove spuntate o collegate al Rapporto di Prova.
              </p>

              <div className="space-y-4">
                
                {/* Energia */}
                <div className={`p-3 rounded-xl border transition ${vociAbilitate.energia ? 'bg-amber-50/50 border-amber-200/80' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-amber-900 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vociAbilitate.energia}
                        onChange={() => toggleVoce('energia')}
                        className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      Energia / Energy
                    </label>
                    {vociAbilitate.energia && (
                      <button
                        onClick={calcolaEnergiaAutomatico}
                        className="text-[10px] font-bold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Calculator className="h-3 w-3" /> Auto-calcola
                      </button>
                    )}
                  </div>
                  {vociAbilitate.energia && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-amber-800 font-semibold block mb-1">Energia (kJ)</span>
                        <input
                          type="number"
                          value={valori.energiaKj}
                          onChange={(e) => setValori({...valori, energiaKj: Number(e.target.value)})}
                          className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-800 font-semibold block mb-1">Energia (kcal)</span>
                        <input
                          type="number"
                          value={valori.energiaKcal}
                          onChange={(e) => setValori({...valori, energiaKcal: Number(e.target.value)})}
                          className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Grassi & Saturi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={`p-3 rounded-xl border transition ${vociAbilitate.grassi ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-50/30 border-slate-200 opacity-50'}`}>
                    <label className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vociAbilitate.grassi}
                        onChange={() => toggleVoce('grassi')}
                        className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      Grassi / Fat (g)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      disabled={!vociAbilitate.grassi}
                      value={valori.grassi}
                      onChange={(e) => setValori({...valori, grassi: Number(e.target.value)})}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:bg-slate-100"
                    />
                  </div>
                  <div className={`p-3 rounded-xl border transition ${vociAbilitate.grassiSaturi ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-50/30 border-slate-200 opacity-50'}`}>
                    <label className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vociAbilitate.grassiSaturi}
                        onChange={() => toggleVoce('grassiSaturi')}
                        className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      - di cui saturi (g)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      disabled={!vociAbilitate.grassiSaturi}
                      value={valori.grassiSaturi}
                      onChange={(e) => setValori({...valori, grassiSaturi: Number(e.target.value)})}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:bg-slate-100"
                    />
                  </div>
                </div>

                {/* Carboidrati & Zuccheri Totali + Calcolo per differenza */}
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className={`p-3 rounded-xl border transition ${vociAbilitate.carboidrati ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-50/30 border-slate-200 opacity-50'}`}>
                      <label className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vociAbilitate.carboidrati}
                          onChange={() => toggleVoce('carboidrati')}
                          className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                        />
                        Carboidrati / Carb. (g)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={!vociAbilitate.carboidrati}
                        value={valori.carboidrati}
                        onChange={(e) => setValori({...valori, carboidrati: Number(e.target.value)})}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:bg-slate-100"
                      />
                    </div>
                    <div className={`p-3 rounded-xl border transition ${vociAbilitate.zuccheri ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50/30 border-slate-200 opacity-50'}`}>
                      <label className="text-[11px] font-bold text-emerald-950 mb-1.5 flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vociAbilitate.zuccheri}
                          onChange={() => toggleVoce('zuccheri')}
                          className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                        />
                        - di cui zuccheri (g)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={!vociAbilitate.zuccheri}
                        value={valori.zuccheri}
                        onChange={(e) => setValori({...valori, zuccheri: Number(e.target.value)})}
                        className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-950 disabled:bg-slate-100"
                      />
                    </div>
                  </div>

                  {/* Calcolo Carboidrati per differenza (100 - Umidità - Proteine - Grassi - Ceneri - Fibre) */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs flex flex-wrap items-end justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div>
                        <label className="block text-[9.5px] font-bold text-slate-500 uppercase">Umidità (g/100g)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={umidita}
                          onChange={(e) => setUmidita(Number(e.target.value))}
                          className="w-24 bg-white border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9.5px] font-bold text-slate-500 uppercase">Ceneri (g/100g)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={ceneri}
                          onChange={(e) => setCeneri(Number(e.target.value))}
                          className="w-24 bg-white border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={calcolaCarboidratiPerDifferenza}
                      className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                      title="Calcola Carboidrati = 100 - (Umidità + Proteine + Grassi + Ceneri + Fibre)"
                    >
                      <Calculator className="h-3 w-3 text-emerald-600" />
                      Calcola Carboidrati per differenza
                    </button>
                  </div>
                </div>

                {/* DETTAGLIO SPECIFICO ZUCCHERI (Glucosio, Fruttosio, Saccarosio, Lattosio) */}
                <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600" /> Dettaglio Zuccheri Specifici (g)
                    </span>
                    {vociAbilitate.zuccheri && (
                      <button
                        onClick={sincronizzaTotaleZuccheri}
                        className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                        title="Imposta il totale zuccheri alla somma dei 4 zuccheri specifici"
                      >
                        Calcola Totale
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={vociAbilitate.glucosio ? '' : 'opacity-60'}>
                      <label className="text-[10px] font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer mb-0.5">
                        <input
                          type="checkbox"
                          checked={vociAbilitate.glucosio}
                          onChange={() => toggleVoce('glucosio')}
                          className="rounded text-emerald-600 h-3 w-3"
                        />
                        Glucosio
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={!vociAbilitate.glucosio}
                        value={valori.glucosio}
                        onChange={(e) => setValori({...valori, glucosio: Number(e.target.value)})}
                        className="w-full bg-white border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold disabled:bg-slate-100"
                      />
                    </div>
                    <div className={vociAbilitate.fruttosio ? '' : 'opacity-60'}>
                      <label className="text-[10px] font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer mb-0.5">
                        <input
                          type="checkbox"
                          checked={vociAbilitate.fruttosio}
                          onChange={() => toggleVoce('fruttosio')}
                          className="rounded text-emerald-600 h-3 w-3"
                        />
                        Fruttosio
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={!vociAbilitate.fruttosio}
                        value={valori.fruttosio}
                        onChange={(e) => setValori({...valori, fruttosio: Number(e.target.value)})}
                        className="w-full bg-white border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold disabled:bg-slate-100"
                      />
                    </div>
                    <div className={vociAbilitate.saccarosio ? '' : 'opacity-60'}>
                      <label className="text-[10px] font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer mb-0.5">
                        <input
                          type="checkbox"
                          checked={vociAbilitate.saccarosio}
                          onChange={() => toggleVoce('saccarosio')}
                          className="rounded text-emerald-600 h-3 w-3"
                        />
                        Saccarosio
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={!vociAbilitate.saccarosio}
                        value={valori.saccarosio}
                        onChange={(e) => setValori({...valori, saccarosio: Number(e.target.value)})}
                        className="w-full bg-white border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold disabled:bg-slate-100"
                      />
                    </div>
                    <div className={vociAbilitate.lattosio ? '' : 'opacity-60'}>
                      <label className="text-[10px] font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer mb-0.5">
                        <input
                          type="checkbox"
                          checked={vociAbilitate.lattosio}
                          onChange={() => toggleVoce('lattosio')}
                          className="rounded text-emerald-600 h-3 w-3"
                        />
                        Lattosio
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        disabled={!vociAbilitate.lattosio}
                        value={valori.lattosio}
                        onChange={(e) => setValori({...valori, lattosio: Number(e.target.value)})}
                        className="w-full bg-white border border-slate-300 rounded-md px-2 py-1 text-xs font-semibold disabled:bg-slate-100"
                      />
                    </div>
                  </div>
                </div>

                {/* Fibre & Proteine */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={`p-3 rounded-xl border transition ${vociAbilitate.fibre ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-50/30 border-slate-200 opacity-50'}`}>
                    <label className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vociAbilitate.fibre}
                        onChange={() => toggleVoce('fibre')}
                        className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      Fibre alimentari / Fibre (g)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      disabled={!vociAbilitate.fibre}
                      value={valori.fibre}
                      onChange={(e) => setValori({...valori, fibre: Number(e.target.value)})}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:bg-slate-100"
                    />
                  </div>
                  <div className={`p-3 rounded-xl border transition ${vociAbilitate.proteine ? 'bg-slate-50/70 border-slate-200' : 'bg-slate-50/30 border-slate-200 opacity-50'}`}>
                    <label className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vociAbilitate.proteine}
                        onChange={() => toggleVoce('proteine')}
                        className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      Proteine / Protein (g)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      disabled={!vociAbilitate.proteine}
                      value={valori.proteine}
                      onChange={(e) => setValori({...valori, proteine: Number(e.target.value)})}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:bg-slate-100"
                    />
                  </div>
                </div>

                {/* CONVERSIONE SODIO -> SALE (Cloruro di Sodio - NaCl) */}
                <div className={`p-3 rounded-xl border transition ${vociAbilitate.sale ? 'bg-indigo-50/50 border-indigo-200/80' : 'bg-slate-50/30 border-slate-200 opacity-50'} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-indigo-950 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={vociAbilitate.sale}
                        onChange={() => toggleVoce('sale')}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      Sodio (Na) & Sale (NaCl = Sodio × 2,5)
                    </label>
                    <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                      Fattore × 2,5
                    </span>
                  </div>

                  {vociAbilitate.sale && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-900 mb-1">Sodio / Sodium (g)</label>
                        <input
                          type="number"
                          step="0.001"
                          value={valori.sodio}
                          onChange={(e) => handleSodioChange(Number(e.target.value))}
                          className="w-full bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-950"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-indigo-900 mb-1">Sale / Salt (NaCl g)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={valori.sale}
                          onChange={(e) => handleSaleChange(Number(e.target.value))}
                          className="w-full bg-white border border-indigo-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-indigo-950"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* CONTROLLO QUALITÀ ANALITICO: VERIFICA BILANCIO DI MASSA A 100 g */}
                {(() => {
                  const gGrassi = Number(valori.grassi) || 0;
                  const gCarb = Number(valori.carboidrati) || 0;
                  const gFibre = vociAbilitate.fibre ? (Number(valori.fibre) || 0) : 0;
                  const gProt = Number(valori.proteine) || 0;
                  const gUmidita = Number(umidita) || 0;
                  const gCeneriOSale = (Number(ceneri) || 0) > 0 ? (Number(ceneri) || 0) : (vociAbilitate.sale ? (Number(valori.sale) || 0) : 0);
                  const sommaTotale = Number((gGrassi + gCarb + gFibre + gProt + gUmidita + gCeneriOSale).toFixed(2));
                  const isOk = sommaTotale >= 97 && sommaTotale <= 103;
                  const isOver = sommaTotale > 103;
                  const barPct = Math.min(100, Math.max(0, sommaTotale));

                  return (
                    <div className={`p-3.5 rounded-xl border transition space-y-2 ${
                      isOk
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : isOver
                          ? 'bg-rose-50/80 border-rose-300'
                          : 'bg-amber-50/70 border-amber-300'
                    }`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <Scale className={`h-3.5 w-3.5 ${isOk ? 'text-emerald-600' : isOver ? 'text-rose-600' : 'text-amber-600'}`} />
                          Verifica Bilancio di Massa a 100 g
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black font-mono ${
                          isOk
                            ? 'bg-emerald-600 text-white'
                            : isOver
                              ? 'bg-rose-600 text-white'
                              : 'bg-amber-500 text-white'
                        }`}>
                          {sommaTotale.toFixed(2)} / 100 g
                        </span>
                      </div>

                      <div className="w-full h-2 bg-white/80 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isOk ? 'bg-emerald-500' : isOver ? 'bg-rose-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-600">
                        <span>
                          Grassi ({gGrassi}g) + Carb ({gCarb}g) + Fibre ({gFibre}g) + Prot ({gProt}g) + Umidità ({gUmidita}g) + {Number(ceneri) > 0 ? `Ceneri (${gCeneriOSale}g)` : `Sale (${gCeneriOSale}g)`}
                        </span>
                        <span className="font-bold">
                          {isOk
                            ? '✓ Bilancio analitico chiuso (97–103 g)'
                            : isOver
                              ? '⚠️ Somma > 100 g (verificare i macronutrienti)'
                              : 'ℹ️ Somma < 97 g (inserire Umidità/Ceneri o calcolare Carb. per differenza)'}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Dimensione Porzione (g o ml)</label>
                    <input
                      type="number"
                      value={porzioneGrezza}
                      onChange={(e) => setPorzioneGrezza(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Responsabile Firmatario</label>
                    <select
                      value={firmatarioResponsabile}
                      onChange={(e) => setFirmatarioResponsabile(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white"
                    >
                      {operators.filter(o => o.attivo !== false && o.autorizzatoFirma !== false).map(op => (
                        <option key={op.nome} value={op.nome}>{op.nome} ({op.ruoloFirma || op.ruolo})</option>
                      ))}
                      {!operators.some(o => o.nome === firmatarioResponsabile) && (
                        <option value={firmatarioResponsabile}>{firmatarioResponsabile}</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonna Destra: Anteprima Etichetta Nutrizionale Bilingue (IT/EN) */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 flex flex-col justify-between shadow-lg">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                    DICHIARAZIONE NUTRIZIONALE / NUTRITION DECLARATION
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                    UE 1169/2011
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 italic mb-3">
                  Valori medi per 100g (arrotondati Allegato XV) e per porzione ({porzioneGrezza}g).
                </p>

                {/* Tabella Nutrizionale Stile UE Bilingue */}
                <div className="bg-white text-slate-900 rounded-xl overflow-hidden text-[11px] border border-slate-700 shadow">
                  <div className="bg-slate-100 px-3 py-2 font-bold grid grid-cols-3 border-b border-slate-300 text-[10.5px]">
                    <span>Dichiarazione Nutrizionale / Nutrition Declaration</span>
                    <span className="text-right">Per 100g / 100ml</span>
                    <span className="text-right">Per porz. ({porzioneGrezza}g) / % RI*</span>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {vociAbilitate.energia && (
                      <div className="px-3 py-1.5 grid grid-cols-3 font-bold bg-amber-50/50">
                        <span>Energia / Energy</span>
                        <span className="text-right">{arrotonda1169(valori.energiaKj, 'energia')} kJ / {arrotonda1169(valori.energiaKcal, 'energia')} kcal</span>
                        <span className="text-right font-normal">{Math.round(arrotonda1169(valori.energiaKj, 'energia') * porzioneGrezza / 100)} kJ / {Math.round(arrotonda1169(valori.energiaKcal, 'energia') * porzioneGrezza / 100)} kcal</span>
                      </div>
                    )}

                    {vociAbilitate.grassi && (
                      <div className="px-3 py-1.5 grid grid-cols-3">
                        <span>Grassi / Fat</span>
                        <span className="text-right font-semibold">{arrotonda1169(valori.grassi, 'standard')} g</span>
                        <span className="text-right">{(arrotonda1169(valori.grassi, 'standard') * porzioneGrezza / 100).toFixed(1)} g ({calcolaRi(arrotonda1169(valori.grassi, 'standard') * porzioneGrezza / 100, riRiferimento.grassi)}%)</span>
                      </div>
                    )}

                    {vociAbilitate.grassi && vociAbilitate.grassiSaturi && (
                      <div className="px-3 py-1 pl-6 grid grid-cols-3 text-slate-600 text-[10px]">
                        <span>- di cui saturi / - of which saturates</span>
                        <span className="text-right font-semibold">{arrotonda1169(valori.grassiSaturi, 'standard')} g</span>
                        <span className="text-right">{(arrotonda1169(valori.grassiSaturi, 'standard') * porzioneGrezza / 100).toFixed(1)} g ({calcolaRi(arrotonda1169(valori.grassiSaturi, 'standard') * porzioneGrezza / 100, riRiferimento.grassiSaturi)}%)</span>
                      </div>
                    )}

                    {vociAbilitate.carboidrati && (
                      <div className="px-3 py-1.5 grid grid-cols-3">
                        <span>Carboidrati / Carbohydrate</span>
                        <span className="text-right font-semibold">{arrotonda1169(valori.carboidrati, 'standard')} g</span>
                        <span className="text-right">{(arrotonda1169(valori.carboidrati, 'standard') * porzioneGrezza / 100).toFixed(1)} g ({calcolaRi(arrotonda1169(valori.carboidrati, 'standard') * porzioneGrezza / 100, riRiferimento.carboidrati)}%)</span>
                      </div>
                    )}

                    {vociAbilitate.zuccheri && (
                      <div className="px-3 py-1 pl-6 grid grid-cols-3 text-slate-900 font-bold bg-emerald-50/40">
                        <span>- di cui zuccheri / - of which sugars</span>
                        <span className="text-right text-emerald-950 font-extrabold">{arrotonda1169(valori.zuccheri, 'standard')} g</span>
                        <span className="text-right font-bold">{(arrotonda1169(valori.zuccheri, 'standard') * porzioneGrezza / 100).toFixed(1)} g ({calcolaRi(arrotonda1169(valori.zuccheri, 'standard') * porzioneGrezza / 100, riRiferimento.zuccheri)}%)</span>
                      </div>
                    )}

                    {/* Dettaglio Zuccheri Specifici */}
                    {vociAbilitate.glucosio && (
                      <div className="px-3 py-0.5 pl-10 grid grid-cols-3 text-[10px] text-slate-600">
                        <span>• Glucosio / Glucose</span>
                        <span className="text-right">{arrotonda1169(valori.glucosio, 'standard')} g</span>
                        <span className="text-right">{(valori.glucosio * porzioneGrezza / 100).toFixed(1)} g</span>
                      </div>
                    )}
                    {vociAbilitate.fruttosio && (
                      <div className="px-3 py-0.5 pl-10 grid grid-cols-3 text-[10px] text-slate-600">
                        <span>• Fruttosio / Fructose</span>
                        <span className="text-right">{arrotonda1169(valori.fruttosio, 'standard')} g</span>
                        <span className="text-right">{(valori.fruttosio * porzioneGrezza / 100).toFixed(1)} g</span>
                      </div>
                    )}
                    {vociAbilitate.saccarosio && (
                      <div className="px-3 py-0.5 pl-10 grid grid-cols-3 text-[10px] text-slate-600">
                        <span>• Saccarosio / Sucrose</span>
                        <span className="text-right">{arrotonda1169(valori.saccarosio, 'standard')} g</span>
                        <span className="text-right">{(valori.saccarosio * porzioneGrezza / 100).toFixed(1)} g</span>
                      </div>
                    )}
                    {vociAbilitate.lattosio && (
                      <div className="px-3 py-0.5 pl-10 grid grid-cols-3 text-[10px] text-slate-600">
                        <span>• Lattosio / Lactose</span>
                        <span className="text-right">{arrotonda1169(valori.lattosio, 'standard')} g</span>
                        <span className="text-right">{(valori.lattosio * porzioneGrezza / 100).toFixed(1)} g</span>
                      </div>
                    )}

                    {vociAbilitate.fibre && (
                      <div className="px-3 py-1.5 grid grid-cols-3">
                        <span>Fibre alimentari / Fibre</span>
                        <span className="text-right font-semibold">{arrotonda1169(valori.fibre, 'standard')} g</span>
                        <span className="text-right">{(arrotonda1169(valori.fibre, 'standard') * porzioneGrezza / 100).toFixed(1)} g</span>
                      </div>
                    )}

                    {vociAbilitate.proteine && (
                      <div className="px-3 py-1.5 grid grid-cols-3">
                        <span>Proteine / Protein</span>
                        <span className="text-right font-semibold">{arrotonda1169(valori.proteine, 'standard')} g</span>
                        <span className="text-right">{(arrotonda1169(valori.proteine, 'standard') * porzioneGrezza / 100).toFixed(1)} g ({calcolaRi(arrotonda1169(valori.proteine, 'standard') * porzioneGrezza / 100, riRiferimento.proteine)}%)</span>
                      </div>
                    )}

                    {vociAbilitate.sale && (
                      <div className="px-3 py-1.5 grid grid-cols-3 bg-indigo-50/20">
                        <span>
                          Sale / Salt 
                          <span className="block text-[9px] text-slate-500 font-normal">(Sodio: {valori.sodio}g × 2.5)</span>
                        </span>
                        <span className="text-right font-bold text-slate-900">{arrotonda1169(valori.sale, 'standard')} g</span>
                        <span className="text-right">{(arrotonda1169(valori.sale, 'standard') * porzioneGrezza / 100).toFixed(2)} g ({calcolaRi(arrotonda1169(valori.sale, 'standard') * porzioneGrezza / 100, riRiferimento.sale)}%)</span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 mt-2.5">
                  * Assunzioni di riferimento di un adulto medio (8400 kJ / 2000 kcal) / Reference intake of an average adult.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 space-y-2.5">
                {saveFeedback && (
                  <div className="p-2.5 bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>{saveFeedback}</span>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2.5">
                  {onUpdateAccettazione && selectedAcc && (
                    <button
                      type="button"
                      onClick={handleSaveEtichettaToCampione}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-black text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                      title="Salva i valori elaborati dell'etichetta nutrizionale direttamente sul campione"
                    >
                      <Save className="h-4 w-4" /> Salva Etichetta sul Campione
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePrintLabel}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow active:scale-[0.99]"
                  >
                    <Printer className="h-4 w-4" /> Stampa / Esporta PDF Bilingue
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Conformità garantita secondo Regolamento UE n. 1169/2011
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Chiudi
          </button>
        </div>

      </div>
    </div>
  );
}
