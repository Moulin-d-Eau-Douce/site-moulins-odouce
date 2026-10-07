/* =====================================================================
   Bouton « Exporter en PDF » des tutoriels MILLØ
   (chargé par zensical.toml : extra_javascript)

   Le bouton ouvre la fenêtre d'impression du navigateur : choisir
   « Enregistrer au format PDF ». La mise en page (une étape par page,
   captures jamais coupées) est dans export-pdf.css.
   Le bouton n'apparaît que sur les pages de tutoriel (étapes + captures).
   ===================================================================== */

(function () {
  // Icône Material « file-pdf-box »
  var ICONE =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-9.5 8.5c0 .8-.7 1.5-1.5 1.5H7v2H5.5V9H8c.8 0 1.5.7 1.5 1.5zm5 2c0 .8-.7 1.5-1.5 1.5h-2.5V9H13c.8 0 1.5.7 1.5 1.5zm4-3H17v1h1.5V13H17v2h-1.5V9h3zm-6.5 0h1v3h-1zm-5 0h1v1H7z"/></svg>';

  function exporter() {
    // Nom proposé pour le fichier PDF = titre du tutoriel
    var titre = document.querySelector("article h1");
    var ancien = document.title;
    if (titre) document.title = titre.textContent.replace("¶", "").trim();
    window.print();
    document.title = ancien;
  }

  function ajouterBouton() {
    var article = document.querySelector("article.md-content__inner");
    if (!article || article.querySelector(".millo-export-pdf")) return;
    // Page de tutoriel = au moins une étape (h2) et une capture
    if (!article.querySelector("h2") || !article.querySelector("img")) return;

    var bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "md-content__button md-icon millo-export-pdf";
    bouton.title = "Exporter en PDF";
    bouton.setAttribute("aria-label", "Exporter en PDF");
    bouton.innerHTML = ICONE + "<span>Exporter en PDF</span>";
    bouton.addEventListener("click", exporter);
    article.insertBefore(bouton, article.firstChild);
  }

  // Navigation instantanée (si activée) : document$ est fourni par le thème
  if (window.document$ && window.document$.subscribe) {
    window.document$.subscribe(ajouterBouton);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ajouterBouton);
  } else {
    ajouterBouton();
  }
})();
