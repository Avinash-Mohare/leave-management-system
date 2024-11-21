import React from "react";
import { Link } from "react-router-dom";
import loginImg from "../assets/images/Login-illustration.jpg";
import signupImg from "../assets/images/Signup-illustration.jpg";

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[100vh] text-2xl">
      <div class="mb-10">ASQI Leave Management System</div>
      <div className="flex flex-row items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <div>
            <img
              src={loginImg}
              alt="login-illustration"
              className="h-[400px]"
            />
          </div>
          <div>
            <Link to="/Login" className="cursor-pointer text-[#d62828]">
              Login
            </Link>
          </div>
        </div>
        <div className="h-[100%] border-[1px] border-black"></div>
        <div className="flex flex-col items-center justify-center">
          <div>
            <img
              src={signupImg}
              alt="signup-illustration"
              className="h-[400px]"
            />
          </div>
          <div>
            <Link to="/Signup" className="cursor-pointer text-[#d62828]">
              <div>Signup</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
