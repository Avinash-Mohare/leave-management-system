import React, { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth, database } from "../firebase";
import { ref, onValue, update, get } from "firebase/database";
import formatDate from "../utils/dateFormat";
import { PlusCircle } from "lucide-react";

const HRDashboard = () => {
  const [activeTab, setActiveTab] = useState("List of Employees");
  const navigate = useNavigate();
  const [managerName, setManagerName] = useState("");
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [compOffRequests, setCompOffRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [canIncrementLeaves, setCanIncrementLeaves] = useState(true);
  const [leavesUpdatedDate, setLeavesUpdatedDate] = useState();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setManagerName(user.displayName);

        // Fetch leave requests for all employees
        const leaveRequestsRef = ref(database, `leaveRequests`);
        onValue(leaveRequestsRef, (snapshot) => {
          const leaveRequestsArray = [];
          if (snapshot.exists()) {
            const leaveRequestsData = snapshot.val();
            console.log(leaveRequestsData);
            Object.entries(leaveRequestsData).forEach(
              ([employeeUid, requests]) => {
                Object.entries(requests).forEach(([requestId, requestData]) => {
                  if (
                    requestData.seniorApproval === "approved" &&
                    requestData.managerApproval === "pending"
                  ) {
                    leaveRequestsArray.push({
                      id: requestId,
                      employeeUid, // Use employeeUid here
                      ...requestData,
                    });
                  }
                });
              }
            );
          }
          setLeaveRequests(leaveRequestsArray);
          console.log(leaveRequestsArray);
        });

        // Fetch comp-off requests
        const compOffRequestsRef = ref(database, "compOffRequests");
        onValue(compOffRequestsRef, (snapshot) => {
          const compOffRequestsArray = [];
          if (snapshot.exists()) {
            const compOffRequestsData = snapshot.val();
            Object.entries(compOffRequestsData).forEach(
              ([employeeUid, requests]) => {
                Object.entries(requests).forEach(([requestId, requestData]) => {
                  if (
                    requestData.seniorApproval === "approved" &&
                    requestData.managerApproval === "pending"
                  ) {
                    compOffRequestsArray.push({
                      id: requestId,
                      employeeUid,
                      ...requestData,
                    });
                  }
                });
              }
            );
          }
          setCompOffRequests(compOffRequestsArray);
        });

        // Fetch employees
        const employeesRef = ref(database, "employees");
        onValue(employeesRef, (snapshot) => {
          if (snapshot.exists()) {
            const employeesData = snapshot.val();
            const employeesArray = Object.entries(employeesData).map(
              ([uuid, emp]) => ({
                uuid,
                ...emp,
              })
            );
            setEmployees(employeesArray);
          } else {
            setEmployees([]);
          }
        });
      } else {
        navigate("/login");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  //to fetch the time stamp of the last updated leaves
  useEffect(() => {
    const fetchLeaveIncrementTimestamp = () => {
      const timestampRef = ref(database, "leaves_incremented_timestamps/");

      onValue(timestampRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const storedDate = data.timestamp;
          setLeavesUpdatedDate(storedDate);

          const currentDate = new Date().toISOString().split("T")[0];

          // Compare only the month and year
          const storedMonth = storedDate.slice(0, 7);
          const currentMonth = currentDate.slice(0, 7);

          // Disable button if in the same month
          setCanIncrementLeaves(storedMonth !== currentMonth);
        }
      });
    };

    fetchLeaveIncrementTimestamp();
  }, []);

  const calculateLeaveDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const deductLeave = async (employeeUid, leaveType, days, isHalfDay) => {
    const employeeRef = ref(database, `employees/${employeeUid}`);
    const snapshot = await get(employeeRef);
    const employeeData = snapshot.val();

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
      if (leaveType === "sickLeave") {
        remainingDays -= deductFromLeaveType("sickLeaves", remainingDays);
      } else if (leaveType === "compOffLeave") {
        remainingDays -= deductFromLeaveType("compOffs", remainingDays);
      } else if (leaveType === "casualLeave") {
        // For casual leave, first deduct from regular leaves
        remainingDays -= deductFromLeaveType("leaves", remainingDays);
      }

      // If there are remaining days after initial deduction
      if (remainingDays > 0) {
        if (leaveType === "casualLeave") {
          // For casual leave, next deduct from compOffs
          remainingDays -= deductFromLeaveType("compOffs", remainingDays);
        } else {
          // For other leave types, deduct from compOffs
          remainingDays -= deductFromLeaveType("compOffs", remainingDays);
        }
      }

      // If there are still remaining days, deduct from regular leaves
      // This applies to all leave types and allows leaves to go below 0
      if (remainingDays > 0) {
        updatedLeaves.leaves = (updatedLeaves.leaves || 0) - remainingDays;
      }

      // Update the employee's leave balances
      await update(employeeRef, updatedLeaves);
    }
  };

  const approveRequest = async (request) => {
    const { id, employeeUid, leaveType, startDate, endDate, isHalfDay } =
      request;
    const approveRef = ref(database, `leaveRequests/${employeeUid}/${id}`);

    const days = calculateLeaveDays(startDate, endDate);

    try {
      await update(approveRef, {
        status: "approved",
        managerApproval: "approved", 
      });
      await deductLeave(employeeUid, leaveType, days, isHalfDay);
      alert("Leave request approved and leave balance updated.");
    } catch (error) {
      console.error("Error approving request:", error);
      alert("Error approving request. Please try again.");
    }
  };

  const rejectRequest = async (request) => {
    const { id, employeeUid } = request;
    const rejectRef = ref(database, `leaveRequests/${employeeUid}/${id}`);

    try {
      await update(rejectRef, { status: "rejected" });
      alert("Leave request rejected.");
    } catch (error) {
      console.error("Error rejecting request:", error);
      alert("Error rejecting request. Please try again.");
    }
  };

  const approveCompOffRequest = async (request) => {
    const { id, employeeUid, isHalfDay } = request;
    const approveRef = ref(database, `compOffRequests/${employeeUid}/${id}`);
    const employeeRef = ref(database, `employees/${employeeUid}`);

    try {
      // Update the request status
      await update(approveRef, {
        managerApproval: "approved",
        managerApprovalTimestamp: Date.now(),
      });

      // Increase the employee's compOff balance
      const employeeSnapshot = await get(employeeRef);
      const employeeData = employeeSnapshot.val();
      const currentCompOffs = employeeData.compOffs || 0;
      const addDays = isHalfDay ? 0.5 : 1;
      await update(employeeRef, {
        compOffs: currentCompOffs + addDays,
      });

      alert("Comp-off request approved and balance updated.");
    } catch (error) {
      console.error("Error approving comp-off request:", error);
      alert("Error approving comp-off request. Please try again.");
    }
  };

  const rejectCompOffRequest = async (request) => {
    const { id, employeeUid } = request;
    const rejectRef = ref(database, `compOffRequests/${employeeUid}/${id}`);

    try {
      await update(rejectRef, {
        managerApproval: "rejected",
        managerApprovalTimestamp: Date.now(),
      });
      alert("Comp-off request rejected.");
    } catch (error) {
      console.error("Error rejecting comp-off request:", error);
      alert("Error rejecting comp-off request. Please try again.");
    }
  };

  const handleLogout = () => {
    signOut(auth)
      .then(() => navigate("/login"))
      .catch((err) => console.error(err.message));
  };

  const incrementBulkLeaves = async () => {
    try {
      const confirmAction = window.confirm(
        "Are you sure you want to increment leaves for all employees?"
      );
      if (!confirmAction) return;

      const updates = {};
      employees.forEach((employee) => {
        const employeeRef = `employees/${employee.uuid}`;

        updates[`${employeeRef}/leaves`] = (employee.leaves || 0) + 1;

        if (employee.isMumbaiTeam) {
          updates[`${employeeRef}/sickLeaves`] = (employee.sickLeaves || 0) + 1;
        }
      });

      // Store global leave increment timestamp
      updates["leaves_incremented_timestamps/"] = {
        timestamp: new Date().toISOString().split("T")[0],
      };

      await update(ref(database), updates);
      alert("Leaves incremented successfully for all employees!");
    } catch (error) {
      console.error("Error incrementing leaves:", error);
      alert("Failed to increment leaves. Please try again.");
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "List of Employees":
        return (
          <div className="bg-white shadow-md rounded-lg">
            <div className="flex items-center mb-4 p-4 space-x-4 border-b">
              <button
                onClick={incrementBulkLeaves}
                disabled={!canIncrementLeaves}
                className={`${
                  canIncrementLeaves
                    ? "bg-blue-500 text-white"
                    : "bg-gray-400 text-gray-200 cursor-not-allowed"
                } 
     px-4 py-2 rounded-md flex items-center`}
              >
                <PlusCircle className="mr-2" size={20} />
                Increment Leaves
              </button>
              <p className="flex-grow">
                Last Leaves Updated Date: {formatDate(leavesUpdatedDate)}
              </p>
            </div>

            {employees.map((employee) => (
              <Link
                key={employee.uuid}
                to={`/employee/${employee.uuid}`}
                className="block p-4 border-b last:border-b-0 hover:bg-gray-50"
              >
                <h3 className="font-semibold">{employee.name}</h3>
                <p className="text-sm text-gray-600">
                  Casual Leaves: {employee.leaves},
                  {employee.isMumbaiTeam &&
                    ` Sick Leaves: ${employee.sickLeaves},`}
                  Comp Offs: {employee.compOffs}
                </p>
              </Link>
            ))}
          </div>
        );
      case "Leave Requests":
        return (
          <div>
            {leaveRequests.length > 0 ? (
              leaveRequests.map((request) => {
                const employee = employees.find(
                  (emp) => emp.uuid === request.employeeUid
                );
                const seniorEmployeeName = employees.find(
                  (emp) => emp.uuid === request.approvedBy
                );

                return (
                  <div
                    key={request.id}
                    className="mb-4 p-4 bg-white rounded-lg shadow"
                  >
                    <p>
                      <strong>Employee:</strong>{" "}
                      {employee ? employee.name : "Unknown"}
                    </p>
                    <p>
                      <strong>Approved by:</strong>{" "}
                      {seniorEmployeeName ? seniorEmployeeName.name : "Unknown"}
                    </p>
                    <p>
                      <strong>Leave Type:</strong> {request.leaveType}
                    </p>
                    {request.isHalfDay ? (
                      <>Half Day on {formatDate(request.startDate)}</>
                    ) : (
                      <>
                        <p>
                          <strong>Start Date:</strong>{" "}
                          {formatDate(request.startDate)}
                        </p>
                        <p>
                          <strong>End Date:</strong>{" "}
                          {formatDate(request.endDate)}
                        </p>
                      </>
                    )}

                    <p>
                      <strong>Reason:</strong> {request.reason}
                    </p>
                    <p>
                      <strong>Status:</strong> {request.status}
                    </p>
                    <div className="mt-2">
                      <button
                        className="bg-green-500 p-2 rounded-md text-white mr-2"
                        onClick={() => approveRequest(request)}
                      >
                        Approve
                      </button>
                      <button
                        className="bg-red-500 p-2 rounded-md text-white"
                        onClick={() => rejectRequest(request)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p>No leave requests available.</p>
            )}
          </div>
        );
      case "CompOff Requests":
        return (
          <div>
            {compOffRequests.length > 0 ? (
              compOffRequests.map((request) => {
                const employee = employees.find(
                  (emp) => emp.uuid === request.employeeUid
                );
                const approver = employees.find(
                  (emp) => emp.uuid === request.approvedBy
                );
                return (
                  <div
                    key={request.id}
                    className="mb-4 p-4 bg-white rounded-lg shadow"
                  >
                    <p>{employee ? employee.name : "Unknown"}</p>
                    <p>
                      {request.isHalfDay ? (
                        <>
                          <p>Half Day on {formatDate(request.date)}</p>
                        </>
                      ) : (
                        <>
                          <p>Full Day on {formatDate(request.date)}</p>
                        </>
                      )}
                    </p>

                    <p>
                      <strong>Reason:</strong> {request.reason}
                    </p>

                    <p>
                      <strong>Approved by - </strong>
                      {request.seniorApproval === "approved" && approver && (
                        <span>{approver.name}</span>
                      )}
                    </p>
                    <div className="mt-2">
                      <button
                        className="bg-green-500 p-2 rounded-md text-white mr-2"
                        onClick={() => approveCompOffRequest(request)}
                      >
                        Approve
                      </button>
                      <button
                        className="bg-red-500 p-2 rounded-md text-white"
                        onClick={() => rejectCompOffRequest(request)}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <p>No comp-off requests available.</p>
            )}
          </div>
        );
      default:
        return <div>Content for {activeTab}</div>;
    }
  };

  return (
    <div className="w-full max-w-[1280px] flex h-screen bg-gray-100 font-oxygen">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-md">
        <div className="p-4">
          <h1 className="text-xl font-semibold">{managerName}</h1>
        </div>
        <nav className="mt-4">
          {["List of Employees", "Leave Requests", "CompOff Requests"].map(
            (item) => (
              <button
                key={item}
                className={`w-full text-left p-4 hover:bg-gray-100 ${
                  activeTab === item ? "bg-gray-200" : ""
                }`}
                onClick={() => setActiveTab(item)}
              >
                {item}
              </button>
            )
          )}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <nav className="bg-white shadow-md p-4 flex justify-between items-center">
          <div className="text-xl">{activeTab}</div>
          <button
            className="bg-gray-100 text-black border border-gray-300 px-4 py-2 rounded-md flex items-center"
            onClick={handleLogout}
          >
            Logout <LogOut className="ml-2" size={20} />
          </button>
        </nav>

        <div className="p-8">{renderContent()}</div>
      </div>
    </div>
  );
};

export default HRDashboard;
