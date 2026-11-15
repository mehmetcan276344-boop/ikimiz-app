import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/gifts.js', import.meta.url), 'utf8');

function renderWith(baseChat) {
  const listeners = [];
  const context = {
    chat: baseChat,
    document: { addEventListener: (...args) => listeners.push(args), getElementById: () => null },
    window: {},
    items: () => [],
    esc: String,
    TextEncoder,
    TextDecoder,
    Uint8Array,
  };
  vm.runInNewContext(source, context);
  return context.chat();
}

test('gift and chat shortcuts render below the modern compose form', () => {
  const html = renderWith(() => '<section><div id="messages"></div><form id="message-form"><input></form><p class="compose-note">Private chat</p></section>');
  const formEnd = html.indexOf('</form>');
  const gift = html.indexOf('data-gift-picker');
  assert.ok(formEnd >= 0 && gift > formEnd, 'gift launcher follows the message form');
  assert.ok(html.includes('Hediye gönder'));
  assert.ok(html.includes('<strong>Hediye</strong>'));
  assert.ok(html.includes('<span>Öpücük</span>'));
  assert.ok(html.includes('<span>Harita</span>'));
  assert.ok(html.includes('data-kiss-open'));
  assert.ok(html.includes('data-map-open'));
});

test('gift shortcuts also render with the legacy status note', () => {
  const html = renderWith(() => '<section><div id="messages"></div><form id="message-form"><input></form><p class="status">Messages sync live.</p></section>');
  assert.ok(html.includes('data-gift-picker'));
  assert.ok(html.includes('Hediye gönder'));
});
