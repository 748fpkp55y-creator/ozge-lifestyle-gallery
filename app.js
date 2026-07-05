const gallery = document.getElementById("gallery");
const daySelect = document.getElementById("daySelect");
const categorySelect = document.getElementById("categorySelect");

const photoCount = document.getElementById("photoCount");
const participantCount = document.getElementById("participantCount");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxName = document.getElementById("lightboxName");
const lightboxMeta = document.getElementById("lightboxMeta");
const closeBtn = document.getElementById("close");

const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?sheet=${CONFIG.SHEET_NAME}&tqx=out:json`;

let allItems = [];
let filteredItems = [];

let state = {
    day: "all",
    category: "all"
};

const categoryMap = {
    "Kahvaltı": "Sabah Kahvaltısı",
    "Öğle": "Öğle Yemeği",
    "Akşam": "Akşam Yemeği",
    "Ara Öğün": "Ara Öğün",
    "Yürüyüş": "Yürüyüş",
    "Su": "Su",
    "Tartı": "Tartı",
    "Diğer": "Diğer"
};

init();

async function init() {
    try {
        gallery.innerHTML = `<div class="loading">Fotoğraflar yükleniyor...</div>`;

        createDayOptions();
        bindEvents();

        const rows = await fetchSheetRows();

        allItems = normalizeRows(rows);

        applyFilters();

    } catch (error) {
        console.error(error);

        gallery.innerHTML = `
            <div class="empty">
                Veriler okunamadı. Google Sheets bağlantısını kontrol edin.
            </div>
        `;
    }
}

async function fetchSheetRows() {
    const response = await fetch(url);
    const text = await response.text();
    const json = JSON.parse(text.substring(47).slice(0, -2));

    return json.table.rows.reverse();
}

function normalizeRows(rows) {
    const items = [];

    rows.forEach(row => {
        const c = row.c;

        const name = clean(c[3]?.v);
        const day = clean(c[4]?.v);
        const type = clean(c[5]?.v);

        const photoMap = [
            { category: "Sabah Kahvaltısı", label: "Kahvaltı", image: clean(c[6]?.v) },
            { category: "Öğle Yemeği", label: "Öğle", image: clean(c[7]?.v) },
            { category: "Akşam Yemeği", label: "Akşam", image: clean(c[8]?.v) },
            { category: "Yürüyüş", label: "Yürüyüş", image: clean(c[9]?.v) },
            { category: "Ara Öğün", label: "Ara Öğün", image: clean(c[10]?.v) },
            { category: "Su", label: "Su", image: clean(c[11]?.v) },
            { category: "Diğer", label: "Diğer", image: clean(c[12]?.v) }
        ];

        photoMap.forEach(photo => {
            if (!photo.image) return;

            if (
                type &&
                photo.category !== type &&
                photo.label !== type &&
                photo.category !== "Diğer"
            ) {
                return;
            }

            items.push({
                name,
                day,
                type: photo.category,
                label: photo.label,
                rawImage: photo.image,
                image: convertImageUrl(photo.image)
            });
        });
    });

    return items;
}

function applyFilters() {
    filteredItems = allItems.filter(item => {
        const matchesDay =
            state.day === "all" ||
            item.day.startsWith(state.day + ".");

        const targetCategory = categoryMap[state.category] || state.category;

        const matchesCategory =
            state.category === "all" ||
            item.type === targetCategory ||
            item.label === state.category;

        return matchesDay && matchesCategory;
    });

    renderGallery(filteredItems);
    updateStats(filteredItems);
}

function renderGallery(items) {
    if (!items.length) {
        gallery.innerHTML = `
            <div class="empty">
                Bu filtrelere uygun fotoğraf bulunamadı.
            </div>
        `;
        return;
    }

    gallery.innerHTML = items.map((item, index) => `
        <article class="card" data-index="${index}">
            <div class="card-image">
                <img
                    src="${escapeHTML(item.image)}"
                    loading="lazy"
                    alt=""
                    onerror="this.style.display='none'; this.parentElement.classList.add('image-error');"
                >
            </div>

            <div class="info">
                <h3>${escapeHTML(item.name || "İsimsiz Katılımcı")}</h3>
                <p>📅 ${escapeHTML(item.day || "Gün bilgisi yok")}</p>
                <p>🍽️ ${escapeHTML(item.type || "Kategori yok")}</p>
                <span class="badge">🌿 Özge Lifestyle</span>
            </div>
        </article>
    `).join("");
}

function updateStats(items) {
    const names = new Set(items.map(item => item.name).filter(Boolean));

    photoCount.textContent = items.length;
    participantCount.textContent = names.size;
}

function createDayOptions() {
    daySelect.innerHTML = `<option value="all">📅 Tüm Günler</option>`;

    for (let i = 1; i <= 28; i++) {
        daySelect.innerHTML += `<option value="${i}">${i}. Gün</option>`;
    }
}

function bindEvents() {
    daySelect.addEventListener("change", event => {
        state.day = event.target.value;
        applyFilters();
    });

    categorySelect.addEventListener("change", event => {
        state.category = event.target.value;
        applyFilters();
    });

    gallery.addEventListener("click", event => {
        const card = event.target.closest(".card");
        if (!card) return;

        const item = filteredItems[Number(card.dataset.index)];
        if (!item) return;

        openLightbox(item);
    });

    closeBtn.addEventListener("click", closeLightbox);

    lightbox.addEventListener("click", event => {
        if (event.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeLightbox();
    });
}

function openLightbox(item) {
    lightboxImage.src = item.image;
    lightboxImage.alt = item.name || "Fotoğraf";

    lightboxName.textContent = item.name || "İsimsiz Katılımcı";
    lightboxMeta.textContent = `${item.day || "Gün bilgisi yok"} • ${item.type || "Kategori yok"}`;

    lightbox.classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeLightbox() {
    lightbox.classList.remove("active");
    lightboxImage.src = "";
    document.body.style.overflow = "";
}

function convertImageUrl(value) {
    if (!value) return "";

    const input = String(value).trim();

    const driveId = extractGoogleDriveId(input);

    if (driveId) {
        return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1600`;
    }

    return input;
}

function extractGoogleDriveId(url) {
    const patterns = [
        /\/file\/d\/([^/]+)/,
        /\/d\/([^/]+)/,
        /[?&]id=([^&]+)/,
        /thumbnail\?id=([^&]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
    }

    return "";
}

function clean(value) {
    return value ? String(value).trim() : "";
}

function escapeHTML(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}