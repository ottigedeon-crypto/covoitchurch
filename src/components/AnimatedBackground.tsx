import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C } from "@/lib/theme";

const NATIVE = Platform.OS !== "web";

type Blob = {
  colors: readonly [string, string];
  size: number;
  x: number;
  y: number;
  drift: [number, number];
  duration: number;
  opacity: number;
};

/**
 * Fond vivant : quelques halos de couleur qui dérivent lentement en boucle.
 * Le mouvement est volontairement long (12 à 20 s) — on veut une respiration,
 * pas un écran qui s'agite.
 */
const BLOBS: Blob[] = [
  {
    colors: ["#3A6FB5", "#032451"],
    size: 320,
    x: -70,
    y: -60,
    drift: [40, 60],
    duration: 14000,
    opacity: 0.28,
  },
  {
    colors: ["#9B74D6", "#5B2D8E"],
    size: 260,
    x: 0.62,
    y: 0.12,
    drift: [-50, 45],
    duration: 17000,
    opacity: 0.2,
  },
  {
    colors: ["#1B4A8F", "#022350"],
    size: 220,
    x: 0.1,
    y: 0.66,
    drift: [55, -40],
    duration: 20000,
    opacity: 0.1,
  },
  {
    colors: ["#6E9AD4", "#1B4A8F"],
    size: 300,
    x: 0.5,
    y: 0.78,
    drift: [-45, -55],
    duration: 16000,
    opacity: 0.22,
  },
];

function DriftingBlob({ blob, width, height }: { blob: Blob; width: number; height: number }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: blob.duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: blob.duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: NATIVE,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, blob.duration]);

  const left = blob.x <= 1 && blob.x >= 0 ? blob.x * width : blob.x;
  const top = blob.y <= 1 && blob.y >= 0 ? blob.y * height : blob.y;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left,
        top,
        width: blob.size,
        height: blob.size,
        borderRadius: blob.size / 2,
        opacity: blob.opacity,
        transform: [
          { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, blob.drift[0]] }) },
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, blob.drift[1]] }) },
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) },
        ],
      }}
    >
      <LinearGradient
        colors={blob.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, borderRadius: blob.size / 2 }}
      />
    </Animated.View>
  );
}

export default function AnimatedBackground({
  children,
  intensity = 1,
}: {
  children: ReactNode;
  intensity?: number;
}) {
  const { width, height } = useWindowDimensions();

  return (
    <View style={{ flex: 1, backgroundColor: C.canvas }}>
      <View style={[StyleSheet.absoluteFill, { opacity: intensity, overflow: "hidden" }]}>
        {BLOBS.map((b, i) => (
          <DriftingBlob key={i} blob={b} width={width} height={height} />
        ))}
      </View>
      {children}
    </View>
  );
}
