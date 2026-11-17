// Tasti del widget. I parametri sono sempre oggetti con un valore: SegnaFatto({ id: "..." })
import { AppIntentManager, AppIntentProtocol } from "scripting"
import { cambiaFatto, inviaFatti, pausa, ricaricaWidget, scrivi, scriviVista, scriviPagina, pagina } from "./comune"

// segna / toglie la spunta a una voce
export const SegnaFatto = AppIntentManager.register({
  name: "SegnaFatto",
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ id }: { id: string }) => {
    cambiaFatto(id)
    scrivi("dafare-tocco", new Date().toLocaleTimeString("it-IT"))   // prova che il tasto ha funzionato
    await pausa(500)   // la memoria condivisa scrive in background
    ricaricaWidget()
    await inviaFatti()   // rimanda le fatte al gist (se c'è il token)
  }
})

// sceglie il filtro (riquadro); se lo tocchi di nuovo torna a "tutte"
export const CambiaVista = AppIntentManager.register({
  name: "CambiaVista",
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ vista }: { vista: string }) => {
    scriviVista(vista)
    await pausa(500)
    ricaricaWidget()
  }
})

// pagina precedente / successiva (il widget ferma la pagina tra la prima e l'ultima)
export const CambiaPagina = AppIntentManager.register({
  name: "CambiaPagina",
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ delta }: { delta: number }) => {
    scriviPagina(pagina() + delta)
    await pausa(500)
    ricaricaWidget()
  }
})
