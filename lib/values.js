const isOpen = (value) => typeof value === "string" && value.trim().startsWith("[");
const isSet = (value) => value !== null && value !== undefined && value !== "" && !isOpen(value);

module.exports = { isOpen, isSet };
