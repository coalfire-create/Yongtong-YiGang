import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import { HighSchool, HighSchoolSchedule, HighSchoolTeachers } from "@/pages/high-school";
import { MiddleSchool, MiddleSchoolSchedule, MiddleSchoolTeachers } from "@/pages/middle-school";
import { Elementary, ElementarySchedule, ElementaryTeachers } from "@/pages/elementary";
import { Owl, OwlInfo, OwlUsage } from "@/pages/owl";
import { Briefing, BriefingReservation, BriefingSchedule } from "@/pages/briefing";
import { Admissions, AdmissionsResults, AdmissionsReviews } from "@/pages/admissions";
import { Directions } from "@/pages/directions";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/high-school" component={HighSchool} />
      <Route path="/high-school/schedule" component={HighSchoolSchedule} />
      <Route path="/high-school/teachers" component={HighSchoolTeachers} />
      <Route path="/middle-school" component={MiddleSchool} />
      <Route path="/middle-school/schedule" component={MiddleSchoolSchedule} />
      <Route path="/middle-school/teachers" component={MiddleSchoolTeachers} />
      <Route path="/elementary" component={Elementary} />
      <Route path="/elementary/schedule" component={ElementarySchedule} />
      <Route path="/elementary/teachers" component={ElementaryTeachers} />
      <Route path="/owl" component={Owl} />
      <Route path="/owl/info" component={OwlInfo} />
      <Route path="/owl/usage" component={OwlUsage} />
      <Route path="/briefing" component={Briefing} />
      <Route path="/briefing/reservation" component={BriefingReservation} />
      <Route path="/briefing/schedule" component={BriefingSchedule} />
      <Route path="/admissions" component={Admissions} />
      <Route path="/admissions/results" component={AdmissionsResults} />
      <Route path="/admissions/reviews" component={AdmissionsReviews} />
      <Route path="/directions" component={Directions} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
