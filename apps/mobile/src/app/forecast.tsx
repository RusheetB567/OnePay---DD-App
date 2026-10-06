import { router } from "expo-router";
import { useState } from "react";
import type { Forecast } from "../../../../shared/contracts";
import { useRemote } from "../api/use-remote";
import {
  Amount,
  Button,
  Card,
  Choice,
  DataGate,
  Heading,
  Label,
  Message,
  Screen,
  useMoney,
} from "../design-system/ui";
import { useWorkspace } from "../state/workspace";
export default function ForecastScreen() {
  const formatMoney = useMoney();
  const { data } = useWorkspace();
  const [horizon, setHorizon] = useState("30");
  const remote = useRemote<Forecast>(
    data ? `/forecast?days=${horizon}` : null,
    data?.updatedAt,
  );
  const forecast = remote.value,
    issue = remote.error;
  return (
    <Screen
      title="What the next days could look like"
      subtitle="Estimated cash flow, with the calculation in view."
    >
      <Button title="Back" secondary onPress={() => router.back()} />
      <DataGate>
        <Choice
          values={["7", "14", "30"]}
          value={horizon}
          onChange={setHorizon}
        />
        {issue && (
          <>
            <Message text={issue} error />
            <Button title="Try again" onPress={remote.retry} />
          </>
        )}
        {!forecast && !issue && <Message text="Calculating your forecast…" />}
        {forecast && (
          <>
            <Card>
              <Label>Estimated safe to spend</Label>
              <Amount cents={forecast.safeToSpend} large />
              <Message
                text={`Opening ${formatMoney(forecast.opening)} · committed ${formatMoney(forecast.committed)} · expected income ${formatMoney(forecast.income)}`}
              />
              <Label>
                Lowest estimated balance {formatMoney(forecast.minimum)} minus
                safety buffer {formatMoney(forecast.buffer)}, floored at zero.
              </Label>
              <Message
                text={`Calculated ${forecast.calculationDate} · ${forecast.calculationVersion}`}
              />
            </Card>
            <Heading>Account pressure</Heading>
            {forecast.accounts.map((a) => (
              <Card key={a.id}>
                <Label>{a.name}</Label>
                <Message
                  text={`Lowest ${formatMoney(a.minimum)} · ending ${formatMoney(a.closing)}`}
                />
                {a.shortfall > 0 && (
                  <Message
                    text={`Potential shortfall ${formatMoney(a.shortfall)}. Review funding manually.`}
                    error
                  />
                )}
              </Card>
            ))}
            <Heading>Calculation assumptions</Heading>
            {forecast.assumptions.map((text) => (
              <Message key={text} text={text} />
            ))}
            <Heading>Daily breakdown</Heading>
            {forecast.points.map((p) => (
              <Card key={p.date}>
                <Label>
                  {p.date} · closing {formatMoney(p.balance)}
                </Label>
                <Message
                  text={`Expected in +${formatMoney(p.income)} · out −${formatMoney(p.expense)} · before income ${formatMoney(p.beforeIncome)}`}
                />
                {forecast.events
                  .filter((e) => e.date === p.date)
                  .map((e) => (
                    <Message
                      key={e.id}
                      text={`${e.merchant} · ${e.certainty} · ${e.kind === "income" ? "+" : "−"}${formatMoney(e.amount)}`}
                    />
                  ))}
              </Card>
            ))}
          </>
        )}
      </DataGate>
    </Screen>
  );
}
