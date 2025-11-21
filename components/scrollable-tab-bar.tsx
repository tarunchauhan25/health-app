import { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ScrollableTabBar({ state, descriptors, navigation }: MaterialTopTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scrollViewRef = useRef<ScrollView>(null);
  const tabRefs = useRef<{ [key: number]: View | null }>({});

  // Scroll to active tab when it changes
  useEffect(() => {
    const activeTabRef = tabRefs.current[state.index];
    if (activeTabRef && scrollViewRef.current) {
      activeTabRef.measureLayout(
        scrollViewRef.current as any,
        (x) => {
          scrollViewRef.current?.scrollTo({
            x: x - 50, // Offset to center the tab
            animated: true,
          });
        },
        () => {}
      );
    }
  }, [state.index]);

  return (
    <View 
      style={[
        styles.container,
        { 
          paddingBottom: insets.bottom,
          height: 90 + insets.bottom,
          backgroundColor: isDark ? '#000000' : '#FFFFFF',
          borderTopColor: isDark ? '#38383A' : '#E5E5EA',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }
      ]}
    >
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          const labelText = typeof label === 'string' ? label : route.name;

          return (
            <Pressable
              key={route.key}
              ref={(ref) => { tabRefs.current[index] = ref as any; }}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tab}
            >
              {options.tabBarIcon && 
                options.tabBarIcon({
                  focused: isFocused,
                  color: isFocused ? options.tabBarActiveTintColor || '#007AFF' : options.tabBarInactiveTintColor || '#8E8E93',
                } as any)
              }
              <Text
                style={[
                  styles.label,
                  {
                    color: isFocused ? options.tabBarActiveTintColor || '#007AFF' : options.tabBarInactiveTintColor || '#8E8E93',
                  },
                ]}
              >
                {labelText}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 10,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
});
