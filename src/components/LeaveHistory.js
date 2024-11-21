import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase";
import formatDate from "../utils/dateFormat";

const LeaveHistory = ({ employeeId }) => {
  const [leaveRequests, setLeaveRequests] = useState([]);

  useEffect(() => {
    const leaveRequestsRef = ref(database, `leaveRequests/${employeeId}`);
    onValue(leaveRequestsRef, (snapshot) => {
      if (snapshot.exists()) {
        const requests = snapshot.val();
        setLeaveRequests(Object.values(requests));
      } else {
        setLeaveRequests([]);
      }
    });
  }, [employeeId]);

  const leaveTypes = [
    { name: "Casual Leaves", type: "casualLeave" },
    { name: "Sick Leaves", type: "sickLeave" },
    { name: "Comp Offs", type: "compOffLeave" },
  ];

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Leave History</h2>
      {leaveTypes.map((leaveType) => {
        const filteredRequests = leaveRequests.filter(
          (leave) => leave.leaveType === leaveType.type
        );
        return (
          <div key={leaveType.type} className="mb-6">
            <h3 className="text-lg font-semibold mb-2">{leaveType.name}</h3>
            <table className="w-full border-collapse table-fixed">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left w-1/6">Start Date</th>
                  <th className="border p-2 text-left w-1/6">End Date</th>
                  <th className="border p-2 text-left w-1/2">Reason</th>
                  <th className="border p-2 text-left w-1/6">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((leave, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border p-2 w-1/6">
                        {formatDate(leave.startDate)}
                      </td>
                      <td className="border p-2 w-1/6">
                        {formatDate(leave.endDate)}
                      </td>
                      <td
                        className="border p-2 w-1/2 break-words overflow-wrap-normal"
                        style={{ maxWidth: 0 }}
                      >
                        {leave.reason}
                      </td>
                      <td className="border p-2 w-1/6">{leave.status}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="border p-2 text-center">
                      No {leaveType.name.toLowerCase()} requests
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};
  
export default LeaveHistory;
