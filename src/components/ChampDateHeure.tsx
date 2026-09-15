import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { C } from "@/lib/theme";

/**
 * Choix d'une date et d'une heure, sans saisie clavier.
 *
 * Un sélecteur natif à molettes serait plus générique, mais l'usage ici est
 * étroit : on part à l'église, presque toujours un dimanche matin. Des pastilles
 * pré-calculées demandent deux touches là où un clavier en demandait seize, et
 * ne peuvent produire ni date invalide ni date passée.
 */

const JOUR_MS = 86400000;

function memeJour(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Aujourd'hui, demain, puis les quatre dimanches à venir. */
function joursProposes(): { date: Date; libelle: string; detail: string }[] {
  const maintenant = new Date();
  const liste: { date: Date; libelle: string; detail: string }[] = [];

  const aujourdhui = new Date(maintenant);
  aujourdhui.setHours(0, 0, 0, 0);
  liste.push({
    date: new Date(aujourdhui),
    libelle: "Aujourd'hui",
    detail: aujourdhui.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
  });

  const demain = new Date(aujourdhui.getTime() + JOUR_MS);
  liste.push({
    date: demain,
    libelle: "Demain",
    detail: demain.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
  });

  // Les prochains dimanches — le cas courant pour aller au culte.
  let d = new Date(aujourdhui);
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  for (let i = 0; i < 4; i++) {
    const dim = new Date(d.getTime() + i * 7 * JOUR_MS);
    if (liste.some((j) => memeJour(j.date, dim))) continue;
    liste.push({
      date: dim,
      libelle: i === 0 ? "Dimanche" : "Dim. +" + i,
      detail: dim.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    });
  }

  return liste;
}

/** De 6 h à 21 h 30, par demi-heures. */
const HEURES = Array.from({ length: 32 }, (_, i) => {
  const h = 6 + Math.floor(i / 2);
  const m = i % 2 === 0 ? 0 : 30;
  return { h, m, texte: String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") };
});

export default function ChampDateHeure({
  valeur,
  onChange,
}: {
  valeur: Date | null;
  onChange: (d: Date) => void;
}) {
  const jours = useMemo(joursProposes, []);

  const jourChoisi = valeur ? jours.find((j) => memeJour(j.date, valeur)) : undefined;
  const heureChoisie = valeur
    ? HEURES.find((x) => x.h === valeur.getHours() && x.m === valeur.getMinutes())
    : undefined;

  function choisirJour(d: Date) {
    const prochain = new Date(d);
    // On conserve l'heure déjà choisie, sinon 9 h 30 par défaut.
    prochain.setHours(valeur?.getHours() ?? 9, valeur?.getMinutes() ?? 30, 0, 0);
    onChange(prochain);
  }

  function choisirHeure(h: number, m: number) {
    const base = valeur ? new Date(valeur) : jours[0].date;
    const prochain = new Date(base);
    prochain.setHours(h, m, 0, 0);
    onChange(prochain);
  }

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: "row", gap: 8, paddingRight: 8 }}>
          {jours.map((j) => {
            const actif = jourChoisi?.libelle === j.libelle;
            return (
              <Pressable
                key={j.libelle + j.detail}
                onPress={() => choisirJour(j.date)}
                style={{
                  paddingHorizontal: 15,
                  paddingVertical: 11,
                  borderRadius: 13,
                  borderWidth: 2,
                  borderColor: actif ? C.brand : C.line,
                  backgroundColor: actif ? C.brandSoft : C.white,
                  alignItems: "center",
                  minWidth: 88,
                }}
              >
                <Text
                  style={{ fontSize: 14, fontWeight: "800", color: actif ? C.brand : C.navy }}
                >
                  {j.libelle}
                </Text>
                <Text style={{ fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{j.detail}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 7, paddingRight: 8 }}>
          {HEURES.map((x) => {
            const actif = heureChoisie?.texte === x.texte;
            return (
              <Pressable
                key={x.texte}
                onPress={() => choisirHeure(x.h, x.m)}
                style={{
                  paddingHorizontal: 13,
                  paddingVertical: 10,
                  borderRadius: 11,
                  borderWidth: 1.5,
                  borderColor: actif ? C.brand : C.line,
                  backgroundColor: actif ? C.brand : C.white,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: actif ? C.white : C.inkSoft,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {x.texte}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 9,
          marginTop: 12,
          backgroundColor: valeur ? C.brandSoft : C.navySoft,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <Feather name="clock" size={15} color={valeur ? C.brand : C.inkFaint} />
        <Text style={{ fontSize: 14.5, color: valeur ? C.navy : C.inkSoft, fontWeight: "600" }}>
          {valeur
            ? valeur.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }) +
              " à " +
              valeur.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
            : "Choisis un jour et une heure"}
        </Text>
      </View>
    </View>
  );
}
