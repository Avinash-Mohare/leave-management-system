import React, { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";
import { auth, database } from "../firebase";
import { ref, onValue, update, get } from "firebase/database";
import formatDate from "../utils/dateFormat";
import { PlusCircle } from "lucide-react";
import { reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { updatePassword } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";
import LeavesReport from "./LeavesReport";

const HRDashboard = () => {
  const [isChangePasswordVisible, setIsChangePasswordVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [reauthEmail, setReauthEmail] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");
  const [showReauthPassword, setShowReauthPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [activeTab, setActiveTab] = useState("List of Employees");
  const navigate = useNavigate();
  const [managerName, setManagerName] = useState("");
  const [employees, setEmployees] = useState([]);
  const [canIncrementLeaves, setCanIncrementLeaves] = useState(true);
  const [leavesUpdatedDate, setLeavesUpdatedDate] = useState();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setManagerName(user.displayName);
        setCurrentUserId(user.uid);
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

      console.log("Current User ID:", user ? user.uid : "No user logged in");
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

  const reauthenticate = async () => {
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(
      reauthEmail,
      reauthPassword
    );
    try {
      await reauthenticateWithCredential(user, credential);
      return true;
    } catch (error) {
      setPasswordError(error.message);
      return false;
    }
  };

  const handleChangePassword = async () => {
    const user = auth.currentUser;
    if (user) {
      const reauthenticated = await reauthenticate();
      if (reauthenticated) {
        try {
          await updatePassword(user, newPassword);
          alert("Password changed successfully!");
          setIsChangePasswordVisible(false);
          setActiveTab("List of Employees");
          setNewPassword("");
          setPasswordError("");
        } catch (error) {
          setPasswordError(error.message);
        }
      }
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
      const currentMonthNumber = new Date().getMonth() + 1;
      const increment = currentMonthNumber % 3 === 0 ? 1.4 : 1.3;
      employees.forEach((employee) => {
        const employeeRef = `employees/${employee.uuid}`;
        //handle the office people leaves here
        if (employee.isRegularOfficeEmployee) {
          updates[`${employeeRef}/leaves`] = (employee.leaves || 0) + increment;
        } else {
          updates[`${employeeRef}/leaves`] = (employee.leaves || 0) + 1;
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
    if (isChangePasswordVisible) {
      return (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Change Password</h2>
          {passwordError && (
            <div className="text-red-500 font-bold mb-2">{passwordError}</div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block mb-1">Email:</label>
              <input
                type="email"
                value={reauthEmail}
                onChange={(e) => setReauthEmail(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div className="">
              <div className="flex">
                <label className="block mb-1">Current Password:</label>
                <div
                  className="px-5 py-1 cursor-pointer"
                  onClick={() => setShowReauthPassword(!showReauthPassword)}
                >
                  {showReauthPassword ? (
                    <Eye size={20} />
                  ) : (
                    <EyeOff size={20} />
                  )}
                </div>
              </div>
              <input
                type={showReauthPassword ? "text" : "password"}
                value={reauthPassword}
                onChange={(e) => setReauthPassword(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <div className="flex">
                <label className="block mb-1">New Password:</label>
                <div
                  className="px-5 py-1 cursor-pointer"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </div>
              </div>
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={handleChangePassword}
            >
              Change Password
            </button>
          </div>
        </div>
      );
    }

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
              

              <div
                key={employee.uuid}
                className="flex items-center justify-between p-4 border-b last:border-b-0 hover:bg-gray-50"
              >
                <Link
                  to={`/employee/${employee.uuid}`}
                  className="flex-1"
                >
                  <h3 className="font-semibold">{employee.name}</h3>
                  <p className="text-sm text-gray-600">
                    Casual Leaves: {employee.leaves}, Comp Offs: {employee.compOffs}
                  </p>
                  <span
                    className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                      employee.isRegularOfficeEmployee
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {employee.isRegularOfficeEmployee
                      ? "Regular Office Employee"
                      : "Not Regular Office"}
                  </span>
                </Link>
                <div className="ml-4 flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <span className="mr-2 text-xs">Regular Office</span>
                    <input
                      type="checkbox"
                      checked={!!employee.isRegularOfficeEmployee}
                      onChange={() => handleToggleRegularOffice(employee)}
                      className="form-checkbox h-5 w-5 text-blue-600"
                    />
                  </label>
                  <button
                    onClick={() => handleDeleteEmployee(employee)}
                    className="ml-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    title="Delete Employee"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        );
      case "Leaves Report":
        return <LeavesReport />;
      default:
        return <div>Content for {activeTab}</div>;
    }
  };

  const handleToggleRegularOffice = async (employee) => {
  try {
    await update(ref(database, `employees/${employee.uuid}`), {
      isRegularOfficeEmployee: !employee.isRegularOfficeEmployee,
    });
  } catch (error) {
    alert("Failed to update regular office status.");
    console.error(error);
  }
  };

  const handleDeleteEmployee = async (employee) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${employee.name} and all their data? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      // Remove from all relevant database paths
      const updates = {};
      updates[`employees/${employee.uuid}`] = null;
      updates[`leaveRequests/${employee.uuid}`] = null;
      updates[`compOffRequests/${employee.uuid}`] = null;
      updates[`hr-employee/${currentUserId}/managedEmployees/${employee.uuid}`] = null;

      await update(ref(database), updates);
      alert("Employee and all related data deleted successfully.");
    } catch (error) {
      alert("Failed to delete employee. Please try again.");
      console.error(error);
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
          {["List of Employees", "Leaves Report"].map((item) => (
            <button
              key={item}
              className={`w-full text-left p-4 hover:bg-gray-100 ${
                activeTab === item ? "bg-gray-200" : ""
              }`}
              onClick={() => setActiveTab(item)}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="px-4 mt-4">
          <button
            className="bg-gray-100 text-black border border-gray-300 px-4 py-2 rounded-md flex items-center"
            onClick={() => {
              setIsChangePasswordVisible(true);
              setActiveTab("");
            }}
          >
            Change Password
          </button>
        </div>
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
