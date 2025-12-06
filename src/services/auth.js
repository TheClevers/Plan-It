import { useMutation, useQuery } from "@tanstack/react-query";

// 로그인 API 함수
const loginAPI = async (credentials) => {
  const { username, password } = credentials;

  const response = await fetch(
    "https://plan-it-backend-fyd2.onrender.com/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Login failed");
  }

  return response.json();
};

// 로그인 mutation 훅
export const useLogin = () => {
  return useMutation({
    mutationFn: loginAPI,
    onSuccess: (data) => {
      // 로그인 성공 시 username만 저장
      if (data.user?.username) {
        localStorage.setItem("username", data.user.username);
      }
    },
    onError: (error) => {
      console.error("Login error:", error);
    },
  });
};

// 로그인 상태 확인 쿼리 (선택사항)
export const useAuthStatus = () => {
  return useQuery({
    queryKey: ["auth", "status"],
    queryFn: async () => {
      const username = localStorage.getItem("username");
      if (!username) {
        return { isAuthenticated: false };
      }

      // TODO: 실제 API로 username 검증
      // const response = await fetch(`/api/auth/verify/${username}`);
      // if (!response.ok) {
      //   return { isAuthenticated: false };
      // }
      // return response.json();

      return { isAuthenticated: true, username };
    },
    staleTime: 5 * 60 * 1000, // 5분
  });
};

// 회원가입 API 함수
const signupAPI = async (credentials) => {
  const { username, password } = credentials;

  const response = await fetch(
    "https://plan-it-backend-fyd2.onrender.com/auth/signup",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Signup failed");
  }

  return response.json();
};

// 회원가입 mutation 훅
export const useSignup = () => {
  return useMutation({
    mutationFn: signupAPI,
    onSuccess: (data) => {
      // 회원가입 성공 시 username만 저장
      if (data.user?.username) {
        localStorage.setItem("username", data.user.username);
      }
    },
    onError: (error) => {
      console.error("Signup error:", error);
    },
  });
};

// username 가져오기 헬퍼 함수
export const getUsername = () => {
  return localStorage.getItem("username");
};
