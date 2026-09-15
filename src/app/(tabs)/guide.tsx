import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { Bouncy, FadeIn } from "@/components/Motion";
import { C } from "@/lib/theme";

type Methode = {
  icon: keyof typeof Feather.glyphMap;
  titre: string;
  corps: string;
  route: string;
  action: string;
};

/**
 * Le guide décrit le produit tel qu'il est aujourd'hui — une place de marché de
 * trajets — et non plus l'outil interne à une église qu'il était au départ. Un
 * guide qui décrit l'ancienne version est pire que pas de guide du tout.
 */
const METHODES: Methode[] = [
  {
    icon: "navigation",
    titre: "Le trajet partagé",
    corps:
      "C'est le cœur de l'application. Quelqu'un qui a une voiture indique l'église où il se rend, le jour et l'heure de son départ, d'où il part et combien de places il a. Tu demandes une place, il accepte, et vous échangez vos numéros. Aucun argent n'entre en jeu : on s'entraide, c'est tout.",
    route: "/trajets",
    action: "Voir les trajets",
  },
  {
    icon: "map-pin",
    titre: "Le point de rassemblement",
    corps:
      "Pour les départs improvisés, sans trajet organisé à l'avance. Tu attends à un endroit connu — un arrêt de bus, une place — et tu signales que tu y es, ou que tu y seras dans cinq ou dix minutes. Les conducteurs qui passent te voient.",
    route: "/points",
    action: "Voir les points",
  },
  {
    icon: "map",
    titre: "La carte, sur le moment",
    corps:
      "Tu es quelque part, maintenant, et tu cherches quelqu'un tout de suite. Choisis Passager ou Conducteur, appuie sur « Je suis là » en fixant une durée. Tu apparais sur la carte des autres pendant ce temps, puis tu disparais tout seul.",
    route: "/carte",
    action: "Ouvrir la carte",
  },
  {
    icon: "corner-down-left",
    titre: "Le retour",
    corps:
      "À la sortie du culte, tout le monde est au même endroit : la position ne dit plus rien. Ce qui compte alors, c'est qui habite près de chez toi. L'écran de retour trie les personnes par distance entre les domiciles.",
    route: "/retour",
    action: "Organiser mon retour",
  },
];

export default function Guide() {
  const router = useRouter();

  return (
    <ScrollView
      style={{ backgroundColor: C.canvas }}
      contentContainerStyle={{ padding: 22, paddingBottom: 48 }}
    >
      <Text style={{ fontSize: 25, fontWeight: "800", color: C.navy, lineHeight: 31 }}>
        Quatre façons de ne pas venir seul
      </Text>
      <Text style={{ fontSize: 15.5, color: C.inkSoft, marginTop: 10, lineHeight: 23 }}>
        Covoit&apos;Church sert à une seule chose : que personne ne renonce à venir faute de
        voiture. Selon le moment, l&apos;un de ces quatre chemins convient mieux.
      </Text>

      {METHODES.map((m, i) => (
        <FadeIn key={m.titre} delay={110 + i * 110}>
          <View
            style={{
              marginTop: 20,
              borderWidth: 1,
              borderColor: C.line,
              borderRadius: 16,
              padding: 19,
              backgroundColor: C.white,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: i === 0 ? C.brand : C.brandSoft,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Feather name={m.icon} size={17} color={i === 0 ? C.white : C.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 11.5, fontWeight: "800", color: C.brand, letterSpacing: 0.8 }}
                >
                  {i === 0 ? "LE PLUS SIMPLE" : "MÉTHODE " + (i + 1)}
                </Text>
                <Text style={{ fontSize: 18, fontWeight: "700", color: C.navy, marginTop: 1 }}>
                  {m.titre}
                </Text>
              </View>
            </View>

            <Text style={{ fontSize: 15, color: C.inkSoft, marginTop: 12, lineHeight: 23 }}>
              {m.corps}
            </Text>

            <Bouncy
              onPress={() => router.navigate(m.route as never)}
              style={{
                marginTop: 14,
                flexDirection: "row",
                alignItems: "center",
                gap: 7,
                alignSelf: "flex-start",
              }}
            >
              <Text style={{ color: C.brand, fontWeight: "800", fontSize: 14.5 }}>{m.action}</Text>
              <Feather name="arrow-right" size={15} color={C.brand} />
            </Bouncy>
          </View>
        </FadeIn>
      ))}

      <FadeIn delay={560}>
        <View style={{ marginTop: 26, backgroundColor: C.brandSoft, borderRadius: 16, padding: 19 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
            <Feather name="shield" size={16} color={C.brand} />
            <Text style={{ fontSize: 15.5, fontWeight: "800", color: C.navy }}>
              Ce que les autres voient de toi
            </Text>
          </View>
          <Text style={{ fontSize: 14.5, color: C.inkSoft, marginTop: 9, lineHeight: 22 }}>
            Ton nom, rien de plus. Ton numéro de téléphone n&apos;apparaît qu&apos;une fois une place
            acceptée, et seulement à la personne avec qui tu fais le trajet. Sur la carte, tu
            n&apos;es visible que pendant la durée que tu choisis, et ta position disparaît ensuite.
            Aucun suivi permanent, jamais.
          </Text>
        </View>
      </FadeIn>
    </ScrollView>
  );
}
