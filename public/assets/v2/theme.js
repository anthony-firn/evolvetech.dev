// Loaded blocking in <head>: apply a saved light/dark choice before first paint; otherwise the device setting decides.
(function () {
  var root = document.documentElement, KEY = "theme";
  try { var saved = localStorage.getItem(KEY); if (saved === "light" || saved === "dark") root.dataset.theme = saved; } catch (e) {}

  var system = window.matchMedia("(prefers-color-scheme: light)");
  function current() { return root.dataset.theme || (system.matches ? "light" : "dark"); }
  function label(button) {
    var next = current() === "light" ? "dark" : "light";
    button.setAttribute("aria-label", "Switch to " + next + " mode");
    button.title = "Switch to " + next + " mode";
  }

  document.addEventListener("DOMContentLoaded", function () {
    var buttons = document.querySelectorAll("[data-theme-toggle]");
    buttons.forEach(function (button) {
      label(button);
      button.addEventListener("click", function () {
        var next = current() === "light" ? "dark" : "light";
        // Choosing the device's own theme clears the override, so later OS changes are followed again.
        if (next === (system.matches ? "light" : "dark")) delete root.dataset.theme; else root.dataset.theme = next;
        try { root.dataset.theme ? localStorage.setItem(KEY, root.dataset.theme) : localStorage.removeItem(KEY); } catch (e) {}
        buttons.forEach(label);
        document.dispatchEvent(new CustomEvent("themechange"));
      });
    });
    system.addEventListener("change", function () { buttons.forEach(label); document.dispatchEvent(new CustomEvent("themechange")); });
  });
})();
