import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Amount,
  Button,
  Card,
  DataGate,
  Label,
  Message,
  Screen,
} from "../design-system/ui";
import { useWorkspace } from "../state/workspace";
export default function AccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, mutate } = useWorkspace();
  const a = data?.accounts.find((a) => a.id === id),
    consent = data?.consents.find((c) => c.id === a?.connectionId);
  const [issue, setIssue] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false);
  const command = async (revoke = false) => {
    setBusy(true);
    setIssue("");
    try {
      await mutate(
        revoke
          ? `/consents/${consent!.id}`
          : `/connections/${consent!.id}/sync`,
        revoke ? "DELETE" : "POST",
        revoke ? undefined : {},
      );
    } catch (e) {
      setIssue(e instanceof Error ? e.message : "Unable to update account.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen title={a?.name || "Account details"}>
      <Button title="Back" secondary onPress={() => router.back()} />
      <DataGate>
        {a && consent ? (
          <>
            <Card>
              <Label>
                {a.institution} · •••• {a.mask} · {a.role}
              </Label>
              <Amount cents={a.balance} large />
              <Message
                text={`Last synchronised ${new Date(a.lastSynced).toLocaleString()}`}
              />
            </Card>
            <Card>
              <Label>Consent · {consent.status}</Label>
              <Message
                text={`Provider: ${consent.provider}\nShared: ${consent.scopes.join(", ")}\nGranted: ${new Date(consent.grantedAt).toLocaleDateString()}\nExpires: ${new Date(consent.expiresAt).toLocaleDateString()}`}
              />
              <Message text="Revoking consent excludes these accounts from forecasts and prevents further sync. Existing sample records remain retained for this development workspace." />
            </Card>
            {issue && <Message text={issue} error />}
            <Button
              title="Sync sample transactions"
              onPress={() => void command()}
              busy={busy}
              disabled={consent.status !== "active"}
            />
            <Button
              title={confirm ? "Confirm revoke consent" : "Revoke consent"}
              secondary
              onPress={() => (confirm ? void command(true) : setConfirm(true))}
              disabled={busy || consent.status !== "active"}
            />
            <Button
              title="View account transactions"
              secondary
              onPress={() =>
                router.push({
                  pathname: "/transactions",
                  params: { account: id },
                })
              }
            />
          </>
        ) : (
          <Message text="Account unavailable." />
        )}
      </DataGate>
    </Screen>
  );
}
