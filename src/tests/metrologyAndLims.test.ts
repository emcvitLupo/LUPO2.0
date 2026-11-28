import test from 'node:test';
import assert from 'node:assert/strict';

import { calculateLinearRegression } from '../components/ProveSection';
import {
  calculateAutomatedUncertainty,
  getUncertaintyModelDiagnostics,
  checkIfValueBelowLOQ
} from '../components/AccettazioneSection';
import {
  calcolaSommaIdrocarburiTotali,
  isValueLowerThanLoq
} from '../utils/idrocarburiTotali';
import {
  evaluateFormula,
  extractVariablesFromFormula
} from '../utils/mathLims';
import {
  verifyOperatorPassword,
  hashOperatorPasswordSync,
  getTechnicalSigners,
  getDepartmentSigners
} from '../utils/limsHelpers';
import {
  getOperatorQualificationLabel,
  getOperatorQualificationsList,
  deduplicateRoleLabels,
  sanitizeOperatorsList
} from '../utils/operatorSanitizer';
import { computeRdpDiff } from '../utils/rdpDiff';
import { Operator } from '../types';

test('1. Modello EURACHEM QUAM App. E.5: regressione lineare sui quadrati xi^2 vs u^2(xi) e incertezza RdP', () => {
  // Costruiamo 3 punti che seguono esattamente la legge u^2(x) = 0.0004 + 0.01 * x^2
  // Punto 1: x = 1.0 -> x^2 = 1.0  -> u^2 = 0.0104 -> u = sqrt(0.0104)
  // Punto 2: x = 2.0 -> x^2 = 4.0  -> u^2 = 0.0404 -> u = sqrt(0.0404)
  // Punto 3: x = 5.0 -> x^2 = 25.0 -> u^2 = 0.2504 -> u = sqrt(0.2504)
  const punti = [
    { concentrazione: 1.0, incertezza: Math.sqrt(0.0104) },
    { concentrazione: 2.0, incertezza: Math.sqrt(0.0404) },
    { concentrazione: 5.0, incertezza: Math.sqrt(0.2504) }
  ];

  const reg = calculateLinearRegression(punti);
  assert.ok(reg, 'La regressione deve essere calcolata con 3 punti');
  assert.ok(Math.abs(reg.m - 0.01) < 1e-7, `Pendenza attesa 0.01, ottenuta ${reg.m}`);
  assert.ok(Math.abs(reg.q - 0.0004) < 1e-7, `Intercetta attesa 0.0004, ottenuta ${reg.q}`);
  assert.ok(Math.abs(reg.r2 - 1.0) < 1e-7, `R^2 atteso 1.0, ottenuto ${reg.r2}`);

  // Calcolo automatico su un risultato x = 3.00:
  // u(3) = sqrt(0.0004 + 9 * 0.01) = sqrt(0.0904) = 0.3006659 -> ± 0.30
  // % = (0.3006659 / 3) * 100 = 10.022% -> 10.02%
  const autoRes = calculateAutomatedUncertainty('3.00', punti);
  assert.ok(autoRes, 'Il calcolo automatico incertezza deve restituire un risultato');
  assert.equal(autoRes.incertezza, '± 0.30');
  assert.equal(autoRes.incertezzaPercentuale, '10.02%');

  // Con un solo punto la retta non esiste, quindi non deve calcolare dalla retta
  const singlePoint = calculateAutomatedUncertainty('3.00', [{ concentrazione: 1.0, incertezza: 0.1 }]);
  assert.equal(singlePoint, null);
});

