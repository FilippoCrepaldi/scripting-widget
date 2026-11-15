// widget.tsx – "Acquisti": widget grande con due pagine, Container e Scorte.
// In alto due tasti grandi con i numeri: toccandoli cambia la pagina sotto.
// Container: schede Oggi / In viaggio / Spostati; toccando una riga si apre la scheda del container (↑ ↓, ‹ Lista).
// Scorte: calendario a 7 / 14 / 30 giorni con cosa ordinare e cosa arriva.
// Niente Link nel widget: con un solo Link il widgetURL verrebbe ignorato ovunque.
import { VStack, HStack, Text, Spacer, Button, RoundedRectangle, Circle, Widget, modifiers } from 'scripting'
import { CambiaPagina, CambiaScheda, ApriContainer, CambiaGiorni } from './app_intents'
import {
  carica, leggiPagina, leggiScheda, leggiAperto, leggiGiorni, urlDati, APRI_PANNELLO, gg, giornoMese, ggmm, quandoAgg, orePassate, qtaTesto, eContainer,
  type Dati, type DatiContainer, type DatiScorte, type Arrivo, type Pagina, type Scheda,
} from './comune'

// Colori chiari / scuri (cambiano da soli con il tema dell'iPhone)
const C: any = {
  sfondo: { light: '#F4F6F9', dark: '#161B22' },
  tasto: { light: '#E6EAF0', dark: '#222A35' },
  tastoSel: { light: '#FFFFFF', dark: '#334155' },
  riquadro: { light: '#E9EEF4', dark: '#1D2633' },
  testo: { light: '#0F1D2E', dark: '#F2F5F9' },
  tenue: { light: '#5F6B7B', dark: '#9AA8BA' },
  linea: { light: '#DCE2EA', dark: '#2A3442' },
  blu: { light: '#1F63C6', dark: '#3B7BE0' },
  bluTesto: { light: '#1F63C6', dark: '#6FA8FF' },
  rosso: { light: '#D93A2E', dark: '#E5483A' },
  rossoTesto: { light: '#C62F24', dark: '#FF8A7A' },
  ambra: { light: '#B06D00', dark: '#FFB547' },
  verde: { light: '#16784C', dark: '#30D158' },
  grigioCard: { light: '#5B6675', dark: '#3A4656' },
  chip: { light: '#3A78D4', dark: '#5A90E6' },
  etaFondo: { light: '#FFF1D6', dark: '#4A3610' },
  etaTesto: { light: '#A85F00', dark: '#FFC46B' },
}

// Fondo arrotondato: con modifiers() l'ordine è sicuro (prima il margine, poi la misura, poi il fondo)
function fondo(colore: any, raggio: number, margine: any, misura?: any) {
  const m = modifiers().padding(margine)
  if (misura) m.frame(misura)
  return m.background(<RoundedRectangle cornerRadius={raggio} fill={colore} />)
}

// Formato a pagina intera (iOS 27, "extra large"): stesso disegno del grande, ma con più righe
const XL = () => /ExtraLarge/i.test(String(Widget.family || ''))

// ---------- tasti in alto ----------
function Numero({ n, etichetta, colore }: { n: string, etichetta: string, colore: any }) {
  return <VStack alignment="leading" spacing={1}>
    <Text font={26} fontWeight="heavy" foregroundStyle={colore} monospacedDigit lineLimit={1}>{n}</Text>
    <Text font={10.5} fontWeight="medium" foregroundStyle={C.tenue} lineLimit={1} minScaleFactor={0.8}>{etichetta}</Text>
  </VStack>
}
function Tasto({ pagina, sel, titolo, pallino, children }: { pagina: Pagina, sel: boolean, titolo: string, pallino: boolean, children: any }) {
  return <Button buttonStyle="plain" intent={CambiaPagina({ pagina })}>
    <VStack alignment="leading" spacing={3}
      modifiers={fondo(sel ? C.tastoSel : C.tasto, 14, { top: 8, bottom: 9, leading: 11, trailing: 8 }, { maxWidth: 'infinity', minHeight: 52, alignment: 'leading' })}>
      <HStack spacing={5}>
        <Text font={11} fontWeight="bold" foregroundStyle={sel ? C.testo : C.tenue}>{titolo}</Text>
        {pallino ? <Circle fill={C.rosso} frame={{ width: 7, height: 7 }} /> : null}
      </HStack>
      <HStack spacing={14} alignment="top">{children}</HStack>
    </VStack>
  </Button>
}
function Tasti({ d, pagina }: { d: Dati, pagina: Pagina }) {
  const c = d.container, s = d.scorte
  const inPorto = (c?.arrivi || []).filter(a => gg(a.eta) <= 0)
  const passati = inPorto.some(a => gg(a.eta) < 0)
  const daOrdinare = s?.daOrdinare ?? 0
  return <HStack spacing={6}>
    <Tasto pagina="c" sel={pagina === 'c'} titolo="CONTAINER" pallino={false}>
      <Numero n={c ? String(c.inViaggio ?? (c.arrivi || []).length) : '–'} etichetta="in viaggio" colore={C.testo} />
      <Numero n={c ? String(inPorto.length) : '–'} etichetta={passati ? 'da ritirare' : 'arrivano oggi'} colore={inPorto.length ? C.bluTesto : C.tenue} />
    </Tasto>
    <Tasto pagina="s" sel={pagina === 's'} titolo="SCORTE" pallino={pagina === 'c' && daOrdinare > 0}>
      <Numero n={s ? String(daOrdinare) : '–'} etichetta="da ordinare" colore={daOrdinare ? C.rosso : C.tenue} />
      <Numero n={s ? String(s.aBreve ?? 0) : '–'} etichetta="a breve" colore={(s?.aBreve ?? 0) ? C.ambra : C.tenue} />
    </Tasto>
  </HStack>
}

