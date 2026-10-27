# Milioners: teleturniej na żywo

Gra w stylu telewizyjnego teleturnieju z pytaniami za coraz większe kwoty. Ma osobny **ekran gry** (telewizor, projektor) i **panel prowadzącego** (laptop), zsynchronizowane na żywo. Działa w całości w przeglądarce, bez backendu, kluczy API i płatnych usług.

**Wersja online:** https://bettertecheng.github.io/Milioners/

## Szybki start (prowadzący)

1. Otwórz stronę i wybierz **Panel prowadzącego**.
2. Kliknij **Otwórz ekran gry**. Przeciągnij nowe okno na telewizor.
3. Na ekranie gry kliknij **Włącz dźwięk i pełny ekran** (przeglądarka wymaga jednego kliknięcia, zanim odtworzy dźwięk).
4. W panelu: **Start gry**, a potem prowadź grę przyciskiem **Następny krok** albo skrótami klawiszowymi.

Oba okna muszą być otwarte **w tej samej przeglądarce na tym samym komputerze**. Synchronizują się przez BroadcastChannel, a jako zapas przez localStorage.

## Uruchomienie lokalne

Wymagany Node.js 20 lub nowszy.

```bash
npm install
npm run dev
```

Otwórz adres wypisany przez Vite. Ekran gry jest pod `#/screen`, panel pod `#/admin`.

| Cel | Komenda |
|---|---|
| Serwer deweloperski | `npm run dev` |
| Sprawdzenie typów | `npm run typecheck` |
| Build produkcyjny (`dist/`) | `npm run build` |
| Podgląd buildu | `npm run preview` |
| Wdrożenie na GitHub Pages (gałąź `gh-pages`) | `npm run deploy` |

## Przebieg pytania

1. **Prezentacja**: pytanie wjeżdża z dźwiękiem, odpowiedzi A, B, C, D pojawiają się po kolei, potem startuje muzyka napięcia.
2. **Wybór** (1–4): pole świeci na pomarańczowo.
3. **Zatwierdzenie** (Enter): pulsowanie pola, przyciemnienie pozostałych, mocniejsza muzyka.
4. **Film z odpowiedzią** (V, opcjonalnie): muzyka się wycisza i otwiera się duży odtwarzacz. Po zakończeniu filmu gra wraca do pytania.
5. **Ujawnienie** (R): dramatyczna pauza, potem zielone pole (sukces) albo czerwone pole i zielona poprawna odpowiedź (porażka).
6. **Następne pytanie** (N) albo **Zakończ grę** po błędzie.

Gra pilnuje kolejności: nie da się ujawnić odpowiedzi przed zatwierdzeniem, wybrać usuniętej odpowiedzi ani użyć koła ratunkowego drugi raz. Ekran gry nie pokazuje poprawnej odpowiedzi przed ujawnieniem. Widzi ją tylko prowadzący w panelu.

## Skróty klawiszowe (panel prowadzącego)

| Klawisz | Akcja |
|---|---|
| 1 / 2 / 3 / 4 | Wybór odpowiedzi A / B / C / D |
| Enter | Zatwierdzenie odpowiedzi |
| Spacja | Pauza / wznowienie |
| N | Start gry / następne pytanie |
| R | Ujawnienie odpowiedzi |
| V | Film z odpowiedzią |
| F | Pełny ekran (w oknie gry działa zawsze; z panelu patrz ograniczenia) |
| M | Muzyka wł./wył. |

Skróty nie działają podczas pisania w polach formularzy. Klawisze przechodzące do kolejnych etapów mają blokadę 0,6 s przed przypadkowym podwójnym naciśnięciem. Skróty wyłączysz w Ustawieniach.

## Koła ratunkowe

- **50:50**: usuwa dwie losowe błędne odpowiedzi.
- **Pytanie do publiczności**: animacja głosowania, potem wykres. Wyniki generuje symulacja (poprawna odpowiedź zwykle wygrywa, przy trudnych pytaniach publiczność częściej się myli). Możesz też wpisać je ręcznie. Suma musi wynosić 100%.
- **Telefon do przyjaciela**: wybieranie numeru i sygnał, potem licznik (domyślnie 30 s) ze startem, pauzą, wznowieniem, resetem i wcześniejszym zakończeniem. Ostatnie 5 sekund ma ostrzejsze sygnały.

## Pytania

