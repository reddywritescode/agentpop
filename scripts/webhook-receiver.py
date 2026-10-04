#!/usr/bin/env python3
"""Minimal local receiver used by the AgentPop acceptance suite."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os


OUTPUT = os.environ.get("AGENTPOP_WEBHOOK_CAPTURE", "/tmp/agentpop-webhook-capture.json")
PORT = int(os.environ.get("AGENTPOP_WEBHOOK_PORT", "18765"))


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):  # noqa: N802
        length = int(self.headers.get("content-length", "0"))
        body = self.rfile.read(length).decode("utf-8", errors="replace")
        capture = {
            "path": self.path,
            "signature": self.headers.get("x-agentpop-signature", ""),
            "event": self.headers.get("x-agentpop-event", ""),
            "body": body,
        }
        with open(OUTPUT, "w", encoding="utf-8") as handle:
            json.dump(capture, handle)
        self.send_response(204)
        self.end_headers()

    def log_message(self, _format, *_args):
        return


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
