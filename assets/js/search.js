(function () {
  "use strict";
  var dataEl = document.getElementById("posts-data");
  if (!dataEl) return;

  var POSTS = JSON.parse(dataEl.textContent);
  var CAT_COLORS = JSON.parse(document.getElementById("cat-colors").textContent || "{}") || {};
  var TR_M = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  var KEYS = ["category", "tag", "lang", "month"];

  var $ = function (id) { return document.getElementById(id); };
  var q = $("q");

  // Türkçe karakterleri katlayarak karşılaştır: "İnceleme" ~ "inceleme", "Çanakkale" ~ "canakkale"
  function fold(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i");
  }
  function slug(s) { return fold(s).trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function color(cat) { return "var(--c-" + (CAT_COLORS[cat] || "grey") + ")"; }

  function parse(s) {
    var f = {}, terms = [], m;
    var re = /(\w+)=(?:"([^"]*)"|(\S+))|"([^"]+)"|(\S+)/g;
    while ((m = re.exec(s))) {
      var key = m[1] && m[1].toLowerCase();
      if (key && KEYS.indexOf(key) > -1) {
        var val = m[2] != null ? m[2] : m[3];
        f[key] = key === "month" ? val : slug(val);
      } else {
        terms.push(fold(m[4] || m[5] || m[0]));
      }
    }
    return { f: f, terms: terms };
  }

  function match(p, P, skip) {
    var f = P.f;
    if (skip !== "category" && f.category && slug(p.c) !== f.category) return false;
    if (skip !== "tag" && f.tag && !(p.g || []).some(function (t) { return slug(t) === f.tag; })) return false;
    if (skip !== "lang" && f.lang && slug(p.l) !== f.lang) return false;
    if (skip !== "month" && f.month && p.d.indexOf(f.month) !== 0) return false;
    var hay = fold([p.t, p.x, p.c].concat(p.g || []).join(" "));
    return P.terms.every(function (t) { return hay.indexOf(t) > -1; });
  }

  function hl(text, terms) {
    var chars = Array.from(text), folded = "", map = [];
    chars.forEach(function (ch, i) {
      Array.from(fold(ch)).forEach(function (c) { folded += c; map.push(i); });
    });
    var marks = chars.map(function () { return false; });
    terms.forEach(function (t) {
      if (t.length < 2) return;
      var at = folded.indexOf(t);
      while (at !== -1) {
        for (var k = at; k < at + t.length; k++) marks[map[k]] = true;
        at = folded.indexOf(t, at + 1);
      }
    });
    var out = "", open = false;
    chars.forEach(function (ch, i) {
      if (marks[i] && !open) { out += "<mark>"; open = true; }
      if (!marks[i] && open) { out += "</mark>"; open = false; }
      out += esc(ch);
    });
    return open ? out + "</mark>" : out;
  }

  function setField(k, v) {
    var P = parse(q.value);
    var target = k === "month" ? v : slug(v);
    var rest = q.value.replace(new RegExp("(^|\\s)" + k + '=(?:"[^"]*"|\\S+)', "i"), " ").replace(/\s+/g, " ").trim();
    if (P.f[k] !== target) rest = (rest + " " + k + "=" + (/\s/.test(v) ? '"' + v + '"' : v)).trim();
    q.value = rest;
    render();
  }

  // Ay aralığı: ilk yazıdan son yazıya kadar tüm aylar
  function monthRange() {
    if (!POSTS.length) return [];
    var ds = POSTS.map(function (p) { return p.d.slice(0, 7); }).sort();
    var y = +ds[0].slice(0, 4), m = +ds[0].slice(5, 7);
    var end = ds[ds.length - 1], out = [];
    while (true) {
      var key = y + "-" + String(m).padStart(2, "0");
      out.push(key);
      if (key >= end || out.length > 120) break;
      m++; if (m > 12) { m = 1; y++; }
    }
    return out;
  }
  var MONTHS = monthRange();

  function countBy(P, key, getter) {
    var c = {};
    POSTS.forEach(function (p) {
      if (!match(p, P, key)) return;
      [].concat(getter(p)).forEach(function (v) { c[v] = (c[v] || 0) + 1; });
    });
    return c;
  }
  function allValues(getter) {
    var c = {};
    POSTS.forEach(function (p) { [].concat(getter(p)).forEach(function (v) { c[v] = (c[v] || 0) + 1; }); });
    return Object.keys(c).sort(function (a, b) { return c[b] - c[a] || a.localeCompare(b, "tr"); });
  }

  function fieldList(el, key, getter, limit, label) {
    var P = parse(q.value);
    var counts = countBy(P, key, getter);
    var vals = allValues(getter).slice(0, limit || 50);
    el.innerHTML = vals.map(function (v) {
      var on = P.f[key] === slug(v);
      return '<li><button type="button" data-k="' + key + '" data-v="' + esc(v) + '" aria-pressed="' + on + '">' +
        "<span>" + (label ? label(v) : esc(v)) + '</span><span class="n">' + (counts[v] || 0) + "</span></button></li>";
    }).join("");
    el.closest(".field").hidden = !vals.length;
  }

  function eventHTML(p, terms) {
    var tags = (p.g || []).slice(0, 3).map(function (t) {
      return '<button type="button" data-k="tag" data-v="' + esc(t) + '">tag=<span class="v">' + esc(t) + "</span></button>";
    }).join("");
    return '<article class="ev"><time datetime="' + p.d + '">' + p.d + "</time><div>" +
      '<h3><a href="' + esc(p.u) + '">' + hl(p.t, terms) + "</a></h3>" +
      (p.x ? "<p>" + hl(p.x, terms) + "</p>" : "") +
      '<div class="kv">' +
      '<button type="button" data-k="category" data-v="' + esc(p.c) + '"><span class="sw" style="background:' + color(p.c) + '"></span>category=<span class="v">' + esc(p.c) + "</span></button>" +
      tags +
      '<button type="button" data-k="lang" data-v="' + esc(p.l) + '">lang=<span class="v">' + esc(p.l) + "</span></button>" +
      "</div></div></article>";
  }

  function render() {
    var P = parse(q.value);
    var hits = POSTS.filter(function (p) { return match(p, P); });

    $("count").innerHTML = "<b>" + hits.length + "</b> yazı eşleşti, toplam " + POSTS.length;

    // Histogram
    var totals = MONTHS.map(function (m) { return POSTS.filter(function (p) { return p.d.indexOf(m) === 0; }).length; });
    var max = Math.max.apply(null, totals.concat(1));
    $("bars").innerHTML = MONTHS.map(function (m, i) {
      var tot = totals[i];
      var h = hits.some(function (p) { return p.d.indexOf(m) === 0; });
      var lbl = TR_M[+m.slice(5) - 1] + " " + m.slice(0, 4) + ": " + tot + " yazı";
      if (!tot) return '<button type="button" class="zero" style="height:2px" disabled aria-label="' + lbl + '"></button>';
      return '<button type="button" class="' + (h ? "" : "dim") + '" style="height:' + Math.max(tot / max * 100, 6) +
        '%" data-k="month" data-v="' + m + '" aria-label="' + lbl + ', filtrele" title="' + lbl + '"></button>';
    }).join("");
    var step = Math.ceil(MONTHS.length / 12);
    $("months").innerHTML = MONTHS.map(function (m, i) {
      return "<span>" + (i % step === 0 ? TR_M[+m.slice(5) - 1] + " " + m.slice(2, 4) : "") + "</span>";
    }).join("");

    // Alanlar
    fieldList($("f-category"), "category", function (p) { return p.c; }, 50, function (v) {
      return '<span class="sw" style="background:' + color(v) + '"></span>' + esc(v);
    });
    fieldList($("f-tag"), "tag", function (p) { return p.g || []; }, 10);
    fieldList($("f-lang"), "lang", function (p) { return p.l; });

    // Liste
    $("list").innerHTML = hits.length
      ? hits.map(function (p) { return eventHTML(p, P.terms); }).join("")
      : '<div class="empty"><p>Bu sorguyla eşleşen yazı yok. Filtrelerden birini kaldır ya da sorguyu temizle.</p>' +
        '<button type="button" class="btn" id="reset">Sorguyu temizle</button></div>';

    // Paylaşılabilir URL
    var url = q.value ? "?q=" + encodeURIComponent(q.value) : location.pathname;
    history.replaceState(null, "", url + location.hash);
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.k) setField(b.dataset.k, b.dataset.v);
    else if (b.id === "clear" || b.id === "reset") { q.value = ""; render(); q.focus(); }
  });
  q.addEventListener("input", render);
  q.addEventListener("keydown", function (e) { if (e.key === "Escape") { q.value = ""; render(); } });

  var initial = new URLSearchParams(location.search).get("q");
  if (initial) q.value = initial;
  $("hist").hidden = false;
  $("fields").hidden = false;
  render();
})();
