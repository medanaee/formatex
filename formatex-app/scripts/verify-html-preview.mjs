// Generate a local browser harness from measured native packets. Serve its folder over localhost, then press Run.
import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
import { fileURLToPath } from "node:url"

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const out = path.resolve(process.argv[2] ?? path.join(app, "../out/performance-after-2026-11-10"))
fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, "htmlFrame.js"), ts.transpileModule(fs.readFileSync(path.join(app, "src/lib/editor/htmlFrame.ts"), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ES2022 } }).outputText)
fs.writeFileSync(path.join(out, "browser-check.html"), `<!doctype html><html><head><meta charset="utf-8"><title>Formatex HTML preview checks</title><style>body{font:14px system-ui;background:#eee;color:#222;margin:12px}iframe{display:block;height:600px;background:white;border:1px solid #999;max-width:none}pre{white-space:pre-wrap;max-height:180px;overflow:auto}button{padding:10px}</style></head><body><h1>Formatex HTML preview checks</h1><button id="run">Run browser checks</button><pre id="result">Ready</pre><iframe title="Native HTML preview" sandbox="allow-scripts"></iframe><script type="module">
import {initialFrame,splitHtml} from './htmlFrame.js';
const frame=document.querySelector('iframe'),result=document.getElementById('result'),rows=[];
const packets=await Promise.all(['preview-initial.json','preview-edited.json','preview-fa-dark.json'].map(p=>fetch(p).then(r=>r.json())));
let seq=0,token='',requests=new Map();
addEventListener('message',e=>{if(e.source!==frame.contentWindow||e.data?.fxToken!==token)return;for(const [key,item] of requests){if(item.check(e.data)){requests.delete(key);clearTimeout(item.timer);item.resolve(e.data)}}});
function wait(check){return new Promise((resolve,reject)=>{const key=++seq;requests.set(key,{check,resolve,timer:setTimeout(()=>{requests.delete(key);reject(Error('Message timeout '+key))},15000)})})}
function send(data){frame.contentWindow.postMessage({...data,fxToken:token},'*')}
async function probe(extra={}){const id=++seq;const p=wait(d=>d.probeId===id);send({fxProbe:id,...extra});return p}
function assert(value,message){if(!value)throw Error(message)}
const probeScript=\`<script>(function(){var bar=document.querySelector('.fxv-bar'),font=document.getElementById('fx-preview-fonts');addEventListener('message',function(e){var d=e.data;if(e.source!==parent||d.fxToken!==window.__fxPreviewToken||!d.fxProbe)return;if(d.find){var fb=document.querySelector('.fxv-bar').children[1];if(fb)fb.click();var fi=document.querySelector('.fxv-search input');if(fi){fi.value=d.find;fi.dispatchEvent(new Event('input',{bubbles:true}))}}if(d.zoom){var b=document.querySelector('[aria-label="Zoom in"],[aria-label="بزرگ‌تر"]');if(b)b.click()}if(d.scroll)scrollTo({top:d.scroll,behavior:"instant"});parent.postMessage({fxToken:window.__fxPreviewToken,probeId:d.fxProbe,barSame:bar===document.querySelector('.fxv-bar'),fontSame:font===document.getElementById('fx-preview-fonts'),bars:document.querySelectorAll('.fxv-bar').length,copies:document.querySelectorAll('.fx-copy').length,outline:document.querySelectorAll('.fxv-link').length,edited:document.querySelector('main').textContent.includes('BENCH_EDITED_079'),zoom:document.documentElement.style.getPropertyValue('--zoom'),scroll:scrollY,width:innerWidth,ui:bar&&bar.lang,searchOpen:!!document.querySelector('.fxv-search:not([hidden])'),findCount:document.querySelector('.fxv-search output')?.textContent,highlightCount:CSS.highlights?.get('fx-search')?.size||0,dir:document.querySelector('main').dir,linkRadius:getComputedStyle(document.querySelector('.fxv-link')).borderRadius,theme:document.documentElement.style.getPropertyValue('--bg')},'*')})})()</script>\`;
document.getElementById('run').onclick=async()=>{
 document.getElementById('run').disabled=true;
 try{for(const lang of ['en','fa'])for(const width of [360,768,1280]){
  token=crypto.randomUUID();frame.style.width=width+'px';const packet=lang==='en'?packets[0]:packets[2];
  const ready=wait(d=>d.fxReady===true);let doc=initialFrame(packet.html,packet.fontCss,token,0,{});doc=doc.replace('</body>',probeScript+'</body>');frame.srcdoc=doc;await ready;
  const loaded=await probe({zoom:true,scroll:500});assert(Math.abs(loaded.width-width)<=1,'wrong iframe width '+JSON.stringify({actual:loaded.width,expected:width}));assert(loaded.ui===lang,'wrong UI language');
  const fakeProbe=++seq;frame.contentWindow.postMessage({fxPatch:'<p>should not apply</p>',id:fakeProbe,fxToken:'wrong'},'*');
  const id=++seq,start=performance.now(),painted=wait(d=>d.fxPainted===id);send({fxPatch:splitHtml(packets[1].html).content,id,fontCss:null});const paint=await painted;const after=await probe();
  assert(after.edited,'stale content');assert(after.barSame&&after.fontSame&&after.bars===1,'shell/fonts replaced');assert(after.zoom===loaded.zoom,'zoom reset');assert(Math.abs(after.scroll-500)<3,'scroll reset '+JSON.stringify({loaded:loaded.scroll,after:after.scroll}));assert(after.copies===80,'copy controls not rebuilt');assert(after.outline===81,'outline not rebuilt');
  const found=await probe({find:'BENCH_EDITED_079'});assert(found.searchOpen&&found.highlightCount===1,'Find failed '+JSON.stringify(found));assert(found.linkRadius==='0px','outline is not flat');
  rows.push({lang,width,patchAndPaintMs:Math.round(paint.elapsed*10)/10,parentRoundTripMs:Math.round((performance.now()-start)*10)/10,...after,find:found.findCount,searchOpen:found.searchOpen,highlightCount:found.highlightCount});result.textContent=JSON.stringify({status:'running',rows},null,2);
 }result.textContent=JSON.stringify({status:'PASS',rows},null,2);fetch('browser-results.json',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(rows)}).catch(()=>{});
 }catch(error){result.textContent=JSON.stringify({status:'FAIL',error:String(error),rows},null,2)}finally{document.getElementById('run').disabled=false}
};
</script></body></html>`)
// Keep test JavaScript external: its fixture strings intentionally contain closing HTML script tags.
const harnessPath = path.join(out, "browser-check.html")
const harness = fs.readFileSync(harnessPath, "utf8")
const start = harness.indexOf('<script type="module">')
const end = harness.lastIndexOf("</script>")
fs.writeFileSync(path.join(out, "browser-check.js"), harness.slice(start + '<script type="module">'.length, end))
fs.writeFileSync(harnessPath, harness.slice(0, start) + '<script type="module" src="browser-check.js"></script>' + harness.slice(end + 9))
fs.writeFileSync(path.join(out, "serve.py"), `from http.server import SimpleHTTPRequestHandler, HTTPServer
from pathlib import Path
import json, os
os.chdir(Path(__file__).parent)
class Handler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/browser-results.json':
            self.send_error(404)
            return
        n = int(self.headers.get('Content-Length', '0'))
        if not 0 < n < 65536:
            self.send_error(400)
            return
        data = json.loads(self.rfile.read(n))
        Path('browser-results.json').write_text(json.dumps(data, indent=2), encoding='utf8')
        self.send_response(200)
        self.end_headers()
HTTPServer(('127.0.0.1', 8765), Handler).serve_forever()
`)
console.log(harnessPath)
