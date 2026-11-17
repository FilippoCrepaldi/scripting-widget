// Widget "Da fare" – lista aggiornata dai riepiloghi del mattino e della sera
// In alto "3 di 16 fatte" con la barra a tacche; sotto i riquadri per tipo (sono filtri:
// toccali per vedere solo quelle, ritoccali per tornare a tutte). Le fatte restano barrate
// in fondo: tocca la spunta verde per toglierla.
import { VStack, HStack, Text, Image, Spacer, Button, Widget, RoundedRectangle } from 'scripting'
import { SegnaFatto, CambiaVista, CambiaPagina } from './app_intents'
import { carica, fatti, pulisci, daInviare, inviaFatti, ordina, tipo, gruppoDi, GRUPPI, urlDati, vista, pagina, APRI_LISTA, Dati, Voce } from './comune'

const C: any = {
  sfondo: { light: '#FFFFFF', dark: '#1C1C1E' },
  blu: { light: '#0F3F7C', dark: '#8DBEF5' },
  chip: { light: '#F1F4F8', dark: '#2C2C2E' },
  testo: { light: '#0A1626', dark: '#F1F5FB' },
  secondario: { light: '#3C4B61', dark: '#C0CCE0' },
  terziario: { light: '#6B7A90', dark: '#93A4BD' },
  barrato: { light: '#93A4BD', dark: '#6B7A90' },
  vuota: { light: '#E3E7ED', dark: '#3A3A3C' },
  spento: { light: '#C9D0DA', dark: '#48484A' },
  verde: { light: '#16784C', dark: '#30D158' },
  rosso: { light: '#C62828', dark: '#FF6961' },
  bianco: { light: '#FFFFFF', dark: '#FFFFFF' },
}

type Riga = { v: Voce, fatta: boolean }

// prepara tutto: conti, gruppi, elenco filtrato e pagina
function prepara(d: Dati, perPagina: number) {
  pulisci(d)
  const f = fatti()
  const tutte = ordina(d.voci || [])
  const aperte = tutte.filter(v => !f[v.id])
  const chiuse = tutte.filter(v => f[v.id])
  const filtro = vista()
  let elenco: Riga[]
  if (filtro === 'fatte') elenco = chiuse.map(v => ({ v, fatta: true }))
  else {
    const dentro = (v: Voce) => filtro === 'tutte' || gruppoDi(v) === filtro
    elenco = [...aperte.filter(dentro).map(v => ({ v, fatta: false })), ...chiuse.filter(dentro).map(v => ({ v, fatta: true }))]
  }
  const pagine = Math.max(1, Math.ceil(elenco.length / perPagina))
  const p = Math.min(pagina(), pagine - 1)
  const gruppi = GRUPPI.map(g => {
    const voci = tutte.filter(v => gruppoDi(v) === g.k)
    return { ...g, aperte: voci.filter(v => !f[v.id]).length, segni: voci.map(v => !!f[v.id]) }
  })
  return { tutte, aperte, chiuse, filtro, pagine, p, gruppi, vis: elenco.slice(p * perPagina, (p + 1) * perPagina) }
}
type S = ReturnType<typeof prepara>

// ---------- pezzi ----------
// barra a tacche: una tacca per voce, verde quando è fatta
function Barra({ fatte, totale, altezza }: { fatte: number, totale: number, altezza: number }) {
  const n = Math.max(1, totale)
  return <HStack spacing={n > 20 ? 1.5 : 2.5}>
    {Array.from({ length: n }, (_, i) =>
      <RoundedRectangle cornerRadius={2} fill={i < fatte ? C.verde : C.vuota} frame={{ maxWidth: 'infinity', height: altezza }} />)}
  </HStack>
}

function Freccia({ verso, attiva }: { verso: number, attiva: boolean }) {
  const icona = <Image systemName={verso < 0 ? 'chevron.left' : 'chevron.right'} font={12} fontWeight="bold"
    foregroundStyle={attiva ? C.blu : C.spento} padding={{ horizontal: 6, vertical: 4 }} />
  return attiva ? <Button buttonStyle="plain" intent={CambiaPagina({ delta: verso })}>{icona}</Button> : icona
}

