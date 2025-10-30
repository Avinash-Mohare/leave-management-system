import { database } from "../firebase";
import { ref, get, update } from "firebase/database";

export const deductLeave = async (employeeUid, leaveType, days, isHalfDay) => {
  const employeeRef = ref(database, `employees/${employeeUid}`);
  const snapshot = await get(employeeRef);
  const employeeData = snapshot.val();

  const leaveDeductInfo = {
    compoffDeducted: 0,
    casualLeavesDeducted: 0,
  };

  if (employeeData) {
    let updatedLeaves = { ...employeeData };
    let remainingDays = isHalfDay ? 0.5 : days;

    const deductFromLeaveType = (type, amount) => {
      const available = updatedLeaves[type] || 0;
      const deducted = Math.min(available, amount);
      updatedLeaves[type] = Math.max(0, available - deducted);
      return deducted;
    };

    // First, try to deduct from compOffs if available
    if ((updatedLeaves["compOffs"] || 0) > 0) {
      const deducted = deductFromLeaveType("compOffs", remainingDays);
      leaveDeductInfo.compoffDeducted = deducted;
      remainingDays -= deducted;
    }

    if (remainingDays > 0) {
      const deducted = deductFromLeaveType("leaves", remainingDays);
      leaveDeductInfo.casualLeavesDeducted = deducted;
      remainingDays -= deducted;
    }

    // If still remaining, allow leaves to go below 0 by deducting from regular leaves
    if (remainingDays > 0) {
      updatedLeaves.leaves = (updatedLeaves.leaves || 0) - remainingDays;
      leaveDeductInfo.casualLeavesDeducted += remainingDays;
    }

    await update(employeeRef, updatedLeaves);
  }

  return leaveDeductInfo;
};
