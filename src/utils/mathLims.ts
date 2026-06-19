import { VariableCalcolo } from '../types';

/**
 * Safe evaluator for mathematical expressions containing only digits, decimals,
 * basic operators (+, -, *, /) and parentheses.
 */
export function safeEvaluateMath(expression: string): number {
  const sanitized = expression.replace(/[^0-9.\s+\-*/()]/g, '');
  try {
    // Evaluates sanitized math securely using standard constructor
    const res = new Function(`return (${sanitized})`)();
    return typeof res === 'number' && isFinite(res) ? res : NaN;
  } catch {
    return NaN;
  }
}

/**
 * Validates and evaluates a custom laboratory formula using an array of variables.
 */
export function evaluateFormula(
  formula: string,
  variables: VariableCalcolo[]
): { value: number | null; error: string | null } {
  if (!formula.trim()) return { value: null, error: "Formula vuota" };

  // Sort variables by symbol length in descending order to avoid partial matching collisions (e.g. replacing "V1" before "V")
  let expr = formula;
  const sortedVars = [...variables].sort((a, b) => b.simbolo.length - a.simbolo.length);

  for (const v of sortedVars) {
    if (!v.simbolo.trim()) continue;
    // Word boundary regex to replace exact variable symbols
    const regex = new RegExp('\\b' + v.simbolo + '\\b', 'g');
    expr = expr.replace(regex, v.valore.toString());
  }

  // Check if there are any remaining alphabetical characters that weren't substituted
  const remainingLetters = expr.match(/[a-zA-Z]/g);
  if (remainingLetters) {
    const uniqueRemaining = Array.from(new Set(remainingLetters));
    return {
      value: null,
      error: `Variabili non definite nella formula: ${uniqueRemaining.join(', ')}`
    };
  }

  // Safety check to ensure clean math syntax
  const sanitizedExpr = expr.trim();
  if (sanitizedExpr === "") {
    return { value: null, error: "Sintassi espressione non valida" };
  }

  const value = safeEvaluateMath(sanitizedExpr);
  if (isNaN(value)) {
    return { value: null, error: "Errore di sintassi aritmetica nella formula" };
  }

  return { value, error: null };
}

/**
 * Standard preset formulas for common laboratory chemical and physical analyses
 */
export interface FormulaPreset {
  nome: string;
  descrizione: string;
  formula: string;
  variabili: { simbolo: string; descrizione: string; valore: number }[];
}

export const FORMULA_PRESETS: FormulaPreset[] = [
  {
    nome: "Acidità Libera (Oli ed Grassi)",
    descrizione: "Calcolo dell'acidità % espressa in acido oleico (mol. wt. 282 g/mol)",
    formula: "(V * 0.1 * 0.282 * 100) / P",
    variabili: [
      { simbolo: "V", descrizione: "Volume titolante NaOH consumato (mL)", valore: 1.25 },
      { simbolo: "P", descrizione: "Peso dell'aliquota di campione (g)", valore: 10.05 }
    ]
  },
  {
    nome: "Numero di Perossidi (Oli ed Grassi)",
    descrizione: "Calcolo dei milliequivalenti di ossigeno attivo per kg di olio (meq O2/kg)",
    formula: "((V1 - V0) * T * 1000) / P",
    variabili: [
      { simbolo: "V1", descrizione: "Volume tiosolfato Na2S2O3 per campione (mL)", valore: 2.15 },
      { simbolo: "V0", descrizione: "Volume tiosolfato Na2S2O3 per il bianco (mL)", valore: 0.05 },
      { simbolo: "T", descrizione: "Molarità effettiva del tiosolfato (M)", valore: 0.01 },
      { simbolo: "P", descrizione: "Peso dell'aliquota di olio tarato (g)", valore: 5.02 }
    ]
  },
  {
    nome: "Umidità e Sostanze Volatili (Termogravimetria)",
    descrizione: "Calcolo percentuale (%) della perdita di peso dopo riscaldamento in stufa",
    formula: "((A - B) / (A - C)) * 100",
    variabili: [
      { simbolo: "A", descrizione: "Peso tara + campione umido pre-stufa (g)", valore: 45.2450 },
      { simbolo: "B", descrizione: "Peso tara + campione secco post-stufa (g)", valore: 44.8920 },
      { simbolo: "C", descrizione: "Peso tara vuota e pulita (g)", valore: 35.1230 }
    ]
  },
  {
    nome: "Conversione ppm o mg/kg in %",
    descrizione: "Conversione di concentrazione da parti per milione a percentuale in peso",
    formula: "X / 10000",
    variabili: [
      { simbolo: "X", descrizione: "Valore rilevato in ppm o mg/kg", valore: 450.0 }
    ]
  },
  {
    nome: "Fattore di Diluizione Semplice",
    descrizione: "Moltiplicazione del valore letto per il fattore di diluizione impostato",
    formula: "C * F",
    variabili: [
      { simbolo: "C", descrizione: "Concentrazione letta dallo strumento (es. HPLC/UV)", valore: 12.8 },
      { simbolo: "F", descrizione: "Fattore di diluizione applicato (es. 25x)", valore: 25.0 }
    ]
  }
];
