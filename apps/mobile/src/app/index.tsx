import { Redirect } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import {
  Button,
  OnePayLoader,
  OnePayMark,
  usePalette,
  Card,
  Field,
  Heading,
  Label,
  Message,
  Screen,
} from "../design-system/ui";
import { useWorkspace } from "../state/workspace";
export default function Welcome() {
  const c = usePalette();
  const { signedIn, loading, login, error, data } = useWorkspace();
  const [register, setRegister] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [issue, setIssue] = useState("");
  if (signedIn)
    return (
      <Redirect
        href={
          data && !data.profile.onboardingCompleted ? "/onboarding" : "/(tabs)"
        }
      />
    );
  if (loading)
    return (
      <Screen title="Your money, in view">
        <OnePayLoader text="Checking your secure session" />
      </Screen>
    );
  const submit = async () => {
    setBusy(true);
    setIssue("");
    try {
      await login(email, password, register ? name : undefined);
      setPassword("");
    } catch (e) {
      setIssue(e instanceof Error ? e.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen
      title="A clearer view of what’s next."
      subtitle="Your financial life, organised around time."
    >
      <View
        style={{
          padding: 24,
          borderRadius: 28,
          backgroundColor: c.tint,
          marginBottom: 24,
        }}
      >
        <OnePayMark color={c.primary} size={64} />
        <View style={{ height: 20 }} />
        <Heading>Know what your money does next.</Heading>
        <Message text="Your accounts, commitments and next payday. One clear view." />
      </View>
      <Card>
        <Heading>{register ? "Create your workspace" : "Welcome back"}</Heading>
        <Message text="Development sign-in · fictional data only. Production identity, email verification, passkeys and recovery await provider setup." />
        {register && (
          <Field
            label="Your name"
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
        )}
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <Field
          label="Password · at least 12 characters"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={register ? "new-password" : "current-password"}
          maxLength={128}
        />
        {(issue || error) && <Message text={issue || error || ""} error />}
        <Button
          title={register ? "Create development account" : "Sign in"}
          onPress={() => void submit()}
          busy={busy}
          disabled={
            !email || password.length < 12 || (register && !name.trim())
          }
        />
        <Button
          title={
            register
              ? "Already have an account? Sign in"
              : "New here? Create an account"
          }
          secondary
          onPress={() => {
            setRegister(!register);
            setIssue("");
            setPassword("");
          }}
        />
        <Button
          title="Passkeys / recovery — provider setup required"
          onPress={() => {}}
          disabled
        />
      </Card>
      <Label muted>
        Financial data stays on the API. Access tokens stay in memory; native
        refresh tokens use platform secure storage. The browser preview keeps
        all tokens in memory.
      </Label>
      <View style={{ height: 20 }} />
    </Screen>
  );
}
