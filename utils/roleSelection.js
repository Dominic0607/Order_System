export function getRoleTransitionCleanup(nextRole) {
  const shouldResetRoleScopedState = !['user_journey', 'create_order', 'confirm_delivery'].includes(nextRole);

  return {
    clearSelectedTeam: shouldResetRoleScopedState,
    clearSelectedMovieId: shouldResetRoleScopedState,
    clearPreviewImage: shouldResetRoleScopedState,
    clearMobilePageTitle: shouldResetRoleScopedState,
  };
}
