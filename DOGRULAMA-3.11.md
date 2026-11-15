# Hizmet3.11.0 / Android3.8.2

- Üç dokunmatik ortak oyun: Dört Sıra (yerçekimi, yatay/dikey/iki çapraz kazanma), Hafıza Düellosu (gizli karıştırılmış deste, eş bulma, 1.2 saniyelik ortak açma, sıra ve puan), Refleks Yarışı (sunucu saati, erken dokunma koruması, eşzamanlı dokunmada tek kazanan, beş tur). Önceki altı oyun korunur. Sonuç, tekrar oyna ve son20oturum. Hamleler mevcut SSE ortak senkronizasyonunda; hamle başına push bildirimi gönderilmez. Refleks zamanı ağ süresini de içerir.
- Sesli odada kopan opak aktarım kanalı üç sınırlı denemeyle yenilenir. Yeni ECDH anahtarında alınan paket sırası ve kuyruk temizlenir; eski anahtarla yolda kalan paket yeni sırayı bozamaz. Yerel mikrofon kapatma tercihi sunucu durumuna yeniden eşlenir. Kısa poll kesilmelerinde20saniyeye kadar toparlanma. Yeniden girişte eski ayrılma isteği yeni oturumu kapatamaz; yalnızca kendi önceki gizli oturumuyla değiştirebilir. Mikrofon bittiğinde, çıkışta ve arka planda ses kaynağı kapatılır. Oyun sırasında küçültülmüş oda çalışır.
- İlk açılış izin ekranı; ayrı bildirim/mikrofon düğmeleri, atlama, tek gösterim, ayarlar bağlantısı. Eski dış ikonlar korunur.

37 backend testi ve24 UI paketi geçti. İki mobil boyutlu tarayıcıda Dört Sıra, kartların karşılıklı açılıp kapanması, ortak refleks işareti/sonucu,320px taşmama; gerçek şifreli PCM paketleriyle zorlanmış soket kopması, yüksek eski paket sayacından toparlanma, ilk mute isteği ve üç poll isteği hatası, mikrofon track-ended, oyun ekranında küçültülmüş oda, arka planda temizlik doğrulandı.

Sınır: Fiziksel Samsung hoparlör/mikrofon donanımı ve kilit ekranı push teslimi uzaktan gözlenmiş sayılmaz. Sesli oda uygulama açıkken kullanılır; normal telefon araması gibi arka plan görüşmesi değildir. Profilde kapalıyken bildirim testi bulunur.

Canlı3.11 hizmetinde üç yeni oyun, özel soru, beğeni, güvenli oturum geri yükleme ve TLS ses kanalı smoke testi geçti. Oluşturulan iki test hesabı ve verileri temizlendi.
