import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Feather from "@expo/vector-icons/Feather";
import { C } from "@/lib/theme";

/**
 * Politique de confidentialité, lisible hors ligne.
 *
 * Les stores exigent aussi une URL publique : le même texte est dans
 * `docs/confidentialite.html`, à héberger sur covoitchurch.com.
 */

const MAJ = "4 septembre 2026";
const CONTACT = "contact@covoitchurch.com";

type Section = { titre: string; paragraphes: string[]; liste?: string[] };

const SECTIONS: Section[] = [
  {
    titre: "Ce que nous collectons",
    paragraphes: [
      "Uniquement ce qui sert à te mettre en relation avec quelqu'un pour aller à l'église. Rien d'autre.",
    ],
    liste: [
      "Ton nom et ton prénom, pour que les autres membres te reconnaissent",
      "Ton adresse email, qui sert d'identifiant de connexion",
      "Ton numéro de téléphone, pour être joignable le jour du trajet",
      "Ton adresse de domicile, pour proposer les trajets qui passent près de chez toi",
      "Ta position, uniquement quand tu appuies sur « Je suis là » et pendant la durée que tu choisis",
      "L'église à laquelle tu es rattaché",
    ],
  },
  {
    titre: "Qui voit quoi",
    paragraphes: [
      "Les autres membres voient ton nom, et rien de plus par défaut.",
      "Ton numéro de téléphone n'apparaît qu'une fois une place acceptée, et seulement à la personne avec qui tu fais ce trajet.",
      "Ta position sur la carte n'est visible que pendant la durée que tu as fixée, et seulement par les membres de ton église. Elle disparaît ensuite.",
      "Aux points de rassemblement, seul le nombre de personnes qui attendent est partagé — jamais leur identité.",
      "Ton adresse de domicile n'est jamais affichée : elle sert uniquement à calculer des distances.",
    ],
  },
  {
    titre: "Ce que nous ne faisons pas",
    paragraphes: [
      "Aucune donnée n'est vendue, louée ni transmise à des fins publicitaires. Il n'y a ni traceur publicitaire, ni revente de position, ni profilage.",
      "Il n'existe aucun suivi permanent : hors des périodes que tu déclenches toi-même, l'application ne connaît pas ta position.",
    ],
  },
  {
    titre: "Où sont les données",
    paragraphes: [
      "Elles sont hébergées par Supabase, sur des serveurs situés dans l'Union européenne. Les positions déclarées sont effacées automatiquement à l'expiration du délai que tu as choisi.",
      "Les adresses saisies sont converties en coordonnées par le service OpenStreetMap Nominatim ; seule l'adresse est transmise, jamais ton identité.",
    ],
  },
  {
    titre: "Tes droits",
    paragraphes: [
      "Tu peux consulter et modifier tes informations à tout moment depuis l'écran Profil.",
      "Tu peux supprimer ton compte depuis l'application, sans passer par nous : profil, trajets, demandes, messages, historique et position sont effacés définitivement. Les points de rassemblement et événements créés pour ton église sont conservés, mais ne portent plus ton nom.",
      "Conformément au RGPD, tu disposes également d'un droit d'accès, de rectification, d'opposition et de portabilité.",
    ],
  },
  {
    titre: "Notifications",
    paragraphes: [
      "Si tu les autorises, l'application enregistre un identifiant technique de ton appareil pour t'envoyer des alertes — un trajet proposé vers ton église, une place acceptée. Cet identifiant ne permet pas de te localiser. Tu peux les couper depuis les réglages de ton téléphone, et l'identifiant est effacé avec ton compte.",
    ],
  },
  {
    titre: "Les mineurs",
    paragraphes: [
      "L'application n'est pas destinée aux enfants de moins de 15 ans sans l'accord de leurs parents. Un mineur ne devrait pas monter dans la voiture d'un inconnu : l'application ne remplace pas la vigilance des familles et des responsables d'église.",
    ],
  },
];

export default function Confidentialite() {
  const router = useRouter();

  return (
    <ScrollView
      style={{ backgroundColor: C.canvas }}
      contentContainerStyle={{ padding: 24, paddingTop: 56, paddingBottom: 48 }}
    >
      <Pressable onPress={() => router.back()} hitSlop={12} style={{ marginBottom: 18 }}>
        <Feather name="arrow-left" size={22} color={C.navy} />
      </Pressable>

      <Text style={{ fontSize: 27, fontWeight: "800", color: C.navy, lineHeight: 33 }}>
        Confidentialité
      </Text>
      <Text style={{ fontSize: 14, color: C.inkFaint, marginTop: 6 }}>
        Dernière mise à jour : {MAJ}
      </Text>

      <View
        style={{ backgroundColor: C.brandSoft, borderRadius: 14, padding: 16, marginTop: 18 }}
      >
        <Text style={{ fontSize: 15, color: C.navy, lineHeight: 23 }}>
          Covoit&apos;Church existe pour que personne ne renonce à venir faute de voiture. Les seules
          informations demandées sont celles qui servent à cela.
        </Text>
      </View>

      {SECTIONS.map((s) => (
        <View key={s.titre} style={{ marginTop: 26 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: C.navy }}>{s.titre}</Text>
          {s.paragraphes.map((p) => (
            <Text key={p} style={{ fontSize: 15, color: C.inkSoft, marginTop: 9, lineHeight: 23 }}>
              {p}
            </Text>
          ))}
          {s.liste?.map((item) => (
            <View
              key={item}
              style={{ flexDirection: "row", gap: 9, marginTop: 8, alignItems: "flex-start" }}
            >
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: C.brand,
                  marginTop: 9,
                }}
              />
              <Text style={{ fontSize: 15, color: C.inkSoft, flex: 1, lineHeight: 23 }}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      ))}

      <View style={{ marginTop: 30 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: C.navy }}>Nous écrire</Text>
        <Text style={{ fontSize: 15, color: C.inkSoft, marginTop: 9, lineHeight: 23 }}>
          Pour toute question sur tes données, ou pour exercer tes droits :
        </Text>
        <Pressable
          onPress={() => Linking.openURL("mailto:" + CONTACT)}
          style={{ marginTop: 10, flexDirection: "row", alignItems: "center", gap: 8 }}
        >
          <Feather name="mail" size={16} color={C.brand} />
          <Text style={{ color: C.brand, fontWeight: "700", fontSize: 15 }}>{CONTACT}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
