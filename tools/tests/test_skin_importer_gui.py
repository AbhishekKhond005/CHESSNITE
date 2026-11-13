import json
import sys
import tempfile
import threading
import time
import tkinter as tk
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import import_skin as engine
import skin_importer_gui as gui
from test_import_skin import png_pixel


PIECES = "--theme-piece-set-perspective:1;\n" + "\n".join(
    f"--theme-piece-set-{code}: url('https://assets-themes.chess.com/image/uqihi/150/{code}.png');"
    for code in engine.PIECE_CODES
)
BOARD = "--theme-board-style-image-3d-board: url('https://assets-themes.chess.com/image/bin2s/3dboard.png');"


class PasteInputTests(unittest.TestCase):
    def test_user_example_detects_full_set_and_suggests_name(self):
        assets, summary = gui.inspect_input("for pieces:\n```\n" + PIECES + "\n```\nfor board:\n" + BOARD)
        self.assertEqual(len(assets), 13)
        self.assertIn("12/12 pieces", summary)
        self.assertIn("1 board image", summary)
        self.assertEqual(gui.suggest_name(assets), "uqihi + bin2s")

    def test_piece_css_and_plain_board_url_work_together(self):
        assets, _ = gui.inspect_input(PIECES + "\nhttps://assets-themes.chess.com/image/bin2s/3dboard.png")
        self.assertEqual(len(assets), 13)

    def test_oversized_paste_rejected_before_download(self):
        with self.assertRaises(engine.ImportFailure):
            gui.inspect_input("x" * (engine.MAX_INPUT_BYTES + 1))


class DesktopFlowTests(unittest.TestCase):
    def setUp(self):
        self.root = tk.Tk()
        self.root.withdraw()
        self.app = gui.SkinImporterApp(self.root)
        self.temp = tempfile.TemporaryDirectory()
        self.app.output.set(self.temp.name)

    def tearDown(self):
        self.app.dispose()
        self.temp.cleanup()

    def fill(self):
        self.app.boxes["pieces"].insert("1.0", PIECES)
        self.app.boxes["board"].insert("1.0", BOARD)
        self.app.validate()

    def until(self, predicate):
        deadline = time.monotonic() + 5
        while not predicate() and time.monotonic() < deadline:
            self.root.update()
            time.sleep(0.01)
        self.root.update()
        self.assertTrue(predicate(), self.app.status.get())

    def test_clipboard_paste_detects_assets_without_reading_real_clipboard(self):
        with patch.object(self.root, "clipboard_get", return_value=PIECES):
            self.app.paste("pieces")
        with patch.object(self.root, "clipboard_get", return_value=BOARD):
            self.app.paste("board")
        self.assertEqual(self.app.name.get(), "uqihi")
        self.assertIn("12/12 pieces", self.app.detected.get())
        self.assertIn("1 board image", self.app.detected.get())
        self.assertEqual(str(self.app.import_button["state"]), "normal")

    def test_button_imports_all_assets_and_prevents_overwrite(self):
        self.fill()
        with patch.object(engine, "download_asset", side_effect=lambda url, timeout: (png_pixel(), url)) as download:
            self.app.start_import()
            self.assertTrue(self.app.busy)
            self.assertEqual(str(self.app.boxes["pieces"]["state"]), "disabled")
            self.until(lambda: not self.app.busy)
            self.assertEqual(download.call_count, 13)
        pack = self.app.last_pack
        manifest = json.loads((pack / "manifest.json").read_text())
        self.assertEqual(len(manifest["pieces"]), 12)
        self.assertEqual(len(manifest["boards"]), 1)
        self.assertEqual(str(self.app.preview_button["state"]), "normal")
        with patch.object(engine, "download_asset") as download:
            self.app.start_import()
            self.until(lambda: not self.app.busy)
            download.assert_not_called()
        self.assertIn("already exists", self.app.status.get())
        self.assertEqual(self.app.last_pack, pack)

    def test_cancel_during_download_preserves_no_partial_pack(self):
        started, release = threading.Event(), threading.Event()
        def fake_download(url, timeout):
            started.set()
            release.wait(3)
            return png_pixel(), url
        self.fill()
        with patch.object(engine, "download_asset", side_effect=fake_download):
            self.app.start_import()
            try:
                self.until(started.is_set)
                self.app.cancel()
            finally:
                release.set()
            self.until(lambda: not self.app.busy)
        self.assertIn("cancelled", self.app.status.get().lower())
        self.assertEqual(list(Path(self.temp.name).iterdir()), [])

    def test_partial_sound_import_reports_failures_and_keeps_preview(self):
        self.app.boxes["sounds"].insert("1.0", "https://example.com/capture.mp3\nhttps://example.com/move-self.mp3")
        self.app.validate()
        with patch.object(engine, "download_asset", side_effect=[
            (b"\xff\xfb\x90\x00" + b"\x00" * 24, "https://example.com/capture.mp3"),
            engine.ImportFailure("HTTP 403"),
        ]):
            self.app.start_import()
            self.until(lambda: not self.app.busy)
        self.assertIsNotNone(self.app.last_pack)
        self.assertIn("1 files unavailable", self.app.status.get())
        self.assertEqual(str(self.app.preview_button["state"]), "normal")

    def test_invalid_input_cannot_start_a_download(self):
        self.app.boxes["pieces"].insert("1.0", "Not a theme")
        with patch.object(engine, "download_asset") as download:
            self.app.start_import()
            download.assert_not_called()
        self.assertFalse(self.app.busy)
        self.assertEqual(str(self.app.import_button["state"]), "disabled")


if __name__ == "__main__":
    unittest.main()