function Testa({ s, dopo, grande }: { s: S, dopo: string, grande: boolean }) {
  return <HStack alignment="center" spacing={6}>
    <Text font={grande ? 22 : 19} fontWeight="heavy" foregroundStyle={C.testo}>{`${s.chiuse.length} di ${s.tutte.length}`}</Text>
    <Text font={12} fontWeight="medium" foregroundStyle={C.terziario} lineLimit={1}>{dopo}</Text>
    <Spacer />
    {s.pagine > 1
      ? <HStack spacing={0} background={{ style: C.chip, shape: { type: 'rect', cornerRadius: 8 } } as any}>
          <Freccia verso={-1} attiva={s.p > 0} />
          <Text font={12} fontWeight="bold" foregroundStyle={C.blu}>{`${s.p + 1}/${s.pagine}`}</Text>
          <Freccia verso={1} attiva={s.p < s.pagine - 1} />
        </HStack>
      : null}
  </HStack>
}

// riquadro per tipo (è un tasto-filtro). Medio: nome sopra e numero sotto.
// Grande: numero grande, nome e mini-barra (pieno = fatta).
function Riquadro({ k, nome, n, colore, scelto, segni, grande }:
  { k: string, nome: string, n: number, colore: any, scelto: boolean, segni: boolean[], grande: boolean }) {
  const forte = scelto ? C.bianco : colore
  const lieve = scelto ? C.bianco : C.terziario
  return <Button buttonStyle="plain" intent={CambiaVista({ vista: k })}>
    <VStack alignment="leading" spacing={grande ? 2 : 0} padding={{ horizontal: 6, vertical: grande ? 5 : 3 }}
      frame={{ maxWidth: 'infinity', alignment: 'leading' }}
      background={{ style: scelto ? colore : C.chip, shape: { type: 'rect', cornerRadius: 9 } } as any}>
      {grande
        ? <Text font={17} fontWeight="heavy" foregroundStyle={forte}>{String(n)}</Text>
        : <Text font={10.5} fontWeight="semibold" foregroundStyle={forte} lineLimit={1} minScaleFactor={0.7}>{nome}</Text>}
      {grande
        ? <Text font={10} fontWeight="semibold" foregroundStyle={lieve} lineLimit={1} minScaleFactor={0.7}>{nome}</Text>
        : <Text font={12} fontWeight="heavy" foregroundStyle={forte}>{String(n)}</Text>}
      {grande
        ? <HStack spacing={1.5}>
            {(segni.length ? segni.slice(0, 12) : [false]).map(x =>
              <RoundedRectangle cornerRadius={1} fill={x ? (scelto ? C.bianco : colore) : C.vuota}
                frame={{ maxWidth: 'infinity', height: 3 }} />)}
          </HStack>
        : null}
    </VStack>
  </Button>
}

function Riquadri({ s, grande }: { s: S, grande: boolean }) {
  return <HStack spacing={5}>
    {s.gruppi.map(g => <Riquadro k={g.k} nome={g.nome} n={g.aperte} colore={g.colore}
      scelto={s.filtro === g.k} segni={g.segni} grande={grande} />)}
    <Riquadro k="fatte" nome="Fatte" n={s.chiuse.length} colore={C.verde}
      scelto={s.filtro === 'fatte'} segni={s.chiuse.map(() => true)} grande={grande} />
  </HStack>
}

// una riga: cerchio = spunta; le fatte hanno la spunta verde e sono barrate (tocca per togliere)
function RigaVoce({ r }: { r: Riga }) {
  const t = tipo(r.v)
  return <HStack spacing={8}>
    <Button buttonStyle="plain" intent={SegnaFatto({ id: r.v.id })}>
      <Image systemName={r.fatta ? 'checkmark.circle.fill' : 'circle'} font={17} fontWeight="semibold"
        foregroundStyle={r.fatta ? C.verde : t.colore} />
    </Button>
    {r.fatta
      ? <Text font={13} fontWeight="semibold" foregroundStyle={C.barrato} strikethrough="systemGray" lineLimit={1}>{r.v.testo}</Text>
      : <Text font={13} fontWeight="semibold" foregroundStyle={C.testo} lineLimit={1}>{r.v.testo}</Text>}
    <Spacer />
  </HStack>
}

function Elenco({ s, conTitolo }: { s: S, conTitolo: boolean }) {
  if (!s.vis.length) {
    const testo = s.filtro === 'fatte' ? 'Nessuna voce spuntata' : s.tutte.length ? 'Tutto fatto qui' : 'Niente da fare'
    return <HStack spacing={6}>
      <Image systemName={s.filtro === 'fatte' ? 'circle.dashed' : 'checkmark.circle.fill'} font={15}
        foregroundStyle={s.filtro === 'fatte' ? C.spento : C.verde} />
      <Text font={13} fontWeight="semibold" foregroundStyle={C.secondario}>{testo}</Text>
    </HStack>
  }
  const righe: any[] = []
  s.vis.forEach((r, i) => {
    if (conTitolo && r.fatta && s.filtro !== 'fatte' && (i === 0 || !s.vis[i - 1].fatta))
      righe.push(<Text font={10.5} fontWeight="bold" foregroundStyle={C.verde}>Fatte · tocca per togliere</Text>)
    righe.push(<RigaVoce r={r} />)
  })
  return <VStack alignment="leading" spacing={5}>{righe}</VStack>
}

