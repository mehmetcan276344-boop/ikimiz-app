# Hizmet 3.12.2 / Android 3.8.6 doğrulaması

14 Kasım 2026. Android 3.8.6 kod 18 derlemesi FINISHED; imza, Firebase ve yerel kaynaklar doğrulandı. 3.12.2 dağıtımı 3ff91f68-9563-4e34-8fbc-54e36d06b372 SUCCESS olarak doğrulandı. Canlı /api/health, APK sürüm bilgisi ve dosya seçici/video/tarayıcı kaynakları ayrıca doğrulandı. Önceki 3.12.0 ve dosya seçici düzeltmesi 3.12.1 yayınları SUCCESS durumuyla doğrulandı.

42 sunucu testi başarılı. 29 arayüz paketi başlangıç kontrolü ve değişen alanların tekrar testleriyle başarılı: son dosya ve ortak yaşam paketleri yeniden geçti.

- Dosya seçici gizli kalır; 320/360/390 pikselde mesaj alanı ekranın en az yüzde 45'ini korur. Fotoğraf/video/belge seçimi + menüsünden açılır.
- İki mobil bağlamda gerçek video oynatma ve PDF indirme başarılı. Alıcının normal ve şifreli videoları, özgün dosyayla aynı baytlarla yerel oynatıcı köprüsüne iletilir.
- Eski Android sürümünde link güncelleme/paylaşma; yeni sürümde open-browser ileti akışı test edildi.
- Canlı ortamda link/şarkı, ortak plan, kapsül kilidi, ses/belge bayt aktarımı, oda ve çizim kontrolleri geçti; bu test hesapları temizlendi.
- Canlı iki hesap arasında yetkili TLS ikili ses aktarımı, kalıcı oturum yenileme ve bildirim tanılaması geçti.
- APK içinde gerçek VideoView, Media3 ExoPlayer ve IntentLauncher DEX sınıfları mevcut. Özgün sesler ve 21 dış simge/açılış görseli korundu.

Canlı eski genel oyun kontrolünde erken refleks hamlesi için 409 bekleyen test, ağ gecikmesi yüzünden hamle geçerli zamana ulaştığında 200 aldı. Bu kontrol tam başarılı olarak sayılmadı; sunucu saatini ve erken hamleyi doğrulayan yerel test başarılıdır.

Gerçek Samsung cihazda son kurulum, codec oynatma, dış uygulama ve donanım bildirim teslimi gözlemlenmedi; tarayıcı/köprü testleri fiziksel cihaz testinin yerine geçmez.
