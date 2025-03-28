import React, { createContext, useState, useContext, useEffect } from 'react';
// Remove mockUsers import: import mockUsers from '../data/users.json';

const API_BASE_URL = 'http://localhost:3001/api'; // Backend URL

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('quizAppUser');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem('quizAppUser');
      }
    }
    setLoading(false);
  }, []);

  // Updated Login Function
  const login = async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json(); // Always parse JSON first

    if (!response.ok) {
        // Throw an error with the message from the backend, or a default one
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    // On success:
    const userData = { id: data.id, username: data.username };
    setCurrentUser(userData);
    localStorage.setItem('quizAppUser', JSON.stringify(userData));
    return userData; // Return user data on success
  };

  // Updated Sign Up Function
  const signup = async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json(); // Always parse JSON

    if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    // On success (backend sends back the new user info):
    const newUser = { id: data.id, username: data.username };
    setCurrentUser(newUser);
    localStorage.setItem('quizAppUser', JSON.stringify(newUser));
    return newUser; // Return user data on success
  };

  // Logout Function (remains the same)
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('quizAppUser');
  };

  const value = { currentUser, loading, login, signup, logout };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};