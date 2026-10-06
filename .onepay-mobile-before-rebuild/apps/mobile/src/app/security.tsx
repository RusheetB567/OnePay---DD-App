import { router } from "expo-router";
import { useState } from "react";
import type { AuditEvent, SessionInfo } from "../../../../shared/contracts";
import { request } from "../api/client";
import { useRemote } from "../api/use-remote";
import {
  Button,
  Card,
  DataGate,
  Heading,
  Label,
  Message,
  Screen,
} from "../design-system/ui";
import { useWorkspace } from "../state/workspace";
export default function Security() {
  const { data, logout } = useWorkspace();
  const [issue, setIssue] = useState(""),
    [busy, setBusy] = useState(false);
  const sessionsRemote = useRemote<SessionInfo[]>(
    data ? "/sessions" : null,
    data?.updatedAt,
  );
  const auditRemote = useRemote<AuditEvent[]>(
    data ? "/audit" : null,
    data?.updatedAt,
  );
  const sessions = sessionsRemote.value || [],
    audit = auditRemote.value || [];
  const load = () => {
    setIssue("");
    sessionsRemote.retry();
    auditRemote.retry();
  };
  const revoke = async (id: string, current: boolean) => {
    setBusy(true);
    try {
      if (current) {
        await logout();
        router.replace("/");
      } else {
        await request(`/sessions/${id}`, "DELETE");
        await load();
      }
    } catch (e) {
      setIssue(e instanceof Error ? e.message : "Unable to revoke.");
    } finally {
      setBusy(false);
    }
  };
  const signOut = async (all: boolean) => {
    setBusy(true);
    try {
      await logout(all);
      router.replace("/");
    } catch {
      setIssue(
        "Local access cleared; server revocation could not be confirmed. Sign in and retry sign out everywhere.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      title="Your security centre"
      subtitle="See and control access to your workspace."
    >
      <Button title="Back" secondary onPress={() => router.back()} />
      <DataGate>
        <Card>
          <Heading>Sign-in protection</Heading>
          <Message text="Development passwords use Argon2id. Access tokens expire after five minutes. Refresh tokens rotate and reuse revokes the affected session. Sessions have a 30-minute idle limit and 24-hour absolute lifetime." />
          <Button
            title="Passkeys, MFA & recovery — provider setup pending"
            disabled
            onPress={() => {}}
          />
          <Message text="Biometric unlock and device attestation require a reviewed native identity integration and physical-device verification." />
        </Card>
        {issue && <Message text={issue} error />}
        <Heading>Active sessions</Heading>
        {sessions.map((s) => (
          <Card key={s.id}>
            <Label>
              {s.device}
              {s.current ? " · current session" : ""}
            </Label>
            <Message
              text={`Created ${new Date(s.createdAt).toLocaleString()}\nLast active ${new Date(s.lastSeen).toLocaleString()}`}
            />
            <Button
              title={s.current ? "Sign out this session" : "Revoke session"}
              secondary
              onPress={() => void revoke(s.id, s.current)}
              disabled={busy}
            />
          </Card>
        ))}
        <Button
          title="Refresh session list"
          secondary
          onPress={() => void load()}
        />
        <Button
          title="Sign out"
          onPress={() => void signOut(false)}
          disabled={busy}
        />
        <Button
          title="Sign out everywhere"
          secondary
          onPress={() => void signOut(true)}
          disabled={busy}
        />
        <Heading>Recent security activity</Heading>
        {audit.map((a) => (
          <Card key={a.id}>
            <Label>{a.action.replaceAll("_", " ").toLowerCase()}</Label>
            <Message text={new Date(a.at).toLocaleString()} />
          </Card>
        ))}
      </DataGate>
    </Screen>
  );
}
