const fs = require('fs');
let file = 'src/components/OperatoriSection.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `    setIsResponsabileTecnico(holdsTecnico);

    setEditingIndex(index);`;

const replaceStr = `    setIsResponsabileTecnico(holdsTecnico);
    setAreeCompetenza(op.areeCompetenza || []);

    setEditingIndex(index);`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
} else {
  console.log("Could not find targetStr");
}

fs.writeFileSync(file, content);
console.log('patched handleEdit');