W zakładce **Pytania** dodasz, edytujesz, usuniesz, zduplikujesz i przesuniesz pytania, przetestujesz pojedyncze pytanie na ekranie gry, a także zaimportujesz lub wyeksportujesz JSON. Gra używa pierwszych N pytań z listy (N ustawisz w Ustawieniach).

Format JSON:

```json
{
  "questions": [
    {
      "text": "Gdzie para młoda była na pierwszej randce?",
      "answers": ["W kinie", "Nad morzem", "W pizzerii", "Na koncercie"],
      "correct": "C",
      "difficulty": 2,
      "hostComment": "Opowiedzą o tym na weselu!",
      "answerVideo": { "kind": "url", "url": "https://example.com/odpowiedz.mp4" },
      "videoTiming": "before"
    }
  ]
}
```

`correct` przyjmuje `0–3` albo `"A"–"D"`. Pola `prize`, `image`, `video`, `answerVideo`, `hostComment` i `videoTiming` są opcjonalne.

## Audio

Cała muzyka i efekty są **oryginalne i syntezowane na żywo przez Web Audio API**, bez plików z nagraniami. Moduły:

- `src/audio/engine.ts`: graf audio (szyny muzyki i efektów, pogłos, kompresor, pauza przez zawieszenie AudioContext).
- `src/audio/synth.ts`: instrumenty (pady, smyczki, bas, kotły, dzwony, blacha, werble, risery, uderzenia, tłum).
- `src/audio/music.ts`: sekwencer z płynnymi przejściami. Cztery poziomy napięcia (pytania 1–5, 6–10, 11–14, finał), napięcie po zatwierdzeniu, muzyka sukcesu, porażki, progu gwarantowanego, intro, zwycięstwa i lobby.
- `src/audio/sfx.ts`: efekty w grupach, które się nie nakładają.
- `src/audio/AudioManager.ts`: centralny menedżer, który zamienia zdarzenia gry na muzykę i efekty.

## Architektura

```
src/
  types.ts                typy domenowe
  data/defaults.ts        domyślne ustawienia i 15 przykładowych pytań
  game/machine.ts         maszyna stanów (reducer z kontrolą przejść)
  game/rules.ts           drabinka, progi, 50:50, symulacja publiczności, timingi
  game/store.ts           wspólny stan + synchronizacja okien (BroadcastChannel)
  game/storage.ts         localStorage (stan, zapisy) i IndexedDB (pliki wideo/obrazy)
  audio/                  system dźwięku
  screen/                 ekran gry (studio, tablica, drabinka, nakładki, wideo)
  admin/                  panel prowadzącego (sterowanie, pytania, ustawienia, zapisy)
```

Stany gry: `IDLE → INTRO → QUESTION_INTRO → QUESTION_ACTIVE → ANSWER_SELECTED → ANSWER_LOCKED → (VIDEO_PLAYING) → ANSWER_REVEAL → ANSWER_CORRECT / ANSWER_INCORRECT → QUESTION_COMPLETED → …`, a na końcu `GAME_WON` / `GAME_LOST`. Pauza to osobna flaga, która zamraża liczniki, muzykę, wideo i animacje tła.

## Ograniczenia

- **Dźwięk** wymaga jednego kliknięcia w oknie gry po każdym jego otwarciu lub odświeżeniu. To zasada przeglądarek.
- **Pełny ekran z panelu**: przeglądarki nie pozwalają jednemu oknu włączyć pełnego ekranu w innym. Przycisk w panelu spróbuje, a jeśli przeglądarka odmówi, ekran gry pokaże podpowiedź: naciśnij **F** albo kliknij dwukrotnie okno gry. Tryb „Cały ekran” filmu zawsze działa w obrębie okna gry.
- **Pliki z dysku** (wideo, obrazy) są zapisywane w IndexedDB tej przeglądarki. Eksport JSON zawiera tylko odnośniki do nich. Na innym komputerze dodaj pliki ponownie albo użyj linków URL.
- **YouTube**: odtwarzanie, pauza, przewijanie i głośność działają przez API osadzonego odtwarzacza. Wykrycie końca filmu zależy od YouTube. Gdyby nie zadziałało, zamknij film przyciskiem.
- Synchronizacja działa między oknami **jednej przeglądarki na jednym komputerze**, nie między różnymi urządzeniami.
- Ekran gry trzymaj w **osobnym oknie**, nie w karcie w tle: przeglądarki spowalniają animacje w ukrytych kartach.
