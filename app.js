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
let state = { day: "all", category: "all" };

init();

async function init() {
    gallery.innerHTML = `<div class="loading">Fotoğraflar yükleniyor...</div>`;
    createDayOptions();
    bindEvents();

    const data = await fetchSheetData();
    allItems = normalizeRows(data.rows, data.headers);

    applyFilters();
}

async function fetchSheetData() {
    const response = await fetch(url);
    const text = await response.text();
    const jsonText = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const json = JSON.parse(jsonText);

    const headers = json.table.cols.map(col => clean(col.label));
    const rows = json.table.rows.reverse();

    return { headers, rows };
}

function normalizeRows(rows, headers) {
    return rows.map(row => {
        const get = title => {
            const index = headers.findIndex(h => normalizeText(h) === normalizeText(title));
            if (index === -1) return "";
            return clean(row.c?.[index]);
        };

        const name = get("Adınız Soyadınız");
        const day = get("Bugün Programın Kaçıncı Günü");
        const type = get("Hangi Bilgiyi Paylaşıyorsunuz");

        const item = {
            name,
            day,
            type,
            label: type,
            image: "",
            value: "",
            unit: "",
            icon: ""
        };

        if (type === "Sabah Kahvaltısı") item.image = get("Sabah Kahvaltısı Fotoğrafı");
        if (type === "Öğle Yemeği") item.image = get("Öğle Yemeği Fotoğrafı");
        if (type === "Akşam Yemeği") item.image = get("Akşam Yemeği Fotoğrafı");
        if (type.includes("Yürüyüş")) item.image = get("Yürüyüş Fotoğrafı");

        if (type === "Su") {
            item.value = get("Su Miktarı");
            item.unit = "";
            item.icon = "💧";
        }

        if (type === "Tartı") {
            item.image = get("Kilonuz");
            item.value = get("Kilonuzu yazınız");
            item.unit = "kg";
            item.icon = "⚖️";
        }

        if (type === "Diğer") {
            item.image = get("Fotoğrafınızı Yükleyin");
        }

        item.image = convertImageUrl(item.image);

        return item;
    }).filter(item => item.image || item.value);
}

function applyFilters() {
    filteredItems = allItems.filter(item => {
        const matchesDay =
            state.day === "all" ||
            item.day.startsWith(state.day + ".");

        const selectedCategory = state.category;

        const matchesCategory =
            selectedCategory === "all" ||
            normalizeText(item.type).includes(normalizeText(selectedCategory)) ||
            normalizeText(selectedCategory).includes(normalizeText(item.type));

        return matchesDay && matchesCategory;
    });

    renderGallery(filteredItems);
    updateStats(filteredItems);
}

function renderGallery(items) {
    if (!items.length) {
        gallery.innerHTML = `<div class="empty">Bu filtrelere uygun kayıt bulunamadı.</div>`;
        return;
    }

    gallery.innerHTML = items.map((item, index) => {
        const visual = item.image
            ? `
                <div class="card-image">
                    <img
                        src="${escapeHTML(item.image)}"
                        loading="lazy"
                        alt="${escapeHTML(item.name || "Fotoğraf")}"
                        referrerpolicy="no-referrer"
                    >
                </div>
            `
            : `
                <div class="weight-card">
                    <div class="weight-icon">${escapeHTML(item.icon || "✨")}</div>
                    <div class="weight-value">${escapeHTML(item.value)}</div>
                    <div class="weight-label">${escapeHTML(item.unit)}</div>
                </div>
            `;

        return `
            <article class="card" data-index="${index}">
                ${visual}
                <div class="info">
                    <h3>${escapeHTML(item.name || "İsimsiz Katılımcı")}</h3>
                    <p>📅 ${escapeHTML(item.day || "Gün bilgisi yok")}</p>
                    <p>${getTypeIcon(item.type)} ${escapeHTML(item.type)}</p>
                    <span class="badge">🌿 Özge Lifestyle</span>
                </div>
            </article>
        `;
    }).join("");
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
    daySelect.addEventListener("change", e => {
        state.day = e.target.value;
        applyFilters();
    });

    categorySelect.addEventListener("change", e => {
        state.category = e.target.value;
        applyFilters();
    });

    gallery.addEventListener("click", e => {
        const card = e.target.closest(".card");
        if (!card) return;

        const item = filteredItems[Number(card.dataset.index)];
        if (!item || !item.image) return;

        openLightbox(item);
    });

    closeBtn.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", e => {
        if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", e => {
        if (e.key === "Escape") closeLightbox();
    });
}

function openLightbox(item) {
    lightboxImage.src = item.image;
    lightboxName.textContent = item.name || "İsimsiz Katılımcı";
    lightboxMeta.textContent = `${item.day} • ${item.type}`;
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
    return String(value)
        .trim()
        .replace(/&amp;/g, "&")
        .replace(/\\u003d/g, "=")
        .replace(/\\u0026/g, "&");
}

function clean(cell) {
    if (cell === null || cell === undefined) return "";

    if (typeof cell === "object") {
        if (cell.v !== null && cell.v !== undefined) return String(cell.v).trim();
        if (cell.f !== null && cell.f !== undefined) return String(cell.f).trim();
        return "";
    }

    return String(cell).trim();
}

function normalizeText(value) {
    return String(value || "")
        .trim()
        .toLocaleLowerCase("tr");
}

function getTypeIcon(type) {
    if (type === "Tartı") return "⚖️";
    if (type === "Su") return "💧";
    if (type.includes("Yürüyüş")) return "🚶";
    return "🍽️";
}

function escapeHTML(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}