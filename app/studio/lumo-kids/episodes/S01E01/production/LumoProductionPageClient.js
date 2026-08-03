'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const DB_NAME = 'lumo-kids-production-assets-v1';
const DB_VERSION = 1;
const STORE_NAME = 'files';
const ASSET_KEY = 'S01E01-S01-approved-rescue-v1';
const APPROVAL_KEY = 'lumo_s01e01_s01_rescue_approved_v1';
const DEFAULT_VIDEO = '/lumo-kids/episodes/S01E01/S01E01-S01-approved-rescue-v1.mp4';

const NARRATION = 'En el corazón del bosque mágico estaba Brillavalle, un lugar donde cada pequeña luz tenía algo que contar. Aquella noche, Lumo y sus amigos se preparaban para la Fiesta de las Mil Luces.';

const REFERENCES = [
  {
    name: 'Brillavalle aprobado',
    description: 'Recorte limpio de la guía visual original. Define arquitectura, iluminación y ambiente.',
    src: '/lumo-kids/continuity/ENV-BRILLAVALLE-approved-guide-v3.jpg',
  },
  {
    name: 'Fotograma final seguro',
    description: 'Ancla sin protagonistas identificables, utilizada para completar la introducción mediante montaje.',
    src: '/lumo-kids/episodes/S01E01/S01E01-S01-clean-anchor-v1.jpg',
  },
  {
    name: 'Reparto principal aprobado',
    description: 'Lumo, Nara, Tuno, Biri y Pompón recortados de la guía original. No se envían en S01.',
    src: '/lumo-kids/continuity/CAST-S01-main-five-approved-guide-v3.jpg',
  },
];

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no está disponible.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No se pudo abrir IndexedDB.'));
  });
}

async function getStoredFile(key) {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('No se pudo leer el archivo local.'));
    });
  } finally {
    database.close();
  }
}

async function putStoredFile(key, file) {
  const database = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(file, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('No se pudo guardar el archivo local.'));
      transaction.onabort = () => reject(transaction.error || new Error('Se canceló el guardado local.'));
    });
  } finally {
    database.close();
  }
}

async function removeStoredFile(key) {
  const database = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('No se pudo eliminar el archivo local.'));
    });
  } finally {
    database.close();
  }
}

