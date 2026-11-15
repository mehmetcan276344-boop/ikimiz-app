# Android 3.5.0 doğrulaması

- Sürüm kodu 7; paket com.ikimiz.couple.
- APK SHA-256: ee62f24eedc613440c3c1e2b37c3c8e97522c736772eca85b353d93d27fb19d6
- İmza önceki sürümle aynı; v2 doğrulaması başarılı.
- İki özgün WAV sesi APK içinde içerik olarak birebir doğrulandı; Android kaynak adları doğru.
- Derlenmiş bildirim testi ve telefon ayarları köprüsü doğrulandı.
- VIBRATE ve POST_NOTIFICATIONS izinleri var; eski gereksiz izinler yok. Firebase kimliği ve adjustResize korunuyor.
- APK ZIP bütünlüğü başarılı; 17 test ve mobil WebView düğme testi geçti.
- Fiziksel telefonda ses dinleme/kurulum testi bu sürüm için henüz gözlenmedi.

Doğrudan APK: https://expo.dev/artifacts/eas/XiJn5zq07OPuW8IG5ESkAJsFvjdqKOWM5_TNwyPN5vg.apk

---

# Android 3.4.1 doğrulaması

- Paket: com.ikimiz.couple
- Sürüm: 3.4.1, sürüm kodu 6
- APK SHA-256: 706d4df637841dda60b80702c9dfa9960bb07d99e905c1f5f159fa6f93bd39c7
- Boyut: 61368744 bayt
- İmza: önceki sürümle aynı; APK v2 doğrulaması başarılı.
- Firebase uygulama kimliği ve ikimiz-couple-20261113 proje kimliği derlenmiş kaynaklarda doğrulandı.
- minSDK 24; adjustResize ayarı korundu; kaldırılan üç eski izin APK içinde bulunmuyor.
- Fiziksel telefonda kurulum ve bildirim teslim testi bu sürüm için henüz yapılmadı.
- FCM gönderici hesabı ve Expo bağlantısı tamamlandı; canlı Android bildirim gönderimi etkin.

Doğrudan APK: https://expo.dev/artifacts/eas/PeJHfp1cutz-e028ED7R2SbXTc6Jg3r73sgmnB29vYw.apk

---

# Android 3.3.2 doğrulaması

- Paket: com.ikimiz.couple
- Sürüm: 3.3.2, sürüm kodu: 5
- APK SHA-256: 48ae41917e6f35533d815c3422637deda8a732e7f6c01d532b7d0de0c24d9d27
- İmza sertifikası SHA-256: 118f62b39e5da1c4e834e7e23e81887b599e4307ca8d4afc28963b9dfbd4ca58
- İmza doğrulaması geçti; önceki 3.2.1 ile aynı sertifika. Daha yüksek sürüm koduyla yerinde güncellenebilir.
- APK ZIP bütünlüğü geçti. ARM64 kütüphanelerinde 16 KB ELF hizalaması kontrol edildi.
- android:windowSoftInputMode=adjustResize, allowBackup=false.
- Derlenmiş JavaScript paketinde yerel klavye ölçüm köprüsü doğrulandı.
- Android derlemesi FINISHED. Gerçek Samsung A56 kurulum/klavye testi henüz bu yeni sürüm için yapılmadı.

Doğrudan APK: https://expo.dev/artifacts/eas/RvwlXLeWKD9qzFUspxrkbdqSmY1an0QJP7X0rKxC_k8.apk

---

# Android 3.2.1 doğrulaması

Paket: com.ikimiz.couple. Sürüm kodu: 2.

- Resmî Android Build Tools 35 apksigner doğrulaması başarılı; APK Signature Scheme v2 geçerli.
- Önceki APK ile aynı imza sertifikası kullanılıyor.
- Hata ayıklama açık değil.
- SYSTEM_ALERT_WINDOW, READ_EXTERNAL_STORAGE ve WRITE_EXTERNAL_STORAGE izinlerinin derlenmiş APK'de bulunmadığı aapt ile doğrulandı.
- Android allowBackup=false ayarı derlenmiş manifestte doğrulandı.
- APK arşiv bütünlüğü kontrolü başarılı.

Dosya boyutu: 61364880 bayt.
SHA-256: 021cc7e9cf659b961e8a29f45ac490de6f6b7a790485adacc7275ad4b9b4be0c
Sertifika SHA-256: 118f62b39e5da1c4e834e7e23e81887b599e4307ca8d4afc28963b9dfbd4ca58

Bu kontroller dijital imza, bütünlük ve yapılandırmayı doğrular. Google Play Protect taraması veya fiziksel cihaz kurulum testi yapılmış olduğu anlamına gelmez. Android’in mağaza dışı kurulum uyarıları uygulamadan kapatılamaz.

Canlı HTTPS adresinin sertifikası doğrulandı. HTTP isteği HTTPS'e yönleniyor; HTTPS yanıtları HSTS içeriyor. Chrome'un normal profilinde web uygulaması kurulum uygunluğu hatasız sonuçlandı.

## Güncel FCM durumu
Kullanıcı onayından sonra 3.4.1 APK’sının Firebase projesi Expo FCM v1 göndericisine bağlandı. Canlı gönderim etkin; yukarıdaki onay bekleme notları önceki durumu anlatır. Fiziksel teslim testi ayrıca gerekir.
