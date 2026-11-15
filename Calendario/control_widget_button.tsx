// control_widget_button.tsx – pulsante nel Centro di Controllo: avvia il conto alla rovescia del prossimo impegno
import { ControlWidget, ControlWidgetButton } from 'scripting'
import { SeguiImpegno } from './app_intents'

ControlWidget.present(
  <ControlWidgetButton
    intent={SeguiImpegno(undefined)}
    label={{ title: 'Prossimo impegno', systemImage: 'calendar.badge.clock' }}
  />
)
