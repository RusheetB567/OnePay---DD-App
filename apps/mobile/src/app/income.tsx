import { router } from "expo-router";
import type { Commitment, Pattern } from "../../../../shared/contracts";
import { useRemote } from "../api/use-remote";
import {
  Button,
  OnePayLoader,
  Skeleton,
  EmptyState,
  Card,
  DataGate,
  Heading,
  Message,
  Screen,
  Label,
  Amount,
  useMoney,
} from "../design-system/ui";
import { CommitmentList } from "../components/commitments";
import { useWorkspace } from "../state/workspace";
type IncomeData = {
  items: Commitment[];
  patterns: Pattern[];
  assumptions: string[];
};
export default function Income() {
  const money = useMoney();
  const { data } = useWorkspace();
  const remote = useRemote<IncomeData>(
    data ? "/income" : null,
    data?.updatedAt,
  );
  return (
    <Screen
      title="Your income rhythm"
      subtitle="Review expected paydays and the history behind them."
    >
      <Button title="Back" secondary onPress={() => router.back()} />
      <DataGate>
        {remote.loading && (
          <>
            <OnePayLoader text="Loading income history…" />
            <Skeleton kind="row" />
          </>
        )}
        {remote.error && (
          <>
            <Message text={remote.error} error />
            <Button title="Try again" onPress={remote.retry} />
          </>
        )}
        {remote.value && (
          <>
            <Heading>Tracked income</Heading>
            <CommitmentList items={remote.value.items} />
            <Heading>Observed patterns</Heading>
            {!remote.value.patterns.length && (
              <EmptyState
                title="Make payday part of your plan"
                description="Add your next income manually or connect sample history to find consistent paydays."
              />
            )}
            {remote.value.patterns.map((p) => (
              <Card key={p.key}>
                <Heading>{p.merchant}</Heading>
                <Label>Average posted amount</Label>
                <Amount
                  cents={Math.floor(
                    (p.evidence.reduce((sum, e) => sum + e.amount, 0) +
                      Math.floor(p.evidence.length / 2)) /
                      p.evidence.length,
                  )}
                />
                <Message
                  text={`Normal range ${money(p.minAmount)}–${money(p.maxAmount)} · ${p.frequency}`}
                />
                <Message
                  text={`Predicted next ${p.nextDate} · ${p.confidence}% pattern confidence`}
                />
                {p.evidence.map((e) => (
                  <Message
                    key={e.date}
                    text={`${e.date} · ${money(e.amount)}`}
                  />
                ))}
                <Button
                  title="Review or correct income"
                  secondary
                  onPress={() => {
                    const tracked = remote.value?.items.find(
                      (c) =>
                        c.accountId === p.accountId &&
                        c.merchant === p.merchant,
                    );
                    router.push(
                      tracked
                        ? {
                            pathname: "/commitment",
                            params: { id: tracked.id },
                          }
                        : "/(tabs)/insights",
                    );
                  }}
                />
              </Card>
            ))}
            {remote.value.assumptions.map((text) => (
              <Message key={text} text={text} />
            ))}
          </>
        )}
        <Button
          title="Add an income commitment"
          onPress={() => router.push("/commitment")}
        />
      </DataGate>
    </Screen>
  );
}
