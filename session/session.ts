export const getSessionId = () => {
  const key = "esb2b_session_id";
  let sessionId = sessionStorage.getItem(key);

  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 8)}`;

    sessionStorage.setItem(key, sessionId);
  }

  return sessionId;
};
