// Funzioni in comune del Diario (widget, Salute, Live Activity, Centro di Controllo)
export const DATI_URL = (() => { try { return Storage.get<string>("diario-url") || "" } catch (e) { return "" } })()   // indirizzo dei dati: si inserisce dal pannello dello script
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
  if (!DATI_URL) return null
  try {
    const r = await fetch(DATI_URL)
    if (!r.ok) throw new Error(String(r.status))
    const d = await r.json() as Dati
    try { Storage.set("diario-widget", JSON.stringify(d)) } catch (e) {}
    return d
  } catch (e) {
    try { const s = Storage.get<string>("diario-widget"); return s ? JSON.parse(s) : null } catch (e2) { return null }
  }
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
  try { fatti = JSON.parse(Storage.get<string>("salute-scritti") || "{}") } catch (e) {}
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
    await Promise.all(campioni.filter(Boolean).map(c => Health.saveQuantitySample(c as any)))
    giaScritti.add(p.id)
  }
  fatti = { [oggi()]: [...giaScritti] }   // tengo solo oggi
  try { Storage.set("salute-scritti", JSON.stringify(fatti)) } catch (e) {}
  return `Scritti in Salute ${nuovi.length} ${nuovi.length === 1 ? "pasto" : "pasti"}.`
}
