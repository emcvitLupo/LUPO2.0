const fs = require('fs');
let file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// Dashboard card
content = content.replace("{actualRole !== 'AM' && hasAccessTo('operatori') && (", "{hasAccessTo('operatori') && (");

// Sidebar
content = content.replace("{actualRole !== 'AM' && (\n              <button\n                onClick={() => setActiveTab('operatori')}", "{hasAccessTo('operatori') && (\n              <button\n                onClick={() => setActiveTab('operatori')}");

// Mobile menu
content = content.replace("{actualRole !== 'AM' && (\n            <button\n              onClick={() => { setActiveTab('operatori'); setMobileMenuOpen(false); }}", "{hasAccessTo('operatori') && (\n            <button\n              onClick={() => { setActiveTab('operatori'); setMobileMenuOpen(false); }}");

fs.writeFileSync(file, content);
