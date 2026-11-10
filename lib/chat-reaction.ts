export function getNextChatReaction(currentEmoji: string | null, selectedEmoji: string) {
  return currentEmoji === selectedEmoji ? null : selectedEmoji;
}
