const fs = require('fs');
let file = 'src/components/ClientiSection.tsx';
let content = fs.readFileSync(file, 'utf8');

const additionalImports = `
import { Download, CheckCircle } from 'lucide-react';
`;

content = content.replace("import { motion, AnimatePresence } from 'motion/react';", additionalImports + "\nimport { motion, AnimatePresence } from 'motion/react';");

fs.writeFileSync(file, content);
