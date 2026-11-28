export function canAccessProjectChatWithPermissions(input: {
  canReadAll: boolean;
  canReadAssigned: boolean;
  canReadOwn: boolean;
  isAssigned: boolean;
  isOwner: boolean;
}): boolean {
  return input.canReadAll ||
    (input.canReadAssigned && input.isAssigned) ||
    (input.canReadOwn && input.isOwner);
}
