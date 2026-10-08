import React from "react";

export default function NativeKeyboardInput({
  inputRef,
  onChange,
  onKeyDown,
  onBlur,
}) {
  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="text"
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
  );
}