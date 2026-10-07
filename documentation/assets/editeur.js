/* =====================================================================
   Éditeur des tutoriels MILLØ (chargé par zensical.toml : extra_javascript)

   Fonctionne UNIQUEMENT sur le site local lancé par scripts/editeur.py :
   le bouton « Modifier » n'apparaît que si la page est ouverte sur
   localhost et que le serveur de l'éditeur répond. Sur le site en ligne,
   ce script ne fait rien (aucune requête).

   Les textes modifiables sont les éléments [data-champ] écrits par
   ecrire_markdown() (scripts/generer_tuto.py). En mode modification, ils
   affichent le texte BRUT du YAML (**gras**, {exemple.x}) ; « Enregistrer »
   envoie les textes changés, le serveur modifie le YAML puis régénère et
   publie la page. Doc : doc-projet/editeur-site.md
   ===================================================================== */

(function () {
  var API = "http://127.0.0.1:8001/api";
  var LOCAL = ["localhost", "127.0.0.1"].indexOf(location.hostname) !== -1;

  // Icône Material « pencil »
  var ICONE =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20.71 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75M3 17.25V21h3.75L17.81 9.93l-3.75-3.75z"/></svg>';

  var etat = null; // { champs: {chemin: texte brut}, elements: [...], barre }

  function idTuto() {
    var parties = location.pathname.replace(/index\.html$/, "").split("/").filter(Boolean);
    return parties[parties.length - 1] || "";
  }

  function appeler(methode, chemin, corps) {
    return fetch(API + chemin, {
      method: methode,
      headers: corps ? { "Content-Type": "application/json" } : {},
      body: corps ? JSON.stringify(corps) : undefined,
    }).then(function (reponse) {
      return reponse.json().then(function (donnees) {
        if (!reponse.ok) throw new Error(donnees.erreur || "erreur " + reponse.status);
        return donnees;
      });
    });
  }

  function changements() {
    var resultat = {};
    etat.elements.forEach(function (el) {
      var chemin = el.getAttribute("data-champ");
      var texte = el.textContent.replace(/\s+/g, " ").trim();
      if (texte !== etat.champs[chemin]) resultat[chemin] = texte;
    });
    return resultat;
  }

  function message(texte, type) {
    var zone = etat.barre.querySelector(".millo-editeur-message");
    zone.textContent = texte;
    zone.className = "millo-editeur-message" + (type ? " millo-editeur-" + type : "");
  }

  function compter() {
    var n = Object.keys(changements()).length;
    etat.elements.forEach(function (el) {
      var texte = el.textContent.replace(/\s+/g, " ").trim();
      el.classList.toggle("millo-modifie", texte !== etat.champs[el.getAttribute("data-champ")]);
    });
    message(n ? n + " texte(s) modifié(s)" : "Cliquez sur un texte encadré pour le modifier.");
    etat.barre.querySelector(".millo-enregistrer").disabled = n === 0;
  }

  function quitter() {
    etat.elements.forEach(function (el) {
      el.innerHTML = el.dataset.milloHtml;
      delete el.dataset.milloHtml;
      el.removeAttribute("contenteditable");
      el.classList.remove("millo-edition", "millo-modifie");
    });
    etat.barre.remove();
    document.body.classList.remove("millo-mode-edition");
    window.removeEventListener("beforeunload", avertir);
    etat = null;
  }

  function avertir(evenement) {
    if (etat && Object.keys(changements()).length) {
      evenement.preventDefault();
      evenement.returnValue = "";
    }
  }

  function enregistrer() {
    var champs = changements();
    var boutons = etat.barre.querySelectorAll("button");
    boutons.forEach(function (b) { b.disabled = true; });
    message("Enregistrement du YAML et régénération de la page…");
    appeler("POST", "/tuto/" + idTuto(), { champs: champs })
      .then(function (reponse) {
        message(reponse.message + " Rechargement…", "succes");
        window.removeEventListener("beforeunload", avertir);
        // zensical serve reconstruit la page : laisser le temps puis recharger
        setTimeout(function () { location.reload(); }, 2500);
      })
      .catch(function (erreur) {
        message(erreur.message, "erreur");
        boutons.forEach(function (b) { b.disabled = false; });
      });
  }

  function entrer(article) {
    appeler("GET", "/tuto/" + idTuto())
      .then(function (reponse) {
        var elements = Array.prototype.filter.call(
          article.querySelectorAll("[data-champ]"),
          function (el) { return el.getAttribute("data-champ") in reponse.champs; }
        );
        var barre = document.createElement("div");
        barre.className = "millo-editeur-barre";
        barre.innerHTML =
          '<span class="millo-editeur-fichier"></span>' +
          '<span class="millo-editeur-message"></span>' +
          '<button type="button" class="millo-annuler">Annuler</button>' +
          '<button type="button" class="millo-enregistrer">Enregistrer</button>';
        barre.querySelector(".millo-editeur-fichier").textContent = reponse.fichier;
        document.body.appendChild(barre);
        document.body.classList.add("millo-mode-edition");
        etat = { champs: reponse.champs, elements: elements, barre: barre };

        elements.forEach(function (el) {
          el.dataset.milloHtml = el.innerHTML;
          el.textContent = reponse.champs[el.getAttribute("data-champ")];
          el.setAttribute("contenteditable", "plaintext-only");
          el.setAttribute("spellcheck", "true");
          el.classList.add("millo-edition");
          el.addEventListener("input", compter);
          el.addEventListener("keydown", function (evenement) {
            if (evenement.key === "Enter") { evenement.preventDefault(); el.blur(); } // une ligne
            if (evenement.key === "Escape") el.blur();
          });
        });
        barre.querySelector(".millo-annuler").addEventListener("click", function () {
          if (!Object.keys(changements()).length || confirm("Abandonner les modifications ?")) quitter();
        });
        barre.querySelector(".millo-enregistrer").addEventListener("click", enregistrer);
        window.addEventListener("beforeunload", avertir);
        compter();
      })
      .catch(function (erreur) { alert("Éditeur : " + erreur.message); });
  }

  function ajouterBouton() {
    if (etat) quitter(); // navigation vers une autre page
    var article = document.querySelector("article.md-content__inner");
    if (!article || article.querySelector(".millo-modifier")) return;
    if (!article.querySelector("[data-champ]")) return; // page générée avant l'éditeur

    var bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "md-content__button md-icon millo-modifier";
    bouton.title = "Modifier les textes de ce tutoriel";
    bouton.innerHTML = ICONE + "<span>Modifier</span>";
    bouton.addEventListener("click", function () {
      if (!etat) entrer(article);
    });
    article.insertBefore(bouton, article.firstChild);
  }

  function demarrer() {
    // Le bouton n'est proposé que si le serveur de l'éditeur répond
    appeler("GET", "/etat").then(ajouterBouton).catch(function () {});
  }

  if (!LOCAL) return;
  if (window.document$ && window.document$.subscribe) {
    window.document$.subscribe(demarrer);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", demarrer);
  } else {
    demarrer();
  }
})();
