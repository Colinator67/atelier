/* =========================================================================
   Simulateurs : le total défile vers sa nouvelle valeur, et sur téléphone
   une barre fixe en bas d'écran garde le prix et le bouton à portée de pouce.
   ========================================================================= */
(function () {
  "use strict";
  const { $$, eur } = window.UI;
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const parse = (t) => { const v = parseFloat(String(t).replace(/[^\d,.-]/g, "").replace(/\s/g, "").replace(",", ".")); return isFinite(v) ? v : null; };

  // ---------------------------------------------------------------- total animé
  function animate(el) {
    let shown = parse(el.textContent), written = null, run = 0;
    const write = (t) => { written = t; el.textContent = t; };
    new MutationObserver(() => {
      if (el.textContent === written) return; // nos propres écritures
      const target = parse(el.textContent);
      if (target === null || shown === null || still || Math.abs(target - shown) < 0.005) { shown = target; return; }
      const from = shown, t0 = performance.now(), dur = 380, id = ++run;
      shown = target;
      el.classList.add("is-ticking");
      const step = (now) => {
        if (id !== run) return; // une nouvelle valeur est arrivée
        const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        if (k < 1) { write(eur(from + (target - from) * e)); requestAnimationFrame(step); }
        else { write(eur(target)); el.classList.remove("is-ticking"); }
      };
      write(eur(from));
      requestAnimationFrame(step);
    }).observe(el, { childList: true, characterData: true, subtree: true });
  }
  $$(".total strong").forEach(animate);

  // ---------------------------------------------------------------- barre mobile
  const tickets = $$(".ticket");
  if (!tickets.length) return;
  const bar = document.createElement("div");
  bar.className = "pricebar is-off";
  bar.innerHTML = `<div class="pricebar-t"><span class="pricebar-l">Total estimé</span><strong class="mono"></strong></div><button type="button" class="btn">Demander</button>`;
  document.body.appendChild(bar);
  const val = bar.querySelector("strong"), btn = bar.querySelector("button");

  const visibleTicket = () => tickets.find(t => t.offsetParent !== null);
  let ticketInView = false;
  const io = new IntersectionObserver(es => { es.forEach(e => { if (e.target === visibleTicket()) ticketInView = e.isIntersecting; }); refresh(); }, { threshold: 0.15 });
  tickets.forEach(t => io.observe(t));

  function refresh() {
    const t = visibleTicket();
    if (!t) { bar.classList.add("is-off"); return; }
    const total = t.querySelector(".total strong"), ask = t.querySelector(":scope > .btn");
    const has = total && parse(total.textContent) !== null && ask && !ask.disabled;
    const section = t.closest("section");
    const r = section ? section.getBoundingClientRect() : null;
    const inQuote = r && r.top < innerHeight * 0.6 && r.bottom > innerHeight * 0.4;
    const on = !!(has && inQuote && !ticketInView && matchMedia("(max-width: 900px)").matches);
    bar.classList.toggle("is-off", !on); bar.setAttribute("aria-hidden", on ? "false" : "true");
    if (on) { val.textContent = total.textContent; btn.textContent = ask.textContent.replace(/ ce devis| ce tampon/, ""); }
    document.body.classList.toggle("has-pricebar", on);
  }
  btn.addEventListener("click", () => { const t = visibleTicket(); if (t) t.querySelector(":scope > .btn").click(); });
  addEventListener("scroll", refresh, { passive: true });
  addEventListener("resize", refresh);
  tickets.forEach(t => new MutationObserver(refresh).observe(t, { subtree: true, childList: true, characterData: true, attributes: true }));
  document.addEventListener("click", () => setTimeout(refresh, 50));
})();
