const PHRASES = [
  { it: "Dov'è il bagno?", en: "Bathroom, quick smart." },
  { it: "Il conto, per favore.", en: "The bill, please." },
  { it: "Il mio amico paga.", en: "My mate's got this." },
  { it: "Un'altra bottiglia, per favore.", en: "Another bottle, please." },
  { it: "Non sono con loro.", en: "I'm not with them." },
  { it: "Li conosco a malapena.", en: "I barely know them." },
  { it: "È stata una sua idea.", en: "It was his idea." },
  { it: "Non parlo italiano.", en: "I don't speak Italian." },
  { it: "Scusi, non ho capito.", en: "Sorry, didn't catch that." },
  { it: "Ancora uno spritz, grazie.", en: "Another spritz, thanks." },
  { it: "Credo di averne avuto abbastanza.", en: "I'm cooked." },
  { it: "Sto bene, davvero.", en: "I'm fine, honestly." },
  { it: "Ieri sera è un po' confusa.", en: "Last night was a write-off." },
  { it: "Ho bisogno di un caffè. Subito.", en: "I need a coffee. Now." },
  { it: "Il mio italiano è terribile.", en: "My Italian's shithouse." },
  { it: "Quanto costa?", en: "How much?" },
  { it: "Questo è troppo.", en: "That's taking the piss." },
  { it: "Pensavo fosse compreso.", en: "Thought that was included." },
  { it: "Avevi detto che era vicino.", en: "You said it was close." },
  { it: "Il GPS mente.", en: "The GPS is rooted." },
  { it: "Mi sono perso/a di nuovo.", en: "Lost again." },
  { it: "Cosa mi consiglia?", en: "What do you reckon?" },
  { it: "Due di quelli.", en: "Two of those." },
  { it: "Senza ananas, per favore.", en: "Hold the pineapple." },
  { it: "Non era questo l'accordo.", en: "That wasn't the deal." },
];

function dayOfYearUTC(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

export function PhraseOfTheDay() {
  const phrase = PHRASES[dayOfYearUTC(new Date()) % PHRASES.length];
  return (
    <div className="border-t border-ink/15 pt-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-ink/45 font-medium">
        Frase del giorno
      </p>
      <p className="mt-2 font-serif italic text-xl leading-snug text-ink">
        &ldquo;{phrase.it}&rdquo;
      </p>
      <p className="mt-1.5 text-sm text-ink/60">&mdash; {phrase.en}</p>
    </div>
  );
}
