import { Widget } from "scripting"
// Funzioni in comune del Diario (widget, Salute, Live Activity, Centro di Controllo)
// Nota: Storage e Health sono globali in Scripting, non si importano.

// Memoria condivisa tra widget, tasti e app ({ shared: true }); legge anche la vecchia memoria non condivisa
export function leggi(k: string): string | null {
  try { const v = Storage.get<string>(k, { shared: true } as any); if (v != null && v !== "") return v } catch (e) { }
  try { const v = Storage.get<string>(k); if (v != null && v !== "") return v } catch (e) { }
  return null
}
export function scrivi(k: string, v: string) {
  try { Storage.set(k, v, { shared: true } as any) } catch (e) { }
  try { Storage.set(k, v) } catch (e) { }
}
// indirizzo dei dati: si inserisce dal pannello dello script (mai nel codice, il repo è pubblico)
export function urlDati(): string { return (leggi("diario-url") || "").trim() }

// ogni attesa ha un limite, così il widget non resta bloccato
export function conLimite<T>(p: Promise<T>, ms = 6000, riserva: any = null): Promise<T> {
  return Promise.race([p.catch(() => riserva), new Promise<T>(r => setTimeout(() => r(riserva), ms))])
}
export const pausa = (ms: number) => new Promise(r => setTimeout(r, ms))
export function ricaricaWidget() {
  Widget.reloadAll(); try { (Widget as any).reloadUserWidgets?.() } catch (e) { }
}
export const DIARIO = "https://claude.ai/artifact/R63J7V5KsrkgskBTJdKyir"

export type Voce = { k: string, l: string, s: string, u: string, v: number, lo: number, hi: number, tone: string }
export type Pasto = { id: string, ora: string, pasto: string, titolo: string, kcal: number, c: number, p: number, f: number }
export type Slot = { nome: string, ore: string, testo: string, fatto: boolean }
export type Dati = {
  cibo?: { data: string, kcal: number, kcal_obj: number, c: number, p: number, f: number, c_obj: number, p_obj: number, f_obj: number }
  corpo?: Voce[]
  passi?: { data: string, n: number, obiettivo: number }
  pasti?: { data: string, lista: Pasto[] }
  piano?: { nome: string, slots: Slot[] }
  aggiornato?: string
}

export function oggi() {
  const d = new Date(), p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export async function carica(): Promise<Dati | null> {
  const url = urlDati()
  if (url) {
    const d = await conLimite((async () => {
      const r = await fetch(url, { cache: "no-store" } as any)
      if (!r.ok) throw new Error(String(r.status))
      return await r.json() as Dati
    })())
    if (d) { scrivi("diario-widget", JSON.stringify(d)); return d }
  }
  try { const s = leggi("diario-widget"); return s ? JSON.parse(s) : null } catch (e) { return null }
}

// ---------- prossimo pasto del piano ----------
function oreFine(ore: string) { const m = String(ore).match(/(\d+)\D+(\d+)/); return m ? +m[2] : 24 }
function oreInizio(ore: string) { const m = String(ore).match(/(\d+)/); return m ? +m[1] : 0 }
export function prossimoPasto(d: Dati) {
  const slots = d.piano?.slots || []
  const fatti = new Set((d.pasti?.data === oggi() ? d.pasti.lista : []).map(p => p.pasto))
  const h = new Date().getHours()
  const s = slots.find(x => !fatti.has(x.nome) && oreFine(x.ore) > h)
  const kcal = d.cibo && d.cibo.data === oggi() ? d.cibo.kcal_obj - d.cibo.kcal : (d.cibo?.kcal_obj || 0)
  if (!s) return { pasto: "Giornata finita", ore: "", testo: "Tutti i pasti del piano sono passati.", inizio: 0, kcal_rimaste: kcal }
  return { pasto: s.nome, ore: s.ore, testo: s.testo, inizio: oreInizio(s.ore), kcal_rimaste: kcal }
}

// ---------- pasti nell'app Salute ----------
// Scrive in Salute i pasti di oggi non ancora scritti (kcal, carboidrati, proteine, grassi).
export async function salvaInSalute(d?: Dati | null): Promise<string> {
  if (!Health.isHealthDataAvailable) return "Salute non è disponibile su questo telefono."
  d = d || await carica()
  if (!d?.pasti || d.pasti.data !== oggi()) return "Nessun pasto di oggi da scrivere."
  let fatti: Record<string, string[]> = {}
  try { fatti = JSON.parse(leggi("salute-scritti") || "{}") } catch (e) {}
  const giaScritti = new Set(fatti[oggi()] || [])
  const nuovi = d.pasti.lista.filter(p => p.id && !giaScritti.has(p.id) && p.kcal > 0)
  if (!nuovi.length) return "In Salute è già tutto aggiornato."
  const kcal = HealthUnit.kilocalorie(), g = HealthUnit.gram()
  for (const p of nuovi) {
    const [hh, mm] = (p.ora || "12:00").split(":").map(Number)
    const quando = new Date(); quando.setHours(hh || 12, mm || 0, 0, 0)
    const voci: [string, number, any][] = [["dietaryEnergyConsumed", p.kcal, kcal], ["dietaryCarbohydrates", p.c, g], ["dietaryProtein", p.p, g], ["dietaryFatTotal", p.f, g]]
    const campioni = voci.filter(([, v]) => v > 0).map(([type, value, unit]) =>
      HealthQuantitySample.create({ type: type as any, value, unit, startDate: quando, endDate: quando } as any))
    await conLimite(Promise.all(campioni.filter(Boolean).map(c => Health.saveQuantitySample(c as any))), 8000)
    giaScritti.add(p.id)
  }
  fatti = { [oggi()]: [...giaScritti] }   // tengo solo oggi
  scrivi("salute-scritti", JSON.stringify(fatti))
  return `Scritti in Salute ${nuovi.length} ${nuovi.length === 1 ? "pasto" : "pasti"}.`
}
