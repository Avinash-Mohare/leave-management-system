import React, { useState, useEffect } from "react";
import { database, auth } from "../firebase";
import { ref, push, set, onValue, get } from "firebase/database";
import { sendSlackNotification } from "../utils/sendSlackNotification";

const LeaveRequestForm = ({ currentUserId, onRequestSubmitted }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [approvalFrom, setApprovalFrom] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [leaveType, setLeaveType] = useState("casualLeave");
  const [employees, setEmployees] = useState([]);
  const [formError, setFormError] = useState("");
  const [employeeData, setEmployeeData] = useState({});

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const employeeRef = ref(database, `employees/${user.uid}`);
      onValue(employeeRef, (snapshot) => {
        const data = snapshot.val();
        setEmployeeData(data);
      });
    }

    // Fetch employees for the dropdown
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
  }, [currentUserId]);

  const validateForm = () => {
    if (!startDate || (!isHalfDay && !endDate) || !reason.trim() || !approvalFrom) {
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

    const leaveRequest = {
      startDate,
      endDate: isHalfDay ? startDate : endDate,
      reason: reason.trim(),
      approvalFrom,
      isHalfDay,
      leaveType,
      status: "pending",
      timestamp: Date.now(),
      requestedBy: currentUserId,
      seniorApproval: "pending",
      managerApproval: "pending",
    };

    try {
      const newLeaveRequestRef = push(
        ref(database, `leaveRequests/${currentUserId}`)
      );

      await set(newLeaveRequestRef, leaveRequest);

      // Get the names for the Slack notification
      const employeeSnapshot = await get(
        ref(database, `employees/${currentUserId}`)
      );
      const employeeName = employeeSnapshot.val().name;

      const seniorEmployeeSnapshot = await get(
        ref(database, `employees/${approvalFrom}`)
      );
      const seniorEmployeeName = seniorEmployeeSnapshot.val().name;

      // Send Slack notification
      await sendSlackNotification(
        leaveRequest,
        employeeName,
        seniorEmployeeName
      );

      alert("Leave request submitted successfully!");
      // Reset form
      setStartDate("");
      setEndDate("");
      setReason("");
      setApprovalFrom("");
      setIsHalfDay(false);
      setLeaveType("casualLeave");
      setFormError("");
      onRequestSubmitted();
    } catch (error) {
      console.error("Error submitting leave request:", error);
      setFormError("Failed to submit leave request. Please try again.");
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Request Leave</h2>
      {formError && (
        <div className="text-red-500 font-bold mb-2">{formError}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Type of Leave:</label>
          <select
            className="w-full p-2 border rounded"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value)}
            required
          >
            <option value="casualLeave">Casual Leave</option>
            {employeeData.isMumbaiTeam && (
              <option value="sickLeave">Sick Leave</option>
            )}
            <option value="compOffLeave">Comp Off Leave</option>
          </select>
        </div>
        <div>
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
        </div>
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
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Submit Leave Request
        </button>
      </form>
    </div>
  );
};

export default LeaveRequestForm;