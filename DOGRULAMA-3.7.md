# 3.7 doğrulaması — 13 Kasım 2026

## Giderilen hatalar
- Sohbet yenilenirken Oyunlar düğmesinin tekrar eklenmesi: artık menüde tek düğme bulunur.
- Alt menünün satıra taşması ve aktif ikonun arkasında ince dikey iz: altı kolonun düğme genişlikleri düzeltildi; mobil bulanık sabit katmanlar ve takılı hover dönüşümleri kaldırıldı.
- Klavye açıkken Oyunlar menüsünün CSS önceliği nedeniyle görünmesi: gizleme kuralı düzeltildi.
- Mesaj işlem ikonlarının ve yorum düğmesinin balon altını büyütmesi: tek seçenek menüsünde tepki, yanıt, yorum, düzenleme ve silme.
- Yenilemede mesaj satırı, fotoğraf ve başlığın gereksiz değiştirilmesi: sabit anahtarlı satır ve görsel korunması; kaydırma konumu ve yazı odağı test edildi.
- Yanıt/fotoğraf seçiminde tüm sayfayı aşağı kaydırma kaldırıldı.
- Eşleşme bitince davet penceresinin açık kalması giderildi.
- Şifreli sohbetin Anahtarı aç düğmesinin sabit sohbet altında kalması giderildi.
- Çevrimdışı durum sohbet başlığında açıkça gösterilir; okunmamış mesaj rozeti yenilenir.

## Tasarım
Gül yerine özgün beyaz papatya çizimi, krem/yeşil/sarı tonları ve daha romantik ana ekran. İkonlar çizgi SVG olarak tutarlı. Klavyeyle erişimde odak halkası korunur; dokunma sonrası fazladan vurgu kaldırılır. 320/360/390/430 genişliklerinde tek satırlı alt menü ve yatay taşmama kontrolü başarılı.

## Test sonuçları
18 temel sunucu, kriptografi, oyun, yedek ve bildirim testi geçti.
17 tarayıcı test grubu geçti: davet, davet kodu girişi, web kurulumu, canlı/çevrimdışı senkron ve kalıcı kuyruk, şifreleme/anahtar aktarımı/fotoğraf/hesap kurtarma, modern ana ekran-sohbet, partnerlik/arşiv, mobil tasarım, tarih alanı/klavye, 100 mesajlık sohbet dönüşü, özet kartlar, tek seferlik notlar, profil fotoğrafı, yorumlar, yerel bildirim denetimleri, beş canlı oyun ve yeni mobil regresyon senaryosu.
Mesaj menüsünden yanıt, düzenleme, silme, fotoğraf/başlık DOM korunması, tekrar yenilemede tek Oyunlar simgesi ve gerçek dokunma hedefi genişliği ayrıca doğrulandı.

## Sınır
Tarayıcı testleri gerçek Samsung klavyesi veya cihazda bildirim sesi/arka plan teslim testi değildir. Fiziksel telefonda son kontrol ayrıca gerekir. E-posta gönderim hesabı ve mağaza/Apple erişimi gibi önceki hesap gereksinimleri değişmedi. Web 3.7.0 güncellemesidir; Android 3.5.0 (kod 7) APK korunur ve bu görsel/sohbet güncellemesi için yeniden APK kurulması gerekmez.

## Canlı yayın
Railway yayını SUCCESS. /api/health 3.7.0; mobile.js, mobile.css, keyboard.js, games.js, modern.js, daisies.svg ve sw.js canlıda kaynak dosyalarıyla birebir eşleşti.
