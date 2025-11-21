import { Suspense } from "react";
import PerfumesPage from "./components/PerfumePage";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PerfumesPage />
    </Suspense>
  );
}
