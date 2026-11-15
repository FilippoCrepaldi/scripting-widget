// Widget "Diario" – Diario Alimentare di Filippo (app Scripting)
// Medio: Cibo (o "corpo" se nel parametro del widget scrivi: corpo)
// Piccolo: Cuore (o "movimento" se nel parametro scrivi: movimento)
import { VStack, HStack, ZStack, Text, Spacer, Circle, Capsule, Image, Button, Widget } from 'scripting'
import { AggiornaDiario, CambiaScheda } from './app_intents'
import { carica as caricaDati, urlDati, DIARIO, Dati, Voce, oggi, leggi, prossimoPasto } from './comune'
// Il tocco sul widget apre il diario. Provato il 15/11: un "#..." in fondo all'indirizzo NON arriva al diario,
// quindi non si può aprire una schermata precisa.

// ---------- colori ----------
// colori di sistema: si adattano da soli a chiaro/scuro e allo sfondo sfocato
const K = {
  sfondo: { light: "#FFFFFF", dark: "#1C1C1E" } as any,
  riquadro: "quaternarySystemFill", testo: "label", testo2: "secondaryLabel", testo3: "secondaryLabel", traccia: "tertiarySystemFill",
  kcal: "#16A37F", carb: "#F4B740", prot: "#E0567A", fat: "#8E7CF0", passi: "#F2843A", fascia: "systemGreen",
  ok: "#22A06B", top: "#2F7CF6", warn: "#E08A1E", bad: "#E0475E",
}
const TONO: Record<string, string> = { ok: K.ok, top: K.top, warn: K.warn, bad: K.bad }

// ---------- dati ----------
const PROVA: Dati = {
  cibo: { data: oggi(), kcal: 412, kcal_obj: 1924, c: 52, p: 24, f: 12, c_obj: 217, p_obj: 123, f_obj: 63 },
  corpo: [
    { k: "resp", l: "Respiro", s: "13,2", u: "/min", v: 13.2, lo: 12.7, hi: 13.9, tone: "ok" },
    { k: "rhr", l: "Battito", s: "84", u: "bpm", v: 84, lo: 75, hi: 80, tone: "bad" },
    { k: "hrv", l: "HRV", s: "20", u: "ms", v: 20.4, lo: 20, hi: 28, tone: "ok" },
    { k: "spo2", l: "Ossigeno", s: "97,5", u: "%", v: 97.5, lo: 95, hi: 100, tone: "ok" },
    { k: "temp", l: "Temp.", s: "±0,0", u: "°C", v: 0, lo: -0.6, hi: 0.6, tone: "ok" },
    { k: "sonno", l: "Sonno", s: "8:12", u: "ore", v: 492, lo: 420, hi: 540, tone: "ok" },
  ],
  passi: { data: oggi(), n: 4230, obiettivo: 10000 },
}
async function carica(): Promise<{ d: Dati, prova: boolean }> {
  if (!urlDati()) return { d: PROVA, prova: true }
  return { d: (await caricaDati()) || {}, prova: false }
}
const nf = (n: number) => Math.round(n).toLocaleString("it-IT")

