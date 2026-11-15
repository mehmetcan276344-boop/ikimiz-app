# İkimiz gizlilik politikası — yayın öncesi taslak

Bu metin henüz yayımlanmadı. İşletmeci adı ve iletişim bilgisi girilip geliştirici tarafından gözden geçirilmeden mağazaya gönderilmemeli.

## İşletmeci ve iletişim
İşletmeci: geliştirici tarafından tamamlanacak.
Destek ve veri talepleri adresi: geliştirici tarafından tamamlanacak.

## İşlenen bilgiler
Hesap oluştururken ad, e-posta ve parola bilgileri işlenir; parola sunucuda açık metin tutulmaz. Ortak alana eklenen mesajlar, anılar, görseller, planlar, özel günler, mektuplar, yorumlar, profil fotoğrafları ve ilgili zaman bilgileri hizmeti sunmak için saklanır. Oturum ve cihaz bildirim kayıtları hesabın çalışması ve isteğe bağlı bildirimler için kullanılır.

## Ortak alan ve erişim
Ortak içerikler eşleşen iki hesap tarafından görülebilir. Partnerlik sona erince eski ortak alan arşivlenebilir; yeni partner buna erişemez. Profil fotoğraflarına sahibi ve mevcut partneri erişebilir.

## İçerik şifreleme
İsteğe bağlı ortak alan şifrelemesi desteklenen içerikleri cihazda şifreler. Alan anahtarı kullanıcı tarafından korunmalıdır. Bu özellik hesap bilgilerini, profil fotoğraflarını ve tüm ilişki metaverilerini kapsamaz. Şifreleme etkin değilken içerikler sunucuda açık metin olarak işlenebilir.

## Tek seferlik mini notlar
Mini not yalnızca karşı partner tarafından açılabilir. Başarılı ilk açılıştan sonra etkin kaydın metni temizlenir. Alıcının içeriği kopyalaması veya ekran görüntüsü alması engellenmez. Daha önce alınmış yedeklerde eski kopya bulunabilir.

## Hizmet sağlayıcıları
Canlı sunucu Railway üzerinde çalışır. Yedekler yapılandırılmış S3 uyumlu depolamaya şifreli olarak aktarılır. Android derlemesi Expo EAS kullanır; Android arka plan bildirimleri etkinleştirildiğinde Expo ve Firebase Cloud Messaging üzerinden cihazlara iletilir. Bildirim gövdesinde özel mesaj veya fotoğraf içeriği gönderilmez. E-posta gönderimi ancak gönderim sağlayıcısı bağlandığında etkinleşir. Reklam veya kullanıcı takibi SDK'sı eklenmedi.

## Silme, dışa aktarma ve saklama
Kullanıcı uygulama içinden verilerini dışa aktarabilir ve hesabını silebilir. Partner ortak alanda kalıyorsa bazı paylaşımlar korunabilir; kullanıcı kaldırmak istediği kendi içeriklerini hesabını silmeden önce kaldırmalıdır. Son üye de hesabını silerse ortak alan silinir. Yerelde en fazla 3, uzak depolamada en fazla 14 yedek kopyası tutulacak şekilde yapılandırma vardır; önceden alınmış kopyalar bu döngüde temizlenir. Hesap silme yönergeleri: https://ikimiz-production-31ff1f6c.up.railway.app/hesap-silme.html

## Telefon izinleri
Fotoğraf veya kamera erişimi kullanıcının seçtiği paylaşım işlemleri için, bildirim izni ise isteğe bağlı bildirimler için kullanılır. Kullanıcı izinleri cihaz ayarlarından yönetebilir.

Son taslak tarihi: 13 Kasım 2026. Bu dosya hukuki uygunluk veya mağaza onayı belgesi değildir.

## Ortak oyunlar
Oyun oturumları, tercihler, tahminler, puanlar ve yazılan hikâye/kart cevapları aynı oturumdaki iki oyuncu için saklanır. Bu veriler isteğe bağlı içerik şifrelemesinin kapsamında değildir. Son 20 oyun oturumu korunur; yeni partner önceki oyuncuların oyunlarına erişemez.
