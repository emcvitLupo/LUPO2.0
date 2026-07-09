const fs = require('fs');
let file = 'src/components/OperatoriSection.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `      isResponsabileReparto: autorizzatoFirma ? isRep : false,
      isResponsabileTecnico: autorizzatoFirma ? isTec : false
    };`;

const replaceStr = `      isResponsabileReparto: autorizzatoFirma ? isRep : false,
      isResponsabileTecnico: autorizzatoFirma ? isTec : false,
      areeCompetenza: areeCompetenza
    };`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
} else {
  console.log("Could not find targetStr");
}

fs.writeFileSync(file, content);
console.log('patched handleSave');
