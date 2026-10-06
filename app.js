// ============================================
// DJ TV Estación Mix - Lógica Principal (app.js)
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ============================================
// CONFIGURACIÓN FIREBASE (CORREGIDO)
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyARhC07Q4CvEqB1JytYK_AkY2_HQw4ToSY",
  authDomain: "dj-tv-estacion-mix.firebaseapp.com",
  projectId: "dj-tv-estacion-mix",
  storageBucket: "dj-tv-estacion-mix.firebasestorage.app",
  messagingSenderId: "955348774578",
  appId: "1:955348774578:web:221c8f8edac25a53e023ab"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================
// STREAMING HLS EN VIVO
// ============================================
const HLS_URL = "https://mix.fachacarlos1.workers.dev/playlist.m3u8";

function initHLSPlayer() {
    const video = document.getElementById('videoPlayer');
    if (!video) return;

    if (window.Hls && Hls.isSupported()) {
        const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 30
        });

        hls.loadSource(HLS_URL);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.muted = true; // Requerido para autostart por el navegador
            video.play().catch(() => {
                console.log('Autoplay requiere interacción del usuario');
            });
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        hls.recoverMediaError();
                        break;
                    default:
                        hls.destroy();
                        break;
                }
            }
        });

        setupPlayerControls(video);

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Soporte nativo para Safari / iOS
        video.src = HLS_URL;
        video.muted = true;
        video.play().catch(() => {});
        setupPlayerControls(video);
    }
}

function setupPlayerControls(video) {
    const btnPlayPause = document.getElementById('btnPlayPause');
    const iconPlay = document.getElementById('iconPlay');
    const iconPause = document.getElementById('iconPause');
    const btnMute = document.getElementById('btnMute');
    const iconVolume = document.getElementById('iconVolume');
    const iconMuted = document.getElementById('iconMuted');
    const volumeSlider = document.getElementById('volumeSlider');
    const btnFullscreen = document.getElementById('btnFullscreen');
    const playerContainer = document.getElementById('playerContainer');

    if (!btnPlayPause) return;

    // Control Play / Pausa
    btnPlayPause.addEventListener('click', () => {
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    });

    video.addEventListener('play', () => {
        iconPlay?.classList.add('hidden');
        iconPause?.classList.remove('hidden');
    });

    video.addEventListener('pause', () => {
        iconPlay?.classList.remove('hidden');
        iconPause?.classList.add('hidden');
    });

    // Control Mute / Volumen
    btnMute?.addEventListener('click', () => {
        video.muted = !video.muted;
        updateVolumeUI();
    });

    volumeSlider?.addEventListener('input', (e) => {
        const val = e.target.value / 100;
        video.volume = val;
        video.muted = (val === 0);
        updateVolumeUI();
    });

    function updateVolumeUI() {
        if (video.muted || video.volume === 0) {
            iconVolume?.classList.add('hidden');
            iconMuted?.classList.remove('hidden');
            if (volumeSlider) volumeSlider.value = 0;
        } else {
            iconVolume?.classList.remove('hidden');
            iconMuted?.classList.add('hidden');
            if (volumeSlider) volumeSlider.value = video.volume * 100;
        }
    }

    // Pantalla Completa
    btnFullscreen?.addEventListener('click', () => {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else if (playerContainer) {
            playerContainer.requestFullscreen().catch(() => {
                video.requestFullscreen?.();
            });
        }
    });
}

// ============================================
// FILTRO AUTOMÁTICO DE GROSERÍAS (Bad Words Filter)
// ============================================
const BAD_WORDS = [
    'puta', 'puto', 'putita', 'putito', 'putas', 'putos',
    'verga', 'vergas', 'pendejo', 'pendeja', 'pendejos', 'pendejas',
    'pinche', 'pinches', 'mierda', 'mierdas', 'mrd',
    'culo', 'culos', 'culiao', 'culiada',
    'chinga', 'chingar', 'chingada', 'coño', 'carajo',
    'joder', 'jodido', 'cabron', 'cabrona', 'cabrones',
    'maricon', 'marica', 'boludo', 'boluda', 'boludos',
    'conchudo', 'conchuda', 'huevon', 'huevona',
    'cagada', 'bastardo', 'imbecil', 'idiota', 'tarado',
    'zorra', 'malparido', 'malparida', 'hijueputa',
    'hijo de puta', 'sapo', 'gonorrea', 'pajero', 'pajera',
    'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy'
];

function normalizeText(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remueve acentos
        .replace(/[^a-z0-9\s]/g, " ")     // Remueve caracteres especiales
        .replace(/\s+/g, " ")
        .trim();
}

