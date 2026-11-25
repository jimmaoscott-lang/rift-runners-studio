import { DefenderType, HeroPowerId } from './level1';

export interface SpanishRuleTip {
  labelEs: string;
  tipEs: string;
  bridgeEs: string;
}

export interface WordGloss {
  es: string;
  enDef: string;
  esDef?: string;
  cognate?: boolean;
}

export interface SpanishDefenderInfo {
  nameEs: string;
  descEs: string;
  spec: {
    a: { nameEs: string; descEs: string };
    b: { nameEs: string; descEs: string };
  };
}

export const SPANISH_RULE_TIPS: Record<string, SpanishRuleTip> = {
  a: {
    labelEs: 'Vocal corta "a"',
    tipEs: 'Abre la boca bien amplia y baja la lengua al frente, como entre la "a" y la "e" del español.',
    bridgeEs: 'Es más abierta que la "a" del español. Practica con "cat" y "map".',
  },
  e: {
    labelEs: 'Vocal corta "e"',
    tipEs: 'Abre la boca a la mitad con los labios relajados para una "e" rápida y clara.',
    bridgeEs: 'Se parece mucho a la "e" del español, pero un poco más corta, como en "red" y "pen".',
  },
  i: {
    labelEs: 'Vocal corta "i"',
    tipEs: 'Relaja los labios sin sonreír demasiado para lograr un sonido corto entre "i" y "e".',
    bridgeEs: 'En español solo existe la "i" larga. Aquí es más relajada y rápida, como en "pig" y "sit".',
  },
  o: {
    labelEs: 'Vocal corta "o"',
    tipEs: 'Abre la mandíbula hacia abajo y lleva el sonido hacia atrás, parecido a una "a" profunda.',
    bridgeEs: 'En inglés americano la "o" corta suena cerca de una "a" abierta, como en "top" y "hot".',
  },
  u: {
    labelEs: 'Vocal corta "u"',
    tipEs: 'Mantén la boca y la lengua relajadas en el centro para un sonido breve y suave.',
    bridgeEs: 'Es distinta a la "u" del español; suena más suave y corta, como en "cup" y "sun".',
  },
  sh: {
    labelEs: 'Sonido "sh"',
    tipEs: 'Redondea un poco los labios y deja salir un flujo de aire suave y continuo, como al pedir silencio.',
    bridgeEs: 'Sin golpear con la lengua al principio. Es un aire largo y liso, como en "ship" y "rush".',
  },
  ch: {
    labelEs: 'Sonido "ch"',
    tipEs: 'Apoya la lengua arriba un instante y suéltala con un pequeño golpe de aire limpio.',
    bridgeEs: 'Igual que la "ch" del español en "chico" o "noche". Practica con "chip" y "much".',
  },
  th: {
    labelEs: 'Sonido "th"',
    tipEs: 'Coloca la punta de la lengua suavemente entre los dientes de arriba y deja pasar el aire.',
    bridgeEs: 'No bloquees el aire como en una "t" o "d"; deja que el aire pase por la lengua, como en "thin" o "this".',
  },
  wh: {
    labelEs: 'Sonido "wh"',
    tipEs: 'Forma un círculo pequeño con los labios y desliza el sonido directo hacia la vocal.',
    bridgeEs: 'Suena como una "u" rápida antes de la vocal (similar a "hu" en "hueso"), como en "whip".',
  },
  ck: {
    labelEs: 'Sonido final "-ck"',
    tipEs: 'Termina la palabra con un golpe rápido y seco desde la parte trasera de la lengua.',
    bridgeEs: 'Las dos letras juntas hacen un solo sonido /k/, como la "c" fuerte en "casa", al final de "lock".',
  },
};

export function getSpanishRuleTip(pattern: string): SpanishRuleTip | null {
  const key = String(pattern || '').trim().toLowerCase().replace(/^short\s+/, '');
  return SPANISH_RULE_TIPS[key] || null;
}

