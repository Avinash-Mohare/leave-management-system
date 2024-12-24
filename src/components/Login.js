import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, KeyRound, Eye, EyeOff } from "lucide-react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth, database } from "../firebase";
import { onValue, ref } from "firebase/database";

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitButtonDisabled, setSubmitButtomDisabled] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState({
    email: "",
    password: "",
  });

  const [userData, setUserData] = useState();

  useEffect(() => {
    auth.onAuthStateChanged((user) => {
      if (user) {
        const fetchUserData = ref(database, `users/${user.uid}`);
        onValue(fetchUserData, (snapshot) => {
          const data = snapshot.val();
          setUserData(data);
        });
      }
    });
  }, []);

  // Navigate to the dashboard after userData is fetched
  useEffect(() => {
    if (userData && userData.role) {
      const redirectPath = "/" + userData.role + "DashBoard";
      navigate(redirectPath);
    }
  }, [userData, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!values.email || !values.password) {
      setError("Please fill all the fields.");
      return;
    }
    setSubmitButtomDisabled(true);
    await signInWithEmailAndPassword(auth, values.email, values.password)
      .then(async (res) => {
        setSubmitButtomDisabled(false);
        // navigate("/EmployeeDashboard");
        console.log(res);
      })
      .catch((err) => {
        setSubmitButtomDisabled(false);
        setError(err.message);
      });
    console.log(values);
  };
  const toggleHandlePassword = () => {
    setShowPassword(!showPassword);
  };

  //Password Reset functoion
  const handlePasswordReset = async () => {
    if (!values.email) {
      setError("Please enter your email address to reset your password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, values.email);
      alert("Password reset email sent! Please check your inbox.");
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="flex items-center justify-center h-[100vh] font-oxygen">
      <form action="">
        <fieldset>
          <legend className="text-center text-4xl font-bold mb-2">Login</legend>
          <div className="flex flex-col justify-center text-2xl">
            <div className="flex flex-col justify-center my-2">
              <label htmlFor="email">Email</label>
              <div className="flex flex-row items-center justify-center border-[1px] border-black rounded-[5px]">
                <Mail />
                <input
                  type="email"
                  required
                  id="email"
                  className="focus:outline-none m-[5px]"
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex flex-col justify-center my-2">
              <div className="flex flex-row justify-between items-center">
                <label htmlFor="password">Password</label>
                <div className="cursor-pointer" onClick={toggleHandlePassword}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </div>
              </div>
              <div className="flex flex-row items-center justify-center border-[1px] border-black rounded-[5px]">
                <KeyRound />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  id="password"
                  className="focus:outline-none m-[5px]"
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex align-center justify-center my-2 text-[#ff0e0e] text-lg">
              {error}
            </div>
            <div className="flex align-center justify-center my-2">
              <input
                type="submit"
                value="Login"
                id="submit"
                className="cursor-pointer bg-[#C77DFF] p-[5px] rounded-[8px] w-[320px] "
                onClick={handleLogin}
                disabled={submitButtonDisabled}
              />
            </div>

            {/* reset password */}
            <div className="flex flex-row align-center justify-center text-lg mt-2">
              <p>Forgot your password?</p>
              <button
                type="button"
                className="cursor-pointer text-[#d62828] ml-2"
                onClick={handlePasswordReset}
              >
                Reset Password
              </button>
            </div>

            <div className="flex flex-row align-center justify-center text-lg">
              <p>Don't have an account?</p>
              <Link to="/Signup" className="cursor-pointer text-[#d62828]">
                {" "}
                Signup
              </Link>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  );
};

export default Login;
