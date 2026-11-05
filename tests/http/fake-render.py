"""A tiny stand-in for the Render API AND for an ordinary website, for tests.
Usage: python3 fake-render.py <port> <log-file>
Render-like routes need 'Authorization: Bearer render-key-1234'. Website-like routes: /health /broken /redirect /auth /slow.
Every request is appended to <log-file> as one JSON line (path and the Authorization header)."""
import json, sys, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

port, log_file = int(sys.argv[1]), sys.argv[2]
DEPLOY = {"srv-okok1234": "live", "srv-failed12": "build_failed", "srv-busy1234": "update_in_progress", "srv-susp1234": "live"}

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def send(self, status, payload=None, headers=None):
        body = json.dumps(payload if payload is not None else {}).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json"); self.send_header("content-length", str(len(body)))
        for k, v in (headers or {}).items(): self.send_header(k, v)
        self.end_headers(); self.wfile.write(body)
    def do_GET(self):
        auth = self.headers.get("authorization")
        with open(log_file, "a") as f: f.write(json.dumps({"path": self.path, "auth": auth}) + "\n")
        p = self.path
        if p == "/health": return self.send(200, {"ok": True})
        if p == "/broken": return self.send(500, {"error": "boom"})
        if p == "/redirect": return self.send(302, {}, {"location": "/health"})
        if p == "/auth": return self.send(200 if auth == "Bearer target-token-xyz" else 401, {})
        if p == "/slow": time.sleep(8); return self.send(200, {})
        if p.startswith("/v1/services/"):
            if auth != "Bearer render-key-1234": return self.send(401, {"message": "Unauthorized"})
            rest = p[len("/v1/services/"):]
            sid = rest.split("?")[0].split("/")[0]
            if sid not in DEPLOY: return self.send(404, {"message": "not found"})
            if "/deploys" in rest: return self.send(200, [{"deploy": {"status": DEPLOY[sid]}}])
            return self.send(200, {"id": sid, "suspended": "suspended" if sid == "srv-susp1234" else "not_suspended"})
        self.send(404, {})

ThreadingHTTPServer(("127.0.0.1", port), H).serve_forever()
