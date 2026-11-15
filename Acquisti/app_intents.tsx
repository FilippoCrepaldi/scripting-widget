// app_intents.tsx – azioni dei tasti del widget
// I parametri sono sempre oggetti con un valore: CambiaPagina({ pagina: 's' }), mai un valore semplice.
// Qui non si importa nient'altro che comune.ts (niente Live Activity, niente pannello).
import { AppIntentManager, AppIntentProtocol } from 'scripting'
import { salvaPagina, salvaScheda, salvaAperto, salvaGiorni, scrivi, pausa, ricaricaWidget } from './comune'

// dopo ogni tasto: segna l'ora (prova che il tasto ha funzionato), aspetta che la memoria condivisa scriva, ridisegna
async function fine(cosa: string) {
  scrivi('acquisti-tocco', `${cosa} ${new Date().toLocaleTimeString('it-IT')}`)
  await pausa(500)
  ricaricaWidget()
}

// tasti grandi in alto: Container / Scorte
export const CambiaPagina = AppIntentManager.register({
  name: 'CambiaPagina',
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ pagina }: { pagina: string }) => {
    salvaPagina(pagina === 's' ? 's' : 'c')
    await fine(pagina)
  },
})

// pagina Container: schede Oggi / In viaggio / Spostati (torna alla lista)
export const CambiaScheda = AppIntentManager.register({
  name: 'CambiaScheda',
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ scheda }: { scheda: string }) => {
    salvaScheda(scheda); salvaAperto('')
    await fine(scheda)
  },
})

// pagina Container: apre la scheda di un container ('' = torna alla lista); serve anche per ↑ ↓
export const ApriContainer = AppIntentManager.register({
  name: 'ApriContainer',
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ id }: { id: string }) => {
    salvaAperto(id || '')
    await fine(id || 'lista')
  },
})

// pagina Scorte: 7 / 14 / 30 giorni
export const CambiaGiorni = AppIntentManager.register({
  name: 'CambiaGiorni',
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ giorni }: { giorni: string }) => {
    salvaGiorni(Number(giorni))
    await fine(giorni + 'gg')
  },
})
