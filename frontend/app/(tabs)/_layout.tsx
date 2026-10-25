import { AuthGuard } from '@/components/common/AuthGuard';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useReminderSetup, useReminderTapHandler } from '@/hooks/useNotifications';
import {
  Ionicons as AskIcon,
  Entypo as HomeIcon,
  Ionicons as LogsIcon,
  FontAwesome6 as MyCatsIcon,
} from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <AuthGuard allowGuest>
      <Reminders />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary.DEFAULT,
          tabBarInactiveTintColor: Colors.ink.faint,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.line.DEFAULT,
            borderTopWidth: 1,
          },
          tabBarLabelStyle: { fontFamily: Fonts.bodySemibold, fontSize: 11 },
          sceneStyle: { backgroundColor: Colors.canvas },
          headerStyle: { backgroundColor: Colors.canvas },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: Fonts.bodyBold,
            fontSize: 17,
            color: Colors.ink.DEFAULT,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, size }) => (
              <HomeIcon name="home" color={color} size={size} />
            ),
            headerShown: false, // the screen draws its own large title and Settings button
          }}
        />
        <Tabs.Screen
          name="logs"
          options={{
            title: 'Logs',
            tabBarLabel: 'Logs',
            tabBarIcon: ({ color, size }) => (
              <LogsIcon name="analytics-sharp" color={color} size={size} />
            ),
            headerShown: false, // the screen draws its own large title and week strip
          }}
        />
        <Tabs.Screen
          name="ask"
          options={{
            title: 'Ask',
            tabBarLabel: 'Ask',
            tabBarIcon: ({ color, size }) => (
              <AskIcon
                name="chatbubble-ellipses-sharp"
                color={color}
                size={size}
              />
            ),
            headerShown: false, // the screen draws its own large title and chat buttons
          }}
        />
        <Tabs.Screen
          name="my-cats"
          options={{
            title: 'Cats',
            tabBarLabel: 'Cats',
            headerShown: false, // the screen draws its own large "My cats" title
            tabBarIcon: ({ color, size }) => (
              <MyCatsIcon name="cat" size={size - 3} color={color} />
            ),
          }}
        />
      </Tabs>
    </AuthGuard>
  );
}

/** Push registration, the one-time offer (signed-in only, see useReminderSetup), and reminder taps. */
function Reminders() {
  useReminderSetup();
  useReminderTapHandler();
  return null;
}
