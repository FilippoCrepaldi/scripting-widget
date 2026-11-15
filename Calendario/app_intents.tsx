// app_intents.tsx – le azioni dei pulsanti (widget, Centro di Controllo)
import { AppIntentManager, AppIntentProtocol, Widget, ControlWidget, Storage, Reminder, LiveActivity } from 'scripting'
import { leggiStato, salvaStato, prossimi, GG } from './comune'
import { ProssimoImpegno } from './live_activity'

// ‹ › cambia giorno (0 = torna a oggi)
export const CambiaGiorno = AppIntentManager.register({
  name: 'CambiaGiorno',
  protocol: AppIntentProtocol.AppIntent,
  perform: async (delta: number) => {
    const s = leggiStato()
    s.giorno = delta === 0 ? 0 : Math.max(-30, Math.min(60, s.giorno + delta))
    salvaStato(s)
    Widget.reloadAll()
  },
})

// ‹ › passa all'impegno precedente o successivo
export const CambiaEvento = AppIntentManager.register({
  name: 'CambiaEvento',
  protocol: AppIntentProtocol.AppIntent,
  perform: async (delta: number) => {
    const s = leggiStato()
    s.evento = Math.max(0, Math.min(5, s.evento + delta))
    salvaStato(s)
    Widget.reloadAll()
  },
})

// Tocco su un giorno della settimana
export const ScegliGiorno = AppIntentManager.register({
  name: 'ScegliGiorno',
  protocol: AppIntentProtocol.AppIntent,
  perform: async (offset: number) => {
    const s = leggiStato()
    s.sel = offset
    salvaStato(s)
    Widget.reloadAll()
  },
})

// Spunta un promemoria
export const Completa = AppIntentManager.register({
  name: 'Completa',
  protocol: AppIntentProtocol.AppIntent,
  perform: async (id: string) => {
    try {
      const r: any = await Reminder.get(id)
      if (r) { r.isCompleted = !r.isCompleted; await r.save() }
    } catch (e) { }
    Widget.reloadAll()
  },
})

// Avvia il conto alla rovescia del prossimo impegno (schermata di blocco + Dynamic Island)
export const SeguiImpegno = AppIntentManager.register({
  name: 'SeguiImpegno',
  protocol: AppIntentProtocol.LiveActivityIntent,
  perform: async (_: undefined) => {
    const [e] = await prossimi(1)
    if (!e) return
    await chiudiPrecedente()
    const d = new Date(e.inizio)
    const a = ProssimoImpegno()
    const ok = await a.start(
      { titolo: e.titolo, inizio: e.inizio, fine: e.fine, luogo: e.luogo, colore: e.colore, giorno: GG[d.getDay()].toUpperCase(), numero: String(d.getDate()) },
      { staleDate: e.fine }
    )
    if (ok) {
      try {
        const ids = await LiveActivity.getAllActivitiesIds()
        Storage.set('liveActivity', { id: ids[ids.length - 1], stato: { titolo: e.titolo, inizio: e.inizio, fine: e.fine, luogo: e.luogo, colore: e.colore, giorno: GG[d.getDay()].toUpperCase(), numero: String(d.getDate()) } })
      } catch (err) { }
    }
    Widget.reloadAll()
  },
})

// Chiude il conto alla rovescia
export const FermaImpegno = AppIntentManager.register({
  name: 'FermaImpegno',
  protocol: AppIntentProtocol.LiveActivityIntent,
  perform: async (_: undefined) => {
    await chiudiPrecedente()
    Widget.reloadAll()
  },
})

async function chiudiPrecedente() {
  const la = Storage.get<{ id: string, stato: any }>('liveActivity')
  if (!la || !la.id) return
  try {
    const a: any = LiveActivity.from(la.id, 'ProssimoImpegno')
    if (a) await a.end(la.stato, { dismissTimeInterval: 0 })
  } catch (e) { }
  Storage.remove('liveActivity')
}

// Usato dal pulsante del Centro di Controllo per aggiornare anche i widget
export const AggiornaTutto = AppIntentManager.register({
  name: 'AggiornaTutto',
  protocol: AppIntentProtocol.AppIntent,
  perform: async (_: undefined) => {
    Storage.remove('meteo')
    Widget.reloadAll()
    ControlWidget.reloadButtons()
  },
})