function Metric({ value, label, accent = '' }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-center">
      <div className={`text-xl font-black ${accent}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-white/35">{label}</div>
    </div>
  );
}

export default function LumoProductionPageClient() {
  const router = useRouter();
  const inputRef = useRef(null);
  const objectUrlRef = useRef('');
  const [videoUrl, setVideoUrl] = useState(DEFAULT_VIDEO);
  const [videoSource, setVideoSource] = useState('repository');
  const [repositoryVideoMissing, setRepositoryVideoMissing] = useState(false);
  const [approved, setApproved] = useState(false);
  const [message, setMessage] = useState('Comprobando el resultado instalado…');

  const replaceObjectUrl = (file) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setVideoUrl(nextUrl);
    setVideoSource('local');
    setRepositoryVideoMissing(false);
  };

  useEffect(() => {
    let active = true;

    try {
      setApproved(window.localStorage.getItem(APPROVAL_KEY) === 'true');
    } catch {
      // La aprobación local es opcional.
    }

    getStoredFile(ASSET_KEY)
      .then((file) => {
        if (!active || !(file instanceof Blob)) {
          if (active) setMessage('Buscando el MP4 dentro del repositorio…');
          return;
        }
        replaceObjectUrl(file);
        setMessage('Vídeo final cargado desde el almacenamiento local protegido.');
      })
      .catch(() => {
        if (active) setMessage('Buscando el MP4 dentro del repositorio…');
      });

    return () => {
      active = false;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const importVideo = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.type !== 'video/mp4' && !file.name.toLowerCase().endsWith('.mp4')) {
      setMessage('Selecciona el archivo MP4 del paquete de rescate.');
      return;
    }

    try {
      await putStoredFile(ASSET_KEY, file);
      replaceObjectUrl(file);
      setMessage('MP4 importado y guardado localmente. No se ha enviado a ningún servicio externo.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo importar el vídeo.');
    }
  };

  const clearLocalVideo = async () => {
    try {
      await removeStoredFile(ASSET_KEY);
    } catch {
      // Continuamos para restaurar la ruta del repositorio.
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = '';
    setVideoUrl(DEFAULT_VIDEO);
    setVideoSource('repository');
    setRepositoryVideoMissing(false);
    setMessage('Copia local eliminada. Buscando el MP4 dentro del repositorio…');
  };

  const toggleApproval = () => {
    const next = !approved;
    setApproved(next);
    try {
      window.localStorage.setItem(APPROVAL_KEY, String(next));
    } catch {
      // La interfaz continúa funcionando sin persistencia.
    }
  };

  const handleVideoReady = () => {
    setRepositoryVideoMissing(false);
    setMessage(videoSource === 'local'
      ? 'Vídeo final cargado desde el almacenamiento local protegido.'
      : 'Vídeo final instalado correctamente en el repositorio.');
  };

  const handleVideoError = () => {
    if (videoSource !== 'repository') return;
    setRepositoryVideoMissing(true);
    setMessage('El código está actualizado, pero falta instalar o importar el MP4 final.');
  };

  return (
    <main className="min-h-screen bg-[#06070a] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <header className="rounded-3xl border border-emerald-300/15 bg-[radial-gradient(circle_at_0%_0%,rgba(16,185,129,.14),transparent_34%),#0b0d12] p-6 sm:p-8">
          <button type="button" onClick={() => router.push('/studio/lumo-kids')} className="text-xs font-black text-white/45 transition hover:text-white">← Lumo Kids Studio</button>
          <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-200/75">Rescue & Canon Guard v3</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">S01E01-S01 · Bienvenidos a Brillavalle</h1>
              <p className="mt-3 text-sm leading-6 text-white/55">Sección cerrada mediante montaje editorial: conserva la narración y el movimiento válido de Brillavalle, elimina las versiones alteradas de los protagonistas y bloquea cualquier nueva generación pagada.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Metric value="15,093 s" label="duración" />
              <Metric value="720p" label="resolución" />
              <Metric value="$0.00" label="coste adicional" accent="text-emerald-200" />
              <Metric value="$22.92" label="saldo conservado" accent="text-emerald-200" />
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_380px]">
          <div className="space-y-5">
            <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c0e13]">
              <div className="flex flex-col gap-3 border-b border-white/[.07] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-black">Resultado final de S01</h2>
                  <p className="mt-1 text-xs text-white/40">H.264 · 1280×720 · 24 fps · AAC estéreo 48 kHz</p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${repositoryVideoMissing ? 'bg-amber-300/10 text-amber-100' : 'bg-emerald-300/10 text-emerald-100'}`}>
                  {repositoryVideoMissing ? 'MP4 pendiente de importar' : 'MP4 disponible'}
                </span>
              </div>

              <div className="bg-black">
                <video
                  key={videoUrl}
                  src={videoUrl}
                  controls
                  preload="metadata"
                  onLoadedMetadata={handleVideoReady}
                  onError={handleVideoError}
                  className="aspect-video w-full bg-black object-contain"
                >
                  Tu navegador no puede reproducir este vídeo.
                </video>
              </div>

              <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-white/45">{message}</p>
                <div className="flex flex-wrap gap-2">
                  <input ref={inputRef} type="file" accept="video/mp4,.mp4" onChange={importVideo} className="hidden" />
                  <button type="button" onClick={() => inputRef.current?.click()} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-cyan-200">Importar vídeo final</button>
                  {videoSource === 'local' && (
                    <button type="button" onClick={clearLocalVideo} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black text-white/55 transition hover:bg-white/[.05]">Eliminar copia local</button>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#0c0e13] p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-black">Referencias limpias y aprobadas</h2>
                  <p className="mt-1 text-xs text-white/40">Recortes directos de la guía original; no son rediseños generados.</p>
                </div>
                <span className="w-fit rounded-full bg-cyan-300/10 px-3 py-1 text-[10px] font-black text-cyan-100">SIN DIAGRAMAS NI TEXTO EN EL ANCLA</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {REFERENCES.map((item) => (
                  <figure key={item.src} className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                    <img src={item.src} alt={item.name} className="aspect-video w-full object-cover" />
                    <figcaption className="p-3">
                      <p className="text-xs font-black text-white/75">{item.name}</p>
                      <p className="mt-1 text-[11px] leading-5 text-white/35">{item.description}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-red-300/15 bg-red-300/[.035] p-5">
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-red-200/65">Protección económica</p>
              <h2 className="mt-2 text-lg font-black text-red-50">Generación pagada bloqueada</h2>
              <p className="mt-3 text-xs leading-6 text-red-50/55">S01 no volverá a abrir Video Studio ni preparará solicitudes de MuAPI. La sección se resuelve con los recursos ya pagados.</p>
              <button type="button" disabled className="mt-4 w-full cursor-not-allowed rounded-xl bg-white/[.06] px-4 py-3 text-xs font-black text-white/25">Generar de nuevo — bloqueado</button>
            </section>

            <section className="rounded-3xl border border-amber-300/15 bg-amber-300/[.04] p-5">
              <h2 className="font-black text-amber-100">Narración conservada</h2>
              <p className="mt-3 text-sm leading-6 text-amber-50/65">“{NARRATION}”</p>
              <p className="mt-3 text-[11px] leading-5 text-amber-50/35">La pista original permanece completa; no se volvió a sintetizar ni se modificó la identidad vocal.</p>
            </section>

            <section className="rounded-3xl border border-emerald-300/15 bg-emerald-300/[.035] p-5">
              <h2 className="font-black text-emerald-100">Control humano</h2>
              <p className="mt-2 text-xs leading-5 text-emerald-50/50">Marca la sección como aprobada después de reproducirla completa. La decisión queda guardada únicamente en tu navegador.</p>
              <button type="button" onClick={toggleApproval} className={`mt-4 w-full rounded-xl px-4 py-3 text-sm font-black transition ${approved ? 'bg-emerald-300 text-emerald-950' : 'border border-emerald-200/20 text-emerald-100 hover:bg-emerald-300/[.08]'}`}>
                {approved ? 'S01 aprobada ✓' : 'Aprobar S01'}
              </button>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#0c0e13] p-5 text-xs leading-6 text-white/45">
              <strong className="text-white/75">Enlace con S02:</strong> la introducción termina en una vista distante y estable de Brillavalle. El montaje corta después al bloque existente donde los amigos preparan la plaza.
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
