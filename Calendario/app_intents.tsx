// app_intents.tsx – le azioni dei pulsanti (widget, Centro di Controllo)
// I parametri sono sempre oggetti ({ delta: 1 }): con un numero semplice l'azione non partiva dal widget.
import { AppIntentManager, AppIntentProtocol, Widget, ControlWidget } from 'scripting'
import { leggiStato, salvaStato, pausa, leggiQuanti } from './comune'
// Nota: qui NON si importa live_activity.tsx (il widget importa questo file e la Live Activity va avviata dall'app)

// ‹ › cambia giorno (0 = torna a oggi)
export const CambiaGiorno = AppIntentManager.register({
  name: 'CambiaGiorno',
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ delta }: { delta: number }) => {
    const s = leggiStato()
    s.giorno = delta === 0 ? 0 : Math.max(-30, Math.min(60, s.giorno + delta))
    salvaStato(s)
    await pausa(500)
    Widget.reloadAll(); try { (Widget as any).reloadUserWidgets?.() } catch (e) { }
  },
})

// ‹ › passa all'impegno precedente o successivo
export const CambiaEvento = AppIntentManager.register({
  name: 'CambiaEvento',
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ delta }: { delta: number }) => {
    const s = leggiStato()
    s.evento = Math.max(0, Math.min(leggiQuanti() - 1, s.evento + delta)) // si ferma all'ultimo impegno
    salvaStato(s)
    await pausa(500)
    Widget.reloadAll(); try { (Widget as any).reloadUserWidgets?.() } catch (e) { }
  },
})

// Tocco su un giorno della settimana
export const ScegliGiorno = AppIntentManager.register({
  name: 'ScegliGiorno',
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ offset }: { offset: number }) => {
    const s = leggiStato()
    s.sel = offset
    s.evento = 0 // nel giorno nuovo si parte dal primo impegno
    salvaStato(s)
    await pausa(500)
    Widget.reloadAll(); try { (Widget as any).reloadUserWidgets?.() } catch (e) { }
  },
})

// Spunta un promemoria
export const Completa = AppIntentManager.register({
  name: 'Completa',
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ id }: { id: string }) => {
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

// ‹ › del widget grande B: settimana precedente o successiva
export const CambiaSettimana = AppIntentManager.register({
  name: 'CambiaSettimana',
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ delta }: { delta: number }) => {
    const s = leggiStato()
    s.sett = Math.max(-4, Math.min(8, (s.sett || 0) + delta))
    s.sel = s.sett * 7 // si sceglie il primo giorno della settimana mostrata
    s.evento = 0
    salvaStato(s)
    await pausa(500)
    Widget.reloadAll(); try { (Widget as any).reloadUserWidgets?.() } catch (e) { }
  },
})

// Tocco sul meteo del widget grande B: passa dagli impegni al meteo e ritorno
export const CambiaVista = AppIntentManager.register({
  name: 'CambiaVista',
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ vista }: { vista: string }) => {
    const s = leggiStato()
    s.vista = vista === 'meteo' ? 'meteo' : 'cal'
    salvaStato(s)
    await pausa(500)
    Widget.reloadAll(); try { (Widget as any).reloadUserWidgets?.() } catch (e) { }
  },
})

// Vista meteo del widget grande B: tocco su un giorno = le sue ore
export const ScegliGiornoMeteo = AppIntentManager.register({
  name: 'ScegliGiornoMeteo',
  protocol: AppIntentProtocol.AppIntent,
  perform: async ({ offset }: { offset: number }) => {
    const s = leggiStato()
    s.giornoMeteo = offset
    salvaStato(s)
    await pausa(500)
    Widget.reloadAll(); try { (Widget as any).reloadUserWidgets?.() } catch (e) { }
  },
})
