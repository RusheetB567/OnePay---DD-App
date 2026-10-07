import { Redirect, Tabs } from "expo-router";
import { View } from "react-native";
import { useWorkspace } from "../../state/workspace";
import { Icon, usePalette } from "../../design-system/ui";
import type { IconName } from "../../design-system/icons";
import { feedback } from "../../design-system/motion";
const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: "index", title: "Home", icon: "home" },
  { name: "calendar", title: "Calendar", icon: "calendar" },
  { name: "payments", title: "Payments", icon: "payments" },
  { name: "insights", title: "Insights", icon: "insights" },
  { name: "accounts", title: "Accounts", icon: "accounts" },
];
export default function TabsLayout() {
  const { signedIn, loading } = useWorkspace(),
    c = usePalette();
  if (!signedIn && !loading) return <Redirect href="/" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: "fade",
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          height: 80,
          paddingBottom: 14,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      {tabs.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          listeners={{ tabPress: () => feedback() }}
          options={{
            title,
            tabBarIcon: ({ color, focused }) => (
              <View
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 5,
                  borderRadius: 14,
                  backgroundColor: focused ? c.tint : "transparent",
                }}
              >
                <Icon name={icon} color={String(color)} />
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
