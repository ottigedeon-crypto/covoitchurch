import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

/**
 * Décor de l'ouverture : ciel, collines, église au loin, arbres, route.
 * Tout est dessiné en vectoriel pour rester net à toutes les tailles.
 * Le repère est fixe (400 × 260) ; l'échelle est gérée par le conteneur.
 */
export function Paysage({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 400 260">
      <Defs>
        <LinearGradient id="ciel" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#EDE4FA" />
          <Stop offset="0.62" stopColor="#F8F5FD" />
          <Stop offset="1" stopColor="#FDFCFE" />
        </LinearGradient>
        <LinearGradient id="collineLoin" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#CDB8EA" />
          <Stop offset="1" stopColor="#BCA3E2" />
        </LinearGradient>
        <LinearGradient id="collinePres" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#A987D6" />
          <Stop offset="1" stopColor="#8F6AC4" />
        </LinearGradient>
        <LinearGradient id="bitume" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#2E3440" />
          <Stop offset="1" stopColor="#1B2029" />
        </LinearGradient>
      </Defs>

      {/* Ciel */}
      <Rect x="0" y="0" width="400" height="260" fill="url(#ciel)" />
      <Circle cx="322" cy="46" r="26" fill="#FFFFFF" opacity="0.75" />
      <Circle cx="322" cy="46" r="17" fill="#FFFFFF" />

      {/* Nuages */}
      <G opacity="0.9">
        <Ellipse cx="86" cy="44" rx="26" ry="11" fill="#FFFFFF" />
        <Ellipse cx="104" cy="40" rx="18" ry="13" fill="#FFFFFF" />
        <Ellipse cx="238" cy="30" rx="20" ry="9" fill="#FFFFFF" />
        <Ellipse cx="252" cy="27" rx="14" ry="10" fill="#FFFFFF" />
      </G>

      {/* Collines lointaines */}
      <Path d="M0 150 Q 62 108 132 146 Q 196 178 260 142 Q 330 104 400 150 L400 190 L0 190 Z" fill="url(#collineLoin)" opacity="0.55" />
      <Path d="M0 168 Q 78 132 150 166 Q 226 200 300 164 Q 356 138 400 166 L400 200 L0 200 Z" fill="url(#collinePres)" opacity="0.45" />

      {/* L'église, au loin */}
      <G>
        <Rect x="176" y="118" width="34" height="42" rx="2" fill="#6B4C9A" opacity="0.75" />
        <Path d="M172 118 L193 100 L214 118 Z" fill="#5B3F86" opacity="0.8" />
        <Rect x="196" y="86" width="7" height="34" fill="#6B4C9A" opacity="0.75" />
        <Path d="M193 86 L199.5 74 L206 86 Z" fill="#5B3F86" opacity="0.8" />
        <Rect x="198" y="62" width="3" height="14" fill="#4A3070" />
        <Rect x="194" y="66" width="11" height="3" fill="#4A3070" />
        <Rect x="188" y="140" width="10" height="20" rx="5" fill="#4A3070" opacity="0.6" />
      </G>

      {/* Arbres */}
      {[
        { x: 44, s: 1 },
        { x: 120, s: 0.78 },
        { x: 288, s: 0.9 },
        { x: 356, s: 0.7 },
      ].map((a, i) => (
        <G key={i} transform={`translate(${a.x} 168) scale(${a.s})`}>
          <Rect x="-3" y="-14" width="6" height="20" rx="2" fill="#6F5A45" />
          <Circle cx="0" cy="-24" r="15" fill="#7E62B8" opacity="0.85" />
          <Circle cx="-10" cy="-17" r="11" fill="#8E72C6" opacity="0.85" />
          <Circle cx="10" cy="-18" r="10" fill="#6F52A8" opacity="0.85" />
        </G>
      ))}

      {/* Herbe */}
      <Rect x="0" y="174" width="400" height="26" fill="#C9BCE4" opacity="0.5" />

      {/* Trottoir et bordure */}
      <Rect x="0" y="196" width="400" height="8" fill="#D8CFE9" />
      <Rect x="0" y="196" width="400" height="2" fill="#B9A9DA" />

      {/* Chaussée */}
      <Rect x="0" y="204" width="400" height="42" fill="url(#bitume)" />

      {/* Marquage central */}
      {Array.from({ length: 13 }).map((_, i) => (
        <Rect key={i} x={i * 32 + 6} y="223" width="18" height="3" rx="1.5" fill="#E9E2F5" opacity="0.7" />
      ))}

      {/* Bas-côté */}
      <Rect x="0" y="246" width="400" height="14" fill="#CFC4E6" opacity="0.55" />
    </Svg>
  );
}

