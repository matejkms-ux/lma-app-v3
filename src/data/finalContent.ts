// AUTO-GENERATED seed + hand-editable. The LMA Final App content layer.
// FULLY per-adventurer and language-generic: adding an adventurer is a DATA + AUDIO
// operation (drop a new FinalProgram here + render their podcast with
// scripts/generator/final-podcast.py) — never a screen change. See scripts/generator/FINAL-APP.md.

export type ScriptType = "latin" | "cjk" | "thai" | "khmer";

export interface EssayPage {
  roman: string;
  heading: string;
  paragraphs: string[];
  /** Optional transliteration, one entry per paragraph (non-Latin scripts: ja/zh/th/km). */
  translit?: string[];
}
export interface FinalEssay { title: string; subtitle: string; pages: EssayPage[]; }

export interface PodcastCheck { n: number; timeSec: number; question: string; }
export interface FinalPodcast {
  title: string; subtitle: string; audioUrl: string;
  hostVoiceId: string; learnerVoiceId: string;
  checks: PodcastCheck[];
}

/** One open writing prompt in the target language (human-judged, never auto-scored). */
export interface WritingPrompt { prompt: string; helper?: string; minWords: number; }
export interface FinalWriting { title: string; intro?: string; prompts: WritingPrompt[]; }

/** One spoken question-prompt: the host/LC voice reads `text` (target language). */
export interface ConversationPrompt { text: string; audioUrl: string; }
export interface FinalConversation { title: string; intro: string; prompts: ConversationPrompt[]; }

/**
 * Live graduation session over the Zoom Video SDK. `sessionId` is the per-learner
 * room key (topic = `lma-<sessionId>`; join route = `/session/<sessionId>`).
 * `scheduledAt` is an ISO timestamp — the lightweight per-adventurer scheduling
 * layer (data-driven; a real booking table is deferred — see FINAL-APP.md).
 */
export interface FinalSession { title: string; note: string; sessionId: string; scheduledAt?: string; durationMin?: number; }

export interface FinalProgram {
  scope: string;          // = user.username
  language: string;       // e.g. "SPANISH"
  locale: string;         // target-language locale, e.g. "es-MX"
  scriptType: ScriptType; // drives transliteration display in the reader
  essay: FinalEssay;
  podcast: FinalPodcast;
  writing: FinalWriting;
  conversation: FinalConversation;
  session: FinalSession;
}

