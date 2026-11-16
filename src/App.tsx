import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import './App.css';

const captions = [
  'Senyummu sederhana, tetapi selalu berhasil membuat hariku lebih indah.',
  'Ada banyak hal yang kusukai, salah satunya melihatmu tersenyum.',
  'Satu potret, banyak cerita yang ingin selalu kuingat.',
  'Entah bagaimana, hal sederhana tentangmu selalu terasa istimewa.',
  'Kalau bahagia punya wajah, mungkin salah satunya adalah wajahmu.',
  'Sedikit tingkah, banyak cerita, dan selalu berhasil membuatku tertawa.',
  'Tidak harus sempurna untuk menjadi seseorang yang begitu berarti.',
  'Dari sekian banyak hal indah, mengenalmu adalah salah satunya.',
  'Semoga masih banyak kenangan yang bisa kita abadikan bersama. 🤍',
];

type SavedPhoto = {
  name: string;
  blob: Blob;
};

function openPhotoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ANANTA_PhotoDB', 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains('photos')) {
        db.createObjectStore('photos');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getSavedPhotos(): Promise<SavedPhoto[]> {
  const db = await openPhotoDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('photos', 'readonly');
    const request = transaction.objectStore('photos').get('gallery');

    request.onsuccess = () => {
      resolve(request.result || []);
      db.close();
    };

    request.onerror = () => {
      reject(request.error);
      db.close();
    };
  });
}

async function savePhotosToDB(photos: SavedPhoto[]): Promise<void> {
  const db = await openPhotoDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction('photos', 'readwrite');

    transaction.objectStore('photos').put(photos, 'gallery');

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };

    transaction.onabort = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export default function App() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [letter, setLetter] = useState(false);
  const [intro, setIntro] = useState(true);
  const [introClosing, setIntroClosing] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [localPhotoFiles, setLocalPhotoFiles] = useState<SavedPhoto[]>([]);
  const localSelectionRef = useRef(false);
  const [, setLocalPhotosSelected] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [slideshow, setSlideshow] = useState(false);
  const selectedPhotoIndex = photos.indexOf(selectedPhoto || '');

function showPreviousPhoto() {
  if (photos.length === 0) return;

  const previousIndex =
    (selectedPhotoIndex - 1 + photos.length) % photos.length;

  setSelectedPhoto(photos[previousIndex]);
}

function showNextPhoto() {
  // SLIDESHOW OTOMATIS
useEffect(() => {
  if (!slideshow || !selectedPhoto || photos.length < 2) return;

  const timer = window.setInterval(() => {
    setSelectedPhoto((current) => {
      const index = photos.indexOf(current || '');
      const nextIndex = (index + 1) % photos.length;

      return photos[nextIndex];
    });
  }, 3000);

  return () => window.clearInterval(timer);
}, [slideshow, selectedPhoto, photos]);
  if (photos.length === 0) return;

  const nextIndex = (selectedPhotoIndex + 1) % photos.length;

  setSelectedPhoto(photos[nextIndex]);
}
  // ANIMASI SAAT SCROLL
