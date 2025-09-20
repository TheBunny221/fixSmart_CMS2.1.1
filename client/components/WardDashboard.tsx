import React from 'react';
import AllComplaintCard from './AllComplaintCard';
import NeedToAssignCard from './NeedToAssignCard';
import RecentComplaints from './RecentComplaints';

interface WardDashboardProps {
  wardId: string;
}

const WardDashboard: React.FC<WardDashboardProps> = ({ wardId }) => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Ward Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <AllComplaintCard wardId={wardId} />
        <NeedToAssignCard wardId={wardId} />
        {/* Add other status cards here */}
      </div>

      <div className="mt-8">
        <RecentComplaints wardId={wardId} />
      </div>
    </div>
  );
};

export default WardDashboard;
