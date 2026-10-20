import { LifeArea } from '../types/life';

/** Los videos de la página "Cursos" de Notion: link, resumen, ideas clave y acciones sugeridas */
export interface LibraryCourse {
  title: string;
  author: string;
  area: LifeArea;
  youtubeId: string;
  minutes: number | null;
  summary: string;
  keyIdeas: string[];
  actions: string[];
}

export const COURSE_LIBRARY: LibraryCourse[] = [
  {
    "title": "Cómo gestionar tu dinero: guía de finanzas personales",
    "author": "Adrià Solà Pastor",
    "area": "finanzas",
    "youtubeId": "40nEm-3zaAs",
    "minutes": 21,
    "summary": "Un plan financiero en pasos: primero saldás deudas, después armás un fondo de emergencia, definís un presupuesto mensual y automatizás ahorro e inversión. La idea central es que cómo manejás poco determina cómo vas a manejar mucho, así que conviene empezar ya, aunque tengas poca plata.",
    "keyIdeas": [
      "Cómo manejás 10 define cómo vas a manejar 100, 1.000 o un millón: el hábito se construye con poco.",
      "Primer paso: saldar deudas con el método bola de nieve, de la más chica a la más grande, para ganar impulso.",
      "Matemáticamente conviene más atacar primero la deuda con mayor interés, si tenés la cabeza para sostenerlo.",
      "Deuda para activos que rinden puede tener sentido; deuda para consumo o aparentar casi nunca.",
      "Fondo de emergencia de 3 a 6 meses de gastos: da paz, evita préstamos caros y no te obliga a vender inversiones.",
      "La inflación erosiona el ahorro quieto; conviene tenerlo en una cuenta que pague algún interés.",
      "Presupuesto 60/20/10/10: 60% gastos fijos, 20% gastos libres de culpa, 10% ahorro y 10% inversión.",
      "A los gastos fijos sumales un 15% extra para imprevistos, y en los libres de culpa aprendé a priorizar.",
      "Págate a vos primero: invertí automáticamente cada mes en fondos indexados diversificados y de bajo costo.",
      "Sistema de cuatro cuentas con transferencias automáticas: principal, emergencia, inversión y ahorros por objetivos."
    ],
    "actions": [
      "Hacé una lista de todas tus deudas ordenadas de menor a mayor y definí cuánto extra vas a pagar a la más chica este mes.",
      "Calculá tu presupuesto con la regla 60/20/10/10 sobre tu ingreso real y anotá cuánto va a cada categoría.",
      "Programá una transferencia automática el día de cobro hacia tu fondo de emergencia o ahorro, aunque sea un monto chico."
    ]
  },
  {
    "title": "Cuando ganes dinero, comprá estas 8 cosas cuanto antes",
    "author": "Adrià Solà Pastor",
    "area": "finanzas",
    "youtubeId": "Kb0SnsTAbwM",
    "minutes": 19,
    "summary": "Plantea que la plata no es para aparentar sino para recuperar tiempo y potenciar tu crecimiento cuando subís de nivel. Propone ocho 'mejoras' en las que invertir a medida que crecen tus ingresos, desde un hobby y un mentor hasta delegar tareas e invertir.",
    "keyIdeas": [
      "La vida funciona por niveles: lo que te trajo hasta acá no alcanza para llevarte al siguiente.",
      "Cada peso es un 'soldadito' que debería multiplicar tu esfuerzo y devolverte tiempo, no comprar apariencia.",
      "Comprá un hobby: la mente cansada se recupera activando otra parte de ella, como Churchill pintando.",
      "Comprá una identidad: viajes y experiencias en entornos nuevos te permiten probar una versión más fuerte de vos.",
      "Comprá un mentor: aprender de quien ya recorrió el camino acelera todo; empezá con libros y podcasts y subí de nivel.",
      "No escatimes en 'objetos vitales' de uso diario (colchón, silla, computadora, zapatos): lo barato termina saliendo caro.",
      "Mejorá tu ropa: no hace falta que sea cara, sino que te quede bien y te haga sentir a la altura de quien querés ser.",
      "Calculá cuánto vale tu hora y delegá lo que cueste menos que eso para enfocarte en lo que más rinde.",
      "Comprá dinero: invertí antes de darte gustos; empezá por fondos indexados y diversificá con el tiempo.",
      "Un 'commitment device' (algo que te obliga a crecer para merecerlo) puede subir tus estándares, si es una decisión financieramente sana."
    ],
    "actions": [
      "Calculá el valor de tu hora (ingreso mensual ÷ horas trabajadas) y elegí una tarea repetitiva para delegar o simplificar esta semana.",
      "Identificá un objeto vital de uso diario que te esté perjudicando y armá un plan para reemplazarlo por uno de calidad sin endeudarte.",
      "Reservá un bloque esta semana para un hobby que te desconecte del trabajo, como descanso activo."
    ]
  },
  {
    "title": "16 microhábitos que te cambiarán la vida según la neurociencia",
    "author": "Adrià Solà Pastor",
    "area": "personal",
    "youtubeId": "fumBhLt9U0I",
    "minutes": 17,
    "summary": "Los resultados de hoy los sembraste hace un año, y lo que cosechás depende de pequeñas decisiones diarias. El video propone una serie de microhábitos simples, casi sin costo, que van moldeando tu identidad, y recomienda incorporar uno por semana.",
    "keyIdeas": [
      "Lo que cosechás en un año lo estás sembrando hoy con microdecisiones repetidas.",
      "Visualizá tu día (no tu vida soñada) dos minutos a la mañana: problemas, obstáculos y decisiones que vas a enfrentar.",
      "'Una más': cuando quieras parar, hacé una repetición, una página o un minuto más para correr tus límites.",
      "Cuidá tu autodiálogo: cambiá 'tengo que' por 'elijo' o 'quiero'.",
      "Antes de decidir, preguntate si actuás desde el amor o desde el miedo disfrazado de prudencia.",
      "Decisión lenta, acción rápida: pensá bien, pero una vez decidido, ejecutá sin demora.",
      "Acción mínima viable: una acción tan chica que sea imposible fallar, como leer una página por día.",
      "Comete la rana: hacé primero a la mañana la tarea más pesada del día.",
      "Microhábitos relacionales: usar el nombre del otro, mirar a los ojos y sonreír, abrazos largos y pedir perdón rápido.",
      "Agradecer antes de comer entrena la presencia; incorporá un solo microhábito por semana."
    ],
    "actions": [
      "Elegí un solo microhábito para esta semana (por ejemplo, la acción mínima viable o 'comete la rana') y marcá cada día que lo cumplas.",
      "Antes de empezar el día, dedicá 2 minutos a orar o visualizar los desafíos concretos del día y cómo vas a responder.",
      "Agradecé antes de cada comida y usá el nombre de cada persona con la que hables."
    ]
  },
  {
    "title": "Cómo hacer preguntas que hacen que las personas te adoren",
    "author": "Adrià Solà Pastor",
    "area": "amigos",
    "youtubeId": "D8I1RcwKtV4",
    "minutes": 21,
    "summary": "La gente recuerda cómo la hiciste sentir, y nada hace sentir mejor que ser escuchado de verdad. El video explica tres errores al preguntar y cómo hacer preguntas abiertas, follow-ups y progresar en profundidad para generar conexión genuina.",
    "keyIdeas": [
      "Para caer bien no hace falta ser gracioso o interesante: hace falta preguntar más y escuchar de verdad.",
      "En toda charla hay dos conversaciones: los hechos y lo que hay debajo (deseos, valores, vulnerabilidades).",
      "Captá las 'migas' que deja el otro e invitalo a desarrollar lo que realmente le importa.",
      "Cambiá preguntas cerradas (¿tenés?, ¿te gusta?) por abiertas (qué, cómo, de qué manera), y preguntá por el hacer.",
      "Estructura mejor/peor: qué es lo que más te gusta y qué cambiarías si estuviera en tus manos.",
      "El follow-up es recorrer la casa después de abrir la puerta; usá la técnica del eco repitiendo sus últimas palabras.",
      "Regla 3-2-1: si después de varias preguntas el otro no pregunta nada sobre vos, la conversación ya dio lo que tenía.",
      "Leé las señales: postura, mirada y hacia dónde apuntan los pies indican interés o ganas de irse.",
      "Cinco niveles de conversación: clichés, hechos, opiniones, sentimientos y sueños; la conexión real vive en los dos últimos.",
      "Acolchá preguntas sensibles dándole al otro el control, y compartí primero algo vulnerable; nunca uses estas técnicas para manipular."
    ],
    "actions": [
      "En tus próximas tres conversaciones, reemplazá el '¿cómo estás?' por '¿qué tenés esta semana que te tenga entusiasmado?' y hacé al menos dos follow-ups.",
      "Después de una charla importante, mandá un mensaje recordando algo que te contó (un libro, un plan, una preocupación).",
      "Practicá una pregunta de nivel 4 o 5 con alguien de confianza, acolchándola con 'no hace falta que me respondas si no querés'."
    ]
  },
  {
    "title": "Dame 16 minutos y te haré peligrosamente constante",
    "author": "Adrià Solà Pastor",
    "area": "personal",
    "youtubeId": "-zm6daF4OeQ",
    "minutes": 16,
    "summary": "La constancia no sale de la motivación ni de la fuerza de voluntad, sino de transformar tu identidad con sistemas. El video identifica tres saboteadores que parecen virtudes y propone cuatro piezas para armar un sistema que te haga constante.",
    "keyIdeas": [
      "Saboteador 1, el todo o nada: si solo aceptás dar el 100%, todo lo demás se vuelve cero; dá el máximo que tengas ese día.",
      "Saboteador 2, recompensas secuestradas: la dopamina funciona como balanza; si arrancás con estímulos fáciles, lo difícil se vuelve cuesta arriba.",
      "Hacé primero lo difícil y dejá los estímulos placenteros para el final del día.",
      "Saboteador 3, el efecto 'ya fue': lo que te hunde no es el fallo chico sino la sentencia que te dictás después.",
      "La identidad sostiene la constancia: 'no soy fumador' es más fuerte que 'estoy intentando dejar de fumar'.",
      "Pequeños compromisos construyen identidad, como la pegatina que después llevó a aceptar el cartel grande.",
      "Pieza 1, acción mínima viable: algo tan chico que sea ridículo postergarlo (una página, una línea, 5 minutos).",
      "Pieza 2, ingeniería del entorno: que lo bueno sea fácil y lo malo incómodo.",
      "Pieza 3, accountability partner: comprometete en voz alta con alguien que respetes, como empujón inicial.",
      "Pieza 4, aumentar la consciencia con hábitos como rezar, escribir, caminar o meditar."
    ],
    "actions": [
      "Definí tu acción mínima viable para el hábito que más te cuesta y hacela todos los días de esta semana, aunque sea al 30%.",
      "Cambiá una cosa de tu entorno hoy (celular fuera del cuarto, ropa de gimnasio lista, Biblia o libro a la vista).",
      "Contale a una persona de confianza tu compromiso de la semana y pedile que te pregunte el domingo cómo te fue."
    ]
  },
  {
    "title": "Dame 22 minutos y hablarás mejor que el 99% de las personas",
    "author": "Adrià Solà Pastor",
    "area": "personal",
    "youtubeId": "Idv3ltBYfB0",
    "minutes": 22,
    "summary": "Comunicar no es lo que decís sino lo que el otro entiende, recuerda y siente. El video repasa tres errores (vocabulario pobre, falta de estructura y voz monótona) y da tres consejos: priorizar la emoción, hacer preguntas profundas y cuidar el lenguaje no verbal.",
    "keyIdeas": [
      "El mundo te juzga por tus palabras, no por tus intenciones; ampliá tu vocabulario para transmitir profundidad.",
      "Las palabras cargan valor: 'quiero trabajar' transmite otra energía que 'tengo que trabajar'.",
      "El cerebro rechaza el caos: ordená tus ideas y hablá con estructura y claridad.",
      "Tu voz es un instrumento: evitá muletillas, variá tono y ritmo, y no le tengas miedo a las pausas.",
      "La gran epifanía: comunicar es lo que el otro entiende y recuerda, no lo que vos decís.",
      "Priorizá el beneficio emocional sobre el racional: dolor o deseo de la audiencia, imagen vívida y datos solo como respaldo.",
      "Usá 'preguntas de francotirador' con intención emocional en vez de preguntas cerradas.",
      "Una buena pregunta a tu jefe ('¿qué habilidad me falta para el próximo nivel?') puede cambiar tu rumbo.",
      "El cuerpo reacciona más rápido al lenguaje no verbal que a las palabras; la incongruencia destruye credibilidad.",
      "Rutina de presencia: sonrisa, manos visibles y relajadas, y contacto visual natural."
    ],
    "actions": [
      "Grabate 2 minutos hablando de un tema al azar y contá tus muletillas; repetilo al final de la semana para comparar.",
      "Antes de tu próxima reunión o charla importante, ordená tu mensaje en tres puntos y una imagen emocional concreta.",
      "Preguntale a tu jefe o a un referente qué habilidad te falta para crecer y anotá la respuesta."
    ]
  },
  {
    "title": "Si tuviera que hacerme rico desde cero, esto es lo que haría",
    "author": "Luis Monge Malo",
    "area": "trabajo",
    "youtubeId": "lFzUJkgdVZY",
    "minutes": 22,
    "summary": "Un emprendedor que vendió su empresa cuenta qué haría para generar riqueza desde cero: elegir rápido un producto que se venda, cubrir lo básico con ingresos mínimos y salir a buscar clientes sin parar. Insiste en la responsabilidad personal, escuchar al cliente y estudiar ventas.",
    "keyIdeas": [
      "Clasificate con honestidad: empresario en jaula de oro, autoempleado, soldado corporativo o 'niño chico' que culpa a la suerte.",
      "Identificá y apartá las excusas típicas de tu categoría antes de actuar.",
      "Cuanta más importancia le das a lo que no controlás, menos control tenés (idea de Epicteto).",
      "Paso 1: elegí en una semana un producto que se venda y tenga margen, no el que te apasiona.",
      "La plata se hace satisfaciendo los gustos y necesidades de otros, no los propios.",
      "Paso 2 (opcional): cubrí lo mínimo con ingresos flexibles, como dar clases, y bajá tus costos.",
      "Paso 3: clientes. Contale a todo el mundo a qué te dedicás y pedí referidos constantemente.",
      "Mantené el contacto de forma constante; escuchá mucho más de lo que hablás y ofrecé según lo que el otro pide.",
      "Intentá cerrar siempre y analizá cada fracaso con autocrítica, aunque la mayoría de las veces te digan que no.",
      "Exponete públicamente y dedicale unos años de foco intenso a vender y aprender ventas."
    ],
    "actions": [
      "Escribí en una línea qué ofrecés (producto, servicio o tu trabajo) y contáselo esta semana a 10 personas de tu entorno.",
      "Pedile a 3 contactos que te presenten a alguien que podría necesitar lo que hacés.",
      "Después de cada conversación de venta, anotá qué funcionó y qué no, sin juzgarte, para ajustar el discurso."
    ]
  },
  {
    "title": "Los 6 pasos para dominar el arte de contar historias",
    "author": "Adrià Solà Pastor",
    "area": "trabajo",
    "youtubeId": "kfdzhoxjYxk",
    "minutes": 18,
    "summary": "El cerebro presta atención cuando una historia rompe lo que predice, por eso conviene romper el patrón lógico mientras se construye uno emocional. El video propone seis pasos para contar historias que atrapen, desde la inmersión hasta una moraleja que deje huella.",
    "keyIdeas": [
      "El cerebro intenta predecir el futuro; cuando la historia rompe esa predicción, captura toda la atención.",
      "Paso 1, experiencia inmersiva: alineá cuerpo, voz y emoción con lo que contás.",
      "Usá la pirámide de Freytag: subí volumen y ritmo hacia el clímax y bajalos en el desenlace.",
      "Paso 2, lenguaje sensorial: describí detalles concretos de los sentidos en vez de frases genéricas.",
      "Paso 3, estructura clara (contexto, personajes, hilo) con un giro inesperado, como en la parábola del hijo pródigo.",
      "Paso 4, conflicto: sin un enemigo no hay transformación; puede ser una idea, como la mediocridad.",
      "Confrontar, y no solo proponer, hace que la audiencia tome partido y se enganche.",
      "Paso 5, espejo estructural: abrir y cerrar con el mismo elemento da una sensación de cierre completo.",
      "Paso 6, moraleja: lo que vuelve memorable una historia es la lección que cambia cómo vive el oyente.",
      "Tus historias más dolorosas suelen ser las que más pueden inspirar a otros."
    ],
    "actions": [
      "Elegí una experiencia personal y escribila con estructura: contexto, conflicto, giro, cierre espejo y moraleja.",
      "Reescribí una frase genérica de tu historia con al menos dos detalles sensoriales concretos.",
      "Contá esa historia en voz alta a alguien esta semana cuidando subir la tensión hacia el clímax y bajar al final."
    ]
  },
  {
    "title": "Cuando comprendí cómo funciona la manifestación mi vida cambió",
    "author": "Adrià Solà Pastor",
    "area": "personal",
    "youtubeId": "IEAVvDA6KR0",
    "minutes": 20,
    "summary": "El autor presenta un 'protocolo de manifestación' basado en creencias, frecuencia o vibración, identidad y normalizar lo logrado. Más allá del marco de la ley de atracción, varias ideas se pueden leer en clave práctica: tus creencias y tu identidad condicionan cómo actuás, y sin acción no pasa nada.",
    "keyIdeas": [
      "El autor sostiene que tu vida externa refleja creencias internas, muchas heredadas de familia, escuela y cultura.",
      "Creencias negativas sobre el dinero o el éxito pueden llevarte a autosabotearte sin darte cuenta.",
      "El sistema de activación reticular hace que notes más aquello en lo que ponés foco.",
      "El video propone una 'escala de vibraciones' (de la culpa y el miedo a la gratitud, la paz y el amor), concepto de la ley de atracción.",
      "Mismo mundo, distinta mirada: interpretar los desafíos como preparación cambia cómo respondés.",
      "Según el autor, las afirmaciones vacías no alcanzan; propone ensayar con emoción y detalle la meta.",
      "Su fórmula es 'frecuencia más acción inspirada': sin acción concreta, lo interno no se traduce en resultados.",
      "Siempre actuás en coherencia con quién creés que sos; la pregunta clave es en quién necesitás convertirte.",
      "Si cambiás hábitos solo esperando una recompensa, aparece el apego y la ansiedad.",
      "Cuando logres algo, agradecelo y normalizalo como tu nuevo punto de partida en vez de tratarlo como excepción."
    ],
    "actions": [
      "Escribí tres creencias que tenés sobre el dinero o el éxito y contrastalas con lo que dice la Biblia sobre la provisión, el trabajo y la mayordomía.",
      "Definí la identidad que querés vivir (por ejemplo, 'soy alguien disciplinado y agradecido') y elegí una acción concreta diaria que la confirme.",
      "Cada noche anotá tres cosas por las que das gracias a Dios, incluso en medio de los desafíos."
    ]
  },
  {
    "title": "Cómo cambiar tu vida en 6 meses: desaparecé y conseguí tu vida ideal",
    "author": "Adrià Solà Pastor",
    "area": "personal",
    "youtubeId": "IrMaRSeSPgA",
    "minutes": 22,
    "summary": "Un protocolo de seis pasos para transformar tu vida en seis meses: visión y antivisión, misión con plan concreto, autoconcepto, energía y entorno, rutina de alto rendimiento y manejo de los momentos oscuros. Parte de la responsabilidad personal: sos el resultado de tus decisiones pasadas.",
    "keyIdeas": [
      "Sos el producto de tus decisiones, acciones y pensamientos; el cambio empieza asumiendo esa responsabilidad.",
      "Visión y antivisión: describí con detalle el futuro que querés y el que querés evitar (cuerpo, plata, vínculos, rutina, energía).",
      "Por aversión a la pérdida, la antivisión genera más urgencia que el deseo.",
      "Una visión sin acción es ilusión: definí una prioridad medible, hacé ingeniería inversa y dividila por semanas.",
      "Bloqueá tiempo en la agenda y hacé una auditoría semanal de tu progreso.",
      "Primero hacés, después sos: la identidad se construye actuando como tu yo ideal.",
      "Cuidá tu energía y tu entorno: lugares y personas te elevan o te drenan.",
      "Rutina de alto rendimiento: hábitos no negociables, 4 horas de foco, dominio de la dopamina y aprender una habilidad de alto valor.",
      "Para los momentos oscuros usá el 'zooming out': mirá el problema desde 5 años adelante y desde tu yo ideal.",
      "Ante cada decisión preguntate: ¿esto me acerca a mi visión o a mi antivisión?"
    ],
    "actions": [
      "Escribí tu visión y tu antivisión a 6 meses en al menos cuatro áreas (cuerpo, finanzas, relaciones, fe/rutina).",
      "Elegí una prioridad medible, desglosala en una tarea semanal y bloqueá ese tiempo en tu calendario.",
      "Hacé tu primera auditoría semanal el domingo: qué avanzó, qué falló y qué ajustás."
    ]
  },
  {
    "title": "Millonario te explica en 10 minutos cómo organizar tu día",
    "author": "Darío Carrasco",
    "area": "personal",
    "youtubeId": "r09_Ebkvfc8",
    "minutes": 10,
    "summary": "Un empresario que gestiona muchas empresas cuenta cómo organiza su día con disciplina, separando lo importante de lo urgente y evitando distracciones. También comparte su mirada sobre la derrota, la responsabilidad personal y cómo detectar oportunidades en problemas cotidianos.",
    "keyIdeas": [
      "Disciplina 'espartana': separar con claridad lo importante de lo urgente.",
      "Acostate sabiendo cuáles son las prioridades del día siguiente.",
      "Eliminá la 'farfolla': cortá con lo que te hace perder tiempo, como audios largos o temas irrelevantes.",
      "Organizá al equipo con una reunión breve a primera hora y un control de avance al mediodía.",
      "Liderar con transparencia, no con gritos: mostrar con claridad cuando no se cumplieron expectativas.",
      "La derrota es inevitable; la respuesta es entrenar más y subir el nivel, como en el deporte.",
      "Responsabilidad absoluta: nada de quejarse ni criticar a otros por los resultados.",
      "El éxito no es suerte: es preparación cuando aparece la oportunidad, como ir todos los días a la estación a esperar el tren.",
      "Las oportunidades están en problemas cotidianos, como las colas en un café, que la gente pagaría por resolver."
    ],
    "actions": [
      "Cada noche de esta semana anotá las 3 prioridades del día siguiente antes de dormir.",
      "Identificá una 'farfolla' que te roba tiempo (un grupo, una app, un hábito) y limitala durante 7 días.",
      "Anotá un problema cotidiano que veas esta semana y pensá qué solución pagaría la gente por tener."
    ]
  },
  {
    "title": "Cómo arruinar tu juventud en 10 pasos",
    "author": "",
    "area": "personal",
    "youtubeId": "ySvic7dgQ38",
    "minutes": 21,
    "summary": "Con ingeniería inversa, el video repasa los comportamientos que arruinan la juventud, partiendo de que frenar tu peor hábito cambia más que sumar el mejor. Cubre desde despreciar a los padres y la soberbia hasta los vicios, la comparación, descuidar la salud y rodearte de malos amigos.",
    "keyIdeas": [
      "Frenar tu peor hábito impacta más que empezar el mejor: primero tapá la fuga, después llená el vaso.",
      "No desprecies a tus padres: consultalos y agradecé, porque sus intenciones suelen ser las más puras.",
      "La soberbia, raíz de otros pecados según la Biblia, te aísla; se puede ser seguro y humilde a la vez.",
      "Sin metas ni propósito no hay dirección; una meta es un sueño con plan.",
      "Dejar de aprender es empezar a morir; cuando llega la oportunidad ya no hay tiempo de prepararse.",
      "Postergar todo hace perder ventanas de oportunidad; si no podés hacer mucho, hacé poco pero todos los días.",
      "Lo que consumís dicta lo que pensás, hacés y sos: auditá tu contenido y poné límites a las apps.",
      "Prevenir una adicción es mucho más fácil que curarla; si no la controlás, evitala y pedí ayuda.",
      "La comparación roba la alegría; la gratitud cambia tu forma de ver y actuar.",
      "Cuidá tu salud física y mental, y rodeate de amigos 'raíz' que se quedan en las buenas y en las malas."
    ],
    "actions": [
      "Identificá tu peor hábito actual y definí una acción concreta para cortarlo o reducirlo esta semana.",
      "Revisá el tiempo de pantalla de tu celular y poné un límite diario a la app que más contenido vacío te da.",
      "Llamá o escribile a tu papá o mamá (o a un mentor) para pedirle consejo sobre una decisión que estés tomando."
    ]
  }
];

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

export function findLibraryCourse(title: string): LibraryCourse | undefined {
  const k = norm(title);
  return COURSE_LIBRARY.find((c) => norm(c.title) === k);
}

export function youtubeIdFrom(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
