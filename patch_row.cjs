const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

// There are 4 occurrences of `!isPriceHidden` we need to replace with something that accounts for optional.
content = content.replace(
  /\{!isPriceHidden \? \(/g,
  "{(!isPriceHidden || item.opzionale) ? ("
);

// We should also visually distinguish the price of optional items by adding a small "(Opzionale)" tag.
// Actually, let's just do the first replacement and see if that is enough.
fs.writeFileSync('src/components/PreventiviSection.tsx', content);