useEffect(() => {
  const elements = document.querySelectorAll(
    '.about, .gallery-section, .quote, .letter'
  );

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
    }
  );

  elements.forEach((element) => observer.observe(element));

  return () => observer.disconnect();
}, []);

  // MEMILIH FOTO DARI LAPTOP

  function choosePhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files || []).filter((file) =>
      file.type.startsWith('image/')
    );

    event.currentTarget.value = '';

    if (files.length === 0) return;

    const previousPhotos = localSelectionRef.current ? localPhotoFiles : [];

    const combinedPhotos = [
      ...previousPhotos,
      ...files.map((file) => ({
        name: file.name,
        blob: file,
      })),
    ].slice(0, 9);

    localSelectionRef.current = true;

    setLocalPhotosSelected(true);
    setLocalPhotoFiles(combinedPhotos);

    setPhotos(combinedPhotos.map((photo) => URL.createObjectURL(photo.blob)));

    setPhotoError(false);

    savePhotosToDB(combinedPhotos).catch((error) => {
      console.error('Gagal menyimpan foto:', error);
    });
  }

  // MEMUAT FOTO TERSIMPAN ATAU DARI GITHUB
  useEffect(() => {
    let cancelled = false;

    async function loadGallery() {
      try {
        const savedPhotos = await getSavedPhotos();

        if (cancelled || localSelectionRef.current) return;

        if (savedPhotos.length > 0) {
          const limitedPhotos = savedPhotos.slice(0, 9);

          setLocalPhotoFiles(limitedPhotos);
          setLocalPhotosSelected(true);
          localSelectionRef.current = true;

          setPhotos(
            limitedPhotos.map((photo) => URL.createObjectURL(photo.blob))
          );

          return;
        }

        const response = await fetch(
          'https://api.github.com/repos/buluk2kd/musik-ananta/contents/'
        );

        if (!response.ok) {
          throw new Error('Gagal mengambil foto dari GitHub');
        }

        const files = await response.json();

        const images = files
          .filter(
            (file: any) =>
              file.type === 'file' && /\.(jpg|jpeg|png|webp)$/i.test(file.name)
          )
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
          .slice(0, 9)
          .map((file: any) => file.download_url);

        if (cancelled || localSelectionRef.current) return;

        setPhotos(images);

        if (images.length === 0) {
          setPhotoError(true);
        }
      } catch (error) {
        console.error(error);

        if (!cancelled && !localSelectionRef.current) {
          setPhotoError(true);
        }
      }
    }

    loadGallery();

    return () => {
      cancelled = true;
    };
  }, []);

  // MUSIK
  function playMusic() {
    setMusicOpen((previous) => !previous);
  }

  return (
    <div className="website">
      {/* PEMBUKA KHUSUS TIARA */}
      {intro && (
      <div className={`intro-screen ${introClosing ? 'intro-closing' : ''}`}>
          <p className="intro-label">SEBUAH CERITA TENTANG KITA</p>

          <h1>
            Untuk <i>Tiara.</i>
          </h1>

          <p className="intro-name">TIARA WILDA NURHAYATI</p>

          <p className="intro-caption">
            Seseorang yang memiliki tempat istimewa.
          </p>

          <button
  onClick={() => {
    setIntroClosing(true);
    setTimeout(() => setIntro(false), 900);
  }}
>
  BUKA CERITA KITA ♡
</button>

          <span className="intro-footer">DENGAN KASIH, UNTUKMU.</span>
        </div>
      )}

      {/* NAVIGASI */}
      <nav>
        <h2>
          ANANTA<span>♡</span>
        </h2>

        <div>
          <a href="#about">Kisah</a>
          <a href="#gallery">Kenangan</a>
          <a href="#letter">Surat</a>
        </div>

        <button onClick={playMusic}>
          {musicOpen ? 'Tutup Pemutar ×' : '♪ Dengarkan Lagu'}
        </button>
      </nav>

      {musicOpen && (
        <div className="ananta-player">
          <div className="player-info">
            <span className="player-label">NOW PLAYING</span>
            <h3>Masa Ini, Nanti, dan Masa Indah Lainnya</h3>
            <p>Nuca</p>
          </div>

          <a
            className="music-link"
            href="https://youtu.be/31eqamGE0gM"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>▶</span> Putar Musik di YouTube
          </a>
        </div>
      )}

      {/* HALAMAN PEMBUKA */}
      <header>
        <p className="small">✦ PRAṆAYA — KISAH TENTANG KASIH ✦</p>

        <h1>
          Dalam Setiap
          <br />
          <i>Masa.</i>
        </h1>

        <p>
          Untuk Tiara Wilda Nurhayati.
          <br />
          Di antara jutaan manusia, semesta mempertemukanku dengan seseorang
          yang ingin terus kukenal, hari demi hari.
        </p>

        <a className="explore" href="#about">
          JELAJAHI KISAH KITA ↓
        </a>

        <span className="hero-symbol">अनन्त</span>
      </header>

      {/* TENTANG TIARA */}
      <section id="about" className="about">
        <p className="small">01 — TENTANG DIRIMU</p>

        <h2>
          Namamu adalah
          <br />
          <i>sebuah cerita.</i>
        </h2>

        <p>
          Ada manusia yang hadir seperti hujan, datang tanpa banyak suara, namun
          meninggalkan kesejukan yang lama terasa.
        </p>

        <p>
          Bagiku, manusia itu adalah kamu, Tiara Wilda Nurhayati. Bukan karena
          engkau tanpa cela, melainkan karena segala sederhana tentangmu selalu
          punya cara untuk membuatku jatuh hati.
        </p>

        <p>
          Terima kasih sudah menjadi bagian dari hari-hariku. Tetaplah menjadi
          dirimu sendiri, tetaplah banyak cerita, dan jangan terlalu sering
          ngambek. Walaupun kadang tingkahmu membuatku geleng-geleng kepala,
          entah kenapa aku tetap suka.
        </p>

        <div className="stats">
          <div>
            <b>01</b>
            <span>Satu yang istimewa</span>
          </div>

          <div>
            <b>∞</b>
            <span>Alasan untuk menyayangimu</span>
          </div>

          <div>
            <b>100%</b>
            <span>Tetap kamu</span>
          </div>
        </div>
      </section>

      {/* GALERI FOTO */}
      <section id="gallery" className="gallery-section">
        <p className="small">02 — HAL KECIL, MAKNA TERBESAR</p>

        <h2>
          Aksara <i>Kenangan.</i>
        </h2>

        <p className="description">
          Sebab setiap potret menyimpan kisah, dan setiap kisah selalu memiliki
          alasan untuk dikenang.
        </p>

        {/* TOMBOL PILIH FOTO */}
        <label className="photo-upload">
          + PILIH FOTO DARI LAPTOP
          <input type="file" accept="image/*" onChange={choosePhotos} hidden />
        </label>

        {photos.length > 0 ? (
          <div className="gallery">
            {photos.map((photo, index) => (
              <div className="photo-card" key={photo}>
                <div className="photo">
                  <img
                    src={photo}
                    alt={`Kenangan Tiara ${index + 1}`}
                    loading="lazy"
                    className="gallery-image"
                    onClick={() => setSelectedPhoto(photo)}
                  />
                </div>

                <h3>Kenangan {String(index + 1).padStart(2, '0')}</h3>

                <p>{captions[index]}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="description">
            {photoError
              ? 'Foto belum berhasil dimuat. Silakan periksa repository GitHub.'
              : 'Sedang menyiapkan kenangan...'}
          </p>
        )}
      </section>
      

{/* FOTO UKURAN BESAR */}
{selectedPhoto && (
  <div
    className="photo-lightbox"
    onClick={() => {
      setSelectedPhoto(null);
      setSlideshow(false);
    }}
  >
    <button
      className="lightbox-close"
      onClick={() => {
        setSelectedPhoto(null);
        setSlideshow(false);
      }}
    >
      ×
    </button>

    <button
      className="lightbox-nav lightbox-prev"
      onClick={(event) => {
        event.stopPropagation();
        showPreviousPhoto();
      }}
    >
      ‹
    </button>

    <img
      key={selectedPhoto}
      src={selectedPhoto}
      alt="Kenangan Tiara ukuran besar"
      onClick={(event) => event.stopPropagation()}
    />

    <button
      className="lightbox-nav lightbox-next"
      onClick={(event) => {
        event.stopPropagation();
        showNextPhoto();
      }}
    >
      ›
    </button>

    <div
      className="slideshow-controls"
      onClick={(event) => event.stopPropagation()}
    >
      <p>
        {String(selectedPhotoIndex + 1).padStart(2, '0')} /{' '}
        {String(photos.length).padStart(2, '0')}
      </p>

      <button onClick={() => setSlideshow((value) => !value)}>
        {slideshow ? 'Ⅱ Jeda Slideshow' : '▶ Putar Slideshow'}
      </button>
    </div>
  </div>
)}

      {/* KUTIPAN */}
      <section className="quote">
        <span>“</span>

        <h2>
          Jika waktu adalah samudra,
          <br />
          biarlah namamu menjadi
          <br />
          tempat hatiku <i>berlabuh.</i>
        </h2>

        <p>— Sebuah aksara untuk Tiara.</p>
      </section>

      {/* SURAT RAHASIA */}
      <section id="letter" className="letter">
        <p className="small">03 — UNGKAPAN YANG ABADI</p>

        <h2>
          Sebuah Surat
          <br />
          <i>Untukmu.</i>
        </h2>

        <p>Ada beberapa rasa yang tak selalu mampu disampaikan oleh lisan.</p>

        <button onClick={() => setLetter(!letter)}>
          {letter ? 'Tutup Surat ♡' : 'Buka Surat Rahasia ♡'}
        </button>

        {letter && (
          <div className="message">
            <h3>Untuk Tiara, pemilik cerita.</h3>
            Di antara riuhnya jagat raya, hadirmu adalah ketenangan yang selalu
            kusyukuri.
            <br />
            <br />
            Aku tidak menjanjikan perjalanan yang selalu dipenuhi pelangi.
            Namun, aku ingin menjadi seseorang yang tetap menggenggam tanganmu
            ketika langit sedang tidak bersahabat.
            <br />
            <br />
            Terima kasih telah menjadi dirimu sendiri. Dengan segala tawa,
            cerita, manja, dan tingkah ajaib yang kadang membuatku kehilangan
            kesabaran.
            <br />
            <br />
            Oh iya, Ndut, jangan lupa makan, tetapi jangan semuanya dimakan
            sendirian. 
            <br />
            <br />
            Semoga kisah kita menjadi aksara yang tak bosan ditulis oleh waktu.
            <br />
            <br />
            Aku menyayangimu, Tiara. Hari ini, esok, dan selama semesta masih
            memberi kita kesempatan. 🤍
            <br />
            <br />
            <i>— Dari seseorang yang memilihmu.</i>
          </div>
        )}
      </section>

      {/* PENUTUP */}
      <footer>
        <h2>
          A<span>♡</span>T
        </h2>

        <p>Ananta — Sebuah kisah yang tak berkesudahan.</p>

        <small>DITULIS DENGAN KASIH · KHUSUS UNTUK TIARA</small>
      </footer>
    </div>
  );
}
