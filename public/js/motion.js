/* =========================================================================
   Animations d'entrée : chaque bloc marqué data-reveal apparaît (montée +
   fondu) quand il entre à l'écran, avec un léger décalage entre voisins.
   Sans JavaScript ou avec « réduire les animations », tout reste visible.
   ========================================================================= */
(function () {
  "use strict";
  const els = Array.from(document.querySelectorAll("[data-reveal]"));
  if (!els.length || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document.documentElement.classList.add("js-reveal");

  // décalage de 70 ms entre éléments frères qui entrent ensemble
  els.forEach(el => {
    const sibs = Array.from(el.parentElement.children).filter(c => c.hasAttribute("data-reveal"));
    el.style.setProperty("--reveal-delay", Math.min(sibs.indexOf(el), 5) * 70 + "ms");
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });

  els.forEach(el => io.observe(el));
})();
