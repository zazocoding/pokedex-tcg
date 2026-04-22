import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore

# Inicializar Firebase
cred = credentials.Certificate("serviceAccount.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Leer CSV
df = pd.read_csv("pokedexbaseUpdated.csv")

print("Columnas detectadas:")
print(list(df.columns))

created = 0
updated = 0

# =========================
# UPDATE / UPSERT POKEMON
# =========================
for _, row in df.iterrows():
    dex_raw = str(row["National\nDex"]).strip()
    name = str(row["Pokemon\nName"]).strip()

    dex = dex_raw.replace(",", ".")

    gen = str(row["Gen"]).strip()
    ptype = str(row["Type"]).strip()
    type1 = str(row["Type I"]).strip()
    type2 = str(row["Type II"]).strip()

    binder_page = row["Pag"]
    binder_slot = row["Posición"]

    binder_page = None if pd.isna(binder_page) else int(binder_page)
    binder_slot = None if pd.isna(binder_slot) else int(binder_slot)

    doc_data = {
        "dex": dex,
        "name": name,
        "gen": gen,
        "type": ptype,
        "type1": type1,
        "type2": type2,
        "binderPage": binder_page,
        "binderSlot": binder_slot
    }

    doc_ref = db.collection("pokemons").document(dex)
    doc_snapshot = doc_ref.get()

    if doc_snapshot.exists:
        # Actualiza SIN tocar owned
        doc_ref.set(doc_data, merge=True)
        updated += 1
    else:
        # Nuevo Pokémon
        doc_data["owned"] = False
        doc_ref.set(doc_data, merge=True)
        created += 1

print(f"Actualizados: {updated}")
print(f"Creados: {created}")

# =========================
# RECALCULAR STATS
# =========================

print("Recalculando stats...")

docs = db.collection("pokemons").get()
total = len(list(docs))

owned_docs = db.collection("pokemons").where("owned", "==", True).get()
owned = len(list(owned_docs))

db.collection("stats").document("global").set({
    "total": total,
    "owned": owned
})

print(f"Stats actualizadas: total={total}, owned={owned}")

print("Script completado correctamente")