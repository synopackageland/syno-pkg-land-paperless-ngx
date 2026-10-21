"""Configure upstream interfaces, then exec the unchanged official entrypoint."""
import hashlib
import json
import os
from pathlib import Path
import stat
import tempfile
import urllib.request

MODEL_REVISION = '87416418657359cb625c412a48b6e1d6d41c29bd'
MODELS = {
    'chi_tra': '529c5b5797d64b126065cd55f2bb4c7fd7b15790798091b1ff259941a829330b',
    'chi_sim': 'a5fcb6f0db1e1d6d8522f39db4e848f05984669172e584e8d76b6b3141e1f730',
}


def provider_config(secret):
    return {'openid_connect': {
        'OAUTH_PKCE_ENABLED': True,
        'SCOPE': ['openid', 'profile', 'email', 'groups'],
        'APPS': [{
            'provider_id': 'dsm', 'name': 'DSM', 'client_id': 'paperless',
            'secret': secret,
            'settings': {
                'server_url': 'http://127.0.0.1:28991',
                'token_auth_method': 'client_secret_basic',
                'uid_field': 'sub', 'fetch_userinfo': True,
            },
        }],
    }}


def retained_key(path, seed):
    if len(seed) != 64 or any(c not in '0123456789abcdef' for c in seed):
        raise ValueError('Invalid SDK secret seed')
    try:
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    except FileExistsError:
        pass
    else:
        with os.fdopen(fd, 'w') as file:
            file.write(seed)
            file.flush()
            os.fsync(file.fileno())
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(fd) as file:
        info = os.fstat(file.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077 or info.st_nlink != 1:
            raise ValueError('Django secret must be a private package-owned file')
        value = file.read(65)
    if len(value) != 64 or any(c not in '0123456789abcdef' for c in value):
        raise ValueError('Invalid retained Django secret')
    return value


def download(url):
    with urllib.request.urlopen(url, timeout=45) as response:
        data = response.read(16 * 1024 * 1024 + 1)
    if len(data) > 16 * 1024 * 1024:
        raise ValueError('OCR model exceeds size limit')
    return data


def traineddata(target, url, digest):
    if target.is_symlink():
        raise ValueError('OCR model cannot be a symlink')
    if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest() == digest:
        return
    data = download(url)
    if hashlib.sha256(data).hexdigest() != digest:
        raise ValueError('OCR model checksum mismatch')
    fd, temporary = tempfile.mkstemp(dir=target.parent, prefix='.model-')
    try:
        with os.fdopen(fd, 'wb') as file:
            file.write(data)
            file.flush()
            os.fsync(file.fileno())
        os.replace(temporary, target)
    finally:
        Path(temporary).unlink(missing_ok=True)


def main():
    os.umask(0o077)
    root = Path('/var/tmp/paperless')  # SDK storage_init owns creation and validation.
    os.environ['PAPERLESS_SECRET_KEY'] = retained_key(root / 'secret-key', os.environ.pop('DJANGO_KEY_SEED'))
    os.environ['PAPERLESS_SOCIALACCOUNT_PROVIDERS'] = json.dumps(provider_config(os.environ.pop('OIDC_CLIENT_SECRET')))
    tessdata = root / 'tessdata'
    # Retain the official image's English/orientation models and config files.
    original = Path('/usr/share/tesseract-ocr/5/tessdata')
    for item in original.iterdir():
        link = tessdata / item.name
        if not link.exists() and not link.is_symlink():
            link.symlink_to(item)
    for language, digest in MODELS.items():
        url = f'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/{MODEL_REVISION}/{language}.traineddata'
        traineddata(tessdata / (language + '.traineddata'), url, digest)
    os.environ['TESSDATA_PREFIX'] = str(tessdata)
    os.execv('/init', ['/init'])


if __name__ == '__main__':
    try:
        main()
    except Exception:
        # SDK runtime values and upstream exceptions may contain credentials.
        raise SystemExit('Paperless initialization failed; verify private storage, SDK secrets and OCR model connectivity') from None
