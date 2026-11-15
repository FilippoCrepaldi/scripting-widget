// Diario: tocca ▶ per il pannello (anteprime, Salute, Live Activity)
import { Navigation, NavigationStack, List, Section, Button, Text, TextField, useState, Widget, Script } from "scripting"
import { carica, salvaInSalute, prossimoPasto } from "./comune"
import { ProssimoPasto, StatoPasto } from "./live_activity"

function Pannello() {
  const [msg, setMsg] = useState("")
  const [url, setUrl] = useState(() => { try { return Storage.get<string>("diario-url") || "" } catch (e) { return "" } })
  const options = { "Cibo / Cuore": "", "Corpo": "corpo", "Movimento": "movimento" }
  return <NavigationStack>
    <List navigationTitle="Diario">
      <Section header={<Text>Indirizzo dei dati (si fa una volta)</Text>}>
        <TextField title="Indirizzo" prompt="https://…/widget/…" value={url} onChanged={setUrl} />
        <Button title="Salva indirizzo" action={() => { try { Storage.set("diario-url", url.trim()); Widget.reloadAll(); setMsg("Indirizzo salvato. Riapri lo script per usarlo.") } catch (e) { setMsg("Errore: " + e) } }} />
      </Section>
      <Section header={<Text>Widget</Text>}>
        <Button title="Anteprima widget medio" action={async () => { await Widget.preview({ family: 'systemMedium', parameters: { options, default: "Cibo / Cuore" } } as any) }} />
        <Button title="Anteprima widget piccolo" action={async () => { await Widget.preview({ family: 'systemSmall', parameters: { options, default: "Cibo / Cuore" } } as any) }} />
        <Button title="Aggiorna i widget adesso" action={() => { Widget.reloadAll(); setMsg("Widget aggiornati.") }} />
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
      {msg ? <Section><Text>{msg}</Text></Section> : null}
    </List>
  </NavigationStack>
}

async function main() {
  await Navigation.present(<Pannello />)
  Script.exit()
}
main()