export const WORD_GLOSSES: Record<string, WordGloss> = {
  box: { es: 'caja', enDef: 'A square container for holding things.' },
  bus: { es: 'autobús', enDef: 'A large vehicle that carries many passengers.', cognate: true },
  cab: { es: 'taxi', enDef: 'A car you pay to drive you somewhere.' },
  cash: { es: 'efectivo', enDef: 'Paper money and coins.' },
  chap: { es: 'tipo / muchacho', enDef: 'A casual word for a guy or fellow.' },
  chat: { es: 'charlar', enDef: 'To talk in a friendly, casual way.', cognate: true },
  chin: { es: 'barbilla', enDef: 'The bottom front part of your face below your mouth.' },
  chip: { es: 'ficha / astilla', enDef: 'A small broken piece, or a crunchy snack.' },
  chop: { es: 'cortar / picar', enDef: 'To cut something into pieces with a quick stroke.' },
  chug: { es: 'avanzar fuerte / tragar', enDef: 'To move steadily like an engine, or drink quickly.' },
  chum: { es: 'amigo / compañero', enDef: 'A close friend or buddy.' },
  cob: { es: 'mazorca', enDef: 'The center core of an ear of corn.' },
  cub: { es: 'cachorro', enDef: 'A young bear, lion, or wolf.' },
  cut: { es: 'cortar', enDef: 'To slice or divide with a blade or scissors.' },
  den: { es: 'guarida', enDef: 'A wild animal home, or a cozy room.' },
  dig: { es: 'cavar', enDef: 'To break up and move dirt or earth.' },
  dish: { es: 'plato', enDef: 'A plate or bowl used to serve food.' },
  dot: { es: 'punto', enDef: 'A tiny round mark or spot.' },
  dug: { es: 'cavó', enDef: 'Past tense of dig (made a hole in the ground).' },
  fan: { es: 'ventilador / aficionado', enDef: 'A machine that blows air, or a loyal supporter.' },
  fed: { es: 'alimentó', enDef: 'Past tense of feed (gave food to).' },
  fin: { es: 'aleta', enDef: 'A flat wing-like part on a fish or shark.' },
  fit: { es: 'en forma / quedar bien', enDef: 'Healthy and strong, or the right size.' },
  fog: { es: 'niebla', enDef: 'Thick low clouds near the ground.' },
  fun: { es: 'diversión', enDef: 'Something enjoyable or entertaining.' },
  gas: { es: 'gas / gasolina', enDef: 'Air-like matter, or fuel for a car.', cognate: true },
  hat: { es: 'sombrero / gorra', enDef: 'Something you wear on your head.' },
  hem: { es: 'dobladillo', enDef: 'The folded and stitched edge of cloth.' },
  hit: { es: 'golpear', enDef: 'To strike something with force.' },
  hot: { es: 'caliente', enDef: 'Having a high temperature.' },
  hut: { es: 'cabaña', enDef: 'A small, simple shelter or cabin.' },
  jab: { es: 'golpe rápido', enDef: 'A quick, sharp poke or punch.' },
  jet: { es: 'avión de reacción', enDef: 'A fast aircraft powered by jet engines.' },
  job: { es: 'trabajo', enDef: 'Work you do to earn pay, or a specific task.' },
  jut: { es: 'sobresalir', enDef: 'To stick out past an edge.' },
  lab: { es: 'laboratorio', enDef: 'A room equipped for science experiments.', cognate: true },
  log: { es: 'tronco / registro', enDef: 'A thick cut piece of tree trunk, or a written record.' },
  map: { es: 'mapa', enDef: 'A drawing showing roads, places, or land.', cognate: true },
  mash: { es: 'machacar', enDef: 'To crush soft food into a smooth mix.' },
  men: { es: 'hombres', enDef: 'More than one adult man.' },
  mix: { es: 'mezclar', enDef: 'To combine two or more things together.', cognate: true },
  mop: { es: 'trapeador', enDef: 'A long-handled tool used to wash floors.' },
  much: { es: 'mucho', enDef: 'A large amount of something.', cognate: true },
  mug: { es: 'taza', enDef: 'A heavy cup with a handle for hot drinks.' },
  net: { es: 'red', enDef: 'Woven mesh used to catch fish or stop a ball.' },
  pad: { es: 'almohadilla / plataforma', enDef: 'A soft cushion, notepad, or flat stone base.' },
  peg: { es: 'clavija', enDef: 'A short pin or hook used to hold or hang things.' },
  pen: { es: 'pluma / bolígrafo', enDef: 'A tool that writes with ink.' },
  pin: { es: 'alfiler', enDef: 'A thin pointed metal fastener.', cognate: true },
  pod: { es: 'vaina / cápsula', enDef: 'A seed case like a pea pod, or a small capsule.' },
  pun: { es: 'juego de palabras', enDef: 'A joke that plays on words sounding alike.' },
  red: { es: 'rojo', enDef: 'The bright color of fire or ripe apples.' },
  rich: { es: 'rico', enDef: 'Having lots of wealth, or full of deep flavor.', cognate: true },
  rip: { es: 'rasgar', enDef: 'To tear paper or cloth apart quickly.' },
  rod: { es: 'vara / caña', enDef: 'A thin straight bar of metal or wood.' },
  rush: { es: 'prisa / correr', enDef: 'To move very fast with urgency.' },
  shed: { es: 'cobertizo', enDef: 'A small outdoor building used for storing tools.' },
  shin: { es: 'espinilla', enDef: 'The front part of your leg below the knee.' },
  ship: { es: 'barco / nave', enDef: 'A large vessel that travels across water or space.' },
  shop: { es: 'tienda / taller', enDef: 'A store or workshop where things are sold or fixed.' },
  shot: { es: 'tiro / disparo', enDef: 'A launched throw, arrow, or camera photo.' },
  shut: { es: 'cerrar', enDef: 'To close a door, lid, or gate tightly.' },
  such: { es: 'tal / tan', enDef: 'Of that same kind or degree.' },
  sun: { es: 'sol', enDef: 'The bright star that gives Earth light and heat.' },
  tag: { es: 'etiqueta', enDef: 'A small label attached to an item.' },
  ten: { es: 'diez', enDef: 'The number 10.' },
  top: { es: 'cima / parte superior', enDef: 'The highest point or upper surface.' },
  tub: { es: 'tina / bañera', enDef: 'A wide container for washing or holding water.' },
  tug: { es: 'tirar / jalar', enDef: 'To pull hard on something.' },
  vet: { es: 'veterinario', enDef: 'A doctor who treats sick or injured animals.' },
  web: { es: 'telaraña / red', enDef: 'A net spun by a spider, or an interconnected network.' },
  win: { es: 'ganar', enDef: 'To succeed or come out ahead in a contest.' },
  zap: { es: 'descarga', enDef: 'A sudden quick burst of electric energy.' },
  zip: { es: 'cierre / pasar rápido', enDef: 'To close a zipper, or move very quickly.' },
};