function Titoletto({ testo, destra, destraRossa = false }: { testo: string, destra?: string, destraRossa?: boolean }) {
  return <HStack spacing={4}>
    <Text font={11} fontWeight="semibold" foregroundStyle={C.tenue} lineLimit={1}>{testo}</Text>
    <Spacer />
    {destra ? <Text font={11} fontWeight={destraRossa ? 'semibold' : 'medium'} foregroundStyle={destraRossa ? C.rossoTesto : C.tenue} lineLimit={1}>{destra}</Text> : null}
  </HStack>
}
function Linea() { return <RoundedRectangle cornerRadius={0} fill={C.linea} frame={{ maxWidth: 'infinity', minHeight: 0.5, maxHeight: 0.5 }} /> }

// ---------- pagina Container ----------
// Barra a schede piccola (usata anche nelle Scorte): ogni voce è un tasto
function Barra({ voci }: { voci: { testo: string, n?: string, colore?: any, sel: boolean, intent: any }[] }) {
  return <HStack spacing={3} modifiers={fondo(C.tasto, 11, 3, { maxWidth: 'infinity' })}>
    {voci.map(v => <Button buttonStyle="plain" intent={v.intent}>
      <HStack spacing={5} modifiers={fondo(v.sel ? C.tastoSel : C.tasto, 9, 0, { maxWidth: 'infinity', minHeight: 26, maxHeight: 26 })}>
        <Text font={12} fontWeight={v.sel ? 'bold' : 'semibold'} foregroundStyle={v.sel ? C.testo : C.tenue} lineLimit={1} minScaleFactor={0.8}>{v.testo}</Text>
        {v.n != null ? <Text font={12} fontWeight="heavy" foregroundStyle={v.colore || C.testo} monospacedDigit>{v.n}</Text> : null}
      </HStack>
    </Button>)}
  </HStack>
}

const ordina = (l: Arrivo[]) => [...l].sort((a, b) => a.eta.localeCompare(b.eta) || a.container.localeCompare(b.container))
function giorniSpost(a: Arrivo) { return a.etaPrima ? gg(a.eta) - gg(a.etaPrima) : 0 }
function tagEta(spostata: boolean, giorni: number) {
  if (!spostata) return ''
  return giorni > 0 ? `ETA +${giorni}` : giorni < 0 ? `ETA ${giorni}` : 'ETA spostata'
}
function Tag({ t }: { t: string }) {
  return <Text font={10.5} fontWeight="semibold" foregroundStyle={C.etaTesto} lineLimit={1}
    modifiers={fondo(C.etaFondo, 5, { top: 1, bottom: 1, leading: 5, trailing: 5 })}>{t}</Text>
}
function quanto(eta: string) { const n = gg(eta); return n > 0 ? `${n} gg` : n === 0 ? 'oggi' : `da ${-n} gg` }

