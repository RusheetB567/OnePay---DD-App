import { router } from "expo-router";
import { useWorkspace } from "../../state/workspace";
import {
  Amount,
  BalanceHero,
  Button,
  Card,
  DataGate,
  Heading,
  Label,
  Message,
  Screen,
  formatMoney,
} from "../../design-system/ui";
import { CommitmentList } from "../../components/commitments";
export default function Home() {
  const { data, reload } = useWorkspace();
  const f = data?.forecast;
  const next = f?.events.find((e) => e.kind === "income");
  const upcoming =
    f?.events
      .filter((e) => e.kind === "expense" && (!next || e.date <= next.date))
      .slice(0, 5) || [];
  return (
    <Screen
      title={data ? `Hello, ${data.profile.name}.` : "Your workspace"}
      subtitle="Know what’s coming. Plan with a little more confidence."
    >
      <DataGate>
        {data && f && (
          <>
            <BalanceHero
              cents={f.safeToSpend}
              buffer={f.buffer}
              onPress={() => router.push("/forecast")}
            />
            <Card onPress={() => router.push("/(tabs)/accounts")}>
              <Label>Available for bills & spending</Label>
              <Amount cents={f.opening} />
              <Message text="Connected eligible accounts. Savings remain set aside." />
            </Card>
            <Card onPress={() => router.push("/(tabs)/payments")}>
              <Label>Next expected income</Label>
              <Amount cents={next?.amount || 0} />
              <Message
                text={
                  next
                    ? `${next.merchant} · ${next.date} · ${next.certainty} · ${next.confidence}% pattern confidence`
                    : "Confirm an income pattern or add your payday manually."
                }
              />
            </Card>
            {f.accounts
              .filter((a) => a.shortfall > 0)
              .map((a) => (
                <Card key={a.id} onPress={() => router.push("/forecast")}>
                  <Heading>Account funding warning</Heading>
                  <Message
                    text={`${a.name} may be short by ${formatMoney(a.shortfall)} before expected income. Combined balances do not fund another account automatically.`}
                    error
                  />
                </Card>
              ))}
            <Heading>Before your next payday</Heading>
            <CommitmentList items={upcoming} />
            <Button
              title="Add a commitment"
              onPress={() => router.push("/commitment")}
            />
            <Button
              title="Forecast · 7, 14 and 30 days"
              secondary
              onPress={() => router.push("/forecast")}
            />
            <Button
              title="Notifications"
              secondary
              onPress={() => router.push("/notifications")}
            />
            <Button
              title="Security, privacy & preferences"
              secondary
              onPress={() => router.push("/settings")}
            />
            <Button
              title="Refresh workspace"
              secondary
              onPress={() => void reload()}
            />
            <Message
              text={`${data.mode} environment · Banking: ${data.capabilities.banking} · Last refreshed ${new Date(data.updatedAt).toLocaleString()}`}
            />
          </>
        )}
      </DataGate>
    </Screen>
  );
}