test('2. Diagnostica di applicabilità del modello EURACHEM (estrapolazione, 2 punti, radicando negativo)', () => {
  const twoPoints = [
    { concentrazione: 1.0, incertezza: 0.1 },
    { concentrazione: 5.0, incertezza: 0.5 }
  ];

  const diagInside = getUncertaintyModelDiagnostics('2.5', twoPoints);
  assert.ok(diagInside);
  assert.equal(diagInside.puntiInsufficienti, true);
  assert.equal(diagInside.fuoriIntervallo, null);
  assert.equal(diagInside.radicandoNonValido, false);

  const diagBelow = getUncertaintyModelDiagnostics('0.2', twoPoints);
  assert.ok(diagBelow);
  assert.equal(diagBelow.fuoriIntervallo, 'sotto');

  const diagAbove = getUncertaintyModelDiagnostics('8.0', twoPoints);
  assert.ok(diagAbove);
  assert.equal(diagAbove.fuoriIntervallo, 'sopra');
});

test('3. Regola LOQ e Somma Idrocarburi Totali / Trialometani (<= LOQ -> LOQ/2, incertezza solo per quantificati)', () => {
  assert.equal(checkIfValueBelowLOQ('0.004', '0.01'), '≤ 0.01');
  assert.equal(checkIfValueBelowLOQ('< 0.01', '0.01'), '≤ 0.01');
  assert.equal(checkIfValueBelowLOQ('0.025', '0.01'), '0.025');
  assert.equal(isValueLowerThanLoq('≤ 0.01', '0.01'), true);

  // 2 composti sotto LOQ (0.01 -> sommati come 0.005 ciascuno, incertezza 0)
  // 2 composti sopra LOQ (0.020 ± 0.003 e 0.030 ± 0.004)
  // Somma attesa = 0.005 + 0.005 + 0.020 + 0.030 = 0.060
  // Incertezza attesa = 0.003 + 0.004 = ± 0.007
  const res = calcolaSommaIdrocarburiTotali([
    { nome: 'Bromoformio', valoreRilevato: '≤ 0.01', loq: '0.01', incertezza: '± 0.002' },
    { nome: 'Cloroformio', valoreRilevato: '0.004', loq: '0.01', incertezza: '± 0.002' },
    { nome: 'Bromodiclorometano', valoreRilevato: '0.020', loq: '0.01', incertezza: '± 0.003' },
    { nome: 'Dibromoclorometano', valoreRilevato: '0.030', loq: '0.01', incertezza: '± 0.004' }
  ], 3);

  assert.equal(res.quantiSottoLoq, 2);
  assert.equal(res.quantiSopraLoq, 2);
  assert.equal(res.sommaConcentrazioneFormatted, '0.060');
  assert.equal(res.sommaIncertezzaFormatted, '± 0.007');
});

test('4. Valutatore matematico del Quaderno di Laboratorio (mathLims)', () => {
  const vars = extractVariablesFromFormula('((V1 - V0) * N * 28.02) / P');
  assert.deepEqual(vars, ['V1', 'V0', 'N', 'P']);

  const calc = evaluateFormula('((V1 - V0) * N * 10) / P', [
    { id: '1', simbolo: 'V1', descrizione: 'Volume campione', valore: 12.5 },
    { id: '2', simbolo: 'V0', descrizione: 'Volume bianco', valore: 0.5 },
    { id: '3', simbolo: 'N', descrizione: 'Normalità', valore: 0.1 },
    { id: '4', simbolo: 'P', descrizione: 'Peso', valore: 2.0 }
  ]);
  assert.equal(calc.error, null);
  assert.ok(calc.value !== null && Math.abs(calc.value - 6.0) < 1e-12);
});

