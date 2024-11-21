import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ref, onValue, update } from "firebase/database";
import { database } from "../firebase";
import formatDate from "../utils/dateFormat";
import LeaveHistory from "./LeaveHistory";
import CompOffHistory from "./CompOffHistory";
const EmployeeDetail = () => {
  const { employeeId } = useParams();
  const [employeeData, setEmployeeData] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [newLeaves, setNewLeaves] = useState("");
  const [newSickLeaves, setNewSickLeaves] = useState("");
  const [newCompOffs, setNewCompOffs] = useState("");
  const [activeTab, setActiveTab] = useState("Leave Balance");

  useEffect(() => {
    const employeeRef = ref(database, `employees/${employeeId}`);
    onValue(employeeRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setEmployeeData(data);
        setNewLeaves(data.leaves || 0);
        setNewSickLeaves(data.sickLeaves || 0);
        setNewCompOffs(data.compOffs || 0);
      }
    });
  }, [employeeId]);

  useEffect(() => {
    const leaveRequestsRef = ref(database, `leaveRequests/${employeeId}`);
    onValue(leaveRequestsRef, (snapshot) => {
      if (snapshot.exists()) {
        const requests = snapshot.val();
        setLeaveRequests(Object.values(requests));
      } else {
        setLeaveRequests([]);
      }
    });
  }, [employeeId]);

  const handleUpdate = () => {
    const employeeRef = ref(database, `employees/${employeeId}`);
    update(employeeRef, {
      leaves: parseFloat(newLeaves),
      sickLeaves: parseFloat(newSickLeaves),
      compOffs: parseFloat(newCompOffs),
    }).then(() => {
      alert("Leaves updated successfully!");
    });
  };

  if (!employeeData) {
    return <div>Loading...</div>;
  }

  const renderLeaveBalance = () => (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Leave Balance</h2>
      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-semibold">
            Total Leaves Remaining:
          </label>
          <input
            type="number"
            value={newLeaves}
            onChange={(e) => setNewLeaves(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        {employeeData.isMumbaiTeam && (
          <div>
            <label className="block mb-1 font-semibold">
              Sick Leaves Remaining:
            </label>
            <input
              type="number"
              value={newSickLeaves}
              onChange={(e) => setNewSickLeaves(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        )}
        <div>
          <label className="block mb-1 font-semibold">
            Comp Offs Remaining:
          </label>
          <input
            type="number"
            value={newCompOffs}
            onChange={(e) => setNewCompOffs(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        <button
          onClick={handleUpdate}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Update Leaves
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-[1280px] flex h-screen bg-gray-100 font-oxygen">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-md">
        <div className="p-4">
          <h1 className="text-xl font-semibold">{employeeData.name}</h1>
        </div>
        <nav className="mt-4">
          {["Leave Balance", "Leave History", "CompOff History"].map((item) => (
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
        <nav className="bg-white shadow-md p-4">
          <div className="text-xl font-semibold">{activeTab}</div>
        </nav>

        <div className="p-8">
          {activeTab === "Leave Balance" && renderLeaveBalance()}
          {activeTab === "Leave History" && (
            <LeaveHistory employeeId={employeeId} />
          )}
          {activeTab === "CompOff History" && (
            <CompOffHistory employeeId={employeeId} />
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDetail;
