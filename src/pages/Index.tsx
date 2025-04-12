import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // If user is authenticated, let the layout handle the display
    // Otherwise redirect to login
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // This component doesn't need to render anything
  // as the Layout component will render the appropriate page
  return null;
};

export default Index;
