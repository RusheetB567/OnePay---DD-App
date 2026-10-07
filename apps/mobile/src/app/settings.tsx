import { router } from "expo-router";
import { useState } from "react";
import type { Profile } from "../../../../shared/contracts";
import { decimalToCents } from "../../../../shared/finance";
import {
  Button,
  Choice,
  DataGate,
  Field,
  Label,
  Message,
  Screen,
} from "../design-system/ui";
import { useWorkspace } from "../state/workspace";
function Preferences({ profile }: { profile: Profile }) {
  const { mutate } = useWorkspace();
  const [hideAmounts, setPrivacyAmounts] = useState(
      profile.hideAmounts ? "On" : "Off",
    ),
    [calendarView, setCalendarView] = useState(profile.calendarView || "Month"),
    [reducedHome, setReducedHome] = useState(
      profile.reducedHome ? "On" : "Off",
    );
  const [name, setName] = useState(profile.name),
    [buffer, setBuffer] = useState(String(profile.buffer / 100)),
    [timeZone, setTimeZone] = useState(profile.timeZone),
    [theme, setTheme] = useState(profile.theme),
    [reminders, setReminders] = useState(profile.reminders ? "On" : "Off"),
    [privacy, setPrivacy] = useState(profile.notificationPrivacy),
    [busy, setBusy] = useState(false),
    [issue, setIssue] = useState("");
  const save = async () => {
    setBusy(true);
    setIssue("");
    try {
      await mutate("/profile", "PATCH", {
        ...profile,
        hideAmounts: hideAmounts === "On",
        calendarView,
        reducedHome: reducedHome === "On",
        name,
        buffer: decimalToCents(buffer),
        theme,
        reminders: reminders === "On",
        notificationPrivacy: privacy,
        timeZone,
        onboardingCompleted: profile.onboardingCompleted,
      });
      setIssue("Preferences saved.");
    } catch (e) {
      setIssue(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Field
        label="Display name"
        value={name}
        onChangeText={setName}
        maxLength={50}
      />
      <Field
        label="Safety buffer · AUD"
        value={buffer}
        onChangeText={setBuffer}
        keyboardType="decimal-pad"
      />
      <Label>Calendar timezone</Label>
      <Choice
        values={[
          "Australia/Adelaide",
          "Australia/Sydney",
          "Australia/Brisbane",
          "Australia/Perth",
          "Australia/Darwin",
          "Australia/Hobart",
          "Australia/Melbourne",
        ]}
        value={timeZone}
        onChange={setTimeZone}
      />
      <Label>Appearance</Label>
      <Choice
        values={["light", "dark", "system"] as const}
        value={theme}
        onChange={setTheme}
      />
      <Label>Hide financial amounts by default</Label>
      <Choice
        values={["On", "Off"]}
        value={hideAmounts}
        onChange={setPrivacyAmounts}
      />
      <Label>Calendar default view</Label>
      <Choice
        values={["Week", "Fortnight", "Month"] as const}
        value={calendarView}
        onChange={setCalendarView}
      />
      <Label>Reduced detail on Home</Label>
      <Choice
        values={["On", "Off"]}
        value={reducedHome}
        onChange={setReducedHome}
      />
      <Label>In-app reminders</Label>
      <Choice
        values={["On", "Off"]}
        value={reminders}
        onChange={setReminders}
      />
      <Label>Notification details</Label>
      <Choice
        values={["private", "detailed", "hidden"] as const}
        value={privacy}
        onChange={setPrivacy}
      />
      <Message text="Private reminders omit merchant and amount. Hidden reminders only prompt you to open your financial workspace. External push, email and SMS are not configured." />
      {issue && <Message text={issue} />}
      <Button
        title="Save preferences"
        onPress={() => void save()}
        busy={busy}
      />
    </>
  );
}
export default function Settings() {
  const { data } = useWorkspace();
  return (
    <Screen title="Your workspace, your way">
      <Button title="Back" secondary onPress={() => router.back()} />
      <DataGate>
        {data && <Preferences profile={data.profile} />}
        <Button
          title="Security & sessions"
          secondary
          onPress={() => router.push("/security")}
        />
        <Button
          title="Privacy & data"
          secondary
          onPress={() => router.push("/privacy")}
        />
        <Button
          title="Support & connected services"
          secondary
          onPress={() => router.push("/support")}
        />
      </DataGate>
    </Screen>
  );
}
