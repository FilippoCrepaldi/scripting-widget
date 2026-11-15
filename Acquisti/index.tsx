// index.tsx – pannello dello script "Acquisti" (si apre toccando il widget o con ▶)
import { Navigation, NavigationStack, List, Section, Text, Button, TextField, HStack, Spacer, Script, Widget, useState } from 'scripting'
import { carica, leggi, scrivi, salvaPagina, leggiPagina, ricaricaWidget, quandoAgg, ggmm, giornoMese, gg, qtaTesto, type Dati } from './comune'

function Pannello({ iniziale, msgIniziale }: { iniziale: Dati | null, msgIniziale: string }) {
  const dismiss = Navigation.useDismiss()
  const [d, setD] = useState<Dati | null>(iniziale)
  const [url, setUrl] = useState(() => leggi('acquisti-url') || '')
  const [msg, setMsg] = useState(msgIniziale)
  const [pagina, setPagina] = useState(leggiPagina())

  const c = d?.container || null, s = d?.scorte || null
  const arrivi = [...(c?.arrivi || [])].sort((a, b) => a.eta.localeCompare(b.eta))
  const voci = s?.voci || []

  return <NavigationStack>
    <List navigationTitle="Acquisti" toolbar={{ cancellationAction: <Button title="Chiudi" action={dismiss} /> }}>
      {!d ? <Section><Text>Dati non disponibili: controlla la connessione o l'indirizzo qui sotto.</Text></Section> : null}

      {c ? <Section header={<Text>{`Container · ${c.inViaggio ?? arrivi.length} in viaggio · agg. ${quandoAgg(c.aggiornato)}`}</Text>}>
        <Text font="headline">{c.titolo || ''}</Text>
        {c.azione ? <Text font="subheadline" foregroundStyle="secondaryLabel">{c.azione}</Text> : null}
        {arrivi.map(a => <HStack spacing={10}>
          <Text font="subheadline" fontWeight="semibold">{giornoMese(a.eta)}</Text>
          <Text font="subheadline" lineLimit={1}>{[a.fornitore, a.prodotto].filter(Boolean).join(' · ')}</Text>
          <Spacer />
          <Text font="caption" foregroundStyle="secondaryLabel">{`${a.porto || ''} ${a.container}`}</Text>
        </HStack>)}
      </Section> : null}

      {s ? <Section header={<Text>{`Scorte · dati del ${s.controllo ? ggmm(s.controllo) : '?'}`}</Text>}>
        {voci.length ? voci.map(v => <HStack spacing={10}>
          <Text font="subheadline" fontWeight="semibold" foregroundStyle={v.stato === 'rosso' ? 'systemRed' : 'systemOrange'}>{v.nome}</Text>
          <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={1}>{qtaTesto(v)}</Text>
          <Spacer />
          <Text font="caption" foregroundStyle="secondaryLabel">{v.entro ? `entro ${ggmm(v.entro)}` : v.finisce ? `finisce ${ggmm(v.finisce)}` : ''}</Text>
        </HStack>) : <Text>Niente da ordinare</Text>}
        {(s.giaInArrivo || []).map(a => <Text font="caption" foregroundStyle="secondaryLabel">{`${a.nome} ← ${a.da || ''} ${a.quando && !isNaN(gg(a.quando)) ? giornoMese(a.quando) : ''}`}</Text>)}
      </Section> : null}

      <Section header={<Text>Widget</Text>} footer={<Text>{'Ultimo tocco sui tasti del widget: ' + (leggi('acquisti-tocco') || 'mai')}</Text>}>
        <Button title="Aggiorna adesso" action={async () => { const n = await carica(true); if (n) setD(n); ricaricaWidget(); setMsg(n ? 'Aggiornato.' : 'Dati non disponibili.') }} />
        <Button title={`Pagina mostrata: ${pagina === 's' ? 'Scorte' : 'Container'} (tocca per cambiare)`} action={() => { const p = pagina === 's' ? 'c' : 's'; salvaPagina(p); setPagina(p); setTimeout(ricaricaWidget, 500) }} />
        <Button title="Anteprima grande" action={async () => { await Widget.preview({ family: 'systemLarge' } as any) }} />
        <Button title="Anteprima medio" action={async () => { await Widget.preview({ family: 'systemMedium' } as any) }} />
        <Button title="Anteprima piccolo" action={async () => { await Widget.preview({ family: 'systemSmall' } as any) }} />
      </Section>

      <Section header={<Text>Indirizzo dei dati (si fa una volta)</Text>}>
        <TextField title="Indirizzo" prompt="https://gist.githubusercontent.com/…/raw/" value={url} onChanged={setUrl} />
        <Button title="Salva indirizzo" action={async () => { scrivi('acquisti-url', url.trim()); const n = await carica(true); if (n) setD(n); ricaricaWidget(); setMsg(n ? 'Indirizzo salvato.' : 'Indirizzo salvato, ma i dati non si leggono.') }} />
      </Section>
      {msg ? <Section><Text>{msg}</Text></Section> : null}
    </List>
  </NavigationStack>
}

async function main() {
  // l'indirizzo può arrivare anche da un link: scripting://run_single/Acquisti?url=...
  let msg = ''
  const q: any = (Script as any).queryParameters || {}
  if (q.url) { scrivi('acquisti-url', String(q.url).trim()); msg = 'Indirizzo dei dati salvato.' }
  const d = await carica(true)
  ricaricaWidget()
  await Navigation.present(<Pannello iniziale={d} msgIniziale={msg} />)
  Script.exit()
}

main()
