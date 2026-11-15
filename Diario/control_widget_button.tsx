// Pulsante del Centro di Controllo: aggiorna i widget e scrive i pasti in Salute
import { ControlWidget, ControlWidgetButton } from "scripting"
import { AggiornaDiario } from "./app_intents"

ControlWidget.present(
  <ControlWidgetButton
    intent={AggiornaDiario(undefined)}
    label={{ title: "Aggiorna diario", systemImage: "fork.knife.circle" }}
  />
)
