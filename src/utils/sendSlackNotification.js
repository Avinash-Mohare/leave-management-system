import formatDate from "./dateFormat";

export const sendSlackNotification = async (leaveData, employeeName,
  seniorEmployeeName,
  employeeSlackId,
  seniorEmployeeSlackId) => {
  const apiUrl = process.env.REACT_APP_SLACK_NOTIFICATION_API;


  // Format the leave type
  const formattedLeaveType =
    leaveData.leaveType === "sickLeave" ? "Sick Leave 🤒" : "Leave";

  // Determine the date range string
  let dateRangeStr;
  if (leaveData.isHalfDay) {
    dateRangeStr = `a half day on ${formatDate(leaveData.startDate)}`;
  } else if (leaveData.startDate === leaveData.endDate) {
    dateRangeStr = `on ${formatDate(leaveData.startDate)}`;
  } else {
    dateRangeStr = `from ${formatDate(leaveData.startDate)} to ${formatDate(
      leaveData.endDate
    )}`;
  }

  // Construct the message text for Slack
  const messageText =
    `*Leave Request Notification*\n\n` +
    `<@${employeeSlackId}> has applied for ${formattedLeaveType} ${dateRangeStr}.\n\n` +
    `<@${seniorEmployeeSlackId}>, they have asked for an approval from you.\n\n` +
    `*Details:*\n` +
    `• *Date(s):* ${dateRangeStr}\n` +
    `• *Reason:* ${leaveData.reason}\n\n` 

  const message = {
    text: messageText,
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.statusText}`);
    }

  } catch (error) {
  }
};

export const sendCompOffSlackNotification = async (
  compOffData,
  employeeName,
  seniorEmployeeName,
  employeeSlackId,
  seniorEmployeeSlackId

) => {
  const apiUrl = process.env.REACT_APP_SLACK_NOTIFICATION_API;

  // Determine if it's a full day or half day
  const dayType = compOffData.isHalfDay ? "half day" : "full day";

  // Construct the message text for Slack
  const messageText =
    `*CompOff Request Notification*\n\n` +
    `<@${employeeSlackId}> has raised a CompOff request. <@${seniorEmployeeSlackId}>, they have asked for an approval from you.\n\n` +
    `*Details:*\n` +
    `• *Date:* ${formatDate(compOffData.date)}\n` +
    `• *Type:* ${dayType}\n` +
    `• *Reason:* ${compOffData.reason}\n` +
    `• *Status:* ${compOffData.status}\n\n`
    
  const message = {
    text: messageText,
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(
        `CompOff Slack notification failed: ${response.statusText}`
      );
    }

  } catch (error) {
    throw error; 
  }
};
