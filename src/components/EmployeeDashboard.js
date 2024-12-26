import React, { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { auth, database } from "../firebase";
import { onValue, ref, push, set } from "firebase/database";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import CompOffRequestForm from "./CompOffRequestForm";
import PendingApprovals from "./PendingApprovals";
import LeaveHistory from "./LeaveHistory";
import { sendSlackNotification } from "../utils/sendSlackNotification";
import CompOffHistory from "./CompOffHistory";
import LeaveRequestForm from "./LeaveRequestForm";
import PendingLeaveApprovals from "./PendingLeaveApprovals";
import { updatePassword } from "firebase/auth";
import { reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";

const EmployeeDashboard = () => {
  const [isChangePasswordVisible, setIsChangePasswordVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showReauthPassword, setShowReauthPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  

  const [reauthEmail, setReauthEmail] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");

  const [employeeData, setEmployeeData] = useState("");
  const [employeeNames, setEmployeeNames] = useState({});
  const [activeTab, setActiveTab] = useState("Leave Balance");
  const [isLeaveFormVisible, setIsLeaveFormVisible] = useState(false);
  const [reqStartDate, setReqStartDate] = useState("");
  const [reqEndDate, setReqEndDate] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [reqLeaveType, setReqLeaveType] = useState("casualLeave");
  const [formError, setFormError] = useState("");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [isCompOffFormVisible, setIsCompOffFormVisible] = useState(false);
  const [notifySlack, setNotifySlack] = useState(false);
  const [slackNotifData, setSlackNotifData] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const employeeRef = ref(database, `employees/${user.uid}`);
      onValue(employeeRef, (snapshot) => {
        const data = snapshot.val();
        setEmployeeData(data);
      });

      // Fetching employee names to map UUIDs to names
      const employeesRef = ref(database, "employees");
      onValue(employeesRef, (snapshot) => {
        if (snapshot.exists()) {
          const employees = snapshot.val();
          const namesMap = Object.fromEntries(
            Object.entries(employees).map(([id, employee]) => [id, employee.name])
          );
          setEmployeeNames(namesMap);
        }
      });
    } else {
      navigate("/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        navigate("/login");
      })
      .catch((err) => {
        console.log(err.message);
      });
  };

  const validateForm = () => {
    if (
      !reqLeaveType ||
      !reqStartDate ||
      (!isHalfDay && !reqEndDate) ||
      !reqReason.trim()
    ) {
      setFormError("Please fill in all fields");
      return false;
    }
    if (!isHalfDay && new Date(reqEndDate) < new Date(reqStartDate)) {
      setFormError("End date cannot be earlier than start date");
      return false;
    }
    setFormError("");
    return true;
  };

  // Add the change password function
  const handleChangePassword = async () => {
    const user = auth.currentUser;
    if (user) {
      const reauthenticated = await reauthenticate();
      if (reauthenticated) {
        try {
          await updatePassword(user, newPassword);
          alert("Password changed successfully!");
          setIsChangePasswordVisible(false);
          setActiveTab("Leave Balance");
          setNewPassword("");
          setPasswordError("");
        } catch (error) {
          setPasswordError(error.message);
        }
      }
    }
  };

  const handleSubmit = async (e, leaveRequest) => {
    e.preventDefault();

    const user = auth.currentUser;

    if (user) {
      const newLeaveRequestRef = push(
        ref(database, `leaveRequests/${user.uid}`)
      );

      set(newLeaveRequestRef, leaveRequest)
        .then(() => {
          alert("Leave request submitted successfully!");
          setActiveTab("Leave Balance");

          // Move the Slack notification here
          if (notifySlack) {
            sendSlackNotification(leaveRequest, employeeData.name);
          }
        })
        .catch((error) => {
          console.error("Error submitting leave request:", error);
          setFormError("Failed to submit leave request. Please try again.");
        });
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
                    {showReauthPassword ? <Eye size={20} /> : <EyeOff size={20} /> }
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
                  {showNewPassword ? <Eye size={20} />: <EyeOff size={20} />}
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
      case "Leave Balance":
        return (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Leave Balance</h2>
            <p className="mb-2">
              Casual Leaves Remaining: {employeeData.leaves || 0}
            </p>
            {employeeData.isMumbaiTeam && (
              <p className="mb-2">
                Sick Leaves Remaining: {employeeData.sickLeaves || 0}
              </p>
            )}
            <p className="mb-2">
              Comp Offs Remaining: {employeeData.compOffs || 0}
            </p>
          </div>
        );
      case "Request Leave":
        return (
          <LeaveRequestForm
            currentUserId={auth.currentUser.uid} // Pass currentUserId as a prop
            onRequestSubmitted={() => setActiveTab("Leave Balance")}
          />
        );
      case "Request Comp Off":
        return (
          <CompOffRequestForm
            currentUserId={auth.currentUser.uid}
            onRequestSubmitted={() => setIsCompOffFormVisible(false)}
          />
        );
      case "Leave History":
        return <LeaveHistory employeeId={auth.currentUser.uid} />;
      case "Pending Leave Approvals":
        return <PendingLeaveApprovals currentUserId={auth.currentUser.uid} />;
      case "Pending Compoff Approvals":
        return <PendingApprovals currentUserId={auth.currentUser.uid} />;
      case "CompOff History":
        return <CompOffHistory employeeId={auth.currentUser.uid} />;
      default:
        return <div>Content for {activeTab}</div>;
    }
  };

  const reauthenticate = async () => {
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(reauthEmail, reauthPassword);
    try {
      await reauthenticateWithCredential(user, credential);
      return true;
    } catch (error) {
      setPasswordError(error.message);
      return false;
    }
  };

  return (
    <div className="w-full max-w-[1280px] flex h-screen bg-gray-100 font-oxygen">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-md">
        <div className="p-4">
          <h1 className="text-xl font-semibold">{employeeData.name}</h1>
        </div>
        <nav className="mt-4">
          {[
            "Leave Balance",
            "Request Leave",
            "Request Comp Off",
            "Leave History",
            "Pending Leave Approvals",
            "CompOff History",
            "Pending Compoff Approvals",
          ].map((item) => (
            <button
              key={item}
              className={`w-full text-left p-4 hover:bg-gray-100 ${
                activeTab === item ? "bg-gray-200" : ""
              }`}
              onClick={() => {setActiveTab(item); setIsChangePasswordVisible(false)}}
            >
              {item}
            </button>
          ))}
          <div className="px-4 mt-4">
            <button
              className="bg-gray-100 text-black border border-gray-300 px-4 py-2 rounded-md flex items-center"
              onClick={() => {setIsChangePasswordVisible(true); setActiveTab("")}}
            >
              Change Password
            </button>
          </div>
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

export default EmployeeDashboard;