function containsBadWords(text) {
    if (!text) return false;
    const normalized = normalizeText(text);
    const words = normalized.split(/\s+/);

    for (const badWord of BAD_WORDS) {
        const normalizedBad = normalizeText(badWord);
        if (words.includes(normalizedBad)) return true;
        if (normalizedBad.includes(' ') && normalized.includes(normalizedBad)) return true;
    }
    return false;
}

// ============================================
// FORMULARIO DE ENVÍO DE SALUDOS
// ============================================
function initGreetingForm() {
    const form = document.getElementById('greetingForm');
    if (!form) return;

    const inputNombre = document.getElementById('inputNombre');
    const inputLugar = document.getElementById('inputLugar');
    const inputMensaje = document.getElementById('inputMensaje');
    const charCounter = document.getElementById('charCounter');
    const btnSend = document.getElementById('btnSend');

    // Contador de 150 caracteres máximo
    inputMensaje?.addEventListener('input', () => {
        const len = inputMensaje.value.length;
        if (charCounter) {
            charCounter.textContent = `${len}/150`;
            if (len > 130) {
                charCounter.style.color = '#ef4444';
            } else if (len > 100) {
                charCounter.style.color = '#f59e0b';
            } else {
                charCounter.style.color = '#6b7280';
            }
        }
    });

    // Envío del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nombre = inputNombre.value.trim();
        const lugar = inputLugar.value.trim();
        const msj = inputMensaje.value.trim();

        if (!nombre || !lugar || !msj) return;

        // Deshabilitar botón durante el envío
        if (btnSend) btnSend.disabled = true;

        try {
            // Evaluamos si contiene palabras prohibidas
            const isBad = containsBadWords(msj) || containsBadWords(nombre) || containsBadWords(lugar);

            await addDoc(collection(db, "mensajes"), {
                nombre: nombre,
                lugar: lugar,
                msj: msj.substring(0, 150),
                timestamp: serverTimestamp(),
                estado: isBad ? "rechazado" : "pendiente",
                razon: isBad ? "filtro_groserias" : null,
                esAdmin: false,
                fijado: false
            });

            showFeedback('✅ ¡Tu saludo fue enviado! Será revisado por producción.', 'success');
            form.reset();
            if (charCounter) charCounter.textContent = '0/150';

        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            showFeedback('❌ Ocurrió un error. Intenta nuevamente.', 'error');
        } finally {
            if (btnSend) btnSend.disabled = false;
        }
    });
}

function showFeedback(message, type) {
    const feedback = document.getElementById('formFeedback');
    if (!feedback) return;

    feedback.textContent = message;
    feedback.classList.remove('hidden', 'text-green-400', 'text-red-400');
    feedback.classList.add(type === 'success' ? 'text-green-400' : 'text-red-400');

    setTimeout(() => {
        feedback.classList.add('hidden');
    }, 5000);
}

// ============================================
// CHAT EN VIVO (Muestra Mensajes Aprobados)
// ============================================
function initLiveChat() {
    const chatMessages = document.getElementById('chatMessages');
    const chatCount = document.getElementById('chatCount');
    if (!chatMessages) return;

    const q = query(
        collection(db, "mensajes"),
        where("estado", "==", "aprobado"),
        orderBy("timestamp", "desc"),
        limit(50)
    );

    onSnapshot(q, (snapshot) => {
        const messages = [];
        snapshot.forEach(d => messages.push({ id: d.id, ...d.data() }));

        if (chatCount) chatCount.textContent = `${messages.length} mensajes`;

        if (messages.length === 0) {
            chatMessages.innerHTML = '<div class="text-center text-gray-600 text-xs py-8">Los saludos aprobados aparecerán aquí...</div>';
            return;
        }

        chatMessages.innerHTML = messages.map(msg => {
            const adminTag = msg.esAdmin ? '<span class="text-[9px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded-full ml-1">ADMIN</span>' : '';
            return `
                <div class="chat-msg-enter bg-gray-800/40 rounded-lg p-2.5 border border-gray-800">
                    <div class="flex items-center gap-1.5 mb-0.5">
                        <span class="font-semibold text-xs text-purple-300">${escapeHtml(msg.nombre)}</span>
                        ${adminTag}
                        <span class="text-[10px] text-gray-500">📍 ${escapeHtml(msg.lugar)}</span>
                    </div>
                    <p class="text-xs text-gray-300 leading-relaxed">${escapeHtml(msg.msj)}</p>
                </div>
            `;
        }).join('');
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

// ============================================
// INICIALIZACIÓN AUTOMÁTICA
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initHLSPlayer();
    initGreetingForm();
    initLiveChat();
});
