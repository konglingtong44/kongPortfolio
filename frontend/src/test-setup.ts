import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
afterEach(cleanup);

// jsdom does not implement the browser's native modal lifecycle.
HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
