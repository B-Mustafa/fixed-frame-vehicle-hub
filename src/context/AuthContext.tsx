import React, { createContext, useContext, useState, useEffect } from "react";

interface User {
  username: string;
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  createUser: (username: string, password: string, isAdmin: boolean) => boolean;
  users: { username: string; isAdmin: boolean }[];
  isInitialized: boolean; // New property to indicate initialization status
  deleteUser: (username: string) => boolean;
}

interface StoredUser {
  username: string;
  password: string; // Note: In production, never store plaintext passwords!
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => false,
  logout: () => {},
  createUser: () => false,
  users: [],
  isInitialized: false,
  deleteUser: () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<StoredUser[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const deleteUser = (username: string) => {
    if (!user?.isAdmin) return false;
    
    const updatedUsers = users.filter(u => u.username !== username);
    setUsers(updatedUsers);
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    return true;
  };

  useEffect(() => {
    // Load users
    const storedUsers = localStorage.getItem("users");
    const loadedUsers = storedUsers ? JSON.parse(storedUsers) : [
      { username: "kesri", password: "kesri123", isAdmin: true }
    ];
    setUsers(loadedUsers);
    if (!storedUsers) {
      localStorage.setItem("users", JSON.stringify(loadedUsers));
    }

    // Load current user
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing user:", error);
        localStorage.removeItem("currentUser");
      }
    }
    setIsInitialized(true);
  }, []);

  const login = (username: string, password: string) => {
    const foundUser = users.find(u => 
      u.username === username && u.password === password
    );
    
    if (foundUser) {
      const userData = { 
        username: foundUser.username, 
        isAdmin: foundUser.isAdmin 
      };
      setUser(userData);
      localStorage.setItem("currentUser", JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("currentUser");
  };

  const createUser = (username: string, password: string, isAdmin: boolean) => {
    // Only admin can create users
    if (!user?.isAdmin) return false;
    
    // Check if username already exists
    if (users.some(u => u.username === username)) {
      return false;
    }

    const newUser = { username, password, isAdmin };
    const updatedUsers = [...users, newUser];
    
    setUsers(updatedUsers);
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    return true;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      createUser, 
      users,
      isInitialized, // Add this to the context,
      deleteUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};