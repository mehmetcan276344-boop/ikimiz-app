Güncel sürüm: hizmet **3.16.0** / Android **3.9.0 (kod20)**. Ayrıntılar: DOGRULAMA-3.13.md ve ANDROID-3.9.0.md.

# İkimiz 3.7 (web) · Android 3.5.0

İki kişilik çift uygulaması: ortak mesajlar, fotoğraflı anılar, özel günler, hayal listesi, ruh hâli, günlük soru ve sürpriz mektuplar.

## Yorumlar

Kalıcı paylaşımlardaki Yorum düğmesiyle yorumları aç. En fazla 1000 karakter yazabilir, kendi yorumunu silebilirsin. İnternet kesilirse yorum cihazında bekler. Şifreleme açık alandaki yeni yorumlar aynı alan anahtarıyla korunur. Tek seferlik mini notlar ve kilitli mektuplar yorumlanmaz.

## Profil fotoğrafı

Profil → Fotoğraf seç / değiştir. Profil simgende ve partnerinin sohbet ekranında görünür. Aynı bölümden kaldırabilirsin.

## Tek seferlik mini notlar

Ana ekranda Mini notlar → Not bırak. En fazla 280 karakter. Alıcı açmadan önce onay verir; bir kez açtıktan sonra tekrar gösterilmez. Gönderene “Açıldı” durumu gelir. İçerik normal durum API’sine ve dışa aktarma dosyasına yazılmaz. Ekran görüntüsü/kopyalama engellenmez.

## Sohbet ve telefon klavyesi

3.3.2 sürümünde sohbete geri dönünce son mesaj açılır. Eski mesajları okurken eşitleme konumu korur. Yerel Android klavye ölçümü ve geri tuşu düzeltmesi için yeni APK’ya güncelleme gerekir; yalnızca kapatıp açmak bu yerel değişikliği yüklemez. İmzalar doğrulandı; mevcut uygulama silinmeden güncellenebilir.

## 3.3 güncellemesinin durumu

Partnerliği bitirme, eski hikâyeler, tarayıcı bildirimleri ve otomatik şifreli yedek canlıya alındı. Uzak yedekten ayrı dizine geri yükleme kontrolü geçti. Yeni tasarımda yazılar ve dokunma alanları büyütüldü; mesaj/anı/plan kısayolları ve sade profil düzeni eklendi.

E-posta, Android/iOS yerel bildirimleri ve mağaza yayınları ilgili hesap bağlantıları olmadan tamamlanamaz. Ayrıntılı doğrulama ve kalanlar TAMAMLAMA-DURUMU.md dosyasında. Paket içindeki Android sürümü için Android/KURULUM.txt ve APK-DOGRULAMA.md dosyalarına bak.

## Hemen kullan

**https://ikimiz-production-31ff1f6c.up.railway.app**

İkiniz bu adresi açıp ayrı hesap oluşturun. İlk kişi çift alanı açar ve davet kodu oluşturur; ikinci kişi kendi hesabıyla bu koda katılır. Ayrıntılı adımlar KULLANIM.md dosyasında. iPhone ve Android tarayıcısından ana ekrana eklenebilir.

## Bu sürümde tamamlananlar

- Yeni logo; giriş, başlık, yükleme, Android/iPhone/PWA simgeleri ve açılış ekranları.
- Mobil güvenli alan desteği; 320/360/390 piksel ekranlarda taşma kontrolleri.
- HTTPS üzerinden çalışan sunucu ve /app/data yoluna bağlı kalıcı disk.
- Gerçek sunucu yeniden başlatmasında hesap, oturum ve kayıtların korunması doğrulandı.
- Canlı yayında iki hesap, davetle eşleşme, ortak mesaj, oturum güvenliği ve uzun şifreli mesaj düzenleme kontrolleri geçti. Geçici test hesapları temizlendi.
- Tekrar açılan bildirimlerde özel gün hatırlatmalarının yeniden kurulması düzeltildi.
- Mobil bağımlılıklar kilitlendi; 18/18 Expo sağlık kontrolü, Android/iPhone Hermes paketleme ve Android yerel proje üretimi geçti.
- Android üretiminde Kotlin paket adı ile namespace uyuşmazlığına kalıcı düzeltme eklendi.
- Yedekle.cmd ile canlı SQLite yedeği ve yedek bütünlüğü kontrolü.

## Kullanılabilir özellikler

Mesaj yanıtları, fotoğraflı mesajlar, emoji tepkileri, okundu ve yazıyor bilgisi; çevrimdışı kuyruk ve tekrar önleme; fotoğraflı anı defteri ve arama; yıllık özel günler ve planlar; ruh hâli ve günlük soru; gelecekte açılan mektuplar; profil/şifre değişikliği; kurtarma kodu; isteğe bağlı AES-GCM içerik şifrelemesi; JSON dışa aktarma ve hesap silme.

Şifreleme varsayılan olarak kapalıdır. Açarsan ortak alan anahtarını ayrıca yedekle. Şifre kurtarma kodu, alan anahtarının yerine geçmez. Güvenlik ayrıntıları GUVENLIK-VE-YAYIN.md dosyasında.

## Bilgisayarda yerel çalıştır

ZIP'i çıkar ve Baslat.cmd dosyasını aç. Node.js 24 gerekir; bu bilgisayardaki mevcut çalışma ortamı da desteklenir. http://localhost:8787 adresini aç. Sunucu penceresi açık kalmalı. Yerel hesaplar ve internetteki hesaplar ayrı veritabanlarındadır.

Sunucu: npm start. Testler: npm test. Yedek: npm run backup veya Yedekle.cmd. .env dosyasını kullanmak istersen node --env-file=.env server.mjs komutunu çalıştır. Normal npm start, .env dosyasını otomatik okumaz.

## Mobil proje

mobile/ altında Expo/React Native WebView projesi bulunur. Varsayılan sunucu adresi canlı uygulamaya bağlanmıştır. Android-Olustur.cmd ve iPhone-Olustur.cmd bağımlılıkları kilitli sürümlerle kurup ilgili derlemeyi başlatır. Expo projesi bağlandı ve Android imzalama anahtarı Expo hesabında tutulur; özel anahtarlar bu ZIP'te bulunmaz.

## Kalan dış gereksinimler

Apple imzalama bilgileri bulunmadığından IPA/iPhone mağaza paketi tamamlanmadı. Gerçek mesaj bildirimleri için Firebase FCM / Apple APNs ayarları gerekir; telefonlara teslim henüz doğrulanmadı. Fiziksel Android/iPhone kurulum testleri yapılmadı. İmzalı Android APK üretimi başarıyla tamamlandı (3.2.1). İndirme bağlantısı teslim mesajında bulunur. Tarayıcı sürümü kullanılabilir.

Telefon kurulumu ve mağaza dışı APK uyarıları için TELEFONA-KURULUM.md dosyasını oku. APK imza/izin doğrulama sonuçları APK-DOGRULAMA.md dosyasında.
