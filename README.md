# Milioners: teleturniej na żywo

Gra w stylu telewizyjnego teleturnieju z pytaniami za coraz większe kwoty. Wszystko dzieje się na **jednej stronie**: uczestnik klika odpowiedzi i koła ratunkowe, a prowadzący steruje grą małymi przyciskami na dole ekranu. Działa w całości w przeglądarce, bez backendu, kluczy API i płatnych usług.

**Wersja online:** https://bettertecheng.github.io/Milioners/

## Szybki start

1. Otwórz stronę na komputerze podłączonym do telewizora. Naciśnij **F** (pełny ekran).
2. Na dole ekranu jest mały pasek prowadzącego. Kliknij **Start gry**, a potem **Pierwsze pytanie**.
3. Uczestnik klika odpowiedź albo koło ratunkowe bezpośrednio na planszy.
4. Po wyniku prowadzący klika **Następne pytanie**. Błędna odpowiedź nie kończy gry.
5. Pytania, ustawienia i zapisy są pod przyciskiem **Menu** na pasku.

## Uruchomienie lokalne

Wymagany Node.js 20 lub nowszy.

```bash
npm install
npm run dev
```

Otwórz adres wypisany przez Vite.

| Cel | Komenda |
|---|---|
| Serwer deweloperski | `npm run dev` |
| Sprawdzenie typów | `npm run typecheck` |
| Build produkcyjny (`dist/`) | `npm run build` |
| Podgląd buildu | `npm run preview` |
| Wdrożenie na GitHub Pages (gałąź `gh-pages`) | `npm run deploy` |

## Przebieg pytania

1. **Prezentacja**: pytanie wjeżdża, odpowiedzi A, B, C, D pojawiają się po kolei.
2. **Odpowiedź**: uczestnik klika odpowiedź (albo prowadzący naciska 1–4). Odpowiedź od razu się blokuje i nie da się jej zmienić.
3. **Ujawnienie**: dokładnie 6 s po kliknięciu pole zmienia kolor na zielony albo czerwony, a przy błędzie poprawna odpowiedź świeci na zielono.
4. **Dalej**: prowadzący klika **Następne pytanie**. Po ostatnim pytaniu przycisk zmienia się w **Zakończ teleturniej**.

Przycisków nie da się uruchomić podwójnie: drugie szybkie kliknięcie jest ignorowane. Po przejściu do innego pytania wszystkie timery poprzedniego pytania są kasowane.

## Skróty klawiszowe

| Klawisz | Akcja |
|---|---|
| 1 / 2 / 3 / 4 | Odpowiedź A / B / C / D |
| Spacja | Pauza / wznowienie |
| N | Start gry / następne pytanie |
| V | Film z odpowiedzią (po ujawnieniu) |
| F | Pełny ekran |
| M | Muzyka wł./wył. |

Skróty nie działają podczas pisania w polach formularzy ani przy otwartym menu. Wyłączysz je w Ustawieniach (F działa zawsze).

## Koła ratunkowe

Uczestnik klika ikonę koła na górze planszy.

- **50:50**: gra melodia, a dokładnie 8 s później znikają dwie błędne odpowiedzi.
- **Pytanie do publiczności**: gra melodia, a dokładnie 32 s później pojawiają się wyniki A–D. Na razie są losowe i zawsze sumują się do 100%. Prowadzący zamyka okno przyciskiem na pasku.
- **Telefon do przyjaciela**: gra melodia (raz) i od razu startuje 30-sekundowe odliczanie. Na pasku: pauza, reset, zakończenie rozmowy, zamknięcie.

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

## Muzyka

Gra używa wyłącznie plików MP3 z `public/audio/`. Zawsze gra najwyżej jedna melodia: nowa zatrzymuje poprzednią. W pętli grają tylko muzyki napięcia.

| Zdarzenie | Plik |
|---|---|
| Otwarcie strony (jeśli przeglądarka zablokuje, przy pierwszym kliknięciu) | `candidates-arriving.mp3` |
| Start gry i koniec teleturnieju | `main-theme.mp3` |
| Przejście do pierwszego pytania | `lets-play.mp3` |
| „Następne pytanie” (kolejne pytania) | `new-question.mp3` |
| Pytania 6–8, w pętli do kliknięcia odpowiedzi | `music-64000.mp3` |
| Pytania 9–15, w pętli do kliknięcia odpowiedzi | `music-500000.mp3` |
| Kliknięcie odpowiedzi | `final-answer.mp3` |
| 6 s po kliknięciu | `correct-answer.mp3` albo `wrong-answer.mp3` |
| 50:50 | `fastest-finger.mp3` |
| Pytanie do publiczności | `ask-the-audience.mp3` |
| Telefon do przyjaciela | `phone-a-friend.mp3` |

Muzyka napięcia wraca po zamknięciu koła ratunkowego (po 50:50 — gdy skończy się jego melodia). Logika jest w `src/audio/AudioManager.ts`.

## Architektura

```
src/
  types.ts                typy domenowe
  data/defaults.ts        domyślne ustawienia i 15 przykładowych pytań
  game/machine.ts         maszyna stanów (reducer z kontrolą przejść)
  game/rules.ts           drabinka, progi, 50:50, symulacja publiczności, timingi
  game/store.ts           wspólny stan, autozapis
  game/storage.ts         localStorage (stan, zapisy) i IndexedDB (pliki wideo/obrazy)
  audio/AudioManager.ts   odtwarzanie MP3 według zdarzeń gry
  screen/                 plansza (studio, odpowiedzi, drabinka, nakładki, wideo)
  host/                   pasek prowadzącego, timery, skróty i menu (pytania, ustawienia, zapisy)
```

Stany gry: `IDLE → INTRO → QUESTION_INTRO → QUESTION_ACTIVE → ANSWER_LOCKED → ANSWER_CORRECT / ANSWER_INCORRECT → QUESTION_COMPLETED → …`, a na końcu `GAME_WON` (albo `GAME_LOST`, gdy gracz zrezygnuje). Pauza to osobna flaga, która zamraża liczniki, muzykę, wideo i animacje tła.

## Ograniczenia

- Przeglądarki często blokują dźwięk przed pierwszym kliknięciem. Wtedy melodia powitalna zagra przy pierwszym kliknięciu albo naciśnięciu klawisza.
- Film z odpowiedzią odtwarza się **po** ujawnieniu wyniku, bo wynik pokazuje się automatycznie 6 s po kliknięciu.
- **Pliki z dysku** (wideo, obrazy) są zapisywane w IndexedDB tej przeglądarki. Eksport JSON zawiera tylko odnośniki do nich.
- **YouTube**: wykrycie końca filmu zależy od YouTube. Gdyby nie zadziałało, zamknij film przyciskiem.
- Komentarz prowadzącego jest widoczny tylko w edytorze pytań (plansza jest jedna i widzą ją wszyscy).
