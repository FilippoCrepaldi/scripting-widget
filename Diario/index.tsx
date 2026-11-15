// Diario: tocca ▶ per il pannello (anteprime, Salute, Live Activity)
import { Navigation, NavigationStack, List, Section, Button, Text, TextField, useState, Widget, Script } from "scripting"
import { carica, salvaInSalute, prossimoPasto, leggi, scrivi, ricaricaWidget } from "./comune"
import { ProssimoPasto, StatoPasto } from "./live_activity"

function Pannello() {
  const [msg, setMsg] = useState("")
  const [url, setUrl] = useState(() => leggi("diario-url") || "")
  // nomi dei parametri nell'anteprima: medio = Cibo o Corpo, piccolo = Cuore o Movimento
  const medio = { "Cibo": "", "Corpo": "corpo" }
  const piccolo = { "Cuore": "", "Movimento": "movimento" }
  return <NavigationStack>
    <List navigationTitle="Diario">
      <Section header={<Text>Indirizzo dei dati (si fa una volta)</Text>}>
        <TextField title="Indirizzo" prompt="https://…/widget/…" value={url} onChanged={setUrl} />
        <Button title="Salva indirizzo" action={() => { scrivi("diario-url", url.trim()); ricaricaWidget(); setMsg("Indirizzo salvato.") }} />
      </Section>
      <Section header={<Text>Widget</Text>}>
        <Button title="Anteprima widget medio" action={async () => { await Widget.preview({ family: 'systemMedium', parameters: { options: medio, default: "Cibo" } } as any) }} />
        <Button title="Anteprima widget piccolo" action={async () => { await Widget.preview({ family: 'systemSmall', parameters: { options: piccolo, default: "Cuore" } } as any) }} />
        <Button title="Aggiorna i widget adesso" action={async () => { await carica(); ricaricaWidget(); setMsg("Widget aggiornati.") }} />
      </Section>
      <Section header={<Text>App Salute</Text>}>
        <Button title="Scrivi i pasti di oggi in Salute" action={async () => {
          try { setMsg(await salvaInSalute()) } catch (e) { setMsg("Salute: " + e) }
        }} />
      </Section>
      <Section header={<Text>Schermata di blocco</Text>}>
        <Button title="Mostra il prossimo pasto (Live Activity)" action={async () => {
          const d = await carica(); if (!d) return setMsg("Dati non disponibili.")
          const s = prossimoPasto(d) as StatoPasto
          try {
            const a = ProssimoPasto()
            const ok = await a.start(s, { staleDate: Date.now() + 3 * 3600 * 1000 } as any)
            setMsg(ok ? `Sulla schermata di blocco: ${s.pasto}` : "Live Activity non avviata: controlla che siano attive per Scripting in Impostazioni.")
          } catch (e) { setMsg("Live Activity: " + e) }
        }} />
      </Section>
      <Section header={<Text>Controllo</Text>}>
        <Text>{"Ultimo tocco su ↻ nel widget: " + (leggi("diario-tocco") || "mai")}</Text>
      </Section>
      {msg ? <Section><Text>{msg}</Text></Section> : null}
    </List>
  </NavigationStack>
}

async function main() {
  await Navigation.present(<Pannello />)
  Script.exit()
}
main()
