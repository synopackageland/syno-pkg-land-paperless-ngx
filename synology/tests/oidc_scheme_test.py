"""Run with the dependencies in requirements-oidc.txt installed."""
import json
from pathlib import Path
import unittest

from django.conf import settings
from django.test import RequestFactory, override_settings
import yaml

root = Path(__file__).resolve().parents[1]
env = yaml.safe_load((root / "compose.yaml").read_text())["services"]["webserver"]["environment"]
settings.configure(
    SECRET_KEY="test-only",
    ALLOWED_HOSTS=["documents.example.test"],
    ACCOUNT_DEFAULT_HTTP_PROTOCOL=env["PAPERLESS_ACCOUNT_DEFAULT_HTTP_PROTOCOL"],
    SECURE_PROXY_SSL_HEADER=tuple(json.loads(env["PAPERLESS_PROXY_SSL_HEADER"])),
    USE_X_FORWARDED_HOST=env["PAPERLESS_USE_X_FORWARD_HOST"] == "true",
    USE_X_FORWARDED_PORT=env["PAPERLESS_USE_X_FORWARD_PORT"] == "true",
)
from allauth.utils import build_absolute_uri


class OidcSchemeTest(unittest.TestCase):
    def callback(self, scheme):
        # TLS terminates before the loopback upstream connection.
        request = RequestFactory().get(
            "/accounts/oidc/dsm/login/",
            HTTP_HOST="127.0.0.1:28992",
            HTTP_X_FORWARDED_HOST="documents.example.test:5001" if scheme == "https" else "documents.example.test:5000",
            HTTP_X_FORWARDED_PROTO=scheme,
        )
        path = env["PAPERLESS_FORCE_SCRIPT_NAME"] + "/accounts/oidc/dsm/login/callback/"
        return build_absolute_uri(request, path)

    def test_http_https_http_callbacks_follow_each_request(self):
        for scheme, port in [("http", 5000), ("https", 5001), ("http", 5000)]:
            with self.subTest(scheme=scheme, port=port):
                self.assertEqual(
                    self.callback(scheme),
                    f"{scheme}://documents.example.test:{port}/synopkgland/SynoPkgPaperlessNgx/accounts/oidc/dsm/login/callback/",
                )

    def test_upstream_https_default_reproduces_http_callback_mismatch(self):
        with override_settings(ACCOUNT_DEFAULT_HTTP_PROTOCOL="https"):
            self.assertTrue(self.callback("http").startswith("https://"))


if __name__ == "__main__":
    unittest.main()
