# Android 3.8.1 / hizmet 3.10.0

- G–C papatyalı logo yalnızca uygulama içindeki başlık ve sohbet sekmesindedir. Ana ekran uygulama ikonu, adaptif ikon, açılış görseli, web kurulum simgeleri ve bildirim simgesi önceki 3.7.0 sürümündeki haliyle korunur.
- Uygulama aktif veya geçici olarak inactive iken sistem bildirimi bandı, liste ve ses bastırılır. Arka plan durumu korunur. Aktif açılışta teslim edilmiş bildirimler temizlenir. Yerel/uzak testleri görmek için uygulama arka plana alınmalıdır.
- Altıncı oyun “Sen sor, ben anlatayım”: iki oyuncu, 6 tur, kendi sorusunu yazma, yanıt ve geçme; sıra/sürüm/tekrar/alan korumaları.
- Alıntıya dokununca yalnızca sohbet listesi asıl mesaja kayar; sayfa gövdesi ve yazma odağı korunur, mesaj kısa süre vurgulanır.
- Beğeni yorum düğmesinin yanında; eşzamanlı sayı, kişisel seçili durum, idempotent kaydetme, silme ve erişim kontrolleri. Tek seferlik not ve açılmamış mektup beğeniye kapalı. Dar event/plan satırlarında eylemler ikinci satıra alınır.

31 sunucu testi geçti. 22 arayüz paketinin tamamı geçti; başarısız eski çıkış adı beklentisi güncellendi ve dar plan satırı hatası düzeltilerek ilgili paketler yeniden doğrulandı. Gerçek fiziksel Samsung'da kilit ekranı push teslimi gözlenmiş sayılmaz; Profil → Bildirim denetimi → Kapalıyken bildirim testi kullanılabilir.

Android versionCode13, aynı imza, Firebase kimliği, mikrofon ve bildirim izinleri, özgün WAV sesleri ve oturum köprüleri doğrulandı.

Canlı hizmet3.10.0 üzerinde iki test hesabıyla özel soru, eşzamanlı beğeni, ortak günün sorusu, TLS ses aktarımı ve güvenli mobil oturum geri yükleme geçti; test hesapları ve verileri silindi. Android3.8.1 paketindeki 21 launcher/foreground/round/splash görseli önceki3.7 APK ile piksel düzeyinde birebir eşleşti.
