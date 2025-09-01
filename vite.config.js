import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import crypto from 'crypto';

console.log('[vite.config] cargado configuracion (plugin cloudinary debería inicializarse)');

// Dev-only middleware to emulate the serverless Cloudinary endpoints so
// fetch('/api/cloudinary-signature') and fetch('/api/cloudinary-delete')
// funcionen en local (Vite) igual que en Vercel.
function cloudinaryDevApi(env){
  return {
    name: 'cloudinary-dev-api',
    configureServer(server){
      // Log inicial (enmascarado) para verificar carga de variables
      console.log('[cloudinary-dev-api] init', {
        cloud: env.CLOUDINARY_CLOUD_NAME || 'missing',
        key: env.CLOUDINARY_API_KEY ? 'present' : 'missing',
        secret: env.CLOUDINARY_API_SECRET ? 'present' : 'missing'
      });
      server.middlewares.use('/api/cloudinary-signature', async (req,res)=>{
        if(req.method !== 'POST') { res.statusCode=405; res.setHeader('Allow','POST'); return res.end(JSON.stringify({ error:'Method not allowed'})); }
        try {
          let body=''; req.on('data',c=> body+=c); req.on('end', ()=>{
            try {
              console.log('[cloudinary-dev-api] signature req raw:', body.slice(0,200));
              const json = body? JSON.parse(body):{};
              const folder = json.folder || 'productos';
              const public_id = json.public_id;
              const timestamp = Math.round(Date.now()/1000);
              const params = { folder, timestamp, ...(public_id? { public_id }: {}) };
              const sorted = Object.keys(params).sort().map(k=>`${k}=${params[k]}`).join('&');
              const secret = env.CLOUDINARY_API_SECRET;
              if(!secret){ res.statusCode=500; return res.end(JSON.stringify({ error:'missing_secret' })); }
              const signature = crypto.createHash('sha1').update(sorted+secret).digest('hex');
              if(!env.CLOUDINARY_CLOUD_NAME){ console.warn('[cloudinary-dev-api] missing cloud name at runtime'); }
              res.setHeader('Content-Type','application/json');
              const payload = { signature, timestamp, apiKey: env.CLOUDINARY_API_KEY, cloudName: env.CLOUDINARY_CLOUD_NAME, folder };
              console.log('[cloudinary-dev-api] signature ok for folder', folder, public_id? ('public_id='+public_id):'');
              res.end(JSON.stringify(payload));
            } catch(e){ res.statusCode=500; res.end(JSON.stringify({ error:'signature_error', details:e.message })); }
          });
        } catch(e){ res.statusCode=500; res.end(JSON.stringify({ error:'signature_error', details:e.message })); }
      });
      server.middlewares.use('/api/cloudinary-delete', async (req,res)=>{
        if(req.method !== 'POST') { res.statusCode=405; res.setHeader('Allow','POST'); return res.end(JSON.stringify({ error:'Method not allowed'})); }
        try {
          let body=''; req.on('data',c=> body+=c); req.on('end', async ()=>{
            try {
              console.log('[cloudinary-dev-api] delete req raw:', body.slice(0,200));
              const json = body? JSON.parse(body):{};
              const public_id = json.public_id;
              if(!public_id){ res.statusCode=400; return res.end(JSON.stringify({ error:'public_id_required'})); }
              const timestamp = Math.round(Date.now()/1000);
              const secret = env.CLOUDINARY_API_SECRET;
              if(!secret){ res.statusCode=500; return res.end(JSON.stringify({ error:'missing_secret'})); }
              const base = `public_id=${public_id}&timestamp=${timestamp}`;
              const signature = crypto.createHash('sha1').update(base+secret).digest('hex');
              const form = new URLSearchParams();
              form.append('public_id', public_id);
              form.append('timestamp', String(timestamp));
              form.append('api_key', env.CLOUDINARY_API_KEY||'');
              form.append('signature', signature);
              const cloudName = env.CLOUDINARY_CLOUD_NAME;
              if(!cloudName){ res.statusCode=500; return res.end(JSON.stringify({ error:'missing_cloud_name'})); }
              const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method:'POST', body: form });
              const out = await resp.json();
              res.setHeader('Content-Type','application/json');
              res.end(JSON.stringify(out));
              console.log('[cloudinary-dev-api] delete response status', resp.status, 'public_id', public_id);
            } catch(e){ res.statusCode=500; res.end(JSON.stringify({ error:'delete_error', details:e.message })); }
          });
        } catch(e){ res.statusCode=500; res.end(JSON.stringify({ error:'delete_error', details:e.message })); }
      });
    }
  };
}
export default defineConfig(({ mode }) => {
  // Cargar TODAS las variables (.env, .env.local) sin filtrar prefijo para uso servidor
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), cloudinaryDevApi(env)],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
              motion: ["framer-motion"],
              recharts: ["recharts"],
              ui: ["lucide-react"],
              csv: ["papaparse"]
          }
        }
      },
      chunkSizeWarningLimit: 1600
    }
  };
});
