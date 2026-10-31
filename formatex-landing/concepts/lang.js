/* English by default, Persian on a toggle. Text pairs: <span class="l-fa">…</span><span class="l-en">…</span>. */
(function () {
  var L = "en"
  try { L = localStorage.getItem("fx-lang") || "en" } catch (e) {}
  var root = document.documentElement
  function set(l) { root.lang = l; root.dir = l === "fa" ? "rtl" : "ltr" }
  function apply(l) {
    L = l; set(l); window.LANG = l
    try { localStorage.setItem("fx-lang", l) } catch (e) {}
    var b = document.getElementById("lt")
    if (b) { b.textContent = l === "fa" ? "English" : "فارسی"; b.lang = l === "fa" ? "en" : "fa" }
    document.dispatchEvent(new Event("langchange"))
  }
  var st = document.createElement("style")
  st.textContent = "html[lang=en] .l-fa,html[lang=fa] .l-en{display:none!important}#lt{all:unset;cursor:pointer;font:600 13px Inter,Vazirmatn,sans-serif;padding:4px 12px;border:1px solid currentColor;border-radius:99px;opacity:.85;position:relative;z-index:40}#lt:hover{opacity:1}"
  document.head.appendChild(st)
  window.LANG = L; set(L)
  document.addEventListener("DOMContentLoaded", function () {
    var h = document.querySelector("header")
    if (h) {
      var b = document.createElement("button")
      b.id = "lt"; b.type = "button"
      b.onclick = function () { apply(L === "fa" ? "en" : "fa") }
      var dl = h.querySelector("a.dl")
      dl ? h.insertBefore(b, dl) : h.appendChild(b)
    }
    apply(L)
  })
})()
