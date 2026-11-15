// comune.tsx – dati condivisi tra widget, pulsanti, Live Activity e app
// Storage, CalendarEvent, Calendar, Reminder, Weather e Location sono globali in Scripting (non si importano)

export const NOME_SCRIPT = 'Calendario'
export const CALENDARIO_PREFERITO = 'Calendario' // il calendario verde che vedi anche su Outlook

export const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
export const GG = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
export const G1 = ['D', 'L', 'M', 'M', 'G', 'V', 'S']
export const MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']
export const MM = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']

// Non aspetta mai più di qualche secondo: se un permesso manca o un servizio non risponde, il widget si disegna lo stesso
export function conLimite<T>(p: Promise<T>, ms = 4000, riserva: any = null): Promise<T> {
  return Promise.race([p.catch(() => riserva), new Promise<T>(r => setTimeout(() => r(riserva), ms))])
}

export function inizioGiorno(d: Date, piu = 0) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() + piu); return x }
export function chiave(d: Date) { return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` }
export function hhmm(d: Date) { return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

// ---------- stato dei pulsanti (giorno scelto, impegno scelto, vista) ----------
export type Stato = { data: string, giorno: number, evento: number, sel: number }
// Lo stato sta nello spazio condiviso di Scripting e come testo: così il pulsante del widget (che gira a parte)
// e il widget leggono sicuramente lo stesso valore.
const CHIAVE_STATO = 'calendario-stato'
export function leggiStato(): Stato {
  const oggi = chiave(new Date())
  let s: Stato | null = null
  try { const r = Storage.get<string>(CHIAVE_STATO, { shared: true } as any); s = r ? JSON.parse(r) : null } catch (e) { }
  if (!s || s.data !== oggi) return { data: oggi, giorno: 0, evento: 0, sel: 0 } // ogni giorno si riparte da oggi
  return s
}
export function salvaStato(s: Stato) {
  try { Storage.set(CHIAVE_STATO, JSON.stringify({ ...s, data: chiave(new Date()) }), { shared: true } as any) } catch (e) { }
}
// Storage scrive in background: si aspetta un attimo prima di ridisegnare il widget
export const pausa = (ms: number) => new Promise(r => setTimeout(r, ms))

// ---------- eventi ----------
export type Ev = { id: string, titolo: string, inizio: number, fine: number, tuttoIlGiorno: boolean, luogo: string, colore: string }
function colore(e: any) { const c = e?.calendar?.color; return typeof c === 'string' && c.length ? c : 'systemRed' }
// Molti impegni sono "tutto il giorno" con l'orario scritto nel titolo (es. "Ore 12:00 dentista", "cartoni ore 10.00"):
// se nel titolo c'è un orario, l'impegno diventa a quell'ora (durata 1 ora) e l'orario si toglie dal titolo.
const ORA_NEL_TITOLO = /(?:\bore\s*)?\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/i
function conv(e: any): Ev {
  let titolo: string = (e.title || 'Evento').trim()
  let inizio = new Date(e.startDate).getTime(), fine = new Date(e.endDate).getTime()
  let tutto = !!e.isAllDay
  if (tutto) {
    const m = titolo.match(ORA_NEL_TITOLO)
    if (m) {
      const d = new Date(e.startDate); d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0)
      inizio = d.getTime(); fine = inizio + 60 * 60 * 1000; tutto = false
      titolo = titolo.replace(m[0], ' ').replace(/\s+/g, ' ').trim() || 'Evento'
    }
  }
  return { id: e.identifier || '', titolo, inizio, fine, tuttoIlGiorno: tutto, luogo: e.location || '', colore: colore(e) }
}
export async function eventiTra(da: Date, a: Date): Promise<Ev[] | null> {
  try {
    const l: any[] | null = await conLimite(CalendarEvent.getAll(da, a))
    if (!l) return null
    return l.map(conv).sort((x, y) => x.inizio - y.inizio)
  } catch (e) { return null }
}
export async function prossimi(n = 6): Promise<Ev[]> {
  const ora = Date.now()
  const l = await eventiTra(new Date(), inizioGiorno(new Date(), 8))
  return (l || []).filter(e => e.fine > ora).slice(0, n) // anche quelli di tutto il giorno
}

// ---------- promemoria ----------
export type Prom = { id: string, titolo: string, fatto: boolean }
export async function promemoria(n = 3): Promise<Prom[]> {
  try {
    const l: any[] = (await conLimite(Reminder.getIncompletes({ endDate: inizioGiorno(new Date(), 1) }))) || []
    return l.slice(0, n).map(r => ({ id: r.identifier, titolo: r.title, fatto: !!r.isCompleted }))
  } catch (e) { return [] }
}

// ---------- meteo (tenuto in memoria 30 minuti) ----------
export type Meteo = { temp: number, icona: string, testo: string, max: number, min: number,
  ore: { h: number, t: number, icona: string }[], giorni: { k: string, max: number, min: number, icona: string }[] }
const COND: Record<string, string> = {
  clear: 'Sereno', mostlyClear: 'Quasi sereno', partlyCloudy: 'Poco nuvoloso', mostlyCloudy: 'Nuvoloso', cloudy: 'Coperto',
  rain: 'Pioggia', drizzle: 'Pioviggine', heavyRain: 'Pioggia forte', foggy: 'Nebbia', haze: 'Foschia', windy: 'Vento',
  snow: 'Neve', thunderstorms: 'Temporali', scatteredThunderstorms: 'Temporali sparsi', sleet: 'Nevischio', breezy: 'Ventilato',
}
function num(x: any): number {
  if (typeof x === 'number') return x
  if (x && typeof x.value === 'number') return x.value
  const f = parseFloat(String(x?.formatted ?? x ?? '').replace(',', '.'))
  return isNaN(f) ? 0 : f
}
export async function meteo(): Promise<Meteo | null> {
  const cache = Storage.get<{ t: number, m: Meteo }>('meteo')
  if (cache && Date.now() - cache.t < 30 * 60 * 1000) return cache.m
  try {
    const pos = Storage.get<{ latitude: number, longitude: number }>('posizione')
    if (!pos) return null // la posizione si salva aprendo lo script (▶)
    const loc: any = { latitude: pos.latitude, longitude: pos.longitude, timestamp: Date.now() }
    const ora = new Date()
    const [c, h, d]: any[] = await conLimite(Promise.all([
      Weather.requestCurrent(loc),
      Weather.requestHourlyForecast(loc, { startDate: inizioGiorno(ora), endDate: inizioGiorno(ora, 1) }),
      Weather.requestDailyForecast(loc, { startDate: inizioGiorno(ora, -6), endDate: inizioGiorno(ora, 8) }),
    ]), 6000, [null, null, null])
    if (!c) return cache ? cache.m : null
    const giorni = (d?.forecast || []).map((x: any) => ({ k: chiave(new Date(x.date)), max: Math.round(num(x.highTemperature)), min: Math.round(num(x.lowTemperature)), icona: x.symbolName || 'cloud' }))
    const oggi = giorni.find((g: any) => g.k === chiave(ora))
    const m: Meteo = {
      temp: Math.round(num(c.temperature)), icona: c.symbolName || 'cloud', testo: COND[c.condition] || '',
      max: oggi ? oggi.max : Math.round(num(c.temperature)), min: oggi ? oggi.min : Math.round(num(c.temperature)),
      ore: (h?.forecast || []).map((x: any) => ({ h: new Date(x.date).getHours(), t: Math.round(num(x.temperature)), icona: x.symbolName || 'cloud' })),
      giorni,
    }
    Storage.set('meteo', { t: Date.now(), m })
    return m
  } catch (e) { return cache ? cache.m : null }
}

// Chiamata dall'app: salva la posizione per il meteo
export async function aggiornaPosizione() {
  try {
    const p = await Location.requestCurrent({ forceRequest: true })
    if (p) { Storage.set('posizione', { latitude: p.latitude, longitude: p.longitude }); Storage.remove('meteo') }
  } catch (e) { }
}

export async function calendarioPreferito(): Promise<any> {
  try {
    const l: any[] = (await conLimite(Calendar.forEvents())) || []
    return l.find(c => c.title === CALENDARIO_PREFERITO && c.allowsContentModifications) || await Calendar.defaultForEvents()
  } catch (e) { return null }
}
