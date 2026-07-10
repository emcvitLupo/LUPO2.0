const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// remove all instances of `{hasAccessTo('...') && (`
content = content.replace(/\{hasAccessTo\('[^']+'\)\s*&&\s*\(/g, '');
content = content.replace(/\{actualRole !== 'AM' && hasAccessTo\('operatori'\)\s*&&\s*\(/g, "{actualRole !== 'AM' && (");
// remove all single `)}` lines that are left over. Actually this is dangerous. Let's just remove `)}` on lines by themselves
content = content.replace(/^\s*\)\}\s*$/gm, '');

// Also patch_tab_bodies.cjs added:
// {activeTab === '...' && !hasAccessTo('...') && <div ...>}
// {activeTab === '...' && hasAccessTo('...') && (
const accessDeniedStrRegex = /\{activeTab === '[^']+' && !hasAccessTo\('[^']+'\) && <div[^>]+>.*?<\/div>\}/g;
content = content.replace(accessDeniedStrRegex, '');

content = content.replace(/\{activeTab === '([^']+)' && hasAccessTo\('[^']+'\) && \(/g, "{activeTab === '$1' && (");

fs.writeFileSync(file, content);
console.log('cleaned up messy access controls');
