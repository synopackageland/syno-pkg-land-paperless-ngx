import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('bootstrap', Path(__file__).parents[1] / 'container' / 'bootstrap.py')
bootstrap = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bootstrap)

class BootstrapTest(unittest.TestCase):
    def test_oidc_uses_sub_pkce_and_sdk_secret(self):
        value = bootstrap.provider_config('a' * 64, '29991')
        provider = value['openid_connect']
        app = provider['APPS'][0]
        self.assertEqual(app['secret'], 'a' * 64)
        self.assertEqual(app['settings']['uid_field'], 'sub')
        self.assertEqual(app['settings']['server_url'], 'http://127.0.0.1:29991')
        self.assertTrue(provider['OAUTH_PKCE_ENABLED'])
        self.assertEqual(provider['SCOPE'], ['openid', 'profile', 'email', 'groups'])

    def test_django_key_survives_new_generation(self):
        with tempfile.TemporaryDirectory() as directory:
            key = Path(directory) / 'secret-key'
            self.assertEqual(bootstrap.retained_key(key, 'a' * 64), 'a' * 64)
            self.assertEqual(bootstrap.retained_key(key, 'b' * 64), 'a' * 64)
            self.assertEqual(key.stat().st_mode & 0o777, 0o600)

    def test_retained_key_rejects_symlink_and_public_file(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'original').write_text('a' * 64)
            (root / 'original').chmod(0o644)
            (root / 'link').symlink_to(root / 'original')
            for name in ['original', 'link']:
                with self.subTest(name=name), self.assertRaises((ValueError, OSError)):
                    bootstrap.retained_key(root / name, 'b' * 64)

    def test_ocr_digest_mismatch_does_not_publish_download(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'chi_tra.traineddata'
            with patch.object(bootstrap, 'download', return_value=b'wrong'):
                with self.assertRaises(ValueError):
                    bootstrap.traineddata(target, 'https://example.invalid/model', 'a' * 64)
            self.assertFalse(target.exists())

    def test_ocr_cached_bytes_verified_before_reuse(self):
        import hashlib
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'chi_sim.traineddata'
            target.write_bytes(b'valid')
            with patch.object(bootstrap, 'download', side_effect=AssertionError('unexpected network')):
                bootstrap.traineddata(target, 'https://example.invalid/model', hashlib.sha256(b'valid').hexdigest())
            target.write_bytes(b'corrupt')
            with patch.object(bootstrap, 'download', return_value=b'corrupt'):
                with self.assertRaises(ValueError):
                    bootstrap.traineddata(target, 'https://example.invalid/model', hashlib.sha256(b'valid').hexdigest())

if __name__ == '__main__':
    unittest.main()
