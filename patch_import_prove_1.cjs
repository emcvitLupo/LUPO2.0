const fs = require('fs');
let file = 'src/components/ProveSection.tsx';
let content = fs.readFileSync(file, 'utf8');

const additionalImports = `
import { Download, CheckCircle, AlertCircle } from 'lucide-react';
`;
if (!content.includes('import { Download')) {
  content = content.replace("import { motion, AnimatePresence } from 'motion/react';", additionalImports + "import { motion, AnimatePresence } from 'motion/react';");
  fs.writeFileSync(file, content);
}
