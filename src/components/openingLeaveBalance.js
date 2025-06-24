import { get, ref, update } from "firebase/database";
import { database } from "../firebase";

export const openingLeaveBalance = async () => {
  const now = new Date();
  const month = now.toLocaleString("default", { month: "short" });
  const year = now.getFullYear();
  const formattedDate = `${month}-${year}`;

  const balanceRef = ref(database, `openingLeaveBalance/${formattedDate}`);
  const balanceSnapshot = await get(balanceRef);

  if (balanceSnapshot.exists()) {
    console.log(`Opening leave balance for ${formattedDate} already exists.`);
    return;
  }

  const employeesRef = ref(database, "employees");
  const snapshot = await get(employeesRef);
  const employees = snapshot.val();
  const updates = {};

  Object.entries(employees).forEach(([uid, data]) => {
    const leaves = data.leaves ?? 0;
    const compOffs = data.compOffs ?? 0;

    updates[`openingLeaveBalance/${formattedDate}/${uid}`] = {
      leaves,
      compOffs,
    };
  });

  console.log(
    `Opening leave balance set for ${
      Object.keys(employees).length
    } employees for ${formattedDate}`
  );
  await update(ref(database), updates);
  return null;
};
