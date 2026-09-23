import React from "react";

export default function NativeKeyboardInput({
  inputRef,
  isActive,
  onChange,
  onKeyDown,
  onBlur,
  onFinish,
}) {
  return (
    <>
      <input
        ref={inputRef}
        type="search"
        inputMode="search"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        name="no-autofill-field"
        data-form-type="other"
        data-lpignore="true"
        aria-autocomplete="none"
        className="absolute opacity-0 top-0 left-0 h-px w-px -z-10"
        onChange={onChange}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />

      {isActive && (
        <div className="bg-blue-600 text-white text-[12px] font-bold px-4 py-2.5 flex justify-between items-center gap-2 shadow-md z-20 animate-in slide-in-from-top-2 duration-200">
          <span className="flex items-center gap-2">
            <span className="animate-pulse">⌨️</span>
            Digitando com o teclado do celular...
          </span>
          <button
            onClick={onFinish}
            className="bg-white text-blue-700 hover:bg-blue-50 active:scale-95 font-black text-[11px] px-3 py-1.5 rounded-lg shadow-sm transition-all shrink-0 uppercase tracking-wide"
          >
            ✓ Pronto
          </button>
        </div>
      )}
    </>
  );
}