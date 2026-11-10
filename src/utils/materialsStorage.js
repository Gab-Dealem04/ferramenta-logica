/* ==========================================================================
 * materialsStorage.js — PDFs enviados pelo usuário (guardados no IndexedDB)
 *
 * O localStorage só guarda ~5 MB de texto, pouco para PDFs. Por isso os arquivos
 * ficam no IndexedDB, em dois "depósitos":
 *   meta  -> { id, title, size, addedAt }   (leve, usado para listar)
 *   files -> { id, data }                    (o PDF em si, um ArrayBuffer)
 * Assim a lista abre rápido sem carregar os arquivos para a memória.
 * ========================================================================== */

const DB_NAME = "logic-lab-materiais";
const META = "meta";
const FILES = "files";

export const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50 MB

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore(META, { keyPath: "id" });
      db.createObjectStore(FILES, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Espera a transação terminar (e fecha o banco)
function finish(db, tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error("Operação cancelada."));
    };
  });
}

export function formatSize(bytes) {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export async function listMaterials() {
  const db = await openDb();
  const tx = db.transaction(META, "readonly");
  const req = tx.objectStore(META).getAll();
  await finish(db, tx);
  return (req.result || []).sort((a, b) => b.addedAt - a.addedAt);
}

// Valida e salva um PDF. Lança Error com mensagem pronta para mostrar ao usuário.
export async function addMaterial(file) {
  const looksLikePdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!looksLikePdf) throw new Error("Escolha um arquivo PDF.");
  if (file.size > MAX_PDF_BYTES) throw new Error("O PDF é grande demais (máximo de 50 MB).");

  const data = await file.arrayBuffer();
  const head = new TextDecoder().decode(new Uint8Array(data, 0, 5));
  if (head !== "%PDF-") throw new Error("Esse arquivo não parece ser um PDF válido.");

  const id = Date.now();
  const meta = {
    id,
    title: file.name.replace(/\.pdf$/i, "").trim() || "PDF sem nome",
    size: file.size,
    addedAt: id,
  };

  const db = await openDb();
  const tx = db.transaction([META, FILES], "readwrite");
  tx.objectStore(META).put(meta);
  tx.objectStore(FILES).put({ id, data });
  await finish(db, tx);

  return meta;
}

export async function getMaterialData(id) {
  const db = await openDb();
  const tx = db.transaction(FILES, "readonly");
  const req = tx.objectStore(FILES).get(id);
  await finish(db, tx);
  return req.result ? req.result.data : null;
}

export async function deleteMaterial(id) {
  const db = await openDb();
  const tx = db.transaction([META, FILES], "readwrite");
  tx.objectStore(META).delete(id);
  tx.objectStore(FILES).delete(id);
  await finish(db, tx);
}

// Baixa um PDF para o aparelho. Passe `url` (arquivo do projeto) ou `data` (ArrayBuffer).
export function downloadPdf({ url, data, fileName }) {
  const clean = String(fileName || "material").replace(/[\\/:*?"<>|]+/g, "_").trim() || "material";
  const name = /\.pdf$/i.test(clean) ? clean : `${clean}.pdf`;

  const blobUrl = data ? URL.createObjectURL(new Blob([data], { type: "application/pdf" })) : null;

  const a = document.createElement("a");
  a.href = blobUrl || url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  if (blobUrl) setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}