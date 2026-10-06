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
        <Button
          title="Connect a development bank"
          onPress={() => router.push("/connect")}
        />
        {data?.accounts.length === 0 && (
          <Message text="No accounts yet. Connect an explicitly synthetic development bank to explore the workflow." />
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
