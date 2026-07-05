document.addEventListener("DOMContentLoaded", () => {
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
    let selectedDay = "all";
    let selectedCategory = "all";

    init();

    async function init() {
        try {
            gallery.innerHTML = `<div class="loading">Fotoğraflar yükleniyor...</div>`;

            createDayOptions();
            bindEvents();

            const rows = await fetchRows();
            allItems = normalizeRows(rows);

            render();

        } catch (err) {
            console.error(err);
            gallery.innerHTML = `<div class="empty">Veriler okunamadı.</div>`;
        }
    }

    async function fetchRows() {
        const res = await fetch(url);
        const text = await res.text();
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
            const type = clean(c[5]);

            const water = clean(c[6]);

            const breakfast = clean(c[7]);
            const lunch = clean(c[8]);
            const dinner = clean(c[9]);
            const walk = clean(c[10]);

            const oldWeightPhoto = clean(c[11]);
            const manualWeight = clean(c[12]);
            const extra = clean(c[13]);

            const map = [
                { type: "Sabah Kahvaltısı", label: "Kahvaltı", image: breakfast },
                { type: "Öğle Yemeği", label: "Öğle", image: lunch },
                { type: "Akşam Yemeği", label: "Akşam", image: dinner },
                { type: "Yürüyüş", label: "Yürüyüş", image: walk },
                { type: "Su", label: "Su", value: water, unit: "", icon: "💧" },
                {
                    type: "Tartı",
                    label: "Tartı",
                    image: isUrl(oldWeightPhoto) ? oldWeightPhoto : "",
                    value: manualWeight || (!isUrl(oldWeightPhoto) ? oldWeightPhoto : ""),
                    unit: "kg",
                    icon: "⚖️"
                },
                { type: "Diğer", label: "Diğer", image: extra }
            ];

            map.forEach(item => {
                if (!item.image && !item.value) return;
                if (!matchesType(type, item)) return;

                items.push({
                    name,
                    day,
                    type: item.type,
                    label: item.label,
                    image: cleanUrl(item.image),
                    value: item.value || "",
                    unit: item.unit || "",
                    icon: item.icon || ""
                });
            });
        });

        return items;
    }

    function render() {
        filteredItems = allItems.filter(item => {
            const dayOk =
                selectedDay === "all" ||
                item.day.startsWith(selectedDay + ".");

            const categoryOk =
                selectedCategory === "all" ||
                item.label === selectedCategory ||
                item.type === selectedCategory ||
                categoryToType(selectedCategory) === item.type;

            return dayOk && categoryOk;
        });

        updateStats();
        renderGallery();
    }

    function renderGallery() {
        if (!filteredItems.length) {
            gallery.innerHTML = `<div class="empty">Bu filtrelere uygun kayıt bulunamadı.</div>`;
            return;
        }

        gallery.innerHTML = filteredItems.map((item, index) => {
            const visual = item.image
                ? `
                    <div class="card-image">
                        <img src="${escapeHTML(item.image)}" loading="lazy" alt="${escapeHTML(item.name)}" referrerpolicy="no-referrer">
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
                        <p>${iconFor(item.type)} ${escapeHTML(item.type)}</p>
                        <span class="badge">🌿 Özge Lifestyle</span>
                    </div>
                </article>
            `;
        }).join("");
    }

    function updateStats() {
        const names = new Set(filteredItems.map(i => i.name).filter(Boolean));
        photoCount.textContent = filteredItems.length;
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
            selectedDay = e.target.value;
            render();
        });

        categorySelect.addEventListener("change", e => {
            selectedCategory = e.target.value;
            render();
        });

        gallery.addEventListener("click", e => {
            const card = e.target.closest(".card");
            if (!card) return;

            const item = filteredItems[Number(card.dataset.index)];
            if (!item || !item.image) return;

            lightboxImage.src = item.image;
            lightboxName.textContent = item.name;
            lightboxMeta.textContent = `${item.day} • ${item.type}`;
            lightbox.classList.add("active");
            document.body.style.overflow = "hidden";
        });

        closeBtn.addEventListener("click", closeLightbox);

        lightbox.addEventListener("click", e => {
            if (e.target === lightbox) closeLightbox();
        });

        document.addEventListener("keydown", e => {
            if (e.key === "Escape") closeLightbox();
        });
    }

    function closeLightbox() {
        lightbox.classList.remove("active");
        lightboxImage.src = "";
        document.body.style.overflow = "";
    }

    function matchesType(selected, item) {
        if (!selected) return true;

        const s = normalize(selected);
        const t = normalize(item.type);
        const l = normalize(item.label);

        return s === t || s === l || s.includes(l) || t.includes(s);
    }

    function categoryToType(category) {
        const map = {
            "Kahvaltı": "Sabah Kahvaltısı",
            "Öğle": "Öğle Yemeği",
            "Akşam": "Akşam Yemeği",
            "Yürüyüş": "Yürüyüş",
            "Su": "Su",
            "Tartı": "Tartı",
            "Diğer": "Diğer"
        };

        return map[category] || category;
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

    function cleanUrl(value) {
        if (!value) return "";
        return String(value)
            .trim()
            .replace(/&amp;/g, "&")
            .replace(/\\u003d/g, "=")
            .replace(/\\u0026/g, "&");
    }

    function isUrl(value) {
        return /^https?:\/\//i.test(String(value || ""));
    }

    function normalize(value) {
        return String(value || "").trim().toLocaleLowerCase("tr");
    }

    function iconFor(type) {
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
});