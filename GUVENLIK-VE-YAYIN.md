# Güncel Android bildirim durumu

13 Kasım 2026: Firebase FCM v1 gönderici hesabı kullanıcı onayıyla Expo projesine bağlandı. Canlı EXPO_PUSH_ENABLED=1 ve Google dry-run doğrulandı. Android 3.5.0 kurulup Profil içinden izin/cihaz kaydı açılmalıdır. Fiziksel teslim testi henüz gözlenmedi; iOS APNs ayrı erişim bekler. Aşağıdaki önceki sürüm notları tarihsel olabilir; güncel adımlar BILDIRIM-KURULUMU.md içindedir.

# 3.3 güncel durum

Bu belgenin önceki sürümlere ait doğrulama notları aşağıdadır. 3.3 için güncel teslim/yayın durumu TAMAMLAMA-DURUMU.md dosyasındadır. 3.3 canlıya alındı ve şifreli uzak yedekten ayrı dizine geri yükleme doğrulandı. Gerçek iki telefonla tam test, yerel bildirim servisleri ve mağaza yayınları tamamlanmadı.

# Güvenlik, bildirim ve yayın durumu

## Hesabını kurtarma

Profil → **Kurtarma kodu oluştur**. Mevcut şifreni gir. Gösterilen kodu güvenli bir yerde sakla; sunucu kodun yalnızca özetini tutar. Yeni kod eskisini iptal eder.

Şifreni unutursan giriş ekranında **Şifremi unuttum · kurtarma kodum var** bölümünden e-posta, kod ve yeni şifreni gir. Kod tek kullanımlıktır. Diğer oturumlar ve eski bildirim cihaz kayıtları kapatılır. Yeni kod oluştur.

Bu e-posta ile sıfırlama hizmeti değildir. Önceden kod oluşturmadan şifreni unutursan bu yöntem kullanılamaz.

## İçerik şifrelemesi

Varsayılan olarak kapalıdır. Profil → **İçerik şifrelemesini aç**. Cihaz 256 bit rastgele ortak anahtar üretir; anahtar önce cihazda saklanır. Sunucuya yalnızca anahtarın özeti gönderilir. Yeni mesaj, not, anı metni ve fotoğraf cihazda AES-GCM ile şifrelenir. Her şifrelemede rastgele nonce üretilir; kayıt bağlamı doğrulanır.

Anahtarı güvenli bir yerde yedekle. Diğer cihazda Profil → **Mevcut anahtarı bu cihazda aç** bölümüne aynı anahtarı gir. Anahtar sunucuya gönderilmez. Anahtar olmadan şifreli kayıtlar açılamaz. **Kurtarma kodu veya şifre yenileme, alan anahtarını kurtarmaz.** Anahtar kaybolursa şifreli içeriklere erişim de kaybolabilir. Uygulama alan anahtarını otomatik olarak açmaz veya senin yerine yedeklemez.

**Önceki kayıtlarımı da şifrele** düğmesi, kendi eski kayıtlarını aynı anahtarla şifreler. Partnerin kendi kayıtlarını kendi cihazından şifreleyebilir. Geçmiş sunucu yedekleri ve SQLite WAL içinde önceki açık metinler kalmış olabilir; bu işlem geçmiş yedekleri dönüştürmez.

İsim, hikâye adı, içerik türü, tarihler, mesaj ilişkileri, tepkiler ve üyelik bilgileri şifrelenmez. Cihazdaki görüntüleme önbelleği ve gönderim kuyruğu ayrı bir disk şifrelemesi kullanmaz. Paylaşılan anahtar modeli ileri gizlilik veya ayrı kişilik imzası sağlamaz. Bu özellik bağımsız güvenlik denetiminden geçmemiştir; denetlenmiş bir güvenli mesajlaşma protokolüne eşdeğer olduğu iddia edilmez.

Şifreleme HTTPS veya localhost gerektirir. Yerel ağdaki HTTP adresinde açılması desteklenmez; gerçek telefon kullanımı için HTTPS sunucuyu tamamla.

## Bildirimler

Android/iPhone projesi bildirim izni, Expo cihaz kaydı, bildirime dokununca ilgili sekmeyi açma ve özel günler için yerel hatırlatma kodunu içerir. Kullanıcı Profil'den bildirimleri açar. Yerel hatırlatmalar, son eşitlenen takvimden en fazla 32 gelecek gün için saat 09.00'a kurulur. Başka cihazda değişen takvimin hatırlatmaları uygulama yeniden eşitlendiğinde güncellenir.

Sunucunun kalıcı bildirim kuyruğu vardır. Yeniden deneme, geçersiz cihaz kaydını kaldırma ve aynı içerik için çift bildirim işini engelleme uygulanır. Bildirimde özel mesaj metni/fotoğraf/anahtar gönderilmez; genel bir bildirim yazısı kullanılır.

**Gerçek telefona teslim test edilmedi.** Kuyruk gönderimi testlerde sahte servisle doğrulandı. Expo'nun bir bildirimi kabul etmesi, telefonun aldığının kanıtı değildir.

Gerçek bildirim için:

