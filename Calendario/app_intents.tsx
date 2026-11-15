// app_intents.tsx – le azioni dei pulsanti (widget, Centro di Controllo)
import { AppIntentManager, AppIntentProtocol, Widget, ControlWidget } from 'scripting'
import { leggiStato, salvaStato } from './comune'
// Nota: qui NON si importa live_activity.tsx (il widget importa questo file e la Live Activity va avviata dall'app)

// ‹ › cambia giorno (0 = torna a oggi)
export const CambiaGiorno = AppIntentManager.register({
  name: 'CambiaGiorno',
  protocol: AppIntentProtocol.AppIntent,
  perform: async (delta: number) => {
    const s = leggiStato()
    s.giorno = delta === 0 ? 0 : Math.max(-30, Math.min(60, s.giorno + delta))
    salvaStato(s)
    Widget.reloadAll(); try { (Widget as any).reloadUserWidgets?.() } catch (e) { }
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
    Widget.reloadAll(); try { (Widget as any).reloadUserWidgets?.() } catch (e) { }
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
    Widget.reloadAll(); try { (Widget as any).reloadUserWidgets?.() } catch (e) { }
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
    Widget.reloadAll(); try { (Widget as any).reloadUserWidgets?.() } catch (e) { }
  },
})

// Usato dal pulsante del Centro di Controllo per aggiornare anche i widget
export const AggiornaTutto = AppIntentManager.register({
  name: 'AggiornaTutto',
  protocol: AppIntentProtocol.AppIntent,
  perform: async (_: undefined) => {
    Storage.remove('meteo')
    Widget.reloadAll(); try { (Widget as any).reloadUserWidgets?.() } catch (e) { }
    ControlWidget.reloadButtons()
  },
})