type Gruppo = { eta: string, fornitore: string, prodotto: string, porto: string, n: number, spostata: boolean, giorniSpostata: number, primo: string }
function raggruppa(arrivi: Arrivo[]): Gruppo[] {
  const m = new Map<string, Gruppo>()
  for (const a of ordina(arrivi)) {
    const k = `${a.eta}|${a.fornitore || ''}|${a.porto || ''}`
    const g = m.get(k)
    const spost = giorniSpost(a)
    if (g) { g.n++; if (a.prodotto !== g.prodotto) g.prodotto = ''; if (a.etaSpostata) { g.spostata = true; g.giorniSpostata = Math.max(g.giorniSpostata, spost) } }
    else m.set(k, { eta: a.eta, fornitore: a.fornitore || '', prodotto: a.prodotto || '', porto: a.porto || '', n: 1, spostata: !!a.etaSpostata, giorniSpostata: spost, primo: a.container })
  }
  return [...m.values()]
}
// Se il file è nel formato vecchio (senza stato e titolo), il messaggio si ricava dagli arrivi
function messaggio(c: DatiContainer) {
  if (c.stato && c.titolo) return { stato: c.stato, titolo: c.titolo, azione: c.azione || '' }
  const oggi = (c.arrivi || []).filter(a => gg(a.eta) <= 0)
  if (oggi.length) {
    const porti = [...new Set(oggi.map(a => a.porto).filter(Boolean))]
    const dove = porti.length === 1 ? ` a ${porti[0]}` : ''
    const passati = oggi.some(a => gg(a.eta) < 0)
    return { stato: 'todo', titolo: `${oggi.length} container ${passati ? 'da ritirare' : 'arrivano oggi'}${dove}`, azione: 'Organizza la consegna' }
  }
  const prossimo = ordina(c.arrivi || [])[0]
  return { stato: 'ok', titolo: 'Tutto a posto', azione: prossimo ? `Prossimo arrivo ${giornoMese(prossimo.eta)}${prossimo.porto ? ', ' + prossimo.porto : ''}` : '' }
}
function Riquadro({ c, conChip = false }: { c: DatiContainer, conChip?: boolean }) {
  const msg = messaggio(c)
  const oggi = ordina((c.arrivi || []).filter(a => gg(a.eta) <= 0))
  const stato = msg.stato
  const sfondo = stato === 'urgente' ? C.rosso : stato === 'todo' ? C.blu : C.grigioCard
  const etichetta = stato === 'urgente' ? 'URGENTE' : stato === 'todo' ? 'DA FARE OGGI' : 'TUTTO A POSTO'
  return <VStack alignment="leading" spacing={2}
    modifiers={fondo(sfondo, 14, { top: 9, bottom: 10, leading: 12, trailing: 10 }, { maxWidth: 'infinity', alignment: 'leading' })}>
    <Text font={10.5} fontWeight="semibold" foregroundStyle="white" opacity={0.85}>{etichetta}</Text>
    <Text font={16} fontWeight="bold" foregroundStyle="white" lineLimit={1} minScaleFactor={0.75}>{msg.titolo}</Text>
    {msg.azione ? <Text font={12.5} foregroundStyle="white" lineLimit={1} minScaleFactor={0.8}>{msg.azione}</Text> : null}
    {conChip && oggi.length && stato !== 'ok'
      ? <HStack spacing={5} padding={{ top: 5 }}>
          {oggi.slice(0, 3).map(a => <Text font={10.5} fontWeight="semibold" foregroundStyle="white" monospaced lineLimit={1}
            modifiers={fondo(C.chip, 6, { top: 2, bottom: 2, leading: 6, trailing: 6 })}>{a.container}</Text>)}
          {oggi.length > 3 ? <Text font={10.5} fontWeight="semibold" foregroundStyle="white">{`+${oggi.length - 3}`}</Text> : null}
        </HStack>
      : null}
  </VStack>
}
// nomi corti per stare su una riga: "Polpo oceanico (baby octopus)" → "baby octopus", "Gambero PUD scottato…" → "gambero"
function prodottoBreve(p: string) {
  const tra = p.match(/\(([^)]+)\)?/) // anche se la parentesi è tagliata: "Polpo … (baby"
  if (tra && tra[1].trim().length > 2) return tra[1].trim()
  const w = p.trim().split(/\s+/)[0] || ''
  return w.length > 1 ? w.charAt(0).toLowerCase() + w.slice(1) : w
}
function nomeCorto(fornitore: string, prodotto: string, n = 1, max = 24) {
  if (!prodotto || n > 1) return fornitore
  const prod = prodottoBreve(prodotto)
  let forn = fornitore
  if ((forn + prod).length > max) { const w = forn.split(/\s+/); forn = w[0].length <= 3 && w[1] ? `${w[0]} ${w[1]}` : w[0] }
  return forn ? `${forn} · ${prod}` : prod
}
// una riga della lista: tutta la riga è un tasto che apre il container
function Riga({ id, data, nome, n, tag, porto, quando, ultima, sotto }: { id: string, data: string, nome: string, n: number, tag: string, porto: string, quando: string, ultima: boolean, sotto?: string }) {
  const alto = sotto ? 21 : 26
  return <Button buttonStyle="plain" intent={ApriContainer({ id })}>
    <VStack spacing={0}>
      {sotto ? <Spacer frame={{ height: 4 }} /> : null}
      <HStack spacing={8} frame={{ maxWidth: 'infinity', minHeight: alto, maxHeight: alto }}>
        <Text font={13.5} fontWeight="bold" foregroundStyle={C.testo} frame={{ width: 46, alignment: 'leading' }} lineLimit={1} minScaleFactor={0.8}>{data}</Text>
        <Text font={13} foregroundStyle={C.testo} lineLimit={1}>{nome}</Text>
        {n > 1 ? <Text font={13} foregroundStyle={C.tenue}>{`×${n}`}</Text> : null}
        {tag ? <Tag t={tag} /> : null}
        <Spacer />
        <Text font={12} foregroundStyle={C.tenue} lineLimit={1}>{porto}</Text>
        <Text font={12} foregroundStyle={C.tenue} monospacedDigit frame={{ width: 44, alignment: 'trailing' }} lineLimit={1}>{quando}</Text>
      </HStack>
      {sotto ? <HStack spacing={0} frame={{ maxWidth: 'infinity', minHeight: 16, maxHeight: 16 }} padding={{ bottom: 4 }}>
        <Text font={11} foregroundStyle={C.tenue} lineLimit={1} padding={{ leading: 54 }}>{sotto}</Text><Spacer />
      </HStack> : null}
      {ultima ? null : <Linea />}
    </VStack>
  </Button>
}

