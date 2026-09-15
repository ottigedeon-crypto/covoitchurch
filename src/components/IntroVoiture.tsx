import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { ArretDeBus, Carrosserie, Paysage, Roue, Silhouette } from "@/components/SceneRoute";
import { C } from "@/lib/theme";

const NATIVE = Platform.OS !== "web";
const DUREE = 4200;

/** Le décor est dessiné dans un repère de 400 × 260 : tout en dérive. */
const REPERE = { l: 400, h: 260 };

/** Où chaque personne attend, en unités du repère, et à quoi elle ressemble. */
const PERSONNES = [
  { x: 96, echelle: 1, habit: "#3A4150", peau: "#C98B63", sac: true },
  { x: 188, echelle: 0.78, habit: "#5B2D8E", peau: "#8A5A3B" },
  { x: 286, echelle: 0.96, habit: "#2E5E8E", peau: "#E0B08A", sac: false },
];

export default function IntroVoiture({ onFini }: { onFini: () => void }) {
  const { width, height } = useWindowDimensions();
  const t = useRef(new Animated.Value(0)).current;
  const fini = useRef(false);

  // Le décor occupe toute la largeur ; sa hauteur suit le rapport d'origine.
  const echelle = width / REPERE.l;
  const hauteurScene = REPERE.h * echelle;
  const u = (v: number) => v * echelle;

  function terminer() {
    if (fini.current) return;
    fini.current = true;
    onFini();
  }

  useEffect(() => {
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: DUREE,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: NATIVE,
    });
    anim.start(({ finished }) => finished && terminer());

    // Si les images ne défilent pas (vue masquée, onglet en arrière-plan),
    // l'animation n'avance jamais : on ne bloque pas l'utilisateur pour autant.
    const secours = setTimeout(terminer, DUREE + 800);
    return () => {
      clearTimeout(secours);
      anim.stop();
    };
  }, [t]);

  // La voiture entre par la gauche et sort par la droite.
  const largeurVoiture = u(200);
  const voitureX = t.interpolate({
    inputRange: [0, 1],
    outputRange: [-largeurVoiture - u(20), width + u(40)],
  });

  // Léger tangage, pour que la voiture ne semble pas glisser sur un rail.
  const tangage = t.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -1.2, 0.8, -0.9, 0],
  });

  const rotationRoues = t.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "1800deg"],
  });

  // Le décor lointain défile un peu en sens inverse : c'est ce décalage qui
  // donne l'impression de profondeur.
  const parallaxe = t.interpolate({ inputRange: [0, 1], outputRange: [0, -u(26)] });

  const ligneDeSol = u(196);

  return (
    <View style={{ flex: 1, backgroundColor: C.canvas, justifyContent: "center" }}>
      <Pressable
        onPress={terminer}
        hitSlop={14}
        style={{ position: "absolute", top: 54, right: 22, zIndex: 20 }}
      >
        <Text style={{ color: C.inkSoft, fontSize: 14.5, fontWeight: "700" }}>Passer</Text>
      </Pressable>

      <View style={{ height: hauteurScene, width, overflow: "hidden" }}>
        {/* Décor */}
        <Animated.View
          style={{ position: "absolute", left: 0, top: 0, transform: [{ translateX: parallaxe }] }}
        >
          <Paysage width={width + u(30)} height={hauteurScene} />
        </Animated.View>

        {/* Arrêt de bus, planté sur le trottoir */}
        <View style={{ position: "absolute", left: u(46), top: ligneDeSol - u(62) }}>
          <ArretDeBus width={u(40)} height={u(70)} />
        </View>

        {/* Les personnes qui attendent */}
        {PERSONNES.map((p, i) => {
          // Elle monte à bord quand la voiture arrive à sa hauteur.
          const seuil = (p.x + 40) / REPERE.l;
          const opacite = t.interpolate({
            inputRange: [0, seuil - 0.05, seuil + 0.03, 1],
            outputRange: [1, 1, 0, 0],
            extrapolate: "clamp",
          });
          const monte = t.interpolate({
            inputRange: [0, seuil - 0.05, seuil + 0.03, 1],
            outputRange: [0, 0, -u(16), -u(16)],
            extrapolate: "clamp",
          });
          const retrecit = t.interpolate({
            inputRange: [0, seuil - 0.05, seuil + 0.03, 1],
            outputRange: [1, 1, 0.72, 0.72],
            extrapolate: "clamp",
          });
          const taille = u(92) * p.echelle;
          return (
            <Animated.View
              key={i}
              style={{
                position: "absolute",
                left: u(p.x),
                top: ligneDeSol - taille + u(4),
                opacity: opacite,
                transform: [{ translateY: monte }, { scale: retrecit }],
              }}
            >
              <Silhouette personne={p} width={taille * 0.37} height={taille} />
            </Animated.View>
          );
        })}

        {/* La voiture */}
        <Animated.View
          style={{
            position: "absolute",
            top: ligneDeSol - u(56),
            transform: [{ translateX: voitureX }, { translateY: tangage }],
          }}
        >
          <Carrosserie width={largeurVoiture} height={u(78)} />
          {/* Roues, posées sur les passages de roue */}
          {[u(38), u(130)].map((x, i) => (
            <Animated.View
              key={i}
              style={{
                position: "absolute",
                left: x,
                top: u(42),
                transform: [{ rotate: rotationRoues }],
              }}
            >
              <Roue taille={u(36)} />
            </Animated.View>
          ))}
        </Animated.View>
      </View>

      {/* Signature */}
      <View style={{ alignItems: "center", marginTop: Math.min(u(34), 40) }}>
        <Animated.Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: C.navy,
            letterSpacing: -0.5,
            opacity: t.interpolate({
              inputRange: [0, 0.5, 0.74],
              outputRange: [0, 0, 1],
              extrapolate: "clamp",
            }),
          }}
        >
          Covoit&apos;Church
        </Animated.Text>
        <Animated.Text
          style={{
            fontSize: 15.5,
            color: C.inkSoft,
            marginTop: 8,
            opacity: t.interpolate({
              inputRange: [0, 0.68, 0.9],
              outputRange: [0, 0, 1],
              extrapolate: "clamp",
            }),
          }}
        >
          Personne ne rentre seul.
        </Animated.Text>
      </View>
    </View>
  );
}
