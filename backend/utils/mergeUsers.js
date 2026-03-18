const {
  User,
  Transaction,
  Category,
  Budget,
  ImportExportLog,
  NotificationCount,
  LineLoginSession,
} = require('../models');

async function mergeUsers({
  fromUserId,
  toUserId,
  deleteSource = false,
} = {}) {
  if (!fromUserId || !toUserId) {
    throw new Error('mergeUsers requires fromUserId and toUserId');
  }
  if (String(fromUserId) === String(toUserId)) {
    throw new Error('fromUserId and toUserId are the same');
  }

  const from = await User.findById(fromUserId);
  const to = await User.findById(toUserId);
  if (!from) throw new Error(`fromUserId not found: ${fromUserId}`);
  if (!to) throw new Error(`toUserId not found: ${toUserId}`);

  // 1) Categories: merge by (name,type)
  const fromCats = await Category.find({ userId: from._id }).lean();
  const catIdMap = new Map(); // old -> new
  for (const c of fromCats) {
    const name = String(c?.name || '').trim();
    const type = String(c?.type || '').trim();
    if (!name || !type) continue;

    const existing = await Category.findOne({ userId: to._id, name, type });
    if (existing) {
      catIdMap.set(String(c._id), String(existing._id));
      continue;
    }
    try {
      const created = await Category.create({
        userId: to._id,
        name,
        type,
        icon: c?.icon || '🌐',
        isDefault: Boolean(c?.isDefault),
      });
      catIdMap.set(String(c._id), String(created._id));
    } catch (e) {
      const fallback = await Category.findOne({ userId: to._id, name, type });
      if (fallback) catIdMap.set(String(c._id), String(fallback._id));
    }
  }

  // 2) Budgets: move and remap category ids (best-effort)
  const fromBuds = await Budget.find({ userId: from._id }).lean();
  for (const b of fromBuds) {
    const month = b?.month || null;
    const oldCatId = (b?.category && typeof b.category === 'object')
      ? (b.category?._id || null)
      : (b?.category || b?.categoryId || null);
    const mappedCatId = oldCatId ? (catIdMap.get(String(oldCatId)) || String(oldCatId)) : null;
    const parsed = Number(b?.total ?? b?.amount ?? 0) || 0;

    const update = { userId: to._id };
    if (mappedCatId) {
      update.category = mappedCatId;
      update.categoryId = mappedCatId;
    }

    try {
      await Budget.updateOne({ _id: b._id }, { $set: update });
    } catch (e) {
      // Handle unique constraint on (userId, month, category)
      if (e && e.code === 11000 && month && mappedCatId) {
        const existing = await Budget.findOne({ userId: to._id, month, category: mappedCatId });
        if (existing) {
          const existingTotal = Number(existing.total ?? existing.amount ?? 0) || 0;
          if (existingTotal === 0 && parsed > 0) {
            existing.total = parsed;
            await existing.save();
          }
          await Budget.deleteOne({ _id: b._id }).catch(() => {});
          continue;
        }
      }
      throw e;
    }
  }

  // 3) Transactions: move ownership and remap categoryId
  const txMoveResult = await Transaction.updateMany({ userId: from._id }, { $set: { userId: to._id } });
  for (const [oldId, newId] of catIdMap.entries()) {
    await Transaction.updateMany(
      { userId: to._id, categoryId: oldId },
      { $set: { categoryId: newId } }
    );
  }

  // 4) Logs / counters / sessions: move ownership (best-effort)
  await ImportExportLog.updateMany({ userId: from._id }, { $set: { userId: to._id } }).catch(() => {});
  await LineLoginSession.updateMany({ userId: from._id }, { $set: { userId: to._id } }).catch(() => {});

  const otherNotif = await NotificationCount.findOne({ userId: from._id }).catch(() => null);
  if (otherNotif) {
    const currNotif = await NotificationCount.findOne({ userId: to._id }).catch(() => null);
    if (!currNotif) {
      otherNotif.userId = to._id;
      await otherNotif.save();
    } else {
      await NotificationCount.deleteOne({ _id: otherNotif._id }).catch(() => {});
    }
  }

  // 5) Transfer identifiers (avoid unique collisions by unsetting from first)
  const fromLineMessagingUserId = String(from.lineMessagingUserId || '').trim();
  const toLineMessagingUserId = String(to.lineMessagingUserId || '').trim();
  if (fromLineMessagingUserId && !toLineMessagingUserId) {
    from.lineMessagingUserId = undefined;
    await from.save().catch(() => {});
    to.lineMessagingUserId = fromLineMessagingUserId;
  }

  const fromLineUserId = String(from.lineUserId || '').trim();
  const toLineUserId = String(to.lineUserId || '').trim();
  if (fromLineUserId && !toLineUserId) {
    from.lineUserId = undefined;
    await from.save().catch(() => {});
    to.lineUserId = fromLineUserId;
  }

  // Prefer non-placeholder info if target is empty.
  if (!to.name && from.name) to.name = from.name;
  if (!to.profilePic && from.profilePic) to.profilePic = from.profilePic;
  if (!to.timezone && from.timezone) to.timezone = from.timezone;
  if ((!to.email || String(to.email).endsWith('@line.local')) && from.email && !String(from.email).endsWith('@local')) {
    to.email = from.email;
  }

  await to.save();

  if (deleteSource) {
    await User.deleteOne({ _id: from._id }).catch(() => {});
  }

  return {
    fromUserId: String(from._id),
    toUserId: String(to._id),
    movedTransactions: Number(txMoveResult?.modifiedCount ?? txMoveResult?.nModified ?? 0) || 0,
    deleteSource: Boolean(deleteSource),
  };
}

module.exports = { mergeUsers };