export function getWordGloss(
  word: string,
  fallbackEs?: string,
  fallbackCognate?: boolean
): WordGloss | null {
  const key = String(word || '').trim().toLowerCase();
  if (WORD_GLOSSES[key]) return WORD_GLOSSES[key];
  if (fallbackEs) {
    return {
      es: fallbackEs,
      enDef: '',
      cognate: Boolean(fallbackCognate),
    };
  }
  return null;
}

export const SPANISH_DEFENDERS: Record<DefenderType, SpanishDefenderInfo> = {
  archer: {
    nameEs: 'Torre de Arqueros',
    descEs: 'Dispara flechas constantes a las criaturas de la grieta en el camino.',
    spec: {
      a: {
        nameEs: 'Torre Francotiradora',
        descEs: 'Flechas pesadas de largo alcance y gran daño.',
      },
      b: {
        nameEs: 'Torre de Ráfaga',
        descEs: 'Dispara tres flechas a la vez contra tres enemigos.',
      },
    },
  },
  spike: {
    nameEs: 'Foso de Púas',
    descEs: 'Trampa en el sendero. Daña a todo lo que camina encima.',
    spec: {
      a: {
        nameEs: 'Foso de Cuchillas',
        descEs: 'Púas más afiladas con daño masivo al pasar.',
      },
      b: {
        nameEs: 'Foso de Alquitrán',
        descEs: 'El alquitrán pegajoso frena a los enemigos mientras las púas los dañan.',
      },
    },
  },
  golem: {
    nameEs: 'Gólem de Piedra',
    descEs: 'Se para en el camino y detiene enemigos. Se reconstruye si cae.',
    spec: {
      a: {
        nameEs: 'Gólem de Montaña',
        descEs: 'Enorme y resistente. Detiene a 6 criaturas y se reconstruye más rápido.',
      },
      b: {
        nameEs: 'Gólem Sísmico',
        descEs: 'Cada golpe golpea a todas las criaturas que sostiene.',
      },
    },
  },
  frost: {
    nameEs: 'Tótem de Escarcha',
    descEs: 'Ralentiza a cada criatura dentro de su anillo de frío.',
    spec: {
      a: {
        nameEs: 'Tótem Glaciar',
        descEs: 'Cada pocos segundos congela por completo a los enemigos en su radio.',
      },
      b: {
        nameEs: 'Tótem de Ventisca',
        descEs: 'Un anillo más amplio y helado que daña mientras ralentiza.',
      },
    },
  },
  ember: {
    nameEs: 'Cañón de Brasas',
    descEs: 'Lanza proyectiles fundidos que explotan y queman grupos enteros.',
    spec: {
      a: {
        nameEs: 'Mortero Infernal',
        descEs: 'Explosiones de fuego de largo alcance que destrozan oleadas densas.',
      },
      b: {
        nameEs: 'Repetidor de Ceniza',
        descEs: 'Disparos rápidos en llamas que mantienen daño constante en área.',
      },
    },
  },
  tesla: {
    nameEs: 'Aguja Tesla',
    descEs: 'Torre eléctrica que ataca tierra y aire y salta entre enemigos cercanos.',
    spec: {
      a: {
        nameEs: 'Conducto de Tormenta',
        descEs: 'Arcos cargados saltan entre 6 criaturas a la vez, ideal contra enjambres y voladores.',
      },
      b: {
        nameEs: 'Rayo Sobrecargado',
        descEs: 'Fija un arco de plasma en un solo enemigo y aumenta el daño con cada golpe.',
      },
    },
  },
};