// i container di ogni scheda, uno per uno, in ordine di data (servono anche per ↑ ↓)
function liste(c: DatiContainer) {
  const tutti = ordina(c.arrivi || [])
  return {
    oggi: tutti.filter(a => gg(a.eta) <= 0),
    viaggio: tutti.filter(a => gg(a.eta) > 0),
    spostati: tutti.filter(a => a.etaSpostata),
  } as Record<Scheda, Arrivo[]>
}

function Lista({ c, scheda, l }: { c: DatiContainer, scheda: Scheda, l: Arrivo[] }) {
  const xl = XL()
  const MAX = xl ? 6 : 7 // in pagina intera le righe sono doppie (circa 45 punti l'una)
  const vecchio = orePassate(c.aggiornato) > 72 // il tracker si aggiorna dal lunedì al venerdì
  const agg = c.aggiornato ? `agg. ${quandoAgg(c.aggiornato)}` : ''
  let righe: any[] = [], titolo = '', vuoto = '', resto = 0
  if (scheda === 'viaggio') {
    const g = raggruppa(l)
    righe = g.slice(0, MAX).map((x, i, a) => <Riga id={x.primo} data={giornoMese(x.eta)} nome={nomeCorto(x.fornitore, x.prodotto, x.n)} n={x.n}
      tag={tagEta(x.spostata, x.giorniSpostata)} porto={x.porto} quando={quanto(x.eta)} ultima={i === a.length - 1}
      sotto={xl ? sottoGruppo(l, x) : undefined} />)
    resto = g.length - righe.length
    titolo = 'IN VIAGGIO · TOCCA UNA RIGA'; vuoto = 'Nessun container in viaggio'
  } else {
    const max = scheda === 'oggi' ? 5 : MAX
    righe = l.slice(0, max).map((a, i, x) => <Riga id={a.container} data={giornoMese(a.eta)}
      nome={scheda === 'oggi' ? [a.container, (a.fornitore || '').split(/\s+/)[0]].filter(Boolean).join(' · ') : nomeCorto(a.fornitore || '', a.prodotto || '', 1, 20)} n={1}
      tag={scheda === 'spostati' ? tagEta(true, giorniSpost(a)) : ''} porto={a.porto || ''}
      quando={quanto(a.eta)} ultima={i === x.length - 1}
      sotto={xl ? sottoArrivo(a, scheda) : undefined} />)
    resto = l.length - righe.length
    titolo = scheda === 'oggi' ? 'IN PORTO · TOCCA UNA RIGA' : 'ETA SPOSTATA · TOCCA UNA RIGA'
    vuoto = scheda === 'oggi' ? 'Nessun container arriva oggi' : 'Nessuna ETA spostata'
  }
  return <VStack alignment="leading" spacing={0} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    {scheda === 'oggi' || xl ? <VStack spacing={0} padding={{ bottom: 8 }}><Riquadro c={c} conChip={xl && scheda === 'oggi'} /></VStack> : null}
    <Titoletto testo={titolo} destra={agg} destraRossa={vecchio} />
    {righe.length ? righe : <Text font={13} foregroundStyle={C.tenue} padding={{ top: 6 }}>{vuoto}</Text>}
    {resto > 0 ? <Text font={11} foregroundStyle={C.tenue} padding={{ top: 3 }}>{`+${resto} dopo · tutti nel pannello`}</Text> : null}
    <Spacer />
    {xl ? <Riepilogo c={c} /> : null}
  </VStack>
}
// seconde righe del formato pagina intera
function sottoGruppo(l: Arrivo[], g: Gruppo) {
  const cont = l.filter(a => a.eta === g.eta && (a.fornitore || '') === g.fornitore && (a.porto || '') === g.porto)
  if (cont.length === 1) return [cont[0].container, cont[0].proforma ? `proforma ${cont[0].proforma}` : ''].filter(Boolean).join(' · ')
  return cont.map(a => a.container).join(' · ')
}
function sottoArrivo(a: Arrivo, scheda: Scheda) {
  if (scheda === 'oggi') return [a.prodotto, a.proforma ? `proforma ${a.proforma}` : ''].filter(Boolean).join(' · ')
  return [a.etaPrima ? `prima era ${giornoMese(a.etaPrima)}` : '', a.container].filter(Boolean).join(' · ')
}
// in fondo alla pagina intera: quanti container per porto e quando arriva il prossimo
function Riepilogo({ c }: { c: DatiContainer }) {
  const futuri = (c.arrivi || []).filter(a => gg(a.eta) > 0)
  const porti = new Map<string, number>()
  for (const a of futuri) porti.set(a.porto || '?', (porti.get(a.porto || '?') || 0) + 1)
  const prossimo = ordina(futuri)[0]
  return <HStack spacing={12} modifiers={fondo(C.riquadro, 11, { top: 7, bottom: 7, leading: 11, trailing: 11 }, { maxWidth: 'infinity' })}>
    {[...porti.entries()].sort((a, b) => b[1] - a[1]).map(([p, n]) => <HStack spacing={4}>
      <Text font={15} fontWeight="heavy" foregroundStyle={C.testo} monospacedDigit>{String(n)}</Text>
      <Text font={11.5} foregroundStyle={C.tenue}>{p}</Text>
    </HStack>)}
    <Spacer />
    {prossimo ? <Text font={11.5} foregroundStyle={C.tenue} lineLimit={1}>{`prossimo tra ${gg(prossimo.eta)} gg`}</Text> : null}
  </HStack>
}

