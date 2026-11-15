// Azioni dei pulsanti (widget e Centro di Controllo)
// I parametri sono sempre oggetti con un valore: AggiornaDiario({ motivo: "widget" }). Con "undefined" dal widget l'azione non partiva.
// Nota: qui NON si importa live_activity.tsx (il widget importa questo file).
import { AppIntentManager, AppIntentProtocol } from "scripting"
import { carica, salvaInSalute, pausa, ricaricaWidget, conLimite, scrivi } from "./comune"

// Riscarica i dati del diario, scrive in Salute i pasti nuovi e ridisegna i widget
export const AggiornaDiario = AppIntentManager.register({
  name: "AggiornaDiario",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (_: { motivo?: string }) => {
    scrivi("diario-tocco", new Date().toLocaleTimeString("it-IT"))   // si vede nel pannello: prova che il tasto ha funzionato
    // prima i widget (con un limite di tempo), poi Salute: se Salute si blocca, i widget sono già aggiornati
    const d = await conLimite(carica(), 8000)
    await pausa(500)   // la memoria condivisa scrive in background
    ricaricaWidget()
    try { await conLimite(salvaInSalute(d), 8000) } catch (e) { console.log("Salute: " + e) }
  }
})

// Cambia la scheda a destra del widget Cibo: "macro", "pasti" o "prossimo"
export const CambiaScheda = AppIntentManager.register({
  name: "CambiaScheda",
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ scheda }: { scheda: string }) => {
    scrivi("diario-scheda", scheda)
    await pausa(500)   // la memoria condivisa scrive in background
    ricaricaWidget()
  }
})
