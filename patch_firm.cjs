const fs = require('fs');
let file = 'src/components/AccettazioneSection.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace "I Responsabili di Reparto Analitici" -> "I Responsabili di Reparto"
content = content.replace("I Responsabili di Reparto Analitici", "I Responsabili di Reparto");

// Define format function for name
const formatFunctionCode = `
  const formatFirmatarioName = (name?: string) => {
    if (!name) return '';
    let n = name.trim();
    const nl = n.toLowerCase();
    if (nl.includes('marroccella') || nl.includes('marrocella')) {
      if (!nl.startsWith('dott')) return 'Dott. ' + n;
    }
    if (nl.includes('de simone')) {
      if (!nl.startsWith('dott')) return 'Dott.ssa ' + n;
    }
    return n;
  };
`;

// Insert the function just inside previewReportAcc rendering or above it.
// Actually, I can just inject it right before the first use in previewReportAcc block.
const insertPoint = `        {previewReportAcc && (() => {`;
if (content.includes(insertPoint)) {
  content = content.replace(insertPoint, insertPoint + formatFunctionCode);
} else {
  console.log("Could not find insertPoint");
}

// Replace the names
const rep1Orig = `{previewReportAcc.firmatarioReparto1 || (operators || []).find(o => o.attivo !== false && o.autorizzatoFirma !== false && ((o.ruoloFirma || '').toLowerCase() === 'responsabile di reparto' || (o.ruolo || '').toLowerCase() === 'responsabile di reparto'))?.nome || 'Dott.ssa S. Bianchi'}`;
const rep1New = `{formatFirmatarioName(previewReportAcc.firmatarioReparto1 || (operators || []).find(o => o.attivo !== false && o.autorizzatoFirma !== false && ((o.ruoloFirma || '').toLowerCase() === 'responsabile di reparto' || (o.ruolo || '').toLowerCase() === 'responsabile di reparto'))?.nome || 'Dott.ssa S. Bianchi')}`;
content = content.replace(rep1Orig, rep1New);

const rep2Orig = `{previewReportAcc.firmatarioReparto2}`;
const rep2New = `{formatFirmatarioName(previewReportAcc.firmatarioReparto2)}`;
content = content.replace(rep2Orig, rep2New);

const techOrig = `{previewReportAcc.firmatarioTecnico || (operators || []).find(o => o.attivo !== false && o.autorizzatoFirma !== false && ((o.ruoloFirma || '').toLowerCase().includes('tecnico') || (o.ruolo || '').toLowerCase() === 'responsabile tecnico'))?.nome || 'Dott. Chim. F. Lupo'}`;
const techNew = `{formatFirmatarioName(previewReportAcc.firmatarioTecnico || (operators || []).find(o => o.attivo !== false && o.autorizzatoFirma !== false && ((o.ruoloFirma || '').toLowerCase().includes('tecnico') || (o.ruolo || '').toLowerCase() === 'responsabile tecnico'))?.nome || 'Dott. Chim. F. Lupo')}`;
content = content.replace(techOrig, techNew);

// Remove the signature lines
const sig1 = `<div className="text-[7px] font-semibold text-emerald-800 bg-emerald-50/60 border border-emerald-100 rounded px-1.5 py-0.5 inline-block normal-case font-mono tracking-normal leading-none">\n                                🔒 Firma Elettronica Certificata (Chimica)\n                              </div>`;
content = content.replace(sig1, `<div className="text-[7px] text-slate-500 font-semibold tracking-tight uppercase leading-normal font-sans">Responsabile di Reparto</div>`);

const sig2 = `<div className="text-[7px] font-semibold text-emerald-800 bg-emerald-50/60 border border-emerald-100 rounded px-1.5 py-0.5 inline-block normal-case font-mono tracking-normal leading-none font-medium">\n                                  🔒 Firma Elettronica Certificata (Microbiologia)\n                                </div>`;
content = content.replace(sig2, `<div className="text-[7px] text-slate-500 font-semibold tracking-tight uppercase leading-normal font-sans">Responsabile di Reparto</div>`);

const sig3 = `<div className="text-[7px] font-semibold text-indigo-800 bg-indigo-50/60 border border-indigo-100 rounded px-1.5 py-0.5 inline-block normal-case font-mono tracking-normal leading-none">\n                                  🔑 Firma Digitale Qualificata (CAD)\n                                </div>`;
content = content.replace(sig3, "");

fs.writeFileSync(file, content);
console.log('patched firm');
