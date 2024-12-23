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

const EmployeeDashboard = () => {
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
              onClick={() => setActiveTab(item)}
            >
              {item}
            </button>
          ))}
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
