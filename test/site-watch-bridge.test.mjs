import test from 'node:test';
import assert from 'node:assert/strict';
import {SITE_BRIDGE_SOURCE,siteCommandScript} from '../mobile/site-watch-bridge.js';
test('site bridge only emits the scoped native playback contract',()=>{assert.match(SITE_BRIDGE_SOURCE,/ikimiz-site-v1/);assert.match(SITE_BRIDGE_SOURCE,/querySelectorAll\('video'\)/);assert.match(SITE_BRIDGE_SOURCE,/contentDocument/);});
test('site commands whitelist playback actions and clamp seek values',()=>{assert.match(siteCommandScript('seek',40),/\"seek\",40/);assert.match(siteCommandScript('seek',999999),/\"seek\",86400/);assert.throws(()=>siteCommandScript('delete',0),/Unsupported/);});
