"""
Servidor de desarrollo local.
Sirve el frontend en / y hace proxy de /api/* al backend Flask en :8000
Uso: python3 dev_server.py
Accede en: http://localhost:5500
"""
import http.server
import urllib.request
import urllib.error

FRONTEND_DIR = "frontend"
BACKEND_URL  = "http://localhost:8000"
PORT         = 5500


class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def do_GET(self):
        if self.path.startswith("/api"):
            self._proxy()
        else:
            # SPA fallback: si el fichero no existe sirve index.html
            import os
            local = os.path.join(FRONTEND_DIR, self.path.lstrip("/"))
            if not os.path.exists(local) and not self.path.startswith("/js"):
                self.path = "/index.html"
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api"):
            self._proxy()
        else:
            self.send_error(405)

    def do_PUT(self):
        if self.path.startswith("/api"):
            self._proxy()
        else:
            self.send_error(405)

    def do_DELETE(self):
        if self.path.startswith("/api"):
            self._proxy()
        else:
            self.send_error(405)

    def _proxy(self):
        url = BACKEND_URL + self.path
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else None
        req = urllib.request.Request(
            url, data=body, method=self.command,
            headers={k: v for k, v in self.headers.items()
                     if k.lower() not in ("host", "content-length")}
        )
        try:
            with urllib.request.urlopen(req) as resp:
                self.send_response(resp.status)
                for k, v in resp.headers.items():
                    if k.lower() not in ("transfer-encoding",):
                        self.send_header(k, v)
                self.end_headers()
                self.wfile.write(resp.read())
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            for k, v in e.headers.items():
                if k.lower() not in ("transfer-encoding",):
                    self.send_header(k, v)
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_error(502, str(e))

    def log_message(self, fmt, *args):
        pass  # silencia logs de ficheros estáticos


if __name__ == "__main__":
    import os
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with http.server.ThreadingHTTPServer(("", PORT), ProxyHandler) as httpd:
        print(f"  Frontend: http://localhost:{PORT}")
        print(f"  Backend:  {BACKEND_URL}")
        print("  Ctrl+C para parar")
        httpd.serve_forever()
