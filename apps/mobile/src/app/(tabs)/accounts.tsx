import { router } from "expo-router";
import {
  Button,
  Card,
  DataGate,
  Heading,
  Label,
  Message,
  Screen,
  Amount,
  EmptyState,
} from "../../design-system/ui";
import { useWorkspace } from "../../state/workspace";
export default function Accounts() {
  const { data } = useWorkspace();
  return (
    <Screen
      title="Your accounts, together"
      subtitle="Balances, connections and consent."
    >
      <DataGate>
        {data && data.accounts.length > 0 && (
          <Card>
            <Label>Total across connected accounts</Label>
            <Amount
              cents={data.accounts.reduce((sum, a) => sum + a.balance, 0)}
              large
            />
            <Message text="Includes savings. Only eligible balances enter safe-to-spend." />
          </Card>
        )}
        <Button
          title="Connect a sample bank"
          onPress={() => router.push("/connect")}
        />
        {data?.accounts.length === 0 && (
          <EmptyState
            title="Your accounts belong together"
            description="Connect a fictional sample institution to explore your money calendar. Live banking awaits provider setup."
            action="Explore sample banking"
            onPress={() => router.push("/connect")}
          />
        )}
        {data?.accounts.map((a) => {
          const consent = data.consents.find((c) => c.id === a.connectionId);
          return (
            <Card
              key={a.id}
              onPress={() =>
                router.push({ pathname: "/account", params: { id: a.id } })
              }
            >
              <Label>
                {a.institution} · •••• {a.mask}
              </Label>
              <Heading>{a.name}</Heading>
              <Amount cents={a.balance} />
              <Message
                text={`${a.role} · Consent ${consent?.status || "unavailable"} · Updated ${new Date(a.lastSynced).toLocaleString()}`}
              />
            </Card>
          );
        })}
        <Button
          title="Explore transactions"
          secondary
          onPress={() => router.push("/transactions")}
        />
      </DataGate>
    </Screen>
  );
}
