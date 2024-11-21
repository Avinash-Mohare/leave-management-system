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
const EmployeeDashboard = () => {
  const [employeeData, setEmployeeData] = useState("");
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const user = auth.currentUser;

    if (user) {
      const leaveRequest = {
        leaveType: reqLeaveType,
        startDate: reqStartDate,
        endDate: isHalfDay ? reqStartDate : reqEndDate,
        reason: reqReason.trim(),
        status: "pending",
        timestamp: Date.now(),
        isHalfDay: isHalfDay,
      };

      setSlackNotifData(leaveRequest);

      const newLeaveRequestRef = push(
        ref(database, `leaveRequests/${user.uid}`)
      );

      set(newLeaveRequestRef, leaveRequest)
        .then(() => {
          alert("Leave request submitted successfully!");
          setIsLeaveFormVisible(false);
          setReqLeaveType("casualLeave");
          setReqStartDate("");
          setReqEndDate("");
          setReqReason("");
          setIsHalfDay(false);
          setFormError("");

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

  const handleStartDateChange = (event) => {
    const newStartDate = event.target.value;
    setReqStartDate(newStartDate);

    if (
      !isHalfDay &&
      reqEndDate &&
      new Date(reqEndDate) < new Date(newStartDate)
    ) {
      setReqEndDate("");
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
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Request Leave</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="text-red-500 font-bold">{formError}</div>
              )}
              <div>
                <label className="block mb-1">Type of Leave:</label>
                <select
                  className="w-full p-2 border rounded"
                  value={reqLeaveType}
                  onChange={(event) => setReqLeaveType(event.target.value)}
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
                    className="w-full p-2 border rounded"
                    value={reqStartDate}
                    onChange={handleStartDateChange}
                    required
                  />
                </div>
                {!isHalfDay && (
                  <div className="flex-1">
                    <label className="block mb-1">To:</label>
                    <input
                      type="date"
                      className="w-full p-2 border rounded"
                      value={reqEndDate}
                      onChange={(event) => setReqEndDate(event.target.value)}
                      min={reqStartDate}
                      required
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block mb-1">Reason:</label>
                <textarea
                  rows={5}
                  placeholder="Describe your reason..."
                  value={reqReason}
                  className="w-full p-2 border rounded resize-none"
                  onChange={(event) => setReqReason(event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notifySlack}
                    onChange={(e) => setNotifySlack(e.target.checked)}
                    className="mr-2"
                  />
                  Notify People in group
                </label>
              </div>
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                type="submit"
              >
                Submit Leave Request
              </button>
            </form>
          </div>
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
      case "Pending Approvals":
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
            "CompOff History",
            "Pending Approvals",
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
