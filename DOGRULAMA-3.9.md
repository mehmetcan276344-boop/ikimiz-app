# İkimiz — mobil 3.7.0 / hizmet 3.9.1

## Tamamlananlar
- Android kalıcı oturum: SecureStore'da parola yerine iptal edilebilir anahtar. Mevcut oturumların otomatik güvenli saklamaya geçişi. Yeni çerez deposuyla geri yükleme ve çıkış sonrası iptal test edildi.
- Mesaj ve yorum bildirimlerinde gönderen/kısa içerik; kullanıcı bazında önizleme gizleme. Tek seferlik not, mektup ve şifreli içerikler bildirimde açılmaz.
- Bildirim anahtarı yenilenirken eski DeviceNotRegistered hatası güncel kaydı silemez; gönderim yeni anahtarla yeniden denenir. Makbuz ve son gönderim durumu yalnızca sahibine görünür; tokenlar tanılama yanıtına girmez. Fiziksel kilitli Samsung teslimi gözlenmiş sayılmaz. Profil’deki “Kapalıyken bildirim testi” yalnızca sahibinin seçili telefonuna gecikmeli gerçek push gönderir; yerel ses testi değildir.
- İki kişilik sesli oda: mikrofon kapatma, küçültme, ayrılma ve arka plan temizliği. Varsayılan şifreli WebSocket ses aktarımı aynı sunucudan geçer; ses kalıcı olarak saklanmaz. Cihazlarda geçici ECDH/AES-GCM anahtarları kullanılır. Önceki eşleşme ve oturum iptali erişimi engeller. Opsiyonel doğrudan WebRTC yolu da test edildi.
- Günün ortak sorusu: İstanbul günü, ikisi yanıtlamadan karşı yanıt gizli, ortak cevap defteri, çakışma/tekrar koruması, şifreli alan desteği. Önceki sürümün yanıtları korunur.
- Papatya temasında kişisel çift ana ekranı, tutarlı dokunma alanları/ikonlar, uzun basıp mesaj menüsü ve kopyalama.
- Profil sürüm ve APK indirme bölümü. Android 3.7 köprüsü güncelleme bağlantısını dış tarayıcıda açar.

## Doğrulama
29 sunucu testi geçti. 19 genel arayüz paketi; ayrıca kalıcı oturum, yeni mobil deneyim/bildirim denetimi ve şifreli yedek ses aktarımı testleri geçti. İki tarayıcıda gerçek ses örneği aktarımı, mikrofon kapatma ve durdurma doğrulandı. Fiziksel Samsung ses kalitesi ve kilit ekranında push teslimi ayrıca cihazda gözlenmelidir.

Android 3.7.0 versionCode 11, aynı imza, mikrofon/bildirim izinleri, Firebase kimliği ve özgün WAV dosyaları doğrulandı.

## Sonraki fikirler
Haftanın biz özeti, küçük ortak etkinliklerden anı oluşturma ve tarihli sesli sürpriz kutusu fikir aşamasında; bu sürümün parçası olarak sunulmaz. SMTP/Resend e-posta göndericisi, mağaza dağıtımı ve iOS/APNs hesapları ayrıca kurulmalıdır.

Canlı sunucuda iki sentetik hesapla özel soru yanıtları, HTTPS üzerinden doğrulanan ses aktarımı, mobil oturum geri yükleme ve sürüm bilgisi test edildi; test hesapları ve içerikleri temizlendi.
