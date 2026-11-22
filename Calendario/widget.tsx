// widget.tsx – Calendario: ora, data, meteo, impegni e pulsanti
// Parametro del widget: 1 Ora gigante · 2 Conto alla rovescia · 3 Striscia · 4 Cruscotto · 5 Settimana
// Grande: senza parametro il nuovo "B" (impegni con settimana / meteo) · 6 il vecchio "A" (fino alla 1.5.1)
import {
  VStack, HStack, ZStack, Text, Image, Spacer, DateLabel, Button, Link, Gauge,
  RoundedRectangle, Rectangle, Circle, Widget,
} from 'scripting'
import {
  GIORNI, GG, G1, MESI, MM, NOME_SCRIPT, inizioGiorno, hhmm, leggiStato,
  eventiTra, prossimi, promemoria, meteo, salvaQuanti, precipitazione, chiave, type Ev, type Meteo, type Prom,
} from './comune'
import { CambiaGiorno, CambiaEvento, ScegliGiorno, Completa, CambiaSettimana, CambiaVista, ScegliGiornoMeteo } from './app_intents'

// Colori di sistema: si leggono bene sia sullo sfondo sfocato sia in chiaro/scuro
const C = {
  testo: 'label', tenue: 'secondaryLabel', debole: 'tertiaryLabel',
  riquadro: 'tertiarySystemFill', pista: 'quaternarySystemFill', rosso: 'systemRed', linea: 'separator',
} as const

const ora = new Date()
const mezzanotte = inizioGiorno(ora)

// ---------- misure ----------
function misure() {
  const fam = Widget.family
  const base: any = { systemSmall: [170, 170], systemMedium: [364, 170], systemLarge: [364, 382] }
  const [maxW, maxH] = base[fam] || [364, 382]
  const sz: any = Widget.displaySize || {}
  let w = sz.width || maxW, h = sz.height || maxH
  if (w > maxW * 1.5) { const k = w / maxW > 2.5 ? 3 : 2; w = w / k; h = h / k }
  return { w: Math.min(w, maxW), h: Math.min(h, maxH) }
}

// ---------- pezzi ----------
// Ora viva: un timer che parte da mezzanotte mostra l'ora esatta e va avanti da solo
// Tra le 00:00 e le 00:59 l'iPhone scrive il timer senza l'ora ("18:41" = 18 min e 41 s):
// in quella fascia scriviamo noi "0:" davanti, così si legge 0:18:41.
const notte = ora.getHours() === 0
function Ora({ size }: { size: number }) {
  const t = <DateLabel date={mezzanotte} style="timer" font={size} fontWeight="bold" monospacedDigit
    foregroundStyle={C.testo} lineLimit={1} minScaleFactor={0.5} />
  if (!notte) return t
  return <HStack spacing={0}>
    <Text font={size} fontWeight="bold" monospacedDigit foregroundStyle={C.testo} lineLimit={1} minScaleFactor={0.5}>0:</Text>
    {t}
  </HStack>
}


// Ore e minuti grandi, secondi sotto. L'ora che va avanti da sola è un unico testo "12:09:41":
// lo mostro due volte e lo "ritaglio", una volta tenendo solo ore e minuti, una volta solo i secondi.
// Mostra solo un pezzo del timer che parte da mezzanotte: l'inizio (HH:MM) o la fine (SS).
// Larghezze in proporzione alla dimensione del carattere: "HH:MM" misura circa 2,74 volte, una cifra circa 0,62.
// Si lascia un piccolo margine dopo l'ultima cifra: lì i ":" dei secondi sono ancora vuoti.
const ORAMIN = 2.85, CIFRA = 0.62 // misurate sull'iPhone
function Ritaglio({ size, inizio, colore, peso }: { size: number, inizio: boolean, colore: string, peso: string }) {
  // Tra le 00:00 e le 00:59 il timer è "MM:SS": all'inizio ci sono solo i minuti (2 cifre), l'ora "0:" la scrive OraESecondi
  const larghezza = !inizio ? size * 2 * CIFRA + 1 : notte ? size * 2 * CIFRA + 1 : size * (ORAMIN - (ora.getHours() < 10 ? CIFRA : 0))
  // Sulla Home il timer occupa uno spazio molto più largo delle cifre e si mette al centro:
  // gli diamo noi una larghezza fissa e lo allineamo a sinistra (ore) o a destra (secondi), poi ritagliamo.
  const al = inizio ? 'leading' : 'trailing'
  return <HStack frame={{ width: larghezza, height: size * 1.2, alignment: al }} clipped>
    <DateLabel date={mezzanotte} style="timer" font={size} fontWeight={peso as any} monospacedDigit
      foregroundStyle={colore} lineLimit={1} multilineTextAlignment={al}
      frame={{ width: size * 5, alignment: al }} />
  </HStack>
}
function OraESecondi({ size, sec }: { size: number, sec: number }) {
  return <VStack alignment="leading" spacing={0}>
    {notte
      ? <HStack spacing={0}>
          <Text font={size} fontWeight="bold" monospacedDigit foregroundStyle={C.testo} lineLimit={1}>0:</Text>
          <Ritaglio size={size} inizio colore={C.testo} peso="bold" />
        </HStack>
      : <Ritaglio size={size} inizio colore={C.testo} peso="bold" />}
    <HStack spacing={4} alignment="lastTextBaseline">
      <Ritaglio size={sec} inizio={false} colore={C.rosso} peso="semibold" />
      <Text font={sec * 0.6} fontWeight="semibold" foregroundStyle={C.tenue}>sec</Text>
    </HStack>
  </VStack>
}

function DataPiccola({ giorno = 0, lunga = true }: { giorno?: number, lunga?: boolean }) {
  const d = inizioGiorno(ora, giorno)
  const nome = giorno === 0 ? (lunga ? GIORNI[d.getDay()] : GG[d.getDay()]) : giorno === 1 ? 'Domani' : giorno === -1 ? 'Ieri' : (lunga ? GIORNI[d.getDay()] : GG[d.getDay()])
  return <HStack spacing={4}>
    <Text font={12} fontWeight="bold" foregroundStyle={C.rosso}>{nome.toUpperCase()}</Text>
    <Text font={12} fontWeight="semibold" foregroundStyle={C.tenue}>{`${d.getDate()} ${lunga ? MESI[d.getMonth()] : MM[d.getMonth()]}`}</Text>
  </HStack>
}
// L'app Orologio non si può aprire direttamente da un widget: passa da un Comando Rapido "Apri Orologio" (azione "Apri app" → Orologio)
const APRI_OROLOGIO = 'shortcuts://run-shortcut?name=' + encodeURIComponent('Apri Orologio')