export const FINAL_PROGRAMS: Record<string, FinalProgram> = {
  // ───────────────────────── Reference adventurer: Neal (Spanish) ─────────────────────────
  "NEALG2603-es": {
    scope: "NEALG2603-es",
    language: "SPANISH",
    locale: "es-MX",
    scriptType: "latin",
    essay: {
      title: "Una vida en cuatro movimientos",
      subtitle: "La historia de Neal: de la curiosidad a la presencia",
      pages: [
      { roman: "I", heading: "El niño que quería entender el mundo", paragraphs: ["Cuando era niño, estaba convencido de que la vida consistía en explorar el mundo que me rodeaba. Cada día se presentaba ante mí como una oportunidad para descubrir algo nuevo, y me fascinaba comprender qué eran las cosas, por qué existían y de qué manera funcionaban. No me bastaba con observar la superficie de las cosas; necesitaba saber qué había debajo. Hacía preguntas constantemente, a veces hasta el punto de agotar la paciencia de quienes me rodeaban, porque sentía que detrás de cada respuesta se escondía una verdad todavía más interesante.", "Encontraba una alegría especial en desarmar las ideas, en separarlas en sus partes para entender los sistemas que las sostenían. Ya fuera la naturaleza, la ciencia, las personas o la mecánica sencilla de la vida cotidiana, yo quería saber por qué el mundo operaba de la manera en que lo hacía. Para mí, nada era demasiado pequeño ni demasiado ordinario como para no merecer atención. Una hormiga cruzando el suelo, el sonido de la lluvia sobre el techo, la forma en que un motor convertía el combustible en movimiento: todo guardaba un secreto que valía la pena descubrir.", "Recuerdo que esa necesidad de comprender no distinguía entre lo importante y lo trivial. Me interesaba por igual saber cómo se formaban las nubes y entender por qué dos personas que se querían podían, sin embargo, discutir. Las preguntas sobre el mundo físico y las preguntas sobre el comportamiento humano me parecían parte de un mismo enigma. Intuía, sin poder explicarlo, que todo estaba gobernado por reglas, y que descubrir esas reglas era la aventura más emocionante que podía imaginar. No buscaba el conocimiento para presumirlo ni para obtener una ventaja; lo buscaba porque entender me producía una alegría difícil de describir, una sensación parecida a la de encajar la última pieza de un rompecabezas.", "Cuando miro hacia atrás, me doy cuenta de que aquella curiosidad se convirtió en el cimiento de quien soy. No fue simplemente una etapa de la infancia que luego abandoné, sino una manera de estar en el mundo que me ha acompañado durante toda la vida. Esa curiosidad me enseñó algo que sigo considerando una de las verdades más importantes que conozco: cada respuesta termina conduciendo a una mejor pregunta, y el aprendizaje no es un destino al que se llega, sino un proceso que dura toda la vida. Comprenderlo desde temprano me liberó de la idea de que algún día lo sabría todo, y me regaló, en cambio, el placer infinito de no terminar nunca de descubrir. Hoy entiendo que esa fue la primera lección espiritual de mi vida, aunque entonces no habría sabido llamarla así: el universo es inagotable, y nuestra tarea no es agotarlo, sino asombrarnos ante él una y otra vez."] },
      { roman: "II", heading: "La curiosidad que se vuelve hacia adentro", paragraphs: ["A medida que fui creciendo, aquella curiosidad comenzó a girar hacia mi interior. Ya no me bastaba con tratar de entender el mundo exterior; ahora quería entender cuál era mi lugar dentro de él. La pregunta había cambiado de dirección, pero conservaba la misma intensidad. En lugar de preguntarme cómo funcionaban las cosas, empecé a preguntarme qué era capaz de crear yo mismo y de qué manera podía dar forma a mi entorno a través de la disciplina, la imaginación y la práctica constante.", "Me sumergí en la música, en el sonido, en el arte, en el deporte, en la tecnología y en incontables otras búsquedas creativas. Quería conocer dónde estaban mis fortalezas, dónde habitaban mis debilidades y cuánto de unas y otras podía transformarse mediante el esfuerzo. No me interesaba quedarme en la comodidad de lo que ya sabía hacer; me atraía precisamente aquello que todavía no dominaba, porque ahí, en el territorio de lo difícil, era donde sentía que ocurría el verdadero crecimiento.", "Nunca me conformé con llegar a ser bueno en una sola cosa. Lo que de verdad me interesaba era comprender el proceso creativo en sí mismo. Quería saber qué se sentía al alcanzar la maestría y qué se necesitaba para lograrla. Con el tiempo descubrí algo que me sorprendió: cada nueva habilidad me enseñaba algo sobre todas las demás. La música me convirtió en mejor oyente. El deporte me enseñó disciplina y trabajo en equipo. El arte me enseñó composición y perspectiva. La tecnología me enseñó a pensar en sistemas y a resolver problemas. Todas estaban conectadas de maneras que en aquel momento yo aún no sabía articular, pero que podía sentir con claridad, como si todas apuntaran hacia la misma verdad escondida.", "Aquella etapa me enseñó también a tolerar la incomodidad de ser principiante. Cada vez que comenzaba algo nuevo, volvía a ser torpe, lento, inseguro. Pero descubrí que esa torpeza inicial no era un obstáculo, sino el peaje natural de todo crecimiento. Quien no está dispuesto a ser malo durante un tiempo nunca llegará a ser bueno. Aprendí a quedarme en ese terreno incómodo más tiempo del que la mayoría aguanta, y poco a poco entendí que la paciencia con uno mismo es quizá la habilidad que sostiene a todas las demás. La disciplina no era para mí un castigo, sino una forma de respeto hacia aquello que quería dominar."] },
      { roman: "III", heading: "La música en el centro de todo", paragraphs: ["A pesar de toda esa dispersión aparente, la música siempre permaneció en el centro. Era aquello que me hablaba de una forma más profunda que cualquier otra cosa. En ella convivían la matemática y la emoción, la disciplina y la libertad, el intelecto y el instinto. La música lograba reunir aspectos de mí que en cualquier otro contexto parecían contradecirse, y en ella encontraban no solo un punto de encuentro, sino una armonía.", "La música se convirtió en el lenguaje a través del cual podía expresar ideas que las palabras por sí solas jamás habrían alcanzado a comunicar. Había sentimientos demasiado grandes, demasiado sutiles o demasiado verdaderos para ser dichos, y sin embargo cabían perfectamente en una melodía. Por eso la música terminó siendo, al mismo tiempo, mi oficio y mi maestra de toda la vida. Me daba forma mientras yo le daba forma a ella, y en ese intercambio aprendí más sobre mí mismo de lo que ningún otro camino podría haberme mostrado.", "Con los años entendí que la música también me enseñaba a escuchar el silencio. Una pieza no se construye solo con notas, sino con las pausas que las separan; sin esos espacios vacíos, el sonido sería ruido. Esa lección se extendió mucho más allá del arte. Aprendí que en la vida, igual que en la música, lo que no se dice y lo que no se hace tienen tanto peso como lo que sí. El silencio, la espera, la quietud, no eran ausencias que había que llenar, sino partes esenciales de la composición. Empecé a valorar las pausas de mi propia vida con la misma atención con que valoraba sus momentos más intensos."] },
      { roman: "IV", heading: "¿De dónde vienen las ideas?", paragraphs: ["Después de años dedicados a desarrollar habilidades técnicas y a aprender cómo moverme en el mundo físico, comenzó a surgir en mí otra pregunta. Una pregunta que, al principio, parecía sencilla, pero que terminaría transformándolo todo: ¿de dónde vienen realmente las ideas?", "Cuanto más observaba la creatividad, tanto en mí mismo como en los demás, más empezaba a creer que en realidad no inventamos nuestras mejores ideas. Más bien, las recibimos. La inspiración parece llegar en lugar de ser fabricada. Aparece de manera inesperada, muchas veces cuando estamos lo suficientemente quietos como para escuchar. Comencé a pensar en los seres humanos menos como creadores en el sentido absoluto del término y más como recipientes a través de los cuales fluye la creatividad.", "Aquella comprensión cambió de raíz mi relación con mi propio trabajo. El éxito dejó de consistir simplemente en volverme más talentoso. Pasó a consistir en volverme más receptivo. Mi responsabilidad ya no era forzar la existencia de las ideas, sino desarrollar suficiente habilidad, sabiduría y disciplina para que, cuando la inspiración llegara, yo pudiera traducirla fielmente a la realidad. Era como afinar un instrumento, no para tocar una canción en particular, sino para estar listo el día en que la canción decidiera llegar.", "Que esas ideas terminaran convirtiéndose en canciones, en empresas, en comunidades, en obras de arte, en tecnologías o en movimientos dejó de importarme tanto como antes. El acto mismo de traer algo significativo a la existencia se convirtió en una forma de servicio. Comprendí que se nos confían ideas por alguna razón, y que nuestra responsabilidad es honrarlas dándoles forma. No somos los dueños de la inspiración; somos sus guardianes temporales, encargados de cuidarla el tiempo suficiente para que pueda nacer.", "Este cambio de perspectiva trajo consigo una paz inesperada. Cuando uno cree que debe inventarlo todo desde cero, la creación se vuelve una carga agotadora, una presión constante por demostrar el propio ingenio. Pero cuando uno se entiende como un canal, la presión se transforma en disponibilidad. Mi trabajo dejó de ser empujar y pasó a ser preparar el terreno. Y curiosamente, mientras menos forzaba las ideas, con más frecuencia llegaban. La inspiración parece premiar a quienes han hecho el trabajo silencioso de estar listos, y castigar con su ausencia a quienes solo la persiguen con ansiedad."] },
      { roman: "V", heading: "La dimensión espiritual de crear", paragraphs: ["Con el paso del tiempo, también empecé a reconocer que la creatividad en sí misma es profundamente espiritual. Cada obra de arte que de verdad importa lleva dentro de sí algo invisible. Comunica emoción, verdad, memoria, esperanza o sanación. El objeto físico es apenas el recipiente de algo mucho más grande que él. Una canción no es solo una sucesión de notas, ni un cuadro es únicamente pintura sobre una tela: son contenedores de algo que no se puede tocar pero que se siente con toda claridad.", "Empecé a ver este mismo patrón en todas partes. El mundo físico suele ser la expresión de algo que no se ve. Nuestros pensamientos se convierten en acciones. Nuestras acciones se convierten en hábitos. Nuestros hábitos se convierten en carácter. Y nuestro carácter se convierte, finalmente, en la vida que experimentamos. Lo invisible siempre precede a lo visible. Aquello que somos por dentro termina, tarde o temprano, manifestándose por fuera, y esa comprensión me hizo prestar mucha más atención a lo que cultivaba dentro de mí.", "Esta idea trajo consigo una responsabilidad serena pero profunda. Si la vida exterior es el reflejo de la vida interior, entonces cuidar de mi mundo interno dejó de ser un lujo o una distracción y pasó a ser la tarea más práctica que podía emprender. Los pensamientos que alimentaba, las intenciones con que actuaba, la calidad de mi atención: todo eso, que antes me parecía invisible e intrascendente, resultó ser la raíz misma de cuanto sucedía a mi alrededor. Dejé de creer que podía construir una buena vida descuidando mi interior, del mismo modo que ningún músico puede tocar bien con un instrumento desafinado. Afinar el interior se convirtió en el trabajo silencioso del que dependía todo lo demás."] },
      { roman: "VI", heading: "Del logro a la plenitud", paragraphs: ["Durante muchos años, sin embargo, el logro siguió siendo mi principal motivación. Medía mi vida a través de los éxitos, de las metas alcanzadas, del reconocimiento y del progreso. Quería ser mejor. Quería construir más. Quería aportar algo significativo al mundo. Aquellas ambiciones me sirvieron bien y me abrieron puertas que jamás habría podido imaginar. No reniego de ellas; gracias a ese impulso llegué a lugares que de otra manera nunca habría conocido.", "Pero con el tiempo descubrí algo que cambió por completo mi forma de entender la vida: el logro, por sí solo, no es plenitud. Siempre hay otra meta esperando en el horizonte. Otro proyecto por terminar. Otro nivel por alcanzar. Y si la felicidad se aplaza siempre hasta el próximo logro, entonces en realidad nunca llega. Uno puede pasarse la vida entera corriendo hacia un destino que se aleja cada vez que da un paso, convencido de que la satisfacción está a la vuelta de la esquina, sin notar que la esquina nunca termina de doblarse.", "Lo más desconcertante fue darme cuenta de que ni siquiera los logros que sí alcanzaba me daban la satisfacción duradera que esperaba de ellos. Trabajaba durante meses, a veces años, persiguiendo una meta, imaginando que al conseguirla sentiría por fin que había llegado. Y al conseguirla, la alegría duraba apenas unos días, a veces unas horas, antes de que mi mirada ya se hubiera desplazado hacia el siguiente objetivo. Comprendí que no era el logro lo que fallaba, sino la idea de que el logro pudiera, por sí mismo, llenar un vacío que en realidad pertenecía a otro orden de cosas. Había estado buscando en el territorio equivocado."] },
      { roman: "VII", heading: "La presencia como práctica", paragraphs: ["Esa comprensión me introdujo a la que quizá sea la lección más importante de todas. La vida no consiste principalmente en llegar a alguna parte. La vida consiste en experimentar el lugar donde uno ya se encuentra. Es una idea sencilla de enunciar y, sin embargo, requiere toda una vida para practicarla.", "El momento presente es el único lugar donde la vida verdaderamente existe. El pasado es memoria. El futuro es imaginación. Ambos tienen su valor, pero ninguno de los dos puede vivirse. Cuando dedico demasiado tiempo a lamentar lo de ayer, pierdo el día de hoy. Cuando dedico demasiado tiempo a preocuparme por lo de mañana, también pierdo el día de hoy. La presencia se ha convertido en una de las prácticas espirituales más valiosas que conozco, porque es ahí donde habita la gratitud, donde existe el amor, donde emerge la creatividad y donde se vuelve posible la conexión genuina con otras personas.", "No se trata de abandonar las metas ni de dejar de soñar. Se trata de dejar de poner toda la vida en suspenso a la espera de un futuro que tal vez nunca llegue tal como lo imaginamos. La presencia no es pasividad; es una forma intensa de atención, una manera de honrar el único momento que de verdad nos pertenece.", "Aprender a estar presente ha sido, paradójicamente, una de las tareas más difíciles de mi vida, justo porque parece la más sencilla. La mente quiere viajar constantemente al pasado o al futuro; rara vez se queda quieta donde el cuerpo se encuentra. Pero he notado que los momentos más felices y más plenos que he vivido tienen todos algo en común: en ellos estaba completamente presente. Una conversación profunda, una pieza de música que fluía sin esfuerzo, una caminata en silencio, un instante compartido con alguien a quien amo. En ninguno de esos momentos estaba pensando en lo que vendría después. Simplemente estaba ahí, y eso bastaba."] },
      { roman: "VIII", heading: "Una nueva base para las viejas pasiones", paragraphs: ["Hoy todavía amo aprender. Todavía amo dominar nuevas habilidades. Todavía amo crear música, construir empresas y perseguir metas ambiciosas. Esas partes de mí no han desaparecido. Simplemente han encontrado una base distinta sobre la cual sostenerse. Lo que antes hacía para llegar a algún lugar, ahora lo hago por el valor mismo de hacerlo, y esa diferencia, aunque sutil, lo cambia absolutamente todo.", "Ya no veo el logro como el propósito de la vida. Lo veo como el subproducto de vivir con intención. Cuando uno vive con curiosidad, con disciplina, con humildad y con presencia, los logros llegan casi por añadidura, como frutos naturales de un árbol bien cuidado. Pero ya no son la razón por la que riego el árbol; son, simplemente, lo que ocurre cuando el árbol está sano."] },
      { roman: "IX", heading: "La filosofía que lo reúne todo", paragraphs: ["Mi propósito hoy es permanecer lo bastante curioso como para seguir aprendiendo, lo bastante disciplinado como para seguir refinando mi oficio, lo bastante humilde como para recibir la inspiración cuando llega, lo bastante valiente como para traer esas ideas al mundo, y lo bastante presente como para experimentar plenamente el regalo de estar vivo mientras lo hago. Cada una de esas cualidades sostiene a las demás, y juntas forman una manera de vivir que ya no depende de ningún resultado en particular.", "Si hay una filosofía que ha ido emergiendo a través de cada etapa de mi vida, es esta: estamos aquí para descubrir, para crear, para servir y, en última instancia, para experimentar. El niño que quería entender el mundo, el joven que se volvió hacia adentro, el músico que escuchaba lo invisible y el adulto que aprendió a estar presente no son personas distintas. Son el mismo viaje, contado en cuatro movimientos. Y todo lo demás, al final, es simplemente parte del camino."] }
      ],
    },
    podcast: {
      title: "Cuatro movimientos",
      subtitle: "Una conversación con Neal",
      audioUrl: "https://wcrwnfvwydibhggislne.supabase.co/storage/v1/object/public/lesson-audio/NEALG2603-es-podcast/cuatro-movimientos.mp3?v=4",
      hostVoiceId: "ewn5JTa3lNPY8QVuZJi6",
      learnerVoiceId: "P951amuWPNCJ0L15rFyC",
      checks: [
      { n: 1, timeSec: 336.42, question: "¿Cómo describe Neal su manera de mirar el mundo cuando era niño?" },
      { n: 2, timeSec: 571.82, question: "¿Por qué dice Neal que le atraía aquello que todavía no dominaba?" },
      { n: 3, timeSec: 990.49, question: "Según Neal, ¿de dónde vienen realmente las mejores ideas?" },
      { n: 4, timeSec: 1047.29, question: "¿Por qué dice Neal que la creatividad es espiritual?" },
      { n: 5, timeSec: 1399.33, question: "¿Qué descubrió Neal sobre el logro y la felicidad?" },
      { n: 6, timeSec: 1622.43, question: "Según Neal, ¿cuáles son las cuatro cosas para las que estamos aquí?" }
      ],
    },
    writing: {
      title: "Tu historia, en tus palabras",
      intro: "Después de leer y escuchar tu historia, escribe en español. No hay respuestas correctas — tu guía leerá lo que escribas.",
      prompts: [
        { prompt: "Movimiento I — De niño, ¿qué te daba curiosidad? Describe un recuerdo en el que querías entender cómo funcionaba algo.", helper: "Escribe libremente, sin preocuparte por la perfección.", minWords: 40 },
        { prompt: "Movimiento II — Cuenta una habilidad que decidiste aprender. ¿Qué se sintió ser principiante, y qué te enseñó sobre ti mismo?", helper: "Un ejemplo concreto vale más que una idea general.", minWords: 40 },
        { prompt: "Movimientos III–IV — Hoy, ¿de dónde sientes que vienen tus mejores ideas, y qué significa para ti estar presente?", helper: "Escribe lo que de verdad piensas, en tus propias palabras.", minWords: 50 },
      ],
    },
    conversation: {
      title: "Conversación final",
      intro: "Escucha cada pregunta, luego graba tu respuesta en voz alta, en español. Se evalúa tu pronunciación y fluidez — no el contenido.",
      prompts: [
        { text: "¿Quién eras de niño? ¿Qué te daba curiosidad?", audioUrl: "https://wcrwnfvwydibhggislne.supabase.co/storage/v1/object/public/lesson-audio/NEALG2603-es-conversation/q1.mp3" },
        { text: "Cuéntame una habilidad que aprendiste y qué te enseñó sobre ti.", audioUrl: "https://wcrwnfvwydibhggislne.supabase.co/storage/v1/object/public/lesson-audio/NEALG2603-es-conversation/q2.mp3" },
        { text: "Para ti, ¿de dónde vienen las buenas ideas?", audioUrl: "https://wcrwnfvwydibhggislne.supabase.co/storage/v1/object/public/lesson-audio/NEALG2603-es-conversation/q3.mp3" },
        { text: "¿Qué significa para ti estar presente?", audioUrl: "https://wcrwnfvwydibhggislne.supabase.co/storage/v1/object/public/lesson-audio/NEALG2603-es-conversation/q4.mp3" },
        { text: "Si tuvieras que resumir tu filosofía de vida en una frase, ¿cuál sería?", audioUrl: "https://wcrwnfvwydibhggislne.supabase.co/storage/v1/object/public/lesson-audio/NEALG2603-es-conversation/q5.mp3" },
      ],
    },
    session: {
      title: "Sesión final",
      note: "Tu última sesión en vivo con tu guía. Llega habiendo leído el ensayo, escuchado el podcast, escrito tus respuestas y practicado la conversación.",
      sessionId: "NEALG2603-es",
      scheduledAt: "2026-06-27T16:00:00Z",
      durationMin: 30,
    },
  },
};

export const finalProgramFor = (scope: string | undefined | null): FinalProgram | null =>
  (scope && FINAL_PROGRAMS[scope]) || null;