test('5. Qualifiche Operatori, Firmatari ISO 17025 e verifica Password di Firma', () => {
  const ops: Operator[] = [
    {
      nome: 'Dott. Carmine Marroccella',
      ruolo: 'Responsabile Tecnico',
      ruoloFirma: 'Responsabile Tecnico & Responsabile di Reparto',
      password: hashOperatorPasswordSync('segreta2026'),
      attivo: true,
      autorizzatoFirma: true,
      isResponsabileTecnico: true,
      isResponsabileReparto: true
    },
    {
      nome: 'Dott. Mario Rossi',
      ruolo: 'Tecnico Chimico',
      password: 'rossiPin',
      attivo: true,
      autorizzatoFirma: false
    }
  ];

  const techSigners = getTechnicalSigners(ops);
  assert.equal(techSigners.length, 1);
  assert.equal(techSigners[0].nome, 'Dott. Carmine Marroccella');

  const deptSigners = getDepartmentSigners(ops);
  assert.equal(deptSigners.length, 1);
  assert.equal(deptSigners[0].nome, 'Dott. Carmine Marroccella');

  assert.deepEqual(getOperatorQualificationsList(ops[0]), ['Responsabile Tecnico', 'Responsabile di Reparto']);
  assert.equal(getOperatorQualificationLabel(ops[0]), 'Responsabile Tecnico & Responsabile di Reparto');

  // Verifica password con hash e password errata (nessun fallback lims123!)
  assert.equal(verifyOperatorPassword('Dott. Carmine Marroccella', 'segreta2026', ops), true);
  assert.equal(verifyOperatorPassword('Dott. Carmine Marroccella', 'lims123', ops), false);
  assert.equal(verifyOperatorPassword('Dott. Mario Rossi', 'rossiPin', ops), true);
  assert.equal(verifyOperatorPassword('Operatore Inesistente', 'lims123', ops), false);
});

test('6. Confronto Revisioni RdP (ISO/IEC 17025 §7.8.8 Diff Side-by-Side)', () => {
  const oldRev = {
    descrizioneCampione: 'Olio EVO Lotto 1',
    risultatiAnalisi: [
      { provaId: 'p1', valoreRilevato: '0.25', incertezza: '± 0.03', unitaMisura: '%', conforme: 'Conforme' as const, operatore: 'Op1', dataAnalisi: '2026-11-20' }
    ]
  };
  const newRev = {
    descrizioneCampione: 'Olio EVO Lotto 1',
    risultatiAnalisi: [
      { provaId: 'p1', valoreRilevato: '0.28', incertezza: '± 0.03', unitaMisura: '%', conforme: 'Conforme' as const, operatore: 'Op1', dataAnalisi: '2026-11-20' }
    ]
  };
  const diff = computeRdpDiff(oldRev, newRev);
  assert.equal(diff.hasChanges, true);
  assert.equal(diff.totalChanges, 1);
});

test('7. Deduplicazione Ruoli e Operatori (case-insensitive, ruoli composti e merge aree di competenza)', () => {
  const cleanedRoles = deduplicateRoleLabels([
    'Responsabile Tecnico',
    'responsabile tecnico',
    'Responsabile Tecnico & Responsabile di Reparto',
    'responsabile di reparto',
    'V.ce Responsabile Tecnico',
    'vice responsabile tecnico',
    'AM',
    'Responsabile Amministrativo'
  ]);
  assert.deepEqual(cleanedRoles, [
    'Responsabile Tecnico',
    'Responsabile di Reparto',
    'Vice Responsabile Tecnico',
    'Responsabile Amministrativo'
  ]);

  const rawOperators: Operator[] = [
    {
      nome: 'Dott. Mario Rossi',
      ruolo: 'Responsabile di Reparto & Responsabile di Reparto',
      password: '123',
      attivo: true,
      areeCompetenza: ['dashboard', 'clienti']
    },
    {
      nome: '  dott.   mario rossi ',
      ruolo: 'Responsabile di Reparto',
      password: '123',
      email: 'mario.rossi@lab.it',
      attivo: true,
      areeCompetenza: ['prove', 'backupDrive']
    }
  ];

  const dedupedOps = sanitizeOperatorsList(rawOperators);
  assert.equal(dedupedOps.length, 1);
  assert.equal(dedupedOps[0].nome, 'Dott. Mario Rossi');
  assert.equal(dedupedOps[0].ruolo, 'Responsabile di Reparto');
  assert.equal(dedupedOps[0].email, 'mario.rossi@lab.it');
  assert.deepEqual(dedupedOps[0].areeCompetenza, ['dashboard', 'clienti', 'prove', 'backupDrive']);
});
