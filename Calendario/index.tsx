// index.tsx – si apre premendo ▶ in Scripting, oppure dal "+" del widget
import { Script, Widget, CalendarEvent, Reminder, Dialog } from 'scripting'
import { aggiornaPosizione, calendarioPreferito, inizioGiorno } from './comune'

// Non aspetta mai più di qualche secondo (se un permesso non risponde, le anteprime partono lo stesso)
function conLimite(p: Promise<any>, ms = 6000) {
  return Promise.race([p.catch(() => null), new Promise(r => setTimeout(() => r(null), ms))])
}

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

async function main() {
  const q: any = (Script as any).queryParameters || {}
  if (q.azione === 'nuovo') {
    try { await nuovoEvento(parseInt(q.giorno || '0', 10) || 0) }
    catch (e) { await Dialog.alert({ title: 'Nuovo evento', message: String(e) }) }
    Script.exit()
    return
  }

  // Permessi: calendario, promemoria, posizione per il meteo
  await conLimite(CalendarEvent.getAll(new Date(), new Date(Date.now() + 86400000)))
  await conLimite(Reminder.getIncompletes({}))
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
