/* tiny UX — no tracking */
(function () {
  var v = document.querySelector("#demo video");
  if (v) {
    v.play().catch(function () {});
  }
})();
