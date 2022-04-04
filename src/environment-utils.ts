export const getServerSecret = () => {
  return process.env.SERVER_SECRET || "todd-coin-is-cool";
};
