import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': projectRoot,
      },
    },
    server: {
      host: '0.0.0.0',
      allowedHosts: ['terminal.local'],
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@supabase') || id.includes('/realtime-js/') || id.includes('/postgrest-js/') || id.includes('/gotrue-js/') || id.includes('/storage-js/')) return 'supabase';
            if (id.includes('/xlsx/')) return 'spreadsheet';
            if (id.includes('/lucide-react/')) return 'icons';
            if (id.includes('/motion') || id.includes('/framer-motion')) return 'motion';
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react-vendor';
            return 'vendor';
          },
        },
      },
    },
  };
});
