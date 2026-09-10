import { SchoolProvider } from "./contexts/SchoolContext";
import App from "./App";

export default function AppWrapper() {
    return (
        <div>
            <SchoolProvider>
                <App/>
            </SchoolProvider>
        </div>
    )
}