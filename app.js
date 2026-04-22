// Aún falta tu configuración de Firebase, la pondremos después
const FieldValue = firebase.firestore.FieldValue;

let db;

function initFirebase() {
    const firebaseConfig = {
        apiKey: "AIzaSyCYKCwkQexfIujS4_P9Nk7Cp3F4LejEy_4",
        authDomain: "pokedex-tcg-a61a7.firebaseapp.com",
        projectId: "pokedex-tcg-a61a7",
        storageBucket: "pokedex-tcg-a61a7.firebasestorage.app",
        messagingSenderId: "775456491654",
        appId: "1:775456491654:web:d7266d0f13a6124ab0a907",
        measurementId: "G-EDS2EBXRNK"
    };

  firebase.initializeApp(firebaseConfig);
  db = firebase.firestore();
}

initFirebase();



// MODULO 2 BUSCAR


let lastFoundDocId = null;

async function searchPokemon() {
  const name = document.getElementById("search").value.trim();
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "Buscando...";

  const snapshot = await db
    .collection("pokemons")
    .where("name", "==", name)
    .get();

  if (snapshot.empty) {
    resultsDiv.innerHTML = "❌ No encontrado";
    return;
  }

  snapshot.forEach((doc) => {
    const data = doc.data();
    lastFoundDocId = doc.id;

    const dexFormatted = data.dex.toString().padStart(3, "0");

    resultsDiv.innerHTML = `
      <div>
        <strong>${dexFormatted} - ${data.name}</strong><br>
        Estado: <span class="${data.owned ? "status-ok" : "status-bad"}">
          ${data.owned ? "✅ Tengo carta" : "❌ No la tengo"}
        </span>
        ${
          !data.owned ? `<br><button onclick="addCard()">Añadir carta</button>` : ""
        }
      </div>
    `;
  });
}

async function addCard() {
  if (!lastFoundDocId) return;

  const resultsDiv = document.getElementById("results");

  const statusDiv = document.createElement("div");
  statusDiv.id = "saveStatus";
  statusDiv.textContent = "⏳ Guardando carta...";
  resultsDiv.appendChild(statusDiv);

  try {
    // 1. Guardar en Firestore
    await db.collection("pokemons").doc(lastFoundDocId).update({
      owned: true
    });

    // 2. Actualizar el contador global
    await db.collection("stats").doc("global").update({
      owned: FieldValue.increment(1)
    });


    // 3. Mensaje de éxito
    statusDiv.textContent = "✅ Carta añadida correctamente";

    // 👇 AQUÍ VA EL EFECTO VISUAL (PASO 5)
    const card = document.querySelector(".card");
    card.classList.add("capture");

    setTimeout(() => {
      card.classList.remove("capture");
    }, 400);

    // 4. Refrescar estadísticas
    loadStats();
    loadGenStats();

    setTimeout(() => {
      searchPokemon();
    }, 500);

  } catch (err) {
    statusDiv.textContent = "❌ Error: " + err.message;
    console.error(err);
  }
}




function countPokemons() {
  const countDiv = document.getElementById("count");
  countDiv.innerHTML = "Contando...";

  db.collection("pokemons")
    .get()
    .then(snapshot => {
      countDiv.innerHTML = `Total: ${snapshot.size} Pokémon`;
    });
}
async function loadStats() {
  const doc = await db.collection("stats").doc("global").get();

  if (!doc.exists) return;

  const data = doc.data();
  const total = data.total;
  const owned = data.owned;

  const pct = ((owned / total) * 100).toFixed(2);

  document.getElementById("stats").innerHTML = `
    <strong>${owned}</strong> de <strong>${total}</strong>
    (${pct}% completado)
  `;

  document.getElementById("progressFill").style.width = pct + "%";
}


loadStats();

async function loadGenStats() {
  const snapshot = await db.collection("pokemons").get();

  const gens = {};

  snapshot.forEach(doc => {
    const data = doc.data();
    const gen = data.gen || "Desconocida";

    if (!gens[gen]) {
      gens[gen] = { total: 0, owned: 0 };
    }

    gens[gen].total++;
    if (data.owned) gens[gen].owned++;
  });

  let html = "";
  for (const gen in gens) {
    const g = gens[gen];
    const pct = ((g.owned / g.total) * 100).toFixed(1);
    html += `<div>${gen}: ${g.owned}/${g.total} (${pct}%)</div>`;
  }

  document.getElementById("genStats").innerHTML = html;
}

loadGenStats();

async function loadMissing() {
  const div = document.getElementById("missing");
  div.innerHTML = "Cargando...";

  const snapshot = await db.collection("pokemons")
    .where("owned", "==", false)
    .get();

  // Convertir a array
  const missing = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    missing.push({
      name: data.name,
      dex: data.dex
    });
  });

  // Ordenar por número real de dex
  missing.sort((a, b) => {
    return parseFloat(a.dex) - parseFloat(b.dex);
  });

  // Pintar lista con formato bonito
  let html = "<ul>";
  missing.forEach(p => {
    const dexFormatted = p.dex.toString().padStart(3, "0");
    html += `<li>${dexFormatted} - ${p.name}</li>`;
  });

  html += "</ul>";
  div.innerHTML = html;
}

function toggleTheme() {
  document.body.classList.toggle("dark");
}

async function loadTable() {
  const tbody = document.querySelector("#pokemonTable tbody");
  tbody.innerHTML = "Cargando...";

  const snapshot = await db.collection("pokemons").get();

  const pokemons = [];

  snapshot.forEach(doc => {
    const data = doc.data();

    pokemons.push({
      id: doc.id,
      dex: parseFloat(data.dex),
      name: data.name,
      page: data.binderPage || "-",
      slot: data.binderSlot || "-",
      owned: data.owned
    });
  });

  // Ordenar por número real
  pokemons.sort((a, b) => a.dex - b.dex);

  let html = "";

  pokemons.forEach(p => {
    const dexFormatted = p.dex.toString().padStart(3, "0");

    html += `
      <tr>
        <td>${dexFormatted}</td>
        <td>${p.name}</td>
        <td>${p.page}</td>
        <td>${p.slot}</td>
        <td>${p.owned ? "✅" : "❌"}</td>
        <td>
          <button onclick="toggleOwned('${p.id}', ${p.owned})">
            ${p.owned ? "Quitar" : "Añadir"}
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

async function toggleOwned(docId, currentValue) {
  const FieldValue = firebase.firestore.FieldValue;

  try {
    await db.collection("pokemons").doc(docId).update({
      owned: !currentValue
    });

    await db.collection("stats").doc("global").update({
      owned: FieldValue.increment(currentValue ? -1 : 1)
    });

    loadStats();
    loadGenStats();
    loadTable();

  } catch (err) {
    alert("Error: " + err.message);
  }
}