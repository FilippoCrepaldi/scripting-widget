# scripting-widget

Script per l'app [Scripting](https://apps.apple.com/app/id6479691128) (iPhone e Mac). Una cartella per ogni script:

- `Diario/` – widget del Diario Alimentare (cibo, corpo, cuore, movimento), pasti in Apple Salute, Live Activity "Prossimo pasto", pulsante nel Centro di Controllo
- `Calendario/` – ora con i secondi, data, meteo e impegni: 5 widget (Parameter 1–5) con pulsanti ‹ › e +, schermata di blocco, Live Activity "Prossimo impegno", pulsante nel Centro di Controllo
- `DaFare/` – widget delle cose da fare, con riquadri-filtro per tipo; le voci spuntate vanno nel file `todo-fatti.json` del gist (serve un token GitHub "Gists" salvato dal pannello), così il riepilogo non le ripropone
- `Acquisti/` – container in arrivo e scorte di materia prima in un solo widget, con tasti per cambiare pagina (Container: Oggi / In viaggio / Spostati e scheda del container; Scorte: calendario a 7 / 14 / 30 giorni). Formati piccolo, medio, grande e pagina intera

Gli indirizzi dei dati non sono nel codice: si inseriscono una volta dal pannello di ogni script (tocca ▶).
