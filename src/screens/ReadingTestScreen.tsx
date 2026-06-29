import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DeviceFrame } from '../components/DeviceFrame';
import { StatusBar } from '../components/StatusBar';
import { useSession } from '../session';

const READING_TIME_SECONDS = 20 * 60; // 20 minutes

// ~3000-word German narrative built from Anamarija's 28-lesson vocabulary and themes.
const READING_TEXT = `Der Weg, der mich zu mir gebracht hat

Ich stehe morgens früh auf und schaue aus dem Fenster. Die Berge stehen still im Nebel, und die Stadt erwacht langsam zum Leben. In diesem Moment denke ich oft daran, wie weit ich gekommen bin – nicht nur in Kilometern, sondern in allem, was ich gedacht, gefühlt und gelernt habe. Ich atme ruhig ein und halte diesen Moment fest.

Ich komme aus Slowenien. Das ist ein kleines, grünes Land im Herzen Europas. Als Kind habe ich in einer ruhigen Stadt gelebt, umgeben von Wäldern und Feldern. Die Sommer dort waren warm und lang, die Winter weich und still. Meine Mutter hat jeden Morgen früh Kaffee gekocht, und der Geruch war so vertraut, dass er für mich noch heute Sicherheit bedeutet. Mein Vater war ein stiller Mann, der viel arbeitete und wenig sprach, aber wenn er sprach, hörten alle zu.

Als kleines Kind hatte ich immer einen Stift in der Hand. Mit fünf Jahren habe ich auf jeden freien Zettel gezeichnet – Tiere, Gesichter, Häuser, Wolken. Meine Eltern haben das geduldet und manchmal gefördert. Mit zehn Jahren habe ich mein erstes Porträt verkauft: ein Bild des Hundes unserer Nachbarin, Frau Kovač. Sie hat dafür zwei Euro bezahlt, und ich war unglaublich stolz. Mit zwanzig habe ich Kunsterziehung studiert. Für mich war Kunst nie eine Frage – es war mein Weg.

In der Schule war ich eine gute Schülerin, aber nie die Beste. Was mich interessierte, war das Sehen: die Farbe des Himmels kurz vor einem Gewitter, die Art, wie Licht durch ein Blatt fällt, wie ein altes Gesicht mehr Geschichten erzählt als ein Buch. Ich habe Kunst nicht als Fach geliebt, sondern als Lebensweise. Das hat sich bis heute nicht geändert.

Meine erste Stelle als Kunstlehrerin hatte ich an einer kleinen Schule in Ljubljana. Die Kinder dort waren laut, neugierig und voller Energie. Ich habe gelernt, dass ein Klassenzimmer kein stiller Raum sein muss. Es kann ein Ort sein, an dem Chaos und Kreativität zusammenleben. Ich habe gelernt, mit Lärm umzugehen – und aus Lärm Struktur zu machen. Das ist eine Fähigkeit, die ich bis heute brauche.

Dann traf ich Sebastian.

Sebastian war in einem Café, wo ich meinen Kaffee trinken wollte und stattdessen zwei Stunden geblieben bin. Er hat über Architektur gesprochen, ich über Malerei, und irgendwann haben wir bemerkt, dass wir dieselben Dinge sehen, nur mit anderen Augen. Er ist ein ruhiger Mensch, der viel denkt und wenig sagt. Aber wenn er spricht, dann klar und ehrlich. Das habe ich von Anfang an geliebt.

Wir haben zwei Jahre in Ljubljana gelebt, bevor wir zusammen entschieden haben, die Schweiz zu versuchen. Die Entscheidung war nicht leicht. Wir haben viel darüber gesprochen – an vielen Abenden, mit Tee und manchmal auch mit Tränen. Was hält uns hier? Was wartet dort? Was ist klüger, was ist mutiger? Sebastian hat mir am Ende gesagt: „Wenn wir es nicht versuchen, werden wir es immer bereuen." Diese Worte haben mir Klarheit gegeben.

Also haben wir unsere Koffer gepackt. Es war Herbst. Die Blätter fielen langsam, und ich hatte das Gefühl, auch ich würde etwas loslassen – etwas Vertrautes, um etwas Neues zu beginnen. Wir fuhren in die Schweiz.

Die Schweiz ist ein wunderschönes Land, aber auch ein ernstes Land. Die Berge sind majestätisch und die Städte ordentlich und sauber. Es gibt Regeln für alles, und die Menschen halten diese Regeln mit einer Selbstverständlichkeit ein, die mich am Anfang überrascht hat. In Slowenien sind wir anders – wärmer, vielleicht, aber auch unordentlicher. Beides hat seinen Wert.

Das erste Jahr in der Schweiz war schwer. Ich hatte keine Stelle, kein Netzwerk, wenig Deutsch und wenig Vertrauen in mich selbst. Ich habe einen Deutschkurs besucht, in einem kleinen Raum mit zwölf anderen Menschen aus verschiedenen Ländern. Neben mir saß ein Mann aus der Türkei, eine Frau aus Brasilien, ein junges Mädchen aus Eritrea. Wir alle lernten dieselbe Sprache, jeder mit anderen Klängen und anderen Geschichten.

Das Lernen war langsam. Die deutsche Grammatik ist nicht freundlich zu Fremden – die Fälle, die Genus-Regeln, die langen Wörter, die immer länger werden. Ich erinnere mich an einen Abend, an dem ich das Lehrbuch zugemacht und gedacht habe: Das kann ich nicht. Das ist zu schwer. Ich bin zu alt dafür. Ich gehöre nicht hierher.

Aber am nächsten Morgen habe ich das Buch wieder geöffnet. Immer wieder. Das ist vielleicht das Wichtigste, was ich gelernt habe: nicht aufhören, auch wenn es schwer ist. Der nächste Schritt kommt, wenn man sich bewegt. Nicht wenn man wartet.

Mit der Zeit wurde Deutsch weniger fremd. Die Wörter kamen schneller. Ich konnte im Supermarkt fragen, was ich brauchte. Ich konnte mit den Nachbarn über das Wetter reden – ein kleines Gespräch, aber ein echtes. Ich konnte verstehen, was im Fernsehen gesagt wurde. Jedes dieser Dinge war ein kleiner Sieg. Und aus vielen kleinen Siegen wird irgendwann ein großer.

Sebastian hat in dieser Zeit schnell Arbeit gefunden – er ist Ingenieur, und Ingenieure werden überall gebraucht. Ich habe länger gesucht. Aber ich habe auch diese Zeit genutzt. Ich habe gezeichnet, jeden Tag. Manchmal stundenlang. Die Kunst hat mir Stabilität gegeben, als vieles um mich herum sich veränderte. Sie war mein Anker.

Dann kam Aaron.

Mein Sohn Aaron ist das Schönste, was mir je passiert ist. Als er zur Welt kam, war alles anders. Der Alltag bekam eine neue Struktur, eine neue Tiefe, eine neue Farbe. Plötzlich waren Sebastian und ich nicht mehr zwei – wir waren drei. Eine Familie. Eine richtige Familie in einem fremden Land, das langsam unser Land wurde.

Mit einem kleinen Kind ist das Leben gleichzeitig voller und schwieriger. Die Nächte sind kurz. Der Schlaf ist wenig. Die Zeit gehört nicht mehr einem selbst. Aber man schaut in die Augen dieses kleinen Menschen, und man versteht, worum es in all dem geht. Aaron hat mir Geduld gelehrt. Er hat mir gezeigt, dass nicht alles sofort möglich ist – und dass das in Ordnung ist. Er ist heute vier Jahre alt, läuft durch die Wohnung wie ein kleiner Sturm und liebt es, mit Buntstiften auf Papier zu drücken. Er ist sein Vaters Ruhe und seine Mutter Energie in einem kleinen Körper.

Sebastian war in den ersten Jahren nach Aarons Geburt mein Fels. Er hat abends mit Aaron gespielt, damit ich schlafen konnte. Er hat gekocht, wenn ich zu müde war. Er hat mir gesagt, ich sei gut, auch wenn ich das selbst nicht immer geglaubt habe. Eine gute Partnerschaft funktioniert nicht, weil man immer einer Meinung ist. Sie funktioniert, weil man füreinander einsteht, auch wenn es schwer ist. Wir sind ein starkes Team.

Während Aaron schlief, und ich wach war – oft mitten in der Nacht – habe ich gezeichnet. Kleine Skizzen auf Papier. Gesichter, Pflanzen, Fenster, Straßen. Die Kunst war immer da. Sie hat mich nicht verlassen, auch in den schwierigen Zeiten nicht.

Irgendwann hatte ich genug Deutsch, um an Schulen zu arbeiten. Ich machte meine Qualifikationen in der Schweiz, schrieb Bewerbungen, bereitete mich auf Vorstellungsgespräche vor. Das erste Gespräch war anstrengend – ich war nervös und habe manchmal mitten im Satz die Sprache gewechselt. Aber das zweite war besser. Und schließlich hatte ich meine erste Stelle an einer Schule hier.

Jetzt stehe ich im hellen Klassenzimmer und atme ruhig ein. Um mich herum entstehen Farben, Ideen und kleine Wunder. Die Sonne scheint durch die großen Fenster auf die Tische. Die Kinder sitzen vor mir und warten gespannt auf den Beginn. Ich fühle mich ruhig, klar und ganz im Moment.

Das Unterrichten hier ist anders als in Slowenien – die Kinder sind ruhiger, die Regeln strikter, die Eltern anspruchsvoller. Aber der Kern ist derselbe: Jedes Kind ist einzigartig. Jedes bringt eine andere Sicht auf die Welt, andere Farben im Kopf, andere Fragen. Die Kunst ist der Raum, in dem diese Einzigartigkeit sichtbar werden darf. Das ist das Schönste an meiner Arbeit: Ich muss nicht vorgeben, dass es nur eine richtige Antwort gibt. In der Kunst gibt es keine falsche Antwort. Es gibt nur den ehrlichen Ausdruck.

Ich unterrichte Kunst auf Deutsch. Das klingt einfach, aber es ist mehr als eine Sprache in eine andere übersetzen. Es bedeutet, mit den Kindern über Gefühle zu sprechen, über Schönheit, über Fehler, die keine Fehler sind. Es bedeutet, die deutsche Sprache mit dem Lebendigen zu verbinden – mit Farbe, Form, Licht, Schatten. Meine Worte kommen leichter jetzt. Nicht immer perfekt, aber immer ehrlich.

Neben dem Unterrichten habe ich mein eigenes Unternehmen gegründet: Ami. Das ist ein slowenisches Wort und bedeutet Freundin. Dieser Name war mir wichtig. Ich wollte, dass der Name meine Geschichte trägt – die Geschichte einer Frau zwischen zwei Welten, die beides liebt und beides verbindet.

Ami ist ein kleines Studio für Illustration und Design. Ich arbeite mit Stiften, Farben und dem Computer. Ich illustriere Bücher für Kinder, gestalte Logos für kleine Unternehmen, zeichne für Zeitschriften und Webseiten. Die Kunden kommen aus der Schweiz, aber manchmal auch aus Deutschland oder Österreich. Das Internet hat die Welt kleiner gemacht – ich kann von Zürich aus für eine Verlegerin in München arbeiten.

Das Unternehmen zu führen ist eine andere Art von Kunst. Man braucht nicht nur Kreativität, sondern auch Organisation. Preise festlegen, Rechnungen schreiben, Fristen einhalten, Kunden verwalten – das ist nicht dasselbe wie Zeichnen. Aber ich habe es gelernt. Sebastian hat mir viel beigebracht. Er denkt in Zahlen, ich in Bildern – zusammen ergibt das ein vollständiges Bild.

Es gibt Tage, an denen die Aufträge wenig sind. Tage, an denen ich zweigle, ob das alles richtig ist. Tage, an denen ich müde bin und an meine Mutter in Slowenien denken muss, an die alte Küche, an das Gras nach dem Regen, an die vertrauten Gesichter. Diese Traurigkeit verschwindet nicht vollständig. Aber sie wird leichter. Man lernt, sie zu tragen.

Hier in der Schweiz habe ich echte Freunde gefunden. Das hat Zeit gebraucht – ich bin ein Mensch, der langsam vertraut, aber tief. Eine Kollegin an der Schule, Lisa, ist heute eine meiner besten Freundinnen. Wir trinken zusammen Kaffee und reden über die Kinder, über die Arbeit, über das Leben. Die Sprache war anfangs eine Barriere. Heute ist sie keine mehr. Wirkliche Freundschaft braucht keine perfekte Sprache. Sie braucht Aufmerksamkeit und Ehrlichkeit.

Ich denke oft darüber nach, wer ich bin. Ich bin Slovenin. Ich bin auch Schweizerin – nicht auf dem Papier, aber in der Seele. Ich bin Mutter, Lehrerin, Künstlerin, Unternehmerin. Ich bin die Tochter meiner Eltern, die Frau meines Mannes, die Mutter meines Sohnes. Ich bin die Frau, die in der Nacht zeichnet und am Morgen unterrichtet. Ich bin die Frau, die zwischen zwei Welten lebt und in beiden zu Hause ist.

Das war nicht immer leicht zu verstehen. Lange habe ich gedacht, ich müsse mich entscheiden – entweder Slowenien oder die Schweiz, entweder dort oder hier, entweder diese Identität oder jene. Aber das stimmt nicht. Man muss sich nicht entscheiden. Man darf beides sein. Man darf in beiden Sprachen träumen, in beiden Ländern Wurzeln haben, in beiden Kulturen atmen. Das ist kein Verlust. Das ist ein Gewinn.

Mit jedem Tag werde ich sicherer – nicht laut, nicht arrogant, sondern verwurzelt. Ich weiß, wer ich bin. Ich weiß, was ich kann. Ich weiß, was mir wichtig ist. Das hat Jahre gebraucht. Es hat Fehler gebraucht, Tränen, Mut, Geduld, Glück und viel Arbeit. Aber ich bin angekommen.

Wenn ich jetzt morgens aus dem Fenster schaue, sehe ich die Berge und denke: Das ist mein Zuhause. Ich gehe in die Schule und denke: Das ist meine Aufgabe. Ich schaue Aaron beim Frühstücken zu und denke: Das ist meine Familie. Ich setze mich an den Tisch und male und denke: Das ist meine Sprache.

Volle Kraft voraus. Es gibt noch so viel, das ich tun will. Ich will mehr illustrieren. Ich will mit Aaron auf Slowenisch und auf Deutsch sprechen, damit er beide Sprachen liebt wie ich. Ich will Sebastian zeigen, wie dankbar ich bin, dass er immer neben mir stand. Ich will auf der Schule neue Projekte beginnen, bei denen die Kinder mit ganzem Herzen dabei sind. Ich will mit Ami wachsen, neue Kunden finden, neue Bilder schaffen.

Und ich will strahlen. Nicht laut, nicht für andere – sondern leise, auf meine Art. Die Art der Menschen, die viel gefühlt und viel gelernt haben. Die Art der Menschen, die an sich geglaubt haben, auch wenn es schwer war. Die Art der Menschen, die zwischen zwei Welten einen dritten Weg gefunden haben: ihren eigenen.

Ich bin Anamarija. Ich lebe meinen Sinn. Ich strahle.`;

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Phase = 'reading' | 'responding' | 'done';