function TastoPiccolo({ testo, intent, largo = false }: { testo: string, intent: any, largo?: boolean }) {
  return <Button buttonStyle="plain" intent={intent}>
    <Text font={13} fontWeight="bold" foregroundStyle={C.testo} lineLimit={1}
      modifiers={fondo(C.tasto, 15, { leading: largo ? 12 : 0, trailing: largo ? 12 : 0 }, largo ? { minHeight: 30, maxHeight: 30 } : { width: 32, height: 30 })}>{testo}</Text>
  </Button>
}
function Valore({ etichetta, valore, colore, barrato = false }: { etichetta: string, valore: string, colore?: any, barrato?: boolean }) {
  return <VStack alignment="leading" spacing={1}>
    <Text font={10.5} foregroundStyle={C.tenue}>{etichetta}</Text>
    <Text font={16} fontWeight="bold" foregroundStyle={colore || C.testo} lineLimit={1} minScaleFactor={0.8}
      {...(barrato ? { strikethrough: 'systemGray' } : {}) as any}>{valore}</Text>
  </VStack>
}
// scheda di un container: si apre toccando una riga; ↑ ↓ scorrono la lista della scheda scelta
function Dettaglio({ a, l, scheda }: { a: Arrivo, l: Arrivo[], scheda: Scheda }) {
  const i = l.findIndex(x => x.container === a.container)
  const prima = i > 0 ? l[i - 1].container : '', dopo = i >= 0 && i < l.length - 1 ? l[i + 1].container : ''
  const nomeScheda = scheda === 'oggi' ? 'in porto' : scheda === 'spostati' ? 'spostati' : 'in viaggio'
  const sp = giorniSpost(a)
  const tag = tagEta(!!a.etaSpostata, sp)
  return <VStack alignment="leading" spacing={9} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <HStack spacing={6}>
      <TastoPiccolo testo="‹ Lista" intent={ApriContainer({ id: '' })} largo />
      <Spacer />
      <Text font={12} fontWeight="semibold" foregroundStyle={C.tenue}>{i >= 0 ? `${i + 1} di ${l.length} ${nomeScheda}` : ''}</Text>
      <Spacer />
      {prima ? <TastoPiccolo testo="↑" intent={ApriContainer({ id: prima })} /> : <Text font={13} foregroundStyle={C.tenue} frame={{ width: 32 }}> </Text>}
      {dopo ? <TastoPiccolo testo="↓" intent={ApriContainer({ id: dopo })} /> : <Text font={13} foregroundStyle={C.tenue} frame={{ width: 32 }}> </Text>}
    </HStack>
    <VStack alignment="leading" spacing={4}
      modifiers={fondo(C.riquadro, 14, { top: 11, bottom: 12, leading: 13, trailing: 12 }, { maxWidth: 'infinity', alignment: 'leading' })}>
      <HStack spacing={6}>
        <Text font={18} fontWeight="bold" foregroundStyle={C.testo} monospaced lineLimit={1} minScaleFactor={0.8}>{a.container}</Text>
        <Spacer />
        {tag ? <Tag t={sp > 0 ? `ETA +${sp} giorni` : tag} /> : null}
      </HStack>
      <Text font={14.5} fontWeight="bold" foregroundStyle={C.testo} lineLimit={2}>{[a.fornitore, a.prodotto].filter(Boolean).join(' · ') || '–'}</Text>
      <HStack spacing={18} alignment="top" padding={{ top: 5 }}>
        <Valore etichetta="arriva" valore={giornoMese(a.eta)} />
        {a.etaPrima ? <Valore etichetta="prima era" valore={giornoMese(a.etaPrima)} colore={C.tenue} barrato /> : null}
        {a.porto ? <Valore etichetta="porto" valore={a.porto} /> : null}
        <Valore etichetta={gg(a.eta) > 0 ? 'mancano' : 'stato'} valore={gg(a.eta) > 0 ? `${gg(a.eta)} gg` : gg(a.eta) === 0 ? 'oggi' : 'in porto'}
          colore={gg(a.eta) <= 0 ? C.bluTesto : undefined} />
      </HStack>
      {a.proforma ? <Text font={12} foregroundStyle={C.tenue} lineLimit={1} padding={{ top: 4 }}>{`Proforma ${a.proforma}`}</Text> : null}
    </VStack>
    {XL() && i >= 0 && i < l.length - 1
      ? <VStack alignment="leading" spacing={0} padding={{ top: 4 }}>
          <Titoletto testo="DOPO QUESTO · TOCCA UNA RIGA" />
          {l.slice(i + 1, i + 6).map((x, k, arr) => <Riga id={x.container} data={giornoMese(x.eta)} nome={nomeCorto(x.fornitore || '', x.prodotto || '', 1, 20)} n={1}
            tag={x.etaSpostata ? tagEta(true, giorniSpost(x)) : ''} porto={x.porto || ''} quando={quanto(x.eta)} ultima={k === arr.length - 1} />)}
        </VStack>
      : null}
    <Spacer />
  </VStack>
}

