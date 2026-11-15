# Hizmet 3.14.0 / Android 3.8.9

50 sunucu/birim testi geçti. İki mobil tarayıcıda gerçek video ve aynı anda ses/yazılı sohbet, kontrol/arama, şifreli içerik, yerel oynatıcı köprüsü, güvenli çıkış test edildi. Yeni düzen 320/390px altı ekranda taşma ve altı sabit menü ile kontrol edildi.

Sesli odada katılmadan önce kullanıcı bilgileri ve mikrofon açıklaması, açık katılma düğmesi, iki tarayıcı arasında gerçek WebRTC ses, susturma, küçültme ve ayrılma kontrol edildi.

Ek harici oynatıcı benzetimi YouTube durum olaylarını standart API ile taklit eder: gereksiz tekrar sardırma yok; yükleme beklemesi ortak devam eder; elle duraklatma korunur. Bu test gerçek YouTube sunucusundan medya teslim testi değildir.

Sunucu geçici yükleme duraklaması sırasında önceki oynatma niyetini saklar; iki taraf hazır olunca devam eder. Elle duraklatma, ayrılma veya çevrimdışı partner otomatik devamı iptal eder. Bu niyet bellektedir; sunucu yeniden başlatılırsa video güvenli biçimde duraklatılmış kalır.

Android imzası, 59 yerel dosya, 16KB hizalama, 21 özgün uygulama görseli ve derlenmiş paket doğrulandı. Fiziksel cihaz testi gözlemlenmedi.