function Tondo({ icona, rosso = false, size = 26, chiaro = false }: { icona: string, rosso?: boolean, size?: number, chiaro?: boolean }) {
  return <ZStack frame={{ width: size, height: size }}>
    <Circle fill={rosso ? C.rosso : chiaro ? 'systemBackground' : C.riquadro} frame={{ width: size, height: size }} />
    <Image systemName={icona} font={size * 0.46} fontWeight="bold" foregroundStyle={rosso ? 'white' : C.testo} />
  </ZStack>
}
function Pulsante({ icona, intent, rosso = false, size = 26, chiaro = false }: any) {
  return <Button buttonStyle="plain" intent={intent}><Tondo icona={icona} rosso={rosso} size={size} chiaro={chiaro} /></Button>
}
// "+" apre l'app con la scheda nuovo evento già sul giorno scelto
// 🔔 avvia il conto alla rovescia dell'impegno scelto (se non c'è, del prossimo)
function Segui({ size = 22, e = null }: { size?: number, e?: Ev | null }) {
  const extra = e && e.id ? `&id=${encodeURIComponent(e.id)}&inizio=${e.inizio}` : ''
  return <Link url={`scripting://run_single/${encodeURIComponent(NOME_SCRIPT)}?azione=segui${extra}`}>
    <Tondo icona="bell.badge" size={size} />
  </Link>
}
function Nuovo({ giorno = 0, size = 26 }: { giorno?: number, size?: number }) {
  return <Link url={`scripting://run/${encodeURIComponent(NOME_SCRIPT)}?azione=nuovo&giorno=${giorno}`}>
    <Tondo icona="plus" rosso size={size} />
  </Link>
}

function Barretta({ colore, alta = 26 }: { colore: string, alta?: number }) {
  return <RoundedRectangle fill={colore} cornerRadius={1.5} frame={{ width: 3, height: alta }} />
}

