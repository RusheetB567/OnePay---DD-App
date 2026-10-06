import { router } from "expo-router";
import type { Commitment } from "../../../../shared/contracts";
import { useRemote } from "../api/use-remote";
import {
  Button,
  Card,
  DataGate,
  Heading,
  Label,
  Message,
  Screen,
  Amount,
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
        {remote.loading && <Message text="Loading subscription costs…" />}
        {remote.error && (
          <>
            <Message text={remote.error} error />
            <Button title="Try again" onPress={remote.retry} />
          </>
        )}
        {remote.value && (
          <>
            <Card>
              <Label>Estimated monthly equivalent</Label>
              <Amount cents={remote.value.monthly} large />
              <Label>Annualised cost</Label>
              <Amount cents={remote.value.annual} />
            </Card>
            {!remote.value.items.length && (
              <Message text="No active tracked subscriptions. Review a detected pattern or add one manually." />
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
