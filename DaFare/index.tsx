// Da fare: lista completa (si apre toccando il widget o con ▶)
import { Navigation, NavigationStack, List, Section, Text, Button, TextField, HStack, VStack, Image, Spacer, Script, Widget, useState } from 'scripting'
import { carica, fatti, cambiaFatto, pulisci, ordina, tipo, tipoDi, aperto, agg, quandoApp, leggi, scrivi, ricaricaWidget, TIPI, ORDINE, Dati, Voce } from './comune'

function Riga({ v, fatto, tocca }: { v: Voce, fatto: boolean, tocca: (id: string) => void }) {
  const t = tipo(v)
  return <Button buttonStyle="plain" action={() => tocca(v.id)}>
    <HStack spacing={12} alignment="top">
      <Image systemName={fatto ? 'checkmark.circle.fill' : 'circle'} font={22}
        foregroundStyle={fatto ? 'systemGreen' : t.colore} />
      <VStack alignment="leading" spacing={3}>
        <Text font="body" fontWeight="medium" foregroundStyle={fatto ? 'secondaryLabel' : 'label'}>{v.testo}</Text>
        {v.dettaglio ? <Text font="subheadline" foregroundStyle="secondaryLabel">{v.dettaglio}</Text> : null}
        {aperto(v.da) ? <Text font="caption" foregroundStyle={t.colore}>{aperto(v.da)}</Text> : null}
      </VStack>
      <Spacer />
    </HStack>
  </Button>
}

function Pannello({ iniziale, msgIniziale }: { iniziale: Dati | null, msgIniziale: string }) {
  const dismiss = Navigation.useDismiss()
  const [d, setD] = useState<Dati | null>(iniziale)
  const [f, setF] = useState(fatti())
  const [url, setUrl] = useState(() => leggi("dafare-url") || "")
  const [msg, setMsg] = useState(msgIniziale)

  const tocca = (id: string) => { cambiaFatto(id); setF(fatti()); setTimeout(ricaricaWidget, 500) }

  const tutte = ordina(d?.voci || [])
  const aperte = tutte.filter(v => !f[v.id])
  const chiuse = tutte.filter(v => f[v.id])
  const app = d?.appuntamenti || []
  const fonte = d ? `${d.esempio ? 'Esempio' : d.fonte === 'sera' ? 'Recap della sera' : 'Riepilogo del mattino'} · ${agg(d.aggiornato)}` : ''

  return <NavigationStack>
    <List navigationTitle={d?.fonte === 'sera' ? 'Da fare domani' : 'Da fare oggi'}
      toolbar={{ cancellationAction: <Button title="Chiudi" action={dismiss} /> }}>
      {d
        ? <Section footer={<Text>Tocca il cerchio quando una cosa è fatta. La spunta resta finché la voce compare nei recap.</Text>}>
            <Text font="subheadline" foregroundStyle="secondaryLabel">{`${fonte} · ${aperte.length} da fare`}</Text>
          </Section>
        : <Section><Text>Dati non disponibili: controlla la connessione o l'indirizzo qui sotto.</Text></Section>}
      {app.length
        ? <Section header={<Text>Appuntamenti</Text>}>
            {app.map(a =>
              <HStack spacing={10}>
                <Text font="subheadline" fontWeight="semibold" foregroundStyle="systemBlue">{quandoApp(a)}</Text>
                <Text font="subheadline">{a.testo}</Text>
              </HStack>
            )}
          </Section>
        : null}
      {ORDINE.map(k => {
        const gruppo = aperte.filter(v => tipoDi(v) === k)
        if (!gruppo.length) return null
        return <Section header={<Text>{`${TIPI[k].nome} (${gruppo.length})`}</Text>}>
          {gruppo.map(v => <Riga v={v} fatto={false} tocca={tocca} />)}
        </Section>
      })}
      {d && tutte.length && !aperte.length
        ? <Section><Text font="headline" foregroundStyle="systemGreen">Tutto fatto ✓</Text></Section>
        : null}
      {chiuse.length
        ? <Section header={<Text>{`Fatte (${chiuse.length})`}</Text>}>
            {chiuse.map(v => <Riga v={v} fatto={true} tocca={tocca} />)}
          </Section>
        : null}
      <Section header={<Text>Widget</Text>}>
        <Button title="Aggiorna adesso" action={async () => { const n = await carica(); if (n) { pulisci(n); setD(n); setF(fatti()) } ricaricaWidget(); setMsg(n ? "Aggiornato." : "Dati non disponibili.") }} />
        <Button title="Anteprima medio" action={async () => { await Widget.preview({ family: 'systemMedium' } as any) }} />
        <Button title="Anteprima grande" action={async () => { await Widget.preview({ family: 'systemLarge' } as any) }} />
        <Button title="Anteprima piccolo" action={async () => { await Widget.preview({ family: 'systemSmall' } as any) }} />
        <Text font="caption" foregroundStyle="secondaryLabel">{"Ultimo tocco sul widget: " + (leggi("dafare-tocco") || "mai")}</Text>
      </Section>
      <Section header={<Text>Indirizzo dei dati (si fa una volta)</Text>}>
        <TextField title="Indirizzo" prompt="https://api.github.com/gists/…" value={url} onChanged={setUrl} />
        <Button title="Salva indirizzo" action={async () => { scrivi("dafare-url", url.trim()); const n = await carica(); if (n) { pulisci(n); setD(n) } ricaricaWidget(); setMsg(n ? "Indirizzo salvato." : "Indirizzo salvato, ma i dati non si leggono.") }} />
      </Section>
      {msg ? <Section><Text>{msg}</Text></Section> : null}
    </List>
  </NavigationStack>
}

async function main() {
  // l'indirizzo dei dati può arrivare anche da un link: scripting://run_single/DaFare?url=...
  let msg = ""
  const q: any = (Script as any).queryParameters || {}
  if (q.url) { scrivi("dafare-url", String(q.url).trim()); msg = "Indirizzo dei dati salvato." }
  const d = await carica()
  if (d) pulisci(d)
  ricaricaWidget()
  await Navigation.present(<Pannello iniziale={d} msgIniziale={msg} />)
  Script.exit()
}

main()
