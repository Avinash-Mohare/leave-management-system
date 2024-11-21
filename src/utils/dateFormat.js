function formatDate(dateString) {
  const date = new Date(dateString);
  const options = { day: "numeric", month: "short", year: "numeric" };
  return date
    .toLocaleDateString("en-GB", options)
    .replace(/(\d+)(\s+\w+)(\s+\d+)/, "$1$2$3");
}

export default formatDate;
