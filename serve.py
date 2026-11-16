"""Local preview with caching disabled so design changes appear on reload."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from functools import partial
from sys import argv
from urllib.parse import unquote, urlparse


PROJECT_ROOT = Path(__file__).resolve().parent
PLANS_ROOT = PROJECT_ROOT / 'plans'


class PreviewHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        """Mount the earlier Rise Plans build at /plans without duplicating it."""
        request_path = unquote(urlparse(path).path)
        if request_path == '/plans' or request_path.startswith('/plans/'):
            relative_path = request_path.removeprefix('/plans').lstrip('/')
            target = (PLANS_ROOT / relative_path).resolve()
            try:
                target.relative_to(PLANS_ROOT.resolve())
            except ValueError:
                return str(PLANS_ROOT / '__invalid_path__')
            return str(target)
        return super().translate_path(path)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()


if __name__ == '__main__':
    root = str(PROJECT_ROOT)
    port = int(argv[1]) if len(argv) > 1 else 4174
    server = ThreadingHTTPServer(('127.0.0.1', port), partial(PreviewHandler, directory=root))
    print(f'Rise preview: http://127.0.0.1:{port}/', flush=True)
    server.serve_forever()
