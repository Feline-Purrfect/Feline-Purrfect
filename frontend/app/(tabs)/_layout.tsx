import { AuthGuard } from '@/components/common/AuthGuard';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import {
  FontAwesome6,
  Entypo as HomeIcon,
  Ionicons as LogsIcon,
  FontAwesome6 as MyCatsIcon,
  Ionicons as SearchIcon,
} from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { TouchableOpacity } from 'react-native';

export default function TabLayout() {
  return (
    <AuthGuard>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary.DEFAULT,
          tabBarInactiveTintColor: Colors.ink.faint,
          tabBarStyle: { backgroundColor: Colors.surface, borderTopColor: Colors.line.DEFAULT, borderTopWidth: 1 },
          tabBarLabelStyle: { fontFamily: Fonts.bodySemibold, fontSize: 11 },
          sceneStyle: { backgroundColor: Colors.canvas },
          headerStyle: { backgroundColor: Colors.canvas },
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: Fonts.bodyBold, fontSize: 17, color: Colors.ink.DEFAULT },
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
            headerRight: () => (
              <TouchableOpacity
                onPress={() => router.push('/profile')}
                style={{
                  marginRight: 16,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FontAwesome6 name="user" size={16} color={Colors.primary.DEFAULT} />
              </TouchableOpacity>
            ),
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
          name="search"
          options={{
            title: 'Search',
            tabBarLabel: 'Search',
            tabBarIcon: ({ color, size }) => (
              <SearchIcon name="search-sharp" color={color} size={size} />
            ),
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