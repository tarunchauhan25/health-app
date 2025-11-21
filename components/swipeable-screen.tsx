import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { ParamListBase, useNavigation, useRoute } from '@react-navigation/native';
import { ReactNode, useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SwipeableScreenProps {
  children: ReactNode;
}

// Define the order of tabs
const TAB_ORDER = ['index', 'explore', 'phq9', 'status', 'sensors', 'history', 'profile'];

export function SwipeableScreen({ children }: SwipeableScreenProps) {
  const navigation = useNavigation<BottomTabNavigationProp<ParamListBase>>();
  const route = useRoute();
  const translateX = useSharedValue(0);
  const offsetX = useSharedValue(0);

  const currentIndex = TAB_ORDER.indexOf(route.name);
  const hasLeftPage = currentIndex > 0;
  const hasRightPage = currentIndex < TAB_ORDER.length - 1;

  // Reset position when route changes
  useEffect(() => {
    translateX.value = 0;
    offsetX.value = 0;
  }, [route.name]);

  const navigateToTab = (direction: 'left' | 'right') => {
    const currentIndex = TAB_ORDER.indexOf(route.name);
    
    if (direction === 'right' && currentIndex > 0) {
      // Swipe right (finger moves right) = go to previous/left tab
      navigation.navigate(TAB_ORDER[currentIndex - 1]);
    } else if (direction === 'left' && currentIndex < TAB_ORDER.length - 1) {
      // Swipe left (finger moves left) = go to next/right tab
      navigation.navigate(TAB_ORDER[currentIndex + 1]);
    }
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-20, 20])
    .onStart(() => {
      offsetX.value = translateX.value;
    })
    .onUpdate((event) => {
      const newTranslate = offsetX.value + event.translationX;
      
      // Apply boundaries with resistance
      if (newTranslate > 0 && !hasLeftPage) {
        translateX.value = newTranslate * 0.3;
      } else if (newTranslate < 0 && !hasRightPage) {
        translateX.value = newTranslate * 0.3;
      } else {
        translateX.value = newTranslate;
      }
    })
    .onEnd((event) => {
      const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
      const velocity = event.velocityX;
      
      // Swipe RIGHT (positive translation/velocity) = go to PREVIOUS tab
      // Swipe LEFT (negative translation/velocity) = go to NEXT tab
      const shouldNavigateRight = (translateX.value > SWIPE_THRESHOLD || velocity > 800) && hasLeftPage;
      const shouldNavigateLeft = (translateX.value < -SWIPE_THRESHOLD || velocity < -800) && hasRightPage;
      
      if (shouldNavigateRight) {
        // Complete the swipe to the right - go to previous tab
        translateX.value = withTiming(SCREEN_WIDTH, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        }, (finished) => {
          if (finished) {
            runOnJS(navigateToTab)('right');
          }
        });
      } else if (shouldNavigateLeft) {
        // Complete the swipe to the left - go to next tab
        translateX.value = withTiming(-SCREEN_WIDTH, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        }, (finished) => {
          if (finished) {
            runOnJS(navigateToTab)('left');
          }
        });
      } else {
        // Snap back
        translateX.value = withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
        offsetX.value = 0;
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.pageContainer, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  pageContainer: {
    flex: 1,
  },
});
