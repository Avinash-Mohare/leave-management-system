import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, push, set, onValue, get } from "firebase/database";
import { sendCompOffSlackNotification } from "../utils/sendSlackNotification";

const CompOffRequestForm = ({ currentUserId, onRequestSubmitted }) => {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [approvalFrom, setApprovalFrom] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
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
  }, [currentUserId]); // Add currentUserId as a dependency

  const validateForm = () => {
    if (!date || !reason.trim() || !approvalFrom) {
      setFormError("Please fill in all fields");
      return false;
    }
    setFormError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    const compOffRequest = {
      date,
      reason: reason.trim(),
      approvalFrom,
      isHalfDay,
      status: "pending",
      timestamp: Date.now(),
      requestedBy: currentUserId,
      seniorApproval: "pending",
    };

    try {
      const newCompOffRequestRef = push(
        ref(database, `compOffRequests/${currentUserId}`)
      );

      await set(newCompOffRequestRef, compOffRequest);

      // Get the names for the Slack notification
      const employeeSnapshot = await get(
        ref(database, `employees/${currentUserId}`)
      );
      // const employeeName = employeeSnapshot.val().name;
      const employeeData = employeeSnapshot.val();
      const employeeName = employeeData.name;
      const employeeSlackId = employeeData.slackId;

      const seniorEmployeeSnapshot = await get(
        ref(database, `employees/${approvalFrom}`)
      );
      // const seniorEmployeeName = seniorEmployeeSnapshot.val().name;
      const seniorEmployeeData = seniorEmployeeSnapshot.val();
      const seniorEmployeeName = seniorEmployeeData.name;
      const seniorEmployeeSlackId = seniorEmployeeData.slackId;

      // Send Slack notification
      // Send Slack notification
      try {
        await sendCompOffSlackNotification(
          compOffRequest,
          employeeName, seniorEmployeeName, employeeSlackId, seniorEmployeeSlackId,
        );
      } catch (slackError) {
        console.error("Error sending Slack notification:", slackError);
        // Optionally, you can show a different alert for Slack notification failure
        alert("CompOff request submitted, but failed to send Slack notification.");
      }

      alert("CompOff request submitted successfully!");
      // Reset form
      setDate("");
      setReason("");
      setApprovalFrom("");
      setIsHalfDay(false);
      setFormError("");
      onRequestSubmitted();
    } catch (error) {
      console.error("Error submitting CompOff request:", error);
      setFormError("Failed to submit CompOff request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Request CompOff</h2>
      {formError && (
        <div className="text-red-500 font-bold mb-2">{formError}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
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
        <div>
          <label className="block mb-1">Ask Approval From :</label>
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Submit CompOff Request
        </button>
      </form>
    </div>
  );
};

export default CompOffRequestForm;
