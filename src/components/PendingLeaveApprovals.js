import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, onValue, update, get } from "firebase/database";
import formatDate from "../utils/dateFormat";
import { sendApprovalNotification, sendHRNotification, sendSeniorActionNotification } from "../utils/sendSlackNotification";

const PendingLeaveApprovals = ({ currentUserId }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [employeeNames, setEmployeeNames] = useState({});

  useEffect(() => {
      const requestsRef = ref(database, "leaveRequests");
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

  const calculateLeaveDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const deductLeave = async (employeeUid, leaveType, days, isHalfDay) => {
    const employeeRef = ref(database, `employees/${employeeUid}`);
    const snapshot = await get(employeeRef);
    const employeeData = snapshot.val();

    const leaveDeductInfo = {
      compoffDeducted: 0,
      casualLeavesDeducted: 0,
    };

    if (employeeData) {
      let updatedLeaves = { ...employeeData };
      let remainingDays = isHalfDay ? 0.5 : days;

      const deductFromLeaveType = (type, amount) => {
        const available = updatedLeaves[type] || 0;
        const deducted = Math.min(available, amount);
        updatedLeaves[type] = Math.max(0, available - deducted);
        return deducted;
      };

      // First, try to deduct from the requested leave type
      if (updatedLeaves["compOffs"] > 0) {
        const deducted = deductFromLeaveType("compOffs", remainingDays);
        leaveDeductInfo.compoffDeducted = deducted;
        remainingDays -= deducted;
      }
      if (remainingDays > 0) {
        const deducted = deductFromLeaveType("leaves", remainingDays);
        leaveDeductInfo.casualLeavesDeducted = deducted;
        remainingDays -= deducted;
      }

      // If there are still remaining days, deduct from regular leaves
      // This applies to all leave types and allows leaves to go below 0
      if (remainingDays > 0) {
        updatedLeaves.leaves = (updatedLeaves.leaves || 0) - remainingDays;
        leaveDeductInfo.casualLeavesDeducted += remainingDays;
      }
      await update(employeeRef, updatedLeaves);
    }
    return leaveDeductInfo;
  };

  // Function to handle approving a leave request
  const approveRequest = async (request) => {
    const { id, userId, leaveType, startDate, endDate, isHalfDay } = request;
    const approveRef = ref(database, `leaveRequests/${userId}/${id}`);
    const days = calculateLeaveDays(startDate, endDate);

    try {
      const leaveDeductInfo = await deductLeave(userId, leaveType, days, isHalfDay);
      await update(approveRef, {
        status: "approved",
        seniorApproval: "approved",
        approvalTimestamp: Date.now(),
        leaveDeductInfo,
      });

      // Get employee data
      const employeeSnapshot = await get(ref(database, `employees/${userId}`));
      const employeeData = employeeSnapshot.val();

      const approverSnapshot = await get(ref(database, `employees/${currentUserId}`));
      const approverData = approverSnapshot.val();

      try { 
        await sendSeniorActionNotification(
          request,
          'leave',
          { name: employeeData.name, slackId: employeeData.slackId },
          { name: approverData.name, slackId: approverData.slackId },
          true
        );
      } catch (slackError) {
        console.error("Error sending Slack notification:", slackError);
      }
      alert("Leave request approved and leave balance updated.");
    } catch (error) {
      console.error("Error approving request:", error);
      alert("Error approving request. Please try again.");
    }
  };

  // Function to handle rejecting a leave request
  const rejectRequest = async (request) => {
    const { id, userId } = request;
    const rejectRef = ref(database, `leaveRequests/${userId}/${id}`);

    try {
      await update(rejectRef, { status: "rejected", seniorApproval: "rejected", approvalTimestamp: Date.now() });

      // Get employee data
      const employeeSnapshot = await get(ref(database, `employees/${userId}`));
      const employeeData = employeeSnapshot.val();

      const approverSnapshot = await get(ref(database, `employees/${currentUserId}`));
      const approverData = approverSnapshot.val();

      try {
        await sendSeniorActionNotification(
          request,
          'leave',
          { name: employeeData.name, slackId: employeeData.slackId },
          { name: approverData.name, slackId: approverData.slackId },
          false
        );
      } catch (slackError) {
        console.error("Error sending Slack notification:", slackError);
      }
      alert("Leave request rejected.");
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Error rejecting request. Please try again.");
    }
  };

  // const handleApproval = async (requestId, userId, approved) => {
  //   const requestRef = ref(database, `leaveRequests/${userId}/${requestId}`);
  //   try {
  //     await update(requestRef, {
  //       seniorApproval: approved ? "approved" : "rejected",
  //       approvedBy: currentUserId,
  //       approvalTimestamp: Date.now(),
  //     });

  //     const employeeSnapshot = await get(ref(database, `employees/${userId}`));
  //     const employeeData = employeeSnapshot.val();
      
  //     const approverSnapshot = await get(ref(database, `employees/${currentUserId}`));
  //     const approverData = approverSnapshot.val();

  //     const requestSnapshot = await get(requestRef);
  //     const requestData = requestSnapshot.val();

  //     try {
  //       if (!approved) {
  //         // Send rejection notification only
  //         await sendApprovalNotification(
  //           requestData,
  //           'leave',
  //           { name: employeeData.name, slackId: employeeData.slackId },
  //           { name: approverData.name, slackId: approverData.slackId },
  //           approved
  //         );
  //       } else {
  //         // If approved, send HR notification
  //         await sendHRNotification(
  //           requestData,
  //           'leave',
  //           { name: employeeData.name, slackId: employeeData.slackId },
  //           { name: approverData.name, slackId: approverData.slackId }
  //         );
  //       }
  //     } catch (slackError) {
  //       console.error("Error sending Slack notification:", slackError);
  //     }

  //     alert(`Request ${approved ? "approved" : "rejected"} successfully!`);
  //     setPendingRequests((prevRequests) =>
  //       prevRequests.filter((request) => request.id !== requestId)
  //     );
  //   } catch (error) {
  //     console.error("Error updating request:", error);
  //     alert("Failed to update request. Please try again.");
  //   }
  // };

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
      <h2 className="text-2xl font-bold mb-4">Pending Leave Approvals</h2>
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
                  <>Half day on {formatDate(request.startDate)}</>
                ) : (
                  <>
                    From {formatDate(request.startDate)} to{" "}
                    {formatDate(request.endDate)}
                  </>
                )}
              </p>
              <p className="mb-3">
                <span className="font-semibold">Reason:</span> {request.reason}
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() =>
                    approveRequest(request)
                  }
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() =>
                    rejectRequest(request)
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

export default PendingLeaveApprovals;