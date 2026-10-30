import { appOpenSmoke } from '@synopackageland/cli/e2e';

// Upstream Angular dashboard content, reached after Paperless OIDC sign-in.
appOpenSmoke({ ready: 'pngx-dashboard pngx-page-header' });
