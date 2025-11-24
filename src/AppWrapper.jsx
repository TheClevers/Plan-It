import { useState } from "react";
import Login from "./Login";
import App from "./App";

export default function AppWrapper() {
  const [loggedIn, setLoggedIn] = useState(false);

  // 로그인 후 App으로 넘어가기
  const handleLogin = () => {
    setLoggedIn(true);
  };

  if (!loggedIn) {
    // 아직 로그인 전이면 로그인 화면 보여줌
    return <Login onLogin={handleLogin} />;
  }

  // 로그인 완료 시 메인 앱 보여줌
  return <App onLogout={() => setLoggedIn(false)} />;

}
