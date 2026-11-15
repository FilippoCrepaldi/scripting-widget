// Widget "Da fare" – lista aggiornata dai riepiloghi del mattino e della sera
import { VStack, HStack, Text, Image, Spacer, Button, Widget, RoundedRectangle } from 'scripting'
import { SegnaFatto } from './app_intents'
import { carica, fatti, pulisci, ordina, tipo, aperto, agg, quandoApp, urlDati, APRI_LISTA, Dati, Voce } from './comune'

const C: any = {
  sfondo: { light: '#FFFFFF', dark: '#1C1C1E' },
  blu: { light: '#0F3F7C', dark: '#8DBEF5' },
  testo: { light: '#0A1626', dark: '#F1F5FB' },
  secondario: { light: '#3C4B61', dark: '#C0CCE0' },
  terziario: { light: '#6B7A90', dark: '#93A4BD' },
  linea: { light: '#E5E8EE', dark: '#38383A' },
  verde: { light: '#16784C', dark: '#30D158' },
  rosso: { light: '#C62828', dark: '#FF6961' },
}

function titolo(d: Dati) { return d.fonte === 'sera' ? 'Da fare domani' : 'Da fare oggi' }

function Intestazione({ d, extra }: { d: Dati, extra?: string }) {
  const fonte = d.esempio ? 'esempio' : d.fonte === 'sera' ? 'sera' : 'mattino'
  return <HStack spacing={5}>
    <Image systemName="checklist" font={13} foregroundStyle={C.blu} />
    <Text font={13} fontWeight="semibold" foregroundStyle={C.blu} lineLimit={1}>{titolo(d)}</Text>
    {extra ? <Text font={11} fontWeight="semibold" foregroundStyle={C.terziario}>{extra}</Text> : null}
    <Spacer />
    <Text font={11} fontWeight="medium" foregroundStyle={C.terziario} lineLimit={1}>{`${fonte} ${agg(d.aggiornato)}`}</Text>
  </HStack>
}

// una riga: il cerchio colorato è il tasto per spuntare
function Riga({ v, dettaglio }: { v: Voce, dettaglio: boolean }) {
  const t = tipo(v)
  const etichetta = [t.nome, aperto(v.da)].filter(Boolean).join(' · ')
  return <HStack spacing={8} alignment="top">
    <Button buttonStyle="plain" intent={SegnaFatto({ id: v.id })}>
      <Image systemName="circle" font={dettaglio ? 19 : 17} fontWeight="semibold" foregroundStyle={t.colore} />
    </Button>
    <VStack alignment="leading" spacing={1}>
      <Text font={dettaglio ? 14 : 13} fontWeight="medium" foregroundStyle={C.testo} lineLimit={1}>{v.testo}</Text>
      {dettaglio ? <Text font={11} fontWeight="medium" foregroundStyle={t.colore} lineLimit={1}>{etichetta}</Text> : null}
    </VStack>
    <Spacer />
  </HStack>
}

function TuttoFatto({ testo }: { testo: string }) {
  return <VStack spacing={4} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
    <Spacer />
    <Image systemName="checkmark.circle.fill" font={30} foregroundStyle={C.verde} />
    <Text font={15} fontWeight="semibold" foregroundStyle={C.testo}>{testo}</Text>
    <Spacer />
  </VStack>
}

function Piede({ nFatte, altre }: { nFatte: number, altre: number }) {
  const parti: string[] = []
  if (altre > 0) parti.push(`+${altre} altre`)
  if (nFatte > 0) parti.push(`✓ ${nFatte} fatte`)
  if (!parti.length) return null
  return <Text font={11} fontWeight="medium" foregroundStyle={C.terziario}>{parti.join('    ')}</Text>
}

// ---------- misure ----------
function Piccolo({ d, aperte, nFatte }: any) {
  const urgenti = aperte.filter((v: Voce) => v.tipo === 'urgente' || v.tipo === 'magazzino').length
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
      : <Text font={13} fontWeight="medium" foregroundStyle={C.verde}>{nFatte ? 'Tutto fatto' : 'Niente da fare'}</Text>}
  </VStack>
}

function Medio({ d, aperte, nFatte }: any) {
  // nel medio lo spazio è poco: 4 righe da una linea, senza piede (fatte e altre vanno nell'intestazione)
  const vis = aperte.slice(0, 4)
  const altre = aperte.length - vis.length
  return <VStack alignment="leading" spacing={6} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <Intestazione d={d} extra={[altre > 0 ? `+${altre}` : '', nFatte ? `✓${nFatte}` : ''].filter(Boolean).join(' ')} />
    {vis.length
      ? vis.map((v: Voce) => <Riga v={v} dettaglio={false} />)
      : <TuttoFatto testo={nFatte ? 'Tutto fatto' : 'Niente da fare'} />}
    <Spacer />
  </VStack>
}

function Grande({ d, aperte, nFatte }: any) {
  const app = (d.appuntamenti || []).slice(0, 2)
  const vis = aperte.slice(0, app.length ? 5 : 6)
  return <VStack alignment="leading" spacing={7} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <Intestazione d={d} />
    {app.length
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
      ? vis.map((v: Voce) => <Riga v={v} dettaglio={true} />)
      : <TuttoFatto testo={nFatte ? 'Tutto fatto' : 'Niente da fare'} />}
    <Spacer />
    <Piede nFatte={nFatte} altre={aperte.length - vis.length} />
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
    pulisci(d)
    const f = fatti()
    const tutte = ordina(d.voci || [])
    const aperte = tutte.filter(v => !f[v.id])
    const nFatte = tutte.length - aperte.length
    const fam = Widget.family
    corpo = fam === 'systemSmall' ? <Piccolo d={d} aperte={aperte} nFatte={nFatte} />
      : fam === 'systemLarge' || fam === 'systemExtraLarge' ? <Grande d={d} aperte={aperte} nFatte={nFatte} />
      : <Medio d={d} aperte={aperte} nFatte={nFatte} />
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
