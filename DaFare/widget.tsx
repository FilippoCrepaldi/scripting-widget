// Widget "Da fare" – lista aggiornata dai riepiloghi del mattino e della sera
// Medio e grande: schede "Da fare" / "Fatte" e frecce per scorrere tutta la lista.
// Il cerchio spunta la voce; nelle "Fatte" la spunta verde la toglie.
import { VStack, HStack, Text, Image, Spacer, Button, Widget, RoundedRectangle } from 'scripting'
import { SegnaFatto, CambiaVista, CambiaPagina } from './app_intents'
import { carica, fatti, pulisci, ordina, tipo, aperto, agg, quandoApp, urlDati, vista, pagina, APRI_LISTA, Dati, Voce } from './comune'

const C: any = {
  sfondo: { light: '#FFFFFF', dark: '#1C1C1E' },
  blu: { light: '#0F3F7C', dark: '#8DBEF5' },
  suBlu: { light: '#FFFFFF', dark: '#0A1626' },
  chip: { light: '#EEF1F5', dark: '#2C2C2E' },
  testo: { light: '#0A1626', dark: '#F1F5FB' },
  secondario: { light: '#3C4B61', dark: '#C0CCE0' },
  terziario: { light: '#6B7A90', dark: '#93A4BD' },
  spento: { light: '#C9D0DA', dark: '#48484A' },
  linea: { light: '#E5E8EE', dark: '#38383A' },
  verde: { light: '#16784C', dark: '#30D158' },
  rosso: { light: '#C62828', dark: '#FF6961' },
}

// ---------- pezzi comuni ----------
function Scheda({ nome, n, attiva, v }: { nome: string, n: number, attiva: boolean, v: string }) {
  return <Button buttonStyle="plain" intent={CambiaVista({ vista: v })}>
    <Text font={12} fontWeight="semibold" foregroundStyle={attiva ? C.suBlu : C.secondario}
      padding={{ horizontal: 8, vertical: 3 }}
      background={{ style: attiva ? C.blu : C.chip, shape: { type: 'rect', cornerRadius: 8 } } as any}>{`${nome} ${n}`}</Text>
  </Button>
}

function Freccia({ verso, attiva }: { verso: number, attiva: boolean }) {
  const icona = <Image systemName={verso < 0 ? 'chevron.left' : 'chevron.right'} font={13} fontWeight="bold"
    foregroundStyle={attiva ? C.blu : C.spento} padding={{ horizontal: 6, vertical: 3 }}
    background={{ style: C.chip, shape: { type: 'rect', cornerRadius: 8 } } as any} />
  return attiva ? <Button buttonStyle="plain" intent={CambiaPagina({ delta: verso })}>{icona}</Button> : icona
}

function Comandi({ v, nAperte, nFatte, p, pagine }: any) {
  return <HStack spacing={5}>
    <Scheda nome="Da fare" n={nAperte} attiva={v === 'aperte'} v="aperte" />
    <Scheda nome="Fatte" n={nFatte} attiva={v === 'fatte'} v="fatte" />
    <Spacer />
    {pagine > 1 ? <HStack spacing={4}>
      <Freccia verso={-1} attiva={p > 0} />
      <Text font={11} fontWeight="semibold" foregroundStyle={C.terziario}>{`${p + 1}/${pagine}`}</Text>
      <Freccia verso={1} attiva={p < pagine - 1} />
    </HStack> : null}
  </HStack>
}

// una riga: a sinistra il tasto (cerchio = spunta, spunta verde = togli)
function Riga({ v, fatta, dettaglio }: { v: Voce, fatta: boolean, dettaglio: boolean }) {
  const t = tipo(v)
  const etichetta = fatta ? 'Fatta · tocca la spunta per toglierla' : [t.nome, aperto(v.da)].filter(Boolean).join(' · ')
  return <HStack spacing={8} alignment="top">
    <Button buttonStyle="plain" intent={SegnaFatto({ id: v.id })}>
      <Image systemName={fatta ? 'checkmark.circle.fill' : 'circle'} font={dettaglio ? 19 : 17} fontWeight="semibold"
        foregroundStyle={fatta ? C.verde : t.colore} />
    </Button>
    <VStack alignment="leading" spacing={1}>
      <Text font={dettaglio ? 14 : 13} fontWeight="medium" foregroundStyle={fatta ? C.terziario : C.testo} lineLimit={1}>{v.testo}</Text>
      {dettaglio ? <Text font={11} fontWeight="medium" foregroundStyle={fatta ? C.terziario : t.colore} lineLimit={1}>{etichetta}</Text> : null}
    </VStack>
    <Spacer />
  </HStack>
}

