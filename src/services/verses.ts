/**
 * Versículo diario.
 * Texto bíblico: Reina-Valera 1960 © Sociedades Bíblicas en América Latina, 1960.
 * Renovado © Sociedades Bíblicas Unidas, 1988. Utilizado con permiso
 * (se citan menos de 500 versículos, dentro de la licencia de uso libre).
 */
import { buildIcs, dayOfYear, IcsEventInput } from '../utils/lifeUtils';
import { addDays } from '../utils/dateUtils';

export const VERSE_COPYRIGHT =
  'Reina-Valera 1960 © Sociedades Bíblicas en América Latina, 1960. Renovado © Sociedades Bíblicas Unidas, 1988.';

export type VerseTheme =
  | 'amor'
  | 'fe'
  | 'disciplina'
  | 'trabajo'
  | 'sabiduria'
  | 'familia'
  | 'paz'
  | 'identidad'
  | 'servicio'
  | 'finanzas'
  | 'fortaleza'
  | 'gratitud'
  | 'tiempo'
  | 'pureza';

export interface Verse {
  ref: string;
  text: string;
  theme: VerseTheme;
}

export const THEME_INFO: Record<VerseTheme, { label: string; emoji: string; prompt: string }> = {
  amor: { label: 'Amor', emoji: '❤️', prompt: '¿A quién vas a amar con hechos hoy, no solo con palabras?' },
  fe: { label: 'Fe', emoji: '✝️', prompt: '¿En qué decisión de hoy vas a confiar en Dios en lugar de en tus emociones?' },
  disciplina: { label: 'Disciplina', emoji: '🧱', prompt: '¿Cuál es la versión mínima de tu hábito clave que vas a cumplir aunque no tengas ganas?' },
  trabajo: { label: 'Trabajo', emoji: '💼', prompt: '¿Cómo podés servir mejor hoy en SMV, sin buscar aplausos?' },
  sabiduria: { label: 'Sabiduría', emoji: '📖', prompt: '¿Qué vas a estudiar hoy para aprender de verdad y no solo para aprobar?' },
  familia: { label: 'Familia', emoji: '👨‍👩‍👦', prompt: '¿Qué gesto concreto vas a tener hoy con tu mamá o tu papá?' },
  paz: { label: 'Paz', emoji: '🕊️', prompt: '¿Qué preocupación le vas a entregar a Dios antes de dormir?' },
  identidad: { label: 'Identidad', emoji: '🔥', prompt: 'Recordá: sos amado por Dios. ¿Cómo cambia eso la forma en que vas a vivir hoy?' },
  servicio: { label: 'Servicio', emoji: '🤲', prompt: '¿A cuál de tus Elegidos o amigos le podés escribir o acompañar hoy?' },
  finanzas: { label: 'Mayordomía', emoji: '💸', prompt: '¿Tu forma de usar la plata hoy refleja orden, generosidad y visión de futuro?' },
  fortaleza: { label: 'Fortaleza', emoji: '🛡️', prompt: '¿Qué desafío de hoy vas a enfrentar con valentía?' },
  gratitud: { label: 'Gratitud', emoji: '🙏', prompt: 'Anotá tres cosas concretas por las que agradecés hoy.' },
  tiempo: { label: 'Tiempo', emoji: '⏳', prompt: '¿Cómo vas a cuidar tu tiempo hoy? ¿Qué le vas a decir que NO al celular?' },
  pureza: { label: 'Pureza', emoji: '🤍', prompt: '¿Qué estímulo necesitás cortar hoy para guardar tu corazón?' },
};

