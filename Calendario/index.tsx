// index.tsx – si apre premendo ▶ in Scripting, oppure dal "+" del widget
import { Script, Widget, CalendarEvent, Reminder } from 'scripting'
import { aggiornaPosizione, calendarioPreferito, inizioGiorno } from './comune'

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
    await nuovoEvento(parseInt(q.giorno || '0', 10) || 0)
    Script.exit()
    return
  }

  // Prima volta: chiede i permessi (calendario, promemoria, posizione per il meteo)
  try { await CalendarEvent.getAll(new Date(), new Date(Date.now() + 86400000)) } catch (e) { }
  try { await Reminder.getIncompletes({}) } catch (e) { }
  await aggiornaPosizione()

  Widget.reloadAll()
  const medi = { '1 Ora gigante': JSON.stringify('1'), '2 Conto alla rovescia': JSON.stringify('2'), '3 Striscia': JSON.stringify('3') }
  const grandi = { '4 Cruscotto': JSON.stringify('4'), '5 Settimana': JSON.stringify('5') }
  await Widget.preview({ family: 'systemMedium', parameters: { options: medi, default: '2 Conto alla rovescia' } })
  await Widget.preview({ family: 'systemLarge', parameters: { options: grandi, default: '4 Cruscotto' } })
  await Widget.preview({ family: 'systemSmall' })
  Script.exit()
}

main()