// ---------- pezzi grafici ----------
// arco su un cerchio: inizio e lunghezza in frazioni di giro (0 = ore 3, senso orario)
function Arco({ size, w, inizio, lungo, colore }: { size: number, w: number, inizio: number, lungo: number, colore: string }) {
  if (lungo <= 0) return <Circle trim={{ from: 0, to: 0 }} frame={{ width: size, height: size }} />
  const a = inizio, b = Math.min(inizio + lungo, inizio + 0.9999)
  const st = { shapeStyle: colore, strokeStyle: { lineWidth: w, lineCap: 'round' } } as any
  if (b <= 1) return <Circle trim={{ from: a, to: b }} stroke={st} frame={{ width: size, height: size }} />
  return <ZStack>
    <Circle trim={{ from: a, to: 1 }} stroke={st} frame={{ width: size, height: size }} />
    <Circle trim={{ from: 0, to: b - 1 }} stroke={st} frame={{ width: size, height: size }} />
  </ZStack>
}
// anello completo che parte da mezzogiorno
function Anello({ size, w, pct, colore, children }: any) {
  return <ZStack frame={{ width: size, height: size }}>
    <Arco size={size - w} w={w} inizio={0} lungo={0.9999} colore={K.traccia} />
    <Arco size={size - w} w={w} inizio={0.75} lungo={Math.min(Math.max(pct, 0), 1) * 0.9999} colore={colore} />
    {children}
  </ZStack>
}
// semicerchio aperto in basso (da ore 7 a ore 5)
function Semi({ size, w, pct, colore, children }: any) {
  return <ZStack frame={{ width: size, height: size }}>
    <Arco size={size - w} w={w} inizio={0.4} lungo={0.7} colore={K.traccia} />
    <Arco size={size - w} w={w} inizio={0.4} lungo={0.7 * Math.min(Math.max(pct, 0), 1)} colore={colore} />
    {children}
  </ZStack>
}
// barretta con la fascia del tuo normale e il pallino del valore
function Barra({ v, lo, hi, tone, larga }: { v: number, lo: number, hi: number, tone: string, larga: number }) {
  const w = hi - lo || 1, min = lo - w * 0.75, max = hi + w * 0.75
  const x = (q: number) => (Math.max(min, Math.min(max, q)) - min) / (max - min) * larga
  const pal = 10, px = Math.max(0, Math.min(larga - pal, x(v) - pal / 2))
  return <ZStack alignment="leading" frame={{ width: larga, height: pal }}>
    <HStack spacing={0}>
      <Capsule fill={K.traccia} frame={{ width: x(lo), height: 5 }} />
      <Capsule fill={K.fascia} opacity={0.4} frame={{ width: x(hi) - x(lo), height: 5 }} />
      <Capsule fill={K.traccia} frame={{ width: larga - x(hi), height: 5 }} />
    </HStack>
    <HStack spacing={0}>
      <Spacer frame={{ width: px }} />
      <ZStack frame={{ width: pal, height: pal }}>
        <Circle fill={TONO[tone] || K.ok} frame={{ width: pal, height: pal }} />
        <Circle fill="white" frame={{ width: pal - 5, height: pal - 5 }} />
      </ZStack>
    </HStack>
  </ZStack>
}
const ICONA: Record<string, string> = { resp: "lungs.fill", rhr: "heart.fill", hrv: "waveform.path.ecg", spo2: "drop.fill", temp: "thermometer.medium", sonno: "bed.double.fill" }

