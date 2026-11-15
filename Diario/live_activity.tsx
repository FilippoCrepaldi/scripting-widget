// Live Activity "Prossimo pasto": schermata di blocco e Dynamic Island
import { LiveActivity, LiveActivityUI, LiveActivityUIExpandedLeading, LiveActivityUIExpandedTrailing, LiveActivityUIExpandedBottom, VStack, HStack, Text, Image, Spacer } from "scripting"

export type StatoPasto = { pasto: string, ore: string, testo: string, kcal_rimaste: number }

function Contenuto(s: StatoPasto) {
  return <HStack spacing={12} padding={14} activityBackgroundTint={{ light: "systemBackground", dark: "systemBackground" } as any}>
    <Image systemName="fork.knife.circle.fill" font={34} foregroundStyle="#16A37F" />
    <VStack alignment="leading" spacing={2}>
      <HStack>
        <Text font="headline">{s.pasto}</Text>
        <Text font="subheadline" foregroundStyle="secondaryLabel">{s.ore ? `ore ${s.ore}` : ""}</Text>
      </HStack>
      <Text font="caption" foregroundStyle="secondaryLabel" lineLimit={2}>{s.testo}</Text>
    </VStack>
    <Spacer />
    <VStack alignment="trailing" spacing={0}>
      <Text font="title3" fontWeight="bold">{String(Math.max(0, Math.round(s.kcal_rimaste)))}</Text>
      <Text font="caption2" foregroundStyle="secondaryLabel">kcal rimaste</Text>
    </VStack>
  </HStack>
}

export const ProssimoPasto = LiveActivity.register<StatoPasto>("ProssimoPasto", (s) =>
  <LiveActivityUI
    content={Contenuto(s)}
    compactLeading={<Image systemName="fork.knife" foregroundStyle="#16A37F" />}
    compactTrailing={<Text font="caption">{s.ore || s.pasto}</Text>}
    minimal={<Image systemName="fork.knife" foregroundStyle="#16A37F" />}
  >
    <LiveActivityUIExpandedLeading><Text font="headline">{s.pasto}</Text></LiveActivityUIExpandedLeading>
    <LiveActivityUIExpandedTrailing><Text font="headline">{String(Math.max(0, Math.round(s.kcal_rimaste)))} kcal</Text></LiveActivityUIExpandedTrailing>
    <LiveActivityUIExpandedBottom><Text font="caption" lineLimit={2}>{s.testo}</Text></LiveActivityUIExpandedBottom>
  </LiveActivityUI>
)
