import { feedback } from "../design-system/motion";
import { router } from "expo-router";
import { useState } from "react";
import {
  Button,
  Card,
  Heading,
  Icon,
  usePalette,
  OnePayLoader,
  Choice,
  DataGate,
  Label,
  Message,
  Screen,
} from "../design-system/ui";
import { useWorkspace } from "../state/workspace";
export default function Connect() {
  const c = usePalette();
  const { data, mutate } = useWorkspace();
  const [connected, setConnected] = useState(false);
  const [institution, setInstitution] = useState("Up"),
    [consent, setConsent] = useState("Not yet"),
    [busy, setBusy] = useState(false),
    [issue, setIssue] = useState("");
  const connect = async () => {
    setBusy(true);
    setIssue("");
    try {
      await mutate("/connections", "POST", {
        institution,
        acceptedScopes: ["accounts", "balances", "transactions"],
      });
      feedback("success");
      setConnected(true);
    } catch (e) {
      setIssue(e instanceof Error ? e.message : "Unable to connect.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      title="Connect with clarity"
      subtitle="See exactly what you’re sharing."
    >
      <Button title="Back" secondary onPress={() => router.back()} />
      <DataGate>
        {connected ? (
          <Card>
            <Icon name="check" color={c.income} size={44} />
            <Heading>Your sample accounts are connected</Heading>
            <Message
              text={`${data?.accounts.length || 0} accounts available. ${data?.patterns.length || 0} recurring patterns ready for your review.`}
            />
            <Button
              title="Review discovered patterns"
              onPress={() => router.replace("/(tabs)/insights")}
            />
            <Button
              title="Open money calendar"
              secondary
              onPress={() => router.replace("/(tabs)/calendar")}
            />
            <Message text="Sample data only. This did not connect to a real bank." />
          </Card>
        ) : data?.capabilities.banking === "synthetic" ? (
          <>
            <Message text="SYNTHETIC DEVELOPMENT PROVIDER · No connection to an actual institution. Accounts, balances and history are fictional." />
            <Choice
              values={[
                "Up",
                "ING",
                "ANZ",
                "NAB",
                "Westpac",
                "Commonwealth Bank",
              ]}
              value={institution}
              onChange={setInstitution}
            />
            <Card>
              <Icon name="shield" color={c.primary} size={32} />
              <Heading>You stay in control</Heading>
              <Label>Read-only account details</Label>
              <Message text="OnePay never requests your bank password here. No payment permissions are created." />
            </Card>
            <Label>Data permissions</Label>
            <Message text="Account details, balances and transactions. Purpose: recurring-payment discovery and forecasts. Sample consent expires after 90 days; revoke any time from the account screen." />
            <Label>Do you agree to create this sample connection?</Label>
            <Choice
              values={["Not yet", "I agree"]}
              value={consent}
              onChange={setConsent}
            />
            {busy && (
              <OnePayLoader text="Creating sample accounts and finding financial patterns" />
            )}
            {issue && <Message text={issue} error />}
            <Button
              title="Connect synthetic bank"
              onPress={() => void connect()}
              busy={busy}
              disabled={consent !== "I agree"}
            />
          </>
        ) : (
          <Message text="Bank connection is unavailable until a reviewed CDR provider is configured." />
        )}
      </DataGate>
    </Screen>
  );
}
