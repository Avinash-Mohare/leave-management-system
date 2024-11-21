import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./components/Home";
import Login from "./components/Login";
import Signup from "./components/Signup";
import NoRouteMatch from "./components/NoRouteMatch";
import Details from "./components/Details";
import EmployeeDashboard from "./components/EmployeeDashboard";
import HRDashboard from "./components/HRDashboard";
import EmployeeDetail from "./components/EmployeeDetails";

const App = () => {
  return (
    <div className="flex items-center justify-center">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="Home" element={<Home />} />
          <Route path="Login" element={<Login />} />
          <Route path="Signup" element={<Signup />} />
          <Route path="Details" element={<Details />} />
          <Route path="EmployeeDashboard" element={<EmployeeDashboard />} />
          <Route path="HRDashboard" element={<HRDashboard />} />
          <Route path="/employee/:employeeId" element={<EmployeeDetail />} />
          <Route path="*" element={<NoRouteMatch />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
};

export default App;