export const SPANISH_HERO_POWERS: Record<HeroPowerId, { nameEs: string; descEs: string }> = {
  rally: {
    nameEs: 'Impulso',
    descEs: 'Tus defensores atacan más rápido durante un momento.',
  },
  meteor: {
    nameEs: 'Meteoro',
    descEs: 'Lanza un meteoro sobre el grupo más grande de criaturas.',
  },
  freeze: {
    nameEs: 'Congelar Tiempo',
    descEs: 'Congela a todas las criaturas y detiene la grieta unos segundos.',
  },
};

export const SPANISH_WALKTHROUGH_STEPS: Array<{ titleEs: string; bodyEs: string }> = [
  {
    titleEs: 'Elige tu primer defensor',
    bodyEs: 'Haz clic en Torre de Arqueros en la barra inferior (60 cristales).',
  },
  {
    titleEs: 'Coloca tu torre',
    bodyEs: 'Haz clic en cualquier plataforma hexagonal de piedra junto al camino.',
  },
  {
    titleEs: 'Protege el sendero',
    bodyEs: 'Te quedan 40 cristales. Haz clic en Foso de Púas abajo y colócalo en un círculo sobre el camino.',
  },
  {
    titleEs: 'Forja palabras para ganar cristales',
    bodyEs: 'Mira la Forja de Runas a la derecha. Presiona SAY IT o escucha las opciones 1, 2, 3 y pulsa Forge.',
  },
  {
    titleEs: 'Lanza la Oleada 1',
    bodyEs: 'Haz clic en Send now en la barra superior (o forja 10 palabras) para iniciar la Oleada 1.',
  },
  {
    titleEs: 'Mejora cualquier defensor',
    bodyEs: 'Haz clic en una torre del mapa para ver su alcance, mejorarla o elegir especialidad en Nivel 3.',
  },
  {
    titleEs: 'Sellos de Grieta y Poderes',
    bodyEs: 'Llena los Sellos de Grieta (a e i) a la izquierda con lecturas limpias para abrir la Oleada Final. Usa Impulso, Meteoro y Congelar arriba.',
  },
];