function Vuoto({ v, nTotale }: { v: string, nTotale: number }) {
  const testo = v === 'fatte' ? 'Nessuna voce spuntata' : nTotale ? 'Tutto fatto' : 'Niente da fare'
  return <VStack spacing={4} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
    <Spacer />
    <Image systemName={v === 'fatte' ? 'circle.dashed' : 'checkmark.circle.fill'} font={26} foregroundStyle={v === 'fatte' ? C.spento : C.verde} />
    <Text font={14} fontWeight="semibold" foregroundStyle={C.testo}>{testo}</Text>
    <Spacer />
  </VStack>
}

// prepara le voci della scheda e della pagina scelte
function sceltaPagina(d: Dati, perPagina: number) {
  pulisci(d)
  const f = fatti()
  const tutte = ordina(d.voci || [])
  const aperte = tutte.filter(v => !f[v.id])
  const chiuse = tutte.filter(v => f[v.id])
  const v = vista()
  const elenco = v === 'fatte' ? chiuse : aperte
  const pagine = Math.max(1, Math.ceil(elenco.length / perPagina))
  const p = Math.min(pagina(), pagine - 1)
  return { v, aperte, chiuse, tutte, pagine, p, vis: elenco.slice(p * perPagina, (p + 1) * perPagina) }
}

// ---------- misure ----------
function Piccolo({ d }: { d: Dati }) {
  const f = fatti()
  const aperte = ordina(d.voci || []).filter(v => !f[v.id])
  const urgenti = aperte.filter(v => v.tipo === 'urgente' || v.tipo === 'magazzino').length
  const prima = aperte[0]
  return <VStack alignment="leading" spacing={2} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <HStack spacing={5}>
      <Image systemName="checklist" font={13} foregroundStyle={C.blu} />
      <Text font={13} fontWeight="semibold" foregroundStyle={C.blu}>{d.fonte === 'sera' ? 'Domani' : 'Da fare'}</Text>
    </HStack>
    <HStack alignment="lastTextBaseline" spacing={6}>
      <Text font={40} fontWeight="heavy" foregroundStyle={aperte.length ? C.blu : C.verde}>{String(aperte.length)}</Text>
      {urgenti ? <Text font={12} fontWeight="semibold" foregroundStyle={C.rosso}>{`${urgenti} urgenti`}</Text> : null}
    </HStack>
    <Spacer />
    {prima
      ? <Text font={13} fontWeight="medium" foregroundStyle={C.testo} lineLimit={3}>{prima.testo}</Text>
      : <Text font={13} fontWeight="medium" foregroundStyle={C.verde}>Tutto fatto</Text>}
  </VStack>
}

function Medio({ d }: { d: Dati }) {
  const s = sceltaPagina(d, 4)
  return <VStack alignment="leading" spacing={6} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <Comandi v={s.v} nAperte={s.aperte.length} nFatte={s.chiuse.length} p={s.p} pagine={s.pagine} />
    {s.vis.length
      ? s.vis.map(v => <Riga v={v} fatta={s.v === 'fatte'} dettaglio={false} />)
      : <Vuoto v={s.v} nTotale={s.tutte.length} />}
    <Spacer />
  </VStack>
}

function Grande({ d }: { d: Dati }) {
  const app = (d.appuntamenti || []).slice(0, 2)
  const conApp = vista() === 'aperte' && app.length > 0
  const s = sceltaPagina(d, conApp ? 5 : 6)   // con gli appuntamenti c'è spazio per 5 righe
  const vis = s.vis
  const fonte = d.esempio ? 'esempio' : d.fonte === 'sera' ? 'sera' : 'mattino'
  return <VStack alignment="leading" spacing={7} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <HStack spacing={5}>
      <Image systemName="checklist" font={13} foregroundStyle={C.blu} />
      <Text font={13} fontWeight="semibold" foregroundStyle={C.blu}>{d.fonte === 'sera' ? 'Da fare domani' : 'Da fare oggi'}</Text>
      <Spacer />
      <Text font={11} fontWeight="medium" foregroundStyle={C.terziario}>{`${fonte} ${agg(d.aggiornato)}`}</Text>
    </HStack>
    <Comandi v={s.v} nAperte={s.aperte.length} nFatte={s.chiuse.length} p={s.p} pagine={s.pagine} />
    {conApp && s.p === 0
      ? <VStack alignment="leading" spacing={3}>
          {app.map((a: any) =>
            <HStack spacing={6}>
              <Image systemName="calendar" font={12} foregroundStyle={C.blu} />
              <Text font={12} fontWeight="semibold" foregroundStyle={C.blu}>{quandoApp(a)}</Text>
              <Text font={12} foregroundStyle={C.secondario} lineLimit={1}>{a.testo}</Text>
            </HStack>
          )}
          <RoundedRectangle fill={C.linea} frame={{ height: 0.5, maxWidth: 'infinity' }} />
        </VStack>
      : null}
    {vis.length
      ? vis.map(v => <Riga v={v} fatta={s.v === 'fatte'} dettaglio={true} />)
      : <Vuoto v={s.v} nTotale={s.tutte.length} />}
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
