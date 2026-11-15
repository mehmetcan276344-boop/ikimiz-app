# İkimiz — kullanım

## Hemen aç

https://ikimiz-production-17d04203.up.railway.app

İkiniz de bu adresi kullanın. Her kişi kendi hesabını oluşturur. İlk kişi çift alanı oluşturup sevgilisine davet kodunu verir; ikinci kişi kendi hesabından koda katılır.

## Telefona ekle

- Android: Chrome menüsü → Ana ekrana ekle / Uygulamayı yükle.
- iPhone: Safari paylaş menüsü → Ana Ekrana Ekle.
- Android APK: İlk açılışta sunucu adresi istenirse yukarıdaki HTTPS adresini gir.

## Verilerini koru

Profil bölümünden kurtarma kodu oluşturup güvenli bir yere kaydet. İçerik şifrelemesini açarsan ortak alan anahtarını ayrıca yedekle; kurtarma kodu onun yerine geçmez.

## Yerel çalışma ve yedek

Bilgisayarda Baslat.cmd dosyasını aç. Node.js 24 gerekir. Yerel ve internetteki hesaplar ayrı veritabanlarındadır. Yerel kullanımda Yedekle.cmd, SQLite WAL kayıtları dâhil tutarlı bir yedek üretir ve bütünlüğünü doğrular. Yedekler backups klasörüne yazılır; mevcut yedeklerin üzerine yazılmaz.

## Henüz doğrulanamayanlar

Gerçek telefonda APK kurulumu ve bildirim teslimi test edilmedi. Mesaj bildirimleri için Firebase FCM / Apple APNs bilgileri gerekir. İmzalı iPhone paketi için Apple Developer imzalama bilgileri eksiktir. iPhone tarayıcı sürümü kullanılabilir.

## Hazır Android kurulum dosyası

Tam teslim ZIP paketinde Android/Ikimiz-Android.apk dosyası bulunur. Android telefonunda bu dosyayı açıp kurulumu tamamla. Uygulama canlı sunucuya otomatik bağlanır.

## Kolay davet

İlk başlayan “Davet oluştur ve paylaş” düğmesine dokunur ve “Daveti paylaş” ile bağlantıyı gönderir. Diğer kişi bağlantıyı açıp kendi hesabına giriş yapar; kod otomatik hazır gelir ve “Sevgilime katıl” düğmesiyle eşleşir. Sadece kod gönderildiyse “Davet kodum var” alanına yapıştırabilir.

Davet kodu kutusu eşleşmemiş hesaplarda ana ekranın üstünde ve Profil bölümünde bulunur. Kendi boş alanını önceden açmış olsan da sevgilinin koduyla katılabilirsin. Alanında kayıt varsa işlem onları korumak için durdurulur. Telefondaki APK, canlı sunucuyu kullanır; localhost davetleri onunla ortak değildir.


## Partnerliği bitirip başka biriyle eşleşme (3.3)

Profil → Partnerlik → Partnerliği bitir. Mevcut şifreni girip onay kutusunu işaretle. Bu işlem iki kişi için de eşleşmeyi bitirir. Ardından başlangıç ekranındaki kod alanından yeni partnerine katılabilir veya yeni davet oluşturabilirsin.

Eski mesajlar ve anılar silinmez; Eski hikâyelerim bölümünde salt okunur kalır. Yeni partnerin bu arşivi göremez. Eski alanın şifreleme anahtarını ayrıca sakla. Son eski üye de hesabını silerse eski alan silinir.

## Tek seferlik mini not

Ana ekrandaki Mini notlar bölümünden Not bırak’a dokun. 280 karaktere kadar yazıp gönder. Alıcı Aç → Notu bir kez aç ile okur. Ekranı kapattıktan sonra içeriği tekrar göremez. Gönderende Açıldı yazar. İnternet bağlantısı gerekir; açma isteği sunucuda tamamlanıp yanıt cihaza ulaşmazsa içerik tekrar alınamaz. Ekran görüntüsü ve kopyalama engellenmez.

## Profil fotoğrafı

Profil → Fotoğraf seç / değiştir. Seçilen fotoğraf ortasından kare olarak kırpılır ve kaydedilir. Değiştirmek için yeniden seç, kaldırmak için Fotoğrafı kaldır’a dokun. Fotoğrafın kendi profil simgende ve mevcut sevgilinin sohbet ekranında görünür.

## Yorumlar ve büyük profil fotoğrafı

Paylaşımdaki Yorum düğmesine dokun. Yorumlar iki kişiye özeldir; kendi yorumundaki × ile silebilirsin. Bağlantı yokken yorum gönderim kuyruğunda bekler. Şifreli alanda önce alan anahtarını aç. Tek seferlik mini notlar ve henüz günü gelmeyen mektuplar yorumlanamaz.

Profil bölümündeki veya sohbetteki fotoğrafa dokunarak büyük açabilirsin. Üstteki profil menü simgesi Profil sayfasına gider. Sayfa, ekran genişliğine göre ölçeklenir; iki parmakla yakınlaştırma/uzaklaştırma kapatılmıştır.

## Birlikte oyun oynama
Alt menüde Oyunlar bölümünü aç. Bir oyun başlat; partnerin aynı bölümden Hazırım diyerek katılsın. Her oyunun sırası, seçimleri ve sonucu canlı güncellenir. Bağlantı gerekir; kesilirse oturum sunucuda korunur. Görevleri/kartları geçebilir, açık oyunu kapatabilirsin. Son 20 oyun saklanır. Oyun cevapları içerik şifrelemesi kapsamında değildir. Ayrıntılar OYUNLAR.md içinde.

## Yeni sohbet menüsü
Mesajın altındaki üç nokta düğmesiyle tepki, yanıt, yorum, kendi mesajını düzenleme ve silme seçeneklerini açabilirsin. Alt menüde Oyunlar yalnızca bir kez görünür. Papatya teması ve bu düzeltmeler webden güncellenir; uygulamayı tamamen kapatıp aç.
