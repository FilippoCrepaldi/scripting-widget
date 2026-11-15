// comune.ts – dati e funzioni in comune tra widget, tasti e pannello dello script "Acquisti"
// Nota: Storage è globale in Scripting, NON si importa (importarlo lo rende vuoto e blocca il widget).
import { Widget } from 'scripting'

export const NOME = 'Acquisti'
export const APRI_PANNELLO = 'scripting://run_single/Acquisti'
const FILE_CONTAINER = 'container-widget.json'
const FILE_SCORTE = 'scorte-widget.json'

// ---------- memoria condivisa tra widget, tasti e app: { shared: true }, sempre come testo ----------
export function leggi(k: string): string | null {
  try { const v = Storage.get<string>(k, { shared: true } as any); if (v != null && v !== '') return v } catch (e) { }
  try { const v = Storage.get<string>(k); if (v != null && v !== '') return v } catch (e) { }
  return null
}
export function scrivi(k: string, v: string) {
  try { Storage.set(k, v, { shared: true } as any) } catch (e) { }
  try { Storage.set(k, v) } catch (e) { }
}
// Storage scrive in background: si aspetta mezzo secondo prima di ridisegnare il widget
export const pausa = (ms: number) => new Promise(r => setTimeout(r, ms))
export function ricaricaWidget() {
  Widget.reloadAll(); try { (Widget as any).reloadUserWidgets?.() } catch (e) { }
}
// ogni attesa ha un limite, così il widget non resta mai bloccato
export function conLimite<T>(p: Promise<T>, ms = 6000, riserva: any = null): Promise<T> {
  return Promise.race([p.catch(() => riserva), new Promise<T>(r => setTimeout(() => r(riserva), ms))])
}

// ---------- pagina scelta con i tasti: 'c' container, 's' scorte ----------
export type Pagina = 'c' | 's'
export function leggiPagina(): Pagina { return leggi('acquisti-pagina') === 's' ? 's' : 'c' }
export function salvaPagina(p: Pagina) { scrivi('acquisti-pagina', p) }

// ---------- scelte dentro le pagine ----------
// Container: scheda 'oggi' | 'viaggio' | 'spostati'; container aperto ('' = si vede la lista)
export type Scheda = 'oggi' | 'viaggio' | 'spostati'
export function leggiScheda(): Scheda { const v = leggi('acquisti-scheda'); return v === 'oggi' || v === 'spostati' ? v : 'viaggio' }
export function salvaScheda(v: string) { scrivi('acquisti-scheda', v === 'oggi' || v === 'spostati' ? v : 'viaggio') }
export function leggiAperto(): string { const v = leggi('acquisti-aperto'); return v && v !== '-' ? v : '' }
export function salvaAperto(id: string) { scrivi('acquisti-aperto', id || '-') } // '-' = nessuno (Storage non tiene il testo vuoto)
// Scorte: quanti giorni avanti guardare (7, 14 o 30)
export function leggiGiorni(): number { const v = Number(leggi('acquisti-giorni')); return v === 7 || v === 30 ? v : 14 }
export function salvaGiorni(v: number) { scrivi('acquisti-giorni', String(v === 7 || v === 30 ? v : 14)) }

// ---------- dati ----------
export type Arrivo = { container: string, fornitore?: string, prodotto?: string, proforma?: string, eta: string, porto?: string, etaSpostata?: boolean, etaPrima?: string }
export type DatiContainer = {
  aggiornato?: string, inViaggio?: number, stato?: string, etichetta?: string, titolo?: string, azione?: string,
  nota?: string, prossimo?: string, arrivi?: Arrivo[]
}
export type VoceScorta = { nome: string, finisce?: string, entro?: string | null, ora?: boolean, stato?: string, qta?: number | null, udm?: string, fornitore?: string }
export type InArrivo = { nome: string, da?: string, quando?: string }
export type DatiScorte = {
  aggiornato?: string, controllo?: string, totale?: number, daOrdinare?: number, aBreve?: number, inArrivo?: number, coperte?: number,
  voci?: VoceScorta[], giaInArrivo?: InArrivo[]
}
export type Dati = { container: DatiContainer | null, scorte: DatiScorte | null, preso?: number }

