const fs = require('fs');
const url = process.env.SUPABASE_URL || '';
const key = process.env.SUPABASE_ANON_KEY || '';

if (!url || !key) {
  console.warn('ADVERTENCIA: SUPABASE_URL o SUPABASE_ANON_KEY no están definidas.');
}

fs.writeFileSync(
  'js/supabase-config.js',
  `window.SUPABASE_URL='${url}';\nwindow.SUPABASE_ANON='${key}';\n`
);
console.log('js/supabase-config.js generado correctamente.');
