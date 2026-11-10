import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const { output } = await build({ build: { write: false } });
let html = output.find(file => file.fileName === 'index.html').source;

for (const file of output) {
  if (file.type === 'chunk') {
    const tag = new RegExp(`<script\\b[^>]*src="[^"]*${file.fileName}"[^>]*><\\/script>`);
    if (!tag.test(html)) throw new Error(`Unexpected JavaScript chunk: ${file.fileName}`);
    html = html.replace(tag, () => `<script type="module">${file.code.replace(/<\/script/gi, '<\\/script')}</script>`);
  } else if (file.fileName.endsWith('.css')) {
    const tag = new RegExp(`<link\\b[^>]*href="[^"]*${file.fileName}"[^>]*>`);
    if (!tag.test(html)) throw new Error(`Missing stylesheet: ${file.fileName}`);
    html = html.replace(tag, () => `<style>${file.source}</style>`);
  } else if (file.fileName !== 'index.html') {
    throw new Error(`Unexpected external asset: ${file.fileName}`);
  }
}

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await writeFile(`${dist}/index.html`, html);
console.log('Built dist/index.html with inline CSS, JavaScript and spells.');
