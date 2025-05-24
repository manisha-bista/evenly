import React from 'react';
import Card from '../common/Card';
import SkeletonLoader from '../common/SkeletonLoader'; // You'd create this

const OverviewPanel = ({ balances, loading }) => {
  if (loading) {
    return (
      <Card className="mb-6">
        <h3 className="text-lg font-medium text-neutral-text mb-4">Your Balances</h3>
        <div className="space-y-3">
          <SkeletonLoader className="h-8 w-3/4" />
          <SkeletonLoader className="h-8 w-1/2" />
          <SkeletonLoader className="h-8 w-2/3" />
        </div>
      </Card>
    );
  }

  // Dummy data until Firestore logic is in place
  const { youOwe = 0, youAreOwed = 0 } = balances || {};
  const netBalance = youAreOwed - youOwe;

  return (
    <Card className="mb-6">
      <h3 className="text-lg font-medium text-neutral-text mb-4">Your Balances</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
        <div>
          <p className="text-sm text-neutral-text-light">You owe</p>
          <p className="text-2xl font-semibold text-accent-negative">${youOwe.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-neutral-text-light">You are owed</p>
          <p className="text-2xl font-semibold text-accent-positive">${youAreOwed.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-neutral-text-light">Net Balance</p>
          <p className={`text-2xl font-semibold ${netBalance >= 0 ? 'text-accent-positive' : 'text-accent-negative'}`}>
            {netBalance >= 0 ? `+$${netBalance.toFixed(2)}` : `-$${Math.abs(netBalance).toFixed(2)}`}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default OverviewPanel;