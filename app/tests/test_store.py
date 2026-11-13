import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from store import Store, Conflict

class StoreTests(unittest.TestCase):
    def test_progress_survives_reopening_and_stale_tabs_cannot_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'progress.sqlite3'
            store = Store(path)
            saved = store.read()
            saved['state']['progress']['triangle'] = {'completed': True}
            self.assertEqual(store.save(saved['state'], 0), 1)
            self.assertTrue(Store(path).read()['state']['progress']['triangle']['completed'])
            with self.assertRaises(Conflict):
                store.save(saved['state'], 0)

    def test_invalid_restore_does_not_replace_progress(self):
        with tempfile.TemporaryDirectory() as directory:
            store = Store(Path(directory) / 'progress.sqlite3')
            with self.assertRaises(ValueError):
                store.save({'schemaVersion': 50}, 0)
            self.assertEqual(store.read()['revision'], 0)

if __name__ == '__main__': unittest.main()
