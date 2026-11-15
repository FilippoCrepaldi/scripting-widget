// Azioni dei pulsanti (widget e Centro di Controllo)
import { AppIntentManager, AppIntentProtocol, Widget } from "scripting"
import { carica, salvaInSalute } from "./comune"

// Aggiorna i widget e scrive in Salute i pasti nuovi
export const AggiornaDiario = AppIntentManager.register({
  name: "AggiornaDiario",
  protocol: AppIntentProtocol.AppIntent,
  perform: async (_: undefined) => {
    const d = await carica()
    try { await salvaInSalute(d) } catch (e) { console.log("Salute: " + e) }
    Widget.reloadAll()
  }
})
