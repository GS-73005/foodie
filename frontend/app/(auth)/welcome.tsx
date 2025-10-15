import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Animated icon component for floating food icons
const FloatingIcon = ({ 
  name, 
  size, 
  color, 
  startX, 
  startY, 
  delay 
}: { 
  name: any; 
  size: number; 
  color: string; 
  startX: number; 
  startY: number; 
  delay: number;
}) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    // Floating animation
    translateY.value = withRepeat(
      withSequence(
        withTiming(-30, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Side-to-side sway
    translateX.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(-15, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Rotation animation
    rotate.value = withRepeat(
      withTiming(360, { duration: 20000, easing: Easing.linear }),
      -1,
      false
    );

    // Scale pulse
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: translateY.value },
        { translateX: translateX.value },
        { rotate: `${rotate.value}deg` },
        { scale: scale.value },
      ],
      opacity: interpolate(scale.value, [1, 1.1], [0.6, 0.9]),
    };
  });

  return (
    <Animated.View style={[{ position: 'absolute', left: startX, top: startY }, animatedStyle]}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
};

export default function WelcomeScreen() {
  const router = useRouter();

  // Animation values
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const titleTranslateX = useSharedValue(-100);
  const titleOpacity = useSharedValue(0);
  const subtitleTranslateX = useSharedValue(100);
  const subtitleOpacity = useSharedValue(0);
  const feature1Opacity = useSharedValue(0);
  const feature1TranslateY = useSharedValue(50);
  const feature2Opacity = useSharedValue(0);
  const feature2TranslateY = useSharedValue(50);
  const feature3Opacity = useSharedValue(0);
  const feature3TranslateY = useSharedValue(50);
  const button1TranslateY = useSharedValue(100);
  const button1Opacity = useSharedValue(0);
  const button2TranslateY = useSharedValue(100);
  const button2Opacity = useSharedValue(0);

  useEffect(() => {
    // Logo animation - scale up with bounce
    logoScale.value = withSpring(1, {
      damping: 8,
      stiffness: 100,
    });
    logoOpacity.value = withTiming(1, { duration: 800 });

    // Title slide in from left
    setTimeout(() => {
      titleTranslateX.value = withSpring(0, {
        damping: 12,
        stiffness: 100,
      });
      titleOpacity.value = withTiming(1, { duration: 600 });
    }, 300);

    // Subtitle slide in from right
    setTimeout(() => {
      subtitleTranslateX.value = withSpring(0, {
        damping: 12,
        stiffness: 100,
      });
      subtitleOpacity.value = withTiming(1, { duration: 600 });
    }, 500);

    // Features staggered fade in
    setTimeout(() => {
      feature1Opacity.value = withTiming(1, { duration: 500 });
      feature1TranslateY.value = withSpring(0, { damping: 10 });
    }, 800);

    setTimeout(() => {
      feature2Opacity.value = withTiming(1, { duration: 500 });
      feature2TranslateY.value = withSpring(0, { damping: 10 });
    }, 1000);

    setTimeout(() => {
      feature3Opacity.value = withTiming(1, { duration: 500 });
      feature3TranslateY.value = withSpring(0, { damping: 10 });
    }, 1200);

    // Buttons slide up with bounce
    setTimeout(() => {
      button1TranslateY.value = withSpring(0, {
        damping: 10,
        stiffness: 100,
      });
      button1Opacity.value = withTiming(1, { duration: 500 });
    }, 1400);

    setTimeout(() => {
      button2TranslateY.value = withSpring(0, {
        damping: 10,
        stiffness: 100,
      });
      button2Opacity.value = withTiming(1, { duration: 500 });
    }, 1600);
  }, []);

  // Animated styles
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: titleTranslateX.value }],
    opacity: titleOpacity.value,
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: subtitleTranslateX.value }],
    opacity: subtitleOpacity.value,
  }));

  const feature1Style = useAnimatedStyle(() => ({
    opacity: feature1Opacity.value,
    transform: [{ translateY: feature1TranslateY.value }],
  }));

  const feature2Style = useAnimatedStyle(() => ({
    opacity: feature2Opacity.value,
    transform: [{ translateY: feature2TranslateY.value }],
  }));

  const feature3Style = useAnimatedStyle(() => ({
    opacity: feature3Opacity.value,
    transform: [{ translateY: feature3TranslateY.value }],
  }));

  const button1Style = useAnimatedStyle(() => ({
    opacity: button1Opacity.value,
    transform: [{ translateY: button1TranslateY.value }],
  }));

  const button2Style = useAnimatedStyle(() => ({
    opacity: button2Opacity.value,
    transform: [{ translateY: button2TranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Floating food icons - background decoration */}
      <FloatingIcon name="pizza" size={40} color="rgba(255, 107, 107, 0.3)" startX={30} startY={100} delay={0} />
      <FloatingIcon name="fast-food" size={35} color="rgba(255, 193, 7, 0.3)" startX={width - 70} startY={150} delay={500} />
      <FloatingIcon name="cafe" size={38} color="rgba(156, 39, 176, 0.3)" startX={50} startY={height - 300} delay={1000} />
      <FloatingIcon name="ice-cream" size={36} color="rgba(33, 150, 243, 0.3)" startX={width - 60} startY={height - 250} delay={1500} />
      <FloatingIcon name="restaurant" size={42} color="rgba(76, 175, 80, 0.3)" startX={width / 2 - 20} startY={200} delay={2000} />
      <FloatingIcon name="wine" size={34} color="rgba(233, 30, 99, 0.3)" startX={width - 90} startY={height / 2} delay={2500} />
      <FloatingIcon name="fish" size={32} color="rgba(0, 188, 212, 0.3)" startX={60} startY={height / 2 - 50} delay={3000} />
      
      <View style={styles.content}>
        <Animated.View style={[styles.iconContainer, logoStyle]}>
          <Ionicons name="restaurant" size={80} color="#FF6B6B" />
        </Animated.View>
        
        <Animated.Text style={[styles.title, titleStyle]}>
          Foodies Circle
        </Animated.Text>
        
        <Animated.Text style={[styles.subtitle, subtitleStyle]}>
          Share your food experiences with the world
        </Animated.Text>
        
        <View style={styles.features}>
          <Animated.View style={[styles.feature, feature1Style]}>
            <Ionicons name="camera" size={32} color="#FF6B6B" />
            <Text style={styles.featureText}>Share Photos</Text>
          </Animated.View>
          
          <Animated.View style={[styles.feature, feature2Style]}>
            <Ionicons name="star" size={32} color="#FF6B6B" />
            <Text style={styles.featureText}>Rate & Review</Text>
          </Animated.View>
          
          <Animated.View style={[styles.feature, feature3Style]}>
            <Ionicons name="gift" size={32} color="#FF6B6B" />
            <Text style={styles.featureText}>Get Promos</Text>
          </Animated.View>
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        <Animated.View style={button1Style}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.primaryButtonText}>Join the Circle</Text>
          </TouchableOpacity>
        </Animated.View>
        
        <Animated.View style={button2Style}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.secondaryButtonText}>Log In</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 48,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 32,
  },
  feature: {
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    color: '#fff',
    fontSize: 12,
  },
  buttonContainer: {
    paddingHorizontal: 32,
    paddingBottom: 48,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
