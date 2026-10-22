// Packs the demo build (client/dist-demo) into one self-contained HTML file.
import {readFileSync, writeFileSync} from 'node:fs';

const dir = new URL('../client/dist-demo/', import.meta.url);
const html = readFileSync(new URL('index.html', dir), 'utf8');
const asset = href => readFileSync(new URL('.' + href, dir), 'utf8');
const css = [...html.matchAll(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map(m => asset(m[1])).join('\n');
const js = [...html.matchAll(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g)].map(m => asset(m[1])).join('\n');
const icon = html.match(/<link rel="icon" href="[^"]*"\s*\/?>/)?.[0] || '';

const page = `<title>LendFlow</title>
<meta name="theme-color" content="#4f46e5">
${icon}
<style>
${css}
</style>
<div id="root"></div>
<script type="module">
${js.replace(/<\/script/gi, '<\\/script')}
</script>
`;
writeFileSync(new URL('lendflow-demo.html', dir), page);
console.log(`Wrote client/dist-demo/lendflow-demo.html (${(page.length / 1024).toFixed(0)} KB)`);
