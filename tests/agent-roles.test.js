import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAgentRole } from '../src/pages/AgentDetails/roles.js';
test('role filters recognize supported names, IDs and populated roles', () => {
  for (const value of ['ROL_4', 'CollectionAgent', {name:'CollectionAgent'}, {roleId:'ROL_4'}]) assert.equal(normalizeAgentRole(value), 'ROL_4');
  for (const value of ['ROL_3', 'Cordinator']) assert.equal(normalizeAgentRole(value), 'ROL_3');
  assert.equal(normalizeAgentRole(undefined), undefined);
});
