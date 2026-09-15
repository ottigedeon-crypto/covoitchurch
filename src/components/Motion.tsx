import { useEffect, useRef, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  type PressableProps,
  type ViewStyle,
} from "react-native";

const NATIVE = Platform.OS !== "web";

/** Bouton qui s'enfonce et rebondit au toucher. */
export function Bouncy({
  children,
  style,
  scaleTo = 0.95,
  ...rest
}: PressableProps & { children: ReactNode; style?: ViewStyle; scaleTo?: number }) {
  const scale = useRef(new Animated.Value(1)).current;

  const spring = (to: number) =>
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: NATIVE,
      speed: 40,
      bounciness: 10,
    }).start();

  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        spring(scaleTo);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        spring(1);
        rest.onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Apparition en fondu et glissement, avec décalage possible pour une liste. */
export function FadeIn({
  children,
  delay = 0,
  from = 14,
  style,
}: {
  children: ReactNode;
  delay?: number;
  from?: number;
  style?: ViewStyle;
}) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: 420,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE,
    });
    anim.start();

    // Filet de securite : si requestAnimationFrame ne tourne pas (onglet en arriere-plan,
    // vue masquee), l animation ne progresse jamais et le contenu resterait invisible.
    // Un simple minuteur, lui, continue de tourner : on force alors l etat final.
    const guard = setTimeout(() => t.setValue(1), delay + 900);

    return () => {
      clearTimeout(guard);
      anim.stop();
    };
  }, [t, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t,
          transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Halo qui bat lentement — utilisé quand une présence est active. */
export function Pulse({
  children,
  style,
  opacite = true,
}: {
  children: ReactNode;
  style?: ViewStyle;
  /** false : seule l'échelle respire, utile pour un logo. */
  opacite?: boolean;
}) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: NATIVE,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: 900,
          easing: Easing.in(Easing.ease),
          useNativeDriver: NATIVE,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: opacite ? t.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) : 1,
          transform: [
            {
              scale: t.interpolate({
                inputRange: [0, 1],
                outputRange: [1, opacite ? 1.14 : 1.045],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
