import { Feather, Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ProductIcon = require('../../assets/gallonicon.png');

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

// Define which routes should be visible in the tab bar
const VISIBLE_TAB_ROUTES = ['index', 'products/index', 'orders', 'profile'];
// Routes where the tab bar should be hidden
const HIDDEN_TAB_BAR_ROUTES = ['address/search', 'address/add', 'checkout/index', 'order-details/[id]'];
const INDICATOR_WIDTH = 45; // Extended width
const SCREEN_WIDTH = Dimensions.get('window').width;

export const CustomTabBar: React.FC<CustomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  
  // Get current route name
  const currentRouteName = state.routes[state.index]?.name;
  
  // Filter only the 4 main tabs
  const visibleRoutes = state.routes.filter((route: any) => 
    VISIBLE_TAB_ROUTES.includes(route.name)
  );

  const numTabs = visibleRoutes.length;
  const tabWidth = SCREEN_WIDTH / numTabs;

  const activeIndex = visibleRoutes.findIndex(
    (route: any) => route.key === state.routes[state.index].key
  );

  useEffect(() => {
    // Only animate if tab bar is visible
    if (!HIDDEN_TAB_BAR_ROUTES.includes(currentRouteName)) {
      Animated.spring(indicatorAnim, {
        toValue: activeIndex,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [activeIndex, currentRouteName]);
  
  // Hide tab bar on certain routes (after all hooks are called)
  if (HIDDEN_TAB_BAR_ROUTES.includes(currentRouteName)) {
    return null;
  }

  const getTabLabel = (routeName: string) => {
    switch (routeName) {
      case 'index':
        return 'Home';
      case 'products/index':
        return 'Products';
      case 'orders':
        return 'Orders';
      case 'profile':
        return 'Profile';
      default:
        return '';
    }
  };

  const getIcon = (routeName: string, isFocused: boolean) => {
    const color = isFocused ? '#FFFFFF' : '#94A3B8';
    
    switch (routeName) {
      case 'index':
        return <Feather name="home" size={22} color={color} />;
      case 'products/index':
        return (
          <Image 
            source={ProductIcon} 
            style={{ width: 26, height: 26, tintColor: color }} 
            resizeMode="contain"
          />
        );
      case 'orders':
        return <Feather name="box" size={22} color={color} />;
      case 'profile':
        return <Ionicons name="person-circle-outline" size={24} color={color} />;
      default:
        return null;
    }
  };

  // Calculate indicator position to be centered above each icon
  const indicatorTranslateX = indicatorAnim.interpolate({
    inputRange: visibleRoutes.map((_: any, i: number) => i),
    outputRange: visibleRoutes.map((_: any, i: number) => {
      // Center of each tab minus half the indicator width
      return (i * tabWidth) + (tabWidth / 2) - (INDICATOR_WIDTH / 2);
    }),
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Animated top indicator */}
      <Animated.View 
        style={[
          styles.indicator,
          {
            width: INDICATOR_WIDTH,
            transform: [{ translateX: indicatorTranslateX }],
          }
        ]} 
      />
      
      <View style={styles.tabsContainer}>
        {visibleRoutes.map((route: any, index: number) => {
          const isFocused = activeIndex === index;

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

          const color = isFocused ? '#FFFFFF' : '#94A3B8';
          
          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tab}
              activeOpacity={0.7}
            >
              <Animated.View
                style={[
                  styles.iconContainer,
                  isFocused && styles.iconContainerFocused,
                ]}
              >
                {getIcon(route.name, isFocused)}
                <Text style={[styles.tabLabel, { color }]}>
                  {getTabLabel(route.name)}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    paddingTop: 10,
    paddingBottom: 10,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerFocused: {
    transform: [{ scale: 1.05 }],
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
});

