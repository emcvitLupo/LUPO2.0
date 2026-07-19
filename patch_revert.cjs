const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

// Revert the row patch
content = content.replace(
  /\{\(!isPriceHidden \|\| item\.opzionale\) \? \(/g,
  "{!isPriceHidden ? ("
);

// We still have the `optionalTotal` error on line 2419:
// The `optionalTotal` is declared inside `filteredAndSortedQuotes.map`, but the curly braces might not be open for the `return` statement properly?
// Let's check line 2370 to 2420.
fs.writeFileSync('src/components/PreventiviSection.tsx', content);
