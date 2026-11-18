import React, { useMemo, useState } from 'react';
import { Check, Plus, Trash2, UserPlus, Users, X } from 'lucide-react';
import {
  addFriend,
  createBillSplit,
  removeSplit,
  toggleSplitShareSettled,
} from '../services/firestoreService';
import type { BillSplit, Friend, SplitShare } from '../types';
import { formatDateTimeShort, formatInr } from '../utils/format';
import { EmptySplitsIllustration } from './Illustrations';

interface SplitsViewProps {
  uid: string;
  friends: Friend[];
  splits: BillSplit[];
  onToast: (message: string) => void;
}

export function SplitsView({ uid, friends, splits, onToast }: SplitsViewProps) {
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [friendTag, setFriendTag] = useState('');
  const [friendUpi, setFriendUpi] = useState('');
  const [savingFriend, setSavingFriend] = useState(false);
  const [friendError, setFriendError] = useState<string | null>(null);

  const [showSplitModal, setShowSplitModal] = useState(false);
  const [billTitle, setBillTitle] = useState('');
  const [billAmountText, setBillAmountText] = useState('');
  const [paidBy, setPaidBy] = useState<'ME' | 'FRIEND'>('ME');
  const [payerFriendId, setPayerFriendId] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [includeMyShare, setIncludeMyShare] = useState(true);
  const [alsoLogExpense, setAlsoLogExpense] = useState(true);
  const [savingSplit, setSavingSplit] = useState(false);
  const [splitError, setSplitError] = useState<string | null>(null);

  const [confirmDeleteSplitId, setConfirmDeleteSplitId] = useState<string | null>(null);

  const { owedToYou, youOwe, friendBalances } = useMemo(() => {
    let receivable = 0;
    let payable = 0;
    const map = new Map<string, number>();

    for (const f of friends) {
      map.set(f.id, 0);
    }

    for (const split of splits) {
      if (split.paidBy === 'ME') {
        for (const s of split.shares) {
          if (!s.settled) {
            receivable += s.amountInr;
            map.set(s.friendId, (map.get(s.friendId) ?? 0) + s.amountInr);
          }
        }
      } else if (split.payerFriendId) {
        const payerEntry = split.shares.find((s) => s.friendId === split.payerFriendId);
        const settled = payerEntry ? payerEntry.settled : split.shares.every((s) => s.settled);
        if (!settled && split.myShareInr > 0) {
          payable += split.myShareInr;
          map.set(
            split.payerFriendId,
            (map.get(split.payerFriendId) ?? 0) - split.myShareInr,
          );
        }
      }
    }

    return { owedToYou: receivable, youOwe: payable, friendBalances: map };
  }, [friends, splits]);

  const parsedTotal = Number(billAmountText);
  const effectiveSelectedIds = useMemo(() => {
    if (paidBy === 'FRIEND' && payerFriendId && !selectedFriendIds.includes(payerFriendId)) {
      return [payerFriendId, ...selectedFriendIds];
    }
    return selectedFriendIds;
  }, [paidBy, payerFriendId, selectedFriendIds]);

  const participantCount = effectiveSelectedIds.length + (includeMyShare ? 1 : 0);
  const perPersonShare =
    Number.isFinite(parsedTotal) && parsedTotal > 0 && participantCount > 0
      ? Math.round((parsedTotal / participantCount) * 100) / 100
      : 0;

  const handleCreateFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendName.trim()) {
      setFriendError('Enter your friend’s name.');
      return;
    }
    setSavingFriend(true);
    setFriendError(null);
    try {
      await addFriend(uid, {
        name: friendName.trim(),
        hostelOrTag: friendTag.trim() || 'Hostel Mate',
        upiHandle: friendUpi.trim(),
      });
      onToast(`Added ${friendName.trim()} to friends`);
      setFriendName('');
      setFriendTag('');
      setFriendUpi('');
      setShowAddFriend(false);
    } catch (err) {
      setFriendError(err instanceof Error ? err.message : 'Unable to add friend.');
    } finally {
      setSavingFriend(false);
    }
  };

  const openSplitModal = () => {
    setBillTitle('');
    setBillAmountText('');
    setPaidBy('ME');
    setPayerFriendId(friends[0]?.id ?? '');
    setSelectedFriendIds(friends.length > 0 ? [friends[0].id] : []);
    setIncludeMyShare(true);
    setAlsoLogExpense(true);
    setSplitError(null);
    setShowSplitModal(true);
  };

  const toggleFriendSelection = (id: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleCreateSplit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billTitle.trim()) {
      setSplitError('Enter a bill title.');
      return;
    }
    if (!Number.isFinite(parsedTotal) || parsedTotal <= 0) {
      setSplitError('Enter a valid total bill amount greater than ₹0.');
      return;
    }
    if (effectiveSelectedIds.length === 0) {
      setSplitError('Select at least one friend to split with.');
      return;
    }
    if (paidBy === 'FRIEND' && !payerFriendId) {
      setSplitError('Select which friend paid the bill.');
      return;
    }

    const myShare = includeMyShare ? perPersonShare : 0;
    let shares: SplitShare[] = [];
    let payerName = 'You';

    if (paidBy === 'ME') {
      shares = effectiveSelectedIds.map((fid) => {
        const f = friends.find((item) => item.id === fid);
        return {
          friendId: fid,
          friendName: f?.name ?? 'Friend',
          amountInr: perPersonShare,
          settled: false,
        };
      });
    } else {
      const payer = friends.find((f) => f.id === payerFriendId);
      payerName = payer?.name ?? 'Friend';
      shares = [
        {
          friendId: payerFriendId,
          friendName: payerName,
          amountInr: myShare,
          settled: myShare <= 0,
        },
      ];
    }

    setSavingSplit(true);
    setSplitError(null);
    try {
      await createBillSplit(uid, {
        title: billTitle.trim(),
        totalAmountInr: parsedTotal,
        paidBy,
        payerFriendId: paidBy === 'FRIEND' ? payerFriendId : undefined,
        payerName,
        includeMyShare,
        myShareInr: myShare,
        shares,
        alsoLogExpense: alsoLogExpense && includeMyShare && myShare > 0,
      });
      onToast(`Split "${billTitle.trim()}" saved`);
      setShowSplitModal(false);
    } catch (err) {
      setSplitError(err instanceof Error ? err.message : 'Unable to save split.');
    } finally {
      setSavingSplit(false);
    }
  };

  const handleToggleSettled = async (split: BillSplit, friendId: string) => {
    await toggleSplitShareSettled(uid, split.id, split.shares, friendId);
    onToast('Settlement status updated');
  };

  const handleDeleteSplit = async (splitId: string) => {
    await removeSplit(uid, splitId);
    setConfirmDeleteSplitId(null);
    onToast('Split removed');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Hostel & Friend Splits
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Split mess bills, auto rides, and group outings with roommates
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setFriendError(null);
              setShowAddFriend(true);
            }}
            className="min-h-[42px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-teal-700" />
            <span>Add Friend</span>
          </button>
          <button
            type="button"
            onClick={openSplitModal}
            className="min-h-[42px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Split a Shared Bill</span>
          </button>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <p className="text-xs font-semibold text-emerald-800">Owed to You</p>
          <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-emerald-700 tabular-currency">
            {formatInr(owedToYou)}
          </p>
          <p className="mt-1 text-xs text-emerald-800/80">
            Pending reimbursements from bills you paid
          </p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5">
          <p className="text-xs font-semibold text-rose-800">You Owe</p>
          <p className="mt-1.5 text-2xl sm:text-3xl font-bold text-rose-600 tabular-currency">
            {formatInr(youOwe)}
          </p>
          <p className="mt-1 text-xs text-rose-800/80">
            Your unsettled share from friend-paid bills
          </p>
        </div>
      </div>

      {/* Horizontal Friend Balance Strip */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-sm font-bold text-slate-900">Friends & Balances</h2>
          <span className="text-xs text-slate-500 tabular-currency">
            {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
          </span>
        </div>

        {friends.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-4 py-2">
            <p className="text-xs text-slate-500">
              Add your hostel roommates or college friends to start splitting bills.
            </p>
            <button
              type="button"
              onClick={() => setShowAddFriend(true)}
              className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-800 cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add First Friend</span>
            </button>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {friends.map((friend) => {
              const net = friendBalances.get(friend.id) ?? 0;
              return (
                <div
                  key={friend.id}
                  className="shrink-0 min-w-[175px] rounded-xl border border-slate-200 bg-slate-50/80 p-3.5"
                >
                  <p className="text-sm font-semibold text-slate-900 truncate">{friend.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {friend.hostelOrTag || 'Hostel Mate'}
                    {friend.upiHandle ? ` · ${friend.upiHandle}` : ''}
                  </p>
                  <p
                    className={`mt-2 text-xs font-bold tabular-currency ${
                      net > 0
                        ? 'text-emerald-700'
                        : net < 0
                          ? 'text-rose-600'
                          : 'text-slate-500'
                    }`}
                  >
                    {net > 0
                      ? `Owes you ${formatInr(net)}`
                      : net < 0
                        ? `You owe ${formatInr(Math.abs(net))}`
                        : 'All settled'}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Split History Cards or Empty State */}
      {splits.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <EmptySplitsIllustration className="w-full max-w-[300px] h-auto mx-auto" />
          <h2 className="mt-4 text-base font-bold text-slate-900">No shared bills yet</h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            Next time you split a hostel pizza, cab ride, or canteen order, log it here to track
            who owes whom.
          </p>
          <button
            type="button"
            onClick={openSplitModal}
            className="mt-5 min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Split a Shared Bill</span>
          </button>
        </section>
      ) : (
        <section className="space-y-3.5">
          <h2 className="text-sm font-bold text-slate-900">Split History</h2>
          {splits.map((split) => (
            <div
              key={split.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{split.title}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Paid by <span className="font-semibold text-slate-700">{split.payerName}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{formatDateTimeShort(split.timestampMillis)}</span>
                    {split.includeMyShare && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span className="tabular-currency">
                          Your share {formatInr(split.myShareInr)}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-slate-900 tabular-currency">
                    {formatInr(split.totalAmountInr)}
                  </span>

                  {confirmDeleteSplitId === split.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDeleteSplit(split.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSplitId(null)}
                        className="px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteSplitId(split.id)}
                      aria-label={`Delete split ${split.title}`}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
                {split.shares.map((share) => (
                  <div
                    key={share.friendId}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {split.paidBy === 'ME'
                          ? `${share.friendName} owes you`
                          : `You owe ${share.friendName}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold text-slate-900 tabular-currency">
                        {formatInr(share.amountInr)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleSettled(split, share.friendId)}
                        className={`min-h-[36px] min-w-[84px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                          share.settled
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-white hover:bg-teal-50 hover:border-teal-300 text-slate-700'
                        }`}
                      >
                        {share.settled && <Check className="w-3.5 h-3.5" />}
                        <span>{share.settled ? 'Settled' : 'Settle'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-friend-title"
        >
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 id="add-friend-title" className="text-base font-bold text-slate-900">
                Add Hostel / Campus Friend
              </h2>
              <button
                type="button"
                onClick={() => setShowAddFriend(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFriend} className="p-5 space-y-4">
              {friendError && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700">
                  {friendError}
                </div>
              )}

              <div>
                <label
                  htmlFor="fr-name"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Friend&apos;s Name
                </label>
                <input
                  id="fr-name"
                  type="text"
                  required
                  maxLength={80}
                  autoFocus
                  value={friendName}
                  onChange={(e) => setFriendName(e.target.value)}
                  placeholder="e.g., Rohan Verma"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label
                  htmlFor="fr-tag"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Room / Group Tag
                </label>
                <input
                  id="fr-tag"
                  type="text"
                  maxLength={80}
                  value={friendTag}
                  onChange={(e) => setFriendTag(e.target.value)}
                  placeholder="e.g., Block B · Room 204"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label
                  htmlFor="fr-upi"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  UPI ID (Optional)
                </label>
                <input
                  id="fr-upi"
                  type="text"
                  maxLength={80}
                  value={friendUpi}
                  onChange={(e) => setFriendUpi(e.target.value)}
                  placeholder="e.g., rohan@okaxis"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddFriend(false)}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFriend}
                  className="min-h-[42px] px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
                >
                  {savingFriend ? 'Adding...' : 'Add Friend'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Split a Shared Bill Modal */}
      {showSplitModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="split-bill-title"
        >
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 id="split-bill-title" className="text-base font-bold text-slate-900">
                Split a Shared Bill
              </h2>
              <button
                type="button"
                onClick={() => setShowSplitModal(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {friends.length === 0 ? (
              <div className="p-6 text-center space-y-3">
                <Users className="w-8 h-8 text-teal-700 mx-auto" />
                <p className="text-sm font-semibold text-slate-900">Add a friend first</p>
                <p className="text-xs text-slate-500">
                  You need at least one friend in your list to split a shared bill.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowSplitModal(false);
                    setShowAddFriend(true);
                  }}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Add Friend Now
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateSplit} className="p-5 space-y-5">
                {splitError && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700">
                    {splitError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="sp-title"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Bill Title
                    </label>
                    <input
                      id="sp-title"
                      type="text"
                      required
                      maxLength={120}
                      value={billTitle}
                      onChange={(e) => setBillTitle(e.target.value)}
                      placeholder="e.g., Night Canteen Maggi"
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="sp-amount"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Total Bill (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500 tabular-currency">
                        ₹
                      </span>
                      <input
                        id="sp-amount"
                        type="number"
                        step="any"
                        min={1}
                        max={10000000}
                        required
                        value={billAmountText}
                        onChange={(e) => setBillAmountText(e.target.value)}
                        placeholder="0"
                        className="w-full min-h-[44px] pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 tabular-currency focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-700 mb-1.5">Paid By</span>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPaidBy('ME')}
                      className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        paidBy === 'ME'
                          ? 'bg-white text-teal-800 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      You Paid
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaidBy('FRIEND');
                        if (!payerFriendId && friends[0]) setPayerFriendId(friends[0].id);
                        setIncludeMyShare(true);
                      }}
                      className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        paidBy === 'FRIEND'
                          ? 'bg-white text-teal-800 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Friend Paid
                    </button>
                  </div>

                  {paidBy === 'FRIEND' && (
                    <div className="mt-3">
                      <label
                        htmlFor="sp-payer"
                        className="block text-xs font-medium text-slate-600 mb-1"
                      >
                        Select Payer
                      </label>
                      <select
                        id="sp-payer"
                        value={payerFriendId}
                        onChange={(e) => setPayerFriendId(e.target.value)}
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
                      >
                        {friends.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name} ({f.hostelOrTag || 'Friend'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <span className="block text-xs font-semibold text-slate-700 mb-2">
                    Split With Friends
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {friends.map((f) => {
                      const selected = effectiveSelectedIds.includes(f.id);
                      const lockedAsPayer = paidBy === 'FRIEND' && payerFriendId === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          disabled={lockedAsPayer}
                          onClick={() => toggleFriendSelection(f.id)}
                          className={`min-h-[38px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                            selected
                              ? 'border-teal-700 bg-teal-50 text-teal-900 font-semibold'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {selected && <Check className="w-3.5 h-3.5 text-teal-700" />}
                          <span>{f.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2.5 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeMyShare}
                      disabled={paidBy === 'FRIEND'}
                      onChange={(e) => setIncludeMyShare(e.target.checked)}
                      className="w-4 h-4 rounded accent-teal-700"
                    />
                    <span>Include my share in equal split</span>
                  </label>

                  {includeMyShare && (
                    <label className="flex items-center gap-2.5 text-xs font-medium text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alsoLogExpense}
                        onChange={(e) => setAlsoLogExpense(e.target.checked)}
                        className="w-4 h-4 rounded accent-teal-700"
                      />
                      <span>Also log my share into monthly expenses</span>
                    </label>
                  )}

                  {perPersonShare > 0 && (
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-slate-600">
                        Equal share ({participantCount} {participantCount === 1 ? 'person' : 'people'})
                      </span>
                      <span className="font-bold text-teal-800 tabular-currency">
                        {formatInr(perPersonShare)} / person
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-1 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowSplitModal(false)}
                    className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingSplit}
                    className="min-h-[42px] px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
                  >
                    {savingSplit ? 'Saving Split...' : 'Save Split'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
