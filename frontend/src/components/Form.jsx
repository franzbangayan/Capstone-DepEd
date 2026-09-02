import { useEffect, useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { IconAlert } from "../components/Icons"
import "../styles/Form.css"

function Form({ route, method }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const [school, setSchool] = useState("");
    const [schools, setSchools] = useState([]);
    const [schoolsLoading, setSchoolsLoading] = useState(true);
    const [schoolsError, setSchoolsError] = useState("");
    const SCHOOLS_API_URL = "/api/schools/";

    

    const name = method === "login" ? "Sign In" : "Create Account";
    const buttonText = method === "login" ? "Log In" : "Register";
    const loadingText = method === "login" ? "Signing in…" : "Registering…";
  


 useEffect(() => {
  const fetchData = async () => {
    try {
      setSchoolsLoading(true);
      setSchoolsError("");

      const response = await api.get(SCHOOLS_API_URL);

      console.log("Schools API response:", response.data);

      // Supports a direct array or Django REST Framework pagination
      const schoolList = Array.isArray(response.data)
        ? response.data
        : response.data.results ||
          response.data.schools ||
          response.data.data ||
          [];

      if (!Array.isArray(schoolList)) {
        throw new Error("The schools API did not return a list");
      }

      // Convert the API response into the format used by the dropdown
      const formattedSchools = schoolList.map((item, index) => ({
        id:
          item.id ??
          item.pk ??
          item.school_id ??
          item.schoolId ??
          `temporary-${index}`,
        name:
          item.name ??
          item.school_name ??
          item.schoolName ??
          "Unnamed school",
      }));

      setSchools(formattedSchools);
    } catch (err) {
      console.error("Failed to load schools:", err);
      setSchoolsError("Unable to load schools.");
      setSchools([]);
    } finally {
      setSchoolsLoading(false);
    }
  };

  fetchData();
}, []);


       
      



const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  try {
    if (method === "register" && !school) {
      setError("Please select a school.");
      setLoading(false);
      return;
    }

    const payload = {
      username,
      password,
      ...(method === "register" && {
        school: Number(school),
      }),
    };

    const res = await api.post(route, payload);

    if (method === "login") {
      localStorage.setItem(ACCESS_TOKEN, res.data.access);
      localStorage.setItem(REFRESH_TOKEN, res.data.refresh);

      // This requires the login API to return school_id
      const loggedInSchoolId =
        res.data.school_id ||
        res.data.school?.id ||
        res.data.user?.school_id ||
        res.data.user?.school?.id;

      if (loggedInSchoolId) {
        localStorage.setItem("school_id", String(loggedInSchoolId));
      }

      navigate("/");
    } else {
      navigate("/login");
    }
  } catch (err) {
    setError(
      method === "login"
        ? "Invalid username or password."
        : "Registration failed. Try a different username."
    );
  } finally {
    setLoading(false);
  }
};


    return (
        <div className="login-bg">
            <div className="login-card-wrap">
                <div className="login-card">
                    <div className="login-stripe" />
                    <div className="login-body">
                        <div className="login-logo-wrap">
                            <div className="login-logo-icon">
                                <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                                    <rect x="4"  y="4"  width="13" height="13" rx="2.5" fill="#2563eb" />
                                    <rect x="23" y="4"  width="13" height="13" rx="2.5" fill="#60a5fa" />
                                    <rect x="4"  y="23" width="13" height="13" rx="2.5" fill="#93c5fd" />
                                    <rect x="23" y="23" width="13" height="13" rx="2.5" fill="#2563eb" />
                                </svg>
                            </div>
                            <div className="login-app-name">TeachLoad</div>
                        
                        </div>

                        <div className="login-heading">
                            <h2>{name}</h2>
                            <p>Teacher Loading &amp; Assignment System</p>
                        </div>

                        {error !== "" && (
                            <div className="login-error">
                                <IconAlert />
                                <p>{error}</p>
                            </div>
                        )}
                        
                         <div className="field">
                            <label className="field-label" htmlFor="school">
                                School
                            </label>

                            <div className="select-wrap">
                              <select
                                id="school"
                                value={school}
                                onChange={(e) => {
                                    const selectedSchoolId = e.target.value;

                                    setSchool(selectedSchoolId);
                                    localStorage.setItem("school_id", selectedSchoolId);
                                }}
                                required
                                >
                                <option value="">— Select your school —</option>

                                {schools.map((item) => (
                                    <option key={`school-${item.id}`} value={item.id}>
                                    {item.name}
                                    </option>
                                ))}
                                </select>

                                    {schoolsError && (
                                    <p className="field-error" role="alert">
                                        {schoolsError}
                                    </p>
                                    )}

                            </div>
                        </div>

                        <form className="login-form" onSubmit={handleSubmit}>
                            <div className="field">
                                <label className="field-label">Username</label>
                                <input
                                    className="input"
                                    type="text"
                                    placeholder="Enter username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                            <div className="field">
                                <label className="field-label">Password</label>
                                <input
                                    className="input"
                                    type="password"
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <button className="login-submit" type="submit" disabled={loading}>
                                {loading ? loadingText : buttonText}
                            </button>
                        </form>
                    </div>
                </div>
                <p className="login-footer">Department of Education · Authorized Users Only</p>
            </div>
        </div>
    );
}

export default Form;