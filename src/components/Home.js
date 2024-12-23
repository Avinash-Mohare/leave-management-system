// import React from "react";
// import { Link } from "react-router-dom";
// import loginImg from "../assets/images/Login-illustration.jpg";
// import signupImg from "../assets/images/Signup-illustration.jpg";

// const Home = () => {
//   return (
//     <div className="flex flex-col items-center justify-center h-[100vh] text-2xl">
//       <div class="mb-10">ASQI Leave Management System</div>
//       <div className="flex flex-row items-center justify-center">
//         <div className="flex flex-col items-center justify-center">
//           <div>
//             <img
//               src={loginImg}
//               alt="login-illustration"
//               className="h-[400px]"
//             />
//           </div>
//           <div>
//             <Link to="/Login" className="cursor-pointer text-[#d62828]">
//               Login
//             </Link>
//           </div>
//         </div>
//         <div className="h-[100%] border-[1px] border-black"></div>
//         <div className="flex flex-col items-center justify-center">
//           <div>
//             <img
//               src={signupImg}
//               alt="signup-illustration"
//               className="h-[400px]"
//             />
//           </div>
//           <div>
//             <Link to="/Signup" className="cursor-pointer text-[#d62828]">
//               <div>Signup</div>
//             </Link>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Home;

import React from "react"
import { Link } from "react-router-dom"
import loginImg from "../assets/images/Login-illustration.jpg"
import signupImg from "../assets/images/Signup-illustration.jpg"

export default function Home() {
  return (
    <div className="min-h-screen  flex flex-col items-center justify-center p-4">
      {/* Logo Section */}
      <div className="mb-8">
        <div className="w-auto h-[120px] flex items-center justify-center">
          <img
            src="https://asqi.in/wp-content/uploads/2024/07/ASQI-logo.png"
            alt="ASQI Logo"
            className="w-auto h-[60px] opacity-70"
          />
        </div>
      </div>

      {/* Title Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ color: '#5B7D9E' }}>
          Leave Management System
        </h1>
        <p className="text-gray-600">
          Manage your leaves efficiently and seamlessly
        </p>
      </div>

      {/* Cards Section */}
      <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-center justify-center max-w-5xl w-full">
        {/* Login Card */}
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center space-y-6 flex-1 max-w-md hover:shadow-lg transition-shadow">
          <div className="relative w-full aspect-square max-w-[300px]">
            <img
              src={loginImg}
              alt="Login illustration"
              className="w-full h-full object-contain"
            />
          </div>
          <Link 
            to="/login" 
            className="w-full text-white py-3 px-4 rounded-lg text-center font-medium hover:bg-blue-700 transition-colors" style={{ backgroundColor: '#5B7D9E' }}
          >
            Login to Your Account
          </Link>
        </div>

        {/* Vertical Divider - Only visible on desktop */}
        <div className="hidden md:block w-px h-80 bg-gradient-to-b from-transparent via-gray-300 to-transparent" />

        {/* Signup Card */}
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col items-center space-y-6 flex-1 max-w-md hover:shadow-lg transition-shadow">
          <div className="relative w-full aspect-square max-w-[300px]">
            <img
              src={signupImg}
              alt="Signup illustration"
              className="w-full h-full object-contain"
            />
          </div>
          <Link 
            to="/signup" 
            className="w-full border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg text-center font-medium hover:bg-gray-50 transition-colors"
          >
            Create New Account
          </Link>
        </div>
      </div>
    </div>
  )
}



