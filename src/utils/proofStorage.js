const KEY = "historicoAtividades";

export function loadActivities() {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error("Erro ao ler atividades:", e);
    return [];
  }
}

function saveActivities(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Erro ao salvar atividades:", e);
  }
}

export function getActivity(id) {
  return loadActivities().find((a) => a.id === id) || null;
}

export function addActivity(activity) {
  saveActivities([activity, ...loadActivities()]);
}

export function updateActivity(id, patch) {
  const list = loadActivities().map((a) =>
    a.id === id ? { ...a, ...patch, ultimaModificacao: Date.now() } : a
  );
  saveActivities(list);
}

export function saveProofData(id, data) {
  const current = getActivity(id);
  if (!current) return;

  const unchanged = Object.keys(data).every(
    (key) => JSON.stringify(current[key] ?? null) === JSON.stringify(data[key] ?? null)
  );
  if (unchanged) return;

  updateActivity(id, data);
}

export function deleteActivity(id) {
  saveActivities(loadActivities().filter((a) => a.id !== id));
}

export function duplicateActivity(id) {
  const original = getActivity(id);
  if (!original) return null;

  const now = Date.now();
  const copy = JSON.parse(JSON.stringify(original));
  copy.id = now;
  copy.title = `${original.title} (cópia)`;
  copy.dataCriacao = now;
  copy.ultimaModificacao = now;
  delete copy.status;

  addActivity(copy);
  return copy;
}