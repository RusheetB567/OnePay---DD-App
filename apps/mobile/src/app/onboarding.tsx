import { router } from "expo-router";
import { useState } from "react";
import {
  Button,
  Icon,
  usePalette,
  Card,
  DataGate,
  Heading,
  Message,
  Screen,
} from "../design-system/ui";
import { useWorkspace } from "../state/workspace";
export default function Onboarding() {
  const c = usePalette();
  const { data, mutate } = useWorkspace();
  const [busy, setBusy] = useState(false),
    [issue, setIssue] = useState("");
  async function finish() {
    if (!data) return;
    setBusy(true);
    try {
      await mutate("/profile", "PATCH", {
        ...data.profile,
        onboardingCompleted: true,
      });
      router.replace("/(tabs)");
    } catch (e) {
      setIssue(e instanceof Error ? e.message : "Could not save setup.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen
      title="Make room for what’s next"
      subtitle="Three steps to a clearer financial plan."
    >
      <DataGate>
        <Card>
          <Icon name="shield" color={c.primary} size={30} />
          <Heading>1. Make it yours</Heading>
          <Message text="Choose your timezone, safety buffer and reminder privacy. Your buffer stays reserved in the forecast." />
          <Button
            title="Set preferences"
            secondary
            onPress={() => router.push("/settings")}
          />
        </Card>
        <Card>
          <Icon name="accounts" color={c.aqua} size={30} />
          <Heading>2. Bring your accounts together</Heading>
          <Message text="The current development connection supplies fictional accounts only. Review the data permissions before connecting." />
          <Button
            title={
              data?.accounts.length
                ? "Review connected accounts"
                : "Connect a development bank"
            }
            secondary
            onPress={() =>
              router.push(
                data?.accounts.length ? "/(tabs)/accounts" : "/connect",
              )
            }
          />
        </Card>
        <Card>
          <Icon name="calendar" color={c.income} size={30} />
          <Heading>3. Build your money calendar</Heading>
          <Message text="Confirm income and commitments before relying on a forecast. Pattern confidence describes observed history, not a guarantee." />
          <Button
            title="Review recurring patterns"
            secondary
            onPress={() => router.push("/(tabs)/insights")}
          />
        </Card>
        {issue && <Message text={issue} error />}
        <Button
          title="Finish setup and open Home"
          busy={busy}
          onPress={() => void finish()}
        />
        <Message text="You can add accounts and commitments later. No bank payment is initiated by this setup." />
      </DataGate>
    </Screen>
  );
}
