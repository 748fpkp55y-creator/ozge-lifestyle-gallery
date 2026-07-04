const gallery = document.getElementById("gallery");
const dayFilters = document.getElementById("dayFilters");

const url =
`https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?sheet=${CONFIG.SHEET_NAME}&tqx=out:json`;

let allRows = [];
let selectedDay = "all";
let selectedType = "Tümü";

fetch(url)
.then(res => res.text())
.then(text => {

    const json = JSON.parse(text.substring(47).slice(0,-2));

    allRows = json.table.rows.reverse();

    createDayButtons();

    render();

})
.catch(err => {

    gallery.innerHTML = `<h2>Veriler okunamadı.</h2>`;

    console.error(err);

});

function createDayButtons(){

    for(let i=1;i<=28;i++){

        const btn=document.createElement("button");

        btn.className="day-btn";

        btn.dataset.day=i;

        btn.innerText=i+". Gün";

        dayFilters.appendChild(btn);

    }

}

function render(){

    gallery.innerHTML="";

    allRows.forEach(r=>{

        const c = r.c;

        const name = c[3]?.v || "";
        const day = c[4]?.v || "";
        const type = c[5]?.v || "";

        const breakfast = c[6]?.v || "";
        const lunch = c[7]?.v || "";
        const dinner = c[8]?.v || "";
        const walk = c[9]?.v || "";
        const extra = c[12]?.v || "";

        const image =
            breakfast ||
            lunch ||
            dinner ||
            walk ||
            extra;

        if(!image) return;

        if(selectedDay !== "all"){

            if(!day.startsWith(selectedDay + ".")) return;

        }

        if(selectedType !== "Tümü"){

            if(type !== selectedType) return;

        }

        gallery.innerHTML += `
            <div class="card">

                <img src="${image}" loading="lazy">

                <div class="info">

                    <h3>${name}</h3>

                    <p>${day}</p>

                    <p>${type}</p>

                </div>

            </div>
        `;

    });

}

dayFilters.addEventListener("click",(e)=>{

    if(!e.target.classList.contains("day-btn")) return;

    document
        .querySelectorAll(".day-btn")
        .forEach(btn=>btn.classList.remove("active"));

    e.target.classList.add("active");

    selectedDay=e.target.dataset.day;

    render();

});

document.querySelector(".filters").addEventListener("click",(e)=>{

    if(e.target.tagName!=="BUTTON") return;

    document
        .querySelectorAll(".filters button")
        .forEach(btn=>btn.classList.remove("active"));

    e.target.classList.add("active");

    selectedType=e.target.innerText;

    render();

});