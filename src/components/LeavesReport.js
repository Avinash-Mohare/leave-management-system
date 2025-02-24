import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, onValue } from "firebase/database";
import formatDate from "../utils/dateFormat";
import * as XLSX from "xlsx";

const LeavesReport = () => {
  const [leavesData, setLeavesData] = useState({});
  const [employees, setEmployees] = useState({});
  const [currentMonth, setCurrentMonth] = useState("");

  useEffect(() => {
    const fetchLeavesData = () => {
      const leaveRequestsRef = ref(database, "leaveRequests");
      onValue(leaveRequestsRef, (snapshot) => {
        const data = snapshot.val();
        console.log("Leave Requests Data:", data); // Debugging log
        const leavesByEmployee = {};
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        console.log("Current Month:", currentMonth); // Debugging log

        if (data) {
          Object.entries(data).forEach(([employeeUid, requests]) => {
            leavesByEmployee[employeeUid] = { days: 0, dates: [] };
            Object.entries(requests).forEach(([requestId, requestData]) => {
              const startMonth = requestData.startDate.slice(0, 7); // YYYY-MM
              const endMonth = requestData.endDate.slice(0, 7); // YYYY-MM
              if ((startMonth === currentMonth || endMonth === currentMonth) && requestData.status === "approved") {
                const leaveDays = calculateLeaveDaysInMonth(requestData.startDate, requestData.endDate, currentMonth, requestData.isHalfDay);
                leavesByEmployee[employeeUid].days += leaveDays;
                leavesByEmployee[employeeUid].dates.push({
                  startDate: requestData.startDate,
                  endDate: requestData.endDate,
                  isHalfDay: requestData.isHalfDay,
                });
              }
            });
          });
        }

        console.log("Leaves By Employee:", leavesByEmployee); // Debugging log
        setLeavesData(leavesByEmployee);
      });
    };

    const fetchEmployees = () => {
      const employeesRef = ref(database, "employees");
      onValue(employeesRef, (snapshot) => {
        const data = snapshot.val();
        console.log("Employees Data:", data); // Debugging log
        setEmployees(data || {});
      });
    };

    const setCurrentMonthName = () => {
      const date = new Date();
      const monthName = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();
      setCurrentMonth(`${monthName} ${year}`);
    };

    fetchLeavesData();
    fetchEmployees();
    setCurrentMonthName();
  }, []);

  const calculateLeaveDaysInMonth = (startDate, endDate, currentMonth, isHalfDay) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const currentMonthStart = new Date(`${currentMonth}-01`);
    const nextMonthStart = new Date(currentMonthStart);
    nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

    const effectiveStart = start < currentMonthStart ? currentMonthStart : start;
    const effectiveEnd = end >= nextMonthStart ? new Date(nextMonthStart - 1) : end;

    const leaveDays = Math.ceil((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24)) + 1;
    return isHalfDay ? 0.5 : leaveDays;
  };

  const downloadExcel = () => {
    const workbook = XLSX.utils.book_new();
    const worksheetData = [
      ["Employee Name", "Total leaves taken"]
    ];
    Object.entries(employees).forEach(([employeeUid, employeeData]) => {
      const leaveData = leavesData[employeeUid] || { days: 0, dates: [] };
      const leaveDates = leaveData.dates.map(date => 
        date.isHalfDay
          ? `Half Day on ${formatDate(date.startDate)}`
          : `${formatDate(date.startDate)} to ${formatDate(date.endDate)}`
      ).join(", ");
      worksheetData.push([employeeData.name, leaveData.days]);
    });
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leaves Report");
    XLSX.writeFile(workbook, "LeavesReport.xlsx");
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Leaves Report for {currentMonth}</h2>
      <button
        onClick={downloadExcel}
        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mb-4"
      >
        Download Excel
      </button>
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="py-2 border">Employee name</th>
            <th className="py-2 border">Total Leaves taken</th>
            {/* <th className="py-2 border">Leave Dates</th> */}
          </tr>
        </thead>
        <tbody>
          {Object.entries(employees).map(([employeeUid, employeeData]) => {
            const leaveData = leavesData[employeeUid] || { days: 0, dates: [] };
            return (
              <tr key={employeeUid}>
                <td className="py-2 border" align="center">{employeeData.name}</td>
                <td className="py-2 border" align="center">{leaveData.days}</td>
                {/* <td className="py-2 border" align="center">
                  {leaveData.dates.length > 0 ? (
                    leaveData.dates.map((date, index) => (
                      <div key={index}>
                        {date.isHalfDay
                          ? `Half Day on ${formatDate(date.startDate)}`
                          : `${formatDate(date.startDate)} to ${formatDate(date.endDate)}`}
                      </div>
                    ))
                  ) : (
                    <div>No leaves taken</div>
                  )}
                </td> */}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LeavesReport;