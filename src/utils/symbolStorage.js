const SLOTS_KEY = "tecladoSimbolos";
const LIBRARY_KEY = "bibliotecaSimbolos";

export const DEFAULT_SYMBOLS = ["P", "Q", "R", "S", "T"];
export const KEYBOARD_SLOTS = 5;
const LIBRARY_MAX = 40;

function read(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Erro ao salvar símbolos:", e);
  }
}

export function loadKeyboardSymbols() {
  const list = read(SLOTS_KEY, DEFAULT_SYMBOLS).filter(Boolean);
  return list.length > 0 ? list.slice(0, KEYBOARD_SLOTS) : DEFAULT_SYMBOLS;
}

export function saveKeyboardSymbols(list) {
  write(SLOTS_KEY, list);
}

export function loadSymbolLibrary() {
  return read(LIBRARY_KEY, []).filter(Boolean);
}

export function saveSymbolLibrary(list) {
  write(LIBRARY_KEY, list.slice(0, LIBRARY_MAX));
}

// Coloca o símbolo na frente do teclado e mantém só os 5 primeiros
export function promoteSymbol(slots, symbol) {
  return [symbol, ...slots.filter((s) => s !== symbol)].slice(0, KEYBOARD_SLOTS);
}

// Adiciona à biblioteca (no começo), sem duplicar
export function addToLibrary(library, symbol) {
  if (library.includes(symbol)) return library;
  return [symbol, ...library].slice(0, LIBRARY_MAX);
}