1. Expo projesi/EAS proje kimliği ve gerçek uygulama derlemesi gerekir.
2. Android için Firebase FCM v1 kimliklerini, iPhone için Apple APNs kimliklerini Expo hesabında yapılandır.
3. Android `google-services.json` dosyasını EAS dosya ortam değişkeni olarak `GOOGLE_SERVICES_JSON` adına bağla. Dosyayı kaynak koda ekleme.
4. Sunucuda `EXPO_PUSH_ENABLED=1` ayarla. Expo Push Security etkinse `EXPO_ACCESS_TOKEN` değerini de yalnızca sunucu ortamına koy.
5. Gerçek iki telefonda izin, arka planda teslim ve bildirimden açılışı test et.

Bildirimler tarayıcıda arka planda web push olarak uygulanmadı. Mobil derleme tamamlanmadan bu sürüm telefon push'u gönderemez.

## Kalıcı sunucu

Sunucu Railway üzerinde yayınlandı: https://ikimiz-production-31ff1f6c.up.railway.app. Kalıcı 500 MB disk /app/data yoluna bağlıdır. Node.js 24, tek süreç, HTTPS ve güvenli oturum çerezleri kullanılır. Yayın yapılandırması .railway/railway.ts ile yönetilir; eski railway.toml kaldırıldı.

Railway üzerinde kalıcı bir volume'u **/app/data** yoluna bağla. Bir replica kullan. HTTPS adresini üret; `SECURE_COOKIES=1` ayarla. Volume olmadan SQLite verileri yeniden yayınlama sırasında kaybolabilir. Yedekleri düzenli olarak al. Yerel kullanıcıları taşımak ayrı, kontrollü bir veri aktarımı gerektirir; bu teslimde kişisel veritabanın bir dış hizmete yüklenmedi.

Node.js ortam değerleri `.env.example` içindedir. Node.js 24 ile yerel dosyadan okumak istersen `node --env-file=.env server.mjs` kullanılabilir. Yerel HTTP denemesinde `SECURE_COOKIES=0`, HTTPS üretimde `1` olmalıdır. Normal `node server.mjs` komutu `.env` dosyasını kendiliğinden okumaz.

## Android/iPhone derlemesi

`mobile/Android-Olustur.cmd` ve `mobile/iPhone-Olustur.cmd` kilitli bağımlılık kurulumu, uyumluluk kontrolü ve derleme adımlarını sırayla başlatır. Hata olursa dururlar. Native uygulamanın simgesi yenilendi. İstersen sunucu adresini EAS'ta `EXPO_PUBLIC_SERVER_URL` ile belirle; uygulama ilk açılışta adres girmeyi de destekler.

Mobil bağımlılıklar kuruldu ve kilit dosyası oluşturuldu. Android/iOS Hermes kaynak paketleri ve Android yerel proje üretimi başarıyla tamamlandı. Expo projesi bağlandı; Android imzalama anahtarı Expo sunucusunda oluşturuldu ve APK derlemesi başlatıldı. Apple imzalama bilgileri bulunamadığından IPA üretimi tamamlanmadı. Gerçek cihaz kurulumu, Android FCM / Apple APNs ve bildirim teslimi doğrulanmadı.

## Ek doğrulama

Sunucu testleri kurtarma kodunun tekrar kullanılamamasını, eski oturumların iptalini, şifreli kayıtların sunucuda açık metin bulunmamasını, yanlış anahtar/bağlam reddini, cihaz kayıtlarını ve kuyruk davranışını kapsar. İki tarayıcıyla anahtar aktarımı, şifreli mesaj/fotoğraf görüntüleme, eski kayıt dönüşümü ve kurtarma arayüzü doğrulanmıştır. Gerçek telefon veya bağımsız kriptografi denetimi yapılmamıştır.


## 3.2 son doğrulama

Canlı HTTPS sunucusunda iki ayrı hesapla eşleşme ve ortak mesajlaşma doğrulandı. Gerçek sunucu yeniden başlatmasından sonra hesap/oturum/kayıtlar korundu. 2.000 karakterlik şifreli mesaj düzenleme ve çözme kontrolü hem sunucu testinde hem canlı yayında geçti. Mobil sağlık kontrolü 18/18 başarılıdır. Android kaynak üretimindeki Kotlin paket adı uyuşmazlığı özel config plugin ile düzeltildi.

İmzalı Android APK 3.2.0 üretimi tamamlandı. Derleme: https://expo.dev/accounts/can2763/projects/ikimiz/builds/f1898326-3c2a-41bc-9007-7ae44d8c9bf0 . Gerçek cihazda kurulum testi yapılmadı.

## 3.2.1 telefon kurulumu doğrulaması

Yeni Android APK başarıyla derlendi. Aynı imza sertifikası, sürüm kodu 2, kapalı hata ayıklama ve otomatik yedekleme; kaldırılan üç iznin son APK’de bulunmadığı resmî Android araçlarıyla doğrulandı. Ayrıntılar APK-DOGRULAMA.md dosyasında. Web kurulum uygunluğu normal Chrome profilinde hatasızdır. Bu doğrulamalar Play Protect taraması veya gerçek telefon testi yerine geçmez.
