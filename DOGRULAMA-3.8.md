# İkimiz web 3.8.0 / Android 3.6.0

Oyunlar: canlı olaylar kısa aralıkta birleştirilir; aynı oyun sürümü formu yeniden oluşturmaz. Hamle yanıtı doğrudan uygulanır. Eski oturum yanıtları yok sayılır; eski partner kadrosuyla hamle reddedilir.

Yorumlar ve oyun davetleri: ayrı, kalıcı bildirim kuyruğu; yorum başına tekrar önleme, silinmiş yorum iptali, ortak alan kontrolü, gizli metinsiz içerik, doğru içeriğe yönlendirme. Android ses kanalı korunur. Expo makbuzları sorgulanır; sağlayıcı kabulü fiziksel cihaz teslimi anlamına gelmez. Cihaz kaydı yenilenince kuyruk korunur.

Açılıştaki otomatik cihaz kaydı artık başarı mesajı göstermez. Kullanıcı izin düğmesine basarsa sonuç gösterilir. Android üst çubuğundaki Bağlantı düğmesi kaldırıldı. Bu yerel değişiklik Android 3.6.0 gerektirir.

Doğrulama: 19 sunucu testi; iki oyuncuyla beş oyun; yorum/çevrimdışı kuyruk/şifreleme; mobil görünüm ve fotoğraf DOM kararlılığı; bildirim sesi kontrolleri. Yorum bildirimiyle anıyı açma ve eski ortak alanı reddetme tarayıcı testi.

Gerçek Samsung cihazda ekran kilitliyken teslim/ses ayrıca gözlenmeli. E-posta şifre sıfırlama göndericisi, mağaza dağıtımı ve iOS sertifikaları henüz tamamlanmış sayılmaz.

Ek Android düzeltmesi: dokunulan bildirim dismissNotificationAsync ile kaldırılır, son yanıt temizlenir, aynı bildirim tekrar işlenmez. Çalışan uygulamada açılan bildirim bir sonraki durum güncellemesinde yeniden açılmaz. 20 sunucu/yerel bildirim testi geçti.
