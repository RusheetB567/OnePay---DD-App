import { useState } from "react";
import {
  Button,
  Card,
  DataGate,
  Heading,
  Label,
  Message,
  Screen,
  useMoney,
} from "../../design-system/ui";
import { useWorkspace } from "../../state/workspace";
export default function Insights() {
  const formatMoney = useMoney();
  const { data, mutate } = useWorkspace();
  const [busy, setBusy] = useState(false),
    [issue, setIssue] = useState("");
  const decide = async (key: string, decision: "confirm" | "ignore") => {
    setBusy(true);
    setIssue("");
    try {
      await mutate("/patterns/review", "POST", { key, decision });
    } catch (e) {
      setIssue(e instanceof Error ? e.message : "Unable to review pattern.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      title="Patterns worth a look"
      subtitle="Review the evidence before adding anything to your plan."
    >
      <DataGate>
        {issue && <Message text={issue} error />}
        {!data?.patterns.length && (
          <Message text="No unreviewed patterns. Detection needs at least three posted transactions with a consistent cadence." />
        )}
        {data?.patterns.map((p) => (
          <Card key={p.key}>
            <Heading>{p.merchant}</Heading>
            <Label>
              {formatMoney(p.amount)} · {p.frequency} · {p.kind}
            </Label>
            <Message
              text={`Predicted ${p.nextDate} · ${p.confidence}% pattern confidence · Observed range ${formatMoney(p.minAmount)}–${formatMoney(p.maxAmount)}`}
            />
            {p.amount > p.previousAmount && p.kind === "expense" && (
              <Message
                text={`Price increased by ${formatMoney(p.amount - p.previousAmount)} compared with the previous transaction.`}
              />
            )}
            <Label muted>Evidence</Label>
            {p.evidence.map((e) => (
              <Message
                key={e.date}
                text={`${e.date} · ${formatMoney(e.amount)}`}
              />
            ))}
            <Button
              title="Confirm tracking"
              onPress={() => void decide(p.key, "confirm")}
              busy={busy}
            />
            <Button
              title="Ignore pattern"
              secondary
              onPress={() => void decide(p.key, "ignore")}
              disabled={busy}
            />
          </Card>
        ))}
        <Message text="Detection estimates cadence from transaction history. It does not establish a legal direct debit agreement or subscription contract." />
      </DataGate>
    </Screen>
  );
}
