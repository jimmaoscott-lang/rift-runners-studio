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
  bl: {
    labelEs: 'Combinación "bl"',
    tipEs: 'Junta los labios para la "b" y sube enseguida la punta de la lengua para la "l", sin pausa entre ellas.',
    bridgeEs: 'Muy parecido a "bl" en español ("blanco", "bloque"). Escucha ambos sonidos juntos en "black" y "block".',
  },
  cl: {
    labelEs: 'Combinación "cl"',
    tipEs: 'Haz una "c" fuerte y limpia atrás de la boca y deslízala directo hacia la "l".',
    bridgeEs: 'Igual que "cl" en español ("clase", "claro"). Mantén los dos sonidos unidos en "clap" y "clock".',
  },
  fr: {
    labelEs: 'Combinación "fr"',
    tipEs: 'Sopla una "f" suave sobre el labio inferior y lleva la lengua un poco hacia atrás para la "r" suave del inglés.',
    bridgeEs: 'Se parece a "fr" en "frío", pero la "r" del inglés es suave sin vibrar la punta de la lengua, como en "frog" y "fresh".',
  },
  gr: {
    labelEs: 'Combinación "gr"',
    tipEs: 'Empieza con una "g" firme atrás de la garganta y deslízala hacia la "r" suave del inglés.',
    bridgeEs: 'Similar a "gr" en "grande", pero con la "r" suave del inglés sin vibración, como en "grab" y "grip".',
  },
  sp: {
    labelEs: 'Combinación "sp"',
    tipEs: 'Empieza directo con una "s" limpia seguida de "p", sin poner una vocal "e" antes.',
    bridgeEs: 'En español decimos "especial", pero en inglés empieza directo en "s", como en "spin" y "spot".',
  },
  st: {
    labelEs: 'Combinación "st"',
    tipEs: 'Haz una "s" rápida y toca enseguida con la lengua para la "t", sin agregar "e" al principio.',
    bridgeEs: 'A diferencia de "estar" en español, aquí empieza directo con "s", como en "stop" y "step".',
  },
  nd: {
    labelEs: 'Combinación final "-nd"',
    tipEs: 'Deja sonar la "n" al final de la vocal y cierra con una "d" clara.',
    bridgeEs: 'En inglés pronunciamos ambas letras al final de la sílaba, como en "hand" y "sand".',
  },
  mp: {
    labelEs: 'Combinación final "-mp"',
    tipEs: 'Cierra los labios para la "m" y ábrelos con un toque rápido de "p" al terminar.',
    bridgeEs: 'Escucha el cierre completo de "m" seguido de "p" al final, como en "camp" y "lamp".',
  },
  a_e: {
    labelEs: 'Vocal larga "a_e" (e muda)',
    tipEs: 'La "e" al final no suena, pero hace que la "a" diga su nombre en inglés: "ei".',
    bridgeEs: 'Compara "cap" (a corta) con "cape" (a larga /ei/). Practica con "cake", "lake" y "tape".',
  },
  i_e: {
    labelEs: 'Vocal larga "i_e" (e muda)',
    tipEs: 'La "e" al final es muda y hace que la "i" diga su nombre en inglés: "ai".',
    bridgeEs: 'Compara "bit" (i corta) con "bite" (i larga /ai/). Practica con "bike", "time" y "kite".',
  },
};

export function getSpanishRuleTip(pattern: string): SpanishRuleTip | null {
  const key = String(pattern || '').trim().toLowerCase().replace(/^short\s+/, '');
  return SPANISH_RULE_TIPS[key] || null;
}

