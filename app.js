const gallery = document.getElementById("gallery");
const daySelect = document.getElementById("daySelect");

const url = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?sheet=${CONFIG.SHEET_NAME}&tqx=out:json`;

let allRows = [];
let selectedDay = "all";
let selectedType = "Tümü";

fetch(url)
    .then(res => res.text())
    .then(text => {

        const json = JSON.parse(text.substring(47).slice(0, -2));

        allRows = json.table.rows.reverse();

        createDayOptions();

        render();

    })
    .catch(err => {

        console.error(err);

        gallery.innerHTML = `
            <h2>Veriler okunamadı.</h2>
        `;

    });

function createDayOptions() {

    daySelect.innerHTML = `
        <option value="all">Tüm Günler</option>
    `;

    for (let i = 1; i <= 28; i++) {

        daySelect.innerHTML += `
            <option value="${i}">
                ${i}. Gün
            </option>
        `;

    }

}

function render() {

    gallery.innerHTML = "";

    allRows.forEach(r => {

        const c = r.c;

        const name = c[3]?.v || "";
        const day = c[4]?.v || "";
        const type = c[5]?.v || "";

        const breakfast = c[6]?.v || "";
        const lunch = c[7]?.v || "";
        const dinner = c[8]?.v || "";
        const walk = c[9]?.v || "";
        const extra = c[12]?.v || "";

        // Gün filtresi

        if (selectedDay !== "all") {

            if (!day.startsWith(selectedDay + ".")) return;

        }

        // Kategori filtresi

        if (selectedType !== "Tümü") {

            const typeMap = {
                "Kahvaltı": "Sabah Kahvaltısı",
                "Öğle": "Öğle Yemeği",
                "Akşam": "Akşam Yemeği",
                "Yürüyüş": "Yürüyüş"
            };

            if (type !== typeMap[selectedType]) return;

        }

        // Fotoğraf seçimi

        let image = "";

        switch (type) {

            case "Sabah Kahvaltısı":
                image = breakfast;
                break;

            case "Öğle Yemeği":
                image = lunch;
                break;

            case "Akşam Yemeği":
                image = dinner;
                break;

            case "Yürüyüş":
                image = walk;
                break;

            default:
                image = extra;
                break;

        }

        if (!image) return;

        gallery.innerHTML += `
            <div class="card">

                <img src="${image}" loading="lazy" alt="${name}">

                <div class="info">

                    <h3>${name}</h3>

                    <p>📅 ${day}</p>

                    <p>🍽️ ${type}</p>

                </div>

            </div>
        `;

    });

}

// Gün seçimi

daySelect.addEventListener("change", (e) => {

    selectedDay = e.target.value;

    render();

});

// Kategori seçimi

document.querySelector(".filters").addEventListener("click", (e) => {

    if (e.target.tagName !== "BUTTON") return;

    document
        .querySelectorAll(".filters button")
        .forEach(btn => btn.classList.remove("active"));

    e.target.classList.add("active");

    selectedType = e.target.innerText.trim();

    render();

});