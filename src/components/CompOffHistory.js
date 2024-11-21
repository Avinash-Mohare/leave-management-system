import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../firebase";
import formatDate from "../utils/dateFormat";

const CompOffHistory = ({ employeeId }) => {
  const [compOffRequests, setCompOffRequests] = useState([]);
  const [employeeNames, setEmployeeNames] = useState({});

  useEffect(() => {
    // Fetching employee names to map UUIDs to names
    const employeesRef = ref(database, "employees"); // Assuming you have a path to your employee data
    onValue(employeesRef, (snapshot) => {
      if (snapshot.exists()) {
        const employees = snapshot.val();
        const namesMap = Object.fromEntries(
          Object.entries(employees).map(([id, employee]) => [id, employee.name])
        );
        setEmployeeNames(namesMap);
      }
    });
  }, []);

  useEffect(() => {
    const compOffRequestsRef = ref(database, `compOffRequests/${employeeId}`);
    onValue(compOffRequestsRef, (snapshot) => {
      if (snapshot.exists()) {
        const requests = snapshot.val();
        setCompOffRequests(Object.values(requests));
      } else {
        setCompOffRequests([]);
      }
    });
  }, [employeeId]);

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">CompOff History</h2>
      <table className="w-full border-collapse table-fixed">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left w-1/6">Date</th>
            <th className="border p-2 text-left w-1/6">Half Day</th>
            <th className="border p-2 text-left w-1/4">Reason</th>
            <th className="border p-2 text-left w-1/6">Approval From</th>
            <th className="border p-2 text-left w-1/6">Senior Approval</th>
            <th className="border p-2 text-left w-1/6">HR Approval</th>
          </tr>
        </thead>
        <tbody>
          {compOffRequests.length > 0 ? (
            compOffRequests.map((request, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border p-2 w-1/6">{formatDate(request.date)}</td>
                <td className="border p-2 w-1/6">
                  {request.isHalfDay ? "Yes" : "No"}
                </td>
                <td
                  className="border p-2 w-1/4 break-words overflow-wrap-normal"
                  style={{ maxWidth: 0 }}
                >
                  {request.reason}
                </td>
                {/* Display the name instead of UUID */}
                <td className="border p-2 w-1/6">
                  {employeeNames[request.approvalFrom] || "Unknown"}
                </td>
                <td className="border p-2 w-1/6">{request.seniorApproval}</td>
                <td className="border p-2 w-1/6">{request.managerApproval}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" className="border p-2 text-center">
                No CompOff requests
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CompOffHistory;
