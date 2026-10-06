import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WorkspaceProvider, useWorkspace } from "../state/workspace";
function Navigation() {
  const { signedIn } = useWorkspace();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="commitment" options={{ presentation: "modal" }} />
        {[
          "account",
          "connect",
          "forecast",
          "notifications",
          "privacy",
          "security",
          "settings",
          "support",
          "transaction",
          "transactions",
          "subscriptions",
          "income",
        ].map((name) => (
          <Stack.Screen key={name} name={name} />
        ))}
      </Stack.Protected>
    </Stack>
  );
}
export default function Layout() {
  return (
    <SafeAreaProvider>
      <WorkspaceProvider>
        <Navigation />
      </WorkspaceProvider>
    </SafeAreaProvider>
  );
}
