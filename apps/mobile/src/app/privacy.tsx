import { router } from "expo-router";
import { useState } from "react";
import { Platform, Share } from "react-native";
import { request } from "../api/client";
import {
  Button,
  Card,
  DataGate,
  Heading,
  Label,
  Message,
  Screen,
} from "../design-system/ui";
export default function Privacy() {
  const [busy, setBusy] = useState(false),
    [issue, setIssue] = useState("");
  const exportData = async () => {
    setBusy(true);
    setIssue("");
    try {
      const data = await request<unknown>("/export", "POST", {});
      const text = JSON.stringify(data, null, 2);
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(
          new Blob([text], { type: "application/json" }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = "onepay-workspace.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else
        await Share.share({
          message: text,
          title: "OnePay development data export",
        });
      setIssue("Export prepared. Store it privately.");
    } catch (e) {
      setIssue(e instanceof Error ? e.message : "Unable to export.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen title="Privacy & your data">
      <Button title="Back" secondary onPress={() => router.back()} />
      <DataGate>
        <Card>
          <Heading>What this development build stores</Heading>
          <Label>
            Profile, synthetic accounts, sample transactions, tracked
            commitments, consent records and security activity.
          </Label>
          <Message text="Purpose: visibility, planning and development verification. No analytics or advertising SDK is installed. Browser preview financial state is memory-only. Native refresh credentials use platform secure storage; financial records stay on the API." />
          <Message text="The default API store is volatile memory: restarting it erases accounts and sessions. PostgreSQL persistence is available when configured. Neither mode is approved for real consumer data yet." />
        </Card>
        <Card>
          <Heading>Connected data permissions</Heading>
          <Message text="Manage each institution’s scopes, expiry and revocation from Accounts. Revoked and expired connections do not contribute to forecasts." />
          <Button
            title="Review connections & consent"
            secondary
            onPress={() => router.push("/(tabs)/accounts")}
          />
        </Card>
        {issue && <Message text={issue} />}
        <Button
          title="Export my development workspace"
          onPress={() => void exportData()}
          busy={busy}
        />
        <Message text="Export requires a login within the last five minutes. Sign out and sign in again if stronger verification is requested." />
        <Button
          title="Account deletion — retention workflow pending"
          disabled
          onPress={() => {}}
        />
        <Message text="A verified deletion and retention policy is required before consumer release. In development memory mode, restarting the API discards all sample workspaces." />
      </DataGate>
    </Screen>
  );
}
