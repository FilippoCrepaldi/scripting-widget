// Tasto del widget: segna / toglie la spunta a una voce
// I parametri sono sempre oggetti con un valore: SegnaFatto({ id: "..." })
import { AppIntentManager, AppIntentProtocol } from "scripting"
import { cambiaFatto, pausa, ricaricaWidget, scrivi } from "./comune"

export const SegnaFatto = AppIntentManager.register({
  name: "SegnaFatto",
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ id }: { id: string }) => {
    cambiaFatto(id)
    scrivi("dafare-tocco", new Date().toLocaleTimeString("it-IT"))   // prova che il tasto ha funzionato
    await pausa(500)   // la memoria condivisa scrive in background
    ricaricaWidget()
  }
})
