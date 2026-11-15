# İkimiz Android 3.7.0

Paket com.ikimiz.couple, versionCode 11. Mevcut uygulamanın üzerine kurulabilir; aynı imza doğrulandı.

- Kalıcı oturum SecureStore ile korunur; parola saklanmaz. Sunucu oturumu iptal edildiğinde geri yüklenmez.
- Mikrofon izni yalnızca sesli odaya katılmak için kullanılır. Uygulama arka plana geçtiğinde oda kapatılır.
- Dokunulan bildirim kapatılır ve eski bildirim açılış yanıtı temizlenir.
- Bağlantı düğmesi kaldırılmıştır. Otomatik cihaz kaydı açılışta başarı bildirimi göstermez.
- Profil sürüm alanından Android güncelleme bağlantısı açılabilir.

SHA-256: 8a549655d32b5ed77b9642e1b24a95b233ae6456dc0cda81972f7895622d0752

Mikrofon ve bildirim izinleri, Firebase kimliği, özgün WAV sesleri ve derlenmiş oturum/bildirim köprüleri doğrulandı. Fiziksel Samsung'da ekran kilitliyken gerçek push teslimi ayrıca gözlenmelidir.