// ---------- widget ----------
// Proposta 5 scelta da Filippo: kcal rimaste sempre a sinistra, a destra tre schede (Macro, Pasti, Prossimo)
// cambiate con i tasti (azione CambiaScheda). Niente Link: così il tocco sul resto apre il diario (widgetURL).
function Scheda({ id, nome, attiva }: { id: string, nome: string, attiva: boolean }) {
  return <Button buttonStyle="plain" intent={CambiaScheda({ scheda: id })}>
    <Text font={10} fontWeight="bold" foregroundStyle={attiva ? "white" : K.testo2}
      padding={{ horizontal: 8, vertical: 3 }}
      background={{ style: attiva ? K.kcal : K.riquadro, shape: { type: 'rect', cornerRadius: 9 } } as any}>{nome}</Text>
  </Button>
}
function Macro({ c }: { c: any }) {
  const macro = [["Carbo", c.c, c.c_obj, K.carb], ["Proteine", c.p, c.p_obj, K.prot], ["Grassi", c.f, c.f_obj, K.fat]] as [string, number, number, string][]
  return <VStack spacing={7} frame={{ maxWidth: 'infinity' }}>
    {macro.map(([l, a, b, col]) => {
      const resto = b - a
      return <VStack spacing={3} frame={{ maxWidth: 'infinity' }}>
        <HStack>
          <Text font={10} fontWeight="bold" foregroundStyle={col}>{l}</Text>
          <Spacer />
          <Text font={11} fontWeight="bold" foregroundStyle={resto < 0 ? K.bad : K.testo}>{resto < 0 ? `${nf(-resto)} g in più` : `${nf(resto)} g rimasti`}</Text>
        </HStack>
        <ZStack alignment="leading" frame={{ maxWidth: 'infinity', height: 5 }}>
          <Capsule fill={K.traccia} frame={{ maxWidth: 'infinity', height: 5 }} />
          <Capsule fill={col} frame={{ width: Math.max(5, 236 * Math.min(1, Math.max(0, a / (b || 1)))), height: 5 }} />
        </ZStack>
      </VStack>
    })}
  </VStack>
}
function Pasti({ d }: { d: Dati }) {
  const lista = d.pasti && d.pasti.data === oggi() ? d.pasti.lista : []
  const slots = (d.piano?.slots || []).map(s => s.nome)
  const nomi = slots.length ? slots : [...new Set(lista.map(p => p.pasto))]
  const righe = nomi.slice(0, 5).map(n => {
    const ps = lista.filter(p => p.pasto === n)
    return [n, ps.length ? nf(ps.reduce((t, p) => t + (p.kcal || 0), 0)) : "—"]
  })
  if (!righe.length) return <Text font={11} foregroundStyle={K.testo2}>Nessun pasto segnato oggi</Text>
  return <VStack spacing={3} frame={{ maxWidth: 'infinity' }}>
    {righe.map(([n, k]) => <HStack>
      <Text font={11} fontWeight="semibold" foregroundStyle={K.testo} lineLimit={1}>{n}</Text>
      <Spacer />
      <Text font={11} fontWeight="bold" foregroundStyle={k === "—" ? K.testo3 : K.testo}>{k}</Text>
    </HStack>)}
  </VStack>
}
// Il testo del piano è lungo (gruppi con "•", alternative separate da "|"): per ogni gruppo mostro
// la prima scelta e quante altre ce ne sono, divisi in due colonne affiancate.
function gruppiPiano(testo: string): { cibo: string, altri: number }[] {
  return String(testo || "").split(/•|\n/).map(g => g.replace(/^\s*\+\s*/, "").trim()).filter(g => g.length > 2)
    .map(g => {
      const parti = g.split("|").map(x => x.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim()).filter(Boolean)
      const cibo = (parti[0] || "").replace(/^(Secondo|Primo|Contorno|Uno tra)\s*:\s*/i, "")
      return { cibo, altri: parti.length - 1 }
    }).slice(0, 6)
}
function Prossimo({ d }: { d: Dati }) {
  const p = prossimoPasto(d)
  const g = gruppiPiano(p.testo)
  const meta = Math.ceil(g.length / 2)
  const colonna = (xs: { cibo: string, altri: number }[]) => <VStack alignment="leading" spacing={4} frame={{ maxWidth: 'infinity', alignment: 'topLeading' }}>
    {xs.map(x => <VStack alignment="leading" spacing={0}>
      <Text font={10} foregroundStyle={K.testo} lineLimit={2}>{x.cibo}</Text>
      {x.altri > 0 ? <Text font={9} foregroundStyle={K.testo3}>{`o altri ${x.altri}`}</Text> : null}
    </VStack>)}
  </VStack>
  return <VStack alignment="leading" spacing={5} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <HStack spacing={5} alignment="lastTextBaseline">
      <Text font={15} fontWeight="heavy" foregroundStyle={K.testo}>{p.pasto}</Text>
      {p.ore ? <Text font={10} fontWeight="semibold" foregroundStyle={K.testo3}>{p.ore}</Text> : null}
    </HStack>
    {g.length <= 1
      ? <Text font={11} foregroundStyle={K.testo2} lineLimit={4}>{g[0] ? g[0].cibo + (g[0].altri ? ` · o altri ${g[0].altri}` : "") : p.testo}</Text>
      : <HStack alignment="top" spacing={8}>{colonna(g.slice(0, meta))}{colonna(g.slice(meta))}</HStack>}
  </VStack>
}
function Cibo({ d, ora }: { d: Dati, ora: string }) {
  const c = d.cibo && d.cibo.data === oggi() ? d.cibo : { ...(d.cibo || PROVA.cibo!), kcal: 0, c: 0, p: 0, f: 0 }
  const s = leggi("diario-scheda") || "macro"
  return <HStack spacing={12} padding={{ top: 12, bottom: 10, leading: 12, trailing: 12 }} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
    <VStack spacing={6}>
      <Anello size={84} w={9} pct={c.kcal / c.kcal_obj} colore={K.kcal}>
        <VStack spacing={0}>
          <Text font={19} fontWeight="heavy" foregroundStyle={K.testo}>{nf(c.kcal_obj - c.kcal)}</Text>
          <Text font={8} fontWeight="semibold" foregroundStyle={K.testo3}>kcal rimaste</Text>
        </VStack>
      </Anello>
      <Button buttonStyle="plain" intent={AggiornaDiario({ motivo: "widget" })}>
        <HStack spacing={3} padding={{ horizontal: 6, vertical: 2 }}>
          <Text font={9} fontWeight="semibold" foregroundStyle={K.testo3}>{ora}</Text>
          <Image systemName="arrow.clockwise" font={10} foregroundStyle={K.testo2} />
        </HStack>
      </Button>
    </VStack>
    <VStack alignment="leading" spacing={8} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
      <HStack spacing={4}>
        <Scheda id="macro" nome="Macro" attiva={s === "macro"} />
        <Scheda id="pasti" nome="Pasti" attiva={s === "pasti"} />
        <Scheda id="prossimo" nome="Prossimo" attiva={s === "prossimo"} />
      </HStack>
      <VStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
        {s === "pasti" ? <Pasti d={d} /> : s === "prossimo" ? <Prossimo d={d} /> : <Macro c={c} />}
      </VStack>
    </VStack>
  </HStack>
}

