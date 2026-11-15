import { Widget } from "scripting"
// Funzioni in comune del widget "Da fare" (widget, tasti, pannello)
// Nota: Storage è globale in Scripting, non si importa.

export const NOME = "DaFare"
export const APRI_LISTA = "scripting://run_single/DaFare"
const FILE = "todo-widget.json"

// Memoria condivisa tra widget, tasti e app ({ shared: true }), sempre come testo
export function leggi(k: string): string | null {
  try { const v = Storage.get<string>(k, { shared: true } as any); if (v != null && v !== "") return v } catch (e) { }
  try { const v = Storage.get<string>(k); if (v != null && v !== "") return v } catch (e) { }
  return null
}
export function scrivi(k: string, v: string) {
  try { Storage.set(k, v, { shared: true } as any) } catch (e) { }
  try { Storage.set(k, v) } catch (e) { }
}
// indirizzo dei dati: si salva dal pannello o dal link (mai nel codice, il repo è pubblico)
export function urlDati(): string { return (leggi("dafare-url") || "").trim() }

// ogni attesa ha un limite, così il widget non resta bloccato
export function conLimite<T>(p: Promise<T>, ms = 6000, riserva: any = null): Promise<T> {
  return Promise.race([p.catch(() => riserva), new Promise<T>(r => setTimeout(() => r(riserva), ms))])
}
export const pausa = (ms: number) => new Promise(r => setTimeout(r, ms))
export function ricaricaWidget() {
  Widget.reloadAll(); try { (Widget as any).reloadUserWidgets?.() } catch (e) { }
}

export type Voce = { id: string, tipo: string, testo: string, dettaglio?: string, da?: string }
export type Appuntamento = { quando?: string, ora?: string, testo: string }
export type Dati = { aggiornato?: string, fonte?: string, giorno?: string, esempio?: boolean, appuntamenti?: Appuntamento[], voci?: Voce[] }

// legge i dati (dal gist: il file JSON è dentro "files"); se manca la rete usa l'ultima copia salvata
export async function carica(): Promise<Dati | null> {
  const url = urlDati()
  if (url) {
    const d = await conLimite((async () => {
      const r = await fetch(url, { cache: "no-store", headers: { Accept: "application/vnd.github+json" } } as any)
      if (!r.ok) throw new Error(String(r.status))
      const j: any = await r.json()
      return (j && j.files && j.files[FILE]) ? JSON.parse(j.files[FILE].content) : j
    })())
    if (d) { scrivi("dafare-dati", JSON.stringify(d)); return d as Dati }
  }
  try { const s = leggi("dafare-dati"); return s ? JSON.parse(s) : null } catch (e) { return null }
}

// ---------- voci spuntate ----------
export function fatti(): Record<string, boolean> {
  try { return JSON.parse(leggi("dafare-fatti") || "{}") } catch (e) { return {} }
}
export function cambiaFatto(id: string) {
  const f = fatti()
  if (f[id]) delete f[id]; else f[id] = true
  scrivi("dafare-fatti", JSON.stringify(f))
}
// tiene solo le spunte delle voci ancora presenti nell'ultimo recap
export function pulisci(d: Dati | null) {
  if (!d || !Array.isArray(d.voci)) return
  const ids = new Set(d.voci.map(v => v.id))
  const f = fatti(); let cambiato = false
  for (const k of Object.keys(f)) if (!ids.has(k)) { delete f[k]; cambiato = true }
  if (cambiato) scrivi("dafare-fatti", JSON.stringify(f))
}

// ---------- tipi di voce ----------
export const TIPI: any = {
  urgente:     { nome: 'Urgente',          icona: 'exclamationmark.circle.fill', colore: { light: '#C62828', dark: '#FF6961' } },
  magazzino:   { nome: 'Avvisa magazzino', icona: 'shippingbox.fill',            colore: { light: '#C25E00', dark: '#FFB340' } },
  ordinare:    { nome: 'Da ordinare',      icona: 'cart.fill',                   colore: { light: '#6A3FB5', dark: '#BF9BFF' } },
  ordini:      { nome: 'Ordini',           icona: 'doc.text.fill',               colore: { light: '#6A3FB5', dark: '#BF9BFF' } },
  controllare: { nome: 'Da controllare',   icona: 'eurosign.circle.fill',        colore: { light: '#8A6D00', dark: '#FFD60A' } },
  rispondere:  { nome: 'Da fare',          icona: 'envelope.fill',               colore: { light: '#0F5BB5', dark: '#64A8FF' } },
  seguire:     { nome: 'Da seguire',       icona: 'hourglass',                   colore: { light: '#5B6675', dark: '#A1ABBA' } },
}
export const ORDINE = ['urgente', 'magazzino', 'ordinare', 'ordini', 'controllare', 'rispondere', 'seguire']
export function tipoDi(v: Voce) { return TIPI[v.tipo] ? v.tipo : 'rispondere' }
export function tipo(v: Voce) { return TIPI[tipoDi(v)] }
export function ordina(voci: Voce[] = []) {
  return [...voci].sort((a, b) => {
    const t = ORDINE.indexOf(tipoDi(a)) - ORDINE.indexOf(tipoDi(b))
    return t || (a.da || '9').localeCompare(b.da || '9')   // a parità di tipo, le più vecchie prima
  })
}

// ---------- date ----------
export const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
function pd(s: string) { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d) }
export function gg(s: string) { const o = new Date(); o.setHours(0, 0, 0, 0); return Math.round((pd(s).getTime() - o.getTime()) / 86400000) }
export function aperto(da?: string) {
  if (!da || !/^\d{4}-\d{2}-\d{2}/.test(da)) return ''
  const n = -gg(da)
  if (n <= 0) return 'nuovo'
  return n === 1 ? 'da 1 giorno' : `da ${n} giorni`
}
export function agg(iso?: string) {
  if (!iso) return ''
  const x = new Date(iso)
  if (isNaN(x.getTime())) return ''
  const hh = `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`
  return x.toDateString() === new Date().toDateString() ? hh : `${x.getDate()} ${MESI[x.getMonth()]}`
}
export function quandoApp(a: Appuntamento) {
  let g = a.quando || ''
  if (/^\d{4}-\d{2}-\d{2}/.test(g)) { const n = gg(g); g = n === 0 ? 'oggi' : n === 1 ? 'domani' : `${pd(g).getDate()} ${MESI[pd(g).getMonth()]}` }
  return [g, a.ora].filter(Boolean).join(' ')
}