/** Un arrêt de bus, en bord de route — le lieu de rendez-vous de l'application. */
export function ArretDeBus({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 40 70">
      <Rect x="18" y="16" width="3.5" height="52" fill="#7A6A90" />
      <Rect x="4" y="6" width="32" height="16" rx="3" fill="#5B2D8E" />
      <Circle cx="13" cy="14" r="4" fill="#FFFFFF" opacity="0.92" />
      <Rect x="20" y="11" width="12" height="2.4" rx="1.2" fill="#FFFFFF" opacity="0.85" />
      <Rect x="20" y="15.5" width="8" height="2.4" rx="1.2" fill="#FFFFFF" opacity="0.6" />
    </Svg>
  );
}

type Personne = {
  /** Teinte des vêtements */
  habit: string;
  /** Teinte de peau */
  peau: string;
  /** Taille relative — un enfant est plus petit */
  echelle: number;
  /** Accessoire porté */
  sac?: boolean;
};

/**
 * Silhouette de personne, de profil trois-quarts. Les proportions suivent
 * grossièrement le canon des sept têtes et demie, ce qui suffit à sortir du
 * bonhomme bâton sans tomber dans le détail inutile à cette taille.
 */
export function Silhouette({
  personne,
  width,
  height,
}: {
  personne: Personne;
  width: number;
  height: number;
}) {
  const { habit, peau, sac } = personne;
  return (
    <Svg width={width} height={height} viewBox="0 0 34 92">
      {/* Ombre au sol */}
      <Ellipse cx="17" cy="89" rx="11" ry="3" fill="#1B2029" opacity="0.18" />

      {/* Jambes */}
      <Path d="M12 54 L11 84 L15.5 84 L16.5 56 Z" fill="#2E3440" />
      <Path d="M18 55 L20.5 84 L25 84 L22.5 54 Z" fill="#3A4150" />
      {/* Chaussures */}
      <Path d="M9.5 84 L16 84 L16 88 L9 88 Z" fill="#1B2029" />
      <Path d="M20 84 L26.5 84 L27 88 L20 88 Z" fill="#1B2029" />

      {/* Buste */}
      <Path d="M11 26 Q17 22 23 26 L25 44 Q17 48 9 44 Z" fill={habit} />
      <Path d="M9 44 Q17 48 25 44 L24 56 Q17 59 10 56 Z" fill={habit} opacity="0.88" />

      {/* Bras */}
      <Path d="M11.5 27 L7.5 44 L11 45 L14 30 Z" fill={habit} opacity="0.92" />
      <Circle cx="9" cy="46" r="2.6" fill={peau} />
      <Path d="M22.5 27 L26.5 43 L23 44.5 L20 30 Z" fill={habit} opacity="0.8" />
      <Circle cx="24.5" cy="46" r="2.6" fill={peau} />

      {/* Cou et tête */}
      <Rect x="15" y="20" width="4" height="7" fill={peau} />
      <Circle cx="17" cy="14" r="7.5" fill={peau} />
      {/* Cheveux */}
      <Path d="M9.6 12.5 Q10 5 17 5 Q24 5 24.4 12.5 Q21 8.5 17 9.5 Q13 8.6 9.6 12.5 Z" fill="#2A2233" />

      {sac ? (
        <G>
          <Path d="M13 28 L22 46" stroke="#4A3070" strokeWidth="2" fill="none" />
          <Rect x="21" y="44" width="9" height="11" rx="2.5" fill="#4A3070" />
        </G>
      ) : null}
    </Svg>
  );
}