export function ReadingTestScreen() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [phase, setPhase] = useState<Phase>('reading');
  const [secondsLeft, setSecondsLeft] = useState(READING_TIME_SECONDS);
  const [response, setResponse] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startTimer = useCallback(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setPhase('responding');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDoneReading = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase('responding');
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleSubmit = () => {
    setPhase('done');
  };

  const urgentColor =
    secondsLeft < 60
      ? 'text-coral'
      : secondsLeft < 300
      ? 'text-amber-600'
      : 'text-muted';

  if (phase === 'reading') {
    return (
      <DeviceFrame tone="light">
        <StatusBar tone="light" />

        {/* Sticky header with timer */}
        <div className="shrink-0 px-5 pb-3 pt-[14px]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold tracking-[.16em] text-muted">GERMAN · FINAL TEST</div>
              <div className="mt-[2px] font-serif text-[22px] italic leading-tight text-heading">
                Read carefully.
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="text-[10px] font-bold tracking-[.1em] text-muted">TIME LEFT</div>
              <div className={`font-mono text-[28px] font-extrabold leading-none tabular-nums ${urgentColor}`}>
                {fmt(secondsLeft)}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-rule">
            <div
              className="h-full rounded-full bg-emerald transition-all duration-1000"
              style={{ width: `${(secondsLeft / READING_TIME_SECONDS) * 100}%` }}
            />
          </div>
        </div>

        {/* Scrollable text */}
        <div className="scroll-region flex-1 px-5 pb-6">
          <div className="rounded-2xl border border-rule bg-cream-panel p-5">
            {READING_TEXT.split('\n\n').map((para, i) => {
              if (i === 0) {
                return (
                  <h1 key={i} className="mb-4 font-serif text-[33px] font-bold leading-snug text-heading">
                    {para}
                  </h1>
                );
              }
              return (
                <p key={i} className="mb-3 text-[33px] leading-[1.65] text-heading last:mb-0">
                  {para}
                </p>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="-mt-5 bg-gradient-to-t from-cream from-40% to-transparent px-5 pb-4 pt-2">
          <button
            onClick={handleDoneReading}
            className="w-full rounded-[15px] bg-emerald py-4 text-[15px] font-bold tracking-[.01em] text-cream"
          >
            I'm done reading →
          </button>
        </div>
      </DeviceFrame>
    );
  }

  if (phase === 'responding') {
    return (
      <DeviceFrame tone="light">
        <StatusBar tone="light" />

        <div className="scroll-region flex-1 px-5 pb-6 pt-[18px]">
          <div className="text-[10px] font-bold tracking-[.16em] text-muted">GERMAN · FINAL TEST</div>
          <div className="mt-1 font-serif text-[33px] italic leading-tight text-heading">
            Now tell me what you read.
          </div>
          <p className="mt-2 text-[22px] leading-[1.6] text-muted">
            Write in English. Summarise what the text was about — the people, the places, the story, the feelings. Write as much as you remember.
          </p>

          <textarea
            ref={textareaRef}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="The text was about…"
            className="mt-5 min-h-[260px] w-full resize-none rounded-2xl border border-rule bg-cream-panel p-4 text-[22px] leading-[1.65] text-heading placeholder:text-locked focus:border-emerald focus:outline-none"
          />

          <p className="mt-2 text-right text-[11px] text-muted">
            {response.trim().split(/\s+/).filter(Boolean).length} words
          </p>
        </div>

        <div className="-mt-5 bg-gradient-to-t from-cream from-40% to-transparent px-5 pb-4 pt-2">
          <button
            onClick={handleSubmit}
            disabled={response.trim().length < 10}
            className="w-full rounded-[15px] bg-emerald py-4 text-[15px] font-bold tracking-[.01em] text-cream disabled:opacity-40"
          >
            Submit response →
          </button>
        </div>
      </DeviceFrame>
    );
  }

  // phase === 'done'
  return (
    <DeviceFrame tone="light">
      <StatusBar tone="light" />
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-10 text-center">
        <div className="text-[42px]">🎓</div>
        <div className="mt-4 font-serif text-[28px] italic leading-snug text-heading">
          You did it, {user?.calledName ?? user?.firstName ?? 'Anamarija'}.
        </div>
        <p className="mt-3 text-[14px] leading-[1.65] text-muted">
          You've read 3,000 words of German and written your response. That's your Adventure 1 final test — complete.
        </p>

        <div className="mt-8 w-full rounded-2xl border border-rule bg-cream-panel p-5">
          <div className="text-[10px] font-bold tracking-[.14em] text-muted">YOUR RESPONSE</div>
          <p className="mt-2 text-[14px] leading-[1.65] text-heading">{response}</p>
        </div>
      </div>
      <div className="px-5 pb-5">
        <button
          onClick={() => navigate('/home')}
          className="w-full rounded-[15px] bg-emerald py-4 text-[15px] font-bold tracking-[.01em] text-cream"
        >
          Back to home
        </button>
      </div>
    </DeviceFrame>
  );
}
