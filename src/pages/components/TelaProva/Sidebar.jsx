import React from "react";
import { Link } from "react-router-dom";

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <div
          className="absolute inset-0 bg-slate-900/40 z-40 animate-in fade-in"
          onClick={onClose}
        />
      )}

      <div
        className={`absolute top-0 left-0 h-full w-64 bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out p-5 flex flex-col justify-between ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          <div className="flex justify-between items-center mb-8 pb-4 border-b">
            <h2 className="font-black text-slate-800">LOGIC_LAB</h2>
            <button onClick={onClose} className="text-slate-400 font-bold">
              ✕
            </button>
          </div>
          <nav className="space-y-2">
            <Link
              to="/"
              className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-50"
            >
              <span>📝</span> Histórico
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}