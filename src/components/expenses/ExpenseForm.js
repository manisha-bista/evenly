import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import Input from '../common/Input';
import Button from '../common/Button';
import Select from '../common/Select'; // You'd create this Select component
// import { db } from '../../firebase/config';
// import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

const ExpenseForm = ({ group, friendsInvolved, onSave, onCancel }) => {
  const { currentUser, userData } = useAuth();
  const [splitType, setSplitType] = useState('equally');
  
  // Determine participants based on context (group or individual)
  // This is a simplified example. You'd fetch members for a group.
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
      // Simulate fetching participants
      // In a real app, if 'group' prop is passed, fetch group members.
      // If 'friendsInvolved' is passed, use them.
      // Otherwise, it might be just the current user and one other person (if not group context).
      let initialParticipants = [];
      if (group && group.members) { // Assuming group object has a members array
        initialParticipants = group.members.map(member => ({ id: member.uid, name: member.displayName, share: 1, amount: 0, percentage: 0 }));
      } else if (friendsInvolved) {
        initialParticipants = [
          { id: currentUser.uid, name: userData.displayName || 'You', share: 1, amount: 0, percentage: 0 },
          ...friendsInvolved.map(friend => ({ id: friend.uid, name: friend.displayName, share: 1, amount: 0, percentage: 0 }))
        ];
      } else {
        // Default if no context, maybe just "You" and one other person field?
        initialParticipants = [{ id: currentUser.uid, name: userData.displayName || 'You', share: 1, amount: 0, percentage: 0 }];
      }
      // Ensure current user is always an option as payer
      reset({ 
          payer: currentUser.uid,
          participants: initialParticipants.map(p => p.id) // Initialize selected participants
      });
      // For field array
      replace(initialParticipants.map(p => ({...p, selected: true }))); // Mark all as selected initially
      
      // Store full participant objects for rendering options
      setParticipants(initialParticipants);

  }, [group, friendsInvolved, currentUser, userData]);


  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting }, reset } = useForm({
    defaultValues: {
      title: '',
      amount: '',
      payer: currentUser?.uid, // Default to current user
      date: new Date().toISOString().split('T')[0], // Default to today
      notes: '',
      category: '',
      participants: [], // Array of user IDs
      splitDetails: [] // For exact amounts/percentages/shares
    }
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "splitDetails"
  });

  const expenseAmount = parseFloat(watch('amount')) || 0;
  const selectedParticipantIds = watch('participants') || []; // User IDs selected for splitting

  // Update splitDetails based on selected participants and splitType
  useEffect(() => {
    if(!participants.length) return;

    const newSplitDetails = participants
        .filter(p => selectedParticipantIds.includes(p.id))
        .map(p => {
            const existing = fields.find(f => f.id === p.id);
            return {
                userId: p.id,
                name: p.name, // For display
                amount: existing?.amount || (splitType === 'equally' && selectedParticipantIds.length > 0 ? (expenseAmount / selectedParticipantIds.length).toFixed(2) : 0),
                percentage: existing?.percentage || (splitType === 'equally' && selectedParticipantIds.length > 0 ? (100 / selectedParticipantIds.length).toFixed(2) : 0),
                shares: existing?.shares || 1,
            };
        });
    replace(newSplitDetails);
  }, [selectedParticipantIds, splitType, expenseAmount, participants, replace]);


  const onSubmit = async (data) => {
    console.log("Form Data:", data);
    // Construct the expense object for Firestore
    // Perform validation on split sum
    // Example:
    // await addDoc(collection(db, 'expenses'), {
    //   ...data,
    //   amount: parseFloat(data.amount),
    //   createdAt: serverTimestamp(),
    //   createdBy: currentUser.uid,
    //   groupId: group ? group.id : null,
    //   // Process splitDetails based on splitType
    // });
    onSave(data); // Pass data to parent
  };
  
  const handleSplitTypeChange = (e) => {
    setSplitType(e.target.value);
    // Reset specific split fields when type changes
    fields.forEach((field, index) => {
        setValue(`splitDetails.${index}.amount`, 0);
        setValue(`splitDetails.${index}.percentage`, 0);
        setValue(`splitDetails.${index}.shares`, 1);
    });
  };

  const totalSplitAmount = fields.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const totalPercentage = fields.reduce((sum, item) => sum + (parseFloat(item.percentage) || 0), 0);
  // const totalShares = fields.reduce((sum, item) => sum + (parseInt(item.shares) || 0), 0);


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-neutral-text">Add New Expense</h2>
      
      <Input label="Title" id="title" {...register('title', { required: 'Title is required' })} error={errors.title?.message} />
      <Input label="Amount ($)" id="amount" type="number" step="0.01" {...register('amount', { required: 'Amount is required', valueAsNumber: true, min: {value: 0.01, message: "Amount must be positive"} })} error={errors.amount?.message} />
      
      <Select label="Paid by" id="payer" {...register('payer')} error={errors.payer?.message}>
        {/* Populate with group members or friends + self */}
        {participants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        {/* <option value={currentUser.uid}>{userData?.displayName || 'You'}</option> */}
        {/* {group && group.members.map(member => <option key={member.uid} value={member.uid}>{member.name}</option>)} */}
      </Select>

      <Input label="Date" id="date" type="date" {...register('date', { required: 'Date is required' })} error={errors.date?.message} />

      <div>
        <label className="block text-sm font-medium text-neutral-text-light">Split With</label>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {participants.map(p => (
                <label key={p.id} className="flex items-center space-x-2 p-2 border rounded-md hover:bg-gray-50">
                    <input
                        type="checkbox"
                        value={p.id}
                        {...register('participants', { required: "Select at least one person" })}
                        className="form-checkbox h-4 w-4 text-primary focus:ring-primary-light border-gray-300 rounded"
                        defaultChecked={true} // Select all by default
                    />
                    <span className="text-sm text-neutral-text">{p.name}</span>
                </label>
            ))}
        </div>
        {errors.participants && <p className="mt-1 text-xs text-red-600">{errors.participants.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-text-light">Split Type</label>
        <div className="mt-2 flex space-x-4">
          {['equally', 'exact', 'percentages', 'shares'].map(type => (
            <label key={type} className="flex items-center">
              <input type="radio" value={type} {...register('splitTypeMethod')} checked={splitType === type} onChange={handleSplitTypeChange} className="form-radio text-primary" />
              <span className="ml-2 capitalize text-sm">{type === 'exact' ? 'Exact Amounts' : type}</span>
            </label>
          ))}
        </div>
      </div>
      
      {selectedParticipantIds.length > 0 && (
        <div className="space-y-2 mt-4 border-t pt-4">
            <h4 className="text-md font-medium">Split Details:</h4>
            {fields.map((item, index) => (
                <div key={item.id} className="grid grid-cols-2 gap-x-4 items-center">
                    <span className="text-sm">{item.name}</span>
                    {splitType === 'equally' && (
                        <p className="text-sm text-gray-600">${(expenseAmount / selectedParticipantIds.length).toFixed(2)}</p>
                    )}
                    {splitType === 'exact' && (
                        <Input type="number" step="0.01" placeholder="Amount"
                            {...register(`splitDetails.${index}.amount`, { valueAsNumber: true })}
                            className="text-sm"
                        />
                    )}
                    {splitType === 'percentages' && (
                         <Input type="number" step="1" placeholder="%"
                            {...register(`splitDetails.${index}.percentage`, { valueAsNumber: true })}
                            className="text-sm"
                         />
                    )}
                    {splitType === 'shares' && (
                        <Input type="number" step="1" placeholder="Shares"
                            {...register(`splitDetails.${index}.shares`, { valueAsNumber: true, min: 1 })}
                            className="text-sm"
                        />
                    )}
                </div>
            ))}
            {splitType === 'exact' && expenseAmount > 0 && Math.abs(totalSplitAmount - expenseAmount) > 0.001 && (
                <p className="text-xs text-red-500">Total split (${totalSplitAmount.toFixed(2)}) does not match expense amount (${expenseAmount.toFixed(2)}). Remaining: ${(expenseAmount - totalSplitAmount).toFixed(2)}</p>
            )}
            {splitType === 'percentages' && totalPercentage !== 100 && selectedParticipantIds.length > 0 && (
                 <p className="text-xs text-red-500">Total percentage ({totalPercentage}%) must be 100%.</p>
            )}
        </div>
      )}

      <Input label="Notes (Optional)" id="notes" type="textarea" {...register('notes')} />
      <Select label="Category (Optional)" id="category" {...register('category')}>
        <option value="">Select Category</option>
        <option value="food">🍔 Food</option>
        <option value="transport">🚗 Transport</option>
        {/* Add other categories */}
      </Select>

      {/* File input for receipt - simplified */}
      <div>
        <label htmlFor="receipt" className="block text-sm font-medium text-neutral-text-light">Attach Receipt (Optional)</label>
        <input type="file" id="receipt" {...register('receipt')} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-light file:text-primary hover:file:bg-primary/80" />
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" onClick={onCancel} color="secondary" outline>Cancel</Button>
        <Button type="submit" color="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Expense'}
        </Button>
      </div>
    </form>
  );
};

export default ExpenseForm;