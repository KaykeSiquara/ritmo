import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

class RO { observe() {} unobserve() {} disconnect() {} }
Object.assign(globalThis, { ResizeObserver: RO });
Element.prototype.scrollIntoView = function () {};
Element.prototype.hasPointerCapture = () => false;
Element.prototype.releasePointerCapture = () => {};
if (!window.matchMedia) window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
URL.createObjectURL = () => "blob:test";
URL.revokeObjectURL = () => {};
HTMLAnchorElement.prototype.click = function () {};
configure({ asyncUtilTimeout: 5000 });
beforeEach(() => localStorage.clear());
afterEach(() => cleanup());
