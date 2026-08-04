import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import {
  assertSingleActiveRequest,
  buildMuapiReceipt,
  classifyMuapiStatus,
  shouldContinuePolling,
  validateBudgetPreflight,
} from '../lib/kids/production/muapi-guard.mjs';
import { validateLumoProduction } from '../lib/kids/safety/validate-production.mjs';

const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const lock = read('config/lumo-canon-lock-v4.json');
const budget = read('content/production/budget-v1.json');
const plan = read('content/production/S01E01-microepisode-plan-v1.json');
const proof = read('content/production/jobs/S01E01-proof-v1.json');
const tools = read('config/lumo-tool-policy-v1.json');
const youtube = read('content/production/youtube-release-gate-v1.json');

test('01 master Character Design hash is locked', () => {
  assert.equal(sha(lock.master.path), lock.master.sha256);
});

test('02 Brillavalle hash is locked', () => {
  assert.equal(sha(lock.world.path), lock.world.sha256);
});

test('03 six character crops are unique and locked', () => {
  assert.equal(lock.characters.length, 6);
  assert.equal(new Set(lock.characters.map((item) => item.sha256)).size, 6);
  for (const item of lock.characters) assert.equal(sha(item.path), item.sha256);
});

test('04 only approved front and three-quarter views are allowed', () => {
  assert.deepEqual(lock.permittedViews, ['front', 'threeQuarter']);
  assert.deepEqual(lock.blockedViewsUntilApproved, ['side', 'back']);
});

test('05 every active profile uses v4 and approved views', () => {
  for (const item of lock.characters) {
    const profile = read(`content/characters/profiles/${item.id}.json`);
    assert.equal(profile.canonicalSourceVersion, 4);
    assert.deepEqual(profile.designSheet.requiredViews, lock.permittedViews);
  }
});

test('06 production validator reports no drift', () => {
  assert.deepEqual(validateLumoProduction(), []);
});

test('07 microepisode covers exactly 60 seconds without gaps', () => {
  assert.equal(plan.durationSeconds, 60);
  assert.equal(plan.sections[0].start, 0);
  plan.sections.slice(1).forEach((section, index) => assert.equal(section.start, plan.sections[index].end));
  assert.equal(plan.sections.at(-1).end, 60);
});

test('08 protected proof covers exactly 25 seconds', () => {
  assert.equal(proof.jobs.reduce((sum, job) => sum + job.durationSeconds, 0), 25);
});

test('09 proof and episode caps preserve 4.23 USD', () => {
  assert.equal(proof.stageCap, 7.52);
  assert.equal(budget.allocation.microepisode60SecondsMaximum, 16.44);
  assert.equal(budget.allocation.protectedReserve, 4.23);
  assert.equal(Number((16.44 + 4.23).toFixed(2)), 20.67);
});

test('10 exact quote preflight accepts a safe purchase', () => {
  const result = validateBudgetPreflight({ liveBalance: 20.67, exactQuote: 2.25, maximumPerGeneration: 2.25, spentInStage: 0, stageCap: 7.52, protectedReserve: 4.23 });
  assert.equal(result.approved, true);
  assert.equal(result.balanceAfterMaximum, 18.42);
});

test('11 preflight rejects a purchase that breaches reserve', () => {
  assert.throws(() => validateBudgetPreflight({ liveBalance: 5, exactQuote: 1, maximumPerGeneration: 2.25, spentInStage: 0, stageCap: 7.52, protectedReserve: 4.23 }), /reserva/);
});

test('12 one active request blocks another purchase', () => {
  assert.throws(() => assertSingleActiveRequest([{ requestId: 'req-1', status: 'processing' }]), /req-1/);
  assert.equal(assertSingleActiveRequest([{ requestId: 'req-1', status: 'completed' }]), true);
});

test('13 failed and cancelled states stop polling immediately', () => {
  for (const status of ['failed', 'error', 'cancelled', 'canceled']) {
    assert.equal(classifyMuapiStatus(status), 'failure');
    assert.equal(shouldContinuePolling(status), false);
  }
});

test('14 terminal receipt requires request_id and terminal status', () => {
  const receipt = buildMuapiReceipt({ requestId: 'req-2', jobId: 'PT01', model: 'seedance-v2.0-i2v', quotedCost: 2.25, actualCost: 2.1, balanceAfter: 18.57, status: 'completed' });
  assert.equal(receipt.terminal, true);
  assert.throws(() => buildMuapiReceipt({ status: 'processing' }), /request_id/);
});

test('15 tools and YouTube stay inside protected authority', () => {
  assert.equal(tools.caveman.mode, 'lite');
  assert.equal(tools.caveman.forbiddenCommands.includes('compress'), true);
  assert.equal(tools.graphify.mayRedefineCanon, false);
  assert.equal(youtube.uploadDefaults.privacyStatus, 'private');
  assert.equal(youtube.uploadDefaults.madeForKids, true);
  assert.equal(youtube.uploadDefaults.containsSyntheticMedia, true);
  assert.equal(youtube.requiredChecks.includes('Yariel-approved-final-master'), true);
});