function PaginaContainer({ c }: { c: DatiContainer | null }) {
  if (!c) return <Vuoto testo="Dati dei container non disponibili" />
  const L = liste(c)
  const scheda = leggiScheda()
  const aperto = leggiAperto()
  // il container aperto si cerca prima nella scheda scelta, poi in tutti (se nel frattempo i dati sono cambiati)
  let lista = L[scheda], a = aperto ? lista.find(x => x.container === aperto) : undefined
  if (aperto && !a) { lista = ordina(c.arrivi || []); a = lista.find(x => x.container === aperto) }
  const barra = <Barra voci={[
    { testo: 'Oggi', n: String(L.oggi.length), colore: L.oggi.length ? C.bluTesto : C.tenue, sel: scheda === 'oggi', intent: CambiaScheda({ scheda: 'oggi' }) },
    { testo: 'In viaggio', n: String(L.viaggio.length), sel: scheda === 'viaggio', intent: CambiaScheda({ scheda: 'viaggio' }) },
    { testo: 'Spostati', n: String(L.spostati.length), colore: L.spostati.length ? C.ambra : C.tenue, sel: scheda === 'spostati', intent: CambiaScheda({ scheda: 'spostati' }) },
  ]} />
  return <VStack alignment="leading" spacing={8} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    {a ? <Dettaglio a={a} l={lista} scheda={L[scheda].includes(a) ? scheda : 'viaggio'} /> : barra}
    {a ? null : <Lista c={c} scheda={scheda} l={L[scheda]} />}
  </VStack>
}

