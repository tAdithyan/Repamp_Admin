export function normalizeAgentRole(role) {
  const value = typeof role === 'object' && role ? role.roleId || role.name : role;
  return { Cordinator: 'ROL_3', CollectionAgent: 'ROL_4' }[value] || value;
}
