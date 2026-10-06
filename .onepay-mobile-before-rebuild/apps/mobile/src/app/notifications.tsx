import { router, type Href } from "expo-router";
import {
  Button,
  Card,
  DataGate,
  Label,
  Message,
  Screen,
} from "../design-system/ui";
import { useWorkspace } from "../state/workspace";
import { useRemote } from "../api/use-remote";
type Alert = { id: string; title: string; message: string; target: string };
const destinations: Record<string, Href> = {
  payments: "/(tabs)/payments",
  forecast: "/forecast",
  insights: "/(tabs)/insights",
  accounts: "/(tabs)/accounts",
  security: "/security",
};
export default function Notifications() {
  const { data } = useWorkspace();
  const remote = useRemote<{ items: Alert[] }>(
    data ? "/notifications" : null,
    data?.updatedAt,
  );
  return (
    <Screen
      title="Your heads-up"
      subtitle="Payment reminders, account pressure and connection updates."
    >
      <Button title="Back" secondary onPress={() => router.back()} />
      <DataGate>
        {remote.loading && <Message text="Checking for updates…" />}
        {remote.error && (
          <>
            <Message text={remote.error} error />
            <Button title="Try again" onPress={remote.retry} />
          </>
        )}
        {remote.value?.items.length === 0 && (
          <Card>
            <Label>You’re up to date</Label>
            <Message text="No updates need your attention right now." />
          </Card>
        )}
        {remote.value?.items.map((item) => (
          <Card
            key={item.id}
            onPress={() => router.push(destinations[item.target] || "/(tabs)")}
          >
            <Label>{item.title}</Label>
            <Message text={item.message} />
          </Card>
        ))}
        <Message text="In-app updates only. Your notification privacy setting applies to these messages." />
      </DataGate>
    </Screen>
  );
}
