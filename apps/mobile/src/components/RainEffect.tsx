import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';

const DROP_COUNT = 60;

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

type DropConfig = {
  x: number;
  duration: number;
  delay: number;
  opacity: number;
  height: number;
  width: number;
};

function RainDrop({ config, screenHeight }: { config: DropConfig; screenHeight: number }) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    translateY.setValue(-120);
    opacity.setValue(0);

    const fadeDuration = config.duration * 0.12;
    const holdDuration = config.duration * 0.78;
    const fadeOutDuration = config.duration * 0.1;

    const fallAnim = Animated.loop(
      Animated.timing(translateY, {
        toValue: screenHeight + 120,
        duration: config.duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const opacityAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: config.opacity,
          duration: fadeDuration,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: config.opacity,
          duration: holdDuration,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: fadeOutDuration,
          useNativeDriver: true,
        }),
      ]),
    );

    const timeout = setTimeout(() => {
      Animated.parallel([fallAnim, opacityAnim]).start();
    }, config.delay);

    return () => {
      clearTimeout(timeout);
      fallAnim.stop();
      opacityAnim.stop();
    };
  }, [config, screenHeight]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: config.x,
        top: 0,
        width: config.width,
        height: config.height,
        backgroundColor: 'rgba(173,198,255,0.9)',
        borderRadius: 999,
        transform: [{ translateY }, { rotate: '-12deg' }],
        opacity,
      }}
    />
  );
}

export function RainEffect() {
  const { width, height } = useWindowDimensions();

  const drops = useMemo<DropConfig[]>(
    () =>
      Array.from({ length: DROP_COUNT }, (_, i) => ({
        x: seededRandom(i * 3) * width,
        duration: 700 + seededRandom(i * 7) * 600,
        delay: seededRandom(i * 11) * 2000,
        opacity: 0.25 + seededRandom(i * 13) * 0.3,
        height: 60 + seededRandom(i * 17) * 30,
        width: 1 + seededRandom(i * 19) * 1,
      })),
    [width],
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {drops.map((config, i) => (
        <RainDrop key={i} config={config} screenHeight={height} />
      ))}
    </View>
  );
}