function Corpo({ d }: { d: Dati }) {
  const v = (d.corpo && d.corpo.length ? d.corpo : PROVA.corpo!).slice(0, 6)
  const riga = (xs: Voce[]) => <HStack spacing={6}>
    {xs.map(x => {
      const col = TONO[x.tone] || K.ok
      return <VStack alignment="leading" spacing={2} padding={{ horizontal: 8, vertical: 6 }} background={{ style: K.riquadro, shape: { type: 'rect', cornerRadius: 12 } } as any} frame={{ maxWidth: 'infinity' }}>
        <HStack>
          <Text font={10} fontWeight="semibold" foregroundStyle={K.testo3}>{x.l}</Text>
          <Spacer />
          <Image systemName={ICONA[x.k] || "circle.fill"} font={10} foregroundStyle={col} />
        </HStack>
        <HStack spacing={2} alignment="lastTextBaseline">
          <Text font={16} fontWeight="bold" foregroundStyle={x.tone === "ok" ? K.testo : col}>{x.s}</Text>
          <Text font={9} fontWeight="semibold" foregroundStyle={K.testo3}>{x.u}</Text>
        </HStack>
        <Barra v={x.v} lo={x.lo} hi={x.hi} tone={x.tone} larga={78} />
      </VStack>
    })}
  </HStack>
  return <VStack spacing={6} padding={10} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
    {riga(v.slice(0, 3))}
    {riga(v.slice(3, 6))}
  </VStack>
}

function Cuore({ d }: { d: Dati }) {
  const v = (d.corpo && d.corpo.length ? d.corpo : PROVA.corpo!).filter(x => x.k === "rhr" || x.k === "hrv")
  return <VStack alignment="leading" spacing={8} padding={14} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <Text font={12} fontWeight="semibold" foregroundStyle={K.testo3}>Cuore stanotte</Text>
    {v.map(x => {
      const col = TONO[x.tone] || K.ok
      return <VStack alignment="leading" spacing={4}>
        <HStack alignment="lastTextBaseline">
          <Text font={11} fontWeight="semibold" foregroundStyle={K.testo2}>{x.l}</Text>
          <Spacer />
          <Text font={18} fontWeight="heavy" foregroundStyle={x.tone === "ok" ? K.testo : col}>{x.s}</Text>
          <Text font={9} fontWeight="semibold" foregroundStyle={K.testo3}>{x.u}</Text>
        </HStack>
        <Barra v={x.v} lo={x.lo} hi={x.hi} tone={x.tone} larga={124} />
      </VStack>
    })}
    <Spacer />
  </VStack>
}

function Movimento({ d }: { d: Dati }) {
  const p = d.passi && d.passi.data === oggi() ? d.passi : { data: oggi(), n: 0, obiettivo: d.passi?.obiettivo || 10000 }
  return <VStack spacing={4} padding={12} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
    <HStack><Text font={12} fontWeight="semibold" foregroundStyle={K.testo3}>Movimento</Text><Spacer /></HStack>
    <Anello size={88} w={10} pct={p.n / p.obiettivo} colore={K.passi}>
      <VStack spacing={0}>
        <Text font={18} fontWeight="heavy" foregroundStyle={K.testo}>{nf(p.n)}</Text>
        <Text font={9} fontWeight="semibold" foregroundStyle={K.testo3}>passi</Text>
      </VStack>
    </Anello>
    <Text font={10} fontWeight="semibold" foregroundStyle={K.testo3}>obiettivo {nf(p.obiettivo)}</Text>
  </VStack>
}

async function disegna() {
  const { d, prova } = await carica()
  const par = String(Widget.parameter || "").toLowerCase().trim()
  const fam = Widget.family
  const ora = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })
  const cibo = fam !== 'systemSmall' && par !== "corpo"
  const corpo = fam === 'systemSmall'
    ? (par === "movimento" ? <Movimento d={d} /> : <Cuore d={d} />)
    : (par === "corpo" ? <Corpo d={d} /> : <Cibo d={d} ora={prova ? "PROVA" : ora} />)
  Widget.present(
    <ZStack widgetBackground={K.sfondo} widgetURL={DIARIO} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
      {corpo}
      {/* in alto a destra l'ora dell'ultimo aggiornamento (nel Cibo sta sotto l'anello, vicino a ↻) */}
      {cibo ? null : <VStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topTrailing' }} padding={{ top: 6, trailing: 10 }}>
        <Text font={8} fontWeight="bold" foregroundStyle={K.testo3}>{prova ? "PROVA" : ora}</Text>
      </VStack>}
    </ZStack>,
    { policy: 'after', date: new Date(Date.now() + 15 * 60 * 1000) } as any
  )
}

// se qualcosa va storto, l'errore si vede sul widget invece di un riquadro vuoto
async function main() {
  try { await disegna() } catch (e) {
    Widget.present(
      <VStack widgetBackground={K.sfondo} padding={12} spacing={4} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
        <Text font={12} fontWeight="bold" foregroundStyle={K.bad}>Diario: errore</Text>
        <Text font={10} foregroundStyle={K.testo2}>{String(e)}</Text>
      </VStack>,
      { policy: 'after', date: new Date(Date.now() + 5 * 60 * 1000) } as any
    )
  }
}

main()
