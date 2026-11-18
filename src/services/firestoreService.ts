import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { computeDefaultCategoryCaps } from '../constants';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  BillSplit,
  CategoryBudget,
  Expense,
  ExpenseCategory,
  Friend,
  LivingSetup,
  PaymentMethod,
  SplitShare,
  UserProfile,
} from '../types';
import { getLocalDateKey } from '../utils/format';

function generateDocId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${randomPart}`;
}

function clampString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

function sanitizeAmount(value: number, min = 0): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(10000000, Math.max(min, Math.round(value * 100) / 100));
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const d = snap.data();
      onData({
        uid: String(d.uid ?? uid),
        name: String(d.name ?? 'Student'),
        email: String(d.email ?? ''),
        campusCity: String(d.campusCity ?? 'Dehradun'),
        livingSetup: (d.livingSetup as LivingSetup) || 'Hostel / PG',
        monthlyAllowanceInr: Number(d.monthlyAllowanceInr ?? 8000),
        alertThresholdPercent: Number(d.alertThresholdPercent ?? 80),
        onboardingCompleted: Boolean(d.onboardingCompleted),
        proTrialActive: Boolean(d.proTrialActive),
        proTrialStartedAtMillis:
          typeof d.proTrialStartedAtMillis === 'number' ? d.proTrialStartedAtMillis : undefined,
        streakDays: typeof d.streakDays === 'number' ? d.streakDays : 1,
        lastCheckInDate: typeof d.lastCheckInDate === 'string' ? d.lastCheckInDate : undefined,
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (formattedErr) {
        if (onError) onError(formattedErr);
        else throw formattedErr;
      }
    },
  );
}

export function subscribeExpenses(
  uid: string,
  onData: (expenses: Expense[]) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const path = `users/${uid}/expenses`;
  const q = query(collection(db, 'users', uid, 'expenses'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items: Expense[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          ownerId: String(d.ownerId ?? uid),
          title: String(d.title ?? 'Expense'),
          amountInr: Number(d.amountInr ?? 0),
          category: (d.category as ExpenseCategory) || 'Other',
          paymentMethod: (d.paymentMethod as PaymentMethod) || 'UPI',
          note: String(d.note ?? ''),
          timestampMillis: Number(d.timestampMillis ?? Date.now()),
          splitId: typeof d.splitId === 'string' && d.splitId.length > 0 ? d.splitId : undefined,
        };
      });
      items.sort((a, b) => b.timestampMillis - a.timestampMillis);
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (formattedErr) {
        if (onError) onError(formattedErr);
        else throw formattedErr;
      }
    },
  );
}

export function subscribeCategoryBudgets(
  uid: string,
  onData: (budgets: CategoryBudget[]) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const path = `users/${uid}/categoryBudgets`;
  const q = query(collection(db, 'users', uid, 'categoryBudgets'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items: CategoryBudget[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          ownerId: String(d.ownerId ?? uid),
          category: (d.category as ExpenseCategory) || 'Other',
          limitInr: Number(d.limitInr ?? 0),
        };
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (formattedErr) {
        if (onError) onError(formattedErr);
        else throw formattedErr;
      }
    },
  );
}

export function subscribeFriends(
  uid: string,
  onData: (friends: Friend[]) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const path = `users/${uid}/friends`;
  const q = query(collection(db, 'users', uid, 'friends'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items: Friend[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          ownerId: String(d.ownerId ?? uid),
          name: String(d.name ?? ''),
          hostelOrTag: String(d.hostelOrTag ?? ''),
          upiHandle:
            typeof d.upiHandle === 'string' && d.upiHandle.length > 0 ? d.upiHandle : undefined,
        };
      });
      items.sort((a, b) => a.name.localeCompare(b.name));
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (formattedErr) {
        if (onError) onError(formattedErr);
        else throw formattedErr;
      }
    },
  );
}

export function subscribeSplits(
  uid: string,
  onData: (splits: BillSplit[]) => void,
  onError?: (err: unknown) => void,
): Unsubscribe {
  const path = `users/${uid}/splits`;
  const q = query(collection(db, 'users', uid, 'splits'), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items: BillSplit[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        const rawShares = Array.isArray(d.shares) ? d.shares : [];
        return {
          id: docSnap.id,
          ownerId: String(d.ownerId ?? uid),
          title: String(d.title ?? 'Shared Bill'),
          totalAmountInr: Number(d.totalAmountInr ?? 0),
          paidBy: d.paidBy === 'FRIEND' ? 'FRIEND' : 'ME',
          payerFriendId:
            typeof d.payerFriendId === 'string' && d.payerFriendId.length > 0
              ? d.payerFriendId
              : undefined,
          payerName: String(d.payerName ?? 'You'),
          includeMyShare: Boolean(d.includeMyShare),
          myShareInr: Number(d.myShareInr ?? 0),
          linkedExpenseId:
            typeof d.linkedExpenseId === 'string' && d.linkedExpenseId.length > 0
              ? d.linkedExpenseId
              : undefined,
          shares: rawShares.map((s: Record<string, unknown>) => ({
            friendId: String(s.friendId ?? ''),
            friendName: String(s.friendName ?? ''),
            amountInr: Number(s.amountInr ?? 0),
            settled: Boolean(s.settled),
          })),
          timestampMillis: Number(d.timestampMillis ?? Date.now()),
        };
      });
      items.sort((a, b) => b.timestampMillis - a.timestampMillis);
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (formattedErr) {
        if (onError) onError(formattedErr);
        else throw formattedErr;
      }
    },
  );
}

export async function completeOnboarding(
  uid: string,
  input: {
    name: string;
    email: string;
    campusCity: string;
    livingSetup: LivingSetup;
    monthlyAllowanceInr: number;
    alertThresholdPercent: number;
  },
): Promise<void> {
  const userPath = `users/${uid}`;
  const allowance = sanitizeAmount(input.monthlyAllowanceInr, 500);
  const threshold = Math.min(95, Math.max(60, Math.round(input.alertThresholdPercent)));
  const todayKey = getLocalDateKey();

  try {
    await setDoc(doc(db, 'users', uid), {
      uid,
      name: clampString(input.name || 'Student', 80) || 'Student',
      email: clampString(input.email || '', 120),
      campusCity: clampString(input.campusCity || 'Dehradun', 80) || 'Dehradun',
      livingSetup: input.livingSetup,
      monthlyAllowanceInr: allowance,
      alertThresholdPercent: threshold,
      onboardingCompleted: true,
      proTrialActive: false,
      streakDays: 1,
      lastCheckInDate: todayKey,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, userPath);
  }

  const caps = computeDefaultCategoryCaps(allowance);
  const budgetsPath = `users/${uid}/categoryBudgets`;
  try {
    const batch = writeBatch(db);
    for (const cap of caps) {
      const ref = doc(db, 'users', uid, 'categoryBudgets', cap.id);
      batch.set(ref, {
        ownerId: uid,
        category: cap.category,
        limitInr: cap.limitInr,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, budgetsPath);
  }
}

export async function updateProfileSettings(
  uid: string,
  updates: Partial<{
    name: string;
    campusCity: string;
    livingSetup: LivingSetup;
    monthlyAllowanceInr: number;
    alertThresholdPercent: number;
  }>,
): Promise<void> {
  const path = `users/${uid}`;
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (updates.name !== undefined) {
    payload.name = clampString(updates.name, 80) || 'Student';
  }
  if (updates.campusCity !== undefined) {
    payload.campusCity = clampString(updates.campusCity, 80) || 'Dehradun';
  }
  if (updates.livingSetup !== undefined) {
    payload.livingSetup = updates.livingSetup;
  }
  if (updates.monthlyAllowanceInr !== undefined) {
    payload.monthlyAllowanceInr = sanitizeAmount(updates.monthlyAllowanceInr, 500);
  }
  if (updates.alertThresholdPercent !== undefined) {
    payload.alertThresholdPercent = Math.min(95, Math.max(60, Math.round(updates.alertThresholdPercent)));
  }

  try {
    await updateDoc(doc(db, 'users', uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleProTrial(uid: string, active: boolean): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      proTrialActive: active,
      proTrialStartedAtMillis: active ? Date.now() : 0,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function checkInStreak(uid: string, currentStreak: number, lastCheckInDate?: string): Promise<boolean> {
  const todayKey = getLocalDateKey();
  if (lastCheckInDate === todayKey) {
    return false;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday);

  const nextStreak = lastCheckInDate === yesterdayKey ? Math.min(366, currentStreak + 1) : 1;
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      streakDays: nextStreak,
      lastCheckInDate: todayKey,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function createExpense(
  uid: string,
  input: {
    title: string;
    amountInr: number;
    category: ExpenseCategory;
    paymentMethod: PaymentMethod;
    note?: string;
    timestampMillis?: number;
    splitId?: string;
  },
): Promise<string> {
  const id = generateDocId('exp');
  const path = `users/${uid}/expenses/${id}`;
  const payload: Record<string, unknown> = {
    ownerId: uid,
    title: clampString(input.title, 120) || 'Expense',
    amountInr: sanitizeAmount(input.amountInr, 1),
    category: input.category,
    paymentMethod: input.paymentMethod,
    note: clampString(input.note || '', 300),
    timestampMillis: input.timestampMillis ?? Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (input.splitId) {
    payload.splitId = clampString(input.splitId, 128);
  }

  try {
    await setDoc(doc(db, 'users', uid, 'expenses', id), payload);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateExpense(
  uid: string,
  expenseId: string,
  input: {
    title: string;
    amountInr: number;
    category: ExpenseCategory;
    paymentMethod: PaymentMethod;
    note: string;
    timestampMillis: number;
  },
): Promise<void> {
  const path = `users/${uid}/expenses/${expenseId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'expenses', expenseId), {
      title: clampString(input.title, 120) || 'Expense',
      amountInr: sanitizeAmount(input.amountInr, 1),
      category: input.category,
      paymentMethod: input.paymentMethod,
      note: clampString(input.note || '', 300),
      timestampMillis: input.timestampMillis,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeExpense(uid: string, expenseId: string): Promise<void> {
  const path = `users/${uid}/expenses/${expenseId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'expenses', expenseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function updateCategoryCap(
  uid: string,
  categoryId: string,
  categoryName: ExpenseCategory,
  limitInr: number,
  existsAlready: boolean,
): Promise<void> {
  const path = `users/${uid}/categoryBudgets/${categoryId}`;
  const cleanLimit = sanitizeAmount(limitInr, 0);
  try {
    if (existsAlready) {
      await updateDoc(doc(db, 'users', uid, 'categoryBudgets', categoryId), {
        limitInr: cleanLimit,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'users', uid, 'categoryBudgets', categoryId), {
        ownerId: uid,
        category: categoryName,
        limitInr: cleanLimit,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function addFriend(
  uid: string,
  input: { name: string; hostelOrTag: string; upiHandle?: string },
): Promise<string> {
  const id = generateDocId('frd');
  const path = `users/${uid}/friends/${id}`;
  const payload: Record<string, unknown> = {
    ownerId: uid,
    name: clampString(input.name, 80),
    hostelOrTag: clampString(input.hostelOrTag || 'Hostel Mate', 80),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (input.upiHandle && input.upiHandle.trim().length > 0) {
    payload.upiHandle = clampString(input.upiHandle, 80);
  }

  try {
    await setDoc(doc(db, 'users', uid, 'friends', id), payload);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function createBillSplit(
  uid: string,
  input: {
    title: string;
    totalAmountInr: number;
    paidBy: 'ME' | 'FRIEND';
    payerFriendId?: string;
    payerName: string;
    includeMyShare: boolean;
    myShareInr: number;
    shares: SplitShare[];
    alsoLogExpense: boolean;
  },
): Promise<void> {
  const splitId = generateDocId('spl');
  const path = `users/${uid}/splits/${splitId}`;
  const now = Date.now();
  let linkedExpenseId: string | undefined;

  if (input.alsoLogExpense && input.myShareInr > 0) {
    linkedExpenseId = await createExpense(uid, {
      title: `${clampString(input.title, 90)} (My Split Share)`,
      amountInr: sanitizeAmount(input.myShareInr, 1),
      category: 'Shared Hangout',
      paymentMethod: 'UPI',
      note:
        input.paidBy === 'ME'
          ? `Paid total ${input.totalAmountInr}, split with ${input.shares.length} friend(s)`
          : `Split paid by ${input.payerName}`,
      timestampMillis: now,
      splitId,
    });
  }

  const cleanShares = input.shares.slice(0, 30).map((s) => ({
    friendId: clampString(s.friendId, 128),
    friendName: clampString(s.friendName, 80),
    amountInr: sanitizeAmount(s.amountInr, 0),
    settled: Boolean(s.settled),
  }));

  const payload: Record<string, unknown> = {
    ownerId: uid,
    title: clampString(input.title, 120) || 'Shared Bill',
    totalAmountInr: sanitizeAmount(input.totalAmountInr, 1),
    paidBy: input.paidBy,
    payerName: clampString(input.payerName, 80) || 'You',
    includeMyShare: input.includeMyShare,
    myShareInr: sanitizeAmount(input.myShareInr, 0),
    shares: cleanShares,
    timestampMillis: now,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (input.payerFriendId) {
    payload.payerFriendId = clampString(input.payerFriendId, 128);
  }
  if (linkedExpenseId) {
    payload.linkedExpenseId = linkedExpenseId;
  }

  try {
    await setDoc(doc(db, 'users', uid, 'splits', splitId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleSplitShareSettled(
  uid: string,
  splitId: string,
  shares: SplitShare[],
  targetFriendId: string,
): Promise<void> {
  const path = `users/${uid}/splits/${splitId}`;
  const updatedShares = shares.map((s) =>
    s.friendId === targetFriendId
      ? {
          friendId: s.friendId,
          friendName: s.friendName,
          amountInr: s.amountInr,
          settled: !s.settled,
        }
      : {
          friendId: s.friendId,
          friendName: s.friendName,
          amountInr: s.amountInr,
          settled: s.settled,
        },
  );

  try {
    await updateDoc(doc(db, 'users', uid, 'splits', splitId), {
      shares: updatedShares,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function removeSplit(uid: string, splitId: string): Promise<void> {
  const path = `users/${uid}/splits/${splitId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'splits', splitId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
