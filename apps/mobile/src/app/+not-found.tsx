import { router } from "expo-router";
import { Button, EmptyState, Screen } from "../design-system/ui";
import { useWorkspace } from "../state/workspace";
export default function MissingScreen() {
  const { signedIn } = useWorkspace();
  return (
    <Screen title="Let us get you back on track">
      <EmptyState
        title="This page has moved"
        description="Your workspace is still available. Return to your money view to continue."
      />
      <Button
        title={signedIn ? "Open Home" : "Open sign-in"}
        onPress={() => router.replace(signedIn ? "/(tabs)" : "/")}
      />
    </Screen>
  );
}
