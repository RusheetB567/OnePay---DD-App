import { router } from "expo-router";
import { useState } from "react";
import {
  Button,
  Choice,
  DataGate,
  Label,
  Message,
  Screen,
} from "../design-system/ui";
import { useWorkspace } from "../state/workspace";
export default function Connect() {
  const { data, mutate } = useWorkspace();
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
      router.replace("/(tabs)/accounts");
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
        {data?.capabilities.banking === "synthetic" ? (
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
            <Label>Data permissions</Label>
            <Message text="Account details, balances and transactions. Purpose: recurring-payment discovery and forecasts. Sample consent expires after 90 days; revoke any time from the account screen." />
            <Label>Do you agree to create this sample connection?</Label>
            <Choice
              values={["Not yet", "I agree"]}
              value={consent}
              onChange={setConsent}
            />
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
