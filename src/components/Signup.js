import React, { useState } from "react";
import { Mail, KeyRound, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

const Signup = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [submitButtonDisabled, setSubmitButtomDisabled] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleRegistration = async (e) => {
    e.preventDefault();
    if (!values.email || !values.password || !values.confirmPassword) {
      setError("Please fill all the details.");
      return;
    }
    if (values.password !== values.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitButtomDisabled(true);
    await createUserWithEmailAndPassword(auth, values.email, values.password)
      .then(async (res) => {
        setSubmitButtomDisabled(false);
        navigate("/Details");
        console.log(res);
      })
      .catch((err) => {
        setSubmitButtomDisabled(false);
        setError(err.message);
      });
  };

  const toggleHandlePassword = () => {
    setShowPassword(!showPassword);
  };
  return (
    <div className="flex items-center justify-center h-[100vh] font-oxygen">
      <form action="">
        <fieldset>
          <legend className="text-center text-4xl font-bold mb-2">
            Signup
          </legend>
          <div className="flex flex-col justify-center text-2xl">
            <div className="flex flex-col justify-center my-2">
              <label>Email</label>
              <div className="flex flex-row items-center justify-center border-[1px] border-black rounded-[5px]">
                <Mail />
                <input
                  type="email"
                  required
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
            <div className="flex flex-col justify-center my-2">
              <div className="flex flex-row justify-between items-center">
                <label htmlFor="password">Confirm Password</label>
                <div className="cursor-pointer" onClick={toggleHandlePassword}>
                  {showPassword ? <EyeOff /> : <Eye />}
                </div>
              </div>
              <div className="flex flex-row items-center justify-center border-[1px] border-black rounded-[5px]">
                <KeyRound />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="focus:outline-none m-[5px]"
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value,
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
                value="Signup"
                className="cursor-pointer bg-[#C77DFF] p-[5px] rounded-[8px] w-[320px] "
                onClick={handleRegistration}
                disabled={submitButtonDisabled}
              />
            </div>
            <div className="flex flex-row align-center justify-center text-lg my-2">
              Already have an account?{" "}
              <Link to="/Login" className="cursor-pointer text-[#d62828]">
                Login
              </Link>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  );
};

export default Signup;
