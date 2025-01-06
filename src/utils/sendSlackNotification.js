import formatDate from "./dateFormat";

const APP_URL = 'https://leave-management-system-asqi.vercel.app/';
const APP_LINK = `\n\n<${APP_URL} | Click here to check the request in Leave Management System>`;


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
    `• *Reason:* ${leaveData.reason}\n\n` +
    APP_LINK;

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
    `• *Status:* ${compOffData.status}\n\n`+
    APP_LINK;
    
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

export const sendApprovalNotification = async (
  requestData,
  requestType,
  employee,
  approver,
  isApproved
) => {
  const apiUrl = process.env.REACT_APP_SLACK_NOTIFICATION_API;
  const status = isApproved ? "Approved ✅" : "Rejected ❌";
  
  let messageText = '';
  const hrApprovalMessage = isApproved ? "\n*Note:* Approval from HR is required\n" : "";
  
  if (requestType === 'leave') {
    // Format leave type
    const formattedLeaveType = requestData.leaveType === "sickLeave" ? "Sick Leave 🤒" : "Leave";
    
    // Get date range
    let dateRangeStr;
    if (requestData.isHalfDay) {
      dateRangeStr = `a half day on ${formatDate(requestData.startDate)}`;
    } else if (requestData.startDate === requestData.endDate) {
      dateRangeStr = `on ${formatDate(requestData.startDate)}`;
    } else {
      dateRangeStr = `from ${formatDate(requestData.startDate)} to ${formatDate(requestData.endDate)}`;
    }
    
    messageText = 
      `*Leave Request ${status}*\n\n` +
      `<@${employee.slackId}>, your ${formattedLeaveType} request for ${dateRangeStr} has been ${isApproved ? 'approved' : 'rejected'} by <@${approver.slackId}>.${hrApprovalMessage}\n\n` +
      `*Request Details:*\n` +
      `• *Date(s):* ${dateRangeStr}\n` +
      `• *Type:* ${formattedLeaveType}\n` +
      `• *Reason:* ${requestData.reason}\n`+
      APP_LINK;

  } else {
    // CompOff message
    const dayType = requestData.isHalfDay ? "half day" : "full day";
    
    messageText = 
      `*CompOff Request ${status}*\n\n` +
      `<@${employee.slackId}>, your CompOff request for ${formatDate(requestData.date)} has been ${isApproved ? 'approved' : 'rejected'} by <@${approver.slackId}>.${hrApprovalMessage}\n\n` +
      `*Request Details:*\n` +
      `• *Date:* ${formatDate(requestData.date)}\n` +
      `• *Type:* ${dayType}\n` +
      `• *Reason:* ${requestData.reason}\n`+
      APP_LINK;
  }

  const message = { text: messageText };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`${requestType} approval notification failed: ${response.statusText}`);
    }
  } catch (error) {
    throw error;
  }
};

export const sendHRNotification = async (requestData, requestType, employee, approver) => {
  const apiUrl = process.env.REACT_APP_SLACK_NOTIFICATION_API; // Use same webhook URL
  
  let messageText = '';
  let dateRangeStr = '';
  
  // Common date formatting logic
  if (requestType === 'leave') {
    const formattedLeaveType = requestData.leaveType === "sickLeave" ? "Sick Leave 🤒" : "Leave";
    
    if (requestData.isHalfDay) {
      dateRangeStr = `a half day on ${formatDate(requestData.startDate)}`;
    } else if (requestData.startDate === requestData.endDate) {
      dateRangeStr = `on ${formatDate(requestData.startDate)}`;
    } else {
      dateRangeStr = `from ${formatDate(requestData.startDate)} to ${formatDate(requestData.endDate)}`;
    }
    
    messageText = 
      `*Leave Request Pending HR Approval*\n\n` +
      `<@${employee.slackId}>'s ${formattedLeaveType} request for ${dateRangeStr} has been approved by <@${approver.slackId}> and needs HR approval.\n\n` +
      `*Request Details:*\n` +
      `• *Date(s):* ${dateRangeStr}\n` +
      `• *Type:* ${formattedLeaveType}\n` +
      `• *Reason:* ${requestData.reason}\n`+
      APP_LINK;
  } else {
    const dayType = requestData.isHalfDay ? "half day" : "full day";
    dateRangeStr = `${formatDate(requestData.date)}`;
    
    messageText = 
      `*CompOff Request Pending HR Approval*\n\n` +
      `<@${employee.slackId}>'s CompOff request (${dayType}) for ${dateRangeStr} has been approved by <@${approver.slackId}> and needs HR approval.\n\n` +
      `*Request Details:*\n` +
      `• *Date:* ${dateRangeStr}\n` +
      `• *Type:* ${dayType}\n` +
      `• *Reason:* ${requestData.reason}\n`+
      APP_LINK;
  }

  const message = { 
    text: messageText,
    channel: 'hr-approvals' // Add channel identifier for Lambda routing
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
      throw new Error(`HR notification failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error sending HR notification:", error);
    throw error;
  }
};

export const sendHRActionNotification = async (
  requestData,
  requestType,
  employee,
  hrApprover,
  isApproved
) => {
  const apiUrl = process.env.REACT_APP_SLACK_NOTIFICATION_API;
  const status = isApproved ? "Approved ✅" : "Rejected ❌";
  
  let messageText = '';
  
  if (requestType === 'leave') {
    const formattedLeaveType = requestData.leaveType === "sickLeave" ? "Sick Leave 🤒" : "Leave";
    let dateRangeStr;
    if (requestData.isHalfDay) {
      dateRangeStr = `a half day on ${formatDate(requestData.startDate)}`;
    } else if (requestData.startDate === requestData.endDate) {
      dateRangeStr = `on ${formatDate(requestData.startDate)}`;
    } else {
      dateRangeStr = `from ${formatDate(requestData.startDate)} to ${formatDate(requestData.endDate)}`;
    }
    
    messageText = 
      `*HR ${status} Leave Request*\n\n` +
      `<@${employee.slackId}>, your ${formattedLeaveType} request for ${dateRangeStr} has been ${isApproved ? 'approved' : 'rejected'} by HR (<@${hrApprover.slackId}>).\n\n` +
      `*Request Details:*\n` +
      `• *Date(s):* ${dateRangeStr}\n` +
      `• *Type:* ${formattedLeaveType}\n` +
      `• *Reason:* ${requestData.reason}\n`+
      APP_LINK;
  } else {
    const dayType = requestData.isHalfDay ? "half day" : "full day";
    
    messageText = 
      `*HR ${status} CompOff Request*\n\n` +
      `<@${employee.slackId}>, your CompOff request (${dayType}) for ${formatDate(requestData.date)} has been ${isApproved ? 'approved' : 'rejected'} by HR (<@${hrApprover.slackId}>).\n\n` +
      `*Request Details:*\n` +
      `• *Date:* ${formatDate(requestData.date)}\n` +
      `• *Type:* ${dayType}\n` +
      `• *Reason:* ${requestData.reason}\n`+
      APP_LINK;
  }

  const message = { text: messageText };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`HR action notification failed: ${response.statusText}`);
    }
  } catch (error) {
    throw error;
  }
};