// index.tsx – si apre premendo ▶ in Scripting, oppure dal "+" del widget
import { Script, Widget, CalendarEvent, Reminder, Dialog } from 'scripting'
import { aggiornaPosizione, calendarioPreferito, inizioGiorno, conLimite, prossimi, GG } from './comune'
import { ProssimoImpegno } from './live_activity'

async function nuovoEvento(giorno: number) {
  // Scheda di Apple per il nuovo evento, già sul giorno scelto e sul calendario verde
  const e: any = new CalendarEvent()
  const cal = await calendarioPreferito()
  if (cal) e.calendar = cal
  const ora = new Date()
  let inizio: Date
  if (giorno === 0) { inizio = new Date(ora); inizio.setMinutes(0, 0, 0); inizio.setHours(inizio.getHours() + 1) }
  else { inizio = inizioGiorno(ora, giorno); inizio.setHours(9) }
  e.title = ''
  e.startDate = inizio
  e.endDate = new Date(inizio.getTime() + 60 * 60 * 1000)
  await e.presentEditView()
  Widget.reloadAll()
}

// Avvia il conto alla rovescia del prossimo impegno (schermata di blocco e Dynamic Island)
async function segui() {
  const [e] = await prossimi(1)
  if (!e) { await Dialog.alert({ title: 'Calendario', message: 'Nessun impegno in vista' }); return }
  const d = new Date(e.inizio)
  const ok = await ProssimoImpegno().start(
    { titolo: e.titolo, inizio: e.inizio, fine: e.fine, luogo: e.luogo, colore: e.colore, giorno: GG[d.getDay()].toUpperCase(), numero: String(d.getDate()) },
    { staleDate: e.fine }
  )
  if (!ok) await Dialog.alert({ title: 'Calendario', message: 'Non sono riuscito ad avviare il conto alla rovescia' })
}

async function main() {
  const q: any = (Script as any).queryParameters || {}
  if (q.azione === 'nuovo') {
    try { await (Script as any).requestAccess(['calendar']) } catch (e) { }
    try { await nuovoEvento(parseInt(q.giorno || '0', 10) || 0) }
    catch (e) { await Dialog.alert({ title: 'Nuovo evento', message: String(e) }) }
    Script.exit()
    return
  }

  if (q.azione === 'segui') {
    try { await (Script as any).requestAccess(['calendar']) } catch (e) { }
    try { await segui() } catch (e) { await Dialog.alert({ title: 'Conto alla rovescia', message: String(e) }) }
    Script.exit()
    return
  }

  // Permessi dello script: calendario, promemoria, posizione (per il meteo). Nel widget non si possono chiedere.
  try { await (Script as any).requestAccess(['calendar', 'reminders', 'location']) } catch (e) { }
  await conLimite(CalendarEvent.getAll(new Date(), new Date(Date.now() + 86400000)), 8000)
  await conLimite(Reminder.getIncompletes({}), 8000)
  await conLimite(aggiornaPosizione(), 8000)
  Widget.reloadAll()

  try {
    await Widget.preview({ family: 'systemMedium', parameters: { options: { 'Medio 2': JSON.stringify('2'), 'Medio 1': JSON.stringify('1'), 'Medio 3': JSON.stringify('3') }, default: 'Medio 2' } })
    await Widget.preview({ family: 'systemLarge', parameters: { options: { 'Grande 4': JSON.stringify('4'), 'Grande 5': JSON.stringify('5') }, default: 'Grande 4' } })
  } catch (e) {
    await Dialog.alert({ title: 'Anteprima non riuscita', message: String(e) })
  }
  Script.exit()
}

main()
