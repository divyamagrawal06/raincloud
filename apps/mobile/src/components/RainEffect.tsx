import { useEffect, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

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

function RainDrop({
  config,
  screenHeight,
}: {
  config: DropConfig;
  screenHeight: number;
}) {
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const fadeDuration = config.duration * 0.12;
    const holdDuration = config.duration * 0.78;
    const fadeOutDuration = config.duration * 0.1;

    translateY.value = -120;
    opacity.value = 0;

    translateY.value = withDelay(
      config.delay,
      withRepeat(
        withTiming(screenHeight + 120, {
          duration: config.duration,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );

    opacity.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.opacity, { duration: fadeDuration, easing: Easing.out(Easing.quad) }),
          withTiming(config.opacity, { duration: holdDuration }),
          withTiming(0, { duration: fadeOutDuration }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { rotate: '-12deg' }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: config.x,
          top: 0,
          width: config.width,
          height: config.height,
          backgroundColor: 'rgba(173,198,255,0.9)',
          borderRadius: 999,
        },
        animatedStyle,
      ]}
    />
  );
}

export function RainEffect() {
  const { width, height } = useWindowDimensions();

  const drops = useMemo<DropConfig[]>(() =>
    Array.from({ length: DROP_COUNT }, (_, i) => ({
      x: seededRandom(i * 3) * width,
      duration: 700 + seededRandom(i * 7) * 600,
      delay: seededRandom(i * 11) * 2000,
      opacity: 0.25 + seededRandom(i * 13) * 0.3,
      height: 60 + seededRandom(i * 17) * 30,
      width: 1 + seededRandom(i * 19) * 1,
    })),
  [width]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        zIndex: 1,
      }}
      pointerEvents="none"
    >
      {drops.map((config, i) => (
        <RainDrop key={i} config={config} screenHeight={height} />
      ))}
    </Animated.View>
  );
}
