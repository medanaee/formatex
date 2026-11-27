/** The shell signature excludes only document content; a changed theme, scripts, options or UI language reloads the shell. */
export function splitHtml(html: string): { signature: string; content: string; sourceMap?: string } | null {
  const doc = new DOMParser().parseFromString(html, "text/html")
  const main = doc.querySelector("main.fx-doc")
  if (!main) return null
  // Custom interactive components must initialize their own scripts in a new sandbox document.
  if (main.querySelector("script")) return null
  const content = main.innerHTML
  const map = doc.getElementById("fx-source-map")
  const sourceMap = map?.textContent ?? undefined
  if (map) map.textContent = ""
  main.replaceChildren()
  return { signature: doc.documentElement.outerHTML, content, ...(sourceMap === undefined ? {} : { sourceMap }) }
}

/** Runs inside the sandbox. Content patches do not execute scripts supplied by the document. */
export function frameBridge(token: string, scroll: number, loadId = 0): string {
  return `<script>(function(){
var token=${JSON.stringify(token)}, y=${Math.max(0, Math.round(scroll))};
function send(data){data.fxToken=token;parent.postMessage(data,"*")}
function painted(id,start){Promise.resolve(window.__fxMathReady).then(function(){return document.fonts&&document.fonts.ready}).then(function(){requestAnimationFrame(function(){requestAnimationFrame(function(){send({fxPainted:id,elapsed:performance.now()-start})})})})}
addEventListener("message",function(e){var d=e.data;if(e.source!==parent||!d||d.fxToken!==token||typeof d.fxPatch!=="string")return;var main=document.querySelector("main.fx-doc");if(!main)return;var start=performance.now(),x=scrollX,y=scrollY;var template=document.createElement("template");template.innerHTML=d.fxPatch;template.content.querySelectorAll("script").forEach(function(n){n.remove()});main.replaceChildren(template.content);if(typeof d.fontCss==="string"){var style=document.getElementById("fx-preview-fonts");if(style)style.textContent=d.fontCss}if(typeof d.fxSourceMap==="string"){var map=document.getElementById("fx-source-map");if(map)map.textContent=d.fxSourceMap}document.dispatchEvent(new Event("fx-content-updated"));scrollTo({left:x,top:y,behavior:"instant"});painted(d.id,start)});
var t;addEventListener("scroll",function(){clearTimeout(t);t=setTimeout(function(){send({fxPreviewScroll:scrollY})},120)},{passive:true});
document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("a[href]");if(!a)return;var h=a.getAttribute("href")||"";e.preventDefault();if(/^(https?|mailto):/i.test(h)){send({fxPreviewOpen:h})}else if(h.charAt(0)==="#"){var id=h.slice(1);var target=document.getElementById(id)||document.querySelector(h);if(target)target.scrollIntoView({behavior:"smooth"})}});
addEventListener("load",function(){scrollTo({top:y,behavior:"instant"});send({fxReady:true});painted(${loadId},performance.now())});
})()</script>`
}

export function initialFrame(html: string, css: string, token: string, scroll: number, viewer: Record<string, string>, loadId = 0, tasks: Record<string, boolean> = {}): string {
  const state = `<script>window.__fxPreviewToken=${JSON.stringify(token)};window.__fxViewerState=${JSON.stringify(viewer).replace(/</g, "\\u003c")};window.__fxTaskState=${JSON.stringify(tasks).replace(/</g, "\\u003c")}</script><style id="fx-preview-fonts">${css.replace(/<\/style/gi, "<\\/style")}</style>`
  const head = html.indexOf("<head>")
  const body = html.lastIndexOf("</body>")
  const withBridge = body < 0 ? html + frameBridge(token, scroll, loadId) : html.slice(0, body) + frameBridge(token, scroll, loadId) + html.slice(body)
  return head < 0 ? state + withBridge : withBridge.slice(0, head + 6) + state + withBridge.slice(head + 6)
}
