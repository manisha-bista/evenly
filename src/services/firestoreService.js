// src/services/firestoreService.js
import { db, auth } from '../firebase/config';
import {
  doc, getDoc, collection, addDoc, updateDoc, deleteDoc,
  arrayUnion, arrayRemove,
  serverTimestamp, query, where, orderBy, limit, getDocs, Timestamp, documentId,
  writeBatch, onSnapshot // Added onSnapshot for notifications
} from 'firebase/firestore';

console.log("firestoreService.js: (V1.0 Release Candidate - All Features) Module Loaded.");

// --- USER RELATED ---
export const searchUsersByUsername = async (usernameQuery) => {
  if (!usernameQuery || usernameQuery.trim().length < 3) return [];
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("username", ">=", usernameQuery.trim()), where("username", "<=", usernameQuery.trim() + '\uf8ff'), limit(10));
  const snapshot = await getDocs(q);
  const users = [];
  snapshot.forEach(docSnap => { if (docSnap.id !== auth.currentUser?.uid) { users.push({ id: docSnap.id, ...docSnap.data() }); } });
  return users;
};
export const getUserByUsernameOrEmail = async (identifier) => {
  if (!identifier || identifier.trim() === "") return null;
  const trimmedIdentifier = identifier.trim(); const usersRef = collection(db, "users"); let q;
  q = query(usersRef, where("username", "==", trimmedIdentifier), limit(1));
  let snapshot = await getDocs(q);
  if (!snapshot.empty) { const userDoc = snapshot.docs[0]; return { id: userDoc.id, ...userDoc.data() }; }
  if (trimmedIdentifier.includes('@')) {
    q = query(usersRef, where("email", "==", trimmedIdentifier), limit(1));
    snapshot = await getDocs(q);
    if (!snapshot.empty) { const userDoc = snapshot.docs[0]; return { id: userDoc.id, ...userDoc.data() }; }
  }
  return null;
};
export const getUsersConnectedViaGroups = async (currentUserId) => {
  if (!currentUserId) return [];
  try {
    const currentUserGroups = await getUserGroups(currentUserId);
    if (currentUserGroups.length === 0) return [];
    const connectedUserUIDs = new Set();
    currentUserGroups.forEach(group => { (group.memberUIDs || []).forEach(uid => { if (uid !== currentUserId) connectedUserUIDs.add(uid); }); });
    if (connectedUserUIDs.size === 0) return [];
    const uidsArray = Array.from(connectedUserUIDs); const connectedUsers = []; const MAX_IN_CLAUSE_ARGS = 30;
    for (let i = 0; i < uidsArray.length; i += MAX_IN_CLAUSE_ARGS) {
        const batchUIDs = uidsArray.slice(i, i + MAX_IN_CLAUSE_ARGS);
        if (batchUIDs.length > 0) {
            const usersRef = collection(db, "users");
            const qUsers = query(usersRef, where(documentId(), "in", batchUIDs));
            const userDocsSnapshot = await getDocs(qUsers);
            userDocsSnapshot.forEach(docSnap => { connectedUsers.push({ id: docSnap.id, ...docSnap.data() }); });
        }
    }
    return connectedUsers.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
  } catch (error) { console.error("firestoreService: Error fetching connected users:", error); throw error; }
};

