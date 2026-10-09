#!/usr/bin/env python3
"""Local dev server without HTTP caching (the service worker still caches; it is versioned)."""
import http.server, functools, sys
class NoStore(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a): pass
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
http.server.ThreadingHTTPServer(('', port), functools.partial(NoStore, directory='.')).serve_forever()
