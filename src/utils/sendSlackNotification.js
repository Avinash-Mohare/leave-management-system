import formatDate from "./dateFormat";

export const sendSlackNotification = async (leaveData, employeeName) => {
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
    `${employeeName} has applied for ${formattedLeaveType} ${dateRangeStr}.\n\n` +
    `*Details:*\n` +
    `• *Date(s):* ${dateRangeStr}\n` +
    `• *Reason:* ${leaveData.reason}\n\n` +
    `Hello <@U06J91DKRV1>, please review this request.`;

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

    console.log(message);

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.statusText}`);
    }

    console.log("Notification sent to Slack successfully!");
  } catch (error) {
    console.error("Error sending notification to Slack:", error);
  }
};

export const sendCompOffSlackNotification = async (
  compOffData,
  employeeName,
  seniorEmployeeName
) => {
  const apiUrl = process.env.REACT_APP_SLACK_NOTIFICATION_API;

  // Determine if it's a full day or half day
  const dayType = compOffData.isHalfDay ? "half day" : "full day";

  // Construct the message text for Slack
  const messageText =
    `*CompOff Request Notification*\n\n` +
    `${employeeName} has raised a CompOff request. ${seniorEmployeeName}, they have asked for approval from you.\n\n` +
    `*Details:*\n` +
    `• *Date:* ${formatDate(compOffData.date)}\n` +
    `• *Type:* ${dayType}\n` +
    `• *Reason:* ${compOffData.reason}\n` +
    `• *Status:* ${compOffData.status}\n\n` +
    `Hello <@U06J91DKRV1>, please review this CompOff request.`;

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

    console.log("CompOff Slack Notification Message:", message);

    if (!response.ok) {
      throw new Error(
        `CompOff Slack notification failed: ${response.statusText}`
      );
    }

    console.log("CompOff notification sent to Slack successfully!");
  } catch (error) {
    console.error("Error sending CompOff notification to Slack:", error);
    throw error; // Re-throw the error to be caught in the calling function
  }
};