// ---------- misure ----------
function Piccolo({ d }: { d: Dati }) {
  const f = fatti()
  const tutte = ordina(d.voci || [])
  const aperte = tutte.filter(v => !f[v.id])
  const prima = aperte[0]
  return <VStack alignment="leading" spacing={5} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <HStack alignment="lastTextBaseline" spacing={4}>
      <Text font={30} fontWeight="heavy" foregroundStyle={C.testo}>{String(tutte.length - aperte.length)}</Text>
      <Text font={13} fontWeight="semibold" foregroundStyle={C.terziario}>{`di ${tutte.length} fatte`}</Text>
    </HStack>
    <Barra fatte={tutte.length - aperte.length} totale={tutte.length} altezza={6} />
    <Spacer />
    {prima
      ? <Text font={13} fontWeight="semibold" foregroundStyle={C.testo} lineLimit={3}>{prima.testo}</Text>
      : <Text font={13} fontWeight="semibold" foregroundStyle={C.verde}>Tutto fatto</Text>}
  </VStack>
}

function Medio({ d }: { d: Dati }) {
  const s = prepara(d, 3)
  return <VStack alignment="leading" spacing={6} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <Testa s={s} dopo={d.fonte === 'sera' ? 'fatte · domani' : 'fatte oggi'} grande={false} />
    <Barra fatte={s.chiuse.length} totale={s.tutte.length} altezza={6} />
    <Riquadri s={s} grande={false} />
    <Elenco s={s} conTitolo={false} />
    <Spacer />
  </VStack>
}

function Grande({ d }: { d: Dati }) {
  const s = prepara(d, 9)
  return <VStack alignment="leading" spacing={8} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <Testa s={s} dopo={d.fonte === 'sera' ? 'fatte · domani' : 'fatte · oggi'} grande={true} />
    <Barra fatte={s.chiuse.length} totale={s.tutte.length} altezza={7} />
    <Riquadri s={s} grande={true} />
    <Elenco s={s} conTitolo={true} />
    <Spacer />
  </VStack>
}

function Messaggio({ titolo, testo }: { titolo: string, testo: string }) {
  return <VStack alignment="leading" spacing={4} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <HStack spacing={5}>
      <Image systemName="checklist" font={13} foregroundStyle={C.blu} />
      <Text font={13} fontWeight="semibold" foregroundStyle={C.blu}>Da fare</Text>
    </HStack>
    <Spacer />
    <Text font={15} fontWeight="semibold" foregroundStyle={C.testo}>{titolo}</Text>
    <Text font={12} foregroundStyle={C.terziario}>{testo}</Text>
  </VStack>
}

async function disegna() {
  const d = await carica()
  if (daInviare()) await inviaFatti()   // riprova l'invio delle fatte rimasto indietro
  let corpo
  if (!d) corpo = urlDati()
    ? <Messaggio titolo="Dati non disponibili" testo="Controlla la connessione" />
    : <Messaggio titolo="Manca l'indirizzo" testo="Tocca il widget e salva l'indirizzo dei dati" />
  else {
    const fam = Widget.family
    corpo = fam === 'systemSmall' ? <Piccolo d={d} />
      : fam === 'systemLarge' || fam === 'systemExtraLarge' ? <Grande d={d} />
      : <Medio d={d} />
  }
  Widget.present(
    <VStack widgetBackground={C.sfondo} widgetURL={APRI_LISTA} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
      <VStack padding={14} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
        {corpo}
      </VStack>
    </VStack>,
    { policy: 'after', date: new Date(Date.now() + 30 * 60 * 1000) } as any
  )
}

// se qualcosa va storto, l'errore si vede sul widget invece di un riquadro vuoto
async function main() {
  try { await disegna() } catch (e) {
    Widget.present(
      <VStack widgetBackground={C.sfondo} padding={12} spacing={4} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
        <Text font={12} fontWeight="bold" foregroundStyle={C.rosso}>Da fare: errore</Text>
        <Text font={10} foregroundStyle={C.secondario}>{String(e)}</Text>
      </VStack>,
      { policy: 'after', date: new Date(Date.now() + 5 * 60 * 1000) } as any
    )
  }
}

main()
