/* tiny UX helpers — no tracking */
(function () {
  var v = document.querySelector("#demo video");
  if (v) {
    v.play().catch(function () {});
  }
  document.querySelectorAll('a[href="#buy"]').forEach(function (a) {
    a.addEventListener("click", function () {
      var el = document.getElementById("buy");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
})();
