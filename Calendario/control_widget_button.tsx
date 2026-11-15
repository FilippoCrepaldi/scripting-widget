// control_widget_button.tsx – pulsante nel Centro di Controllo: aggiorna subito meteo e widget del Calendario
import { ControlWidget, ControlWidgetButton } from 'scripting'
import { AggiornaTutto } from './app_intents'

ControlWidget.present(
  <ControlWidgetButton
    intent={AggiornaTutto(undefined)}
    label={{ title: 'Aggiorna Calendario', systemImage: 'calendar.badge.clock' }}
  />
)
