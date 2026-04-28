export function logSubscriptionChange(event: {
  actorEmail: string;
  targetUserId: string;
  oldTier: string;
  newTier: string;
}): void {
  console.log(
    JSON.stringify({
      event: "admin.subscription_change",
      actor_email: event.actorEmail,
      target_user_id: event.targetUserId,
      old_tier: event.oldTier,
      new_tier: event.newTier,
      timestamp: new Date().toISOString(),
    }),
  );
}
