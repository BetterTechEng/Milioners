import type { Question, Settings } from '../types';

export const DEFAULT_PRIZES = [
  500, 1000, 2000, 5000, 10000, 20000, 40000, 75000, 125000, 250000, 500000, 750000, 1000000, 1500000,
  2000000,
];

/** Prize names shown on the ladder instead of amounts ("-" = no prize on that level). */
export const DEFAULT_PRIZE_NAMES = [
  'Królewska Owacja',
  'Wasza Wysokość',
  'Shot Władzy',
  'Chipsowy Monopol',
  'Królewski Tytuł',
  'Buziak Eweliny',
  'Słowa Miłości',
  'Owacja Publiczności',
  'Portret Legendy',
  '-',
  '-',
  '-',
  '-',
  '-',
  'MILIONER',
];

/** Bump when the built-in questions change, so stored copies of the old built-in set are replaced. */
export const CONTENT_VERSION = 2;

export const DEFAULT_SETTINGS: Settings = {
  title: 'Milioners',
  questionCount: 15,
  participants: ['Gracz 1'],
  prizes: DEFAULT_PRIZES,
  prizeNames: DEFAULT_PRIZE_NAMES,
  thresholds: [4, 9],
  lifelinesEnabled: { fifty: true, phone: true, audience: true },
  theme: 'classic',
  volume: { master: 0.9, music: 0.7, sfx: 0.85, video: 1 },
  phoneSeconds: 30,
  animationSpeed: 1,
  revealDelayMs: 2200,
  videoTiming: 'before',
  presentationMode: false,
  autoTransitions: false,
  reducedMotion: false,
  shortcutsEnabled: true,
  currency: 'zł',
};

type Q = Omit<Question, 'id'>;

const SAMPLE: Q[] = [
  {
    text: 'Jakie zdanie najczęściej pada w Waszym domu?',
    answers: ['„Gdzie są moje rzeczy?”', '„Co dzisiaj jemy?”', '„Mówiłam Ci przecież!”', '„Jeszcze pięć minut!”'],
    correct: 1,
    difficulty: 1,
  },
  {
    text: 'Co najchętniej zmieniłabyś w codziennym zachowaniu Łukasza?',
    answers: ['Odkładanie wszystkiego na później', 'Zostawianie rzeczy gdzie popadnie', 'Zbyt długie siedzenie przed ekranem', 'Niesłuchanie, kiedy coś mówi'],
    correct: 3,
    difficulty: 1,
  },
  {
    text: 'Co wybrałby Łukasz na pierwszym miejscu?',
    answers: ['Pizza', 'Hamburger', 'Kebab', 'Chipsy'],
    correct: 0,
    difficulty: 1,
  },
  {
    text: 'Gdybyś mogła na zawsze zakazać Łukaszowi jednej rzeczy, którą regularnie robi w domu, co by to było?',
    answers: ['Losowe wrzucanie rzeczy do szuflad', 'Zostawianie rzeczy na blacie przy rozpakowywaniu zakupów', 'Zbyt długie oglądanie Kapitana Bomby', 'Nie wiem'],
    correct: 1,
    difficulty: 1,
  },
  {
    text: 'Jaki zakup, pomysł albo wydatek Łukasza uważasz za największą finansową głupotę w historii Waszego związku?',
    answers: ['Żaden', 'Kupienie stołeczka na nogi do lepszego wypróżniania się', 'Kupienie taniego karnisza, który po miesiącu się zniszczył', 'Brak głupoty'],
    correct: 3,
    difficulty: 1,
  },
  {
    text: 'Jaka jest ulubiona kreskówka Łukasza?',
    answers: ['Dragon Ball', 'Kapitan Bomba', 'Naruto', 'Blok Ekipa'],
    correct: 0,
    difficulty: 2,
  },
  {
    text: 'Jakie jest Wasze ulubione wspólne wspomnienie?',
    answers: ['Moment zaręczyn', 'Pierwszy wypad w góry (z Patrykiem i Monią)', 'Pierwsze spotkanie na siłowni', 'Zakup kociaka Juliusza'],
    correct: 1,
    difficulty: 2,
  },
  {
    text: 'Gdybyście jutro wygrali milion złotych, na co chciałabyś wydać pierwsze 100 tysięcy?',
    answers: ['Wkład na nowe, większe mieszkanie', 'Nowy samochód', 'Podróż na inny kontynent', 'Inwestycja w złoto'],
    correct: 0,
    difficulty: 2,
  },
  {
    text: 'Gdybyś miała wybrać Waszą idealną wspólną sobotę, jak by ona wyglądała?',
    answers: [
      'Wyspać się, zjeść coś dobrego, wyjść gdzieś na spacer',
      'Wyspać się, zjeść coś dobrego, obejrzeć fajny film',
      'Wyjść na trening, zjeść coś dobrego, obejrzeć fajny film',
      'Wyspać się, wyjechać do Czarniża, obejrzeć fajny film',
    ],
    correct: 0,
    difficulty: 2,
  },
  {
    text: 'Co najczęściej Łukasz udaje, że robi, żeby uniknąć obowiązków domowych?',
    answers: ['Udaje, że się uczy', 'Udaje, że ma sraczkę i siedzi długo w kiblu', 'Udaje, że płaci rachunki', 'Udaje, że jeszcze pracuje'],
    correct: 2,
    difficulty: 2,
  },
  {
    text: 'Które zdanie najlepiej opisuje podział władzy w Waszym związku?',
    answers: ['Ona rządzi, on wykonuje', 'On rządzi, ona pozwala mu tak myśleć', 'Pełna demokracja', 'Rządzi ten, kto akurat jest bardziej zdenerwowany'],
    correct: 3,
    difficulty: 3,
  },
  {
    text: 'Gdyby Wasz związek miał być jednym gatunkiem filmowym, który najlepiej by do niego pasował?',
    answers: ['Film akcji', 'Komedia romantyczna', 'Thriller psychologiczny', 'Horror'],
    correct: 1,
    difficulty: 3,
  },
  {
    text: 'Gdybyś miała przycisk „wycisz męża”, w jakich sytuacjach używałabyś go najczęściej?',
    answers: ['W trakcie treningu na siłowni', 'Piątek wieczór po całym tygodniu pracy', 'W trakcie mojego okresu', 'W sobotę rano, zanim zjem śniadanie'],
    correct: 0,
    difficulty: 3,
  },
  {
    text: 'Gdyby Łukasz miał otrzymać nagrodę za swoje zachowanie w związku, w jakiej kategorii by wygrał?',
    answers: ['Mistrz wymówek', 'Złoty medal w zapominaniu', 'Ekspert od nicnierobienia', 'Mistrz rozładowywania konfliktów'],
    correct: 1,
    difficulty: 3,
  },
  {
    text: 'Jaką jedną rzecz najchętniej przekazałabyś przyszłemu mężowi w instrukcji obsługi małżeństwa?',
    answers: ['„Słuchaj, zanim odpowiesz”', '„Nie pytaj, gdzie co leży”', '„Nie wszystko jest żartem”', '„Czasem po prostu przyznaj mi rację”'],
    correct: 3,
    difficulty: 3,
  },
];

export function createSampleQuestions(): Question[] {
  return SAMPLE.map((q, i) => ({ ...q, id: `q-show-${i + 1}` }));
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
