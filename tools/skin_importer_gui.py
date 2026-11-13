"""Paste-first desktop interface for the CHESSNITE asset importer (standard library only)."""

from __future__ import annotations

import json
import os
import queue
import re
import threading
import tkinter as tk
import webbrowser
from pathlib import Path
from tkinter import filedialog, ttk
from tkinter.scrolledtext import ScrolledText
from urllib.parse import urlsplit

import import_skin as engine


def inspect_input(text: str) -> tuple[dict, str]:
    """Validate pasted content and describe what will be imported without networking."""
    if len(text.encode("utf-8")) > engine.MAX_INPUT_BYTES:
        raise engine.ImportFailure("Pasted text is too large. Keep it below 1 MB.")
    assets, _ = engine.parse_skin(text)
    pieces = sum(key in engine.PIECE_CODES for key in assets)
    boards = sum(key.startswith("board") for key in assets)
    events = {key.removeprefix("sound-").split("-", 1)[1] for key in assets if key.startswith("sound-") and not key.endswith("-_archive")}
    archives = sum(key.endswith("-_archive") for key in assets)
    parts = []
    if pieces:
        parts.append(f"{pieces}/12 pieces")
    if boards:
        parts.append(f"{boards} board image{'s' if boards != 1 else ''}")
    if events:
        parts.append(f"{len(events)} sound event{'s' if len(events) != 1 else ''}")
    if archives:
        parts.append(f"{archives} archive{'s' if archives != 1 else ''}")
    return assets, "Detected: " + "  ·  ".join(parts)


def suggest_name(assets: dict) -> str:
    identifiers = []
    for _, url in assets.values():
        parts = urlsplit(url).path.strip("/").split("/")
        if len(parts) >= 2 and parts[0] in ("image", "audio") and parts[1] not in identifiers:
            identifiers.append(parts[1])
    return " + ".join(identifiers[:3]) or "My imported theme"


class SkinImporterApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.busy = False
        self.last_pack: Path | None = None
        self.events: queue.Queue = queue.Queue()
        self.cancel_event = threading.Event()
        self.close_when_done = False
        self.validation_job = None
        self.poll_job = None
        self.editable = []
        self.boxes: dict[str, ScrolledText] = {}
        self.name = tk.StringVar()
        self.output = tk.StringVar(value=str(engine.PROJECT_ROOT / "assets" / "skins"))
        self.keep_available = tk.BooleanVar(value=True)
        self.archive_recovery = tk.BooleanVar(value=True)
        self.require_pieces = tk.BooleanVar(value=False)
        self.detected = tk.StringVar(value="Paste pieces, a board, or sounds to get started.")
        self.status = tk.StringVar(value="Ready. Your pasted links are checked before downloading.")
        self._build()
        self.root.protocol("WM_DELETE_WINDOW", self.close)
        self.poll_job = root.after(80, self._poll)

    def _build(self):
        root = self.root
        root.title("CHESSNITE · Skin & Sound Importer")
        root.geometry(f"{min(1020, root.winfo_screenwidth() - 60)}x{min(850, root.winfo_screenheight() - 80)}")
        root.minsize(780, 680)
        root.configure(bg="#141a22")
        style = ttk.Style(root)
        style.theme_use("clam")
        style.configure(".", background="#141a22", foreground="#e8edf5", font=("Segoe UI", 10))
        style.configure("TFrame", background="#141a22")
        style.configure("TLabel", background="#141a22")
        style.configure("Title.TLabel", font=("Segoe UI", 23, "bold"), foreground="#f4f7fb")
        style.configure("Muted.TLabel", foreground="#a5b4c8", font=("Segoe UI", 10))
        style.configure("Detected.TLabel", foreground="#86ddb9", font=("Segoe UI", 10, "bold"))
        style.configure("TButton", background="#293445", padding=(13, 7), borderwidth=0)
        style.map("TButton", background=[("active", "#35455b"), ("disabled", "#202936")], foreground=[("disabled", "#7b899c")])
        style.configure("Import.TButton", background="#397f65", font=("Segoe UI", 11, "bold"))
        style.map("Import.TButton", background=[("active", "#469e7d"), ("disabled", "#293b37")])
        style.configure("TEntry", fieldbackground="#222d3c", foreground="#f4f7fb", insertcolor="#f4f7fb", padding=7)
        style.configure("TNotebook", background="#141a22", borderwidth=0)
        style.configure("TNotebook.Tab", background="#222d3c", padding=(17, 9))
        style.map("TNotebook.Tab", background=[("selected", "#34455c")])
        style.configure("TCheckbutton", background="#141a22", foreground="#c3cedd")
        style.map("TCheckbutton", background=[("active", "#141a22")])
        style.configure("Horizontal.TProgressbar", troughcolor="#263140", background="#73cba6", borderwidth=0)

        page = ttk.Frame(root, padding=24)
        page.pack(fill="both", expand=True)
        page.columnconfigure(0, weight=1)
        page.rowconfigure(3, weight=1)
        ttk.Label(page, text="Bring your board to CHESSNITE", style="Title.TLabel").grid(row=0, column=0, sticky="w")
        ttk.Label(page, text="Paste the CSS exactly as copied. We’ll find the files and save a local theme pack.", style="Muted.TLabel").grid(row=1, column=0, sticky="w", pady=(5, 18))

        settings = ttk.Frame(page)
        settings.grid(row=2, column=0, sticky="ew", pady=(0, 14))
        settings.columnconfigure(1, weight=1)
        ttk.Label(settings, text="Pack name").grid(row=0, column=0, sticky="w", padx=(0, 14))
        self.name_entry = ttk.Entry(settings, textvariable=self.name)
        self.name_entry.grid(row=0, column=1, sticky="ew", columnspan=2)
        ttk.Label(settings, text="Save inside").grid(row=1, column=0, sticky="w", padx=(0, 14), pady=(10, 0))
        self.output_entry = ttk.Entry(settings, textvariable=self.output)
        self.output_entry.grid(row=1, column=1, sticky="ew", pady=(10, 0))
        choose = ttk.Button(settings, text="Choose folder…", command=self.choose_folder)
        choose.grid(row=1, column=2, padx=(10, 0), pady=(10, 0))
        self.editable.extend((self.name_entry, self.output_entry, choose))

        tabs = ttk.Notebook(page)
        tabs.grid(row=3, column=0, sticky="nsew")
        visuals = ttk.Frame(tabs, padding=(12, 14))
        visuals.columnconfigure(0, weight=1)
        visuals.rowconfigure(1, weight=3)
        visuals.rowconfigure(3, weight=1)
        tabs.add(visuals, text="Pieces & board")
        self._paste_box(visuals, "pieces", "1. Pieces", "Paste the whole piece-set block, including all 12 URLs.", 0, 11)
        self._paste_box(visuals, "board", "2. Board (optional)", "Paste the board CSS declaration or just its image URL.", 2, 3)
        sounds = ttk.Frame(tabs, padding=(12, 14))
        sounds.columnconfigure(0, weight=1)
        sounds.rowconfigure(1, weight=1)
        tabs.add(sounds, text="Sounds (optional)")
        self._paste_box(sounds, "sounds", "Sound events", "Paste the entire sound block. Empty alternate formats are skipped.", 0, 16)
        activity = ttk.Frame(tabs, padding=12)
        activity.rowconfigure(0, weight=1)
        activity.columnconfigure(0, weight=1)
        tabs.add(activity, text="Activity")
        self.log = self._text_widget(activity, height=14)
        self.log.grid(row=0, column=0, sticky="nsew")
        self.log.configure(state="disabled")

        ttk.Label(page, textvariable=self.detected, style="Detected.TLabel", wraplength=910).grid(row=4, column=0, sticky="w", pady=(12, 8))
        options = ttk.Frame(page)
        options.grid(row=5, column=0, sticky="ew")
        for index, (label, variable) in enumerate((("Save available files if some links fail", self.keep_available),
                                ("Recover missing sounds from supplied ZIP", self.archive_recovery),
                                ("Require all 12 pieces", self.require_pieces))):
            checkbox = ttk.Checkbutton(options, text=label, variable=variable)
            checkbox.grid(row=index // 2, column=index % 2, sticky="w", padx=(0, 16), pady=2)
            self.editable.append(checkbox)
        self.progress = ttk.Progressbar(page, mode="determinate", maximum=100)
        self.progress.grid(row=6, column=0, sticky="ew", pady=(16, 8))
        ttk.Label(page, textvariable=self.status, wraplength=910, style="Muted.TLabel").grid(row=7, column=0, sticky="w")
        actions = ttk.Frame(page)
        actions.grid(row=8, column=0, sticky="ew", pady=(16, 0))
        self.import_button = ttk.Button(actions, text="Import theme", style="Import.TButton", command=self.start_import, state="disabled")
        self.import_button.pack(side="left")
        self.cancel_button = ttk.Button(actions, text="Cancel", command=self.cancel, state="disabled")
        self.cancel_button.pack(side="left", padx=10)
        self.folder_button = ttk.Button(actions, text="Open saved folder", command=self.open_folder, state="disabled")
        self.folder_button.pack(side="right")
        self.preview_button = ttk.Button(actions, text="Open preview", command=self.open_preview, state="disabled")
        self.preview_button.pack(side="right", padx=10)

    def _text_widget(self, parent, height):
        return ScrolledText(parent, height=height, width=70, wrap="word", font=("Consolas", 10),
                            background="#1d2734", foreground="#d5e1ef", insertbackground="#e8edf5",
                            selectbackground="#375a79", relief="flat", padx=12, pady=10, undo=True)

    def _paste_box(self, parent, key, title, hint, row, height):
        header = ttk.Frame(parent)
        header.grid(row=row, column=0, sticky="ew", pady=(0 if row == 0 else 12, 6))
        ttk.Label(header, text=title, font=("Segoe UI", 11, "bold")).pack(side="left")
        clear = ttk.Button(header, text="Clear", command=lambda: self.clear_box(key))
        clear.pack(side="right", padx=(8, 0))
        paste = ttk.Button(header, text="Paste clipboard", command=lambda: self.paste(key))
        paste.pack(side="right")
        box_frame = ttk.Frame(parent)
        box_frame.grid(row=row + 1, column=0, sticky="nsew")
        box_frame.columnconfigure(0, weight=1)
        box_frame.rowconfigure(1, weight=1)
        ttk.Label(box_frame, text=hint, style="Muted.TLabel").grid(row=0, column=0, sticky="w", pady=(0, 6))
        box = self._text_widget(box_frame, height)
        box.grid(row=1, column=0, sticky="nsew")
        box.bind("<<Modified>>", self._modified)
        self.boxes[key] = box
        self.editable.extend((box, clear, paste))

    def _modified(self, event):
        if not event.widget.edit_modified():
            return
        event.widget.edit_modified(False)
        if self.validation_job:
            self.root.after_cancel(self.validation_job)
        self.validation_job = self.root.after(180, self.validate)

    def pasted_text(self):
        return "\n".join(box.get("1.0", "end-1c") for box in self.boxes.values())

    def validate(self):
        self.validation_job = None
        if self.busy:
            return False
        text = self.pasted_text()
        if not text.strip():
            self.detected.set("Paste pieces, a board, or sounds to get started.")
            self.import_button.configure(state="disabled")
            return False
        try:
            assets, description = inspect_input(text)
        except engine.ImportFailure as exc:
            self.detected.set(str(exc))
            self.import_button.configure(state="disabled")
            return False
        self.detected.set(description)
        if not self.name.get().strip():
            self.name.set(suggest_name(assets))
        self.import_button.configure(state="normal")
        return True

    def paste(self, key):
        try:
            text = self.root.clipboard_get()
        except tk.TclError:
            self.status.set("The clipboard has no text. Copy your CSS first, then paste again.")
            return
        box = self.boxes[key]
        box.delete("1.0", "end")
        box.insert("1.0", text)
        box.focus_set()
        self.validate()

    def clear_box(self, key):
        self.boxes[key].delete("1.0", "end")
        self.validate()

    def choose_folder(self):
        folder = filedialog.askdirectory(parent=self.root, title="Choose where to save theme packs", initialdir=str(engine.PROJECT_ROOT))
        if folder:
            self.output.set(folder)

    def _set_busy(self, busy):
        self.busy = busy
        for widget in self.editable:
            widget.configure(state="disabled" if busy else "normal")
        self.import_button.configure(state="disabled" if busy else "normal")
        self.cancel_button.configure(state="normal" if busy else "disabled")
        self.preview_button.configure(state="normal" if self.last_pack and not busy else "disabled")
        self.folder_button.configure(state="normal" if self.last_pack and not busy else "disabled")

    def start_import(self):
        if self.busy or not self.validate():
            return
        if not self.output.get().strip():
            self.status.set("Choose a save folder first.")
            return
        text, name = self.pasted_text(), self.name.get().strip()
        output = Path(self.output.get()).expanduser()
        settings = dict(require_complete=self.require_pieces.get(), skip_failed=self.keep_available.get(),
                        archive_fallback=self.keep_available.get() and self.archive_recovery.get())
        self.cancel_event.clear()
        self.progress["value"] = 0
        self.status.set("Downloading your theme. You can keep this window open while it works.")
        self.log.configure(state="normal")
        self.log.delete("1.0", "end")
        self.log.configure(state="disabled")
        self._set_busy(True)
        threading.Thread(target=self._run_import, args=(text, name, output, settings), daemon=True).start()

    def _run_import(self, text, name, output, settings):
        try:
            pack = engine.import_skin(text, name, output, progress=lambda message: self.events.put(("progress", message)),
                                      cancelled=self.cancel_event.is_set, **settings)
            manifest = json.loads((pack / "manifest.json").read_text(encoding="utf-8"))
            self.events.put(("done", (pack, manifest)))
        except engine.ImportCancelled as exc:
            self.events.put(("cancelled", str(exc)))
        except Exception as exc:
            self.events.put(("error", str(exc)))

    def _poll(self):
        try:
            while True:
                kind, value = self.events.get_nowait()
                if kind == "progress":
                    self._append_log(value)
                    match = re.match(r"\[(\d+)/(\d+)\]", value)
                    if match:
                        self.progress["value"] = (int(match[1]) - 1) / int(match[2]) * 100
                    if not self.cancel_event.is_set():
                        self.status.set(value)
                else:
                    if kind == "done":
                        self.last_pack, manifest = value
                        self.progress["value"] = 100
                        unavailable = sum(not item.get("recovered_path") for item in manifest["failed_assets"])
                        recovered = sum(bool(item.get("recovered_path")) for item in manifest["failed_assets"])
                        message = f'Saved “{manifest["name"]}”. Open the preview to see your theme.'
                        if recovered:
                            message += f" {recovered} sounds recovered from the supplied archive."
                        if unavailable:
                            message += f" {unavailable} files unavailable; details are in the preview."
                        self.status.set(message)
                        self._append_log(f"Saved in {self.last_pack}")
                    else:
                        self.status.set(value if kind == "cancelled" else f"Import failed: {value}")
                        self._append_log(self.status.get())
                    self._set_busy(False)
                    if self.close_when_done:
                        self.dispose()
                        return
        except queue.Empty:
            pass
        self.poll_job = self.root.after(80, self._poll)

    def _append_log(self, text):
        self.log.configure(state="normal")
        self.log.insert("end", text + "\n")
        self.log.see("end")
        self.log.configure(state="disabled")

    def cancel(self):
        if self.busy:
            self.cancel_event.set()
            self.cancel_button.configure(state="disabled")
            self.status.set("Cancelling after the current download finishes…")

    def open_preview(self):
        if self.last_pack:
            webbrowser.open((self.last_pack / "preview.html").as_uri())

    def open_folder(self):
        if self.last_pack:
            if os.name == "nt":
                os.startfile(self.last_pack)
            else:
                webbrowser.open(self.last_pack.as_uri())

    def close(self):
        if self.busy:
            self.close_when_done = True
            self.cancel()
        else:
            self.dispose()

    def dispose(self):
        for job in (self.validation_job, self.poll_job):
            if job:
                self.root.after_cancel(job)
        self.root.destroy()


def main():
    root = tk.Tk()
    SkinImporterApp(root)
    root.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
