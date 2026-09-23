(function () {
  "use strict";
  var root = document.documentElement;

  // Tema
  var themeBtn = document.getElementById("theme");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var dark = root.dataset.theme
        ? root.dataset.theme === "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches;
      var next = dark ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  var body = document.querySelector(".post-body");
  if (!body) return;

  // Kod bloklarına kopyala düğmesi
  body.querySelectorAll("div.highlighter-rouge").forEach(function (block) {
    var pre = block.querySelector("pre");
    if (!pre) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "copy";
    btn.textContent = "Kopyala";
    btn.addEventListener("click", function () {
      var text = (pre.querySelector("code") || pre).innerText.replace(/\n$/, "");
      var done = function () {
        btn.textContent = "Kopyalandı";
        btn.classList.add("done");
        setTimeout(function () { btn.textContent = "Kopyala"; btn.classList.remove("done"); }, 1500);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    });
    block.appendChild(btn);
  });

  // İçindekiler
  var heads = Array.prototype.filter.call(body.querySelectorAll("h2, h3"), function (h) { return h.id; });
  var toc = document.getElementById("toc");
  var list = document.getElementById("toc-list");
  if (!toc || heads.length < 3) return;

  var links = {};
  heads.forEach(function (h) {
    var li = document.createElement("li");
    if (h.tagName === "H3") li.className = "sub";
    var a = document.createElement("a");
    a.href = "#" + h.id;
    a.textContent = h.textContent;
    li.appendChild(a);
    list.appendChild(li);
    links[h.id] = a;
  });
  toc.hidden = false;

  if (!("IntersectionObserver" in window)) return;
  var current = null;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        if (current) current.classList.remove("active");
        current = links[e.target.id];
        current.classList.add("active");
      }
    });
  }, { rootMargin: "0px 0px -70% 0px" });
  heads.forEach(function (h) { io.observe(h); });
})();
