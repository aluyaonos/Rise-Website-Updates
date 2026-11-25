"""Local preview with caching disabled so design changes appear on reload."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from functools import partial
import json
from os import replace
from sys import argv
from tempfile import NamedTemporaryFile
from urllib.parse import unquote, urlparse


PROJECT_ROOT = Path(__file__).resolve().parent
PLANS_ROOT = PROJECT_ROOT / 'plans'


class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        """Keep the current review route focused on Why Rise."""
        if urlparse(self.path).path == '/':
            self.send_response(302)
            self.send_header('Location', '/why-rise/')
            self.end_headers()
            return
        super().do_GET()

    def do_POST(self):
        """Save the Plans headline profile from the same-origin loopback preview."""
        if self.path != '/__preview/growth-word-defaults':
            self.send_error(404)
            return
        host = self.headers.get('Host', '')
        origin = self.headers.get('Origin', '')
        if (host.split(':', 1)[0] not in ('127.0.0.1', 'localhost')
                or origin != f'http://{host}'):
            self.send_error(403)
            return
        if self.headers.get_content_type() != 'application/json':
            self.send_error(415)
            return
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 65536:
                self.send_error(413)
                return
            values = json.loads(self.rfile.read(size))
            if (not isinstance(values, dict)
                    or set(values) != {'Headline', 'Hover phrases', 'Appearance', 'Interaction', 'Motion'}
                    or any(not isinstance(values[key], str) for key in ('Headline', 'Hover phrases'))
                    or any(not isinstance(values[key], dict) for key in ('Appearance', 'Interaction', 'Motion'))):
                self.send_error(400)
                return
            source = '// Headline defaults saved from DialKit.\nexport default '
            source += json.dumps(values, indent=2, allow_nan=False) + ';\n'
        except (ValueError, RecursionError):
            self.send_error(400)
            return

        destination = PLANS_ROOT / 'src' / 'growth-words-defaults.js'
        temporary = None
        try:
            with NamedTemporaryFile(mode='w', encoding='utf-8', dir=destination.parent,
                                    delete=False) as output:
                temporary = Path(output.name)
                output.write(source)
            replace(temporary, destination)
        except OSError:
            self.send_error(500)
            return
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)
        self.send_response(204)
        self.end_headers()

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
