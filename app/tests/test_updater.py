import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from updater import Updater, REMOTE

class UpdateTests(unittest.TestCase):
    def test_latest_version_does_not_merge(self):
        updater = Updater(Path.cwd())
        with patch.object(updater, 'git', side_effect=[REMOTE, 'main', '', '', 'abc1234', 'abc1234']) as git:
            updater.run()
            self.assertEqual(updater.read()['status'], 'current')
            self.assertNotIn(('merge', '--ff-only', 'origin/main'), [call.args for call in git.call_args_list])

    def test_only_fast_forward_updates_are_used(self):
        updater = Updater(Path.cwd())
        with patch.object(updater, 'git', side_effect=[REMOTE, 'main', '', '', 'old', 'new', '']) as git:
            updater.run()
            self.assertEqual(updater.read()['status'], 'updated')
            git.assert_any_call('merge', '--ff-only', 'origin/main')

    def test_local_edits_and_wrong_remotes_cannot_be_overwritten(self):
        for responses in ([REMOTE, 'main', ' M source.py'], ['https://example.com/elsewhere.git']):
            updater = Updater(Path.cwd())
            with patch.object(updater, 'git', side_effect=responses) as git:
                updater.run()
                self.assertEqual(updater.read()['status'], 'error')
                self.assertFalse(any(call.args[0] in ('fetch', 'merge') for call in git.call_args_list))

if __name__ == '__main__': unittest.main()
