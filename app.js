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
        gallery.innerHTML = `<div class="empty">Veriler okunamadı.</div>`;
    }
}

async function fetchSheetRows() {
    const response = await fetch(url);
    const text = await response.text();

    const jsonText = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const json = JSON.parse(jsonText);

    return json.table.rows.reverse();
}

function normalizeRows(rows) {
    const items = [];

    rows.forEach(row => {
        const c = row.c || [];

        const name = clean(c[3]);
        const day = clean(c[4]);
        const selectedType = clean(c[5]);

        const waterAmount = clean(c[6]);

        const breakfastPhoto = clean(c[7]);
        const lunchPhoto = clean(c[8]);
        const dinnerPhoto = clean(c[9]);
        const walkPhoto = clean(c[10]);

        const weightText = clean(c[12]);
        const extraPhoto = clean(c[13]);

        const photoMap = [
            { type: "Sabah Kahvaltısı", label: "Kahvaltı", image: breakfastPhoto },
            { type: "Öğle Yemeği", label: "Öğle", image: lunchPhoto },
            { type: "Akşam Yemeği", label: "Akşam", image: dinnerPhoto },
            { type: "Yürüyüş", label: "Yürüyüş", image: walkPhoto },
            { type: "Su", label: "Su", value: waterAmount, unit: "", icon: "💧" },
            { type: "Tartı", label: "Tartı", value: weightText, unit: "kg", icon: "⚖️" },
            { type: "Diğer", label: "Diğer", image: extraPhoto }
        ];

        photoMap.forEach(item => {
            const hasImage = Boolean(item.image);
            const hasValue = Boolean(item.value);

            if (!hasImage && !hasValue) return;

            if (!matchesSelectedType(selectedType, item)) return;

            items.push({
                name,
                day,
                type: item.type,
                label: item.label,
                image: convertImageUrl(item.image),
                value: item.value || "",
                unit: item.unit || "",
                icon: item.icon || ""
            });
        });
    });

    return items;
}

function matchesSelectedType(selectedType, item) {
    if (!selectedType) return true;

    const selected = normalizeText(selectedType);
    const type = normalizeText(item.type);
    const label = normalizeText(item.label);

    return (
        selected === type ||
        selected === label ||
        selected.includes(label) ||
        type.includes(selected) ||
        label.includes(selected)
    );
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
        gallery.innerHTML = `<div class="empty">Bu filtrelere uygun kayıt bulunamadı.</div>`;
        return;
    }

    gallery.innerHTML = items.map((item, index) => {
        let visual = "";

        if (item.image) {
            visual = `
                <div class="card-image">
                    <img
                        src="${escapeHTML(item.image)}"
                        loading="lazy"
                        alt="${escapeHTML(item.name || "Fotoğraf")}"
                        referrerpolicy="no-referrer"
                    >
                </div>
            `;
        } else {
            visual = `
                <div class="weight-card">
                    <div class="weight-icon">${escapeHTML(item.icon || "✨")}</div>
                    <div class="weight-value">${escapeHTML(item.value)}</div>
                    <div class="weight-label">${escapeHTML(item.unit)}</div>
                </div>
            `;
        }

        return `
            <article class="card" data-index="${index}">
                ${visual}

                <div class="info">
                    <h3>${escapeHTML(item.name || "İsimsiz Katılımcı")}</h3>
                    <p>📅 ${escapeHTML(item.day || "Gün bilgisi yok")}</p>
                    <p>${getTypeIcon(item.type)} ${escapeHTML(item.type || "Kategori yok")}</p>
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
        if (!item || !item.image) return;

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
    if (type === "Yürüyüş") return "🚶";
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