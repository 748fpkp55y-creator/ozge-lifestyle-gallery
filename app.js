const gallery = document.getElementById("gallery");

const url =
`https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?sheet=${CONFIG.SHEET_NAME}&tqx=out:json`;

fetch(url)
.then(res=>res.text())
.then(text=>{

    const json = JSON.parse(text.substring(47).slice(0,-2));

    const rows = json.table.rows;

    gallery.innerHTML="";

    rows.reverse().forEach(r=>{

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

})
.catch(err=>{

    gallery.innerHTML=`
        <h2>Veriler okunamadı.</h2>
    `;

    console.error(err);

});