/* Chao theme toggle: flips data-theme on <html> and remembers the choice */
(function () {
  var root = document.documentElement;
  var btn = document.querySelector(".theme-toggle");
  function label() {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    btn.setAttribute("aria-label", "Switch to " + next + " mode");
    btn.title = "Switch to " + next + " mode";
  }
  label();
  btn.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    label();
  });
})();
