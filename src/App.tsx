import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "./components/theme-toggle";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="theme">
      <div className="flex">
        <div className="flex justify-end w-full">
          <ThemeToggle />
        </div>
        <div></div>
      </div>
    </ThemeProvider>
  );
}

export default App;