export const VERSES: Verse[] = [
  // ── AMOR (palabra del año) ───────────────────────────────
  { ref: '1 Corintios 16:14', theme: 'amor', text: 'Todas vuestras cosas sean hechas con amor.' },
  { ref: 'Juan 3:16', theme: 'amor', text: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.' },
  { ref: '1 Corintios 13:4', theme: 'amor', text: 'El amor es sufrido, es benigno; el amor no tiene envidia, el amor no es jactancioso, no se envanece;' },
  { ref: '1 Corintios 13:7', theme: 'amor', text: 'Todo lo sufre, todo lo cree, todo lo espera, todo lo soporta.' },
  { ref: '1 Corintios 13:13', theme: 'amor', text: 'Y ahora permanecen la fe, la esperanza y el amor, estos tres; pero el mayor de ellos es el amor.' },
  { ref: '1 Juan 4:19', theme: 'amor', text: 'Nosotros le amamos a él, porque él nos amó primero.' },
  { ref: '1 Juan 4:18', theme: 'amor', text: 'En el amor no hay temor, sino que el perfecto amor echa fuera el temor; porque el temor lleva en sí castigo. De donde el que teme, no ha sido perfeccionado en el amor.' },
  { ref: '1 Juan 3:18', theme: 'amor', text: 'Hijitos míos, no amemos de palabra ni de lengua, sino de hecho y en verdad.' },
  { ref: '1 Juan 4:7', theme: 'amor', text: 'Amados, amémonos unos a otros; porque el amor es de Dios. Todo aquel que ama, es nacido de Dios, y conoce a Dios.' },
  { ref: 'Juan 13:34', theme: 'amor', text: 'Un mandamiento nuevo os doy: Que os améis unos a otros; como yo os he amado, que también os améis unos a otros.' },
  { ref: 'Juan 15:13', theme: 'amor', text: 'Nadie tiene mayor amor que este, que uno ponga su vida por sus amigos.' },
  { ref: 'Juan 14:15', theme: 'amor', text: 'Si me amáis, guardad mis mandamientos.' },
  { ref: 'Romanos 5:8', theme: 'amor', text: 'Mas Dios muestra su amor para con nosotros, en que siendo aún pecadores, Cristo murió por nosotros.' },
  { ref: 'Romanos 8:38-39', theme: 'amor', text: 'Por lo cual estoy seguro de que ni la muerte, ni la vida, ni ángeles, ni principados, ni potestades, ni lo presente, ni lo por venir, ni lo alto, ni lo profundo, ni ninguna otra cosa creada nos podrá separar del amor de Dios, que es en Cristo Jesús Señor nuestro.' },
  { ref: 'Romanos 12:10', theme: 'amor', text: 'Amaos los unos a los otros con amor fraternal; en cuanto a honra, prefiriéndoos los unos a los otros.' },
  { ref: 'Gálatas 5:22-23', theme: 'amor', text: 'Mas el fruto del Espíritu es amor, gozo, paz, paciencia, benignidad, bondad, fe, mansedumbre, templanza; contra tales cosas no hay ley.' },
  { ref: 'Efesios 4:2', theme: 'amor', text: 'con toda humildad y mansedumbre, soportándoos con paciencia los unos a los otros en amor,' },
  { ref: 'Colosenses 3:14', theme: 'amor', text: 'Y sobre todas estas cosas vestíos de amor, que es el vínculo perfecto.' },
  { ref: '1 Pedro 4:8', theme: 'amor', text: 'Y ante todo, tened entre vosotros ferviente amor; porque el amor cubrirá multitud de pecados.' },
  { ref: 'Mateo 22:37-39', theme: 'amor', text: 'Jesús le dijo: Amarás al Señor tu Dios con todo tu corazón, y con toda tu alma, y con toda tu mente. Este es el primero y grande mandamiento. Y el segundo es semejante: Amarás a tu prójimo como a ti mismo.' },
  { ref: 'Deuteronomio 6:5', theme: 'amor', text: 'Y amarás a Jehová tu Dios de todo tu corazón, y de toda tu alma, y con todas tus fuerzas.' },
  { ref: 'Hebreos 10:24', theme: 'amor', text: 'Y considerémonos unos a otros para estimularnos al amor y a las buenas obras;' },
  { ref: 'Sofonías 3:17', theme: 'amor', text: 'Jehová está en medio de ti, poderoso, él salvará; se gozará sobre ti con alegría, callará de amor, se regocijará sobre ti con cánticos.' },
  { ref: 'Gálatas 5:13', theme: 'amor', text: 'Porque vosotros, hermanos, a libertad fuisteis llamados; solamente que no uséis la libertad como ocasión para la carne, sino servíos por amor los unos a los otros.' },
  { ref: 'Efesios 4:32', theme: 'amor', text: 'Antes sed benignos unos con otros, misericordiosos, perdonándoos unos a otros, como Dios también os perdonó a vosotros en Cristo.' },

  // ── FE ────────────────────────────────────────────────────
  { ref: 'Hebreos 11:1', theme: 'fe', text: 'Es, pues, la fe la certeza de lo que se espera, la convicción de lo que no se ve.' },
  { ref: 'Hebreos 11:6', theme: 'fe', text: 'Pero sin fe es imposible agradar a Dios; porque es necesario que el que se acerca a Dios crea que le hay, y que es galardonador de los que le buscan.' },
  { ref: 'Proverbios 3:5-6', theme: 'fe', text: 'Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia. Reconócelo en todos tus caminos, y él enderezará tus veredas.' },
  { ref: 'Mateo 6:33', theme: 'fe', text: 'Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas.' },
  { ref: 'Romanos 8:28', theme: 'fe', text: 'Y sabemos que a los que aman a Dios, todas las cosas les ayudan a bien, esto es, a los que conforme a su propósito son llamados.' },
  { ref: 'Romanos 10:17', theme: 'fe', text: 'Así que la fe es por el oír, y el oír, por la palabra de Dios.' },
  { ref: 'Juan 14:6', theme: 'fe', text: 'Jesús le dijo: Yo soy el camino, y la verdad, y la vida; nadie viene al Padre, sino por mí.' },
  { ref: 'Juan 15:5', theme: 'fe', text: 'Yo soy la vid, vosotros los pámpanos; el que permanece en mí, y yo en él, este lleva mucho fruto; porque separados de mí nada podéis hacer.' },
  { ref: 'Santiago 4:8', theme: 'fe', text: 'Acercaos a Dios, y él se acercará a vosotros. Pecadores, limpiad las manos; y vosotros los de doble ánimo, purificad vuestros corazones.' },
  { ref: 'Santiago 1:22', theme: 'fe', text: 'Pero sed hacedores de la palabra, y no tan solamente oidores, engañándoos a vosotros mismos.' },
  { ref: 'Mateo 7:24', theme: 'fe', text: 'Cualquiera, pues, que me oye estas palabras, y las hace, le compararé a un hombre prudente, que edificó su casa sobre la roca.' },
  { ref: 'Mateo 7:7', theme: 'fe', text: 'Pedid, y se os dará; buscad, y hallaréis; llamad, y se os abrirá.' },
  { ref: 'Mateo 6:6', theme: 'fe', text: 'Mas tú, cuando ores, entra en tu aposento, y cerrada la puerta, ora a tu Padre que está en secreto; y tu Padre que ve en lo secreto te recompensará en público.' },
  { ref: 'Salmos 37:4', theme: 'fe', text: 'Deléitate asimismo en Jehová, y él te concederá las peticiones de tu corazón.' },
  { ref: 'Salmos 37:5', theme: 'fe', text: 'Encomienda a Jehová tu camino, y confía en él; y él hará.' },
  { ref: 'Salmos 119:105', theme: 'fe', text: 'Lámpara es a mis pies tu palabra, y lumbrera a mi camino.' },
  { ref: 'Salmos 16:8', theme: 'fe', text: 'A Jehová he puesto siempre delante de mí; porque está a mi diestra, no seré conmovido.' },
  { ref: 'Salmos 34:8', theme: 'fe', text: 'Gustad, y ved que es bueno Jehová; dichoso el hombre que confía en él.' },
  { ref: 'Jeremías 33:3', theme: 'fe', text: 'Clama a mí, y yo te responderé, y te enseñaré cosas grandes y ocultas que tú no conoces.' },
  { ref: 'Lucas 1:37', theme: 'fe', text: 'porque nada hay imposible para Dios.' },
  { ref: 'Marcos 9:23', theme: 'fe', text: 'Jesús le dijo: Si puedes creer, al que cree todo le es posible.' },
  { ref: '1 Juan 5:14', theme: 'fe', text: 'Y esta es la confianza que tenemos en él, que si pedimos alguna cosa conforme a su voluntad, él nos oye.' },
  { ref: 'Hebreos 4:16', theme: 'fe', text: 'Acerquémonos, pues, confiadamente al trono de la gracia, para alcanzar misericordia y hallar gracia para el oportuno socorro.' },
  { ref: 'Efesios 2:8-9', theme: 'fe', text: 'Porque por gracia sois salvos por medio de la fe; y esto no de vosotros, pues es don de Dios; no por obras, para que nadie se gloríe.' },
  { ref: 'Gálatas 2:20', theme: 'fe', text: 'Con Cristo estoy juntamente crucificado, y ya no vivo yo, mas vive Cristo en mí; y lo que ahora vivo en la carne, lo vivo en la fe del Hijo de Dios, el cual me amó y se entregó a sí mismo por mí.' },
  { ref: 'Josué 1:8', theme: 'fe', text: 'Nunca se apartará de tu boca este libro de la ley, sino que de día y de noche meditarás en él, para que guardes y hagas conforme a todo lo que en él está escrito; porque entonces harás prosperar tu camino, y todo te saldrá bien.' },
  { ref: 'Salmos 1:1-2', theme: 'fe', text: 'Bienaventurado el varón que no anduvo en consejo de malos, ni estuvo en camino de pecadores, ni en silla de escarnecedores se ha sentado; sino que en la ley de Jehová está su delicia, y en su ley medita de día y de noche.' },
  { ref: 'Lucas 9:23', theme: 'fe', text: 'Y decía a todos: Si alguno quiere venir en pos de mí, niéguese a sí mismo, tome su cruz cada día, y sígame.' },
  { ref: 'Apocalipsis 3:20', theme: 'fe', text: 'He aquí, yo estoy a la puerta y llamo; si alguno oye mi voz y abre la puerta, entraré a él, y cenaré con él, y él conmigo.' },
  { ref: 'Miqueas 6:8', theme: 'fe', text: 'Oh hombre, él te ha declarado lo que es bueno, y qué pide Jehová de ti: solamente hacer justicia, y amar misericordia, y humillarte ante tu Dios.' },

  // ── DISCIPLINA & CONSTANCIA ───────────────────────────────
  { ref: '1 Corintios 15:58', theme: 'disciplina', text: 'Así que, hermanos míos amados, estad firmes y constantes, creciendo en la obra del Señor siempre, sabiendo que vuestro trabajo en el Señor no es en vano.' },
  { ref: 'Hebreos 12:11', theme: 'disciplina', text: 'Es verdad que ninguna disciplina al presente parece ser causa de gozo, sino de tristeza; pero después da fruto apacible de justicia a los que en ella han sido ejercitados.' },
  { ref: 'Hebreos 12:1-2', theme: 'disciplina', text: 'Por tanto, nosotros también, teniendo en derredor nuestro tan grande nube de testigos, despojémonos de todo peso y del pecado que nos asedia, y corramos con paciencia la carrera que tenemos por delante, puestos los ojos en Jesús, el autor y consumador de la fe,' },
  { ref: 'Gálatas 6:9', theme: 'disciplina', text: 'No nos cansemos, pues, de hacer bien; porque a su tiempo segaremos, si no desmayamos.' },
  { ref: '1 Corintios 9:24', theme: 'disciplina', text: '¿No sabéis que los que corren en el estadio, todos a la verdad corren, pero uno solo se lleva el premio? Corred de tal manera que lo obtengáis.' },
  { ref: 'Filipenses 3:13-14', theme: 'disciplina', text: 'Hermanos, yo mismo no pretendo haberlo ya alcanzado; pero una cosa hago: olvidando ciertamente lo que queda atrás, y extendiéndome a lo que está delante, prosigo a la meta, al premio del supremo llamamiento de Dios en Cristo Jesús.' },
  { ref: '2 Timoteo 1:7', theme: 'disciplina', text: 'Porque no nos ha dado Dios espíritu de cobardía, sino de poder, de amor y de dominio propio.' },
  { ref: '2 Pedro 1:5-7', theme: 'disciplina', text: 'vosotros también, poniendo toda diligencia por esto mismo, añadid a vuestra fe virtud; a la virtud, conocimiento; al conocimiento, dominio propio; al dominio propio, paciencia; a la paciencia, piedad; a la piedad, afecto fraternal; y al afecto fraternal, amor.' },
  { ref: 'Proverbios 16:32', theme: 'disciplina', text: 'Mejor es el que tarda en airarse que el fuerte; y el que se enseñorea de su espíritu, que el que toma una ciudad.' },
  { ref: 'Proverbios 6:6', theme: 'disciplina', text: 'Ve a la hormiga, oh perezoso, mira sus caminos, y sé sabio;' },
  { ref: 'Proverbios 24:16', theme: 'disciplina', text: 'Porque siete veces cae el justo, y vuelve a levantarse; mas los impíos caerán en el mal.' },
  { ref: 'Lucas 16:10', theme: 'disciplina', text: 'El que es fiel en lo muy poco, también en lo más es fiel; y el que en lo muy poco es injusto, también en lo más es injusto.' },
  { ref: 'Mateo 25:21', theme: 'disciplina', text: 'Y su señor le dijo: Bien, buen siervo y fiel; sobre poco has sido fiel, sobre mucho te pondré; entra en el gozo de tu señor.' },
  { ref: 'Romanos 12:11', theme: 'disciplina', text: 'En lo que requiere diligencia, no perezosos; fervientes en espíritu, sirviendo al Señor;' },
  { ref: 'Romanos 12:12', theme: 'disciplina', text: 'gozosos en la esperanza; sufridos en la tribulación; constantes en la oración;' },
  { ref: '2 Crónicas 15:7', theme: 'disciplina', text: 'Pero esforzaos vosotros, y no desfallezcan vuestras manos, pues hay recompensa para vuestra obra.' },
  { ref: 'Filipenses 1:6', theme: 'disciplina', text: 'estando persuadido de esto, que el que comenzó en vosotros la buena obra, la perfeccionará hasta el día de Jesucristo;' },
  { ref: 'Mateo 26:41', theme: 'disciplina', text: 'Velad y orad, para que no entréis en tentación; el espíritu a la verdad está dispuesto, pero la carne es débil.' },

  // ── TRABAJO ───────────────────────────────────────────────
  { ref: 'Colosenses 3:23', theme: 'trabajo', text: 'Y todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres;' },
  { ref: 'Colosenses 3:17', theme: 'trabajo', text: 'Y todo lo que hacéis, sea de palabra o de hecho, hacedlo todo en el nombre del Señor Jesús, dando gracias a Dios Padre por medio de él.' },
  { ref: 'Proverbios 22:29', theme: 'trabajo', text: '¿Has visto hombre solícito en su trabajo? Delante de los reyes estará; no estará delante de los de baja condición.' },
  { ref: 'Proverbios 16:3', theme: 'trabajo', text: 'Encomienda a Jehová tus obras, y tus pensamientos serán afirmados.' },
  { ref: 'Proverbios 12:24', theme: 'trabajo', text: 'La mano de los diligentes señoreará; mas la negligencia será tributaria.' },
  { ref: 'Proverbios 14:23', theme: 'trabajo', text: 'En toda labor hay fruto; mas las vanas palabras de los labios empobrecen.' },
  { ref: 'Eclesiastés 9:10', theme: 'trabajo', text: 'Todo lo que te viniere a la mano para hacer, hazlo según tus fuerzas; porque en el Seol, adonde vas, no hay obra, ni trabajo, ni ciencia, ni sabiduría.' },
  { ref: '1 Corintios 10:31', theme: 'trabajo', text: 'Si, pues, coméis o bebéis, o hacéis otra cosa, hacedlo todo para la gloria de Dios.' },
  { ref: 'Tito 2:7', theme: 'trabajo', text: 'presentándote tú en todo como ejemplo de buenas obras; en la enseñanza mostrando integridad, seriedad,' },
  { ref: 'Mateo 5:16', theme: 'trabajo', text: 'Así alumbre vuestra luz delante de los hombres, para que vean vuestras buenas obras, y glorifiquen a vuestro Padre que está en los cielos.' },
  { ref: 'Efesios 2:10', theme: 'trabajo', text: 'Porque somos hechura suya, creados en Cristo Jesús para buenas obras, las cuales Dios preparó de antemano para que anduviésemos en ellas.' },
  { ref: 'Filipenses 2:3', theme: 'trabajo', text: 'Nada hagáis por contienda o por vanagloria; antes bien con humildad, estimando cada uno a los demás como superiores a él mismo;' },

  // ── SABIDURÍA & ESTUDIO ───────────────────────────────────
  { ref: 'Santiago 1:5', theme: 'sabiduria', text: 'Y si alguno de vosotros tiene falta de sabiduría, pídala a Dios, el cual da a todos abundantemente y sin reproche, y le será dada.' },
  { ref: 'Proverbios 1:7', theme: 'sabiduria', text: 'El principio de la sabiduría es el temor de Jehová; los insensatos desprecian la sabiduría y la enseñanza.' },
  { ref: 'Proverbios 2:6', theme: 'sabiduria', text: 'Porque Jehová da la sabiduría, y de su boca viene el conocimiento y la inteligencia.' },
  { ref: 'Proverbios 18:15', theme: 'sabiduria', text: 'El corazón del entendido adquiere sabiduría; y el oído de los sabios busca la ciencia.' },
  { ref: 'Proverbios 15:22', theme: 'sabiduria', text: 'Los pensamientos son frustrados donde no hay consejo; mas en la multitud de consejeros se afirman.' },
  { ref: 'Proverbios 12:15', theme: 'sabiduria', text: 'El camino del necio es derecho en su opinión; mas el que obedece al consejo es sabio.' },
  { ref: 'Proverbios 19:20', theme: 'sabiduria', text: 'Escucha el consejo, y recibe la corrección, para que seas sabio en tu vejez.' },
  { ref: 'Proverbios 11:2', theme: 'sabiduria', text: 'Cuando viene la soberbia, viene también la deshonra; mas con los humildes está la sabiduría.' },
  { ref: 'Proverbios 16:18', theme: 'sabiduria', text: 'Antes del quebrantamiento es la soberbia, y antes de la caída la altivez de espíritu.' },
  { ref: 'Proverbios 16:9', theme: 'sabiduria', text: 'El corazón del hombre piensa su camino; mas Jehová endereza sus pasos.' },
  { ref: 'Proverbios 27:17', theme: 'sabiduria', text: 'Hierro con hierro se aguza; y así el hombre aguza el rostro de su amigo.' },
  { ref: 'Lucas 2:52', theme: 'sabiduria', text: 'Y Jesús crecía en sabiduría y en estatura, y en gracia para con Dios y los hombres.' },
  { ref: 'Romanos 12:2', theme: 'sabiduria', text: 'No os conforméis a este siglo, sino transformaos por medio de la renovación de vuestro entendimiento, para que comprobéis cuál sea la buena voluntad de Dios, agradable y perfecta.' },
  { ref: 'Filipenses 4:8', theme: 'sabiduria', text: 'Por lo demás, hermanos, todo lo que es verdadero, todo lo honesto, todo lo justo, todo lo puro, todo lo amable, todo lo que es de buen nombre; si hay virtud alguna, si algo digno de alabanza, en esto pensad.' },
  { ref: 'Santiago 1:19', theme: 'sabiduria', text: 'Por esto, mis amados hermanos, todo hombre sea pronto para oír, tardo para hablar, tardo para airarse;' },
  { ref: 'Salmos 32:8', theme: 'sabiduria', text: 'Te haré entender, y te enseñaré el camino en que debes andar; sobre ti fijaré mis ojos.' },
  { ref: '2 Timoteo 2:15', theme: 'sabiduria', text: 'Procura con diligencia presentarte a Dios aprobado, como obrero que no tiene de qué avergonzarse, que usa bien la palabra de verdad.' },
  { ref: '2 Timoteo 3:16-17', theme: 'sabiduria', text: 'Toda la Escritura es inspirada por Dios, y útil para enseñar, para redargüir, para corregir, para instruir en justicia, a fin de que el hombre de Dios sea perfecto, enteramente preparado para toda buena obra.' },
  { ref: 'Isaías 55:8', theme: 'sabiduria', text: 'Porque mis pensamientos no son vuestros pensamientos, ni vuestros caminos mis caminos, dijo Jehová.' },
  { ref: 'Juan 8:32', theme: 'sabiduria', text: 'y conoceréis la verdad, y la verdad os hará libres.' },

  // ── FAMILIA ───────────────────────────────────────────────
  { ref: 'Éxodo 20:12', theme: 'familia', text: 'Honra a tu padre y a tu madre, para que tus días se alarguen en la tierra que Jehová tu Dios te da.' },
  { ref: 'Efesios 6:1-2', theme: 'familia', text: 'Hijos, obedeced en el Señor a vuestros padres, porque esto es justo. Honra a tu padre y a tu madre, que es el primer mandamiento con promesa;' },
  { ref: 'Salmos 127:1', theme: 'familia', text: 'Si Jehová no edificare la casa, en vano trabajan los que la edifican; si Jehová no guardare la ciudad, en vano vela la guardia.' },
  { ref: 'Josué 24:15', theme: 'familia', text: 'Y si mal os parece servir a Jehová, escogeos hoy a quién sirváis; si a los dioses a quienes sirvieron vuestros padres, cuando estuvieron al otro lado del río, o a los dioses de los amorreos en cuya tierra habitáis; pero yo y mi casa serviremos a Jehová.' },
  { ref: 'Salmos 133:1', theme: 'familia', text: '¡Mirad cuán bueno y cuán delicioso es habitar los hermanos juntos en armonía!' },
  { ref: 'Proverbios 17:17', theme: 'familia', text: 'En todo tiempo ama el amigo, y es como un hermano en tiempo de angustia.' },
  { ref: 'Eclesiastés 4:9-10', theme: 'familia', text: 'Mejores son dos que uno; porque tienen mejor paga de su trabajo. Porque si cayeren, el uno levantará a su compañero; pero ¡ay del solo! que cuando cayere, no habrá segundo que lo levante.' },
  { ref: 'Lucas 6:31', theme: 'familia', text: 'Y como queréis que hagan los hombres con vosotros, así también haced vosotros con ellos.' },

  // ── PAZ & ANSIEDAD ────────────────────────────────────────
  { ref: 'Filipenses 4:6-7', theme: 'paz', text: 'Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias. Y la paz de Dios, que sobrepasa todo entendimiento, guardará vuestros corazones y vuestros pensamientos en Cristo Jesús.' },
  { ref: '1 Pedro 5:7', theme: 'paz', text: 'echando toda vuestra ansiedad sobre él, porque él tiene cuidado de vosotros.' },
  { ref: 'Mateo 6:34', theme: 'paz', text: 'Así que, no os afanéis por el día de mañana, porque el día de mañana traerá su afán. Basta a cada día su propio mal.' },
  { ref: 'Mateo 11:28', theme: 'paz', text: 'Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar.' },
  { ref: 'Juan 14:27', theme: 'paz', text: 'La paz os dejo, mi paz os doy; yo no os la doy como el mundo la da. No se turbe vuestro corazón, ni tenga miedo.' },
  { ref: 'Juan 16:33', theme: 'paz', text: 'Estas cosas os he hablado para que en mí tengáis paz. En el mundo tendréis aflicción; pero confiad, yo he vencido al mundo.' },
  { ref: 'Isaías 26:3', theme: 'paz', text: 'Tú guardarás en completa paz a aquel cuyo pensamiento en ti persevera; porque en ti ha confiado.' },
  { ref: 'Salmos 46:10', theme: 'paz', text: 'Estad quietos, y conoced que yo soy Dios; seré exaltado entre las naciones; enaltecido seré en la tierra.' },
  { ref: 'Salmos 55:22', theme: 'paz', text: 'Echa sobre Jehová tu carga, y él te sustentará; no dejará para siempre caído al justo.' },
  { ref: 'Salmos 62:1', theme: 'paz', text: 'En Dios solamente está acallada mi alma; de él viene mi salvación.' },
  { ref: 'Salmos 23:1', theme: 'paz', text: 'Jehová es mi pastor; nada me faltará.' },
  { ref: 'Proverbios 29:25', theme: 'paz', text: 'El temor del hombre pondrá lazo; mas el que confía en Jehová será exaltado.' },
  { ref: 'Romanos 15:13', theme: 'paz', text: 'Y el Dios de esperanza os llene de todo gozo y paz en el creer, para que abundéis en esperanza por el poder del Espíritu Santo.' },
  { ref: 'Jeremías 29:11', theme: 'paz', text: 'Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.' },
  { ref: 'Lamentaciones 3:22-23', theme: 'paz', text: 'Por la misericordia de Jehová no hemos sido consumidos, porque nunca decayeron sus misericordias. Nuevas son cada mañana; grande es tu fidelidad.' },

  // ── IDENTIDAD ─────────────────────────────────────────────
  { ref: '1 Juan 3:1', theme: 'identidad', text: 'Mirad cuál amor nos ha dado el Padre, para que seamos llamados hijos de Dios; por esto el mundo no nos conoce, porque no le conoció a él.' },
  { ref: 'Juan 1:12', theme: 'identidad', text: 'Mas a todos los que le recibieron, a los que creen en su nombre, les dio potestad de ser hechos hijos de Dios;' },
  { ref: 'Jeremías 1:5', theme: 'identidad', text: 'Antes que te formase en el vientre te conocí, y antes que nacieses te santifiqué, te di por profeta a las naciones.' },
  { ref: 'Isaías 43:1', theme: 'identidad', text: 'Ahora, así dice Jehová, Creador tuyo, oh Jacob, y Formador tuyo, oh Israel: No temas, porque yo te redimí; te puse nombre, mío eres tú.' },
  { ref: '2 Corintios 5:17', theme: 'identidad', text: 'De modo que si alguno está en Cristo, nueva criatura es; las cosas viejas pasaron; he aquí todas son hechas nuevas.' },
  { ref: 'Salmos 139:14', theme: 'identidad', text: 'Te alabaré; porque formidables, maravillosas son tus obras; estoy maravillado, y mi alma lo sabe muy bien.' },
  { ref: '1 Timoteo 4:12', theme: 'identidad', text: 'Ninguno tenga en poco tu juventud, sino sé ejemplo de los creyentes en palabra, conducta, amor, espíritu, fe y pureza.' },
  { ref: '1 Samuel 16:7', theme: 'identidad', text: 'Y Jehová respondió a Samuel: No mires a su parecer, ni a lo grande de su estatura, porque yo lo desecho; porque Jehová no mira lo que mira el hombre; pues el hombre mira lo que está delante de sus ojos, pero Jehová mira el corazón.' },
  { ref: 'Romanos 8:1', theme: 'identidad', text: 'Ahora, pues, ninguna condenación hay para los que están en Cristo Jesús, los que no andan conforme a la carne, sino conforme al Espíritu.' },
  { ref: 'Romanos 8:31', theme: 'identidad', text: '¿Qué, pues, diremos a esto? Si Dios es por nosotros, ¿quién contra nosotros?' },
  { ref: 'Mateo 5:14', theme: 'identidad', text: 'Vosotros sois la luz del mundo; una ciudad asentada sobre un monte no se puede esconder.' },
  { ref: 'Juan 10:10', theme: 'identidad', text: 'El ladrón no viene sino para hurtar y matar y destruir; yo he venido para que tengan vida, y para que la tengan en abundancia.' },
  { ref: 'Hebreos 13:8', theme: 'identidad', text: 'Jesucristo es el mismo ayer, y hoy, y por los siglos.' },

  // ── SERVICIO ──────────────────────────────────────────────
  { ref: 'Mateo 20:28', theme: 'servicio', text: 'como el Hijo del Hombre no vino para ser servido, sino para servir, y para dar su vida en rescate por muchos.' },
  { ref: '1 Pedro 4:10', theme: 'servicio', text: 'Cada uno según el don que ha recibido, minístrelo a los otros, como buenos administradores de la multiforme gracia de Dios.' },
  { ref: 'Gálatas 6:2', theme: 'servicio', text: 'Sobrellevad los unos las cargas de los otros, y cumplid así la ley de Cristo.' },
  { ref: 'Filipenses 2:4', theme: 'servicio', text: 'no mirando cada uno por lo suyo propio, sino cada cual también por lo de los otros.' },
  { ref: 'Romanos 12:21', theme: 'servicio', text: 'No seas vencido de lo malo, sino vence con el bien el mal.' },
  { ref: 'Lucas 6:38', theme: 'servicio', text: 'Dad, y se os dará; medida buena, apretada, remecida y rebosando darán en vuestro regazo; porque con la misma medida con que medís, os volverán a medir.' },
  { ref: 'Santiago 4:17', theme: 'servicio', text: 'y al que sabe hacer lo bueno, y no lo hace, le es pecado.' },
  { ref: '1 Pedro 5:6', theme: 'servicio', text: 'Humillaos, pues, bajo la poderosa mano de Dios, para que él os exalte cuando fuere tiempo;' },

  // ── FINANZAS / MAYORDOMÍA ─────────────────────────────────
  { ref: 'Lucas 14:28', theme: 'finanzas', text: 'Porque ¿quién de vosotros, queriendo edificar una torre, no se sienta primero y calcula los gastos, a ver si tiene lo que necesita para acabarla?' },
  { ref: 'Proverbios 21:5', theme: 'finanzas', text: 'Los pensamientos del diligente ciertamente tienden a la abundancia; mas todo el que se apresura alocadamente, de cierto va a la pobreza.' },
  { ref: 'Proverbios 13:11', theme: 'finanzas', text: 'Las riquezas de vanidad disminuirán; pero el que recoge con mano laboriosa las aumenta.' },
  { ref: 'Proverbios 22:7', theme: 'finanzas', text: 'El rico se enseñorea de los pobres, y el que toma prestado es siervo del que presta.' },
  { ref: 'Proverbios 10:4', theme: 'finanzas', text: 'La mano negligente empobrece; mas la mano de los diligentes enriquece.' },
  { ref: 'Proverbios 3:9', theme: 'finanzas', text: 'Honra a Jehová con tus bienes, y con las primicias de todos tus frutos;' },
  { ref: 'Mateo 6:21', theme: 'finanzas', text: 'Porque donde esté vuestro tesoro, allí estará también vuestro corazón.' },
  { ref: 'Hebreos 13:5', theme: 'finanzas', text: 'Sean vuestras costumbres sin avaricia, contentos con lo que tenéis ahora; porque él dijo: No te desampararé, ni te dejaré;' },
  { ref: '1 Timoteo 6:6', theme: 'finanzas', text: 'Pero gran ganancia es la piedad acompañada de contentamiento;' },
  { ref: '1 Timoteo 6:10', theme: 'finanzas', text: 'porque raíz de todos los males es el amor al dinero, el cual codiciando algunos, se extraviaron de la fe, y fueron traspasados de muchos dolores.' },
  { ref: 'Romanos 13:8', theme: 'finanzas', text: 'No debáis a nadie nada, sino el amaros unos a otros; porque el que ama al prójimo, ha cumplido la ley.' },
  { ref: '2 Corintios 9:7', theme: 'finanzas', text: 'Cada uno dé como propuso en su corazón: no con tristeza, ni por necesidad, porque Dios ama al dador alegre.' },
  { ref: 'Filipenses 4:11', theme: 'finanzas', text: 'No lo digo porque tenga escasez, pues he aprendido a contentarme, cualquiera que sea mi situación.' },
  { ref: 'Filipenses 4:19', theme: 'finanzas', text: 'Mi Dios, pues, suplirá todo lo que os falta conforme a sus riquezas en gloria en Cristo Jesús.' },

  // ── FORTALEZA ─────────────────────────────────────────────
  { ref: 'Filipenses 4:13', theme: 'fortaleza', text: 'Todo lo puedo en Cristo que me fortalece.' },
  { ref: 'Josué 1:9', theme: 'fortaleza', text: 'Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.' },
  { ref: 'Isaías 40:31', theme: 'fortaleza', text: 'pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas; correrán, y no se cansarán; caminarán, y no se fatigarán.' },
  { ref: 'Isaías 41:10', theme: 'fortaleza', text: 'No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo; siempre te ayudaré, siempre te sustentaré con la diestra de mi justicia.' },
  { ref: 'Deuteronomio 31:6', theme: 'fortaleza', text: 'Esforzaos y cobrad ánimo; no temáis, ni tengáis miedo de ellos, porque Jehová tu Dios es el que va contigo; no te dejará, ni te desamparará.' },
  { ref: 'Salmos 27:1', theme: 'fortaleza', text: 'Jehová es mi luz y mi salvación; ¿de quién temeré? Jehová es la fortaleza de mi vida; ¿de quién he de atemorizarme?' },
  { ref: 'Salmos 46:1', theme: 'fortaleza', text: 'Dios es nuestro amparo y fortaleza, nuestro pronto auxilio en las tribulaciones.' },
  { ref: 'Salmos 121:1-2', theme: 'fortaleza', text: 'Alzaré mis ojos a los montes; ¿de dónde vendrá mi socorro? Mi socorro viene de Jehová, que hizo los cielos y la tierra.' },
  { ref: '2 Corintios 12:9', theme: 'fortaleza', text: 'Y me ha dicho: Bástate mi gracia; porque mi poder se perfecciona en la debilidad. Por tanto, de buena gana me gloriaré más bien en mis debilidades, para que repose sobre mí el poder de Cristo.' },
  { ref: '2 Corintios 4:16', theme: 'fortaleza', text: 'Por tanto, no desmayamos; antes aunque este nuestro hombre exterior se va desgastando, el interior no obstante se renueva de día en día.' },
  { ref: 'Santiago 1:2-3', theme: 'fortaleza', text: 'Hermanos míos, tened por sumo gozo cuando os halléis en diversas pruebas, sabiendo que la prueba de vuestra fe produce paciencia.' },
  { ref: 'Efesios 3:20', theme: 'fortaleza', text: 'Y a Aquel que es poderoso para hacer todas las cosas mucho más abundantemente de lo que pedimos o entendemos, según el poder que actúa en nosotros,' },
  { ref: '1 Corintios 10:13', theme: 'fortaleza', text: 'No os ha sobrevenido ninguna tentación que no sea humana; pero fiel es Dios, que no os dejará ser tentados más de lo que podéis resistir, sino que dará también juntamente con la tentación la salida, para que podáis soportar.' },
  { ref: '1 Corintios 6:19-20', theme: 'fortaleza', text: '¿O ignoráis que vuestro cuerpo es templo del Espíritu Santo, el cual está en vosotros, el cual tenéis de Dios, y que no sois vuestros? Porque habéis sido comprados por precio; glorificad, pues, a Dios en vuestro cuerpo y en vuestro espíritu, los cuales son de Dios.' },

  // ── GRATITUD ──────────────────────────────────────────────
  { ref: '1 Tesalonicenses 5:16-18', theme: 'gratitud', text: 'Estad siempre gozosos. Orad sin cesar. Dad gracias en todo, porque esta es la voluntad de Dios para con vosotros en Cristo Jesús.' },
  { ref: 'Salmos 118:24', theme: 'gratitud', text: 'Este es el día que hizo Jehová; nos gozaremos y alegraremos en él.' },
  { ref: 'Salmos 103:2', theme: 'gratitud', text: 'Bendice, alma mía, a Jehová, y no olvides ninguno de sus beneficios.' },
  { ref: 'Colosenses 3:2', theme: 'gratitud', text: 'Poned la mira en las cosas de arriba, no en las de la tierra.' },

  // ── TIEMPO & MAÑANAS ──────────────────────────────────────
  { ref: 'Efesios 5:15-16', theme: 'tiempo', text: 'Mirad, pues, con diligencia cómo andéis, no como necios sino como sabios, aprovechando bien el tiempo, porque los días son malos.' },
  { ref: 'Salmos 90:12', theme: 'tiempo', text: 'Enséñanos de tal modo a contar nuestros días, que traigamos al corazón sabiduría.' },
  { ref: 'Eclesiastés 3:1', theme: 'tiempo', text: 'Todo tiene su tiempo, y todo lo que se quiere debajo del cielo tiene su hora.' },
  { ref: 'Marcos 1:35', theme: 'tiempo', text: 'Levantándose muy de mañana, siendo aún muy oscuro, salió y se fue a un lugar desierto, y allí oraba.' },
  { ref: 'Salmos 5:3', theme: 'tiempo', text: 'Oh Jehová, de mañana oirás mi voz; de mañana me presentaré delante de ti, y esperaré.' },
  { ref: 'Salmos 143:8', theme: 'tiempo', text: 'Hazme oír por la mañana tu misericordia, porque en ti he confiado; hazme saber el camino por donde ande, porque a ti he elevado mi alma.' },
  { ref: 'Eclesiastés 12:1', theme: 'tiempo', text: 'Acuérdate de tu Creador en los días de tu juventud, antes que vengan los días malos, y lleguen los años de los cuales digas: No tengo en ellos contentamiento;' },

  // ── PUREZA ────────────────────────────────────────────────
  { ref: 'Proverbios 4:23', theme: 'pureza', text: 'Sobre toda cosa guardada, guarda tu corazón; porque de él mana la vida.' },
  { ref: 'Salmos 119:9', theme: 'pureza', text: '¿Con qué limpiará el joven su camino? Con guardar tu palabra.' },
  { ref: 'Salmos 119:11', theme: 'pureza', text: 'En mi corazón he guardado tus dichos, para no pecar contra ti.' },
  { ref: 'Salmos 51:10', theme: 'pureza', text: 'Crea en mí, oh Dios, un corazón limpio, y renueva un espíritu recto dentro de mí.' },
  { ref: '2 Timoteo 2:22', theme: 'pureza', text: 'Huye también de las pasiones juveniles, y sigue la justicia, la fe, el amor y la paz, con los que de corazón limpio invocan al Señor.' },
  { ref: '1 Juan 1:9', theme: 'pureza', text: 'Si confesamos nuestros pecados, él es fiel y justo para perdonar nuestros pecados, y limpiarnos de toda maldad.' },
];

/** Orden pseudoaleatorio estable para no repetir temas seguidos */
function stableShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const orderCache: Record<number, Verse[]> = {};

function orderForYear(year: number): Verse[] {
  if (!orderCache[year]) {
    // El 1 Co 16:14 (palabra del año AMOR) siempre abre el año
    const [first, ...rest] = VERSES;
    orderCache[year] = [first, ...stableShuffle(rest, year)];
  }
  return orderCache[year];
}

/** Versículo del día (mismo para todo el día, cambia a medianoche AR) */
export function getVerseForDate(dateStr: string): Verse {
  const year = Number(dateStr.slice(0, 4));
  const list = orderForYear(year);
  const idx = dayOfYear(dateStr) % list.length;
  // Domingos: siempre un versículo de amor, la palabra del año
  const d = new Date(Number(dateStr.slice(0, 4)), Number(dateStr.slice(5, 7)) - 1, Number(dateStr.slice(8, 10)), 12);
  if (d.getDay() === 0) {
    const love = list.filter((v) => v.theme === 'amor');
    return love[Math.floor(dayOfYear(dateStr) / 7) % love.length];
  }
  return list[idx];
}

export function findVerse(ref: string): Verse | undefined {
  return VERSES.find((v) => v.ref === ref);
}

export function versesByTheme(theme: VerseTheme): Verse[] {
  return VERSES.filter((v) => v.theme === theme);
}

/**
 * Genera un calendario .ics con el versículo de cada día (con alarma a la hora elegida).
 * Importado en el Calendario del iPhone o Google Calendar, te llega el versículo
 * todos los días como notificación, incluso con la app cerrada.
 */
export function buildVerseCalendar(fromDate: string, days: number, time: string): string {
  const events: IcsEventInput[] = [];
  const [h, m] = time.split(':').map(Number);
  const endMin = h * 60 + m + 10;
  const end = `${String(Math.floor(endMin / 60) % 24).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
  for (let i = 0; i < days; i++) {
    const date = addDays(fromDate, i);
    const v = getVerseForDate(date);
    const theme = THEME_INFO[v.theme];
    events.push({
      uid: `verso-${date}`,
      title: `📖 ${v.ref} · ${theme.label}`,
      date,
      start: time,
      end,
      description: `${v.text}\n\n${theme.emoji} Para hoy: ${theme.prompt}\n\n${VERSE_COPYRIGHT}`,
      alarmMinutesBefore: 0,
    });
  }
  return buildIcs('Versículo diario · CONSTANTE', events);
}
