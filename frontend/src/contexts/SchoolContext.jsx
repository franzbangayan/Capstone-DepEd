import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api.js';

const SchoolContext = createContext();

export const useSchool = () => useContext(SchoolContext);

export const SchoolProvider = ({ children }) => {
    const [schoolName, setSchoolName] = useState("SCHOOL NAME");
    const [activeSchoolYear, setActiveSchoolYear] = useState(null);

    const refresh = useCallback(async () => {
        try {
        const response = await api.get("/api/schools/");
        const data = response.data;
        const schoolId = localStorage.getItem("school_id");
        const activeSchool = data.find(school => school.school_id === Number(schoolId));
        if (activeSchool) setSchoolName(activeSchool.school_name);

        const schoolYearResponse = await api.get("/api/school-years/");
        const activeYear = schoolYearResponse.data.find(year => year.is_active) || null;
        setActiveSchoolYear(activeYear);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const schoolYear = activeSchoolYear
        ? `${activeSchoolYear.year_start}-${activeSchoolYear.year_end}`
        : "S.Y. 2024–2025";

    const value = {
        schoolName,
        schoolYear,
        activeSchoolYear,
        refresh,
    }

    return <SchoolContext.Provider value={value}>
        {children}
    </SchoolContext.Provider>
}