const p = { modalitaCondizioni: ['Pagamento: Rimessa diretta'] };
const formatText = (text) => {
  if (!text) return undefined;
  if (Array.isArray(text)) return text.join('\n');
  return text;
};
const item = { key: 'pagamento', label: "Condizioni di Pagamento", text: formatText(p.modalitaCondizioni) };
console.log(item.text && item.text.trim() !== '' ? 'SHOW' : 'HIDE');
