import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { WorkspaceProvider } from "../state/workspace";
export default function Layout() {
  return (
    <SafeAreaProvider>
      <WorkspaceProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="commitment" options={{ presentation: "modal" }} />
        </Stack>
      </WorkspaceProvider>
    </SafeAreaProvider>
  );
}
