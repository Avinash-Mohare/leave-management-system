import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, onValue, update, get } from "firebase/database";
import formatDate from "../utils/dateFormat";
import {
  sendApprovalNotification,
  sendSeniorActionNotification,
} from "../utils/sendSlackNotification";

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

  // const handleApproval = async (requestId, userId, approved) => {
  //   const requestRef = ref(database, `compOffRequests/${userId}/${requestId}`);
  //   try {
  //     // Update request status
  //     await update(requestRef, {
  //       seniorApproval: approved ? "approved" : "rejected",
  //       approvedBy: currentUserId,
  //       approvalTimestamp: Date.now(),
  //     });

  //     // Fetch employee (requestor) data
  //     const employeeSnapshot = await get(ref(database, `employees/${userId}`));
  //     const employeeData = employeeSnapshot.val();

  //     // Fetch approver data
  //     const approverSnapshot = await get(ref(database, `employees/${currentUserId}`));
  //     const approverData = approverSnapshot.val();

  //     // Get the request data
  //     const requestSnapshot = await get(requestRef);
  //     const requestData = requestSnapshot.val();

  //     // Send Slack notifications
  //     try {
  //       if (!approved) {
  //         // Send rejection notification only
  //         await sendApprovalNotification(
  //           requestData,
  //           'compoff',
  //           { name: employeeData.name, slackId: employeeData.slackId },
  //           { name: approverData.name, slackId: approverData.slackId },
  //           approved
  //         );
  //       }
  //       else {
  //         // If approved, send HR notification
  //         await sendHRNotification(
  //           requestData,
  //           'compoff',
  //           { name: employeeData.name, slackId: employeeData.slackId },
  //           { name: approverData.name, slackId: approverData.slackId }
  //         );
  //       }
  //     } catch (slackError) {
  //       console.error("Error sending Slack notification:", slackError);
  //     }

  //     alert(`Request ${approved ? "approved" : "rejected"} successfully!`);
  //   } catch (error) {
  //     console.error("Error updating request:", error);
  //     alert("Failed to update request. Please try again.");
  //   }
  // };

  const approveCompOffRequest = async (request) => {
    const { id, userId, isHalfDay } = request;
    const approveRef = ref(database, `compOffRequests/${userId}/${id}`);
    const employeeRef = ref(database, `employees/${userId}`);

    try {
      // Update the request status
      await update(approveRef, {
        seniorApproval: "approved",
        seniorApprovalTimestamp: Date.now(),
        approvalTimestamp: Date.now(),
        status: "approved",
      });

      // Upate the employee's compOff balance and leaves balance
      const employeeSnapshot = await get(employeeRef);
      const employeeData = employeeSnapshot.val();

      const approverSnapshot = await get(
        ref(database, `employees/${currentUserId}`)
      );
      const approverData = approverSnapshot.val();

      const currentCompOffs = employeeData.compOffs || 0;
      const currentLeaves = employeeData.leaves || 0;
      const addDays = isHalfDay ? 0.5 : 1;

      let newLeaves = currentLeaves;
      let newCompOffs = currentCompOffs;

      if (currentLeaves < 0) {
        // Amount needed to bring leaves to zero
        const leavesToZero = Math.min(addDays, Math.abs(currentLeaves));
        newLeaves = currentLeaves + leavesToZero;
        // Remaining days to add to compOffs
        const compOffToAdd = addDays - leavesToZero;
        newCompOffs = currentCompOffs + (compOffToAdd > 0 ? compOffToAdd : 0);
      } else {
        // If leaves are not negative, add all to compOffs
        newCompOffs = currentCompOffs + addDays;
      }

      await update(employeeRef, {
        compOffs: newCompOffs,
        leaves: newLeaves,
      });

      try {
        await sendSeniorActionNotification(
          request,
          "compoff",
          {
            name: employeeData.name,
            slackId: employeeData.slackId,
          },
          {
            name: approverData.name,
            slackId: approverData.slackId,
          },
          true
        );
      } catch (slackError) {
        console.error("Error sending Slack notification:", slackError);
      }

      alert("Comp-off request approved and balance updated.");
    } catch (error) {
      console.error("Error approving comp-off request:", error);
      alert("Error approving comp-off request. Please try again.");
    }
  };

  const rejectCompOffRequest = async (request) => {
    const { id, userId } = request;
    const rejectRef = ref(database, `compOffRequests/${userId}/${id}`);

    try {
      await update(rejectRef, {
        seniorApproval: "rejected",
        seniorApprovalTimestamp: Date.now(),
        approvalTimestamp: Date.now(),
        status: "rejected",
      });

      // Get employee data
      const employeeSnapshot = await get(
        ref(database, `employees/${userId}`)
      );
      const employeeData = employeeSnapshot.val();

      const approverSnapshot = await get(
        ref(database, `employees/${currentUserId}`)
      );
      const approverData = approverSnapshot.val();

      // Send notification with hardcoded HR details
      try {
        await sendSeniorActionNotification(
          request,
          "compoff",
          {
            name: employeeData.name,
            slackId: employeeData.slackId,
          },
          {
            name: approverData.name,
            slackId: approverData.slackId,
          },
          false
        );
      } catch (slackError) {
        console.error("Error sending Slack notification:", slackError);
      }
      alert("Comp-off request rejected.");
    } catch (error) {
      console.error("Error rejecting comp-off request:", error);
      alert("Error rejecting comp-off request. Please try again.");
    }
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
                  onClick={() => approveCompOffRequest(request)}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => rejectCompOffRequest(request)}
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
