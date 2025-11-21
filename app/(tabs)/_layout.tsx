import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { withLayoutContext } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { ScrollableTabBar } from '@/components/scrollable-tab-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { Navigator } = createMaterialTopTabNavigator();
const Tabs = withLayoutContext(Navigator);

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      tabBar={(props) => <ScrollableTabBar {...props} />}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarButton: HapticTab,
        lazy: false,
        swipeEnabled: true,
        animationEnabled: true,
        tabBarPosition: 'bottom',
      } as any}
      initialLayout={{ width: 0, height: 0 }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }: any) => <IconSymbol size={36} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }: any) => <IconSymbol size={36} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="phq9"
        options={{
          title: 'PHQ-9',
          tabBarIcon: ({ color }: any) => <IconSymbol size={36} name="list.clipboard.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="status"
        options={{
          title: 'Status',
          tabBarIcon: ({ color }: any) => <IconSymbol size={36} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="sensors"
        options={{
          title: 'Sensors',
          tabBarIcon: ({ color }: any) => <IconSymbol size={36} name="waveform.circle.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color }: any) => <IconSymbol size={36} name="book.closed.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }: any) => <IconSymbol size={36} name="person.crop.circle.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