function quando(e: Ev) {
  const d = new Date(e.inizio)
  const diff = Math.round((inizioGiorno(d).getTime() - mezzanotte.getTime()) / 86400000)
  const g = diff === 0 ? '' : diff === 1 ? 'Domani ' : diff < 7 ? `${GG[d.getDay()]} ` : `${GG[d.getDay()]} ${d.getDate()} ` // oltre una settimana anche il giorno del mese
  if (e.tuttoIlGiorno) return g ? g + 'tutto il giorno' : 'Tutto il giorno'
  return g + hhmm(d)
}
// Apre il Calendario dell'iPhone sul giorno e sull'ora dell'impegno
// Apre proprio quell'impegno: Scripting lo cerca e mostra la sua scheda (se manca l'id, apre il Calendario su quel giorno)
function apriImpegno(e: Ev) {
  if (e.id) return `scripting://run_single/${encodeURIComponent(NOME_SCRIPT)}?azione=apri&id=${encodeURIComponent(e.id)}`
  return `calshow:${Math.floor(e.inizio / 1000 - 978307200)}`
}
function mancano(e: Ev) {
  const min = Math.max(0, Math.round((e.inizio - Date.now()) / 60000))
  if (e.inizio <= Date.now()) return 'In corso'
  const h = Math.floor(min / 60), m = min % 60
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`
}

function RigaEvento({ e, larghezza, grande = false }: { e: Ev, larghezza: number, grande?: boolean }) {
  return <HStack spacing={8} frame={{ width: larghezza, alignment: 'leading' }}>
    <Barretta colore={e.colore} alta={grande ? 30 : 26} />
    <VStack alignment="leading" spacing={1}>
      <Text font={grande ? 14 : 13} fontWeight="semibold" foregroundStyle={C.testo} lineLimit={1}>{e.titolo}</Text>
      <Text font={11} foregroundStyle={C.tenue} lineLimit={1}>{e.luogo ? `${quando(e)} · ${e.luogo}` : quando(e)}</Text>
    </VStack>
    <Spacer />
  </HStack>
}

function Nessuno({ testo = 'Nessun impegno' }) {
  return <Text font={12} foregroundStyle={C.tenue}>{testo}</Text>
}

function MeteoBreve({ m, size = 14 }: { m: Meteo | null, size?: number }) {
  if (!m) return <Spacer frame={{ width: 0 }} />
  return <HStack spacing={4}>
    <Image systemName={m.icona} font={size} foregroundStyle={C.testo} />
    <Text font={size} fontWeight="semibold" foregroundStyle={C.testo}>{`${m.temp}°`}</Text>
  </HStack>
}

// ---------- 1. Ora gigante (media) ----------
function OraGigante({ m, prossimo }: { m: Meteo | null, prossimo: Ev | null }) {
  return <VStack alignment="leading" spacing={2} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'leading' }}>
    <Spacer />
    <DataPiccola />
    <Ora size={66} />
    <HStack spacing={6} padding={{ top: 6 }}>
      <MeteoBreve m={m} size={13} />
      {m ? <Text font={13} foregroundStyle={C.debole}>·</Text> : null}
      {prossimo ? <HStack spacing={5}>
        <Circle fill={prossimo.colore} frame={{ width: 7, height: 7 }} />
        <Text font={13} fontWeight="semibold" foregroundStyle={C.testo}>{quando(prossimo)}</Text>
        <Text font={13} foregroundStyle={C.tenue} lineLimit={1}>{prossimo.titolo}</Text>
      </HStack> : <Text font={13} foregroundStyle={C.tenue}>Nessun impegno in vista</Text>}
    </HStack>
    <Spacer />
  </VStack>
}

// ---------- 2. Ora, meteo e conto alla rovescia (media) ----------
const maiuscola = (t: string) => t ? t.charAt(0).toUpperCase() + t.slice(1) : t

// ---------- 7. Grande "B" (1.6.0): in alto ora e meteo; sotto impegni con settimana, oppure il meteo ----------
const TINTA_BLU = 'rgba(10,132,255,0.15)'
// Icone meteo piene e colorate per tipo: così si capisce subito se piove, c'è sole, nuvole, neve o temporale
function IconaMeteo({ nome, size }: { nome: string, size: number }) {
  const n = nome || 'cloud'
  const senzaFill = ['wind', 'snowflake', 'tornado', 'hurricane']
  const pieno = n.endsWith('.fill') || senzaFill.includes(n) ? n : n + '.fill'
  const colore = /bolt/.test(n) ? 'systemPurple'
    : /snow|sleet|hail|snowflake/.test(n) ? 'systemCyan'
    : /rain|drizzle/.test(n) ? 'systemBlue'
    : /cloud\.sun|sun\.haze|cloud\.moon/.test(n) ? 'systemOrange'
    : /sun|sunrise|sunset/.test(n) ? 'systemYellow'
    : /moon/.test(n) ? 'systemIndigo'
    : 'systemGray'
  return <Image systemName={pieno} font={size} symbolRenderingMode="hierarchical" foregroundStyle={colore} />
}
function titoloGiorno(o: number) {
  const d = inizioGiorno(ora, o)
  return o === 0 ? 'OGGI' : o === 1 ? 'DOMANI' : o === -1 ? 'IERI' : `${GIORNI[d.getDay()].toUpperCase()} ${d.getDate()}`
}
function TestaB({ m, vista }: { m: Meteo | null, vista: string }) {
  return <VStack alignment="leading" spacing={0}>
    <Link url={APRI_OROLOGIO}><DataPiccola lunga /></Link>
    <HStack alignment="top" spacing={8}>
      <Link url={APRI_OROLOGIO}><OraESecondi size={56} sec={16} /></Link>
      <Spacer />
      {/* tocco sul meteo = passa alla vista meteo (e ritorno) */}
      {m ? <Button buttonStyle="plain" intent={CambiaVista({ vista: vista === 'meteo' ? 'cal' : 'meteo' })}>
        <VStack alignment="trailing" spacing={1} padding={{ top: 8 }}>
          <HStack spacing={6}>
            <IconaMeteo nome={m.icona} size={24} />
            <Text font={30} fontWeight="light" foregroundStyle={C.testo}>{`${m.temp}°`}</Text>
          </HStack>
          <Text font={12} fontWeight="semibold" foregroundStyle={C.testo} lineLimit={1}>{m.testo || ' '}</Text>
          <Text font={11} foregroundStyle={C.tenue} lineLimit={1}>{`↑${m.max}° ↓${m.min}°`}</Text>
        </VStack>
      </Button> : null}
    </HStack>
  </VStack>
}
function ImpegniB({ inizio, sel, conta, lista, quantiDelGiorno, indice, larghezza }: { inizio: number, sel: number, conta: Record<number, number>, lista: Ev[], quantiDelGiorno: number, indice: number, larghezza: number }) {
  const RIGA = 30, PER_PAGINA = 4
  const cw = Math.floor((larghezza - 6 * 2) / 7)
  const scelta = Math.min(indice, Math.max(0, lista.length - 1))
  const inizioFin = Math.floor(scelta / PER_PAGINA) * PER_PAGINA
  const finestra = lista.slice(inizioFin, inizioFin + PER_PAGINA)
  const colore = (lista[scelta] && lista[scelta].colore) || C.rosso
  const linea = <Rectangle fill={C.linea} frame={{ maxWidth: 'infinity', minHeight: 0.5, maxHeight: 0.5 }} />
  return <VStack alignment="leading" spacing={0} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    {/* settimana: tocco su un giorno = i suoi impegni */}
    <HStack spacing={2} padding={{ bottom: 4 }}>
      {[0, 1, 2, 3, 4, 5, 6].map(k => {
        const o = inizio + k, d = inizioGiorno(ora, o), su = o === sel, oggi = o === 0
        const fg = su ? 'white' : (oggi ? C.rosso : C.testo)
        return <Button buttonStyle="plain" intent={ScegliGiorno({ offset: o })}>
          <ZStack frame={{ width: cw, height: 44 }}>
            <RoundedRectangle fill={su ? C.rosso : 'clear'} cornerRadius={10} />
            <VStack spacing={1}>
              <Text font={10} fontWeight="semibold" foregroundStyle={su ? 'white' : C.tenue}>{G1[d.getDay()]}</Text>
              <Text font={15} fontWeight="bold" foregroundStyle={fg}>{String(d.getDate())}</Text>
              <Circle fill={conta[o] ? (su ? 'white' : 'systemBlue') : 'clear'} frame={{ width: 4, height: 4 }} />
            </VStack>
          </ZStack>
        </Button>
      })}
    </HStack>
    <Text font={11} fontWeight="bold" foregroundStyle={C.rosso} padding={{ bottom: 3 }}>
      {`${titoloGiorno(sel)} · ${quantiDelGiorno ? quantiDelGiorno + (quantiDelGiorno === 1 ? ' impegno' : ' impegni') : 'libero'}`}
    </Text>
    {/* impegni del giorno scelto: tocco = apre l'impegno, ↑ ↓ scelgono quello per la campanella */}
    {[0, 1, 2, 3].map(k => {
      const r = finestra[k]
      if (!r) return <VStack spacing={0} frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
        {linea}
        <HStack frame={{ maxWidth: 'infinity', minHeight: RIGA, maxHeight: RIGA, alignment: 'leading' }}>
          {k === 0 && !lista.length ? <Text font={12} foregroundStyle={C.tenue}>Niente in programma</Text> : <Spacer />}
        </HStack>
      </VStack>
      const su = inizioFin + k === scelta
      const dopo = inizioFin + k >= quantiDelGiorno // impegno dei giorni seguenti
      return <Link url={apriImpegno(r)}>
        <VStack spacing={0} frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
          {inizioFin + k === quantiDelGiorno ? <HStack padding={{ top: 2, bottom: 1 }}><Text font={10} fontWeight="bold" foregroundStyle={C.tenue}>POI</Text><Spacer /></HStack> : linea}
          <HStack spacing={7} frame={{ maxWidth: 'infinity', minHeight: RIGA, maxHeight: RIGA, alignment: 'leading' }}>
            <RoundedRectangle fill={su ? r.colore : 'systemGray3'} cornerRadius={1.5} frame={{ width: 3, height: RIGA - 8 }} />
            <VStack alignment="leading" spacing={0} frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
              <Text font={12} fontWeight={su ? 'bold' : 'medium'} foregroundStyle={dopo && !su ? C.tenue : C.testo} lineLimit={1}>{maiuscola(r.titolo)}</Text>
              <Text font={10} fontWeight={su ? 'semibold' : 'regular'} foregroundStyle={su ? r.colore : C.tenue} lineLimit={1}>{quando(r)}</Text>
            </VStack>
          </HStack>
        </VStack>
      </Link>
    })}
    <Spacer />
    <HStack spacing={7}>
      <Pulsante icona="chevron.left" intent={CambiaSettimana({ delta: -1 })} size={22} />
      <Pulsante icona="chevron.right" intent={CambiaSettimana({ delta: 1 })} size={22} />
      <Spacer />
      <Pulsante icona="chevron.up" intent={CambiaEvento({ delta: -1 })} size={22} />
      <Segui size={22} e={lista[scelta] || null} />
      <Pulsante icona="chevron.down" intent={CambiaEvento({ delta: 1 })} size={22} />
      <Nuovo giorno={sel} size={22} />
    </HStack>
  </VStack>
}
function MeteoB({ m, larghezza, scelto }: { m: Meteo | null, larghezza: number, scelto: number }) {
  if (!m) return <VStack frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
    <Text font={12} foregroundStyle={C.tenue}>Meteo non disponibile: apri lo script (▶) per salvare la posizione</Text>
    <Spacer />
    <HStack><Spacer /><Pulsante icona="calendar" intent={CambiaVista({ vista: 'cal' })} size={24} /></HStack>
  </VStack>
  // giorno scelto: oggi = adesso + le prossime 5 ore; un altro giorno = 6 ore distribuite nella giornata
  const sg = Math.max(0, Math.min(5, scelto || 0))
  const dSg = inizioGiorno(ora, sg)
  const tutteSg = (m.orarie || {})[chiave(dSg)] || []
  const ore = sg === 0 ? (m.prossime || []).slice(0, 5)
    : [6, 9, 12, 15, 18, 21].map(h => tutteSg.find(o => o.h === h)).filter(Boolean) as any[]
  const pg = (sg === 0 ? (m.prossime || []) : tutteSg.filter(o => o.h >= 6)).find(o => precipitazione(o.cond) || (o.p || 0) >= 0.5)
  const gSg = (m.giorni || []).find(x => x.k === chiave(dSg))
  const titolo = sg === 0 ? 'Oggi' : sg === 1 ? 'Domani' : `${GIORNI[dSg.getDay()]} ${dSg.getDate()}`
  const cw = Math.floor((larghezza - 4 * 5) / 6)
  const giorni = [0, 1, 2, 3, 4, 5].map(o => {
    const d = inizioGiorno(ora, o)
    return { d, g: (m.giorni || []).find(x => x.k === chiave(d)) }
  })
  const colonna = (h: string, icona: string, t: number, p: number, forte: boolean) =>
    <VStack spacing={2} frame={{ maxWidth: 'infinity' }}>
      <Text font={13} fontWeight={forte ? 'bold' : 'regular'} foregroundStyle={C.testo}>{h}</Text>
      <HStack frame={{ height: 28 }}><IconaMeteo nome={icona} size={24} /></HStack>
      <Text font={17} fontWeight={forte ? 'bold' : 'semibold'} foregroundStyle={C.testo}>{`${t}°`}</Text>
      <Text font={11} fontWeight="semibold" foregroundStyle="systemBlue">{p >= 0.1 ? `${Math.round(p * 100)}%` : ' '}</Text>
    </VStack>
  return <VStack alignment="leading" spacing={8} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    {/* oggi, in evidenza: tocco = app Meteo */}
    <Link url="weather://">
      <ZStack frame={{ maxWidth: 'infinity' }}>
        <RoundedRectangle fill={TINTA_BLU} cornerRadius={14} />
        <VStack spacing={4} padding={{ top: 8, bottom: 8, horizontal: 6 }}>
          <HStack padding={{ horizontal: 4 }}>
            <Text font={12} fontWeight="bold" foregroundStyle={C.testo}>{sg === 0 || !gSg ? titolo : `${titolo} · ${gSg.max}° / ${gSg.min}°`}</Text>
            <Spacer />
            {pg ? <HStack spacing={3}>
              <Image systemName="umbrella.fill" font={11} foregroundStyle="systemBlue" />
              <Text font={11} fontWeight="semibold" foregroundStyle="systemBlue">{`${precipitazione(pg.cond) || 'pioggia'} dalle ${pg.h}`}</Text>
            </HStack> : null}
            <Pulsante icona="calendar" intent={CambiaVista({ vista: 'cal' })} size={22} chiaro />
          </HStack>
          <HStack spacing={0}>
            {sg === 0 ? colonna('Ora', m.icona, m.temp, 0, true) : null}
            {ore.length ? ore.map(o => colonna(String(o.h), o.icona, o.t, o.p || 0, false))
              : <Text font={11} foregroundStyle={C.tenue}>Previsioni orarie non ancora disponibili</Text>}
          </HStack>
        </VStack>
      </ZStack>
    </Link>
    {/* oggi e i prossimi 5 giorni: tocco = le ore di quel giorno nella fascia sopra */}
    <HStack spacing={4}>
      {giorni.map(({ d, g }, i) => {
        const su = i === sg
        return <Button buttonStyle="plain" intent={ScegliGiornoMeteo({ offset: i })}>
          <ZStack frame={{ width: cw, height: 80 }}>
            <RoundedRectangle fill={su ? TINTA_BLU : C.riquadro} cornerRadius={8} />
            <VStack spacing={2}>
              <Text font={11} fontWeight="bold" foregroundStyle={su ? 'systemBlue' : C.tenue}>{i === 0 ? 'Oggi' : GG[d.getDay()]}</Text>
              <HStack frame={{ height: 24 }}><IconaMeteo nome={g ? g.icona : 'cloud'} size={19} /></HStack>
              <HStack spacing={2}>
                <Text font={12} fontWeight="semibold" foregroundStyle={C.testo}>{g ? `${g.max}°` : '–'}</Text>
                <Text font={11} foregroundStyle={C.tenue}>{g ? `${g.min}°` : ''}</Text>
              </HStack>
              <Text font={10} fontWeight="semibold" foregroundStyle="systemBlue">{g && (g.p || 0) >= 0.1 ? `${Math.round((g.p || 0) * 100)}%` : ' '}</Text>
            </VStack>
          </ZStack>
        </Button>
      })}
    </HStack>
  </VStack>
}
function GrandeB(p: { m: Meteo | null, vista: string, giornoMeteo: number, quantiDelGiorno: number, inizio: number, sel: number, conta: Record<number, number>, lista: Ev[], indice: number, larghezza: number }) {
  return <VStack alignment="leading" spacing={6} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <TestaB m={p.m} vista={p.vista} />
    <Rectangle fill={C.linea} frame={{ maxWidth: 'infinity', minHeight: 1, maxHeight: 1 }} />
    {p.vista === 'meteo' && p.m
      ? <MeteoB m={p.m} larghezza={p.larghezza} scelto={p.giornoMeteo} />
      : <ImpegniB inizio={p.inizio} sel={p.sel} conta={p.conta} lista={p.lista} quantiDelGiorno={p.quantiDelGiorno} indice={p.indice} larghezza={p.larghezza} />}
  </VStack>
}

// ---------- 6. Grande "A": ora e meteo in alto, 6 ore, 4 impegni, tasti in basso a destra ----------
function GrandeA({ m, lista, indice }: { m: Meteo | null, lista: Ev[], indice: number }) {
  const RIGA = 32, PER_PAGINA = 4
  const sel = Math.min(indice, Math.max(0, lista.length - 1))
  const inizioFin = Math.floor(sel / PER_PAGINA) * PER_PAGINA // pagine da 4: superato il quarto si gira pagina
  const finestra = lista.slice(inizioFin, inizioFin + PER_PAGINA)
  const colore = (lista[sel] && lista[sel].colore) || C.rosso
  const linea = <Rectangle fill={C.linea} frame={{ maxWidth: 'infinity', minHeight: 0.5, maxHeight: 0.5 }} />
  return <VStack alignment="leading" spacing={0} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    {/* in alto: data, ora e secondi a sinistra (tocco = Orologio), meteo adesso a destra (tocco = Meteo) */}
    <Link url={APRI_OROLOGIO}><DataPiccola lunga /></Link>
    <HStack alignment="top" spacing={8}>
      <Link url={APRI_OROLOGIO}>
        <OraESecondi size={54} sec={18} />
      </Link>
      <Spacer />
      {m ? <Link url="weather://"><HStack spacing={6} padding={{ top: 6 }}>
        <Image systemName={m.icona} font={22} symbolRenderingMode="multicolor" foregroundStyle={C.tenue} />
        <Text font={28} fontWeight="light" foregroundStyle={C.testo}>{`${m.temp}°`}</Text>
        <VStack alignment="leading" spacing={0}>
          <Text font={12} fontWeight="semibold" foregroundStyle={C.testo} lineLimit={1}>{m.testo || ' '}</Text>
          <Text font={11} foregroundStyle={C.tenue} lineLimit={1}>{`↑${m.max}° ↓${m.min}°`}</Text>
        </VStack>
      </HStack></Link> : null}
    </HStack>
    {/* le prossime 6 ore */}
    {m && (m.prossime || []).length ? <Link url="weather://"><HStack spacing={0} padding={{ top: 6, bottom: 4 }}>
      {(m.prossime || []).slice(0, 6).map(o => <VStack spacing={1} frame={{ maxWidth: 'infinity' }}>
        <Text font={10} foregroundStyle={C.tenue}>{String(o.h)}</Text>
        <Image systemName={o.icona} font={15} symbolRenderingMode="multicolor" foregroundStyle={C.tenue} frame={{ height: 18 }} />
        <Text font={12} fontWeight="semibold" foregroundStyle={C.testo}>{`${o.t}°`}</Text>
        <Text font={8} fontWeight="semibold" foregroundStyle="systemBlue" lineLimit={1} minScaleFactor={0.7}>{precipitazione(o.cond) || ' '}</Text>
      </VStack>)}
    </HStack></Link> : null}
    {/* impegni */}
    <Text font={11} fontWeight="bold" foregroundStyle={colore} padding={{ top: 2, bottom: 3 }}>PROSSIMI</Text>
    {[0, 1, 2, 3].map(k => {
      const r = finestra[k]
      if (!r) return <VStack spacing={0} frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
        {linea}
        <HStack frame={{ maxWidth: 'infinity', minHeight: RIGA, maxHeight: RIGA, alignment: 'leading' }}>
          {k === 0 && !lista.length ? <Text font={12} foregroundStyle={C.tenue}>Niente in vista</Text> : <Spacer />}
        </HStack>
      </VStack>
      const scelto = inizioFin + k === sel
      return <Link url={apriImpegno(r)}>
        <VStack spacing={0} frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
          {linea}
          <HStack spacing={7} frame={{ maxWidth: 'infinity', minHeight: RIGA, maxHeight: RIGA, alignment: 'leading' }}>
            <RoundedRectangle fill={scelto ? r.colore : 'systemGray3'} cornerRadius={1.5} frame={{ width: 3, height: RIGA - 8 }} />
            <VStack alignment="leading" spacing={0} frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
              <Text font={12} fontWeight={scelto ? 'bold' : 'medium'} foregroundStyle={C.testo} lineLimit={1}>{maiuscola(r.titolo)}</Text>
              <Text font={10} fontWeight={scelto ? 'semibold' : 'regular'} foregroundStyle={scelto ? r.colore : C.tenue} lineLimit={1}>{quando(r)}</Text>
            </VStack>
          </HStack>
        </VStack>
      </Link>
    })}
    <Spacer />
    <HStack spacing={7}>
      <Spacer />
      <Pulsante icona="chevron.up" intent={CambiaEvento({ delta: -1 })} size={22} />
      <Segui size={22} e={lista[sel] || null} />
      <Pulsante icona="chevron.down" intent={CambiaEvento({ delta: 1 })} size={22} />
    </HStack>
  </VStack>
}
function ContoAllaRovescia({ m, lista, indice }: { m: Meteo | null, lista: Ev[], indice: number }) {
  // Lista dei prossimi impegni: ne mostra 3, e la finestra segue quello scelto con le frecce
  const RIGA = 32
  const sel = Math.min(indice, Math.max(0, lista.length - 1))
  const inizioFin = Math.floor(sel / 3) * 3 // pagine da 3: superato il terzo si gira pagina
  const finestra = lista.slice(inizioFin, inizioFin + 3)
  return <HStack spacing={12} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
    <VStack alignment="leading" spacing={0} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
      <Link url={APRI_OROLOGIO}>
        <VStack alignment="leading" spacing={0}>
          <DataPiccola lunga={false} />
          <OraESecondi size={46} sec={18} />
        </VStack>
      </Link>
      <Spacer />
      {m ? <Link url="weather://"><HStack spacing={8} alignment="bottom">
        {/* adesso: temperatura, condizione scritta, max/min */}
        <VStack alignment="leading" spacing={0}>
          <Text font={24} fontWeight="light" foregroundStyle={C.testo}>{`${m.temp}°`}</Text>
          <Text font={10} fontWeight="semibold" foregroundStyle={C.testo} lineLimit={1}>{m.testo || ' '}</Text>
          <Text font={9} foregroundStyle={C.tenue} lineLimit={1}>{`↑${m.max}° ↓${m.min}°`}</Text>
        </VStack>
        {/* prossime 3 ore: icona a colori e, se piove, la parola in azzurro */}
        <HStack spacing={4} alignment="top">
          {(m.prossime || []).slice(0, 3).map(o => <VStack spacing={1} frame={{ width: 26 }}>
            <Text font={9} foregroundStyle={C.tenue}>{String(o.h)}</Text>
            <Image systemName={o.icona} font={13} symbolRenderingMode="multicolor" foregroundStyle={C.tenue} frame={{ height: 16 }} />
            <Text font={10} fontWeight="semibold" foregroundStyle={C.testo}>{`${o.t}°`}</Text>
            <Text font={7} fontWeight="semibold" foregroundStyle="systemBlue" lineLimit={1} minScaleFactor={0.7}>{precipitazione(o.cond) || ' '}</Text>
          </VStack>)}
        </HStack>
      </HStack></Link> : null}
    </VStack>
    {/* impegni senza riquadro: "PROSSIMI", righe divise da linee sottili, tasti piccoli in basso a destra */}
    <VStack alignment="leading" spacing={0} frame={{ width: 150, maxHeight: 'infinity', alignment: 'topLeading' }}>
      <Text font={10} fontWeight="bold" foregroundStyle={(lista[sel] && lista[sel].colore) || C.rosso} padding={{ bottom: 3 }}>PROSSIMI</Text>
      {[0, 1, 2].map(k => {
        const r = finestra[k]
        if (!r) return <VStack spacing={0} frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
          <Rectangle fill={C.linea} frame={{ maxWidth: 'infinity', minHeight: 0.5, maxHeight: 0.5 }} />
          <HStack frame={{ maxWidth: 'infinity', minHeight: RIGA, maxHeight: RIGA, alignment: 'leading' }}>
            {k === 0 && !lista.length ? <Text font={11} foregroundStyle={C.tenue}>Niente in vista</Text> : <Spacer />}
          </HStack>
        </VStack>
        const scelto = inizioFin + k === sel
        return <Link url={apriImpegno(r)}>
          <VStack spacing={0} frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
            <Rectangle fill={C.linea} frame={{ maxWidth: 'infinity', minHeight: 0.5, maxHeight: 0.5 }} />
            <HStack spacing={6} frame={{ maxWidth: 'infinity', minHeight: RIGA, maxHeight: RIGA, alignment: 'leading' }}>
              <RoundedRectangle fill={scelto ? r.colore : 'systemGray3'} cornerRadius={1.5} frame={{ width: 3, height: RIGA - 8 }} />
              <VStack alignment="leading" spacing={0} frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
                <Text font={11} fontWeight={scelto ? 'bold' : 'medium'} foregroundStyle={C.testo} lineLimit={1}>{maiuscola(r.titolo)}</Text>
                <Text font={9} fontWeight={scelto ? 'semibold' : 'regular'} foregroundStyle={scelto ? r.colore : C.tenue} lineLimit={1}>{quando(r)}</Text>
              </VStack>
            </HStack>
          </VStack>
        </Link>
      })}
      <Spacer />
      <HStack spacing={6}>
        <Spacer />
        <Pulsante icona="chevron.up" intent={CambiaEvento({ delta: -1 })} size={20} />
        <Segui size={20} e={lista[sel] || null} />
        <Pulsante icona="chevron.down" intent={CambiaEvento({ delta: 1 })} size={20} />
      </HStack>
    </VStack>
  </HStack>
}

// ---------- 3. Striscia della giornata (media) ----------
function Striscia({ m, lista, giorno, larghezza }: { m: Meteo | null, lista: Ev[], giorno: number, larghezza: number }) {
  const DA = 6, A = 22, W = larghezza
  const x = (t: number) => Math.max(0, Math.min(W, (t - DA) / (A - DA) * W))
  const base = inizioGiorno(ora, giorno).getTime()
  const ore = (ms: number) => (ms - base) / 3600000
  const blocchi = lista.filter(e => !e.tuttoIlGiorno)
  const adesso = ore(Date.now())
  const temp = (m?.ore || []).filter(o => [8, 11, 14, 17, 20].includes(o.h))
  return <VStack alignment="leading" spacing={6} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
    <HStack alignment="center">
      <Ora size={40} />
      <Spacer />
      <VStack alignment="trailing" spacing={4}>
        <DataPiccola giorno={giorno} lunga={false} />
        <HStack spacing={5}>
          <Pulsante icona="chevron.left" intent={CambiaGiorno({ delta: -1 })} size={22} />
          <Pulsante icona="chevron.right" intent={CambiaGiorno({ delta: 1 })} size={22} />
          <Nuovo giorno={giorno} size={22} />
        </HStack>
      </VStack>
    </HStack>
    <ZStack alignment="leading" frame={{ width: W, height: 20 }}>
      <RoundedRectangle fill={C.pista} cornerRadius={6} frame={{ width: W, height: 20 }} />
      {blocchi.map(e => {
        const a = x(ore(e.inizio)), b = x(ore(e.fine))
        return <RoundedRectangle fill={e.colore} cornerRadius={4} frame={{ width: Math.max(6, b - a), height: 14 }} padding={{ leading: a }} />
      })}
      {giorno === 0 && adesso > DA && adesso < A ? <RoundedRectangle fill={C.testo} cornerRadius={1} frame={{ width: 2, height: 20 }} padding={{ leading: x(adesso) }} /> : null}
    </ZStack>
    <HStack spacing={10}>
      {blocchi.length ? blocchi.slice(0, 2).map(e => <HStack spacing={4}>
        <RoundedRectangle fill={e.colore} cornerRadius={2} frame={{ width: 7, height: 7 }} />
        <Text font={10} fontWeight="semibold" foregroundStyle={C.testo} lineLimit={1}>{`${hhmm(new Date(e.inizio))} ${e.titolo}`}</Text>
      </HStack>) : <Text font={10} foregroundStyle={C.tenue}>Nessun impegno</Text>}
    </HStack>
    {giorno === 0 && temp.length ? <HStack spacing={0} frame={{ width: W }}>
      {temp.map(o => <VStack spacing={1} frame={{ maxWidth: 'infinity' }}>
        <HStack spacing={2}><Image systemName={o.icona} font={11} foregroundStyle={C.testo} /><Text font={10} fontWeight="semibold" foregroundStyle={C.testo}>{`${o.t}°`}</Text></HStack>
        <Text font={9} foregroundStyle={C.tenue}>{`${o.h}:00`}</Text>
      </VStack>)}
    </HStack> : null}
  </VStack>
}

// ---------- 4. Cruscotto della giornata (grande) ----------
function Cruscotto({ m, lista, prom, giorno, larghezza }: { m: Meteo | null, lista: Ev[], prom: Prom[], giorno: number, larghezza: number }) {
  const ore = (m?.ore || []).filter(o => o.h >= 7 && o.h <= 20)
  const tmax = Math.max(...ore.map(o => o.t), 1), tmin = Math.min(...ore.map(o => o.t), 0)
  const bw = ore.length ? Math.floor((larghezza - (ore.length - 1) * 3) / ore.length) : 10
  return <VStack alignment="leading" spacing={8} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <HStack alignment="top">
      <VStack alignment="leading" spacing={0}>
        <DataPiccola />
        <Ora size={50} />
      </VStack>
      <Spacer />
      {m ? <VStack alignment="trailing" spacing={2}>
        <Image systemName={m.icona} font={26} foregroundStyle={C.testo} />
        <Text font={17} fontWeight="semibold" foregroundStyle={C.testo}>{`${m.temp}°`}</Text>
        <Text font={10} foregroundStyle={C.tenue}>{`${m.max}° / ${m.min}°`}</Text>
      </VStack> : null}
    </HStack>
    {ore.length ? <VStack alignment="leading" spacing={3}>
      <HStack alignment="bottom" spacing={3} frame={{ height: 42 }}>
        {ore.map(o => <VStack spacing={2}>
          <Text font={8} foregroundStyle={C.tenue}>{`${o.t}°`}</Text>
          <RoundedRectangle fill={o.h === ora.getHours() ? C.rosso : C.pista} cornerRadius={3}
            frame={{ width: bw, height: 8 + 22 * (o.t - tmin) / Math.max(1, tmax - tmin) }} />
        </VStack>)}
      </HStack>
      <HStack spacing={3}>{ore.map(o => <Text font={8} foregroundStyle={o.h === ora.getHours() ? C.rosso : C.debole} frame={{ width: bw }}>{o.h % 2 === 0 ? String(o.h) : ''}</Text>)}</HStack>
    </VStack> : null}
    <RoundedRectangle fill={C.linea} frame={{ width: larghezza, height: 1 }} />
    <HStack>
      <DataPiccola giorno={giorno} lunga={false} />
      <Spacer />
      <HStack spacing={6}>
        <Pulsante icona="chevron.left" intent={CambiaGiorno({ delta: -1 })} />
        <Pulsante icona="chevron.right" intent={CambiaGiorno({ delta: 1 })} />
        <Nuovo giorno={giorno} />
      </HStack>
    </HStack>
    <VStack alignment="leading" spacing={6}>
      {lista.length ? lista.slice(0, 3).map(e => <RigaEvento e={e} larghezza={larghezza} />) : <Nessuno />}
    </VStack>
    <Spacer />
    {prom.length ? <VStack alignment="leading" spacing={5}>
      <RoundedRectangle fill={C.linea} frame={{ width: larghezza, height: 1 }} />
      <HStack spacing={14}>
        {prom.slice(0, 2).map(p => <Button buttonStyle="plain" intent={Completa({ id: p.id })}>
          <HStack spacing={5}>
            <Image systemName={p.fatto ? 'checkmark.circle.fill' : 'circle'} font={15} foregroundStyle={p.fatto ? 'systemGreen' : C.tenue} />
            <Text font={12} foregroundStyle={C.testo} lineLimit={1}>{p.titolo}</Text>
          </HStack>
        </Button>)}
      </HStack>
    </VStack> : null}
  </VStack>
}

// ---------- 5. Settimana con meteo (grande) ----------
function Settimana({ m, giorni, sel, lista, larghezza }: { m: Meteo | null, giorni: Record<number, number>, sel: number, lista: Ev[], larghezza: number }) {
  const offs = [-2, -1, 0, 1, 2, 3, 4]
  const cw = Math.floor((larghezza - 6 * 3) / 7)
  const dSel = inizioGiorno(ora, sel)
  const titolo = sel === 0 ? 'Oggi' : sel === 1 ? 'Domani' : `${GIORNI[dSel.getDay()]} ${dSel.getDate()}`
  return <VStack alignment="leading" spacing={10} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <HStack alignment="bottom">
      <Ora size={52} />
      <Spacer />
      <VStack alignment="trailing" spacing={0}>
        <Text font={12} fontWeight="bold" foregroundStyle={C.rosso}>{GIORNI[ora.getDay()].toUpperCase()}</Text>
        <Text font={13} fontWeight="semibold" foregroundStyle={C.testo}>{`${ora.getDate()} ${MM[ora.getMonth()]}`}</Text>
      </VStack>
    </HStack>
    <HStack spacing={3}>
      {offs.map(o => {
        const d = inizioGiorno(ora, o)
        const md = (m?.giorni || []).find(g => g.k === `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`)
        const scelto = o === sel, oggi = o === 0
        const fg = scelto ? 'white' : C.testo
        return <Button buttonStyle="plain" intent={ScegliGiorno({ offset: o })}>
          <ZStack frame={{ width: cw, height: 70 }}>
            <RoundedRectangle fill={scelto ? C.rosso : (oggi ? C.riquadro : 'clear')} cornerRadius={12} />
            <VStack spacing={2}>
              <Text font={9} fontWeight="bold" foregroundStyle={scelto ? 'white' : (d.getDay() === 0 ? C.rosso : C.tenue)}>{G1[d.getDay()]}</Text>
              <Text font={16} fontWeight="bold" foregroundStyle={fg}>{String(d.getDate())}</Text>
              {md ? <Image systemName={md.icona} font={12} foregroundStyle={fg} /> : <Text font={12}> </Text>}
              <Text font={9} fontWeight="semibold" foregroundStyle={fg}>{md ? `${md.max}°` : ' '}</Text>
              {giorni[o] ? <Circle fill={scelto ? 'white' : C.tenue} frame={{ width: 4, height: 4 }} /> : <Circle fill="clear" frame={{ width: 4, height: 4 }} />}
            </VStack>
          </ZStack>
        </Button>
      })}
    </HStack>
    <HStack>
      <Text font={13} fontWeight="bold" foregroundStyle={C.testo}>{`${titolo} · ${lista.length ? lista.length + (lista.length === 1 ? ' impegno' : ' impegni') : 'libero'}`}</Text>
      <Spacer />
      <Nuovo giorno={sel} />
    </HStack>
    <VStack spacing={5}>
      {lista.slice(0, 3).map(e => <ZStack frame={{ width: larghezza, height: 40 }}>
        <RoundedRectangle fill={C.riquadro} cornerRadius={12} />
        <HStack spacing={10} padding={{ horizontal: 10 }}>
          <Text font={13} fontWeight="bold" monospacedDigit foregroundStyle={C.testo} frame={{ width: 44, alignment: 'leading' }}>{e.tuttoIlGiorno ? 'Tutto' : hhmm(new Date(e.inizio))}</Text>
          <Barretta colore={e.colore} alta={22} />
          <VStack alignment="leading" spacing={0}>
            <Text font={13} fontWeight="semibold" foregroundStyle={C.testo} lineLimit={1}>{e.titolo}</Text>
            {e.luogo ? <Text font={10} foregroundStyle={C.tenue} lineLimit={1}>{e.luogo}</Text> : null}
          </VStack>
          <Spacer />
        </HStack>
      </ZStack>)}
    </VStack>
    <Spacer />
  </VStack>
}

// ---------- piccolo ----------
function Piccolo({ prossimo, m }: { prossimo: Ev | null, m: Meteo | null }) {
  return <VStack alignment="leading" spacing={2} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <HStack><DataPiccola lunga={false} /><Spacer /><MeteoBreve m={m} size={12} /></HStack>
    <Ora size={34} />
    <Spacer />
    {prossimo ? <HStack spacing={6}>
      <Barretta colore={prossimo.colore} alta={28} />
      <VStack alignment="leading" spacing={0}>
        <Text font={12} fontWeight="semibold" foregroundStyle={C.testo} lineLimit={1}>{prossimo.titolo}</Text>
        <Text font={11} foregroundStyle={C.tenue} lineLimit={1}>{`${quando(prossimo)} · ${mancano(prossimo)}`}</Text>
      </VStack>
    </HStack> : <Nessuno testo="Nessun impegno in vista" />}
  </VStack>
}

// ---------- schermata di blocco ----------
function Rettangolare({ prossimo }: { prossimo: Ev | null }) {
  if (!prossimo) return <VStack alignment="leading" spacing={0} frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
    <Text font={13} fontWeight="semibold">{`${GIORNI[ora.getDay()]} ${ora.getDate()} ${MESI[ora.getMonth()]}`}</Text>
    <Text font={13}>Nessun impegno in vista</Text>
  </VStack>
  const futuro = prossimo.inizio > Date.now()
  return <VStack alignment="leading" spacing={0} frame={{ maxWidth: 'infinity', alignment: 'leading' }}>
    <HStack spacing={3}>
      <Image systemName="calendar" font={11} widgetAccentable />
      <Text font={11} fontWeight="semibold" widgetAccentable>{futuro ? 'PROSSIMO · ' : 'IN CORSO · '}</Text>
      {futuro ? <DateLabel date={new Date(prossimo.inizio)} style="relative" font={11} fontWeight="semibold" lineLimit={1} /> : <Text font={11}>{hhmm(new Date(prossimo.inizio))}</Text>}
    </HStack>
    <Text font={15} fontWeight="bold" lineLimit={1}>{prossimo.titolo}</Text>
    <Text font={12} lineLimit={1}>{`${quando(prossimo)} – ${hhmm(new Date(prossimo.fine))}`}</Text>
  </VStack>
}
function Circolare() {
  return <ZStack>
    <Circle fill="rgba(255,255,255,0.18)" />
    <VStack spacing={0}>
      <Text font={10} fontWeight="bold" widgetAccentable>{MM[ora.getMonth()].toUpperCase()}</Text>
      <Text font={24} fontWeight="bold">{String(ora.getDate())}</Text>
    </VStack>
  </ZStack>
}

// ---------- avvio ----------
async function main() {
  try { await disegna() } catch (e) {
    Widget.present(<VStack padding={12}><Text font={12} fontWeight="bold" foregroundStyle="systemRed">Errore nel widget</Text><Text font={10}>{String(e)}</Text></VStack>)
  }
}

async function disegna() {
  const fam = Widget.family as string
  const { w, h } = misure()
  const L = w - 32
  const st = leggiStato()
  const p = parseInt(String(Widget.parameter || '').replace(/["'\s]/g, ''), 10)
  const layout = fam === 'systemLarge' || fam === 'systemExtraLarge'
    ? (p === 4 || p === 5 || p === 6 ? p : 7) // 7 = grande "B" (predefinito), 6 = il vecchio grande "A"
    : fam === 'systemMedium' ? ([1, 2, 3].includes(p) ? p : 2) : 0

  // Si aggiorna ogni 15 minuti, all'una (l'iPhone torna a scrivere l'ora), alle 10:00 (l'ora passa da 1 a 2 cifre) e a mezzanotte
  const tra15 = new Date(Date.now() + 15 * 60 * 1000)
  const una = new Date(mezzanotte); una.setHours(1)
  const dieci = new Date(mezzanotte); dieci.setHours(10)
  const domani = inizioGiorno(ora, 1)
  const prossimaRicarica = [tra15, domani, ...(ora < una ? [una] : []), ...(ora < dieci ? [dieci] : [])].sort((x, y) => x.getTime() - y.getTime())[0]
  const ricarica = { policy: 'after', date: prossimaRicarica } as any

  if (fam === 'accessoryRectangular' || fam === 'accessoryInline') {
    const [prossimo] = await prossimi(1)
    if (fam === 'accessoryInline') {
      Widget.present(<Text>{prossimo ? `${hhmm(new Date(prossimo.inizio))} ${prossimo.titolo}` : `${GG[ora.getDay()]} ${ora.getDate()} ${MM[ora.getMonth()]}`}</Text>, ricarica)
    } else {
      Widget.present(<Rettangolare prossimo={prossimo || null} />, ricarica)
    }
    return
  }
  if (fam === 'accessoryCircular') { Widget.present(<Circolare />, ricarica); return }

  // le frecce scorrono fino a 30 impegni nei prossimi 60 giorni
  const [m, vicini] = await Promise.all([meteo(), prossimi(30, 60)])
  salvaQuanti(vicini.length)
  const prossimo = vicini[0] || null
  let corpo: any

  if (layout === 0) corpo = <Piccolo prossimo={prossimo} m={m} />
  else if (layout === 1) corpo = <OraGigante m={m} prossimo={prossimo} />
  else if (layout === 2) corpo = <ContoAllaRovescia m={m} lista={vicini} indice={st.evento} />
  else if (layout === 3) {
    const l = await eventiTra(inizioGiorno(ora, st.giorno), inizioGiorno(ora, st.giorno + 1))
    corpo = <Striscia m={m} lista={l || []} giorno={st.giorno} larghezza={L} />
  } else if (layout === 4) {
    const [l, pr] = await Promise.all([eventiTra(inizioGiorno(ora, st.giorno), inizioGiorno(ora, st.giorno + 1)), promemoria(2)])
    corpo = <Cruscotto m={m} lista={l || []} prom={pr} giorno={st.giorno} larghezza={L} />
  } else if (layout === 6) {
    corpo = <GrandeA m={m} lista={vicini} indice={st.evento} />
  } else if (layout === 7) {
    // settimana mostrata (da oggi, a blocchi di 7 giorni) e giorno scelto dentro la settimana
    const da0 = (st.sett || 0) * 7
    const sel = st.sel >= da0 && st.sel < da0 + 7 ? st.sel : da0
    const tutti = await eventiTra(inizioGiorno(ora, da0), inizioGiorno(ora, da0 + 7)) || []
    const conta: Record<number, number> = {}
    for (const e of tutti) {
      const o = Math.round((inizioGiorno(new Date(e.inizio)).getTime() - mezzanotte.getTime()) / 86400000)
      conta[o] = (conta[o] || 0) + 1
    }
    const da = inizioGiorno(ora, sel).getTime(), a = inizioGiorno(ora, sel + 1).getTime()
    const delGiorno = tutti.filter(e => e.inizio >= da && e.inizio < a)
    // se il giorno ha pochi impegni, sotto si mostrano i prossimi dei giorni seguenti
    const dopo = delGiorno.length < 4 ? vicini.filter(e => e.inizio >= a).slice(0, 4 - delGiorno.length) : []
    const lista = [...delGiorno, ...dopo]
    salvaQuanti(lista.length) // le frecce ↑ ↓ si fermano all'ultimo impegno
    corpo = <GrandeB m={m} vista={st.vista || 'cal'} giornoMeteo={st.giornoMeteo || 0} quantiDelGiorno={delGiorno.length} inizio={da0} sel={sel} conta={conta} lista={lista} indice={st.evento} larghezza={L} />
  } else {
    const tutti = await eventiTra(inizioGiorno(ora, -2), inizioGiorno(ora, 5)) || []
    const giorni: Record<number, number> = {}
    for (const e of tutti) {
      const o = Math.round((inizioGiorno(new Date(e.inizio)).getTime() - mezzanotte.getTime()) / 86400000)
      giorni[o] = (giorni[o] || 0) + 1
    }
    const da = inizioGiorno(ora, st.sel).getTime(), a = inizioGiorno(ora, st.sel + 1).getTime()
    corpo = <Settimana m={m} giorni={giorni} sel={st.sel} lista={tutti.filter(e => e.inizio >= da && e.inizio < a)} larghezza={L} />
  }

  Widget.present(
    <VStack widgetBackground={{ light: '#FFFFFF', dark: '#1C1C1E' }} widgetURL={layout === 2 || layout === 6 || layout === 7 ? APRI_OROLOGIO : 'calshow://'} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
      <VStack padding={16} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
        {corpo}
      </VStack>
    </VStack>,
    ricarica
  )
}

main()
