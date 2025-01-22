import React, { useState, useEffect } from "react";
import { auth, database } from "../firebase";
import { ref, set, update, get } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { updateProfile } from "firebase/auth";

const Details = () => {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const [hrList, setHrList] = useState([]);
  const [selectedHrUid, setSelectedHrUid] = useState("");
  const [hrExists, setHrExists] = useState(false);
  const [isMumbaiTeam, setIsMumbaiTeam] = useState(false);
  const [slackId, setSlackId] = useState("");

  useEffect(() => {
    // Fetch list of HRs from the database
    const hrRef = ref(database, "hrs");
    get(hrRef).then((snapshot) => {
      if (snapshot.exists()) {
        const hrData = snapshot.val();
        const hrArray = Object.entries(hrData).map(([uid, data]) => ({
          uid,
          name: data.name,
        }));
        setHrList(hrArray);
        setHrExists(hrArray.length > 0);
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!firstName || !lastName || !email || !role || !slackId) {
      setError("Please fill all the details.");
      return;
    }

    if (role === "Employee" && !selectedHrUid) {
      setError("Please select an HR.");
      return;
    }

    if (role === "HR" && hrExists) {
      setError("An HR already exists. You cannot sign up as HR.");
      return;
    }

    console.log(firstName, lastName, email, role, selectedHrUid);

    const userData = {
      name: firstName + " " + lastName,
      email: email,
      role: role,
      slackId: slackId,
    };

    if (role === "Employee") {
      userData.hrUid = selectedHrUid;
      userData.leaves = 0;
      userData.compOffs = 0;
      userData.isMumbaiTeam = isMumbaiTeam;
      if (isMumbaiTeam) {
        userData.sickLeaves = 0;
      }
    }

    const uid = auth.currentUser.uid;

    try {
      // Update user profile
      await updateProfile(auth.currentUser, {
        displayName: firstName + " " + lastName,
      });

      // Set user data in the appropriate location
      const databasePath = `${role.toLowerCase()}s/${uid}`;
      await set(ref(database, databasePath), userData);

      // Update users node
      await set(ref(database, `users/${uid}`), {
        name: firstName + " " + lastName,
        email: email,
        role: role,
      });

      if (role === "Employee") {
        // Update HR's managed employees
        const managedEmployeeRef = ref(
          database,
          `hr-employee/${selectedHrUid}/managedEmployees`
        );
        await update(managedEmployeeRef, {
          [uid]: true,
        });
      }

      console.log("User data updated successfully");
      navigate(role === "HR" ? "/HRDashboard" : "/EmployeeDashboard");
    } catch (error) {
      console.error("Error updating user data:", error.message);
      setError("An error occurred while updating your information.");
    }
  };

  return (
    <div className="flex items-center justify-center h-[100vh] font-oxygen">
      <form onSubmit={handleSubmit}>
        <fieldset>
          <legend className="text-center text-4xl font-bold mb-2">
            Details
          </legend>
          <div className="flex flex-col justify-center text-2xl">
            <div className="flex flex-col justify-center my-2">
              <label>First Name</label>
              <div className="flex flex-row items-center justify-center border-[1px] border-black rounded-[5px]">
                <input
                  type="text"
                  required
                  className="focus:outline-none m-[5px]"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col justify-center my-2">
              <label>Last Name</label>
              <div className="flex flex-row items-center justify-center border-[1px] border-black rounded-[5px]">
                <input
                  type="text"
                  required
                  className="focus:outline-none m-[5px]"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col justify-center my-2">
              <label>Email</label>
              <div className="flex flex-row items-center justify-center border-[1px] border-black rounded-[5px]">
                <input
                  type="email"
                  required
                  className="focus:outline-none m-[5px]"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col justify-center my-2">
              <label>Slack ID</label>
              <div className="flex flex-row items-center justify-center border-[1px] border-black rounded-[5px]">
                <input
                  type="text"
                  required
                  className="focus:outline-none m-[5px]"
                  value={slackId}
                  onChange={(e) => setSlackId(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-row items-center justify-between">
              <div>
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    onClick={() => setRole("Employee")}
                  />
                  Employee
                </label>
              </div>
              <div>
                <label
                  className={`cursor-pointer ${hrExists ? "opacity-50" : ""}`}
                >
                  <input
                    type="radio"
                    name="role"
                    onClick={() => setRole("HR")}
                    disabled={hrExists}
                  />
                  HR
                </label>
              </div>
            </div>
            {role === "Employee" && (
              <>
                <div className="flex flex-col justify-center my-2">
                  <label>Select HR</label>
                  <select
                    className="border-[1px] border-black rounded-[5px] p-[5px]"
                    value={selectedHrUid}
                    onChange={(e) => setSelectedHrUid(e.target.value)}
                    required
                  >
                    <option value="">Select an HR</option>
                    {hrList.map((hr) => (
                      <option key={hr.uid} value={hr.uid}>
                        {hr.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col justify-center my-2">
                  <label>
                    <input
                      type="checkbox"
                      checked={isMumbaiTeam}
                      onChange={(e) => setIsMumbaiTeam(e.target.checked)}
                    />
                    Is part of Mumbai team?
                  </label>
                </div>
              </>
            )}
            <div className="flex align-center justify-center my-2 text-[#ff0e0e] text-lg">
              {error}
            </div>
            <div className="flex align-center justify-center my-2">
              <button
                type="submit"
                className="cursor-pointer bg-[#C77DFF] p-[5px] rounded-[8px] w-[320px]"
              >
                Submit
              </button>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  );
};

export default Details;
