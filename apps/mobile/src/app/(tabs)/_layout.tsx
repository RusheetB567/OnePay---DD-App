import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { useWorkspace } from "../../state/workspace";
import { usePalette } from "../../design-system/ui";
export default function TabsLayout() {
  const { signedIn, loading } = useWorkspace();
  const c = usePalette();
  if (!signedIn && !loading) return <Redirect href="/" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      {[
        ["index", "Home", "◫"],
        ["calendar", "Calendar", "▦"],
        ["payments", "Payments", "⇄"],
        ["insights", "Insights", "✧"],
        ["accounts", "Accounts", "▤"],
      ].map(([name, title, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color }) => (
              <Text style={{ color, fontSize: 22 }}>{icon}</Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
