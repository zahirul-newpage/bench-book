"use client";

export function DeleteEntryButton() {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!confirm("Delete this entry? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
      className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
    >
      Delete entry
    </button>
  );
}
