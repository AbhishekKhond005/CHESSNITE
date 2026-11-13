"""One-click personal app launcher; reuses an existing local instance."""
import argparse
import ctypes
import json
import logging
import sys
import threading
import time
import webbrowser
from urllib.error import URLError
from urllib.request import urlopen

from server import AppServer, ROOT, PORT

URL = f'http://127.0.0.1:{PORT}'


def running():
    try:
        with urlopen(URL + '/api/health', timeout=1) as response:
            return json.load(response).get('app') == 'chessnite'
    except (OSError, URLError, ValueError):
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--wait', action='store_true')
    args = parser.parse_args()
    (ROOT / '.local').mkdir(exist_ok=True)
    logging.basicConfig(filename=ROOT / '.local' / 'launcher.log', level=logging.INFO,
                        format='%(asctime)s %(levelname)s %(message)s')
    try:
        if args.wait:
            deadline = time.monotonic() + 30
            while running() and time.monotonic() < deadline:
                time.sleep(.2)
            if running():
                raise RuntimeError('The previous instance did not close. Open the launcher again in a moment.')
        if running():
            if not args.no_browser:
                webbrowser.open(URL)
            return 0
        if not (ROOT / 'web/build/index.html').is_file():
            raise RuntimeError('The browser build is missing. Restore web/build from GitHub, or run npm.cmd ci and npm.cmd run build once.')
        server = AppServer()
        if not args.no_browser:
            threading.Timer(.3, lambda: webbrowser.open(URL)).start()
        logging.info('CHESSNITE serving at %s', URL)
        try:
            server.serve_forever()
        finally:
            server.server_close()
        return 0
    except Exception as exc:
        logging.exception('CHESSNITE could not start')
        message = str(exc) + '\n\nDetails: ' + str(ROOT / '.local/launcher.log')
        if sys.platform == 'win32' and not args.no_browser:
            ctypes.windll.user32.MessageBoxW(0, message, 'CHESSNITE could not open', 0x10)
        elif sys.stderr:
            print(message, file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