// ---------- pagina Scorte: calendario a 7 / 14 / 30 giorni ----------
type Evento = { data: string, nome: string, tipo: 'rosso' | 'ambra' | 'blu', nota: string, dettaglio?: string }
function eventi(s: DatiScorte): Evento[] {
  const e: Evento[] = []
  for (const v of s.voci || []) {
    const data = v.entro || v.finisce
    if (!data || isNaN(gg(data))) continue
    const q = v.qta != null && v.qta > 0 ? `${Math.round(v.qta).toLocaleString('it-IT')} ${(v.udm || '').toLowerCase()}`.trim() : ''
    const fin = v.finisce && !isNaN(gg(v.finisce)) ? `finisce ${ggmm(v.finisce)}` : ''
    if (v.stato === 'rosso') e.push({ data, nome: v.nome, tipo: 'rosso', nota: [q, gg(data) < 0 ? 'scaduto' : v.fornitore].filter(Boolean).join(' · '),
      dettaglio: [gg(data) < 0 ? 'da ordinare subito' : `ordina entro ${ggmm(data)}`, q, v.fornitore, fin].filter(Boolean).join(' · ') })
    else e.push({ data, nome: v.nome, tipo: 'ambra', nota: ['ordina', v.fornitore].filter(Boolean).join(' · '),
      dettaglio: [`ordina entro ${ggmm(data)}`, v.fornitore, fin].filter(Boolean).join(' · ') })
  }
  for (const a of s.giaInArrivo || []) {
    if (!a || !a.nome || !a.quando || isNaN(gg(a.quando))) continue
    const nota = a.da ? (eContainer(a.da) ? `in ${a.da}` : `arriva da ${a.da}`) : 'in arrivo'
    e.push({ data: a.quando, nome: a.nome, tipo: 'blu', nota, dettaglio: `sotto scorta, ${nota} il ${ggmm(a.quando)}` })
  }
  return e.sort((x, y) => x.data.localeCompare(y.data))
}
function RigaEvento({ e, ultima }: { e: Evento, ultima: boolean }) {
  const col = e.tipo === 'rosso' ? C.rosso : e.tipo === 'ambra' ? C.ambra : C.blu
  if (XL() && e.dettaglio) return <VStack spacing={0}>
    <HStack spacing={9} alignment="top" frame={{ maxWidth: 'infinity', minHeight: 40, maxHeight: 40 }} padding={{ top: 5 }}>
      <Text font={13} fontWeight="bold" foregroundStyle={e.tipo === 'rosso' && gg(e.data) < 0 ? C.rossoTesto : C.testo} monospacedDigit frame={{ width: 42, alignment: 'leading' }}>{ggmm(e.data)}</Text>
      <Circle fill={col} frame={{ width: 8, height: 8 }} padding={{ top: 5 }} />
      <VStack alignment="leading" spacing={1}>
        <Text font={13.5} fontWeight="semibold" foregroundStyle={C.testo} lineLimit={1}>{e.nome}</Text>
        <Text font={11} foregroundStyle={C.tenue} lineLimit={1} minScaleFactor={0.85}>{e.dettaglio}</Text>
      </VStack>
      <Spacer />
    </HStack>
    {ultima ? null : <Linea />}
  </VStack>
  return <VStack spacing={0}>
    <HStack spacing={9} frame={{ maxWidth: 'infinity', minHeight: 26, maxHeight: 26 }}>
      <Text font={13} fontWeight="bold" foregroundStyle={e.tipo === 'rosso' && gg(e.data) < 0 ? C.rossoTesto : C.testo} monospacedDigit frame={{ width: 42, alignment: 'leading' }}>{ggmm(e.data)}</Text>
      <Circle fill={col} frame={{ width: 8, height: 8 }} />
      <Text font={13} fontWeight="semibold" foregroundStyle={C.testo} lineLimit={1} minScaleFactor={0.85}>{e.nome}</Text>
      <Spacer />
      <Text font={11.5} foregroundStyle={C.tenue} lineLimit={1} minScaleFactor={0.8}>{e.nota}</Text>
    </HStack>
    {ultima ? null : <Linea />}
  </VStack>
}
function Legenda({ s }: { s: DatiScorte }) {
  const giorniDati = s.controllo ? -gg(s.controllo) : 99
  const vecchi = giorniDati > 5 // i controlli sono il lunedì e il mercoledì
  const punto = (col: any, t: string) => <HStack spacing={3}><Circle fill={col} frame={{ width: 6, height: 6 }} /><Text font={10.5} foregroundStyle={C.tenue}>{t}</Text></HStack>
  return <HStack spacing={10}>
    {punto(C.rosso, 'da ordinare')}{punto(C.ambra, 'a breve')}{punto(C.blu, 'in arrivo')}
    <Spacer />
    {s.controllo ? <Text font={10.5} fontWeight={vecchi ? 'semibold' : 'regular'} foregroundStyle={vecchi ? C.rossoTesto : C.tenue}>{`dati del ${ggmm(s.controllo)}`}</Text> : null}
  </HStack>
}
function PaginaScorte({ s }: { s: DatiScorte | null }) {
  if (!s) return <Vuoto testo="Dati delle scorte non disponibili" />
  const giorni = leggiGiorni()
  const tutti = eventi(s)
  const fin = new Date(); fin.setHours(0, 0, 0, 0); fin.setDate(fin.getDate() + giorni)
  const limite = `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`
  const dentro = tutti.filter(e => e.data <= limite) // anche quelli già scaduti
  const MAX = XL() ? 9 : 7
  const righe = dentro.slice(0, MAX)
  const dopo = tutti.length - dentro.length
  const barra = <Barra voci={[7, 14, 30].map(n => ({ testo: `${n} giorni`, sel: giorni === n, intent: CambiaGiorni({ giorni: String(n) }) }))} />
  return <VStack alignment="leading" spacing={0} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    {barra}
    <VStack spacing={0} padding={{ top: 8 }}>
      <Titoletto testo={`COSA SUCCEDE FINO AL ${ggmm(limite)}`} destra={dentro.length === 1 ? '1 cosa' : `${dentro.length} cose`} />
    </VStack>
    {righe.length
      ? righe.map((e, i) => <RigaEvento e={e} ultima={i === righe.length - 1} />)
      : <HStack spacing={6} frame={{ minHeight: 34, maxHeight: 34 }}>
          <Circle fill={C.verde} frame={{ width: 8, height: 8 }} />
          <Text font={13.5} fontWeight="semibold" foregroundStyle={C.testo}>{`Niente nei prossimi ${giorni} giorni`}</Text>
        </HStack>}
    {dentro.length > righe.length || dopo > 0
      ? <Text font={11} foregroundStyle={C.tenue} padding={{ top: 3 }}>
          {[dentro.length > righe.length ? `+${dentro.length - righe.length} in questo periodo` : '', dopo > 0 ? `${dopo} più avanti` : ''].filter(Boolean).join(' · ')}
        </Text>
      : null}
    <Spacer />
    <Legenda s={s} />
  </VStack>
}