// indirizzo dei dati: si salva dal pannello o dal link (mai nel codice: il repo è pubblico)
export function urlDati(): string { return (leggi('acquisti-url') || '').trim() }

function memoria(): Dati | null { try { const s = leggi('acquisti-dati'); return s ? JSON.parse(s) : null } catch (e) { return null } }

// Legge i due file dal gist. Indirizzo consigliato: quello "raw"
//   https://gist.githubusercontent.com/<utente>/<id>/raw/   (nessun limite di letture)
// Va bene anche l'indirizzo dell'API (https://api.github.com/gists/<id>), che però ha il limite di 60 letture all'ora.
// Se i dati sono stati presi da meno di 10 minuti usa la copia salvata: così i tasti cambiano pagina subito.
async function leggiFile(base: string, file: string): Promise<any> {
  return conLimite((async () => {
    const r = await fetch(base + file, { cache: 'no-store' } as any)
    if (!r.ok) throw new Error(String(r.status))
    return JSON.parse(await r.text())
  })())
}
export async function carica(forza = false): Promise<Dati | null> {
  const vecchi = memoria()
  if (!forza && vecchi && vecchi.preso && Date.now() - vecchi.preso < 10 * 60 * 1000) return vecchi
  const url = urlDati()
  let d: Dati | null = null
  if (url.includes('gist.githubusercontent.com')) {
    const base = url.split('/raw')[0].replace(/\/+$/, '') + '/raw/'
    const [c, s] = await Promise.all([leggiFile(base, FILE_CONTAINER), leggiFile(base, FILE_SCORTE)])
    d = { container: c, scorte: s, preso: Date.now() }
  } else if (url) {
    const j: any = await conLimite((async () => {
      const r = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/vnd.github+json' } } as any)
      if (!r.ok) throw new Error(String(r.status))
      return await r.json()
    })())
    if (j && j.files) {
      const parse = (f: string) => { try { return j.files[f] ? JSON.parse(j.files[f].content) : null } catch (e) { return null } }
      d = { container: parse(FILE_CONTAINER), scorte: parse(FILE_SCORTE), preso: Date.now() }
    }
  }
  if (d && (d.container || d.scorte)) {
    // se uno dei due file non arriva, tiene quello vecchio
    if (!d.container && vecchi) d.container = vecchi.container
    if (!d.scorte && vecchi) d.scorte = vecchi.scorte
    scrivi('acquisti-dati', JSON.stringify(d)); return d
  }
  return vecchi // senza rete: l'ultima copia salvata
}

// ---------- date ----------
export const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
export function pd(s: string) { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d) }
function oggi0() { const o = new Date(); o.setHours(0, 0, 0, 0); return o }
// giorni da oggi (negativo = passato)
export function gg(s?: string | null): number { if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return NaN; return Math.round((pd(s).getTime() - oggi0().getTime()) / 86400000) }
export function giornoMese(s: string) { const d = pd(s); return `${d.getDate()} ${MESI[d.getMonth()]}` }
export function ggmm(s: string) { const d = pd(s); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` }
// "agg. 01:08" se è di oggi, altrimenti "agg. 13 nov"
export function quandoAgg(iso?: string) {
  if (!iso) return ''
  const x = new Date(iso)
  if (isNaN(x.getTime())) return ''
  if (x.toDateString() === new Date().toDateString()) return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`
  return `${x.getDate()} ${MESI[x.getMonth()]}`
}
// ore passate dall'aggiornamento
export function orePassate(iso?: string) { if (!iso) return Infinity; const t = new Date(iso).getTime(); return isNaN(t) ? Infinity : (Date.now() - t) / 3600000 }

// ---------- testi ----------
export function qtaTesto(v: VoceScorta) {
  const parti: string[] = []
  if (v.qta != null && v.qta > 0) parti.push(`${Math.round(v.qta).toLocaleString('it-IT')} ${(v.udm || '').toLowerCase()}`.trim())
  if (v.fornitore) parti.push(v.fornitore)
  return parti.join(' · ')
}
export const eContainer = (s?: string) => !!s && /^[A-Z]{4}\d{7}$/.test(s.trim())
