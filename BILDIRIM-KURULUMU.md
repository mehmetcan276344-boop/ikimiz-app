# Android bildirimleri — bağlantı tamamlandı

13 Kasım 2026. Kullanıcının açık onayıyla İkimiz projesine özel gönderici hesabı oluşturuldu, FCM v1 anahtarı Expo Android bildirim kaydına bağlandı ve canlı sunucuda EXPO_PUSH_ENABLED=1 yapıldı.

## Doğrulananlar
- Google projesi: ikimiz-couple-20261113.
- Expo projesi: @can2763/ikimiz (7b1e68cb-ba22-4d9d-b407-e52ea8212a3f).
- Android paketi: com.ikimiz.couple.
- Gönderici hesabı: ikimiz-expo-push@ikimiz-couple-20261113.iam.gserviceaccount.com.
- İzin: yalnızca bu projede roles/firebasecloudmessaging.admin; proje sahibi/veritabanı yöneticisi rolü verilmedi.
- FCM API etkin. Firebase Admin SDK ile gerçek Google hizmetinde dry-run doğrulaması geçti. Bu istek kimseye bildirim göndermedi.
- Expo tarafında FCM v1 anahtar eşleşmesi tekrar okunarak doğrulandı.
- Railway yeniden yayını SUCCESS. Canlı /api/security pushDeliveryConfigured=true doğrulandı; geçici hesap silindi.

## Telefonda açma
1. Android 3.5.0 APK’sını mevcut uygulamanın üzerine kur. Hesabı veya uygulama verisini silme.
2. Hesabınla giriş yap. Profil içindeki Telefon bildirimleri bölümünü aç.
3. Mesaj ve gün hatırlatmalarını aç düğmesine dokun; Android bildirim iznini ver.
4. Uygulamayı arka plana alıp partnerinden mesaj göndermesini iste. Bildirime dokununca sohbet açılmalı.
5. Bildirim sesi/izinleri cihaz ayarlarından yönetilebilir.

## Test sınırı
Google gönderici doğrulaması ve canlı sunucu ayarı test edildi. Fiziksel Samsung/ikinci telefon teslimi ve bildirimden açılış henüz gözlenmedi. Expo’nun gönderim isteğini kabul etmesi fiziksel teslim garantisi değildir. iOS APNs/Apple imzalama ayrı hesap erişimi bekliyor.

Özel anahtar APK’ye veya bu pakete eklenmedi. Anahtar Expo’nun kimlik bilgisi kaydındadır. İptal etmek için bu Google hizmet hesabının anahtarı veya yetkisi kaldırılır; bu işlem Android arka plan bildirimlerini durdurur.

## Ses ve titreşim
Profil > Telefon bildirimleri içinden Bildirim sesini dene düğmesi 2 saniye sonra bu cihazda test bildirimi gösterir. Önce bildirim izni ve cihaz kaydı açılmalıdır. Ses ve titreşim ayarları telefonun İkimiz bildirim ayarlarını açar. Android kanal adları Mesajlar ve paylaşımlar ve Özel gün hatırlatmalarıdır. Sesi kapatmak/değiştirmek ve titreşim tercihi bu kanallarda yönetilir. Telefonun sessiz modu veya Rahatsız Etmeyin ayarı aşılmaz.