function Vuoto({ testo }: { testo: string }) {
  return <VStack alignment="leading" spacing={4} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }} padding={{ top: 12 }}>
    <Text font={14} fontWeight="semibold" foregroundStyle={C.testo}>{testo}</Text>
    <Text font={12} foregroundStyle={C.tenue}>Tocca il widget per aprire il pannello</Text>
  </VStack>
}

// ---------- formati piccolo e medio (versione ridotta) ----------
function Piccolo({ d }: { d: Dati }) {
  const s = d.scorte, c = d.container
  const inPorto = (c?.arrivi || []).filter(a => gg(a.eta) <= 0).length
  return <VStack alignment="leading" spacing={6} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <Text font={11} fontWeight="bold" foregroundStyle={C.tenue}>ACQUISTI</Text>
    <Numero n={String(c?.inViaggio ?? '–')} etichetta="container in viaggio" colore={C.testo} />
    <HStack spacing={14}>
      <Numero n={String(inPorto)} etichetta="oggi" colore={inPorto ? C.bluTesto : C.tenue} />
      <Numero n={String(s?.daOrdinare ?? '–')} etichetta="da ordinare" colore={(s?.daOrdinare ?? 0) ? C.rosso : C.tenue} />
    </HStack>
    <Spacer />
  </VStack>
}
function Medio({ d, pagina }: { d: Dati, pagina: Pagina }) {
  const c = d.container, s = d.scorte
  let riga: any = null
  if (pagina === 'c' && c) { const m = messaggio(c); riga = <Text font={13} fontWeight="semibold" foregroundStyle={C.testo} lineLimit={2}>{[m.titolo, m.azione].filter(Boolean).join(' · ')}</Text> }
  if (pagina === 's' && s) {
    const r = (s.voci || []).filter(v => v.stato === 'rosso')
    riga = <Text font={13} fontWeight="semibold" foregroundStyle={C.testo} lineLimit={2}>{r.length ? 'Da ordinare: ' + r.slice(0, 3).map(v => v.nome).join(', ') : 'Niente da ordinare subito'}</Text>
  }
  return <VStack alignment="leading" spacing={10} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <Tasti d={d} pagina={pagina} />
    {riga}
    <Spacer />
  </VStack>
}

// ---------- disegno ----------
async function disegna() {
  const d = await carica()
  const pagina = leggiPagina()
  const fam = Widget.family
  let corpo: any
  if (!d) corpo = <Vuoto testo={urlDati() ? 'Dati non disponibili: controlla la connessione' : "Manca l'indirizzo dei dati"} />
  else if (fam === 'systemSmall') corpo = <Piccolo d={d} />
  else if (fam === 'systemMedium') corpo = <Medio d={d} pagina={pagina} />
  else corpo = <VStack alignment="leading" spacing={10} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
    <Tasti d={d} pagina={pagina} />
    {pagina === 's' ? <PaginaScorte s={d.scorte} /> : <PaginaContainer c={d.container} />}
  </VStack>

  Widget.present(
    <VStack widgetBackground={C.sfondo} widgetURL={APRI_PANNELLO} frame={{ maxWidth: 'infinity', maxHeight: 'infinity' }}>
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
      <VStack widgetBackground={C.sfondo} padding={14} spacing={4} frame={{ maxWidth: 'infinity', maxHeight: 'infinity', alignment: 'topLeading' }}>
        <Text font={12} fontWeight="bold" foregroundStyle={C.rosso}>Acquisti: errore</Text>
        <Text font={10} foregroundStyle={C.tenue}>{String(e)}</Text>
      </VStack>,
      { policy: 'after', date: new Date(Date.now() + 5 * 60 * 1000) } as any
    )
  }
}

main()
