import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, onValue, update } from "firebase/database";
import formatDate from "../utils/dateFormat";

const PendingApprovals = ({ currentUserId }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [employeeNames, setEmployeeNames] = useState({});

  useEffect(() => {
    const requestsRef = ref(database, "compOffRequests");
    onValue(requestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const pending = Object.entries(data).flatMap(([userId, userRequests]) =>
          Object.entries(userRequests)
            .filter(
              ([_, request]) =>
                request.approvalFrom === currentUserId &&
                request.seniorApproval === "pending"
            )
            .map(([requestId, request]) => ({
              id: requestId,
              userId,
              ...request,
            }))
        );
        setPendingRequests(pending);
        fetchEmployeeNames(pending.map((request) => request.userId));
      }
    });
  }, [currentUserId]);

  const handleApproval = (requestId, userId, approved) => {
    const requestRef = ref(database, `compOffRequests/${userId}/${requestId}`);
    update(requestRef, {
      seniorApproval: approved ? "approved" : "rejected",
      approvedBy: currentUserId,
      approvalTimestamp: Date.now(),
    })
      .then(() => {
        alert(`Request ${approved ? "approved" : "rejected"} successfully!`);
      })
      .catch((error) => {
        console.error("Error updating request:", error);
        alert("Failed to update request. Please try again.");
      });
  };

  const fetchEmployeeNames = (userIds) => {
    userIds.forEach((userId) => {
      const userRef = ref(database, `employees/${userId}`);
      onValue(userRef, (snapshot) => {
        const userData = snapshot.val();
        if (userData && userData.name) {
          setEmployeeNames((prevNames) => ({
            ...prevNames,
            [userId]: userData.name,
          }));
        }
      });
    });
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Pending CompOff Approvals</h2>
      {pendingRequests.length === 0 ? (
        <p className="text-center text-gray-500">No pending requests</p>
      ) : (
        <ul className="space-y-4">
          {pendingRequests.map((request) => (
            <li key={request.id} className="bg-gray-50 p-4 rounded-lg shadow">
              <p className="font-semibold mb-2">
                Requested By: {employeeNames[request.userId] || "Fetching..."}
              </p>
              <p className="mb-1">
                {request.isHalfDay ? (
                  <>Half day on {formatDate(request.date)}</>
                ) : (
                  <>Full Day on {formatDate(request.date)}</>
                )}
              </p>
              <p className="mb-3">
                <span className="font-semibold">Reason:</span> {request.reason}
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() =>
                    handleApproval(request.id, request.userId, true)
                  }
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() =>
                    handleApproval(request.id, request.userId, false)
                  }
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PendingApprovals;
