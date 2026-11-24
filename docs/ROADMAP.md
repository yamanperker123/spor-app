# Kapsam ve Yol Haritası

## Terimler

- **Lobi:** Bağımsız bir grup. 6 haneli kodla girilir, verisi kalıcı olarak tutulur. Bir kullanıcı birden fazla lobide olabilir.
- **Hoca:** Lobiyi açan kişi ve hoca yapılan diğer üyeler. Tüm hocalar eşit yetkilidir.
- **Öğrenci:** Lobiye katılan diğer üyeler. Programı sadece görüntüler.
- **Antrenman:** Belirli bir tarihe ait egzersiz listesi. Toplu (tüm lobi) veya bireysel (tek öğrenci) olabilir.
- **Egzersiz:** Ad, sıra ve tekrar sayısı.
- **Katılım:** Öğrencinin bir antrenmana geldiğini işaretlemesi.

## Kararlar

| Konu | Karar |
|---|---|
| Platform | Web uygulaması (PWA), mobil uyumlu. Türkçe ve İngilizce. |
| Teknoloji | Next.js, TypeScript, Tailwind, shadcn/ui, Supabase, Vercel |
| Hesap | Önce isimle hemen katılım. Sonra kullanıcı adı + e-posta + parola ile hesap bağlama. Parola e-postayla sıfırlanır. |
| Katılım modu | Varsayılan: kodla doğrudan giriş. Lobi ayarından "onay gerekli" modu açılabilir. |
| Yetkiler | Hocalar programı düzenler, üye çıkarır, başkasını hoca yapar, lobiyi bozabilir. Hocalar sahiple tamamen eşittir. |
| Görünürlük | Toplu antrenmanı tüm lobi, bireysel antrenmanı yalnızca o öğrenci ve hocalar görür. |
| Katılım kaydı | Öğrenci "geldim" der, onay gerekmez. Antrenman günü ve sonraki 3 gün içinde işaretlenebilir; ileri tarih işaretlenemez. |
| Lobi bozma | 2 gün arşivde bekler, geri alınmazsa kalıcı silinir. Tüm hocalara bildirim gider. |
| Ücret | Ücretsiz (kişisel kullanım ve yakın çevre). |

## Faz 0: Hazırlık (`v0.0.x`)

- [x] GitHub reposu ve sürüm kontrolü düzeni
- [x] Prototip 1: Giriş ve lobiye katılma akışı
- [ ] Prototip 2: Lobi ana ekranı ve takvim (haftalık/aylık)
- [ ] Prototip 3: Antrenman detayı ve "geldim" işaretleme
- [ ] Prototip 4: Hoca: antrenman oluşturma (toplu/bireysel, egzersiz sıralama)
- [ ] Prototip 5: Hoca: üyeler, istatistikler, lobi ayarları ve lobiyi bozma
- [ ] Prototipin onaylanması

## Faz 1: MVP (`v0.1.0`)

- [ ] Proje iskeleti: Next.js, Supabase, TR/EN, PWA
- [ ] Veritabanı: kullanıcı, lobi, üyelik (rol), antrenman, egzersiz, atama, katılım; erişim kuralları (RLS)
- [ ] Hızlı katılım: kod → isim → lobi
- [ ] Hesap bağlama: kullanıcı adı, e-posta, parola, parola sıfırlama
- [ ] Lobi: oluşturma, kod üretme, onay modu, üye listesi, hoca yapma, üye çıkarma
- [ ] Lobi bozma: 2 gün arşiv, geri alma, otomatik silme
- [ ] Antrenman: toplu ve bireysel oluşturma/düzenleme, egzersizleri sürükleyerek sıralama
- [ ] Katılım: öğrencinin "geldim" butonu
- [ ] Takvim: haftalık ve aylık görünüm
- [ ] İstatistik: öğrenci bazında aylık/haftalık katılım, hoca için lobi özeti
- [ ] Yayına alma (Vercel)

## Faz 2: Hocanın işini kolaylaştırma

- [ ] Hocanın elle katılım eklemesi
- [ ] Tekrarlayan antrenmanlar (örn. her Salı ve Perşembe)
- [ ] Antrenman şablonları ve kopyalama
- [ ] "Bu hafta gelmeyenler" listesi
- [ ] QR kod ve davet linki
- [ ] Bildirimler: antrenman hatırlatma, lobi bozuldu uyarısı

## Faz 3: Genişleme

- [ ] Set, kilo ve süre bilgisi
- [ ] Seri (streak) ve rozetler
- [ ] Excel/PDF dışa aktarım
- [ ] Mobil uygulama sürümü (Capacitor)
