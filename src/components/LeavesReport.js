import React, { useState, useEffect } from "react";
import { database } from "../firebase";
import { ref, onValue } from "firebase/database";
import formatDate from "../utils/dateFormat";
import * as XLSX from "xlsx";
import { openingLeaveBalance } from "./openingLeaveBalance";

const LeavesReport = () => {
  const [leavesData, setLeavesData] = useState({});
  const [compOffData, setCompOffData] = useState({});
  const [employees, setEmployees] = useState({});
  const [currentMonth, setCurrentMonth] = useState("");
  const [openingBalanceData, setOpeningBalanceData] = useState({});

  useEffect(() => {
    const fetchOpeningLeaveBalance = async () => {
      const openingLeaveBalanceRef = ref(database, "openingLeaveBalance");
      onValue(openingLeaveBalanceRef, (snapshot) => {
        const data = snapshot.val();
        console.log("Opening Leave Balance Data:", data); // Debugging log
        if (data) {
          setOpeningBalanceData(data);
        }
      });
    };

    const fetchLeavesData = () => {
      const leaveRequestsRef = ref(database, "leaveRequests");
      onValue(leaveRequestsRef, (snapshot) => {
        const data = snapshot.val();
        console.log("Leave Requests Data:", data); // Debugging log
        const leavesByEmployee = {};
        const currentDate = new Date();
        const currentMonth = currentDate.toISOString().slice(0, 7); // YYYY-MM
        const lastMonth = new Date(
          currentDate.setMonth(currentDate.getMonth() - 1)
        )
          .toISOString()
          .slice(0, 7); // YYYY-MM
        console.log("Current Month:", currentMonth); // Debugging log
        console.log("Last Month:", lastMonth); // Debugging log

        if (data) {
          Object.entries(data).forEach(([employeeUid, requests]) => {
            leavesByEmployee[employeeUid] = { days: 0, dates: [] };
            Object.entries(requests).forEach(([requestId, requestData]) => {
              const startDate = new Date(requestData.startDate);
              const endDate = new Date(requestData.endDate);
              const periodStart = new Date(`${lastMonth}-25`);
              const periodEnd = new Date(`${currentMonth}-25`);

              if (
                startDate <= periodEnd &&
                endDate >= periodStart &&
                requestData.status === "approved"
              ) {
                const leaveDays = calculateLeaveDaysInPeriod(
                  requestData.startDate,
                  requestData.endDate,
                  periodStart,
                  periodEnd,
                  requestData.isHalfDay
                );
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

    const fetchCompOffData = () => {
      const compOffRef = ref(database, "compOffRequests");
      const currentDate = new Date();
      const currentMonth = currentDate.toISOString().slice(0, 7);
      onValue(compOffRef, (snapshot) => {
        const data = snapshot.val();
        console.log("Comp Off Requests Data:", data); // Debugging log
        const compOffByEmployee = {};
        if (data) {
          Object.entries(data).forEach(([employeeUid, requests]) => {
            compOffByEmployee[employeeUid] = { days: 0, dates: [] };
            Object.entries(requests).forEach(([requestId, requestData]) => {
              const date = new Date(requestData.date);
              if (requestData.status === "approved") {
                const compOffDays = calculateCompoffsInMonth(
                  requestData.date,
                  currentMonth,
                  requestData.isHalfDay
                );
                compOffByEmployee[employeeUid].days += compOffDays;
                compOffByEmployee[employeeUid].dates.push({
                  date: requestData.date,
                  isHalfDay: requestData.isHalfDay,
                });
              }
            });
          });
        }

        console.log("Comp Off By Employee:", compOffByEmployee); // Debugging log
        setCompOffData(compOffByEmployee);
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
      const monthName = date.toLocaleString("default", { month: "long" });
      const year = date.getFullYear();
      setCurrentMonth(`${monthName} ${year}`);
    };

    fetchLeavesData();
    fetchCompOffData();
    fetchEmployees();
    setCurrentMonthName();
    fetchOpeningLeaveBalance();
  }, []);

  const calculateLeaveDaysInPeriod = (
    startDate,
    endDate,
    periodStart,
    periodEnd,
    isHalfDay
  ) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const effectiveStart = start < periodStart ? periodStart : start;
    const effectiveEnd = end > periodEnd ? periodEnd : end;

    const leaveDays =
      Math.ceil((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24)) + 1;
    return isHalfDay ? 0.5 : leaveDays;
  };

  const calculateLeaveDaysInMonth = (
    startDate,
    endDate,
    currentMonth,
    isHalfDay
  ) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const currentMonthStart = new Date(`${currentMonth}-01`);
    const nextMonthStart = new Date(currentMonthStart);
    nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

    const effectiveStart =
      start < currentMonthStart ? currentMonthStart : start;
    const effectiveEnd =
      end >= nextMonthStart ? new Date(nextMonthStart - 1) : end;

    const leaveDays =
      Math.ceil((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24)) + 1;
    return isHalfDay ? 0.5 : leaveDays;
  };

  const calculateCompoffsInMonth = (date, currentMonth, isHalfDay) => {
    const compOffDate = new Date(date);
    const [year, month] = currentMonth.split("-").map(Number);
    const periodStart = new Date(year, month - 2, 25);
    const periodEnd = new Date(year, month - 1, 24);

    if (compOffDate >= periodStart && compOffDate <= periodEnd) {
      return isHalfDay ? 0.5 : 1;
    }
    return 0;
  };

  const downloadExcel = () => {
    const workbook = XLSX.utils.book_new();
    const worksheetData = [
      [
        "Sr. No.",
        "Emp.Code",
        "Empl.Name",
        "Working Days",
        "LOP",
        "Opening leave balance",
        "Opening Comp .off Balance",
        "Leave Availed",
        "Current Month Credited Comp.off",
        "Comp. off adjusted",
        "Closing Comp .off Balance",
        "Adjusted Availed Leaves",
        "Closing Leave balance",
      ],
    ];

    // Index to track Sr. No.
    let index = 1;

    // Loop through employees and calculate leave stats from leavesData
    Object.entries(employees).forEach(([uid, emp]) => {
      const leaves = leavesData[uid] || {};
      const compOffs = compOffData[uid] || {};

      // Calculate leave days and comp off days
      let leaveAvailed = leaves.days || 0;
      let currentMonthCreditedCompoff = compOffs.days || 0;

      const data = Object.values(openingBalanceData)[0];

      const openingLeaveBalance = data[uid]?.leaves || 0;
      const openingCompOffBalance = data[uid]?.compOffs || 0;

      const compOffAdjusted =
        leaveAvailed > openingCompOffBalance
          ? openingCompOffBalance
          : leaveAvailed;

      const closingCompOff =
        currentMonthCreditedCompoff + openingCompOffBalance - compOffAdjusted;

      const adjustedAvailedLeaves = leaveAvailed - compOffAdjusted;
      const closingLeaveBalance = openingLeaveBalance - adjustedAvailedLeaves;

      worksheetData.push([
        index++,
        emp.empCode || "", // Adjust key as needed
        emp.name,
        emp.workingDays || 30, // Optional fields
        emp.lop || 0,
        openingLeaveBalance,
        openingCompOffBalance,
        leaveAvailed,
        currentMonthCreditedCompoff,
        compOffAdjusted,
        closingCompOff,
        adjustedAvailedLeaves,
        closingLeaveBalance,
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
    XLSX.writeFile(workbook, "AttendanceReport.xlsx");
  };

  const handleOpeneingLeaveBalance = async () => {
    try {
      await openingLeaveBalance();
      alert("Operation complete. Check console for result.");
    } catch (err) {
      console.error(err);
      alert("Something went wrong!");
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">
        Leaves Report for {currentMonth}
      </h2>
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
            <th className="py-2 border">Leave Dates</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(employees).map(([employeeUid, employeeData]) => {
            const leaveData = leavesData[employeeUid] || { days: 0, dates: [] };
            return (
              <tr key={employeeUid}>
                <td className="py-2 border" align="center">
                  {employeeData.name}
                </td>
                <td className="py-2 border" align="center">
                  {leaveData.days}
                </td>
                <td className="py-2 border" align="center">
                  {leaveData.dates.length > 0 ? (
                    leaveData.dates.map((date, index) => (
                      <div key={index}>
                        {date.isHalfDay
                          ? `Half Day on ${formatDate(date.startDate)}`
                          : `${formatDate(date.startDate)} to ${formatDate(
                              date.endDate
                            )}`}
                      </div>
                    ))
                  ) : (
                    <div>No leaves taken</div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-4"
        onClick={handleOpeneingLeaveBalance}
      >
        Update Opening Leave Balance
      </button>
    </div>
  );
};

export default LeavesReport;
