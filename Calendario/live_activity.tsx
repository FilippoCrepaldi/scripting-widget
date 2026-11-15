// live_activity.tsx – conto alla rovescia del prossimo impegno (schermata di blocco e Dynamic Island)
import {
  HStack, VStack, ZStack, Text, Image, Spacer, DateLabel, RoundedRectangle,
  LiveActivity, LiveActivityUI, LiveActivityUIExpandedLeading, LiveActivityUIExpandedTrailing,
  LiveActivityUIExpandedCenter, LiveActivityUIExpandedBottom, type LiveActivityUIBuilder,
} from 'scripting'

export type StatoLA = { titolo: string, inizio: number, fine: number, luogo: string, colore: string, giorno: string, numero: string }

function Badge({ s, size }: { s: StatoLA, size: number }) {
  return <ZStack frame={{ width: size, height: size }}>
    <RoundedRectangle fill={s.colore} cornerRadius={size * 0.24} frame={{ width: size, height: size }} />
    <VStack spacing={0}>
      <Text font={size * 0.2} fontWeight="bold" foregroundStyle="white">{s.giorno}</Text>
      <Text font={size * 0.42} fontWeight="heavy" foregroundStyle="white">{s.numero}</Text>
    </VStack>
  </ZStack>
}

// Prima dell'inizio conta alla rovescia, dopo l'inizio conta il tempo trascorso
function Conto({ s, size }: { s: StatoLA, size: number }) {
  return <DateLabel date={new Date(s.inizio)} style="timer" font={size} fontWeight="bold" monospacedDigit foregroundStyle="systemRed" multilineTextAlignment="trailing" />
}

function Blocco(s: StatoLA) {
  const inizio = new Date(s.inizio), fine = new Date(s.fine)
  const ore = `${String(inizio.getHours()).padStart(2, '0')}:${String(inizio.getMinutes()).padStart(2, '0')} – ${String(fine.getHours()).padStart(2, '0')}:${String(fine.getMinutes()).padStart(2, '0')}`
  return <HStack spacing={12} padding={14} activityBackgroundTint={{ light: 'rgba(255,255,255,0.75)', dark: 'rgba(20,20,20,0.75)' }}>
    <Badge s={s} size={44} />
    <VStack alignment="leading" spacing={2}>
      <Text font={16} fontWeight="bold" lineLimit={1}>{s.titolo}</Text>
      <Text font={12} foregroundStyle="secondaryLabel" lineLimit={1}>{s.luogo ? `${ore} · ${s.luogo}` : ore}</Text>
    </VStack>
    <Spacer />
    <VStack alignment="trailing" spacing={2}>
      <Text font={10} fontWeight="semibold" foregroundStyle="secondaryLabel">{Date.now() < s.inizio ? 'TRA' : 'INIZIATO DA'}</Text>
      <Conto s={s} size={24} />
    </VStack>
  </HStack>
}

const builder: LiveActivityUIBuilder<StatoLA> = (s) => (
  <LiveActivityUI
    content={<Blocco {...s} />}
    compactLeading={<HStack spacing={4}><Image systemName="calendar" foregroundStyle={s.colore} /><Text font={13} fontWeight="semibold" lineLimit={1}>{s.titolo.slice(0, 10)}</Text></HStack>}
    compactTrailing={<DateLabel date={new Date(s.inizio)} style="timer" font={13} fontWeight="semibold" monospacedDigit foregroundStyle="systemRed" frame={{ maxWidth: 52 }} />}
    minimal={<Image systemName="calendar.badge.clock" foregroundStyle="systemRed" />}
  >
    <LiveActivityUIExpandedLeading><Badge s={s} size={44} /></LiveActivityUIExpandedLeading>
    <LiveActivityUIExpandedCenter priority={1}>
      <VStack alignment="leading" spacing={2}>
        <Text font={15} fontWeight="bold" lineLimit={1}>{s.titolo}</Text>
        <Text font={12} foregroundStyle="secondaryLabel" lineLimit={1}>{s.luogo || 'Prossimo impegno'}</Text>
      </VStack>
    </LiveActivityUIExpandedCenter>
    <LiveActivityUIExpandedTrailing><Conto s={s} size={22} /></LiveActivityUIExpandedTrailing>
    <LiveActivityUIExpandedBottom>
      <Text font={11} foregroundStyle="secondaryLabel">{`Fino alle ${new Date(s.fine).getHours()}:${String(new Date(s.fine).getMinutes()).padStart(2, '0')}`}</Text>
    </LiveActivityUIExpandedBottom>
  </LiveActivityUI>
)

export const ProssimoImpegno = LiveActivity.register('ProssimoImpegno', builder)
