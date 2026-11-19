import { build } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

// Offline diagnostic artifact only. Never starts or automates a browser.
const root = process.cwd();
const outDir = path.join(root, 'tmp/full-game-review');
fs.mkdirSync(outDir, { recursive: true });
const data = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
const pngs = folder => Object.fromEntries(fs.readdirSync(folder).filter(file => file.endsWith('.png'))
  .map(file => [file.slice(0, -4), data(path.join(folder, file), 'image/png')]));
await build({
  configFile: false, base: './', logLevel: 'warn',
  plugins: [{ name: 'offline-full-game-art', enforce: 'pre', transform(original, id) {
    const name = id.replaceAll('\\', '/');
    let code = original;
    if (name.endsWith('/src/visual/fonts.ts')) {
      const fonts = Object.fromEntries(['imfellenglish', 'alegreya', 'alegreyasans']
        .map(font => [font, data(path.join(root, 'public/fonts', font + '.ttf'), 'font/ttf')]));
      code = 'const reviewFonts=' + JSON.stringify(fonts) + ';\n' + code.replace(
        '`url(${import.meta.env.BASE_URL}fonts/${file}.ttf)`', "'url('+reviewFonts[file]+')'");
    }
    if (name.endsWith('/src/visual/art.ts')) {
      code = code.replace(/const urls = Object\.fromEntries\([\s\S]*?as Record<ArtKey, string>;/,
        `const urls = ${JSON.stringify(pngs(path.join(root, 'public/art')))} as Record<ArtKey, string>;`);
    }
    if (name.endsWith('/src/visual/arenaArt.ts')) {
      code = code.replace(/const arenaUrls = Object\.fromEntries\([\s\S]*?as Record<ArenaKey, string>;/,
        `const arenaUrls = ${JSON.stringify(pngs(path.join(root, 'public/art/arena')))} as Record<ArenaKey, string>;`);
    }
    if (name.endsWith('/src/visual/kaelenArt.ts')) {
      const manifest = fs.readFileSync(path.join(root, 'public/art/kaelen/atlas.json'), 'utf8');
      code = code.replace("const base = import.meta.env.BASE_URL + 'art/kaelen/';", '')
        .replace("await Assets.load<KaelenAtlas>(base + 'atlas.json')", '(' + manifest + ') as KaelenAtlas')
        .replace('await Assets.load<Texture>(base + manifest.image)',
          'await Assets.load<Texture>(' + JSON.stringify(data(path.join(root, 'public/art/kaelen/kaelen-se.png'), 'image/png')) + ')');
    }
    if (name.includes('/src/visual/')) {
      code = code.replace(/new URL\(\s*'([^']+\.(?:jpg|jfif))',\s*import\.meta\.url\s*\)\.href/g,
        (_, file) => JSON.stringify(data(path.resolve(path.dirname(id), file), 'image/jpeg')));
    }
    return code;
  }}],
  build: { outDir, emptyOutDir: false, copyPublicDir: false, minify: true,
    lib: { entry: path.join(root, 'tools/full-game-review.ts'), formats: ['iife'], name: 'OakFullReview', fileName: () => 'review.js' },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
const js = fs.readFileSync(path.join(outDir, 'review.js'), 'utf8').replaceAll('</script', '<\\/script');
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>OAKHEAVEN — revisão offline</title>
<style>html,body{margin:0;background:#101a18;color:#e0ddc8;font:14px Georgia,serif}main{width:960px;margin:12px auto}button{background:#29392f;color:#eee1b4;border:1px solid #8b8765;padding:9px;margin:0 5px 8px 0;cursor:pointer}canvas{display:block;width:960px;height:540px}pre{white-space:pre-wrap;font:13px monospace;line-height:1.5}p{margin:8px 0}#status{min-height:35px}</style>
<main><nav id="controls"></nav><p>Revisão das cenas reais. Atalhos de cena usam recursos e torres de diagnóstico. “Início normal” restaura a progressão original.</p><div id="stage"></div><pre id="status">Carregando assets incorporados…</pre></main>
<script>window.addEventListener('error',e=>{document.body.dataset.error='true';document.querySelector('#status').textContent=e.message});</script><script>${js}</script></html>`;
fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(JSON.stringify({ html: path.join(outDir, 'index.html'), bytes: Buffer.byteLength(html), browserStarted: false }));
