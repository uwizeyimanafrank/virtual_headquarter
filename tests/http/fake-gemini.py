"""A tiny stand-in for the Gemini API, for tests. Usage: python3 fake-gemini.py <port> <log-file> <mode-file>
It records every request (path, API-key header, JSON body) as one line in <log-file> and answers with a
canned reply. If <mode-file> contains the word 'error' it answers 500 with a message that must never reach the user."""
import json, re, sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

port, log_file, mode_file = int(sys.argv[1]), sys.argv[2], sys.argv[3]

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):  # keep the test output quiet
        pass

    def do_POST(self):
        length = int(self.headers.get("content-length", 0))
        raw = self.rfile.read(length).decode("utf-8", "replace")
        try:
            body = json.loads(raw)
        except ValueError:
            body = {"unparsed": raw[:200]}
        with open(log_file, "a") as f:
            f.write(json.dumps({"path": self.path, "key": self.headers.get("x-goog-api-key"), "body": body}) + "\n")
        try:
            mode = open(mode_file).read().strip()
        except OSError:
            mode = "ok"
        if mode == "error":
            payload, status = {"error": {"code": 500, "message": "UPSTREAM-SECRET-DETAIL internal failure"}}, 500
        elif mode == "html":
            payload, status = {"candidates": [{"content": {"role": "model", "parts": [{"text": "<img src=x onerror=alert(1)> <script>alert(2)</script>"}]}}]}, 200
        else:
            last = body.get("contents", [{}])[-1].get("parts", [{}])[0].get("text", "")
            payload, status = {"candidates": [{"content": {"role": "model", "parts": [{"text": "FAKE REPLY to: " + last[:60]}]}}]}, 200
        out = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)

ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
