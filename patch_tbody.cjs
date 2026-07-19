const fs = require('fs');
let content = fs.readFileSync('src/components/PreventiviSection.tsx', 'utf8');

// For line ~1900
content = content.replace(
  /<tbody className="divide-y divide-slate-200 text-slate-700">[\s\S]*?<\/tbody>/m,
  '<tbody className="divide-y divide-slate-200 text-slate-700">{renderGroupedItems(prev, isPriceHidden, false)}</tbody>'
);

// For line ~7290 (print view)
// Need to find the second tbody matching the pattern or something similar
// Wait, the print view table is identical, so replacing `tbody` will be easy if I use a loop.
let matches = content.match(/<tbody className="divide-y divide-slate-200 text-slate-700">[\s\S]*?<\/tbody>/g);
if (matches) {
  matches.forEach(m => {
    content = content.replace(m, '<tbody className="divide-y divide-slate-200 text-slate-700">\n  {renderGroupedItems(prev, isPriceHidden, true)}\n</tbody>');
  });
}

// And there's also the detail view layout (lines 3870+)
// It has `tbody className="divide-y divide-slate-100"`
matches = content.match(/<tbody className="divide-y divide-slate-100">[\s\S]*?<\/tbody>/g);
if (matches) {
  matches.forEach(m => {
    content = content.replace(m, '<tbody className="divide-y divide-slate-100">\n  {renderGroupedItems(prev, isPriceHidden, false)}\n</tbody>');
  });
}

fs.writeFileSync('src/components/PreventiviSection.tsx', content);