export const WORD_GLOSSES: Record<string, WordGloss> = {
  back: { es: 'espalda / atrás', enDef: 'The rear side of something, or returning where you came from.' },
  bath: { es: 'baño', enDef: 'A wash in a tub of warm water.' },
  black: { es: 'negro', enDef: 'The darkest color, like coal or night.' },
  blip: { es: 'punto en el radar / breve señal', enDef: 'A quick small dot on a screen or a brief sudden change.' },
  blob: { es: 'gota espesa / masa', enDef: 'A soft, thick drop or shapeless lump of something.' },
  block: { es: 'bloque / bloquear', enDef: 'A solid square piece, or to stop something from getting past.', cognate: true },
  blot: { es: 'mancha / secar a toques', enDef: 'A dark spot of ink or liquid, or to dab liquid away.' },
  blush: { es: 'sonrojarse', enDef: 'To turn pink or red in the face from shyness or heat.' },
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
  clam: { es: 'almeja', enDef: 'A sea creature that lives inside a two-part shell.' },
  clap: { es: 'aplaudir', enDef: 'To strike your hands together to make a sharp sound.' },
  clip: { es: 'sujetador / recortar', enDef: 'A small fastener that holds things together, or a short video segment.', cognate: true },
  clock: { es: 'reloj', enDef: 'A device that shows the time of day.' },
  clog: { es: 'atascar / tapar', enDef: 'To block a pipe or path so nothing flows through.' },
  club: { es: 'club / garrote', enDef: 'A group of people who meet for an activity, or a heavy stick.', cognate: true },
  cob: { es: 'mazorca', enDef: 'The center core of an ear of corn.' },
  cub: { es: 'cachorro', enDef: 'A young bear, lion, or wolf.' },
  cut: { es: 'cortar', enDef: 'To slice or divide with a blade or scissors.' },
  deck: { es: 'cubierta / mazo', enDef: 'The flat floor of a ship, or a full set of playing cards.' },
  den: { es: 'guarida', enDef: 'A wild animal home, or a cozy room.' },
  dig: { es: 'cavar', enDef: 'To break up and move dirt or earth.' },
  dish: { es: 'plato', enDef: 'A plate or bowl used to serve food.' },
  dock: { es: 'muelle', enDef: 'A wooden or stone platform where boats tie up.' },
  dot: { es: 'punto', enDef: 'A tiny round mark or spot.' },
  dug: { es: 'cavó', enDef: 'Past tense of dig (made a hole in the ground).' },
  fan: { es: 'ventilador / aficionado', enDef: 'A machine that blows air, or a loyal supporter.' },
  fed: { es: 'alimentó', enDef: 'Past tense of feed (gave food to).' },
  fin: { es: 'aleta', enDef: 'A flat wing-like part on a fish or shark.' },
  fit: { es: 'en forma / quedar bien', enDef: 'Healthy and strong, or the right size.' },
  fog: { es: 'niebla', enDef: 'Thick low clouds near the ground.' },
  fresh: { es: 'fresco / nuevo', enDef: 'Clean, cool, or newly made.', cognate: true },
  fret: { es: 'preocuparse / traste', enDef: 'To feel worried and tense, or a metal bar on a guitar neck.' },
  frill: { es: 'volante / adorno extra', enDef: 'A decorative pleated edge or an unnecessary extra.' },
  frock: { es: 'túnica / vestido', enDef: 'A long loose robe or dress.' },
  frog: { es: 'rana', enDef: 'A small jumping creature that lives near water.' },
  frost: { es: 'escarcha', enDef: 'A thin layer of white ice crystals formed in freezing air.' },
  fun: { es: 'diversión', enDef: 'Something enjoyable or entertaining.' },
  gas: { es: 'gas / gasolina', enDef: 'Air-like matter, or fuel for a car.', cognate: true },
  grab: { es: 'agarrar', enDef: 'To take hold of something quickly and firmly.' },
  grid: { es: 'red / cuadrícula', enDef: 'A network of crossing lines or power stations.' },
  grin: { es: 'sonrisa amplia', enDef: 'A wide, confident smile.' },
  grip: { es: 'agarre / sujetar firme', enDef: 'A tight hold on something so it does not slip.' },
  grit: { es: 'determinación / arenilla', enDef: 'Tough courage and persistence, or tiny grains of stone.' },
  grub: { es: 'larva / comida', enDef: 'A small insect larva, or casual slang for food.' },
  hat: { es: 'sombrero / gorra', enDef: 'Something you wear on your head.' },
  hem: { es: 'dobladillo', enDef: 'The folded and stitched edge of cloth.' },
  hit: { es: 'golpear', enDef: 'To strike something with force.' },
  hot: { es: 'caliente', enDef: 'Having a high temperature.' },
  hut: { es: 'cabaña', enDef: 'A small, simple shelter or cabin.' },
  jab: { es: 'golpe rápido', enDef: 'A quick, sharp poke or punch.' },
  jet: { es: 'avión de reacción', enDef: 'A fast aircraft powered by jet engines.' },
  job: { es: 'trabajo', enDef: 'Work you do to earn pay, or a specific task.' },
  jut: { es: 'sobresalir', enDef: 'To stick out past an edge.' },
  kick: { es: 'patear / patada', enDef: 'To strike something strongly with your foot.' },
  lab: { es: 'laboratorio', enDef: 'A room equipped for science experiments.', cognate: true },
  lock: { es: 'cerradura / bloquear', enDef: 'A metal fastener that keeps a door or gate shut.' },
  log: { es: 'tronco / registro', enDef: 'A thick cut piece of tree trunk, or a written record.' },
  luck: { es: 'suerte', enDef: 'Good fortune that happens by chance.' },
  map: { es: 'mapa', enDef: 'A drawing showing roads, places, or land.', cognate: true },
  mash: { es: 'machacar', enDef: 'To crush soft food into a smooth mix.' },
  math: { es: 'matemáticas', enDef: 'The study of numbers, patterns, and problem solving.' },
  men: { es: 'hombres', enDef: 'More than one adult man.' },
  mix: { es: 'mezclar', enDef: 'To combine two or more things together.', cognate: true },
  mop: { es: 'trapeador', enDef: 'A long-handled tool used to wash floors.' },
  moth: { es: 'polilla', enDef: 'A night-flying insect drawn toward bright lights.' },
  much: { es: 'mucho', enDef: 'A large amount of something.', cognate: true },
  mug: { es: 'taza', enDef: 'A heavy cup with a handle for hot drinks.' },
  net: { es: 'red', enDef: 'Woven mesh used to catch fish or stop a ball.' },
  pack: { es: 'paquete / mochila', enDef: 'A bundle of items, or a bag carried on your back.', cognate: true },
  pad: { es: 'almohadilla / plataforma', enDef: 'A soft cushion, notepad, or flat stone base.' },
  path: { es: 'sendero / camino', enDef: 'A track or road built for walking or travel.' },
  peg: { es: 'clavija', enDef: 'A short pin or hook used to hold or hang things.' },
  pen: { es: 'pluma / bolígrafo', enDef: 'A tool that writes with ink.' },
  pin: { es: 'alfiler', enDef: 'A thin pointed metal fastener.', cognate: true },
  pod: { es: 'vaina / cápsula', enDef: 'A seed case like a pea pod, or a small capsule.' },
  pun: { es: 'juego de palabras', enDef: 'A joke that plays on words sounding alike.' },
  red: { es: 'rojo', enDef: 'The bright color of fire or ripe apples.' },
  rich: { es: 'rico', enDef: 'Having lots of wealth, or full of deep flavor.', cognate: true },
  rip: { es: 'rasgar', enDef: 'To tear paper or cloth apart quickly.' },
  rock: { es: 'roca / piedra', enDef: 'A solid chunk of stone from the earth.', cognate: true },
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
  that: { es: 'ese / esa', enDef: 'Points to a specific person or object over there.' },
  then: { es: 'entonces / luego', enDef: 'At that time, or what happens next.' },
  thin: { es: 'delgado', enDef: 'Narrow or slim, with little thickness.' },
  top: { es: 'cima / parte superior', enDef: 'The highest point or upper surface.' },
  tub: { es: 'tina / bañera', enDef: 'A wide container for washing or holding water.' },
  tug: { es: 'tirar / jalar', enDef: 'To pull hard on something.' },
  vet: { es: 'veterinario', enDef: 'A doctor who treats sick or injured animals.' },
  web: { es: 'telaraña / red', enDef: 'A net spun by a spider, or an interconnected network.' },
  wham: { es: 'golpe fuerte', enDef: 'A sudden, loud crash or heavy impact.' },
  when: { es: 'cuándo', enDef: 'Asks or tells the time something happens.' },
  which: { es: 'cuál', enDef: 'Asks you to choose from a group of options.' },
  whim: { es: 'capricho', enDef: 'A sudden urge or playful idea.' },
  whip: { es: 'látigo / batir', enDef: 'A flexible cord that snaps fast, or to stir quickly.' },
  whiz: { es: 'genio / pasar zumbando', enDef: 'Someone very skilled at a task, or to zip past fast.' },
  win: { es: 'ganar', enDef: 'To succeed or come out ahead in a contest.' },
  with: { es: 'con', enDef: 'Together beside someone or using a tool.' },
  zap: { es: 'descarga', enDef: 'A sudden quick burst of electric energy.' },
  zip: { es: 'cierre / pasar rápido', enDef: 'To close a zipper, or move very quickly.' },
  band: { es: 'banda / cinta', enDef: 'A musical group, or a flat strip wrapped around something.', cognate: true },
  bend: { es: 'doblar', enDef: 'To curve or fold something out of a straight shape.' },
  blast: { es: 'explosión / ráfaga', enDef: 'A sudden strong burst of air, sound, or energy.' },
  blend: { es: 'mezclar / combinar', enDef: 'To mix two or more sounds or things smoothly together.' },
  blink: { es: 'parpadear', enDef: 'To shut and open your eyes quickly, or flash on and off.' },
  bump: { es: 'golpe / bache', enDef: 'A light knock against something, or a raised spot on a road.' },
  camp: { es: 'campamento', enDef: 'An outdoor base with tents or cabins.', cognate: true },
  hand: { es: 'mano', enDef: 'The end of your arm with fingers and a thumb.' },
  jump: { es: 'saltar', enDef: 'To push off the ground into the air with your legs.' },
  lamp: { es: 'lámpara', enDef: 'A device that gives off steady light.', cognate: true },
  land: { es: 'tierra / aterrizar', enDef: 'Solid ground, or to come down safely from the air.' },
  pump: { es: 'bomba / bombear', enDef: 'A machine that pushes water, air, or fuel through pipes.' },
  ramp: { es: 'rampa', enDef: 'A sloped surface linking a lower level to a higher one.', cognate: true },
  sand: { es: 'arena', enDef: 'Tiny loose grains of rock found on beaches and deserts.' },
  send: { es: 'enviar', enDef: 'To make a message, item, or unit go somewhere.' },
  span: { es: 'tramo / alcance', enDef: 'The full distance from one end of a bridge or time period to the other.' },
  sped: { es: 'aceleró / corrió rápido', enDef: 'Past tense of speed (moved very quickly).' },
  spin: { es: 'girar', enDef: 'To turn around fast in circles.' },
  spit: { es: 'escupir', enDef: 'To force liquid or sparks quickly out of the mouth or a nozzle.' },
  spot: { es: 'punto / lugar', enDef: 'A small round mark, a specific place, or to notice something.' },
  spun: { es: 'giró / hiló', enDef: 'Past tense of spin (turned rapidly or twisted fibers into thread).' },
  stag: { es: 'ciervo macho', enDef: 'An adult male deer with branching antlers.' },
  stem: { es: 'tallo', enDef: 'The main upright stalk that supports a plant or flower.' },
  step: { es: 'paso / escalón', enDef: 'One movement of your foot when walking, or a flat stair.' },
  stop: { es: 'parar / alto', enDef: 'To come to a complete halt and stay still.' },
  stub: { es: 'trozo / talón de boleto', enDef: 'A short leftover end of a pencil or ticket.' },
  stun: { es: 'aturdir', enDef: 'To shock or freeze someone in place for a brief moment.' },
  this: { es: 'esto / este', enDef: 'Points to a specific person or object right here.' },
  cake: { es: 'pastel', enDef: 'A sweet baked dessert often served at celebrations.' },
  make: { es: 'hacer / crear', enDef: 'To build, create, or put something together.' },
  lake: { es: 'lago', enDef: 'A large body of fresh water surrounded by land.' },
  tape: { es: 'cinta adhesiva', enDef: 'A sticky strip used to hold paper or boxes together.' },
  cape: { es: 'capa', enDef: 'A sleeveless cloak worn over the shoulders.', cognate: true },
  gate: { es: 'portón / puerta', enDef: 'A hinged barrier that opens an entry through a fence or wall.' },
  late: { es: 'tarde', enDef: 'Arriving or happening after the expected time.' },
  game: { es: 'juego', enDef: 'An activity or contest with rules and a goal.' },
  name: { es: 'nombre', enDef: 'The word used to identify a person, place, or thing.' },
  made: { es: 'hizo / fabricó', enDef: 'Past tense of make (built or created something).' },
  bike: { es: 'bicicleta', enDef: 'A two-wheeled vehicle powered by pedals.' },
  hike: { es: 'caminata', enDef: 'A long walk outdoors along a mountain or forest trail.' },
  like: { es: 'gustar / como', enDef: 'To enjoy something, or similar to something else.' },
  time: { es: 'tiempo / hora', enDef: 'Minutes and hours on a clock, or a moment in a day.' },
  dime: { es: 'moneda de 10 centavos', enDef: 'A small silver U.S. coin worth ten cents.' },
  line: { es: 'línea / fila', enDef: 'A straight mark, or a row of people waiting in order.', cognate: true },
  pine: { es: 'pino', enDef: 'A tall evergreen tree with needles and cones.', cognate: true },
  kite: { es: 'cometa / papalote', enDef: 'A light frame flown in the wind on a long string.' },
  bite: { es: 'morder', enDef: 'To grip or cut into food with your teeth.' },
  ride: { es: 'montar / viajar', enDef: 'To travel on a bike, horse, bus, or train.' },
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
  rail: {
    nameEs: 'Torreta Riel',
    descEs: 'Cañón electromagnético que atraviesa armaduras pesadas por tierra y aire.',
    spec: {
      a: {
        nameEs: 'Riel Perforador',
        descEs: 'Dispara un rayo veloz que atraviesa hasta 4 enemigos en línea recta.',
      },
      b: {
        nameEs: 'Bobina Rompeescudos',
        descEs: 'Golpe devastador que rompe la armadura enemiga por 5 segundos para todas tus torres.',
      },
    },
  },
  gravity: {
    nameEs: 'Trampa de Gravedad',
    descEs: 'Vórtice en el sendero que jala hacia atrás a enemigos terrestres y voladores.',
    spec: {
      a: {
        nameEs: 'Pozo Singular',
        descEs: 'Jala enemigos hacia atrás con fuerza y rompe su armadura durante 4 segundos.',
      },
      b: {
        nameEs: 'Ancla de Estasis',
        descEs: 'Congela por completo a cada enemigo atrapado dentro del vórtice cada pocos segundos.',
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
    titleEs: 'Coloca tu torre en terreno abierto',
    bodyEs: 'Mueve el cursor por cualquier terreno abierto junto al camino hasta que el aro se ponga verde y haz clic para construir. Clic derecho cancela.',
  },
  {
    titleEs: 'Protege el sendero',
    bodyEs: 'Te quedan 45 cristales. Haz clic en Foso de Púas abajo, muévelo sobre el camino iluminado hasta que se ponga verde y haz clic para colocarlo.',
  },
  {
    titleEs: 'Forja palabras para ganar cristales',
    bodyEs: 'Mira la Forja de Runas a la derecha. Presiona SAY IT o escucha las opciones 1, 2, 3 y pulsa Forge.',
  },
  {
    titleEs: 'Mejora o reubica defensores',
    bodyEs: 'Haz clic en cualquier defensor del mapa para ver su alcance, mejorarlo a Nivel 3 o venderlo para construir en otro lugar.',
  },
  {
    titleEs: 'Sellos de Grieta y Poderes',
    bodyEs: 'Llena los Sellos de Grieta (a e i) abajo a la izquierda con lecturas limpias para ganar +100 cristales extra y abrir la Oleada Final. Usa Impulso, Meteoro y Congelar arriba.',
  },
  {
    titleEs: 'Listo para la Oleada 1',
    bodyEs: '¡Todo listo! Pulsa Finish para cerrar esta guía y sigue forjando palabras o haz clic en Send now en la barra superior cuando estés listo para la Oleada 1.',
  },
];

export const SPANISH_CUTSCENE_CAPTIONS: Record<string, string[]> = {
  'l01-open-v2-1': [
    'Brecha en el Borde Espinoso. Los Espectros y Espinosos avanzan por el sendero.',
    'Lee palabras en la Forja de Runas para cargar nuestros cristales.',
  ],
  'l01-open-v2-2': [
    'Cuatro defensas listas: coloca Torres de Arqueros y Tótems de Escarcha en cualquier terreno abierto junto al camino.',
    'Pon Fosos de Púas y Gólems de Piedra en cualquier parte del camino para detener la oleada.',
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
  'w2-l02-open-v1-1': [
    'Portadores de Escudo blindados marchan por el viaducto de la Calzada del Crisol.',
    'Sus escudos de hierro reducen casi la mitad del daño normal.',
  ],
  'w2-l02-open-v1-2': [
    'Nueva torre lista: la Torreta Riel atraviesa armaduras pesadas por tierra y aire.',
    'Usa el botón Loadout para elegir tus 6 defensores y sella los dígrafos "th", "wh" y "-ck".',
  ],
  'w2-l02-vic-v1-1': [
    '¡Calzada del Crisol despejada! Las Torretas Riel destrozaron la columna blindada.',
    'Tus lecturas limpias de "th", "wh" y "-ck" sellaron la grieta del viaducto.',
  ],
  'w2-l02-vic-v1-2': [
    'Más allá del humo se alzan las torres del Cruce de Hierro.',
    'Próxima etapa: Cruce de Hierro con Chilladores voladores blindados.',
  ],
  'w2-l02-def-v1-1': [
    'Los Portadores de Escudo resistieron el fuego ligero y alcanzaron el Ancla.',
    'Consejo: coloca una Torreta Riel cerca de la curva central para perforar su armadura.',
  ],
  'w2-l03-open-v1-1': [
    'Chilladores de Grieta blindados descienden desde el cielo sobre el Cruce de Hierro.',
    'Vuelan sobre los Fosos de Púas y Gólems, y sus placas de acero bloquean flechas ligeras.',
  ],
  'w2-l03-open-v1-2': [
    'Combina Torretas Riel y Agujas Tesla en la isla central para despejar los cielos.',
    'Sella las combinaciones "bl", "cl", "fr" y "gr" en la Forja para abrir la Oleada Final.',
  ],
  'w2-l03-vic-v1-1': [
    '¡Cruce de Hierro asegurado! Los Chilladores blindados huyeron sobre el abismo.',
    'Tus lecturas limpias de "bl", "cl", "fr" y "gr" mantuvieron firme la defensa aérea.',
  ],
  'w2-l03-vic-v1-2': [
    'Más allá del puente arde el Bastión del Crisol, última barrera antes del núcleo.',
    'Nivel 3 completado. Próxima etapa: Bastión del Crisol.',
  ],
  'w2-l03-def-v1-1': [
    'Los Chilladores blindados cruzaron el cielo y golpearon el Ancla.',
    'Consejo: coloca Torretas Riel y Agujas Tesla en el centro con un Tótem de Escarcha para frenarlos.',
  ],
  'w2-l04-open-v1-1': [
    'El Bastión del Crisol protege la entrada al Núcleo del Horno.',
    'Los Tejedores de Forja curan y protegen con escudos dorados a los enemigos cercanos hasta caer.',
  ],
  'w2-l04-open-v1-2': [
    'Nueva trampa desbloqueada: la Trampa de Gravedad jala hacia atrás a enemigos terrestres y voladores.',
    'Llena los Sellos "sp", "st", "nd" y "mp" en la Forja para abrir la Oleada Final.',
  ],
  'w2-l04-vic-v1-1': [
    '¡Bastión del Crisol asegurado! Todos los Tejedores de Forja cayeron.',
    'Tus lecturas limpias de "sp", "st", "nd" y "mp" quebraron la línea del bastión.',
  ],
  'w2-l04-vic-v1-2': [
    'Las grandes puertas se abren hacia el Núcleo del Horno.',
    'Final del Mundo 2 desbloqueado: el Guardián de Hierro te espera adentro.',
  ],
  'w2-l04-def-v1-1': [
    'Los Tejedores de Forja mantuvieron en pie la columna blindada.',
    'Consejo: coloca una Trampa de Gravedad en la curva con Torretas Riel arriba e inténtalo de nuevo.',
  ],
  'w2-l05-open-v1-1': [
    'Batalla Final: el Guardián de Hierro emerge desde el Núcleo del Horno.',
    'Blindado con acero volcánico y respaldado por Tejedores de Forja.',
  ],
  'w2-l05-open-v1-2': [
    'Combina Trampas de Gravedad, Torretas Riel y Agujas Tesla alrededor del anillo de lava.',
    'Sella los cinco Sellos del Mundo 2 y derrota al Guardián de Hierro.',
  ],
  'w2-l05-vic-v1-1': [
    '¡El Guardián de Hierro cayó y el Núcleo del Horno se enfría!',
    'Un pilar de luz del Ancla sella la última grieta volcánica de la Fundición Hundida.',
  ],
  'w2-l05-vic-v1-2': [
    '¡Dominaste todos los dígrafos y combinaciones del Mundo 2!',
    'Mundo 2: La Fundición Hundida completado.',
  ],
  'w2-l05-def-v1-1': [
    'El Guardián de Hierro logró abrirse paso por el anillo del horno.',
    'Consejo: rompe su armadura con una Torreta Riel y retenlo con una Trampa de Gravedad.',
  ],
  'w3-l01-open-v1-1': [
    'Bienvenido al Mundo 3: Las Agujas de Plata.',
    'Espectros de Vendaval avanzan con ráfagas súbitas de viento por el sendero de montaña.',
  ],
  'w3-l01-open-v1-2': [
    '¡Colocación Libre desbloqueada! Construye torres en cualquier zona de pasto y trampas en cualquier punto del camino.',
    'Domina las vocales largas con e muda ("a_e" e "i_e") para sellar la Terraza del Alba.',
  ],
  'w3-l01-vic-v1-1': [
    '¡Terraza del Alba asegurada! Tu diseño libre frenó cada ráfaga de los Espectros de Vendaval.',
    'Sellos de vocal larga "a_e" e "i_e" completados.',
  ],
  'w3-l01-vic-v1-2': [
    'Los puentes superiores de las Agujas de Plata brillan frente a ti.',
    '¡Mundo 3 · Nivel 1 completado!',
  ],
  'w3-l01-def-v1-1': [
    'Los Espectros de Vendaval cruzaron la curva exterior con su impulso de viento.',
    'Consejo: agrupa un Tótem de Escarcha y una Trampa de Gravedad en la curva central.',
  ],
  'bt-open-v1-1': [
    'Bienvenido al Entrenamiento Básico de Corredores. Veamos qué habilidades ya dominas.',
    'Muestra lo que sabes para abrir tu nivel inicial ideal en el mapa.',
  ],
  'bt-open-v1-2': [
    'Coloca defensores libremente en el pasto o sobre el camino, y lee palabras en la Forja.',
    'Cada nivel de habilidad que superes otorga +75 cristales y abre la siguiente etapa.',
  ],
  'bt-vic-v1-1': [
    '¡Entrenamiento Básico completado! Tu perfil de lectura quedó guardado.',
    'Revisa tu Reporte de Ubicación para entrar directo a tu nivel inicial recomendado.',
  ],
  'bt-def-v1-1': [
    'Buena práctica en el campo de entrenamiento. Cada palabra leída cuenta para tu ubicación.',
    'Revisa tu Reporte de Ubicación para ver qué nivel se abrió para ti.',
  ],
};

export function getCutsceneSpanishCaption(beatId: string, captionIndex: number): string | null {
  const lines = SPANISH_CUTSCENE_CAPTIONS[beatId];
  if (!lines || lines.length === 0) return null;
  return lines[Math.min(captionIndex, lines.length - 1)] || lines[0] || null;
}
