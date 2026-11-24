import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isDev = command === 'serve';

  return {
    plugins: [
      react(),
      {
        name: 'csp-environment-transform',
        transformIndexHtml(html) {
          if (isDev) {
            // In local development, dynamically permit localhost connections
            const devCsp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' http://localhost:8080 http://localhost:3000 https://appzys-crm-backend.onrender.com; object-src 'none'; base-uri 'self';";
            return html.replace(
              /<meta http-equiv="Content-Security-Policy" content="[^"]*"\s*\/?>/,
              `<meta http-equiv="Content-Security-Policy" content="${devCsp}" />`
            );
          }
          // Production build retains strict CSP (No localhost entries)
          return html;
        }
      }
    ],
    server: {
      port: 3000,
      strictPort: true,
      open: false,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        }
      }
    }
  };
});
