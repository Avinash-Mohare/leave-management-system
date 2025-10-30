import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, push, set, get, update } from "firebase/database";
import { deductLeave } from "../utils/deductLeave";
import { sendSlackNotification } from "../utils/sendSlackNotification";

const LeaveRequestForm = ({ currentUserId, onRequestSubmitted }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  // const [leaveType, setLeaveType] = useState("casualLeave");
  // const [employees, setEmployees] = useState([]);
  const [formError, setFormError] = useState("");
  // const [employeeData, setEmployeeData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = today.getDate();
  const maxSelectableDate = day <= 25 ? `${year}-${month}-25` : ""; // Disable selection after the 25th of the month

  // * Removing dropdown of employees from whom the permission was required to take leaves.
  // useEffect(() => {
  // const user = auth.currentUser;
  // if (user) {
  //   const employeeRef = ref(database, `employees/${user.uid}`);
  //   onValue(employeeRef, (snapshot) => {
  //     const data = snapshot.val();
  //     setEmployeeData(data);
  //   });
  // }

  /*
    Fetch employees for the dropdown
    const employeesRef = ref(database, "employees");
    onValue(employeesRef, (snapshot) => {
      const data = snapshot.val();
      const employeeList = Object.entries(data)
        .filter(([id]) => id !== currentUserId) // Exclude the current user
        .map(([id, employee]) => ({
          id,
          name: employee.name,
        }));
      setEmployees(employeeList);
    });
    */
  // }, []);

  const validateForm = () => {
    if (
      !startDate ||
      (!isHalfDay && !endDate) ||
      !reason.trim()
      // !approvalFrom
    ) {
      setFormError("Please fill in all fields");
      return false;
    }
    if (!isHalfDay && new Date(endDate) < new Date(startDate)) {
      setFormError("End date cannot be earlier than start date");
      return false;
    }
    setFormError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    const leaveRequest = {
      startDate,
      endDate: isHalfDay ? startDate : endDate,
      reason: reason.trim(),
      // approvalFrom,
      isHalfDay,
      status: "approved",
      timestamp: Date.now(),
      requestedBy: currentUserId,
      // seniorApproval: "pending",
    };

    try {
      const newLeaveRequestRef = push(
        ref(database, `leaveRequests/${currentUserId}`)
      );

      await set(newLeaveRequestRef, leaveRequest);

      // Deduct leaves immediately since senior approval is removed.
      try {
        const days = isHalfDay
          ? 0.5
          : Math.ceil(
              (new Date(leaveRequest.endDate) -
                new Date(leaveRequest.startDate)) /
                (1000 * 60 * 60 * 24)
            ) + 1;
        const leaveDeductInfo = await deductLeave(
          currentUserId,
          null,
          days,
          isHalfDay
        );
        // Attach deduction info and approval timestamp to the saved request
        await update(newLeaveRequestRef, {
          leaveDeductInfo,
          approvalTimestamp: Date.now(),
        });
      } catch (deductError) {
        console.error("Error deducting leaves on submit:", deductError);
        // continue — the request was created, but deduction failed
        alert(
          "Leave request submitted, but failed to deduct leave balance. Please contact HR."
        );
      }

      // Get the names for the Slack notification
      const employeeSnapshot = await get(
        ref(database, `employees/${currentUserId}`)
      );
      const employeeData = employeeSnapshot.val();
      const employeeName = employeeData.name;
      const employeeSlackId = employeeData.slackId;

      // const seniorEmployeeSnapshot = await get(
      //   ref(database, `employees/${approvalFrom}`)
      // );
      // const seniorEmployeeData = seniorEmployeeSnapshot.val();
      // const seniorEmployeeName = seniorEmployeeData.name;
      // const seniorEmployeeSlackId = seniorEmployeeData.slackId;

      try {
        await sendSlackNotification(
          leaveRequest,
          employeeName,
          // seniorEmployeeName,
          employeeSlackId
          // seniorEmployeeSlackId
        );
      } catch (slackError) {
        console.error("Error sending Slack notification:", slackError);
        alert(
          "Leave request submitted, but failed to send Slack notification."
        );
      }

      alert("Leave request submitted successfully!");
      // Reset form
      setStartDate("");
      setEndDate("");
      setReason("");
      setIsHalfDay(false);
      // setLeaveType("casualLeave");
      setFormError("");
      onRequestSubmitted();
    } catch (error) {
      console.error("Error submitting leave request:", error);
      setFormError("Failed to submit leave request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Request Leave</h2>
      {formError && (
        <div className="text-red-500 font-bold mb-2">{formError}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* <div>
          <label className="block mb-1">Type of Leave:</label>
          <select
            className="w-full p-2 border rounded"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            required
          >
            <option value="casualLeave">Casual Leave</option>
          </select>
        </div> */}
        {/* <div>
          <label className="block mb-1">Request Leave From:</label>
          <select
            value={approvalFrom}
            onChange={(e) => setApprovalFrom(e.target.value)}
            className="w-full p-2 border rounded"
            required
          >
            <option value="">Select an employee</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div> */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isHalfDay}
              onChange={(e) => setIsHalfDay(e.target.checked)}
              className="mr-2"
            />
            Half Day
          </label>
        </div>
        <div className="flex space-x-4">
          <div className="flex-1">
            <label className="block mb-1">
              {isHalfDay ? "Date:" : "From:"}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border rounded"
              required
              max={maxSelectableDate || undefined}
            />
          </div>
          {!isHalfDay && (
            <div className="flex-1">
              <label className="block mb-1">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2 border rounded"
                min={startDate}
                required
                max={maxSelectableDate || undefined}
              />
            </div>
          )}
        </div>
        <div>
          <label className="block mb-1">Reason:</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2 border rounded resize-none"
            rows={5}
            required
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Submit Leave Request
        </button>
      </form>
    </div>
  );
};

export default LeaveRequestForm;