export const SPANISH_CUTSCENE_CAPTIONS: Record<string, string[]> = {
  'l01-open-v2-1': [
    'Brecha en el Borde Espinoso. Los Espectros y Espinosos avanzan por el sendero.',
    'Lee palabras en la Forja de Runas para cargar nuestros cristales.',
  ],
  'l01-open-v2-2': [
    'Cuatro defensas listas: coloca Torres de Arqueros y Tótems de Escarcha en las bases de piedra.',
    'Pon Fosos de Púas y Gólems de Piedra directo en el camino para detener la oleada.',
  ],
  'l01-open-v2-3': [
    'Llena los dos Sellos de Grieta a la izquierda con lecturas claras de "a" e "i" cortas.',
    'Activa Impulso, Meteoro y Congelar en la barra superior cuando estén cargados. ¿Listo?',
  ],
  'l01-vic-v2-1': [
    '¡Primera grieta sellada! Gran trabajo, Corredor.',
    'Desbloqueado: Cañón de Brasas añadido a tu arsenal. El Cruce Espinoso está abierto.',
  ],
  'l01-vic-v2-2': [
    'Esos eran solo exploradores. Algo más grande despierta en lo profundo del bosque.',
    'Nivel completado. El Cruce Espinoso te espera.',
  ],
  'l01-def-v2-1': [
    'El Ancla cayó y la grieta logró pasar.',
    'Cada palabra limpia que forjaste sigue contando. Ajusta tu defensa e inténtalo de nuevo.',
  ],
  'l02-open-v1-1': [
    'El Cruce Espinoso está bajo ataque. Los Acechadores cargan hacia el puente.',
    'Defiende el desfiladero antes de que crucen hacia nuestro campamento.',
  ],
  'l02-open-v1-2': [
    'Cañón de Brasas desbloqueado: colócalo junto al puente para frenar grupos con fuego.',
    'Llena los Sellos de "o" y "u" cortas para desbloquear la Oleada Final.',
  ],
  'l02-vic-v1-1': [
    '¡El Cruce Espinoso está a salvo! El puente y el Ancla resistieron firmes.',
    'Tus lecturas limpias de "o" y "u" cortas sellaron la grieta del cañón.',
  ],
  'l02-vic-v1-2': [
    'Ruinas antiguas brillan tras la niebla. El Rey Espina sabe que avanzamos.',
    'Nivel 2 completado. Camino al Puente Hueco desbloqueado.',
  ],
  'l02-def-v1-1': [
    'Los Acechadores cruzaron el puente.',
    'Consejo: combina Tótems de Escarcha con un Cañón de Brasas en la curva e inténtalo otra vez.',
  ],
  'l03-open-v1-1': [
    'Murciélagos de la Grieta salen volando del desfiladero.',
    'Vuelan directo por encima de los Fosos de Púas y los Gólems de Piedra.',
  ],
  'l03-open-v1-2': [
    'Usa Torres de Arqueros y Tótems de Escarcha para derribar a los voladores.',
    'Llena los Sellos de "e" e "i" cortas para abrir la Oleada Final.',
  ],
  'l03-vic-v1-1': [
    '¡El Puente Hueco está despejado! Los cielos sobre el cañón están seguros.',
    'Tus lecturas precisas de "e" e "i" cortas mantuvieron la línea.',
  ],
  'l03-vic-v1-2': [
    'Adelante están las Ruinas Sin Sol, donde se combinan las cinco vocales cortas.',
    'Prepárate para los Divisores de Cristal en el patio.',
  ],
  'l03-def-v1-1': [
    'Los Murciélagos de la Grieta superaron la defensa del puente.',
    'Combina Torres de Arqueros con un Tótem de Escarcha cerca de las curvas e inténtalo de nuevo.',
  ],
  'l04-open-v1-1': [
    'Los Divisores de Grieta marchan desde el portal del templo.',
    'Cada Divisor se parte en dos Espectros al ser derrotado.',
  ],
  'l04-open-v1-2': [
    'Los Cañones de Brasas y Fosos de Púas eliminan rápido a los espectros divididos.',
    'Las cinco vocales cortas están activas en la Forja de Runas.',
  ],
  'l04-vic-v1-1': [
    '¡Las cinco vocales cortas dominadas! Las Ruinas Sin Sol están libres.',
    'Solo queda una barrera más en el Bosque Espinoso.',
  ],
  'l04-vic-v1-2': [
    'Siguiente parada: el Corazón del Rey Espina, la batalla final del Mundo 1.',
    'Los Brutos de Corteza y el Rey Espina esperan adelante.',
  ],
  'l04-def-v1-1': [
    'Los espectros divididos superaron la defensa del patio.',
    'Coloca un Cañón de Brasas junto al círculo de runas e inténtalo de nuevo.',
  ],
  'l05-open-v1-1': [
    'Bienvenido al Corazón del Rey Espina, la batalla final del Mundo 1.',
    'Los Brutos de Corteza y el Rey Espina marchan hacia la ciudadela.',
  ],
  'l05-open-v1-2': [
    'Nueva arma desbloqueada: la Aguja Tesla lanza rayos en cadena por tierra y aire.',
    'Sella las cinco vocales cortas y derrota al Rey Espina para cerrar el Mundo 1.',
  ],
  'l05-vic-v1-1': [
    '¡El Rey Espina ha caído y la grieta principal está sellada!',
    'La luz del sol regresa al Mundo 1: El Bosque Espinoso.',
  ],
  'l05-vic-v1-2': [
    'Dominaste las cinco vocales cortas en todo el Mundo 1.',
    'Puedes cargar un video final en cualquier momento usando Load MP4.',
  ],
  'l05-def-v1-1': [
    'El Rey Espina atravesó la puerta de la ciudadela.',
    'Frena a los Brutos en el puente de raíces y usa especialidades de Nivel 3.',
  ],
  'w2-l01-open-v1-1': [
    'Brecha en el Puesto Puerta Ceniza, frontera del Mundo 2: La Fundición Hundida.',
    'Rápidos Diablillos de Ceniza corren en grupos cerrados por el camino volcánico.',
  ],
  'w2-l01-open-v1-2': [
    'Los Diablillos resisten la mitad del frío. Usa Agujas Tesla y Cañones de Brasas contra grupos.',
    'Llena los Sellos de "sh" y "ch" en la Forja para abrir la Oleada Final.',
  ],
  'w2-l01-vic-v1-1': [
    '¡El Puesto Puerta Ceniza está seguro! La brecha de Diablillos quedó sellada.',
    'Tus lecturas limpias de "sh" y "ch" defendieron la frontera de la fundición.',
  ],
  'w2-l01-vic-v1-2': [
    'En lo profundo de la Fundición Hundida, Portadores de Escudo protegen la Calzada.',
    'Siguiente etapa: Calzada del Crisol (desbloqueo de Torreta Riel).',
  ],
  'w2-l01-def-v1-1': [
    'Los Diablillos de Ceniza cruzaron la línea y golpearon el Ancla.',
    'Consejo: combina Agujas Tesla con Cañones de Brasas en las curvas e inténtalo de nuevo.',
  ],
};

export function getCutsceneSpanishCaption(beatId: string, captionIndex: number): string | null {
  const lines = SPANISH_CUTSCENE_CAPTIONS[beatId];
  if (!lines || lines.length === 0) return null;
  return lines[Math.min(captionIndex, lines.length - 1)] || lines[0] || null;
}