// --- GROUP RELATED ---
export const createGroup = async (groupName, creatingUser, creatingUserData) => {
    if (!creatingUser?.uid) throw new Error("Auth required."); if (!groupName?.trim()) throw new Error("Group name empty.");
    const groupData = { name: groupName.trim(), createdAt: serverTimestamp(), createdByUID: creatingUser.uid, members: [{ uid: creatingUser.uid, username: creatingUserData.username || creatingUser.displayName || creatingUser.email, role: "admin", joinedAt: new Date() }], memberUIDs: [creatingUser.uid], };
    const docRef = await addDoc(collection(db, "groups"), groupData); return docRef;
};
export const getUserGroups = async (userId) => {
    if (!userId) return []; const q = query(collection(db, "groups"), where("memberUIDs", "array-contains", userId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q); const groups = []; snapshot.forEach(doc => groups.push({ id: doc.id, ...doc.data() })); return groups;
};
export const getGroupDetails = async (groupId) => {
    if (!groupId) throw new Error("Group ID required."); const groupDocRef = doc(db, "groups", groupId);
    const groupDocSnap = await getDoc(groupDocRef); return groupDocSnap.exists() ? { id: groupDocSnap.id, ...groupDocSnap.data() } : null;
};
export const addUserToGroup = async (groupId, userToAdd) => {
    if (!auth.currentUser) throw new Error("Authentication required."); if (!groupId || !userToAdd?.id || !userToAdd?.username) throw new Error("Group ID, User ID, and Username required.");
    const groupRef = doc(db, "groups", groupId); const groupSnap = await getDoc(groupRef); if (!groupSnap.exists()) throw new Error("Group not found.");
    const groupData = groupSnap.data(); if (groupData.memberUIDs?.includes(userToAdd.id)) throw new Error(`${userToAdd.username} is already a member.`);
    await updateDoc(groupRef, { memberUIDs: arrayUnion(userToAdd.id), members: arrayUnion({ uid: userToAdd.id, username: userToAdd.username, role: "member", joinedAt: new Date() }) }); return true;
};
export const updateGroupName = async (groupId, newName) => {
    if (!auth.currentUser) throw new Error("Authentication required."); if (!groupId || !newName || newName.trim() === "") throw new Error("Group ID and new name are required.");
    const groupRef = doc(db, "groups", groupId); await updateDoc(groupRef, { name: newName.trim() });
};
export const removeUserFromGroup = async (groupId, userIdToRemove, currentGroupMembers) => {
    if (!auth.currentUser) throw new Error("Authentication required."); const groupRef = doc(db, "groups", groupId);
    const memberObjectToRemove = currentGroupMembers.find(m => m.uid === userIdToRemove); if (!memberObjectToRemove) throw new Error("Member not found for removal.");
    const adminMembers = currentGroupMembers.filter(m => m.role === 'admin'); if (memberObjectToRemove.role === 'admin' && adminMembers.length <= 1 && currentGroupMembers.length > 1) throw new Error("Cannot remove sole admin if other members exist.");
    const groupSnap = await getDoc(groupRef); if(!groupSnap.exists()) throw new Error("Group does not exist."); const groupData = groupSnap.data();
    if (memberObjectToRemove.role === 'admin' && groupData.createdByUID === userIdToRemove && adminMembers.length <= 1 && groupData.members.length > 1) throw new Error("Creator (sole admin) cannot be removed if others exist.");
    await updateDoc(groupRef, { memberUIDs: arrayRemove(userIdToRemove), members: arrayRemove(memberObjectToRemove) });
};
export const leaveGroup = async (groupId, userIdLeaving, currentGroupData) => {
    if (!auth.currentUser || auth.currentUser.uid !== userIdLeaving) throw new Error("Auth mismatch."); const groupRef = doc(db, "groups", groupId);
    const memberObjectLeaving = currentGroupData.members.find(m => m.uid === userIdLeaving); if (!memberObjectLeaving) throw new Error("Not currently a member.");
    const adminMembers = currentGroupData.members.filter(m => m.role === 'admin'); if (memberObjectLeaving.role === 'admin' && adminMembers.length === 1 && currentGroupData.members.length > 1) throw new Error("Sole admin must assign another admin before leaving.");
    const batch = writeBatch(db); batch.update(groupRef, { memberUIDs: arrayRemove(userIdLeaving), members: arrayRemove(memberObjectLeaving) }); await batch.commit();
};

// --- EXPENSE RELATED ---
const calculateShares = (totalAmount, splitType, formParticipantUIDs, formSplitDetails) => {
  let calculatedData = []; if (!formParticipantUIDs || formParticipantUIDs.length === 0) throw new Error("At least one participant must be involved in the split.");
  if (splitType === 'equally') { const share = totalAmount / formParticipantUIDs.length; calculatedData = formParticipantUIDs.map(uid => ({ uid: uid, shareAmount: parseFloat(share.toFixed(2)) }));
  } else { const relevantDetails = formSplitDetails.filter(d => formParticipantUIDs.includes(d.participantId)); if (relevantDetails.length !== formParticipantUIDs.length && formParticipantUIDs.length > 0) console.warn("calculateShares: Mismatch between selected participants and provided split details.");
    if (splitType === 'exact') { let sum = 0; calculatedData = relevantDetails.map(d => {const amt = parseFloat(d.amount) || 0; sum+=amt; return {uid: d.participantId, shareAmount: amt};}); if (Math.abs(sum - totalAmount) > 0.015) throw new Error(`Exact amounts ($${sum.toFixed(2)}) don't sum to total ($${totalAmount.toFixed(2)}).`);
    } else if (splitType === 'percentage') { let sum = 0; calculatedData = relevantDetails.map(d => {const perc = parseFloat(d.percentage) || 0; sum+=perc; return {uid: d.participantId, shareAmount: parseFloat(((perc/100)*totalAmount).toFixed(2))};}); if (Math.abs(sum - 100) > 0.015 && relevantDetails.length > 0) throw new Error(`Percentages (${sum.toFixed(2)}%) don't sum to 100%.`);
    } else if (splitType === 'shares') { let sum = 0; relevantDetails.forEach(d => {sum += (parseInt(d.shares) || 0);}); if (sum === 0 && relevantDetails.length > 0) throw new Error("Total shares cannot be zero."); if (sum > 0) { calculatedData = relevantDetails.map(d => {const s = parseInt(d.shares) || 0; return {uid: d.participantId, shareAmount: parseFloat(((s/sum)*totalAmount).toFixed(2))};}); } else { calculatedData = formParticipantUIDs.map(uid => ({ uid: uid, shareAmount: 0 })); }
    } else throw new Error("Invalid split type.");
  } return calculatedData;
};
export const addExpense = async (expenseData, groupId = null) => {
  if (!auth.currentUser) throw new Error("User must be authenticated."); const currentUserId = auth.currentUser.uid; const totalAmount = parseFloat(expenseData.amount);
  if (isNaN(totalAmount) || totalAmount <= 0) throw new Error("Invalid expense amount."); if (!expenseData.participants || expenseData.participants.length === 0) throw new Error("At least one participant selected.");
  const calculatedParticipantsData = calculateShares(totalAmount, expenseData.splitType, expenseData.participants, expenseData.splitDetails || []);
  const expenseDocData = { title: expenseData.title || "Untitled Expense", totalAmount, paidByUID: expenseData.paidBy, expenseDate: expenseData.date ? new Date(expenseData.date) : new Date(), splitType: expenseData.splitType, notes: expenseData.notes || '', category: expenseData.category || '', participants: calculatedParticipantsData, participantUIDs: calculatedParticipantsData.map(p => p.uid), createdByUID: currentUserId, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), groupId: groupId || null, };
  const docRef = await addDoc(collection(db, "expenses"), expenseDocData); return docRef;
};
export const updateExpense = async (expenseId, expenseData) => {
  if (!auth.currentUser) throw new Error("User must be authenticated."); const totalAmount = parseFloat(expenseData.amount);
  const calculatedParticipantsData = calculateShares(totalAmount, expenseData.splitType, expenseData.participants, expenseData.splitDetails || []);
  const expenseDocRef = doc(db, "expenses", expenseId); const expenseDocSnap = await getDoc(expenseDocRef); if (!expenseDocSnap.exists()) throw new Error("Expense not found to update.");
  const originalExpense = expenseDocSnap.data(); if (originalExpense.createdByUID !== auth.currentUser.uid && originalExpense.paidByUID !== auth.currentUser.uid ) { throw new Error("You do not have permission to edit this expense."); }
  const updatedExpenseData = { title: expenseData.title || "Untitled Expense", totalAmount, paidByUID: expenseData.paidBy, expenseDate: new Date(expenseData.date), splitType: expenseData.splitType, notes: expenseData.notes || '', category: expenseData.category || '', participants: calculatedParticipantsData, participantUIDs: calculatedParticipantsData.map(p => p.uid), updatedAt: serverTimestamp(), groupId: expenseData.groupId ?? originalExpense.groupId ?? null };
  await updateDoc(expenseDocRef, updatedExpenseData); return expenseDocRef;
};
export const deleteExpense = async (expenseId) => {
  if (!auth.currentUser) throw new Error("User must be authenticated."); const expenseDocRef = doc(db, "expenses", expenseId);
  const expenseSnap = await getDoc(expenseDocRef); if (!expenseSnap.exists()) throw new Error("Expense not found for deletion.");
  if (expenseSnap.data().createdByUID !== auth.currentUser.uid && expenseSnap.data().paidByUID !== auth.currentUser.uid ) { throw new Error("You do not have permission to delete this expense."); }
  await deleteDoc(expenseDocRef);
};
export const getExpenseDetails = async (expenseId) => {
    if (!expenseId) throw new Error("Expense ID required."); const expenseDocRef = doc(db, "expenses", expenseId);
    const expenseDocSnap = await getDoc(expenseDocRef); if (expenseDocSnap.exists()) { return { id: expenseDocSnap.id, ...expenseDocSnap.data() }; } return null;
};
export const getGroupExpenses = async (groupId) => {
    if (!groupId) throw new Error("Group ID required."); const q = query(collection(db, "expenses"), where("groupId", "==", groupId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q); const expenses = []; snapshot.forEach(doc => expenses.push({ id: doc.id, ...doc.data() })); return expenses;
};
export const getDirectP2PExpenses = async (user1UID, user2UID) => {
    if (!user1UID || !user2UID) return []; const expensesRef = collection(db, "expenses"); const expenses = [];
    const q = query( expensesRef, where("groupId", "==", null), where("participantUIDs", "array-contains-any", [user1UID, user2UID]), orderBy("createdAt", "desc") );
    const snapshot = await getDocs(q); snapshot.forEach(doc => { const expense = { id: doc.id, ...doc.data() }; if (expense.participantUIDs.includes(user1UID) && expense.participantUIDs.includes(user2UID)) { expenses.push(expense); } }); return expenses;
};
export const getNonGroupUserExpenses = async (userId) => {
  if (!userId) return []; const expensesRef = collection(db, "expenses");
  const q = query( expensesRef, where("participantUIDs", "array-contains", userId), where("groupId", "==", null), orderBy("createdAt", "desc"), limit(20));
  const snapshot = await getDocs(q); const expenses = []; snapshot.forEach(doc => expenses.push({ id: doc.id, ...doc.data() })); return expenses;
};

// --- SETTLEMENT RELATED ---
export const recordSettlement = async (settlementData) => {
    if (!auth.currentUser) throw new Error("User must be authenticated."); if (!settlementData.paidByUID || !settlementData.paidToUID || !settlementData.amount) throw new Error("Payer, payee, and amount are required."); if (parseFloat(settlementData.amount) <= 0) throw new Error("Settlement amount must be positive.");
    const processedSettlement = { paidByUID: settlementData.paidByUID, paidToUID: settlementData.paidToUID, amount: parseFloat(settlementData.amount), settlementDate: settlementData.date ? new Date(settlementData.date) : new Date(), method: settlementData.method || "cash", notes: settlementData.notes || "", groupId: settlementData.groupId || null, recordedByUID: auth.currentUser.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    const docRef = await addDoc(collection(db, "settlements"), processedSettlement); return docRef;
};
export const getGroupSettlements = async (groupId) => {
    if (!groupId) return []; const q = query(collection(db, "settlements"), where("groupId", "==", groupId), orderBy("settlementDate", "desc"));
    const snapshot = await getDocs(q); const settlements = []; snapshot.forEach((docSnap) => settlements.push({ id: docSnap.id, ...docSnap.data() })); return settlements;
};
export const getDirectP2PSettlements = async (user1UID, user2UID) => {
    if (!user1UID || !user2UID) return []; const settlementsRef = collection(db, "settlements"); const settlements = [];
    const q1 = query(settlementsRef, where("groupId", "==", null), where("paidByUID", "==", user1UID), where("paidToUID", "==", user2UID), orderBy("settlementDate", "desc") ); const snap1 = await getDocs(q1); snap1.forEach(doc => settlements.push({id: doc.id, ...doc.data()}));
    const q2 = query(settlementsRef, where("groupId", "==", null), where("paidByUID", "==", user2UID), where("paidToUID", "==", user1UID), orderBy("settlementDate", "desc") ); const snap2 = await getDocs(q2); snap2.forEach(doc => settlements.push({id: doc.id, ...doc.data()}));
    return settlements.sort((a,b) => (b.settlementDate?.toDate() || 0) - (a.settlementDate?.toDate() || 0));
};
export const getSettlementDetails = async (settlementId) => {
  if (!settlementId) throw new Error("Settlement ID is required."); const settlementDocRef = doc(db, "settlements", settlementId);
  const settlementDocSnap = await getDoc(settlementDocRef); if (settlementDocSnap.exists()) { return { id: settlementDocSnap.id, ...settlementDocSnap.data() }; } return null;
};
export const updateSettlement = async (settlementId, settlementData) => {
  if (!auth.currentUser) throw new Error("Auth required."); if (!settlementId) throw new Error("Settlement ID required.");
  if (parseFloat(settlementData.amount) <= 0) throw new Error("Amount must be positive.");
  const ref = doc(db, "settlements", settlementId); const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Settlement not found.");
  if (snap.data().recordedByUID !== auth.currentUser.uid) throw new Error("Permission denied to edit.");
  const dataToUpdate = { amount: parseFloat(settlementData.amount), settlementDate: new Date(settlementData.date), method: settlementData.method, notes: settlementData.notes, updatedAt: serverTimestamp() };
  await updateDoc(ref, dataToUpdate); return ref;
};
export const deleteSettlement = async (settlementId) => {
  if (!auth.currentUser) throw new Error("Auth required."); if (!settlementId) throw new Error("Settlement ID required.");
  const ref = doc(db, "settlements", settlementId); const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Settlement not found.");
  if (snap.data().recordedByUID !== auth.currentUser.uid) throw new Error("Permission denied to delete.");
  await deleteDoc(ref);
};

// --- BALANCE CALCULATIONS ---
export const calculateUserBalanceInGroupWithSettlements = (userId, groupExpenses = [], groupSettlements = []) => { let o=0, w=0; groupExpenses.forEach(e => { const p = e.participants.find(x=>x.uid===userId); if(!p) return; if(e.paidByUID===userId) e.participants.forEach(i=>{if(i.uid!==userId)w+=i.shareAmount;}); else o+=p.shareAmount; }); groupSettlements.forEach(s=>{if(s.paidByUID===userId&&s.paidToUID!==userId)o-=s.amount; else if(s.paidToUID===userId&&s.paidByUID!==userId)w-=s.amount;}); if(w<0){o+=Math.abs(w);w=0;} if(o<0){w+=Math.abs(o);o=0;} return {owesInGroup:parseFloat(o.toFixed(2)), owedInGroup:parseFloat(w.toFixed(2)), netInGroup:parseFloat((w-o).toFixed(2))}; };
export const calculateDirectP2PBalanceWithFriend = (currentUserId, friendId, p2pExpenses = [], p2pSettlements = []) => { let cOwesF=0,fOwesC=0; p2pExpenses.forEach(e=>{const cD=e.participants.find(p=>p.uid===currentUserId); const fD=e.participants.find(p=>p.uid===friendId); if(cD&&fD){if(e.paidByUID===currentUserId)fOwesC+=fD.shareAmount; else if(e.paidByUID===friendId)cOwesF+=cD.shareAmount;}}); p2pSettlements.forEach(s=>{if(s.paidByUID===currentUserId&&s.paidToUID===friendId)cOwesF-=s.amount; else if(s.paidByUID===friendId&&s.paidToUID===currentUserId)fOwesC-=s.amount;}); if(cOwesF<0){fOwesC+=Math.abs(cOwesF);cOwesF=0;} if(fOwesC<0){cOwesF+=Math.abs(fOwesC);fOwesC=0;} return parseFloat((fOwesC-cOwesF).toFixed(2)); };
export const getFriendsWithP2PBalances = async (currentUserId) => { if (!currentUserId) return []; const fIDs=new Set(); const uGrps = await getUserGroups(currentUserId); uGrps.forEach(g => {(g.memberUIDs||[]).forEach(uid => {if(uid!==currentUserId)fIDs.add(uid);});}); const expRef=collection(db,"expenses"); const qNGE=query(expRef,where("participantUIDs","array-contains",currentUserId),where("groupId","==",null)); const ngeSnap=await getDocs(qNGE); ngeSnap.forEach(ds=>{const e=ds.data();(e.participantUIDs||[]).forEach(uid=>{if(uid!==currentUserId)fIDs.add(uid);}); if(e.paidByUID!==currentUserId&&e.paidByUID)fIDs.add(e.paidByUID);}); const setRef=collection(db,"settlements"); const qSP=query(setRef,where("paidByUID","==",currentUserId),where("groupId","==",null)); const spSnap=await getDocs(qSP); spSnap.forEach(ds=>{if(ds.data().paidToUID)fIDs.add(ds.data().paidToUID)}); const qST=query(setRef,where("paidToUID","==",currentUserId),where("groupId","==",null)); const stSnap=await getDocs(qST); stSnap.forEach(ds=>{if(ds.data().paidByUID)fIDs.add(ds.data().paidByUID)}); if(fIDs.size===0)return[]; const uidsArr=Array.from(fIDs); const fDProms=uidsArr.map(uid=>getDoc(doc(db,"users",uid))); const fDocs=await Promise.all(fDProms); const fData=fDocs.filter(d=>d.exists()).map(d=>({id:d.id,...d.data()})); const fWBProms=fData.map(async(f)=>{const p2pE=await getDirectP2PExpenses(currentUserId,f.id); const p2pS=await getDirectP2PSettlements(currentUserId,f.id); const p2pB=calculateDirectP2PBalanceWithFriend(currentUserId,f.id,p2pE,p2pS); return{...f,p2pBalance:p2pB};}); const fWB=await Promise.all(fWBProms); return fWB.sort((a,b)=>(a.username||"").localeCompare(b.username||"")); };
export const getUserOverallFinancialSummary = async (userId) => { if (!userId) throw new Error("User ID required."); let oYouOwe = 0; let oYouAreOwed = 0; try { const expRef = collection(db, "expenses"); const setRef = collection(db, "settlements"); let ngOwes = 0; let ngOwed = 0; const qNGE = query(expRef, where("participantUIDs", "array-contains", userId), where("groupId", "==", null)); const ngeSnap = await getDocs(qNGE); ngeSnap.forEach(ds => { const e = ds.data(); const payer = e.paidByUID; const upd = e.participants.find(p => p.uid === userId); if (!upd) return; const usa = upd.shareAmount; if (payer === userId) { e.participants.forEach(p => { if (p.uid !== userId) ngOwed += p.shareAmount; }); } else { ngOwes += usa; } }); const qSPBM = query(setRef, where("paidByUID", "==", userId), where("groupId", "==", null)); const spbmSnap = await getDocs(qSPBM); spbmSnap.forEach(ds => { ngOwes -= ds.data().amount; }); const qSPTM = query(setRef, where("paidToUID", "==", userId), where("groupId", "==", null)); const sptmSnap = await getDocs(qSPTM); sptmSnap.forEach(ds => { ngOwed -= ds.data().amount; }); if (ngOwes < 0) { ngOwed += Math.abs(ngOwes); ngOwes = 0;} if (ngOwed < 0) { ngOwes += Math.abs(ngOwed); ngOwed = 0;} oYouOwe += ngOwes; oYouAreOwed += ngOwed; const uGrps = await getUserGroups(userId); for (const grp of uGrps) { const grpExp = await getGroupExpenses(grp.id); const grpSet = await getGroupSettlements(grp.id); const grpBalInfo = calculateUserBalanceInGroupWithSettlements(userId, grpExp, grpSet); if (grpBalInfo.netInGroup < 0) { oYouOwe += Math.abs(grpBalInfo.netInGroup); } else if (grpBalInfo.netInGroup > 0) { oYouAreOwed += grpBalInfo.netInGroup; } } if (oYouOwe < 0) { oYouAreOwed += Math.abs(oYouOwe); oYouOwe = 0;} if (oYouAreOwed < 0) { oYouOwe += Math.abs(oYouAreOwed); oYouAreOwed = 0;} const summary = { youOwe: parseFloat(oYouOwe.toFixed(2)), youAreOwed: parseFloat(oYouAreOwed.toFixed(2)) }; return summary; } catch (error) { console.error("firestoreService: Error calculating overall summary:", error); return { youOwe: 0, youAreOwed: 0, error: error.message }; } };

// --- NOTIFICATION RELATED ---
export const getUserNotificationsListener = (userId, callback) => {
  if (!userId) return () => {};
  const q = query(collection(db, "users", userId, "notifications"), orderBy("timestamp", "desc"), limit(20));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const notifications = []; snapshot.forEach((doc) => notifications.push({ id: doc.id, ...doc.data() }));
    callback(notifications);
  }, (error) => { console.error("Error in notifications listener:", error); callback([]); });
  return unsubscribe;
};
export const markNotificationAsRead = async (userId, notificationId) => {
  if (!userId || !notificationId) throw new Error("User/Notification ID required.");
  const ref = doc(db, "users", userId, "notifications", notificationId);
  await updateDoc(ref, { isRead: true });
};
export const markAllNotificationsAsRead = async (userId) => {
    if (!userId) throw new Error("User ID required.");
    const qUnread = query(collection(db, "users", userId, "notifications"), where("isRead", "==", false));
    const unreadSnapshot = await getDocs(qUnread); if (unreadSnapshot.empty) return;
    const batch = writeBatch(db); unreadSnapshot.docs.forEach(docSnap => batch.update(docSnap.ref, { isRead: true }));
    await batch.commit();
};