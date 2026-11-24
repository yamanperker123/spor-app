# Spor App

Hocaların ve öğrencilerin ortak antrenmanları takip ettiği, lobi tabanlı bir uygulama.
Lobiye Kahoot'taki gibi 6 haneli kodla girilir; antrenmanlar tarihlidir, katılımlar takvimde ve istatistiklerde görünür.

*A lobby-based workout tracker for coaches and students. Join a lobby with a 6-digit code, follow dated workouts, and track attendance on a calendar.*

## Durum

**Faz 0: Prototip.** Henüz uygulama kodu yok; tıklanabilir HTML prototip [`prototype/`](prototype/) klasöründe parça parça geliştiriliyor.
Kapsam, kararlar ve yol haritası: [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Prototipi açma

`prototype/index.html` dosyasını tarayıcıda açmak yeterli; kurulum gerekmez.

## Planlanan teknoloji

Next.js + TypeScript, Tailwind CSS + shadcn/ui, Supabase (PostgreSQL + Auth), next-intl (TR/EN), PWA, Vercel.

## Sürüm kontrolü

- `main` her zaman çalışır durumdadır; doğrudan commit atılmaz.
- Her özellik veya prototip parçası kendi dalında geliştirilir (`prototype/...`, `feat/...`, `fix/...`, `docs/...`) ve pull request ile birleştirilir.
- Commit mesajları [Conventional Commits](https://www.conventionalcommits.org/) biçimindedir: `feat:`, `fix:`, `docs:`, `chore:` …
- Her faz sonu bir sürüm etiketiyle işaretlenir: `v0.0.x` prototip, `v0.1.0` MVP.
