import { useState } from "react";
import { router } from "expo-router";
import type { Commitment } from "../../../../shared/contracts";
import { useRemote } from "../api/use-remote";
import {
  Button,
  OnePayLoader,
  Skeleton,
  Card,
  DataGate,
  Heading,
  Label,
  Message,
  Screen,
  Amount,
  Choice,
  EmptyState,
} from "../design-system/ui";
import { CommitmentList } from "../components/commitments";
import { useWorkspace } from "../state/workspace";
type Summary = {
  annual: number;
  monthly: number;
  items: (Commitment & { annual: number })[];
  assumptions: string[];
};
export default function Subscriptions() {
  const { data } = useWorkspace();
  const [period, setPeriod] = useState("Annual");
  const remote = useRemote<Summary>(
    data ? "/subscriptions" : null,
    data?.updatedAt,
  );
  const detected =
    data?.patterns.filter(
      (p) => p.category === "Subscription" && p.kind === "expense",
    ) || [];
  return (
    <Screen
      title="Subscriptions, in perspective"
      subtitle="See the cost of your active tracked subscriptions."
    >
      <Button title="Back" secondary onPress={() => router.back()} />
      <DataGate>
        {remote.loading && (
          <>
            <OnePayLoader text="Loading subscription costs…" />
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
            <Card>
              <Choice
                values={["Monthly", "Annual"]}
                value={period}
                onChange={setPeriod}
              />
              <Label>
                {period === "Annual"
                  ? "Annualised subscription cost"
                  : "Estimated monthly equivalent"}
              </Label>
              <Amount
                cents={
                  period === "Annual"
                    ? remote.value.annual
                    : remote.value.monthly
                }
                large
              />
            </Card>
            {!remote.value.items.length && (
              <EmptyState
                title="Room for what matters"
                description="No active subscriptions are tracked. Review a detected service or add one manually to see its annual impact."
              />
            )}
            {remote.value.items.map((item) => (
              <Card
                key={item.id}
                onPress={() =>
                  router.push({
                    pathname: "/commitment",
                    params: { id: item.id },
                  })
                }
              >
                <Heading>{item.merchant}</Heading>
                <Amount cents={item.amount} />
                <Message
                  text={`${item.frequency} · next ${item.nextDate} · ${item.certainty}`}
                />
                <Label>Annual estimate</Label>
                <Amount cents={item.annual} />
                <Message
                  text={
                    data?.accounts.find((a) => a.id === item.accountId)?.name ||
                    "Account unavailable"
                  }
                />
              </Card>
            ))}
            {remote.value.assumptions.map((text) => (
              <Message key={text} text={text} />
            ))}
          </>
        )}
        {detected.length > 0 && (
          <Card>
            <Heading>{detected.length} patterns to review</Heading>
            <Message text="Unconfirmed patterns are excluded from the cost total. Review past amounts and any detected price increase." />
            <Button
              title="Review subscription evidence"
              secondary
              onPress={() => router.push("/(tabs)/insights")}
            />
          </Card>
        )}
        {data &&
          data.commitments.some(
            (c) => c.category === "Subscription" && c.status === "paused",
          ) && (
            <>
              <Heading>Tracking paused</Heading>
              <CommitmentList
                items={data.commitments.filter(
                  (c) => c.category === "Subscription" && c.status === "paused",
                )}
              />
            </>
          )}
        <Button
          title="Add subscription"
          onPress={() => router.push("/commitment")}
        />
        <Message text="Changing tracking does not cancel or alter your merchant subscription." />
      </DataGate>
    </Screen>
  );
}