/**
 * Voiture moderne, de profil : capot plongeant, pavillon fuyant, vitrage
 * teinté, passages de roue marqués. Les roues sont dessinées à part pour
 * pouvoir tourner indépendamment.
 */
export function Carrosserie({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 200 78">
      <Defs>
        <LinearGradient id="peinture" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#8156BE" />
          <Stop offset="0.5" stopColor="#5B2D8E" />
          <Stop offset="1" stopColor="#3F1D66" />
        </LinearGradient>
        <LinearGradient id="vitre" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#D8E6F2" />
          <Stop offset="1" stopColor="#8FA6BC" />
        </LinearGradient>
      </Defs>

      {/* Ombre portée */}
      <Ellipse cx="100" cy="70" rx="82" ry="6" fill="#1B2029" opacity="0.22" />

      {/* Carrosserie : nez bas, épaule qui remonte, poupe fastback */}
      <Path
        d="M8 56
           Q6 44 20 41
           L46 39
           Q60 20 92 18
           L124 18
           Q150 20 166 40
           L182 44
           Q194 47 193 57
           L191 62
           L166 62
           Q160 48 148 48
           Q136 48 130 62
           L74 62
           Q68 48 56 48
           Q44 48 38 62
           L12 62
           Z"
        fill="url(#peinture)"
      />

      {/* Vitrage */}
      <Path d="M56 38 Q68 24 92 23 L92 38 Z" fill="url(#vitre)" opacity="0.95" />
      <Path d="M98 23 L122 23 Q142 25 154 38 L98 38 Z" fill="url(#vitre)" opacity="0.85" />
      {/* Montant central */}
      <Rect x="92" y="23" width="5" height="15" fill="#2A2233" opacity="0.5" />

      {/* Reflet le long de la ceinture de caisse */}
      <Path d="M22 44 L176 46" stroke="#FFFFFF" strokeWidth="1.6" opacity="0.28" fill="none" />

      {/* Poignées */}
      <Rect x="76" y="44" width="11" height="2.6" rx="1.3" fill="#2A2233" opacity="0.55" />
      <Rect x="112" y="44" width="11" height="2.6" rx="1.3" fill="#2A2233" opacity="0.55" />

      {/* Optiques */}
      <Path d="M8 47 Q16 45 22 47 L22 52 Q14 53 8 51 Z" fill="#FFF3C9" />
      <Path d="M186 47 Q192 46 192 50 L192 54 Q186 54 184 52 Z" fill="#E0443B" opacity="0.9" />

      {/* Bas de caisse */}
      <Rect x="38" y="59" width="128" height="4" rx="2" fill="#2A2233" opacity="0.35" />
    </Svg>
  );
}

/** Roue à jante, dessinée seule pour pouvoir tourner. */
export function Roue({ taille }: { taille: number }) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 40 40">
      <Circle cx="20" cy="20" r="19" fill="#20252E" />
      <Circle cx="20" cy="20" r="12.5" fill="#C9CEDA" />
      <Circle cx="20" cy="20" r="4.5" fill="#8A93A5" />
      {/* Cinq branches */}
      {[0, 72, 144, 216, 288].map((a) => (
        <Rect
          key={a}
          x="18.6"
          y="7.5"
          width="2.8"
          height="10"
          rx="1.4"
          fill="#20252E"
          transform={`rotate(${a} 20 20)`}
        />
      ))}
    </Svg>
  );
}
