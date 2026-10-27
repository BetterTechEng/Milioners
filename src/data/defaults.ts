import type { Question, Settings } from '../types';

export const DEFAULT_PRIZES = [
  500, 1000, 2000, 5000, 10000, 20000, 40000, 75000, 125000, 250000, 500000, 750000, 1000000, 1500000,
  2000000,
];

export const DEFAULT_SETTINGS: Settings = {
  title: 'Milioners',
  questionCount: 15,
  participants: ['Gracz 1'],
  prizes: DEFAULT_PRIZES,
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
    text: 'Jak nazywa się stolica Polski?',
    answers: ['Kraków', 'Warszawa', 'Gdańsk', 'Poznań'],
    correct: 1,
    difficulty: 1,
    hostComment: 'Rozgrzewka. Warszawa jest stolicą od przełomu XVI i XVII wieku.',
  },
  {
    text: 'Ile nóg ma pająk?',
    answers: ['Sześć', 'Osiem', 'Dziesięć', 'Dwanaście'],
    correct: 1,
    difficulty: 1,
    hostComment: 'Pająki to pajęczaki, nie owady. Owady mają sześć nóg.',
  },
  {
    text: 'Który kolor powstaje ze zmieszania niebieskiego i żółtego?',
    answers: ['Fioletowy', 'Pomarańczowy', 'Zielony', 'Brązowy'],
    correct: 2,
    difficulty: 1,
  },
  {
    text: 'Jak nazywa się najdłuższa rzeka w Polsce?',
    answers: ['Odra', 'Warta', 'Bug', 'Wisła'],
    correct: 3,
    difficulty: 1,
    hostComment: 'Wisła ma ok. 1047 km długości.',
  },
  {
    text: 'Ile minut ma jedna doba?',
    answers: ['1240', '1440', '1640', '2400'],
    correct: 1,
    difficulty: 1,
    hostComment: 'Pierwszy próg gwarantowany. 24 × 60 = 1440.',
  },
  {
    text: 'Który pierwiastek chemiczny ma symbol „Fe”?',
    answers: ['Fluor', 'Żelazo', 'Fosfor', 'Ferm'],
    correct: 1,
    difficulty: 2,
    hostComment: 'Od łacińskiego „ferrum”.',
  },
  {
    text: 'Kto namalował obraz „Dama z gronostajem”?',
    answers: ['Rafael', 'Michał Anioł', 'Leonardo da Vinci', 'Tycjan'],
    correct: 2,
    difficulty: 2,
    hostComment: 'Obraz można oglądać w Muzeum Książąt Czartoryskich w Krakowie.',
  },
  {
    text: 'W którym roku Polska przystąpiła do Unii Europejskiej?',
    answers: ['1999', '2002', '2004', '2007'],
    correct: 2,
    difficulty: 2,
    hostComment: '1 maja 2004 roku.',
  },
  {
    text: 'Która planeta Układu Słonecznego jest największa?',
    answers: ['Saturn', 'Jowisz', 'Neptun', 'Uran'],
    correct: 1,
    difficulty: 2,
  },
  {
    text: 'Jak nazywa się najwyższy szczyt Tatr?',
    answers: ['Rysy', 'Gerlach', 'Łomnica', 'Krywań'],
    correct: 1,
    difficulty: 2,
    hostComment: 'Drugi próg gwarantowany. Gerlach (2655 m) leży na Słowacji; Rysy to najwyższy szczyt Polski.',
  },
  {
    text: 'Ile kości ma dorosły człowiek?',
    answers: ['186', '206', '226', '246'],
    correct: 1,
    difficulty: 3,
  },
  {
    text: 'Które z tych miast leży najdalej na północ?',
    answers: ['Oslo', 'Helsinki', 'Sztokholm', 'Tallinn'],
    correct: 1,
    difficulty: 3,
    hostComment: 'Helsinki ok. 60,17°N, Oslo ok. 59,91°N, Tallinn ok. 59,44°N, Sztokholm ok. 59,33°N.',
  },
  {
    text: 'Kto jest autorem „Lalki”?',
    answers: ['Henryk Sienkiewicz', 'Bolesław Prus', 'Stefan Żeromski', 'Eliza Orzeszkowa'],
    correct: 1,
    difficulty: 3,
  },
  {
    text: 'Która jednostka nie należy do układu SI jako jednostka podstawowa?',
    answers: ['Kandela', 'Mol', 'Wolt', 'Kelwin'],
    correct: 2,
    difficulty: 3,
    hostComment: 'Wolt jest jednostką pochodną.',
  },
  {
    text: 'W którym roku odbył się pierwszy lot braci Wright samolotem z napędem?',
    answers: ['1899', '1903', '1908', '1911'],
    correct: 1,
    difficulty: 3,
    hostComment: 'Pytanie finałowe. 17 grudnia 1903 roku, Kitty Hawk.',
  },
];

export function createSampleQuestions(): Question[] {
  return SAMPLE.map((q, i) => ({ ...q, id: `q-sample-${i + 1}` }));
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
